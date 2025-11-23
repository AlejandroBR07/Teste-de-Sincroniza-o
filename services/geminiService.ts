import { GoogleGenAI } from "@google/genai";
import { GEMINI_API_KEY } from "../constants";

// Ensure the API key is set in the environment simulation
if (!(window as any).process) {
    (window as any).process = { env: { API_KEY: GEMINI_API_KEY } };
}

const ai = new GoogleGenAI({ apiKey: (window as any).process.env.API_KEY });

export const generateDocumentSummary = async (content: string): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    // Clean content to avoid token limits on very large docs
    const safeContent = content.substring(0, 10000);
    
    const response = await ai.models.generateContent({
      model: model,
      contents: `Você é um assistente de gestão de conhecimento. Por favor, forneça um resumo muito breve, de uma única frase (máximo 40 palavras), do seguinte conteúdo de documento. O objetivo é usar isso como metadados para uma base de conhecimento (Knowledge Base) no Dify: \n\n${safeContent}`,
    });
    
    return response.text || "Sem resumo disponível.";
  } catch (error) {
    console.error("Erro no Gemini Summary:", error);
    return "Falha na geração do resumo.";
  }
};