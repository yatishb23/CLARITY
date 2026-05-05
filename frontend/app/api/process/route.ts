import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Forward the request to the backend chat endpoint
    const response = await axios.post("http://127.0.0.1:8000/chat", body);

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error(
      "Error in chat proxy API details:",
      JSON.stringify(error.response?.data, null, 2) || error.message,
    );
    return NextResponse.json(
      { error: error.response?.data?.detail || "Failed to process chat" },
      { status: error.response?.status || 500 },
    );
  }
}
