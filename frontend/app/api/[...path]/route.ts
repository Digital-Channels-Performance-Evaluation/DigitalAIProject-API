/**
 * Catch-all proxy route: /api/* → backend /api/*
 *
 * Replaces the next.config.ts rewrite so we can intercept connection errors
 * and return a proper JSON error instead of a raw 500.
 */
import { NextRequest, NextResponse } from "next/server";

const BACKEND =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

async function proxy(req: NextRequest, path: string[]): Promise<NextResponse> {
  const slug = path.join("/");
  const search = req.nextUrl.search ?? "";
  const url = `${BACKEND}/api/${slug}${search}`;

  // Forward all headers except host
  const headers = new Headers(req.headers);
  headers.delete("host");

  let body: BodyInit | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.arrayBuffer();
  }

  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers,
      body,
      // @ts-expect-error — Node 18+ fetch supports duplex
      duplex: "half",
      redirect: "follow",
      signal: AbortSignal.timeout(30_000),
    });

    // Stream response back, preserving status + headers
    const resHeaders = new Headers(upstream.headers);
    resHeaders.delete("transfer-encoding"); // not valid in HTTP/2

    return new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: resHeaders,
    });
  } catch (err: unknown) {
    const isConnRefused =
      err instanceof Error &&
      (err.message.includes("ECONNREFUSED") ||
        err.message.includes("fetch failed") ||
        err.message.includes("connect ETIMEDOUT") ||
        err.name === "TimeoutError");

    if (isConnRefused) {
      return NextResponse.json(
        { detail: "Backend service is unavailable. Please try again later." },
        { status: 503 }
      );
    }

    console.error("[proxy] unexpected error:", err);
    return NextResponse.json(
      { detail: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path);
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path);
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path);
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path);
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path);
}
