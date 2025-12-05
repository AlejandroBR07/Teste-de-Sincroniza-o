
import { AppConfig, DifyProfile } from "../types";

export const syncFileToDify = async (
  fileContent: string,
  fileName: string,
  config: AppConfig,
  targetProfile?: DifyProfile
): Promise<{ success: boolean; message: string }> => {
  
  const profileToUse = targetProfile || config.profiles.find(p => p.id === config.activeProfileId);

  if (!profileToUse) {
    return { success: false, message: `Perfil não encontrado.` };
  }

  // Agora enviamos para o NOSSO backend, não direto para o Dify
  // O Backend é responsável por injetar a API Key segura
  try {
    // Detecta se estamos rodando em dev (Vite) ou prod (Server.js)
    // Em produção, a API é relativa à origem.
    const apiUrl = '/api/dify/sync';

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: fileName,
        text: fileContent,
        datasetId: profileToUse.difyDatasetId, // O DatasetID ainda é enviado pelo front, pois define o "destino"
      }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Fallback para Dev Mode: Se a rota /api/dify/sync não existir (ex: rodando só 'vite' sem 'node server.js')
        if (response.status === 404) {
             throw new Error("Erro de Conexão: O Backend seguro (server.js) não parece estar rodando. Inicie com 'npm run start'.");
        }

        throw new Error(errorData.message || `Erro HTTP ${response.status}`);
    }

    return { success: true, message: "Sincronizado via Backend Seguro." };
  } catch (error: any) {
    console.error("Erro Sync:", error);
    return { 
      success: false, 
      message: error.message || "Falha na comunicação com o servidor." 
    };
  }
};
