/**
 * PortManager - Управление портами элементов
 */
export class PortManager {
	constructor(eventBus) {
		this.eventBus = eventBus;
		this.graph = null;
		this.paper = null;
		this.portStates = new Map();
		this.initialized = false;
	}

	/**
	 * Инициализация
	 */
	init() {
		if (this.initialized) return this;
		
		this.eventBus.on('core:initialized', ({ graph, paper }) => {
			this.setGraph(graph);
			this.setPaper(paper);
		});

		this.initialized = true;
		return this;
	}

	/**
	 * Устанавливает граф
	 */
	setGraph(graph) {
		this.graph = graph;
	}

	/**
	 * Устанавливает paper
	 */
	setPaper(paper) {
		this.paper = paper;
	}

	/**
	 * Инициализирует порты для элемента
	 */
	initElementPorts(element) {
		if (!element.isElement()) return;

		const elementId = element.id;
		const ports = {
			top: this.createPortsForSide('top', 4),
			right: this.createPortsForSide('right', 4),
			bottom: this.createPortsForSide('bottom', 4),
			left: this.createPortsForSide('left', 4)
		};

		this.portStates.set(elementId, ports);
		this.addPortsToElement(element, ports);
		this.eventBus.emit('ports:initialized', { element, ports });
	}

	/**
	 * Создает порты для стороны элемента
	 */
	createPortsForSide(side, count) {
		const ports = [];
		for (let i = 0; i < count; i++) {
			ports.push({
				id: `${side}-${i}`,
				group: side,
				occupied: false,
				linkId: null
			});
		}
		return ports;
	}

	/**
	 * Добавляет порты к элементу JointJS
	 */
	addPortsToElement(element, ports) {
		const allPorts = Object.values(ports).flat();
		
		const jointPorts = allPorts.map(port => ({
			id: port.id,
			group: port.group,
			attrs: {
				circle: {
					r: 6,
					fill: '#ffffff',
					stroke: '#333333',
					strokeWidth: 2,
					magnet: true
				}
			}
		}));

		element.addPorts(jointPorts);
	}

	/**
	 * Валидация соединения портов
	 */
	validateConnection(cellViewS, magnetS, cellViewT, magnetT, end, linkView) {
		// Запрещаем соединение элемента с самим собой
		if (cellViewS.model === cellViewT.model) {
			return false;
		}

		// Проверяем доступность портов
		const sourcePortId = magnetS?.getAttribute('port');
		const targetPortId = magnetT?.getAttribute('port');

		if (!sourcePortId || !targetPortId) {
			return false;
		}

		const sourceAvailable = this.isPortAvailable(cellViewS.model, sourcePortId);
		const targetAvailable = this.isPortAvailable(cellViewT.model, targetPortId);

		if (!sourceAvailable || !targetAvailable) {
			this.eventBus.emit('ports:connection-rejected', {
				reason: 'ports_occupied',
				sourcePort: sourcePortId,
				targetPort: targetPortId
			});
			return false;
		}

		return true;
	}

	/**
	 * Проверяет доступность порта
	 */
	isPortAvailable(element, portId) {
		const elementId = element.id;
		const portState = this.portStates.get(elementId);
		
		if (!portState) return false;
		
		const port = Object.values(portState).flat().find(p => p.id === portId);
		return port && !port.occupied;
	}

	/**
	 * Занимает порт
	 */
	occupyPort(element, portId, linkId) {
		const elementId = element.id;
		const portState = this.portStates.get(elementId);
		
		if (!portState) return false;
		
		const port = Object.values(portState).flat().find(p => p.id === portId);
		if (!port || port.occupied) return false;
		
		port.occupied = true;
		port.linkId = linkId;
		
		this.updatePortVisuals(element);
		this.eventBus.emit('ports:occupied', { element, portId, linkId });
		return true;
	}

	/**
	 * Освобождает порт
	 */
	freePort(element, portId) {
		const elementId = element.id;
		const portState = this.portStates.get(elementId);
		
		if (!portState) return false;
		
		const port = Object.values(portState).flat().find(p => p.id === portId);
		if (!port) return false;
		
		port.occupied = false;
		port.linkId = null;
		
		this.updatePortVisuals(element);
		this.eventBus.emit('ports:freed', { element, portId });
		return true;
	}

	/**
	 * Обновляет визуализацию портов
	 */
	updatePortVisuals(element) {
		const elementId = element.id;
		const portState = this.portStates.get(elementId);
		
		if (!portState) return;
		
		Object.values(portState).flat().forEach(port => {
			const portElement = element.getPort(port.id);
			if (portElement) {
				element.portProp(port.id, 'attrs/circle/fill', 
					port.occupied ? '#ff6b6b' : '#ffffff'
				);
			}
		});
	}

	/**
	 * Обработка подключения линии
	 */
	onLinkConnect(link) {
		const sourceElement = link.getSourceElement();
		const targetElement = link.getTargetElement();
		const sourcePort = link.get('source').port;
		const targetPort = link.get('target').port;
		
		if (sourceElement && sourcePort) {
			this.occupyPort(sourceElement, sourcePort, link.id);
		}
		
		if (targetElement && targetPort) {
			this.occupyPort(targetElement, targetPort, link.id);
		}
	}

	/**
	 * Обработка отключения линии
	 */
	onLinkDisconnect(link) {
		const sourceElement = link.getSourceElement();
		const targetElement = link.getTargetElement();
		const sourcePort = link.get('source').port;
		const targetPort = link.get('target').port;
		
		if (sourceElement && sourcePort) {
			this.freePort(sourceElement, sourcePort);
		}
		
		if (targetElement && targetPort) {
			this.freePort(targetElement, targetPort);
		}
	}

	/**
	 * Обработка удаления элемента
	 */
	onElementRemove(element) {
		const elementId = element.id;
		this.portStates.delete(elementId);
		this.eventBus.emit('ports:element-removed', { element });
	}

	/**
	 * Показывает порты элемента
	 */
	showElementPorts(element) {
		if (!element.isElement()) return;
		
		const ports = element.getPorts();
		ports.forEach(port => {
			element.portProp(port.id, 'attrs/circle/opacity', 1);
		});
	}

	/**
	 * Скрывает порты элемента
	 */
	hideElementPorts(element) {
		if (!element.isElement()) return;
		
		const ports = element.getPorts();
		ports.forEach(port => {
			element.portProp(port.id, 'attrs/circle/opacity', 0);
		});
	}

	/**
	 * Синхронизирует состояние портов
	 */
	syncPortStates() {
		if (!this.graph) return;
		
		// Сбрасываем все порты
		this.portStates.forEach((portState, elementId) => {
			Object.values(portState).flat().forEach(port => {
				port.occupied = false;
				port.linkId = null;
			});
		});

		// Проходим по всем линиям и помечаем занятые порты
		this.graph.getLinks().forEach(link => {
			this.onLinkConnect(link);
		});

		// Обновляем визуализацию
		this.graph.getElements().forEach(element => {
			this.updatePortVisuals(element);
		});
	}

	/**
	 * Получает свободные порты элемента
	 */
	getFreePortsForElement(element) {
		const elementId = element.id;
		const portState = this.portStates.get(elementId);
		
		if (!portState) return [];
		
		return Object.values(portState).flat().filter(port => !port.occupied);
	}
}