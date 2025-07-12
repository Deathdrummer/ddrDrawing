import {ElementUtils} from './utils';
// --- СИСТЕМА ИСТОРИИ ---
export const HistoryManager = {
    init(graph, cellNamespace) {
        this.graph = graph;
        this.cellNamespace = cellNamespace;
        this.history = [];
        this.maxHistorySize = 50;
        this.isRestoring = false;
        this.isCreatingLink = false;
        
        this.bindEvents();
        this.saveState();
        
        return this;
    },
    
    saveState() {
        if (this.isRestoring) return;
        
        const currentState = this.graph.toJSON();
        this.history.push(JSON.stringify(currentState));
        
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    },
    
    undo() {
        if (this.history.length <= 1) return;
        
        this.isRestoring = true;
        this.history.pop();
        
        const previousState = JSON.parse(this.history[this.history.length - 1]);
        this.graph.clear();
        this.graph.fromJSON(previousState, { cellNamespace: this.cellNamespace });
        
        setTimeout(() => {
            this.cleanupAfterRestore();
            this.isRestoring = false;
        }, 10);
    },
    
    cleanupAfterRestore() {
        this.graph.getLinks().forEach(link => {
            link.attr('line/targetMarker/type', 'none');
            link.attr('line/stroke', '#8a8a96');
            link.attr('line/strokeWidth', 2);
        });
        
        this.graph.getElements().forEach(element => {
            element.attr('body/stroke', '#8a8a96');
            element.attr('body/strokeWidth', 1);
            ElementUtils.hideElementPorts(element);
        });
    },
    
    bindEvents() {
        this.graph.on('add', (cell) => {
            if (this.isRestoring) return;
            
            if (cell.isLink()) {
                this.isCreatingLink = true;
            } else {
                setTimeout(() => this.saveState(), 10);
            }
        });
        
        this.graph.on('remove', (cell) => {
            if (!this.isRestoring) {
                setTimeout(() => this.saveState(), 10);
            }
        });
        
        this.graph.on('change:position', () => {
            if (!this.isRestoring) {
                setTimeout(() => this.saveState(), 100);
            }
        });
    }
};