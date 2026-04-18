"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import AgentEditor from "@/components/AgentEditor";
import { getAgentConfigs, resetAllAgentConfigs } from "@/lib/api";
import type { AgentConfig } from "@/types";

export default function AgentsPage() {
  const [configs, setConfigs] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    try {
      setConfigs(await getAgentConfigs());
    } catch {
      setError("Failed to load agent configurations.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetAll() {
    if (!confirm("Reset ALL agents to default settings?")) return;
    setIsResetting(true);
    try {
      await resetAllAgentConfigs();
      await load();
    } catch {
      setError("Failed to reset configurations.");
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">Agent Configuration</h1>
              <p className="text-slate-400 mt-1 text-sm">
                Edit system prompts, user prompt templates and models for each pipeline step
              </p>
            </div>
            <button
              onClick={() => void handleResetAll()}
              disabled={isResetting}
              className="px-4 py-2 text-sm text-orange-400 hover:text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-xl transition-colors disabled:opacity-60 flex-shrink-0"
            >
              {isResetting ? "Resetting…" : "Reset all"}
            </button>
          </div>

          {/* Info banner */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-5 py-4 mb-6">
            <div className="flex gap-3">
              <span className="text-blue-400 text-lg">ℹ</span>
              <div>
                <p className="text-blue-300 text-sm font-medium">About template variables</p>
                <p className="text-blue-400/70 text-sm mt-0.5">
                  Variables like <code className="text-blue-300 font-mono text-xs bg-blue-500/10 px-1 rounded">{"{author_notes}"}</code> are filled automatically from your inputs.
                  The variable badges shown in each agent editor are read-only — keep them in your templates or the step will receive incomplete context.
                </p>
              </div>
            </div>
          </div>

          {/* Pipeline overview */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
            {configs.map((c, idx) => (
              <div key={c.id} className="flex items-center gap-2 flex-shrink-0">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-sm">
                    {["🔍", "🎨", "✍️", "🔄", "✅"][idx]}
                  </div>
                  <span className="text-slate-600 text-xs mt-1 text-center max-w-16 truncate">{c.name}</span>
                </div>
                {idx < configs.length - 1 && <div className="w-5 h-0.5 bg-slate-700" />}
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm mb-6">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {configs.map((config) => (
                <AgentEditor
                  key={config.id}
                  config={config}
                  onUpdated={(updated) =>
                    setConfigs((prev) => prev.map((c) => c.id === updated.id ? updated : c))
                  }
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
