import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { saveAnalysis, getUserAnalyses } from "@/lib/queries";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const analyses = await getUserAnalyses(session.user.id);
  return NextResponse.json({ analyses });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const body = await req.json();
  const { error } = await saveAnalysis(session.user.id, body);

  if (error) {
    return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
