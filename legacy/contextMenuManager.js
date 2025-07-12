export const ContextMenuManager = {
    init() {
        this.contextMenuElement = null;
        this.graph = null;
        this.calloutManager = null;
        this.portManager = null;
        this.createMenu();
        
        return this;
    },
    
    setGraph(graph) {
        this.graph = graph;
    },
    
    setCalloutManager(calloutManager) {
        this.calloutManager = calloutManager;
    },
    
    setPortManager(portManager) {
        this.portManager = portManager;
    },
    
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
            ">
                Добавить порт
                <div class="submenu" style="
                    position: absolute;
                    left: 100%;
                    top: 0;
                    background: white;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                    padding: 4px 0;
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
        `;
        
        document.body.appendChild(menu);
        this.contextMenuElement = menu;
        
        const style = document.createElement('style');
        style.textContent = `
            .menu-item:hover {
                background-color: #f0f0f0 !important;
            }
            .submenu-parent:hover .submenu {
                display: block !important;
            }
        `;
        document.head.appendChild(style);
    },
    
    show(x, y, targetElement) {
        if (!this.contextMenuElement) {
            this.createMenu();
        }
        
        // Отладка координат
        console.log('Menu coordinates:', x, y);
        
        // Позиционируем меню точно в координатах курсора (viewport)
        this.contextMenuElement.style.position = 'fixed';
        this.contextMenuElement.style.left = x + 'px';
        this.contextMenuElement.style.top = y + 'px';
        this.contextMenuElement.style.display = 'block';
        this.contextMenuElement.setAttribute('data-target', targetElement.id);
        
        // Добавляем в body для корректного позиционирования
        document.body.appendChild(this.contextMenuElement);
        
        // Проверяем, не выходит ли меню за границы экрана
        const rect = this.contextMenuElement.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Корректируем позицию если выходит за границы
        if (rect.right > viewportWidth) {
            this.contextMenuElement.style.left = (x - rect.width) + 'px';
        }
        
        if (rect.bottom > viewportHeight) {
            this.contextMenuElement.style.top = (y - rect.height) + 'px';
        }
    },
    
    hide() {
        if (this.contextMenuElement) {
            this.contextMenuElement.style.display = 'none';
        }
    },
    
    handleMenuClick(evt) {
        if (evt.target.classList.contains('menu-item')) {
            const action = evt.target.getAttribute('data-action');
            const targetId = this.contextMenuElement.getAttribute('data-target');
            const targetElement = this.graph.getCell(targetId);
            
            if (action === 'add-label' && targetElement && this.calloutManager) {
                this.calloutManager.addLabel(targetElement);
            } else if (action && action.startsWith('add-port-') && targetElement && this.portManager) {
                const side = action.replace('add-port-', '');
                this.portManager.addPortToElement(targetElement, side);
            }
            
            this.hide();
        } else {
            this.hide();
        }
    }
};