/**
 * LinkMenuItems - Пункты контекстного меню для линий
 */
export class LinkMenuItems {
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
				id: 'separator1',
				type: 'separator'
			},
			{
				id: 'style',
				label: 'Стиль линии',
				icon: '🎨',
				action: 'style',
				category: 'appearance',
				submenu: [
					{ id: 'style-solid', label: 'Сплошная', action: 'style-solid' },
					{ id: 'style-dashed', label: 'Пунктирная', action: 'style-dashed' },
					{ id: 'style-dotted', label: 'Точечная', action: 'style-dotted' }
				]
			},
			{
				id: 'router',
				label: 'Маршрутизация',
				icon: '🛤️',
				action: 'router',
				category: 'connection',
				submenu: [
					{ id: 'router-normal', label: 'Прямая', action: 'router-normal' },
					{ id: 'router-orthogonal', label: 'Ортогональная', action: 'router-orthogonal' },
					{ id: 'router-manhattan', label: 'Манхэттен', action: 'router-manhattan' }
				]
			},
			{
				id: 'separator2',
				type: 'separator'
			},
			{
				id: 'properties',
				label: 'Свойства',
				icon: '⚙️',
				action: 'properties',
				category: 'edit'
			},
			{
				id: 'separator3',
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
				min-width: 140px;
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