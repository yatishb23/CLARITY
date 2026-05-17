import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/backend-url";

/** Headers forwarded with every request to bypass ngrok's browser-warning interstitial. */
const NGROK_PASSTHROUGH = { "ngrok-skip-browser-warning": "true" };

export async function POST(request: Request) {
  const formData = await request.formData();

  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}/report-only`, {
      method: "POST",
      headers: NGROK_PASSTHROUGH,
      body: formData,
    });
  } catch (err) {
    console.error("[/api/report-only] Network error:", err);
    return NextResponse.json({ detail: "Backend unreachable" }, { status: 502 });
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(
      data ?? { detail: "Backend returned an error" },
      { status: response.status },
    );
  }

  return NextResponse.json(data);
}
