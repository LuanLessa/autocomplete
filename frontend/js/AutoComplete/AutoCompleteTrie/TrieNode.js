/**
 * Representa um único nó na estrutura de dados Trie (Árvore de Prefixos).
 * Cada nó armazena referências aos seus filhos para construir palavras ou frases.
 *
 * @export
 * @default
 * @class TrieNode
 */
export default class TrieNode {
    /**
     * Cria uma instância de TrieNode.
     * @constructor
     */
    constructor() {
        /**
         * Um mapa (objeto) de referências a nós filhos.
         * As chaves são os próximos caracteres (ou unidades da sequência).
         * @type {Object.<string, TrieNode>}
         */
        this.children = {};

        /**
         * Indica se este nó marca o final de uma palavra ou frase completa.
         * @type {boolean}
         */
        this.isEndOfSentence = false;

        /**
         * A frequência de ocorrência da palavra ou frase que termina neste nó.
         * Útil para funcionalidades de autocompletar baseadas em popularidade.
         * @type {number}
         */
        this.frequency = 0;

        /**
         * A palavra ou frase completa que termina neste nó.
         * É null se este nó não for o final de uma frase.
         * @type {(string | null)}
         */
        this.fullSentence = null;
    }
}