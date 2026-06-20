// Chrome DevTools probes this URL on every page load.
// Return an immediate 404 so it never proxies to the backend and causes a timeout.
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
