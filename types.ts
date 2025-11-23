
export interface DocFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  lastSynced?: string;
  status: 'pendente' | 'sincronizado' | 'erro' | 'sincronizando' | 'ignorado';
  content?: string;
  webViewLink?: string;
  watched: boolean; // Se true, entra no ciclo de auto-sync
}

export interface DifyProfile {
  id: string;
  name: string;
  difyApiKey: string;
  difyDatasetId: string;
  difyBaseUrl: string;
}

export interface AppConfig {
  // Configurações Globais (Google)
  googleClientId: string;
  googleApiKey: string; // Chave do Cloud Console (Drive)
  geminiApiKey: string; // Chave do AI Studio (Resumos)
  
  // Gestão de Agentes
  profiles: DifyProfile[];
  activeProfileId: string;
  
  // Configurações de Sync
  autoSync: boolean;
  syncInterval: number;
}

export interface SyncLog {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'sucesso' | 'erro';
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  SETTINGS = 'SETTINGS',
  LOGS = 'LOGS'
}
