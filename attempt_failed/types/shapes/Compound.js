/**
 * Compound - Составная фигура
 */
export class Compound {
	static create(childElements, options = {}) {
		const { padding = 10, label = 'Group' } = options;
		
		// Вычисляем общий bbox
		let minX = Infinity, minY = Infinity;
		let maxX = -Infinity, maxY = -Infinity;

		childElements.forEach(element => {
			const bbox = element.getBBox();
			minX = Math.min(minX, bbox.x);
			minY = Math.min(minY, bbox.y);
			maxX = Math.max(maxX, bbox.x + bbox.width);
			maxY = Math.max(maxY, bbox.y + bbox.height);
		});

		const container = new joint.shapes.standard.Rectangle({
			position: { 
				x: minX - padding, 
				y: minY - padding 
			},
			size: { 
				width: maxX - minX + padding * 2, 
				height: maxY - minY + padding * 2 
			},
			attrs: {
				body: {
					fill: 'transparent',
					stroke: options.stroke || '#666',
					strokeDasharray: options.strokeDasharray || '5,5',
					strokeWidth: options.strokeWidth || 1
				},
				label: {
					text: label,
					fontSize: options.fontSize || 12,
					fill: options.textColor || '#666'
				}
			}
		});

		return { container, childElements };
	}

	static embedChildren(container, childElements) {
		childElements.forEach(child => {
			container.embed(child);
		});
		return container;
	}

	static ungroup(container) {
		const children = container.getEmbeddedCells();
		children.forEach(child => {
			container.unembed(child);
		});
		return children;
	}
}