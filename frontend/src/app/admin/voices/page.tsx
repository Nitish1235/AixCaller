"use client";
import { useState } from "react";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");

export default function AdminVoicesPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleGenerate = async () => {
    setLoading(true);
    setMessage("Generating previews and uploading to GCS... This might take 30-60 seconds.");
    try {
      const res = await fetch(`${API_URL}/admin/generate-voice-previews`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ Success: ${data.message}`);
      } else {
        setMessage(`⚠️ Error: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      setMessage(`⚠️ Network Error: ${err}`);
    }
    setLoading(false);
  };

  return (
    <main style={{ padding: "4rem 2rem", fontFamily: "sans-serif", maxWidth: 600, margin: "0 auto" }}>
      <h1>Admin: Generate Voice Previews</h1>
      <p style={{ color: "#4B5563", marginBottom: "2rem" }}>
        Clicking the button below will instruct the backend to iterate through all approved Deepgram Aura voices, 
        generate a short MP3 preview script, upload them to your Google Cloud Storage bucket, 
        and save the public URLs into the database for the frontend to use.
      </p>

      <button 
        onClick={handleGenerate} 
        disabled={loading}
        style={{
          background: "#10B981", color: "white", padding: "12px 24px", 
          borderRadius: 8, border: "none", fontSize: "1rem", fontWeight: "bold",
          cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1
        }}
      >
        {loading ? "Generating..." : "Generate Voice Previews to GCS"}
      </button>

      {message && (
        <div style={{ marginTop: "2rem", padding: "1rem", background: "#F3F4F6", borderRadius: 8 }}>
          {message}
        </div>
      )}
    </main>
  );
}
