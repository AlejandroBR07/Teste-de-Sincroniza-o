
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
    // Badges estilo "Pill" moderno
    const baseClasses = "px-2.5 py-0.5 text-[10px] font-semibold rounded-full border";
    switch (status) {
      case 'sincronizado': return <span className={`${baseClasses} bg-green-50 text-green-700 border-green-200`}>Sincronizado</span>;
      case 'sincronizando': return <span className={`${baseClasses} bg-indigo-50 text-indigo-700 border-indigo-200 flex items-center gap-1 w-fit`}><i className="fas fa-circle-notch fa-spin text-[8px]"></i> Enviando</span>;
      case 'erro': return <span className={`${baseClasses} bg-red-50 text-red-700 border-red-200`}>Falha</span>;
      case 'pendente': return <span className={`${baseClasses} bg-amber-50 text-amber-700 border-amber-200`}>Pendente</span>;
      default: return <span className={`${baseClasses} bg-gray-50 text-gray-400 border-gray-200`}>—</span>;
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <i className="fas fa-file-pdf text-rose-500 text-lg"></i>;
    if (mimeType.includes('word') || mimeType.includes('document')) return <i className="fas fa-file-word text-blue-500 text-lg"></i>;
    if (mimeType.includes('spreadsheet') || mimeType.includes('sheet')) return <i className="fas fa-file-excel text-emerald-500 text-lg"></i>;
    return <i className="fas fa-file-alt text-gray-400 text-lg"></i>;
  };

  return (
    <div className="flex flex-col h-full gap-6">
      
      {/* HEADER / TOOLBAR */}
      <div className="flex flex-col lg:flex-row justify-between items-end lg:items-center gap-4">
         <div className="flex items-center gap-4 w-full lg:w-auto flex-1">
             {/* Profile Selector */}
             <div className="relative group w-full lg:w-64">
                 <div className="absolute -top-2.5 left-2 bg-gray-50 px-1 text-[10px] font-bold text-gray-500 uppercase tracking-wide z-10">Base de Conhecimento</div>
                 <div className="relative">
                    <select 
                        value={config.activeProfileId}
                        onChange={(e) => onChangeProfile(e.target.value)}
                        className="block w-full pl-3 pr-10 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:border-gray-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition appearance-none shadow-sm"
                    >
                        {config.profiles.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                        <i className="fas fa-chevron-down text-xs"></i>
                    </div>
                 </div>
             </div>
             
             {/* Search */}
             <div className="relative w-full lg:max-w-md">
                 <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onDeepSearch(searchTerm)}
                    placeholder="Buscar arquivos no Drive..."
                    className="w-full pl-10 pr-12 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition shadow-sm"
                />
                <div className="absolute left-3.5 top-3 text-gray-400">
                     <i className="fas fa-search text-sm"></i>
                </div>
                <button 
                    onClick={() => onDeepSearch(searchTerm)}
                    className="absolute right-2 top-1.5 py-1 px-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-xs font-bold transition"
                >
                    Ir
                </button>
             </div>
         </div>

         {/* Actions */}
         <div className="flex gap-3 items-center w-full lg:w-auto justify-end">
            {!isConnected ? (
                <button onClick={onConnectDrive} className="px-5 py-2.5 bg-black hover:bg-gray-800 text-white font-medium text-sm rounded-lg flex items-center gap-2 transition shadow-lg shadow-gray-200">
                    <i className="fab fa-google-drive"></i>
                    Conectar Google Drive
                </button>
            ) : (
                <>
                    <button 
                        onClick={onSyncAll}
                        disabled={isSyncing}
                        className={`px-5 py-2.5 rounded-lg font-medium text-white text-sm transition flex items-center gap-2 shadow-md ${isSyncing ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}
                    >
                        {isSyncing ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-sync-alt"></i>}
                        {isSyncing ? 'Sincronizando...' : `Sincronizar Tudo`}
                    </button>

                    <button 
                        onClick={onOpenConfig}
                        className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition shadow-sm"
                        title="Configurações"
                    >
                        <i className="fas fa-cog"></i>
                    </button>
                    
                    <button 
                        onClick={onDisconnect}
                        className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-gray-300 text-gray-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition shadow-sm"
                        title="Desconectar"
                    >
                        <i className="fas fa-sign-out-alt"></i>
                    </button>
                </>
            )}
         </div>
      </div>

      {/* TABLE CARD */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
             <div className="flex items-center gap-2">
                 <h2 className="text-sm font-bold text-gray-800">Arquivos Encontrados</h2>
                 <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{filteredFiles.length}</span>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-white scrollbar-thin scrollbar-thumb-gray-200">
            {filteredFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-300 min-h-[300px]">
                    <div className="bg-gray-50 p-6 rounded-full mb-4">
                        <i className="fas fa-folder-open text-3xl text-gray-300"></i>
                    </div>
                    <p className="font-medium text-gray-500">Nenhum arquivo para exibir.</p>
                    <p className="text-sm text-gray-400 mt-1">Use a busca acima para encontrar documentos.</p>
                </div>
            ) : (
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-3 text-center w-16">Auto</th>
                            <th className="px-6 py-3 w-16 text-center">Tipo</th>
                            <th className="px-6 py-3">Nome do Arquivo</th>
                            <th className="px-6 py-3 w-40">Status</th>
                            <th className="px-6 py-3 text-right w-28">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm">
                        {filteredFiles.map((file) => (
                        <tr key={file.id} className="hover:bg-gray-50 transition duration-150 group">
                            <td className="px-6 py-3 text-center">
                                <input 
                                    type="checkbox" 
                                    checked={file.watched} 
                                    onChange={() => onToggleWatch(file.id)}
                                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                />
                            </td>
                            <td className="px-6 py-3 text-center opacity-80">
                                {getFileIcon(file.mimeType)}
                            </td>
                            <td className="px-6 py-3">
                                <div className="font-medium text-gray-900 truncate max-w-lg">{file.name}</div>
                                <div className="text-xs text-gray-400 mt-1 flex items-center gap-3">
                                    <span>{new Date(file.modifiedTime).toLocaleDateString()}</span>
                                    {file.webViewLink && (
                                        <a href={file.webViewLink} target="_blank" rel="noreferrer" className="text-indigo-500 hover:text-indigo-700 hover:underline flex items-center gap-1">
                                           Abrir <i className="fas fa-external-link-alt text-[9px]"></i>
                                        </a>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-3 align-middle">
                                {getStatusBadge(file.status)}
                                {file.lastSynced && (
                                    <div className="text-[10px] text-gray-400 mt-1 font-medium">
                                        {new Date(file.lastSynced).toLocaleTimeString().slice(0,5)}
                                    </div>
                                )}
                            </td>
                            <td className="px-6 py-3 text-right">
                                <button 
                                    onClick={() => onSyncOne(file)}
                                    disabled={file.status === 'sincronizando' || isSyncing}
                                    className="text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-md border border-transparent hover:border-indigo-100 transition text-xs font-bold uppercase tracking-wide"
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
