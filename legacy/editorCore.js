import { PortManager } from './portManager';

export const EditorCore = {
    init() {
        const elements = this.getElements();
        if (!elements) return null;
        
        const { graph, paper, cellNamespace } = this.createCanvas(elements);
        const portManager = PortManager.init();
        portManager.setGraph(graph);
        portManager.setPaper(paper);
        
        return { 
            ...elements, 
            graph, 
            paper, 
            cellNamespace,
            portManager
        };
    },
    
    getElements() {
        const canvasElement = document.getElementById('ddrCanvas');
        const paperContainer = document.getElementById('paper-container');
        const addSquareBtn = document.getElementById('add-square-btn');
        const saveBtn = document.getElementById('save-btn');
        const routerSelector = document.getElementById('router-selector');
        const connectorSelector = document.getElementById('connector-selector');
        
        if (!canvasElement || !paperContainer || !addSquareBtn || !routerSelector || !connectorSelector) {
            console.error('DDR Редактор: Ошибка инициализации. Элементы не найдены.');
            return null;
        }
        
        return { canvasElement, paperContainer, addSquareBtn, saveBtn, routerSelector, connectorSelector };
    },
    
    createCanvas(elements) {
        const App = {};
        
        App.Link = joint.shapes.standard.Link.extend({
            defaults: joint.util.deepSupplement({
                attrs: {
                    line: { targetMarker: { 'type': 'none' } }
                }
            }, joint.shapes.standard.Link.prototype.defaults)
        });
        
        const cellNamespace = { ...joint.shapes, ...App };
        const graph = new joint.dia.Graph({}, { cellNamespace });
        
        const paper = new joint.dia.Paper({
            el: elements.canvasElement,
            model: graph,
            width: elements.paperContainer.clientWidth || 800,
            height: elements.paperContainer.clientHeight || 600,
            gridSize: 10,
            drawGrid: true,
            background: { color: '#ffffff' },
            cellViewNamespace: cellNamespace,
            linkPinning: true,
            markAvailable: true,
            defaultLink: new App.Link({
                attrs: { line: { stroke: '#8a8a96', strokeWidth: 2 }},
                router: { name: 'manhattan' },
                connector: { name: 'rounded' }
            }),
            validateConnection: function(cellViewS, magnetS, cellViewT, magnetT, end, linkView) {
                // Интегрируем валидацию портов
                if (this.portManager) {
                    return this.portManager.validateConnection(cellViewS, magnetS, cellViewT, magnetT, end, linkView);
                }
                // Базовая валидация
                if (magnetS && magnetT && (cellViewS === cellViewT)) return false;
                return true;
            }
        });
        
        return { graph, paper, cellNamespace };
    },
    
    // Создание элемента с множественными портами
    createElementWithMultiplePorts(x, y, size = 30) {
        const portManager = PortManager.init();
        
        const square = new joint.shapes.standard.Rectangle({
            position: { x, y },
            size: { width: size, height: size },
            attrs: { body: { fill: '#e9edf0', stroke: '#8a8a96', strokeWidth: 1 } },
            ports: portManager.createSimplePorts()
        });
        
        return square;
    }
};