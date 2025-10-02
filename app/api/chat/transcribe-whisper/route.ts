import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { audio, mimeType } = await request.json();

    if (!audio) {
      return NextResponse.json(
        { success: false, error: "No audio data provided" },
        { status: 400 }
      );
    }

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audio, "base64");

    // Create a File object for OpenAI Whisper
    const audioFile = new File([audioBuffer], "audio.webm", {
      type: mimeType || "audio/webm;codecs=opus",
    });

    // Transcribe using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en", // Optional: specify language for better accuracy
      response_format: "text",
    });

    console.log("Whisper transcription completed:", {
      transcriptLength: transcription.length,
      mimeType,
    });

    return NextResponse.json({
      success: true,
      text: transcription,
      confidence: 1.0, // Whisper doesn't provide confidence scores
      language: "en",
    });
  } catch (error) {
    console.error("Whisper transcription error:", error);
    
    // Handle specific OpenAI errors
    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        return NextResponse.json(
          { 
            success: false, 
            error: "OpenAI API key not configured. Please set OPENAI_API_KEY environment variable." 
          },
          { status: 401 }
        );
      }
      
      if (error.message.includes("quota")) {
        return NextResponse.json(
          { 
            success: false, 
            error: "OpenAI quota exceeded. Please check your OpenAI usage limits." 
          },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { 
        success: false, 
        error: "Transcription failed",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
