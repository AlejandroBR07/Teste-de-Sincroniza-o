
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

  const activeProfile = config.profiles.find(p => p.id === config.activeProfileId);
  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const getStatusBadge = (status: DocFile['status']) => {
    const baseClasses = "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border flex items-center w-fit gap-1.5 shadow-sm";
    switch (status) {
      case 'sincronizado': return <span className={`${baseClasses} bg-emerald-50 text-emerald-700 border-emerald-200`}><i className="fas fa-check-circle"></i> Sync</span>;
      case 'sincronizando': return <span className={`${baseClasses} bg-indigo-50 text-indigo-700 animate-pulse border-indigo-200`}><i className="fas fa-spinner fa-spin"></i> Enviando...</span>;
      case 'erro': return <span className={`${baseClasses} bg-rose-50 text-rose-700 border-rose-200`}><i className="fas fa-times-circle"></i> Erro</span>;
      case 'pendente': return <span className={`${baseClasses} bg-amber-50 text-amber-700 border-amber-200`}><i className="fas fa-exclamation-circle"></i> Pendente</span>;
      default: return <span className={`${baseClasses} bg-slate-50 text-slate-400 border-slate-200`}>Ignorado</span>;
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <i className="fas fa-file-pdf text-rose-500 text-xl"></i>;
    if (mimeType.includes('word') || mimeType.includes('document')) return <i className="fas fa-file-word text-blue-600 text-xl"></i>;
    if (mimeType.includes('spreadsheet') || mimeType.includes('sheet')) return <i className="fas fa-file-excel text-emerald-600 text-xl"></i>;
    return <i className="fas fa-file-alt text-slate-400 text-xl"></i>;
  };

  return (
    <div className="flex flex-col h-full gap-6">
      
      {/* Header Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col lg:flex-row justify-between items-center gap-4">
         
         <div className="flex items-center gap-4 w-full lg:w-auto">
             {/* Profile Selector */}
             <div className="relative group min-w-[240px]">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <i className="fas fa-robot text-indigo-500"></i>
                 </div>
                 <select 
                    value={config.activeProfileId}
                    onChange={(e) => onChangeProfile(e.target.value)}
                    className="appearance-none block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer hover:bg-slate-100 transition text-sm"
                 >
                     {config.profiles.map(p => (
                         <option key={p.id} value={p.id}>{p.name}</option>
                     ))}
                 </select>
                 <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                     <i className="fas fa-chevron-down text-slate-400 text-xs"></i>
                 </div>
                 <label className="absolute -top-2.5 left-3 bg-white px-1 text-[10px] font-bold text-indigo-500 tracking-wider">AGENTE ATIVO</label>
             </div>
             
             <div className="h-8 w-px bg-slate-200 mx-2 hidden lg:block"></div>

             {/* Search */}
             <div className="relative flex-1 lg:w-72">
                 <i className="fas fa-search absolute left-3 top-3.5 text-slate-400 text-sm"></i>
                 <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onDeepSearch(searchTerm)}
                    placeholder="Filtrar ou buscar no Drive..."
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition text-sm"
                 />
             </div>
             
             {searchTerm && isConnected && (
                <button 
                    onClick={() => onDeepSearch(searchTerm)}
                    className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition border border-indigo-100"
                    title="Buscar na API do Drive"
                >
                    <i className="fas fa-cloud-download-alt"></i>
                </button>
            )}
         </div>

         {/* Actions & User Profile */}
         <div className="flex gap-3 items-center w-full lg:w-auto justify-end">
            
            {!isConnected ? (
                <button onClick={onConnectDrive} className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 font-bold text-sm flex items-center gap-2 shadow-sm transition hover:shadow">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" alt="Drive" className="w-5 h-5"/>
                    Conectar Drive
                </button>
            ) : (
                <>
                    <button 
                        onClick={onSyncAll}
                        disabled={isSyncing}
                        className={`px-5 py-2.5 rounded-xl font-bold text-white text-sm transition flex items-center gap-2 shadow-lg shadow-indigo-200 ${isSyncing ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-0.5 transform'}`}
                    >
                        <i className={`fas fa-sync-alt ${isSyncing ? 'fa-spin' : ''}`}></i>
                        {isSyncing ? 'Sincronizando...' : `Sync Tudo`}
                    </button>

                    <div className="h-8 w-px bg-slate-200 mx-1"></div>

                    {/* User Menu */}
                    <div className="flex items-center gap-3 bg-slate-50 py-1.5 px-3 rounded-full border border-slate-200">
                        {user?.picture ? (
                            <img src={user.picture} alt="Avatar" className="w-8 h-8 rounded-full border border-white shadow-sm" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                {user?.name?.charAt(0) || 'U'}
                            </div>
                        )}
                        <div className="flex flex-col hidden md:flex">
                            <span className="text-[10px] text-slate-500 font-bold uppercase leading-none">Logado como</span>
                            <span className="text-xs font-semibold text-slate-700 leading-tight max-w-[100px] truncate" title={user?.email}>{user?.name}</span>
                        </div>
                        <button 
                            onClick={onDisconnect}
                            className="ml-2 w-7 h-7 flex items-center justify-center rounded-full bg-white text-rose-500 hover:bg-rose-50 border border-slate-200 transition"
                            title="Desconectar conta"
                        >
                            <i className="fas fa-sign-out-alt text-xs"></i>
                        </button>
                    </div>

                    <button 
                        onClick={onOpenConfig}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 text-white hover:bg-slate-900 transition shadow-lg shadow-slate-300"
                        title="Configurações"
                    >
                        <i className="fas fa-cog"></i>
                    </button>
                </>
            )}
         </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center backdrop-blur-sm">
             <h3 className="font-bold text-slate-700 flex items-center gap-2">
                 <i className="fas fa-folder-open text-indigo-500"></i>
                 Arquivos Disponíveis
                 <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full">{filteredFiles.length}</span>
             </h3>
             <div className="text-xs text-slate-400 font-medium">
                {files.filter(f => f.status === 'sincronizado').length} sincronizados de {files.length}
             </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 min-h-[400px]">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <i className="fas fa-search text-3xl opacity-20"></i>
                    </div>
                    <p className="font-medium text-slate-500">Nenhum documento encontrado.</p>
                    {isConnected ? 
                        <p className="text-xs mt-2 opacity-70 max-w-xs text-center">Use a busca acima para encontrar arquivos no seu Google Drive.</p> :
                        <p className="text-xs mt-2 opacity-70">Conecte seu Google Drive para começar.</p>
                    }
                </div>
            ) : (
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 sticky top-0 z-10 text-xs font-bold text-slate-500 uppercase tracking-wider shadow-sm">
                        <tr>
                            <th className="p-4 text-center w-20">Sync Auto</th>
                            <th className="p-4">Documento</th>
                            <th className="p-4 w-40">Status Dify</th>
                            <th className="p-4 text-center w-20">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {filteredFiles.map(file => (
                        <tr key={file.id} className={`hover:bg-indigo-50/30 transition duration-150 group ${file.watched ? 'bg-indigo-50/10' : ''}`}>
                            <td className="p-4 text-center align-middle">
                                {/* Toggle Moderno */}
                                <label className="relative inline-flex items-center cursor-pointer justify-center" title={file.watched ? "Parar sync automático" : "Ativar sync automático"}>
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={file.watched} 
                                        onChange={() => onToggleWatch(file.id)} 
                                    />
                                    <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[calc(50%-18px)] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:border-transparent shadow-inner"></div>
                                </label>
                            </td>
                            <td className="p-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition">
                                        {getFileIcon(file.mimeType)}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-bold text-slate-700 truncate max-w-md text-base">{file.name}</div>
                                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                            <span title="Última modificação no Drive"><i className="far fa-clock mr-1"></i>{new Date(file.modifiedTime).toLocaleDateString()}</span>
                                            {file.webViewLink && (
                                                <a href={file.webViewLink} target="_blank" rel="noreferrer" className="text-indigo-500 hover:text-indigo-700 hover:underline font-medium flex items-center gap-1">
                                                    <i className="fas fa-external-link-alt"></i> Abrir no Drive
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="p-4 align-middle">
                                {getStatusBadge(file.status)}
                                {file.lastSynced && (
                                    <div className="text-[10px] text-slate-400 mt-1 ml-1">
                                        Último: {new Date(file.lastSynced).toLocaleTimeString().slice(0,5)}
                                    </div>
                                )}
                            </td>
                            <td className="p-4 text-center align-middle">
                                <button 
                                    onClick={() => onSyncOne(file)}
                                    disabled={file.status === 'sincronizando' || isSyncing}
                                    className="group/btn relative inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition shadow-sm"
                                    title="Forçar sincronização agora"
                                >
                                    <i className={`fas fa-bolt ${file.status === 'sincronizando' ? 'animate-pulse text-indigo-400' : ''}`}></i>
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
