import fs from 'fs';
import path from 'path';

const cache = new Map<string, Map<string, string>>();

function getDocsPath(language: 'zh' | 'en'): string {
  const fileName = language === 'zh' ? 'tools-zh.md' : 'tools-en.md';
  return path.resolve(__dirname, '../../docs/reference/tool-presets', fileName);
}

function parseDocsLinks(language: 'zh' | 'en'): Map<string, string> {
  if (cache.has(language)) {
    return cache.get(language)!;
  }

  const docsPath = getDocsPath(language);
  const map = new Map<string, string>();
  if (!fs.existsSync(docsPath)) {
    cache.set(language, map);
    return map;
  }

  const content = fs.readFileSync(docsPath, 'utf8');
  const lines = content.split(/\r?\n/);
  const rowRegex = /^\|\s*([^|]+?)\s*\|\s*\[[^\]]+\]\((https?:\/\/[^)]+)\)\s*\|/;
  for (const line of lines) {
    const match = line.match(rowRegex);
    if (!match) {
      continue;
    }
    const toolName = match[1]?.trim();
    const docsUrl = match[2]?.trim();
    if (toolName && docsUrl) {
      map.set(toolName, docsUrl);
    }
  }

  cache.set(language, map);
  return map;
}

export function getOfficialDocsUrl(toolName: string, language: 'zh' | 'en' = 'zh'): string | undefined {
  const languageMap = parseDocsLinks(language);
  return languageMap.get(toolName) ?? parseDocsLinks(language === 'zh' ? 'en' : 'zh').get(toolName);
}
