import AutoCompleteDB from './AutoCompleteDB/AutoCompleteDB.js';
import AutoCompleteRepository from './AutoCompleteDB/AutoCompleteRepository.js';
import TrieService from './AutoCompleteTrie/TrieService.js';
import AutoCompleteSyncService from './AutoCompleteSync/AutoCompleteSyncService.js';

export default class AutoCompleteSystem {
    constructor(userId) {
        if (!userId) throw new Error("AutoCompleteSystem: userId é obrigatório.");
        this.userId = userId;
        this.db = new AutoCompleteDB(); 
        this.repository = new AutoCompleteRepository(this.db); 
        this.trieService = new TrieService();
        this.syncService = new AutoCompleteSyncService('http://localhost:3000');
        this.isCleanSlate = false;
    }


    async initialize() {
        console.info("[INIT] Inicializando AutoCompleteSystem...");
        const userSentences = await this.repository.findUserSentences(this.userId);

        if (userSentences.length === 0) {
            this.isCleanSlate = true;
            console.warn("[INIT] Local DB vazio. Forçando Full Download...");
            
            try {
                const serverDataArray = await this.syncService.fullDownload(this.userId); //|| []; 
                await this.repository.processFullDownloadData(
                    this.userId,
                    serverDataArray
                );
                const sentencesForTrie = await this.repository.findUserSentences(this.userId);
                this.trieService.rebuildTrieFromList(sentencesForTrie);
                this.isCleanSlate = false;
                console.log(`[INIT] Sucesso no Full Download. ${serverDataArray.length} sentenças carregadas.`);

            } catch (error) {
                console.error("[INIT] Falha crítica no Full Download:", error);
                throw error;
            }

        } else {
            const lastSyncedAt = Math.max(...userSentences.map(s => s.updatedAt || 0));
            const dirtyItems = await this.repository.findUnsyncedSentences(this.userId);
            const changesJson = dirtyItems.length > 0 
                ? dirtyItems.map(item => [item.t, item.f, item.updatedAt])
                : [];

            try {
                const syncResponse = await this.syncService.sync(
                    this.userId, 
                    changesJson, 
                    lastSyncedAt
                );

                //console.log(syncResponse);
                if (syncResponse.serverChangesJson) {
                    await this.smartMerge(syncResponse.serverChangesJson);
                }
                
                await this.markAsSynced(dirtyItems);

                
                console.log("[INIT] Delta Sync concluído com sucesso.");
                
            } catch (error) {
                console.warn("[INIT] Falha no Delta Sync. Usando dados locais.", error);
            }
            
            // 7. Garante que a RAM está totalmente populada.
            // Se houve Merge, a RAM foi atualizada item por item. 
            // Se foi um Delta Sync sem merge, a RAM já estava pronta.
            // Aqui usamos a lista inicial 'userSentences' (que é lida no começo) para reconstruir a Trie se necessário.
            this.trieService.rebuildTrieFromList(userSentences); 
        }
    }


    async loadSentencesFromDBAndRebuildTrie() {
        try {
            const userSentences = await this.repository.findUserSentences(this.userId); 

            if (userSentences.length > 0) {
                this.trieService.rebuildTrieFromList(userSentences); 
                this.isCleanSlate = false; 
                console.log(`[AutoComplete] ${userSentences.length} sentenças carregadas...`);
            } else {
                // 💡 DETECÇÃO DE ESTADO LIMPO AQUI!
                this.isCleanSlate = true; 
                console.warn("[AutoComplete] IndexedDB VAZIO. Flag 'isCleanSlate' ativada.");
            }
        } catch (error) {
            console.error("Erro ao carregar do IndexedDB:", error);
            this.isCleanSlate = true;
        }
    }


    async insertSentenceInTrieAndDB(sentence) {
        if (!sentence) return;

        const userSentences = await this.repository.findUserSentences(this.userId);
        if (userSentences.length === 0) {
            await this.initialize();
        }

        const frequency = this.trieService.insertNewSentenceInTrie(sentence); 
        const timestampAgora = Date.now();

        try {
            await this.repository.saveSentence({
                userId: this.userId,
                sentence: sentence,
                frequency: frequency,
                timestamp: timestampAgora
            });
        } catch (err) {
            // A camada de negócio trata a falha do DB
            console.error("Erro ao registrar uso da sentença:", err);
        }
    }

    
    getSuggestions(prefix) {
        return this.trieService.getSuggestions(prefix);
    }


    exportToJson(prettyPrint = false) {
        // 🚀 Delega 100% da exportação ao serviço de Trie
        return this.trieService.exportToJson(prettyPrint);
    }


    async smartMerge(serverDataJson) {
        const serverItems = JSON.parse(serverDataJson);
        const itemsToUpdateDB = []; // Coleciona os itens que o servidor diz serem mais novos

        // A transação DEVE ser movida para o Repositório, mas por agora, vamos simplificar a chamada.
        
        for (const item of serverItems) {
            const [texto, freqServer, timeServer] = item;
            
            // 1. Busca o que eu tenho localmente sobre essa palavra (Ainda precisamos de uma busca única)
            // 💡 NOTA: O Repositório deve nos ajudar a buscar o item local.
            const localItem = await this.repository.findSentenceByText(this.userId, texto); // <--- ASSUME NOVO MÉTODO NO REPOSITORY

            let devoAtualizar = false;

            if (!localItem) {
                devoAtualizar = true;
            } else {
                if (timeServer > (localItem.updatedAt || 0)) {
                    devoAtualizar = true;
                    console.log(`[Merge] Atualizando "${texto}": Server (${timeServer}) > Local (${localItem.updatedAt})`);
                } else {
                    console.log(`[Merge] Ignorando "${texto}": Meu dado é mais recente.`);
                }
            }

            if (devoAtualizar) {
                // Prepara os dados limpos para serem salvos (sincronizado: 1)
                this.trieService.restoreSentenceInTrie(texto, freqServer); // 🚀 Atualiza RAM
                itemsToUpdateDB.push({
                    userId: this.userId,
                    t: texto,
                    f: freqServer,
                    updatedAt: timeServer,
                    sincronizado: 1 // Recebido do Server, então está limpo.
                });
            }
        }
        
        // 🚀 NOVIDADE: Delega a gravação em lote da lista de merges ao Repositório
        if (itemsToUpdateDB.length > 0) {
            await this.repository.bulkMergeSentences(itemsToUpdateDB); // <--- ASSUME NOVO MÉTODO NO REPOSITORY
        }
        
        console.log("Smart Merge concluído.");
    }


    async getUnsyncedData() {
        // 🚀 Delega a busca do delta ao Repositório
        const dirtyItems = await this.repository.findUnsyncedSentences(this.userId);

        if (dirtyItems.length === 0) return null;

        // Formato de retorno JSON é decidido aqui (camada de coordenação)
        return JSON.stringify(dirtyItems.map(item => [item.t, item.f, item.updatedAt]));
    }


    async markAsSynced(keys) {
        await this.repository.markSentencesAsSynced(keys);
        
        console.log(`[Sync] ${keys} itens marcados como sincronizados.`);
    }
    
    async clearUserData() {
        // 🚀 Delega a limpeza do DB ao Repositório
        await this.repository.clearUserSentences(this.userId);
        
        // A lógica de RAM e Flags continua aqui (porque o System é o maestro)
        this.trieService = new TrieService(); // Simplesmente recria o root no serviço
        this.isCleanSlate = true;
        console.log(`Dados do usuário ${this.userId} apagados.`);
    }
}