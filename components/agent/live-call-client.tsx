"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, Sparkles, Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { connectRealtime, type RealtimeConnection } from "@/lib/agent/realtime";
import { HorizonBox, type CoachCard, type CoachDebug } from "./coach-pane";
import { Transcript } from "./transcript";

type Tier = "fast" | "medium" | "deep";
const TIERS: {
  tier: Tier;
  label: string;
  sublabel: string;
  everyMs: number;
  windowSec: number;
}[] = [
  { tier: "fast", label: "Lige nu", sublabel: "seneste ~10 sek", everyMs: 10000, windowSec: 14 },
  { tier: "medium", label: "Kontekst", sublabel: "seneste ~30 sek", everyMs: 30000, windowSec: 35 },
  { tier: "deep", label: "Strategi", sublabel: "seneste 1 min+", everyMs: 60000, windowSec: 120 },
];

type BoxState = {
  food: CoachCard[];
  commercial: CoachCard[];
  updatedAt: number | null;
  debug: CoachDebug | null;
};
type Segment = { text: string; t: number };
type Summary = {
  headline: string;
  praise: string[];
  improvements: string[];
  action_points: string[];
};

const emptyBox = (): BoxState => ({ food: [], commercial: [], updatedAt: null, debug: null });
const emptyBoxes = (): Record<Tier, BoxState> => ({ fast: emptyBox(), medium: emptyBox(), deep: emptyBox() });

export function LiveCallClient() {
  const [recording, setRecording] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [partial, setPartial] = useState("");
  const [boxes, setBoxes] = useState(emptyBoxes());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(true);
  const [showDebug, setShowDebug] = useState(false);

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
        debug?: CoachDebug;
      };
      const food = data.food_scientist ?? [];
      const commercial = data.commercial ?? [];
      setBoxes((prev) => {
        const hasNew = food.length > 0 || commercial.length > 0;
        return {
          ...prev,
          [tier]: hasNew
            ? { food, commercial, updatedAt: Date.now(), debug: data.debug ?? null }
            : { ...prev[tier], debug: data.debug ?? prev[tier].debug },
        };
      });
    } catch {
      /* a missed coach tick is harmless */
    }
  }, []);

  const onTranscript = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      segmentsRef.current = [...segmentsRef.current, { text, t: Date.now() }];
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
      setBoxes(emptyBoxes());
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
    const fullTranscript = [...segmentsRef.current.map((s) => s.text), partialRef.current]
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
          durationSec: (Date.now() - new Date(startedAtRef.current).getTime()) / 1000,
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

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col p-6">
      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
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
                ? "● Optager"
                : summarizing
                  ? "Opsummerer…"
                  : "Klik for at starte"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowDebug((v) => !v)}>
            {showDebug ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {showDebug ? "Skjul prompts" : "Vis prompts"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setTranscriptOpen((v) => !v)}>
            {transcriptOpen ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
            Transskription
          </Button>
        </div>
      </div>
      {error && <p className="mb-3 text-xs text-destructive">{error}</p>}

      {/* 3 horizon boxes */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
        {TIERS.map(({ tier, label, sublabel }) => (
          <HorizonBox
            key={tier}
            label={label}
            sublabel={sublabel}
            food={boxes[tier].food}
            commercial={boxes[tier].commercial}
            updatedAt={boxes[tier].updatedAt}
            active={recording}
            showDebug={showDebug}
            debug={boxes[tier].debug}
          />
        ))}
      </div>

      {/* Minimisable transcript */}
      {transcriptOpen && (
        <div className="mt-4 h-44 shrink-0">
          <Transcript segments={segments.map((s) => s.text)} partial={partial} />
        </div>
      )}

      {/* End-of-call summary */}
      {summary && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="size-4 text-brand-crimson" />
            <h2 className="font-display text-base font-semibold text-foreground">
              Opkalds-opsummering: {summary.headline}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-5 text-sm sm:grid-cols-3">
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
