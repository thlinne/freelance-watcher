import fs from "fs";
import path from "path";

export interface SeenEntry {
  id: string;
  notifiedAt: string;
}

const SEEN_PATH = path.join(__dirname, "../data/seen.json");

export function loadSeen(): SeenEntry[] {
  if (!fs.existsSync(SEEN_PATH)) return [];
  const raw = fs.readFileSync(SEEN_PATH, "utf-8");
  return JSON.parse(raw) as SeenEntry[];
}

export function saveSeen(entries: SeenEntry[]): void {
  fs.writeFileSync(SEEN_PATH, JSON.stringify(entries, null, 2), "utf-8");
}

export function isNew(id: string, seen: SeenEntry[]): boolean {
  return !seen.some((e) => e.id === id);
}

export function markAsSeen(id: string, seen: SeenEntry[]): SeenEntry[] {
  return [...seen, { id, notifiedAt: new Date().toISOString() }];
}
