import Anthropic from "@anthropic-ai/sdk";

/** Server-only Anthropic client. The key never reaches the browser. */
export function createAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

/** Model used for the monthly intelligence synthesis (configurable via env). */
export const INTEL_MODEL = process.env.INTEL_MODEL || "claude-opus-4-8";
