export default class SyncService {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    async login(username) {
        const response = await fetch(`${this.baseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        return await response.json(); // Espera receber { userId: "..." }
    }

    async sync(userId, changes, lastSyncedAt) {
        try {
            const response = await fetch(`${this.baseUrl}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    changes,
                    lastSyncedAt
                })
            });

            if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
            
            return await response.json(); // Retorna o Delta do servidor

        } catch (error) {
            console.error("Falha na sincronização:", error);
            throw error;
        }
    }

    async fullDownload(userId) {
        console.log(`[API] Solicitando Full Download para ${userId}...`);
        const url = `${this.baseUrl}/sync/full-download?userId=${userId}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
            throw new Error(`Erro ${response.status} ao solicitar Full Download.`);
        }
        
        return await response.json(); // Retorna o array de dados completos
    }
}