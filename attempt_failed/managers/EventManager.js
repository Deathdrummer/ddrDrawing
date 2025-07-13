/**
 * EventManager - Координация событий между менеджерами
 */
export class EventManager {
	constructor(eventBus, serviceManager) {
		this.eventBus = eventBus;
		this.serviceManager = serviceManager;
		
		// Состояние из legacy
		this.isAddModeActive = false;
		this.highlightedElement = null;
		this.isDragging = false;
		this.draggedElement = null;
		this.isCreatingLink = false;
		
		this.initialized = false;
	}

	/**
	 * Инициализация
	 */
	init() {
		if (this.initialized) return;

		// Ждем инициализации core
		this.eventBus.on('core:initialized', () => {
			this.bindAllEvents();
		});

		this.initialized = true;
	}

	/**
	 * Привязка всех событий
	 */
	bindAllEvents() {
		this.bindKeyboardEvents();
		this.bindCanvasEvents();
		this.bindElementEvents();
		this.bindLinkEvents();
		this.bindControlEvents();
		this.bindGraphEvents();
		this.bindUIEvents();
		this.bindConnectionEvents();
		
		// Синхронизируем порты после инициализации
		setTimeout(() => {
			const portManager = this.serviceManager.get('portManager');
			portManager.syncPortStates();
		}, 100);
	}

	/**
	 * Обработка клавиатуры
	 */
	bindKeyboardEvents() {
		document.addEventListener('keydown', (event) => {
			if (event.ctrlKey && event.code === 'KeyZ') {
				event.preventDefault();
				const historyManager = this.serviceManager.get('historyManager');
				historyManager.undo();
				
				// Синхронизируем порты после отмены
				setTimeout(() => {
					const portManager = this.serviceManager.get('portManager');
					portManager.syncPortStates();
				}, 50);
			}
			
			if (event.ctrlKey && event.code === 'KeyY') {
				event.preventDefault();
				const historyManager = this.serviceManager.get('historyManager');
				historyManager.redo();
				
				setTimeout(() => {
					const portManager = this.serviceManager.get('portManager');
					portManager.syncPortStates();
				}, 50);
			}
			
			if (event.code === 'Delete') {
				const selectionManager = this.serviceManager.get('selectionManager');
				selectionManager.deleteSelected();
			}
		});
	}

	/**
	 * События canvas
	 */
	bindCanvasEvents() {
		const editorCore = this.serviceManager.get('editorCore');
		const selectionManager = this.serviceManager.get('selectionManager');
		
		editorCore.paper.on('blank:pointerdown', () => {
			selectionManager.unselectAllElements();
		});
		
		editorCore.paper.on('blank:contextmenu', (evt) => {
			evt.preventDefault();
			// Здесь можно добавить контекстное меню для canvas
		});
	}

	/**
	 * События элементов
	 */
	bindElementEvents() {
		const editorCore = this.serviceManager.get('editorCore');
		const selectionManager = this.serviceManager.get('selectionManager');
		const contextMenuManager = this.serviceManager.get('contextMenuManager');
		const portManager = this.serviceManager.get('portManager');
		
		editorCore.paper.on('element:pointerdown', (elementView, evt) => {
			this.isDragging = false;
			this.draggedElement = elementView.model;
			
			if (this.isAddModeActive) return;
			
			const isMultiSelect = evt.ctrlKey || evt.metaKey;
			selectionManager.selectElement(elementView.model, isMultiSelect);
		});
		
		editorCore.paper.on('element:pointermove', (elementView) => {
			if (this.draggedElement === elementView.model) {
				this.isDragging = true;
			}
		});
		
		editorCore.paper.on('element:pointerup', (elementView) => {
			if (this.isDragging && this.draggedElement === elementView.model) {
				const historyManager = this.serviceManager.get('historyManager');
				setTimeout(() => historyManager.saveState(), 100);
			}
			
			this.isDragging = false;
			this.draggedElement = null;
		});
		
		editorCore.paper.on('element:contextmenu', (elementView, evt) => {
			evt.preventDefault();
			contextMenuManager.show(elementView.model, evt.clientX, evt.clientY);
		});
		
		editorCore.paper.on('element:mouseenter', (elementView) => {
			if (this.isAddModeActive) {
				this.highlightedElement = elementView.model;
				elementView.model.attr('body/stroke', '#31d0c6');
				elementView.model.attr('body/strokeWidth', 3);
			} else {
				portManager.showElementPorts(elementView.model);
			}
		});
		
		editorCore.paper.on('element:mouseleave', (elementView) => {
			if (this.isAddModeActive && this.highlightedElement === elementView.model) {
				elementView.model.attr('body/stroke', '#333333');
				elementView.model.attr('body/strokeWidth', 1);
				this.highlightedElement = null;
			} else {
				const selectionManager = this.serviceManager.get('selectionManager');
				if (!selectionManager.selectedElements.includes(elementView.model)) {
					portManager.hideElementPorts(elementView.model);
				}
			}
		});
		
		editorCore.paper.on('element:pointerclick', (elementView, evt) => {
			if (this.isAddModeActive && this.highlightedElement) {
				this.addElementToCanvas(
					evt.offsetX || evt.layerX,
					evt.offsetY || evt.layerY
				);
			}
		});
	}

	/**
	 * События линий
	 */
	bindLinkEvents() {
		const editorCore = this.serviceManager.get('editorCore');
		const selectionManager = this.serviceManager.get('selectionManager');
		const contextMenuManager = this.serviceManager.get('contextMenuManager');
		const portManager = this.serviceManager.get('portManager');
		
		editorCore.paper.on('link:pointerdown', (linkView, evt) => {
			const isMultiSelect = evt.ctrlKey || evt.metaKey;
			selectionManager.selectElement(linkView.model, isMultiSelect);
		});
		
		editorCore.paper.on('link:contextmenu', (linkView, evt) => {
			evt.preventDefault();
			contextMenuManager.show(linkView.model, evt.clientX, evt.clientY);
		});
		
		editorCore.paper.on('link:connect', (linkView) => {
			const historyManager = this.serviceManager.get('historyManager');
			
			// Заменяем одиночную линию на группу линий
			if (!historyManager.isRestoring) {
				const connectionManager = this.serviceManager.get('connectionManager');
				connectionManager.replaceWithMultipleLines(
					linkView.model, 
					portManager, 
					editorCore.graph
				);
			}
			
			if (this.isCreatingLink && !historyManager.isRestoring) {
				setTimeout(() => {
					historyManager.saveState();
					this.isCreatingLink = false;
				}, 10);
			}
		});
		
		editorCore.paper.on('link:disconnect', (linkView) => {
			portManager.onLinkDisconnect(linkView.model);
			
			if (this.isCreatingLink) {
				this.isCreatingLink = false;
			}
		});
	}

	/**
	 * События управления
	 */
	bindControlEvents() {
		const editorCore = this.serviceManager.get('editorCore');
		const elements = editorCore.getElements();

		elements.addSquareBtn.addEventListener('click', () => {
			this.isAddModeActive = !this.isAddModeActive;
			editorCore.elements.addSquareBtn.classList.toggle('active', this.isAddModeActive);
		});
		
		editorCore.elements.saveBtn.addEventListener('click', () => {
			const canvasData = editorCore.graph.toJSON();
			console.log(JSON.stringify(canvasData, null, 2));
		});
		
		editorCore.elements.routerSelector.addEventListener('change', () => this.updateLinkStyles());
		editorCore.elements.connectorSelector.addEventListener('change', () => this.updateLinkStyles());
	}

	/**
	 * События графа
	 */
	bindGraphEvents() {
		const editorCore = this.serviceManager.get('editorCore');
		const historyManager = this.serviceManager.get('historyManager');
		const selectionManager = this.serviceManager.get('selectionManager');
		const calloutManager = this.serviceManager.get('calloutManager');
		const portManager = this.serviceManager.get('portManager');
		
		editorCore.graph.on('add', (cell) => {
			if (!historyManager.isRestoring) {
				if (cell.isLink()) {
					this.isCreatingLink = true;
				} else if (cell.isElement()) {
					// Инициализируем порты для нового элемента
					setTimeout(() => portManager.initElementPorts(cell), 10);
					setTimeout(() => historyManager.saveState(), 10);
				}
			}
		});
		
		editorCore.graph.on('remove', (cell) => {
			selectionManager.removeFromSelection(cell);
			
			if (this.highlightedElement === cell) {
				this.highlightedElement = null;
			}
			
			if (cell.isElement()) {
				calloutManager.removeCallouts(cell);
				portManager.onElementRemove(cell);
			} else if (cell.isLink()) {
				portManager.onLinkDisconnect(cell);
			}
			
			if (!historyManager.isRestoring) {
				setTimeout(() => historyManager.saveState(), 10);
			}
		});
		
		editorCore.graph.on('change:position', (cell) => {
			if (cell.isElement()) {
				calloutManager.updateCallouts(cell);
			}
			
			if (!historyManager.isRestoring) {
				setTimeout(() => historyManager.saveState(), 100);
			}
		});
	}

	/**
	 * UI события
	 */
	bindUIEvents() {
		const contextMenuManager = this.serviceManager.get('contextMenuManager');
		
		document.addEventListener('click', (evt) => {
			contextMenuManager.handleMenuClick(evt);
		});
		
		document.addEventListener('contextmenu', (evt) => {
			if (evt.target.closest('#ddrCanvas')) {
				evt.preventDefault();
			}
		});
	}

	/**
	 * События соединений
	 */
	bindConnectionEvents() {
		const connectionManager = this.serviceManager.get('connectionManager');
		connectionManager.bindConnectionButtons();
	}

	/**
	 * Добавление элемента на canvas
	 */
	addElementToCanvas(x, y) {
		const editorCore = this.serviceManager.get('editorCore');
		
		const rect = new joint.shapes.standard.Rectangle({
			position: { x: x - 40, y: y - 30 },
			size: { width: 80, height: 60 },
			attrs: {
				body: {
					fill: '#ffffff',
					stroke: '#333333',
					strokeWidth: 1
				},
				label: {
					text: 'Rectangle',
					fontSize: 12,
					fontFamily: 'Arial'
				}
			}
		});
		
		rect.addTo(editorCore.graph);
	}

	/**
	 * Обновление стилей линий
	 */
	updateLinkStyles() {
		const editorCore = this.serviceManager.get('editorCore');
		const routerName = editorCore.elements.routerSelector.value;
		const connectorName = editorCore.elements.connectorSelector.value;
		
		editorCore.paper.options.defaultLink.set({
			router: { name: routerName },
			connector: { name: connectorName }
		});
		
		editorCore.graph.getLinks().forEach(link => {
			link.set({
				router: { name: routerName },
				connector: { name: connectorName }
			});
		});
	}
}