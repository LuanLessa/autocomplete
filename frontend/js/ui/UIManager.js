/**
 * Gerenciador de Interface de Usuário (View Layer).
 * Responsável por toda a manipulação do DOM, eventos de teclado e renderização visual.
 * Implementa o padrão "Ghost Input" (autocompletar visual).
 */
export default class UIManager {
    /**
     * Inicializa as referências aos elementos do DOM e o estado visual inicial.
     * Assume que os IDs 'autocomplete-input', 'ghost-input', etc., existem no HTML.
     */
    constructor() {
        // Elementos do DOM
        this.inputReal = document.getElementById('autocomplete-input'); // Onde o usuário digita
        this.inputGhost = document.getElementById('ghost-input');       // Onde aparece a sugestão cinza
        this.list = document.getElementById('suggestions-list');        // A lista <ul>
        this.btnSubmit = document.getElementById('submit-button');
        this.btnClear = document.getElementById('btn-clear');

        // Estado Visual (State)
        this.sugestoesAtuais = []; // Cache local das sugestões sendo exibidas
        this.indiceAtual = 0;      // Qual item da lista está focado (highlighted)
    }

    /**
     * Vincula os eventos do DOM aos Callbacks fornecidos pelo Controlador.
     * Usa o padrão de "Inversão de Controle" (a UI avisa o controlador, não o contrário).
     * * @param {Object} callbacks
     * @param {Function} callbacks.onInput - Chamado quando o usuário digita.
     * @param {Function} callbacks.onSave - Chamado quando o usuário submete (Enter/Click).
     * @param {Function} callbacks.onClear - Chamado quando o botão limpar é clicado.
     */
    bindEvents({ onInput, onSave, onClear }) {
        // 1. Evento de Digitação (Input)
        this.inputReal.addEventListener('input', (e) => {
            this.indiceAtual = 0; // Reseta a navegação do teclado ao digitar
            onInput(e.target.value);
        });

        // 2. Navegação via Teclado (Acessibilidade e UX)
        this.inputReal.addEventListener('keydown', (e) => {
            
            // --- SETA PARA BAIXO (Navegar Próximo) ---
            if (e.key === 'ArrowDown') {
                e.preventDefault(); // Evita que o cursor do input mova
                // Impede descer além do último item
                if (this.indiceAtual < this.sugestoesAtuais.length - 1) {
                    this.indiceAtual++;
                    this.atualizarGhostInput(this.inputReal.value);
                    this.reRenderizarLista(); // Atualiza o CSS de destaque
                }
            }
            
            // --- SETA PARA CIMA (Navegar Anterior) ---
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                // Impede subir além do primeiro item (index 0)
                if (this.indiceAtual > 0) {
                    this.indiceAtual--;
                    this.atualizarGhostInput(this.inputReal.value);
                    this.reRenderizarLista();
                }
            }

            // --- TAB (Aceitar Sugestão do Ghost Input) ---
            if (e.key === 'Tab') {
                if (this.inputGhost.value && this.inputGhost.value !== "") {
                    e.preventDefault(); // Evita mudar o foco do navegador
                    this.inputReal.value = this.inputGhost.value; // Transfere Ghost -> Real
                    onInput(this.inputReal.value); // Dispara busca nova para validar
                    this.clearSuggestions();
                }
            }

            // --- ENTER (Submeter/Salvar) ---
            if (e.key === 'Enter') {
                e.preventDefault();
                // Prioridade: Valor do Ghost (selecionado) > Valor digitado
                const valorFinal = this.inputGhost.value || this.inputReal.value;
                if (valorFinal) {
                    this.inputReal.value = valorFinal;
                    onSave(valorFinal);
                }
            }
        });

        // Eventos de Mouse (Click)
        this.btnSubmit.addEventListener('click', (e) => {
            e.preventDefault();
            onSave(this.inputReal.value);
        });

        this.btnClear.addEventListener('click', () => onClear());
    }

    // --- MÉTODOS DE RENDERIZAÇÃO ---

    /**
     * Recebe novos dados e atualiza a interface.
     * @param {Array<Object>} suggestions - Lista de objetos {text, frequency}.
     * @param {Function} onSelectCallback - Função a ser chamada ao clicar em um item da lista.
     */
    renderSuggestions(suggestions, onSelectCallback) {
        this.sugestoesAtuais = suggestions; 
        this.onSelectCallback = onSelectCallback; // Armazena callback para cliques futuros
        this.reRenderizarLista();
    }

    /**
     * Constrói o HTML da lista (<ul>) baseado no estado atual.
     * Aplica classes CSS para destaque visual no item correspondente ao `indiceAtual`.
     */
    reRenderizarLista() {
        this.list.innerHTML = '';
        
        if (this.sugestoesAtuais.length === 0) return;

        // Limita a renderização a 10 itens para performance visual
        const visualizacao = this.sugestoesAtuais.slice(0, 10);

        visualizacao.forEach((item, index) => {
            const li = document.createElement('li');
            
            // Renderiza texto e badge de frequência
            li.innerHTML = `${item.text} <span class="freq-badge">Freq: ${item.frequency}</span>`;
            
            // Aplica estilos inline para o item selecionado via teclado
            if (index === this.indiceAtual) {
                li.style.backgroundColor = "#e0e0e0"; 
                li.style.borderLeft = "4px solid #007bff";
                li.style.fontWeight = "bold"; 
            }

            // Tratamento de clique do mouse
            li.addEventListener('click', () => {
                this.inputReal.value = item.text;
                if (this.onSelectCallback) this.onSelectCallback(item.text);
            });
            
            this.list.appendChild(li);
        });
    }

    /**
     * Lógica do "Ghost Input" (Input Fantasma).
     * Preenche o input secundário com o texto do item atualmente focado,
     * mas apenas se o prefixo coincidir.
     */
    atualizarGhostInput(textoDigitado) {
        if (!textoDigitado || textoDigitado.trim() === '') {
            this.inputGhost.value = '';
            return;
        }

        if (this.sugestoesAtuais.length > 0 && this.indiceAtual < this.sugestoesAtuais.length) {
            const itemSelecionado = this.sugestoesAtuais[this.indiceAtual].text;
            
            // Só mostra o ghost se o item começar exatamente com o que foi digitado
            if (itemSelecionado.startsWith(textoDigitado) && itemSelecionado !== textoDigitado) {
                this.inputGhost.value = itemSelecionado;
            } else {
                this.inputGhost.value = '';
            }
        } else {
            this.inputGhost.value = '';
        }
    }

    // --- UTILITÁRIOS ---

    updateGhostInput(text) {
        this.atualizarGhostInput(text);
    }

    clearScreen() {
        this.inputReal.value = '';
        this.inputGhost.value = '';
        this.clearSuggestions();
    }

    clearSuggestions() {
        this.list.innerHTML = '';
        this.sugestoesAtuais = [];
    }
}