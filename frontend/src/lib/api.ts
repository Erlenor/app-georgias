import type {
  Article,
  AgentConfig,
  Persona,
  AppSettings,
  PipelineInputs,
} from "@/types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ─── Core fetch helper ────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error((body as { detail: string }).detail ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const getAuthState = () =>
  apiFetch<{ state: string }>("/api/auth/state");

export const exchangeGoogleCode = (auth_code: string, state: string) =>
  apiFetch<{ success: boolean; user?: unknown; error?: string }>(
    "/api/auth/google",
    { method: "POST", body: JSON.stringify({ auth_code, state }) }
  );

export const getMe = () =>
  apiFetch<{ authenticated: boolean; user: unknown }>("/api/auth/me");

export const logout = () =>
  apiFetch<{ success: boolean }>("/api/auth/logout", { method: "POST" });

// ─── Articles ─────────────────────────────────────────────────────────────────

export const createArticle = (title: string, inputs: PipelineInputs) =>
  apiFetch<Article>("/api/articles", {
    method: "POST",
    body: JSON.stringify({ title, inputs }),
  });

export const getArticles = (search?: string) =>
  apiFetch<Article[]>(`/api/articles${search ? `?search=${encodeURIComponent(search)}` : ""}`);

export const getArticle = (id: string) =>
  apiFetch<Article>(`/api/articles/${id}`);

export const deleteArticle = (id: string) =>
  apiFetch<{ success: boolean }>(`/api/articles/${id}`, { method: "DELETE" });

export const updateArticleTitle = (id: string, title: string) =>
  apiFetch<Article>(`/api/articles/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export const runPipeline = (articleId: string, personaId?: string) =>
  apiFetch<{ success: boolean; article_id: string; status: string }>(
    `/api/pipeline/${articleId}/run${personaId ? `?persona_id=${personaId}` : ""}`,
    { method: "POST" }
  );

export const getPipelineStatus = (articleId: string) =>
  apiFetch<{
    article_id: string;
    status: string;
    pipeline_step: string | null;
    error: string | null;
    results: Record<string, string | null>;
  }>(`/api/pipeline/${articleId}/status`);

export const createPipelineStream = (articleId: string): EventSource =>
  new EventSource(`${API_URL}/api/pipeline/${articleId}/stream`, {
    withCredentials: true,
  });

// ─── Agent Config ─────────────────────────────────────────────────────────────

export const getAgentConfigs = () =>
  apiFetch<AgentConfig[]>("/api/agent-config");

export const getDefaultAgentConfigs = () =>
  apiFetch<AgentConfig[]>("/api/agent-config/defaults");

export const updateAgentConfig = (
  agentId: string,
  data: Partial<Pick<AgentConfig, "model" | "system_prompt" | "user_prompt_template">>
) =>
  apiFetch<AgentConfig>(`/api/agent-config/${agentId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const resetAgentConfig = (agentId: string) =>
  apiFetch<{ success: boolean }>(`/api/agent-config/${agentId}`, {
    method: "DELETE",
  });

export const resetAllAgentConfigs = () =>
  apiFetch<{ success: boolean }>("/api/agent-config/reset", { method: "POST" });

// ─── App Settings ─────────────────────────────────────────────────────────────

export const getSettings = () =>
  apiFetch<AppSettings>("/api/agent-config/settings");

export const updateSettings = (data: Partial<AppSettings>) =>
  apiFetch<AppSettings>("/api/agent-config/settings", {
    method: "PUT",
    body: JSON.stringify(data),
  });

// ─── Personas ─────────────────────────────────────────────────────────────────

export const getPersonas = () => apiFetch<Persona[]>("/api/personas");

export const getPersona = (id: string) =>
  apiFetch<Persona>(`/api/personas/${id}`);

export const createPersona = (
  data: Omit<Persona, "id" | "created_at" | "updated_at">
) =>
  apiFetch<Persona>("/api/personas", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updatePersona = (id: string, data: Partial<Persona>) =>
  apiFetch<Persona>(`/api/personas/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deletePersona = (id: string) =>
  apiFetch<{ success: boolean }>(`/api/personas/${id}`, { method: "DELETE" });
