import {CalloutManager} from './calloutManager';
import {ContextMenuManager} from './contextMenuManager';
import {EditorCore} from './editorCore';
import {EventManager} from './eventManager';
import {GuidelineManager} from './guidelineManager';
import {HistoryManager} from './historyManager';
import {SelectionManager} from './selectionManager';
import {ConnectionManager} from './connectionManager';

window.ddrDrawing = function() {
	return {
		init: () => {
			const core = EditorCore.init();
			if (!core) return;
			
			const historyManager = HistoryManager.init(core.graph, core.cellNamespace);
			const guidelineManager = GuidelineManager.init(core.paper);
			const selectionManager = SelectionManager.init();
			const contextMenuManager = ContextMenuManager.init();
			const calloutManager = CalloutManager.init();
			const connectionManager = ConnectionManager.init();
			
			const eventManager = EventManager.init({
				core,
				historyManager,
				guidelineManager,
				selectionManager,
				contextMenuManager,
				calloutManager,
				connectionManager
			});
			
			eventManager.bindAllEvents();
			historyManager.saveState();
		}
	};
};