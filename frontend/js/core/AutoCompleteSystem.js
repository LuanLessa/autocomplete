//import Dexie from 'dexie';

// --- CAMADA DE DADOS (IndexedDB) ---
class AutoCompleteDB extends Dexie {
    constructor() {
        super('AutoCompleteDB_v3'); // Subimos versão para limpar e recriar estrutura
        
        this.version(1).stores({
            phrases: '[userId+t], userId, [userId+sincronizado]' 
        });
    }
}

// --- LÓGICA DE NEGÓCIO (Trie + Gerenciamento) ---
class TrieNode {
    constructor() {
        this.children = {};
        this.isEndOfSentence = false;
        this.frequency = 0;
        this.fullSentence = null;
    }
}

export default class AutoCompleteSystem {
    /**
     * @param {string} userId - O ID único do usuário logado (Obrigatório)
     */
    constructor(userId) {
        if (!userId) throw new Error("AutoCompleteSystem: userId é obrigatório.");

        this.userId = userId;
        this.root = new TrieNode();
        this.db = new AutoCompleteDB();

        this.isCleanSlate = false;

        // Inicialização: Carrega dados do disco para a RAM
        //this.loadFromDB();
    }

    // --- MÉTODOS DE OPERAÇÃO (USO DIÁRIO) ---
    async insert(sentence) {
        if (!sentence) return;

        // 1. Memória RAM (Instantâneo)
        let node = this.root;
        for (const char of sentence) {
            if (!node.children[char]) node.children[char] = new TrieNode();
            node = node.children[char];
        }
        node.isEndOfSentence = true;
        node.frequency++;
        node.fullSentence = sentence;

        const timestampAgora = Date.now();

        // 2. IndexedDB (Agora com AWAIT e LOG)
        try {
            await this.db.phrases.put({
                userId: this.userId,
                t: sentence,
                f: node.frequency,
                sincronizado: 0,
                updatedAt: timestampAgora // <--- CAMPO NOVO
            });
            //this.isCleanSlate = false;
            return true;
        } catch (err) {
            console.error("Erro ao salvar:", err);
            return false;
        }
    }

    getSuggestions(prefix) {
        // A busca continua 100% na memória RAM para máxima velocidade
        let node = this.root;
        for (const char of prefix) {
            if (!node.children[char]) return [];
            node = node.children[char];
        }

        const results = [];
        this._collectAllWords(node, results);
        return results.sort((a, b) => b.frequency - a.frequency);
    }

    // --- MÉTODOS DE INICIALIZAÇÃO E CARREGAMENTO ---

    async loadFromDB() {
        try {
            // Busca apenas as frases deste usuário específico
            const userPhrases = await this.db.phrases
                .where('userId')
                .equals(this.userId)
                .toArray();

            if (userPhrases.length > 0) {
                // Estado Normal: Temos dados locais.
                this.rebuildTrie(userPhrases);
                this.isCleanSlate = false; // Confirma que temos dados
                console.log(`[AutoComplete] ${userPhrases.length} frases carregadas...`);
            } else {
                // 💡 DETECÇÃO DE ESTADO LIMPO AQUI!
                this.isCleanSlate = true; 
                // O IndexedDB está vazio. Precisamos de um Full Download do servidor.
                console.warn("[AutoComplete] IndexedDB VAZIO. Flag 'isCleanSlate' ativada.");
            }
        } catch (error) {
            console.error("Erro ao carregar do IndexedDB:", error);
            this.isCleanSlate = true; // Em caso de erro de leitura, assumimos o pior (limpo)
        }
    }

    // Reconstrói a árvore a partir de uma lista plana (usado no load e no import)
    rebuildTrie(dataList) {
        // Opcional: Limpar a árvore atual se quiser um reset total
        // this.root = new TrieNode(); 

        for (const item of dataList) {
            // Insere na memória sem chamar o banco de dados de novo
            this._insertInMemory(item.t, item.f);
        }
    }

    // Auxiliar para inserir na Trie sem disparar o salvamento no banco
    _insertInMemory(sentence, freq) {
        let node = this.root;
        for (const char of sentence) {
            if (!node.children[char]) node.children[char] = new TrieNode();
            node = node.children[char];
        }
        node.isEndOfSentence = true;
        node.frequency = freq;
        node.fullSentence = sentence;
    }

    _collectAllWords(node, results) {
        if (node.isEndOfSentence) {
            results.push({ text: node.fullSentence, frequency: node.frequency });
        }
        for (const key in node.children) {
            this._collectAllWords(node.children[key], results);
        }
    }

    // --- MÉTODOS PARA O BACKEND (IMPORTAR/EXPORTAR JSON) ---

    /**
     * Gera o JSON para enviar ao servidor (Backup/Sync Up)
     * @returns {string} JSON string
     */
    exportToJson(prettyPrint = false) {
        const results = [];
        this._collectAllWords(this.root, results);
        
        // Mapeia para Array de Arrays: [ ["frase", frequencia], ... ]
        // Removemos as chaves "t" e "f" para economizar milhões de caracteres
        const minifiedData = results.map(item => [
            item.text,
            item.frequency
        ]);

        // Se você quiser ler o arquivo (bonito), passe true. 
        // Se for pra backup (leve), passe false.
        if (prettyPrint) {
            return JSON.stringify(minifiedData, null, 2);
        } else {
            return JSON.stringify(minifiedData);
        }
    }

    /**
     * Recebe dados do servidor e decide item por item quem ganha.
     * Formato esperado do server: [ ["texto", frequencia, timestamp], ... ]
     */
    async smartMerge(serverDataJson) {
        const serverItems = JSON.parse(serverDataJson);
        const itemsToSave = [];

        // Para otimizar, vamos ler o estado atual do banco para os itens que vieram
        // Isso evita leituras desnecessárias
        await this.db.transaction('rw', this.db.phrases, async () => {
            
            for (const item of serverItems) {
                const [texto, freqServer, timeServer] = item;
                
                // 1. Busca o que eu tenho localmente sobre essa palavra
                const localItem = await this.db.phrases.get([this.userId, texto]);

                let devoAtualizar = false;

                if (!localItem) {
                    // Cenário 1: Eu não tenho essa palavra. Aceito do servidor.
                    devoAtualizar = true;
                } else {
                    // Cenário 2: Eu tenho a palavra. Quem é mais novo?
                    // Se o servidor tem uma data MAIOR (mais futuro) que a minha, ele ganha.
                    if (timeServer > (localItem.updatedAt || 0)) {
                        devoAtualizar = true;
                        console.log(`[Merge] Atualizando "${texto}": Server (${timeServer}) > Local (${localItem.updatedAt})`);
                    } else {
                        console.log(`[Merge] Ignorando "${texto}": Meu dado é mais recente.`);
                    }
                }

                if (devoAtualizar) {
                    // Prepara para salvar, mas já marca como SINCRONIZADO (1)
                    // afinal, veio do servidor, então está igual ao servidor.
                    await this.db.phrases.put({
                        userId: this.userId,
                        t: texto,
                        f: freqServer,
                        updatedAt: timeServer,
                        sincronizado: 1 
                    });
                    
                    // Atualiza RAM também
                    this._insertInMemory(texto, freqServer);
                }
            }
        });
        
        console.log("Smart Merge concluído.");
    }

    /**
     * Passo 1: Busca apenas o que mudou (Delta)
     * Retorna null se não tiver novidades.
     */
    async getUnsyncedData() {
        const dirtyItems = await this.db.phrases
            .where('[userId+sincronizado]')
            .equals([this.userId, 0]) 
            .toArray();

        if (dirtyItems.length === 0) return null;

        // Agora enviamos triplas: [texto, frequencia, timestamp]
        return JSON.stringify(dirtyItems.map(item => [item.t, item.f, item.updatedAt]));
    }

    /**
     * Passo 2: O servidor confirmou que recebeu (ACK).
     * Agora marcamos esses itens como sincronizados (1).
     */
    async markAsSynced(jsonStringEnviada) {
        const items = JSON.parse(jsonStringEnviada);
        
        // Transação de escrita para garantir integridade
        await this.db.transaction('rw', this.db.phrases, async () => {
            for (const item of items) {
                const texto = item[0];
                const freq = item[1];
                
                // Atualiza apenas o campo 'sincronizado' para 1
                await this.db.phrases.update([this.userId, texto], {
                    sincronizado: 1
                });
            }
        });
        console.log(`[Sync] ${items.length} itens marcados como sincronizados.`);
    }
    
    // Método auxiliar para testes: Limpa dados SOMENTE deste usuário
    async clearUserData() {
        await this.db.phrases.where('userId').equals(this.userId).delete();
        this.root = new TrieNode(); // Limpa RAM
        this.isCleanSlate = true;
        console.log(`Dados do usuário ${this.userId} apagados.`);
    }
}