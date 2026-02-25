import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { deleteAnalysis } from "@/lib/queries";

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
