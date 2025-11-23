
// As chaves agora são configuradas pelo usuário na interface para evitar vazamentos (Erro 403).
// Mantemos apenas constantes de estrutura ou valores padrão seguros.

export const DEFAULT_DIFY_BASE_URL = "https://api.dify.ai/v1";
export const DEFAULT_DIFY_DATASET_ID = "";

// Valores padrão para facilitar o preenchimento inicial (mas não são secretos)
export const DEFAULT_SYNC_INTERVAL = 5;

// Mock para compatibilidade se necessário, mas o uso real será dinâmico
(window as any).process = {
  env: {
    API_KEY: ''
  }
};
