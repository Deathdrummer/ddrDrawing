/**
 * ElementMenuItems - Пункты контекстного меню для элементов
 */
export class ElementMenuItems {
	static getDefaultItems() {
		return [
			{
				id: 'add-callout',
				label: 'Добавить сноску',
				icon: '💬',
				action: 'add-label',
				category: 'callouts'
			},
			{
				id: 'add-ports',
				label: 'Добавить порт',
				icon: '🔗',
				action: 'add-port',
				category: 'ports',
				submenu: [
					{ id: 'add-port-top', label: 'Сверху', action: 'add-port-top' },
					{ id: 'add-port-right', label: 'Справа', action: 'add-port-right' },
					{ id: 'add-port-bottom', label: 'Снизу', action: 'add-port-bottom' },
					{ id: 'add-port-left', label: 'Слева', action: 'add-port-left' }
				]
			},
			{
				id: 'separator1',
				type: 'separator'
			},
			{
				id: 'clone',
				label: 'Дублировать',
				icon: '📋',
				action: 'clone',
				category: 'edit'
			},
			{
				id: 'properties',
				label: 'Свойства',
				icon: '⚙️',
				action: 'properties',
				category: 'edit'
			},
			{
				id: 'separator2',
				type: 'separator'
			},
			{
				id: 'delete',
				label: 'Удалить',
				icon: '🗑️',
				action: 'delete',
				category: 'danger',
				style: { color: '#d73a49' }
			}
		];
	}

	static createMenuItem(config) {
		const item = document.createElement('div');
		
		if (config.type === 'separator') {
			item.className = 'menu-separator';
			item.style.cssText = 'height: 1px; background: #eee; margin: 4px 0;';
			return item;
		}

		item.className = 'menu-item';
		item.setAttribute('data-action', config.action);
		item.style.cssText = `
			padding: 8px 16px;
			cursor: pointer;
			color: ${config.style?.color || '#333'};
			border: none;
			background: none;
			width: 100%;
			text-align: left;
			display: flex;
			align-items: center;
			gap: 8px;
		`;

		const content = `
			${config.icon ? `<span class="menu-icon">${config.icon}</span>` : ''}
			<span class="menu-label">${config.label}</span>
			${config.submenu ? '<span class="submenu-arrow">▶</span>' : ''}
		`;
		
		item.innerHTML = content;

		if (config.submenu) {
			const submenu = document.createElement('div');
			submenu.className = 'submenu';
			submenu.style.cssText = `
				position: absolute;
				left: 100%;
				top: 0;
				background: white;
				border: 1px solid #ccc;
				border-radius: 4px;
				box-shadow: 0 2px 8px rgba(0,0,0,0.15);
				min-width: 120px;
				display: none;
			`;

			config.submenu.forEach(subItem => {
				const subMenuItem = this.createMenuItem(subItem);
				submenu.appendChild(subMenuItem);
			});

			item.appendChild(submenu);
		}

		return item;
	}
}