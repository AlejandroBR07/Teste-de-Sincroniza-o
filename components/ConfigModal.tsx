
import React, { useState, useEffect } from 'react';
import { AppConfig, DifyProfile, UserProfile } from '../types';
import { ALLOWED_ADMINS, DEFAULT_DIFY_DATASET_ID } from '../constants';

interface ConfigModalProps {
  config: AppConfig;
  user: UserProfile | null;
  onSave: (config: AppConfig) => void;
  onClose: () => void;
  isOpen: boolean;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ config, user, onSave, onClose, isOpen }) => {
  const [localConfig, setLocalConfig] = useState<AppConfig>(config);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'agents' | 'google' | 'general'>('agents');

  const userEmail = user?.email || '';
  const isAdmin = ALLOWED_ADMINS.includes(userEmail);
  const isSetupMode = !config.googleClientId;

  useEffect(() => {
    setLocalConfig(JSON.parse(JSON.stringify(config))); 
    if (config.profiles.length > 0 && !editingProfileId) {
        setEditingProfileId(config.profiles[0].id);
    }
    if (isSetupMode && isOpen) {
        setActiveTab('google');
    }
  }, [isOpen, config, isSetupMode]);

  const handleAddProfile = () => {
      const newProfile: DifyProfile & { difyApiKey?: string } = {
          id: Math.random().toString(36).substr(2, 9),
          name: 'Nova Base',
          difyDatasetId: DEFAULT_DIFY_DATASET_ID,
          difyBaseUrl: 'https://api.dify.ai/v1',
          difyApiKey: '' 
      };
      setLocalConfig(prev => ({
          ...prev,
          profiles: [...prev.profiles, newProfile],
          activeProfileId: prev.profiles.length === 0 ? newProfile.id : prev.activeProfileId
      }));
      setEditingProfileId(newProfile.id);
  };

  const handleRemoveProfile = (id: string) => {
      if (localConfig.profiles.length <= 1) return;
      setLocalConfig(prev => {
          const newProfiles = prev.profiles.filter(p => p.id !== id);
          return {
              ...prev,
              profiles: newProfiles,
              activeProfileId: prev.activeProfileId === id ? newProfiles[0].id : prev.activeProfileId
          };
      });
      if (editingProfileId === id) setEditingProfileId(null);
  };

  const updateProfile = (id: string, field: string, value: string) => {
      setLocalConfig(prev => ({
          ...prev,
          profiles: prev.profiles.map(p => p.id === id ? { ...p, [field]: value } : p)
      }));
  };

  const currentProfile = localConfig.profiles.find(p => p.id === editingProfileId) || localConfig.profiles[0];

  if (!isOpen) return null;

  if (!isAdmin && !isSetupMode) {
      return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9000] p-4">
            <div className="bg-white rounded-md shadow-lg w-full max-w-sm p-6 text-center border border-slate-200">
                <i className="fas fa-lock text-slate-400 text-3xl mb-4"></i>
                <h2 className="text-lg font-bold text-slate-800 mb-2">Acesso Restrito</h2>
                <p className="text-slate-600 mb-6 text-sm">
                    Apenas administradores podem alterar configurações.
                </p>
                <button onClick={onClose} className="px-4 py-2 bg-slate-900 text-white rounded font-medium text-sm hover:bg-slate-800 w-full">
                    Fechar
                </button>
            </div>
        </div>
      );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[8000] p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
          <h2 className="text-lg font-bold text-slate-800">
             Configurações do Sistema
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <div className="w-48 bg-slate-50 border-r border-slate-200 flex flex-col p-2 gap-1 shrink-0">
                <button 
                    onClick={() => setActiveTab('agents')}
                    className={`px-3 py-2 text-left rounded text-sm font-medium transition flex items-center gap-2 ${activeTab === 'agents' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                >
                    <i className="fas fa-database w-4 text-center"></i> Bases Dify
                </button>
                <button 
                    onClick={() => setActiveTab('google')}
                    className={`px-3 py-2 text-left rounded text-sm font-medium transition flex items-center gap-2 ${activeTab === 'google' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                >
                    <i className="fab fa-google w-4 text-center"></i> Google API
                </button>
                <button 
                    onClick={() => setActiveTab('general')}
                    className={`px-3 py-2 text-left rounded text-sm font-medium transition flex items-center gap-2 ${activeTab === 'general' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                >
                    <i className="fas fa-sliders-h w-4 text-center"></i> Preferências
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 bg-white">
                
                {activeTab === 'agents' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Gerenciamento de Bases</h3>
                                <p className="text-xs text-slate-500 mt-1">Conecte o sistema aos datasets do Dify.</p>
                            </div>
                            <button onClick={handleAddProfile} className="text-indigo-600 hover:text-indigo-800 text-sm font-bold flex items-center gap-1">
                                <i className="fas fa-plus-circle"></i> Nova Base
                            </button>
                        </div>

                        <div className="flex gap-2 mb-4 overflow-x-auto">
                            {localConfig.profiles.map(profile => (
                                <button
                                    key={profile.id}
                                    onClick={() => setEditingProfileId(profile.id)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                                        editingProfileId === profile.id 
                                        ? 'bg-slate-800 text-white border-slate-800' 
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                                    }`}
                                >
                                    {profile.name}
                                </button>
                            ))}
                        </div>

                        {currentProfile && (
                            <div className="space-y-4 max-w-lg">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome de Exibição</label>
                                    <input 
                                        type="text" 
                                        value={currentProfile.name}
                                        onChange={(e) => updateProfile(currentProfile.id, 'name', e.target.value)}
                                        className="w-full p-2 border border-slate-300 rounded text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dataset ID (Dify)</label>
                                    <input 
                                        type="text" 
                                        value={currentProfile.difyDatasetId}
                                        onChange={(e) => updateProfile(currentProfile.id, 'difyDatasetId', e.target.value)}
                                        className="w-full p-2 border border-slate-300 rounded text-sm font-mono focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">API Key (Dify)</label>
                                    <input 
                                        type="text" 
                                        // @ts-ignore
                                        value={currentProfile.difyApiKey || ''}
                                        // @ts-ignore
                                        onChange={(e) => updateProfile(currentProfile.id, 'difyApiKey', e.target.value)}
                                        placeholder={currentProfile.difyApiKey === '***HIDDEN***' ? '••••••••••••••••' : 'sk-...'}
                                        className="w-full p-2 border border-slate-300 rounded text-sm font-mono focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        Armazenada com segurança no servidor.
                                    </p>
                                </div>

                                <div className="pt-4 border-t border-slate-100 flex justify-end">
                                     <button 
                                        onClick={() => handleRemoveProfile(currentProfile.id)}
                                        disabled={localConfig.profiles.length <= 1}
                                        className="text-red-600 hover:text-red-800 text-xs font-bold uppercase disabled:opacity-30"
                                    >
                                        Excluir Base
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'google' && (
                    <div className="space-y-6 max-w-lg">
                        <div className="pb-4 border-b border-slate-100">
                             <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Integração Google Cloud</h3>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Client ID</label>
                            <input 
                                type="text" 
                                value={localConfig.googleClientId}
                                onChange={(e) => setLocalConfig({...localConfig, googleClientId: e.target.value})}
                                className="w-full p-2 border border-slate-300 rounded text-sm font-mono focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">API Key (Drive API)</label>
                            <input 
                                type="password" 
                                value={localConfig.googleApiKey}
                                onChange={(e) => setLocalConfig({...localConfig, googleApiKey: e.target.value})}
                                className="w-full p-2 border border-slate-300 rounded text-sm font-mono focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none"
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'general' && (
                    <div className="space-y-6">
                        <div className="pb-4 border-b border-slate-100">
                             <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Automação</h3>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <input 
                                type="checkbox"
                                checked={localConfig.autoSync}
                                onChange={(e) => setLocalConfig({...localConfig, autoSync: e.target.checked})}
                                className="h-4 w-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900"
                                id="autosync"
                            />
                            <label htmlFor="autosync" className="text-sm font-medium text-slate-700">Habilitar Sincronização Automática</label>
                        </div>
                        
                        {localConfig.autoSync && (
                            <div className="pl-7">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Intervalo (minutos)</label>
                                <input 
                                    type="number"
                                    min="1"
                                    max="60"
                                    value={localConfig.syncInterval}
                                    onChange={(e) => setLocalConfig({...localConfig, syncInterval: parseInt(e.target.value) || 5})}
                                    className="w-20 p-2 border border-slate-300 rounded text-sm font-bold text-slate-900"
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 flex justify-end gap-3 border-t border-slate-200 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded text-sm font-medium">Cancelar</button>
          <button 
            onClick={() => onSave(localConfig)}
            className="px-4 py-2 bg-slate-900 text-white rounded hover:bg-black font-bold text-sm shadow-md"
          >
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
};
