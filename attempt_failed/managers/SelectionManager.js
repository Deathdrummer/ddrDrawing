/**
 * SelectionManager - Управление выделением элементов
 */
export class SelectionManager {
	constructor(eventBus) {
		this.eventBus = eventBus;
		this.selectedElements = [];
		this.paper = null;
		this.portManager = null;
		this.initialized = false;
	}

	/**
	 * Инициализация
	 */
	init() {
		if (this.initialized) return this;
		this.initialized = true;
		return this;
	}

	/**
	 * Устанавливает paper
	 */
	setPaper(paper) {
		this.paper = paper;
	}

	/**
	 * Устанавливает portManager
	 */
	setPortManager(portManager) {
		this.portManager = portManager;
	}

	/**
	 * Выделяет элемент
	 */
	selectElement(element, addToSelection = false) {
		if (addToSelection && this.selectedElements.includes(element)) {
			this.unselectElement(element);
			return;
		}
		
		if (!addToSelection) {
			this.unselectAllElements();
		}
		
		this.selectedElements.push(element);
		this.applySelectionStyle(element);
		this.eventBus.emit('selection:changed', { 
			selected: this.selectedElements.slice() 
		});
	}

	/**
	 * Снимает выделение с элемента
	 */
	unselectElement(element) {
		const index = this.selectedElements.indexOf(element);
		if (index === -1) return;
		
		this.selectedElements.splice(index, 1);
		this.removeSelectionStyle(element);
		this.eventBus.emit('selection:changed', { 
			selected: this.selectedElements.slice() 
		});
	}

	/**
	 * Снимает выделение со всех элементов
	 */
	unselectAllElements() {
		this.selectedElements.forEach(element => {
			this.removeSelectionStyle(element);
		});
		
		this.selectedElements = [];
		this.eventBus.emit('selection:cleared');
	}

	/**
	 * Применяет стиль выделения
	 */
	applySelectionStyle(element) {
		if (element.isElement()) {
			element.attr('body/stroke', '#ff4444');
			element.attr('body/strokeWidth', 3);
			
			// Показываем порты выделенного элемента
			if (this.portManager) {
				this.portManager.showElementPorts(element);
			}
		} else if (element.isLink()) {
			element.attr('line/stroke', '#31d0c6');
			element.attr('line/strokeWidth', 3);
			
			// Показываем порты элементов, к которым подключена линия
			this.showConnectedElementPorts(element);
		}
	}

	/**
	 * Убирает стиль выделения
	 */
	removeSelectionStyle(element) {
		if (element.isElement()) {
			element.attr('body/stroke', '#333333');
			element.attr('body/strokeWidth', 1);
			
			// Скрываем порты если элемент не выделен
			if (this.portManager) {
				this.portManager.hideElementPorts(element);
			}
		} else if (element.isLink()) {
			element.attr('line/stroke', '#333333');
			element.attr('line/strokeWidth', 2);
			
			// Скрываем порты подключенных элементов
			this.hideConnectedElementPorts(element);
		}
	}

	/**
	 * Показывает порты элементов, подключенных к линии
	 */
	showConnectedElementPorts(link) {
		if (!this.portManager) return;
		
		const sourceElement = link.getSourceElement();
		const targetElement = link.getTargetElement();
		
		if (sourceElement) {
			this.portManager.showElementPorts(sourceElement);
		}
		
		if (targetElement && targetElement !== sourceElement) {
			this.portManager.showElementPorts(targetElement);
		}
	}

	/**
	 * Скрывает порты элементов, подключенных к линии
	 */
	hideConnectedElementPorts(link) {
		if (!this.portManager) return;
		
		const sourceElement = link.getSourceElement();
		const targetElement = link.getTargetElement();
		
		// Скрываем порты только если элемент не выделен отдельно
		if (sourceElement && !this.selectedElements.includes(sourceElement)) {
			this.portManager.hideElementPorts(sourceElement);
		}
		
		if (targetElement && 
			targetElement !== sourceElement && 
			!this.selectedElements.includes(targetElement)) {
			this.portManager.hideElementPorts(targetElement);
		}
	}

	/**
	 * Удаляет элемент из выделения (при удалении из графа)
	 */
	removeFromSelection(element) {
		const index = this.selectedElements.indexOf(element);
		if (index !== -1) {
			this.selectedElements.splice(index, 1);
			this.eventBus.emit('selection:changed', { 
				selected: this.selectedElements.slice() 
			});
		}
	}

	/**
	 * Удаляет выделенные элементы
	 */
	deleteSelected() {
		if (this.selectedElements.length === 0) return;
		
		const elementsToDelete = this.selectedElements.slice();
		this.unselectAllElements();
		
		elementsToDelete.forEach(element => {
			element.remove();
		});
		
		this.eventBus.emit('selection:deleted', { 
			deleted: elementsToDelete 
		});
	}

	/**
	 * Получает выделенные элементы
	 */
	getSelectedElements() {
		return this.selectedElements.slice();
	}

	/**
	 * Проверяет, выделен ли элемент
	 */
	isSelected(element) {
		return this.selectedElements.includes(element);
	}

	/**
	 * Выделяет все элементы
	 */
	selectAll(graph) {
		if (!graph) return;
		
		this.unselectAllElements();
		const allCells = graph.getCells();
		
		allCells.forEach(cell => {
			this.selectedElements.push(cell);
			this.applySelectionStyle(cell);
		});
		
		this.eventBus.emit('selection:changed', { 
			selected: this.selectedElements.slice() 
		});
	}

	/**
	 * Получает количество выделенных элементов
	 */
	getSelectedCount() {
		return this.selectedElements.length;
	}

	/**
	 * Получает тип выделения
	 */
	getSelectionType() {
		if (this.selectedElements.length === 0) return 'none';
		if (this.selectedElements.length === 1) {
			return this.selectedElements[0].isElement() ? 'element' : 'link';
		}
		return 'multiple';
	}
}