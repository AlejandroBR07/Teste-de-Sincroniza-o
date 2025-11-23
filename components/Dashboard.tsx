import React, { useState } from 'react';
import { DocFile, SyncLog, AppConfig } from '../types';

interface DashboardProps {
  files: DocFile[];
  config: AppConfig;
  isSyncing: boolean;
  onSyncAll: () => void;
  onSyncOne: (file: DocFile) => void;
  onConnectDrive: () => void;
  onToggleWatch: (fileId: string) => void;
  onChangeProfile: (profileId: string) => void;
  onDeepSearch: (term: string) => void;
  isConnected: boolean;
  logs: SyncLog[];
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  files, 
  config,
  isSyncing, 
  onSyncAll, 
  onSyncOne,
  onConnectDrive, 
  onToggleWatch,
  onChangeProfile,
  onDeepSearch,
  isConnected,
  logs 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const activeProfile = config.profiles.find(p => p.id === config.activeProfileId);
  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const getStatusBadge = (status: DocFile['status']) => {
    const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full border whitespace-nowrap flex items-center w-fit gap-1";
    switch (status) {
      case 'sincronizado': return <span className={`${baseClasses} bg-green-100 text-green-800 border-green-200`}><i className="fas fa-check"></i> Sync</span>;
      case 'sincronizando': return <span className={`${baseClasses} bg-blue-100 text-blue-800 animate-pulse border-blue-200`}><i className="fas fa-spinner fa-spin"></i> Enviando</span>;
      case 'erro': return <span className={`${baseClasses} bg-red-100 text-red-800 border-red-200`}><i className="fas fa-times"></i> Erro</span>;
      case 'pendente': return <span className={`${baseClasses} bg-yellow-100 text-yellow-800 border-yellow-200`}><i className="fas fa-clock"></i> Pendente</span>;
      default: return <span className={`${baseClasses} bg-gray-100 text-gray-400 border-gray-200 opacity-60`}>Ignorado</span>;
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <i className="fas fa-file-pdf text-red-500 text-lg"></i>;
    if (mimeType.includes('word') || mimeType.includes('document')) return <i className="fas fa-file-word text-blue-600 text-lg"></i>;
    return <i className="fas fa-file text-gray-400 text-lg"></i>;
  };

  return (
    <div className="flex flex-col h-full gap-6 relative">
      
      {/* Modal de Tutorial */}
      {isHelpOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsHelpOpen(false)}>
           <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex justify-between items-center text-white">
                 <h2 className="font-bold text-lg"><i className="fas fa-book-open mr-2"></i> Guia de Configuração</h2>
                 <button onClick={() => setIsHelpOpen(false)}><i className="fas fa-times text-lg"></i></button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[80vh] space-y-6">
                 
                 <div className="space-y-2">
                     <h3 className="font-bold text-gray-800 border-b pb-2">1. Configurar Google Drive (Cloud Console)</h3>
                     <p className="text-sm text-gray-600">Necessário para ler seus arquivos.</p>
                     <ul className="text-sm list-disc pl-5 space-y-1 text-gray-700">
                         <li>Acesse o <a href="https://console.cloud.google.com/" target="_blank" className="text-blue-600 underline">Google Cloud Console</a>.</li>
                         <li>Crie um projeto e vá em <strong>APIs & Services &gt; Enable APIs</strong>.</li>
                         <li>Ative a <strong>"Google Drive API"</strong>.</li>
                         <li>Vá em <strong>Credentials</strong> e crie uma <strong>API Key</strong> (Copie para o campo Google Cloud API Key).</li>
                         <li>Crie um <strong>OAuth 2.0 Client ID</strong> (Web Application).</li>
                         <li>Em "Authorized JavaScript origins", adicione: <code className="bg-gray-100 px-1 rounded">{window.location.origin}</code> (sem barra no final).</li>
                         <li>Copie o Client ID.</li>
                     </ul>
                 </div>

                 <div className="space-y-2">
                     <h3 className="font-bold text-gray-800 border-b pb-2">2. Configurar Dify (IA)</h3>
                     <p className="text-sm text-gray-600">Para onde os arquivos serão enviados.</p>
                     <ul className="text-sm list-disc pl-5 space-y-1 text-gray-700">
                         <li>Acesse seu projeto no Dify.</li>
                         <li>Vá em <strong>Knowledge &gt; API</strong>.</li>
                         <li>Copie a <strong>API Key</strong> e o <strong>API Base URL</strong>.</li>
                         <li>O <strong>Dataset ID</strong> está na URL do seu conhecimento no navegador (ex: datasets/<u>seu-id-aqui</u>/documents).</li>
                     </ul>
                 </div>

                 <div className="space-y-2">
                     <h3 className="font-bold text-gray-800 border-b pb-2 text-red-600">3. Configurar Gemini (Resumos) - ERRO 403?</h3>
                     <p className="text-sm text-gray-600">Se você ver "API Key Leaked" ou erro 403, sua chave foi bloqueada.</p>
                     <ul className="text-sm list-disc pl-5 space-y-1 text-gray-700">
                         <li>Acesse o <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-blue-600 underline">Google AI Studio</a>.</li>
                         <li>Clique em <strong>Create API Key</strong>.</li>
                         <li><strong>IMPORTANTE:</strong> Não compartilhe essa chave. Cole-a nas configurações do App.</li>
                         <li>O erro 403 só desaparece com uma chave NOVA.</li>
                     </ul>
                 </div>
              </div>
              <div className="bg-gray-50 p-4 text-right">
                  <button onClick={() => setIsHelpOpen(false)} className="px-4 py-2 bg-blue-600 text-white rounded font-bold">Entendi</button>
              </div>
           </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
         
         {/* Seletor de IA Melhorado */}
         <div className="flex items-center gap-4 w-full md:w-auto">
             <div className="relative group min-w-[220px]">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <i className="fas fa-robot text-indigo-500"></i>
                 </div>
                 <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                     <i className="fas fa-chevron-down text-gray-400 text-xs"></i>
                 </div>
                 <select 
                    value={config.activeProfileId}
                    onChange={(e) => onChangeProfile(e.target.value)}
                    className="appearance-none block w-full pl-10 pr-8 py-2.5 bg-indigo-50 border border-indigo-100 text-indigo-900 font-bold rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer shadow-sm hover:bg-indigo-100 transition sm:text-sm"
                 >
                     {config.profiles.map(p => (
                         <option key={p.id} value={p.id}>{p.name}</option>
                     ))}
                 </select>
                 <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-semibold text-indigo-600">AGENTE ATIVO</label>
             </div>
             
             <div className="h-8 w-px bg-gray-200 mx-2 hidden md:block"></div>

             <div className="relative flex-1 md:w-64">
                 <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
                 <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onDeepSearch(searchTerm)}
                    placeholder="Filtrar lista..."
                    className="w-full pl-10 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                 />
             </div>
         </div>

         <div className="flex gap-2 items-center">
            <button 
                onClick={() => setIsHelpOpen(true)}
                className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600 flex items-center justify-center transition border border-gray-200"
                title="Tutorial de Configuração"
            >
                <i className="fas fa-question"></i>
            </button>

            {!isConnected ? (
                <button onClick={onConnectDrive} className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-bold text-sm flex items-center gap-2 shadow-sm transition">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" alt="Drive" className="w-5 h-5"/>
                    Conectar Drive
                </button>
            ) : (
                <>
                    {searchTerm && (
                        <button 
                            onClick={() => onDeepSearch(searchTerm)}
                            className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-medium text-sm border border-indigo-200 transition"
                        >
                            <i className="fas fa-cloud-download-alt mr-2"></i> Buscar API
                        </button>
                    )}
                    <button 
                        onClick={onSyncAll}
                        disabled={isSyncing}
                        className={`px-4 py-2 rounded-lg font-bold text-white text-sm transition flex items-center gap-2 shadow-md ${isSyncing ? 'bg-blue-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'}`}
                    >
                        <i className={`fas fa-sync ${isSyncing ? 'fa-spin' : ''}`}></i>
                        {isSyncing ? 'Sincronizando...' : `Sync ${activeProfile?.name}`}
                    </button>
                </>
            )}
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* File List */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
             <h3 className="font-semibold text-gray-700"><i className="fas fa-folder-open mr-2 text-yellow-500"></i>Arquivos ({filteredFiles.length})</h3>
             {isConnected && <span className="text-xs text-green-600 font-medium flex items-center gap-1 bg-green-50 px-2 py-1 rounded-full border border-green-100"><i className="fas fa-circle text-[8px]"></i> Drive Conectado</span>}
          </div>
          <div className="flex-1 overflow-y-auto min-h-[300px]">
            {filteredFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <i className="fas fa-search text-4xl mb-3 opacity-20"></i>
                    <p>Nenhum arquivo listado.</p>
                    {isConnected && <p className="text-xs mt-2 opacity-70">Use a busca acima para encontrar no Drive.</p>}
                </div>
            ) : (
                <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 sticky top-0 z-10 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <tr>
                    <th className="p-3 text-center w-16">Monitorar</th>
                    <th className="p-3">Arquivo</th>
                    <th className="p-3 w-32">Estado</th>
                    <th className="p-3 text-center w-16">Sync</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                    {filteredFiles.map(file => (
                    <tr key={file.id} className={`hover:bg-gray-50 transition duration-150 ${file.watched ? 'bg-blue-50/40' : ''}`}>
                        <td className="p-3 text-center align-middle">
                            {/* Toggle Estilo iOS */}
                            <label className="relative inline-flex items-center cursor-pointer group">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={file.watched} 
                                    onChange={() => onToggleWatch(file.id)} 
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                            </label>
                        </td>
                        <td className="p-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                                    {getFileIcon(file.mimeType)}
                                </div>
                                <div className="min-w-0">
                                    <div className="font-semibold text-gray-700 truncate max-w-xs mb-0.5">{file.name}</div>
                                    <div className="flex items-center gap-2 text-[11px] text-gray-400">
                                        <span><i className="far fa-clock mr-1"></i>{new Date(file.modifiedTime).toLocaleDateString()}</span>
                                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                        <a href={file.webViewLink} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700 hover:underline">Abrir Link</a>
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td className="p-3 align-middle">{getStatusBadge(file.status)}</td>
                        <td className="p-3 text-center align-middle">
                            <button 
                                onClick={() => onSyncOne(file)}
                                disabled={file.status === 'sincronizando' || isSyncing}
                                className="text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 w-9 h-9 rounded-full transition flex items-center justify-center mx-auto border border-transparent hover:border-yellow-200"
                                title="Forçar sincronização individual"
                            >
                                <i className="fas fa-bolt"></i>
                            </button>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            )}
          </div>
        </div>

        {/* Logs Area */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[400px] lg:h-auto">
          <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
             <h3 className="font-semibold text-gray-700 text-sm"><i className="fas fa-terminal mr-2 text-gray-400"></i>Terminal de Logs</h3>
             <button onClick={() => logs.length = 0} className="text-xs font-bold text-gray-400 hover:text-red-500 uppercase tracking-wide">Limpar</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#1e1e1e] text-gray-300 font-mono text-xs shadow-inner">
            {logs.length === 0 ? <div className="h-full flex items-center justify-center opacity-30">Aguardando operações...</div> : logs.map(log => (
                <div key={log.id} className={`flex gap-2 ${log.type === 'erro' ? 'text-red-400' : log.type === 'sucesso' ? 'text-green-400' : 'text-blue-300'}`}>
                    <span className="opacity-50 select-none">[{log.timestamp.toLocaleTimeString()}]</span>
                    <span className="break-words">{log.message}</span>
                </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
