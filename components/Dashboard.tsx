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
  onDeepSearch: (term: string) => void; // Busca profunda no Drive API
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

  const activeProfile = config.profiles.find(p => p.id === config.activeProfileId);

  // Filtro local
  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const getStatusBadge = (status: DocFile['status']) => {
    // Adicionado whitespace-nowrap para evitar quebra de linha
    const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full border whitespace-nowrap flex items-center w-fit gap-1";
    
    switch (status) {
      case 'sincronizado': return <span className={`${baseClasses} bg-green-100 text-green-800 border-green-200`}><i className="fas fa-check"></i> Sync</span>;
      case 'sincronizando': return <span className={`${baseClasses} bg-blue-100 text-blue-800 animate-pulse border-blue-200`}><i className="fas fa-spinner fa-spin"></i> Enviando</span>;
      case 'erro': return <span className={`${baseClasses} bg-red-100 text-red-800 border-red-200`}><i className="fas fa-times"></i> Erro</span>;
      case 'pendente': return <span className={`${baseClasses} bg-yellow-100 text-yellow-800 border-yellow-200`}><i className="fas fa-clock"></i> Pendente</span>;
      default: return <span className={`${baseClasses} bg-gray-100 text-gray-500 border-gray-200`}>Não Monitorado</span>;
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <i className="fas fa-file-pdf text-red-500 text-lg"></i>;
    if (mimeType.includes('word') || mimeType.includes('document')) return <i className="fas fa-file-word text-blue-600 text-lg"></i>;
    return <i className="fas fa-file text-gray-400 text-lg"></i>;
  };

  return (
    <div className="flex flex-col h-full gap-6">
      
      {/* Top Bar: Profile & Action */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
         <div className="flex items-center gap-4 w-full md:w-auto">
             <div className="bg-indigo-50 p-2 rounded-lg border border-indigo-100 min-w-[200px]">
                 <label className="text-xs font-bold text-indigo-800 uppercase block mb-1">Agente Ativo (Destino)</label>
                 <select 
                    value={config.activeProfileId}
                    onChange={(e) => onChangeProfile(e.target.value)}
                    className="bg-transparent font-bold text-indigo-700 outline-none w-full cursor-pointer"
                 >
                     {config.profiles.map(p => (
                         <option key={p.id} value={p.id}>{p.name}</option>
                     ))}
                 </select>
             </div>
             
             <div className="h-10 w-px bg-gray-200 mx-2 hidden md:block"></div>

             <div className="relative flex-1 md:w-80">
                 <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
                 <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onDeepSearch(searchTerm)}
                    placeholder="Pesquisar arquivos..."
                    className="w-full pl-10 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                 />
             </div>
         </div>

         <div className="flex gap-2">
            {!isConnected ? (
                <button onClick={onConnectDrive} className="px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-700 font-medium text-sm flex items-center gap-2">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" alt="Drive" className="w-4 h-4"/>
                    Conectar
                </button>
            ) : (
                <>
                    {searchTerm && (
                        <button 
                            onClick={() => onDeepSearch(searchTerm)}
                            className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 font-medium text-sm border border-indigo-200"
                            title="Procurar mais a fundo no Google Drive"
                        >
                            <i className="fas fa-cloud-download-alt mr-2"></i> Buscar no Drive
                        </button>
                    )}
                    <button 
                        onClick={onSyncAll}
                        disabled={isSyncing}
                        className={`px-4 py-2 rounded font-medium text-white text-sm transition flex items-center gap-2 ${isSyncing ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        <i className={`fas fa-sync ${isSyncing ? 'fa-spin' : ''}`}></i>
                        {isSyncing ? 'Sincronizando...' : 'Sync Ativos'}
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
             {isConnected && <span className="text-xs text-green-600 font-medium flex items-center gap-1"><i className="fas fa-wifi"></i> Online</span>}
          </div>
          <div className="flex-1 overflow-y-auto min-h-[300px]">
            {filteredFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <i className="fas fa-search text-4xl mb-3 opacity-30"></i>
                    <p>Nenhum arquivo encontrado.</p>
                    {searchTerm && <button onClick={() => onDeepSearch(searchTerm)} className="mt-4 text-blue-600 hover:underline">Tentar buscar no Drive?</button>}
                </div>
            ) : (
                <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 sticky top-0 z-10 text-xs font-semibold text-gray-500 uppercase">
                    <tr>
                    <th className="p-3 text-center w-14">Monit.</th>
                    <th className="p-3">Nome</th>
                    <th className="p-3 w-32">Status</th>
                    <th className="p-3 text-center w-16">Ação</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                    {filteredFiles.map(file => (
                    <tr key={file.id} className={`hover:bg-gray-50 transition ${file.watched ? 'bg-blue-50/30' : ''}`}>
                        <td className="p-3 text-center align-middle">
                            <label className="relative inline-flex items-center cursor-pointer" title="Ativar monitoramento automático">
                                <input type="checkbox" className="sr-only peer" checked={file.watched} onChange={() => onToggleWatch(file.id)} />
                                <div className={`w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all ${file.watched ? 'peer-checked:bg-blue-600' : ''}`}></div>
                            </label>
                        </td>
                        <td className="p-3">
                            <div className="flex items-center gap-3">
                                <div className="text-gray-500">{getFileIcon(file.mimeType)}</div>
                                <div className="min-w-0">
                                    <div className="font-medium text-gray-800 truncate max-w-xs" title={file.name}>{file.name}</div>
                                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                        <span>{new Date(file.modifiedTime).toLocaleDateString()}</span>
                                        <a href={file.webViewLink} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Abrir <i className="fas fa-external-link-alt"></i></a>
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td className="p-3 align-middle">{getStatusBadge(file.status)}</td>
                        <td className="p-3 text-center align-middle">
                            <button 
                                onClick={() => onSyncOne(file)}
                                disabled={file.status === 'sincronizando' || isSyncing}
                                className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 w-8 h-8 rounded-full transition flex items-center justify-center mx-auto"
                                title="Sincronizar este arquivo agora"
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

        {/* Logs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[400px] lg:h-auto">
          <div className="p-3 border-b border-gray-100 bg-gray-50">
             <h3 className="font-semibold text-gray-700 text-sm"><i className="fas fa-terminal mr-2"></i>Log do Agente: {activeProfile?.name}</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-900 text-green-400 font-mono text-xs">
            {logs.length === 0 ? <p className="opacity-50 italic">Aguardando eventos...</p> : logs.map(log => (
                <div key={log.id} className={`border-l-2 pl-2 ${log.type === 'erro' ? 'border-red-500 text-red-400' : log.type === 'sucesso' ? 'border-green-500 text-green-400' : 'border-blue-500 text-blue-300'}`}>
                    <span className="opacity-50 mr-2">[{log.timestamp.toLocaleTimeString()}]</span>
                    <span>{log.message}</span>
                </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
