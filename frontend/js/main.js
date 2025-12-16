import AutoCompleteSystem from './AutoComplete/AutoCompleteSystem.js';
import UIManager from './ui/UIManager.js';

const API_URL = "http://localhost:3000";

// Instâncias Globais (Mas o Sistema de Autocomplete começa null)
const userId = "TESTE";
const acSystem = new AutoCompleteSystem(userId); 

acSystem.initialize()


const ui = new UIManager();

// Funções de controle (Controllers)
const handleInput = (text) => {
    if (!text) {
        ui.updateGhostInput('', null);
        ui.clearSuggestions();
        return;
    }
    // Usa a instância criada no login
    const suggestions = acSystem.getSuggestions(text);
    
    ui.updateGhostInput(text, suggestions[0]?.text);
    ui.renderSuggestions(suggestions, (textoSelecionado) => {
        handleSave(textoSelecionado);
    });
};

const handleSave = (text) => {
    if (text && text.trim() !== "") {
        acSystem.insertSentenceInTrieAndDB(text.trim());
        ui.clearScreen();
    }
};

const handleSync = async () => {
    ui.setSyncStatus('syncing');
    
    // 💡 FLUXO DE SINCRONIZAÇÃO BASEADO NO ESTADO LIMPO
    if (acSystem.isCleanSlate) {
        // FLUXO 1: ESTADO LIMPO (Download Total)
        console.warn("Detectado Estado Limpo. Iniciando Full Download.");
        
        try {
            // 1. Puxa TODOS os dados do servidor.
            const fullServerData = await api.fullDownload(userId);
            
            if (fullServerData.length > 0) {
                // 2. Insere TUDO localmente e marca como sincronizado (1).
                await acSystem.smartMerge(JSON.stringify(fullServerData));
                console.log(`Sucesso: ${fullServerData.length} itens restaurados.`);
            } else {
                console.log("Servidor também estava vazio, nada para restaurar.");
            }
            
            // 3. O sistema não está mais limpo
            acSystem.isCleanSlate = false;
            localStorage.setItem(`last_sync_${userId}`, Date.now()); // Zera o last_sync

            alert(`Restauração Completa OK!`);
        } catch (error) {
            console.error("Erro no Full Download:", error);
            alert("Erro na Restauração: " + error.message);
        } finally {
            ui.setSyncStatus('idle');
        }
        //return; // Finaliza o sync, pois o Full Download resolveu tudo.
    }
    
    // FLUXO 2: SINCRONIZAÇÃO DELTA NORMAL (Se não estiver limpo)
    try {
        // 1. PREPARAÇÃO: Pega o delta para upload
        const jsonChanges = await acSystem.getUnsyncedData();
        const payload = jsonChanges ? JSON.parse(jsonChanges) : [];
        const lastSync = Number(localStorage.getItem(`last_sync_${userId}`)) || 0;

        // 2. SINCRONIZAÇÃO: Envio do Upload + Recebimento do Download
        const serverDelta = await api.sync(userId, payload, lastSync);

        // 3. INTEGRAÇÃO: Processa o que veio do servidor (D2)
        if (serverDelta.length > 0) {
            await acSystem.smartMerge(JSON.stringify(serverDelta));
            console.log(`[Sync] Recebidos ${serverDelta.length} itens do servidor.`);
        }

        // 4. LIMPEZA: Marca o que foi enviado (D1) como sincronizado
        if (jsonChanges) {
            // O servidor confirmou o recebimento, agora limpamos localmente.
            await acSystem.markAsSynced(jsonChanges); 
            console.log(`[Sync] ${payload.length} itens locais marcados como sincronizados.`);
        }

        // 5. MARCO DE TEMPO: Só atualiza o timestamp após o SUCESSO de tudo.
        localStorage.setItem(`last_sync_${userId}`, Date.now());
        
        alert(`Sincronização OK!`);

    } catch (error) {
        // Se der erro, nada é marcado como synced e será tentado de novo no próximo ciclo.
        alert("Erro na Sincronização Delta: " + error.message);
    } finally {
        ui.setSyncStatus('idle');
    }
};

const handleClear = async () => {
    if(confirm("Apagar memória local?")) {
        await acSystem.clearUserData();
        ui.clearScreen();
    }
};

// Liga os eventos da UI
ui.bindEvents({
    onInput: handleInput,
    onSave: handleSave,
    onSync: handleSync,
    onClear: handleClear
});


// Mantivemos igual, apenas ajustando para usar a instância 'ac'
async function gerarMassaDeDados(quantidade = 5000) {
    console.time("Tempo de Geração"); 
    
    const sujeitos = ["Eu", "Você", "Nós", "O cliente", "O sistema", "A aplicação", "O gerente", "Eles", "O desenvolvedor", "A API"];
    const verbos = ["precisa de", "gosta de", "está testando", "quer comprar", "encontrou", "desenvolveu", "alterou", "excluiu", "buscou", "validou"];
    const complementos = ["um novo carro", "o relatório final", "uma solução rápida", "o código fonte", "a base de dados", "um café", "o servidor", "a documentação", "os logs de erro", "o pagamento"];
    const populares = ["Oi, tudo bem?", "Bom dia, grupo!", "Gostaria de ajuda."];

    let contador = 0;

    for (let i = 0; i < quantidade; i++) {
        if (Math.random() < 0.1) {
            const popular = populares[Math.floor(Math.random() * populares.length)];
            await acSystem.insertSentenceInTrieAndDB(popular);
        } else {
            const s = sujeitos[Math.floor(Math.random() * sujeitos.length)];
            const v = verbos[Math.floor(Math.random() * verbos.length)];
            const c = complementos[Math.floor(Math.random() * complementos.length)];
            await acSystem.insertSentenceInTrieAndDB(`${s} ${v} ${c}`);
        }
        contador++;
    }

    console.timeEnd("Tempo de Geração");
    console.log(`✅ Sucesso! ${contador} frases inseridas na RAM e enfileiradas para o IndexedDB.`);
    alert(`Gerados ${contador} registros! Note que a gravação no disco pode levar alguns segundos em background.`);
}

// Expõe a função para o console global para você testar
window.gerarMassaDeDados = gerarMassaDeDados;