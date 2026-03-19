import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const baseUrl = searchParams.get("base_url");
  const path = searchParams.get("path");

  if (!baseUrl || !path) {
    return NextResponse.json(
      { error: "base_url and path are required" },
      { status: 400 }
    );
  }

  try {
    const url = `${baseUrl.replace(/\/$/, "")}${path}`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
