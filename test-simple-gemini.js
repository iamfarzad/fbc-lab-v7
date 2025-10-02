import { GoogleGenerativeAI } from '@google/generative-ai';

async function testGemini() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Test with simple text first
    const result = await model.generateContent("Hello, can you hear me?");
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Gemini text generation works:', text);
    
    // Now test with audio
    const audioResult = await model.generateContent([
      "Please transcribe this audio:",
      {
        inlineData: {
          data: "dGVzdA==", // base64 for "test"
          mimeType: "audio/webm;codecs=opus",
        },
      },
    ]);
    
    const audioResponse = await audioResult.response;
    const audioText = audioResponse.text();
    
    console.log('✅ Gemini audio transcription works:', audioText);
    
  } catch (error) {
    console.error('❌ Gemini test failed:', error.message);
  }
}

testGemini();
