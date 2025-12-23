import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

// Use gemini-3-flash-preview for basic text tasks like micro-task generation
const MODEL_NAME = 'gemini-3-flash-preview';

/**
 * Generates a list of 12 wellness micro-tasks for the 12-hour flow.
 */
export async function generateRoutineTasks(): Promise<Array<{ title: string, description: string }>> {
  // Always initialize with the process.env.API_KEY as per guidelines.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    // Calling generateContent directly with both the model name and prompt as per SDK guidelines.
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: "Generate 12 easy wellness micro-tasks for a 12-hour flow. Format as JSON list of title and description.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ["title", "description"]
          }
        }
      }
    });
    
    // The .text property is used directly to extract the string output.
    const text = response.text;
    return JSON.parse(text || "[]");
  } catch (e) {
    console.error("Gemini failed to generate routine tasks", e);
    // Fallback defaults if API fails
    return [
      { title: "Morning Hydration", description: "Drink 500ml of water." },
      { title: "Core Stretch", description: "5-minute mobility flow." },
      { title: "Deep Focus", description: "25 minutes of zero-distraction work." },
      { title: "Digital Decompression", description: "Step away from screens for 10 minutes." }
    ];
  }
}

/**
 * Generates a single quick productivity boost task.
 */
export async function generateSingleTask(): Promise<{ title: string, description: string }> {
  // Always initialize with the process.env.API_KEY as per guidelines.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    // Calling generateContent directly with both the model name and prompt.
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: "Generate one quick productivity boost task under 8 words.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
          },
          required: ["title", "description"]
        }
      }
    });
    
    // Extracting generated text via the .text property.
    const text = response.text;
    return JSON.parse(text || '{"title":"Action","description":"Do something small"}');
  } catch (e) {
    console.error("Gemini failed to generate single task", e);
    return { title: "Focus", description: "Take a deep breath." };
  }
}
