
// In a real production app, never expose keys on the client side.
// However, per user request for this internal tool, we are configuring the keys here.

export const GEMINI_API_KEY = "AIzaSyByTvMWBOCa1TKUuVAM5z6NyoIT7JjrVWM";

// Default configuration values
// Atualizado com o ID fornecido pelo usuário
export const DEFAULT_DIFY_DATASET_ID = "dataset-ebBnUsz69YPq6TWRuDBoPu2c";
export const DEFAULT_DIFY_BASE_URL = "https://api.dify.ai/v1";

// We use this to simulate "Process.env" for the Google GenAI SDK as requested by the guidelines
// In a real webpack/vite setup this would be replaced at build time.
(window as any).process = {
  env: {
    API_KEY: GEMINI_API_KEY
  }
};
