"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, Sparkles, Eye, EyeOff, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { connectRealtime, type RealtimeConnection } from "@/lib/agent/realtime";
import { FieldBox, type FieldItem } from "./field-box";
import { Transcript } from "./transcript";
import { FIELD_KEYS, FIELD_LABELS, type FieldKey } from "@/lib/agent/prompts";

const FIELD_ACCENT: Record<FieldKey, string> = {
  technical_questions: "#3E8E5E",
  technical_value: "#2e7d6b",
  sales_questions: "#C8362C",
  objection_handling: "#C9882F",
  customer_obs: "#3a5b86",
  other: "#6B5D5A",
};

const COACH_EVERY_MS = 15000;
const WINDOW_SEC = 30;

const normId = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 60);

type Segment = { text: string; t: number };
type Fields = Record<FieldKey, FieldItem[]>;
type Debug = { model: string; system: string; user: string; response?: string };
type Summary = {
  headline: string;
  praise: string[];
  improvements: string[];
  action_points: string[];
};

const emptyFields = (): Fields => ({
  technical_questions: [],
  technical_value: [],
  sales_questions: [],
  objection_handling: [],
  customer_obs: [],
  other: [],
});

export function LiveCallClient() {
  const [recording, setRecording] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [partial, setPartial] = useState("");
  const [fields, setFields] = useState<Fields>(emptyFields());
  const [debug, setDebug] = useState<Debug | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const connRef = useRef<RealtimeConnection | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const segmentsRef = useRef<Segment[]>([]);
  const partialRef = useRef("");
  const fieldsRef = useRef<Fields>(emptyFields());
  const startedAtRef = useRef<string>("");

  const teardown = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    connRef.current?.stop();
    connRef.current = null;
    micRef.current?.getTracks().forEach((t) => t.stop());
    micRef.current = null;
  }, []);

  useEffect(() => () => teardown(), [teardown]);

  const runCoach = useCallback(async () => {
    const now = Date.now();
    const windowText =
      segmentsRef.current
        .filter((s) => s.t >= now - WINDOW_SEC * 1000)
        .map((s) => s.text)
        .join(" ") +
      " " +
      partialRef.current;
    if (!windowText.trim()) return;
    const shown = FIELD_KEYS.flatMap((k) => fieldsRef.current[k].map((i) => i.text));
    try {
      const res = await fetch("/api/agent/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: windowText.trim(), shown }),
      });
      const data = (await res.json()) as Partial<Record<FieldKey, string[]>> & { debug?: Debug };
      if (data.debug) setDebug(data.debug);
      let changed = false;
      const next = { ...fieldsRef.current };
      for (const k of FIELD_KEYS) {
        for (const text of data[k] ?? []) {
          const id = normId(text);
          if (text && !next[k].some((i) => i.id === id)) {
            next[k] = [...next[k], { id, text, done: false }];
            changed = true;
          }
        }
      }
      if (changed) {
        fieldsRef.current = next;
        setFields(next);
      }
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
      fieldsRef.current = emptyFields();
      setSegments([]);
      setPartial("");
      setFields(emptyFields());
      setRecording(true);
      timerRef.current = setInterval(runCoach, COACH_EVERY_MS);
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
      if (res.ok) {
        setSummary(data as Summary);
        setSummaryOpen(true);
      } else setError(data.error ?? "Opsummering fejlede");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Opsummering fejlede");
    } finally {
      setSummarizing(false);
    }
  }, [teardown]);

  const toggleItem = useCallback((field: FieldKey, id: string) => {
    const next = {
      ...fieldsRef.current,
      [field]: fieldsRef.current[field].map((i) =>
        i.id === id ? { ...i, done: !i.done } : i,
      ),
    };
    fieldsRef.current = next;
    setFields(next);
  }, []);

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
                ? "● Optager — coacher hvert 15. sek"
                : summarizing
                  ? "Opsummerer…"
                  : "Klik for at starte"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={transcriptOpen ? "secondary" : "outline"}
            size="sm"
            onClick={() => setTranscriptOpen((v) => !v)}
          >
            <FileText className="size-4" /> Transskription
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowDebug((v) => !v)}>
            {showDebug ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {showDebug ? "Skjul prompt" : "Vis prompt"}
          </Button>
        </div>
      </div>
      {error && <p className="mb-3 text-xs text-destructive">{error}</p>}

      {/* Six fields */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {FIELD_KEYS.map((k) => (
          <FieldBox
            key={k}
            label={FIELD_LABELS[k]}
            accent={FIELD_ACCENT[k]}
            items={fields[k]}
            active={recording}
            onToggle={(id) => toggleItem(k, id)}
          />
        ))}
      </div>

      {/* Debug */}
      {showDebug && debug && (
        <details className="mt-3 rounded-md border border-border bg-secondary/40 p-2 text-[11px]" open>
          <summary className="cursor-pointer text-muted-foreground">
            Sendt til AI ({debug.model})
          </summary>
          <p className="mt-1 font-semibold text-foreground">System:</p>
          <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-[10px] text-[#3a302e]">{debug.system}</pre>
          <p className="mt-1 font-semibold text-foreground">User:</p>
          <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap break-words text-[10px] text-[#3a302e]">{debug.user}</pre>
          {debug.response && (
            <>
              <p className="mt-1 font-semibold text-foreground">Svar:</p>
              <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-[10px] text-[#3a302e]">{debug.response}</pre>
            </>
          )}
        </details>
      )}

      {/* Transcript */}
      {transcriptOpen && (
        <div className="mt-4 h-40 shrink-0">
          <Transcript segments={segments.map((s) => s.text)} partial={partial} />
        </div>
      )}

      {/* End-of-call summary (minimisable) */}
      {summary && (
        <div className="mt-4 rounded-2xl border border-border bg-card">
          <button
            onClick={() => setSummaryOpen((v) => !v)}
            className="flex w-full items-center gap-2 px-5 py-3 text-left"
          >
            <Sparkles className="size-4 shrink-0 text-brand-crimson" />
            <h2 className="flex-1 font-display text-base font-semibold text-foreground">
              Opkalds-opsummering: {summary.headline}
            </h2>
            {summaryOpen ? (
              <ChevronDown className="size-4 text-muted-foreground" />
            ) : (
              <ChevronUp className="size-4 text-muted-foreground" />
            )}
          </button>
          {summaryOpen && (
            <div className="grid grid-cols-1 gap-5 px-5 pb-5 text-sm sm:grid-cols-3">
              <SummaryList title="Ros" items={summary.praise} marker="◆" />
              <SummaryList title="Forbedringer" items={summary.improvements} marker="▲" />
              <SummaryList title="Action points (kunde)" items={summary.action_points} marker="→" />
            </div>
          )}
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
