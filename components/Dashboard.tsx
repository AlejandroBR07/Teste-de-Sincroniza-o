
import React, { useState } from 'react';
import { DocFile, AppConfig, UserProfile } from '../types';

interface DashboardProps {
  files: DocFile[];
  config: AppConfig;
  user: UserProfile | null;
  isSyncing: boolean;
  isConnected: boolean;
  onSyncAll: () => void;
  onSyncOne: (file: DocFile) => void;
  onConnectDrive: () => void;
  onDisconnect: () => void;
  onToggleWatch: (fileId: string) => void;
  onChangeProfile: (profileId: string) => void;
  onDeepSearch: (term: string) => void;
  onOpenConfig: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  files, 
  config,
  user,
  isSyncing, 
  onSyncAll, 
  onSyncOne,
  onConnectDrive,
  onDisconnect, 
  onToggleWatch,
  onChangeProfile,
  onDeepSearch,
  onOpenConfig,
  isConnected
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const getStatusBadge = (status: DocFile['status']) => {
    const baseClasses = "px-2 py-0.5 text-xs font-semibold uppercase tracking-wide rounded border";
    switch (status) {
      case 'sincronizado': return <span className={`${baseClasses} bg-emerald-100 text-emerald-800 border-emerald-200`}>Sync OK</span>;
      case 'sincronizando': return <span className={`${baseClasses} bg-blue-100 text-blue-800 border-blue-200 flex items-center gap-2`}><i className="fas fa-spinner fa-spin"></i> Enviando</span>;
      case 'erro': return <span className={`${baseClasses} bg-red-100 text-red-800 border-red-200`}>Falha</span>;
      case 'pendente': return <span className={`${baseClasses} bg-amber-100 text-amber-800 border-amber-200`}>Pendente</span>;
      default: return <span className={`${baseClasses} bg-gray-100 text-gray-500 border-gray-200`}>-</span>;
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <i className="fas fa-file-pdf text-red-600 text-lg"></i>;
    if (mimeType.includes('word') || mimeType.includes('document')) return <i className="fas fa-file-word text-blue-600 text-lg"></i>;
    if (mimeType.includes('spreadsheet') || mimeType.includes('sheet')) return <i className="fas fa-file-excel text-emerald-600 text-lg"></i>;
    return <i className="fas fa-file-alt text-gray-500 text-lg"></i>;
  };

  return (
    <div className="flex flex-col h-full gap-4">
      
      {/* Control Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-col lg:flex-row justify-between items-center gap-4">
         
         <div className="flex items-center gap-3 w-full lg:w-auto">
             {/* Profile Selector */}
             <div className="relative w-full lg:w-64">
                 <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Base de Conhecimento</label>
                 <select 
                    value={config.activeProfileId}
                    onChange={(e) => onChangeProfile(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-md focus:ring-1 focus:ring-slate-500 focus:border-slate-500 outline-none"
                 >
                     {config.profiles.map(p => (
                         <option key={p.id} value={p.id}>{p.name}</option>
                     ))}
                 </select>
             </div>
             
             {/* Search */}
             <div className="flex-1 w-full lg:w-80">
                 <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Buscar Arquivos</label>
                 <div className="relative">
                    <input 
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onDeepSearch(searchTerm)}
                        placeholder="Nome do arquivo..."
                        className="w-full pl-3 pr-10 py-2 bg-white border border-slate-300 rounded-md text-sm focus:ring-1 focus:ring-slate-500 outline-none"
                    />
                    <button 
                        onClick={() => onDeepSearch(searchTerm)}
                        className="absolute right-1 top-1 p-1 text-slate-400 hover:text-slate-600"
                    >
                        <i className="fas fa-search"></i>
                    </button>
                 </div>
             </div>
         </div>

         {/* Actions */}
         <div className="flex gap-2 items-end w-full lg:w-auto justify-end h-full pt-5">
            
            {!isConnected ? (
                <button onClick={onConnectDrive} className="px-4 py-2 bg-white border border-slate-300 rounded-md hover:bg-slate-50 text-slate-700 font-medium text-sm flex items-center gap-2 transition shadow-sm">
                    <i className="fab fa-google-drive text-slate-500"></i>
                    Conectar Drive
                </button>
            ) : (
                <>
                    <button 
                        onClick={onSyncAll}
                        disabled={isSyncing}
                        className={`px-4 py-2 rounded-md font-medium text-white text-sm transition flex items-center gap-2 shadow-sm ${isSyncing ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-900'}`}
                    >
                        <i className={`fas fa-sync ${isSyncing ? 'fa-spin' : ''}`}></i>
                        {isSyncing ? 'Processando...' : `Sync All`}
                    </button>

                    <button 
                        onClick={onOpenConfig}
                        className="w-9 h-9 flex items-center justify-center rounded-md bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 transition"
                        title="Configurações"
                    >
                        <i className="fas fa-cog"></i>
                    </button>
                    
                    <button 
                        onClick={onDisconnect}
                        className="w-9 h-9 flex items-center justify-center rounded-md bg-white border border-slate-300 text-red-600 hover:bg-red-50 transition"
                        title="Sair"
                    >
                        <i className="fas fa-sign-out-alt"></i>
                    </button>
                </>
            )}
         </div>
      </div>

      {/* Main Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="p-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
             <div className="text-sm font-semibold text-slate-700">
                 Arquivos Listados
             </div>
             <div className="text-xs text-slate-500">
                Total: {filteredFiles.length}
             </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 min-h-[400px]">
                    <i className="fas fa-folder-open text-4xl mb-3 text-slate-300"></i>
                    <p className="font-medium text-slate-500">Nenhum arquivo encontrado.</p>
                </div>
            ) : (
                <table className="w-full text-left border-collapse">
                    <thead className="bg-white text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                            <th className="p-3 text-center w-16 border-r border-slate-100 bg-slate-50">Auto</th>
                            <th className="p-3 w-16 text-center bg-slate-50">Tipo</th>
                            <th className="p-3 bg-slate-50">Nome do Arquivo</th>
                            <th className="p-3 w-40 bg-slate-50">Status</th>
                            <th className="p-3 text-right w-24 bg-slate-50">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {filteredFiles.map((file, idx) => (
                        <tr key={file.id} className={`hover:bg-slate-50 transition duration-75 group ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                            <td className="p-3 text-center border-r border-slate-100">
                                <input 
                                    type="checkbox" 
                                    checked={file.watched} 
                                    onChange={() => onToggleWatch(file.id)}
                                    className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-500 cursor-pointer"
                                    title="Monitoramento Automático"
                                />
                            </td>
                            <td className="p-3 text-center text-slate-400">
                                {getFileIcon(file.mimeType)}
                            </td>
                            <td className="p-3">
                                <div className="font-medium text-slate-800 truncate max-w-lg">{file.name}</div>
                                <div className="text-xs text-slate-400 mt-0.5 flex gap-2">
                                    <span>{new Date(file.modifiedTime).toLocaleDateString()}</span>
                                    {file.webViewLink && (
                                        <a href={file.webViewLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                                           Abrir
                                        </a>
                                    )}
                                </div>
                            </td>
                            <td className="p-3 align-middle">
                                {getStatusBadge(file.status)}
                                {file.lastSynced && (
                                    <div className="text-[10px] text-slate-400 mt-1">
                                        {new Date(file.lastSynced).toLocaleTimeString().slice(0,5)}
                                    </div>
                                )}
                            </td>
                            <td className="p-3 text-right">
                                <button 
                                    onClick={() => onSyncOne(file)}
                                    disabled={file.status === 'sincronizando' || isSyncing}
                                    className="text-slate-400 hover:text-slate-800 px-3 py-1 rounded border border-transparent hover:border-slate-200 hover:bg-white transition text-xs font-bold uppercase"
                                >
                                    Sync
                                </button>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                </table>
            )}
          </div>
      </div>
    </div>
  );
};
