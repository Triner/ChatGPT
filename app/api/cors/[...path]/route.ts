import { NextRequest, NextResponse } from "next/server";

const ALLOWED_PROTOCOLS = ["https", "http"];

const ALLOWED_HOST_SUFFIXES = [
  "openai.com",
  "googleapis.com",
  "sharegpt.com",
  "nextweb.fun",
];

function isAllowedUrl(protocol: string, hostname: string): boolean {
  if (!ALLOWED_PROTOCOLS.includes(protocol)) {
    return false;
  }

  return ALLOWED_HOST_SUFFIXES.some(
    (suffix) => hostname === suffix || hostname.endsWith("." + suffix),
  );
}

async function handle(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  if (req.method === "OPTIONS") {
    return NextResponse.json({ body: "OK" }, { status: 200 });
  }

  const [protocol, ...subpath] = params.path;
  const targetUrl = `${protocol}://${subpath.join("/")}`;

  let hostname: string;
  try {
    hostname = new URL(targetUrl).hostname;
  } catch {
    return NextResponse.json(
      { error: true, message: "invalid target URL" },
      { status: 400 },
    );
  }

  if (!isAllowedUrl(protocol, hostname)) {
    return NextResponse.json(
      { error: true, message: "target host is not allowed" },
      { status: 403 },
    );
  }

  const method = req.headers.get("method") ?? undefined;
  const shouldNotHaveBody = ["get", "head"].includes(
    method?.toLowerCase() ?? "",
  );

  const fetchOptions: RequestInit = {
    headers: {
      authorization: req.headers.get("authorization") ?? "",
    },
    body: shouldNotHaveBody ? null : req.body,
    method,
    // @ts-ignore
    duplex: "half",
  };

  const fetchResult = await fetch(targetUrl, fetchOptions);

  console.log("[CORS Proxy]", targetUrl, {
    status: fetchResult.status,
    statusText: fetchResult.statusText,
  });

  return fetchResult;
}

export const POST = handle;
export const GET = handle;
export const OPTIONS = handle;

export const runtime = "nodejs";
