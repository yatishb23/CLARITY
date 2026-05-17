import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/backend-url";

const NGROK_PASSTHROUGH = { "ngrok-skip-browser-warning": "true" };

/**
 * POST /api/shutdown
 * Proxies to the backend /shutdown endpoint which kills the ngrok tunnel
 * and stops the uvicorn server.
 *
 * NOTE: intentionally not exposed in the production UI (spec requirement).
 * Guard with NODE_ENV === "development" if deploying to a public host.
 */
export async function POST() {
  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}/shutdown`, {
      method: "POST",
      headers: NGROK_PASSTHROUGH,
    });
  } catch (err) {
    // Backend may close the connection before responding — treat as success
    console.warn("[/api/shutdown] Connection closed by server (expected):", err);
    return NextResponse.json({ message: "Shutdown signal sent." });
  }

  // 200 or connection drop are both fine here
  const data = await response.json().catch(() => ({ message: "Shutdown signal sent." }));
  return NextResponse.json(data, { status: response.ok ? 200 : response.status });
}
