// Browser WebRTC connection to the OpenAI Realtime transcription API.
// The ephemeral token is minted server-side (/api/agent/transcription-session).

export type RealtimeConnection = { stop: () => void };

export async function connectRealtime(opts: {
  token: string;
  sessionConfig: unknown;
  micStream: MediaStream;
  /** Called with incremental (isFinal=false) and finalized (isFinal=true) text. */
  onTranscript: (text: string, isFinal: boolean) => void;
  onError?: (message: string) => void;
}): Promise<RealtimeConnection> {
  const { token, sessionConfig, micStream, onTranscript, onError } = opts;

  const pc = new RTCPeerConnection();
  micStream.getAudioTracks().forEach((track) => pc.addTrack(track, micStream));

  const dc = pc.createDataChannel("oai-events");
  dc.onopen = () => {
    // Apply the transcription session config once the channel is open.
    dc.send(JSON.stringify({ type: "session.update", session: sessionConfig }));
  };
  dc.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.type === "conversation.item.input_audio_transcription.delta") {
        onTranscript(msg.delta ?? "", false);
      } else if (
        msg.type === "conversation.item.input_audio_transcription.completed"
      ) {
        onTranscript(msg.transcript ?? "", true);
      } else if (msg.type === "error") {
        onError?.(msg.error?.message ?? "Realtime-fejl");
      }
    } catch {
      /* ignore non-JSON */
    }
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  const res = await fetch("https://api.openai.com/v1/realtime/calls", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/sdp",
    },
    body: offer.sdp ?? "",
  });
  if (!res.ok) {
    pc.close();
    throw new Error(`OpenAI Realtime afviste forbindelsen (${res.status})`);
  }
  const answer = await res.text();
  await pc.setRemoteDescription({ type: "answer", sdp: answer });

  return {
    stop: () => {
      try {
        dc.close();
      } catch {
        /* noop */
      }
      pc.getSenders().forEach((s) => s.track?.stop());
      pc.close();
    },
  };
}
