import dayjs from "dayjs";

let lastFileTimestamp = 0;

function nextFileTimestamp() {
  const now = Date.now();
  lastFileTimestamp = now > lastFileTimestamp ? now : lastFileTimestamp + 1;
  return lastFileTimestamp;
}

export function newFilePath(dir: string) {
  return `${dir}/${dayjs(nextFileTimestamp()).format("YYYY-MM-DD HH.mm.ss.SSS")}.md`;
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

export function generateNameFromContent(content: string): string {
  const firstLine = content.split("\n")[0].trim();
  // Remove invalid filename characters
  const sanitized = firstLine.replace(/[\\/:*?"<>|]/g, "");
  return sanitized.substring(0, 80).trim();
}
