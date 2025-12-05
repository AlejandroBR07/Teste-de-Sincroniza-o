
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
    // Badges mais discretos e profissionais
    const baseClasses = "px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-sm border";
    switch (status) {
      case 'sincronizado': return <span className={`${baseClasses} bg-emerald-50 text-emerald-700 border-emerald-200`}>Synced</span>;
      case 'sincronizando': return <span className={`${baseClasses} bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1 w-fit`}><i className="fas fa-circle-notch fa-spin text-[8px]"></i> Sending</span>;
      case 'erro': return <span className={`${baseClasses} bg-red-50 text-red-700 border-red-200`}>Failed</span>;
      case 'pendente': return <span className={`${baseClasses} bg-amber-50 text-amber-700 border-amber-200`}>Pending</span>;
      default: return <span className={`${baseClasses} bg-slate-50 text-slate-400 border-slate-200`}>-</span>;
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <i className="fas fa-file-pdf text-rose-500 text-base"></i>;
    if (mimeType.includes('word') || mimeType.includes('document')) return <i className="fas fa-file-word text-blue-500 text-base"></i>;
    if (mimeType.includes('spreadsheet') || mimeType.includes('sheet')) return <i className="fas fa-file-excel text-emerald-500 text-base"></i>;
    return <i className="fas fa-file-alt text-slate-400 text-base"></i>;
  };

  return (
    <div className="flex flex-col h-full gap-4">
      
      {/* TOOLBAR */}
      <div className="bg-white p-3 rounded-md shadow-sm border border-slate-200 flex flex-col lg:flex-row justify-between items-end lg:items-center gap-4">
         
         <div className="flex items-center gap-3 w-full lg:w-auto flex-1">
             {/* Profile */}
             <div className="relative w-full lg:w-64">
                 <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Target Knowledge Base</label>
                 <div className="relative">
                    <select 
                        value={config.activeProfileId}
                        onChange={(e) => onChangeProfile(e.target.value)}
                        className="block w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-sm focus:ring-1 focus:ring-slate-800 focus:border-slate-800 outline-none appearance-none"
                    >
                        {config.profiles.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                        <i className="fas fa-chevron-down text-xs"></i>
                    </div>
                 </div>
             </div>
             
             {/* Search */}
             <div className="flex-1 w-full lg:max-w-md">
                 <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Search Drive</label>
                 <div className="relative group">
                    <input 
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onDeepSearch(searchTerm)}
                        placeholder="Filename..."
                        className="w-full pl-8 pr-10 py-2 bg-white border border-slate-300 rounded-sm text-xs font-medium focus:ring-1 focus:ring-slate-800 outline-none transition"
                    />
                    <div className="absolute left-2.5 top-2 text-slate-400">
                         <i className="fas fa-search text-xs"></i>
                    </div>
                    <button 
                        onClick={() => onDeepSearch(searchTerm)}
                        className="absolute right-1 top-1 py-1 px-2 text-slate-400 hover:text-slate-800 text-xs font-bold uppercase"
                    >
                        Go
                    </button>
                 </div>
             </div>
         </div>

         {/* Right Actions */}
         <div className="flex gap-2 items-center w-full lg:w-auto justify-end">
            
            {!isConnected ? (
                <button onClick={onConnectDrive} className="px-4 py-2 bg-slate-800 border border-transparent rounded-sm hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-2 transition shadow-sm uppercase tracking-wide">
                    <i className="fab fa-google-drive"></i>
                    Connect Drive
                </button>
            ) : (
                <>
                    <button 
                        onClick={onSyncAll}
                        disabled={isSyncing}
                        className={`px-4 py-2 rounded-sm font-bold text-white text-xs uppercase tracking-wide transition flex items-center gap-2 shadow-sm ${isSyncing ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                    >
                        <i className={`fas fa-sync ${isSyncing ? 'fa-spin' : ''}`}></i>
                        {isSyncing ? 'Syncing...' : `Sync All`}
                    </button>

                    <div className="h-6 w-px bg-slate-300 mx-1"></div>

                    <button 
                        onClick={onOpenConfig}
                        className="w-8 h-8 flex items-center justify-center rounded-sm bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                        title="Settings"
                    >
                        <i className="fas fa-cog"></i>
                    </button>
                    
                    <button 
                        onClick={onDisconnect}
                        className="w-8 h-8 flex items-center justify-center rounded-sm bg-white border border-slate-300 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        title="Logout"
                    >
                        <i className="fas fa-power-off"></i>
                    </button>
                </>
            )}
         </div>
      </div>

      {/* DATA GRID */}
      <div className="bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
             <div className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                 Document Queue
             </div>
             <div className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                COUNT: {filteredFiles.length}
             </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-white scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            {filteredFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-300 min-h-[300px]">
                    <i className="fas fa-inbox text-5xl mb-3 opacity-20"></i>
                    <p className="font-medium text-slate-400 text-sm">No documents found.</p>
                </div>
            ) : (
                <table className="w-full text-left border-collapse">
                    <thead className="bg-white text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-4 py-3 text-center w-12 bg-slate-50 border-r border-slate-100">Watch</th>
                            <th className="px-4 py-3 w-12 text-center bg-slate-50">Fmt</th>
                            <th className="px-4 py-3 bg-slate-50">Document Name</th>
                            <th className="px-4 py-3 w-32 bg-slate-50">Status</th>
                            <th className="px-4 py-3 text-right w-24 bg-slate-50">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredFiles.map((file, idx) => (
                        <tr key={file.id} className={`hover:bg-slate-50 transition duration-75 group ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}`}>
                            <td className="px-4 py-2 text-center border-r border-slate-100">
                                <input 
                                    type="checkbox" 
                                    checked={file.watched} 
                                    onChange={() => onToggleWatch(file.id)}
                                    className="w-3.5 h-3.5 text-slate-800 border-slate-300 rounded-sm focus:ring-0 focus:ring-offset-0 cursor-pointer accent-slate-800"
                                />
                            </td>
                            <td className="px-4 py-2 text-center opacity-70">
                                {getFileIcon(file.mimeType)}
                            </td>
                            <td className="px-4 py-2">
                                <div className="font-semibold text-slate-700 truncate max-w-lg">{file.name}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5 flex gap-3 font-mono">
                                    <span>{new Date(file.modifiedTime).toISOString().split('T')[0]}</span>
                                    {file.webViewLink && (
                                        <a href={file.webViewLink} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline hover:text-indigo-800">
                                           OPEN LINK <i className="fas fa-external-link-alt text-[8px] ml-0.5"></i>
                                        </a>
                                    )}
                                </div>
                            </td>
                            <td className="px-4 py-2 align-middle">
                                {getStatusBadge(file.status)}
                                {file.lastSynced && (
                                    <div className="text-[9px] text-slate-300 mt-0.5 font-mono">
                                        {new Date(file.lastSynced).toLocaleTimeString()}
                                    </div>
                                )}
                            </td>
                            <td className="px-4 py-2 text-right">
                                <button 
                                    onClick={() => onSyncOne(file)}
                                    disabled={file.status === 'sincronizando' || isSyncing}
                                    className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-sm border border-slate-200 hover:border-indigo-200 transition text-[10px] font-bold uppercase tracking-wide bg-white shadow-sm"
                                >
                                    Push
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
