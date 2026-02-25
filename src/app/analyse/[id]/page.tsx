import { redirect } from "next/navigation";

// For non-demo IDs, redirect to demo for now.
// In production, this would fetch the analysis from Supabase.
export default async function AnalysePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id !== "demo") {
    redirect("/analyse/demo");
  }
  redirect("/analyse/demo");
}
