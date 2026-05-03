const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
// Default tenant for MVP phase. In production, this comes from auth context.
const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000000"; 

export async function fetchAgents(tenantId: string = DEFAULT_TENANT_ID) {
  try {
    const res = await fetch(`${API_BASE_URL}/agents?tenant_id=${tenantId}`, { cache: 'no-store' });
    if (!res.ok) throw new Error("Failed to fetch agents");
    return await res.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function fetchCalls(tenantId: string = DEFAULT_TENANT_ID) {
  try {
    const res = await fetch(`${API_BASE_URL}/calls?tenant_id=${tenantId}`, { cache: 'no-store' });
    if (!res.ok) throw new Error("Failed to fetch calls");
    return await res.json();
  } catch (error) {
    console.error(error);
    return [];
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
