// Simula um Banco de Dados
const MEMORY_DB = {}; 

module.exports = {
    getDb: () => MEMORY_DB,
    
    getUserData: (userId) => {
        if (!MEMORY_DB[userId]) MEMORY_DB[userId] = {};
        return MEMORY_DB[userId];
    },

    updateUserItem: (userId, texto, freq, timestamp) => {
        if (!MEMORY_DB[userId]) MEMORY_DB[userId] = {};
        
        const userDB = MEMORY_DB[userId];
        const serverItem = userDB[texto];

        // Lógica de conflito (Merge)
        if (!serverItem || timestamp > serverItem.up) {
            userDB[texto] = { f: freq, up: timestamp };
            return true; // Atualizou
        }
        return false; // Não atualizou
    }
};