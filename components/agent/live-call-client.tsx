"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { connectRealtime, type RealtimeConnection } from "@/lib/agent/realtime";
import { CoachPane, type CoachCard } from "./coach-pane";
import { Transcript } from "./transcript";

type Tier = "fast" | "medium" | "deep" | "thorough";
const TIERS: { tier: Tier; everyMs: number; windowSec: number }[] = [
  { tier: "fast", everyMs: 8000, windowSec: 9 },
  { tier: "medium", everyMs: 25000, windowSec: 30 },
  { tier: "deep", everyMs: 60000, windowSec: 60 },
  { tier: "thorough", everyMs: 300000, windowSec: 300 },
];

type Segment = { text: string; t: number };
type Summary = {
  headline: string;
  praise: string[];
  improvements: string[];
  action_points: string[];
};

const emptyByTier = (): Record<Tier, CoachCard[]> => ({
  fast: [],
  medium: [],
  deep: [],
  thorough: [],
});

function dedup(cards: CoachCard[]): CoachCard[] {
  const seen = new Set<string>();
  const out: CoachCard[] = [];
  for (const c of cards) {
    if (!seen.has(c.title)) {
      seen.add(c.title);
      out.push(c);
    }
  }
  return out;
}

export function LiveCallClient() {
  const [recording, setRecording] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [partial, setPartial] = useState("");
  const [foodByTier, setFoodByTier] = useState(emptyByTier());
  const [commByTier, setCommByTier] = useState(emptyByTier());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  const connRef = useRef<RealtimeConnection | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const timersRef = useRef<ReturnType<typeof setInterval>[]>([]);
  const segmentsRef = useRef<Segment[]>([]);
  const partialRef = useRef("");
  const startedAtRef = useRef<string>("");

  const teardown = useCallback(() => {
    timersRef.current.forEach(clearInterval);
    timersRef.current = [];
    connRef.current?.stop();
    connRef.current = null;
    micRef.current?.getTracks().forEach((t) => t.stop());
    micRef.current = null;
  }, []);

  useEffect(() => () => teardown(), [teardown]);

  const runCoach = useCallback(async (tier: Tier, windowSec: number) => {
    const now = Date.now();
    const windowText =
      segmentsRef.current
        .filter((s) => s.t >= now - windowSec * 1000)
        .map((s) => s.text)
        .join(" ") +
      " " +
      partialRef.current;
    if (!windowText.trim()) return;
    try {
      const res = await fetch("/api/agent/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, transcript: windowText.trim() }),
      });
      const data = (await res.json()) as {
        food_scientist?: CoachCard[];
        commercial?: CoachCard[];
      };
      setFoodByTier((p) => ({ ...p, [tier]: data.food_scientist ?? [] }));
      setCommByTier((p) => ({ ...p, [tier]: data.commercial ?? [] }));
    } catch {
      /* a missed coach tick is harmless */
    }
  }, []);

  const onTranscript = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      const seg = { text, t: Date.now() };
      segmentsRef.current = [...segmentsRef.current, seg];
      setSegments(segmentsRef.current);
      partialRef.current = "";
      setPartial("");
    } else {
      partialRef.current += text;
      setPartial(partialRef.current);
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setSummary(null);
    setConnecting(true);
    try {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      micRef.current = mic;
      const res = await fetch("/api/agent/transcription-session", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Kunne ikke starte session");
      connRef.current = await connectRealtime({
        token: data.token,
        sessionConfig: data.sessionConfig,
        micStream: mic,
        onTranscript,
        onError: (m) => setError(m),
      });
      startedAtRef.current = new Date().toISOString();
      segmentsRef.current = [];
      partialRef.current = "";
      setSegments([]);
      setPartial("");
      setFoodByTier(emptyByTier());
      setCommByTier(emptyByTier());
      setRecording(true);
      timersRef.current = TIERS.map(({ tier, everyMs, windowSec }) =>
        setInterval(() => runCoach(tier, windowSec), everyMs),
      );
    } catch (e) {
      teardown();
      setError(e instanceof Error ? e.message : "Kunne ikke starte");
    } finally {
      setConnecting(false);
    }
  }, [onTranscript, runCoach, teardown]);

  const stop = useCallback(async () => {
    teardown();
    setRecording(false);
    const fullTranscript = [
      ...segmentsRef.current.map((s) => s.text),
      partialRef.current,
    ]
      .join(" ")
      .trim();
    if (!fullTranscript) return;
    setSummarizing(true);
    try {
      const res = await fetch("/api/agent/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: fullTranscript,
          startedAt: startedAtRef.current,
          durationSec:
            (Date.now() - new Date(startedAtRef.current).getTime()) / 1000,
        }),
      });
      const data = await res.json();
      if (res.ok) setSummary(data as Summary);
      else setError(data.error ?? "Opsummering fejlede");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Opsummering fejlede");
    } finally {
      setSummarizing(false);
    }
  }, [teardown]);

  const foodCards = dedup(Object.values(foodByTier).flat());
  const commCards = dedup(Object.values(commByTier).flat());

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col p-6">
      {/* Top-center toggle */}
      <div className="mb-5 flex flex-col items-center gap-1">
        <Button
          onClick={recording ? stop : start}
          disabled={connecting || summarizing}
          variant={recording ? "destructive" : "default"}
          size="lg"
        >
          {recording ? (
            <><Square className="size-4" /> Stop opkald</>
          ) : (
            <><Mic className="size-4" /> Tænd for Food Scientist Agent</>
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          {connecting
            ? "Forbinder…"
            : recording
              ? "● Optager — mikrofonen registreres som samtalen"
              : summarizing
                ? "Opsummerer opkaldet…"
                : "Klik for at starte live-coaching"}
        </p>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      {/* 3-pane */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_1.3fr_1fr]">
        <div className="min-h-0 rounded-2xl border border-border bg-card p-4">
          <CoachPane title="Food scientist" accent="#3E8E5E" cards={foodCards} active={recording} />
        </div>
        <div className="min-h-0">
          <Transcript segments={segments.map((s) => s.text)} partial={partial} />
        </div>
        <div className="min-h-0 rounded-2xl border border-border bg-card p-4">
          <CoachPane title="Commercial coach" accent="#C8362C" cards={commCards} active={recording} />
        </div>
      </div>

      {/* End-of-call summary */}
      {summary && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="size-4 text-brand-crimson" />
            <h2 className="font-display text-base font-semibold text-foreground">
              Opkalds-opsummering: {summary.headline}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 text-sm">
            <SummaryList title="Ros" items={summary.praise} marker="◆" />
            <SummaryList title="Forbedringer" items={summary.improvements} marker="▲" />
            <SummaryList title="Action points (kunde)" items={summary.action_points} marker="→" />
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryList({ title, items, marker }: { title: string; items: string[]; marker: string }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#6B5D5A]">
        {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((t, i) => (
          <li key={i} className="flex gap-2 text-[#1B1418]">
            <span aria-hidden className="shrink-0 text-[#C8362C]">{marker}</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
