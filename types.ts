
export interface DocFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  lastSynced?: string;
  status: 'pendente' | 'sincronizado' | 'erro' | 'sincronizando' | 'ignorado';
  content?: string;
  webViewLink?: string;
  iconLink?: string;
  watched: boolean; // Se true, entra no ciclo de auto-sync
}

export interface DifyProfile {
  id: string;
  name: string;
  difyDatasetId: string;
  difyBaseUrl?: string; 
  // Presente apenas na UI de admin para edição, mas vem mascarada do server
  difyApiKey?: string; 
}

export interface AppConfig {
  // Configurações Globais (Google)
  googleClientId: string;
  googleApiKey: string; // Chave do Cloud Console (Drive) - Pública/Restrita por Referrer
  
  // Gestão de Agentes
  profiles: DifyProfile[];
  activeProfileId: string;
  
  // Configurações de Sync
  autoSync: boolean;
  syncInterval: number;
}

export interface UserProfile {
  name: string;
  email: string;
  picture: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  SETTINGS = 'SETTINGS',
}
