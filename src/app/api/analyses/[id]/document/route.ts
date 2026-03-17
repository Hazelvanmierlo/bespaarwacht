import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database niet beschikbaar" }, { status: 503 });
  }

  const { id } = await params;

  // Verify ownership
  const { data: analysis } = await supabase
    .from("saved_analyses")
    .select("id")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single();

  if (!analysis) {
    return NextResponse.json({ error: "Analyse niet gevonden" }, { status: 404 });
  }

  // Parse multipart form data
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Geen bestand geüpload" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Alleen PDF, JPG, PNG en WebP bestanden toegestaan" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Bestand is te groot (max 10 MB)" }, { status: 400 });
  }

  // Upload to Supabase Storage
  const ext = file.name.split(".").pop() || "pdf";
  const storagePath = `${session.user.id}/${id}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("policy-documents")
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: "Upload mislukt: " + uploadError.message },
      { status: 500 }
    );
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("policy-documents")
    .getPublicUrl(storagePath);

  // Update analysis record
  await supabase
    .from("saved_analyses")
    .update({
      document_url: urlData.publicUrl,
      document_naam: file.name,
    })
    .eq("id", id)
    .eq("user_id", session.user.id);

  return NextResponse.json({
    ok: true,
    document_url: urlData.publicUrl,
    document_naam: file.name,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database niet beschikbaar" }, { status: 503 });
  }

  const { id } = await params;

  // Verify ownership and get current document info
  const { data: analysis } = await supabase
    .from("saved_analyses")
    .select("id, document_url")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single();

  if (!analysis) {
    return NextResponse.json({ error: "Analyse niet gevonden" }, { status: 404 });
  }

  // Delete from storage
  const storagePath = `${session.user.id}/${id}`;
  // Try common extensions
  for (const ext of ["pdf", "jpg", "png", "webp"]) {
    await supabase.storage.from("policy-documents").remove([`${storagePath}.${ext}`]);
  }

  // Clear reference in DB
  await supabase
    .from("saved_analyses")
    .update({ document_url: null, document_naam: null })
    .eq("id", id)
    .eq("user_id", session.user.id);

  return NextResponse.json({ ok: true });
}
