import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Forward the request to the backend chat endpoint
    const response = await axios.post(
      "https://exquisite-maternity-graceless.ngrok-free.dev/chat",
      body,
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error(
      "Error in chat proxy:",
      error.response?.data || error.message,
    );
    return NextResponse.json(
      { error: error.response?.data?.detail || "Failed to process chat" },
      { status: error.response?.status || 500 },
    );
  }
}
