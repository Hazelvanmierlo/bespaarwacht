import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { deleteAnalysis, updateAnalysis } from "@/lib/queries";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { id } = await params;
  const { error } = await deleteAnalysis(session.user.id, id);

  if (error) {
    return NextResponse.json({ error: "Verwijderen mislukt" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  // Only allow specific fields to be updated
  const allowed: Record<string, unknown> = {};
  if (body.einddatum !== undefined) allowed.einddatum = body.einddatum;
  if (body.polisnummer !== undefined) allowed.polisnummer = body.polisnummer;
  if (body.monitoring_active !== undefined) allowed.monitoring_active = body.monitoring_active;

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: "Geen velden om bij te werken" }, { status: 400 });
  }

  const { error } = await updateAnalysis(session.user.id, id, allowed as {
    einddatum?: string | null;
    polisnummer?: string | null;
    monitoring_active?: boolean;
  });

  if (error) {
    return NextResponse.json({ error: "Bijwerken mislukt" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
