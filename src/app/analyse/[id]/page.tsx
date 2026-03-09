import { redirect } from "next/navigation";

// For non-demo IDs, redirect to demo for now.
// In production, this would fetch the analysis from Supabase.
export default async function AnalysePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ product?: string }>;
}) {
  const { id } = await params;
  const { product } = await searchParams;

  const productParam = product ? `?product=${product}` : "";

  if (id !== "demo") {
    redirect(`/analyse/demo${productParam}`);
  }
  redirect(`/analyse/demo${productParam}`);
}
