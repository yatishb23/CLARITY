import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/backend-url";

const NGROK_PASSTHROUGH = { "ngrok-skip-browser-warning": "true" };
const TIMEOUT_MS = 180_000; // 3 minutes — heatmap inference is slow
const MAX_RETRIES = 2;

/** True for the UND_ERR_SOCKET error that ngrok emits on dropped long-running connections */
function isSocketError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const cause = (err as NodeJS.ErrnoException & { cause?: unknown }).cause;
  return (
    (cause instanceof Error && (cause as NodeJS.ErrnoException).code === "UND_ERR_SOCKET") ||
    err.message.includes("UND_ERR_SOCKET") ||
    err.message.includes("other side closed")
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ index: string }> },
) {
  const { index: rawIndex } = await params;
  const sentenceIndex = parseInt(rawIndex, 10);

  if (isNaN(sentenceIndex) || sentenceIndex < 0) {
    return NextResponse.json({ detail: "Invalid sentence index" }, { status: 400 });
  }

  // Buffer the file once — FormData body streams cannot be re-read on retry.
  const incomingForm = await request.formData();
  const file = incomingForm.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ detail: "No file provided" }, { status: 400 });
  }
  const fileBytes = Buffer.from(await file.arrayBuffer());
  const { name: fileName, type: fileType } = file;

  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      console.warn(
        `[/api/heatmap/${sentenceIndex}] Socket drop — retrying (attempt ${attempt + 1}/${MAX_RETRIES})…`,
      );
      await new Promise((r) => setTimeout(r, 1_000));
    }

    // Rebuild FormData fresh each attempt from the buffered bytes.
    const fd = new FormData();
    fd.append("file", new Blob([fileBytes], { type: fileType }), fileName);

    let response: Response;
    try {
      response = await fetch(`${BACKEND_URL}/heatmap/${sentenceIndex}`, {
        method: "POST",
        headers: NGROK_PASSTHROUGH,
        body: fd,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      lastError = err;
      if (isSocketError(err) && attempt < MAX_RETRIES - 1) continue;
      console.error(`[/api/heatmap/${sentenceIndex}] Network error:`, err);
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

  console.error(
    `[/api/heatmap/${sentenceIndex}] Failed after ${MAX_RETRIES} attempts:`,
    lastError,
  );
  return NextResponse.json({ detail: "Backend unreachable after retries" }, { status: 502 });
}
