/**
 * EventBus - Простая шина событий для развязки менеджеров
 */
export class EventBus {
	constructor() {
		this.listeners = new Map();
		this.debugMode = false;
	}

	/**
	 * Подписка на событие
	 */
	on(event, callback, context = null) {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, []);
		}

		this.listeners.get(event).push({
			callback,
			context
		});

		if (this.debugMode) {
			console.log(`EventBus: Subscribed to ${event}`);
		}
	}

	/**
	 * Одноразовая подписка
	 */
	once(event, callback, context = null) {
		const wrapper = (...args) => {
			callback.apply(context, args);
			this.off(event, wrapper);
		};
		
		this.on(event, wrapper, context);
	}

	/**
	 * Отписка от события
	 */
	off(event, callback) {
		const listeners = this.listeners.get(event);
		if (!listeners) return;

		const index = listeners.findIndex(l => l.callback === callback);
		if (index !== -1) {
			listeners.splice(index, 1);
		}

		if (listeners.length === 0) {
			this.listeners.delete(event);
		}
	}

	/**
	 * Отправка события
	 */
	emit(event, data = {}) {
		const listeners = this.listeners.get(event);
		if (!listeners) {
			if (this.debugMode) {
				console.log(`EventBus: No listeners for ${event}`);
			}
			return;
		}

		if (this.debugMode) {
			console.log(`EventBus: Emitting ${event}`, data);
		}

		listeners.forEach(({ callback, context }) => {
			try {
				callback.call(context, data);
			} catch (error) {
				console.error(`EventBus: Error in ${event} listener:`, error);
			}
		});
	}

	/**
	 * Включает отладочный режим
	 */
	setDebugMode(enabled) {
		this.debugMode = enabled;
	}

	/**
	 * Получает список всех событий
	 */
	getEvents() {
		return Array.from(this.listeners.keys());
	}

	/**
	 * Очищает все подписки
	 */
	clear() {
		this.listeners.clear();
	}

	/**
	 * Уничтожает шину событий
	 */
	destroy() {
		this.clear();
	}
}