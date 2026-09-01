"use client";

import { useMemo, useState } from "react";
import {
  SUGGESTIONS,
  CATEGORY_LABELS,
  PROFILE_LABELS,
  SuggestionCategory,
} from "@/lib/suggestions";
import { PRONOUNS, PronounKey, StudentProfile } from "@/lib/types";

const CATEGORIES: SuggestionCategory[] = ["opening", "nextSteps", "closing"];
const PROFILES: StudentProfile[] = ["strong", "struggling", "behavioral"];

// Fill {They}/{their}/{them}/{themselves} placeholders using the current pronoun.
function applyPronoun(text: string, pronoun: PronounKey): string {
  const p = PRONOUNS[pronoun];
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return text
    .replace(/\{They\}/g, cap(p.subject))
    .replace(/\{they\}/g, p.subject)
    .replace(/\{their\}/g, p.possessive)
    .replace(/\{them\}/g, p.object)
    .replace(/\{themselves\}/g, p.reflexive);
}

export default function SuggestionSidebar({
  pronoun,
  onInsert,
}: {
  pronoun: PronounKey;
  onInsert: (text: string) => void;
}) {
  const [profile, setProfile] = useState<StudentProfile>("strong");

  const filtered = useMemo(() => {
    const out: Record<SuggestionCategory, string[]> = {
      opening: [],
      nextSteps: [],
      closing: [],
    };
    for (const cat of CATEGORIES) {
      out[cat] = SUGGESTIONS[cat]
        .filter((s) => s.profiles.includes(profile))
        .map((s) => applyPronoun(s.text, pronoun));
    }
    return out;
  }, [profile, pronoun]);

  return (
    <aside className="sidebar">
      <div className="panel">
        <h2>Suggestion library</h2>
        <p className="hint">
          Filter by student profile, then click a line to drop it into your
          notes as a hint for the AI.
        </p>

        <div className="filter-group">
          <label className="field-label">Student profile</label>
          <div className="seg stack">
            {PROFILES.map((p) => (
              <button
                key={p}
                className={profile === p ? "active" : ""}
                onClick={() => setProfile(p)}
                type="button"
              >
                {PROFILE_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {CATEGORIES.map((cat) => (
          <div className="cat-block" key={cat}>
            <h3>{CATEGORY_LABELS[cat]}</h3>
            {filtered[cat].map((text, i) => (
              <div
                key={i}
                className="suggestion"
                onClick={() => onInsert(text)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onInsert(text);
                }}
              >
                {text}
                <span className="add-note">+ add to notes</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}
