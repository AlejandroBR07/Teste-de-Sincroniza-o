
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch'; 

// --- CONFIGURAÇÃO MASTER (PREENCHA AQUI) ---
// O usuário final não verá isso. Apenas o servidor saberá.
const PORT = 3000;
const DATA_FILE = 'server_config.json'; 

// 1. Configure aqui as credenciais do Google Cloud (Drive API)
// Se você não tiver, crie em console.cloud.google.com -> Credentials -> OAuth 2.0 Client ID
const GOOGLE_CLIENT_ID = "631138999149-3qe6r9hlb4ac84l955g8kg52muetmtv4.apps.googleusercontent.com"; 
const GOOGLE_API_KEY = "AIzaSyDz68yE3PozKjvXt4vaRsYxWe0h981wraU"; 

// 2. Configure aqui o Dify
const DIFY_DATASET_ID = "dataset-ebBnUsz69YPq6TWRuDBoPu";
const DIFY_API_KEY = ""; // Cole a chave secreta do Dify aqui (começa com 'sk-...')

// Admins hardcoded no servidor
const SERVER_ADMINS = [
  'di07@tradestars.com.br',
  'di04@tradestars.com.br'
];

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Email', 'ngrok-skip-browser-warning']
}));
app.use(express.json({ limit: '10mb' }));

// --- GERENCIAMENTO DE DADOS (PERSISTÊNCIA) ---

// Configuração Padrão Inicial (Já nasce configurada com as constantes acima)
const defaultConfig = {
    googleClientId: GOOGLE_CLIENT_ID.includes("COLE_") ? "" : GOOGLE_CLIENT_ID,
    googleApiKey: GOOGLE_API_KEY.includes("COLE_") ? "" : GOOGLE_API_KEY,
    profiles: [
        {
            id: 'default-trade',
            name: 'TradeStars KB',
            difyDatasetId: DIFY_DATASET_ID,
            difyApiKey: DIFY_API_KEY, 
            difyBaseUrl: 'https://api.dify.ai/v1'
        }
    ],
    activeProfileId: 'default-trade',
    autoSync: false,
    syncInterval: 5
};

// Função para ler config
const getConfig = () => {
    // Se o arquivo não existe, cria com o default (que contem as constantes hardcoded)
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify(defaultConfig, null, 2));
        return defaultConfig;
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
};

// Função para salvar config
const saveConfig = (newConfig) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(newConfig, null, 2));
};

// --- ROTAS DA API ---

app.get('/api/config', (req, res) => {
    const config = getConfig();
    
    // Cria uma cópia segura para enviar ao front
    const safeConfig = {
        ...config,
        profiles: config.profiles.map(p => ({
            ...p,
            difyApiKey: p.difyApiKey ? '***HIDDEN***' : '' 
        }))
    };
    res.json(safeConfig);
});

app.post('/api/config', (req, res) => {
    const userEmail = req.header('X-User-Email');
    const currentConfig = getConfig();
    
    // Se não tem Client ID configurado ainda, permite setup (para facilitar desenvolvimento)
    const isFirstSetup = !currentConfig.googleClientId;

    if (!isFirstSetup && (!userEmail || !SERVER_ADMINS.includes(userEmail))) {
        return res.status(403).json({ success: false, message: 'Acesso negado. Apenas administradores podem alterar configurações.' });
    }

    const newConfigData = req.body;

    const profilesToSave = newConfigData.profiles.map(newP => {
        if (newP.difyApiKey === '***HIDDEN***') {
            const oldP = currentConfig.profiles.find(op => op.id === newP.id);
            return { ...newP, difyApiKey: oldP ? oldP.difyApiKey : '' };
        }
        return newP;
    });

    const finalConfig = {
        ...newConfigData,
        profiles: profilesToSave
    };

    saveConfig(finalConfig);
    console.log(`[CONFIG] Configurações atualizadas por ${userEmail || 'SETUP_INICIAL'}`);
    res.json({ success: true, message: 'Configurações salvas no servidor.' });
});

app.post('/api/dify/sync', async (req, res) => {
    try {
        const { name, text, datasetId } = req.body;
        const config = getConfig();

        const profile = config.profiles.find(p => p.difyDatasetId === datasetId);

        if (!profile || !profile.difyApiKey) {
             return res.status(500).json({ success: false, message: 'API Key do Dify não encontrada no servidor para este Dataset.' });
        }

        const url = `${profile.difyBaseUrl || 'https://api.dify.ai/v1'}/datasets/${datasetId}/document/create_by_text`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${profile.difyApiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: name,
                text: text,
                indexing_technique: "high_quality",
                process_rule: {
                    mode: "automatic"
                }
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || `Erro Dify: ${response.status}`);
        }

        res.json({ success: true, message: 'Documento indexado com sucesso.' });

    } catch (error) {
        console.error("Erro no Proxy Dify:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/', (req, res) => {
    res.send('Backend TradeSync Online.');
});

app.listen(PORT, () => {
    console.log(`\n🚀 Backend rodando na porta ${PORT}`);
    console.log(`📂 Configurações salvas em: ${path.join(__dirname, DATA_FILE)}`);
    console.log(`⚠️  Não se esqueça de preencher as chaves no topo do arquivo server.js!`);
});
