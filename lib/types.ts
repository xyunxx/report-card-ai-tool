export type PronounKey = "he" | "she" | "they";

export interface PronounSet {
  subject: string; // he / she / they
  object: string; // him / her / them
  possessive: string; // his / her / their
  possessivePronoun: string; // his / hers / theirs
  reflexive: string; // himself / herself / themselves
  isPlural: boolean; // they -> plural verb agreement
}

export const PRONOUNS: Record<PronounKey, PronounSet> = {
  he: {
    subject: "he",
    object: "him",
    possessive: "his",
    possessivePronoun: "his",
    reflexive: "himself",
    isPlural: false,
  },
  she: {
    subject: "she",
    object: "her",
    possessive: "her",
    possessivePronoun: "hers",
    reflexive: "herself",
    isPlural: false,
  },
  they: {
    subject: "they",
    object: "them",
    possessive: "their",
    possessivePronoun: "theirs",
    reflexive: "themselves",
    isPlural: true,
  },
};

export const PRONOUN_LABELS: Record<PronounKey, string> = {
  he: "he / him",
  she: "she / her",
  they: "they / them",
};

export type StudentProfile =
  | "strong"
  | "struggling"
  | "behavioral";

export interface GenerateRequest {
  notes: string;
  pronoun: PronounKey;
  difficultCase: boolean;
  frenchImmersion: boolean;
  weaknessExamples: string[];
}
