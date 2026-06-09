import { NextResponse } from "next/server";
import { getLive } from "@/lib/fifa-api";

export const dynamic = "force-dynamic";

export async function GET() {
  const { live, channels, source } = await getLive();
  return NextResponse.json({ live, channels, source });
}
