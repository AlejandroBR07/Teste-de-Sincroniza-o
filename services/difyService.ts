import { AppConfig } from "../types";

export const syncFileToDify = async (
  fileContent: string,
  fileName: string,
  config: AppConfig
): Promise<{ success: boolean; message: string }> => {
  if (!config.difyApiKey) {
    return { success: false, message: "API Key do Dify está faltando nas configurações." };
  }

  try {
    // Note: This endpoint creates a document from text.
    // Dify API: POST /datasets/{dataset_id}/document/create_by_text
    const url = `${config.difyBaseUrl}/datasets/${config.difyDatasetId}/document/create_by_text`;

    const body = {
      name: fileName,
      text: fileContent,
      indexing_technique: "high_quality", // or 'economy'
      process_rule: {
        mode: "automatic"
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.difyApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handling CORS opaque or generic errors
        if (response.status === 0) {
            throw new Error("Erro de CORS ou Rede. Verifique se o Dify permite requisições deste domínio.");
        }
        
        throw new Error(errorData.message || `Erro HTTP ${response.status}`);
    }

    return { success: true, message: "Documento indexado com sucesso." };
  } catch (error: any) {
    console.error("Erro Dify Sync:", error);
    return { 
      success: false, 
      message: error.message || "Falha ao sincronizar com Dify. Verifique CORS/API Key." 
    };
  }
};