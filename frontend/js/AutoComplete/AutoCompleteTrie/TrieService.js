import TrieNode from './TrieNode.js';

/**
 * Serviço responsável por gerenciar e operar a estrutura de dados Trie (Árvore de Prefixos).
 * É usada principalmente para funcionalidades de pesquisa e autocompletar eficientes.
 *
 * @export
 * @default
 * @class TrieService
 */
export default class TrieService {
    /**
     * O nó raiz da Trie. Todos os caminhos de palavras ou frases partem deste nó.
     * @type {TrieNode}
     */
    root = new TrieNode();

    /**
     * Cria uma instância de TrieService e inicializa o nó raiz.
     * @constructor
     */
    constructor() {
        this.root = new TrieNode();
    }

    /**
     * Insere uma sentença na Trie com uma frequência inicial especificada.
     * Este método é tipicamente usado para reconstruir a Trie a partir de dados existentes (carregamento inicial).
     *
     * @private
     * @param {string} sentence A sentença a ser inserida.
     * @param {number} freq A frequência inicial a ser atribuída à sentença.
     */
    _restoreSentenceInTrie(sentence, freq) {
        let node = this.root;
        for (const char of sentence) {
            if (!node.children[char]) node.children[char] = new TrieNode();
            node = node.children[char];
        }
        node.isEndOfSentence = true;
        node.frequency = freq;
        node.fullSentence = sentence;
    }

    /**
     * Função auxiliar recursiva para percorrer a Trie a partir de um nó e coletar todas as sentenças
     * que terminam nos nós subsequentes.
     *
     * @private
     * @param {TrieNode} node O nó atual na travessia.
     * @param {Array<{text: string, frequency: number}>} results O array para armazenar as sentenças encontradas e suas frequências.
     */
    _collectSentencesRecursively(node, results) {
        if (node.isEndOfSentence) {
            results.push({ text: node.fullSentence, frequency: node.frequency });
        }
        
        for (const key in node.children) {
            this._collectSentencesRecursively(node.children[key], results);
        }
    }

    /**
     * Insere uma nova sentença na Trie e incrementa sua frequência.
     * Se a sentença já existir, sua frequência será apenas incrementada.
     * 
     *
     * @param {string} sentence A nova sentença a ser inserida.
     * @returns {number} A nova frequência da sentença após a inserção/incremento.
     */
    insertNewSentenceInTrie(sentence) {
        let node = this.root;
        for (const char of sentence) {
            if (!node.children[char]) node.children[char] = new TrieNode();
            node = node.children[char];
        }
        node.isEndOfSentence = true;
        node.frequency++;
        node.fullSentence = sentence;
        return node.frequency;
    }

    /**
     * Encontra todas as sentenças na Trie que possuem um prefixo específico.
     * As sugestões são retornadas ordenadas de forma decrescente pela frequência (as mais populares primeiro).
     * 
     *
     * @param {string} prefix O prefixo a ser procurado.
     * @returns {Array<{text: string, frequency: number}>} Uma lista de objetos contendo as sentenças sugeridas e suas frequências, ordenada por frequência.
     */
    getSuggestions(prefix) {
        let node = this.root;
        for (const char of prefix) {
            if (!node.children[char]) return []; // Prefix not found
            node = node.children[char];
        }

        const results = [];
        this._collectSentencesRecursively(node, results); 
        
        // Ordena por frequência decrescente
        return results.sort((a, b) => b.frequency - a.frequency);
    }
    
    /**
     * Reconstrói completamente a Trie a partir de uma lista de dados.
     * Este método é útil para carregar dados de um arquivo ou banco de dados.
     *
     * @param {Array<{t: string, f: number}>} dataList Lista de objetos onde 't' é o texto (text) e 'f' é a frequência (frequency).
     */
    rebuildTrieFromList(dataList) {
        for (const item of dataList) {
            this._restoreSentenceInTrie(item.t, item.f);
        }
    }

    /**
     * Exporta todos os dados da Trie para uma string JSON.
     * O formato de exportação é otimizado para ser compacto (uma lista de arrays [texto, frequência]).
     *
     * @param {boolean} [prettyPrint=false] Se verdadeiro, formata o JSON com recuo (indentação) para facilitar a leitura humana.
     * @returns {string} Uma string JSON contendo todos os dados da Trie.
     */
    exportToJson(prettyPrint = false) {
        const results = [];
        // Coleta todas as sentenças a partir da raiz
        this._collectSentencesRecursively(this.root, results); 
        
        // Mapeia para o formato minificado: [texto, frequência]
        const minifiedData = results.map(item => [
            item.text,
            item.frequency
        ]);

        if (prettyPrint) {
            return JSON.stringify(minifiedData, null, 2);
        } else {
            return JSON.stringify(minifiedData);
        }
    }
}