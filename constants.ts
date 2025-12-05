
// As chaves agora são configuradas pelo usuário na interface para evitar vazamentos (Erro 403).
// Mantemos apenas constantes de estrutura ou valores padrão seguros.

export const DEFAULT_DIFY_BASE_URL = "https://api.dify.ai/v1";
// ID fornecido pelo usuário no prompt
export const DEFAULT_DIFY_DATASET_ID = "dataset-ebBnUsz69YPq6TWRuDBoPu"; 

// Chave Gemini fornecida para uso interno
export const DEFAULT_GEMINI_KEY = "AIzaSyByTvMWBOCa1TKUuVAM5z6NyoIT7JjrVWM";

// Emails com permissão de ADMIN (Ver/Editar Configurações)
export const ALLOWED_ADMINS = [
  'di07@tradestars.com.br',
  'di04@tradestars.com.br'
];

export const DEFAULT_SYNC_INTERVAL = 5;

// Mock para compatibilidade se necessário
(window as any).process = {
  env: {
    API_KEY: ''
  }
};
