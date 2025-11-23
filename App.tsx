
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DocFile, AppConfig, SyncLog, DifyProfile } from './types';
import { ConfigModal } from './components/ConfigModal';
import { Dashboard } from './components/Dashboard';
import { generateDocumentSummary } from './services/geminiService';
import { syncFileToDify } from './services/difyService';
import { DEFAULT_DIFY_DATASET_ID, DEFAULT_DIFY_BASE_URL } from './constants';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const STORAGE_KEY_CONFIG = 'docsync_config_v2';
const STORAGE_KEY_WATCHED_MAP = 'docsync_watched_files_map'; // Nova estrutura: Map<ProfileID, FileID[]>
const STORAGE_KEY_SYNC_HISTORY_MAP = 'docsync_sync_history_map'; // Nova estrutura: Map<ProfileID, {FileID: Time}>

const App: React.FC = () => {
  // Configuração com Migração Automática
  const [config, setConfig] = useState<AppConfig>(() => {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      const parsed = saved ? JSON.parse(saved) : null;
      
      const defaultProfile: DifyProfile = {
          id: 'default-1',
          name: 'Agente Principal',
          difyApiKey: '',
          difyDatasetId: DEFAULT_DIFY_DATASET_ID,
          difyBaseUrl: DEFAULT_DIFY_BASE_URL
      };

      if (!parsed || !parsed.profiles) {
          // Tenta recuperar configuração antiga se existir
          const oldV1 = localStorage.getItem('docusync_config_v1');
          if (oldV1) {
              try {
                  const v1Data = JSON.parse(oldV1);
                  defaultProfile.difyApiKey = v1Data.difyApiKey || '';
                  defaultProfile.difyDatasetId = v1Data.difyDatasetId || DEFAULT_DIFY_DATASET_ID;
              } catch (e) { console.error(e); }
          }
          return {
            googleClientId: parsed?.googleClientId || '',
            googleApiKey: parsed?.googleApiKey || '',
            geminiApiKey: '',
            profiles: [defaultProfile],
            activeProfileId: defaultProfile.id,
            autoSync: false,
            syncInterval: 5
          };
      }
      return parsed;
  });

  // Estado dos Arquivos Monitorados por Perfil: Record<ProfileID, FileID[]>
  const [watchedFilesMap, setWatchedFilesMap] = useState<Record<string, string[]>>(() => {
      const saved = localStorage.getItem(STORAGE_KEY_WATCHED_MAP);
      if (saved) return JSON.parse(saved);

      // Migração: se tinha lista antiga plana, atribui ao perfil ativo
      const oldFlat = localStorage.getItem('docusync_watched_files');
      if (oldFlat && config.activeProfileId) {
          return { [config.activeProfileId]: JSON.parse(oldFlat) };
      }
      return {};
  });
  
  // Estado do Histórico de Sync por Perfil: Record<ProfileID, Record<FileID, Timestamp>>
  const [syncHistoryMap, setSyncHistoryMap] = useState<Record<string, Record<string, string>>>(() => {
      const saved = localStorage.getItem(STORAGE_KEY_SYNC_HISTORY_MAP);
      if (saved) return JSON.parse(saved);

      // Migração
      const oldHistory = localStorage.getItem('docusync_sync_history');
      if (oldHistory && config.activeProfileId) {
          return { [config.activeProfileId]: JSON.parse(oldHistory) };
      }
      return {};
  });

  const [files, setFiles] = useState<DocFile[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [gapiInited, setGapiInited] = useState(false);
  const [initAttempts, setInitAttempts] = useState(0);
  
  // Refs para o loop de background acessar o estado mais recente
  const configRef = useRef(config);
  const watchedMapRef = useRef(watchedFilesMap);
  const historyMapRef = useRef(syncHistoryMap);
  const isSyncingRef = useRef(isSyncing);
  const filesRef = useRef(files);

  // Atualiza Refs e Persistência
  useEffect(() => {
    configRef.current = config;
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    watchedMapRef.current = watchedFilesMap;
    localStorage.setItem(STORAGE_KEY_WATCHED_MAP, JSON.stringify(watchedFilesMap));
  }, [watchedFilesMap]);

  useEffect(() => {
    historyMapRef.current = syncHistoryMap;
    localStorage.setItem(STORAGE_KEY_SYNC_HISTORY_MAP, JSON.stringify(syncHistoryMap));
  }, [syncHistoryMap]);

  useEffect(() => { isSyncingRef.current = isSyncing; }, [isSyncing]);
  useEffect(() => { filesRef.current = files; }, [files]);

  const addLog = (message: string, type: 'info' | 'sucesso' | 'erro' = 'info') => {
    setLogs(prev => [{ id: Math.random().toString(36).substr(2, 9), timestamp: new Date(), message, type }, ...prev]);
  };

  const toggleFileWatch = (fileId: string) => {
      const profileId = config.activeProfileId;
      setWatchedFilesMap(prev => {
          const currentList = prev[profileId] || [];
          const exists = currentList.includes(fileId);
          const newList = exists ? currentList.filter(id => id !== fileId) : [...currentList, fileId];
          return { ...prev, [profileId]: newList };
      });
      setTimeout(() => fetchFilesRef.current(), 100);
  };

  const handleProfileChange = (profileId: string) => {
      setConfig(prev => ({ ...prev, activeProfileId: profileId }));
      const profileName = config.profiles.find(p => p.id === profileId)?.name;
      addLog(`Painel alterado para: ${profileName}`, 'info');
      // A lista de arquivos vai atualizar automaticamente via useEffect do config.activeProfileId
  };

  // Google Init
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    const checkAndInitGoogle = async () => {
      if (initAttempts > 5) { clearInterval(intervalId); return; }
      if (window.gapi && window.google) {
        if (gapiInited && tokenClient) { clearInterval(intervalId); return; }
        try {
            if (!gapiInited) {
                setInitAttempts(prev => prev + 1);
                await new Promise<void>((resolve, reject) => window.gapi.load('client', { callback: resolve, onerror: reject }));
                if (!configRef.current.googleApiKey) return; 
                try {
                    await window.gapi.client.init({ apiKey: configRef.current.googleApiKey, discoveryDocs: [DISCOVERY_DOC] });
                    setGapiInited(true);
                } catch (e: any) {
                    if (e?.result?.error?.code === 502) { addLog("Chave Google Cloud Inválida.", 'erro'); clearInterval(intervalId); return; }
                }
            }
            if (!tokenClient && configRef.current.googleClientId) {
                const client = window.google.accounts.oauth2.initTokenClient({
                    client_id: configRef.current.googleClientId,
                    scope: SCOPES,
                    callback: (resp: any) => {
                        if (resp.error) return addLog(`Erro OAuth: ${resp.error}`, 'erro');
                        if (window.gapi.client) window.gapi.client.setToken(resp);
                        setIsConnected(true);
                        addLog("Conectado ao Drive.", 'sucesso');
                        setTimeout(() => fetchFilesRef.current(), 500);
                    },
                });
                setTokenClient(client);
                clearInterval(intervalId);
            }
        } catch (e) {}
      }
    };
    intervalId = setInterval(checkAndInitGoogle, 1000);
    return () => clearInterval(intervalId);
  }, [gapiInited, tokenClient, config.googleClientId, config.googleApiKey, initAttempts]);

  const fetchFilesRef = useRef((queryTerm?: string) => {});

  const handleConnectDrive = () => {
    if (!config.googleClientId || !config.googleApiKey) { addLog("Configure as chaves do Google primeiro.", 'erro'); setIsConfigOpen(true); return; }
    if (tokenClient) tokenClient.requestAccessToken({ prompt: 'consent' });
    else setInitAttempts(0);
  };

  // BUSCA E RENDERIZAÇÃO NA TELA (Só afeta o Profile Ativo)
  const fetchFiles = useCallback(async (queryTerm: string = '') => {
    if (!gapiInited) return;

    try {
        let query = "trashed = false and (mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/pdf' or mimeType = 'text/plain' or mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')";
        
        if (queryTerm) {
            query += ` and name contains '${queryTerm.replace(/'/g, "\\'")}'`;
            addLog(`Buscando no Drive por: "${queryTerm}"...`, 'info');
        }

        const response = await window.gapi.client.drive.files.list({
            'pageSize': 50,
            'fields': 'files(id, name, mimeType, modifiedTime, webViewLink)',
            'q': query,
            'supportsAllDrives': true,
            'includeItemsFromAllDrives': true
        });

        const driveFiles = response.result.files;
        const currentProfileId = config.activeProfileId;

        if (driveFiles) {
            const mappedFiles = driveFiles.map((dFile: any) => {
                // Verifica listas específicas do perfil ativo
                const watchedList = watchedFilesMap[currentProfileId] || [];
                const historyList = syncHistoryMap[currentProfileId] || {};

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
                
                // Mantém estado visual de 'enviando' se estiver
                const existing = filesRef.current.find(f => f.id === dFile.id);
                if (existing && existing.status === 'sincronizando') status = 'sincronizando';

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

            // Ordenação: Monitorados por este perfil primeiro
            mappedFiles.sort((a: DocFile, b: DocFile) => {
                if (a.watched !== b.watched) return a.watched ? -1 : 1;
                if (a.status === 'pendente' && b.status !== 'pendente') return -1;
                if (b.status === 'pendente' && a.status !== 'pendente') return 1;
                return new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime();
            });

            setFiles(mappedFiles);
            if (queryTerm) addLog(`${mappedFiles.length} arquivos encontrados.`, 'info');
        }
    } catch (err: any) {
        console.error("Erro fetch:", err);
        if (err.status === 401) setIsConnected(false);
    }
  }, [gapiInited, watchedFilesMap, syncHistoryMap, config.activeProfileId]);

  useEffect(() => { fetchFilesRef.current = fetchFiles; }, [fetchFiles]);

  // Função central de Sync: Aceita perfil explícito para rodar em background
  const processSync = async (file: DocFile, targetProfile?: DifyProfile) => {
      const profile = targetProfile || config.profiles.find(p => p.id === config.activeProfileId);
      if (!profile) return;

      const isCurrentView = profile.id === config.activeProfileId;

      try {
            if (isCurrentView) {
                setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'sincronizando' } : f));
            }
            
            // Download
            let content = '';
            if (file.mimeType.includes('google-apps')) {
                const resp = await window.gapi.client.drive.files.export({ fileId: file.id, mimeType: 'text/plain' });
                content = resp.body;
            } else {
                const resp = await window.gapi.client.drive.files.get({ fileId: file.id, alt: 'media' });
                content = resp.body;
            }

            // Resumo
            let summary = "N/A";
            if (configRef.current.geminiApiKey) {
                 summary = await generateDocumentSummary(content, configRef.current.geminiApiKey);
            }
            
            const enhancedContent = `---
Arquivo: ${file.name}
Data Mod: ${file.modifiedTime}
Resumo: ${summary}
---
${content}`;

            const result = await syncFileToDify(enhancedContent, file.name, configRef.current, profile);
            
            if (result.success) {
                const now = new Date().toISOString();
                
                // Atualiza histórico específico deste perfil
                setSyncHistoryMap(prev => ({
                    ...prev,
                    [profile.id]: {
                        ...(prev[profile.id] || {}),
                        [file.id]: now
                    }
                }));

                if (isCurrentView) {
                    setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'sincronizado', lastSynced: now } : f));
                }
                
                addLog(`[${profile.name}] ${file.name}: Sincronizado com sucesso.`, 'sucesso');
            } else {
                throw new Error(result.message);
            }
        } catch (err: any) {
            addLog(`[${profile.name}] Erro ao sincronizar ${file.name}: ${err.message}`, 'erro');
            if (isCurrentView) {
                setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'erro' } : f));
            }
        }
  };

  // LOOP GLOBAL DE AUTO-SYNC (CENTRO DE COMANDO)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (config.autoSync && isConnected) {
        addLog(`Auto-sync ativo. Monitorando todos os ${config.profiles.length} agentes.`, 'info');
        
        interval = setInterval(async () => {
            if (isSyncingRef.current) return;
            
            // 1. Baixa lista global de arquivos (Snapshot do Drive)
            try {
                const query = "trashed = false and (mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/pdf' or mimeType = 'text/plain' or mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')";
                const response = await window.gapi.client.drive.files.list({
                    'pageSize': 100, // Pega mais arquivos no background
                    'fields': 'files(id, name, mimeType, modifiedTime)',
                    'q': query
                });
                const driveFiles = response.result.files as DocFile[];
                
                if (!driveFiles) return;

                // 2. Itera sobre CADA perfil configurado
                for (const profile of configRef.current.profiles) {
                    const watchedIds = watchedMapRef.current[profile.id] || [];
                    const history = historyMapRef.current[profile.id] || {};
                    
                    if (watchedIds.length === 0) continue;

                    // Encontra arquivos que precisam de update para ESTE perfil
                    const pendingFiles = driveFiles.filter(dFile => {
                        if (!watchedIds.includes(dFile.id)) return false;
                        
                        const lastSync = history[dFile.id];
                        if (!lastSync) return true; // Nunca sincronizou
                        
                        const modTime = new Date(dFile.modifiedTime).getTime();
                        const syncTime = new Date(lastSync).getTime();
                        return modTime > (syncTime + 60000); // 1 min buffer
                    });

                    if (pendingFiles.length > 0) {
                        addLog(`[Auto-Sync] Detectadas alterações para ${profile.name} (${pendingFiles.length} arquivos).`, 'info');
                        setIsSyncing(true);
                        
                        // Sincroniza um por um
                        for (const file of pendingFiles) {
                            await processSync(file, profile);
                        }
                        
                        setIsSyncing(false);
                    }
                }
                
                // Se estiver na tela, atualiza a lista visual também
                fetchFiles();
                
            } catch (e) {
                console.error("Erro no loop de auto-sync", e);
            }
            
        }, config.syncInterval * 60 * 1000);
    }
    return () => clearInterval(interval);
  }, [config.autoSync, config.syncInterval, isConnected]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <i className="fas fa-layer-group text-blue-600"></i> DocSync
            </h1>
            <button onClick={() => setIsConfigOpen(true)} className="p-2 hover:bg-gray-100 rounded-full">
                <i className="fas fa-cog text-xl text-gray-600"></i>
            </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6">
        <Dashboard 
            files={files}
            config={config}
            isSyncing={isSyncing}
            isConnected={isConnected}
            onConnectDrive={handleConnectDrive}
            onSyncAll={() => {
                // Sync manual aciona apenas para o perfil VISÍVEL
                const currentFiles = filesRef.current;
                const candidates = currentFiles.filter(f => f.watched && (f.status === 'pendente' || f.status === 'erro'));
                if (candidates.length > 0) {
                    setIsSyncing(true);
                    (async () => {
                        for (const f of candidates) await processSync(f);
                        setIsSyncing(false);
                    })();
                }
            }}
            onSyncOne={processSync}
            onToggleWatch={toggleFileWatch}
            onChangeProfile={handleProfileChange}
            onDeepSearch={(term) => fetchFiles(term)}
            logs={logs}
        />
      </main>

      <ConfigModal 
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={config}
        onSave={(newConfig) => { setConfig(newConfig); setIsConfigOpen(false); }}
      />
    </div>
  );
};

export default App;
