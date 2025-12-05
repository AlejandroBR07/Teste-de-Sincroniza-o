
import { AppConfig, DifyProfile } from "../types";
import { BACKEND_URL } from "../constants";

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
  try {
    let baseUrl = BACKEND_URL.replace(/\/$/, ""); 
    
    // Fallback se não configurado e rodando local
    if ((!baseUrl || baseUrl.includes("SEU-LINK")) && window.location.hostname === 'localhost') {
        baseUrl = "http://localhost:3000";
    }

    const apiUrl = `${baseUrl}/api/dify/sync`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true" // ESSENCIAL para Ngrok Free
      },
      body: JSON.stringify({
        name: fileName,
        text: fileContent,
        datasetId: profileToUse.difyDatasetId, 
      }),
    });

    if (!response.ok) {
        // Tenta ler erro JSON, se falhar, lê texto
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") === -1) {
             throw new Error("Erro de Protocolo: O servidor retornou HTML (possível erro de URL ou Proxy).");
        }

        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 404) {
             throw new Error(`Servidor Backend não encontrado em: ${apiUrl}. Verifique a constante BACKEND_URL.`);
        }
        
        if (response.status === 0 || response.status === 500) {
            throw new Error("Erro de conexão com o servidor. Verifique se o Backend está rodando e se o CORS está liberado.");
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
