#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Verify npm package version against an expected value or git tag."
    )
    parser.add_argument(
        "--package",
        required=True,
        help="Path to package.json",
    )
    parser.add_argument(
        "--tag",
        help="Git tag name, for example lark-openapi-mcp-v0.5.2",
    )
    parser.add_argument(
        "--prefix",
        default="",
        help="Expected tag prefix before the version, for example lark-openapi-mcp-v",
    )
    parser.add_argument(
        "--expected-version",
        help="Explicit expected version, used for workflow_dispatch checks",
    )
    return parser.parse_args()


def load_package_version(path: Path) -> str:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise SystemExit(f"package.json not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise SystemExit(f"invalid JSON in {path}: {exc}") from exc

    version = data.get("version")
    if not isinstance(version, str) or not version.strip():
        raise SystemExit(f"missing version in {path}")
    return version.strip()


def main() -> int:
    args = parse_args()
    package_path = Path(args.package)
    package_version = load_package_version(package_path)

    if args.expected_version and package_version != args.expected_version:
        print(
            f"version mismatch: package.json has {package_version}, expected {args.expected_version}",
            file=sys.stderr,
        )
        return 1

    if args.tag:
        if not args.tag.startswith(args.prefix):
            print(
                f"tag mismatch: {args.tag} does not start with expected prefix {args.prefix}",
                file=sys.stderr,
            )
            return 1
        tag_version = args.tag[len(args.prefix) :]
        if package_version != tag_version:
            print(
                f"version mismatch: package.json has {package_version}, tag requires {tag_version}",
                file=sys.stderr,
            )
            return 1

    print(f"release check ok: {package_path} version {package_version}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
