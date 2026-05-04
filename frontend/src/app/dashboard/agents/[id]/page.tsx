"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styles from '../agents.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const TENANT_ID = '00000000-0000-0000-0000-000000000000';

export default function AgentDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Settings state
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/agents?tenant_id=${TENANT_ID}`);
        const agents = await res.json();
        const found = agents.find((a: any) => a.id === id);
        if (found) {
          setAgent(found);
          setName(found.name);
          setPrompt(found.system_prompt);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAgent();
  }, [id]);

  const handleSave = async () => {
    try {
      await fetch(`${API_URL}/api/v1/agents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, system_prompt: prompt })
      });
      alert('Settings saved!');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className={styles.page}>Loading agent details...</div>;
  if (!agent) return <div className={styles.page}>Agent not found.</div>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => router.push('/dashboard/agents')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>←</button>
          <div>
            <h1 className={styles.title}>{agent.name}</h1>
            <p className={styles.subtitle}>Configure your agent's behavior and telephony.</p>
          </div>
        </div>
        <button onClick={handleSave} className="glow-button">Save Changes</button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
        
        {/* Left Column: Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className={`${styles.agentCard} glass-panel`} style={{ padding: '2rem' }}>
            <h2>Agent Settings</h2>
            
            <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
              />
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>System Prompt</label>
              <textarea 
                rows={10}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', resize: 'vertical' }}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Telephony (Option A & B) */}
        <div>
          <div className={`${styles.agentCard} glass-panel`} style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>Incoming Calls Configuration</h2>
              {agent.phone_number ? (
                <span style={{ background: 'rgba(0, 255, 128, 0.2)', color: '#00ff80', padding: '0.3rem 0.8rem', borderRadius: '12px', fontSize: '0.9rem' }}>Live</span>
              ) : (
                <span style={{ background: 'rgba(255, 165, 0, 0.2)', color: 'orange', padding: '0.3rem 0.8rem', borderRadius: '12px', fontSize: '0.9rem' }}>No Number</span>
              )}
            </div>

            {agent.phone_number ? (
              <>
                <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', textAlign: 'center', marginBottom: '2rem' }}>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.9rem', letterSpacing: '1px' }}>YOUR AI PHONE NUMBER</div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', letterSpacing: '2px', color: 'white' }}>{agent.phone_number}</div>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span>📱</span> Option A: The Direct Line
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                    Use this number directly for new marketing campaigns. Put it on your website, Google My Business, or Facebook Ads. Anyone who calls this number will speak directly to your AI agent.
                  </p>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span>🔄</span> Option B: Call Forwarding
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '1rem' }}>
                    Keep your existing business number! Just forward missed calls from your current phone to your AI agent so you never miss a lead.
                  </p>
                  
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', marginBottom: '0.5rem' }}>
                    <strong>Cell Phones (AT&T/Verizon):</strong><br/>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Dial <code style={{ color: 'var(--accent)', background: 'rgba(0,0,0,0.5)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>*72 {agent.phone_number.replace('+1', '')}</code> to turn on unconditional forwarding.</span>
                  </div>
                  
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                    <strong>RingCentral / Google Voice / PBX:</strong><br/>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Go to your Call Routing settings and paste <code style={{ color: 'var(--accent)', background: 'rgba(0,0,0,0.5)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{agent.phone_number}</code> as the forwarding destination.</span>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>This agent doesn't have a phone number yet.</p>
                <button onClick={() => router.push('/dashboard/agents/create')} className="glow-button">
                  Provision a Number
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
