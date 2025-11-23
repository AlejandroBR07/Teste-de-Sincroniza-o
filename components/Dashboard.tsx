import React from 'react';
import { DocFile, SyncLog } from '../types';

interface DashboardProps {
  files: DocFile[];
  isSyncing: boolean;
  onSyncAll: () => void;
  onConnectDrive: () => void;
  onToggleWatch: (fileId: string) => void; // Novo callback
  isConnected: boolean;
  logs: SyncLog[];
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  files, 
  isSyncing, 
  onSyncAll, 
  onConnectDrive, 
  onToggleWatch,
  isConnected,
  logs 
}) => {

  const getStatusBadge = (status: DocFile['status']) => {
    switch (status) {
      case 'sincronizado':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 border border-green-200"><i className="fas fa-check mr-1"></i> Sync</span>;
      case 'sincronizando':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 animate-pulse border border-blue-200"><i className="fas fa-spinner fa-spin mr-1"></i> Enviando</span>;
      case 'erro':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 border border-red-200"><i className="fas fa-times mr-1"></i> Erro</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200"><i className="fas fa-clock mr-1"></i> Pendente</span>;
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Action Bar */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">Painel de Controle</h2>
            <p className="text-sm text-gray-500">Selecione quais documentos devem ser enviados automaticamente.</p>
        </div>
        <div className="flex gap-3">
          {!isConnected ? (
            <button 
              onClick={onConnectDrive}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition shadow-sm hover:shadow group"
            >
              <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" alt="Drive" className="w-5 h-5 group-hover:scale-110 transition"/>
              Conectar Google Drive
            </button>
          ) : (
             <button 
              onClick={onSyncAll}
              disabled={isSyncing}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-white transition shadow-md ${isSyncing ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              <i className={`fas fa-sync ${isSyncing ? 'fa-spin' : ''}`}></i>
              {isSyncing ? 'Sincronizando...' : 'Sincronizar Pendentes'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* File List */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
             <h3 className="font-semibold text-gray-700"><i className="fas fa-file-alt mr-2 text-blue-500"></i>Documentos</h3>
             <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{files.length} detectados</span>
          </div>
          <div className="flex-1 overflow-y-auto min-h-[300px]">
            {files.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 py-10">
                    <i className="fas fa-folder-open text-4xl mb-3 opacity-30"></i>
                    <p>Nenhum documento listado.</p>
                    <p className="text-sm mt-1">{!isConnected ? 'Aguardando conexão...' : 'Verifique se há Google Docs no seu Drive.'}</p>
                </div>
            ) : (
                <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center w-16">Auto</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Documento</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {files.map(file => (
                    <tr key={file.id} className={`hover:bg-gray-50 transition ${file.watched ? 'bg-blue-50/30' : ''}`}>
                        <td className="p-4 text-center">
                            {/* Toggle Switch */}
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={file.watched}
                                    onChange={() => onToggleWatch(file.id)}
                                />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </td>
                        <td className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                                    <i className={`fas ${file.mimeType.includes('pdf') ? 'fa-file-pdf' : 'fa-file-word'}`}></i>
                                </div>
                                <div className="min-w-0">
                                    <p className="font-medium text-gray-800 truncate max-w-xs text-sm" title={file.name}>{file.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] text-gray-400">{new Date(file.modifiedTime).toLocaleDateString()}</span>
                                        <a href={file.webViewLink} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline">
                                        Abrir <i className="fas fa-external-link-alt text-[8px]"></i>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                            {getStatusBadge(file.status)}
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            )}
          </div>
        </div>

        {/* Activity Logs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[500px] lg:h-auto">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
             <h3 className="font-semibold text-gray-700"><i className="fas fa-history mr-2 text-purple-500"></i>Log</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 font-mono text-xs">
            {logs.length === 0 ? (
                <p className="text-center text-gray-400 italic mt-10">Logs aparecerão aqui...</p>
            ) : (
                logs.map(log => (
                    <div key={log.id} className={`p-3 rounded-lg border shadow-sm ${
                        log.type === 'erro' ? 'bg-red-50 border-red-100 text-red-700' :
                        log.type === 'sucesso' ? 'bg-green-50 border-green-100 text-green-700' :
                        'bg-white border-gray-200 text-gray-600'
                    }`}>
                        <div className="flex justify-between items-start mb-1 opacity-80">
                            <span className={`font-bold uppercase tracking-wider ${
                                log.type === 'erro' ? 'text-red-600' : 
                                log.type === 'sucesso' ? 'text-green-600' : 'text-blue-600'
                            }`}>{log.type}</span>
                            <span>{log.timestamp.toLocaleTimeString()}</span>
                        </div>
                        <p className="break-words leading-relaxed">{log.message}</p>
                    </div>
                ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
