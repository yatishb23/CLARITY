import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    // Forward the request to the backend
    const response = await axios.post(
      "https://exquisite-maternity-graceless.ngrok-free.dev/analyze",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    console.log(await response.data);
    
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error(
      "Error in analyze proxy:",
      error.response?.data || error.message,
    );
    return NextResponse.json(
      { error: error.response?.data?.detail || "Failed to analyze image" },
      { status: error.response?.status || 500 },
    );
  }
}
