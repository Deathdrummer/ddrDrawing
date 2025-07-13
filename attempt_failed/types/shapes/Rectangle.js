/**
 * Rectangle - Базовая прямоугольная фигура
 */
export class Rectangle {
	static create(options = {}) {
		return new joint.shapes.standard.Rectangle({
			position: options.position || { x: 0, y: 0 },
			size: options.size || { width: 80, height: 60 },
			attrs: {
				body: {
					fill: options.fill || '#ffffff',
					stroke: options.stroke || '#333333',
					strokeWidth: options.strokeWidth || 1,
					rx: options.borderRadius || 0,
					ry: options.borderRadius || 0
				},
				label: {
					text: options.text || 'Rectangle',
					fontSize: options.fontSize || 12,
					fontFamily: options.fontFamily || 'Arial',
					fill: options.textColor || '#333'
				}
			},
			...options.jointOptions
		});
	}

	static getDefaultOptions() {
		return {
			fill: '#ffffff',
			stroke: '#333333',
			strokeWidth: 1,
			text: 'Rectangle',
			fontSize: 12,
			fontFamily: 'Arial',
			textColor: '#333',
			borderRadius: 0
		};
	}
}