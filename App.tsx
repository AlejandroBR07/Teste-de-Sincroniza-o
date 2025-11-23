
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

const App: React.FC = () => {
  const [config, setConfig] = useState<AppConfig>({
    difyApiKey: DEFAULT_DIFY_API_KEY, 
    difyDatasetId: DEFAULT_DIFY_DATASET_ID,
    difyBaseUrl: DEFAULT_DIFY_BASE_URL,
    googleClientId: '',
    autoSync: false,
    syncInterval: 5
  });

  const [files, setFiles] = useState<DocFile[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [gapiInited, setGapiInited] = useState(false);
  const [gisInited, setGisInited] = useState(false);

  // Helper to add logs
  const addLog = (message: string, type: 'info' | 'sucesso' | 'erro' = 'info') => {
    setLogs(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      message,
      type
    }, ...prev]);
  };

  // 1. Initialize Google API Scripts
  useEffect(() => {
    const initializeGapiClient = async () => {
      try {
        await window.gapi.client.init({
          discoveryDocs: [DISCOVERY_DOC],
        });
        setGapiInited(true);
        addLog("Google API Client inicializado.", 'info');
      } catch (err: any) {
        addLog(`Erro ao inicializar GAPI: ${JSON.stringify(err)}`, 'erro');
      }
    };

    const loadGapi = () => {
        if(window.gapi) {
             window.gapi.load('client', initializeGapiClient);
        } else {
             addLog("Script GAPI não encontrado.", 'erro');
        }
    }

    if (window.gapi) loadGapi();
    
    // Check for GIS
    if (window.google) {
        setGisInited(true);
    }
  }, []);

  // 2. Setup Token Client when config changes
  useEffect(() => {
    if (gisInited && config.googleClientId) {
        try {
            const client = window.google.accounts.oauth2.initTokenClient({
                client_id: config.googleClientId,
                scope: SCOPES,
                callback: async (resp: any) => {
                    if (resp.error) {
                        addLog(`Erro na autenticação: ${resp.error}`, 'erro');
                        return;
                    }
                    setIsConnected(true);
                    addLog("Conexão com Google Drive estabelecida!", 'sucesso');
                    fetchFiles();
                },
            });
            setTokenClient(client);
        } catch (e) {
            console.error(e);
        }
    }
  }, [gisInited, config.googleClientId]);


  const handleConnectDrive = () => {
    if (!config.googleClientId) {
      addLog("Erro: 'Client ID' do Google não configurado. Abra as configurações.", 'erro');
      setIsConfigOpen(true);
      return;
    }
    
    if (tokenClient) {
        // Request Access Token
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        addLog("Cliente de Token ainda não inicializado. Verifique a internet ou o Client ID.", 'erro');
    }
  };

  const fetchFiles = useCallback(async () => {
    if (!gapiInited || !isConnected) return;

    try {
        addLog("Buscando arquivos no Drive...", 'info');
        // Query for Google Docs and Text files, not in trash
        const response = await window.gapi.client.drive.files.list({
            'pageSize': 20,
            'fields': 'files(id, name, mimeType, modifiedTime, webViewLink)',
            'q': "(mimeType = 'application/vnd.google-apps.document' or mimeType = 'text/plain') and trashed = false"
        });

        const driveFiles = response.result.files;
        
        if (driveFiles && driveFiles.length > 0) {
            setFiles(currentFiles => {
                // Merge logic: keep status if ID exists, else add new
                const newFileList = driveFiles.map((dFile: any) => {
                    const existing = currentFiles.find(f => f.id === dFile.id);
                    
                    // Logic to detect change: if modifiedTime on drive > lastSynced on local
                    // Note: We don't have persistent storage in this demo code, 
                    // so on refresh it will always look "pending" unless we saved 'lastSynced' somewhere.
                    // For now, if it exists in state, keep its status, unless modified time changed.
                    
                    let status: DocFile['status'] = 'pendente';
                    
                    if (existing) {
                         if (existing.status === 'sincronizado' && existing.lastSynced) {
                             const modTime = new Date(dFile.modifiedTime).getTime();
                             const syncTime = new Date(existing.lastSynced).getTime();
                             if (modTime > syncTime) {
                                 status = 'pendente'; // Changed remotely
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
                        lastSynced: existing?.lastSynced
                    } as DocFile;
                });
                return newFileList;
            });
            addLog(`${driveFiles.length} documentos encontrados.`, 'info');
        } else {
            addLog("Nenhum documento de texto encontrado na raiz.", 'info');
        }

    } catch (err: any) {
        addLog(`Erro ao listar arquivos: ${err.message || JSON.stringify(err)}`, 'erro');
        if (err.status === 401) {
            setIsConnected(false);
            addLog("Sessão expirada. Conecte novamente.", 'erro');
        }
    }
  }, [gapiInited, isConnected]);

  // Function to download file content
  const getFileContent = async (fileId: string, mimeType: string): Promise<string> => {
      try {
          if (mimeType === 'application/vnd.google-apps.document') {
              // Export Google Doc as text/plain
              const response = await window.gapi.client.drive.files.export({
                  fileId: fileId,
                  mimeType: 'text/plain'
              });
              return response.body;
          } else {
              // Get standard file media
              const response = await window.gapi.client.drive.files.get({
                  fileId: fileId,
                  alt: 'media'
              });
              return response.body;
          }
      } catch (e: any) {
          throw new Error(`Falha ao baixar conteúdo: ${e.message}`);
      }
  };

  const handleSync = async () => {
    const pendingFiles = files.filter(f => f.status === 'pendente' || f.status === 'erro');
    
    if (pendingFiles.length === 0) {
        addLog("Todos os arquivos já estão sincronizados.", 'sucesso');
        return;
    }

    setIsSyncing(true);
    addLog(`Iniciando sincronização de ${pendingFiles.length} arquivos...`, 'info');

    for (const file of pendingFiles) {
        // Update status to syncing
        setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'sincronizando' } : f));
        
        try {
            // 1. Get Content from Real Drive
            addLog(`Baixando conteúdo de '${file.name}'...`, 'info');
            const content = await getFileContent(file.id, file.mimeType);

            if (!content || content.trim().length === 0) {
                throw new Error("Conteúdo do arquivo está vazio.");
            }

            // 2. Gemini Analysis
            addLog(`Gerando metadados com Gemini para '${file.name}'...`, 'info');
            const summary = await generateDocumentSummary(content);
            addLog(`Resumo IA: ${summary}`, 'info');

            // 3. Send to Dify
            addLog(`Enviando '${file.name}' para a Knowledge Base do Dify...`, 'info');
            
            // Enrich content
            const enhancedContent = `---
Arquivo: ${file.name}
Fonte: Google Drive
Resumo Automático: ${summary}
Data Modificação: ${file.modifiedTime}
---

${content}`;

            const result = await syncFileToDify(enhancedContent, file.name, config);
            
            if (result.success) {
                addLog(`Sucesso: '${file.name}' indexado no Dify.`, 'sucesso');
                setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'sincronizado', lastSynced: new Date().toISOString() } : f));
            } else {
                throw new Error(result.message);
            }

        } catch (err: any) {
            addLog(`Falha em '${file.name}': ${err.message}`, 'erro');
            setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'erro' } : f));
        }
    }

    setIsSyncing(false);
    addLog("Ciclo de sincronização finalizado.", 'info');
  };

  // Auto-Sync Effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (config.autoSync && isConnected) {
        addLog(`Auto-sync ativo. Verificando a cada ${config.syncInterval} min.`, 'info');
        interval = setInterval(() => {
            fetchFiles(); // Refresh list first
            setTimeout(() => handleSync(), 5000); // Then sync (delay to allow list update)
        }, config.syncInterval * 60 * 1000); 
    }
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.autoSync, config.syncInterval, isConnected]); // Removed fetchFiles/handleSync to avoid loop issues, trusting closure or refs if needed.


  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center text-white shadow-lg transform transition hover:rotate-3">
                    <i className="fas fa-network-wired"></i>
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-800 tracking-tight leading-tight">DocuSync</h1>
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Drive <i className="fas fa-arrow-right mx-1"></i> Dify</p>
                </div>
            </div>
            
            <button 
                onClick={() => setIsConfigOpen(true)}
                className={`p-2 rounded-full transition relative ${!config.difyApiKey || !config.googleClientId ? 'bg-red-50 text-red-500 animate-pulse' : 'text-gray-500 hover:bg-gray-100'}`}
                title="Configurações"
            >
                <i className="fas fa-cog text-xl"></i>
                {(!config.difyApiKey || !config.googleClientId) && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                )}
            </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6">
        <Dashboard 
            files={files}
            isSyncing={isSyncing}
            isConnected={isConnected}
            onConnectDrive={handleConnectDrive}
            onSyncAll={handleSync}
            logs={logs}
        />
      </main>

      {/* Modals */}
      <ConfigModal 
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={config}
        onSave={(newConfig) => {
            setConfig(newConfig);
            setIsConfigOpen(false);
            addLog("Configurações salvas.", 'info');
        }}
      />
    </div>
  );
};

export default App;
