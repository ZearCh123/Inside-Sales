import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAnthropic } from "@/lib/anthropic";
import { loadIntelConfig } from "@/lib/intel/config";
import { summarySystemPrompt, SUMMARY_SCHEMA } from "@/lib/agent/prompts";

export const maxDuration = 60;

type Summary = {
  headline: string;
  praise: string[];
  improvements: string[];
  action_points: string[];
};

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
    return NextResponse.json({ error: "Intet workspace" }, { status: 403 });
  }
  const workspaceId = membership.workspace_id as string;

  const body = (await request.json().catch(() => ({}))) as {
    transcript?: string;
    startedAt?: string;
    durationSec?: number;
  };
  const transcript = (body.transcript ?? "").trim();
  if (!transcript) {
    return NextResponse.json({ error: "Tom transskription" }, { status: 400 });
  }

  const config = await loadIntelConfig(workspaceId);
  const anthropic = createAnthropic();

  let summary: Summary;
  try {
    const msg = (await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 3000,
      thinking: { type: "adaptive" },
      system: summarySystemPrompt(config.company_profile),
      output_config: { effort: "high", format: { type: "json_schema", schema: SUMMARY_SCHEMA } },
      messages: [{ role: "user", content: `Hele transskriptionen:\n\n${transcript}` }],
    } as unknown as Parameters<typeof anthropic.messages.create>[0])) as {
      content: { type: string; text?: string }[];
    };
    const text = msg.content.find((b) => b.type === "text")?.text;
    if (!text) throw new Error("Tomt svar fra modellen.");
    summary = JSON.parse(text) as Summary;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Opsummerings-fejl";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // Persist the call + coach tips (service role; RLS keeps them private to the rep).
  try {
    const admin = createAdminClient();
    const now = new Date().toISOString();
    const { data: call } = await admin
      .from("calls")
      .insert({
        workspace_id: workspaceId,
        owner_id: user.id,
        started_at: body.startedAt ?? now,
        ended_at: now,
        duration_sec: Math.round(body.durationSec ?? 0),
        channel: "live",
        summary: summary.headline,
      })
      .select("id")
      .single();

    if (call) {
      const tips = [
        ...summary.praise.map((t) => ({ category: "praise", tip: t })),
        ...summary.improvements.map((t) => ({ category: "improvement", tip: t })),
        ...summary.action_points.map((t) => ({ category: "action", tip: t })),
      ];
      if (tips.length) {
        await admin.from("coach_tips").insert(
          tips.map((t) => ({
            workspace_id: workspaceId,
            owner_id: user.id,
            call_id: call.id,
            ...t,
          })),
        );
      }
    }
  } catch {
    // Persistence is best-effort — still return the summary to the user.
  }

  return NextResponse.json(summary);
}
