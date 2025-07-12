export const EventManager = {
    init(managers) {
        this.core = managers.core;
        this.historyManager = managers.historyManager;
        this.guidelineManager = managers.guidelineManager;
        this.selectionManager = managers.selectionManager;
        this.contextMenuManager = managers.contextMenuManager;
        this.calloutManager = managers.calloutManager;
        this.connectionManager = managers.connectionManager;
        this.portManager = managers.core.portManager;
        
        // Связываем зависимости
        this.selectionManager.setPaper(this.core.paper);
        this.selectionManager.setPortManager(this.portManager);
        this.contextMenuManager.setGraph(this.core.graph);
        this.contextMenuManager.setCalloutManager(this.calloutManager);
        this.contextMenuManager.setPortManager(this.portManager);
        this.calloutManager.setPaper(this.core.paper);
        this.calloutManager.setGraph(this.core.graph);
        this.calloutManager.setHistoryManager(this.historyManager);
        
        // Интегрируем PortManager в paper для валидации
        this.core.paper.portManager = this.portManager;
        
        // Состояние
        this.isAddModeActive = false;
        this.highlightedElement = null;
        this.isDragging = false;
        this.draggedElement = null;
        this.isCreatingLink = false;
        
        return this;
    },
    
    bindAllEvents() {
        this.bindKeyboardEvents();
        this.bindCanvasEvents();
        this.bindElementEvents();
        this.bindLinkEvents();
        this.bindControlEvents();
        this.bindGraphEvents();
        this.bindUIEvents();
        this.bindConnectionEvents();
        
        // Синхронизируем состояние портов после инициализации
        setTimeout(() => this.portManager.syncPortStates(), 100);
    },
    
    bindKeyboardEvents() {
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey && event.code === 'KeyZ') {
                event.preventDefault();
                this.historyManager.undo();
                // Синхронизируем порты после отмены
                setTimeout(() => this.portManager.syncPortStates(), 50);
            }
            
            if (event.code === 'Delete' && this.selectionManager.selectedElements.length > 0) {
                event.preventDefault();
                this.selectionManager.deleteSelected();
            }
        });
    },
    
    bindCanvasEvents() {
        this.core.paper.on('blank:pointerclick', (event, x, y) => {
            this.selectionManager.unselectAllElements();
            this.contextMenuManager.hide();
            
            if (this.isAddModeActive) {
                const gridSize = this.core.paper.options.gridSize;
                const squareSize = 30;
                
                const intendedX = x - squareSize / 2;
                const intendedY = y - squareSize / 2;
                const finalX = joint.g.snapToGrid(intendedX, gridSize);
                const finalY = joint.g.snapToGrid(intendedY, gridSize);
                
                // Создаем элемент всегда без портов (порты добавляются через контекстное меню)
                const square = new joint.shapes.standard.Rectangle({
                    position: { x: finalX, y: finalY },
                    size: { width: squareSize, height: squareSize },
                    attrs: { body: { fill: '#e9edf0', stroke: '#8a8a96', strokeWidth: 1 } },
                    ports: this.portManager.createEmptyPorts()
                });
                square.addTo(this.core.graph);
            }
        });
        
        this.core.paper.on('blank:pointerdown', () => {
            this.guidelineManager.clearGuidelines();
        });
    },
    
    bindElementEvents() {
        this.core.paper.on('element:pointerclick', (elementView, evt) => {
            const isShiftPressed = evt.shiftKey;
            this.selectionManager.selectElement(elementView.model, isShiftPressed);
        });
        
        this.core.paper.on('element:contextmenu', (elementView, evt) => {
            evt.preventDefault();
            // Получаем нативное событие браузера
            const nativeEvent = evt.originalEvent || evt;
            this.contextMenuManager.show(nativeEvent.clientX, nativeEvent.clientY, elementView.model);
        });
        
        this.core.paper.on('element:mouseenter', (elementView) => {
            elementView.model.toFront();
            this.portManager.showElementPorts(elementView.model);
        });
        
        // ИСПРАВЛЕННЫЙ ОБРАБОТЧИК - проверяем выделенные линии перед скрытием портов
        this.core.paper.on('element:mouseleave', (elementView) => {
            const element = elementView.model;
            
            // Проверяем, не подключен ли элемент к выделенной линии
            if (this.isElementConnectedToSelectedLink(element)) {
                // Если элемент подключен к выделенной линии, не скрываем порты
                return;
            }
            
            // Обычная логика скрытия портов при уходе курсора
            if (element !== this.highlightedElement) {
                this.portManager.hideElementPorts(element);
            }
        });
        
        this.core.paper.on('element:pointerdown', (elementView) => {
            this.isDragging = true;
            this.draggedElement = elementView.model;
        });
        
        this.core.paper.on('element:pointermove', (elementView, evt, x, y) => {
            if (this.isDragging && this.draggedElement === elementView.model) {
                const currentPos = { x: x, y: y };
                const activeGuidelines = this.guidelineManager.calculateGuidelines(this.draggedElement, currentPos);
                
                // Показываем направляющие линии для визуальной помощи
                this.guidelineManager.showGuidelines(activeGuidelines);
                
                // УБРАНО: принудительное позиционирование и блокировка события
                // Теперь элемент перетаскивается свободно, но линии показываются
            }
        });
        
        this.core.paper.on('element:pointerup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.draggedElement = null;
                this.guidelineManager.clearGuidelines();
            }
        });
    },
    
    // НОВЫЙ ВСПОМОГАТЕЛЬНЫЙ МЕТОД для проверки подключения элемента к выделенным линиям
    isElementConnectedToSelectedLink(element) {
        // Получаем все выделенные элементы
        const selectedElements = this.selectionManager.selectedElements;
        
        // Фильтруем только выделенные линии
        const selectedLinks = selectedElements.filter(el => el.isLink());
        
        // Проверяем, подключен ли элемент к любой из выделенных линий
        for (const link of selectedLinks) {
            const sourceElement = link.getSourceElement();
            const targetElement = link.getTargetElement();
            
            // Если элемент является источником или целью выделенной линии
            if (sourceElement === element || targetElement === element) {
                return true;
            }
        }
        
        return false;
    },
    
    bindLinkEvents() {
        this.core.paper.on('link:pointerclick', (linkView, evt) => {
            const isShiftPressed = evt.shiftKey;
            this.selectionManager.selectElement(linkView.model, isShiftPressed);
        });
        
        this.core.paper.on('link:contextmenu', (linkView, evt) => {
            evt.preventDefault();
            // Получаем нативное событие браузера
            const nativeEvent = evt.originalEvent || evt;
            this.contextMenuManager.show(nativeEvent.clientX, nativeEvent.clientY, linkView.model);
        });
        
        this.core.paper.on('link:pointermove', (linkView, evt, x, y) => {
            const coords = new joint.g.Point(x, y);
            const elementsUnderPointer = this.core.graph.findModelsFromPoint(coords);
            const elementUnderPointer = elementsUnderPointer.find(el => el.isElement());
            
            if (elementUnderPointer && this.highlightedElement !== elementUnderPointer) {
                this.portManager.hideElementPorts(this.highlightedElement);
                elementUnderPointer.toFront();
                this.portManager.showElementPorts(elementUnderPointer);
                this.highlightedElement = elementUnderPointer;
            } else if (!elementUnderPointer && this.highlightedElement) {
                this.portManager.hideElementPorts(this.highlightedElement);
                this.highlightedElement = null;
            }
        });
        
        this.core.paper.on('link:pointerup', () => {
            if (this.highlightedElement) {
                this.portManager.hideElementPorts(this.highlightedElement);
                this.highlightedElement = null;
            }
            
            if (!this.historyManager.isRestoring && !this.isCreatingLink) {
                setTimeout(() => this.historyManager.saveState(), 10);
            }
        });
        
        this.core.paper.on('link:connect', (linkView) => {
            // Заменяем одиночную линию на группу линий с offset'ом
            if (!this.historyManager.isRestoring) {
                this.connectionManager.replaceWithMultipleLines(
                    linkView.model, 
                    this.portManager, 
                    this.core.graph
                );
            }
            
            if (this.isCreatingLink && !this.historyManager.isRestoring) {
                setTimeout(() => {
                    this.historyManager.saveState();
                    this.isCreatingLink = false;
                }, 10);
            }
        });
        
        this.core.paper.on('link:disconnect', (linkView) => {
            // Освобождаем порты при отключении
            this.portManager.onLinkDisconnect(linkView.model);
            
            if (this.isCreatingLink) {
                this.isCreatingLink = false;
            }
        });
    },
    
    bindControlEvents() {
        this.core.addSquareBtn.addEventListener('click', () => {
            this.isAddModeActive = !this.isAddModeActive;
            this.core.addSquareBtn.classList.toggle('active', this.isAddModeActive);
        });
        
        this.core.saveBtn.addEventListener('click', () => {
            const canvasData = this.core.graph.toJSON();
            console.log(JSON.stringify(canvasData, null, 2));
        });
        
        this.core.routerSelector.addEventListener('change', () => this.updateLinkStyles());
        this.core.connectorSelector.addEventListener('change', () => this.updateLinkStyles());
    },
    
    // Новый метод для привязки событий кнопок соединений
    bindConnectionEvents() {
        this.connectionManager.bindConnectionButtons();
    },
    
    bindGraphEvents() {
        this.core.graph.on('add', (cell) => {
            if (!this.historyManager.isRestoring) {
                if (cell.isLink()) {
                    this.isCreatingLink = true;
                } else if (cell.isElement()) {
                    // Инициализируем порты для нового элемента
                    setTimeout(() => this.portManager.initElementPorts(cell), 10);
                    setTimeout(() => this.historyManager.saveState(), 10);
                }
            }
        });
        
        this.core.graph.on('remove', (cell) => {
            this.selectionManager.removeFromSelection(cell);
            
            if (this.highlightedElement === cell) {
                this.highlightedElement = null;
            }
            
            if (cell.isElement()) {
                this.calloutManager.removeCallouts(cell);
                this.portManager.onElementRemove(cell);
            } else if (cell.isLink()) {
                // Освобождаем порты при удалении связи
                this.portManager.onLinkDisconnect(cell);
            }
            
            if (!this.historyManager.isRestoring) {
                setTimeout(() => this.historyManager.saveState(), 10);
            }
        });
        
        this.core.graph.on('change:position', (cell) => {
            if (cell.isElement()) {
                this.calloutManager.updateCallouts(cell);
            }
            
            if (!this.historyManager.isRestoring) {
                setTimeout(() => this.historyManager.saveState(), 100);
            }
        });
    },
    
    bindUIEvents() {
        document.addEventListener('click', (evt) => {
            this.contextMenuManager.handleMenuClick(evt);
        });
        
        document.addEventListener('contextmenu', (evt) => {
            if (evt.target.closest('#ddrCanvas')) {
                evt.preventDefault();
            }
        });
    },
    
    updateLinkStyles() {
        const routerName = this.core.routerSelector.value;
        const connectorName = this.core.connectorSelector.value;
        
        this.core.paper.options.defaultLink.set({
            router: { name: routerName },
            connector: { name: connectorName }
        });
        
        this.core.graph.getLinks().forEach(link => {
            link.set({
                router: { name: routerName },
                connector: { name: connectorName }
            });
        });
    }
};