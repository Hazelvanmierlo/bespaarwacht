import type { PolisData } from "./types";

/**
 * PDF parser stub — requires API keys or pdf-parse library for real implementation.
 * For now, returns null to indicate parsing is not yet available.
 */
export async function parsePDF(_file: File): Promise<PolisData | null> {
  // TODO: Implement actual PDF parsing
  // Options:
  // 1. Use pdf-parse library for server-side extraction
  // 2. Use OpenAI/Anthropic API to extract structured data from PDF text
  // 3. Use a dedicated document parsing API (e.g., AWS Textract)
  console.warn("PDF parsing not yet implemented. Use demo mode.");
  return null;
}
