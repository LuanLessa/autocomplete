/**
 * Representa um item de autocompletar no formato de array compactado usado pelo frontend.
 * @typedef {[string, number, number]} AutoCompleteItem
 * - Índice 0: O texto sugerido.
 * - Índice 1: A frequência de uso.
 * - Índice 2: Timestamp da última atualização (Unix epoch).
 */

/**
 * Serviço responsável por sincronizar dados de autocompletar entre o cliente e o Supabase.
 * Gerencia o envio de dados locais (deltas) e o recebimento de dados remotos atualizados.
 */
export default class AutoCompleteSyncService {
    /**
     * Cria uma instância do serviço de sincronização.
     * @param {Object} supabaseClient - A instância do cliente Supabase inicializada.
     * @throws {Error} Se o cliente Supabase não for fornecido.
     */
    constructor(supabaseClient) {
        if (!supabaseClient) {
            throw new Error("O cliente Supabase é obrigatório no construtor.");
        }
        this.supabase = supabaseClient;
    }

    /**
     * Realiza a sincronização bidirecional (envia mudanças locais e busca novidades).
     * 1. Envia os itens modificados localmente para o servidor via RPC.
     * 2. Baixa itens do servidor que foram modificados após o `lastSyncedAt`.
     * @param {string} userId - O UUID do usuário dono dos dados.
     * @param {AutoCompleteItem[]} changes - Lista de itens modificados localmente desde a última sincronização.
     * @param {number} lastSyncedAt - Timestamp da última sincronização bem-sucedida.
     * @returns {Promise<AutoCompleteItem[]>} Uma promessa que resolve com a lista de novos itens vindos do servidor.
     * @throws {Error} Se houver falha na RPC ou na consulta (fetch) do Supabase.
     */
    async sync(userId, changes, lastSyncedAt) {
        try {
            // 1. Processamento e envio de mudanças locais (Push)
            if (changes && changes.length > 0) {
                // Mapeia o formato de array [texto, freq, time] para objeto { text, frequency, updated_at }
                const formattedChanges = changes.map(item => ({
                    text: item[0],
                    frequency: item[1],
                    updated_at: item[2]
                }));

                const { error: rpcError } = await this.supabase.rpc('sync_user_data', {
                    p_user_id: userId,
                    p_changes: formattedChanges
                });

                if (rpcError) throw new Error(`Erro no envio (RPC): ${rpcError.message}`);
            }

            // 2. Busca de dados remotos atualizados (Pull)
            const { data, error: fetchError } = await this.supabase
                .from('user_items')
                .select('text, frequency, updated_at')
                .eq('user_id', userId)
                .gt('updated_at', lastSyncedAt || 0); // gt = greater than (maior que)

            if (fetchError) throw new Error(`Erro na busca de deltas: ${fetchError.message}`);

            // Transforma de volta para o formato de array que seu frontend usa
            // De: { text: "abc", frequency: 1, updated_at: 123 }
            // Para: ["abc", 1, 123]
            return data.map(row => [row.text, row.frequency, row.updated_at]);

        } catch (error) {
            console.error("Falha na sincronização Supabase:", error);
            throw error;
        }
    }

    /**
     * Realiza o download completo de todos os itens de autocompletar do usuário.
     * Útil para a primeira inicialização ou restauração de backup.
     * @param {string} userId - O UUID do usuário.
     * @returns {Promise<AutoCompleteItem[]>} Uma promessa com todos os itens do usuário no formato de array compactado.
     * @throws {Error} Se houver falha na consulta ao Supabase.
     */
    async fullDownload(userId) {
        console.log(`[Supabase] Solicitando Full Download para ${userId}...`);

        try {
            const { data, error } = await this.supabase
                .from('user_items')
                .select('text, frequency, updated_at')
                .eq('user_id', userId);

            if (error) {
                throw new Error(`Erro Supabase ao baixar tudo: ${error.message}`);
            }

            // Mapeia para o formato de array [texto, freq, timestamp]
            return data.map(row => [row.text, row.frequency, row.updated_at]);

        } catch (error) {
            console.error("Falha no Full Download:", error);
            throw error;
        }
    }
}