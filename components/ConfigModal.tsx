
import React, { useState, useEffect } from 'react';
import { AppConfig } from '../types';
import { DEFAULT_DIFY_DATASET_ID, DEFAULT_DIFY_API_KEY } from '../constants';

interface ConfigModalProps {
  config: AppConfig;
  onSave: (config: AppConfig) => void;
  onClose: () => void;
  isOpen: boolean;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ config, onSave, onClose, isOpen }) => {
  const [localConfig, setLocalConfig] = useState<AppConfig>(config);
  const [showHelp, setShowHelp] = useState(true);
  const [currentOrigin, setCurrentOrigin] = useState('');

  useEffect(() => {
    // window.location.origin pega protocolo + dominio + porta (sem barras no final)
    // Ex: https://meu-site.com ou http://localhost:3000
    setCurrentOrigin(window.location.origin);
    
    setLocalConfig(prev => ({
        ...prev,
        difyDatasetId: prev.difyDatasetId || DEFAULT_DIFY_DATASET_ID,
        difyApiKey: prev.difyApiKey || DEFAULT_DIFY_API_KEY
    }));
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
          <button 
            onClick={() => setShowHelp(prev => !prev)} 
            className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded transition uppercase font-semibold tracking-wider border border-slate-600"
          >
            {showHelp ? "Ocultar Ajuda" : "Mostrar Ajuda"}
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto bg-gray-50">
          
          {/* Important URL Section - Controlado pelo botão showHelp */}
          {showHelp && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded shadow-sm animate-fade-in">
                <h4 className="font-bold text-yellow-800 text-sm mb-2 flex items-center">
                    <i className="fas fa-exclamation-triangle mr-2"></i>
                    Configuração Obrigatória do Google Cloud (Erro 400)
                </h4>
                <p className="text-sm text-yellow-800 mb-2">
                    Para corrigir o erro "Acesso Bloqueado", adicione <strong>exatamente</strong> esta URL em <strong>"Origens JavaScript autorizadas"</strong> no seu projeto do Google Cloud:
                </p>
                <div className="flex items-center gap-2 mb-2">
                    <code className="flex-1 bg-white border border-yellow-200 p-2 rounded text-sm font-mono break-all text-gray-700 select-all">
                        {currentOrigin}
                    </code>
                    <button 
                        onClick={() => navigator.clipboard.writeText(currentOrigin)}
                        className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-2 rounded text-sm font-medium transition whitespace-nowrap"
                        title="Copiar URL"
                    >
                        <i className="fas fa-copy"></i> Copiar
                    </button>
                </div>
                <ul className="text-xs text-yellow-800 list-disc list-inside space-y-1">
                    <li>Não coloque barra (/) no final da URL no Google Cloud.</li>
                    <li>Após salvar no Google, pode levar até 5 minutos para funcionar.</li>
                    <li>Se o erro persistir, limpe o cache do navegador.</li>
                </ul>
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
                    <p className="text-xs text-gray-500 mt-1">Crie em: Google Cloud Console {'>'} Credentials {'>'} OAuth 2.0 Client IDs</p>
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
                        Dify API Key <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <input 
                        type="password" 
                        value={localConfig.difyApiKey}
                        onChange={(e) => setLocalConfig({...localConfig, difyApiKey: e.target.value})}
                        placeholder="dataset-..."
                        className="w-full p-3 pl-10 border border-gray-300 bg-gray-50 text-gray-900 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm shadow-inner"
                        />
                        <i className="fas fa-key absolute left-3 top-3.5 text-gray-400"></i>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Chave que começa com "dataset-".</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">ID do Dataset (UUID)</label>
                        <input 
                        type="text" 
                        value={localConfig.difyDatasetId}
                        onChange={(e) => setLocalConfig({...localConfig, difyDatasetId: e.target.value})}
                        placeholder="d38bb..."
                        className="w-full p-3 border border-gray-300 bg-gray-50 text-gray-900 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm shadow-inner"
                        />
                        <p className="text-xs text-gray-500 mt-1">O ID numérico/UUID da base.</p>
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
