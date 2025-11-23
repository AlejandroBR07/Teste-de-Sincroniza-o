
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
  
  // Ref para evitar closures antigos nos intervalos
  const configRef = useRef(config);
  
  // Atualiza a ref sempre que a config mudar
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Helper to add logs
  const addLog = (message: string, type: 'info' | 'sucesso' | 'erro' = 'info') => {
    setLogs(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      message,
      type
    }, ...prev]);
  };

  // 1. Inicialização Robusta do Google (Polling)
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    const checkAndInitGoogle = async () => {
      // Verifica se os scripts globais já existem
      if (window.gapi && window.google && window.google.accounts) {
        
        // Se já inicializou, para o intervalo
        if (gapiInited && tokenClient) {
            clearInterval(intervalId);
            return;
        }

        try {
            // 1. Inicializa GAPI (Drive API)
            if (!gapiInited) {
                await new Promise<void>((resolve, reject) => {
                    window.gapi.load('client', {
                        callback: resolve,
                        onerror: reject
                    });
                });
                
                await window.gapi.client.init({
                    discoveryDocs: [DISCOVERY_DOC],
                });
                setGapiInited(true);
                addLog("Google Drive API pronta.", 'info');
            }

            // 2. Inicializa GIS (Token Client) se tiver Client ID
            // Usamos configRef aqui para pegar o valor mais atual mesmo dentro do intervalo
            if (!tokenClient && configRef.current.googleClientId) {
                const client = window.google.accounts.oauth2.initTokenClient({
                    client_id: configRef.current.googleClientId,
                    scope: SCOPES,
                    callback: async (resp: any) => {
                        if (resp.error) {
                            addLog(`Erro na autenticação: ${resp.error}`, 'erro');
                            return;
                        }
                        setIsConnected(true);
                        addLog("Conexão autorizada com sucesso!", 'sucesso');
                        // Chama fetchFiles direto aqui para garantir
                        fetchFilesRef.current(); 
                    },
                });
                setTokenClient(client);
                addLog("Sistema de Login Google pronto.", 'info');
                clearInterval(intervalId); // Tudo pronto, pode parar de checar
            }
        } catch (error: any) {
            console.error(error);
            // Não loga erro no painel visual para não assustar enquanto carrega
        }
      }
    };

    // Tenta rodar a cada 500ms até conseguir carregar os scripts
    intervalId = setInterval(checkAndInitGoogle, 500);

    return () => clearInterval(intervalId);
  }, [gapiInited, tokenClient, config.googleClientId]); // Re-executa se mudar o ClientID

  // Hack para acessar fetchFiles dentro do callback do google sem problema de dependência cíclica
  const fetchFilesRef = useRef(() => {});

  const handleConnectDrive = () => {
    if (!config.googleClientId) {
      addLog("Erro: 'Client ID' do Google não configurado. Abra as configurações.", 'erro');
      setIsConfigOpen(true);
      return;
    }
    
    if (tokenClient) {
        // Pede o token
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        addLog("Carregando componentes do Google... aguarde 2 segundos e tente novamente.", 'info');
    }
  };

  const fetchFiles = useCallback(async () => {
    if (!gapiInited || !isConnected) return;

    try {
        addLog("Buscando arquivos no Drive...", 'info');
        const response = await window.gapi.client.drive.files.list({
            'pageSize': 20,
            'fields': 'files(id, name, mimeType, modifiedTime, webViewLink)',
            'q': "(mimeType = 'application/vnd.google-apps.document' or mimeType = 'text/plain') and trashed = false"
        });

        const driveFiles = response.result.files;
        
        if (driveFiles && driveFiles.length > 0) {
            setFiles(currentFiles => {
                const newFileList = driveFiles.map((dFile: any) => {
                    const existing = currentFiles.find(f => f.id === dFile.id);
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

  // Atualiza a ref
  useEffect(() => {
    fetchFilesRef.current = fetchFiles;
  }, [fetchFiles]);

  const getFileContent = async (fileId: string, mimeType: string): Promise<string> => {
      try {
          if (mimeType === 'application/vnd.google-apps.document') {
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
        setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'sincronizando' } : f));
        
        try {
            addLog(`Baixando conteúdo de '${file.name}'...`, 'info');
            const content = await getFileContent(file.id, file.mimeType);

            if (!content || content.trim().length === 0) {
                throw new Error("Conteúdo do arquivo está vazio.");
            }

            addLog(`Gerando metadados com Gemini para '${file.name}'...`, 'info');
            const summary = await generateDocumentSummary(content);
            addLog(`Resumo IA: ${summary}`, 'info');

            addLog(`Enviando '${file.name}' para a Knowledge Base do Dify...`, 'info');
            
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
            fetchFiles(); 
            setTimeout(() => handleSync(), 5000); 
        }, config.syncInterval * 60 * 1000); 
    }
    return () => clearInterval(interval);
  }, [config.autoSync, config.syncInterval, isConnected, fetchFiles]); // Added dependencies


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
