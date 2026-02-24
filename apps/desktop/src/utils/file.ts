const MAX_STEM_LENGTH = 50;

/** Derive a filename stem from the first non-empty line of content.
 *  Strips markdown heading markers, invalid filename chars, and truncates
 *  at a word boundary so no word is half-cut. Returns null when nothing
 *  usable is found. */
export function stemFromContent(content: string): string | null {
  for (const line of content.split("\n")) {
    const cleaned = line
      .replace(/^#+\s*/, "")
      .replace(/[/\\:*?"<>|]/g, "")
      .trim();
    if (!cleaned) continue;
    if (cleaned.length <= MAX_STEM_LENGTH) return cleaned;
    const truncated = cleaned.slice(0, MAX_STEM_LENGTH);
    const lastSpace = truncated.lastIndexOf(" ");
    return lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
  }
  return null;
}

/** Return a path that does not collide with existingPaths.
 *  Tries `dir/stem.md`, then `dir/stem (2).md`, `dir/stem (3).md`, … */
export function uniqueFilePath(dir: string, stem: string, existingPaths: string[]): string {
  const base = `${dir}/${stem}.md`;
  if (!existingPaths.includes(base)) return base;
  let n = 2;
  while (true) {
    const candidate = `${dir}/${stem} (${n}).md`;
    if (!existingPaths.includes(candidate)) return candidate;
    n++;
  }
}

export function getParentDir(path: string) {
  const index = path.lastIndexOf("/");
  return index > 0 ? path.slice(0, index) : "";
}

export function getFileName(path: string) {
  const index = path.lastIndexOf("/");
  return index === -1 ? path : path.slice(index + 1);
}

export function getFileStem(path: string) {
  const fileName = getFileName(path);
  return fileName.toLowerCase().endsWith(".md") ? fileName.slice(0, -3) : fileName;
}
