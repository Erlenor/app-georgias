"use client";

import { PIPELINE_STEPS } from "@/types";
import type { ArticleStatus, PipelineResults } from "@/types";

interface Props {
  status: ArticleStatus;
  currentStep: string | null;
  results: PipelineResults;
}

export default function PipelineProgress({ status, currentStep, results }: Props) {
  function getStepState(stepId: string, resultKey: keyof PipelineResults) {
    if (results[resultKey]) return "completed";
    if (currentStep === stepId && status === "running") return "running";
    return "pending";
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium text-sm">Pipeline Progress</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          status === "completed" ? "bg-emerald-500/20 text-emerald-400" :
          status === "running" ? "bg-blue-500/20 text-blue-400" :
          status === "failed" ? "bg-red-500/20 text-red-400" :
          "bg-slate-700 text-slate-400"
        }`}>
          {status}
        </span>
      </div>

      <div className="flex items-center">
        {PIPELINE_STEPS.map((step, idx) => {
          const state = getStepState(step.id, step.resultKey);
          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm border-2 transition-all duration-500 ${
                  state === "completed"
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : state === "running"
                    ? "bg-blue-500/20 border-blue-500 text-blue-400 animate-pulse"
                    : "bg-slate-800 border-slate-700 text-slate-600"
                }`}>
                  {state === "completed" ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span>{step.icon}</span>
                  )}
                </div>
                <p className={`text-xs mt-1.5 text-center hidden sm:block ${
                  state === "completed" ? "text-emerald-400" :
                  state === "running" ? "text-blue-400" :
                  "text-slate-600"
                }`}>
                  {step.label}
                </p>
              </div>
              {idx < PIPELINE_STEPS.length - 1 && (
                <div className={`h-0.5 flex-shrink-0 w-4 sm:w-6 transition-all duration-500 ${
                  state === "completed" ? "bg-emerald-500" : "bg-slate-700"
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
