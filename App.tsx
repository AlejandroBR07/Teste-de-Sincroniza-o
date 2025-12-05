
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DocFile, AppConfig, UserProfile, Notification, DifyProfile } from './types';
import { ConfigModal } from './components/ConfigModal';
import { Dashboard } from './components/Dashboard';
import { ToastContainer } from './components/ToastContainer';
import { ConfirmationModal } from './components/ConfirmationModal';
import { syncFileToDify } from './services/difyService';
import { BACKEND_URL } from './constants';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const SCOPES = 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const STORAGE_KEY_WATCHED_MAP = 'docsync_watched_files_map';

const App: React.FC = () => {
  const [config, setConfig] = useState<AppConfig>({
      googleClientId: '',
      googleApiKey: '',
      profiles: [],
      activeProfileId: '',
      autoSync: false,
      syncInterval: 5
  });
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [watchedFilesMap, setWatchedFilesMap] = useState<Record<string, string[]>>(() => {
      const saved = localStorage.getItem(STORAGE_KEY_WATCHED_MAP);
      return saved ? JSON.parse(saved) : {};
  });
  
  const [syncHistoryMap, setSyncHistoryMap] = useState<Record<string, Record<string, string>>>({});
  const [rawDriveFiles, setRawDriveFiles] = useState<any[]>([]); 
  const [files, setFiles] = useState<DocFile[]>([]); 
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [gapiInited, setGapiInited] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
    isDestructive?: boolean;
  }>({ isOpen: false, title: '', message: '', action: () => {} });

  const configRef = useRef(config);
  const watchedMapRef = useRef(watchedFilesMap);
  const historyMapRef = useRef(syncHistoryMap);
  const isSyncingRef = useRef(isSyncing);

  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { 
      watchedMapRef.current = watchedFilesMap; 
      localStorage.setItem(STORAGE_KEY_WATCHED_MAP, JSON.stringify(watchedFilesMap)); 
  }, [watchedFilesMap]);
  
  useEffect(() => { historyMapRef.current = syncHistoryMap; }, [syncHistoryMap]);
  useEffect(() => { isSyncingRef.current = isSyncing; }, [isSyncing]);

  const notify = (title: string, message: string, type: Notification['type'] = 'info') => {
      const id = Math.random().toString(36).substr(2, 9);
      setNotifications(prev => [...prev, { id, title, message, type }]);
  };
  const removeNotification = (id: string) => setNotifications(prev => prev.filter(n => n.id !== id));

  const getBackendUrl = () => {
    let url = BACKEND_URL.replace(/\/$/, "");
    if ((!url || url.includes("SEU-LINK")) && window.location.hostname === 'localhost') {
        return 'http://localhost:3000';
    }
    return url;
  };

  const loadInitialData = async () => {
    try {
        const url = getBackendUrl();
        const resConfig = await fetch(`${url}/api/config`, { headers: { "ngrok-skip-browser-warning": "true" } });
        if (!resConfig.ok) throw new Error("Connection failed");
        const serverConfig = await resConfig.json();
        setConfig(serverConfig);

        try {
            const resHistory = await fetch(`${url}/api/history`, { headers: { "ngrok-skip-browser-warning": "true" } });
            if (resHistory.ok) {
                const historyData = await resHistory.json();
                setSyncHistoryMap(historyData || {});
            }
        } catch (hErr) {}

        setLoadingConfig(false);
    } catch (e: any) {
        notify("Backend Disconnected", "Ensure server.js is running.", "error");
        setLoadingConfig(false);
    }
  };

  useEffect(() => { loadInitialData(); }, []);

  const saveHistoryToServer = async (newHistory: any) => {
      try {
          const url = getBackendUrl();
          await fetch(`${url}/api/history`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', "ngrok-skip-browser-warning": "true" },
              body: JSON.stringify(newHistory)
          });
      } catch (e) { console.error(e); }
  };

  const handleSaveConfig = async (newConfig: AppConfig) => {
      try {
        const url = getBackendUrl();
        const res = await fetch(`${url}/api/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-User-Email': userProfile?.email || '', "ngrok-skip-browser-warning": "true" },
            body: JSON.stringify(newConfig)
        });
        if (!res.ok) throw new Error("Save failed");
        setConfig(newConfig); 
        setIsConfigOpen(false);
        notify("Saved", "System configuration updated.", "success");
      } catch (e: any) {
          notify("Error", e.message, "error");
      }
  };

  const mapFilesToActiveProfile = useCallback(() => {
      if (!config.activeProfileId) return;
      const currentProfileId = config.activeProfileId;
      const rawData = rawDriveFiles; 
      const watchedList = watchedFilesMap[currentProfileId] || [];
      const historyList = syncHistoryMap[currentProfileId] || {};

      const mapped = rawData.map(dFile => {
          const isWatched = watchedList.includes(dFile.id);
          const lastSyncTimeStr = historyList[dFile.id];
          let status: DocFile['status'] = 'ignorado';
          if (isWatched) {
              if (!lastSyncTimeStr) status = 'pendente';
              else {
                  const modTime = new Date(dFile.modifiedTime).getTime();
                  const syncTime = new Date(lastSyncTimeStr).getTime();
                  status = (modTime > (syncTime + 60000)) ? 'pendente' : 'sincronizado';
              }
          }
          return {
              id: dFile.id,
              name: dFile.name,
              mimeType: dFile.mimeType,
              modifiedTime: dFile.modifiedTime,
              webViewLink: dFile.webViewLink,
              status,
              lastSynced: lastSyncTimeStr,
              watched: isWatched
          } as DocFile;
      });

      mapped.sort((a, b) => {
          if (a.watched !== b.watched) return a.watched ? -1 : 1;
          if (a.status === 'pendente' && b.status !== 'pendente') return -1;
          if (b.status === 'pendente' && a.status !== 'pendente') return 1;
          return new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime();
      });

      setFiles(mapped);
  }, [config.activeProfileId, watchedFilesMap, syncHistoryMap, rawDriveFiles]);

  useEffect(() => { mapFilesToActiveProfile(); }, [mapFilesToActiveProfile]);

  const toggleFileWatch = (fileId: string) => {
      const profileId = config.activeProfileId;
      setWatchedFilesMap(prev => {
          const currentList = prev[profileId] || [];
          const exists = currentList.includes(fileId);
          const newList = exists ? currentList.filter(id => id !== fileId) : [...currentList, fileId];
          return { ...prev, [profileId]: newList };
      });
  };

  const handleProfileChange = (profileId: string) => setConfig(prev => ({ ...prev, activeProfileId: profileId }));

  useEffect(() => {
    if (loadingConfig || !config.googleClientId) return;
    const initGoogle = async () => {
        if (typeof window.gapi === 'undefined' || typeof window.google === 'undefined') return;
        try {
            if (!gapiInited) {
                await new Promise<void>((resolve) => window.gapi.load('client', resolve));
                if (config.googleApiKey) {
                   await window.gapi.client.init({ apiKey: config.googleApiKey, discoveryDocs: [DISCOVERY_DOC] });
                   setGapiInited(true);
                }
            }
            if (!tokenClient && config.googleClientId) {
                const client = window.google.accounts.oauth2.initTokenClient({
                    client_id: config.googleClientId,
                    scope: SCOPES,
                    callback: async (resp: any) => {
                        if (resp.error) return;
                        setAccessToken(resp.access_token);
                        if (window.gapi.client) window.gapi.client.setToken(resp);
                        await fetchUserProfile(resp.access_token);
                        setIsConnected(true);
                    },
                });
                setTokenClient(client);
            }
        } catch (e) { console.error(e); }
    };
    initGoogle();
  }, [config, loadingConfig, gapiInited, tokenClient]);

  const fetchUserProfile = async (token: string) => {
      try {
          const res = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${token}`);
          const data = await res.json();
          setUserProfile({ name: data.name, email: data.email, picture: data.picture });
      } catch (e) {}
  };

  const handleConnectDrive = () => {
    if (!config.googleClientId) return;
    if (tokenClient) tokenClient.requestAccessToken({ prompt: 'consent' });
  };

  const handleDisconnect = () => {
      setConfirmModal({
          isOpen: true,
          title: "Sign Out",
          message: "Disconnect from Google Drive?",
          isDestructive: true,
          action: () => {
              const token = window.gapi.client.getToken();
              if (token !== null) {
                  window.google.accounts.oauth2.revoke(token.access_token, () => {
                      window.gapi.client.setToken('');
                      setAccessToken(null);
                      setUserProfile(null);
                      setIsConnected(false);
                      setRawDriveFiles([]);
                  });
              }
          }
      });
  };

  const fetchDriveFiles = async (queryTerm: string = '') => {
    if (!gapiInited || !isConnected) return;
    try {
        let query = "trashed = false and (mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/pdf' or mimeType = 'text/plain' or mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')";
        if (queryTerm) {
            query += ` and name contains '${queryTerm.replace(/'/g, "\\'")}'`;
            notify("Searching", "Filtering files...", "info");
        }
        const response = await window.gapi.client.drive.files.list({
            'pageSize': 60,
            'fields': 'files(id, name, mimeType, modifiedTime, webViewLink)',
            'q': query,
            'supportsAllDrives': true,
            'includeItemsFromAllDrives': true
        });
        const dFiles = response.result.files;
        if (dFiles) {
            setRawDriveFiles(dFiles); 
            if(queryTerm) notify("Done", `${dFiles.length} files found.`, "success");
        }
    } catch (err: any) {
        if (err.status === 401) setIsConnected(false);
    }
  };

  useEffect(() => {
      if (isConnected && gapiInited) {
          const t = setTimeout(() => fetchDriveFiles(), 800);
          return () => clearTimeout(t);
      }
  }, [isConnected, gapiInited]);

  const processSync = async (file: DocFile, targetProfile?: DifyProfile) => {
      const profile = targetProfile || config.profiles.find(p => p.id === config.activeProfileId);
      if (!profile) return;
      const isCurrentView = profile.id === config.activeProfileId;
      try {
            if (isCurrentView) setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'sincronizando' } : f));
            
            let content = '';
            if (file.mimeType.includes('google-apps')) {
                const resp = await window.gapi.client.drive.files.export({ fileId: file.id, mimeType: 'text/plain' });
                content = resp.body;
            } else {
                const resp = await window.gapi.client.drive.files.get({ fileId: file.id, alt: 'media' });
                content = resp.body;
            }

            const enhancedContent = `---
Arquivo: ${file.name}
Data Mod: ${file.modifiedTime}
Link: ${file.webViewLink || 'N/A'}
---
${content}`;

            const result = await syncFileToDify(enhancedContent, file.name, configRef.current, profile);
            
            if (result.success) {
                const now = new Date().toISOString();
                setSyncHistoryMap(prev => {
                    const newState = {
                        ...prev,
                        [profile.id]: { ...(prev[profile.id] || {}), [file.id]: now }
                    };
                    saveHistoryToServer(newState);
                    return newState;
                });
                if (isCurrentView) notify("Success", "File synced successfully.", "success");
            } else {
                throw new Error(result.message);
            }
        } catch (err: any) {
            notify("Sync Failed", err.message, "error");
            if (isCurrentView) setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'erro' } : f));
        }
  };

  const handleSyncAll = () => {
      const candidates = files.filter(f => f.watched && (f.status === 'pendente' || f.status === 'erro'));
      if (candidates.length === 0) {
          notify("No updates", "All watched files are up to date.", "info");
          return;
      }
      setConfirmModal({
          isOpen: true,
          title: "Batch Sync",
          message: `Sync ${candidates.length} pending files?`,
          action: () => {
              setIsSyncing(true);
              (async () => {
                  for (const f of candidates) await processSync(f);
                  setIsSyncing(false);
                  notify("Batch Complete", "Synchronization finished.", "success");
              })();
          }
      });
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (config.autoSync && isConnected && !loadingConfig) {
        interval = setInterval(async () => {
            if (isSyncingRef.current) return;
            try {
                const response = await window.gapi.client.drive.files.list({
                    'pageSize': 100,
                    'fields': 'files(id, name, mimeType, modifiedTime)',
                    'q': "trashed = false and (mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/pdf' or mimeType = 'text/plain' or mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')"
                });
                const driveFiles = response.result.files as any[];
                if (!driveFiles) return;
                
                for (const profile of configRef.current.profiles) {
                    const watchedIds = watchedMapRef.current[profile.id] || [];
                    const history = historyMapRef.current[profile.id] || {};
                    if (watchedIds.length === 0) continue;
                    const pendingFiles = driveFiles.filter(dFile => {
                        if (!watchedIds.includes(dFile.id)) return false;
                        const lastSync = history[dFile.id];
                        if (!lastSync) return true;
                        return new Date(dFile.modifiedTime).getTime() > (new Date(lastSync).getTime() + 60000);
                    });
                    if (pendingFiles.length > 0) {
                        notify("Auto Sync", `Updating ${pendingFiles.length} files...`, "info");
                        setIsSyncing(true);
                        for (const rawFile of pendingFiles) {
                            await processSync({
                                id: rawFile.id, name: rawFile.name, mimeType: rawFile.mimeType, modifiedTime: rawFile.modifiedTime,
                                watched: true, status: 'pendente'
                            } as DocFile, profile);
                        }
                        setIsSyncing(false);
                    }
                }
            } catch (e: any) { 
                if (e.status === 401) { setIsConnected(false); clearInterval(interval); }
            }
        }, config.syncInterval * 60 * 1000);
    }
    return () => clearInterval(interval);
  }, [config.autoSync, config.syncInterval, isConnected, loadingConfig]);

  if (loadingConfig) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-white">
              <div className="flex flex-col items-center">
                  <div className="w-12 h-12 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <h2 className="text-xs font-bold text-gray-900 tracking-widest uppercase">Initializing System</h2>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9FC] font-sans text-gray-900">
      {/* HEADER: Enterprise Black */}
      <header className="bg-black text-white border-b border-gray-800 sticky top-0 z-30 h-14 flex-shrink-0 shadow-md">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-full flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded bg-white flex items-center justify-center">
                        <i className="fas fa-cube text-black text-xs"></i>
                    </div>
                    <span className="text-sm font-bold tracking-tight">TradeStars<span className="text-gray-500 font-normal ml-1">Sync</span></span>
                </div>
                <div className="h-4 w-px bg-gray-800 hidden sm:block"></div>
                <div className="hidden sm:block text-[10px] text-gray-400 font-medium tracking-wide uppercase">Dify Integration</div>
            </div>
            
            {isConnected && userProfile && (
                <div className="flex items-center gap-3">
                     <span className="text-xs text-gray-400 hidden sm:block font-medium">{userProfile.email}</span>
                     <img src={userProfile.picture} alt="" className="w-6 h-6 rounded-full border border-gray-700 bg-gray-800" />
                </div>
            )}
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 overflow-hidden flex flex-col">
        <Dashboard 
            files={files}
            config={config}
            user={userProfile}
            isSyncing={isSyncing}
            isConnected={isConnected}
            onConnectDrive={handleConnectDrive}
            onDisconnect={handleDisconnect}
            onSyncAll={handleSyncAll}
            onSyncOne={processSync}
            onToggleWatch={toggleFileWatch}
            onChangeProfile={handleProfileChange}
            onDeepSearch={(term) => fetchDriveFiles(term)}
            onOpenConfig={() => setIsConfigOpen(true)}
        />
      </main>

      <ConfigModal 
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={config}
        user={userProfile}
        onSave={handleSaveConfig}
      />
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => { confirmModal.action(); setConfirmModal(prev => ({ ...prev, isOpen: false })); }}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        isDestructive={confirmModal.isDestructive}
      />
      <ToastContainer notifications={notifications} removeNotification={removeNotification} />
    </div>
  );
};

export default App;
