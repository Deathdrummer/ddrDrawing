/**
 * ElementCallout - Сноска для элементов
 */
export class ElementCallout {
	static create(element, text = 'Введите текст...', options = {}) {
		const bbox = element.getBBox();
		const { 
			offsetX = 40, 
			offsetY = -30, 
			lineColor = '#333',
			textBg = '#ffffff' 
		} = options;

		const startX = bbox.x + bbox.width;
		const startY = bbox.y + bbox.height / 2;
		const midX = startX + offsetX;
		const midY = startY + offsetY;

		// Диагональная линия
		const diagonalLine = new joint.shapes.standard.Link({
			source: { x: startX, y: startY },
			target: { x: midX, y: midY },
			attrs: {
				line: {
					stroke: lineColor,
					strokeWidth: 1,
					targetMarker: { type: 'none' },
					sourceMarker: { type: 'none' }
				}
			}
		});

		// Горизонтальная линия
		const horizontalLine = new joint.shapes.standard.Link({
			source: { x: midX, y: midY },
			target: { x: midX + 100, y: midY },
			attrs: {
				line: {
					stroke: lineColor,
					strokeWidth: 1,
					targetMarker: { type: 'none' },
					sourceMarker: { type: 'none' }
				}
			}
		});

		// Текстовый элемент
		const textElement = new joint.shapes.standard.Rectangle({
			position: { x: midX + 105, y: midY - 10 },
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
			diagonalLine,
			horizontalLine,
			textElement,
			update: (newText) => {
				textElement.attr('label/text', newText);
				textElement.resize(newText.length * 8 + 20, 20);
			}
		};
	}
}