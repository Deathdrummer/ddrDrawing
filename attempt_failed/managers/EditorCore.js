/**
 * EditorCore - Инициализация canvas и основных компонентов
 */
export class EditorCore {
	constructor(eventBus) {
		this.eventBus = eventBus;
		this.graph = null;
		this.paper = null;
		this.cellNamespace = null;
		this.elements = null;
		this.initialized = false;
	}

	/**
	 * Инициализация редактора
	 */
	init() {
		if (this.initialized) {
			console.warn('EditorCore already initialized');
			return this;
		}

		this.elements = this.getElements();
		if (!this.elements) {
			console.error('DDR Редактор: Ошибка инициализации. Элементы не найдены.');
			return null;
		}

		const canvasData = this.createCanvas(this.elements);
		this.graph = canvasData.graph;
		this.paper = canvasData.paper;
		this.cellNamespace = canvasData.cellNamespace;

		this.initialized = true;
		this.eventBus.emit('core:initialized', { 
			graph: this.graph, 
			paper: this.paper,
			elements: this.elements
		});
		
		setTimeout(() => {
			const portManager = window.ddrDrawing().getService('portManager');
			this.paper.portManager = portManager;
		}, 10);

		return this;
	}

	/**
	 * Получает DOM элементы
	 */
	getElements() {
		const canvasElement = document.getElementById('ddrCanvas');
		const paperContainer = document.getElementById('paper-container');
		const addSquareBtn = document.getElementById('add-square-btn');
		const saveBtn = document.getElementById('save-btn');
		const routerSelector = document.getElementById('router-selector');
		const connectorSelector = document.getElementById('connector-selector');
		
		if (!canvasElement || !paperContainer || !addSquareBtn || !routerSelector || !connectorSelector) {
			return null;
		}

		return {
			canvasElement,
			paperContainer,
			addSquareBtn,
			saveBtn,
			routerSelector,
			connectorSelector
		};
	}

	/**
	 * Создает JointJS canvas
	 */
	createCanvas(elements) {
		const cellNamespace = joint.shapes;
		
		const graph = new joint.dia.Graph({}, { cellNamespace });
		
		const paper = new joint.dia.Paper({
			el: elements.canvasElement,
			model: graph,
			width: elements.paperContainer.clientWidth,
			height: elements.paperContainer.clientHeight,
			cellViewNamespace: cellNamespace,
			gridSize: 10,
			drawGrid: true,
			interactive: { linkMove: false },
			defaultLink: new joint.shapes.standard.Link({
				attrs: {
					line: {
						stroke: '#333333',
						strokeWidth: 2,
						targetMarker: {
							type: 'path',
							d: 'M 10 -5 0 0 10 5 z'
						}
					}
				},
				router: { name: 'manhattan' },
				connector: { name: 'rounded' }
			}),
			validateConnection: function(cellViewS, magnetS, cellViewT, magnetT, end, linkView) {
				if (cellViewS === cellViewT) return false;
				
				// Делегируем валидацию PortManager'у если он доступен
				if (this.portManager && typeof this.portManager.validateConnection === 'function') {
					return this.portManager.validateConnection(cellViewS, magnetS, cellViewT, magnetT, end, linkView);
				}
				
				return true;
			}
		});

		return { graph, paper, cellNamespace };
	}

	/**
	 * Получает размеры canvas
	 */
	getCanvasSize() {
		if (!this.elements) return { width: 800, height: 600 };
		
		return {
			width: this.elements.paperContainer.clientWidth,
			height: this.elements.paperContainer.clientHeight
		};
	}

	/**
	 * Изменяет размер canvas
	 */
	resize(width, height) {
		if (this.paper) {
			this.paper.setDimensions(width, height);
			this.eventBus.emit('core:resized', { width, height });
		}
	}
	
	/**
	 * Получает DOM элементы
	 */
	getElements() {
		return this.elements;
	}

	/**
	 * Уничтожает редактор
	 */
	destroy() {
		if (this.paper) {
			this.paper.remove();
		}
		
		if (this.graph) {
			this.graph.clear();
		}

		this.graph = null;
		this.paper = null;
		this.cellNamespace = null;
		this.elements = null;
		this.initialized = false;

		this.eventBus.emit('core:destroyed');
	}
}