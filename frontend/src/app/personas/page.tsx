"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import { getPersonas, createPersona, updatePersona, deletePersona } from "@/lib/api";
import type { Persona } from "@/types";

const PLATFORMS = [
  "LinkedIn", "Facebook", "Instagram", "Twitter / X",
  "Blog", "Newsletter", "Medium", "TikTok", "YouTube", "Other",
];

const TONES = [
  "Professional", "Casual", "Friendly", "Inspiring",
  "Educational", "Humorous", "Authoritative", "Conversational",
];

const PLATFORM_ICONS: Record<string, string> = {
  "LinkedIn": "💼",
  "Facebook": "👥",
  "Instagram": "📸",
  "Twitter / X": "🐦",
  "Blog": "📝",
  "Newsletter": "📧",
  "Medium": "✍️",
  "TikTok": "🎵",
  "YouTube": "▶️",
  "Other": "🌐",
};

const EMPTY_FORM = {
  name: "", platform: "LinkedIn", description: "",
  tone: "Professional", style_guide: "", audience: "", language: "English",
};

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { void load(); }, []);

  async function load() {
    try {
      setPersonas(await getPersonas());
    } finally {
      setLoading(false);
    }
  }

  function startCreate() {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setShowForm(true);
    setError("");
  }

  function startEdit(p: Persona) {
    setForm({
      name: p.name, platform: p.platform, description: p.description,
      tone: p.tone, style_guide: p.style_guide, audience: p.audience,
      language: p.language,
    });
    setEditingId(p.id);
    setShowForm(true);
    setError("");
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        const updated = await updatePersona(editingId, form);
        setPersonas((prev) => prev.map((p) => p.id === editingId ? updated : p));
      } else {
        const created = await createPersona(form as Omit<Persona, "id" | "created_at" | "updated_at">);
        setPersonas((prev) => [created, ...prev]);
      }
      setShowForm(false);
      setEditingId(null);
    } catch {
      setError("Failed to save persona.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this persona?")) return;
    try {
      await deletePersona(id);
      setPersonas((prev) => prev.filter((p) => p.id !== id));
    } catch {
      alert("Failed to delete persona.");
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">Personas</h1>
              <p className="text-slate-400 mt-1 text-sm">
                Writing profiles for different platforms and audiences
              </p>
            </div>
            <button
              onClick={startCreate}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              + New Persona
            </button>
          </div>

          {/* Form */}
          {showForm && (
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 mb-8 shadow-xl">
              <h2 className="text-white font-semibold mb-5">
                {editingId ? "Edit Persona" : "Create Persona"}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. LinkedIn Professional"
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Platform *</label>
                  <select
                    value={form.platform}
                    onChange={(e) => setForm({ ...form, platform: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Tone</label>
                  <select
                    value={form.tone}
                    onChange={(e) => setForm({ ...form, tone: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Language</label>
                  <input
                    value={form.language}
                    onChange={(e) => setForm({ ...form, language: e.target.value })}
                    placeholder="English"
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Target Audience</label>
                  <input
                    value={form.audience}
                    onChange={(e) => setForm({ ...form, audience: e.target.value })}
                    placeholder="e.g. B2B decision makers, startup founders, developers"
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Description</label>
                  <input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Brief description of this persona"
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Style Guide
                    <span className="text-slate-600 font-normal ml-1">
                      — used when no Reference URL is provided
                    </span>
                  </label>
                  <textarea
                    value={form.style_guide}
                    onChange={(e) => setForm({ ...form, style_guide: e.target.value })}
                    placeholder={`Describe how to write for this platform:\n• Paragraph length and structure\n• Typical opening hooks\n• Use of emojis / hashtags\n• Call to action style\n• Any platform-specific formatting rules`}
                    rows={5}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-600 resize-y"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mt-4">{error}</p>
              )}

              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  {saving ? "Saving…" : editingId ? "Save Changes" : "Create Persona"}
                </button>
                <button
                  onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="px-5 py-2.5 text-sm text-slate-400 hover:text-white bg-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* List */}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : personas.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🎭</div>
              <h3 className="text-white font-semibold text-lg mb-2">No personas yet</h3>
              <p className="text-slate-400 text-sm mb-6">
                Create a persona to tailor your articles for different platforms
              </p>
              <button
                onClick={startCreate}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                Create your first persona
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {personas.map((p) => (
                <div
                  key={p.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{PLATFORM_ICONS[p.platform] ?? "🌐"}</span>
                      <div>
                        <h3 className="text-white font-medium">{p.name}</h3>
                        <p className="text-slate-500 text-xs">{p.platform}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => startEdit(p)}
                        className="px-2.5 py-1 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => void handleDelete(p.id)}
                        className="px-2.5 py-1 text-xs text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-2">
                    {p.tone && (
                      <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                        {p.tone}
                      </span>
                    )}
                    {p.language && p.language !== "English" && (
                      <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                        {p.language}
                      </span>
                    )}
                    {p.audience && (
                      <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full truncate max-w-[200px]">
                        {p.audience}
                      </span>
                    )}
                  </div>

                  {p.style_guide && (
                    <p className="text-slate-600 text-xs mt-2 line-clamp-2">{p.style_guide}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
