
import React, { useState, useEffect } from 'react';
import { AppConfig, DifyProfile, UserProfile } from '../types';
import { ALLOWED_ADMINS, DEFAULT_DIFY_BASE_URL } from '../constants';

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
  const [activeHelp, setActiveHelp] = useState<string | null>(null);

  // Verificação de Segurança
  const userEmail = user?.email || '';
  const isAdmin = ALLOWED_ADMINS.includes(userEmail);
  
  // MODO SETUP: Se não tem Client ID configurado, libera o acesso para configurar
  const isSetupMode = !config.googleClientId || !config.googleApiKey;

  useEffect(() => {
    setLocalConfig(config);
    if (config.profiles.length > 0 && !editingProfileId) {
        setEditingProfileId(config.profiles[0].id);
    }
    // Se estiver em modo setup, força a aba do Google
    if (isSetupMode && isOpen) {
        setActiveTab('google');
    }
  }, [isOpen, config, isSetupMode]);

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

  const updateProfile = (id: string, field: keyof DifyProfile, value: string) => {
      setLocalConfig(prev => ({
          ...prev,
          profiles: prev.profiles.map(p => p.id === id ? { ...p, [field]: value } : p)
      }));
  };

  const currentProfile = localConfig.profiles.find(p => p.id === editingProfileId) || localConfig.profiles[0];

  if (!isOpen) return null;

  // Renderização de Bloqueio APENAS se não for Admin E não for Setup Mode
  if (!isAdmin && !isSetupMode) {
      return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[9000] p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-lock text-red-500 text-2xl"></i>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Acesso Restrito</h2>
                <p className="text-gray-500 mb-6 text-sm">
                    As configurações de agentes e API são restritas aos administradores. <br/>
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
                <i className="fas fa-cogs text-indigo-400"></i> Configurações Avançadas
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                  {isSetupMode ? <span className="text-amber-400 font-bold">⚠️ MODO SETUP INICIAL</span> : "Gestão de Agentes e Chaves de API"}
              </p>
          </div>
          {!isSetupMode && (
            <button onClick={onClose} className="text-slate-400 hover:text-white transition w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-800">
                <i className="fas fa-times text-lg"></i>
            </button>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <div className="w-56 bg-slate-50 border-r border-slate-200 flex flex-col p-3 gap-2 shrink-0">
                <button 
                    onClick={() => setActiveTab('google')}
                    className={`p-3 text-left rounded-xl text-sm font-bold transition flex items-center gap-3 ${activeTab === 'google' ? 'bg-white shadow-sm text-emerald-600 ring-1 ring-slate-200' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                    <i className="fab fa-google w-5 text-center"></i> 
                    Conexões
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
                    <i className="fas fa-sliders-h w-5 text-center"></i> Preferências
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 bg-white">
                
                {activeTab === 'agents' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Perfis de Agente</h3>
                                <p className="text-sm text-slate-500">Configure para onde os documentos serão enviados.</p>
                            </div>
                            <button onClick={handleAddProfile} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-200">
                                <i className="fas fa-plus mr-2"></i> Novo Agente
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
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nome de Identificação</label>
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
                                            <i className="fas fa-trash-alt mr-2"></i> Excluir Agente
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="font-bold text-slate-700 text-sm uppercase">Credenciais Dify (Dataset)</h4>
                                        <button onClick={() => setActiveHelp(activeHelp === 'dify' ? null : 'dify')} className="text-xs text-indigo-600 font-bold hover:underline">
                                            <i className="fas fa-question-circle mr-1"></i> Onde encontrar?
                                        </button>
                                    </div>

                                    {activeHelp === 'dify' && (
                                        <div className="bg-blue-50 p-4 rounded-lg text-xs text-blue-800 mb-4 border border-blue-100 shadow-sm">
                                            <strong>Como configurar:</strong>
                                            <ol className="list-decimal pl-4 mt-2 space-y-1">
                                                <li>No Dify, vá em <strong>Knowledge</strong> e selecione sua base.</li>
                                                <li>No menu lateral esquerdo, clique em <strong>API</strong>.</li>
                                                <li>Copie a <strong>API Key</strong> e a <strong>API Base URL</strong>.</li>
                                                <li>O <strong>Dataset ID</strong> está na URL da página da base (ex: <code>/datasets/<strong>SEU-ID</strong>/documents</code>).</li>
                                            </ol>
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">API Key (Necessária)</label>
                                            <div className="relative">
                                                <i className="fas fa-key absolute left-3 top-3 text-slate-400 text-xs"></i>
                                                <input 
                                                    type="password" 
                                                    value={currentProfile.difyApiKey}
                                                    onChange={(e) => updateProfile(currentProfile.id, 'difyApiKey', e.target.value)}
                                                    className="w-full pl-9 p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm shadow-sm"
                                                    placeholder="dataset-..."
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dataset ID</label>
                                                <input 
                                                    type="text" 
                                                    value={currentProfile.difyDatasetId}
                                                    onChange={(e) => updateProfile(currentProfile.id, 'difyDatasetId', e.target.value)}
                                                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm shadow-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Base URL</label>
                                                <input 
                                                    type="text" 
                                                    value={currentProfile.difyBaseUrl}
                                                    onChange={(e) => updateProfile(currentProfile.id, 'difyBaseUrl', e.target.value)}
                                                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm shadow-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'google' && (
                    <div className="space-y-6">
                         {isSetupMode && (
                            <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded text-sm text-rose-800 mb-4 animate-fade-in">
                                <h4 className="font-bold mb-1"><i className="fas fa-exclamation-triangle mr-2"></i> Configuração Inicial Necessária</h4>
                                <p>Para logar e sincronizar arquivos, você precisa inserir as credenciais do <strong>Google Cloud</strong> abaixo.</p>
                            </div>
                        )}
                        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded text-sm text-amber-800">
                             <strong>Atenção:</strong> As chaves do Google Cloud (Drive) não podem ser adivinhadas pelo sistema, elas são únicas do seu projeto no Google Cloud Console.
                        </div>

                        <div>
                            <h4 className="font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">Google Drive API (OAuth & Access)</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Client ID (OAuth 2.0) <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        value={localConfig.googleClientId}
                                        onChange={(e) => setLocalConfig({...localConfig, googleClientId: e.target.value})}
                                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-sm"
                                        placeholder="Ex: 123456...apps.googleusercontent.com"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">Disponível em: Google Cloud Console &gt; APIs & Services &gt; Credentials</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">API Key (Google Cloud) <span className="text-red-500">*</span></label>
                                    <input 
                                        type="password" 
                                        value={localConfig.googleApiKey}
                                        onChange={(e) => setLocalConfig({...localConfig, googleApiKey: e.target.value})}
                                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-sm"
                                        placeholder="AIzaSy..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 mt-8">Gemini AI (Resumos Automáticos)</h4>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Gemini API Key</label>
                                <input 
                                    type="password" 
                                    value={localConfig.geminiApiKey}
                                    onChange={(e) => setLocalConfig({...localConfig, geminiApiKey: e.target.value})}
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                    placeholder="AIzaSy..."
                                />
                                <p className="text-xs text-slate-400 mt-1">Esta chave já está configurada por padrão para uso interno.</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'general' && (
                    <div className="space-y-6">
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                                    <i className="fas fa-sync text-indigo-500 text-xl"></i>
                                </div>
                                <div>
                                    <label className="flex items-center gap-3 cursor-pointer mb-2">
                                        <input 
                                            type="checkbox"
                                            checked={localConfig.autoSync}
                                            onChange={(e) => setLocalConfig({...localConfig, autoSync: e.target.checked})}
                                            className="h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500"
                                        />
                                        <span className="font-bold text-slate-700">Sincronização Automática</span>
                                    </label>
                                    <p className="text-sm text-slate-500 leading-relaxed">
                                        Quando ativado, o sistema verificará periodicamente os arquivos marcados como "Monitorar" e enviará atualizações automaticamente para o Agente selecionado.
                                    </p>
                                </div>
                            </div>
                            
                            {localConfig.autoSync && (
                                <div className="mt-6 ml-14 animate-fade-in">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Intervalo de Verificação</label>
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="number"
                                            min="1"
                                            max="60"
                                            value={localConfig.syncInterval}
                                            onChange={(e) => setLocalConfig({...localConfig, syncInterval: parseInt(e.target.value) || 5})}
                                            className="w-20 p-2 border border-slate-300 rounded-lg text-center font-bold text-slate-700"
                                        />
                                        <span className="text-sm text-slate-600">minutos</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 rounded-xl bg-slate-100 text-xs text-slate-500 font-mono">
                             Origin: {window.location.origin} <br/>
                             Build Version: 2.2.0 (TradeSync)
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 flex justify-end gap-3 border-t border-slate-200 shrink-0">
          {!isSetupMode && <button onClick={onClose} className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition">Cancelar</button>}
          <button 
            onClick={() => onSave(localConfig)}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-black font-bold shadow-lg shadow-slate-300 flex items-center gap-2 transform active:scale-95 transition"
          >
            <i className="fas fa-save"></i> {isSetupMode ? "Salvar e Iniciar" : "Salvar Alterações"}
          </button>
        </div>
      </div>
    </div>
  );
};
