import { optimize } from 'https://cdn.jsdelivr.net/npm/svgo@3.0.2/dist/svgo.browser.js';

// --- DOM Elements ---
const fileInput = document.getElementById('file-input');
const originalContainer = document.getElementById('original-container');
const modifiedContainer = document.getElementById('modified-container');

const simplifyToleranceSlider = document.getElementById('simplify-tolerance');
const zoomInButton = document.getElementById('zoom-in');
const zoomOutButton = document.getElementById('zoom-out');
const zoomResetButton = document.getElementById('zoom-reset');
const saveButton = document.getElementById('save-button');
const toggleStatsButton = document.getElementById('toggle-stats');
const statsContainer = document.getElementById('stats-container');
const bgColorPicker = document.getElementById('bg-color');

// Save dialog elements
const customSaveModal = document.getElementById('customSaveModal');
const fileNameInput = document.getElementById('fileName');
const replaceOriginalCheckbox = document.getElementById('replaceOriginal');
const confirmSaveButton = document.getElementById('confirmSave');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelSaveBtn = document.getElementById('cancelSaveBtn');

// Stats visibility state
let statsVisible = true;

// --- State Variables ---
let originalSvgContent = null;
let modifiedSvgContent = null;
let originalFileType = ''; // 'svg' or 'xml'
let originalFileName = '';
let originalViewBox = null; // [x, y, width, height]
let backgroundColor = '#ffffff'; // Default background color

// --- Viewport State ---
let originalState = { scale: 1, translateX: 0, translateY: 0 };
let modifiedState = { scale: 1, translateX: 0, translateY: 0 };
let isPanning = false;
let panStartX, panStartY;

// --- Core Functions ---

function applyBackgroundColor(color) {
    // Apply background color to both containers
    originalContainer.style.backgroundColor = color;
    modifiedContainer.style.backgroundColor = color;
    backgroundColor = color;
}

function displaySvg(svgString, container, state) {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgElement = svgDoc.querySelector('svg');

    if (!svgElement) {
        container.innerHTML = `<div class="error">Invalid SVG content</div>`;
        return;
    }

    // Store original viewBox if not already stored
    if (!originalViewBox && container === originalContainer) {
        const viewBox = svgElement.getAttribute('viewBox');
        if (viewBox) {
            originalViewBox = viewBox.split(' ').map(Number);
        }
    }

    // Remove width/height for responsive scaling
    svgElement.removeAttribute('width');
    svgElement.removeAttribute('height');

    // Prepare the wrapper for transformations
    container.innerHTML = ''; // Clear previous content
    const wrapper = document.createElement('div');
    wrapper.className = 'svg-wrapper';
    wrapper.appendChild(svgElement);
    container.appendChild(wrapper);

    // Apply initial state
    applyTransform(container, state);
    
    // Apply the current background color
    container.style.backgroundColor = backgroundColor;
}

function applyTransform(container, state) {
    const wrapper = container.querySelector('.svg-wrapper');
    if (wrapper) {
        wrapper.style.transform = `translate(${state.translateX}px, ${state.translateY}px) scale(${state.scale})`;
    }
}

function loadAndDisplay(svgString) {
    originalSvgContent = svgString;
    modifiedSvgContent = svgString; // Initially, modified is same as original
    
    // Reset state for new image
    originalState = { scale: 1, translateX: 0, translateY: 0 };
    modifiedState = { scale: 1, translateX: 0, translateY: 0 };
    originalViewBox = null;

    displaySvg(originalSvgContent, originalContainer, originalState);
    displaySvg(modifiedSvgContent, modifiedContainer, modifiedState);
    
    // Apply the current tolerance value immediately
    const sliderValue = parseFloat(simplifyToleranceSlider.value);
    const invertedTolerance = 9 - sliderValue; // Invert the value
    simplifyModifiedView(invertedTolerance);
    
    // Update the tolerance display
    updateToleranceDisplay(sliderValue);
    
    updateStatsView();
}

function handleAndroidVector(xmlString) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
        const vectorNode = xmlDoc.querySelector('vector');

        if (!vectorNode) {
            throw new Error('Invalid Android Vector Drawable XML: <vector> tag not found.');
        }

        const viewportWidth = vectorNode.getAttribute('android:viewportWidth');
        const viewportHeight = vectorNode.getAttribute('android:viewportHeight');

        let svgContent = `<svg viewBox="0 0 ${viewportWidth} ${viewportHeight}" xmlns="http://www.w3.org/2000/svg">`;

        const processNode = (node) => {
            let result = '';
            for (const child of node.childNodes) {
                if (child.nodeName === 'path') {
                    const pathData = child.getAttribute('android:pathData');
                    const fillColor = child.getAttribute('android:fillColor') || 'none';
                    const strokeColor = child.getAttribute('android:strokeColor');
                    const strokeWidth = child.getAttribute('android:strokeWidth');
                    
                    let path = `<path d="${pathData}" fill="${fillColor}"`;
                    if (strokeColor) path += ` stroke="${strokeColor}"`;
                    if (strokeWidth) path += ` stroke-width="${strokeWidth}"`;
                    path += '/>';
                    result += path;
                } else if (child.nodeName === 'group') {
                    result += '<g>';
                    result += processNode(child);
                    result += '</g>';
                }
            }
            return result;
        };

        svgContent += processNode(vectorNode);
        svgContent += '</svg>';

        loadAndDisplay(svgContent);
    } catch (error) {
        console.error('Error converting Android Vector Drawable:', error);
        originalContainer.innerHTML = `<h2>Original</h2><p>Could not convert the file. ${error.message}</p>`;
        modifiedContainer.innerHTML = `<h2>Modified</h2><p>Could not convert the file. ${error.message}</p>`;
    }
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }

function simplifyModifiedView(tolerance) {
    if (!originalSvgContent) {
        return;
    }

    try {
        const result = optimize(originalSvgContent, {
            path: originalFileName,
            plugins: [
                {
                    name: 'preset-default',
                    params: {
                        overrides: {
                            cleanupIds: false,
                            removeViewBox: false,
                            convertPathData: {
                                floatPrecision: tolerance,
                            },
                        },
                    },
                },
                'removeDimensions',
            ],
        });

        modifiedSvgContent = result.data;
        
        // Re-display the modified SVG, preserving its current transform state
        displaySvg(modifiedSvgContent, modifiedContainer, modifiedState);
        updateStatsView();
    } catch (error) {
        console.error('Error during SVGO simplification:', error);
    }
}

function svgToAndroidXml(svgString) {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgNode = svgDoc.querySelector('svg');

    if (!svgNode) {
        throw new Error('Invalid SVG for XML conversion.');
    }

    const viewBox = svgNode.getAttribute('viewBox').split(' ');
    const width = viewBox[2];
    const height = viewBox[3];

    let xml = `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="${width}dp"
    android:height="${height}dp"
    android:viewportWidth="${width}"
    android:viewportHeight="${height}">\n`;

    const paths = svgNode.querySelectorAll('path');
    paths.forEach(path => {
        const d = path.getAttribute('d');
        const fill = path.getAttribute('fill') || '#000000';
        xml += `    <path
        android:fillColor="${fill}"
        android:pathData="${d}"/>\n`;
    });

    xml += '</vector>';
    return xml;
}

function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- New Zoom and Pan Logic ---

function handleZoom(event) {
    event.preventDefault();

    const container = event.currentTarget;
    const state = (container === originalContainer) ? originalState : modifiedState;
    
    const rect = container.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const zoomFactor = 1.1;
    const scaleChange = (event.deltaY < 0) ? zoomFactor : 1 / zoomFactor;
    const newScale = Math.max(0.1, state.scale * scaleChange);

    // Adjust translation to zoom towards the mouse pointer
    state.translateX = mouseX - (mouseX - state.translateX) * scaleChange;
    state.translateY = mouseY - (mouseY - state.translateY) * scaleChange;
    state.scale = newScale;

    // Sync the other panel
    if (container === originalContainer) {
        modifiedState.scale = originalState.scale;
        modifiedState.translateX = originalState.translateX;
        modifiedState.translateY = originalState.translateY;
        applyTransform(modifiedContainer, modifiedState);
    } else {
        originalState.scale = modifiedState.scale;
        originalState.translateX = modifiedState.translateX;
        originalState.translateY = modifiedState.translateY;
        applyTransform(originalContainer, originalState);
    }

    applyTransform(container, state);
}

function startPan(event) {
    if (event.button !== 0) return; // Only pan with left mouse button
    isPanning = true;
    panStartX = event.clientX;
    panStartY = event.clientY;
    originalContainer.classList.add('grabbing');
    modifiedContainer.classList.add('grabbing');
}

function handlePan(event) {
    if (!isPanning) return;
    const dx = event.clientX - panStartX;
    const dy = event.clientY - panStartY;

    originalState.translateX += dx;
    originalState.translateY += dy;
    modifiedState.translateX += dx;
    modifiedState.translateY += dy;

    applyTransform(originalContainer, originalState);
    applyTransform(modifiedContainer, modifiedState);

    panStartX = event.clientX;
    panStartY = event.clientY;
}

function stopPan() {
    isPanning = false;
    originalContainer.classList.remove('grabbing');
    modifiedContainer.classList.remove('grabbing');
}

function resetZoomAndPan() {
    originalState = { scale: 1, translateX: 0, translateY: 0 };
    modifiedState = { scale: 1, translateX: 0, translateY: 0 };
    applyTransform(originalContainer, originalState);
    applyTransform(modifiedContainer, modifiedState);
}

function zoomAtCenter(container, scaleChange) {
    const state = (container === originalContainer) ? originalState : modifiedState;
    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const newScale = Math.max(0.1, state.scale * scaleChange);
    state.translateX = centerX - (centerX - state.translateX) * scaleChange;
    state.translateY = centerY - (centerY - state.translateY) * scaleChange;
    state.scale = newScale;
    if (container === originalContainer) {
        modifiedState.scale = originalState.scale;
        modifiedState.translateX = originalState.translateX;
        modifiedState.translateY = originalState.translateY;
        applyTransform(modifiedContainer, modifiedState);
    } else {
        originalState.scale = modifiedState.scale;
        originalState.translateX = modifiedState.translateX;
        originalState.translateY = modifiedState.translateY;
        applyTransform(originalContainer, originalState);
    }
    applyTransform(container, state);
}

function calculateSvgStats(svgString) {
    if (!svgString) {
        return { pathCount: 0, pathLength: 0 };
    }

    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
    const paths = svgDoc.querySelectorAll('path');

    const pathLength = Array.from(paths).reduce((total, path) => {
        const d = path.getAttribute('d');
        return total + (d ? d.length : 0);
    }, 0);

    return {
        pathCount: paths.length,
        pathLength: pathLength
    };
}

function updateStatsView() {
    if (!originalSvgContent || !modifiedSvgContent) {
        statsContainer.innerHTML = '';
        return;
    }

    const originalStats = calculateSvgStats(originalSvgContent);
    const modifiedStats = calculateSvgStats(modifiedSvgContent);

    const pathCountChange = originalStats.pathCount > 0 
        ? ((modifiedStats.pathCount - originalStats.pathCount) / originalStats.pathCount) * 100
        : 0;

    const pathLengthChange = originalStats.pathLength > 0
        ? ((modifiedStats.pathLength - originalStats.pathLength) / originalStats.pathLength) * 100
        : 0;

    statsContainer.innerHTML = `
        <table class="table table-sm table-bordered m-0">
            <thead>
                <tr>
                    <th>Metric</th>
                    <th>Original</th>
                    <th>Modified</th>
                    <th>Change</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Path Count</td>
                    <td>${originalStats.pathCount}</td>
                    <td>${modifiedStats.pathCount}</td>
                    <td>${pathCountChange.toFixed(2)}%</td>
                </tr>
                <tr>
                    <td>Data Length</td>
                    <td>${originalStats.pathLength}</td>
                    <td>${modifiedStats.pathLength}</td>
                    <td>${pathLengthChange.toFixed(2)}%</td>
                </tr>
            </tbody>
        </table>
    `;
}

// --- Event Listeners ---

fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    originalFileName = file.name;
    originalFileType = file.name.endsWith('.xml') ? 'xml' : 'svg';
    statsContainer.innerHTML = ''; // Clear stats on new file

    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result;
        if (originalFileType === 'xml') {
            handleAndroidVector(content);
        } else {
            loadAndDisplay(content);
        }
    };
    reader.readAsText(file);
});



// Function to update the tolerance value display
function updateToleranceDisplay(value) {
    const toleranceValue = document.getElementById('tolerance-value');
    // Map slider values to descriptive text
    const labels = {
        1: 'None',
        2: 'Very Low',
        3: 'Low',
        4: 'Light',
        5: 'Medium',
        6: 'Strong',
        7: 'High',
        8: 'Maximum'
    };
    toleranceValue.textContent = labels[value];
}

// Initialize tolerance display
updateToleranceDisplay(simplifyToleranceSlider.value);

simplifyToleranceSlider.addEventListener('input', () => {
    if (!originalSvgContent) return; // Don't simplify if nothing is loaded
    
    // Get the slider value
    const sliderValue = parseFloat(simplifyToleranceSlider.value);
    
    // Invert the tolerance value: higher slider value = more simplification
    // Map slider values 1-8 to tolerance values 8-1
    const invertedTolerance = 9 - sliderValue;
    
    // Update the display
    updateToleranceDisplay(sliderValue);
    
    // Apply the simplification
    simplifyModifiedView(invertedTolerance);
});

// Function to show the custom modal
function showCustomModal() {
    customSaveModal.classList.add('show');
}

// Function to hide the custom modal
function hideCustomModal() {
    customSaveModal.classList.remove('show');
}

saveButton.addEventListener('click', () => {
    if (!modifiedSvgContent) {
        alert('There is no modified image to save. Please simplify an image first.');
        return;
    }

    // Set default file name in the modal
    const baseName = originalFileName.substring(0, originalFileName.lastIndexOf('.'));
    const extension = originalFileType === 'xml' ? '.xml' : '.svg';
    fileNameInput.value = `${baseName}_simplified${extension}`;
    
    // Reset replace original checkbox
    replaceOriginalCheckbox.checked = false;
    
    // Show the custom save dialog
    showCustomModal();
});

// Close modal when clicking the close button
closeModalBtn.addEventListener('click', hideCustomModal);

// Close modal when clicking the cancel button
cancelSaveBtn.addEventListener('click', hideCustomModal);

// Close modal when clicking outside the modal content
customSaveModal.addEventListener('click', (e) => {
    if (e.target === customSaveModal) {
        hideCustomModal();
    }
});

// Handle save confirmation
confirmSaveButton.addEventListener('click', () => {
    // Get the file name from the input
    const fileName = fileNameInput.value.trim();
    if (!fileName) {
        alert('Please enter a file name.');
        return;
    }
    
    // Add extension if not present
    const extension = originalFileType === 'xml' ? '.xml' : '.svg';
    const finalFileName = fileName.endsWith(extension) ? fileName : `${fileName}${extension}`;
    
    // Prepare content based on file type
    let fileContent;
    let mimeType;

    if (originalFileType === 'xml') {
        try {
            fileContent = svgToAndroidXml(modifiedSvgContent);
            mimeType = 'application/xml';
        } catch (error) {
            alert(`Could not convert back to XML: ${error.message}`);
            return;
        }
    } else {
        fileContent = modifiedSvgContent;
        mimeType = 'image/svg+xml';
    }

    // If replace original is checked, use the original file name
    const downloadFileName = replaceOriginalCheckbox.checked ? originalFileName : finalFileName;
    
    // Download the file
    downloadFile(fileContent, downloadFileName, mimeType);
    
    // Close the modal
    hideCustomModal();
});

// --- Event Listeners for Zoom and Pan ---

// Use wheel event for zooming
originalContainer.addEventListener('wheel', handleZoom);
modifiedContainer.addEventListener('wheel', handleZoom);

// Use button clicks for zoom in/out/reset
zoomInButton.addEventListener('click', () => {
    zoomAtCenter(originalContainer, 1.2);
});

zoomOutButton.addEventListener('click', () => {
    zoomAtCenter(originalContainer, 1 / 1.2);
});

zoomResetButton.addEventListener('click', resetZoomAndPan);

// Panning listeners
originalContainer.addEventListener('mousedown', startPan);
modifiedContainer.addEventListener('mousedown', startPan);

document.addEventListener('mousemove', handlePan);
document.addEventListener('mouseup', stopPan);
document.addEventListener('mouseleave', stopPan); // Stop pan if mouse leaves window

// Toggle stats visibility
toggleStatsButton.addEventListener('click', () => {
    statsVisible = !statsVisible;
    if (statsVisible) {
        statsContainer.classList.remove('hidden');
        toggleStatsButton.textContent = 'Hide Stats';
    } else {
        statsContainer.classList.add('hidden');
        toggleStatsButton.textContent = 'Show Stats';
    }
});

// Background color picker event listener
bgColorPicker.addEventListener('input', (e) => {
    const color = e.target.value;
    applyBackgroundColor(color);
});

// Initialize background color
applyBackgroundColor(bgColorPicker.value);
