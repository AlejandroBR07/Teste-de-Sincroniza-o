
import { AppConfig, DifyProfile } from "../types";

export const syncFileToDify = async (
  fileContent: string,
  fileName: string,
  config: AppConfig
): Promise<{ success: boolean; message: string }> => {
  
  // Encontra o perfil ativo
  const activeProfile = config.profiles.find(p => p.id === config.activeProfileId);

  if (!activeProfile || !activeProfile.difyApiKey) {
    return { success: false, message: "Perfil de Agente não configurado ou sem API Key." };
  }

  try {
    const url = `${activeProfile.difyBaseUrl}/datasets/${activeProfile.difyDatasetId}/document/create_by_text`;

    const body = {
      name: fileName,
      text: fileContent,
      indexing_technique: "high_quality",
      process_rule: {
        mode: "automatic"
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${activeProfile.difyApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 0) {
            throw new Error("Erro de CORS ou Rede. Verifique se o Dify permite requisições deste domínio.");
        }
        throw new Error(errorData.message || `Erro HTTP ${response.status}`);
    }

    return { success: true, message: "Documento indexado com sucesso no perfil: " + activeProfile.name };
  } catch (error: any) {
    console.error("Erro Dify Sync:", error);
    return { 
      success: false, 
      message: error.message || "Falha ao sincronizar com Dify." 
    };
  }
};
