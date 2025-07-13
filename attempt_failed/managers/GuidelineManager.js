/**
 * GuidelineManager - Управление направляющими линиями
 */
export class GuidelineManager {
	constructor(eventBus) {
		this.eventBus = eventBus;
		this.paper = null;
		this.guidelines = [];
		this.snapDistance = 10;
		this.enabled = true;
		this.initialized = false;
	}

	/**
	 * Инициализация
	 */
	init() {
		if (this.initialized) return this;
		
		this.eventBus.on('core:initialized', ({ paper }) => {
			this.setPaper(paper);
		});

		this.initialized = true;
		return this;
	}

	/**
	 * Устанавливает paper
	 */
	setPaper(paper) {
		this.paper = paper;
		this.bindEvents();
	}

	/**
	 * Привязывает события
	 */
	bindEvents() {
		if (!this.paper) return;

		this.paper.on('element:pointermove', (elementView, evt) => {
			if (!this.enabled) return;
			this.showGuidelines(elementView);
		});

		this.paper.on('element:pointerup', () => {
			this.hideGuidelines();
		});
	}

	/**
	 * Показывает направляющие для элемента
	 */
	showGuidelines(elementView) {
		const element = elementView.model;
		const bbox = element.getBBox();
		const otherElements = this.getOtherElements(element);
		
		this.clearGuidelines();
		
		otherElements.forEach(otherElement => {
			const otherBbox = otherElement.getBBox();
			this.createGuidelinesForElements(bbox, otherBbox);
		});
	}

	/**
	 * Создает направляющие между элементами
	 */
	createGuidelinesForElements(bbox1, bbox2) {
		// Вертикальные направляющие
		this.checkVerticalAlignment(bbox1, bbox2);
		
		// Горизонтальные направляющие
		this.checkHorizontalAlignment(bbox1, bbox2);
	}

	/**
	 * Проверяет вертикальное выравнивание
	 */
	checkVerticalAlignment(bbox1, bbox2) {
		const tolerance = this.snapDistance;
		
		// Левые края
		if (Math.abs(bbox1.x - bbox2.x) < tolerance) {
			this.createVerticalGuideline(bbox1.x);
		}
		
		// Центры по горизонтали
		const center1X = bbox1.x + bbox1.width / 2;
		const center2X = bbox2.x + bbox2.width / 2;
		if (Math.abs(center1X - center2X) < tolerance) {
			this.createVerticalGuideline(center1X);
		}
		
		// Правые края
		const right1 = bbox1.x + bbox1.width;
		const right2 = bbox2.x + bbox2.width;
		if (Math.abs(right1 - right2) < tolerance) {
			this.createVerticalGuideline(right1);
		}
	}

	/**
	 * Проверяет горизонтальное выравнивание
	 */
	checkHorizontalAlignment(bbox1, bbox2) {
		const tolerance = this.snapDistance;
		
		// Верхние края
		if (Math.abs(bbox1.y - bbox2.y) < tolerance) {
			this.createHorizontalGuideline(bbox1.y);
		}
		
		// Центры по вертикали
		const center1Y = bbox1.y + bbox1.height / 2;
		const center2Y = bbox2.y + bbox2.height / 2;
		if (Math.abs(center1Y - center2Y) < tolerance) {
			this.createHorizontalGuideline(center1Y);
		}
		
		// Нижние края
		const bottom1 = bbox1.y + bbox1.height;
		const bottom2 = bbox2.y + bbox2.height;
		if (Math.abs(bottom1 - bottom2) < tolerance) {
			this.createHorizontalGuideline(bottom1);
		}
	}

	/**
	 * Создает вертикальную направляющую
	 */
	createVerticalGuideline(x) {
		const paperSize = this.paper.getArea();
		
		const guideline = document.createElementNS('http://www.w3.org/2000/svg', 'line');
		guideline.setAttribute('x1', x);
		guideline.setAttribute('y1', 0);
		guideline.setAttribute('x2', x);
		guideline.setAttribute('y2', paperSize.height);
		guideline.setAttribute('stroke', '#ff6b6b');
		guideline.setAttribute('stroke-width', '1');
		guideline.setAttribute('stroke-dasharray', '5,5');
		guideline.setAttribute('class', 'guideline');
		
		this.paper.svg.appendChild(guideline);
		this.guidelines.push(guideline);
	}

	/**
	 * Создает горизонтальную направляющую
	 */
	createHorizontalGuideline(y) {
		const paperSize = this.paper.getArea();
		
		const guideline = document.createElementNS('http://www.w3.org/2000/svg', 'line');
		guideline.setAttribute('x1', 0);
		guideline.setAttribute('y1', y);
		guideline.setAttribute('x2', paperSize.width);
		guideline.setAttribute('y2', y);
		guideline.setAttribute('stroke', '#ff6b6b');
		guideline.setAttribute('stroke-width', '1');
		guideline.setAttribute('stroke-dasharray', '5,5');
		guideline.setAttribute('class', 'guideline');
		
		this.paper.svg.appendChild(guideline);
		this.guidelines.push(guideline);
	}

	/**
	 * Скрывает все направляющие
	 */
	hideGuidelines() {
		this.clearGuidelines();
	}

	/**
	 * Очищает все направляющие
	 */
	clearGuidelines() {
		this.guidelines.forEach(guideline => {
			if (guideline.parentNode) {
				guideline.parentNode.removeChild(guideline);
			}
		});
		this.guidelines = [];
	}

	/**
	 * Получает другие элементы (исключая текущий)
	 */
	getOtherElements(currentElement) {
		if (!this.paper || !this.paper.model) return [];
		
		return this.paper.model.getElements().filter(element => 
			element !== currentElement
		);
	}

	/**
	 * Привязка элемента к направляющим
	 */
	snapToGuidelines(element, newPosition) {
		if (!this.enabled) return newPosition;
		
		const bbox = element.getBBox();
		const otherElements = this.getOtherElements(element);
		let snappedX = newPosition.x;
		let snappedY = newPosition.y;
		
		otherElements.forEach(otherElement => {
			const otherBbox = otherElement.getBBox();
			
			// Привязка по X
			const snapX = this.getSnapPositionX(bbox, otherBbox, newPosition.x);
			if (snapX !== null) {
				snappedX = snapX;
			}
			
			// Привязка по Y
			const snapY = this.getSnapPositionY(bbox, otherBbox, newPosition.y);
			if (snapY !== null) {
				snappedY = snapY;
			}
		});
		
		return { x: snappedX, y: snappedY };
	}

	/**
	 * Получает позицию привязки по X
	 */
	getSnapPositionX(bbox, otherBbox, currentX) {
		const tolerance = this.snapDistance;
		
		// Левые края
		if (Math.abs(currentX - otherBbox.x) < tolerance) {
			return otherBbox.x;
		}
		
		// Центры
		const centerX = otherBbox.x + otherBbox.width / 2 - bbox.width / 2;
		if (Math.abs(currentX - centerX) < tolerance) {
			return centerX;
		}
		
		// Правые края
		const rightX = otherBbox.x + otherBbox.width - bbox.width;
		if (Math.abs(currentX - rightX) < tolerance) {
			return rightX;
		}
		
		return null;
	}

	/**
	 * Получает позицию привязки по Y
	 */
	getSnapPositionY(bbox, otherBbox, currentY) {
		const tolerance = this.snapDistance;
		
		// Верхние края
		if (Math.abs(currentY - otherBbox.y) < tolerance) {
			return otherBbox.y;
		}
		
		// Центры
		const centerY = otherBbox.y + otherBbox.height / 2 - bbox.height / 2;
		if (Math.abs(currentY - centerY) < tolerance) {
			return centerY;
		}
		
		// Нижние края
		const bottomY = otherBbox.y + otherBbox.height - bbox.height;
		if (Math.abs(currentY - bottomY) < tolerance) {
			return bottomY;
		}
		
		return null;
	}

	/**
	 * Включает/выключает направляющие
	 */
	setEnabled(enabled) {
		this.enabled = enabled;
		if (!enabled) {
			this.clearGuidelines();
		}
		this.eventBus.emit('guidelines:toggled', { enabled });
	}

	/**
	 * Устанавливает расстояние привязки
	 */
	setSnapDistance(distance) {
		this.snapDistance = distance;
		this.eventBus.emit('guidelines:snap-distance-changed', { distance });
	}

	/**
	 * Получает текущие настройки
	 */
	getSettings() {
		return {
			enabled: this.enabled,
			snapDistance: this.snapDistance,
			activeGuidelines: this.guidelines.length
		};
	}
}