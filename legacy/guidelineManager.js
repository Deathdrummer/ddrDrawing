// --- НОВАЯ СИСТЕМА НАПРАВЛЯЮЩИХ ---
export const GuidelineManager = {
    init(paper) {
        this.paper = paper;
        this.guidelineElements = [];
        this.SNAP_DISTANCE = 8; // Точность выравнивания
        
        return this;
    },
    
    createGuideline(x1, y1, x2, y2) {
        const guideline = joint.V('line', {
            x1, y1, x2, y2,
            stroke: '#f09aef',
            'stroke-width': 0.5,
            'stroke-dasharray': '5',
            'pointer-events': 'none',
            opacity: 0.9
        });
        
        this.paper.svg.appendChild(guideline.node);
        this.guidelineElements.push(guideline.node);
        return guideline.node;
    },
    
    clearGuidelines() {
        this.guidelineElements.forEach(guideline => {
            if (guideline.parentNode) {
                guideline.parentNode.removeChild(guideline);
            }
        });
        this.guidelineElements = [];
    },
    
    calculateGuidelines(draggedElement) {
        // Получаем реальную позицию и размеры перетаскиваемого элемента
        const draggedPos = draggedElement.position();
        const draggedSize = draggedElement.size();
        
        // Координаты перетаскиваемого элемента
        const draggedLeft = draggedPos.x;
        const draggedRight = draggedPos.x + draggedSize.width;
        const draggedCenterX = draggedPos.x + draggedSize.width / 2;
        const draggedTop = draggedPos.y;
        const draggedBottom = draggedPos.y + draggedSize.height;
        const draggedCenterY = draggedPos.y + draggedSize.height / 2;
        
        // Получаем все остальные элементы
        const otherElements = this.paper.model.getElements().filter(el => el !== draggedElement);
        const guidelines = [];
        
        const paperWidth = this.paper.options.width;
        const paperHeight = this.paper.options.height;
        
        // Проверяем выравнивание с каждым элементом
        otherElements.forEach(element => {
            const pos = element.position();
            const size = element.size();
            
            const left = pos.x;
            const right = pos.x + size.width;
            const centerX = pos.x + size.width / 2;
            const top = pos.y;
            const bottom = pos.y + size.height;
            const centerY = pos.y + size.height / 2;
            
            // ВЕРТИКАЛЬНЫЕ НАПРАВЛЯЮЩИЕ (выравнивание по X)
            
            // Левые края выровнены
            if (Math.abs(draggedLeft - left) <= this.SNAP_DISTANCE) {
                guidelines.push({
                    type: 'vertical',
                    x: left,
                    line: { x1: left, y1: 0, x2: left, y2: paperHeight }
                });
            }
            
            // Правые края выровнены
            if (Math.abs(draggedRight - right) <= this.SNAP_DISTANCE) {
                guidelines.push({
                    type: 'vertical',
                    x: right,
                    line: { x1: right, y1: 0, x2: right, y2: paperHeight }
                });
            }
            
            // Центры по X выровнены
            if (Math.abs(draggedCenterX - centerX) <= this.SNAP_DISTANCE) {
                guidelines.push({
                    type: 'vertical',
                    x: centerX,
                    line: { x1: centerX, y1: 0, x2: centerX, y2: paperHeight }
                });
            }
            
            // ГОРИЗОНТАЛЬНЫЕ НАПРАВЛЯЮЩИЕ (выравнивание по Y)
            
            // Верхние края выровнены
            if (Math.abs(draggedTop - top) <= this.SNAP_DISTANCE) {
                guidelines.push({
                    type: 'horizontal',
                    y: top,
                    line: { x1: 0, y1: top, x2: paperWidth, y2: top }
                });
            }
            
            // Нижние края выровнены
            if (Math.abs(draggedBottom - bottom) <= this.SNAP_DISTANCE) {
                guidelines.push({
                    type: 'horizontal',
                    y: bottom,
                    line: { x1: 0, y1: bottom, x2: paperWidth, y2: bottom }
                });
            }
            
            // Центры по Y выровнены
            if (Math.abs(draggedCenterY - centerY) <= this.SNAP_DISTANCE) {
                guidelines.push({
                    type: 'horizontal',
                    y: centerY,
                    line: { x1: 0, y1: centerY, x2: paperWidth, y2: centerY }
                });
            }
        });
        
        // Убираем дубликаты направляющих
        const uniqueGuidelines = this.removeDuplicates(guidelines);
        
        return uniqueGuidelines;
    },
    
    // Убираем дубликаты направляющих (если несколько элементов на одной линии)
    removeDuplicates(guidelines) {
        const unique = [];
        const seen = new Set();
        
        guidelines.forEach(guide => {
            const key = guide.type === 'vertical' ? 
                `v_${guide.x}` : 
                `h_${guide.y}`;
            
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(guide);
            }
        });
        
        return unique;
    },
    
    showGuidelines(guidelines) {
        this.clearGuidelines();
        guidelines.forEach(guide => {
            const line = guide.line;
            this.createGuideline(line.x1, line.y1, line.x2, line.y2);
        });
    },
    
    applySnapping(currentPos, guidelines) {
        // ПРИМАГНИЧИВАНИЕ ОТКЛЮЧЕНО
        return { x: currentPos.x, y: currentPos.y };
    }
};