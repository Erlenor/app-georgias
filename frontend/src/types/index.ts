// ─── User & Auth ──────────────────────────────────────────────────────────────

export interface User {
  email: string;
  name: string;
  picture: string;
  role: "admin" | "editor" | "viewer" | string;
}

// ─── Article & Pipeline ───────────────────────────────────────────────────────

export type ArticleStatus = "pending" | "running" | "completed" | "failed";

export interface PipelineInputs {
  author_notes: string;
  sources: string[];
  reference_url: string;
  constraints: string;
}

export interface PipelineResults {
  research_brief: string | null;
  style_guide: string | null;
  draft: string | null;
  feedback: string | null;
  final_article: string | null;
}

export interface Article {
  id: string;
  user_email: string;
  title: string;
  status: ArticleStatus;
  pipeline_step: string | null;
  error: string | null;
  inputs: PipelineInputs;
  results: PipelineResults;
  created_at: string;
  updated_at: string;
}

// ─── Pipeline Steps ───────────────────────────────────────────────────────────

export type PipelineStepId =
  | "research"
  | "style_extraction"
  | "draft"
  | "reflection"
  | "finalization";

export interface PipelineStep {
  id: PipelineStepId;
  label: string;
  resultKey: keyof PipelineResults;
  icon: string;
  description: string;
}

export const PIPELINE_STEPS: PipelineStep[] = [
  {
    id: "research",
    label: "Research Brief",
    resultKey: "research_brief",
    icon: "🔍",
    description: "Analyzing notes and sources",
  },
  {
    id: "style_extraction",
    label: "Style Extraction",
    resultKey: "style_guide",
    icon: "🎨",
    description: "Extracting writing style",
  },
  {
    id: "draft",
    label: "Draft",
    resultKey: "draft",
    icon: "✍️",
    description: "Writing first draft",
  },
  {
    id: "reflection",
    label: "Reflection",
    resultKey: "feedback",
    icon: "🔄",
    description: "Critical feedback",
  },
  {
    id: "finalization",
    label: "Final Article",
    resultKey: "final_article",
    icon: "✅",
    description: "Finalizing article",
  },
];

// ─── SSE Events ───────────────────────────────────────────────────────────────

export interface PipelineSSEEvent {
  event:
    | "started"
    | "step_started"
    | "step_completed"
    | "completed"
    | "error"
    | "done";
  step: string | null;
  data: unknown;
  error?: string;
}

// ─── Agent Config ─────────────────────────────────────────────────────────────

export type AgentId =
  | "research"
  | "style_extraction"
  | "draft"
  | "reflection"
  | "finalization";

export interface AgentConfig {
  id: AgentId;
  name: string;
  description: string;
  model: string;
  system_prompt: string;
  user_prompt_template: string;
}

// ─── Persona ──────────────────────────────────────────────────────────────────

export interface Persona {
  id: string;
  name: string;
  platform: string;
  description: string;
  tone: string;
  style_guide: string;
  audience: string;
  language: string;
  created_at: string;
  updated_at: string;
}

// ─── App Settings ─────────────────────────────────────────────────────────────

export interface AppSettings {
  ai_provider: "gemini" | "openai";
  gemini_api_key: string;
  openai_api_key: string;
  default_persona_id: string;
}

// ─── API Error ────────────────────────────────────────────────────────────────

export interface ApiError {
  detail: string;
}
