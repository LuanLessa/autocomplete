export default class AutoCompleteSyncService {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
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
            
            const data = await response.json();
            return data;

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
        const data = await response.json();
        
        return data;
    }
}