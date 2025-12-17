/**
 * O Repositório de dados local, responsável por abstrair a comunicação direta
 * com o IndexedDB (ou outro banco de dados local).
 * Gerencia operações CRUD e consultas específicas (como busca de itens não sincronizados)
 * para as sentenças de autocompletar.
 *
 * @export
 * @class AutoCompleteRepository
 */
export default class AutoCompleteRepository {
    /**
     * Instância do banco de dados local (ex: Dexie DB Instance).
     * @private
     * @type {Object}
     */
    db;

    /**
     * Cria uma instância de AutoCompleteRepository.
     * @param {Object} dbInstance A instância do banco de dados (ex: new Dexie('MyDatabase')).
     * @constructor
     */
    constructor(dbInstance) {
        this.db = dbInstance; 
    }

    /**
     * Busca todas as sentenças de autocompletar pertencentes a um usuário específico.
     * Este método é geralmente usado para carregar o estado inicial da Trie.
     *
     * @async
     * @param {string} userId O ID do usuário cujas sentenças devem ser buscadas.
     * @returns {Promise<Array<Object>>} Uma Promise que resolve em um array de objetos de sentença.
     */
    async findUserSentences(userId) {
        return await this.db.sentences
            .where('userId')
            .equals(userId)
            .toArray();
    }

    /**
     * Busca todas as sentenças de um usuário que ainda não foram sincronizadas com o servidor.
     * A busca utiliza um índice composto `[userId+sincronizado]` (onde sincronizado é `0`).
     *
     * @async
     * @param {string} userId O ID do usuário.
     * @returns {Promise<Array<Object>>} Uma Promise que resolve em um array de sentenças não sincronizadas.
     */
    async findUnsyncedSentences(userId) {
        return await this.db.sentences
            .where('[userId+sincronizado]')
            .equals([userId, 0])
            .toArray();
    }

    /**
     * Salva ou atualiza uma sentença no banco de dados local (usando 'put').
     * A sentença é marcada automaticamente como NÃO sincronizada (`sincronizado: 0`).
     *
     * @async
     * @param {Object} sentenceData Dados da sentença a ser salva.
     * @param {string} sentenceData.userId O ID do usuário.
     * @param {string} sentenceData.sentence O texto da sentença (`t`).
     * @param {number} sentenceData.frequency A frequência da sentença (`f`).
     * @param {number} sentenceData.timestamp O timestamp da última atualização.
     * @returns {Promise<void>}
     */
    async saveSentence(sentenceData) {
        await this.db.sentences.put({
            userId: sentenceData.userId,
            t: sentenceData.sentence,
            f: sentenceData.frequency,
            sincronizado: 0,
            updatedAt: sentenceData.timestamp
        });
    }

    /**
     * Marca um conjunto de sentenças como sincronizadas (setando `sincronizado: 1`).
     * Esta operação é executada dentro de uma transação para garantir atomicidade.
     *
     * @async
     * @param {Array<string | number>} keys As chaves primárias (primary keys) das sentenças a serem atualizadas.
     * @returns {Promise<void>}
     */
    async markSentencesAsSynced(keys) {
        await this.db.transaction('rw', this.db.sentences, async () => {
            for (const key of keys) {
                await this.db.sentences.update(key, { sincronizado: 1 });
            }
        });
    }

    /**
     * Processa e insere/atualiza um grande conjunto de dados que veio do servidor 
     * durante um Full Download ou Merge.
     * * Os dados são convertidos do formato [texto, freq, timestamp] para o objeto
     * completo e marcados como SINCRONIZADOS (1) no DB local.
     *
     * @async
     * @param {string} userId O ID do usuário.
     * @param {Array<Array<string | number>>} serverDataArray Array de dados no formato [[t, f, updatedAt], ...].
     * @returns {Promise<void>}
     */
    async processFullDownloadData(userId, serverDataArray) {
        const dataToPersist = serverDataArray.map(([t, f, updatedAt]) => ({
            userId: userId, 
            t: t, 
            f: f, 
            updatedAt: updatedAt, 
            sincronizado: 1
        }));
        
        await this.db.sentences.bulkPut(dataToPersist);
    }
    
    /**
     * Remove todas as sentenças de autocompletar associadas a um usuário específico.
     * Útil para funcionalidades de logout ou limpeza de cache.
     *
     * @async
     * @param {string} userId O ID do usuário cujos dados serão limpos.
     * @returns {Promise<void>}
     */
    async clearUserSentences(userId) {
        await this.db.sentences
            .where('userId')
            .equals(userId)
            .delete();
    }
}