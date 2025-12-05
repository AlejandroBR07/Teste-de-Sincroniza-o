
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
    switch (status) {
      case 'sincronizado': 
          return (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-md w-fit">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-xs font-semibold text-emerald-700">Sincronizado</span>
            </div>
          );
      case 'sincronizando': 
          return (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 px-2 py-1 rounded-md w-fit">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="text-xs font-semibold text-blue-700">Enviando...</span>
            </div>
          );
      case 'erro': 
          return (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 px-2 py-1 rounded-md w-fit">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-xs font-semibold text-red-700">Falha</span>
            </div>
          );
      case 'pendente': 
          return (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 px-2 py-1 rounded-md w-fit">
                <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                <span className="text-xs font-semibold text-amber-700">Pendente</span>
            </div>
          );
      default: 
          return <span className="text-xs text-gray-400">-</span>;
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      
      {/* TOOLBAR */}
      <div className="flex flex-col lg:flex-row justify-between items-end lg:items-center gap-4">
         <div className="flex items-center gap-4 w-full lg:w-auto flex-1">
             {/* Profile */}
             <div className="relative w-full lg:w-64">
                 <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block tracking-wider">Base de Conhecimento</label>
                 <div className="relative">
                    <select 
                        value={config.activeProfileId}
                        onChange={(e) => onChangeProfile(e.target.value)}
                        className="block w-full pl-3 pr-8 py-2.5 bg-white border border-gray-300 text-gray-800 text-sm font-semibold rounded-lg hover:border-gray-400 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 outline-none transition appearance-none shadow-sm cursor-pointer"
                    >
                        {config.profiles.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                        <i className="fas fa-caret-down text-sm"></i>
                    </div>
                 </div>
             </div>
             
             {/* Search */}
             <div className="relative w-full lg:max-w-md pt-4 lg:pt-5">
                 <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onDeepSearch(searchTerm)}
                    placeholder="Buscar documentos no Drive..."
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 outline-none transition shadow-sm"
                />
                {/* LUPA CENTRALIZADA */}
                <div className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400">
                     <i className="fas fa-search text-sm"></i>
                </div>
                {searchTerm && (
                    <button 
                        onClick={() => onDeepSearch(searchTerm)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded text-xs font-bold uppercase"
                    >
                        Ir
                    </button>
                )}
             </div>
         </div>

         {/* Actions */}
         <div className="flex gap-3 items-end w-full lg:w-auto justify-end">
            {!isConnected ? (
                <button onClick={onConnectDrive} className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-lg shadow-md flex items-center gap-3 transition-all transform active:scale-95">
                    <i className="fab fa-google-drive text-lg"></i>
                    Conectar Google Drive
                </button>
            ) : (
                <>
                    <button 
                        onClick={onSyncAll}
                        disabled={isSyncing}
                        className={`px-5 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wide transition flex items-center gap-2 shadow-sm ${isSyncing ? 'bg-gray-300 cursor-not-allowed text-gray-500' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-300'}`}
                    >
                        {isSyncing ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-sync-alt"></i>}
                        {isSyncing ? 'Enviando...' : `Sincronizar Tudo`}
                    </button>

                    <button 
                        onClick={onOpenConfig}
                        className="h-10 w-10 flex items-center justify-center rounded-lg bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-slate-900 transition shadow-sm"
                        title="Configurações"
                    >
                        <i className="fas fa-cog text-lg"></i>
                    </button>
                    
                    <button 
                        onClick={onDisconnect}
                        className="h-10 w-10 flex items-center justify-center rounded-lg bg-white border border-gray-300 text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition shadow-sm"
                        title="Sair"
                    >
                        <i className="fas fa-sign-out-alt text-lg"></i>
                    </button>
                </>
            )}
         </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
             <div className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                 <i className="fas fa-folder text-gray-400"></i>
                 Arquivos Encontrados ({filteredFiles.length})
             </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-white scrollbar-thin">
            {filteredFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                        <i className="fas fa-search text-2xl text-gray-300"></i>
                    </div>
                    <p className="text-sm font-medium">Nenhum documento listado.</p>
                    <p className="text-xs">Tente buscar por outro termo.</p>
                </div>
            ) : (
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider sticky top-0 z-10 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 text-center w-16">
                                <i className="fas fa-robot" title="Monitoramento Automático"></i>
                            </th>
                            <th className="px-6 py-4">Nome do Arquivo</th>
                            <th className="px-6 py-4 w-48">Modificado em</th>
                            <th className="px-6 py-4 w-40">Status</th>
                            <th className="px-6 py-4 text-right w-32">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                        {filteredFiles.map((file) => (
                        <tr key={file.id} className="hover:bg-gray-50/80 transition duration-150 group">
                            <td className="px-6 py-3.5 text-center">
                                <input 
                                    type="checkbox" 
                                    checked={file.watched} 
                                    onChange={() => onToggleWatch(file.id)}
                                    className="w-5 h-5 text-slate-900 border-gray-300 rounded focus:ring-slate-900 cursor-pointer"
                                />
                            </td>
                            <td className="px-6 py-3.5">
                                <div className="font-semibold text-gray-800 truncate max-w-lg text-sm">{file.name}</div>
                                {file.webViewLink && (
                                    <a href={file.webViewLink} target="_blank" rel="noreferrer" className="text-xs text-indigo-500 hover:text-indigo-700 hover:underline mt-1 inline-flex items-center gap-1">
                                        Abrir no Drive <i className="fas fa-external-link-alt text-[9px]"></i>
                                    </a>
                                )}
                            </td>
                            <td className="px-6 py-3.5 text-sm text-gray-500 font-medium">
                                {new Date(file.modifiedTime).toLocaleDateString()} <span className="text-xs text-gray-400">às {new Date(file.modifiedTime).toLocaleTimeString().slice(0,5)}</span>
                            </td>
                            <td className="px-6 py-3.5 align-middle">
                                {getStatusBadge(file.status)}
                                {file.lastSynced && (
                                    <div className="text-[10px] text-gray-400 mt-1 font-medium">
                                        Último sync: {new Date(file.lastSynced).toLocaleTimeString().slice(0,5)}
                                    </div>
                                )}
                            </td>
                            <td className="px-6 py-3.5 text-right">
                                <button 
                                    onClick={() => onSyncOne(file)}
                                    disabled={file.status === 'sincronizando' || isSyncing}
                                    className="text-slate-600 hover:text-white hover:bg-slate-800 px-4 py-1.5 rounded border border-gray-300 hover:border-slate-800 transition-all text-xs font-bold uppercase tracking-wide bg-white shadow-sm"
                                >
                                    Enviar
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
