const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.post('/sync', (req, res) => {
    const { userId, changes, lastSyncedAt } = req.body;
    const clientLastSync = lastSyncedAt || 0;

    console.log(`\n📦 [REQ] User: ${userId} | Deltas: ${changes.length}`);

    if (changes.length === 0) {
        console.log("[SYNC] Nenhum delta enviado. Passando para o download.");
    } else {
        let updatedCount = 0;
        changes.forEach(item => {
            const [texto, freq, clientTime] = item;
            if (db.updateUserItem(userId, texto, freq, clientTime)) {
                updatedCount++;
            }
        });
        console.log(`[SYNC] ${updatedCount} itens atualizados/inseridos.`);
    }

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


app.get('/sync/full-download', (req, res) => {
    const userId = req.query.userId; 

    if (!userId) {
        return res.status(400).json({ error: "userId é obrigatório." });
    }

    const userDB = db.getUserData(userId);
    const fullData = [];

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