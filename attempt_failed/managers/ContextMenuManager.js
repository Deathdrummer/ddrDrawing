/**
 * ContextMenuManager - Управление контекстным меню
 */
export class ContextMenuManager {
	constructor(eventBus) {
		this.eventBus = eventBus;
		this.contextMenuElement = null;
		this.graph = null;
		this.calloutManager = null;
		this.portManager = null;
		this.initialized = false;
	}

	/**
	 * Инициализация
	 */
	init() {
		if (this.initialized) return this;
		
		this.createMenu();
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
	 * Устанавливает calloutManager
	 */
	setCalloutManager(calloutManager) {
		this.calloutManager = calloutManager;
	}

	/**
	 * Устанавливает portManager
	 */
	setPortManager(portManager) {
		this.portManager = portManager;
	}

	/**
	 * Создает DOM элемент меню
	 */
	createMenu() {
		const menu = document.createElement('div');
		menu.id = 'context-menu';
		menu.style.cssText = `
			position: absolute;
			background: white;
			border: 1px solid #ccc;
			border-radius: 4px;
			box-shadow: 0 2px 8px rgba(0,0,0,0.15);
			padding: 4px 0;
			min-width: 150px;
			z-index: 1000;
			display: none;
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
			font-size: 14px;
		`;
		
		menu.innerHTML = `
			<div class="menu-item" data-action="add-label" style="
				padding: 8px 16px;
				cursor: pointer;
				color: #333;
				border: none;
				background: none;
				width: 100%;
				text-align: left;
			">Добавить сноску</div>
			<div class="menu-item submenu-parent" style="
				padding: 8px 16px;
				cursor: pointer;
				color: #333;
				border: none;
				background: none;
				width: 100%;
				text-align: left;
				position: relative;
			">Добавить порт ▶
				<div class="submenu" style="
					position: absolute;
					left: 100%;
					top: 0;
					background: white;
					border: 1px solid #ccc;
					border-radius: 4px;
					box-shadow: 0 2px 8px rgba(0,0,0,0.15);
					min-width: 120px;
					display: none;
				">
					<div class="menu-item" data-action="add-port-top" style="
						padding: 8px 16px;
						cursor: pointer;
						color: #333;
						border: none;
						background: none;
						width: 100%;
						text-align: left;
					">Сверху</div>
					<div class="menu-item" data-action="add-port-right" style="
						padding: 8px 16px;
						cursor: pointer;
						color: #333;
						border: none;
						background: none;
						width: 100%;
						text-align: left;
					">Справа</div>
					<div class="menu-item" data-action="add-port-bottom" style="
						padding: 8px 16px;
						cursor: pointer;
						color: #333;
						border: none;
						background: none;
						width: 100%;
						text-align: left;
					">Снизу</div>
					<div class="menu-item" data-action="add-port-left" style="
						padding: 8px 16px;
						cursor: pointer;
						color: #333;
						border: none;
						background: none;
						width: 100%;
						text-align: left;
					">Слева</div>
				</div>
			</div>
			<div class="menu-separator" style="
				height: 1px;
				background: #eee;
				margin: 4px 0;
			"></div>
			<div class="menu-item" data-action="delete" style="
				padding: 8px 16px;
				cursor: pointer;
				color: #d73a49;
				border: none;
				background: none;
				width: 100%;
				text-align: left;
			">Удалить</div>
		`;
		
		// Добавляем hover эффекты
		const style = document.createElement('style');
		style.textContent = `
			.menu-item:hover {
				background-color: #f5f5f5;
			}
			.submenu-parent:hover .submenu {
				display: block !important;
			}
		`;
		document.head.appendChild(style);
		
		this.contextMenuElement = menu;
		document.body.appendChild(this.contextMenuElement);
	}

	/**
	 * Показывает контекстное меню
	 */
	show(targetElement, x, y) {
		if (!this.contextMenuElement) return;
		
		// Сохраняем информацию о цели
		this.contextMenuElement.setAttribute('data-target', targetElement.id);
		this.contextMenuElement.setAttribute('data-target-type', 
			targetElement.isElement() ? 'element' : 'link');
		
		// Настраиваем видимость пунктов меню в зависимости от типа элемента
		this.configureMenuForTarget(targetElement);
		
		// Позиционируем и показываем меню
		this.contextMenuElement.style.left = x + 'px';
		this.contextMenuElement.style.top = y + 'px';
		this.contextMenuElement.style.display = 'block';
		
		// Проверяем, не выходит ли меню за границы экрана
		const rect = this.contextMenuElement.getBoundingClientRect();
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;
		
		if (rect.right > viewportWidth) {
			this.contextMenuElement.style.left = (x - rect.width) + 'px';
		}
		
		if (rect.bottom > viewportHeight) {
			this.contextMenuElement.style.top = (y - rect.height) + 'px';
		}

		this.eventBus.emit('contextmenu:shown', { target: targetElement, x, y });
	}

	/**
	 * Настраивает меню для типа элемента
	 */
	configureMenuForTarget(targetElement) {
		const menuItems = this.contextMenuElement.querySelectorAll('.menu-item');
		const submenuParent = this.contextMenuElement.querySelector('.submenu-parent');
		
		if (targetElement.isLink()) {
			// Для линий скрываем пункт добавления портов
			if (submenuParent) {
				submenuParent.style.display = 'none';
			}
		} else {
			// Для элементов показываем все пункты
			if (submenuParent) {
				submenuParent.style.display = 'block';
			}
		}
	}

	/**
	 * Скрывает контекстное меню
	 */
	hide() {
		if (this.contextMenuElement) {
			this.contextMenuElement.style.display = 'none';
			this.eventBus.emit('contextmenu:hidden');
		}
	}

	/**
	 * Обработка кликов по меню
	 */
	handleMenuClick(evt) {
		if (!evt.target.classList.contains('menu-item')) {
			this.hide();
			return;
		}

		const action = evt.target.getAttribute('data-action');
		if (!action) return;

		const targetId = this.contextMenuElement.getAttribute('data-target');
		const targetElement = this.graph?.getCell(targetId);
		
		if (!targetElement) {
			this.hide();
			return;
		}

		this.executeAction(action, targetElement);
		this.hide();
	}

	/**
	 * Выполняет действие меню
	 */
	executeAction(action, targetElement) {
		switch (action) {
			case 'add-label':
				if (this.calloutManager) {
					this.calloutManager.addLabel(targetElement);
				}
				break;
				
			case 'add-port-top':
			case 'add-port-right':
			case 'add-port-bottom':
			case 'add-port-left':
				if (this.portManager && targetElement.isElement()) {
					const side = action.replace('add-port-', '');
					this.portManager.addPortToElement(targetElement, side);
				}
				break;
				
			case 'delete':
				targetElement.remove();
				break;
		}

		this.eventBus.emit('contextmenu:action', { 
			action, 
			target: targetElement 
		});
	}

	/**
	 * Добавляет новый пункт меню
	 */
	addMenuItem(id, label, action, options = {}) {
		if (!this.contextMenuElement) return;

		const menuItem = document.createElement('div');
		menuItem.className = 'menu-item';
		menuItem.setAttribute('data-action', action);
		menuItem.style.cssText = `
			padding: 8px 16px;
			cursor: pointer;
			color: ${options.color || '#333'};
			border: none;
			background: none;
			width: 100%;
			text-align: left;
		`;
		menuItem.textContent = label;

		// Вставляем перед разделителем
		const separator = this.contextMenuElement.querySelector('.menu-separator');
		if (separator) {
			this.contextMenuElement.insertBefore(menuItem, separator);
		} else {
			this.contextMenuElement.appendChild(menuItem);
		}

		this.eventBus.emit('contextmenu:item-added', { id, label, action });
	}

	/**
	 * Удаляет пункт меню
	 */
	removeMenuItem(action) {
		if (!this.contextMenuElement) return;

		const menuItem = this.contextMenuElement.querySelector(`[data-action="${action}"]`);
		if (menuItem) {
			menuItem.remove();
			this.eventBus.emit('contextmenu:item-removed', { action });
		}
	}
}