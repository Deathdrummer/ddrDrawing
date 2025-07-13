/**
 * ServiceManager - Простое управление зависимостями менеджеров
 */
export class ServiceManager {
	constructor() {
		this.services = new Map();
		this.instances = new Map();
		this.initialized = false;
	}

	/**
	 * Регистрирует сервис
	 */
	register(name, serviceClass, dependencies = []) {
		this.services.set(name, {
			serviceClass,
			dependencies,
			instance: null
		});
	}

	/**
	 * Получает экземпляр сервиса
	 */
	get(name) {
		if (this.instances.has(name)) {
			return this.instances.get(name);
		}

		const service = this.services.get(name);
		if (!service) {
			throw new Error(`Service ${name} not found`);
		}

		// Создаем зависимости
		const deps = service.dependencies.map(dep => this.get(dep));
		
		// Создаем экземпляр
		const instance = new service.serviceClass(...deps);
		this.instances.set(name, instance);
		
		return instance;
	}

	/**
	 * Инициализирует все сервисы
	 */
	async initAll() {
		if (this.initialized) return;

		// Получаем все сервисы (это запустит их создание)
		for (const [name] of this.services) {
			this.get(name);
		}

		// Вызываем init() если есть
		for (const [name, instance] of this.instances) {
			if (typeof instance.init === 'function') {
				await instance.init();
			}
		}

		this.initialized = true;
	}

	/**
	 * Связывает зависимости между менеджерами
	 */
	linkDependencies() {
		const eventManager = this.get('eventManager');
		const portManager = this.get('portManager');
		const selectionManager = this.get('selectionManager');
		const contextMenuManager = this.get('contextMenuManager');
		const calloutManager = this.get('calloutManager');
		const editorCore = this.get('editorCore');

		// Связываем зависимости как в legacy
		selectionManager.setPaper(editorCore.paper);
		selectionManager.setPortManager(portManager);
		contextMenuManager.setGraph(editorCore.graph);
		contextMenuManager.setCalloutManager(calloutManager);
		contextMenuManager.setPortManager(portManager);
		calloutManager.setPaper(editorCore.paper);
		calloutManager.setGraph(editorCore.graph);
	}

	/**
	 * Уничтожает все сервисы
	 */
	destroy() {
		for (const [name, instance] of this.instances) {
			if (typeof instance.destroy === 'function') {
				instance.destroy();
			}
		}
		
		this.instances.clear();
		this.initialized = false;
	}
}