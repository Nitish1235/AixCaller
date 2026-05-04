"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

const WS_URL = process.env.NEXT_PUBLIC_VOICE_ENGINE_WS_URL
  ? `${process.env.NEXT_PUBLIC_VOICE_ENGINE_WS_URL}/demo`
  : "ws://localhost:8001/demo";

type Line = { role: "user" | "assistant"; text: string };
type State = "idle" | "connecting" | "active" | "ended";

/* ─────────────────────────────────────────────
   CREATIVE LIVE DEMO CARD
   Inspired by: ElevenLabs, Vapi, Retell AI
───────────────────────────────────────────── */
export function DemoCard() {
  const [state, setState] = useState<State>("idle");
  const [duration, setDuration] = useState("00:00");
  const [lines, setLines] = useState<Line[]>([]);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [barHeights, setBarHeights] = useState<number[]>(Array(20).fill(3));

  const wsRef    = useRef<WebSocket | null>(null);
  const recRef   = useRef<MediaRecorder | null>(null);
  const streamRef= useRef<MediaStream | null>(null);
  const ctxRef   = useRef<AudioContext | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const waveRef  = useRef<NodeJS.Timeout | null>(null);
  const secsRef  = useRef(0);
  const endRef   = useRef<HTMLDivElement | null>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [lines]);

  // Animate waveform bars
  useEffect(() => {
    if (state === "active") {
      waveRef.current = setInterval(() => {
        setBarHeights(prev => prev.map(() =>
          aiSpeaking ? Math.random() * 80 + 20 : Math.random() * 30 + 5
        ));
      }, 120);
    } else {
      if (waveRef.current) clearInterval(waveRef.current);
      setBarHeights(Array(20).fill(3));
    }
    return () => { if (waveRef.current) clearInterval(waveRef.current); };
  }, [state, aiSpeaking]);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (waveRef.current) clearInterval(waveRef.current);
    recRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.close();
    wsRef.current = null; recRef.current = null; streamRef.current = null;
  }, []);

  const playAudio = useCallback(async (b64: string) => {
    try {
      if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = ctxRef.current;
      const raw = atob(b64); const buf = new ArrayBuffer(raw.length); const view = new Uint8Array(buf);
      for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
      const decoded = await ctx.decodeAudioData(buf);
      const src = ctx.createBufferSource(); src.buffer = decoded; src.connect(ctx.destination);
      setAiSpeaking(true); src.start(); src.onended = () => setAiSpeaking(false);
    } catch { setAiSpeaking(false); }
  }, []);

  const start = useCallback(async () => {
    setError(null); setState("connecting"); setLines([]); secsRef.current = 0; setDuration("00:00");
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { setError("Microphone access denied."); setState("idle"); return; }
    streamRef.current = stream;
    const ws = new WebSocket(WS_URL); wsRef.current = ws; ws.binaryType = "arraybuffer";
    ws.onopen = () => {
      setState("active");
      timerRef.current = setInterval(() => {
        secsRef.current++;
        const m = String(Math.floor(secsRef.current / 60)).padStart(2, "0");
        const s = String(secsRef.current % 60).padStart(2, "0");
        setDuration(`${m}:${s}`);
      }, 1000);
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime }); recRef.current = rec;
      rec.ondataavailable = e => { if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) ws.send(e.data); };
      rec.start(250);
    };
    ws.onmessage = async e => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "tts_audio") await playAudio(msg.data);
        else if (msg.type === "transcript" && msg.final)
          setLines(p => { const last = p[p.length - 1]; if (last?.role === msg.role) return [...p.slice(0, -1), { role: msg.role, text: msg.text }]; return [...p, { role: msg.role, text: msg.text }]; });
        else if (msg.type === "session_ended") { setState("ended"); cleanup(); }
      } catch {}
    };
    ws.onerror = () => { setError("Connection failed. Please try again."); setState("idle"); cleanup(); };
    ws.onclose  = () => cleanup();
  }, [cleanup, playAudio]);

  const end = useCallback(() => { setState("ended"); cleanup(); }, [cleanup]);
  useEffect(() => () => cleanup(), [cleanup]);

  return (
    <div style={{
      width: "100%", maxWidth: 400,
      background: "#fff",
      borderRadius: 24,
      border: "1.5px solid #D1FAE5",
      boxShadow: "0 20px 60px rgba(16,185,129,0.12), 0 4px 20px rgba(0,0,0,0.06)",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Top gradient bar */}
      <div style={{ height: 4, background: "linear-gradient(90deg, #10B981, #059669, #064E3B)" }} />

      {/* Header strip */}
      <div style={{ background: "#F6FEFA", borderBottom: "1px solid #D1FAE5", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: state === "active" ? "#10B981" : state === "connecting" ? "#F59E0B" : "#D1D5DB", boxShadow: state === "active" ? "0 0 0 3px #D1FAE5" : "none" }} />
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#064E3B", letterSpacing: 0.3 }}>
            {state === "idle" ? "ARIA · READY" : state === "connecting" ? "CONNECTING..." : state === "active" ? (aiSpeaking ? "ARIA · SPEAKING" : "ARIA · LISTENING") : "SESSION ENDED"}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["#FF5F57","#FFBD2E","#28CA41"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
        </div>
      </div>

      {/* Main body */}
      <div style={{ padding: "2rem 1.75rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>

        {/* Avatar with ripple rings */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 120, height: 120 }}>
          {state === "active" && <>
            <div style={{ position: "absolute", width: 120, height: 120, borderRadius: "50%", border: "2px solid #10B981", animation: "ripple 2s ease-out infinite", opacity: 0 }} />
            <div style={{ position: "absolute", width: 120, height: 120, borderRadius: "50%", border: "2px solid #10B981", animation: "ripple 2s ease-out infinite 0.7s", opacity: 0 }} />
            <div style={{ position: "absolute", width: 120, height: 120, borderRadius: "50%", border: "2px solid #10B981", animation: "ripple 2s ease-out infinite 1.4s", opacity: 0 }} />
          </>}
          <div style={{
            width: 88, height: 88, borderRadius: "50%",
            background: "linear-gradient(135deg, #064E3B, #10B981)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "2.2rem", position: "relative", zIndex: 1,
            boxShadow: state === "active" ? "0 0 0 6px #D1FAE5, 0 8px 30px rgba(16,185,129,0.35)" : "0 4px 16px rgba(16,185,129,0.2)",
            transition: "box-shadow 0.4s ease",
          }}>🤖</div>
        </div>

        {/* Name & subtitle */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#064E3B" }}>Aria</div>
          <div style={{ fontSize: "0.78rem", color: "#9CA3AF", marginTop: 2 }}>AI Voice Agent · AIxCaller.live</div>
        </div>

        {/* Duration */}
        <div style={{ fontFamily: "monospace", fontSize: "1.6rem", fontWeight: 900, color: "#064E3B", letterSpacing: 3, background: "#F6FEFA", padding: "8px 24px", borderRadius: 999, border: "1px solid #D1FAE5" }}>
          {state === "ended" ? "ENDED" : state === "idle" ? "02:00" : duration}
        </div>

        {/* Waveform visualizer */}
        <div style={{ display: "flex", alignItems: "center", gap: 3, height: 48, padding: "0 8px", width: "100%", justifyContent: "center" }}>
          {barHeights.map((h, i) => (
            <div key={i} style={{
              width: 4, borderRadius: 4,
              background: state === "active"
                ? (aiSpeaking ? `hsl(${150 + i * 3}, 70%, ${40 + i}%)` : "#10B981")
                : "#E5E7EB",
              height: `${h}%`,
              transition: "height 0.1s ease",
              transformOrigin: "center",
            }} />
          ))}
        </div>

        {/* Transcript */}
        {lines.length > 0 && (
          <div style={{ width: "100%", maxHeight: 110, overflowY: "auto", background: "#F6FEFA", borderRadius: 12, padding: "10px 14px", border: "1px solid #D1FAE5", fontSize: "0.78rem", lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 4 }}>
            {lines.map((l, i) => (
              <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                <span style={{ fontWeight: 800, color: l.role === "assistant" ? "#059669" : "#374151", flexShrink: 0, fontSize: "0.72rem" }}>
                  {l.role === "assistant" ? "ARIA" : "YOU"}
                </span>
                <span style={{ color: l.role === "assistant" ? "#064E3B" : "#6B7280" }}>{l.text}</span>
              </div>
            ))}
            <div ref={endRef} />
          </div>
        )}

        {/* Error */}
        {error && <div style={{ fontSize: "0.78rem", color: "#EF4444", textAlign: "center", background: "#FEF2F2", padding: "8px 12px", borderRadius: 8, width: "100%" }}>{error}</div>}

        {/* Controls */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
          {state === "idle" && (
            <>
              <button id="demo-start-btn" onClick={start} style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "linear-gradient(135deg, #10B981, #064E3B)",
                border: "none", fontSize: "1.8rem", cursor: "pointer",
                boxShadow: "0 6px 30px rgba(16,185,129,0.5)",
                transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>🎤</button>
              <p style={{ fontSize: "0.76rem", color: "#9CA3AF", textAlign: "center", margin: 0 }}>
                Tap to start · 2 min free demo
              </p>
            </>
          )}
          {state === "connecting" && (
            <div style={{ width: 72, height: 72, borderRadius: "50%", border: "3px solid #D1FAE5", borderTopColor: "#10B981", animation: "spin 0.8s linear infinite" }} />
          )}
          {state === "active" && (
            <>
              <button id="demo-end-btn" onClick={end} style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "#FEF2F2", border: "2px solid #FCA5A5",
                fontSize: "1.6rem", cursor: "pointer", transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>⏹</button>
              <p style={{ fontSize: "0.76rem", color: "#9CA3AF", margin: 0 }}>Tap to end call</p>
            </>
          )}
          {state === "ended" && (
            <Link href="/signup" style={{ width: "100%" }}>
              <button style={{ width: "100%", background: "linear-gradient(135deg, #10B981, #064E3B)", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontWeight: 800, fontSize: "0.95rem", cursor: "pointer" }}>
                Deploy Your Own Agent →
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* Bottom trust bar */}
      <div style={{ background: "#F6FEFA", borderTop: "1px solid #D1FAE5", padding: "10px 20px", display: "flex", justifyContent: "space-around" }}>
        {[["🔒", "Secure"], ["⚡", "<1s latency"], ["🌍", "30+ langs"]].map(([icon, label]) => (
          <div key={label as string} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.85rem" }}>{icon}</div>
            <div style={{ fontSize: "0.65rem", color: "#9CA3AF", fontWeight: 600 }}>{label}</div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes ripple { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(2); opacity: 0; } }
      `}</style>
    </div>
  );
}
