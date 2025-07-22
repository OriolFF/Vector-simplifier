import { showResizeTool } from './resize.js';

export function initializeTools() {
    const resizeToolBtn = document.getElementById('resize-tool-btn');

    if (!resizeToolBtn) {
        console.error('Resize tool button not found!');
        return;
    }

    // Simple click handler for the resize button
    resizeToolBtn.addEventListener('click', () => {
        showResizeTool();
    });
}
