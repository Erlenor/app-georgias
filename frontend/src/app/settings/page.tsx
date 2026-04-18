"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import { getSettings, updateSettings, getPersonas } from "@/lib/api";
import type { AppSettings, Persona } from "@/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>({
    ai_provider: "gemini",
    gemini_api_key: "",
    openai_api_key: "",
    default_persona_id: "",
  });
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Separate form state so we can show new keys without masked values
  const [geminiKey, setGeminiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");

  useEffect(() => {
    void Promise.all([
      getSettings().then((s) => { setSettings(s); }),
      getPersonas().then(setPersonas),
    ]).catch(() => null).finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const payload: Partial<AppSettings> = {
        ai_provider: settings.ai_provider,
        default_persona_id: settings.default_persona_id,
      };
      if (geminiKey.trim()) payload.gemini_api_key = geminiKey.trim();
      if (openaiKey.trim()) payload.openai_api_key = openaiKey.trim();

      const updated = await updateSettings(payload);
      setSettings(updated);
      setGeminiKey("");
      setOpenaiKey("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-slate-950">
          <Navbar />
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Settings</h1>
            <p className="text-slate-400 mt-1 text-sm">Configure AI providers and preferences</p>
          </div>

          <div className="space-y-6">

            {/* AI Provider */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-white font-semibold mb-4">AI Provider</h2>
              <div className="grid grid-cols-2 gap-3">
                {(["gemini", "openai"] as const).map((provider) => (
                  <button
                    key={provider}
                    onClick={() => setSettings({ ...settings, ai_provider: provider })}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                      settings.ai_provider === provider
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                    }`}
                  >
                    <span className="text-2xl">{provider === "gemini" ? "🔷" : "🟢"}</span>
                    <div>
                      <p className="text-white font-medium text-sm capitalize">{provider === "gemini" ? "Google Gemini" : "OpenAI"}</p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {provider === "gemini" ? "gemini-2.0-flash etc." : "gpt-4o, gpt-4o-mini etc."}
                      </p>
                    </div>
                    {settings.ai_provider === provider && (
                      <span className="ml-auto text-emerald-400 text-sm">✓</span>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-slate-600 text-xs mt-3">
                If both keys are set, the selected provider is used. Falls back to whichever key is available.
              </p>
            </div>

            {/* API Keys */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-white font-semibold mb-1">API Keys</h2>
              <p className="text-slate-500 text-sm mb-4">
                Keys are stored securely and never shown in full after saving.
                Leave blank to keep the existing key.
              </p>

              <div className="space-y-4">
                {/* Gemini */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Google Gemini API Key
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      placeholder={settings.gemini_api_key ? settings.gemini_api_key : "Enter new key…"}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-600 pr-24"
                    />
                    {settings.gemini_api_key && !geminiKey && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        ✓ saved
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 text-xs mt-1">
                    Get your key at <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-400 underline">aistudio.google.com</a>
                  </p>
                </div>

                {/* OpenAI */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    OpenAI API Key
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={openaiKey}
                      onChange={(e) => setOpenaiKey(e.target.value)}
                      placeholder={settings.openai_api_key ? settings.openai_api_key : "Enter new key…"}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-600 pr-24"
                    />
                    {settings.openai_api_key && !openaiKey && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        ✓ saved
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 text-xs mt-1">
                    Get your key at <a href="https://platform.openai.com" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-400 underline">platform.openai.com</a>
                  </p>
                </div>
              </div>
            </div>

            {/* Default Persona */}
            {personas.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-white font-semibold mb-1">Default Persona</h2>
                <p className="text-slate-500 text-sm mb-4">
                  Pre-selected in the Generator when no other persona is chosen.
                </p>
                <select
                  value={settings.default_persona_id}
                  onChange={(e) => setSettings({ ...settings, default_persona_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">No default</option>
                  {personas.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} · {p.platform}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Production deployment note */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-5 py-4">
              <div className="flex gap-3">
                <span className="text-amber-400 text-lg flex-shrink-0">⚠</span>
                <div>
                  <p className="text-amber-300 text-sm font-medium">Production deployments</p>
                  <p className="text-amber-400/70 text-sm mt-0.5">
                    In production, store API keys in Google Secret Manager and set{" "}
                    <code className="text-amber-300 font-mono text-xs">USE_SECRET_MANAGER=true</code>.
                    Keys entered here are stored in Firestore and applied at runtime — suitable for development only.
                  </p>
                </div>
              </div>
            </div>

            {/* Error / Save */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
              ) : saved ? (
                <>✓ Settings Saved</>
              ) : (
                <>Save Settings</>
              )}
            </button>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
