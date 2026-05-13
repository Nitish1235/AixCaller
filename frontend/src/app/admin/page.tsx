"use client";
import { useState } from "react";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "https://backend-597874469660.europe-west1.run.app").replace(/\/+$/, "");

export default function AdminDashboard() {
  // Auth state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Plan assignment state
  const [assignEmail, setAssignEmail] = useState("");
  const [assignPlan, setAssignPlan] = useState("starter");
  const [customMinutes, setCustomMinutes] = useState("");

  // Loading & Message states
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [details, setDetails] = useState<{ success: string[], failed: any[] } | null>(null);

  const getHeaders = () => {
    const auth = btoa(`${username}:${password}`);
    return {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/json"
    };
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      setIsLoggedIn(true);
      setMessage("Logged in (Credentials stored in session)");
    }
  };

  const handleAssignPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const url = new URL(`${API_URL}/admin/assign-plan`);
      url.searchParams.append("email", assignEmail);
      url.searchParams.append("plan_tier", assignPlan);
      if (customMinutes) url.searchParams.append("custom_minutes", customMinutes);

      const res = await fetch(url.toString(), {
        method: "POST",
        headers: getHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ Success: ${data.message}`);
        setAssignEmail("");
      } else {
        setMessage(`⚠️ Error: ${data.detail || JSON.stringify(data)}`);
      }
    } catch (err) {
      setMessage(`⚠️ Network Error: ${err}`);
    }
    setLoading(false);
  };

  const handleGenerateVoices = async () => {
    if (!confirm("Are you sure? This will call Deepgram 28+ times and upload to GCS.")) return;
    setLoading(true);
    setMessage("Generating previews and uploading to GCS... This may take up to a minute.");
    setDetails(null);
    try {
      const res = await fetch(`${API_URL}/admin/generate-voice-previews`, {
        method: "POST",
        headers: getHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ Success: Voice catalog updated. Previews generated for ${data.details.success.length} voices.`);
        setDetails(data.details);
      } else {
        setMessage(`⚠️ Error: ${data.detail || JSON.stringify(data)}`);
      }
    } catch (err) {
      setMessage(`⚠️ Network Error: ${err}`);
    }
    setLoading(false);
  };

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#020617] text-white p-4">
        <div className="w-full max-w-md bg-[#1e293b] rounded-2xl p-8 border border-[#334155] shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold mb-2 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              Admin Login
            </h1>
            <p className="text-slate-400 text-sm">Secure Management Portal</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="Enter admin username"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="Enter admin password"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 transform transition-all hover:-translate-y-0.5 active:scale-95"
            >
              Access Dashboard
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-4">
          <div>
            <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Admin Panel
            </h1>
            <p className="text-slate-400">Authenticated as <span className="text-blue-400 font-semibold">{username}</span></p>
          </div>
          <button 
            onClick={() => setIsLoggedIn(false)}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-full text-sm font-bold transition-colors border border-slate-700"
          >
            Logout
          </button>
        </header>

        {message && (
          <div className={`mb-8 p-4 rounded-xl border ${message.includes('✅') ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-400' : 'bg-red-950/30 border-red-500/50 text-red-400'}`}>
            {message}
          </div>
        )}

        {/* Process Logs (Success & Failure) */}
        {details && (
          <div className="mb-8 p-6 bg-slate-900 rounded-2xl border border-slate-800">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Process Logs</h3>
            <div className="space-y-4 max-h-80 overflow-y-auto font-mono text-xs">
              
              <div>
                <div className="text-emerald-400 font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Success ({details.success.length})
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {details.success.length > 0 ? details.success.map(v => (
                    <div key={v} className="bg-slate-800 p-1 px-2 rounded text-slate-400 border border-slate-700/50">{v}</div>
                  )) : <div className="text-slate-600">No successes</div>}
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4">
                <div className="text-red-400 font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  Failures ({details.failed.length})
                </div>
                <div className="space-y-1">
                  {details.failed.length > 0 ? details.failed.map((f, i) => (
                    <div key={i} className="text-red-300/80 bg-red-950/20 p-2 rounded border border-red-900/30">
                      {JSON.stringify(f)}
                    </div>
                  )) : <div className="text-slate-600">No failures reported</div>}
                </div>
              </div>

              {details.success.length === 0 && details.failed.length === 0 && (
                <div className="text-amber-400">
                  ⚠️ The backend returned an empty result. This usually means the internal voice list didn't match any criteria or an environment variable (DEEPGRAM_API_KEY) is missing.
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Section: Plan Assignment */}
          <section className="bg-[#1e293b] rounded-2xl p-8 border border-[#334155] shadow-xl h-fit">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-lg">💎</span>
              Manual Plan Assignment
            </h2>
            <form onSubmit={handleAssignPlan} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">User Email</label>
                <input
                  type="email"
                  value={assignEmail}
                  onChange={(e) => setAssignEmail(e.target.value)}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Plan Tier</label>
                  <select
                    value={assignPlan}
                    onChange={(e) => setAssignPlan(e.target.value)}
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-xl px-4 py-3 focus:outline-none"
                  >
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="premium">Premium</option>
                    <option value="free">Free (Reset)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Custom Minutes (Opt)</label>
                  <input
                    type="number"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-xl px-4 py-3 focus:outline-none"
                    placeholder="Plan Default"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all"
              >
                {loading ? "Processing..." : "Assign Subscription"}
              </button>
            </form>
          </section>

          {/* Section: Voice Management */}
          <section className="bg-[#1e293b] rounded-2xl p-8 border border-[#334155] shadow-xl h-fit">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg">🎙️</span>
              Voice Catalog Management
            </h2>
            <div className="space-y-4">
              <p className="text-slate-400 text-sm leading-relaxed">
                Regenerate audio previews for all Deepgram Aura-2 voices. This script will:
              </p>
              <ul className="text-xs text-slate-500 space-y-2 list-disc pl-4">
                <li>Generate 28+ MP3 samples via Deepgram API</li>
                <li>Upload each sample to your Google Cloud Storage bucket</li>
                <li>Make samples public and update database URLs</li>
                <li>Refresh the user selection dropdown in the dashboard</li>
              </ul>
              <div className="pt-4">
                <button
                  onClick={handleGenerateVoices}
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    "Processing Voice Cloud..."
                  ) : (
                    <>
                      <span>Refresh All Voice Previews</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        </div>
        
        <footer className="mt-12 text-center text-slate-600 text-xs">
          AIxcaller Management Console &copy; 2026. Use with caution.
        </footer>
      </div>
    </main>
  );
}
