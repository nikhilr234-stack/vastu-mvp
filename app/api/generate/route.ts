import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Example: return something fake first (so you confirm wiring works)
    return NextResponse.json({
      ok: true,
      received: body,
      result: {
        message: "Generate endpoint working",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 400 }
    );
  }
}


