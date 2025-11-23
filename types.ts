
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

export interface AppConfig {
  difyApiKey: string;
  difyBaseUrl: string;
  difyDatasetId: string;
  googleClientId: string;
  googleApiKey?: string;
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
