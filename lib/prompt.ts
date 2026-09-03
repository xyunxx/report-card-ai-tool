import { GenerateRequest, PRONOUNS, PronounKey } from "./types";

/**
 * Model settings for the comment-generation call. Lives here, next to the
 * prompt it goes with, so the app and scripts/check-sentence-rule.js cannot
 * drift apart — the regression check must exercise the real settings.
 *
 * max_tokens is deliberately generous. The model spends a variable amount on
 * reasoning before the comment: measured output usage for the same input
 * ranged from ~200 to ~2510 tokens for a comment of only ~120 words. A
 * response that hits the cap comes back truncated mid-sentence or with an
 * empty text block, and the retry in the route only catches the empty case.
 */
export const GENERATION_CONFIG = {
  model: "claude-sonnet-5",
  max_tokens: 4000,
} as const;

function pronounGuide(pronoun: PronounKey): string {
  const p = PRONOUNS[pronoun];
  const agreement = p.isPlural
    ? `Use "${p.subject}" with PLURAL verb agreement even for one student (e.g. "They are", "They have", "They work"). Never write "they is" or "they has".`
    : `Use "${p.subject}" with singular verb agreement (e.g. "${p.subject} is", "${p.subject} has").`;
  return [
    `Refer to the student ONLY with these pronouns — never use a name, "the student", or "this child" as a substitute for the subject pronoun:`,
    `- subject: ${p.subject}`,
    `- object: ${p.object}`,
    `- possessive: ${p.possessive}`,
    `- reflexive: ${p.reflexive}`,
    agreement,
  ].join("\n");
}

/**
 * Words and phrases the comment must not use. Single source of truth: the STYLE
 * bullets in SYSTEM_PROMPT below are rendered from these lists, and
 * scripts/check-sentence-rule.js imports them to lint lib/suggestions.ts. Add a
 * banned phrase here and both the model and the checker pick it up.
 *
 * `phrase` is what the prompt shows the model. `match` is what the checker looks
 * for, when a broader match is wanted than the phrase itself — "with continued
 * effort" reads better in the prompt, but the checker should also catch "with
 * continued practice". Without `match`, the checker matches `phrase` as a whole
 * word, so short entries like "we" cannot fire on "well".
 */
export interface BannedPhrase {
  phrase: string;
  match?: string;
}

export const BANNED_CONNECTORS: BannedPhrase[] = [
  { phrase: "therefore" },
  { phrase: "however" },
  { phrase: "furthermore" },
  { phrase: "moreover" },
  { phrase: "consequently" },
  { phrase: "nevertheless" },
  { phrase: "in addition" },
  { phrase: "as a result" },
];

export const BANNED_PADDING: BannedPhrase[] = [
  { phrase: "which shows" },
  { phrase: "consistently" },
  { phrase: "demonstrate", match: "demonstrat" },
  { phrase: "demonstrates strong skills", match: "demonstrat" },
  { phrase: "going forward" },
  { phrase: "with continued effort", match: "with continued" },
  { phrase: "on several occasions" },
  { phrase: "real dedication" },
];

/** Teacher-voice giveaways, listed in the prompt with "or" before the last. */
export const BANNED_TEACHER_VOICE: BannedPhrase[] = [
  { phrase: "I asked" },
  { phrase: "I had to tell him" },
  { phrase: "I reminded them" },
  { phrase: "I pulled him aside" },
  { phrase: "I have spoken to" },
  { phrase: "we discussed" },
];

/** Teacher-voice words, listed separately in the same prompt bullet. */
export const BANNED_TEACHER_WORDS: BannedPhrase[] = [
  { phrase: "we" },
  { phrase: "our class" },
  { phrase: "my" },
];

export const BANNED_PHRASES: BannedPhrase[] = [
  ...BANNED_CONNECTORS,
  ...BANNED_PADDING,
  ...BANNED_TEACHER_VOICE,
  ...BANNED_TEACHER_WORDS,
];

/** `"a", "b", "c"` — the form the prompt lists these in. */
function quoted(items: BannedPhrase[]): string {
  return items.map((b) => `"${b.phrase}"`).join(", ");
}

/** `"a", "b", or "c"` — same, with "or" before the last item. */
function quotedOr(items: BannedPhrase[]): string {
  const q = items.map((b) => `"${b.phrase}"`);
  return `${q.slice(0, -1).join(", ")}, or ${q[q.length - 1]}`;
}

export const SYSTEM_PROMPT = `SENTENCE RULE — READ THIS FIRST. It outranks every other instruction below it and applies to every comment you write, in every mode, with every toggle on or off. It has two parts.

PART 1 — ABSOLUTE, no exceptions, regardless of sentence length. Every sentence you write has exactly ONE subject. Never put two subjects in one sentence by joining them with "and", "but", "so", "or", "yet", or a comma. If a second subject appears, that is where the sentence ends — put a period there and start the next one.
- WRONG: "She keeps her materials organized, and she is learning to plan her time." (two subjects: "She", "she")
- RIGHT: "She keeps her materials organized. She is learning to plan her time."
- WRONG: "He asks good questions in group work, and his written reflections are improving." (two subjects: "He", "his written reflections")
- RIGHT: "He asks good questions in group work. His written reflections are improving."
- WRONG: "The routine is working well, so taking on longer tasks is the next step." (two subjects: "The routine", "taking on longer tasks")
- RIGHT: "The routine is working well. Taking on longer tasks is the next step."
A gerund phrase like "taking on longer tasks" counts as a subject. Two subjects means two sentences, even when the sentence is short. A subordinate clause ("when he is ready", "which is great progress", "before he begins") does NOT count as a second subject — those may stay.

PART 2 — a compound predicate (ONE subject, two verbs) is allowed, but only when the sentence stays short. "He is a hard worker and always completes his homework" is correct as written — both halves share the subject "He", and it is only 10 words. Preserve sentences like that, do not split them. But COUNT THE WORDS: if a compound predicate pushes the sentence past 14 words, split it at the "and" and repeat the subject.
- TOO LONG (21 words): "He is building his confidence with daily tasks and is starting to show more willingness to engage with his work."
- FIXED: "He is building his confidence with daily tasks. He is starting to show more willingness to engage with his work."

SENTENCE LENGTH — aim for roughly 8 to 14 words per sentence. This is a target, not a hard cap. An occasional shorter or longer sentence is fine, but most sentences should land in that range.

FINAL CHECK — before you output, go through the comment one sentence at a time and do both of these. This is not optional.
1. Count the subjects. If a sentence has more than one, split it at the second subject.
2. Count the words. If the sentence is over 14 words and contains an "and", split it there and repeat the subject.

You write Ontario elementary report card comments about a student's LEARNING SKILLS AND WORK HABITS (responsibility, organization, independent work, collaboration, initiative, self-regulation). You are given a teacher's rough, freeform notes about one student and you turn them into a finished comment a parent will read.

STRUCTURE — always produce exactly these three parts, in this order, as one flowing paragraph (no headings, no bullet points, no labels):
1. A positive, strength-focused opening that names real growth the student has shown over the term.
2. One or two evidence-based growth areas. Each growth area must reference a concrete observable behaviour, not a vague label. Group related behaviours under ONE growth area. If two details point at the same underlying skill (for example losing focus during independent work and chatting with classmates about other topics are both about working independently), write a single growth area and use the extra detail as supporting evidence inside it. Only write a second growth area when it is a genuinely distinct skill (for example organization versus collaboration). One well-supported growth area is better than two thin ones.
3. Clear, actionable next steps the student can work on, phrased as forward-looking encouragement.

STYLE — non-negotiable:
- Short sentences. One idea per sentence. The SENTENCE RULE at the top of this prompt governs; if a sentence has a comma-clause or an "and" tacked onto it, break it into two sentences instead.
- Active voice. Say who did what: "They left their workspace messy", never "materials have been found around their workspace".
- Always write about the STUDENT in the third person. The comment never speaks in the teacher's voice about what the teacher did. Never write ${quotedOr(BANNED_TEACHER_VOICE)}. Rewrite any teacher action as the student's observed behaviour pattern: "This term I asked him to stop chatting with others about unrelated topics" becomes "He has had some difficulty staying on task and can be distracted by conversations with classmates." Never use ${quotedOr(BANNED_TEACHER_WORDS)} about the teacher either.
- Do NOT use fancy connectors: no ${quoted(BANNED_CONNECTORS)}. Just start a new sentence.
- Do NOT use padding or formal-sounding phrases: no ${quoted(BANNED_PADDING)}. Say the plain thing instead: "always", "shows", "next", "a few times".
- End with a short, simple closing line such as "Keep up the great work!". Do NOT end with a summarizing wrap-up sentence about building on strengths or continued effort.
- Straightforward, warm, matter-of-fact tone.
- Always positive and parent-friendly, no matter how blunt or negative the teacher's notes are. Never repeat harsh or judgmental wording. Reframe every weakness as a growth area or next step.
- Never blame the student's character. Describe behaviours and skills, not personality.
- No jargon, no clichés, no filler. Do not invent achievements the notes do not support, but you may soften and generalize.
- Length: aim for roughly 90 to 160 words in total. Count words, not sentences — the sentence rule above means short sentences, so the number of sentences will vary and that is correct. Do not pad to reach 90 words. Do not drop a needed growth area to stay under 160.

VOICE CALIBRATION — the comment on the left is too formal. Match the one on the right.

TOO FORMAL:
"They are a hard worker and consistently complete their homework, which shows real dedication. They also demonstrate strong skills in math. One area for growth is organization: materials have been found around their workspace after class on several occasions. Another area for growth is group work, where they sometimes talk more than needed, which can make it harder for others to share ideas. Going forward, they can work on keeping their desk tidy by setting aside a few minutes at the end of each day to pack up materials. They can also practice pausing during group discussions to give others a turn to speak. With continued effort in these areas, they will build on the strong work habits they already show."

TARGET VOICE:
"They are a hard worker and always complete their homework. They also show strong skills in math. One area for growth is organization. They left their workspace messy a few times after class. Another area for growth is group work. They sometimes talk more than needed, which makes it harder for others to share ideas. Next, they can work on keeping their desk tidy by packing up at the end of each day. They can also practice waiting for others to speak during group discussions. Keep up the great work!"

OUTPUT: Return ONLY the finished comment text, as one single paragraph on one line. No blank lines, no line breaks, no preamble, no quotation marks, no notes about what you did.`;

export function buildUserPrompt(req: GenerateRequest): string {
  const parts: string[] = [];

  parts.push(pronounGuide(req.pronoun));
  parts.push("");

  if (req.difficultCase) {
    parts.push(
      [
        `DIFFICULT CASE MODE IS ON. This student is struggling or has had behavioural challenges.`,
        `This mode changes WORD CHOICE ONLY. It does not change sentence length, sentence structure, or any other STYLE rule.`,
        `What to change — the words:`,
        `- Pick softer, more diplomatic words. Never state or imply the student is disruptive, lazy, defiant, unmotivated, or a problem. Never say the student "doesn't try", "doesn't put in full effort", or "doesn't care".`,
        `- Frame every challenge as an emerging skill the student is developing. Use growth-mindset wording: "is starting to", "is building", "is learning to", "is working on".`,
        `- Emphasize effort, small wins, and support. A parent reading this should feel their child is cared for and capable.`,
        `What must NOT change — the structure. The STYLE rules in the system prompt still apply exactly as written:`,
        `- Short sentences. One idea per sentence. This version must read at the same sentence-length and simplicity level as a version written with this mode off.`,
        `- The SENTENCE RULE at the top of the system prompt applies here unchanged. Softer growth-mindset wording is exactly where two ideas tend to get joined with "and" — do not let it happen. "He is kind and cooperative in class, and he is starting to build more confidence" is WRONG. Write "He is kind and cooperative in class. He is starting to build more confidence." instead.`,
        `- Active voice. No fancy connectors. No padding phrases.`,
        `Softer wording never means longer sentences. If a gentler phrasing makes a sentence long, split it into two short sentences.`,
      ].join("\n"),
    );
    parts.push("");
  }

  if (req.frenchImmersion) {
    parts.push(
      `FRENCH IMMERSION MODE IS ON. This is a French Immersion student. Where it fits naturally, note the student's engagement with learning in French — willingness to take risks with the language, participation in French, and growing comfort communicating in a second language. Keep it about learning skills, not a French grade.`,
    );
    parts.push("");
  }

  if (req.weaknessExamples.length > 0) {
    parts.push(
      [
        `CONCRETE EVIDENCE the teacher provided for weaknesses. Use it to make the growth area specific, but follow these rules:`,
        `- The evidence is written in the teacher's own first-person voice. NEVER copy that voice into the comment. Convert every piece of it into third-person, student-focused language describing what the student does. "I had to tell him to stop talking to classmates" becomes "He can be distracted by conversations with classmates." Do not mention the teacher's actions, reminders, or conversations at all.`,
        `- Soften the wording so it is parent-friendly. Drop counts of incidents, timeframes like "within one week", and any blaming edge.`,
        `- If the evidence supports a growth area already present in the notes, FOLD IT IN as supporting detail for that same growth area. Do not open a second growth area for it. Only separate it out if it is a genuinely different learning skill.`,
        ``,
        `Evidence items (teacher's raw words — convert, never quote):`,
      ].join("\n"),
    );
    for (const ex of req.weaknessExamples) {
      parts.push(`- ${ex}`);
    }
    parts.push("");
  }

  parts.push("TEACHER'S FREEFORM NOTES:");
  parts.push(req.notes.trim());

  return parts.join("\n");
}
