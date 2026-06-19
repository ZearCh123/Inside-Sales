import { XMLParser } from "fast-xml-parser";
import type { TavilyResult } from "@/lib/tavily";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

function clean(html: unknown): string {
  return String(html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 800);
}

/**
 * Fetches and parses an RSS or Atom feed into research items (same shape as a
 * Tavily result). Fails soft (returns []) so one bad feed never aborts a scan.
 * Only items published within the last `withinDays` are returned.
 */
export async function fetchFeed(
  url: string,
  maxItems = 8,
  withinDays = 45,
): Promise<TavilyResult[]> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (SalesIntelligence Bot)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const doc = parser.parse(xml);
    const cutoff = Date.now() - withinDays * 24 * 60 * 60 * 1000;

    // RSS 2.0: rss.channel.item[] ; Atom: feed.entry[]
    const rssItems = asArray(doc?.rss?.channel?.item);
    const atomItems = asArray(doc?.feed?.entry);

    const out: TavilyResult[] = [];
    for (const it of rssItems) {
      const dateStr = it.pubDate ?? it["dc:date"];
      const ts = dateStr ? Date.parse(String(dateStr)) : NaN;
      if (!Number.isNaN(ts) && ts < cutoff) continue;
      out.push({
        title: String(it.title ?? "").trim(),
        url: String(it.link ?? "").trim(),
        content: clean(it.description ?? it["content:encoded"]),
      });
    }
    for (const it of atomItems) {
      const ts = it.updated ? Date.parse(String(it.updated)) : NaN;
      if (!Number.isNaN(ts) && ts < cutoff) continue;
      const link = Array.isArray(it.link)
        ? it.link.find((l: { [k: string]: string }) => l["@_rel"] !== "self")?.["@_href"]
        : it.link?.["@_href"] ?? it.link;
      out.push({
        title: String(it.title?.["#text"] ?? it.title ?? "").trim(),
        url: String(link ?? "").trim(),
        content: clean(it.summary?.["#text"] ?? it.summary ?? it.content),
      });
    }
    return out.filter((r) => r.title && r.url).slice(0, maxItems);
  } catch {
    return [];
  }
}
