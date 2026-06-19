"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { saveIntelConfig } from "@/lib/intel/config";
import type {
  CompetitorConfig,
  DisplaySection,
  FeedConfig,
  TopicConfig,
} from "@/lib/intel/types";

function list(v: FormDataEntryValue | null): string[] {
  return String(v ?? "")
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
function lines(v: FormDataEntryValue | null): string[] {
  return String(v ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Verifies the caller is an owner/admin and returns the workspace id. */
async function requireAdminWorkspace(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: m } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .in("role", ["owner", "admin"])
    .limit(1)
    .maybeSingle();
  if (!m) redirect("/app/market");
  return m.workspace_id as string;
}

async function done(ws: string, patch: Parameters<typeof saveIntelConfig>[1]) {
  await saveIntelConfig(ws, patch);
  revalidatePath("/app/settings/intelligence");
  redirect("/app/settings/intelligence?saved=1");
}

export async function saveProfile(formData: FormData) {
  const ws = await requireAdminWorkspace();
  await done(ws, {
    company_profile: {
      company_name: String(formData.get("company_name") ?? "").trim(),
      product_names: list(formData.get("product_names")),
      value_proposition: String(formData.get("value_proposition") ?? "").trim(),
      differentiators: lines(formData.get("differentiators")),
      target_products: list(formData.get("target_products")),
      icp: String(formData.get("icp") ?? "").trim(),
      pains: lines(formData.get("pains")),
      gains: lines(formData.get("gains")),
      threats: lines(formData.get("threats")),
      barriers: lines(formData.get("barriers")),
    },
  });
}

export async function saveCompetitors(formData: FormData) {
  const ws = await requireAdminWorkspace();
  const competitors: CompetitorConfig[] = lines(formData.get("competitors")).map(
    (line) => {
      const [name, segment, country, priority, website] = line
        .split("|")
        .map((p) => p.trim());
      return {
        name,
        segment: segment || undefined,
        country: country || undefined,
        priority: priority || undefined,
        website: website || undefined,
      };
    },
  );
  await done(ws, {
    competitors: competitors.filter((c) => c.name),
    priority_set: list(formData.get("priority_set")),
  });
}

export async function saveTopics(formData: FormData) {
  const ws = await requireAdminWorkspace();
  // Existing topics: each has enabled_<id> + kw_<id>. The hidden topic_ids field
  // lists which ids to read. Custom topics come from a textarea "label: kw1, kw2".
  const ids = list(formData.get("topic_ids"));
  const topics: TopicConfig[] = ids.map((id) => ({
    id,
    label: String(formData.get(`label_${id}`) ?? id),
    enabled: formData.get(`enabled_${id}`) === "on",
    keywords: list(formData.get(`kw_${id}`)),
  }));
  for (const line of lines(formData.get("custom_topics"))) {
    const [label, kw] = line.split(":");
    if (!label?.trim()) continue;
    topics.push({
      id: label.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 40),
      label: label.trim(),
      enabled: true,
      keywords: list(kw ?? ""),
    });
  }
  await done(ws, { topics });
}

export async function saveSources(formData: FormData) {
  const ws = await requireAdminWorkspace();
  const feeds: FeedConfig[] = lines(formData.get("feeds")).map((line) => {
    const [url, name, category] = line.split("|").map((p) => p.trim());
    return { url, name: name || url, category: category || "feed" };
  });
  await done(ws, {
    source_groups: {
      key_sources: list(formData.get("key_sources")),
      regulatory_bodies: list(formData.get("regulatory_bodies")),
      industry_news: list(formData.get("industry_news")),
    },
    feeds: feeds.filter((f) => f.url),
  });
}

export async function saveSchedule(formData: FormData) {
  const ws = await requireAdminWorkspace();
  const cadence = String(formData.get("cadence") ?? "monthly") as
    | "weekly"
    | "biweekly"
    | "monthly";
  await done(ws, {
    schedule: { cadence, day: Number(formData.get("day") ?? 1) || 1 },
    regions: list(formData.get("regions")),
    analysis: {
      extra_instructions: String(formData.get("extra_instructions") ?? "").trim(),
    },
  });
}

export async function saveDisplay(formData: FormData) {
  const ws = await requireAdminWorkspace();
  const ids = list(formData.get("section_ids"));
  const base: DisplaySection[] = ids
    .map((id) => ({
      id,
      visible: formData.get(`vis_${id}`) === "on",
      order: Number(formData.get(`ord_${id}`) ?? 0),
    }))
    .sort((a, b) => a.order - b.order)
    .map(({ id, visible }) => ({ id, visible }));

  const custom: DisplaySection[] = lines(formData.get("custom_blocks")).map(
    (line, i) => {
      const [title, body] = line.split("::");
      return {
        id: `custom-${i}`,
        visible: true,
        title: title?.trim() ?? "",
        body: body?.trim() ?? "",
      };
    },
  );
  await done(ws, { display: { sections: [...base, ...custom] } });
}
