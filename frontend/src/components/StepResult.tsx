"use client";

import { useState } from "react";

interface StepResultProps {
  icon: string;
  label: string;
  description: string;
  content: string | null;
  isStreaming?: boolean;
  defaultOpen?: boolean;
}

export default function StepResult({
                                     icon,
                                     label,
                                     description,
                                     content,
                                     isStreaming = false,
                                     defaultOpen = false,
                                   }: StepResultProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);

  const hasContent = !!content;

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload(e: React.MouseEvent) {
    e.stopPropagation();
    if (!content) return;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${label.toLowerCase().replace(/\s+/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
      <div
          className={`border rounded-xl overflow-hidden transition-all duration-300 ${
              isStreaming
                  ? "border-blue-500/50 bg-slate-900 shadow-lg shadow-blue-500/10"
                  : hasContent
                      ? "border-slate-700 bg-slate-900"
                      : "border-slate-800 bg-slate-900/40"
          }`}
      >
        {/* Header row — div not button, to avoid nested button error */}
        <div
            onClick={() => hasContent && setIsOpen((v) => !v)}
            className={`flex items-center justify-between p-4 ${hasContent ? "cursor-pointer hover:bg-slate-800/50" : "cursor-default"}`}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{icon}</span>
            <div>
              <h3 className={`font-medium text-sm ${hasContent ? "text-white" : "text-slate-500"}`}>
                {label}
              </h3>
              <p className="text-xs text-slate-500">{description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isStreaming && (
                <span className="flex items-center gap-1.5 text-xs text-blue-400">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
              Generating...
            </span>
            )}
            {hasContent && !isStreaming && (
                <>
                  <button
                      onClick={(e) => void handleCopy(e)}
                      className="px-2 py-1 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
                  >
                    {copied ? "✓ Copied" : "Copy"}
                  </button>
                  <button
                      onClick={handleDownload}
                      className="px-2 py-1 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
                  >
                    ↓ .md
                  </button>
                </>
            )}
            {hasContent && (
                <svg
                    className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            )}
            {!hasContent && !isStreaming && (
                <span className="text-xs text-slate-600">Waiting...</span>
            )}
          </div>
        </div>

        {/* Content */}
        {(isOpen || isStreaming) && hasContent && (
            <div className="px-4 pb-4">
              <div className="border-t border-slate-800 pt-3">
            <pre className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-mono bg-slate-950 rounded-lg p-4 overflow-auto max-h-80">
              {content}
            </pre>
              </div>
            </div>
        )}
      </div>
  );
}