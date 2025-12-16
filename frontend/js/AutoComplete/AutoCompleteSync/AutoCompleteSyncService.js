/**
 * Serviço responsável pela comunicação HTTP com a API de Autocomplete.
 * Gerencia o envio de dados locais (push) e o recebimento de dados remotos (pull).
 */
export default class AutoCompleteSyncService {
    /**
     * @param {string} baseUrl - A URL base da API (ex: 'https://api.meusistema.com/v1').
     */
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    /**
     * Realiza a Sincronização Delta (Incremental).
     * Envia apenas as mudanças locais e o timestamp da última sincronização.
     * * @param {number|string} userId - O ID do usuário dono dos dados.
     * @param {Array<Object>} changes - Lista de alterações locais (novos termos, edits, deleções) pendentes de envio.
     * @param {number|string} lastSyncedAt - Timestamp ou Token da última vez que houve sincronização com sucesso.
     * @returns {Promise<Object>} Retorna a resposta do servidor (geralmente contendo confirmação e novos dados do servidor).
     * @throws {Error} Se houver falha de rede ou resposta HTTP diferente de 2xx.
     */
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
            // Re-lança o erro para que a UI ou o controlador saiba que falhou
            throw error; 
        }
    }

    /**
     * Realiza o Download Completo (Full Load).
     * Utilizado na primeira instalação ou quando a integridade dos dados locais é perdida.
     * * @param {number|string} userId - O ID do usuário para baixar todos os dados.
     * @returns {Promise<Object>} Retorna o conjunto completo de dados do usuário.
     * @throws {Error} Se a requisição falhar.
     */
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