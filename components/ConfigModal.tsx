
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

  // Adiciona a propriedade difyApiKey na interface do frontend, mesmo que ela venha vazia do server
  // Precisamos disso para permitir que o admin insira uma nova chave
  
  // Verificação de Segurança (UI only, o server valida de verdade)
  const userEmail = user?.email || '';
  const isAdmin = ALLOWED_ADMINS.includes(userEmail);
  const isSetupMode = !config.googleClientId;

  useEffect(() => {
    setLocalConfig(JSON.parse(JSON.stringify(config))); // Deep copy
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
          name: 'Novo Agente',
          difyDatasetId: DEFAULT_DIFY_DATASET_ID,
          difyBaseUrl: 'https://api.dify.ai/v1',
          difyApiKey: '' // O admin terá que preencher
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
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[9000] p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-lock text-red-500 text-2xl"></i>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Acesso Restrito</h2>
                <p className="text-gray-500 mb-6 text-sm">
                    Apenas administradores podem alterar as configurações do servidor. <br/>
                    Você está logado como: <span className="font-bold text-gray-700">{userEmail || 'Desconhecido'}</span>
                </p>
                <button onClick={onClose} className="px-6 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-900 transition w-full">
                    Voltar ao Dashboard
                </button>
            </div>
        </div>
      );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[8000] p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white shrink-0">
          <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <i className="fas fa-server text-emerald-400"></i> Configuração do Servidor
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                  Alterações aqui afetam todos os usuários conectados a este Backend.
              </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-800">
                <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <div className="w-56 bg-slate-50 border-r border-slate-200 flex flex-col p-3 gap-2 shrink-0">
                <button 
                    onClick={() => setActiveTab('google')}
                    className={`p-3 text-left rounded-xl text-sm font-bold transition flex items-center gap-3 ${activeTab === 'google' ? 'bg-white shadow-sm text-emerald-600 ring-1 ring-slate-200' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                    <i className="fab fa-google w-5 text-center"></i> 
                    App Google
                    {isSetupMode && <span className="w-2 h-2 rounded-full bg-rose-500 ml-auto animate-pulse"></span>}
                </button>
                <button 
                    onClick={() => setActiveTab('agents')}
                    className={`p-3 text-left rounded-xl text-sm font-bold transition flex items-center gap-3 ${activeTab === 'agents' ? 'bg-white shadow-sm text-indigo-600 ring-1 ring-slate-200' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                    <i className="fas fa-robot w-5 text-center"></i> Agentes Dify
                </button>
                <button 
                    onClick={() => setActiveTab('general')}
                    className={`p-3 text-left rounded-xl text-sm font-bold transition flex items-center gap-3 ${activeTab === 'general' ? 'bg-white shadow-sm text-slate-700 ring-1 ring-slate-200' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                    <i className="fas fa-sliders-h w-5 text-center"></i> Geral
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 bg-white">
                
                {activeTab === 'agents' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Gerenciar Agentes</h3>
                                <p className="text-sm text-slate-500">Configure as chaves que o Servidor usará para falar com o Dify.</p>
                            </div>
                            <button onClick={handleAddProfile} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-200">
                                <i className="fas fa-plus mr-2"></i> Adicionar
                            </button>
                        </div>

                        <div className="flex gap-2 overflow-x-auto pb-1 border-b border-slate-200">
                            {localConfig.profiles.map(profile => (
                                <button
                                    key={profile.id}
                                    onClick={() => setEditingProfileId(profile.id)}
                                    className={`px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all ${
                                        editingProfileId === profile.id 
                                        ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500' 
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                    }`}
                                >
                                    {profile.name}
                                </button>
                            ))}
                        </div>

                        {currentProfile && (
                            <div className="space-y-5 animate-fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nome do Agente</label>
                                        <input 
                                            type="text" 
                                            value={currentProfile.name}
                                            onChange={(e) => updateProfile(currentProfile.id, 'name', e.target.value)}
                                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <button 
                                            onClick={() => handleRemoveProfile(currentProfile.id)}
                                            disabled={localConfig.profiles.length <= 1}
                                            className="w-full p-2.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition font-bold text-sm disabled:opacity-50"
                                        >
                                            <i className="fas fa-trash-alt mr-2"></i> Excluir
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dataset ID (Knowledge ID)</label>
                                            <input 
                                                type="text" 
                                                value={currentProfile.difyDatasetId}
                                                onChange={(e) => updateProfile(currentProfile.id, 'difyDatasetId', e.target.value)}
                                                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm shadow-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                                Dify API Key (Segredo)
                                            </label>
                                            <input 
                                                type="text" 
                                                // @ts-ignore
                                                value={currentProfile.difyApiKey || ''}
                                                // @ts-ignore
                                                onChange={(e) => updateProfile(currentProfile.id, 'difyApiKey', e.target.value)}
                                                placeholder={currentProfile.difyApiKey === '***HIDDEN***' ? 'Chave salva e segura (***). Digite para alterar.' : 'Cole a chave da API do Dify aqui'}
                                                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm shadow-sm text-slate-600"
                                            />
                                            <p className="text-[10px] text-slate-500 mt-1">
                                                Esta chave será salva apenas no servidor (arquivo json). O frontend nunca terá acesso real a ela.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'google' && (
                    <div className="space-y-6">
                        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded text-sm text-amber-800">
                             Estas configurações definem qual App Google (Projeto Cloud) será usado para login de <strong>todos</strong> os usuários deste frontend.
                        </div>

                        <div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Client ID (OAuth 2.0) <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        value={localConfig.googleClientId}
                                        onChange={(e) => setLocalConfig({...localConfig, googleClientId: e.target.value})}
                                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">API Key (Google Cloud) <span className="text-red-500">*</span></label>
                                    <input 
                                        type="password" 
                                        value={localConfig.googleApiKey}
                                        onChange={(e) => setLocalConfig({...localConfig, googleApiKey: e.target.value})}
                                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'general' && (
                    <div className="space-y-6">
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                            <label className="flex items-center gap-3 cursor-pointer mb-4">
                                <input 
                                    type="checkbox"
                                    checked={localConfig.autoSync}
                                    onChange={(e) => setLocalConfig({...localConfig, autoSync: e.target.checked})}
                                    className="h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500"
                                />
                                <span className="font-bold text-slate-700">Habilitar Auto-Sync Global</span>
                            </label>
                            
                            {localConfig.autoSync && (
                                <div className="ml-8">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Intervalo (minutos)</label>
                                    <input 
                                        type="number"
                                        min="1"
                                        max="60"
                                        value={localConfig.syncInterval}
                                        onChange={(e) => setLocalConfig({...localConfig, syncInterval: parseInt(e.target.value) || 5})}
                                        className="w-20 p-2 border border-slate-300 rounded-lg text-center font-bold text-slate-700"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 flex justify-end gap-3 border-t border-slate-200 shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition">Cancelar</button>
          <button 
            onClick={() => onSave(localConfig)}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-black font-bold shadow-lg shadow-slate-300 flex items-center gap-2 transform active:scale-95 transition"
          >
            <i className="fas fa-cloud-upload-alt"></i> Salvar no Servidor
          </button>
        </div>
      </div>
    </div>
  );
};
