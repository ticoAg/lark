#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[1]
TASKS_DIR = ROOT / "tasks"
MILESTONES_DIR = TASKS_DIR / "milestones"
ROADMAP_PATH = TASKS_DIR / "roadmap.md"
PROGRESS_PATH = TASKS_DIR / "progress.md"
BLOCKERS_PATH = TASKS_DIR / "blockers.md"
ARCHIVE_INDEX_PATH = TASKS_DIR / "archive-index.md"

ARCHIVE_DONE_STALE_DAYS = 7
PROGRESS_ARCHIVE_MAX_LINES = 200
PROGRESS_ARCHIVE_MAX_ENTRIES = 40


def now_local_iso() -> str:
    return datetime.now().astimezone().replace(microsecond=0).isoformat()


def now_local_hm() -> str:
    return datetime.now().astimezone().strftime("%Y-%m-%d %H:%M")


def normalize_milestone_id(value: object | None) -> str | None:
    if value is None:
        return None
    if isinstance(value, int):
        return f"{value:02d}"
    text = str(value).strip()
    if text.isdigit():
        return text.zfill(2)
    return text


def extract_frontmatter(text: str) -> tuple[str | None, str]:
    lines = text.splitlines(keepends=True)
    if not lines or lines[0].strip() != "---":
        return None, text
    for idx in range(1, len(lines)):
        if lines[idx].strip() == "---":
            return "".join(lines[1:idx]), "".join(lines[idx + 1 :])
    return None, text


def parse_yaml_via_yq(yaml_text: str) -> dict[str, Any]:
    if not yaml_text.strip():
        return {}
    try:
        proc = subprocess.run(
            ["yq", "-o=json", ".", "-"],
            input=yaml_text,
            text=True,
            capture_output=True,
            check=True,
        )
    except FileNotFoundError as exc:
        raise RuntimeError("yq not found; install yq to parse YAML frontmatter") from exc
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(f"yq failed: {exc.stderr.strip()}") from exc
    try:
        return json.loads(proc.stdout or "{}")
    except json.JSONDecodeError as exc:
        raise RuntimeError("yq produced invalid JSON") from exc


def load_frontmatter(path: Path) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8")
    fm_text, _ = extract_frontmatter(text)
    return parse_yaml_via_yq(fm_text or "")


def parse_iso_datetime(value: str) -> datetime | None:
    try:
        # Accept ISO-8601 strings like 2026-03-10T21:57+08:00.
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def age_days(updated_iso: str | None, fallback_mtime: float | None = None) -> int | None:
    dt = parse_iso_datetime(updated_iso) if updated_iso else None
    if dt is None and fallback_mtime is not None:
        dt = datetime.fromtimestamp(fallback_mtime).astimezone()
    if dt is None:
        return None
    delta = datetime.now().astimezone() - dt.astimezone()
    return int(delta.total_seconds() // 86400)


def replace_frontmatter_field(text: str, key: str, value: str) -> str:
    lines = text.splitlines(keepends=True)
    if not lines or lines[0].strip() != "---":
        return text

    end_idx = None
    for idx in range(1, len(lines)):
        if lines[idx].strip() == "---":
            end_idx = idx
            break
    if end_idx is None:
        return text

    fm_lines = lines[1:end_idx]
    key_re = re.compile(rf"^{re.escape(key)}\s*:")
    replaced = False
    for idx, line in enumerate(fm_lines):
        if key_re.match(line):
            fm_lines[idx] = f"{key}: {value}\n"
            replaced = True
            break
    if not replaced:
        fm_lines.append(f"{key}: {value}\n")

    return "".join([lines[0], *fm_lines, *lines[end_idx:]])


@dataclass(frozen=True)
class Milestone:
    id: str
    status: str
    path: Path
    slug: str | None = None
    updated: str | None = None


def detect_milestone_status_from_body(body: str) -> str | None:
    match = re.search(r"^状态：\s*([a-zA-Z_]+)\s*$", body, flags=re.M)
    if not match:
        return None
    return match.group(1).strip()


def load_milestones() -> list[Milestone]:
    milestones: list[Milestone] = []
    for path in sorted(MILESTONES_DIR.glob("*.md")):
        text = path.read_text(encoding="utf-8")
        fm_text, body = extract_frontmatter(text)
        fm = parse_yaml_via_yq(fm_text or "")
        mid = normalize_milestone_id(fm.get("id"))
        status = (fm.get("status") or "").strip() if isinstance(fm.get("status"), str) else None
        if not status:
            status = detect_milestone_status_from_body(body)
        if not mid or not status:
            raise RuntimeError(f"Missing milestone metadata: {path}")
        slug = fm.get("slug") if isinstance(fm.get("slug"), str) else None
        updated = fm.get("updated") if isinstance(fm.get("updated"), str) else None
        milestones.append(Milestone(id=mid, status=status, path=path, slug=slug, updated=updated))
    return milestones


def parse_roadmap_table(text: str) -> dict[str, str]:
    rows: dict[str, str] = {}
    for line in text.splitlines():
        if not line.startswith("|"):
            continue
        parts = [part.strip() for part in line.strip().strip("|").split("|")]
        if len(parts) < 4:
            continue
        if parts[0] == "编号" or not parts[0].isdigit():
            continue
        mid = parts[0].zfill(2)
        status = parts[2]
        rows[mid] = status
    return rows


def sync_roadmap(dry_run: bool) -> int:
    milestones = load_milestones()
    current = ROADMAP_PATH.read_text(encoding="utf-8")
    roadmap = parse_roadmap_table(current)

    desired: dict[str, str] = {m.id: m.status for m in milestones}

    changed = False
    updated_lines: list[str] = []
    for line in current.splitlines(keepends=True):
        if not line.startswith("|"):
            updated_lines.append(line)
            continue

        raw_parts = line.strip().strip("|").split("|")
        parts = [part.strip() for part in raw_parts]
        if len(parts) < 4 or parts[0] == "编号" or not parts[0].isdigit():
            updated_lines.append(line)
            continue

        mid = parts[0].zfill(2)
        if mid not in desired:
            updated_lines.append(line)
            continue

        status = desired[mid]
        if parts[2] != status:
            parts[2] = status
            changed = True
            rebuilt = "| " + " | ".join(parts) + " |\n"
            updated_lines.append(rebuilt)
            continue

        updated_lines.append(line)

    if not changed:
        print("roadmap: already in sync")
        return 0

    if dry_run:
        print("roadmap: would update statuses (dry-run)")
        return 1

    ROADMAP_PATH.write_text("".join(updated_lines), encoding="utf-8")
    print("roadmap: updated")
    return 0


def lint() -> int:
    issues: list[str] = []
    warnings: list[str] = []

    milestones = load_milestones()
    roadmap_text = ROADMAP_PATH.read_text(encoding="utf-8")
    roadmap = parse_roadmap_table(roadmap_text)
    for milestone in milestones:
        expected = milestone.status
        actual = roadmap.get(milestone.id)
        if actual is None:
            issues.append(f"roadmap: missing row for milestone {milestone.id}")
            continue
        if actual != expected:
            issues.append(
                f"status mismatch: milestone {milestone.id} is {expected} but roadmap has {actual} ({milestone.path})"
            )

    progress_text = PROGRESS_PATH.read_text(encoding="utf-8")
    progress_fm_text, _ = extract_frontmatter(progress_text)
    progress_fm = parse_yaml_via_yq(progress_fm_text or "")
    focus = normalize_milestone_id(progress_fm.get("focus"))
    active = progress_fm.get("active") or []
    active_ids = []
    if isinstance(active, list):
        active_ids = [normalize_milestone_id(item) for item in active]
        active_ids = [item for item in active_ids if item]

    in_progress = sorted([m.id for m in milestones if m.status == "in_progress"])
    if len(in_progress) > 1:
        if not focus:
            issues.append("progress: multiple in_progress milestones but missing frontmatter focus")
        elif focus not in in_progress:
            issues.append(f"progress: focus={focus} is not in in_progress milestones: {', '.join(in_progress)}")

        missing = sorted(set(in_progress) - set(active_ids))
        if missing:
            issues.append(
                "progress: frontmatter active list missing in_progress milestone(s): " + ", ".join(missing)
            )

    if "## 当前状态快照" not in progress_text[:1200]:
        issues.append("progress: missing '## 当前状态快照' section near top")

    if not BLOCKERS_PATH.exists():
        issues.append("blockers: missing tasks/blockers.md")
    else:
        blockers_text = BLOCKERS_PATH.read_text(encoding="utf-8")
        if "| id | status |" not in blockers_text:
            issues.append("blockers: missing table header (| id | status | ...)")

    if ARCHIVE_INDEX_PATH.exists():
        indexed = parse_archive_index_milestones(ARCHIVE_INDEX_PATH.read_text(encoding="utf-8"))
        for archived in sorted((TASKS_DIR / "archive" / "milestones").glob("*.md")):
            if archived.stem not in indexed:
                warnings.append(f"archive-index: missing milestone entry for {archived.name}")

    done_active = [m for m in milestones if m.status == "done"]
    if done_active:
        for milestone in done_active:
            days = age_days(milestone.updated, milestone.path.stat().st_mtime)
            if days is not None and days >= ARCHIVE_DONE_STALE_DAYS:
                warnings.append(
                    f"archive: milestone {milestone.id} is done and stale for {days} days; consider moving to tasks/archive/milestones/"
                )
            else:
                warnings.append(
                    f"archive: milestone {milestone.id} is done but still in active dir; consider archiving when stable"
                )

    progress_lines = PROGRESS_PATH.read_text(encoding="utf-8").splitlines()
    progress_entry_count = 0
    for line in progress_lines:
        if re.match(r"^##\s+\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?\b", line.strip()):
            progress_entry_count += 1
    if len(progress_lines) > PROGRESS_ARCHIVE_MAX_LINES or progress_entry_count > PROGRESS_ARCHIVE_MAX_ENTRIES:
        warnings.append(
            "archive: progress.md exceeds active window; consider splitting to tasks/archive/progress/progress-YYYY-MM.md"
        )

    if issues:
        print("lint: FAIL")
        for issue in issues:
            print(f"- {issue}")
        for warning in warnings:
            print(f"- warning: {warning}")
        return 1

    if warnings:
        print("lint: OK (with warnings)")
        for warning in warnings:
            print(f"- warning: {warning}")
        return 0

    print("lint: OK")
    return 0


def append_progress_entry(args: argparse.Namespace) -> int:
    mid = normalize_milestone_id(args.milestone)
    if not mid:
        print("progress: invalid --milestone", file=sys.stderr)
        return 2

    heading = f"## {now_local_hm()} {args.title}\n"
    lines = [
        "\n",
        heading,
        f"- 里程碑：{mid} {args.milestone_name or ''}".rstrip() + "\n",
        f"- 已完成：{args.done}\n",
        f"- 下一步：{args.next}\n",
        f"- 阻塞 / 风险：{args.risk or '无。'}\n",
    ]

    text = PROGRESS_PATH.read_text(encoding="utf-8")
    text = replace_frontmatter_field(text, "updated", now_local_iso())
    PROGRESS_PATH.write_text(text + "".join(lines), encoding="utf-8")
    print("progress: appended")
    return 0


def _parse_markdown_table_rows(lines: list[str]) -> tuple[int, int, list[str], list[list[str]]]:
    header_idx = None
    sep_idx = None
    for idx, line in enumerate(lines):
        if line.strip().startswith("|") and "| id |" in line:
            header_idx = idx
            break
    if header_idx is None:
        raise RuntimeError("table header not found")
    for idx in range(header_idx + 1, len(lines)):
        if lines[idx].strip().startswith("|---"):
            sep_idx = idx
            break
    if sep_idx is None:
        raise RuntimeError("table separator not found")

    header = [cell.strip() for cell in lines[header_idx].strip().strip("|").split("|")]
    rows: list[list[str]] = []
    end_idx = sep_idx + 1
    for idx in range(sep_idx + 1, len(lines)):
        line = lines[idx]
        if not line.strip().startswith("|"):
            break
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if len(cells) != len(header):
            break
        rows.append(cells)
        end_idx = idx + 1
    return header_idx, end_idx, header, rows


def blockers_list() -> int:
    if not BLOCKERS_PATH.exists():
        print("blockers: missing tasks/blockers.md", file=sys.stderr)
        return 2
    lines = BLOCKERS_PATH.read_text(encoding="utf-8").splitlines()
    header_idx, end_idx, header, rows = _parse_markdown_table_rows(lines)
    id_idx = header.index("id")
    status_idx = header.index("status")
    open_rows = [row for row in rows if row[status_idx] in ("open", "mitigated")]

    if not open_rows:
        print("blockers: none")
        return 0

    print("blockers:")
    for row in open_rows:
        print(f"- {row[id_idx]} ({row[status_idx]})")
    return 0


def parse_archive_index_milestones(text: str) -> set[str]:
    items: set[str] = set()
    in_section = False
    for line in text.splitlines():
        if line.strip() == "## Milestones":
            in_section = True
            continue
        if line.startswith("## ") and line.strip() != "## Milestones":
            in_section = False
        if not in_section:
            continue
        match = re.match(r"^- \s*`([^`]+)`\s*$", line.strip())
        if match:
            items.add(match.group(1))
    return items


def archive_candidates() -> int:
    milestones = load_milestones()
    done_active = [m for m in milestones if m.status == "done"]

    archive_index_text = ARCHIVE_INDEX_PATH.read_text(encoding="utf-8") if ARCHIVE_INDEX_PATH.exists() else ""
    indexed = parse_archive_index_milestones(archive_index_text) if archive_index_text else set()

    progress_lines = PROGRESS_PATH.read_text(encoding="utf-8").splitlines()
    progress_entry_count = 0
    for line in progress_lines:
        if re.match(r"^##\s+\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?\b", line.strip()):
            progress_entry_count += 1

    printed_any = False

    if done_active:
        printed_any = True
        print("milestones to archive (candidates):")
        for milestone in done_active:
            days = age_days(milestone.updated, milestone.path.stat().st_mtime)
            ready = days is not None and days >= ARCHIVE_DONE_STALE_DAYS
            target = TASKS_DIR / "archive" / "milestones" / milestone.path.name
            extra = []
            if ready:
                extra.append(f"ready (stale {days}d)")
            elif days is not None:
                extra.append(f"not-ready (stale {days}d)")
            else:
                extra.append("unknown-age")
            if milestone.path.stem not in indexed:
                extra.append("missing-archive-index")
            print(f"- {milestone.id} {milestone.path.name} -> {target} ({', '.join(extra)})")

    if len(progress_lines) > PROGRESS_ARCHIVE_MAX_LINES or progress_entry_count > PROGRESS_ARCHIVE_MAX_ENTRIES:
        printed_any = True
        month = datetime.now().astimezone().strftime("%Y-%m")
        target = TASKS_DIR / "archive" / "progress" / f"progress-{month}.md"
        print("progress to archive (candidates):")
        print(
            f"- progress.md has {len(progress_lines)} lines / {progress_entry_count} entries -> {target}"
        )

    if not printed_any:
        print("archive: no candidates")
    return 0


def blockers_add(args: argparse.Namespace) -> int:
    blocker_id = args.id.strip()
    if not blocker_id:
        print("blockers: empty --id", file=sys.stderr)
        return 2

    text = BLOCKERS_PATH.read_text(encoding="utf-8")
    lines = text.splitlines(keepends=True)
    header_idx, end_idx, header, rows = _parse_markdown_table_rows([l.rstrip("\n") for l in lines])

    if blocker_id in [row[header.index("id")] for row in rows]:
        print(f"blockers: already exists: {blocker_id}", file=sys.stderr)
        return 2

    row = [
        blocker_id,
        args.status,
        args.since,
        args.owner,
        normalize_milestone_id(args.milestone) or args.milestone,
        args.note,
    ]

    table_line = "| " + " | ".join(row) + " |\n"

    updated_lines = []
    for idx, line in enumerate(lines):
        updated_lines.append(line)
        if idx == end_idx - 1:
            updated_lines.append(table_line)

    updated_text = "".join(updated_lines)
    updated_text = replace_frontmatter_field(updated_text, "updated", now_local_iso())
    BLOCKERS_PATH.write_text(updated_text, encoding="utf-8")
    print(f"blockers: added: {blocker_id}")
    return 0


def blockers_close(args: argparse.Namespace) -> int:
    blocker_id = args.id.strip()
    if not blocker_id:
        print("blockers: empty --id", file=sys.stderr)
        return 2

    text = BLOCKERS_PATH.read_text(encoding="utf-8")
    lines = text.splitlines(keepends=True)
    header_idx, end_idx, header, rows = _parse_markdown_table_rows([l.rstrip("\n") for l in lines])
    id_idx = header.index("id")
    status_idx = header.index("status")

    found = False
    for row in rows:
        if row[id_idx] == blocker_id:
            row[status_idx] = "closed"
            found = True
            break
    if not found:
        print(f"blockers: not found: {blocker_id}", file=sys.stderr)
        return 2

    rendered = []
    for row in rows:
        rendered.append("| " + " | ".join(row) + " |\n")

    # Rebuild file: keep everything up to separator, then rendered rows.
    rebuilt: list[str] = []
    rebuilt.extend(lines[: end_idx - len(rows)])
    rebuilt.extend(rendered)
    rebuilt.extend(lines[end_idx:])

    updated_text = "".join(rebuilt)
    updated_text = replace_frontmatter_field(updated_text, "updated", now_local_iso())
    BLOCKERS_PATH.write_text(updated_text, encoding="utf-8")
    print(f"blockers: closed: {blocker_id}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="taskctl", description="Lightweight task docs helper for ./lark")
    sub = parser.add_subparsers(dest="cmd", required=True)

    lint_p = sub.add_parser("lint", help="check consistency between milestones/roadmap/progress/blockers")
    lint_p.set_defaults(func=lambda _args: lint())

    sync_p = sub.add_parser("sync-roadmap", help="sync tasks/roadmap.md status from tasks/milestones/*.md")
    sync_p.add_argument("--dry-run", action="store_true")
    sync_p.set_defaults(func=lambda args: sync_roadmap(dry_run=args.dry_run))

    progress_p = sub.add_parser("progress", help="append an entry to tasks/progress.md")
    progress_sub = progress_p.add_subparsers(dest="progress_cmd", required=True)
    progress_add_p = progress_sub.add_parser("add", help="append a progress entry")
    progress_add_p.add_argument("--milestone", required=True, help="milestone id, e.g. 04")
    progress_add_p.add_argument("--milestone-name", default="", help="optional human name")
    progress_add_p.add_argument("--title", required=True, help="entry title")
    progress_add_p.add_argument("--done", required=True, help="what is done")
    progress_add_p.add_argument("--next", required=True, help="what is next")
    progress_add_p.add_argument("--risk", default="", help="blockers/risks")
    progress_add_p.set_defaults(func=append_progress_entry)

    blockers_p = sub.add_parser("blockers", help="manage tasks/blockers.md")
    blockers_sub = blockers_p.add_subparsers(dest="blockers_cmd", required=True)
    blockers_list_p = blockers_sub.add_parser("list", help="list open blockers")
    blockers_list_p.set_defaults(func=lambda _args: blockers_list())

    blockers_add_p = blockers_sub.add_parser("add", help="add a blocker row")
    blockers_add_p.add_argument("--id", required=True)
    blockers_add_p.add_argument("--status", default="open", choices=["open", "mitigated", "closed"])
    blockers_add_p.add_argument("--since", default=datetime.now().astimezone().strftime("%Y-%m-%d"))
    blockers_add_p.add_argument("--owner", default=os.environ.get("USER", ""))
    blockers_add_p.add_argument("--milestone", default="")
    blockers_add_p.add_argument("--note", required=True)
    blockers_add_p.set_defaults(func=blockers_add)

    blockers_close_p = blockers_sub.add_parser("close", help="mark a blocker as closed")
    blockers_close_p.add_argument("--id", required=True)
    blockers_close_p.set_defaults(func=blockers_close)

    archive_p = sub.add_parser("archive", help="archive helpers (read-only candidates)")
    archive_sub = archive_p.add_subparsers(dest="archive_cmd", required=True)
    archive_candidates_p = archive_sub.add_parser("candidates", help="show archive candidates")
    archive_candidates_p.set_defaults(func=lambda _args: archive_candidates())

    return parser


def main(argv: list[str]) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return int(args.func(args))
    except RuntimeError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
