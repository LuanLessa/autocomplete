import AutoCompleteDB from './AutoCompleteDB/AutoCompleteDB.js';
import AutoCompleteRepository from './AutoCompleteDB/AutoCompleteRepository.js';
import TrieService from './AutoCompleteTrie/TrieService.js';
import AutoCompleteSyncService from './AutoCompleteSync/AutoCompleteSyncService.js';

/**
 * Controlador Principal (Facade) do sistema de AutoComplete.
 * Responsável por orquestrar a inicialização, sincronização e manipulação de dados
 * entre o banco local (IndexedDB), a memória (Trie) e a API remota.
 */
export default class AutoCompleteSystem {
    /**
     * Inicializa o sistema para um usuário específico.
     * Instancia as dependências de Repositório, Trie e Serviço de Sync.
     * * @param {string|number} userId - Identificador único do usuário. Obrigatório.
     * @throws {Error} Se userId não for fornecido.
     */
    constructor(userId) {
        if (!userId) throw new Error("AutoCompleteSystem: userId é obrigatório.");
        this.userId = userId;
        
        // Camada de Persistência (Disco/Browser)
        this.db = new AutoCompleteDB(); 
        this.repository = new AutoCompleteRepository(this.db); 
        
        // Camada de Estrutura de Dados (Memória RAM)
        this.trieService = new TrieService();
        
        // Camada de Rede (Network)
        this.syncService = new AutoCompleteSyncService('http://localhost:3000');
        
        // Estado interno
        this.isCleanSlate = false; // Indica se o DB estava vazio
        this.syncIntervalId = null; // ID do timer de sync automático
        this.isSyncing = false; // Flag para evitar condições de corrida (race conditions)
    }

    /**
     * Fluxo mestre de inicialização e sincronização.
     * Decide inteligentemente entre fazer um "Full Download" (se o banco local estiver vazio)
     * ou um "Delta Sync" (se já existirem dados locais).
     * * 1. Carrega dados do Repositório.
     * 2. Se vazio -> Baixa tudo da API -> Salva no DB -> Monta a Trie.
     * 3. Se existe -> Envia mudanças locais pendentes -> Atualiza flags -> Monta a Trie.
     */
    async initialize() {
        // Bloqueio de reentrância: evita rodar duas sincronizações ao mesmo tempo
        if (this.isSyncing) return;
        this.isSyncing = true;

        console.info("[INIT] Inicializando/Sincronizando AutoCompleteSystem...");

        try {
            const userSentences = await this.repository.findUserSentences(this.userId);

            // Cenario A: Primeira instalação ou cache limpo (Cold Start)
            if (userSentences.length === 0) {
                this.isCleanSlate = true;
                console.warn("[INIT] Local DB vazio. Forçando Full Download...");
                
                try {
                    // Busca dados brutos do servidor
                    const serverDataArray = await this.syncService.fullDownload(this.userId);
                    
                    // Persiste no IndexedDB via repositório
                    await this.repository.processFullDownloadData(
                        this.userId,
                        serverDataArray
                    );
                    
                    // Reconstrói a Trie na memória com os dados recém-salvos
                    const sentencesForTrie = await this.repository.findUserSentences(this.userId);
                    this.trieService.rebuildTrieFromList(sentencesForTrie);
                    
                    this.isCleanSlate = false;
                    console.log(`[INIT] Sucesso no Full Download. ${serverDataArray.length} sentenças carregadas.`);

                } catch (error) {
                    console.error("[INIT] Falha crítica no Full Download:", error);
                    throw error; // Interrompe o fluxo se o download inicial falhar
                }

            } else {
                // Cenário B: Uso contínuo (Warm Start) - Sincronização Incremental
                const lastSyncedAt = Math.max(...userSentences.map(s => s.updatedAt || 0));
                
                // Busca itens modificados localmente (dirty reads)
                const dirtyItems = await this.repository.findUnsyncedSentences(this.userId);
                
                // Prepara payload compacto: [termo, frequencia, timestamp]
                const changesJson = dirtyItems.length > 0 
                    ? dirtyItems.map(item => [item.t, item.f, item.updatedAt])
                    : [];

                try {
                    // Envia mudanças para a API
                    const syncResponse = await this.syncService.sync(
                        this.userId, 
                        changesJson, 
                        lastSyncedAt
                    );
                    
                    // Se sucesso, marca os itens locais como "sincronizados"
                    await this.markAsSynced(dirtyItems);
                    console.log("[INIT] Delta Sync concluído com sucesso.");
                    
                } catch (error) {
                    // Soft fail: Se a API falhar, o sistema continua funcionando offline
                    console.warn("[INIT] Falha no Delta Sync. Usando dados locais.", error);
                }
                
                // Independente do sync, a Trie é montada com o que temos localmente (Offline First)
                this.trieService.rebuildTrieFromList(userSentences); 
            }
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Adiciona uma nova sentença ao sistema (Write-Through).
     * Atualiza a memória (Trie) imediatamente para feedback instantâneo e
     * persiste no disco (DB) assincronamente.
     * * @param {string} sentence - A frase ou termo digitado pelo usuário.
     */
    async insertSentenceInTrieAndDB(sentence) {
        if (!sentence) return;

        // Garante que o sistema foi inicializado antes de inserir
        const userSentences = await this.repository.findUserSentences(this.userId);
        if (userSentences.length === 0) {
            await this.initialize();
        }

        // 1. Atualiza Trie (RAM) e obtém nova frequência
        const frequency = this.trieService.insertNewSentenceInTrie(sentence); 
        const timestampAgora = Date.now();

        try {
            // 2. Persiste no IndexedDB (Disco)
            await this.repository.saveSentence({
                userId: this.userId,
                sentence: sentence,
                frequency: frequency,
                timestamp: timestampAgora
            });
        } catch (err) {
            console.error("Erro ao registrar uso da sentença:", err);
            // Nota: Falha no DB não deve quebrar a UI, pois a Trie já foi atualizada
        }
    }

    /**
     * Busca sugestões baseadas no prefixo digitado.
     * Operação puramente em memória (extremamente rápida).
     * * @param {string} prefix - O texto que o usuário está digitando.
     * @returns {Array<string>} Lista de sugestões ordenadas por frequência.
     */
    getSuggestions(prefix) {
        return this.trieService.getSuggestions(prefix);
    }

    /**
     * Marca itens locais como sincronizados após confirmação do servidor.
     * @param {Array<Object>} keys - Lista de objetos ou chaves que foram sincronizados.
     */
    async markAsSynced(keys) {
        await this.repository.markSentencesAsSynced(keys);
        console.log(`[Sync] ${keys.length} itens marcados como sincronizados.`);
    }
    
    /**
     * Limpa completamente os dados do usuário (Hard Reset).
     * Remove do banco local e limpa a árvore em memória.
     */
    async clearUserData() {
        await this.repository.clearUserSentences(this.userId);
        
        this.trieService = new TrieService(); // Reinicia a instância da Trie
        this.isCleanSlate = true;
        console.log(`Dados do usuário ${this.userId} apagados.`);
    }

    /**
     * Inicia o ciclo de sincronização em segundo plano (Polling).
     * @param {number} intervalMs - Intervalo em milissegundos (Padrão: 30s).
     */
    startPeriodicSync(intervalMs = 30000) { 
        if (this.syncIntervalId) {
            console.warn("[System] Sync automático já está rodando.");
            return; 
        } 

        console.log(`[System] Sync automático iniciado a cada ${intervalMs/1000}s`);
        
        // Executa imediatamente a primeira vez
        this.initialize();

        // Agenda repetições
        this.syncIntervalId = setInterval(() => {
            this.initialize();
        }, intervalMs);
    }

    /**
     * Para o ciclo de sincronização em segundo plano.
     * Útil quando o componente é desmontado ou o usuário faz logout.
     */
    stopPeriodicSync() {
        if (this.syncIntervalId) {
            clearInterval(this.syncIntervalId);
            this.syncIntervalId = null;
            console.log("[System] Sync automático parado.");
        }
    }
}