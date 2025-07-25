import { showResizeTool } from './resize.js';

export function initializeTools(getData) {
    const resizeToolBtn = document.getElementById('resize-tool-btn');

    if (!resizeToolBtn) {
        console.error('Resize tool button not found!');
        return;
    }

    // Simple click handler for the resize button
    resizeToolBtn.addEventListener('click', () => {
        console.log('Resize button clicked');
        try {
            const { originalContent, originalFileType } = getData();
            showResizeTool(originalContent, originalFileType);
        } catch (error) {
            console.error('Error showing resize tool:', error);
        }
    });
}
