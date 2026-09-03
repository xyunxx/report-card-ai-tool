#!/usr/bin/env node
/**
 * Regression check for the SENTENCE RULE in lib/prompt.ts.
 *
 * Generates real comments through the same system prompt the app uses, with
 * difficult-case mode OFF and ON, and checks every sentence against the rule.
 *
 *   node scripts/check-sentence-rule.js            # 5 trials per mode
 *   node scripts/check-sentence-rule.js --trials 3
 *
 * Exits 1 if any hard-rule violation is found.
 * Requires ANTHROPIC_API_KEY in .env.local. Costs a handful of API calls.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");

// ---------------------------------------------------------------- test inputs

// A deliberately difficult case: blunt notes, several weaknesses, one strength.
// This is the input the rule was tuned against — keep it stable so results
// stay comparable across prompt edits.
const NOTES = `Really struggles to get started on independent work. Sits there for ages doing nothing. I have to keep reminding him to get his stuff out. Blurts out in class, interrupts others. Homework is almost never done. He is kind to other kids though and good at helping when someone is upset. Getting a bit better at asking for help instead of shutting down.`;

const PRONOUN = "he";

// ------------------------------------------------------------------- checkers

const COORDINATORS = ["and", "but", "so", "or", "yet"];
const SUBJECT_STARTERS = [
  "he", "she", "they", "his", "her", "their", "it", "this", "that",
  "homework", "there",
];

function splitSentences(text) {
  return (text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+/g) || []).map((s) => s.trim());
}

function wordCount(sentence) {
  return sentence.split(/\s+/).filter(Boolean).length;
}

/**
 * PART 1 (hard): two independent clauses in one sentence.
 *
 * Two high-signal shapes, both of which the prompt forbids outright:
 *   a) a comma before a coordinating conjunction  — ", and homework is rarely completed"
 *   b) a comma splice onto a new subject          — ", he is learning to plan"
 *
 * A comma before a subordinator ("which is great progress", "when he is ready")
 * is allowed by the rule and is deliberately NOT flagged.
 */
function findClauseJoins(sentence) {
  const hits = [];
  const lower = sentence.toLowerCase();

  for (const c of COORDINATORS) {
    const re = new RegExp(`,\\s+${c}\\s+`, "g");
    let m;
    while ((m = re.exec(lower)) !== null) {
      hits.push(`comma + "${c}" join at "...${sentence.slice(Math.max(0, m.index), m.index + 40).trim()}..."`);
    }
  }

  // Bare comma splice: ", <subject> <verb>".
  // Skipped when the comma closes a short introductory element ("Next, he can
  // practice...", "This term, he has..."), which is not a clause join.
  const splice = /,\s+([a-z]+)\s+(is|are|was|were|has|have|can|will|needs|takes|shows|does|keeps|often|sometimes|also|always)\b/g;
  let m;
  while ((m = splice.exec(lower)) !== null) {
    const before = sentence.slice(0, m.index).split(/\s+/).filter(Boolean);
    if (before.length < 4) continue; // introductory phrase, not a second clause
    if (SUBJECT_STARTERS.includes(m[1])) {
      hits.push(`comma splice at "...${sentence.slice(Math.max(0, m.index), m.index + 40).trim()}..."`);
    }
  }

  return [...new Set(hits)];
}

/** PART 2 (soft): a long sentence held together by "and". */
function isLongAndJoin(sentence) {
  return wordCount(sentence) > 14 && /\band\b/i.test(sentence);
}

function checkComment(text) {
  const fails = [];
  const warns = [];

  const blocks = text.split(/\n\s*\n/).length;
  if (blocks > 1) {
    fails.push(`output is ${blocks} paragraph blocks; must be one flowing paragraph`);
  }

  // A comment cut off mid-sentence means the response hit max_tokens — usually
  // because hidden reasoning ate the budget. See the note in README.
  if (!/[.!?]["']?$/.test(text.trim())) {
    fails.push(`truncated — does not end in terminal punctuation: "...${text.trim().slice(-50)}"`);
  }

  const sentences = splitSentences(text);
  for (const s of sentences) {
    for (const hit of findClauseJoins(s)) {
      fails.push(`PART 1 — ${hit}`);
    }
    const w = wordCount(s);
    if (isLongAndJoin(s)) {
      warns.push(`PART 2 — ${w}w with "and": "${s}"`);
    } else if (w > 14) {
      warns.push(`length — ${w}w: "${s}"`);
    }
  }

  const total = text.split(/\s+/).filter(Boolean).length;
  if (total < 90 || total > 160) {
    warns.push(`total length ${total} words, outside the 90-160 target`);
  }

  return { fails, warns, sentences, total, blocks };
}

// ----------------------------------------------------------------- self-test

// Verifies the detector still catches real violations and leaves legitimate
// sentences alone, so a PASS from this script means something. Run with
// --self-test; it makes no API calls.
const SELF_TEST_CASES = [
  [true,  "He often sits for a long time before starting his tasks, and homework is rarely completed."],
  [true,  "He needs reminders to get his materials out, and homework is rarely completed."],
  [true,  "Homework is rarely completed, and building a regular routine at home would help."],
  [true,  "Homework is often not completed, so building this habit at school can help at home too."],
  [true,  "She keeps her materials organized, and she is learning to plan her time."],
  [true,  "He works hard on every task he is given, he is also kind to his classmates."],
  [false, "He is a hard worker and always completes his homework."],
  [false, "He is also starting to ask for help instead of shutting down, which is great progress."],
  [false, "He sometimes blurts out answers and interrupts others during class discussions."],
  [false, "He often sits for a long time before starting his tasks. Homework is rarely completed."],
  [false, "They sometimes talk more than needed, which makes it harder for others to share ideas."],
  [false, "Next, he can practice getting his materials out right away when independent work begins."],
  [false, "This term, he has grown more confident in group work."],
];

// Guards the two properties the BannedPhrase `phrase`/`match` split exists for:
// a `match` broadens beyond the prompt's wording, and a bare `phrase` is matched
// as a whole word so "we" cannot fire on "well".
const MATCHER_TEST_CASES = [
  [true,  "With continued practice, he will keep growing as a learner."],
  [true,  "It is a pleasure to have him in our class."],
  [true,  "He demonstrates strong skills in math."],
  [true,  "My notes say we discussed it."],
  [false, "He responds well to encouragement each week."],
  [false, "It is a pleasure to have him in class."],
  [false, "He owns his mistakes and starts again."],
];

function runSelfTest(lib) {
  let bad = 0;
  for (const [shouldFlag, text] of SELF_TEST_CASES) {
    const flagged = splitSentences(text).flatMap(findClauseJoins).length > 0;
    if (flagged !== shouldFlag) {
      bad++;
      console.error(`  WRONG clause-join (expected ${shouldFlag ? "violation" : "ok"}): ${text}`);
    }
  }

  const matchers = bannedMatchers(lib.BANNED_PHRASES);
  for (const [shouldFlag, text] of MATCHER_TEST_CASES) {
    const flagged = matchers.some((m) => m.test(text));
    if (flagged !== shouldFlag) {
      bad++;
      console.error(`  WRONG banned-phrase (expected ${shouldFlag ? "violation" : "ok"}): ${text}`);
    }
  }

  const total = SELF_TEST_CASES.length + MATCHER_TEST_CASES.length;
  if (bad) {
    console.error(`detector self-test: ${bad} of ${total} wrong`);
    process.exit(1);
  }
  console.log(`detector self-test: all ${total} correct (${SELF_TEST_CASES.length} clause-join, ${MATCHER_TEST_CASES.length} banned-phrase)`);
}

// ------------------------------------------------------- suggestion library

// The banned words and phrases come from BANNED_PHRASES in lib/prompt.ts, the
// same list the STYLE bullets of SYSTEM_PROMPT are rendered from — so a phrase
// added there is enforced here with no second copy to keep in sync.
//
// An entry's `match` is used as a substring when present ("with continued
// effort" in the prompt, but "with continued" here so it also catches "with
// continued practice"). Otherwise the phrase is matched as a whole word, which
// keeps short entries like "we" from firing on "well".
function bannedMatchers(bannedPhrases) {
  return bannedPhrases.map((b) => ({
    label: b.phrase,
    test: b.match
      ? (text) => text.toLowerCase().includes(b.match.toLowerCase())
      : (text) => new RegExp(`\\b${b.phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text),
  }));
}

// Verbs that need an {s}/{es} agreement placeholder. "He come to class" is the
// failure this catches.
const BARE_VERBS = [
  "come", "work", "approach", "stick", "keep", "grow", "respond", "try",
  "bring", "set", "finish", "put", "take", "build", "handle", "listen",
  "make", "feel", "show", "need", "want", "help", "ask", "start", "use",
  "practise", "share", "learn", "settle", "manage", "check", "give",
];

const PRONOUN_KEYS = ["he", "she", "they"];

function lintSuggestions(lib) {
  const { SUGGESTIONS, applyPronoun, BANNED_PHRASES } = lib;
  const matchers = bannedMatchers(BANNED_PHRASES);
  const fails = [];
  const warns = [];
  let count = 0;

  const bareVerbRe = new RegExp(`\\b(he|she) (${BARE_VERBS.join("|")})\\b`, "i");
  const pluralRe = /\bthey (is|has|does|was)\b/i;

  for (const [cat, items] of Object.entries(SUGGESTIONS)) {
    // Overlap: a suggestion must belong to exactly one profile, so switching
    // profile in the sidebar shows a genuinely different list.
    for (const item of items) {
      if (item.profiles.length !== 1) {
        fails.push(`${cat}/${item.id} — listed under ${item.profiles.length} profiles (${item.profiles.join(", ")}); each suggestion should belong to exactly one`);
      }
    }

    // Identical text reused across entries.
    const seen = new Map();
    for (const item of items) {
      if (seen.has(item.text)) {
        fails.push(`${cat}/${item.id} — duplicate text of ${seen.get(item.text)}`);
      }
      seen.set(item.text, item.id);
    }

    for (const item of items) {
      count++;
      for (const key of PRONOUN_KEYS) {
        const rendered = applyPronoun(item.text, key);

        const leftover = rendered.match(/\{[^}]*\}/g);
        if (leftover) {
          fails.push(`${cat}/${item.id} [${key}] — unresolved placeholder ${leftover.join(", ")}`);
        }

        for (const hit of findClauseJoins(rendered)) {
          fails.push(`${cat}/${item.id} [${key}] — PART 1 ${hit}`);
        }

        for (const m of matchers) {
          if (m.test(rendered)) {
            fails.push(`${cat}/${item.id} [${key}] — banned phrase "${m.label}": "${rendered}"`);
          }
        }

        const agree = key === "they" ? pluralRe.exec(rendered) : bareVerbRe.exec(rendered);
        if (agree) {
          fails.push(`${cat}/${item.id} [${key}] — verb agreement "${agree[0]}": "${rendered}"`);
        }

        const w = wordCount(rendered);
        if (w > 14) warns.push(`${cat}/${item.id} [${key}] — ${w}w: "${rendered}"`);
      }
    }
  }

  // Report how distinct the profiles actually are.
  console.log(`\nsuggestion library — ${count} suggestions`);
  for (const [cat, items] of Object.entries(SUGGESTIONS)) {
    const byProfile = {};
    for (const item of items) {
      for (const pr of item.profiles) (byProfile[pr] ||= []).push(item.id);
    }
    const counts = Object.entries(byProfile)
      .map(([pr, ids]) => `${pr}:${ids.length}`).join("  ");
    const shared = items.filter((i) => i.profiles.length > 1).length;
    console.log(`  ${cat.padEnd(10)} ${counts}   shared across profiles: ${shared}`);
  }

  for (const f of fails) console.log(`  !! ${f}`);
  for (const w of warns) console.log(`   ~ ${w}`);
  console.log(fails.length ? `  ${fails.length} violation(s)` : "  clean");

  return fails.length;
}

// --------------------------------------------------------------------- runner

function loadLib() {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "sentence-rule-"));
  execFileSync(
    path.join(ROOT, "node_modules/.bin/tsc"),
    ["lib/prompt.ts", "lib/types.ts", "lib/suggestions.ts", "--outDir", out,
     "--module", "commonjs", "--target", "es2020", "--skipLibCheck"],
    { cwd: ROOT, stdio: "inherit" },
  );
  return {
    ...require(path.join(out, "prompt.js")),
    ...require(path.join(out, "suggestions.js")),
  };
}

function loadApiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  const env = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
  const m = env.match(/^ANTHROPIC_API_KEY=(.+)$/m);
  if (!m) throw new Error("No ANTHROPIC_API_KEY in .env.local");
  return m[1].trim();
}

async function main() {
  const lib = loadLib();
  runSelfTest(lib);
  const suggestionFails = lintSuggestions(lib);

  // The library lint is deterministic and free, so it also runs under
  // --self-test, which makes no API calls.
  if (process.argv.includes("--self-test")) {
    if (suggestionFails) {
      console.error("\nFAILED — the suggestion library violates the style rules.");
      process.exit(1);
    }
    console.log("\nPASSED — suggestion library is clean.");
    return;
  }

  const argIdx = process.argv.indexOf("--trials");
  const TRIALS = argIdx > -1 ? Number(process.argv[argIdx + 1]) : 5;

  const { SYSTEM_PROMPT, buildUserPrompt, GENERATION_CONFIG } = lib;
  const Anthropic = require(path.join(ROOT, "node_modules/@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: loadApiKey() });

  async function generate(difficultCase) {
    // Mirrors the single silent retry in app/api/generate/route.ts.
    for (let attempt = 0; attempt < 2; attempt++) {
      const m = await client.messages.create({
        ...GENERATION_CONFIG, // shared with the app; see lib/prompt.ts
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt({
          notes: NOTES, pronoun: PRONOUN, difficultCase,
          frenchImmersion: false, weaknessExamples: [],
        }) }],
      });
      const t = m.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
      if (t) return t;
    }
    return "";
  }

  let totalFails = suggestionFails;
  let totalWarns = 0;
  let totalSentences = 0;

  for (const difficultCase of [false, true]) {
    const label = difficultCase ? "difficult-case ON " : "difficult-case OFF";
    for (let i = 1; i <= TRIALS; i++) {
      const text = await generate(difficultCase);
      if (!text) {
        console.log(`\n${label} trial ${i}: EMPTY RESPONSE after retry`);
        totalFails++;
        continue;
      }
      const { fails, warns, sentences, total } = checkComment(text);
      totalFails += fails.length;
      totalWarns += warns.length;
      totalSentences += sentences.length;

      const mark = fails.length ? "FAIL" : "ok  ";
      console.log(`\n${mark} ${label} trial ${i} — ${sentences.length} sentences, ${total} words`);
      console.log(`     ${text}`);
      for (const f of fails) console.log(`  !! ${f}`);
      for (const w of warns) console.log(`   ~ ${w}`);
    }
  }

  console.log(
    `\n${"=".repeat(60)}\n` +
    `${TRIALS} trials per mode, ${totalSentences} sentences total\n` +
    `hard-rule violations: ${totalFails}\n` +
    `soft warnings:        ${totalWarns}\n`,
  );

  if (totalFails > 0) {
    console.error("FAILED — the sentence rule in lib/prompt.ts is not holding.");
    process.exit(1);
  }
  console.log("PASSED — every sentence follows the rule.");
}

main().catch((e) => { console.error(e); process.exit(1); });
