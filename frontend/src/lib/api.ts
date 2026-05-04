const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function fetchAgents(tenantId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/agents?tenant_id=${tenantId}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch agents");
    return await res.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function fetchCalls(tenantId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/calls?tenant_id=${tenantId}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch calls");
    return await res.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function fetchIntegrations(tenantId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/integrations?tenant_id=${tenantId}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch integrations");
    return await res.json();
  } catch (error) {
    console.error(error);
    return {};
  }
}

export async function fetchVoices() {
  try {
    const res = await fetch(`${API_BASE_URL}/voices`);
    if (!res.ok) throw new Error("Failed to fetch voices");
    return await res.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}
