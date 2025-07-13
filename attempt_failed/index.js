import { ServiceManager } from './core/ServiceManager.js';
import { TypeRegistry } from './core/TypeRegistry.js';
import { EventBus } from './events/EventBus.js';

import { EditorCore } from './managers/EditorCore.js';
import { EventManager } from './managers/EventManager.js';
import { PortManager } from './managers/PortManager.js';
import { SelectionManager } from './managers/SelectionManager.js';
import { ContextMenuManager } from './managers/ContextMenuManager.js';
import { CalloutManager } from './managers/CalloutManager.js';
import { ConnectionManager } from './managers/ConnectionManager.js';
import { GuidelineManager } from './managers/GuidelineManager.js';
import { HistoryManager } from './managers/HistoryManager.js';
import { ShapeManager } from './managers/ShapeManager.js';

/**
 * Главная точка входа - сохраняет совместимость с legacy
 */
window.ddrDrawing = function() {
	let serviceManager = null;
	let initialized = false;

	return {
		init: async () => {
			if (initialized) {
				console.warn('DDR Drawing already initialized');
				return;
			}

			try {
				// Создаем сервис-менеджер
				serviceManager = new ServiceManager();
				
				// Создаем глобальные сервисы
				const eventBus = new EventBus();
				const typeRegistry = new TypeRegistry();

				// Регистрируем основные сервисы
				serviceManager.register('eventBus', () => eventBus);
				serviceManager.register('typeRegistry', () => typeRegistry);
				
				// Регистрируем менеджеры с зависимостями
				serviceManager.register('serviceManager', () => serviceManager);
				serviceManager.register('editorCore', EditorCore, ['eventBus']);
				serviceManager.register('portManager', PortManager, ['eventBus']);
				serviceManager.register('selectionManager', SelectionManager, ['eventBus']);
				serviceManager.register('contextMenuManager', ContextMenuManager, ['eventBus']);
				serviceManager.register('calloutManager', CalloutManager, ['eventBus']);
				serviceManager.register('connectionManager', ConnectionManager, ['eventBus']);
				serviceManager.register('guidelineManager', GuidelineManager, ['eventBus']);
				serviceManager.register('historyManager', HistoryManager, ['eventBus']);
				serviceManager.register('shapeManager', ShapeManager, ['eventBus', 'typeRegistry']);
				serviceManager.register('eventManager', EventManager, ['eventBus', 'serviceManager']);

				// Инициализируем все сервисы
				await serviceManager.initAll();
				
				// Связываем зависимости (legacy совместимость)
				serviceManager.linkDependencies();
				
				// Привязываем события
				const eventManager = serviceManager.get('eventManager');
				eventManager.bindAllEvents();
				
				// Сохраняем начальное состояние
				const historyManager = serviceManager.get('historyManager');
				historyManager.saveState();

				initialized = true;
				console.log('DDR Drawing: Initialized successfully');

			} catch (error) {
				console.error('DDR Drawing: Initialization failed:', error);
				throw error;
			}
		},

		/**
		 * Получает сервис-менеджер для расширенного API
		 */
		getServiceManager: () => {
			return serviceManager;
		},

		/**
		 * Получает конкретный сервис
		 */
		getService: (serviceName) => {
			return serviceManager?.get(serviceName);
		},

		/**
		 * Уничтожает редактор
		 */
		destroy: () => {
			if (serviceManager) {
				serviceManager.destroy();
				serviceManager = null;
			}
			initialized = false;
		},

		/**
		 * Проверяет статус инициализации
		 */
		isInitialized: () => {
			return initialized;
		}
	};
};