import { NextResponse } from "next/server";
import { getSetupStatus } from "@/lib/security/credentials";

export async function GET() {
  const status = await getSetupStatus();
  return NextResponse.json(status);
}
