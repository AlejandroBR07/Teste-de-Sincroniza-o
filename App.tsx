
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
const STORAGE_KEY_CONFIG = 'docusync_config_v2'; // Versão nova
const STORAGE_KEY_WATCHED = 'docusync_watched_files';
const STORAGE_KEY_SYNC_HISTORY = 'docusync_sync_history';

const App: React.FC = () => {
  // Configuração com Migração Automática para V2
  const [config, setConfig] = useState<AppConfig>(() => {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      let parsed: any = saved ? JSON.parse(saved) : null;
      
      const defaultProfile: DifyProfile = {
          id: 'default-1',
          name: 'Agente Principal',
          difyApiKey: '',
          difyDatasetId: DEFAULT_DIFY_DATASET_ID,
          difyBaseUrl: DEFAULT_DIFY_BASE_URL
      };

      // Se não existir ou for da versão antiga (sem profiles), migra
      if (!parsed || !parsed.profiles) {
          // Tenta pegar da V1 se existir (usuário que já configurou)
          const oldV1 = localStorage.getItem('docusync_config_v1');
          let v1Data: any = null;

          if (oldV1) {
              try {
                  v1Data = JSON.parse(oldV1);
                  defaultProfile.difyApiKey = v1Data.difyApiKey || '';
                  defaultProfile.difyDatasetId = v1Data.difyDatasetId || DEFAULT_DIFY_DATASET_ID;
              } catch (e) {
                  console.error("Erro ao analisar configuração v1", e);
              }
          }

          return {
            googleClientId: v1Data?.googleClientId || '',
            googleApiKey: v1Data?.googleApiKey || '',
            geminiApiKey: '',
            profiles: [defaultProfile],
            activeProfileId: defaultProfile.id,
            autoSync: false,
            syncInterval: 5
          };
      }
      return parsed;
  });

  const [watchedFileIds, setWatchedFileIds] = useState<string[]>(() => {
      const saved = localStorage.getItem(STORAGE_KEY_WATCHED);
      return saved ? JSON.parse(saved) : [];
  });
  
  const [syncHistory, setSyncHistory] = useState<Record<string, string>>(() => {
      const saved = localStorage.getItem(STORAGE_KEY_SYNC_HISTORY);
      return saved ? JSON.parse(saved) : {};
  });

  const [files, setFiles] = useState<DocFile[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [gapiInited, setGapiInited] = useState(false);
  const [initAttempts, setInitAttempts] = useState(0);
  
  const configRef = useRef(config);
  
  // Salva config sempre que mudar
  useEffect(() => {
    configRef.current = config;
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  }, [config]);

  // Reset de tentativas ao mudar chaves Google
  useEffect(() => {
    if (config.googleApiKey || config.googleClientId) {
        if (initAttempts > 0 && !gapiInited) setInitAttempts(0);
    }
  }, [config.googleApiKey, config.googleClientId]);

  // Persistência
  useEffect(() => { localStorage.setItem(STORAGE_KEY_WATCHED, JSON.stringify(watchedFileIds)); }, [watchedFileIds]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_SYNC_HISTORY, JSON.stringify(syncHistory)); }, [syncHistory]);

  const addLog = (message: string, type: 'info' | 'sucesso' | 'erro' = 'info') => {
    setLogs(prev => [{ id: Math.random().toString(36).substr(2, 9), timestamp: new Date(), message, type }, ...prev]);
  };

  const toggleFileWatch = (fileId: string) => {
      setWatchedFileIds(prev => {
          const exists = prev.includes(fileId);
          return exists ? prev.filter(id => id !== fileId) : [...prev, fileId];
      });
      setTimeout(() => fetchFilesRef.current(), 100);
  };

  const handleProfileChange = (profileId: string) => {
      setConfig(prev => ({ ...prev, activeProfileId: profileId }));
      const profileName = config.profiles.find(p => p.id === profileId)?.name;
      addLog(`Trocado para o agente: ${profileName}`, 'info');
  };

  // Google Init Logic
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

  // BUSCA E LISTAGEM
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
        
        if (driveFiles) {
            const mappedFiles = driveFiles.map((dFile: any) => {
                const isWatched = watchedFileIds.includes(dFile.id);
                const lastSyncTimeStr = syncHistory[dFile.id];
                let status: DocFile['status'] = 'ignorado';
                
                if (isWatched) {
                    if (!lastSyncTimeStr) status = 'pendente';
                    else {
                        const modTime = new Date(dFile.modifiedTime).getTime();
                        const syncTime = new Date(lastSyncTimeStr).getTime();
                        status = (modTime > (syncTime + 60000)) ? 'pendente' : 'sincronizado';
                    }
                }
                // Preserva status temporário
                const existing = files.find(f => f.id === dFile.id);
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

            // ORDENAÇÃO: Monitorados primeiro, depois Pendentes, depois o resto
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
  }, [gapiInited, watchedFileIds, syncHistory, files]);

  useEffect(() => { fetchFilesRef.current = fetchFiles; }, [fetchFiles]);

  // Lógica de Sync
  const processSync = async (file: DocFile) => {
      try {
            setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'sincronizando' } : f));
            
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
            if (config.geminiApiKey) {
                 summary = await generateDocumentSummary(content, config.geminiApiKey);
            } else {
                 summary = "Gemini Key não configurada.";
            }
            
            const enhancedContent = `---
Arquivo: ${file.name}
Data Mod: ${file.modifiedTime}
Resumo: ${summary}
---
${content}`;

            const result = await syncFileToDify(enhancedContent, file.name, config);
            
            if (result.success) {
                const now = new Date().toISOString();
                setSyncHistory(prev => ({ ...prev, [file.id]: now }));
                setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'sincronizado', lastSynced: now } : f));
                addLog(`[OK] ${file.name} -> ${result.message}`, 'sucesso');
            } else {
                throw new Error(result.message);
            }
        } catch (err: any) {
            addLog(`[ERRO] ${file.name}: ${err.message}`, 'erro');
            setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'erro' } : f));
        }
  };

  const handleSyncAll = async () => {
    const candidates = files.filter(f => f.watched && (f.status === 'pendente' || f.status === 'erro'));
    if (candidates.length === 0) return addLog("Tudo atualizado.", 'info');
    
    setIsSyncing(true);
    for (const file of candidates) await processSync(file);
    setIsSyncing(false);
  };

  // Auto-Sync Timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (config.autoSync && isConnected) {
        interval = setInterval(() => {
            fetchFiles();
            setTimeout(() => handleSyncAll(), 5000);
        }, config.syncInterval * 60 * 1000);
    }
    return () => clearInterval(interval);
  }, [config.autoSync, config.syncInterval, isConnected]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <i className="fas fa-layer-group text-blue-600"></i> DocuSync
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
            onSyncAll={handleSyncAll}
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
