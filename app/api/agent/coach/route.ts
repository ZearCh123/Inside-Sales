import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAnthropic } from "@/lib/anthropic";
import { loadIntelConfig } from "@/lib/intel/config";
import {
  coachSystemPrompt,
  COACH_SCHEMA,
  TIER_CONFIG,
  type Tier,
} from "@/lib/agent/prompts";

export const maxDuration = 60;

type Card = { title: string; body: string; kind: string };
type CoachResult = { food_scientist: Card[]; commercial: Card[] };

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
  if (!membership) {
    return NextResponse.json({ food_scientist: [], commercial: [] });
  }

  const body = (await request.json().catch(() => ({}))) as {
    tier?: Tier;
    transcript?: string;
  };
  const tier: Tier = body.tier ?? "fast";
  const transcript = (body.transcript ?? "").trim();
  if (!transcript) {
    return NextResponse.json({ food_scientist: [], commercial: [] });
  }

  const config = await loadIntelConfig(membership.workspace_id as string);
  const cfg = TIER_CONFIG[tier];
  const anthropic = createAnthropic();

  const systemPrompt = coachSystemPrompt(config.company_profile);
  const userMsg = `Seneste samtale-uddrag (tier: ${tier}):\n\n${transcript}`;
  const debug = { model: cfg.model, system: systemPrompt, user: userMsg };

  const params: Record<string, unknown> = {
    model: cfg.model,
    max_tokens: cfg.maxTokens,
    system: systemPrompt,
    output_config: { format: { type: "json_schema", schema: COACH_SCHEMA } },
    messages: [{ role: "user", content: userMsg }],
  };
  if (cfg.effort) {
    (params.output_config as Record<string, unknown>).effort = cfg.effort;
  }
  if (cfg.thinking) params.thinking = { type: "adaptive" };

  try {
    const msg = (await anthropic.messages.create(
      params as unknown as Parameters<typeof anthropic.messages.create>[0],
    )) as { content: { type: string; text?: string }[] };
    const text = msg.content.find((b) => b.type === "text")?.text;
    if (!text) return NextResponse.json({ food_scientist: [], commercial: [], debug });
    const result = JSON.parse(text) as CoachResult;
    return NextResponse.json({
      food_scientist: result.food_scientist ?? [],
      commercial: result.commercial ?? [],
      debug: { ...debug, response: text },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Coach-fejl";
    return NextResponse.json(
      { error: message, food_scientist: [], commercial: [], debug },
      { status: 200 },
    );
  }
}
