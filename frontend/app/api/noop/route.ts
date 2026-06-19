// Instant 204 for browser probes (Chrome DevTools /.well-known, favicon, etc.)
// Prevents these from hitting the backend proxy and causing timeout delays.
import { NextResponse } from "next/server";

export function GET() {
  return new NextResponse(null, { status: 204 });
}
