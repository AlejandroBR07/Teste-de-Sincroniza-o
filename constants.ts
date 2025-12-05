
// --- CONSTANTES DO FRONTEND ---

// URL do SEU Servidor Backend (Ngrok)
// Você deve atualizar isso sempre que reiniciar o Ngrok e gerar um novo link.
// Exemplo: "https://a1b2-c3d4.ngrok-free.app"
export const BACKEND_URL = "https://SEU-LINK-NGROK-AQUI.ngrok-free.app"; 

// Estas constantes agora servem apenas como fallback ou identificadores
export const DEFAULT_DIFY_BASE_URL = "https://api.dify.ai/v1";
export const DEFAULT_DIFY_DATASET_ID = "";

// O Frontend não decide mais quem é admin, mas mantemos aqui para UI
// A validação real de segurança acontece no server.js
export const ALLOWED_ADMINS = [
  'di07@tradestars.com.br',
  'di04@tradestars.com.br'
];

export const DEFAULT_SYNC_INTERVAL = 5;
