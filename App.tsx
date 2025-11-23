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

const App: React.FC = () => {
  // 1. Carregar Config do LocalStorage ou usar padrão
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

  const [files, setFiles] = useState<DocFile[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [gapiInited, setGapiInited] = useState(false);
  
  const configRef = useRef(config);
  
  // Salvar Config sempre que mudar
  useEffect(() => {
    configRef.current = config;
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  }, [config]);

  // Salvar Lista de Monitorados sempre que mudar
  useEffect(() => {
      localStorage.setItem(STORAGE_KEY_WATCHED, JSON.stringify(watchedFileIds));
  }, [watchedFileIds]);

  // Helper to add logs
  const addLog = (message: string, type: 'info' | 'sucesso' | 'erro' = 'info') => {
    setLogs(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      message,
      type
    }, ...prev]);
  };

  // Toggle Watch Status
  const toggleFileWatch = (fileId: string) => {
      setWatchedFileIds(prev => {
          const exists = prev.includes(fileId);
          let newIds;
          if (exists) {
              newIds = prev.filter(id => id !== fileId);
              addLog(`Arquivo removido do monitoramento automático.`, 'info');
          } else {
              newIds = [...prev, fileId];
              addLog(`Arquivo adicionado ao monitoramento automático.`, 'info');
          }
          return newIds;
      });

      // Atualiza visualmente na lista de arquivos atual
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, watched: !f.watched } : f));
  };

  // Inicialização do Google
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    const checkAndInitGoogle = async () => {
      if (window.gapi && window.google && window.google.accounts) {
        if (gapiInited && tokenClient) {
            clearInterval(intervalId);
            return;
        }

        try {
            if (!gapiInited) {
                await new Promise<void>((resolve, reject) => {
                    window.gapi.load('client', {
                        callback: resolve,
                        onerror: reject
                    });
                });
                
                // INICIALIZAÇÃO CORRIGIDA: Usa API Key se disponível
                await window.gapi.client.init({
                    apiKey: configRef.current.googleApiKey, 
                    discoveryDocs: [DISCOVERY_DOC],
                });
                
                setGapiInited(true);
                console.log("--- DEBUG: GAPI INITED ---");
            }

            if (!tokenClient && configRef.current.googleClientId) {
                const client = window.google.accounts.oauth2.initTokenClient({
                    client_id: configRef.current.googleClientId,
                    scope: SCOPES,
                    callback: async (resp: any) => {
                        if (resp.error) {
                            addLog(`Erro na autenticação: ${resp.error}`, 'erro');
                            return;
                        }
                        
                        // CORREÇÃO CRÍTICA: Define o token no cliente GAPI
                        if (window.gapi.client) {
                            window.gapi.client.setToken(resp);
                            console.log("--- DEBUG: TOKEN SET ON GAPI CLIENT ---");
                        }

                        setIsConnected(true);
                        addLog("Conexão autorizada! Recuperando arquivos...", 'sucesso');
                        
                        // Pequeno delay para garantir propagação do token
                        setTimeout(() => {
                            fetchFilesRef.current(); 
                        }, 500);
                    },
                });
                setTokenClient(client);
                clearInterval(intervalId);
            }
        } catch (error: any) {
            console.error("--- ERRO FATAL GAPI ---", error);
            // Ignora erro de cookie se o resto funcionar
            if (!error?.message?.includes('Cross-Origin-Opener-Policy')) {
                 addLog(`Aviso Google: ${error.message || error}`, 'info');
            }
        }
      }
    };

    intervalId = setInterval(checkAndInitGoogle, 800);
    return () => clearInterval(intervalId);
  }, [gapiInited, tokenClient, config.googleClientId]);

  const fetchFilesRef = useRef(() => {});

  const handleConnectDrive = () => {
    if (!config.googleClientId) {
      addLog("Erro: 'Client ID' do Google não configurado.", 'erro');
      setIsConfigOpen(true);
      return;
    }
    
    if (tokenClient) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    }
  };

  const fetchFiles = useCallback(async () => {
    if (!gapiInited) return; // Removemos check de isConnected aqui pois o token já está setado

    try {
        addLog("Buscando arquivos no Drive...", 'info');
        console.log("--- DEBUG: INICIANDO FETCH FILES ---");
        
        // Query simplificada para garantir resultados
        const query = "trashed = false";

        const response = await window.gapi.client.drive.files.list({
            'pageSize': 50,
            'fields': 'files(id, name, mimeType, modifiedTime, webViewLink)',
            'q': query,
            'supportsAllDrives': true,
            'includeItemsFromAllDrives': true
        });

        console.log("--- DEBUG: RESPOSTA DO DRIVE ---", response);

        const driveFiles = response.result.files;
        
        if (driveFiles && driveFiles.length > 0) {
            setFiles(currentFiles => {
                return driveFiles.map((dFile: any) => {
                    const existing = currentFiles.find(f => f.id === dFile.id);
                    const isWatched = watchedFileIds.includes(dFile.id);
                    
                    let status: DocFile['status'] = 'pendente';
                    
                    if (existing) {
                         if (existing.status === 'sincronizado' && existing.lastSynced) {
                             const modTime = new Date(dFile.modifiedTime).getTime();
                             const syncTime = new Date(existing.lastSynced).getTime();
                             if (modTime > syncTime) {
                                 status = 'pendente'; 
                             } else {
                                 status = 'sincronizado';
                             }
                         } else {
                             status = existing.status;
                         }
                    }

                    return {
                        id: dFile.id,
                        name: dFile.name,
                        mimeType: dFile.mimeType,
                        modifiedTime: dFile.modifiedTime,
                        webViewLink: dFile.webViewLink,
                        status: status,
                        lastSynced: existing?.lastSynced,
                        watched: isWatched
                    } as DocFile;
                });
            });
            addLog(`${driveFiles.length} arquivos encontrados.`, 'info');
        } else {
            console.warn("--- DEBUG: LISTA VAZIA ---", response);
            addLog("Nenhum arquivo encontrado. Verifique se há arquivos na raiz do Drive.", 'info');
        }

    } catch (err: any) {
        console.error("--- DEBUG: ERRO API DRIVE ---", err);
        addLog(`Erro ao listar arquivos: ${err.result?.error?.message || err.message}`, 'erro');
        
        if (err.status === 401 || err.status === 403) {
            setIsConnected(false);
            addLog("Sessão expirada. Por favor conecte novamente.", 'erro');
        }
    }
  }, [gapiInited, watchedFileIds]);

  useEffect(() => {
    fetchFilesRef.current = fetchFiles;
  }, [fetchFiles]);

  const getFileContent = async (fileId: string, mimeType: string): Promise<string> => {
      try {
          if (mimeType.includes('application/vnd.google-apps')) {
              const response = await window.gapi.client.drive.files.export({
                  fileId: fileId,
                  mimeType: 'text/plain'
              });
              return response.body;
          } else {
              const response = await window.gapi.client.drive.files.get({
                  fileId: fileId,
                  alt: 'media'
              });
              return response.body;
          }
      } catch (e: any) {
          console.error("Erro download:", e);
          throw new Error(`Erro ao baixar arquivo: ${e.result?.error?.message || e.message}`);
      }
  };

  const handleSync = async (forceAll: boolean = false) => {
    let targetFiles: DocFile[] = [];

    if (forceAll) {
        targetFiles = files.filter(f => f.status === 'pendente' || f.status === 'erro');
    } else {
        targetFiles = files.filter(f => f.watched && (f.status === 'pendente' || f.status === 'erro'));
    }
    
    if (targetFiles.length === 0) {
        if (forceAll) addLog("Nada novo para sincronizar.", 'info');
        return;
    }

    setIsSyncing(true);
    addLog(`Iniciando sincronização de ${targetFiles.length} arquivos...`, 'info');

    for (const file of targetFiles) {
        setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'sincronizando' } : f));
        
        try {
            const content = await getFileContent(file.id, file.mimeType);

            if (!content || content.length === 0) {
                throw new Error("Conteúdo vazio.");
            }

            let summary = "N/A";
            try {
                // Tenta gerar resumo
                summary = await generateDocumentSummary(content.substring(0, 30000));
            } catch (sumErr) {
                console.warn("Erro resumo:", sumErr);
            }
            
            const enhancedContent = `---
Arquivo: ${file.name}
Fonte: Google Drive
Data: ${file.modifiedTime}
Resumo: ${summary}
---

${content}`;

            const result = await syncFileToDify(enhancedContent, file.name, config);
            
            if (result.success) {
                addLog(`[OK] ${file.name}`, 'sucesso');
                setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'sincronizado', lastSynced: new Date().toISOString() } : f));
            } else {
                throw new Error(result.message);
            }

        } catch (err: any) {
            addLog(`[ERRO] ${file.name}: ${err.message}`, 'erro');
            setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'erro' } : f));
        }
    }

    setIsSyncing(false);
  };

  // Auto-Sync Loop
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (config.autoSync && isConnected) {
        addLog(`Auto-sync ativo. Ciclo: ${config.syncInterval}min`, 'info');
        
        interval = setInterval(() => {
            fetchFiles(); 
            setTimeout(() => handleSync(false), 5000); 
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
                className={`p-2 rounded-full transition relative ${!config.difyApiKey || !config.googleClientId ? 'bg-red-50 text-red-500' : 'text-gray-500 hover:bg-gray-100'}`}
                title="Configurações"
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
            onSyncAll={() => handleSync(true)} // Botão manual força tudo
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
            addLog("Configurações salvas localmente.", 'info');
        }}
      />
    </div>
  );
};

export default App;
