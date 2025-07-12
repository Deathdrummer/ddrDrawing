export const CalloutManager = {
    init() {
        this.paper = null;
        this.graph = null;
        this.historyManager = null;
        
        return this;
    },
    
    setPaper(paper) {
        this.paper = paper;
    },
    
    setGraph(graph) {
        this.graph = graph;
    },
    
    setHistoryManager(historyManager) {
        this.historyManager = historyManager;
    },
    
    addLabel(element) {
        const defaultText = 'Введите текст...';
        if (element.isElement()) {
            this.addElementCallout(element, defaultText);
        } else if (element.isLink()) {
            this.addLinkCallout(element, defaultText);
        }
        
        setTimeout(() => this.historyManager.saveState(), 10);
    },
    
    addElementCallout(element, labelText) {
        const bbox = element.getBBox();
        const startX = bbox.x + bbox.width;
        const startY = bbox.y + bbox.height / 2;
        const midX = startX + 40;
        const midY = startY - 30;
        
        const diagonalLine = new joint.shapes.standard.Link({
            source: { x: startX, y: startY },
            target: { x: midX, y: midY },
            attrs: {
                line: {
                    stroke: '#333',
                    strokeWidth: 1,
                    targetMarker: { type: 'none' },
                    sourceMarker: { type: 'none' }
                }
            }
        });
        
        const horizontalLine = new joint.shapes.standard.Link({
            source: { x: midX, y: midY },
            target: { x: midX + 100, y: midY },
            attrs: {
                line: {
                    stroke: '#333',
                    strokeWidth: 1,
                    targetMarker: { type: 'none' },
                    sourceMarker: { type: 'none' }
                }
            }
        });
        
        diagonalLine.addTo(this.graph);
        horizontalLine.addTo(this.graph);
        
        setTimeout(() => {
            this.makeNonInteractive(diagonalLine);
            this.makeNonInteractive(horizontalLine);
        }, 10);
        
        // Создаем HTML overlay для текста с правильным позиционированием
        const textOverlay = this.createTextOverlay(midX + 2, midY, labelText);
        
        const calloutData = element.prop('callouts') || [];
        calloutData.push({
            diagonalId: diagonalLine.id,
            horizontalId: horizontalLine.id,
            textOverlayId: textOverlay.id,
            text: labelText
        });
        element.prop('callouts', calloutData);
        
        // Автофокус для новых сносок
        if (labelText === 'Введите текст...') {
            setTimeout(() => this.startEditingOverlay(textOverlay), 50);
        }
    },
    
    addLinkCallout(element, labelText) {
        const currentLabels = element.prop('labels') || [];
        currentLabels.push({
            markup: [
                {
                    tagName: 'g',
                    selector: 'calloutGroup',
                    children: [
                        {
                            tagName: 'line',
                            selector: 'calloutLine'
                        },
                        {
                            tagName: 'line',
                            selector: 'calloutLineHorizontal'
                        },
                        {
                            tagName: 'text',
                            selector: 'calloutText'
                        }
                    ]
                }
            ],
            attrs: {
                calloutLine: {
                    stroke: '#333',
                    strokeWidth: 1,
                    x1: 0,
                    y1: 0,
                    x2: 30,
                    y2: -40
                },
                calloutLineHorizontal: {
                    stroke: '#333',
                    strokeWidth: 1,
                    x1: 30,
                    y1: -40,
                    x2: 80,
                    y2: -40
                },
                calloutText: {
                    text: labelText,
                    fill: '#333',
                    fontSize: 12,
                    fontFamily: 'Arial, sans-serif',
                    textAnchor: 'start',
                    x: 82,
                    y: -36
                }
            },
            position: {
                distance: 0.5,
                offset: 0
            }
        });
        element.prop('labels', currentLabels);
    },
    
    createTextOverlay(x, y, text) {
        // Создаем внешний контейнер с position: relative
        // Он будет опорной точкой для абсолютного позиционирования внутреннего текста
        const outerContainer = document.createElement('div');
        outerContainer.id = 'callout-outer-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        outerContainer.className = 'callout-outer-container';
        outerContainer.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            pointer-events: none;
            width: 1px;
            height: 1px;
        `;
        
        // Создаем внутренний контейнер с position: absolute; bottom: 0
        // Это обеспечивает выравнивание текста по нижней границе независимо от высоты
        const innerContainer = document.createElement('div');
        innerContainer.id = 'callout-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        innerContainer.className = 'callout-text-overlay';
        innerContainer.style.cssText = `
            position: absolute;
            bottom: 5px;
            left: 0;
            font-family: Arial, sans-serif;
            font-size: 12px;
            color: ${text === 'Введите текст...' ? '#999' : '#333'};
            pointer-events: auto;
            cursor: pointer;
            user-select: none;
            white-space: pre-wrap;
            word-break: break-word;
            min-width: max-content;
            max-width: 500px;
            line-height: 12px;
        `;
        innerContainer.textContent = text;
        
        // Собираем структуру: внешний контейнер содержит внутренний
        outerContainer.appendChild(innerContainer);
        
        // Добавляем в paper container
        this.paper.el.style.position = 'relative';
        this.paper.el.appendChild(outerContainer);
        
        // Обработчик двойного клика привязываем к внутреннему контейнеру
        innerContainer.addEventListener('dblclick', (evt) => {
            evt.stopPropagation();
            this.startEditingOverlay(innerContainer);
        });
        
        // Возвращаем внутренний контейнер для совместимости с существующим кодом
        // но сохраняем ссылку на внешний контейнер для правильного позиционирования
        innerContainer.outerContainer = outerContainer;
        return innerContainer;
    },
    
    startEditingOverlay(overlay) {
        const editableDiv = document.createElement('div');
        const currentText = overlay.textContent;
        const isPlaceholder = currentText === 'Введите текст...';
        
        editableDiv.textContent = isPlaceholder ? '' : currentText;
        editableDiv.contentEditable = true;
        
        // Позиционируем div относительно внешнего контейнера
        const outerContainer = overlay.outerContainer;
        const outerRect = outerContainer.getBoundingClientRect();
        const paperRect = this.paper.el.getBoundingClientRect();
        
        editableDiv.style.cssText = `
            position: absolute;
            left: ${outerRect.left - paperRect.left}px;
            bottom: ${paperRect.bottom - outerRect.top + 5}px;
            font-family: Arial, sans-serif;
            font-size: 12px;
            color: #333;
            background: none;
            border: none;
            outline: none;
            min-width: 80px;
            max-width: none;
            line-height: 14px;
            padding: 1px 2px;
            white-space: pre;
            word-wrap: normal;
        `;
        
        // Скрываем overlay
        overlay.style.display = 'none';
        
        // Добавляем editableDiv
        this.paper.el.appendChild(editableDiv);
        editableDiv.focus();
        
        // Выделяем весь текст
        const range = document.createRange();
        range.selectNodeContents(editableDiv);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Обработчики событий
        let isFinished = false;
        
        const finishEditing = () => {
            if (isFinished || !editableDiv.parentNode) return;
            isFinished = true;
            
            const newText = editableDiv.textContent.trim() || 'Введите текст...';
            this.updateOverlayText(overlay, newText);
            
            overlay.style.display = 'block';
            this.paper.el.removeChild(editableDiv);
            
            // Удаляем глобальный обработчик клика
            document.removeEventListener('click', outsideClickHandler);
            
            // Находим элемент, которому принадлежит эта сноска, и обновляем её линии
            const calloutId = overlay.id;
            const parentElement = this.graph.getElements().find(element => {
                const callouts = element.prop('callouts') || [];
                return callouts.some(c => c.textOverlayId === calloutId);
            });
            
            if (parentElement) {
                this.updateCallouts(parentElement);
            }
            
            this.historyManager.saveState();
        };
        
        const cancelEditing = () => {
            if (isFinished || !editableDiv.parentNode) return;
            isFinished = true;
            overlay.style.display = 'block';
            this.paper.el.removeChild(editableDiv);
            
            // Удаляем глобальный обработчик клика
            document.removeEventListener('click', outsideClickHandler);
        };
        
        // Обработчик клика вне редактируемого элемента
        const outsideClickHandler = (evt) => {
            if (!editableDiv.contains(evt.target)) {
                cancelEditing();
            }
        };
        
        // Добавляем глобальный обработчик клика с задержкой
        // чтобы избежать немедленного срабатывания от текущего клика
        setTimeout(() => {
            document.addEventListener('click', outsideClickHandler);
        }, 10);
        
        editableDiv.addEventListener('blur', finishEditing);
        editableDiv.addEventListener('keydown', (evt) => {
            if (evt.key === 'Enter' && !evt.shiftKey) {
                evt.preventDefault();
                finishEditing();
            } else if (evt.key === 'Escape') {
                evt.preventDefault();
                cancelEditing();
            }
        });
    },
    
    updateOverlayText(overlay, newText) {
        const isPlaceholder = newText === 'Введите текст...';
        overlay.textContent = newText;
        overlay.style.color = isPlaceholder ? '#999' : '#333';
        
        // Обновляем данные в callouts
        const calloutId = overlay.id;
        this.graph.getElements().forEach(element => {
            const callouts = element.prop('callouts') || [];
            const callout = callouts.find(c => c.textOverlayId === calloutId);
            if (callout) {
                callout.text = newText;
                element.prop('callouts', callouts);
            }
        });
    },
    
    makeNonInteractive(linkElement) {
        const linkView = this.paper.findViewByModel(linkElement);
        if (linkView) {
            linkView.el.style.pointerEvents = 'none';
        }
    },
    
    measureMultilineText(text, fontSize = 12, fontFamily = 'Arial') {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = `${fontSize}px ${fontFamily}`;
        
        const lines = text.split('\n');
        let maxWidth = 0;
        
        lines.forEach(line => {
            const width = context.measureText(line.trim()).width;
            if (width > maxWidth) maxWidth = width;
        });
        
        return { width: maxWidth, height: lines.length * 16, lines };
    },
    
    updateCallouts(element) {
        const callouts = element.prop('callouts');
        if (!callouts || callouts.length === 0) return;
        
        callouts.forEach(callout => {
            const diagonalLine = this.graph.getCell(callout.diagonalId);
            const horizontalLine = this.graph.getCell(callout.horizontalId);
            const textOverlay = document.getElementById(callout.textOverlayId);
            
            if (diagonalLine && horizontalLine && textOverlay) {
                const bbox = element.getBBox();
                const startX = bbox.x + bbox.width;
                const startY = bbox.y + bbox.height / 2;
                const midX = startX + 40;
                const midY = startY - 30;
                
                // Обновляем линии
                diagonalLine.source({ x: startX, y: startY });
                diagonalLine.target({ x: midX, y: midY });
                
                // Позиционируем внешний контейнер оверлея
                // Внутренний автоматически выровняется по bottom: 0
                const outerContainer = textOverlay.outerContainer;
                if (outerContainer) {
                    outerContainer.style.left = (midX + 2) + 'px';
                    outerContainer.style.top = midY + 'px';
                }
                
                // Обновляем горизонтальную линию с учетом реальной ширины текста
                const overlayRect = textOverlay.getBoundingClientRect();
                const overlayWidth = overlayRect.width;
                
                horizontalLine.source({ x: midX, y: midY });
                horizontalLine.target({ x: midX + overlayWidth + 10, y: midY });
            }
        });
    },
    
    removeCallouts(element) {
        const callouts = element.prop('callouts');
        if (!callouts || callouts.length === 0) return;
        
        callouts.forEach(callout => {
            const diagonalLine = this.graph.getCell(callout.diagonalId);
            const horizontalLine = this.graph.getCell(callout.horizontalId);
            const textOverlay = document.getElementById(callout.textOverlayId);
            
            if (diagonalLine) diagonalLine.remove();
            if (horizontalLine) horizontalLine.remove();
            if (textOverlay && textOverlay.outerContainer && textOverlay.outerContainer.parentNode) {
                // Удаляем внешний контейнер, который содержит внутренний текстовый элемент
                textOverlay.outerContainer.parentNode.removeChild(textOverlay.outerContainer);
            }
        });
    }
};