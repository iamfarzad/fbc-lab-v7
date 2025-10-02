import { GoogleGenerativeAI } from '@google/generative-ai';

async function testModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  try {
    // Try to list available models
    const models = await genAI.listModels();
    console.log('Available models:');
    models.forEach(model => {
      console.log(`- ${model.name} (${model.displayName})`);
    });
  } catch (error) {
    console.error('Error listing models:', error.message);
    
    // Try common model names
    const commonModels = [
      'gemini-1.5-flash',
      'gemini-1.5-pro', 
      'gemini-1.5-flash-8b',
      'gemini-pro',
      'gemini-pro-vision'
    ];
    
    console.log('\nTrying common models:');
    for (const modelName of commonModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        console.log(`✅ ${modelName} - Available`);
      } catch (err) {
        console.log(`❌ ${modelName} - ${err.message.split('[')[1]?.split(']')[0] || 'Not available'}`);
      }
    }
  }
}

testModels();
