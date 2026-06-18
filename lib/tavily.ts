// Thin Tavily web-research client (no SDK — plain fetch). Server-only.

export type TavilyResult = {
  title: string;
  url: string;
  content: string;
};

/**
 * Runs a Tavily search and returns the top results with source URLs.
 * Returns [] on error so a single failed query never aborts the whole scan.
 */
export async function tavilySearch(
  query: string,
  maxResults = 5,
): Promise<TavilyResult[]> {
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        search_depth: "advanced",
        max_results: maxResults,
        include_answer: false,
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: TavilyResult[] };
    return (data.results ?? []).map((r) => ({
      title: r.title,
      url: r.url,
      content: (r.content ?? "").slice(0, 800),
    }));
  } catch {
    return [];
  }
}
