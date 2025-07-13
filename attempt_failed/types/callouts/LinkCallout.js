/**
 * LinkCallout - Сноска для линий
 */
export class LinkCallout {
	static create(link, text = 'Введите текст...', options = {}) {
		const sourcePoint = link.getSourcePoint();
		const targetPoint = link.getTargetPoint();
		const { 
			offsetX = 30, 
			offsetY = -30, 
			lineColor = '#666',
			textBg = '#ffffff' 
		} = options;

		// Середина линии
		const midX = (sourcePoint.x + targetPoint.x) / 2;
		const midY = (sourcePoint.y + targetPoint.y) / 2;
		const calloutX = midX + offsetX;
		const calloutY = midY + offsetY;

		// Линия к сноске
		const calloutLine = new joint.shapes.standard.Link({
			source: { x: midX, y: midY },
			target: { x: calloutX, y: calloutY },
			attrs: {
				line: {
					stroke: lineColor,
					strokeWidth: 1,
					strokeDasharray: '3,3',
					targetMarker: { type: 'none' },
					sourceMarker: { type: 'none' }
				}
			}
		});

		// Горизонтальная линия
		const horizontalLine = new joint.shapes.standard.Link({
			source: { x: calloutX, y: calloutY },
			target: { x: calloutX + 80, y: calloutY },
			attrs: {
				line: {
					stroke: lineColor,
					strokeWidth: 1,
					strokeDasharray: '3,3',
					targetMarker: { type: 'none' },
					sourceMarker: { type: 'none' }
				}
			}
		});

		// Текстовый элемент
		const textElement = new joint.shapes.standard.Rectangle({
			position: { x: calloutX + 85, y: calloutY - 10 },
			size: { width: text.length * 8 + 20, height: 20 },
			attrs: {
				body: {
					fill: textBg,
					stroke: lineColor,
					strokeWidth: 1,
					rx: 3
				},
				label: {
					text: text,
					fontSize: 12,
					fontFamily: 'Arial'
				}
			}
		});

		return {
			calloutLine,
			horizontalLine,
			textElement,
			update: (newText) => {
				textElement.attr('label/text', newText);
				textElement.resize(newText.length * 8 + 20, 20);
			}
		};
	}
}