import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAnthropic } from "@/lib/anthropic";
import { loadIntelConfig } from "@/lib/intel/config";
import {
  coachSystemPrompt,
  COACH_SCHEMA,
  COACH_MODEL,
  FIELD_KEYS,
  type FieldKey,
} from "@/lib/agent/prompts";

export const maxDuration = 60;

type CoachResult = Record<FieldKey, string[]>;
const emptyResult = (): CoachResult => ({
  technical_questions: [],
  technical_value: [],
  sales_questions: [],
  objection_handling: [],
  customer_obs: [],
  other: [],
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .limit(1)
    .maybeSingle();
  if (!membership) return NextResponse.json(emptyResult());

  const body = (await request.json().catch(() => ({}))) as {
    transcript?: string;
    shown?: string[];
  };
  const transcript = (body.transcript ?? "").trim();
  const shown = Array.isArray(body.shown) ? body.shown : [];
  if (!transcript) return NextResponse.json(emptyResult());

  const config = await loadIntelConfig(membership.workspace_id as string);
  const anthropic = createAnthropic();
  const systemPrompt = coachSystemPrompt(config.company_profile, shown);
  const userMsg = `Sidste ~30 sekunder af samtalen:\n\n${transcript}`;
  const debug = { model: COACH_MODEL.model, system: systemPrompt, user: userMsg };

  try {
    const msg = (await anthropic.messages.create({
      model: COACH_MODEL.model,
      max_tokens: COACH_MODEL.maxTokens,
      system: systemPrompt,
      output_config: {
        effort: COACH_MODEL.effort,
        format: { type: "json_schema", schema: COACH_SCHEMA },
      },
      messages: [{ role: "user", content: userMsg }],
    } as unknown as Parameters<typeof anthropic.messages.create>[0])) as {
      content: { type: string; text?: string }[];
    };
    const text = msg.content.find((b) => b.type === "text")?.text;
    if (!text) return NextResponse.json({ ...emptyResult(), debug });
    const parsed = JSON.parse(text) as Partial<CoachResult>;
    const result = emptyResult();
    for (const k of FIELD_KEYS) result[k] = parsed[k] ?? [];
    return NextResponse.json({ ...result, debug: { ...debug, response: text } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Coach-fejl";
    return NextResponse.json({ ...emptyResult(), error: message, debug }, { status: 200 });
  }
}
