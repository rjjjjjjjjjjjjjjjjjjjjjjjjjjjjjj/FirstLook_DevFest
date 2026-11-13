export type DescriptionAlert = "emergency" | "self_harm" | null;

const normalize = (text: string) =>
  text
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ");

const EMERGENCY_PATTERNS = [
  /\b(?:can't|cannot|cant|can not) breathe\b/,
  /\bbone (?:is )?(?:showing|visible|exposed)\b/,
  /\b(?:won't|wont|will not|doesn't|doesnt|does not) stop bleeding\b/,
  /\bpassed out\b/,
  /\bchest pain\b/,
  /\bno puedo respirar\b/,
  /\bhueso (?:visible|expuesto|sobresaliendo)\b/,
  /\bno (?:para|deja) de sangrar\b/,
  /\bse desmayo\b/,
  /\bdolor (?:en el )?pecho\b/,
];

const SELF_HARM_PATTERNS = [
  /\bself[- ]harm\b/,
  /\bhurt myself\b/,
  /\bkill myself\b/,
  /\bend my life\b/,
  /\bsuicid(?:al|e|io)\b/,
  /\b(?:don't|dont|do not) want to live\b/,
  /\bhacerme dano\b/,
  /\bmatarme\b/,
  /\bquitarme la vida\b/,
  /\bno quiero vivir\b/,
];

/** Local-only crisis scan. Description text is never needed for this decision. */
export function scanDescription(text: string): DescriptionAlert {
  const value = normalize(text);
  if (SELF_HARM_PATTERNS.some((pattern) => pattern.test(value))) return "self_harm";
  if (EMERGENCY_PATTERNS.some((pattern) => pattern.test(value))) return "emergency";
  return null;
}
