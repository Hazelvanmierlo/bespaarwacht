"use client";

import { useEffect } from "react";

export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Account error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="text-center max-w-[420px]">
        <div className="text-[48px] mb-4">⚠️</div>
        <h2 className="font-heading text-[24px] font-bold text-bw-deep mb-2">
          Er ging iets mis
        </h2>
        <p className="text-[14px] text-bw-text-mid mb-6">
          We konden deze pagina niet laden. Probeer het opnieuw of ga terug naar je dashboard.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-bw-green text-white border-none cursor-pointer font-[inherit] hover:bg-bw-green-strong transition-colors"
          >
            Opnieuw proberen
          </button>
          <a
            href="/account"
            className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-bw-text-mid bg-white border border-bw-border hover:bg-bw-bg transition-colors no-underline"
          >
            Naar dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
