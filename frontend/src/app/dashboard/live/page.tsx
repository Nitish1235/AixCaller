"use client";
import { useEffect, useState, useRef } from 'react';
import styles from './live.module.css';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export default function LiveMonitoringPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [callId, setCallId] = useState("call_demo_123");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const connectToLiveStream = () => {
    if (!callId) return;
    
    // Connect to the FastAPI WebSocket Hub we built in Phase 2
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";
    const ws = new WebSocket(`${wsUrl}/live/${callId}`);

    ws.onopen = () => setIsConnected(true);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.text) {
          setMessages(prev => [...prev, {
            role: data.role || 'assistant',
            text: data.text,
            timestamp: Date.now()
          }]);
        }
      } catch (e) {
        console.error("Failed to parse live message", e);
      }
    };

    ws.onclose = () => setIsConnected(false);

    return () => ws.close();
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Live Monitoring</h1>
          <p className={styles.subtitle}>Watch your AI agents interact with callers in real-time.</p>
        </div>
        
        <div className={styles.controls}>
          <input 
            type="text" 
            value={callId} 
            onChange={(e) => setCallId(e.target.value)}
            className={styles.input}
            placeholder="Enter Call ID to monitor..."
            disabled={isConnected}
          />
          <button 
            onClick={connectToLiveStream} 
            className={`glow-button ${isConnected ? styles.connectedBtn : ''}`}
            disabled={isConnected}
          >
            {isConnected ? 'Monitoring...' : 'Connect to Stream'}
          </button>
        </div>
      </header>

      <div className={`${styles.chatContainer} glass-panel`}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            {isConnected ? "Listening for audio... Waiting for caller to speak." : "Enter a Call ID and connect to view the live transcript."}
          </div>
        ) : (
          <div className={styles.messages}>
            {messages.map((msg, idx) => (
              <div key={idx} className={`${styles.messageWrapper} ${styles[msg.role]}`}>
                <div className={styles.bubble}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
