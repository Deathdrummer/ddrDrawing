/**
 * HistoryManager - Управление историей операций (undo/redo)
 */
export class HistoryManager {
	constructor(eventBus) {
		this.eventBus = eventBus;
		this.graph = null;
		this.cellNamespace = null;
		this.history = [];
		this.currentIndex = -1;
		this.maxHistorySize = 50;
		this.isRestoring = false;
		this.initialized = false;
	}

	/**
	 * Инициализация
	 */
	init() {
		if (this.initialized) return this;
		
		this.eventBus.on('core:initialized', ({ graph, cellNamespace }) => {
			this.setGraph(graph);
			this.setCellNamespace(cellNamespace);
			this.saveState(); // Сохраняем начальное состояние
		});

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
	 * Устанавливает cellNamespace
	 */
	setCellNamespace(cellNamespace) {
		this.cellNamespace = cellNamespace;
	}

	/**
	 * Сохраняет текущее состояние
	 */
	saveState() {
		if (!this.graph || this.isRestoring) return;

		const state = this.graph.toJSON();
		
		// Удаляем состояния после текущего индекса
		this.history = this.history.slice(0, this.currentIndex + 1);
		
		// Добавляем новое состояние
		this.history.push({
			state: JSON.stringify(state),
			timestamp: Date.now()
		});
		
		this.currentIndex++;
		
		// Ограничиваем размер истории
		if (this.history.length > this.maxHistorySize) {
			this.history.shift();
			this.currentIndex--;
		}

		this.eventBus.emit('history:state-saved', {
			index: this.currentIndex,
			canUndo: this.canUndo(),
			canRedo: this.canRedo()
		});
	}

	/**
	 * Отменяет последнее действие
	 */
	undo() {
		if (!this.canUndo()) return false;

		this.currentIndex--;
		this.restoreState(this.currentIndex);
		
		this.eventBus.emit('history:undo', {
			index: this.currentIndex,
			canUndo: this.canUndo(),
			canRedo: this.canRedo()
		});

		return true;
	}

	/**
	 * Повторяет отмененное действие
	 */
	redo() {
		if (!this.canRedo()) return false;

		this.currentIndex++;
		this.restoreState(this.currentIndex);
		
		this.eventBus.emit('history:redo', {
			index: this.currentIndex,
			canUndo: this.canUndo(),
			canRedo: this.canRedo()
		});

		return true;
	}

	/**
	 * Восстанавливает состояние по индексу
	 */
	restoreState(index) {
		if (index < 0 || index >= this.history.length) return;

		this.isRestoring = true;
		
		try {
			const historyItem = this.history[index];
			const state = JSON.parse(historyItem.state);
			
			this.graph.fromJSON(state, { cellNamespace: this.cellNamespace });
			
			this.eventBus.emit('history:state-restored', {
				index,
				timestamp: historyItem.timestamp
			});
		} catch (error) {
			console.error('HistoryManager: Error restoring state:', error);
		} finally {
			this.isRestoring = false;
		}
	}

	/**
	 * Проверяет, можно ли отменить действие
	 */
	canUndo() {
		return this.currentIndex > 0;
	}

	/**
	 * Проверяет, можно ли повторить действие
	 */
	canRedo() {
		return this.currentIndex < this.history.length - 1;
	}

	/**
	 * Очищает историю
	 */
	clearHistory() {
		this.history = [];
		this.currentIndex = -1;
		
		this.eventBus.emit('history:cleared');
	}

	/**
	 * Получает информацию о текущем состоянии истории
	 */
	getHistoryInfo() {
		return {
			totalStates: this.history.length,
			currentIndex: this.currentIndex,
			canUndo: this.canUndo(),
			canRedo: this.canRedo(),
			maxSize: this.maxHistorySize
		};
	}

	/**
	 * Устанавливает максимальный размер истории
	 */
	setMaxHistorySize(size) {
		this.maxHistorySize = size;
		
		// Обрезаем историю если она превышает новый размер
		if (this.history.length > size) {
			const excess = this.history.length - size;
			this.history.splice(0, excess);
			this.currentIndex = Math.max(0, this.currentIndex - excess);
		}

		this.eventBus.emit('history:max-size-changed', { size });
	}

	/**
	 * Получает список последних операций
	 */
	getRecentOperations(count = 5) {
		const start = Math.max(0, this.currentIndex - count + 1);
		const end = this.currentIndex + 1;
		
		return this.history.slice(start, end).map((item, index) => ({
			index: start + index,
			timestamp: item.timestamp,
			isCurrent: start + index === this.currentIndex
		}));
	}

	/**
	 * Переходит к конкретному состоянию в истории
	 */
	goToState(index) {
		if (index < 0 || index >= this.history.length) return false;
		
		this.currentIndex = index;
		this.restoreState(index);
		
		this.eventBus.emit('history:jumped-to-state', {
			index,
			canUndo: this.canUndo(),
			canRedo: this.canRedo()
		});

		return true;
	}

	/**
	 * Создает контрольную точку (именованное состояние)
	 */
	createCheckpoint(name) {
		if (!this.graph) return null;

		const checkpointIndex = this.currentIndex;
		if (checkpointIndex >= 0 && checkpointIndex < this.history.length) {
			this.history[checkpointIndex].checkpoint = name;
			
			this.eventBus.emit('history:checkpoint-created', {
				name,
				index: checkpointIndex
			});

			return checkpointIndex;
		}
		
		return null;
	}

	/**
	 * Получает все контрольные точки
	 */
	getCheckpoints() {
		return this.history
			.map((item, index) => ({ ...item, index }))
			.filter(item => item.checkpoint)
			.map(item => ({
				index: item.index,
				name: item.checkpoint,
				timestamp: item.timestamp
			}));
	}

	/**
	 * Переходит к контрольной точке
	 */
	goToCheckpoint(name) {
		const checkpoint = this.history.find(item => item.checkpoint === name);
		if (!checkpoint) return false;

		const index = this.history.indexOf(checkpoint);
		return this.goToState(index);
	}
}