"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import GoogleLoginButton from "@/components/GoogleLoginButton";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.push("/generator");
  }, [user, loading, router]);

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl mb-4">
            <span className="text-2xl">✦</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">App Georgias</h1>
          <p className="text-slate-400">AI-powered article generation pipeline</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
          <h2 className="text-white font-semibold text-lg mb-1">Welcome back</h2>
          <p className="text-slate-400 text-sm mb-6">Sign in to access the platform</p>
          <GoogleLoginButton />
          <p className="text-slate-600 text-xs text-center mt-4">
            Access restricted to authorised users
          </p>
        </div>

        <div className="mt-8 grid grid-cols-5 gap-3">
          {[
            { icon: "🔍", label: "Research" },
            { icon: "🎨", label: "Style" },
            { icon: "✍️", label: "Draft" },
            { icon: "🔄", label: "Review" },
            { icon: "✅", label: "Publish" },
          ].map((f) => (
            <div
              key={f.label}
              className="text-center p-3 bg-slate-900/50 rounded-xl border border-slate-800/50"
            >
              <div className="text-xl mb-1">{f.icon}</div>
              <p className="text-slate-500 text-xs">{f.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
