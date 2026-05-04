"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../agents.module.css';

// Using the mock tenant ID for now, just like in api.ts
const TENANT_ID = '00000000-0000-0000-0000-000000000000';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function CreateAgentPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Agent Details
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('You are a helpful AI assistant for our business.');
  
  // Number Provisioning
  const [areaCode, setAreaCode] = useState('');
  const [availableNumbers, setAvailableNumbers] = useState<string[]>([]);
  const [createdAgentId, setCreatedAgentId] = useState<string | null>(null);

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          system_prompt: prompt,
          tenant_id: TENANT_ID,
          voice_id: 'aura-asteria-en'
        })
      });
      if (!res.ok) throw new Error('Failed to create agent');
      const agent = await res.json();
      setCreatedAgentId(agent.id);
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleSearchNumbers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaCode || areaCode.length !== 3) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/numbers/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area_code: areaCode, limit: 5 })
      });
      if (!res.ok) throw new Error('Failed to search numbers');
      const data = await res.json();
      setAvailableNumbers(data.numbers || []);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleClaimNumber = async (phoneNumber: string) => {
    if (!createdAgentId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/numbers/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phoneNumber,
          tenant_id: TENANT_ID,
          agent_id: createdAgentId
        })
      });
      if (!res.ok) throw new Error('Failed to claim number');
      
      // Successfully claimed, redirect to agent details
      router.push(`/dashboard/agents/${createdAgentId}`);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Create New Agent</h1>
        <p className={styles.subtitle}>Deploy a new AI workforce member in seconds.</p>
      </header>

      <div className={`${styles.agentCard} glass-panel`} style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
        {error && <div style={{ color: '#ff4444', marginBottom: '1rem', padding: '1rem', background: 'rgba(255,0,0,0.1)', borderRadius: '8px' }}>{error}</div>}
        
        {step === 1 && (
          <form onSubmit={handleCreateAgent}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Agent Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sarah - Sales Representative"
                required
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
              />
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>System Prompt & Instructions</label>
              <textarea 
                rows={6}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                required
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', resize: 'vertical' }}
              />
            </div>
            
            <button type="submit" disabled={loading} className="glow-button" style={{ width: '100%' }}>
              {loading ? 'Creating...' : 'Next: Setup Phone Number →'}
            </button>
          </form>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ marginBottom: '1rem' }}>Setup Phone Number</h2>
            <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
              Where is your business located? Search for a local area code to give your agent a real phone number.
            </p>
            
            <form onSubmit={handleSearchNumbers} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
              <input 
                type="text" 
                value={areaCode}
                onChange={(e) => setAreaCode(e.target.value)}
                placeholder="e.g. 212"
                maxLength={3}
                required
                style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
              />
              <button type="submit" disabled={loading} className="glow-button">
                {loading ? 'Searching...' : 'Search'}
              </button>
            </form>

            {availableNumbers.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>Available Numbers</h3>
                {availableNumbers.map((num) => (
                  <div key={num} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '1.1rem', letterSpacing: '1px' }}>{num}</span>
                    <button 
                      onClick={() => handleClaimNumber(num)}
                      disabled={loading}
                      style={{ padding: '0.5rem 1rem', borderRadius: '6px', background: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer' }}
                    >
                      Claim
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <button 
                onClick={() => router.push(`/dashboard/agents/${createdAgentId}`)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', textDecoration: 'underline', cursor: 'pointer' }}
              >
                Skip for now (I will configure this later)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
