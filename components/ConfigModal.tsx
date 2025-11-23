
import React, { useState, useEffect } from 'react';
import { AppConfig, DifyProfile } from '../types';
import { DEFAULT_DIFY_BASE_URL } from '../constants';

interface ConfigModalProps {
  config: AppConfig;
  onSave: (config: AppConfig) => void;
  onClose: () => void;
  isOpen: boolean;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ config, onSave, onClose, isOpen }) => {
  const [localConfig, setLocalConfig] = useState<AppConfig>(config);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [activeTab, setActiveTab] = useState<'google' | 'agents' | 'general'>('agents');

  useEffect(() => {
    setLocalConfig(config);
    // Seleciona o primeiro perfil para edição se houver
    if (config.profiles.length > 0 && !editingProfileId) {
        setEditingProfileId(config.profiles[0].id);
    }
  }, [isOpen, config]);

  const handleAddProfile = () => {
      const newProfile: DifyProfile = {
          id: Math.random().toString(36).substr(2, 9),
          name: 'Novo Agente',
          difyApiKey: '',
          difyDatasetId: '',
          difyBaseUrl: DEFAULT_DIFY_BASE_URL
      };
      setLocalConfig(prev => ({
          ...prev,
          profiles: [...prev.profiles, newProfile],
          activeProfileId: prev.profiles.length === 0 ? newProfile.id : prev.activeProfileId
      }));
      setEditingProfileId(newProfile.id);
  };

  const handleRemoveProfile = (id: string) => {
      if (localConfig.profiles.length <= 1) {
          alert("Você precisa ter pelo menos um perfil.");
          return;
      }
      setLocalConfig(prev => {
          const newProfiles = prev.profiles.filter(p => p.id !== id);
          return {
              ...prev,
              profiles: newProfiles,
              activeProfileId: prev.activeProfileId === id ? newProfiles[0].id : prev.activeProfileId
          };
      });
      if (editingProfileId === id) {
          setEditingProfileId(null);
      }
  };

  const updateProfile = (id: string, field: keyof DifyProfile, value: string) => {
      setLocalConfig(prev => ({
          ...prev,
          profiles: prev.profiles.map(p => p.id === id ? { ...p, [field]: value } : p)
      }));
  };

  const currentProfile = localConfig.profiles.find(p => p.id === editingProfileId) || localConfig.profiles[0];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <i className="fas fa-cogs"></i> Configurações do DocuSync
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Tabs */}
            <div className="w-48 bg-gray-100 border-r border-gray-200 flex flex-col p-2 gap-2">
                <button 
                    onClick={() => setActiveTab('agents')}
                    className={`p-3 text-left rounded-lg text-sm font-medium transition flex items-center gap-2 ${activeTab === 'agents' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-200'}`}
                >
                    <i className="fas fa-robot w-5"></i> Agentes IA
                </button>
                <button 
                    onClick={() => setActiveTab('google')}
                    className={`p-3 text-left rounded-lg text-sm font-medium transition flex items-center gap-2 ${activeTab === 'google' ? 'bg-white shadow text-red-600' : 'text-gray-600 hover:bg-gray-200'}`}
                >
                    <i className="fab fa-google w-5"></i> Conexões
                </button>
                <button 
                    onClick={() => setActiveTab('general')}
                    className={`p-3 text-left rounded-lg text-sm font-medium transition flex items-center gap-2 ${activeTab === 'general' ? 'bg-white shadow text-gray-800' : 'text-gray-600 hover:bg-gray-200'}`}
                >
                    <i className="fas fa-sliders-h w-5"></i> Geral
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                
                {/* --- ABA AGENTES --- */}
                {activeTab === 'agents' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800">Seus Perfis de Agente</h3>
                            <button onClick={handleAddProfile} className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition">
                                <i className="fas fa-plus mr-1"></i> Novo
                            </button>
                        </div>

                        <div className="flex gap-2 overflow-x-auto pb-2 border-b border-gray-200 mb-4">
                            {localConfig.profiles.map(profile => (
                                <button
                                    key={profile.id}
                                    onClick={() => setEditingProfileId(profile.id)}
                                    className={`px-4 py-2 rounded-t-lg border-t border-l border-r text-sm whitespace-nowrap ${
                                        editingProfileId === profile.id 
                                        ? 'bg-white border-gray-200 font-bold text-blue-600 -mb-px' 
                                        : 'bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200'
                                    }`}
                                >
                                    {profile.name}
                                </button>
                            ))}
                        </div>

                        {currentProfile && (
                            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-4 animate-fade-in">
                                <div className="flex justify-between">
                                    <div className="flex-1 mr-4">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Agente</label>
                                        <input 
                                            type="text" 
                                            value={currentProfile.name}
                                            onChange={(e) => updateProfile(currentProfile.id, 'name', e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <button 
                                        onClick={() => handleRemoveProfile(currentProfile.id)}
                                        className="text-red-500 hover:bg-red-50 px-3 rounded transition self-end h-10"
                                        title="Excluir este perfil"
                                    >
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dify API Key</label>
                                    <input 
                                        type="password" 
                                        value={currentProfile.difyApiKey}
                                        onChange={(e) => updateProfile(currentProfile.id, 'difyApiKey', e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                        placeholder="dataset-..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dataset ID</label>
                                        <input 
                                            type="text" 
                                            value={currentProfile.difyDatasetId}
                                            onChange={(e) => updateProfile(currentProfile.id, 'difyDatasetId', e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Base URL</label>
                                        <input 
                                            type="text" 
                                            value={currentProfile.difyBaseUrl}
                                            onChange={(e) => updateProfile(currentProfile.id, 'difyBaseUrl', e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- ABA CONEXÕES --- */}
                {activeTab === 'google' && (
                    <div className="space-y-6">
                         <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded text-sm text-yellow-800">
                             <strong>Atenção:</strong> Estas configurações são globais e usadas por todos os agentes.
                         </div>

                        <div>
                            <h4 className="font-bold text-gray-700 mb-2 border-b pb-1">Google Drive (Acesso a Arquivos)</h4>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Google Cloud API Key</label>
                                    <input 
                                        type="password" 
                                        value={localConfig.googleApiKey}
                                        onChange={(e) => setLocalConfig({...localConfig, googleApiKey: e.target.value})}
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                        placeholder="AIzaSy... (Do Google Cloud Console)"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">OAuth Client ID</label>
                                    <input 
                                        type="text" 
                                        value={localConfig.googleClientId}
                                        onChange={(e) => setLocalConfig({...localConfig, googleClientId: e.target.value})}
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-gray-700 mb-2 border-b pb-1 mt-6">Gemini AI (Resumos)</h4>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gemini API Key (AI Studio)</label>
                                <input 
                                    type="password" 
                                    value={localConfig.geminiApiKey}
                                    onChange={(e) => setLocalConfig({...localConfig, geminiApiKey: e.target.value})}
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                    placeholder="AIzaSy... (Chave que gera no aistudio.google.com)"
                                />
                                <p className="text-xs text-gray-500 mt-1">Necessário para gerar resumos automáticos dos documentos.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- ABA GERAL --- */}
                {activeTab === 'general' && (
                    <div className="space-y-6">
                        <div className="bg-white p-4 rounded border border-gray-200">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input 
                                    type="checkbox"
                                    checked={localConfig.autoSync}
                                    onChange={(e) => setLocalConfig({...localConfig, autoSync: e.target.checked})}
                                    className="h-5 w-5 text-blue-600 rounded"
                                />
                                <span className="font-bold text-gray-700">Ativar Sincronização Automática</span>
                            </label>
                            <div className="mt-4 ml-8">
                                <label className="block text-sm text-gray-600 mb-1">Intervalo de Verificação (minutos)</label>
                                <input 
                                    type="number"
                                    min="1"
                                    max="60"
                                    value={localConfig.syncInterval}
                                    onChange={(e) => setLocalConfig({...localConfig, syncInterval: parseInt(e.target.value) || 5})}
                                    className="w-24 p-2 border border-gray-300 rounded"
                                />
                            </div>
                        </div>

                         <div className="text-xs text-gray-400 mt-10">
                             URL de Origem para OAuth: {window.location.origin}
                         </div>
                    </div>
                )}
            </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-100 p-4 flex justify-end gap-3 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded">Cancelar</button>
          <button 
            onClick={() => onSave(localConfig)}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-bold shadow-md flex items-center gap-2"
          >
            <i className="fas fa-save"></i> Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
};
