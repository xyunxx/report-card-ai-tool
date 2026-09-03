# Learning Skills Comment Writer

A single-user Next.js app for Ontario elementary teachers writing report card
**learning skills & work habits** comments. Talk or type rough notes about a
student; an AI call restructures them into a polished, parent-friendly comment.

## What it does

- **Dictate or type** freeform notes (voice uses the browser's built-in Web
  Speech API — Chrome/Edge).
- **AI rewrite** into a comment with (1) a positive, strength-focused opening
  covering growth over the term, (2) 1–2 evidence-based growth areas, and
  (3) next steps.
- **Style enforced:** short plain sentences, no fancy connectors
  (therefore/however/etc.), always positive and parent-friendly regardless of
  how blunt the notes are.
- **Pronouns** picked once per student (he/him, she/her, they/them) and applied
  consistently, with correct verb agreement for "they".
- **Difficult case toggle** — extra-diplomatic, non-blaming, growth-mindset
  phrasing for struggling or behavioural students.
- **French Immersion toggle** — adds language-engagement phrasing.
- **Weakness → evidence:** when your notes mention something the student is
  working on, the app prompts you for a concrete example that gets woven in.
- **Suggestion sidebar** — opening-line, next-steps, and closing-line ideas
  filterable by profile (strong / struggling / behavioural). Click to drop into
  your notes.
- **One-click copy** of the plain-text output.

## Privacy

- No login, single user, nothing stored server-side.
- No student names — a non-identifying "current student" label lives only in the
  browser and clears on refresh.
- Your notes are sent to the Anthropic API only when you press **Generate**.

## Setup

Requires Node.js 18.18+.

```bash
npm install
cp .env.example .env.local     # then paste your Anthropic API key
npm run dev
```

Open http://localhost:3000.

Set `ANTHROPIC_API_KEY` in `.env.local`. Get a key at
https://console.anthropic.com/.

## How it works

- `app/page.tsx` — the whole UI. All state is client-side and ephemeral.
- `app/api/generate/route.ts` — server route that calls Claude
  (`claude-sonnet-5`). The key never reaches the browser.
- `lib/prompt.ts` — the system prompt, the per-request prompt builder (structure,
  style rules, pronouns, difficult-case / French-Immersion modes, evidence), and
  `GENERATION_CONFIG` (model + `max_tokens`), shared with the check script.
- `lib/suggestions.ts` — the sidebar library, plus `applyPronoun`. Suggestions
  drop into the teacher's *notes*, so they are input to the generator rather
  than final output, but they follow the same style rules so the model is not
  fed phrasing it then has to undo. Each suggestion belongs to exactly one
  profile; the check script fails on overlap.
- `lib/weakness.ts` — heuristic that decides when to prompt for an example.
- `scripts/check-sentence-rule.js` — regression check for the sentence rule
  (see below). Run it after editing the system prompt.
- `components/VoiceButton.tsx` — Web Speech API dictation.

## Checking the sentence rule after a prompt edit

`lib/prompt.ts` opens with a SENTENCE RULE that bans joining two independent
clauses into one sentence. It is enforced by prompt wording alone, so it is
fragile: rewording anything in `SYSTEM_PROMPT` can silently break it.

**Re-run this after any edit to the comment-generation system prompt:**

```bash
node scripts/check-sentence-rule.js            # 5 generations per mode
node scripts/check-sentence-rule.js --trials 3 # quicker
node scripts/check-sentence-rule.js --self-test  # no API calls
```

It does two things:

1. **Lints the suggestion library** in `lib/suggestions.ts` against the same
   style rules — clause joins, banned connectors and padding, teacher voice,
   verb agreement across all three pronouns, and profile overlap. Deterministic
   and free, so it also runs under `--self-test`.
2. **Generates real comments** with difficult-case mode off and on, then checks
   every sentence.

It exits non-zero on a hard-rule violation, a comment broken into multiple
paragraphs, a truncated comment, or a suggestion-library violation. Soft
warnings (sentences over 14 words, total outside 90-160) are printed but do not
fail the run.

One generation is not enough to trust — failures showed up at roughly a 1-in-10
rate while this rule was being tuned, so a single clean sample proves nothing.

Banned words and phrases have one home: `BANNED_PHRASES` in `lib/prompt.ts`. The
STYLE bullets of `SYSTEM_PROMPT` are rendered from it, and the check script
imports it, so adding a phrase there covers both the model and the linter. Each
entry's `match` field broadens what the checker looks for when the prompt's
wording is narrower than the rule — `"with continued effort"` reads better in the
prompt, but the checker also needs to catch `"with continued practice"`.

Two things learned tuning this rule, worth keeping in mind before editing:

- **Negative examples written in report-card language get copied, not avoided.**
  A `WRONG:` example phrased like a real comment ("...and homework is rarely
  completed") caused the generator to emit almost exactly that sentence. Keep
  the WRONG/RIGHT pairs in vocabulary the comments would not otherwise use, and
  lead the rule with a positive constraint ("every sentence has ONE subject").
- **Blank lines in the system prompt leak into the output.** Adding a `---`
  separator and blank-line-separated blocks made the model return the comment as
  three paragraphs instead of one. Keep the prompt's structure tight.

### Why `max_tokens` is 4000

The model spends a variable amount on reasoning before the comment — measured
output usage for the same input ranged from ~200 to ~2510 tokens, for a comment
of only ~120 words. At the old cap of 1500 the runs near the top came back
truncated mid-sentence or with an empty text block.

Two defences, both needed:

- `app/api/generate/route.ts` does one silent retry, which only catches the
  **empty** case — a truncated comment is non-empty and passes straight through.
- `scripts/check-sentence-rule.js` fails on any comment not ending in terminal
  punctuation, which is what catches truncation.

The model and `max_tokens` live in `GENERATION_CONFIG` in `lib/prompt.ts`, and
both the route and the check script spread it into their API call. Change them
there and the regression check keeps testing what the app actually runs.

To use a different model, change `model` in `GENERATION_CONFIG` in
`lib/prompt.ts` (e.g. `claude-opus-4-8` for maximum quality). The API route and
the check script both read it from there.
