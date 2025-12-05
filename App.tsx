
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DocFile, AppConfig, DifyProfile, UserProfile, Notification } from './types';
import { ConfigModal } from './components/ConfigModal';
import { Dashboard } from './components/Dashboard';
import { ToastContainer } from './components/ToastContainer';
import { ConfirmationModal } from './components/ConfirmationModal';
import { generateDocumentSummary } from './services/geminiService';
import { syncFileToDify } from './services/difyService';
import { DEFAULT_DIFY_DATASET_ID, DEFAULT_DIFY_BASE_URL, DEFAULT_GEMINI_KEY } from './constants';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

// Scopes expandidos para pegar email do usuário
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const STORAGE_KEY_CONFIG = 'docsync_config_v3'; // Bump version
const STORAGE_KEY_WATCHED_MAP = 'docsync_watched_files_map';
const STORAGE_KEY_SYNC_HISTORY_MAP = 'docsync_sync_history_map';

const App: React.FC = () => {
  // --- CONFIGURAÇÃO E ESTADO ---
  const [config, setConfig] = useState<AppConfig>(() => {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      let parsed: AppConfig | null = saved ? JSON.parse(saved) : null;
      
      const defaultProfile: DifyProfile = {
          id: 'default-trade',
          name: 'TradeStars KB',
          difyApiKey: '',
          difyDatasetId: DEFAULT_DIFY_DATASET_ID,
          difyBaseUrl: DEFAULT_DIFY_BASE_URL
      };

      if (!parsed) {
          parsed = {
            googleClientId: '',
            googleApiKey: '',
            geminiApiKey: DEFAULT_GEMINI_KEY, 
            profiles: [defaultProfile],
            activeProfileId: defaultProfile.id,
            autoSync: false,
            syncInterval: 5
          };
      } else {
        // Se já existe config salva, forçamos a atualização da chave Gemini e do Dataset se estiverem vazios ou diferentes do default
        // para garantir que a chave "injetada" funcione.
        if (!parsed.geminiApiKey) parsed.geminiApiKey = DEFAULT_GEMINI_KEY;
        const profile = parsed.profiles.find(p => p.id === parsed.activeProfileId);
        if (profile && !profile.difyDatasetId) {
             profile.difyDatasetId = DEFAULT_DIFY_DATASET_ID;
        }
      }
      return parsed;
  });

  // User State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Mapas de persistência
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
  
  // UI States
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  // Auth Internals
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [gapiInited, setGapiInited] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Modal Control
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
    isDestructive?: boolean;
  }>({ isOpen: false, title: '', message: '', action: () => {} });

  // Refs
  const configRef = useRef(config);
  const watchedMapRef = useRef(watchedFilesMap);
  const historyMapRef = useRef(syncHistoryMap);
  const isSyncingRef = useRef(isSyncing);

  // --- PERSISTÊNCIA ---
  useEffect(() => { configRef.current = config; localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config)); }, [config]);
  useEffect(() => { watchedMapRef.current = watchedFilesMap; localStorage.setItem(STORAGE_KEY_WATCHED_MAP, JSON.stringify(watchedFilesMap)); }, [watchedFilesMap]);
  useEffect(() => { historyMapRef.current = syncHistoryMap; localStorage.setItem(STORAGE_KEY_SYNC_HISTORY_MAP, JSON.stringify(syncHistoryMap)); }, [syncHistoryMap]);
  useEffect(() => { isSyncingRef.current = isSyncing; }, [isSyncing]);

  // --- NOTIFICATION SYSTEM ---
  const notify = (title: string, message: string, type: Notification['type'] = 'info') => {
      const id = Math.random().toString(36).substr(2, 9);
      setNotifications(prev => [...prev, { id, title, message, type }]);
  };
  const removeNotification = (id: string) => setNotifications(prev => prev.filter(n => n.id !== id));

  // --- CORE LOGIC ---
  const mapFilesToActiveProfile = useCallback(() => {
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

  const toggleFileWatch = (fileId: string) => {
      const profileId = config.activeProfileId;
      const currentlyWatched = (watchedFilesMap[profileId] || []).includes(fileId);
      
      const action = () => {
          setWatchedFilesMap(prev => {
              const currentList = prev[profileId] || [];
              const exists = currentList.includes(fileId);
              const newList = exists ? currentList.filter(id => id !== fileId) : [...currentList, fileId];
              return { ...prev, [profileId]: newList };
          });
          if (!currentlyWatched) notify("Monitoramento Ativo", "O arquivo será sincronizado automaticamente.", "success");
      };

      if (!currentlyWatched) {
          // Se for ativar, pede confirmação leve (opcional, aqui direto para fluidez, ou via modal se preferir)
          action();
      } else {
          // Se for desativar
          action();
      }
  };

  const handleProfileChange = (profileId: string) => {
      const profileName = config.profiles.find(p => p.id === profileId)?.name;
      notify("Agente Alternado", `Agora gerenciando: ${profileName}`, 'info');
      setConfig(prev => ({ ...prev, activeProfileId: profileId }));
  };

  // --- GOOGLE AUTH ---
  useEffect(() => {
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
                        // Configura token no gapi
                        if (window.gapi.client) window.gapi.client.setToken(resp);
                        
                        // Busca Perfil do Usuário
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
  }, [config.googleClientId, config.googleApiKey, gapiInited, tokenClient]);

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
    if (!config.googleClientId || !config.googleApiKey) { 
        notify("Configuração Pendente", "Adicione as chaves de API do Google nas configurações.", "warning");
        setIsConfigOpen(true); 
        return; 
    }
    if (tokenClient) tokenClient.requestAccessToken({ prompt: 'consent' });
  };

  const handleDisconnect = () => {
      setConfirmModal({
          isOpen: true,
          title: "Desconectar Conta",
          message: "Isso removerá o acesso ao Drive e parará a sincronização automática. Deseja continuar?",
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
                      notify("Desconectado", "Conta Google removida com sucesso.", "info");
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
            if (isCurrentView) {
                setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'sincronizando' } : f));
            }
            
            // Fetch Content
            let content = '';
            if (file.mimeType.includes('google-apps')) {
                const resp = await window.gapi.client.drive.files.export({ fileId: file.id, mimeType: 'text/plain' });
                content = resp.body;
            } else {
                const resp = await window.gapi.client.drive.files.get({ fileId: file.id, alt: 'media' });
                content = resp.body;
            }

            // Generate Summary
            let summary = "N/A";
            if (configRef.current.geminiApiKey) {
                 summary = await generateDocumentSummary(content, configRef.current.geminiApiKey);
            }
            
            const enhancedContent = `---
Arquivo: ${file.name}
Data Mod: ${file.modifiedTime}
Resumo: ${summary}
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
                if (isCurrentView) notify("Sucesso", `${file.name} sincronizado com ${profile.name}.`, "success");
            } else {
                throw new Error(result.message);
            }
        } catch (err: any) {
            if (err.status === 401) {
                notify("Sessão Inválida", "Não foi possível baixar o arquivo.", "error");
                setIsConnected(false);
            } else {
                notify("Erro Sync", `Falha em ${file.name}: ${err.message}`, "error");
                if (isCurrentView) setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'erro' } : f));
            }
        }
  };

  const handleSyncAll = () => {
      const candidates = files.filter(f => f.watched && (f.status === 'pendente' || f.status === 'erro'));
      if (candidates.length === 0) {
          notify("Tudo em dia", "Nenhum arquivo pendente para sincronizar.", "info");
          return;
      }

      setConfirmModal({
          isOpen: true,
          title: "Sincronizar Tudo",
          message: `Deseja enviar ${candidates.length} arquivos pendentes para o agente "${config.profiles.find(p => p.id === config.activeProfileId)?.name}"?`,
          action: () => {
              setIsSyncing(true);
              (async () => {
                  for (const f of candidates) await processSync(f);
                  setIsSyncing(false);
                  notify("Processo Finalizado", "Fila de sincronização concluída.", "success");
              })();
          }
      });
  };

  // --- AUTO SYNC ---
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (config.autoSync && isConnected) {
        interval = setInterval(async () => {
            if (isSyncingRef.current) return;
            try {
                // Snapshot silencioso
                const response = await window.gapi.client.drive.files.list({
                    'pageSize': 100,
                    'fields': 'files(id, name, mimeType, modifiedTime)',
                    'q': "trashed = false and (mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/pdf' or mimeType = 'text/plain' or mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')"
                });
                const driveFiles = response.result.files as any[];
                if (!driveFiles) return;
                
                // Itera Perfis
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
                        notify("Auto-Sync Iniciado", `${pendingFiles.length} arquivos alterados detectados.`, "info");
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
  }, [config.autoSync, config.syncInterval, isConnected]);

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

      {/* Overlays */}
      <ConfigModal 
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={config}
        user={userProfile}
        onSave={(newConfig) => { setConfig(newConfig); setIsConfigOpen(false); notify("Configurações Salvas", "O sistema foi atualizado.", "success"); }}
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
