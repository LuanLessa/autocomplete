const express = require('express');
const cors = require('cors');
const db = require('./database'); // Importa o "banco"

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.post('/sync', (req, res) => {
    const { userId, changes, lastSyncedAt } = req.body;
    const clientLastSync = lastSyncedAt || 0;

    console.log(`\n📦 [REQ] User: ${userId} | Deltas: ${changes.length}`);

    // CORREÇÃO: Ignora uploads vazios. NUNCA apaga.
    if (changes.length === 0) {
        console.log("[SYNC] Nenhum delta enviado. Passando para o download.");
        // Não precisamos fazer nada com o banco de dados principal.
    } else {
        // 1. Processa Uploads (Usa a função do database.js)
        let updatedCount = 0;
        changes.forEach(item => {
            const [texto, freq, clientTime] = item;
            if (db.updateUserItem(userId, texto, freq, clientTime)) {
                updatedCount++;
            }
        });
        console.log(`[SYNC] ${updatedCount} itens atualizados/inseridos.`);
    }

    // 2. Prepara Downloads (Filtra dados)
    const userDB = db.getUserData(userId);
    const deltaResponse = [];

    for (const key in userDB) {
        const item = userDB[key];
        if (item.up > clientLastSync) {
            deltaResponse.push([key, item.f, item.up]);
        }
    }

    console.log(`📤 [RES] Enviando Delta: ${deltaResponse.length} itens.`);
    res.json(deltaResponse);
});


// --- NOVA ROTA: DOWNLOAD TOTAL ---
app.get('/sync/full-download', (req, res) => {
    // ⚠ NOTA: Em produção, você precisa de autenticação para obter o userId daqui.
    // Aqui, vamos assumir que o userId é passado via query ou cabeçalho.
    const userId = req.query.userId; 

    if (!userId) {
        return res.status(400).json({ error: "userId é obrigatório." });
    }

    const userDB = db.getUserData(userId);
    const fullData = [];

    // Mapeia todas as frases armazenadas para o formato esperado pelo cliente:
    // [texto, frequencia, timestamp]
    for (const texto in userDB) {
        const item = userDB[texto];
        fullData.push([texto, item.f, item.up]);
    }

    console.log(`\n⬇️ [FULL DOWNLOAD] User: ${userId} | Enviando ${fullData.length} itens totais.`);
    res.json(fullData);
});

app.listen(PORT, () => {
    console.log(`🚀 Server rodando em http://localhost:${PORT}`);
});