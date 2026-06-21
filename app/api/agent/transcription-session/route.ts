import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Mints an ephemeral OpenAI Realtime token for a transcription-only session.
 * The browser uses it to connect via WebRTC (the real API key never leaves the
 * server). Requires a logged-in user.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });
  }

  // Transcription session config — sent to OpenAI at mint time and echoed to the
  // client so it can (re)apply it via session.update on the data channel.
  const sessionConfig = {
    type: "transcription",
    audio: {
      input: {
        transcription: { model: "gpt-realtime-whisper" },
      },
    },
  };

  try {
    const res = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ session: sessionConfig }),
    });
    const data = await res.json();
    if (!res.ok) {
      const message =
        data?.error?.message ?? "Kunne ikke oprette transskriptions-session";
      return NextResponse.json({ error: message }, { status: res.status });
    }
    const token = data.value ?? data.client_secret?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Intet token i OpenAI-svaret" },
        { status: 502 },
      );
    }
    return NextResponse.json({ token, sessionConfig });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Session-fejl";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
