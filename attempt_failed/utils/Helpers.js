/**
 * Helpers - Общие утилиты
 */
export class Helpers {
	/**
	 * Генерирует уникальный ID
	 */
	static generateId(prefix = 'id') {
		return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Вычисляет расстояние между точками
	 */
	static distance(point1, point2) {
		return Math.sqrt(
			Math.pow(point2.x - point1.x, 2) + 
			Math.pow(point2.y - point1.y, 2)
		);
	}

	/**
	 * Проверяет пересечение прямоугольников
	 */
	static intersects(rect1, rect2) {
		return !(rect1.x + rect1.width < rect2.x || 
				rect2.x + rect2.width < rect1.x || 
				rect1.y + rect1.height < rect2.y || 
				rect2.y + rect2.height < rect1.y);
	}

	/**
	 * Ограничивает значение диапазоном
	 */
	static clamp(value, min, max) {
		return Math.min(Math.max(value, min), max);
	}

	/**
	 * Форматирует позицию для отображения
	 */
	static formatPosition(x, y) {
		return `(${Math.round(x)}, ${Math.round(y)})`;
	}

	/**
	 * Создает debounced функцию
	 */
	static debounce(func, wait) {
		let timeout;
		return function executedFunction(...args) {
			const later = () => {
				clearTimeout(timeout);
				func(...args);
			};
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
		};
	}

	/**
	 * Проверяет, является ли объект пустым
	 */
	static isEmpty(obj) {
		return Object.keys(obj).length === 0;
	}
}