import Dexie from 'dexie';

/**
 * Gerencia o banco de dados local (IndexedDB) para o recurso de AutoComplete.
 * Estende a classe Dexie para fornecer acesso tipado e versionado aos dados.
 * * @class AutoCompleteDB
 * @extends {Dexie}
 */
export default class AutoCompleteDB extends Dexie {
    /**
     * Inicializa o banco de dados 'AutoCompleteDB_v3'.
     * Define o esquema de versionamento e índices para a tabela 'sentences'.
     */
    constructor() {
        super('AutoCompleteDB_v3');
        
        // Definição do Esquema (Schema Definition)
        this.version(1).stores({
            /**
             * Tabela 'sentences': Armazena as frases/termos do autocomplete.
             * * Esquema de Índices:
             * 1. [userId+t]: Chave Primária Composta (PK). Garante unicidade por usuário e termo.
             * 2. userId: Índice simples para buscar tudo de um usuário.
             * 3. [userId+sincronizado]: Índice composto para filtrar status de sincronização por usuário.
             */
            sentences: '[userId+t], userId, [userId+sincronizado]' 
        });
    }
}