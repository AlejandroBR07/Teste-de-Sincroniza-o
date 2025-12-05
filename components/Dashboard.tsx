
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
    // Badges minimalistas (pontos ou texto simples)
    switch (status) {
      case 'sincronizado': 
          return <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-[11px] font-medium text-gray-600">Synced</span></div>;
      case 'sincronizando': 
          return <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div><span className="text-[11px] font-medium text-blue-600">Sending...</span></div>;
      case 'erro': 
          return <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"></div><span className="text-[11px] font-medium text-red-600">Failed</span></div>;
      case 'pendente': 
          return <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-400"></div><span className="text-[11px] font-medium text-amber-700">Pending</span></div>;
      default: 
          return <span className="text-[11px] text-gray-400">-</span>;
    }
  };

  return (
    <div className="flex flex-col h-full gap-5">
      
      {/* TOOLBAR */}
      <div className="flex flex-col lg:flex-row justify-between items-end lg:items-center gap-4">
         <div className="flex items-center gap-3 w-full lg:w-auto flex-1">
             {/* Profile */}
             <div className="relative w-full lg:w-56">
                 <select 
                    value={config.activeProfileId}
                    onChange={(e) => onChangeProfile(e.target.value)}
                    className="block w-full pl-3 pr-8 py-2 bg-white border border-gray-300 text-gray-900 text-sm font-medium rounded hover:border-gray-400 focus:border-black focus:ring-1 focus:ring-black outline-none transition appearance-none shadow-sm"
                 >
                    {config.profiles.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                 </select>
                 <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                    <i className="fas fa-caret-down text-xs"></i>
                 </div>
             </div>
             
             {/* Search */}
             <div className="relative w-full lg:max-w-sm">
                 <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onDeepSearch(searchTerm)}
                    placeholder="Search documents..."
                    className="w-full pl-9 pr-8 py-2 bg-white border border-gray-300 rounded text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:ring-1 focus:ring-black outline-none transition shadow-sm"
                />
                <div className="absolute left-3 top-2.5 text-gray-400">
                     <i className="fas fa-search text-xs"></i>
                </div>
             </div>
         </div>

         {/* Actions */}
         <div className="flex gap-2 items-center w-full lg:w-auto justify-end">
            {!isConnected ? (
                <button onClick={onConnectDrive} className="px-4 py-2 bg-black hover:bg-gray-800 text-white font-medium text-xs rounded shadow-sm flex items-center gap-2 uppercase tracking-wide">
                    <i className="fab fa-google-drive"></i>
                    Connect Drive
                </button>
            ) : (
                <>
                    <button 
                        onClick={onSyncAll}
                        disabled={isSyncing}
                        className={`px-4 py-2 rounded font-medium text-xs uppercase tracking-wide transition flex items-center gap-2 shadow-sm ${isSyncing ? 'bg-gray-300 cursor-not-allowed text-gray-500' : 'bg-black text-white hover:bg-gray-800'}`}
                    >
                        {isSyncing ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-sync-alt"></i>}
                        {isSyncing ? 'Syncing...' : `Sync All`}
                    </button>

                    <button 
                        onClick={onOpenConfig}
                        className="h-9 w-9 flex items-center justify-center rounded bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 transition shadow-sm"
                        title="Settings"
                    >
                        <i className="fas fa-cog text-sm"></i>
                    </button>
                    
                    <button 
                        onClick={onDisconnect}
                        className="h-9 w-9 flex items-center justify-center rounded bg-white border border-gray-300 text-gray-400 hover:text-red-600 hover:border-red-200 transition shadow-sm"
                        title="Logout"
                    >
                        <i className="fas fa-power-off text-sm"></i>
                    </button>
                </>
            )}
         </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="px-5 py-3 border-b border-gray-100 flex justify-between items-center bg-white">
             <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                 Files ({filteredFiles.length})
             </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-white">
            {filteredFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <p className="text-sm font-medium">No files available.</p>
                </div>
            ) : (
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider sticky top-0 z-10 border-b border-gray-200">
                        <tr>
                            <th className="px-5 py-3 text-center w-12">Track</th>
                            <th className="px-5 py-3">Filename</th>
                            <th className="px-5 py-3 w-40">Modified</th>
                            <th className="px-5 py-3 w-40">Status</th>
                            <th className="px-5 py-3 text-right w-24">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                        {filteredFiles.map((file) => (
                        <tr key={file.id} className="hover:bg-gray-50 transition group">
                            <td className="px-5 py-2.5 text-center">
                                <input 
                                    type="checkbox" 
                                    checked={file.watched} 
                                    onChange={() => onToggleWatch(file.id)}
                                    className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black cursor-pointer"
                                />
                            </td>
                            <td className="px-5 py-2.5">
                                <div className="font-medium text-gray-900 truncate max-w-lg">{file.name}</div>
                                {file.webViewLink && (
                                    <a href={file.webViewLink} target="_blank" rel="noreferrer" className="text-[10px] text-gray-400 hover:text-blue-600 hover:underline mt-0.5 block">
                                        View in Drive
                                    </a>
                                )}
                            </td>
                            <td className="px-5 py-2.5 text-xs text-gray-500 font-mono">
                                {new Date(file.modifiedTime).toLocaleDateString()}
                            </td>
                            <td className="px-5 py-2.5 align-middle">
                                {getStatusBadge(file.status)}
                                {file.lastSynced && (
                                    <div className="text-[9px] text-gray-400 mt-0.5 font-mono">
                                        {new Date(file.lastSynced).toLocaleTimeString().slice(0,5)}
                                    </div>
                                )}
                            </td>
                            <td className="px-5 py-2.5 text-right">
                                <button 
                                    onClick={() => onSyncOne(file)}
                                    disabled={file.status === 'sincronizando' || isSyncing}
                                    className="text-gray-500 hover:text-black px-3 py-1 rounded border border-gray-200 hover:border-gray-400 transition text-[10px] font-bold uppercase tracking-wide bg-white"
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
