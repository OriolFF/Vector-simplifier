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
const statsContainer = document.getElementById('stats-container');

// --- State Variables ---
let currentScale = 1;
let originalSvgContent = null;
let modifiedSvgContent = null;
let originalFileType = ''; // 'svg' or 'xml'
let originalFileName = '';

// --- Core Functions ---

function displaySvg(svgString, container) {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgElement = svgDoc.querySelector('svg');

    if (svgElement) {
        svgElement.removeAttribute('width');
        svgElement.removeAttribute('height');
        
        container.innerHTML = '';
        container.appendChild(svgElement);
        updateZoom();
    } else {
        container.innerHTML = '<p>Could not render SVG.</p>';
    }
}

function loadAndDisplay(svgString) {
    originalSvgContent = svgString;
    modifiedSvgContent = svgString; // Initially, modified is same as original
    displaySvg(originalSvgContent, originalContainer);
    displaySvg(modifiedSvgContent, modifiedContainer);
    resetZoom();
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
                            // Correctly disable a default plugin
                            cleanupIds: false,
                            // Keep viewBox for proper scaling
                            removeViewBox: false,
                            // Configure path precision
                            convertPathData: {
                                floatPrecision: tolerance,
                            },
                        },
                    },
                },
                // Add a non-default plugin
                'removeDimensions',
            ],
        });

        modifiedSvgContent = result.data;
        displaySvg(modifiedSvgContent, modifiedContainer);
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

function updateZoom() {
    const svgElements = document.querySelectorAll('.image-container svg');
    svgElements.forEach(svg => {
        svg.style.transform = `scale(${currentScale})`;
    });
}

function resetZoom() {
    currentScale = 1;
    updateZoom();
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



simplifyToleranceSlider.addEventListener('input', () => {
    if (!originalSvgContent) return; // Don't simplify if nothing is loaded
    const tolerance = parseFloat(simplifyToleranceSlider.value);
    simplifyModifiedView(tolerance);
});

saveButton.addEventListener('click', () => {
    if (!modifiedSvgContent) {
        alert('There is no modified image to save. Please simplify an image first.');
        return;
    }

    const baseName = originalFileName.substring(0, originalFileName.lastIndexOf('.'));
    const extension = originalFileType === 'xml' ? '.xml' : '.svg';
    const newFileName = `${baseName}_simplified${extension}`;

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

    downloadFile(fileContent, newFileName, mimeType);
});

zoomInButton.addEventListener('click', () => {
    currentScale *= 1.2;
    updateZoom();
});

zoomOutButton.addEventListener('click', () => {
    currentScale /= 1.2;
    updateZoom();
});

zoomResetButton.addEventListener('click', () => {
    resetZoom();
});
