export const SelectionManager = {
    init() {
        this.selectedElements = [];
        this.paper = null;
        this.portManager = null; // Добавляем ссылку на portManager
        
        return this;
    },
    
    setPaper(paper) {
        this.paper = paper;
    },
    
    // Добавляем метод для установки portManager
    setPortManager(portManager) {
        this.portManager = portManager;
    },
    
    selectElement(element, addToSelection = false) {
        if (addToSelection && this.selectedElements.includes(element)) {
            this.unselectElement(element);
            return;
        }
        
        if (!addToSelection) {
            this.unselectAllElements();
        }
        
        this.selectedElements.push(element);
        this.applySelectionStyle(element);
    },
    
    applySelectionStyle(element) {
        if (element.isElement()) {
            // Для элементов применяем стандартное выделение
            element.attr('body/stroke', '#ff4444');
            element.attr('body/strokeWidth', 3);
        } else if (element.isLink()) {
            // Для линий изменяем цвет и толщину
            element.attr('line/stroke', '#31d0c6');
            element.attr('line/strokeWidth', 3);
            
            // Показываем порты элементов, к которым подключена линия
            this.showConnectedElementPorts(element);
        }
    },
    
    // Новый метод для отображения портов подключенных элементов
    showConnectedElementPorts(link) {
        if (!this.portManager) return;
        
        // Получаем элементы-источник и элемент-цель линии
        const sourceElement = link.getSourceElement();
        const targetElement = link.getTargetElement();
        
        // Показываем порты источника, если элемент существует
        if (sourceElement) {
            this.portManager.showElementPorts(sourceElement);
        }
        
        // Показываем порты цели, если элемент существует и отличается от источника
        if (targetElement && targetElement !== sourceElement) {
            this.portManager.showElementPorts(targetElement);
        }
    },
    
    // Новый метод для скрытия портов подключенных элементов
    hideConnectedElementPorts(link) {
        if (!this.portManager) return;
        
        // Получаем элементы-источник и элемент-цель линии
        const sourceElement = link.getSourceElement();
        const targetElement = link.getTargetElement();
        
        // Скрываем порты источника, если элемент существует
        // и он не выделен как отдельный элемент
        if (sourceElement && !this.selectedElements.includes(sourceElement)) {
            this.portManager.hideElementPorts(sourceElement);
        }
        
        // Скрываем порты цели, если элемент существует, отличается от источника
        // и не выделен как отдельный элемент
        if (targetElement && targetElement !== sourceElement && !this.selectedElements.includes(targetElement)) {
            this.portManager.hideElementPorts(targetElement);
        }
    },
    
    unselectElement(element) {
        const index = this.selectedElements.indexOf(element);
        if (index > -1) {
            this.selectedElements.splice(index, 1);
            this.removeSelectionStyle(element);
        }
    },
    
    removeSelectionStyle(element) {
        if (element.isElement()) {
            // Возвращаем стандартный стиль для элементов
            element.attr('body/stroke', '#8a8a96');
            element.attr('body/strokeWidth', 1);
        } else if (element.isLink()) {
            // Возвращаем стандартный стиль для линий
            element.attr('line/stroke', '#8a8a96');
            element.attr('line/strokeWidth', 2);
            
            // Скрываем порты подключенных элементов
            this.hideConnectedElementPorts(element);
        }
    },
    
    unselectAllElements() {
        // Снимаем выделение со всех элементов
        this.selectedElements.forEach(element => {
            this.removeSelectionStyle(element);
        });
        this.selectedElements = [];
    },
    
    deleteSelected() {
        // Удаляем все выделенные элементы
        this.selectedElements.forEach(element => {
            element.remove();
        });
        this.selectedElements = [];
    },
    
    removeFromSelection(element) {
        const index = this.selectedElements.indexOf(element);
        if (index > -1) {
            this.selectedElements.splice(index, 1);
        }
    },
    
    clearHighlight() {
        this.selectedElements = [];
    }
};