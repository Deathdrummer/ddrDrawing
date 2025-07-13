/**
 * PortValidator - Централизованная валидация портов и соединений
 */
export class PortValidator {
	constructor() {
		this.validationRules = new Map();
		this.setupDefaultRules();
	}

	/**
	 * Настройка стандартных правил валидации
	 */
	setupDefaultRules() {
		// Правило: нельзя соединять элемент с самим собой
		this.addRule('no-self-connection', (source, target) => {
			return source.element !== target.element;
		});

		// Правило: порт должен быть свободен
		this.addRule('port-available', (source, target, portManager) => {
			const sourceAvailable = portManager.isPortAvailable(source.element, source.port);
			const targetAvailable = portManager.isPortAvailable(target.element, target.port);
			return sourceAvailable && targetAvailable;
		});

		// Правило: нельзя создавать дублирующие соединения
		this.addRule('no-duplicate-connections', (source, target, portManager, graph) => {
			const existingLinks = graph.getLinks();
			
			return !existingLinks.some(link => {
				const linkSource = link.get('source');
				const linkTarget = link.get('target');
				
				return (linkSource.id === source.element.id && 
						linkSource.port === source.port &&
						linkTarget.id === target.element.id && 
						linkTarget.port === target.port) ||
					   (linkSource.id === target.element.id && 
						linkSource.port === target.port &&
						linkTarget.id === source.element.id && 
						linkTarget.port === source.port);
			});
		});
	}

	/**
	 * Добавляет правило валидации
	 */
	addRule(name, validator) {
		this.validationRules.set(name, validator);
	}

	/**
	 * Удаляет правило валидации
	 */
	removeRule(name) {
		this.validationRules.delete(name);
	}

	/**
	 * Валидирует соединение
	 */
	validateConnection(sourceView, sourceMagnet, targetView, targetMagnet, portManager, graph) {
		const sourcePortId = sourceMagnet?.getAttribute('port');
		const targetPortId = targetMagnet?.getAttribute('port');

		if (!sourcePortId || !targetPortId) {
			return { valid: false, reason: 'missing-ports' };
		}

		const connectionData = {
			source: {
				element: sourceView.model,
				port: sourcePortId,
				view: sourceView
			},
			target: {
				element: targetView.model,
				port: targetPortId,
				view: targetView
			}
		};

		// Проверяем все правила
		for (const [ruleName, validator] of this.validationRules) {
			try {
				const isValid = validator(
					connectionData.source, 
					connectionData.target, 
					portManager, 
					graph
				);
				
				if (!isValid) {
					return { 
						valid: false, 
						reason: ruleName,
						source: connectionData.source,
						target: connectionData.target
					};
				}
			} catch (error) {
				console.error(`PortValidator: Error in rule ${ruleName}:`, error);
				return { 
					valid: false, 
					reason: 'validation-error',
					error: error.message
				};
			}
		}

		return { 
			valid: true, 
			source: connectionData.source,
			target: connectionData.target
		};
	}

	/**
	 * Проверяет доступность порта
	 */
	isPortAvailable(element, portId, portManager) {
		return portManager.isPortAvailable(element, portId);
	}

	/**
	 * Получает свободные порты элемента
	 */
	getAvailablePorts(element, portManager) {
		return portManager.getFreePortsForElement(element);
	}

	/**
	 * Находит оптимальные порты для соединения
	 */
	findOptimalPorts(sourceElement, targetElement, portManager) {
		const sourceFree = this.getAvailablePorts(sourceElement, portManager);
		const targetFree = this.getAvailablePorts(targetElement, portManager);

		if (sourceFree.length === 0 || targetFree.length === 0) {
			return null;
		}

		// Простая логика: берем ближайшие порты
		const sourceBbox = sourceElement.getBBox();
		const targetBbox = targetElement.getBBox();

		let bestSourcePort = sourceFree[0];
		let bestTargetPort = targetFree[0];
		let minDistance = Infinity;

		sourceFree.forEach(sourcePort => {
			targetFree.forEach(targetPort => {
				const sourcePos = this.getPortPosition(sourceElement, sourcePort.id);
				const targetPos = this.getPortPosition(targetElement, targetPort.id);
				
				if (sourcePos && targetPos) {
					const distance = Math.sqrt(
						Math.pow(targetPos.x - sourcePos.x, 2) + 
						Math.pow(targetPos.y - sourcePos.y, 2)
					);
					
					if (distance < minDistance) {
						minDistance = distance;
						bestSourcePort = sourcePort;
						bestTargetPort = targetPort;
					}
				}
			});
		});

		return {
			source: bestSourcePort,
			target: bestTargetPort,
			distance: minDistance
		};
	}

	/**
	 * Получает позицию порта
	 */
	getPortPosition(element, portId) {
		const bbox = element.getBBox();
		
		if (portId.startsWith('top')) {
			return { x: bbox.x + bbox.width / 2, y: bbox.y };
		} else if (portId.startsWith('right')) {
			return { x: bbox.x + bbox.width, y: bbox.y + bbox.height / 2 };
		} else if (portId.startsWith('bottom')) {
			return { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height };
		} else if (portId.startsWith('left')) {
			return { x: bbox.x, y: bbox.y + bbox.height / 2 };
		}
		
		return null;
	}

	/**
	 * Получает статистику валидации
	 */
	getValidationStats() {
		return {
			totalRules: this.validationRules.size,
			activeRules: Array.from(this.validationRules.keys())
		};
	}
}  
