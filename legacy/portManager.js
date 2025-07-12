export const PortManager = {
	init() {
		this.graph = null;
		this.paper = null;
		this.portStates = new Map(); // elementId -> {side: [{id, occupied, linkId}]}
		this.portCounter = 0;
		
		return this;
	},
	
	setGraph(graph) {
		this.graph = graph;
	},
	
	setPaper(paper) {
		this.paper = paper;
		
		// Обработчик кликов по портам через JointJS события
		this.paper.on('element:magnet:pointerclick', (elementView, evt, magnet) => {
			const portId = magnet.getAttribute('port');
			if (portId && this.graph) {
				const connections = this.graph.getLinks().filter(link => {
					const source = link.get('source');
					const target = link.get('target');
					return (source.port === portId) || (target.port === portId);
				}).length;
				console.log(`🔌 Port: ${portId}, connections: ${connections}`);
			}
		});
	},
	
	// Создает пустую конфигурацию портов (для элементов без портов)
	createEmptyPorts() {
		return {
			groups: {
				'simplePorts': {
					attrs: { 
						circle: { 
							r: 4, 
							magnet: true, 
							stroke: '#31d0c6', 
							strokeWidth: 2, 
							fill: '#ffffff', 
							display: 'none',
							'pointer-events': 'auto'
						}
					},
					markup: '<circle r="4" />'
				}
			},
			items: []
		};
	},
	
	// Создает базовые порты (по одному на каждую сторону)
	createSimplePorts() {
		return {
			groups: {
				'simplePorts': {
					attrs: { 
						circle: { 
							r: 4, 
							magnet: true, 
							stroke: '#31d0c6', 
							strokeWidth: 2, 
							fill: '#ffffff', 
							display: 'none',
							'pointer-events': 'auto'
						}
					},
					markup: '<circle r="4" />'
				}
			},
			items: [
				{ group: 'simplePorts', args: { x: '50%', y: '0%' }, id: 'top_0' },
				{ group: 'simplePorts', args: { x: '100%', y: '50%' }, id: 'right_0' },
				{ group: 'simplePorts', args: { x: '50%', y: '100%' }, id: 'bottom_0' },
				{ group: 'simplePorts', args: { x: '0%', y: '50%' }, id: 'left_0' }
			]
		};
	},
	
	// Инициализирует состояние портов для элемента
	initElementPorts(element) {
		const elementId = element.id;
		const existingPorts = element.getPorts();
		
		// Если нет портов, создаем пустое состояние
		if (existingPorts.length === 0) {
			this.portStates.set(elementId, {
				top: [],
				right: [],
				bottom: [],
				left: []
			});
			return;
		}
		
		// Инициализируем состояние для существующих портов
		const portState = {
			top: [],
			right: [],
			bottom: [],
			left: []
		};
		
		existingPorts.forEach(port => {
			const side = this.getPortSide(port.id);
			if (side) {
				portState[side].push({
					id: port.id,
					occupied: false,
					linkId: null
				});
			}
		});
		
		this.portStates.set(elementId, portState);
		this.updatePortVisuals(element);
	},
	
	// Определяет сторону порта по его ID
	getPortSide(portId) {
		if (portId.startsWith('top_')) return 'top';
		if (portId.startsWith('right_')) return 'right';
		if (portId.startsWith('bottom_')) return 'bottom';
		if (portId.startsWith('left_')) return 'left';
		return null;
	},
	
	// Добавляет новый порт к элементу
	addPortToElement(element, side) {
		const elementId = element.id;
		let portState = this.portStates.get(elementId);
		
		if (!portState) {
			this.initElementPorts(element);
			portState = this.portStates.get(elementId);
		}
		
		const sideCount = portState[side].length;
		const newPortId = `${side}_${sideCount}`;
		
		// Добавляем порт к элементу
		const portArgs = this.calculatePortPosition(side, sideCount);
		element.addPort({
			group: 'simplePorts',
			args: portArgs,
			id: newPortId
		});
		
		// Обновляем состояние
		portState[side].push({
			id: newPortId,
			occupied: false,
			linkId: null
		});
		
		// Перераспределяем все порты на этой стороне
		this.redistributePortsOnSide(element, side);
		
		this.updatePortVisuals(element);
		return newPortId;
	},
	
	// Удаляет порт с элемента
	removePortFromElement(element, portId) {
		const elementId = element.id;
		const portState = this.portStates.get(elementId);
		
		if (!portState) return false;
		
		// Находим и удаляем порт из состояния
		let removedPort = null;
		let portSide = null;
		
		for (const [side, ports] of Object.entries(portState)) {
			const portIndex = ports.findIndex(p => p.id === portId);
			if (portIndex !== -1) {
				removedPort = ports[portIndex];
				portSide = side;
				
				// Если порт занят, отключаем линию
				if (removedPort.occupied && removedPort.linkId) {
					const link = this.graph.getCell(removedPort.linkId);
					if (link) {
						link.remove();
					}
				}
				
				// Удаляем порт из состояния
				ports.splice(portIndex, 1);
				break;
			}
		}
		
		if (!removedPort) return false;
		
		// Удаляем порт с элемента
		element.removePort(portId);
		
		// Перераспределяем оставшиеся порты на этой стороне
		this.redistributePortsOnSide(element, portSide);
		
		this.updatePortVisuals(element);
		return true;
	},
	
	// Удаляет все порты с элемента
	removeAllPorts(element) {
		const elementId = element.id;
		const portState = this.portStates.get(elementId);
		
		if (!portState) return false;
		
		// Отключаем все линии, связанные с портами
		Object.values(portState).flat().forEach(port => {
			if (port.occupied && port.linkId) {
				const link = this.graph.getCell(port.linkId);
				if (link) {
					link.remove();
				}
			}
		});
		
		// Удаляем все порты с элемента
		const existingPorts = element.getPorts();
		existingPorts.forEach(port => {
			element.removePort(port.id);
		});
		
		// Очищаем состояние
		this.portStates.set(elementId, {
			top: [],
			right: [],
			bottom: [],
			left: []
		});
		
		return true;
	},
	
	// Получает порты на определенной стороне элемента
	getPortsOnSide(element, side) {
		const elementId = element.id;
		const portState = this.portStates.get(elementId);
		
		if (!portState || !portState[side]) return [];
		
		return portState[side];
	},
	
	// Перераспределяет порты равномерно на стороне
	redistributePortsOnSide(element, side) {
		const elementId = element.id;
		const portState = this.portStates.get(elementId);
		
		if (!portState || !portState[side]) return;
		
		const totalPorts = portState[side].length;
		
		if (totalPorts === 0) return;
		
		const step = 100 / (totalPorts + 1);
		
		portState[side].forEach((port, index) => {
			const position = step * (index + 1);
			let newArgs;
			
			switch (side) {
				case 'top':
					newArgs = { x: `${position}%`, y: '0%' };
					break;
				case 'right':
					newArgs = { x: '100%', y: `${position}%` };
					break;
				case 'bottom':
					newArgs = { x: `${position}%`, y: '100%' };
					break;
				case 'left':
					newArgs = { x: '0%', y: `${position}%` };
					break;
			}
			
			element.portProp(port.id, 'args', newArgs);
		});
	},
	
	// Вычисляет позицию порта на стороне
	calculatePortPosition(side, index) {
		const totalPorts = index + 1;
		const step = 100 / (totalPorts + 1);
		const position = step * (index + 1);
		
		switch (side) {
			case 'top':
				return { x: `${position}%`, y: '0%' };
			case 'right':
				return { x: '100%', y: `${position}%` };
			case 'bottom':
				return { x: `${position}%`, y: '100%' };
			case 'left':
				return { x: '0%', y: `${position}%` };
		}
	},
	
	// Обновляет визуализацию портов
	updatePortVisuals(element) {
		const elementId = element.id;
		const portState = this.portStates.get(elementId);
		
		if (!portState) return;
		
		Object.values(portState).flat().forEach(port => {
			if (port.occupied) {
				// Занятый порт - красный с толстой обводкой
				element.portProp(port.id, 'attrs/circle/stroke', '#ff4444');
				element.portProp(port.id, 'attrs/circle/strokeWidth', 3);
				element.portProp(port.id, 'attrs/circle/fill', '#ffcccc');
			} else {
				// Свободный порт - стандартные цвета
				element.portProp(port.id, 'attrs/circle/stroke', '#31d0c6');
				element.portProp(port.id, 'attrs/circle/strokeWidth', 2);
				element.portProp(port.id, 'attrs/circle/fill', '#ffffff');
			}
			// НЕ трогаем pointer-events - оставляем как есть
		});
	},
	
	// Показывает порты элемента
	showElementPorts(element) {
		if (!element) return;
		
		const elementId = element.id;
		if (!this.portStates.has(elementId)) {
			this.initElementPorts(element);
		}
		
		const portState = this.portStates.get(elementId);
		Object.values(portState).flat().forEach(port => {
			element.portProp(port.id, 'attrs/circle/display', 'block');
		});
		
		this.updatePortVisuals(element);
	},
	
	// Скрывает порты элемента
	hideElementPorts(element) {
		if (!element) return;
		
		const elementId = element.id;
		const portState = this.portStates.get(elementId);
		
		if (!portState) return;
		
		Object.values(portState).flat().forEach(port => {
			element.portProp(port.id, 'attrs/circle/display', 'none');
		});
	},
	
	// Получает свободные порты элемента
	getFreePorts(element) {
		const elementId = element.id;
		const portState = this.portStates.get(elementId);
		
		if (!portState) return [];
		
		return Object.values(portState).flat().filter(port => !port.occupied);
	},
	
	// Получает свободные порты на определенной стороне
	getFreePortsOnSide(element, side) {
		const elementId = element.id;
		const portState = this.portStates.get(elementId);
		
		if (!portState || !portState[side]) return [];
		
		return portState[side].filter(port => !port.occupied);
	},
	
	// УПРОЩЕННАЯ проверка доступности порта
	isPortAvailable(element, portId) {
		const elementId = element.id;
		const portState = this.portStates.get(elementId);
		
		if (!portState) return false;
		
		const port = Object.values(portState).flat().find(p => p.id === portId);
		return port && !port.occupied;
	},
	
	// Занимает порт
	occupyPort(element, portId, linkId) {
		const elementId = element.id;
		const portState = this.portStates.get(elementId);
		
		if (!portState) return false;
		
		const port = Object.values(portState).flat().find(p => p.id === portId);
		if (!port) return false;
		
		port.occupied = true;
		port.linkId = linkId;
		
		this.updatePortVisuals(element);
		return true;
	},
	
	// Освобождает порт
	freePort(element, portId) {
		const elementId = element.id;
		const portState = this.portStates.get(elementId);
		
		if (!portState) return false;
		
		const port = Object.values(portState).flat().find(p => p.id === portId);
		if (!port) return false;
		
		port.occupied = false;
		port.linkId = null;
		
		this.updatePortVisuals(element);
		return true;
	},
	
	// Обработка подключения линии
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
	},
	
	// Обработка отключения линии
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
	},
	
	// УПРОЩЕННАЯ валидация: соединения ТОЛЬКО к свободным портам
	validateConnection(cellViewS, magnetS, cellViewT, magnetT, end, linkView) {
		// Запрещаем соединения к одному элементу
		if (cellViewS === cellViewT) return false;
		
		// Соединения ТОЛЬКО к портам
		if (!magnetS || !magnetT) return false;
		
		const sourcePortId = magnetS.getAttribute('port');
		const targetPortId = magnetT.getAttribute('port');
		
		if (!sourcePortId || !targetPortId) return false;
		
		// Простая проверка доступности портов
		const sourceAvailable = this.isPortAvailable(cellViewS.model, sourcePortId);
		const targetAvailable = this.isPortAvailable(cellViewT.model, targetPortId);
		
		return sourceAvailable && targetAvailable;
	},
	
	// Создает соединение между элементами
	createConnectionBetween(sourceElement, targetElement) {
		const sourceFreePorts = this.getFreePorts(sourceElement);
		const targetFreePorts = this.getFreePorts(targetElement);
		
		if (sourceFreePorts.length === 0 || targetFreePorts.length === 0) {
			return null;
		}
		
		const sourcePort = sourceFreePorts[0];
		const targetPort = targetFreePorts[0];
		
		const link = new joint.shapes.standard.Link({
			source: { id: sourceElement.id, port: sourcePort.id },
			target: { id: targetElement.id, port: targetPort.id },
			attrs: {
				line: {
					stroke: '#8a8a96',
					strokeWidth: 2,
					targetMarker: { type: 'none' }
				}
			},
			router: { name: 'manhattan' },
			connector: { name: 'rounded' }
		});
		
		link.addTo(this.graph);
		return link;
	},
	
	// Создает множественные соединения
	createMultipleConnections(sourceElement, targetElement, sourcePort, targetPort, lineCount) {
		const createdLinks = [];
		
		for (let i = 0; i < lineCount; i++) {
			const link = new joint.shapes.standard.Link({
				source: { id: sourceElement.id, port: sourcePort },
				target: { id: targetElement.id, port: targetPort },
				attrs: {
					line: {
						stroke: '#8a8a96',
						strokeWidth: 2,
						targetMarker: { type: 'none' }
					}
				},
				router: { name: 'manhattan' },
				connector: { name: 'rounded' },
				// Добавляем offset для параллельных линий
				vertices: i > 0 ? [{ x: 0, y: i * 5 }] : []
			});
			
			link.addTo(this.graph);
			createdLinks.push(link);
		}
		
		// Помечаем порты как занятые только первой линией
		if (createdLinks.length > 0) {
			this.onLinkConnect(createdLinks[0]);
		}
		
		return createdLinks;
	},
	
	// Очистка при удалении элемента
	onElementRemove(element) {
		this.portStates.delete(element.id);
	},
	
	// Синхронизация состояния портов
	syncPortStates() {
		this.portStates.clear();
		
		this.graph.getElements().forEach(element => {
			this.initElementPorts(element);
		});
		
		this.graph.getLinks().forEach(link => {
			this.onLinkConnect(link);
		});
	}
};