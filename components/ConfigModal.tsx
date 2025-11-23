
import React, { useState, useEffect } from 'react';
import { AppConfig } from '../types';
import { DEFAULT_DIFY_DATASET_ID } from '../constants';

interface ConfigModalProps {
  config: AppConfig;
  onSave: (config: AppConfig) => void;
  onClose: () => void;
  isOpen: boolean;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ config, onSave, onClose, isOpen }) => {
  const [localConfig, setLocalConfig] = useState<AppConfig>(config);
  const [showHelp, setShowHelp] = useState(true); // Default to open for first time help
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    // Get the current origin for Google Cloud Console configuration
    setCurrentUrl(window.location.origin);
    
    // Ensure dataset ID has a default if empty
    if (!localConfig.difyDatasetId) {
        setLocalConfig(prev => ({ ...prev, difyDatasetId: DEFAULT_DIFY_DATASET_ID }));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 flex justify-between items-center text-white">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <i className="fas fa-sliders-h"></i> Configurações do Sistema
          </h2>
          <button onClick={() => setShowHelp(!showHelp)} className="text-sm bg-slate-700 px-3 py-1 rounded hover:bg-slate-600 transition">
            {showHelp ? "Ocultar Ajuda" : "Mostrar Ajuda"}
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto bg-gray-50">
          
          {/* Important URL Section */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded shadow-sm">
            <h4 className="font-bold text-yellow-800 text-sm mb-2 flex items-center">
                <i className="fas fa-exclamation-triangle mr-2"></i>
                Atenção: Configuração Obrigatória do Google Cloud
            </h4>
            <p className="text-sm text-yellow-800 mb-2">
                Para o login funcionar, você deve adicionar exatamente este link abaixo em <strong>"Origens JavaScript autorizadas"</strong> no seu projeto do Google Cloud:
            </p>
            <div className="flex items-center gap-2">
                <code className="flex-1 bg-white border border-yellow-200 p-2 rounded text-sm font-mono break-all text-gray-700 select-all">
                    {currentUrl}
                </code>
                <button 
                    onClick={() => navigator.clipboard.writeText(currentUrl)}
                    className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-2 rounded text-sm font-medium transition"
                    title="Copiar URL"
                >
                    <i className="fas fa-copy"></i>
                </button>
            </div>
          </div>

          {showHelp && (
            <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-900 space-y-2 border border-blue-200">
                <h4 className="font-bold border-b border-blue-200 pb-1 mb-2">Como preencher os campos abaixo:</h4>
                <ol className="list-decimal pl-4 space-y-2">
                    <li><strong>Google Client ID:</strong> No <a href="https://console.cloud.google.com/" target="_blank" className="underline font-bold text-blue-700">Google Cloud Console</a>, crie uma credencial OAuth 2.0. Use a URL acima nas origens permitidas.</li>
                    <li><strong>Dify API Key:</strong> No Dify, vá na sua Base de Conhecimento > API Endpoint > Crie uma chave.</li>
                    <li><strong>Dataset ID:</strong> Já preenchemos com o ID que você forneceu ({DEFAULT_DIFY_DATASET_ID}), mas você pode alterar se criar outra base.</li>
                </ol>
            </div>
          )}

          {/* Google Settings */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 border-b pb-2">
                <i className="fab fa-google text-red-500 mr-2"></i> Conexão Google Drive
            </h3>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                        Google Client ID (OAuth 2.0) <span className="text-red-500">*</span>
                    </label>
                    <input 
                    type="text" 
                    value={localConfig.googleClientId}
                    onChange={(e) => setLocalConfig({...localConfig, googleClientId: e.target.value})}
                    placeholder="Cole aqui seu Client ID (ex: 1234...apps.googleusercontent.com)"
                    className="w-full p-3 border border-gray-300 bg-gray-50 text-gray-900 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm shadow-inner"
                    />
                </div>
            </div>
          </div>

          {/* Dify Settings */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 border-b pb-2">
                <i className="fas fa-brain text-blue-500 mr-2"></i> Conexão Dify
            </h3>
            
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                        Dify API Key (Chave da Base de Conhecimento) <span className="text-red-500">*</span>
                    </label>
                    <input 
                    type="password" 
                    value={localConfig.difyApiKey}
                    onChange={(e) => setLocalConfig({...localConfig, difyApiKey: e.target.value})}
                    placeholder="Começa com 'dataset-api-'"
                    className="w-full p-3 border border-gray-300 bg-gray-50 text-gray-900 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm shadow-inner"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">ID do Dataset</label>
                        <input 
                        type="text" 
                        value={localConfig.difyDatasetId}
                        onChange={(e) => setLocalConfig({...localConfig, difyDatasetId: e.target.value})}
                        className="w-full p-3 border border-gray-300 bg-gray-50 text-gray-900 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm shadow-inner"
                        />
                        <p className="text-xs text-gray-500 mt-1">ID da base de conhecimento.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">URL Base do Dify</label>
                        <input 
                        type="text" 
                        value={localConfig.difyBaseUrl}
                        onChange={(e) => setLocalConfig({...localConfig, difyBaseUrl: e.target.value})}
                        placeholder="https://api.dify.ai/v1"
                        className="w-full p-3 border border-gray-300 bg-gray-50 text-gray-900 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm shadow-inner"
                        />
                    </div>
                </div>
            </div>
          </div>
          
           <div className="bg-blue-50 p-4 rounded-lg flex items-center gap-3 border border-blue-100">
            <input 
              id="autoSync"
              type="checkbox"
              checked={localConfig.autoSync}
              onChange={(e) => setLocalConfig({...localConfig, autoSync: e.target.checked})}
              className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="autoSync" className="text-sm font-medium text-gray-800 cursor-pointer select-none">
              Ativar Sincronização Automática (Verificar a cada {localConfig.syncInterval} min)
            </label>
          </div>

        </div>

        <div className="bg-gray-100 p-4 flex justify-end gap-3 border-t border-gray-200">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium hover:bg-gray-200 rounded transition"
          >
            Cancelar
          </button>
          <button 
            onClick={() => onSave(localConfig)}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-bold shadow-md transition flex items-center gap-2"
          >
            <i className="fas fa-check"></i> Salvar e Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
