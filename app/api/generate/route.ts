import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, buildUserPrompt, GENERATION_CONFIG } from "@/lib/prompt";
import { GenerateRequest, PRONOUNS, PronounKey } from "@/lib/types";

// No caching, no persistence — every request is fresh.
export const dynamic = "force-dynamic";

function isPronounKey(v: unknown): v is PronounKey {
  return typeof v === "string" && v in PRONOUNS;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing ANTHROPIC_API_KEY. Add it to .env.local." },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const raw = body as Partial<GenerateRequest>;

  if (typeof raw.notes !== "string" || raw.notes.trim().length === 0) {
    return NextResponse.json(
      { error: "Please enter or dictate some notes about the student first." },
      { status: 400 },
    );
  }
  if (!isPronounKey(raw.pronoun)) {
    return NextResponse.json({ error: "Pick pronouns for the student." }, { status: 400 });
  }

  const request: GenerateRequest = {
    notes: raw.notes,
    pronoun: raw.pronoun,
    difficultCase: Boolean(raw.difficultCase),
    frenchImmersion: Boolean(raw.frenchImmersion),
    weaknessExamples: Array.isArray(raw.weaknessExamples)
      ? raw.weaknessExamples.filter(
          (e): e is string => typeof e === "string" && e.trim().length > 0,
        )
      : [],
  };

  const client = new Anthropic({ apiKey });

  // The model intermittently returns an empty text block. One silent retry
  // before surfacing an error to the teacher.
  async function generate(): Promise<string> {
    const message = await client.messages.create({
      ...GENERATION_CONFIG,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(request) }],
    });

    return message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();
  }

  try {
    const comment = (await generate()) || (await generate());

    if (!comment) {
      return NextResponse.json(
        { error: "The model returned an empty comment. Try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({ comment });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "Invalid ANTHROPIC_API_KEY." },
        { status: 500 },
      );
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Rate limited. Wait a moment and try again." },
        { status: 429 },
      );
    }
    const detail = err instanceof Error ? err.message : "Unknown error.";
    return NextResponse.json(
      { error: `Could not generate a comment: ${detail}` },
      { status: 502 },
    );
  }
}
