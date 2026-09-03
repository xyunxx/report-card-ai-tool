import { PRONOUNS, PronounKey, StudentProfile } from "./types";

export type SuggestionCategory = "opening" | "nextSteps" | "closing";

export interface Suggestion {
  id: string;
  text: string;
  profiles: StudentProfile[];
}

export const CATEGORY_LABELS: Record<SuggestionCategory, string> = {
  opening: "Opening lines",
  nextSteps: "Next steps",
  closing: "Closing lines",
};

export const PROFILE_LABELS: Record<StudentProfile, string> = {
  strong: "Strong academically",
  struggling: "Struggling academically",
  behavioral: "Behavioural",
};

/**
 * Fill placeholders using the current pronoun.
 *
 * Pronouns:  {They} {they} {their} {them} {themselves}
 * Agreement: {is} -> is/are, {has} -> has/have, {s} and {es} -> verb ending
 *
 * The agreement placeholders exist because "they" takes plural verbs while
 * "he"/"she" take singular ones. Without them a line reads "He come to class".
 * Write every suggestion so it renders correctly for all three pronouns —
 * scripts/check-sentence-rule.js checks this.
 */
export function applyPronoun(text: string, pronoun: PronounKey): string {
  const p = PRONOUNS[pronoun];
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return text
    .replace(/\{They\}/g, cap(p.subject))
    .replace(/\{they\}/g, p.subject)
    .replace(/\{their\}/g, p.possessive)
    .replace(/\{them\}/g, p.object)
    .replace(/\{themselves\}/g, p.reflexive)
    .replace(/\{is\}/g, p.isPlural ? "are" : "is")
    .replace(/\{has\}/g, p.isPlural ? "have" : "has")
    .replace(/\{es\}/g, p.isPlural ? "" : "es")
    .replace(/\{s\}/g, p.isPlural ? "" : "s");
}

/**
 * Click-to-insert hints for the teacher's notes, filtered by student profile.
 *
 * Every suggestion belongs to exactly ONE profile. A teacher who switches from
 * "strong" to "struggling" should see a different list, not the same lines
 * redistributed. The check script fails if a suggestion is listed under more
 * than one profile.
 *
 * These follow the same style rules as the generated comment (see SYSTEM_PROMPT
 * in lib/prompt.ts): never two independent clauses joined by "and" or a comma,
 * short sentences, no formal connectors, no padding, no teacher voice.
 */
export const SUGGESTIONS: Record<SuggestionCategory, Suggestion[]> = {
  opening: [
    // Strong — consistency, independence, depth.
    {
      id: "o-strong-1",
      text: "{They} come{s} to class ready to learn and set{s} a positive example for others.",
      profiles: ["strong"],
    },
    {
      id: "o-strong-2",
      text: "{They} work{s} with focus and finish{es} tasks to a high standard.",
      profiles: ["strong"],
    },
    {
      id: "o-strong-3",
      text: "{They} approach{es} new challenges with curiosity.",
      profiles: ["strong"],
    },
    {
      id: "o-strong-4",
      text: "{They} stick{s} with a hard problem until it makes sense.",
      profiles: ["strong"],
    },

    // Struggling — effort, progress from where they started, asking for help.
    {
      id: "o-struggling-1",
      text: "{They} {has} made steady progress in staying organized this term.",
      profiles: ["struggling"],
    },
    {
      id: "o-struggling-2",
      text: "{They} {is} becoming more confident about asking for help.",
      profiles: ["struggling"],
    },
    {
      id: "o-struggling-3",
      text: "{They} keep{s} trying even when a task feels hard.",
      profiles: ["struggling"],
    },
    {
      id: "o-struggling-4",
      text: "{They} {has} grown more willing to start work on {their} own.",
      profiles: ["struggling"],
    },

    // Behavioural — self-regulation, recovery, relationships.
    {
      id: "o-behavioral-1",
      text: "{They} {is} learning to manage {their} feelings during a hard moment.",
      profiles: ["behavioral"],
    },
    {
      id: "o-behavioral-2",
      text: "{They} {is} building stronger self-regulation skills each week.",
      profiles: ["behavioral"],
    },
    {
      id: "o-behavioral-3",
      text: "{They} respond{s} well to encouragement from adults and classmates.",
      profiles: ["behavioral"],
    },
    {
      id: "o-behavioral-4",
      text: "{They} {is} learning to settle back into work after a busy moment.",
      profiles: ["behavioral"],
    },
  ],

  nextSteps: [
    // Strong — stretch, depth, leadership.
    {
      id: "n-strong-1",
      text: "{They} can stretch {themselves} by taking on more challenging tasks.",
      profiles: ["strong"],
    },
    {
      id: "n-strong-2",
      text: "{They} can practise sharing ideas so others hear {their} thinking.",
      profiles: ["strong"],
    },
    {
      id: "n-strong-3",
      text: "{They} can set a harder goal once the main task is done.",
      profiles: ["strong"],
    },
    {
      id: "n-strong-4",
      text: "{They} can take a leading role in group work.",
      profiles: ["strong"],
    },

    // Struggling — getting started, structure, asking early.
    {
      id: "n-struggling-1",
      text: "{They} can use a checklist to keep track of materials and homework.",
      profiles: ["struggling"],
    },
    {
      id: "n-struggling-2",
      text: "{They} can start a task within the first few minutes.",
      profiles: ["struggling"],
    },
    {
      id: "n-struggling-3",
      text: "{They} can ask for help as soon as a task feels hard.",
      profiles: ["struggling"],
    },
    {
      id: "n-struggling-4",
      text: "{They} can break a big task into smaller steps.",
      profiles: ["struggling"],
    },

    // Behavioural — regulation strategies, listening, sustained focus.
    {
      id: "n-behavioral-1",
      text: "{They} can practise taking a breath before responding when frustrated.",
      profiles: ["behavioral"],
    },
    {
      id: "n-behavioral-2",
      text: "{They} can use the calm-down strategies practised in class.",
      profiles: ["behavioral"],
    },
    {
      id: "n-behavioral-3",
      text: "{They} can listen to others before sharing {their} own view.",
      profiles: ["behavioral"],
    },
    {
      id: "n-behavioral-4",
      text: "{They} can build focus by working in short, steady stretches.",
      profiles: ["behavioral"],
    },
  ],

  closing: [
    // Strong — standard set, quality of work.
    {
      id: "c-strong-1",
      text: "It is a pleasure to have {them} in class.",
      profiles: ["strong"],
    },
    {
      id: "c-strong-2",
      text: "{They} should be proud of the effort {they} {has} put in this term.",
      profiles: ["strong"],
    },
    {
      id: "c-strong-3",
      text: "{They} {has} set a high standard for {themselves} this term.",
      profiles: ["strong"],
    },
    {
      id: "c-strong-4",
      text: "The care {they} put{s} into {their} work really shows.",
      profiles: ["strong"],
    },

    // Struggling — distance travelled, effort paying off.
    {
      id: "c-struggling-1",
      text: "{They} {has} come a long way this term.",
      profiles: ["struggling"],
    },
    {
      id: "c-struggling-2",
      text: "The effort {they} {has} put in is paying off.",
      profiles: ["struggling"],
    },
    {
      id: "c-struggling-3",
      text: "{They} should feel good about the progress {they} {has} made.",
      profiles: ["struggling"],
    },
    {
      id: "c-struggling-4",
      text: "Each new skill {they} build{s} makes the next one easier.",
      profiles: ["struggling"],
    },

    // Behavioural — steady progress, small steps, support.
    {
      id: "c-behavioral-1",
      text: "{They} {is} making real progress in how {they} handle{s} tough moments.",
      profiles: ["behavioral"],
    },
    {
      id: "c-behavioral-2",
      text: "Every small step {they} take{s} makes a difference.",
      profiles: ["behavioral"],
    },
    {
      id: "c-behavioral-3",
      text: "{They} {is} getting there a little more each week.",
      profiles: ["behavioral"],
    },
    {
      id: "c-behavioral-4",
      text: "{They} respond{s} well to steady support at school and home.",
      profiles: ["behavioral"],
    },
  ],
};
