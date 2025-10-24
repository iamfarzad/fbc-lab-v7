#!/usr/bin/env python3

import asyncio
import os
from dotenv import load_dotenv
import google.generativeai as genai
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm
from livekit.agents.voice_assistant import VoiceAssistant
from livekit import rtc

# Load environment variables
load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-2.5-flash')

class GeminiAgent(VoiceAssistant):
    def __init__(self, ctx: JobContext):
        super().__init__(
            ctx=ctx,
            vad=rtc.VoiceActivityDetection.create(
                min_speaking_duration=0.2,
                min_silence_duration=0.5,
            ),
            stt=rtc.SpeechToText.create(
                model="whisper-1",
                language="en",
            ),
            tts=rtc.TextToSpeech.create(
                model="tts-1",
                voice="alloy",
            ),
            llm=llm.LLM.create(
                model="gemini-2.5-flash",
                temperature=0.7,
            ),
        )

    async def on_user_speech_committed(self, user_msg: str) -> str:
        """Handle user speech and return AI response"""
        try:
            # Generate response using Gemini
            response = model.generate_content(
                f"You are a helpful AI assistant. User said: {user_msg}. Respond naturally and conversationally."
            )
            
            return response.text
        except Exception as e:
            print(f"Error generating response: {e}")
            return "I'm sorry, I didn't catch that. Could you please repeat?"

async def entrypoint(ctx: JobContext):
    """Main entrypoint for the agent"""
    print("Starting Gemini Voice Agent...")
    
    # Create and start the agent
    agent = GeminiAgent(ctx)
    await agent.start()

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
