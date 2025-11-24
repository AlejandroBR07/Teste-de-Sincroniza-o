import { GoogleGenAI } from "@google/genai";

export const generateDocumentSummary = async (content: string, apiKey: string): Promise<string> => {
  if (!apiKey) {
    return "Resumo indisponível (Configure a Gemini API Key).";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-2.5-flash';
    
    // Limita o tamanho para evitar estourar tokens em arquivos gigantes
    const safeContent = content.substring(0, 10000);
    
    const response = await ai.models.generateContent({
      model: model,
      contents: `Você é um assistente de gestão de conhecimento. Por favor, forneça um resumo muito breve, de uma única frase (máximo 40 palavras), do seguinte conteúdo de documento. O objetivo é usar isso como metadados para uma base de conhecimento (Knowledge Base) no Dify: \n\n${safeContent}`,
    });
    
    return response.text || "Sem resumo disponível.";
  } catch (error: any) {
    console.error("Erro no Gemini Summary:", error);
    
    // Tratamento específico para chave vazada/inválida
    if (error.message && (error.message.includes("leaked") || error.message.includes("403") || error.message.includes("PERMISSION_DENIED"))) {
        return "ERRO: Chave Gemini bloqueada/inválida. Verifique Configurações.";
    }

    return "Falha na geração do resumo.";
  }
};
