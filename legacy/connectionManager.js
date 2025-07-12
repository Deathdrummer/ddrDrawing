export const ConnectionManager = {
	init() {
		this.connectionMode = 1; // По умолчанию 1 линия
		return this;
	},
	
	// Активирует режим создания соединений
	activateConnectionMode(lineCount) {
		this.connectionMode = lineCount;
		this.updateConnectionButtons();
	},
	
	// Обновляет состояние кнопок
	updateConnectionButtons() {
		const buttons = ['1-line-btn', '2-line-btn', '3-line-btn', '4-line-btn'];
		
		buttons.forEach((btnId, index) => {
			const btn = document.getElementById(btnId);
			if (btn) {
				btn.classList.toggle('active', this.connectionMode === (index + 1));
			}
		});
	},
	
	// Привязывает события к кнопкам
	bindConnectionButtons() {
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
					this.activateConnectionMode(count);
				});
			}
		});
	},
	
	// Получает текущий режим соединений
	getCurrentConnectionMode() {
		return this.connectionMode;
	},
	
	// Заменяет одиночную линию на группу линий с offset'ом
	replaceWithMultipleLines(originalLink, portManager, graph) {
		if (this.connectionMode === 1) return [];
		
		const sourceElement = originalLink.getSourceElement();
		const targetElement = originalLink.getTargetElement();
		const sourcePort = originalLink.get('source').port;
		const targetPort = originalLink.get('target').port;
		
		if (!sourceElement || !targetElement || !sourcePort || !targetPort) {
			return [];
		}
		
		// Освобождаем порты от оригинальной линии
		portManager.onLinkDisconnect(originalLink);
		
		// Удаляем оригинальную линию
		originalLink.remove();
		
		// Создаем группу линий с offset'ом
		const createdLinks = portManager.createMultipleConnections(
			sourceElement, 
			targetElement, 
			sourcePort, 
			targetPort, 
			this.connectionMode
		);
		
		return createdLinks;
	}
};