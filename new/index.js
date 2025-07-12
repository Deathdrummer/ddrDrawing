import { DDREditor } from './Core/DDREditor.js';
import { GraphService } from './Services/GraphService.js';
import { PaperService } from './Services/PaperService.js';
import { PortService } from './Services/PortService.js';
import { SelectionService } from './Services/SelectionService.js';
import { ValidationService } from './Services/ValidationService.js';
import { AddElementCommand } from './Commands/AddElementCommand.js';
import { DeleteElementCommand } from './Commands/DeleteElementCommand.js';
import { ConnectCommand } from './Commands/ConnectCommand.js';
import { MoveCommand } from './Commands/MoveCommand.js';
import { EventHandlers } from './Events/EventHandlers.js';
import { ContextMenu } from './UI/ContextMenu.js';
import { Toolbar } from './UI/Toolbar.js';
import { Guidelines } from './UI/Guidelines.js';
import { CalloutsPlugin } from './Plugins/CalloutsPlugin.js';
import { GuidelinesPlugin } from './Plugins/GuidelinesPlugin.js';
import { ConnectionPlugin } from './Plugins/ConnectionPlugin.js';

/**
 * Main entry point for DDR Drawing Plugin
 * Maintains backward compatibility with existing integration
 */
window.ddrDrawing = function() {
	let editorInstance = null;
	let initialized = false;

	return {
		/**
		 * Initializes the DDR Drawing editor
		 * Maintains compatibility with existing integration pattern
		 */
		init: async () => {
			if (initialized) {
				console.warn('DDRDrawing: Already initialized');
				return editorInstance;
			}

			try {
				// Create and configure the main editor instance
				editorInstance = new DDREditor({
					debugMode: false,
					autoInit: false,
					canvasSelector: '#ddrCanvas',
					containerSelector: '#paper-container'
				});

				// Register all services with dependency injection
				registerServices(editorInstance.container);
				
				// Initialize the editor
				await editorInstance.init();
				
				// Set up the complete system
				await initializeCompleteSystem(editorInstance);
				
				initialized = true;
				console.log('DDRDrawing: Successfully initialized with new architecture');
				
				return editorInstance;

			} catch (error) {
				console.error('DDRDrawing: Initialization failed', error);
				throw error;
			}
		},

		/**
		 * Gets the current editor instance
		 */
		getEditor: () => {
			return editorInstance;
		},

		/**
		 * Destroys the editor instance
		 */
		destroy: () => {
			if (editorInstance) {
				editorInstance.destroy();
				editorInstance = null;
				initialized = false;
			}
		},

		/**
		 * Checks if editor is initialized
		 */
		isInitialized: () => {
			return initialized;
		}
	};
};

/**
 * Registers all services with the dependency injection container
 */
function registerServices(container) {
	// Register the container itself first
	container.registerInstance('container', container);
	
	// Register services as singletons
	container.registerSingleton('graphService', GraphService, ['eventBus', 'stateStore']);
	container.registerSingleton('paperService', PaperService, ['eventBus', 'stateStore', 'graphService']);
	container.registerSingleton('portService', PortService, ['eventBus', 'stateStore', 'graphService']);
	container.registerSingleton('selectionService', SelectionService, ['eventBus', 'stateStore', 'graphService', 'portService']);
	container.registerSingleton('validationService', ValidationService, ['eventBus', 'stateStore', 'graphService', 'portService']);

	// Register UI components
	container.registerSingleton('contextMenu', ContextMenu, ['eventBus', 'stateStore']);
	container.registerSingleton('toolbar', Toolbar, ['eventBus', 'stateStore']);
	container.registerSingleton('guidelines', Guidelines, ['eventBus', 'stateStore']);

	// Register plugins
	container.registerSingleton('calloutsPlugin', CalloutsPlugin, ['eventBus', 'stateStore', 'graphService']);
	container.registerSingleton('guidelinesPlugin', GuidelinesPlugin, ['eventBus', 'stateStore', 'paperService']);
	container.registerSingleton('connectionPlugin', ConnectionPlugin, ['eventBus', 'stateStore', 'portService']);

	// Register event handlers (requires container to be registered first)
	container.registerSingleton('eventHandlers', EventHandlers, ['container']);

	// Register command classes as factories
	container.registerFactory('AddElementCommand', () => AddElementCommand);
	container.registerFactory('DeleteElementCommand', () => DeleteElementCommand);
	container.registerFactory('ConnectCommand', () => ConnectCommand);
	container.registerFactory('MoveCommand', () => MoveCommand);
}

/**
 * Initializes the complete system with all components
 */
async function initializeCompleteSystem(editor) {
	// Get services from container
	const graphService = editor.getService('graphService');
	const paperService = editor.getService('paperService');
	const portService = editor.getService('portService');
	const selectionService = editor.getService('selectionService');
	const validationService = editor.getService('validationService');

	// Initialize core services
	const graph = graphService.init();
	const paper = paperService.init();
	
	await portService.init();
	await selectionService.init();
	await validationService.init();

	// Get UI components
	const contextMenu = editor.getService('contextMenu');
	const toolbar = editor.getService('toolbar');
	const guidelines = editor.getService('guidelines');

	// Initialize UI components
	await contextMenu.init();
	await toolbar.init();
	await guidelines.init();

	// Get and initialize plugins
	const calloutsPlugin = editor.getService('calloutsPlugin');
	const guidelinesPlugin = editor.getService('guidelinesPlugin');
	const connectionPlugin = editor.getService('connectionPlugin');

	// Register plugins with editor
	editor.registerPlugin('callouts', calloutsPlugin);
	editor.registerPlugin('guidelines', guidelinesPlugin);
	editor.registerPlugin('connections', connectionPlugin);

	// Initialize event handlers (must be last)
	const eventHandlers = editor.getService('eventHandlers');
	eventHandlers.init();

	// Set up backward compatibility features
	setupBackwardCompatibility(editor);

	return editor;
}

/**
 * Sets up features for backward compatibility with existing code
 */
function setupBackwardCompatibility(editor) {
	const eventBus = editor.getService('eventBus');
	const stateStore = editor.getService('stateStore');

	// Support for legacy toolbar button handling
	const addSquareBtn = document.getElementById('add-square-btn');
	if (addSquareBtn) {
		addSquareBtn.addEventListener('click', () => {
			const isActive = stateStore.get('app.mode') === 'add';
			stateStore.set('app.mode', isActive ? 'select' : 'add');
			addSquareBtn.classList.toggle('active', !isActive);
		});
	}

	// Support for legacy save functionality
	const saveBtn = document.getElementById('save-btn');
	if (saveBtn) {
		saveBtn.addEventListener('click', () => {
			const graphService = editor.getService('graphService');
			const canvasData = graphService.exportToJSON();
			console.log(JSON.stringify(canvasData, null, 2));
		});
	}

	// Support for legacy router and connector selectors
	const routerSelector = document.getElementById('router-selector');
	const connectorSelector = document.getElementById('connector-selector');
	
	if (routerSelector) {
		routerSelector.addEventListener('change', () => {
			stateStore.set('connections.router', routerSelector.value);
			updateAllLinkStyles(editor);
		});
	}

	if (connectorSelector) {
		connectorSelector.addEventListener('change', () => {
			stateStore.set('connections.connector', connectorSelector.value);
			updateAllLinkStyles(editor);
		});
	}

	// Support for legacy connection mode buttons
	setupConnectionModeButtons(editor);
}

/**
 * Updates styles for all existing links
 */
function updateAllLinkStyles(editor) {
	const graphService = editor.getService('graphService');
	const stateStore = editor.getService('stateStore');
	
	const routerName = stateStore.get('connections.router');
	const connectorName = stateStore.get('connections.connector');

	graphService.graph.getLinks().forEach(link => {
		link.set({
			router: { name: routerName },
			connector: { name: connectorName }
		});
	});
}

/**
 * Sets up connection mode buttons for backward compatibility
 */
function setupConnectionModeButtons(editor) {
	const connectionPlugin = editor.getService('connectionPlugin');
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
				connectionPlugin.setConnectionMode(count);
				
				// Update button states
				buttons.forEach(({ id: buttonId, count: buttonCount }) => {
					const button = document.getElementById(buttonId);
					if (button) {
						button.classList.toggle('active', buttonCount === count);
					}
				});
			});
		}
	});
}

/**
 * Global error handler for the plugin
 */
window.addEventListener('error', (event) => {
	if (event.filename && event.filename.includes('ddrDrawing')) {
		console.error('DDRDrawing: Global error caught', {
			message: event.message,
			filename: event.filename,
			lineno: event.lineno,
			colno: event.colno,
			error: event.error
		});
	}
});

/**
 * Export for module systems
 */
if (typeof module !== 'undefined' && module.exports) {
	module.exports = window.ddrDrawing;
}

if (typeof define === 'function' && define.amd) {
	define([], () => window.ddrDrawing);
}