import { PLUGIN_EVENTS, LINK_EVENTS, PAPER_EVENTS, STATE_EVENTS } from '../Events/EventTypes.js';

/**
 * ConnectionPlugin - Manages multiple connection modes and advanced linking features
 */
export class ConnectionPlugin {
	constructor(eventBus, stateStore, portService) {
		this.eventBus = eventBus;
		this.stateStore = stateStore;
		this.portService = portService;
		this.initialized = false;
		this.enabled = true;
		this.connectionMode = 1;
		this.pendingConnections = new Map();
		this.connectionQueue = [];
		this.connectionTemplates = new Map();
		this.debugMode = false;
		
		this.bindEventHandlers();
	}

	/**
	 * Initializes the connection plugin
	 */
	init() {
		if (this.initialized) {
			console.warn('ConnectionPlugin: Already initialized');
			return;
		}

		this.setupConnectionModes();
		this.createConnectionTemplates();
		this.syncPluginState();
		this.initialized = true;

		this.eventBus.emit(PLUGIN_EVENTS.INITIALIZED, {
			plugin: 'connections',
			timestamp: Date.now()
		});
	}

	/**
	 * Sets up different connection modes and their configurations
	 */
	setupConnectionModes() {
		this.connectionModes = {
			1: {
				name: 'Single Connection',
				description: 'Creates one connection between elements',
				maxConnections: 1,
				spacing: 0,
				pattern: 'single'
			},
			2: {
				name: 'Double Connection', 
				description: 'Creates two parallel connections',
				maxConnections: 2,
				spacing: 15,
				pattern: 'parallel'
			},
			3: {
				name: 'Triple Connection',
				description: 'Creates three connections with specific routing',
				maxConnections: 3,
				spacing: 10,
				pattern: 'fan'
			},
			4: {
				name: 'Quad Connection',
				description: 'Creates four connections in optimized layout',
				maxConnections: 4,
				spacing: 8,
				pattern: 'grid'
			}
		};
	}

	/**
	 * Creates connection templates for different patterns
	 */
	createConnectionTemplates() {
		this.connectionTemplates.set('single', {
			generate: (source, target, options) => {
				return [{
					source: source,
					target: target,
					router: options.router || { name: 'manhattan' },
					connector: options.connector || { name: 'rounded' },
					attrs: options.attrs || {}
				}];
			}
		});

		this.connectionTemplates.set('parallel', {
			generate: (source, target, options) => {
				const spacing = options.spacing || 15;
				return [
					{
						source: source,
						target: target,
						router: { name: 'manhattan', args: { padding: spacing } },
						connector: { name: 'rounded' },
						attrs: { line: { strokeDasharray: '0', ...options.attrs } }
					},
					{
						source: source,
						target: target,
						router: { name: 'manhattan', args: { padding: -spacing } },
						connector: { name: 'rounded' },
						attrs: { line: { strokeDasharray: '5,5', ...options.attrs } }
					}
				];
			}
		});

		this.connectionTemplates.set('fan', {
			generate: (source, target, options) => {
				const spacing = options.spacing || 10;
				return [
					{
						source: source,
						target: target,
						router: { name: 'manhattan', args: { padding: 0 } },
						connector: { name: 'rounded' },
						attrs: { line: { strokeWidth: 2, ...options.attrs } }
					},
					{
						source: source,
						target: target,
						router: { name: 'manhattan', args: { padding: spacing } },
						connector: { name: 'rounded' },
						attrs: { line: { strokeWidth: 1.5, strokeDasharray: '3,3', ...options.attrs } }
					},
					{
						source: source,
						target: target,
						router: { name: 'manhattan', args: { padding: -spacing } },
						connector: { name: 'rounded' },
						attrs: { line: { strokeWidth: 1.5, strokeDasharray: '3,3', ...options.attrs } }
					}
				];
			}
		});

		this.connectionTemplates.set('grid', {
			generate: (source, target, options) => {
				const spacing = options.spacing || 8;
				return [
					{
						source: source,
						target: target,
						router: { name: 'manhattan', args: { padding: spacing } },
						connector: { name: 'rounded' },
						attrs: { line: { strokeWidth: 2, ...options.attrs } }
					},
					{
						source: source,
						target: target,
						router: { name: 'manhattan', args: { padding: -spacing } },
						connector: { name: 'rounded' },
						attrs: { line: { strokeWidth: 2, ...options.attrs } }
					},
					{
						source: source,
						target: target,
						router: { name: 'orthogonal', args: { padding: spacing * 1.5 } },
						connector: { name: 'rounded' },
						attrs: { line: { strokeWidth: 1, strokeDasharray: '2,2', ...options.attrs } }
					},
					{
						source: source,
						target: target,
						router: { name: 'orthogonal', args: { padding: -spacing * 1.5 } },
						connector: { name: 'rounded' },
						attrs: { line: { strokeWidth: 1, strokeDasharray: '2,2', ...options.attrs } }
					}
				];
			}
		});
	}

	/**
	 * Synchronizes plugin state with global state store
	 */
	syncPluginState() {
		const connectionsState = this.stateStore.get('connections');
		this.connectionMode = connectionsState.mode || 1;
		this.enabled = this.stateStore.get('plugins.connections.enabled') !== false;
	}

	/**
	 * Binds event handlers for connection operations
	 */
	bindEventHandlers() {
		this.eventBus.on(PAPER_EVENTS.LINK_CONNECT, (event) => {
			this.handleLinkConnection(event);
		});

		this.eventBus.on(LINK_EVENTS.ADDED, (event) => {
			this.processConnectionQueue(event.link);
		});

		this.eventBus.on('connection:mode-changed', (event) => {
			this.setConnectionMode(event.mode);
		});

		this.eventBus.on('connection:create-multiple', (event) => {
			this.createMultipleConnections(event.source, event.target, event.options);
		});

		this.eventBus.on('connection:replace-with-multiple', (event) => {
			this.replaceWithMultipleConnections(event.link, event.mode);
		});

		this.eventBus.on(STATE_EVENTS.CHANGED, (event) => {
			if (event.path === 'connections.mode') {
				this.handleConnectionModeChange(event.newValue);
			}
		});
	}

	/**
	 * Handles link connection events for multiple connection processing
	 */
	handleLinkConnection(event) {
		if (!this.enabled || this.connectionMode === 1) return;

		const link = event.link;
		const sourceElement = link.getSourceElement();
		const targetElement = link.getTargetElement();

		if (!sourceElement || !targetElement) return;

		this.queueConnectionReplacement(link, sourceElement, targetElement);
	}

	/**
	 * Queues a link for replacement with multiple connections
	 */
	queueConnectionReplacement(link, sourceElement, targetElement) {
		const connectionId = this.generateConnectionId();
		
		this.pendingConnections.set(connectionId, {
			originalLink: link,
			sourceElement: sourceElement,
			targetElement: targetElement,
			mode: this.connectionMode,
			timestamp: Date.now()
		});

		this.connectionQueue.push(connectionId);
		
		setTimeout(() => {
			this.processQueuedConnection(connectionId);
		}, 50);
	}

	/**
	 * Processes a queued connection replacement
	 */
	processQueuedConnection(connectionId) {
		const connectionData = this.pendingConnections.get(connectionId);
		if (!connectionData) return;

		const { originalLink, sourceElement, targetElement, mode } = connectionData;
		
		this.replaceWithMultipleLines(originalLink, sourceElement, targetElement, mode);
		this.pendingConnections.delete(connectionId);
		
		const queueIndex = this.connectionQueue.indexOf(connectionId);
		if (queueIndex > -1) {
			this.connectionQueue.splice(queueIndex, 1);
		}
	}

	/**
	 * Replaces a single link with multiple connections
	 */
	replaceWithMultipleLines(originalLink, sourceElement, targetElement, mode = null) {
		if (!originalLink || !sourceElement || !targetElement) return;

		const currentMode = mode || this.connectionMode;
		if (currentMode === 1) return;

		const modeConfig = this.connectionModes[currentMode];
		if (!modeConfig) return;

		const sourcePort = originalLink.get('source').port;
		const targetPort = originalLink.get('target').port;
		
		if (!sourcePort || !targetPort) return;

		const connectionOptions = {
			spacing: modeConfig.spacing,
			router: { name: this.stateStore.get('connections.router') || 'manhattan' },
			connector: { name: this.stateStore.get('connections.connector') || 'rounded' },
			attrs: originalLink.get('attrs') || {}
		};

		const template = this.connectionTemplates.get(modeConfig.pattern);
		if (!template) return;

		const sourceConfig = { id: sourceElement.id, port: sourcePort };
		const targetConfig = { id: targetElement.id, port: targetPort };
		
		const connections = template.generate(sourceConfig, targetConfig, connectionOptions);
		
		originalLink.remove();
		
		this.portService.freePort(sourceElement, sourcePort);
		this.portService.freePort(targetElement, targetPort);

		const createdLinks = this.createConnectionsFromTemplates(connections);
		
		this.eventBus.emit(PLUGIN_EVENTS.MULTIPLE_CONNECTIONS_CREATED, {
			sourceElement,
			targetElement,
			originalLink,
			createdLinks,
			mode: currentMode,
			pattern: modeConfig.pattern
		});

		return createdLinks;
	}

	/**
	 * Creates connections from generated templates
	 */
	createConnectionsFromTemplates(connections) {
		const createdLinks = [];
		const graphService = this.getGraphService();
		
		if (!graphService) return createdLinks;

		connections.forEach((connectionConfig, index) => {
			try {
				const link = graphService.createLink(connectionConfig);
				if (link) {
					createdLinks.push(link);
					
					const sourceElement = link.getSourceElement();
					const targetElement = link.getTargetElement();
					const sourcePort = link.get('source').port;
					const targetPort = link.get('target').port;

					if (sourceElement && sourcePort) {
						this.portService.occupyPort(sourceElement, sourcePort, link.id);
					}
					if (targetElement && targetPort) {
						this.portService.occupyPort(targetElement, targetPort, link.id);
					}
				}
			} catch (error) {
				console.error('ConnectionPlugin: Error creating connection:', error);
			}
		});

		return createdLinks;
	}

	/**
	 * Creates multiple connections between two elements
	 */
	createMultipleConnections(sourceElement, targetElement, options = {}) {
		const mode = options.mode || this.connectionMode;
		const modeConfig = this.connectionModes[mode];
		
		if (!modeConfig) return [];

		const sourceFreePorts = this.portService.getFreePorts(sourceElement);
		const targetFreePorts = this.portService.getFreePorts(targetElement);

		if (sourceFreePorts.length === 0 || targetFreePorts.length === 0) {
			console.warn('ConnectionPlugin: No free ports available for connection');
			return [];
		}

		const connectionsToCreate = Math.min(
			modeConfig.maxConnections,
			sourceFreePorts.length,
			targetFreePorts.length
		);

		const connectionOptions = {
			spacing: modeConfig.spacing,
			router: options.router || { name: 'manhattan' },
			connector: options.connector || { name: 'rounded' },
			attrs: options.attrs || {}
		};

		const template = this.connectionTemplates.get(modeConfig.pattern);
		if (!template) return [];

		const connections = [];
		for (let i = 0; i < connectionsToCreate; i++) {
			const sourcePort = sourceFreePorts[i % sourceFreePorts.length];
			const targetPort = targetFreePorts[i % targetFreePorts.length];

			connections.push({
				source: { id: sourceElement.id, port: sourcePort.id },
				target: { id: targetElement.id, port: targetPort.id },
				...connectionOptions
			});
		}

		return this.createConnectionsFromTemplates(connections);
	}

	/**
	 * Sets the connection mode
	 */
	setConnectionMode(mode) {
		if (!this.connectionModes[mode]) {
			console.warn(`ConnectionPlugin: Invalid connection mode: ${mode}`);
			return;
		}

		this.connectionMode = mode;
		this.stateStore.set('connections.mode', mode);

		this.eventBus.emit(PLUGIN_EVENTS.CONNECTION_MODE_CHANGED, {
			mode,
			config: this.connectionModes[mode]
		});
	}

	/**
	 * Handles connection mode changes from state
	 */
	handleConnectionModeChange(newMode) {
		if (newMode !== this.connectionMode) {
			this.connectionMode = newMode;
		}
	}

	/**
	 * Gets available connection modes
	 */
	getConnectionModes() {
		return { ...this.connectionModes };
	}

	/**
	 * Gets current connection mode configuration
	 */
	getCurrentModeConfig() {
		return this.connectionModes[this.connectionMode];
	}

	/**
	 * Adds a custom connection template
	 */
	addConnectionTemplate(name, template) {
		if (typeof template.generate !== 'function') {
			console.error('ConnectionPlugin: Template must have a generate function');
			return false;
		}

		this.connectionTemplates.set(name, template);
		return true;
	}

	/**
	 * Removes a connection template
	 */
	removeConnectionTemplate(name) {
		return this.connectionTemplates.delete(name);
	}

	/**
	 * Gets all available connection templates
	 */
	getConnectionTemplates() {
		return Array.from(this.connectionTemplates.keys());
	}

	/**
	 * Validates connection capabilities between elements
	 */
	validateConnectionCapabilities(sourceElement, targetElement, mode = null) {
		const currentMode = mode || this.connectionMode;
		const modeConfig = this.connectionModes[currentMode];
		
		if (!modeConfig) return { valid: false, reason: 'Invalid connection mode' };

		const sourceFreePorts = this.portService.getFreePorts(sourceElement);
		const targetFreePorts = this.portService.getFreePorts(targetElement);

		if (sourceFreePorts.length === 0) {
			return { valid: false, reason: 'Source element has no free ports' };
		}

		if (targetFreePorts.length === 0) {
			return { valid: false, reason: 'Target element has no free ports' };
		}

		const maxPossibleConnections = Math.min(sourceFreePorts.length, targetFreePorts.length);
		if (maxPossibleConnections < modeConfig.maxConnections) {
			return { 
				valid: true, 
				reason: `Can create ${maxPossibleConnections} connections instead of ${modeConfig.maxConnections}`,
				maxConnections: maxPossibleConnections
			};
		}

		return { valid: true, maxConnections: modeConfig.maxConnections };
	}

	/**
	 * Gets connection statistics
	 */
	getConnectionStats() {
		const graphService = this.getGraphService();
		if (!graphService) return null;

		const allLinks = graphService.graph.getLinks();
		const connectionsByMode = {};

		Object.keys(this.connectionModes).forEach(mode => {
			connectionsByMode[mode] = 0;
		});

		allLinks.forEach(link => {
			const pattern = link.get('connectionPattern');
			if (pattern && connectionsByMode[pattern] !== undefined) {
				connectionsByMode[pattern]++;
			}
		});

		return {
			totalConnections: allLinks.length,
			connectionsByMode,
			currentMode: this.connectionMode,
			pendingConnections: this.pendingConnections.size,
			queueLength: this.connectionQueue.length
		};
	}

	/**
	 * Gets the graph service instance
	 */
	getGraphService() {
		try {
			return this.stateStore.get('services.graphService');
		} catch {
			return null;
		}
	}

	/**
	 * Generates a unique connection identifier
	 */
	generateConnectionId() {
		return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Processes connection queue when new links are added
	 */
	processConnectionQueue(link) {
		// Process any pending queue items that might relate to this link
		if (this.connectionQueue.length > 0) {
			const nextConnectionId = this.connectionQueue[0];
			const connectionData = this.pendingConnections.get(nextConnectionId);
			
			if (connectionData && connectionData.originalLink === link) {
				this.processQueuedConnection(nextConnectionId);
			}
		}
	}

	/**
	 * Clears all pending connections
	 */
	clearPendingConnections() {
		this.pendingConnections.clear();
		this.connectionQueue.length = 0;
	}

	/**
	 * Gets plugin statistics
	 */
	getStats() {
		return {
			enabled: this.enabled,
			connectionMode: this.connectionMode,
			availableModes: Object.keys(this.connectionModes).length,
			templates: this.connectionTemplates.size,
			pendingConnections: this.pendingConnections.size,
			queueLength: this.connectionQueue.length
		};
	}

	/**
	 * Enables or disables the plugin
	 */
	setEnabled(enabled) {
		this.enabled = enabled;
		this.stateStore.set('plugins.connections.enabled', enabled);

		if (!enabled) {
			this.clearPendingConnections();
		}
	}

	/**
	 * Enables debug mode
	 */
	setDebugMode(enabled) {
		this.debugMode = enabled;
	}

	/**
	 * Destroys the plugin
	 */
	destroy() {
		this.clearPendingConnections();
		this.connectionTemplates.clear();
		this.initialized = false;

		this.eventBus.emit(PLUGIN_EVENTS.DESTROYED, {
			plugin: 'connections',
			timestamp: Date.now()
		});
	}
}