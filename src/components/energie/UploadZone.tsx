"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { UploadIcon, CheckIcon, XIcon } from "@/components/icons";
import { parsePDF, type ParseResult } from "@/lib/energie/pdf-parser";

interface FileStatus {
  file: File;
  status: "parsing" | "klaar" | "fout";
  result?: ParseResult;
  error?: string;
}

interface UploadZoneProps {
  onParsed: (results: ParseResult[]) => void;
}

export default function UploadZone({ onParsed }: UploadZoneProps) {
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [dragging, setDragging] = useState(false);
  const [pendingResults, setPendingResults] = useState<ParseResult[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Notify parent in a separate render cycle via useEffect
  useEffect(() => {
    if (pendingResults && pendingResults.length > 0) {
      onParsed(pendingResults);
      setPendingResults(null);
    }
  }, [pendingResults, onParsed]);

  const processFiles = useCallback(
    async (newFiles: File[]) => {
      const pdfs = newFiles.filter((f) => f.type === "application/pdf");
      if (pdfs.length === 0) return;

      const entries: FileStatus[] = pdfs.map((f) => ({
        file: f,
        status: "parsing" as const,
      }));

      setFiles((prev) => [...prev, ...entries]);

      const allResults: ParseResult[] = [];

      for (const entry of entries) {
        try {
          const result = await parsePDF(entry.file);
          allResults.push(result);
          setFiles((prev) =>
            prev.map((f) =>
              f.file === entry.file ? { ...f, status: "klaar", result } : f,
            ),
          );
        } catch (err) {
          setFiles((prev) =>
            prev.map((f) =>
              f.file === entry.file
                ? { ...f, status: "fout", error: err instanceof Error ? err.message : "Onbekende fout" }
                : f,
            ),
          );
        }
      }

      if (allResults.length > 0) {
        setPendingResults(allResults);
      }
    },
    [],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      processFiles(droppedFiles);
    },
    [processFiles],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files ? Array.from(e.target.files) : [];
      processFiles(selected);
      if (inputRef.current) inputRef.current.value = "";
    },
    [processFiles],
  );

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
          dragging
            ? "border-bw-green bg-bw-green-bg"
            : "border-bw-border hover:border-bw-blue hover:bg-bw-blue-pale"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          multiple
          onChange={handleChange}
          className="hidden"
        />
        <div className="w-12 h-12 rounded-xl bg-bw-green-bg text-bw-green flex items-center justify-center mx-auto mb-3">
          <UploadIcon className="w-6 h-6" />
        </div>
        <p className="text-[15px] font-semibold text-bw-deep mb-1">
          Sleep je energierapport(en) hierheen
        </p>
        <p className="text-sm text-bw-text-mid">
          of <span className="text-bw-blue font-medium">klik om te uploaden</span> — PDF bestanden
        </p>
      </div>

      {/* Per-file status */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div
              key={`${f.file.name}-${i}`}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                f.status === "klaar"
                  ? "bg-bw-green-bg border-[rgba(22,163,74,0.2)]"
                  : f.status === "fout"
                    ? "bg-bw-red-bg border-[rgba(220,38,38,0.2)]"
                    : "bg-bw-bg border-bw-border"
              }`}
            >
              <div className="shrink-0">
                {f.status === "parsing" && (
                  <div className="w-5 h-5 border-2 border-bw-blue border-t-transparent rounded-full animate-spin-loader" />
                )}
                {f.status === "klaar" && (
                  <div className="w-5 h-5 rounded-full bg-bw-green text-white flex items-center justify-center">
                    <CheckIcon className="w-3 h-3" />
                  </div>
                )}
                {f.status === "fout" && (
                  <div className="w-5 h-5 rounded-full bg-bw-red text-white flex items-center justify-center">
                    <XIcon className="w-3 h-3" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-bw-deep truncate">{f.file.name}</p>
                {f.status === "klaar" && f.result && (
                  <p className="text-xs text-bw-text-mid">
                    {f.result.data.leverancier ?? "Leverancier onbekend"} — kwaliteit: {f.result.data.kwaliteit}
                  </p>
                )}
                {f.status === "fout" && (
                  <p className="text-xs text-bw-red">{f.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Privacy + hint */}
      <div className="flex items-start gap-2 text-xs text-bw-text-light">
        <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
        <span>
          Je bestanden worden lokaal in je browser verwerkt en niet naar een server gestuurd. Upload bij voorkeur je <strong>jaaroverzicht</strong> voor de meest complete analyse.
        </span>
      </div>
    </div>
  );
}
