/**
 * CalloutManager - Управление сносками
 */
export class CalloutManager {
	constructor(eventBus) {
		this.eventBus = eventBus;
		this.paper = null;
		this.graph = null;
		this.historyManager = null;
		this.callouts = new Map();
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
	 * Устанавливает граф
	 */
	setGraph(graph) {
		this.graph = graph;
	}

	/**
	 * Устанавливает historyManager
	 */
	setHistoryManager(historyManager) {
		this.historyManager = historyManager;
	}

	/**
	 * Добавляет сноску к элементу
	 */
	addLabel(element, labelText = 'Введите текст...') {
		if (element.isElement()) {
			this.addElementCallout(element, labelText);
		} else if (element.isLink()) {
			this.addLinkCallout(element, labelText);
		}
		
		if (this.historyManager) {
			setTimeout(() => this.historyManager.saveState(), 10);
		}

		this.eventBus.emit('callout:added', { element, labelText });
	}

	/**
	 * Добавляет сноску к элементу
	 */
	addElementCallout(element, labelText) {
		const bbox = element.getBBox();
		const startX = bbox.x + bbox.width;
		const startY = bbox.y + bbox.height / 2;
		const midX = startX + 40;
		const midY = startY - 30;
		
		const diagonalLine = new joint.shapes.standard.Link({
			source: { x: startX, y: startY },
			target: { x: midX, y: midY },
			attrs: {
				line: {
					stroke: '#333',
					strokeWidth: 1,
					targetMarker: { type: 'none' },
					sourceMarker: { type: 'none' }
				}
			}
		});
		
		const horizontalLine = new joint.shapes.standard.Link({
			source: { x: midX, y: midY },
			target: { x: midX + 100, y: midY },
			attrs: {
				line: {
					stroke: '#333',
					strokeWidth: 1,
					targetMarker: { type: 'none' },
					sourceMarker: { type: 'none' }
				}
			}
		});
		
		diagonalLine.addTo(this.graph);
		horizontalLine.addTo(this.graph);
		
		// Создаем текстовый элемент
		const textElement = this.createTextElement(midX + 105, midY - 10, labelText);
		textElement.addTo(this.graph);
		
		// Сохраняем связь сноски с элементом
		const calloutId = this.generateCalloutId();
		this.callouts.set(calloutId, {
			targetElement: element,
			diagonalLine,
			horizontalLine,
			textElement,
			type: 'element'
		});
		
		return calloutId;
	}

	/**
	 * Добавляет сноску к линии
	 */
	addLinkCallout(link, labelText) {
		const sourcePoint = link.getSourcePoint();
		const targetPoint = link.getTargetPoint();
		
		// Находим середину линии
		const midX = (sourcePoint.x + targetPoint.x) / 2;
		const midY = (sourcePoint.y + targetPoint.y) / 2;
		
		// Создаем сноску от середины линии
		const calloutX = midX + 30;
		const calloutY = midY - 30;
		
		const calloutLine = new joint.shapes.standard.Link({
			source: { x: midX, y: midY },
			target: { x: calloutX, y: calloutY },
			attrs: {
				line: {
					stroke: '#666',
					strokeWidth: 1,
					strokeDasharray: '3,3',
					targetMarker: { type: 'none' },
					sourceMarker: { type: 'none' }
				}
			}
		});
		
		const horizontalLine = new joint.shapes.standard.Link({
			source: { x: calloutX, y: calloutY },
			target: { x: calloutX + 80, y: calloutY },
			attrs: {
				line: {
					stroke: '#666',
					strokeWidth: 1,
					strokeDasharray: '3,3',
					targetMarker: { type: 'none' },
					sourceMarker: { type: 'none' }
				}
			}
		});
		
		calloutLine.addTo(this.graph);
		horizontalLine.addTo(this.graph);
		
		// Создаем текстовый элемент
		const textElement = this.createTextElement(calloutX + 85, calloutY - 10, labelText);
		textElement.addTo(this.graph);
		
		// Сохраняем связь сноски с линией
		const calloutId = this.generateCalloutId();
		this.callouts.set(calloutId, {
			targetElement: link,
			calloutLine,
			horizontalLine,
			textElement,
			type: 'link'
		});
		
		return calloutId;
	}

	/**
	 * Создает текстовый элемент
	 */
	createTextElement(x, y, text) {
		return new joint.shapes.standard.Rectangle({
			position: { x, y },
			size: { width: text.length * 8 + 20, height: 20 },
			attrs: {
				body: {
					fill: '#ffffff',
					stroke: '#333',
					strokeWidth: 1,
					rx: 3,
					ry: 3
				},
				label: {
					text: text,
					fontSize: 12,
					fontFamily: 'Arial',
					fill: '#333'
				}
			}
		});
	}

	/**
	 * Обновляет сноски при перемещении элемента
	 */
	updateCallouts(element) {
		for (const [calloutId, callout] of this.callouts) {
			if (callout.targetElement === element && callout.type === 'element') {
				this.updateElementCallout(callout);
			}
		}
	}

	/**
	 * Обновляет сноску элемента
	 */
	updateElementCallout(callout) {
		const bbox = callout.targetElement.getBBox();
		const startX = bbox.x + bbox.width;
		const startY = bbox.y + bbox.height / 2;
		const midX = startX + 40;
		const midY = startY - 30;
		
		// Обновляем диагональную линию
		callout.diagonalLine.set({
			source: { x: startX, y: startY },
			target: { x: midX, y: midY }
		});
		
		// Обновляем горизонтальную линию
		callout.horizontalLine.set({
			source: { x: midX, y: midY },
			target: { x: midX + 100, y: midY }
		});
		
		// Обновляем позицию текста
		callout.textElement.position(midX + 105, midY - 10);
	}

	/**
	 * Удаляет все сноски элемента
	 */
	removeCallouts(element) {
		const calloutsToRemove = [];
		
		for (const [calloutId, callout] of this.callouts) {
			if (callout.targetElement === element) {
				calloutsToRemove.push(calloutId);
			}
		}
		
		calloutsToRemove.forEach(calloutId => {
			this.removeCallout(calloutId);
		});
	}

	/**
	 * Удаляет конкретную сноску
	 */
	removeCallout(calloutId) {
		const callout = this.callouts.get(calloutId);
		if (!callout) return;
		
		// Удаляем все элементы сноски
		if (callout.diagonalLine) callout.diagonalLine.remove();
		if (callout.calloutLine) callout.calloutLine.remove();
		if (callout.horizontalLine) callout.horizontalLine.remove();
		if (callout.textElement) callout.textElement.remove();
		
		this.callouts.delete(calloutId);
		this.eventBus.emit('callout:removed', { calloutId });
	}

	/**
	 * Редактирует текст сноски
	 */
	editCalloutText(calloutId, newText) {
		const callout = this.callouts.get(calloutId);
		if (!callout || !callout.textElement) return;
		
		callout.textElement.attr('label/text', newText);
		
		// Обновляем размер текстового элемента
		const newWidth = newText.length * 8 + 20;
		callout.textElement.resize(newWidth, 20);
		
		this.eventBus.emit('callout:text-changed', { calloutId, newText });
	}

	/**
	 * Получает все сноски элемента
	 */
	getCalloutsForElement(element) {
		const elementCallouts = [];
		
		for (const [calloutId, callout] of this.callouts) {
			if (callout.targetElement === element) {
				elementCallouts.push({
					id: calloutId,
					...callout
				});
			}
		}
		
		return elementCallouts;
	}

	/**
	 * Генерирует уникальный ID для сноски
	 */
	generateCalloutId() {
		return 'callout_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
	}

	/**
	 * Очищает все сноски
	 */
	clear() {
		for (const [calloutId] of this.callouts) {
			this.removeCallout(calloutId);
		}
	}
}