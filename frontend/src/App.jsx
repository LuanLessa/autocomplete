import AutoCompleteSystem from './js/AutoComplete/AutoCompleteSystem.js';
import Autocomplete from './components/Autocomplete.jsx';
import './App.css';

function App() {
  const userId = "TESTE";
  const acSystem = new AutoCompleteSystem(userId);
  acSystem.startPeriodicSync(5000); // Teste com 5 segundos

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

  window.gerarMassaDeDados = gerarMassaDeDados;

  return (
    <div className="App">
      <Autocomplete acSystem={acSystem} showList={true} />
    </div>
  );
}

export default App