
import { AppConfig, DifyProfile } from "../types";

export const syncFileToDify = async (
  fileContent: string,
  fileName: string,
  config: AppConfig,
  targetProfile?: DifyProfile // Opcional: Se não passar, usa o ativo da config
): Promise<{ success: boolean; message: string }> => {
  
  // Se um perfil específico foi passado (uso em background), usa ele. 
  // Senão, usa o perfil ativo na interface.
  const profileToUse = targetProfile || config.profiles.find(p => p.id === config.activeProfileId);

  if (!profileToUse || !profileToUse.difyApiKey) {
    return { success: false, message: `Perfil ${profileToUse?.name || 'Desconhecido'} sem API Key configurada.` };
  }

  try {
    const url = `${profileToUse.difyBaseUrl}/datasets/${profileToUse.difyDatasetId}/document/create_by_text`;

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
        "Authorization": `Bearer ${profileToUse.difyApiKey}`,
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

    return { success: true, message: "Indexado em: " + profileToUse.name };
  } catch (error: any) {
    console.error("Erro Dify Sync:", error);
    return { 
      success: false, 
      message: error.message || "Falha ao sincronizar com Dify." 
    };
  }
};
