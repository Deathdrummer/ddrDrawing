// --- УТИЛИТЫ ДЛЯ ЭЛЕМЕНТОВ ---
export const ElementUtils = {
    showElementPorts(element) {
        if (!element) return;
        element.getPorts().forEach((port) => {
            element.portProp(port.id, 'attrs/circle/display', 'block');
        });
    },
    
    hideElementPorts(element) {
        if (!element) return;
        element.getPorts().forEach((port) => {
            element.portProp(port.id, 'attrs/circle/display', 'none');
        });
    },
    
    createSquare(x, y, size = 30) {
        return new joint.shapes.standard.Rectangle({
            position: { x, y },
            size: { width: size, height: size },
            attrs: { body: { fill: '#e9edf0', stroke: '#8a8a96', strokeWidth: 1 } },
            ports: {
                groups: {
                    'myPorts': {
                        attrs: { circle: { r: 5, magnet: true, stroke: '#31d0c6', strokeWidth: 2, fill: '#ffffff', display: 'none' }},
                        markup: '<circle r="5" />'
                    }
                },
                items: [
                    { group: 'myPorts', args: { x: '50%', y: '0%' } },
                    { group: 'myPorts', args: { x: '100%', y: '50%' } },
                    { group: 'myPorts', args: { x: '50%', y: '100%' } },
                    { group: 'myPorts', args: { x: '0%', y: '50%' } }
                ]
            }
        });
    }
};