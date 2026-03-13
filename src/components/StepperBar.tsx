"use client";

import { CheckIcon } from "@/components/icons";

interface Step {
  label: string;
}

interface StepperBarProps {
  steps: Step[];
  currentStep: number; // 0-indexed
}

export default function StepperBar({ steps, currentStep }: StepperBarProps) {
  return (
    <div className="border-b border-[#E2E8F0] bg-white sticky top-0 z-30">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-0 py-3 overflow-x-auto">
          {steps.map((step, i) => {
            const done = i < currentStep;
            const active = i === currentStep;
            return (
              <div key={step.label} className="flex items-center shrink-0">
                {i > 0 && (
                  <div className={`w-8 sm:w-12 h-px mx-1 ${done ? "bg-bw-green" : "bg-[#E2E8F0]"}`} />
                )}
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                      done
                        ? "bg-bw-green text-white"
                        : active
                          ? "bg-bw-green text-white ring-2 ring-bw-green/30"
                          : "bg-[#E2E8F0] text-bw-text-light"
                    }`}
                  >
                    {done ? <CheckIcon className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span
                    className={`text-[13px] sm:text-[14px] font-semibold whitespace-nowrap ${
                      done
                        ? "text-bw-green"
                        : active
                          ? "text-bw-deep"
                          : "text-bw-text-light"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
