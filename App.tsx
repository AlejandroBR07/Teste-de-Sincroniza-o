
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DocFile, AppConfig, UserProfile, Notification, DifyProfile } from './types';
import { ConfigModal } from './components/ConfigModal';
import { Dashboard } from './components/Dashboard';
import { ToastContainer } from './components/ToastContainer';
import { ConfirmationModal } from './components/ConfirmationModal';
import { syncFileToDify } from './services/difyService';
import { BACKEND_URL } from './constants';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const SCOPES = 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const STORAGE_KEY_WATCHED_MAP = 'docsync_watched_files_map';
const STORAGE_KEY_SYNC_HISTORY_MAP = 'docsync_sync_history_map';

const App: React.FC = () => {
  // --- CONFIGURAÇÃO ---
  // Estado inicial vazio, pois vamos buscar do servidor
  const [config, setConfig] = useState<AppConfig>({
      googleClientId: '',
      googleApiKey: '',
      profiles: [],
      activeProfileId: '',
      autoSync: false,
      syncInterval: 5
  });
  const [loadingConfig, setLoadingConfig] = useState(true);

  // User State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Mapas de persistência (Estes ficam no navegador do usuário mesmo)
  const [watchedFilesMap, setWatchedFilesMap] = useState<Record<string, string[]>>(() => {
      const saved = localStorage.getItem(STORAGE_KEY_WATCHED_MAP);
      return saved ? JSON.parse(saved) : {};
  });
  
  const [syncHistoryMap, setSyncHistoryMap] = useState<Record<string, Record<string, string>>>(() => {
      const saved = localStorage.getItem(STORAGE_KEY_SYNC_HISTORY_MAP);
      return saved ? JSON.parse(saved) : {};
  });

  const [rawDriveFiles, setRawDriveFiles] = useState<any[]>([]); 
  const [files, setFiles] = useState<DocFile[]>([]); 
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [gapiInited, setGapiInited] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
    isDestructive?: boolean;
  }>({ isOpen: false, title: '', message: '', action: () => {} });

  const configRef = useRef(config);
  const watchedMapRef = useRef(watchedFilesMap);
  const historyMapRef = useRef(syncHistoryMap);
  const isSyncingRef = useRef(isSyncing);

  // --- EFEITOS DE PERSISTÊNCIA LOCAL ---
  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { watchedMapRef.current = watchedFilesMap; localStorage.setItem(STORAGE_KEY_WATCHED_MAP, JSON.stringify(watchedFilesMap)); }, [watchedFilesMap]);
  useEffect(() => { historyMapRef.current = syncHistoryMap; localStorage.setItem(STORAGE_KEY_SYNC_HISTORY_MAP, JSON.stringify(syncHistoryMap)); }, [syncHistoryMap]);
  useEffect(() => { isSyncingRef.current = isSyncing; }, [isSyncing]);

  const notify = (title: string, message: string, type: Notification['type'] = 'info') => {
      const id = Math.random().toString(36).substr(2, 9);
      setNotifications(prev => [...prev, { id, title, message, type }]);
  };
  const removeNotification = (id: string) => setNotifications(prev => prev.filter(n => n.id !== id));

  // --- CARREGAR CONFIG DO SERVIDOR ---
  const loadConfigFromServer = async () => {
    try {
        let cleanUrl = BACKEND_URL.replace(/\/$/, "");
        
        // Verifica se o usuário configurou a URL
        if (!cleanUrl || cleanUrl.includes("SEU-LINK")) {
            // Se estiver rodando localmente (development), tenta usar o backend na porta 3000 como fallback
            if (window.location.hostname === 'localhost') {
                cleanUrl = 'http://localhost:3000';
                console.warn("URL não configurada. Tentando fallback localhost:3000");
            } else {
                throw new Error("URL do Backend não configurada em constants.ts");
            }
        }
        
        // Adiciona header especial para pular aviso do Ngrok Free
        const res = await fetch(`${cleanUrl}/api/config`, {
            headers: {
                "ngrok-skip-browser-warning": "true",
                "Content-Type": "application/json"
            }
        });

        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") === -1) {
             const text = await res.text();
             console.error("Resposta não-JSON recebida:", text.substring(0, 100)); // Loga o começo do HTML para debug
             throw new Error(`O servidor retornou HTML em vez de JSON. Verifique se a URL (${cleanUrl}) está correta.`);
        }

        if (!res.ok) throw new Error("Falha ao conectar ao servidor backend.");
        
        const serverConfig = await res.json();
        setConfig(serverConfig);
        setLoadingConfig(false);
        
        // Se a config veio vazia (primeiro uso), avisa
        if (!serverConfig.googleClientId) {
             notify("Primeiro Acesso", "Backend conectado! Configure o sistema no menu de engrenagem.", "info");
        }
    } catch (e: any) {
        console.error(e);
        notify("Erro de Conexão", `Falha ao carregar config: ${e.message}`, "error");
        setLoadingConfig(false);
    }
  };

  useEffect(() => {
      loadConfigFromServer();
  }, []);

  // Função para salvar configurações no servidor (chamada pelo Modal)
  const handleSaveConfig = async (newConfig: AppConfig) => {
      try {
        const cleanUrl = BACKEND_URL.replace(/\/$/, "");
        const res = await fetch(`${cleanUrl}/api/config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Email': userProfile?.email || '', // Autenticação simples via Header
                "ngrok-skip-browser-warning": "true"
            },
            body: JSON.stringify(newConfig)
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Erro ao salvar");
        }

        setConfig(newConfig); // Atualiza localmente para refletir UI
        setIsConfigOpen(false);
        notify("Configurações Salvas", "As alterações foram persistidas no servidor.", "success");
      } catch (e: any) {
          notify("Erro ao Salvar", e.message, "error");
      }
  };


  // --- MAP FILES ---
  const mapFilesToActiveProfile = useCallback(() => {
      if (!config.activeProfileId) return;
      
      const currentProfileId = config.activeProfileId;
      const rawData = rawDriveFiles; 
      const watchedList = watchedFilesMap[currentProfileId] || [];
      const historyList = syncHistoryMap[currentProfileId] || {};

      const mapped = rawData.map(dFile => {
          const isWatched = watchedList.includes(dFile.id);
          const lastSyncTimeStr = historyList[dFile.id];
          
          let status: DocFile['status'] = 'ignorado';
          if (isWatched) {
              if (!lastSyncTimeStr) status = 'pendente';
              else {
                  const modTime = new Date(dFile.modifiedTime).getTime();
                  const syncTime = new Date(lastSyncTimeStr).getTime();
                  status = (modTime > (syncTime + 60000)) ? 'pendente' : 'sincronizado';
              }
          }
          
          return {
              id: dFile.id,
              name: dFile.name,
              mimeType: dFile.mimeType,
              modifiedTime: dFile.modifiedTime,
              webViewLink: dFile.webViewLink,
              status,
              lastSynced: lastSyncTimeStr,
              watched: isWatched
          } as DocFile;
      });

      mapped.sort((a, b) => {
          if (a.watched !== b.watched) return a.watched ? -1 : 1;
          if (a.status === 'pendente' && b.status !== 'pendente') return -1;
          if (b.status === 'pendente' && a.status !== 'pendente') return 1;
          return new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime();
      });

      setFiles(mapped);
  }, [config.activeProfileId, watchedFilesMap, syncHistoryMap, rawDriveFiles]);

  useEffect(() => { mapFilesToActiveProfile(); }, [mapFilesToActiveProfile]);

  // --- ACTIONS ---
  const toggleFileWatch = (fileId: string) => {
      const profileId = config.activeProfileId;
      setWatchedFilesMap(prev => {
          const currentList = prev[profileId] || [];
          const exists = currentList.includes(fileId);
          const newList = exists ? currentList.filter(id => id !== fileId) : [...currentList, fileId];
          return { ...prev, [profileId]: newList };
      });
  };

  const handleProfileChange = (profileId: string) => {
      const profileName = config.profiles.find(p => p.id === profileId)?.name;
      notify("Agente Alternado", `Agora gerenciando: ${profileName}`, 'info');
      setConfig(prev => ({ ...prev, activeProfileId: profileId }));
  };

  // --- GOOGLE AUTH ---
  useEffect(() => {
    // Só inicializa Google se tivermos a config do servidor
    if (loadingConfig || !config.googleClientId) return;

    const initGoogle = async () => {
        if (typeof window.gapi === 'undefined' || typeof window.google === 'undefined') return;
        
        try {
            if (!gapiInited) {
                await new Promise<void>((resolve) => window.gapi.load('client', resolve));
                if (config.googleApiKey) {
                   await window.gapi.client.init({ apiKey: config.googleApiKey, discoveryDocs: [DISCOVERY_DOC] });
                   setGapiInited(true);
                }
            }

            if (!tokenClient && config.googleClientId) {
                const client = window.google.accounts.oauth2.initTokenClient({
                    client_id: config.googleClientId,
                    scope: SCOPES,
                    callback: async (resp: any) => {
                        if (resp.error) {
                            notify("Erro Autenticação", resp.error, "error");
                            return;
                        }
                        setAccessToken(resp.access_token);
                        if (window.gapi.client) window.gapi.client.setToken(resp);
                        await fetchUserProfile(resp.access_token);
                        setIsConnected(true);
                        notify("Conectado", "Acesso ao Google Drive autorizado.", "success");
                    },
                });
                setTokenClient(client);
            }
        } catch (e) { console.error(e); }
    };
    initGoogle();
  }, [config, loadingConfig, gapiInited, tokenClient]);

  const fetchUserProfile = async (token: string) => {
      try {
          const res = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${token}`);
          const data = await res.json();
          setUserProfile({ name: data.name, email: data.email, picture: data.picture });
      } catch (e) {
          console.error("Falha ao buscar perfil", e);
      }
  };

  const handleConnectDrive = () => {
    if (!config.googleClientId) { 
        notify("Aguardando Configuração", "O sistema ainda não recebeu as configurações do servidor.", "warning");
        return; 
    }
    if (tokenClient) tokenClient.requestAccessToken({ prompt: 'consent' });
  };

  const handleDisconnect = () => {
      setConfirmModal({
          isOpen: true,
          title: "Desconectar Conta",
          message: "Deseja desconectar sua conta do Google Drive?",
          isDestructive: true,
          action: () => {
              const token = window.gapi.client.getToken();
              if (token !== null) {
                  window.google.accounts.oauth2.revoke(token.access_token, () => {
                      window.gapi.client.setToken('');
                      setAccessToken(null);
                      setUserProfile(null);
                      setIsConnected(false);
                      setRawDriveFiles([]);
                      notify("Desconectado", "Conta removida.", "info");
                  });
              }
          }
      });
  };

  const fetchDriveFiles = async (queryTerm: string = '') => {
    if (!gapiInited || !isConnected) return;
    try {
        let query = "trashed = false and (mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/pdf' or mimeType = 'text/plain' or mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')";
        if (queryTerm) {
            query += ` and name contains '${queryTerm.replace(/'/g, "\\'")}'`;
            notify("Buscando...", `Procurando por "${queryTerm}"`, "info");
        }
        const response = await window.gapi.client.drive.files.list({
            'pageSize': 50,
            'fields': 'files(id, name, mimeType, modifiedTime, webViewLink)',
            'q': query,
            'supportsAllDrives': true,
            'includeItemsFromAllDrives': true
        });
        const dFiles = response.result.files;
        if (dFiles) {
            setRawDriveFiles(dFiles); 
            if (queryTerm) notify("Busca Concluída", `${dFiles.length} arquivos encontrados.`, "success");
        }
    } catch (err: any) {
        if (err.status === 401 || (err.result?.error?.code === 401)) {
            notify("Sessão Expirada", "Reconecte sua conta Google.", "error");
            setIsConnected(false);
        } else {
            notify("Erro no Drive", "Falha ao listar arquivos.", "error");
        }
    }
  };

  useEffect(() => {
      if (isConnected && gapiInited) {
          const t = setTimeout(() => fetchDriveFiles(), 500);
          return () => clearTimeout(t);
      }
  }, [isConnected, gapiInited]);

  // --- SYNC ---
  const processSync = async (file: DocFile, targetProfile?: DifyProfile) => {
      const profile = targetProfile || config.profiles.find(p => p.id === config.activeProfileId);
      if (!profile) return;
      const isCurrentView = profile.id === config.activeProfileId;
      try {
            if (isCurrentView) setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'sincronizando' } : f));
            
            let content = '';
            if (file.mimeType.includes('google-apps')) {
                const resp = await window.gapi.client.drive.files.export({ fileId: file.id, mimeType: 'text/plain' });
                content = resp.body;
            } else {
                const resp = await window.gapi.client.drive.files.get({ fileId: file.id, alt: 'media' });
                content = resp.body;
            }

            const enhancedContent = `---
Arquivo: ${file.name}
Data Mod: ${file.modifiedTime}
Link Drive: ${file.webViewLink || 'N/A'}
---
${content}`;

            const result = await syncFileToDify(enhancedContent, file.name, configRef.current, profile);
            
            if (result.success) {
                const now = new Date().toISOString();
                setSyncHistoryMap(prev => ({
                    ...prev,
                    [profile.id]: { ...(prev[profile.id] || {}), [file.id]: now }
                }));
                if (isCurrentView) notify("Sucesso", `${file.name} sincronizado.`, "success");
            } else {
                throw new Error(result.message);
            }
        } catch (err: any) {
            notify("Erro Sync", `Falha em ${file.name}: ${err.message}`, "error");
            if (isCurrentView) setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'erro' } : f));
        }
  };

  const handleSyncAll = () => {
      const candidates = files.filter(f => f.watched && (f.status === 'pendente' || f.status === 'erro'));
      if (candidates.length === 0) {
          notify("Tudo em dia", "Nenhum arquivo pendente.", "info");
          return;
      }
      setConfirmModal({
          isOpen: true,
          title: "Sincronizar Tudo",
          message: `Enviar ${candidates.length} arquivos para "${config.profiles.find(p => p.id === config.activeProfileId)?.name}"?`,
          action: () => {
              setIsSyncing(true);
              (async () => {
                  for (const f of candidates) await processSync(f);
                  setIsSyncing(false);
                  notify("Finalizado", "Sincronização em massa concluída.", "success");
              })();
          }
      });
  };

  // --- AUTO SYNC ---
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (config.autoSync && isConnected && !loadingConfig) {
        interval = setInterval(async () => {
            if (isSyncingRef.current) return;
            try {
                const response = await window.gapi.client.drive.files.list({
                    'pageSize': 100,
                    'fields': 'files(id, name, mimeType, modifiedTime)',
                    'q': "trashed = false and (mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/pdf' or mimeType = 'text/plain' or mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')"
                });
                const driveFiles = response.result.files as any[];
                if (!driveFiles) return;
                
                for (const profile of configRef.current.profiles) {
                    const watchedIds = watchedMapRef.current[profile.id] || [];
                    const history = historyMapRef.current[profile.id] || {};
                    if (watchedIds.length === 0) continue;

                    const pendingFiles = driveFiles.filter(dFile => {
                        if (!watchedIds.includes(dFile.id)) return false;
                        const lastSync = history[dFile.id];
                        if (!lastSync) return true;
                        return new Date(dFile.modifiedTime).getTime() > (new Date(lastSync).getTime() + 60000);
                    });

                    if (pendingFiles.length > 0) {
                        notify("Auto-Sync", `${pendingFiles.length} arquivos detectados.`, "info");
                        setIsSyncing(true);
                        for (const rawFile of pendingFiles) {
                            await processSync({
                                id: rawFile.id, name: rawFile.name, mimeType: rawFile.mimeType, modifiedTime: rawFile.modifiedTime,
                                watched: true, status: 'pendente'
                            } as DocFile, profile);
                        }
                        setIsSyncing(false);
                    }
                }
            } catch (e: any) { 
                if (e.status === 401) { setIsConnected(false); clearInterval(interval); }
            }
        }, config.syncInterval * 60 * 1000);
    }
    return () => clearInterval(interval);
  }, [config.autoSync, config.syncInterval, isConnected, loadingConfig]);

  if (loadingConfig) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="text-center animate-pulse">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                     <i className="fas fa-satellite-dish text-indigo-500 text-2xl"></i>
                  </div>
                  <h2 className="text-xl font-bold text-slate-700">Conectando ao Backend...</h2>
                  <p className="text-slate-400 text-sm mt-2">{BACKEND_URL}</p>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-800">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between py-3">
            <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-3 tracking-tight">
                <span className="bg-indigo-600 text-white w-8 h-8 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200">
                    <i className="fas fa-sync-alt text-sm"></i>
                </span>
                TradeSync
            </h1>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 lg:p-8">
        <Dashboard 
            files={files}
            config={config}
            user={userProfile}
            isSyncing={isSyncing}
            isConnected={isConnected}
            onConnectDrive={handleConnectDrive}
            onDisconnect={handleDisconnect}
            onSyncAll={handleSyncAll}
            onSyncOne={processSync}
            onToggleWatch={toggleFileWatch}
            onChangeProfile={handleProfileChange}
            onDeepSearch={(term) => fetchDriveFiles(term)}
            onOpenConfig={() => setIsConfigOpen(true)}
        />
      </main>

      <ConfigModal 
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={config}
        user={userProfile}
        onSave={handleSaveConfig}
      />
      
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => { confirmModal.action(); setConfirmModal(prev => ({ ...prev, isOpen: false })); }}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        isDestructive={confirmModal.isDestructive}
      />

      <ToastContainer notifications={notifications} removeNotification={removeNotification} />
    </div>
  );
};

export default App;
