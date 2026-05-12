import Link from "next/link";
import { DemoCard } from "@/components/DemoCard";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main style={{ paddingBottom: "0rem", overflowX: "hidden" }}>
      {/* ── HERO ── */}
      <section style={{ textAlign: "center", paddingTop: "6rem", position: "relative", maxWidth: 1300, margin: "0 auto", padding: "6rem 5% 0" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 15, background: "#fff", border: "var(--border)", padding: "1rem 2rem", borderRadius: 99, boxShadow: "var(--shadow)", marginBottom: "3rem", transform: "rotate(-2deg)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, height: 30 }}>
            <div style={{ width: 5, background: "var(--text)", borderRadius: 99, animation: "eq 0.8s infinite alternate ease-in-out", animationDelay: "0.1s" }} />
            <div style={{ width: 5, background: "var(--accent-green)", borderRadius: 99, animation: "eq 0.8s infinite alternate ease-in-out" }} />
            <div style={{ width: 5, background: "var(--text)", borderRadius: 99, animation: "eq 0.8s infinite alternate ease-in-out", animationDelay: "0.3s" }} />
            <div style={{ width: 5, background: "var(--accent-green)", borderRadius: 99, animation: "eq 0.8s infinite alternate ease-in-out" }} />
          </div>
          <span style={{ fontWeight: 900, textTransform: "uppercase", fontSize: "1.1rem" }}>Live Telephony Engine</span>
        </div>
        
        <h1 style={{ fontSize: "clamp(3rem, 7vw, 6.5rem)", fontWeight: 900, lineHeight: 1, margin: "0 0 2rem", letterSpacing: -2, textTransform: "uppercase" }}>
          AI Voice Agents <br />for your business.
        </h1>
        <p style={{ fontSize: "clamp(1.1rem, 2vw, 1.5rem)", fontWeight: 600, maxWidth: 800, margin: "0 auto 4rem", lineHeight: 1.5 }}>
          We provide real phone numbers powered by conversational AI. Train the agent on your documents, let it answer your calls 24/7, and get instant summaries sent to your email.
        </p>
        
        <Link href="/signup">
          <button className="btn-brutal" style={{ fontSize: "1.4rem", padding: "1.4rem 4rem" }}>Start Building Free</button>
        </Link>

        {/* ── MEGA DEMO ── */}
        <div style={{ background: "var(--text)", color: "#fff", border: "var(--border)", borderColor: "#fff", borderRadius: 32, padding: "clamp(2rem, 5vw, 4rem)", boxShadow: "15px 15px 0 var(--accent-yellow)", display: "flex", gap: "4rem", alignItems: "center", marginTop: "4rem", transform: "rotate(1deg)", flexWrap: "wrap" }}>
          
          <div style={{ flex: "1 1 400px", textAlign: "left" }}>
            <h2 style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", lineHeight: 1, margin: "0 0 1.5rem", textTransform: "uppercase", color: "var(--accent-yellow)", fontWeight: 900 }}>
              Talk to our <br />Agent live.
            </h2>
            <div style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "2rem", color: "#cbd5e1" }}>
              Test the sub-second latency for yourself. Choose a persona and dial the number or test via browser.
            </div>
            
            <div className="mono" style={{ display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" }}>
              <div style={{ background: "var(--accent-pink)", color: "var(--text)", border: "2px solid var(--accent-pink)", padding: "0.8rem 1.5rem", borderRadius: 99, fontWeight: 800, fontSize: "1rem", cursor: "pointer", textTransform: "uppercase", boxShadow: "4px 4px 0 #fff" }}>
                🛍️ E-Com Support
              </div>
              <div style={{ background: "transparent", color: "#fff", border: "2px solid #fff", padding: "0.8rem 1.5rem", borderRadius: 99, fontWeight: 800, fontSize: "1rem", cursor: "pointer", textTransform: "uppercase" }}>
                💼 Aggressive Sales
              </div>
            </div>
            
            <div className="mono" style={{ background: "#1e293b", border: "2px solid #334155", padding: "1.5rem", borderRadius: 16, fontSize: "1rem", color: "#94a3b8", lineHeight: 1.6 }}>
              <span style={{ color: "#fbcfe8", fontWeight: 700 }}>SYSTEM_PROMPT:</span><br />
              "You are an empathetic customer support agent for Shopify. Your goal is to lookup order status and process refunds. <span style={{ color: "#fff", fontWeight: 700 }}>Never break character. Keep responses under 2 sentences.</span>"
            </div>
          </div>
          
          <div style={{ flex: "1 1 350px", display: "flex", justifyContent: "center", position: "relative", transform: "rotate(-2deg)" }}>
             {/* Actual Functional WebRTC Demo Component */}
             <div style={{ width: "100%", maxWidth: 400 }}>
               <DemoCard wsUrl={process.env.NEXT_PUBLIC_VOICE_ENGINE_WS_URL || process.env.VOICE_ENGINE_URL} />
             </div>
          </div>
        </div>
      </section>

      {/* ── PLATFORM ── */}
      <section id="platform" style={{ padding: "8rem 5%", maxWidth: 1300, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(3rem, 5vw, 4.5rem)", fontWeight: 900, textTransform: "uppercase", lineHeight: 1, margin: "0 0 4rem", textAlign: "center" }}>Exactly what we do.</h2>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "3rem" }}>
          
          {/* Telephony */}
          <div className="card" style={{ background: "var(--accent-pink)", gridRow: "span 2" }}>
            <h3 style={{ fontSize: "2.5rem", textTransform: "uppercase", margin: "0 0 1rem", lineHeight: 1.1, fontWeight: 900 }}>Get a Real Phone Number</h3>
            <p style={{ fontSize: "1.2rem", fontWeight: 600, color: "#475569", lineHeight: 1.5, margin: "0 0 2rem" }}>
              We instantly provide real local and toll-free phone numbers. No telecom setup required—just pick a country and area code, and your AI is ready to answer calls.
            </p>
            <div style={{ background: "var(--bg)", border: "2px solid var(--text)", borderRadius: 12, padding: "1.5rem", fontWeight: 700 }}>
              <div style={{ display: "flex", gap: "1rem" }}>
                <div style={{ flex: 1, background: "#fff", border: "2px solid var(--text)", padding: "1rem", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  🇺🇸 United States (US) <span style={{ fontSize: "0.8rem" }}>▼</span>
                </div>
                <div className="mono" style={{ flex: 0.5, background: "#fff", border: "2px solid var(--text)", padding: "1rem", borderRadius: 8 }}>Area: 415</div>
              </div>
              <div style={{ background: "#fff", marginTop: "1rem", textAlign: "center", padding: "1rem", border: "2px solid var(--text)", borderRadius: 8 }}>
                Number: <span className="mono">+1 (415) 882-9910</span>
              </div>
            </div>
          </div>
          
          {/* Knowledge Base */}
          <div className="card" style={{ background: "var(--accent-yellow)" }}>
            <h3 style={{ fontSize: "2.5rem", textTransform: "uppercase", margin: "0 0 1rem", lineHeight: 1.1, fontWeight: 900 }}>Train AI on your Data</h3>
            <p style={{ fontSize: "1.2rem", fontWeight: 600, color: "#475569", lineHeight: 1.5, margin: "0 0 2rem" }}>
              Upload your business policies, menus, or FAQs as PDFs. When a customer asks a question, the AI reads your documents and answers them accurately.
            </p>
            <div style={{ background: "rgba(255,255,255,0.5)", border: "2px dashed var(--text)", borderRadius: 12, padding: "2rem", textAlign: "center", fontWeight: 700 }}>
              <div style={{ fontSize: "2rem", marginBottom: 10 }}>📄</div>
              Drop PDF files here or paste URL<br />
              <div className="mono" style={{ display: "inline-block", background: "var(--text)", color: "#fff", padding: "0.4rem 1rem", borderRadius: 99, fontSize: "0.8rem", marginTop: 10 }}>pgvector indexing...</div>
            </div>
          </div>
          
          {/* Marketplace */}
          <div className="card">
            <h3 style={{ fontSize: "2.5rem", textTransform: "uppercase", margin: "0 0 1rem", lineHeight: 1.1, fontWeight: 900 }}>Pre-built AI Personas</h3>
            <p style={{ fontSize: "1.2rem", fontWeight: 600, color: "#475569", lineHeight: 1.5, margin: "0 0 2rem" }}>
              Don't want to start from scratch? Use our pre-trained AI templates. Whether you need a Real Estate Lead Qualifier or a Dental Receptionist, it's a one-click setup.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div style={{ background: "#fff", border: "2px solid var(--text)", padding: "1rem", borderRadius: 8, textAlign: "center", fontWeight: 700 }}>🦷 Dental Desk</div>
              <div style={{ background: "#fff", border: "2px solid var(--text)", padding: "1rem", borderRadius: 8, textAlign: "center", fontWeight: 700 }}>🏠 Realtor Bot</div>
            </div>
          </div>
          
          {/* Email Summaries */}
          <div className="card" style={{ background: "var(--text)", color: "#fff", gridColumn: "1 / -1", display: "flex", flexWrap: "wrap", gap: "2rem", alignItems: "center" }}>
            <div style={{ flex: "1 1 400px" }}>
              <h3 style={{ fontSize: "2.5rem", textTransform: "uppercase", margin: "0 0 1rem", lineHeight: 1.1, fontWeight: 900, color: "var(--accent-green)" }}>Get Call Summaries via Email</h3>
              <p style={{ fontSize: "1.2rem", fontWeight: 600, color: "#cbd5e1", lineHeight: 1.5, margin: "0 0 2rem" }}>
                You don't even need to log into our dashboard. The second a call finishes, the AI emails you the customer's intent, a brief summary of the conversation, and the full transcript.
              </p>
            </div>
            <div className="mono" style={{ flex: "1 1 350px", background: "#1e293b", border: "2px solid #334155", borderRadius: 12, padding: "1.5rem", fontWeight: 700, boxShadow: "8px 8px 0 var(--accent-pink)", transform: "rotate(1deg)" }}>
              <div style={{ color: "#94a3b8", fontSize: "0.8rem", marginBottom: "0.5rem", display: "flex", justifyContent: "space-between" }}>
                <span>FROM: agent@callerx.ai</span>
                <span>1 min ago</span>
              </div>
              <div style={{ color: "#fff", fontSize: "1.1rem", marginBottom: "1rem", borderBottom: "2px solid #334155", paddingBottom: "1rem" }}>
                SUBJECT: New Lead - Sarah Jenkins
              </div>
              <div style={{ color: "var(--accent-green)", marginBottom: "0.8rem", fontSize: "0.95rem" }}>
                ✅ Goal Achieved: Appointment Booked
              </div>
              <div style={{ color: "#cbd5e1", fontSize: "0.9rem", lineHeight: 1.6, paddingBottom: "1rem", borderBottom: "2px solid #334155", marginBottom: "1rem" }}>
                <strong style={{ color: "#fff" }}>Summary:</strong> Sarah called asking about the Pro plan. She had questions regarding vector search latency. The agent explained our pgvector integration and successfully booked a demo for Tuesday at 2 PM.
              </div>
              <div style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
                Duration: 142s • <span style={{ textDecoration: "underline", cursor: "pointer" }}>View Full Transcript</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── STEPS ── */}
      <section style={{ padding: "4rem 5%", maxWidth: 1000, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(3rem, 5vw, 4.5rem)", fontWeight: 900, textTransform: "uppercase", lineHeight: 1, margin: "0 0 4rem", textAlign: "center" }}>Live in 3 steps.</h2>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <div className="card" style={{ background: "var(--accent-blue)", display: "flex", alignItems: "center", gap: "3rem", transform: "rotate(-1deg)", flexWrap: "wrap" }}>
            <div style={{ fontSize: "clamp(4rem, 8vw, 6rem)", fontWeight: 900, lineHeight: 1, color: "var(--text)" }}>1</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: "clamp(1.5rem, 3vw, 2.2rem)", margin: "0 0 0.5rem", textTransform: "uppercase", fontWeight: 900 }}>Build the Brain</h3>
              <p style={{ fontSize: "1.2rem", margin: 0, fontWeight: 600 }}>Write a system prompt, select an ElevenLabs voice ID, and upload your knowledge base.</p>
            </div>
          </div>
          
          <div className="card" style={{ background: "var(--accent-pink)", display: "flex", alignItems: "center", gap: "3rem", transform: "rotate(1deg)", flexDirection: "row-reverse", flexWrap: "wrap-reverse" }}>
            <div style={{ fontSize: "clamp(4rem, 8vw, 6rem)", fontWeight: 900, lineHeight: 1, color: "var(--text)" }}>2</div>
            <div style={{ flex: 1, textAlign: "right" }}>
              <h3 style={{ fontSize: "clamp(1.5rem, 3vw, 2.2rem)", margin: "0 0 0.5rem", textTransform: "uppercase", fontWeight: 900 }}>Claim a Number</h3>
              <p style={{ fontSize: "1.2rem", margin: 0, fontWeight: 600 }}>Select your country code and area code to instantly provision a global SIP trunk.</p>
            </div>
          </div>
          
          <div className="card" style={{ background: "var(--accent-yellow)", display: "flex", alignItems: "center", gap: "3rem", transform: "rotate(-0.5deg)", flexWrap: "wrap" }}>
            <div style={{ fontSize: "clamp(4rem, 8vw, 6rem)", fontWeight: 900, lineHeight: 1, color: "var(--text)" }}>3</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: "clamp(1.5rem, 3vw, 2.2rem)", margin: "0 0 0.5rem", textTransform: "uppercase", fontWeight: 900 }}>Answer Calls</h3>
              <p style={{ fontSize: "1.2rem", margin: 0, fontWeight: 600 }}>Your agent is live 24/7. Monitor transcripts and track your per-second billing directly in the dashboard.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── REVIEWS MARQUEE ── */}
      <div style={{ borderTop: "var(--border)", borderBottom: "var(--border)", background: "var(--text)", padding: "3rem 0", overflow: "hidden", margin: "8rem 0" }}>
        <div style={{ display: "flex", gap: "3rem", animation: "scroll 30s linear infinite", width: "max-content" }}>
          {[1,2,3].map(k => (
            <div key={k} style={{ display: "flex", gap: "3rem" }}>
              <div style={{ background: "#fff", color: "var(--text)", border: "var(--border)", padding: "2rem", borderRadius: 16, width: 450, boxShadow: "6px 6px 0 var(--accent-green)" }}>
                <p style={{ fontSize: "1.3rem", fontWeight: 700, fontStyle: "italic", margin: "0 0 1rem" }}>"The Telnyx integration is seamless. We provisioned 5 UK numbers and 3 US numbers in about two minutes."</p>
                <div style={{ fontSize: "1rem", fontWeight: 900, textTransform: "uppercase" }}>— David Chen, CTO</div>
              </div>
              <div style={{ background: "#fff", color: "var(--text)", border: "var(--border)", padding: "2rem", borderRadius: 16, width: 450, boxShadow: "6px 6px 0 var(--accent-pink)" }}>
                <p style={{ fontSize: "1.3rem", fontWeight: 700, fontStyle: "italic", margin: "0 0 1rem" }}>"Vector search is incredibly fast. The agent reads from our 50-page PDF policy manual in under a second while on the phone."</p>
                <div style={{ fontSize: "1rem", fontWeight: 900, textTransform: "uppercase" }}>— Sarah J., Support Lead</div>
              </div>
              <div style={{ background: "#fff", color: "var(--text)", border: "var(--border)", padding: "2rem", borderRadius: 16, width: 450, boxShadow: "6px 6px 0 var(--accent-yellow)" }}>
                <p style={{ fontSize: "1.3rem", fontWeight: 700, fontStyle: "italic", margin: "0 0 1rem" }}>"Per-second billing via Stripe makes this a no-brainer. We only pay exactly for what we use."</p>
                <div style={{ fontSize: "1rem", fontWeight: 900, textTransform: "uppercase" }}>— Marcus T., Operations</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ padding: "4rem 5%", maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(3rem, 5vw, 4.5rem)", fontWeight: 900, textTransform: "uppercase", lineHeight: 1, margin: "0 0 4rem", textAlign: "center" }}>Honest Pricing.</h2>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "4rem" }}>
          
          <div className="card" style={{ padding: "4rem 2rem", textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "1rem" }}>Starter</div>
            <div style={{ fontSize: "4.5rem", fontWeight: 900, marginBottom: "1rem", lineHeight: 1 }}>$50<span style={{ fontSize: "1.5rem", color: "#64748b" }}>/mo</span></div>
            <div style={{ fontWeight: 700, fontSize: "1.2rem", color: "#64748b", marginBottom: "2rem" }}>Includes 200 Minutes</div>
            
            <ul style={{ listStyle: "none", padding: 0, fontSize: "1.1rem", fontWeight: 700, textAlign: "left", margin: "2rem 0 3rem" }}>
              {["2 Active Agents", "Basic Knowledge Base", "US/Canada Numbers", "Standard Voices"].map(item => (
                <li key={item} style={{ marginBottom: "1.2rem", display: "flex", gap: 10 }}>
                  <span style={{ color: "var(--accent-green)", fontWeight: 900, fontSize: "1.4rem" }}>✓</span> {item}
                </li>
              ))}
            </ul>
            <Link href="/signup?plan=starter">
               <button className="btn-brutal white" style={{ width: "100%" }}>Choose Starter</button>
            </Link>
          </div>
          
          <div className="card" style={{ padding: "4rem 2rem", textAlign: "center", background: "var(--text)", color: "#fff", borderColor: "#fff", boxShadow: "12px 12px 0 var(--accent-green)", transform: "scale(1.05)", zIndex: 10 }}>
            <div style={{ fontSize: "2.5rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "1rem", color: "var(--accent-green)" }}>Pro Business</div>
            <div style={{ fontSize: "4.5rem", fontWeight: 900, marginBottom: "1rem", lineHeight: 1 }}>$119<span style={{ fontSize: "1.5rem", color: "#94a3b8" }}>/mo</span></div>
            <div style={{ fontWeight: 700, fontSize: "1.2rem", color: "#94a3b8", marginBottom: "2rem" }}>Includes 500 Minutes</div>
            
            <ul style={{ listStyle: "none", padding: 0, fontSize: "1.1rem", fontWeight: 700, textAlign: "left", margin: "2rem 0 3rem" }}>
              {["Unlimited Agents", "Vector Knowledge Base", "Global Numbers (31+)", "Marketplace Access"].map(item => (
                <li key={item} style={{ marginBottom: "1.2rem", display: "flex", gap: 10 }}>
                  <span style={{ color: "var(--accent-green)", fontWeight: 900, fontSize: "1.4rem" }}>✓</span> {item}
                </li>
              ))}
            </ul>
            <Link href="/signup?plan=pro">
               <button className="btn-brutal" style={{ width: "100%", boxShadow: "4px 4px 0 #fff" }}>Choose Pro</button>
            </Link>
          </div>

          <div className="card" style={{ padding: "4rem 2rem", textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "1rem" }}>Premium</div>
            <div style={{ fontSize: "4.5rem", fontWeight: 900, marginBottom: "1rem", lineHeight: 1 }}>$250<span style={{ fontSize: "1.5rem", color: "#64748b" }}>/mo</span></div>
            <div style={{ fontWeight: 700, fontSize: "1.2rem", color: "#64748b", marginBottom: "2rem" }}>Includes 1100 Minutes</div>
            
            <ul style={{ listStyle: "none", padding: 0, fontSize: "1.1rem", fontWeight: 700, textAlign: "left", margin: "2rem 0 3rem" }}>
              {["Up to 4 Active Agents", "Custom Agent Voices", "Outbound Dialer", "Dedicated Manager"].map(item => (
                <li key={item} style={{ marginBottom: "1.2rem", display: "flex", gap: 10 }}>
                  <span style={{ color: "var(--accent-green)", fontWeight: 900, fontSize: "1.4rem" }}>✓</span> {item}
                </li>
              ))}
            </ul>
            <Link href="/signup?plan=premium">
               <button className="btn-brutal white" style={{ width: "100%" }}>Go Premium</button>
            </Link>
          </div>

        </div>
      </section>
      
      {/* ── FOOTER CTA ── */}
      <footer style={{ background: "var(--accent-green)", borderTop: "var(--border)", textAlign: "center", padding: "8rem 5%", marginTop: "6rem" }}>
        <h2 style={{ fontSize: "clamp(3.5rem, 6vw, 6rem)", fontWeight: 900, textTransform: "uppercase", margin: "0 0 3rem", lineHeight: 1, letterSpacing: -2 }}>
          Ready to clone <br />your top performer?
        </h2>
        <Link href="/signup">
          <button className="btn-brutal white" style={{ fontSize: "1.5rem", padding: "1.5rem 4rem" }}>Deploy Your First Agent</button>
        </Link>
      </footer>
    </main>
  );
}
