/**
 * ShapeManager - Управление типами фигур
 */
export class ShapeManager {
	constructor(eventBus, typeRegistry) {
		this.eventBus = eventBus;
		this.typeRegistry = typeRegistry;
		this.graph = null;
		this.shapeInstances = new Map();
		this.initialized = false;
	}

	/**
	 * Инициализация
	 */
	init() {
		if (this.initialized) return this;
		
		this.eventBus.on('core:initialized', ({ graph }) => {
			this.setGraph(graph);
		});

		this.registerDefaultShapes();
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
	 * Регистрирует стандартные фигуры
	 */
	registerDefaultShapes() {
		// Прямоугольник
		this.typeRegistry.registerShape('rectangle', joint.shapes.standard.Rectangle, {
			category: 'basic',
			defaultAttrs: {
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
			},
			defaultSize: { width: 80, height: 60 }
		});

		// Круг
		this.typeRegistry.registerShape('circle', joint.shapes.standard.Circle, {
			category: 'basic',
			defaultAttrs: {
				body: {
					fill: '#ffffff',
					stroke: '#333333',
					strokeWidth: 1
				},
				label: {
					text: 'Circle',
					fontSize: 12,
					fontFamily: 'Arial'
				}
			},
			defaultSize: { width: 60, height: 60 }
		});

		// Эллипс
		this.typeRegistry.registerShape('ellipse', joint.shapes.standard.Ellipse, {
			category: 'basic',
			defaultAttrs: {
				body: {
					fill: '#ffffff',
					stroke: '#333333',
					strokeWidth: 1
				},
				label: {
					text: 'Ellipse',
					fontSize: 12,
					fontFamily: 'Arial'
				}
			},
			defaultSize: { width: 100, height: 60 }
		});
	}

	/**
	 * Создает фигуру
	 */
	createShape(shapeType, position, options = {}) {
		const shapeConfig = this.typeRegistry.getShape(shapeType);
		if (!shapeConfig) {
			throw new Error(`Shape type ${shapeType} not registered`);
		}

		const { shapeClass, options: defaultOptions } = shapeConfig;
		const mergedOptions = {
			position,
			size: defaultOptions.defaultSize,
			attrs: defaultOptions.defaultAttrs,
			...options
		};

		const shape = new shapeClass(mergedOptions);
		const instanceId = this.generateInstanceId();
		
		this.shapeInstances.set(instanceId, {
			shape,
			type: shapeType,
			created: Date.now()
		});

		if (this.graph) {
			shape.addTo(this.graph);
		}

		this.eventBus.emit('shape:created', {
			instanceId,
			shapeType,
			shape,
			position
		});

		return { shape, instanceId };
	}

	/**
	 * Создает составную фигуру
	 */
	createCompoundShape(childShapes, options = {}) {
		const {
			padding = 10,
			label = 'Compound'
		} = options;

		// Вычисляем общий bbox всех дочерних фигур
		let minX = Infinity, minY = Infinity;
		let maxX = -Infinity, maxY = -Infinity;

		childShapes.forEach(shape => {
			const bbox = shape.getBBox();
			minX = Math.min(minX, bbox.x);
			minY = Math.min(minY, bbox.y);
			maxX = Math.max(maxX, bbox.x + bbox.width);
			maxY = Math.max(maxY, bbox.y + bbox.height);
		});

		// Создаем контейнер
		const container = new joint.shapes.standard.Rectangle({
			position: { 
				x: minX - padding, 
				y: minY - padding 
			},
			size: { 
				width: maxX - minX + padding * 2, 
				height: maxY - minY + padding * 2 
			},
			attrs: {
				body: {
					fill: 'transparent',
					stroke: '#666',
					strokeDasharray: '5,5'
				},
				label: {
					text: label,
					fontSize: 12
				}
			}
		});

		container.addTo(this.graph);

		// Встраиваем дочерние фигуры в контейнер
		childShapes.forEach(shape => {
			container.embed(shape);
		});

		const instanceId = this.generateInstanceId();
		this.shapeInstances.set(instanceId, {
			shape: container,
			type: 'compound',
			children: childShapes,
			created: Date.now()
		});

		return { shape: container, instanceId };
	}

	/**
	 * Получает доступные типы фигур
	 */
	getAvailableShapeTypes() {
		return this.typeRegistry.getShapesByCategory('basic')
			.map(shape => ({
				type: shape.name,
				category: shape.category,
				options: shape.options
			}));
	}

	/**
	 * Генерирует уникальный ID экземпляра
	 */
	generateInstanceId() {
		return 'shape_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
	}
}