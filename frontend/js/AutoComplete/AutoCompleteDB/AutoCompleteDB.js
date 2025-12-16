export default class AutoCompleteDB extends Dexie {
    constructor() {
        super('AutoCompleteDB_v3');
        
        this.version(1).stores({
            sentences: '[userId+t], userId, [userId+sincronizado]' 
        });
    }
}