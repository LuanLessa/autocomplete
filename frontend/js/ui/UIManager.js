export default class UIManager {
    constructor() {
        this.inputReal = document.getElementById('autocomplete-input');
        this.inputGhost = document.getElementById('ghost-input');
        this.list = document.getElementById('suggestions-list');
        this.btnSync = document.getElementById('btn-sync');
        this.btnSubmit = document.getElementById('submit-button');
        this.btnClear = document.getElementById('btn-clear');

        // Estado Visual (Exatamente como no seu script original)
        this.sugestoesAtuais = [];
        this.indiceAtual = 0; 
    }

    bindEvents({ onInput, onSave, onSync, onClear }) {
        // 1. Digitação
        this.inputReal.addEventListener('input', (e) => {
            // Reset ao digitar algo novo (Lógica original)
            this.indiceAtual = 0;
            onInput(e.target.value);
        });

        // 2. Teclado (Lógica Original Restaurada)
        this.inputReal.addEventListener('keydown', (e) => {
            
            // --- SETA PARA BAIXO ---
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                // Lógica exata do seu código antigo:
                // Só desce se não estiver no último
                if (this.indiceAtual < this.sugestoesAtuais.length - 1) {
                    this.indiceAtual++;
                    this.atualizarGhostInput(this.inputReal.value);
                    this.reRenderizarLista(); // Atualiza o destaque
                }
            }
            
            // --- SETA PARA CIMA ---
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                // Lógica exata do seu código antigo:
                // Só sobe se não estiver no primeiro (0)
                if (this.indiceAtual > 0) {
                    this.indiceAtual--;
                    this.atualizarGhostInput(this.inputReal.value);
                    this.reRenderizarLista();
                }
            }

            // --- TAB ---
            if (e.key === 'Tab') {
                if (this.inputGhost.value && this.inputGhost.value !== "") {
                    e.preventDefault();
                    this.inputReal.value = this.inputGhost.value;
                    onInput(this.inputReal.value); // Dispara busca nova para limpar ou ajustar
                    this.clearSuggestions();
                }
            }

            // --- ENTER ---
            if (e.key === 'Enter') {
                e.preventDefault();
                // Se o Ghost estiver mostrando algo (significa que navegamos ou completou), usa ele
                // Se não, usa o que está digitado
                const valorFinal = this.inputGhost.value || this.inputReal.value;
                if (valorFinal) {
                    this.inputReal.value = valorFinal;
                    onSave(valorFinal);
                }
            }
        });

        // Eventos de Botões (Padrão)
        this.btnSubmit.addEventListener('click', (e) => {
            e.preventDefault();
            onSave(this.inputReal.value);
        });

        this.btnSync.addEventListener('click', () => onSync());
        this.btnClear.addEventListener('click', () => onClear());
    }

    // --- MÉTODOS VISUAIS (Lógica Original) ---

    // Atualiza a lista interna e reseta o visual
    renderSuggestions(suggestions, onSelectCallback) {
        this.sugestoesAtuais = suggestions; // Guarda na memória da UI
        // Nota: O indiceAtual já foi resetado no evento 'input'
        
        this.onSelectCallback = onSelectCallback; // Guarda para usar no re-render
        this.reRenderizarLista();
    }

    // Método extraído para ser chamado tanto no Input quanto nas Setas
    reRenderizarLista() {
        this.list.innerHTML = '';
        
        // Se não tiver sugestões, para aqui
        if (this.sugestoesAtuais.length === 0) return;

        const visualizacao = this.sugestoesAtuais.slice(0, 10);

        visualizacao.forEach((item, index) => {
            const li = document.createElement('li');
            
            // HTML igual ao seu original
            li.innerHTML = `${item.text} <span class="freq-badge">Freq: ${item.frequency}</span>`;
            
            // Lógica de Destaque Original
            if (index === this.indiceAtual) {
                li.style.backgroundColor = "#e0e0e0"; 
                li.style.borderLeft = "4px solid #007bff";
                li.style.fontWeight = "bold"; // Adicionei só um negrito pra ficar melhor
            }

            // Click
            li.addEventListener('click', () => {
                this.inputReal.value = item.text;
                if (this.onSelectCallback) this.onSelectCallback(item.text);
            });
            
            this.list.appendChild(li);
        });
    }

    atualizarGhostInput(textoDigitado) {
        // Lógica Original
        if (this.sugestoesAtuais.length > 0 && this.indiceAtual < this.sugestoesAtuais.length) {
            const itemSelecionado = this.sugestoesAtuais[this.indiceAtual].text;
            
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

    updateGhostInput(text, firstSuggestion) {
        // Esse método era chamado pelo main.js, mas agora o controle do ghost 
        // está mais inteligente dentro do 'atualizarGhostInput' interno.
        // Vamos manter compatibilidade chamando o interno.
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

    setSyncStatus(status) {
        if (status === 'syncing') {
            this.btnSync.innerText = "⏳ ...";
            this.btnSync.disabled = true;
        } else {
            this.btnSync.innerText = "☁️ Sincronizar";
            this.btnSync.disabled = false;
        }
    }
}