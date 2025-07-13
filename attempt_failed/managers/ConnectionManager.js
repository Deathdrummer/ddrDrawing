/**
 * ConnectionManager - Управление соединениями
 */
export class ConnectionManager {
	constructor(eventBus) {
		this.eventBus = eventBus;
		this.connectionMode = 1; // По умолчанию 1 линия
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
	 * Активирует режим создания соединений
	 */
	activateConnectionMode(lineCount) {
		this.connectionMode = lineCount;
		this.updateConnectionButtons();
		this.eventBus.emit('connection:mode-changed', { lineCount });
	}

	/**
	 * Обновляет состояние кнопок
	 */
	updateConnectionButtons() {
		const buttons = ['1-line-btn', '2-line-btn', '3-line-btn', '4-line-btn'];
		
		buttons.forEach((btnId, index) => {
			const btn = document.getElementById(btnId);
			if (btn) {
				btn.classList.toggle('active', this.connectionMode === (index + 1));
			}
		});
	}

	/**
	 * Привязывает события к кнопкам
	 */
	bindConnectionButtons() {
		const buttons = [
			{ id: '1-line-btn', count: 1 },
			{ id: '2-line-btn', count: 2 },
			{ id: '3-line-btn', count: 3 },
			{ id: '4-line-btn', count: 4 }
		];
		
		buttons.forEach(({ id, count }) => {
			const btn = document.getElementById(id);
			if (btn) {
				btn.addEventListener('click', () => {
					this.activateConnectionMode(count);
				});
			}
		});
	}

	/**
	 * Получает текущий режим соединений
	 */
	getCurrentConnectionMode() {
		return this.connectionMode;
	}

	/**
	 * Заменяет одиночную линию на группу линий с offset'ом
	 */
	replaceWithMultipleLines(originalLink, portManager, graph) {
		if (this.connectionMode === 1) return [];
		
		const sourceElement = originalLink.getSourceElement();
		const targetElement = originalLink.getTargetElement();
		const sourcePort = originalLink.get('source').port;
		const targetPort = originalLink.get('target').port;
		
		if (!sourceElement || !targetElement || !sourcePort || !targetPort) {
			return [];
		}
		
		// Освобождаем порты от оригинальной линии
		portManager.onLinkDisconnect(originalLink);
		
		// Удаляем оригинальную линию
		originalLink.remove();
		
		// Создаем группу линий с offset'ом
		const createdLinks = this.createMultipleConnections(
			sourceElement, 
			targetElement, 
			sourcePort, 
			targetPort, 
			this.connectionMode,
			portManager,
			graph
		);
		
		this.eventBus.emit('connection:multiple-created', {
			sourceElement,
			targetElement,
			lineCount: this.connectionMode,
			links: createdLinks
		});
		
		return createdLinks;
	}

	/**
	 * Создает множественные соединения между элементами
	 */
	createMultipleConnections(sourceElement, targetElement, sourcePort, targetPort, lineCount, portManager, graph) {
		const createdLinks = [];
		const offset = 15; // Расстояние между линиями
		
		// Получаем координаты исходных портов
		const sourcePortPos = this.getPortPosition(sourceElement, sourcePort);
		const targetPortPos = this.getPortPosition(targetElement, targetPort);
		
		for (let i = 0; i < lineCount; i++) {
			// Рассчитываем смещение для каждой линии
			const offsetY = (i - (lineCount - 1) / 2) * offset;
			
			// Ищем свободные порты рядом с исходными
			const actualSourcePort = this.findNearbyFreePort(sourceElement, sourcePort, i, portManager);
			const actualTargetPort = this.findNearbyFreePort(targetElement, targetPort, i, portManager);
			
			if (!actualSourcePort || !actualTargetPort) {
				console.warn(`Не удалось найти свободные порты для линии ${i + 1}`);
				continue;
			}
			
			// Создаем новую линию
			const link = new joint.shapes.standard.Link({
				source: { 
					id: sourceElement.id, 
					port: actualSourcePort 
				},
				target: { 
					id: targetElement.id, 
					port: actualTargetPort 
				},
				attrs: {
					line: {
						stroke: '#333333',
						strokeWidth: 2,
						targetMarker: {
							type: 'path',
							d: 'M 10 -5 0 0 10 5 z'
						}
					}
				}
			});
			
			link.addTo(graph);
			createdLinks.push(link);
			
			// Занимаем порты
			portManager.occupyPort(sourceElement, actualSourcePort, link.id);
			portManager.occupyPort(targetElement, actualTargetPort, link.id);
		}
		
		return createdLinks;
	}

	/**
	 * Получает позицию порта относительно элемента
	 */
	getPortPosition(element, portId) {
		const port = element.getPort(portId);
		if (!port) return null;
		
		const bbox = element.getBBox();
		
		// Определяем сторону порта по его ID
		if (portId.startsWith('top')) {
			return { x: bbox.x + bbox.width / 2, y: bbox.y, side: 'top' };
		} else if (portId.startsWith('right')) {
			return { x: bbox.x + bbox.width, y: bbox.y + bbox.height / 2, side: 'right' };
		} else if (portId.startsWith('bottom')) {
			return { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height, side: 'bottom' };
		} else if (portId.startsWith('left')) {
			return { x: bbox.x, y: bbox.y + bbox.height / 2, side: 'left' };
		}
		
		return null;
	}

	/**
	 * Находит ближайший свободный порт
	 */
	findNearbyFreePort(element, originalPort, index, portManager) {
		const side = originalPort.split('-')[0]; // top, right, bottom, left
		const freePorts = portManager.getFreePortsForElement(element);
		
		// Фильтруем порты по стороне
		const sideFreePorts = freePorts.filter(port => port.id.startsWith(side));
		
		if (sideFreePorts.length === 0) {
			// Если на нужной стороне нет свободных портов, ищем на любой стороне
			return freePorts.length > 0 ? freePorts[0].id : null;
		}
		
		// Возвращаем порт по индексу или первый доступный
		return sideFreePorts[index % sideFreePorts.length]?.id || sideFreePorts[0].id;
	}

	/**
	 * Проверяет, можно ли создать множественные соединения
	 */
	canCreateMultipleConnections(sourceElement, targetElement, lineCount, portManager) {
		const sourceFree = portManager.getFreePortsForElement(sourceElement);
		const targetFree = portManager.getFreePortsForElement(targetElement);
		
		return sourceFree.length >= lineCount && targetFree.length >= lineCount;
	}

	/**
	 * Удаляет все соединения между элементами
	 */
	removeAllConnectionsBetween(sourceElement, targetElement, graph) {
		const links = graph.getConnectedLinks(sourceElement);
		const linksToRemove = [];
		
		links.forEach(link => {
			const linkTarget = link.getTargetElement();
			const linkSource = link.getSourceElement();
			
			if ((linkTarget === targetElement && linkSource === sourceElement) ||
				(linkTarget === sourceElement && linkSource === targetElement)) {
				linksToRemove.push(link);
			}
		});
		
		linksToRemove.forEach(link => link.remove());
		
		this.eventBus.emit('connection:removed-between', {
			sourceElement,
			targetElement,
			removedCount: linksToRemove.length
		});
		
		return linksToRemove.length;
	}

	/**
	 * Получает статистику соединений
	 */
	getConnectionStats(graph) {
		const links = graph.getLinks();
		const stats = {
			totalLinks: links.length,
			connectionMode: this.connectionMode,
			elementConnections: new Map()
		};
		
		// Подсчитываем соединения для каждого элемента
		graph.getElements().forEach(element => {
			const connectedLinks = graph.getConnectedLinks(element);
			stats.elementConnections.set(element.id, connectedLinks.length);
		});
		
		return stats;
	}
}