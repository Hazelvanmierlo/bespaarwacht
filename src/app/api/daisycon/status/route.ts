import { NextResponse } from 'next/server';
import { getDaisyconStatus } from '@/lib/daisycon/service';

export async function GET() {
  const status = getDaisyconStatus();
  return NextResponse.json(status);
}
