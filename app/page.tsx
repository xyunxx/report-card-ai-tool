"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import VoiceButton from "@/components/VoiceButton";
import SuggestionSidebar from "@/components/SuggestionSidebar";
import { PRONOUN_LABELS, PronounKey } from "@/lib/types";
import { mentionsWeakness } from "@/lib/weakness";

const PRONOUN_KEYS: PronounKey[] = ["he", "she", "they"];

export default function Page() {
  // "Current student" field — plain client state, cleared on refresh. No storage.
  const [student, setStudent] = useState("");
  const [notes, setNotes] = useState("");
  const [pronoun, setPronoun] = useState<PronounKey>("they");
  const [difficultCase, setDifficultCase] = useState(false);
  const [frenchImmersion, setFrenchImmersion] = useState(false);

  const [examples, setExamples] = useState<string[]>([]);
  const [exampleDraft, setExampleDraft] = useState("");
  // The example box grows with its content instead of scrolling sideways.
  const exampleRef = useRef<HTMLTextAreaElement | null>(null);

  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const showWeaknessPrompt = useMemo(() => mentionsWeakness(notes), [notes]);

  // Grow the example box to fit its text, so nothing scrolls out of view.
  useEffect(() => {
    const el = exampleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [exampleDraft, showWeaknessPrompt]);

  function appendToNotes(text: string) {
    setNotes((prev) => {
      const sep = prev.trim().length === 0 ? "" : prev.endsWith(" ") ? "" : " ";
      return `${prev}${sep}${text}`.replace(/\s{2,}/g, " ");
    });
  }

  function addExample() {
    const v = exampleDraft.trim();
    if (!v) return;
    setExamples((prev) => [...prev, v]);
    setExampleDraft("");
  }

  function removeExample(i: number) {
    setExamples((prev) => prev.filter((_, idx) => idx !== i));
  }

  function clearStudent() {
    setStudent("");
    setNotes("");
    setPronoun("they");
    setDifficultCase(false);
    setFrenchImmersion(false);
    setExamples([]);
    setExampleDraft("");
    setComment("");
    setError(null);
    setCopied(false);
  }

  async function generate() {
    setLoading(true);
    setError(null);
    setCopied(false);
    setComment("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes,
          pronoun,
          difficultCase,
          frenchImmersion,
          weaknessExamples: examples,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        setComment(data.comment);
      }
    } catch {
      setError("Network error. Is the dev server running?");
    } finally {
      setLoading(false);
    }
  }

  async function copyComment() {
    try {
      await navigator.clipboard.writeText(comment);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy to clipboard.");
    }
  }

  return (
    <>
      <header className="app-header">
        <h1>Learning Skills Comment Writer</h1>
        <p>
          Talk or type rough notes. Get a polished, parent-friendly comment.
          Nothing is saved — refreshing clears the current student.
        </p>
      </header>

      <div className="layout">
        <main>
          {/* Current student */}
          <section className="panel">
            <label className="field-label" htmlFor="student">
              Current student (optional label — not sent to the AI)
            </label>
            <div className="row">
              <input
                id="student"
                type="text"
                placeholder="e.g. Student 4, or initials"
                value={student}
                onChange={(e) => setStudent(e.target.value)}
                style={{ maxWidth: 280 }}
              />
              <button className="btn secondary" type="button" onClick={clearStudent}>
                Clear / next student
              </button>
            </div>
            <p className="footnote">
              Use a non-identifying label. No names are sent anywhere.
            </p>
          </section>

          {/* Student setup */}
          <section className="panel">
            <h2>Student setup</h2>
            <div className="row" style={{ marginBottom: 14 }}>
              <div>
                <label className="field-label">Pronouns</label>
                <div className="seg">
                  {PRONOUN_KEYS.map((k) => (
                    <button
                      key={k}
                      type="button"
                      className={pronoun === k ? "active" : ""}
                      onClick={() => setPronoun(k)}
                    >
                      {PRONOUN_LABELS[k]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="row">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={difficultCase}
                  onChange={(e) => setDifficultCase(e.target.checked)}
                />
                Difficult case (extra-diplomatic, growth-mindset)
              </label>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={frenchImmersion}
                  onChange={(e) => setFrenchImmersion(e.target.checked)}
                />
                French Immersion
              </label>
            </div>
          </section>

          {/* Notes */}
          <section className="panel">
            <h2>Your notes</h2>
            <p className="hint">
              Just talk about the student naturally — strengths, growth, what
              they need to work on. Rough is fine.
            </p>
            <div className="row" style={{ marginBottom: 10 }}>
              <VoiceButton onFinalText={appendToNotes} />
            </div>
            <textarea
              rows={7}
              placeholder="e.g. Really turned a corner this term. Way more organized than in the fall. Still struggles to start independent work without a reminder..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            {showWeaknessPrompt && (
              <div className="weakness-box">
                <p className="lead">
                  You mentioned something the student is working on. Add one
                  concrete example so it lands as real evidence.
                </p>
                <div className="example-row">
                  <textarea
                    ref={exampleRef}
                    rows={1}
                    placeholder="e.g. Left materials at home three times in two weeks"
                    value={exampleDraft}
                    onChange={(e) => setExampleDraft(e.target.value)}
                    onKeyDown={(e) => {
                      // Enter adds the example; Shift+Enter makes a new line.
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        addExample();
                      }
                    }}
                  />
                  <button className="btn secondary" type="button" onClick={addExample}>
                    Add
                  </button>
                </div>
                {examples.length > 0 && (
                  <div>
                    {examples.map((ex, i) => (
                      <span className="chip" key={i}>
                        {ex}
                        <button
                          type="button"
                          onClick={() => removeExample(i)}
                          aria-label="Remove example"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="row" style={{ marginTop: 16 }}>
              <button
                className="btn"
                type="button"
                onClick={generate}
                disabled={loading || notes.trim().length === 0}
              >
                {loading ? "Writing…" : "Generate comment"}
              </button>
            </div>
            {error && <div className="error">{error}</div>}
          </section>

          {/* Output */}
          <section className="panel">
            <h2>Comment</h2>
            <div className={`output ${comment ? "" : "placeholder"}`}>
              {comment || "Your generated comment will appear here."}
            </div>
            {comment && (
              <div className="row" style={{ marginTop: 12 }}>
                <button className="btn secondary" type="button" onClick={copyComment}>
                  Copy to clipboard
                </button>
                {copied && <span className="copied">Copied ✓</span>}
              </div>
            )}
          </section>
        </main>

        <SuggestionSidebar pronoun={pronoun} onInsert={appendToNotes} />
      </div>
    </>
  );
}
