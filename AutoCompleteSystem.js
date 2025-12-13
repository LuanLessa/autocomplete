class TrieNode {
    constructor() {
        this.children = {};
        // Se este nó for a letra 'O', 'children' pode ter {'i': Node} (levando a 'Oi') ou {'l': Node} (levando a 'Olá').
        
        this.isEndOfSentence = false; 
        // Indica se aqui termina uma frase que faz sentido. 
        // Ex: Em "O", é false. Em "Oi", é true.
        
        this.frequency = 0; 
        // O contador de popularidade. Quantas vezes o usuário digitou essa frase exata.
        
        this.fullSentence = null; 
        // Uma otimização: em vez de reconstruir a palavra voltando para trás na árvore, 
        // guarda a frase inteira aqui no nó final para acesso rápido.
    }
}

export default class AutoCompleteSystem {
    constructor() {
        this.root = new TrieNode(); // Cria o nó raiz (vazio), o ponto de partida de todas as frases.
        this.STORAGE_KEY = 'meu_projeto_autocomplete_v1';
    }

    insert(sentence) {
        let node = this.root; // Começa do topo
        for (const char of sentence) {
            // Se não existe caminho para essa letra, cria um novo nó
            if (!node.children[char]) {
                node.children[char] = new TrieNode();
            }
            // Avança para o próximo nó
            node = node.children[char];
        }
        // Chegou na última letra. Marca como fim de frase.
        node.isEndOfSentence = true;
        node.frequency++; // Aumenta a pontuação
        node.fullSentence = sentence; // Guarda o texto completo
        
        // Salva tudo no navegador
        this.saveToLocalStorage();
    }

    getSuggestions(prefix) {
        let node = this.root;
        // 1. Navega até o fim do que foi digitado
        for (const char of prefix) {
            if (!node.children[char]) return []; // Se digitou algo que não existe (ex: "Xyz"), retorna vazio.
            node = node.children[char];
        }

        // 2. Coleta todas as frases possíveis a partir daqui
        const results = [];
        this._collectAllWords(node, results);
        
        // 3. Ordena: quem tem maior frequência (b.frequency) aparece primeiro na lista
        return results.sort((a, b) => b.frequency - a.frequency);
    }

    // Retorna apenas a MELHOR sugestão ou null
    getSuggestion(prefix) {
        // 1. Navega até o final do que foi digitado
        let node = this.root;
        for (const char of prefix) {
            if (!node.children[char]) {
                return null; // Nada encontrado
            }
            node = node.children[char];
        }

        // 2. Busca apenas o campeão a partir daqui
        const bestMatch = this._findBestCandidate(node);

        // 3. Retorna apenas o texto se achou algo
        return bestMatch ? bestMatch.text : null;
    }

    // Auxiliar exclusivo para achar o nó com maior frequência (Recursivo)
    // Evita criar arrays e fazer .sort(), economizando memória e CPU
    _findBestCandidate(node) {
        let best = null;

        // Se o nó atual é uma frase completa, ele é o candidato inicial
        if (node.isEndOfSentence) {
            best = { text: node.fullSentence, frequency: node.frequency };
        }

        // Verifica os filhos para ver se alguém ganha dele
        for (const key in node.children) {
            const childBest = this._findBestCandidate(node.children[key]);
            
            if (childBest) {
                // Lógica de "Quem é o Rei":
                // Se ainda não tenho candidato, ou se o filho é mais frequente que o atual
                if (!best || childBest.frequency > best.frequency) {
                    best = childBest;
                }
            }
        }
        return best;
    }

    _collectAllWords(node, results) {
        // Se achou uma bandeira de "Fim de Frase", adiciona na lista de resultados
        if (node.isEndOfSentence) {
            results.push({ text: node.fullSentence, frequency: node.frequency });
        }
        // Continua procurando nos filhos deste nó (recursão)
        for (const key in node.children) {
            this._collectAllWords(node.children[key], results);
        }
    }

    // --- NOVOS MÉTODOS DE PERSISTÊNCIA OTIMIZADA ---

    // 1. Exporta apenas o necessário: Um array de objetos simples
    // Formato: [ { t: "frase", f: 10 }, ... ]
    exportData() {
        const dataList = [];
        this._collectAllWords(this.root, dataList); // Usa o mesmo rastreador de cima para pegar tudo
        
        // Retorna apenas Texto (t) e Frequência (f). Ignora a estrutura da árvore.
        return dataList.map(item => ({
            t: item.text,
            f: item.frequency
        }));
    }

    // 2. Importa a lista e reconstrói a árvore
    importData(dataList) {
        this.root = new TrieNode(); // Zera a memória atual
        
        for (const item of dataList) {
            // Recria cada caminho na árvore
            this.insertWithFrequency(item.t, item.f);
        }
    }

    // Método auxiliar para inserir já com a frequência correta (usado na importação)
    insertWithFrequency(sentence, freq) {
        let node = this.root;
        for (const char of sentence) {
            if (!node.children[char]) {
                node.children[char] = new TrieNode();
            }
            node = node.children[char];
        }
        node.isEndOfSentence = true;
        node.frequency = freq; // Restaura a frequência antiga
        node.fullSentence = sentence;
    }

    // 3. Salvar no LocalStorage
    saveToLocalStorage() {
        const flatData = this.exportData();
        const jsonString = JSON.stringify(flatData);
        
        try {
            localStorage.setItem(this.STORAGE_KEY, jsonString);
            // console.log(`Salvo! Tamanho aprox: ${(jsonString.length / 1024).toFixed(2)} KB`);
        } catch (e) {
            console.error("Erro ao salvar (provavelmente Quota Exceeded):", e);
        }
    }

    // 4. Carregar do LocalStorage
    loadFromLocalStorage() {
        const dataStr = localStorage.getItem(this.STORAGE_KEY);
        if (dataStr) {
            try {
                const flatData = JSON.parse(dataStr);
                
                // Verificação básica se é o formato novo (Array) ou velho (Objeto)
                if (Array.isArray(flatData)) {
                    this.importData(flatData);
                    console.log(`Sucesso! ${flatData.length} frases carregadas.`);
                    return true;
                } else {
                    console.warn("Formato antigo detectado. Limpando para evitar erros.");
                    this.clearMemory();
                    return false;
                }
            } catch (e) {
                console.error("Erro ao ler dados corrompidos", e);
                return false;
            }
        }
        return false;
    }

    // 5. Gera o JSON para download (Versão Otimizada)
    getJsonData() {
        const flatData = this.exportData();
        return JSON.stringify(flatData, null, 2); 
    }
}