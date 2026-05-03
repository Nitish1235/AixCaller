"use client";

import styles from "./page.module.css";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";

const WS_URL = process.env.NEXT_PUBLIC_VOICE_ENGINE_WS_URL
  ? `${process.env.NEXT_PUBLIC_VOICE_ENGINE_WS_URL}/demo`
  : "ws://localhost:8001/demo";

type TranscriptLine = { role: "user" | "assistant"; text: string };

export default function Home() {
  const [callState, setCallState] = useState<"idle" | "connecting" | "active" | "ended">("idle");
  const [callDuration, setCallDuration] = useState("00:00");
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const secondsRef = useRef(0);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // Cleanup everything
  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    wsRef.current = null;
    mediaRecorderRef.current = null;
    streamRef.current = null;
  }, []);

  // Play base64 mp3 audio
  const playAudio = useCallback(async (base64: string) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const raw = atob(base64);
      const buf = new ArrayBuffer(raw.length);
      const view = new Uint8Array(buf);
      for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
      const decoded = await ctx.decodeAudioData(buf);
      const src = ctx.createBufferSource();
      src.buffer = decoded;
      src.connect(ctx.destination);
      setIsAiSpeaking(true);
      src.start();
      src.onended = () => setIsAiSpeaking(false);
    } catch (e) {
      setIsAiSpeaking(false);
    }
  }, []);

  const startCall = useCallback(async () => {
    setError(null);
    setCallState("connecting");
    setTranscript([]);
    secondsRef.current = 0;
    setCallDuration("00:00");

    // Request mic
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access denied. Please allow mic access and try again.");
      setCallState("idle");
      return;
    }
    streamRef.current = stream;

    // Connect WebSocket
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      setCallState("active");
      // Start timer
      timerRef.current = setInterval(() => {
        secondsRef.current++;
        const m = Math.floor(secondsRef.current / 60).toString().padStart(2, "0");
        const s = (secondsRef.current % 60).toString().padStart(2, "0");
        setCallDuration(`${m}:${s}`);
      }, 1000);

      // Start streaming mic audio
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(e.data);
        }
      };
      recorder.start(250); // 250ms chunks
    };

    ws.onmessage = async (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "tts_audio") {
          await playAudio(msg.data);
        } else if (msg.type === "transcript" && msg.final) {
          setTranscript((prev) => {
            // Update last line if same role, else append
            const last = prev[prev.length - 1];
            if (last && last.role === msg.role) {
              return [...prev.slice(0, -1), { role: msg.role, text: msg.text }];
            }
            return [...prev, { role: msg.role, text: msg.text }];
          });
        } else if (msg.type === "session_ended") {
          setCallState("ended");
          cleanup();
        }
      } catch {}
    };

    ws.onerror = () => {
      setError("Connection error. Please try again.");
      setCallState("idle");
      cleanup();
    };

    ws.onclose = () => {
      if (callState === "active") setCallState("ended");
      cleanup();
    };
  }, [cleanup, playAudio, callState]);

  const endCall = useCallback(() => {
    setCallState("ended");
    cleanup();
  }, [cleanup]);

  useEffect(() => () => cleanup(), [cleanup]);


  return (
    <main>


      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div style={{ display: "inline-block", background: "rgba(99, 102, 241, 0.1)", color: "var(--primary)", padding: "0.4rem 1rem", borderRadius: "100px", fontWeight: 700, fontSize: "0.8rem", marginBottom: "1.5rem" }}>
            Powered by Grok + Deepgram
          </div>
          <h1>Hire a 24/7 AI Voice Agent That Answers Calls <span className="text-gradient">Like a Human</span></h1>
          <p>AixCaller.live provides ready-to-use intelligent virtual call assistants that handle inbound & outbound calls, understand your business, and never sleep.</p>
          <div className={styles.heroBtns}>
            <Link href="/dashboard">
              <button className="btn btn-primary">Get Your AI Agent — Free</button>
            </Link>
            <button className="btn btn-secondary">Watch Demo</button>
          </div>
          <div className={styles.trustSignals}>
            <span>🔒 Trusted by 500+ businesses</span>
            <span>⚡ 99.9% Uptime</span>
          </div>
        </div>

        <div className={styles.demoCard}>
          <div className={styles.demoHeader}>
            <div className={callState === "active" ? styles.pulse : ""} style={callState !== "active" ? { width: 12, height: 12, borderRadius: "50%", background: "#94A3B8" } : {}}></div>
            <div>
              <div className={styles.demoTitle}>
                {callState === "idle" && "Agent Standby"}
                {callState === "connecting" && "Connecting..."}
                {callState === "active" && (isAiSpeaking ? "Aria is speaking..." : "Listening...")}
                {callState === "ended" && "Demo Ended"}
              </div>
              <div className={styles.demoSubtitle}>Node: US-East // Latency: 18ms</div>
            </div>
          </div>

          <div className={styles.avatarWrapper}>
            <div className={styles.avatarGlow} style={{ opacity: callState === "active" ? 1 : 0 }}></div>
            <div className={styles.agentAvatar}>
              <Image src="/agent-avatar.png" alt="AI Voice Agent" width={140} height={140} className={styles.agentImage} />
            </div>
          </div>

          <div className={styles.timerText}>
            {callState === "ended" ? "Demo Complete" : callState === "idle" ? "2 min live testing" : callDuration}
          </div>

          {/* Live Transcript Feed */}
          {(callState === "active" || callState === "ended") && transcript.length > 0 && (
            <div style={{ width: "100%", maxHeight: 100, overflowY: "auto", margin: "0.5rem 0", padding: "0 0.5rem", fontSize: "0.72rem", lineHeight: 1.5 }}>
              {transcript.map((line, i) => (
                <div key={i} style={{ color: line.role === "assistant" ? "var(--primary)" : "#CBD5E1", marginBottom: 2 }}>
                  <strong>{line.role === "assistant" ? "Aria: " : "You: "}</strong>{line.text}
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
          )}

          <div className={styles.waveform}>
            {[0, 0.2, 0.4, 0.1, 0.3].map((delay, i) => (
              <div key={i} className={`${styles.bar} ${callState === "active" ? styles.barActive : ""}`} style={{ animationDelay: `${delay}s` }}></div>
            ))}
          </div>

          {error && (
            <div style={{ color: "#F87171", fontSize: "0.75rem", textAlign: "center", marginBottom: "0.5rem", padding: "0 1rem" }}>{error}</div>
          )}

          <div className={styles.demoControls}>
            {callState === "idle" && (
              <button className={styles.micBtn} onClick={startCall} id="demo-start-btn">🎤</button>
            )}
            {callState === "connecting" && (
              <button className={styles.micBtn} disabled style={{ opacity: 0.6 }}>⏳</button>
            )}
            {callState === "active" && (
              <button className={`${styles.micBtn} ${styles.micBtnActive}`} onClick={endCall} id="demo-end-btn">⏹</button>
            )}
            {callState === "ended" && (
              <button className="btn btn-primary" onClick={() => window.location.href = "/dashboard"}>Get Started Free →</button>
            )}
          </div>

          {callState === "idle" && (
            <div className={styles.instructionText}>Tap to talk with Aria — our live AI agent</div>
          )}
          {callState === "active" && (
            <div className={styles.instructionText}>Tap ⏹ to end call early</div>
          )}
        </div>
      </section>


      <section className={styles.section} id="problem">
        <div className={styles.sectionHeader}>
          <h2>Why traditional call handling is <span className="text-gradient">failing you</span></h2>
          <p>Missing calls means missing revenue. See why businesses are switching to AixCaller.live.</p>
        </div>
        <div className={styles.problemGrid}>
          <ul className={styles.problemList}>
            <li><span className={styles.iconX}>✖</span> Tired of missing customer calls after hours?</li>
            <li><span className={styles.iconX}>✖</span> Expensive human receptionists eating into your profits?</li>
            <li><span className={styles.iconX}>✖</span> Inconsistent responses from different team members?</li>
          </ul>
          <ul className={styles.solutionList}>
            <li><span className={styles.iconCheck}>✔</span> <strong>Answers calls 24/7</strong> — Your AI never sleeps or takes a break.</li>
            <li><span className={styles.iconCheck}>✔</span> <strong>Knows your business inside out</strong> — Trained instantly on your data.</li>
            <li><span className={styles.iconCheck}>✔</span> <strong>Books & Qualifies</strong> — Books appointments and qualifies leads automatically.</li>
          </ul>
        </div>
      </section>

      <section className={styles.section} id="features">
        <div className={styles.sectionHeader}>
          <h2>Everything you need to <span className="text-gradient">automate voice</span></h2>
          <p>Powerful features built for modern businesses, powered by Pipecat, Deepgram, and Grok.</p>
        </div>
        <div className={styles.featuresGrid}>
          <div className={`${styles.featureCard} glass-panel`}>
            <div className={styles.featureIcon}>⚡</div>
            <h3>Instant Agent Setup</h3>
            <p>Our agents are pre-built. Just upload your PDFs, website, or business info, and your agent is instantly ready.</p>
          </div>
          <div className={`${styles.featureCard} glass-panel`}>
            <div className={styles.featureIcon}>📞</div>
            <h3>Real Phone Numbers</h3>
            <p>Buy new local/toll-free numbers or instantly connect your existing ones via Plivo.</p>
          </div>
          <div className={`${styles.featureCard} glass-panel`}>
            <div className={styles.featureIcon}>🗣️</div>
            <h3>Natural Conversations</h3>
            <p>Human-like voice with interruptions, dynamic questions, and long-term context awareness.</p>
          </div>
          <div className={`${styles.featureCard} glass-panel`}>
            <div className={styles.featureIcon}>🧠</div>
            <h3>Smart Knowledge Base</h3>
            <p>Your AI always answers accurately using your documents. No hallucinations, just facts.</p>
          </div>
          <div className={`${styles.featureCard} glass-panel`}>
            <div className={styles.featureIcon}>📊</div>
            <h3>Analytics Dashboard</h3>
            <p>Full call transcripts, sentiment analysis, insights, and real-time performance metrics.</p>
          </div>
          <div className={`${styles.featureCard} glass-panel`}>
            <div className={styles.featureIcon}>🔗</div>
            <h3>Easy Integrations</h3>
            <p>Connect seamlessly with Calendly, CRM systems, WhatsApp, and more via webhooks.</p>
          </div>
        </div>
      </section>

      <section className={styles.section} id="how-it-works">
        <div className={styles.sectionHeader}>
          <h2>Deploy in <span className="text-gradient">3 Simple Steps</span></h2>
          <p>No building required. Your pre-built AI agent can be answering calls in under 5 minutes.</p>
        </div>
        <div className={styles.stepsGrid}>
          <div className={styles.stepCard}>
            <div className={styles.stepNum}>1</div>
            <h3>Sign Up</h3>
            <p>Create your account in 30 seconds and access the dashboard.</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNum}>2</div>
            <h3>Train Your Agent</h3>
            <p>Upload your business knowledge (PDFs, website URLs, plain text).</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNum}>3</div>
            <h3>Connect Number</h3>
            <p>Buy a new number or forward your existing one. Your AI goes live instantly.</p>
          </div>
        </div>
      </section>

      <section className={styles.section} id="use-cases">
        <div className={styles.sectionHeader}>
          <h2>Built for <span className="text-gradient">Every Business</span></h2>
          <p>Whether you need lead qualification or 24/7 customer support, AixCaller.live adapts to you.</p>
        </div>
        <div className={styles.useCaseTags}>
          <div className={styles.tag}>🍽️ Restaurants & Cafes</div>
          <div className={styles.tag}>🩺 Clinics & Doctors</div>
          <div className={styles.tag}>🏠 Real Estate Agents</div>
          <div className={styles.tag}>🛒 E-commerce Stores</div>
          <div className={styles.tag}>💼 Service Businesses</div>
          <div className={styles.tag}>📈 Agencies & Consultants</div>
        </div>
      </section>

      <section className={styles.section} id="pricing" style={{ textAlign: "center" }}>
        <h2>Simple, transparent pricing. <br/>Pay only for <span className="text-gradient">what you use.</span></h2>
        <p style={{ marginTop: "1rem" }}>No hidden fees. Scale your AI receptionist seamlessly as your call volume grows.</p>
        <button className="btn btn-primary" style={{ marginTop: "2rem" }}>View Pricing Details</button>
      </section>

      <section className={styles.section} id="testimonials">
        <div className={`${styles.demoCard} glass-panel`} style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center", padding: "4rem" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⭐⭐⭐⭐⭐</div>
          <h3 style={{ fontSize: "1.5rem", fontWeight: 400, fontStyle: "italic", marginBottom: "2rem", lineHeight: 1.6 }}>
            "AixCaller.live handled 400+ calls last month. Our team is finally free to focus on growth instead of answering repetitive questions."
          </h3>
          <p style={{ fontWeight: 700 }}>— Founder, QuickFix Services</p>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <h2>Ready to hire your ultimate AI receptionist?</h2>
        <p style={{ marginTop: "1rem", fontSize: "1.2rem" }}>Join 500+ businesses automating their phone lines today.</p>
        <button className={`btn btn-primary ${styles.ctaBtn}`} onClick={() => window.location.href = "/dashboard"}>Hire Your Agent Free</button>
      </section>
      

    </main>
  );
}
