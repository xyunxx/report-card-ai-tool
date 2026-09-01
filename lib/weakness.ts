// Lightweight, client-side heuristic. It flags when the teacher's notes seem to
// mention a weakness, so the UI can prompt for one concrete example. It is
// intentionally forgiving — a false positive just shows an optional box.

const WEAKNESS_PATTERNS: RegExp[] = [
  /\bstruggl/i,
  /\bdifficult/i,
  /\bhard time\b/i,
  /\btrouble\b/i,
  /\bneeds? to\b/i,
  /\bneeds? (more|improvement|work|support|help)\b/i,
  /\bweak(ness)?\b/i,
  /\bpoor\b/i,
  /\brarely\b/i,
  /\bseldom\b/i,
  /\bforget/i,
  /\bdistract/i,
  /\boff[- ]task\b/i,
  /\bunfocus/i,
  /\bincomplete\b/i,
  /\b(hands? in|turns? in).{0,20}\blate\b/i,
  /\bdisorganiz/i,
  /\bdisrupt/i,
  /\bcan'?t\b/i,
  /\bcannot\b/i,
  /\bdoesn'?t\b/i,
  /\bdoes not\b/i,
  /\bwon'?t\b/i,
  /\brefus/i,
  /\bblurt/i,
  /\bcalling out\b/i,
  /\blacks?\b/i,
  /\binconsistent/i,
  /\bavoid/i,
  /\bgive[s]? up\b/i,
  /\bnot (yet )?(able|ready|consistent)/i,
];

export function mentionsWeakness(notes: string): boolean {
  if (!notes || notes.trim().length < 4) return false;
  return WEAKNESS_PATTERNS.some((re) => re.test(notes));
}
