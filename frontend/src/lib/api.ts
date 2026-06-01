const RAW_API_URL = (process.env.NEXT_PUBLIC_API_URL || "https://backend-597874469660.europe-west1.run.app").trim();

// When running in the browser, we use the local proxy to avoid CORS issues.
// On the server (SSR/Server Components), we use the full URL.
export const API_BASE_URL = typeof window !== "undefined"
  ? "/api/v1"
  : (RAW_API_URL.replace(/\/+$/, "") + (RAW_API_URL.endsWith("/api/v1") ? "" : "/api/v1"));

export const getTenantId = () => {
  if (typeof window === "undefined") return "00000000-0000-0000-0000-000000000000";
  const match = document.cookie.match(/(?:^|; )tenant_id=([^;]*)/);
  let tid = match ? decodeURIComponent(match[1]) : null;
  if (tid) { 
    localStorage.setItem("tenant_id", tid); 
    return tid; 
  }
  return localStorage.getItem("tenant_id") || "00000000-0000-0000-0000-000000000000";
};

export async function fetchAgents(tenantId: string) {
  try {
    const url = `${API_BASE_URL}/agents?tenant_id=${tenantId}`;
    console.log(`[API] Fetching agents from: ${url}`);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch agents: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error("[API Error] fetchAgents:", error);
    return [];
  }
}

export async function fetchCalls(tenantId: string) {
  try {
    const url = `${API_BASE_URL}/calls?tenant_id=${tenantId}`;
    console.log(`[API] Fetching calls from: ${url}`);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch calls: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error("[API Error] fetchCalls:", error);
    return [];
  }
}

export async function fetchIntegrations(tenantId: string) {
  try {
    const url = `${API_BASE_URL}/integrations?tenant_id=${tenantId}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch integrations: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error("[API Error] fetchIntegrations:", error);
    return {};
  }
}

export async function fetchVoices() {
  try {
    const url = `${API_BASE_URL}/voices`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch voices: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error("[API Error] fetchVoices:", error);
    return [];
  }
}

async function extractError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail;
    if (typeof body?.message === "string") return body.message;
    if (Array.isArray(body?.detail)) {
      // FastAPI validation errors: [{loc, msg, type}]
      return body.detail.map((e: any) => e.msg || JSON.stringify(e)).join("; ");
    }
  } catch {}
  return `${fallback} (${res.status})`;
}

export async function apiGet(path: string) {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(await extractError(res, "Request failed"));
  return await res.json();
}

export async function apiPost(path: string, body: any) {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await extractError(res, "Request failed"));
  return await res.json();
}

export async function apiPatch(path: string, body: any) {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await extractError(res, "Request failed"));
  return await res.json();
}

export async function apiPut(path: string, body: any) {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await extractError(res, "Request failed"));
  return await res.json();
}

export async function apiDelete(path: string) {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) throw new Error(await extractError(res, "Request failed"));
  return await res.json();
}

export async function createAgent(data: any) {
  return await apiPost("/agents", data);
}

export async function updateAgent(id: string, data: any) {
  return await apiPatch(`/agents/${id}`, data);
}

// ─────────────────────────────────────────────────────────────────
// PHONE NUMBERS
// ─────────────────────────────────────────────────────────────────
export async function searchNumbers(tenantId: string, countryCode = "US", areaCode = "") {
  return await apiPost("/numbers/search", {
    country_code: countryCode,
    area_code: areaCode,
    limit: 10,
    tenant_id: tenantId,
  });
}

export async function purchaseNumber(phoneNumber: string, tenantId: string, agentId: string) {
  return await apiPost("/numbers/purchase", {
    phone_number: phoneNumber,
    tenant_id: tenantId,
    agent_id: agentId,
  });
}

// ─────────────────────────────────────────────────────────────────
// CAMPAIGNS
// ─────────────────────────────────────────────────────────────────
export async function fetchCampaigns(tenantId: string) {
  try {
    const data = await apiGet(`/campaigns?tenant_id=${tenantId}`);
    return data.campaigns || [];
  } catch (error) {
    console.error("[API Error] fetchCampaigns:", error);
    return [];
  }
}

export async function createCampaignAPI(data: {
  tenant_id: string;
  agent_id: string;
  name: string;
  max_concurrent_calls?: number;
  calling_window_timezone?: string;
  calling_window_start?: string;
  calling_window_end?: string;
  speed_to_lead_enabled?: boolean;
  sms_enabled?: boolean;
  scheduled_start_at?: string;   // ISO-8601 UTC, e.g. "2026-03-15T10:00:00.000Z"
}) {
  return await apiPost("/campaigns", data);
}

export async function updateCampaign(campaignId: string, tenantId: string, data: any) {
  return await apiPatch(`/campaigns/${campaignId}?tenant_id=${tenantId}`, data);
}

export async function deleteCampaign(campaignId: string, tenantId: string) {
  return await apiDelete(`/campaigns/${campaignId}?tenant_id=${tenantId}`);
}

export async function uploadCampaignLeads(
  campaignId: string,
  tenantId: string,
  leads: { name: string; phone: string; email?: string }[],
) {
  return await apiPost(`/campaigns/${campaignId}/leads?tenant_id=${tenantId}`, { leads });
}

export async function fetchCampaignStats(campaignId: string, tenantId: string) {
  return await apiGet(`/campaigns/${campaignId}/stats?tenant_id=${tenantId}`);
}
