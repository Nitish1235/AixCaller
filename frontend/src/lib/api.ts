const RAW_API_URL = (process.env.NEXT_PUBLIC_API_URL || "https://backend-597874469660.europe-west1.run.app").trim();
export const API_BASE_URL = RAW_API_URL.replace(/\/+$/, "") + (RAW_API_URL.endsWith("/api/v1") ? "" : "/api/v1");

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

export async function apiGet(path: string) {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`API GET failed: ${res.status}`);
  return await res.json();
}

export async function apiPost(path: string, body: any) {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API POST failed: ${res.status}`);
  return await res.json();
}

export async function apiPatch(path: string, body: any) {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API PATCH failed: ${res.status}`);
  return await res.json();
}

export async function apiDelete(path: string) {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) throw new Error(`API DELETE failed: ${res.status}`);
  return await res.json();
}

export async function createAgent(data: any) {
  return await apiPost("/agents", data);
}

export async function updateAgent(id: string, data: any) {
  return await apiPatch(`/agents/${id}`, data);
}
