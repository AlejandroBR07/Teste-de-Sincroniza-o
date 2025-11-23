
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DocFile, AppConfig, SyncLog } from './types';
import { ConfigModal } from './components/ConfigModal';
import { Dashboard } from './components/Dashboard';
import { generateDocumentSummary } from './services/geminiService';
import { syncFileToDify } from './services/difyService';
import { DEFAULT_DIFY_DATASET_ID, DEFAULT_DIFY_BASE_URL, DEFAULT_DIFY_API_KEY } from './constants';

// Types for Google API
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const STORAGE_KEY_CONFIG = 'docusync_config_v1';
const STORAGE_KEY_WATCHED = 'docusync_watched_files';
const STORAGE_KEY_SYNC_HISTORY = 'docusync_sync_history'; // Armazenar ultima sync persistente

const App: React.FC = () => {
  // 1. Carregar Config
  const [config, setConfig] = useState<AppConfig>(() => {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      return saved ? JSON.parse(saved) : {
        difyApiKey: DEFAULT_DIFY_API_KEY, 
        difyDatasetId: DEFAULT_DIFY_DATASET_ID,
        difyBaseUrl: DEFAULT_DIFY_BASE_URL,
        googleClientId: '',
        googleApiKey: '',
        autoSync: false,
        syncInterval: 5
      };
  });

  const [watchedFileIds, setWatchedFileIds] = useState<string[]>(() => {
      const saved = localStorage.getItem(STORAGE_KEY_WATCHED);
      return saved ? JSON.parse(saved) : [];
  });
  
  // Mapa de ID -> Data de Ultima Sincronização
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
  
  useEffect(() => {
    configRef.current = config;
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    if (config.googleApiKey || config.googleClientId) {
        if (initAttempts > 0 && !gapiInited) {
            setInitAttempts(0);
        }
    }
  }, [config.googleApiKey, config.googleClientId]);

  useEffect(() => {
      localStorage.setItem(STORAGE_KEY_WATCHED, JSON.stringify(watchedFileIds));
  }, [watchedFileIds]);
  
  useEffect(() => {
      localStorage.setItem(STORAGE_KEY_SYNC_HISTORY, JSON.stringify(syncHistory));
  }, [syncHistory]);

  const addLog = (message: string, type: 'info' | 'sucesso' | 'erro' = 'info') => {
    setLogs(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      message,
      type
    }, ...prev]);
  };

  const toggleFileWatch = (fileId: string) => {
      setWatchedFileIds(prev => {
          const exists = prev.includes(fileId);
          return exists ? prev.filter(id => id !== fileId) : [...prev, fileId];
      });
      // A atualização do status visual será feita pelo fetchFiles ou pelo efeito de mudança
      setTimeout(() => fetchFilesRef.current(), 100);
  };

  // Inicialização do Google (Mantido igual, funciona bem)
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    const checkAndInitGoogle = async () => {
      if (initAttempts > 10) { clearInterval(intervalId); return; }

      if (window.gapi && window.google && window.google.accounts) {
        if (gapiInited && tokenClient) { clearInterval(intervalId); return; }

        try {
            if (!gapiInited) {
                setInitAttempts(prev => prev + 1);
                await new Promise<void>((resolve, reject) => {
                    window.gapi.load('client', { callback: resolve, onerror: reject });
                });
                
                if (!configRef.current.googleApiKey) return; 

                try {
                    await window.gapi.client.init({
                        apiKey: configRef.current.googleApiKey, 
                        discoveryDocs: [DISCOVERY_DOC],
                    });
                    setGapiInited(true);
                } catch (initError: any) {
                    if (initError?.result?.error?.code === 502 || initError?.message?.includes('discovery')) {
                        addLog("ERRO CRÍTICO: Chave API Google inválida.", 'erro');
                        clearInterval(intervalId);
                        setIsConfigOpen(true);
                        return;
                    }
                    throw initError;
                }
            }

            if (!tokenClient && configRef.current.googleClientId) {
                const client = window.google.accounts.oauth2.initTokenClient({
                    client_id: configRef.current.googleClientId,
                    scope: SCOPES,
                    callback: async (resp: any) => {
                        if (resp.error) {
                            addLog(`Erro OAuth: ${resp.error}`, 'erro');
                            return;
                        }
                        if (window.gapi.client) window.gapi.client.setToken(resp);
                        setIsConnected(true);
                        addLog("Conexão autorizada!", 'sucesso');
                        setTimeout(() => fetchFilesRef.current(), 500);
                    },
                });
                setTokenClient(client);
                clearInterval(intervalId);
            }
        } catch (error: any) {
             // Ignora erro silencioso
        }
      }
    };

    intervalId = setInterval(checkAndInitGoogle, 1000);
    return () => clearInterval(intervalId);
  }, [gapiInited, tokenClient, config.googleClientId, config.googleApiKey, initAttempts]);

  const fetchFilesRef = useRef(() => {});

  const handleConnectDrive = () => {
    if (!config.googleClientId || !config.googleApiKey) {
        addLog("Configuração incompleta. Verifique as chaves.", 'erro');
        setIsConfigOpen(true);
        return;
    }
    if (tokenClient) tokenClient.requestAccessToken({ prompt: 'consent' });
    else if (initAttempts > 5) setInitAttempts(0);
  };

  const fetchFiles = useCallback(async () => {
    if (!gapiInited) return;

    try {
        console.log("--- Atualizando Lista de Arquivos ---");
        const query = "trashed = false and (mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/pdf' or mimeType = 'text/plain' or mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')";

        const response = await window.gapi.client.drive.files.list({
            'pageSize': 50,
            'fields': 'files(id, name, mimeType, modifiedTime, webViewLink)',
            'q': query,
            'supportsAllDrives': true,
            'includeItemsFromAllDrives': true
        });

        const driveFiles = response.result.files;
        
        if (driveFiles && driveFiles.length > 0) {
            setFiles(currentFiles => {
                return driveFiles.map((dFile: any) => {
                    const isWatched = watchedFileIds.includes(dFile.id);
                    const lastSyncTimeStr = syncHistory[dFile.id];
                    
                    let status: DocFile['status'] = 'ignorado'; // Padrão agora é ignorado
                    
                    if (isWatched) {
                        if (!lastSyncTimeStr) {
                            status = 'pendente'; // Nunca sincronizou
                        } else {
                            const modTime = new Date(dFile.modifiedTime).getTime();
                            const syncTime = new Date(lastSyncTimeStr).getTime();
                            // Se modificação for mais recente que o sync, está pendente
                            // Damos uma margem de 1 minuto para evitar loops de relógio desajustado
                            if (modTime > (syncTime + 60000)) {
                                status = 'pendente';
                            } else {
                                status = 'sincronizado';
                            }
                        }
                    } else {
                        status = 'ignorado';
                    }

                    // Se estava com status de erro ou sincronizando no estado anterior, mantém visualmente até resolver
                    const existing = currentFiles.find(f => f.id === dFile.id);
                    if (existing && existing.status === 'sincronizando') {
                        status = 'sincronizando';
                    }

                    return {
                        id: dFile.id,
                        name: dFile.name,
                        mimeType: dFile.mimeType,
                        modifiedTime: dFile.modifiedTime,
                        webViewLink: dFile.webViewLink,
                        status: status,
                        lastSynced: lastSyncTimeStr,
                        watched: isWatched
                    } as DocFile;
                });
            });
        }
    } catch (err: any) {
        console.error("Erro fetch:", err);
        if (err.status === 401) {
            setIsConnected(false);
            addLog("Sessão expirada.", 'erro');
        }
    }
  }, [gapiInited, watchedFileIds, syncHistory]);

  useEffect(() => {
    fetchFilesRef.current = fetchFiles;
  }, [fetchFiles]);

  const getFileContent = async (fileId: string, mimeType: string): Promise<string> => {
      try {
          if (mimeType.includes('application/vnd.google-apps')) {
              let exportMimeType = 'text/plain';
              if (mimeType.includes('spreadsheet')) exportMimeType = 'text/csv';
              const response = await window.gapi.client.drive.files.export({ fileId, mimeType: exportMimeType });
              return response.body;
          } else {
              const response = await window.gapi.client.drive.files.get({ fileId, alt: 'media' });
              return response.body;
          }
      } catch (e: any) {
          throw new Error(`Download falhou: ${e.message}`);
      }
  };

  // Função core de sincronização (reutilizável)
  const processSync = async (file: DocFile) => {
      try {
            setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'sincronizando' } : f));
            
            const content = await getFileContent(file.id, file.mimeType);

            if (!content || content.length === 0) throw new Error("Conteúdo vazio.");

            // Resumo com Gemini (Opcional, falha silenciosa se der erro)
            let summary = "N/A";
            try {
                if (config.googleApiKey) { // Usa a chave do Cloud ou tenta a do ambiente se configurada
                     // Nota: geminiService usa process.env shim. 
                     summary = await generateDocumentSummary(content.substring(0, 30000));
                }
            } catch (sumErr) { console.warn("Erro resumo:", sumErr); }
            
            const enhancedContent = `---
Arquivo: ${file.name}
Fonte: Google Drive
Data Modificação: ${file.modifiedTime}
Resumo Automático: ${summary}
---

${content}`;

            const result = await syncFileToDify(enhancedContent, file.name, config);
            
            if (result.success) {
                addLog(`[OK] ${file.name} atualizado no Dify.`, 'sucesso');
                const now = new Date().toISOString();
                
                // Atualiza histórico persistente
                setSyncHistory(prev => ({ ...prev, [file.id]: now }));
                
                // Atualiza estado local
                setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'sincronizado', lastSynced: now } : f));
            } else {
                throw new Error(result.message);
            }

        } catch (err: any) {
            addLog(`[ERRO] ${file.name}: ${err.message}`, 'erro');
            setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'erro' } : f));
        }
  };

  // Sincronizar Tudo (Forçado ou Auto)
  const handleSyncAll = async (force: boolean = false) => {
    // Se for forçado (botão), pega pendentes e erros que estão monitorados
    // Se for auto, pega apenas pendentes monitorados
    const candidates = files.filter(f => f.watched && (f.status === 'pendente' || f.status === 'erro'));
    
    if (candidates.length === 0) {
        if (force) addLog("Todos os arquivos monitorados já estão atualizados.", 'info');
        return;
    }

    setIsSyncing(true);
    addLog(`Iniciando sincronização de ${candidates.length} arquivos...`, 'info');

    // Processa um por um para não floodar
    for (const file of candidates) {
        await processSync(file);
    }
    setIsSyncing(false);
  };

  // Sincronizar Um (Raio)
  const handleSyncOne = async (file: DocFile) => {
      addLog(`Sincronizando manualmente: ${file.name}...`, 'info');
      await processSync(file);
  };

  // Auto-Sync Loop
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (config.autoSync && isConnected) {
        addLog(`Auto-sync ativo (${config.syncInterval}min). Monitorando alterações...`, 'info');
        
        interval = setInterval(() => {
            // 1. Atualiza lista para ver se modificou algo no drive
            fetchFiles(); 
            
            // 2. Se tiver algo pendente, dispara sync em breve
            setTimeout(() => {
                handleSyncAll(false);
            }, 5000); 
        }, config.syncInterval * 60 * 1000); 
    }
    return () => clearInterval(interval);
  }, [config.autoSync, config.syncInterval, isConnected]);


  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center text-white shadow-lg">
                    <i className="fas fa-network-wired"></i>
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-800">DocuSync</h1>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Drive <i className="fas fa-arrow-right mx-1"></i> Dify</p>
                </div>
            </div>
            
            <button 
                onClick={() => setIsConfigOpen(true)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition relative"
            >
                <i className="fas fa-cog text-xl"></i>
            </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6">
        <Dashboard 
            files={files}
            isSyncing={isSyncing}
            isConnected={isConnected}
            onConnectDrive={handleConnectDrive}
            onSyncAll={() => handleSyncAll(true)}
            onSyncOne={handleSyncOne}
            onToggleWatch={toggleFileWatch}
            logs={logs}
        />
      </main>

      <ConfigModal 
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={config}
        onSave={(newConfig) => {
            setConfig(newConfig);
            setIsConfigOpen(false);
        }}
      />
    </div>
  );
};

export default App;
