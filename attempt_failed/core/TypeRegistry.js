/**
 * TypeRegistry - Регистрация типов фигур, сносок и меню
 */
export class TypeRegistry {
	constructor() {
		this.shapes = new Map();
		this.callouts = new Map();
		this.menuItems = new Map();
	}

	/**
	 * Регистрирует тип фигуры
	 */
	registerShape(name, shapeClass, options = {}) {
		this.shapes.set(name, {
			shapeClass,
			options,
			category: options.category || 'basic'
		});
	}

	/**
	 * Регистрирует тип сноски
	 */
	registerCallout(name, calloutClass, options = {}) {
		this.callouts.set(name, {
			calloutClass,
			options,
			targetTypes: options.targetTypes || ['element', 'link']
		});
	}

	/**
	 * Регистрирует пункт контекстного меню
	 */
	registerMenuItem(name, menuItem, options = {}) {
		this.menuItems.set(name, {
			menuItem,
			options,
			targetTypes: options.targetTypes || ['element'],
			category: options.category || 'default'
		});
	}

	/**
	 * Получает зарегистрированную фигуру
	 */
	getShape(name) {
		return this.shapes.get(name);
	}

	/**
	 * Получает все фигуры по категории
	 */
	getShapesByCategory(category) {
		return Array.from(this.shapes.entries())
			.filter(([_, shape]) => shape.category === category)
			.map(([name, shape]) => ({ name, ...shape }));
	}

	/**
	 * Получает зарегистрированную сноску
	 */
	getCallout(name) {
		return this.callouts.get(name);
	}

	/**
	 * Получает доступные сноски для типа цели
	 */
	getCalloutsForTarget(targetType) {
		return Array.from(this.callouts.entries())
			.filter(([_, callout]) => callout.targetTypes.includes(targetType))
			.map(([name, callout]) => ({ name, ...callout }));
	}

	/**
	 * Получает пункты меню для типа цели
	 */
	getMenuItemsForTarget(targetType) {
		return Array.from(this.menuItems.entries())
			.filter(([_, item]) => item.targetTypes.includes(targetType))
			.map(([name, item]) => ({ name, ...item }));
	}

	/**
	 * Получает все пункты меню по категории
	 */
	getMenuItemsByCategory(category) {
		return Array.from(this.menuItems.entries())
			.filter(([_, item]) => item.category === category)
			.map(([name, item]) => ({ name, ...item }));
	}

	/**
	 * Создает экземпляр фигуры
	 */
	createShape(name, options = {}) {
		const shape = this.shapes.get(name);
		if (!shape) {
			throw new Error(`Shape ${name} not registered`);
		}

		return new shape.shapeClass({ ...shape.options, ...options });
	}

	/**
	 * Создает экземпляр сноски
	 */
	createCallout(name, target, options = {}) {
		const callout = this.callouts.get(name);
		if (!callout) {
			throw new Error(`Callout ${name} not registered`);
		}

		return new callout.calloutClass(target, { ...callout.options, ...options });
	}

	/**
	 * Очищает все регистрации
	 */
	clear() {
		this.shapes.clear();
		this.callouts.clear();
		this.menuItems.clear();
	}
}