"use client";

import { useState } from "react";
import type { AgentConfig } from "@/types";
import { updateAgentConfig, resetAgentConfig } from "@/lib/api";

const GEMINI_MODELS = [
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];

const OPENAI_MODELS = [
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4-turbo",
  "gpt-3.5-turbo",
];

const AGENT_ICONS: Record<string, string> = {
  research: "🔍",
  style_extraction: "🎨",
  draft: "✍️",
  reflection: "🔄",
  finalization: "✅",
};

// Extract placeholder variables from a template string
function extractVariables(template: string): string[] {
  const matches = template.match(/\{(\w+)\}/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(1, -1)))];
}

interface Props {
  config: AgentConfig;
  onUpdated: (updated: AgentConfig) => void;
}

export default function AgentEditor({ config, onUpdated }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [draft, setDraft] = useState({
    model: config.model,
    system_prompt: config.system_prompt,
    user_prompt_template: config.user_prompt_template,
  });

  const templateVars = extractVariables(draft.user_prompt_template);

  function handleEdit() {
    setDraft({
      model: config.model,
      system_prompt: config.system_prompt,
      user_prompt_template: config.user_prompt_template,
    });
    setIsEditing(true);
    setIsOpen(true);
    setError("");
    setSuccess("");
  }

  function handleCancel() {
    setIsEditing(false);
    setError("");
  }

  async function handleSave() {
    if (!draft.system_prompt.trim() || !draft.user_prompt_template.trim()) {
      setError("Prompts cannot be empty.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const updated = await updateAgentConfig(config.id, draft);
      onUpdated(updated);
      setIsEditing(false);
      setSuccess("Configuration saved!");
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Failed to save configuration.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReset() {
    if (!confirm(`Reset "${config.name}" to default settings?`)) return;
    setIsResetting(true);
    try {
      await resetAgentConfig(config.id);
      window.location.reload();
    } catch {
      setError("Failed to reset configuration.");
      setIsResetting(false);
    }
  }

  const allModels = [...GEMINI_MODELS, ...OPENAI_MODELS];

  return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5">
          <button
              className="flex items-center gap-3 flex-1 text-left"
              onClick={() => !isEditing && setIsOpen((v) => !v)}
          >
            <span className="text-2xl">{AGENT_ICONS[config.id] ?? "🤖"}</span>
            <div>
              <h3 className="text-white font-medium">{config.name}</h3>
              <p className="text-slate-500 text-xs mt-0.5">{config.description}</p>
            </div>
          </button>

          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
          <span className="hidden sm:inline text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-full font-mono">
            {config.model}
          </span>
            {!isEditing ? (
                <>
                  <button
                      onClick={handleEdit}
                      className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                      onClick={() => void handleReset()}
                      disabled={isResetting}
                      className="px-3 py-1.5 text-xs text-slate-500 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors"
                  >
                    {isResetting ? "..." : "Reset"}
                  </button>
                </>
            ) : (
                <>
                  <button
                      onClick={() => void handleSave()}
                      disabled={isSaving}
                      className="px-3 py-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 rounded-lg transition-colors"
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                  <button
                      onClick={handleCancel}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </>
            )}
          </div>
        </div>

        {/* Messages */}
        {(error || success) && (
            <div className="px-5 pb-2">
              {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
              {success && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">{success}</p>}
            </div>
        )}

        {/* Expanded */}
        {isOpen && (
            <div className="px-5 pb-5 border-t border-slate-800 pt-4 space-y-4">
              {/* Model */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Model</label>
                {isEditing ? (
                    <select
                        value={draft.model}
                        onChange={(e) => setDraft({ ...draft, model: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <optgroup label="Gemini">
                        {GEMINI_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </optgroup>
                      <optgroup label="OpenAI">
                        {OPENAI_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </optgroup>
                    </select>
                ) : (
                    <p className="text-slate-400 text-sm font-mono bg-slate-800 rounded-lg px-3 py-2">{config.model}</p>
                )}
              </div>

              {/* System Prompt */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">System Prompt</label>
                {isEditing ? (
                    <textarea
                        value={draft.system_prompt}
                        onChange={(e) => setDraft({ ...draft, system_prompt: e.target.value })}
                        rows={5}
                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y font-mono"
                    />
                ) : (
                    <pre className="text-slate-400 text-sm bg-slate-800 rounded-lg px-3 py-2 whitespace-pre-wrap max-h-36 overflow-auto font-mono">
                {config.system_prompt}
              </pre>
                )}
              </div>

              {/* User Prompt Template */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-400">User Prompt Template</label>
                  {templateVars.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap justify-end">
                        {templateVars.map((v) => (
                            <span key={v} className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono">
                      {"{" + v + "}"}
                    </span>
                        ))}
                      </div>
                  )}
                </div>
                <p className="text-xs text-slate-600 mb-1.5">
                  Variables shown above are filled automatically — do not remove them.
                </p>
                {isEditing ? (
                    <textarea
                        value={draft.user_prompt_template}
                        onChange={(e) => setDraft({ ...draft, user_prompt_template: e.target.value })}
                        rows={7}
                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y font-mono"
                    />
                ) : (
                    <pre className="text-slate-400 text-sm bg-slate-800 rounded-lg px-3 py-2 whitespace-pre-wrap max-h-44 overflow-auto font-mono">
                {config.user_prompt_template}
              </pre>
                )}
              </div>
            </div>
        )}
      </div>
  );
}