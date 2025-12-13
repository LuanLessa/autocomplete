import AutoCompleteSystem from './AutoCompleteSystem.js';

const ac = new AutoCompleteSystem();

const inputReal = document.getElementById('autocomplete-input');
const inputGhost = document.getElementById('ghost-input');
const btnEnviar = document.getElementById('submit-button');
const list = document.getElementById('suggestions-list');

// Variáveis de Estado para Navegação
let sugestoesAtuais = []; // Guarda a lista completa do que foi encontrado
let indiceAtual = 0;      // Guarda qual posição da lista estamos vendo (0 = primeira)

// Carrega dados iniciais
const temDadosSalvos = ac.loadFromLocalStorage();
if (!temDadosSalvos) {
    ac.insert("Oi, tudo bem?");
    ac.insert("Oi, tudo bem?");
    ac.insert("Oi, como vai?");
}

// Função Auxiliar: Atualiza o Ghost Input baseado no índice atual
function atualizarGhostInput(textoDigitado) {
    if (sugestoesAtuais.length > 0 && indiceAtual < sugestoesAtuais.length) {
        const itemSelecionado = sugestoesAtuais[indiceAtual].text;
        
        // Só mostra se começar igual e não for idêntico ao que já digitei
        if (itemSelecionado.startsWith(textoDigitado) && itemSelecionado !== textoDigitado) {
            inputGhost.value = itemSelecionado;
        } else {
            inputGhost.value = '';
        }
    } else {
        inputGhost.value = '';
    }
}

// Renderiza a lista (visual abaixo)
function renderSuggestions() {
    list.innerHTML = '';
    const visualizacao = sugestoesAtuais.slice(0, 10); // Mostra top 10

    visualizacao.forEach((item, index) => {
        const li = document.createElement('li');
        li.innerHTML = `${item.text} <span class="freq">Freq: ${item.frequency}</span>`;
        
        // Destaca visualmente o item que está selecionado pelas setas
        if (index === indiceAtual) {
            li.style.backgroundColor = "#e0e0e0"; // Um cinza mais escuro para destaque
            li.style.borderLeft = "4px solid #007bff";
        }

        li.addEventListener('click', () => {
            inputReal.value = item.text;
            inputGhost.value = ''; 
            list.innerHTML = '';
            inputReal.focus();
        });
        
        list.appendChild(li);
    });
}

// EVENTO DE DIGITAÇÃO
inputReal.addEventListener('input', (e) => {
    const text = e.target.value;
    
    // Reset ao digitar algo novo
    indiceAtual = 0; 

    if (!text) {
        inputGhost.value = '';
        list.innerHTML = '';
        sugestoesAtuais = [];
        return;
    }

    // 1. Busca TODAS as sugestões e guarda na memória
    sugestoesAtuais = ac.getSuggestions(text);

    // 2. Atualiza o Ghost (vai pegar o índice 0 por padrão)
    atualizarGhostInput(text);

    // 3. Renderiza a lista
    renderSuggestions();
});

// EVENTO DE TECLADO (TAB + SETAS)
inputReal.addEventListener('keydown', (e) => {
    
    // --- LÓGICA DA SETA PARA BAIXO (Próxima Opção) ---
    if (e.key === 'ArrowDown') {
        e.preventDefault(); // Impede o cursor de ir para o final/início da linha
        
        // Se houver próxima opção, avança o índice
        if (indiceAtual < sugestoesAtuais.length - 1) {
            indiceAtual++;
            atualizarGhostInput(inputReal.value);
            renderSuggestions(); // Re-renderiza para atualizar o destaque na lista
        }
    }

    // --- LÓGICA DA SETA PARA CIMA (Opção Anterior) ---
    if (e.key === 'ArrowUp') {
        e.preventDefault();

        // Se houver opção anterior, volta o índice
        if (indiceAtual > 0) {
            indiceAtual--;
            atualizarGhostInput(inputReal.value);
            renderSuggestions();
        }
    }

    // --- LÓGICA DO TAB (Aceitar) ---
    if (e.key === 'Tab') {
        if (inputGhost.value && inputGhost.value !== "") {
            e.preventDefault();
            inputReal.value = inputGhost.value;
            inputGhost.value = '';
            list.innerHTML = '';
            sugestoesAtuais = [];
        }
    }

    // --- ENTER ---
    if (e.key === 'Enter') {
        btnEnviar.click();
    }
});

btnEnviar.addEventListener('click', () => {
    const text = inputReal.value;
    if (text.trim() !== "") {
        ac.insert(text);
        alert(`Frase aprendida e salva!`);
        inputReal.value = '';
        inputGhost.value = '';
        list.innerHTML = '';
        sugestoesAtuais = [];
    }
});

/* --- 3. BOTÕES DE GESTÃO DO JSON --- */

document.getElementById('btn-download').addEventListener('click', () => {
    const jsonStr = ac.getJsonData();
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "meus_dados_autocomplete.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

document.getElementById('btn-clear').addEventListener('click', () => {
    if(confirm("Tem certeza? Isso apagará todo o aprendizado.")) {
        ac.clearMemory();
        alert("Memória resetada.");
        inputReal.value = '';
        inputGhost.value = '';
        list.innerHTML = '';
    }
});

/* --- FERRAMENTA DE GERAÇÃO DE TESTE DE CARGA --- */

function gerarMassaDeDados(quantidade = 5000) {
    console.time("Tempo de Geração"); // Vamos cronometrar o processo
    
    const sujeitos = [
    "Eu", "Você", "Nós", "O cliente", "O sistema", "A aplicação", "O gerente", "Eles", "O desenvolvedor", "A API",
    "O estagiário", "A diretoria", "O servidor", "O banco de dados", "O algoritmo", "A inteligência artificial", "O usuário final", "O suporte técnico", "O hacker", "O robô",
    "O administrador", "O Product Owner", "O Scrum Master", "A equipe de QA", "O designer", "O arquiteto de software", "O consultor", "O fornecedor", "A concorrência", "O investidor",
    "O script", "O compilador", "O navegador", "O firewall", "O antivírus", "A nuvem", "O container", "O microserviço", "A conexão", "O protocolo",
    "O smartphone", "O laptop", "O teclado", "O mouse", "A impressora", "O monitor", "O roteador", "O cabo de rede", "A webcam", "O microfone",
    "O gato do escritório", "O segurança", "A recepcionista", "O entregador", "O vizinho", "O professor", "O aluno", "O freelancer", "O recrutador", "O candidato",
    "A documentação", "O contrato", "A lei", "A política da empresa", "O cronograma", "O orçamento", "A meta", "O prazo", "O relatório", "A planilha",
    "O backend", "O frontend", "O fullstack", "O devops", "O cientista de dados", "O analista de segurança", "O testador", "O tech lead", "O CTO", "O CEO",
    "A variável", "A função", "A classe", "O objeto", "O array", "O loop", "A exceção", "O erro", "O log", "O cache",
    "A atualização", "A notificação", "O alerta", "O backup", "A senha", "O token", "A chave de acesso", "O domínio", "O IP", "A URL"
    ];    

    const verbos = [
    "precisa de", "gosta de", "está testando", "quer comprar", "encontrou", "desenvolveu", "alterou", "excluiu", "buscou", "validou",
    "ignorou", "destruiu", "salvou", "copiou", "colou", "recortou", "formatou", "imprimiu", "digitalizou", "arquivou",
    "analisou", "criticou", "elogiou", "vendeu", "alugou", "emprestou", "perdeu", "esqueceu", "lembrou de", "sonhou com",
    "hackeou", "bloqueou", "liberou", "autenticou", "criptografou", "descriptografou", "compactou", "descompactou", "instalou", "desinstalou",
    "reiniciou", "desligou", "ligou", "configurou", "atualizou", "baixou", "fez upload de", "compartilhou", "curtiu", "comentou",
    "compilou", "depurou", "refatorou", "comitou", "fez merge de", "clonou", "implantou", "reverteu", "monitorou", "otimizou",
    "quebrou", "consertou", "melhorou", "piorou", "substituiu", "rejeitou", "aprovou", "assinou", "cancelou", "renovou",
    "escreveu", "leu", "traduziu", "resumiu", "apresentou", "discutiu", "debateu", "questionou", "respondeu", "ignorou",
    "automatizou", "virtualizou", "simulou", "emulou", "renderizou", "processou", "calculou", "mediu", "pesou", "contou",
    "esperou por", "adiou", "antecipou", "agendou", "cancelou", "confirmou", "convidou", "expulsou", "contratou", "demitiu"
    ];
    
    const complementos = [
    "um novo carro", "o relatório final", "uma solução rápida", "o código fonte", "a base de dados", "um café", "o servidor", "a documentação", "os logs de erro", "o pagamento",
    "a senha do wi-fi", "um bug crítico", "a feature nova", "o layout antigo", "o backup de ontem", "o projeto inteiro", "a licença de software", "o contrato milionário", "a cadeira gamer", "o teclado mecânico",
    "o monitor 4k", "o mouse sem fio", "o fone de ouvido", "a webcam quebrada", "o disco rígido", "o SSD", "a memória RAM", "a placa de vídeo", "o processador", "a bateria",
    "o framework", "a biblioteca", "o plugin", "a extensão", "o navegador", "o sistema operacional", "o aplicativo", "o jogo", "o site", "o blog",
    "a reunião", "o e-mail", "o chat", "a videochamada", "o feedback", "a crítica", "o elogio", "o aumento de salário", "as férias", "o bônus",
    "a pizza", "o almoço", "o lanche", "a garrafa de água", "o ar condicionado", "a luz", "a porta", "a janela", "o elevador", "a escada",
    "o erro 404", "o erro 500", "a tela azul", "o travamento", "a lentidão", "a performance", "a segurança", "a privacidade", "os termos de uso", "a política de cookies",
    "o repositório", "o branch", "o commit", "o pull request", "a issue", "o ticket", "o chamado", "o tutorial", "o curso", "o certificado",
    "a nuvem AWS", "o container Docker", "o cluster Kubernetes", "a máquina virtual", "o endereço IP", "o domínio .com", "o certificado SSL", "a chave SSH", "o token JWT", "o cookie",
    "o cliente chato", "o chefe legal", "o colega de trabalho", "o concorrente", "o parceiro", "o fornecedor", "o prazo impossível", "a meta inalcançável", "o sucesso", "o fracasso"
    ];
    
    // Frases fixas para gerar alta frequência (simular buscas populares)
    const populares = ["Oi, tudo bem?", "Bom dia, grupo!", "Gostaria de ajuda."];

    let contador = 0;

    // Gerar frases randômicas
    for (let i = 0; i < quantidade; i++) {
        // 10% de chance de inserir uma frase popular repetida (para testar a frequência)
        if (Math.random() < 0.1) {
            const popular = populares[Math.floor(Math.random() * populares.length)];
            ac.insert(popular);
        } else {
            // Gera uma frase nova combinando as partes
            const s = sujeitos[Math.floor(Math.random() * sujeitos.length)];
            const v = verbos[Math.floor(Math.random() * verbos.length)];
            const c = complementos[Math.floor(Math.random() * complementos.length)];
            
            ac.insert(`${s} ${v} ${c}`);
        }
        contador++;
    }

    console.timeEnd("Tempo de Geração");
    console.log(`✅ Sucesso! ${contador} frases foram inseridas na memória.`);
    console.log(`Agora a árvore possui milhares de nós. Tente buscar por 'Eu' ou 'O sistema'.`);
    alert(`Gerados ${contador} registros de teste! Tente pesquisar agora.`);
}

// Para usar, basta descomentar a linha abaixo ou chamar no console do navegador:
//gerarMassaDeDados(100000);