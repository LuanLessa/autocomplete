import React, { useState, useEffect, useCallback } from 'react';
import './Autocomplete.css';
import sendIconPath from '../assets/send.svg';

/**
 * Componente de Autocomplete robusto com sugestões dinâmicas e texto fantasma.
 * * Oferece suporte a navegação por teclado (Setas, Tab, Enter), 
 * persistência de dados via sistema externo e interface customizável.
 * * @component
 * @param {Object} props - Propriedades do componente.
 * @param {Object} props.acSystem - Instância da engine de busca (deve conter getSuggestions e insertSentenceInTrieAndDB).
 * @param {boolean} [props.showList=true] - Controle opcional para exibir ou ocultar a lista suspensa de sugestões.
 * @returns {JSX.Element} Estrutura de input com overlay de sugestões.
 */
function Autocomplete({ acSystem, showList = true }) {
    // --- ESTADOS ---

    /** @type {[string, Function]} Texto atual digitado pelo usuário */
    const [inputValue, setInputValue] = useState('');

    /** @type {[string, Function]} Sugestão que aparece em cinza atrás do texto do input */
    const [ghostText, setGhostText] = useState('');

    /** @type {[number, Function]} Índice da sugestão atualmente destacada na lista */
    const [highlightIndex, setHighlightIndex] = useState(0);

    /** @type {[Array<{text: string, frequency?: number}>, Function]} Lista de sugestões filtradas */
    const [suggestions, setSuggestions] = useState([]);

    // --- MANIPULADORES DE EVENTOS ---

    /**
     * Atualiza o valor de entrada e reseta o índice de destaque.
     * @param {React.ChangeEvent<HTMLInputElement>} event 
     */
    const handleInputChange = (event) => {
        const text = event.target.value;
        setInputValue(text);
        setHighlightIndex(0);
    };

    /**
     * Efeito principal: Sincroniza as sugestões e o texto fantasma (ghostText) 
     * sempre que o input ou o sistema de busca mudam.
     */
    useEffect(() => {
        if (!inputValue) {
            setGhostText('');
            setSuggestions([]);
            if (highlightIndex !== 0) {
                 setHighlightIndex(0); 
            }
            return;
        }

        const fetchedSuggestions = acSystem.getSuggestions(inputValue);

        setSuggestions(fetchedSuggestions);

        const selectedSuggestion = fetchedSuggestions[highlightIndex]?.text || '';

        let newGhostText = '';

        // Lógica para mostrar o "fantasma" apenas se o texto coincidir com o início da sugestão
        if (selectedSuggestion && selectedSuggestion.startsWith(inputValue) && selectedSuggestion !== inputValue) {
            newGhostText = selectedSuggestion;
        }

        // Garante que o índice de destaque não fique órfão se a lista diminuir
        if (highlightIndex >= fetchedSuggestions.length && fetchedSuggestions.length > 0) {
            setHighlightIndex(0);
        } else if (highlightIndex > 0 && fetchedSuggestions.length === 0) {
            setHighlightIndex(0); 
        }

        setGhostText(newGhostText);
    }, [inputValue, highlightIndex, acSystem]);

    /**
     * Confirma uma sugestão, salva no banco de dados e limpa o campo.
     * @param {string} text - Texto final a ser enviado/salvo.
     */
    const acceptSuggestion = useCallback((text) => {
        if (text) {
            setInputValue(text); // Preenche o input
            setSuggestions([]); // Limpa a lista
            setGhostText(''); // Limpa o ghost
            acSystem.insertSentenceInTrieAndDB(text);
            setInputValue(''); // Limpa o input após aceitar
        }
    }, [acSystem]);

    /**
     * Dispara a ação de envio ao clicar no ícone SVG.
     * @param {React.MouseEvent} event 
     */
    const handleSendClick = (event) => {
        event.preventDefault(); 
        if (inputValue) {
            acceptSuggestion(inputValue);
        }
    };

    /**
     * Gerencia atalhos de teclado:
     * - ArrowDown/Up: Navega na lista.
     * - Tab: Aceita o texto fantasma.
     * - Enter: Envia a sugestão destacada ou o texto atual.
     * @param {React.KeyboardEvent} event 
     */
    const handleKeyDown = useCallback((event) => {
        const currentText = event.target.value;
        const suggestions = acSystem.getSuggestions(currentText);
        const maxIndex = suggestions.length > 0 ? suggestions.length - 1 : 0;
        
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (highlightIndex < maxIndex) {
                setHighlightIndex(highlightIndex + 1);
            } else {
                //setHighlightIndex(0); // Loop para o início (opcional)
            }
        }
        
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (highlightIndex > 0) {
                setHighlightIndex(highlightIndex - 1);
            } else if (suggestions.length > 0) {
                //setHighlightIndex(maxIndex); // Loop para o fim (opcional)
            }
        }

        if (event.key === 'Tab') {
            if (ghostText) {
                event.preventDefault();
                setInputValue(ghostText);
                setGhostText('');
            }
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            const finalValue = ghostText || currentText;
            
            acceptSuggestion(finalValue);
        }

    }, [highlightIndex, ghostText, acSystem]);

    return (
        <div className="autocomplete-container">
            {/* Renderização condicional da lista baseada na prop showList */}
            {showList && ghostText && suggestions.length > 0 && (
                <ul className="suggestions-list">
                    {suggestions.slice(0, 5).map((item, index) => (
                        <li 
                            key={item.text}
                            className={index === highlightIndex ? 'active' : ''}
                            onClick={() => {setInputValue(ghostText); setGhostText('');}}
                            onMouseEnter={() => setHighlightIndex(index)}
                        >
                            {item.text} 
                            {item.frequency !== undefined && (
                                <span className="freq-badge">Freq: {item.frequency}</span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            <div className="input-group">
                <div className="input-wrapper">
                    {/* Input do Ghost Text (apenas leitura) */}
                    <input 
                        type="text"
                        className="shared-input-style ghost-input" 
                        readOnly
                        value={ghostText}
                    />
                    {/* Input Real do Usuário */}
                    <input type="text"
                        className="shared-input-style autocomplete-input"
                        placeholder="Digite algo (ex: Oi)..." 
                        autoComplete="off"
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                    />
                </div>
                {/* Botão de Envio com o ícone SVG configurado */}
                {inputValue && (
                        <button 
                            type="button"
                            className="send-button-overlay submit-button"
                            onClick={handleSendClick}
                        >
                            <img src={sendIconPath} alt="Enviar" />
                        </button>
                    )}
            </div>
        </div>
    );
}

export default Autocomplete;