/** Split finding / recommendation copy: first line thesis, `- ` bullets, `\n|` sub-lines. */

export function parseFindingCopy(raw: string): {
  thesis: string;
  bullets: string[];
} {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const thesis = lines[0] ?? "";
  const bullets = lines
    .slice(1)
    .map((l) => (l.startsWith("- ") ? l.slice(2) : l));
  return { thesis, bullets };
}

export function parseWeakLine(raw: string): { main: string; sub?: string } {
  const [main, sub] = raw.split("\n|");
  return { main: main.trim(), sub: sub?.trim() };
}
