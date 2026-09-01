import { StudentProfile } from "./types";

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

// Sentences use {name}/{They}/{their}/{them} placeholders the teacher can
// swap by hand, or just as inspiration. Kept plain-language and connector-free.
export const SUGGESTIONS: Record<SuggestionCategory, Suggestion[]> = {
  opening: [
    {
      id: "o1",
      text: "This term {they} showed real growth in taking responsibility for {their} own learning.",
      profiles: ["strong", "struggling", "behavioral"],
    },
    {
      id: "o2",
      text: "{They} come to class ready to learn and set a positive example for others.",
      profiles: ["strong"],
    },
    {
      id: "o3",
      text: "{They} work with focus and finish tasks to a high standard.",
      profiles: ["strong"],
    },
    {
      id: "o4",
      text: "{They} approach new challenges with curiosity and stick with hard problems.",
      profiles: ["strong"],
    },
    {
      id: "o5",
      text: "{They} have made steady progress in staying organized this term.",
      profiles: ["struggling"],
    },
    {
      id: "o6",
      text: "{They} try {their} best and are becoming more confident asking for help.",
      profiles: ["struggling"],
    },
    {
      id: "o7",
      text: "{They} bring energy to the classroom and care about doing well.",
      profiles: ["struggling", "behavioral"],
    },
    {
      id: "o8",
      text: "{They} are learning to manage {their} feelings and start again after a hard moment.",
      profiles: ["behavioral"],
    },
    {
      id: "o9",
      text: "{They} are building stronger self-regulation skills each week.",
      profiles: ["behavioral"],
    },
    {
      id: "o10",
      text: "{They} respond well to encouragement and want to get along with classmates.",
      profiles: ["behavioral"],
    },
  ],
  nextSteps: [
    {
      id: "n1",
      text: "A good next step is to keep checking {their} work before handing it in.",
      profiles: ["strong", "struggling"],
    },
    {
      id: "n2",
      text: "{They} can stretch {themselves} by taking on more challenging tasks.",
      profiles: ["strong"],
    },
    {
      id: "n3",
      text: "{They} can practise sharing ideas in group work so others hear {their} thinking.",
      profiles: ["strong"],
    },
    {
      id: "n4",
      text: "{They} will benefit from using a checklist to keep track of materials and homework.",
      profiles: ["struggling"],
    },
    {
      id: "n5",
      text: "A helpful next step is to start tasks right away and ask for help early.",
      profiles: ["struggling"],
    },
    {
      id: "n6",
      text: "{They} can keep building focus by working in short, steady stretches.",
      profiles: ["struggling", "behavioral"],
    },
    {
      id: "n7",
      text: "{They} can practise pausing and taking a breath before responding when frustrated.",
      profiles: ["behavioral"],
    },
    {
      id: "n8",
      text: "A useful next step is to use calm-down strategies we have practised in class.",
      profiles: ["behavioral"],
    },
    {
      id: "n9",
      text: "{They} can keep working on listening to others before sharing {their} own view.",
      profiles: ["behavioral"],
    },
  ],
  closing: [
    {
      id: "c1",
      text: "It is a pleasure to have {them} in our class.",
      profiles: ["strong"],
    },
    {
      id: "c2",
      text: "{They} should be proud of the effort {they} have put in this term.",
      profiles: ["strong", "struggling"],
    },
    {
      id: "c3",
      text: "With continued practice, {they} will keep growing as a learner.",
      profiles: ["strong", "struggling", "behavioral"],
    },
    {
      id: "c4",
      text: "I look forward to seeing {their} progress next term.",
      profiles: ["strong", "struggling", "behavioral"],
    },
    {
      id: "c5",
      text: "With support at school and home, {they} will keep moving forward.",
      profiles: ["struggling", "behavioral"],
    },
    {
      id: "c6",
      text: "Every small step {they} take makes a difference, and {they} are getting there.",
      profiles: ["behavioral"],
    },
  ],
};
