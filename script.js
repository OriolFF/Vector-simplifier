const fileInput = document.getElementById('file-input');
const originalContainer = document.getElementById('original-container');
const modifiedContainer = document.getElementById('modified-container');
let originalSvgContent = '';
let currentScale = 1;

function displaySvg(svgString, container) {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgElement = svgDoc.querySelector('svg');

    if (svgElement) {
        svgElement.removeAttribute('width');
        svgElement.removeAttribute('height');
        
        // Clear previous content, but keep the h2
        const h2 = container.querySelector('h2');
        container.innerHTML = '';
        if (h2) container.appendChild(h2);

        container.appendChild(svgElement);
    } else {
        const h2 = container.querySelector('h2');
        container.innerHTML = '';
        if (h2) container.appendChild(h2);
        container.insertAdjacentHTML('beforeend', '<p>Could not render SVG.</p>');
    }
}

function loadAndDisplay(svgString) {
    originalSvgContent = svgString;
    displaySvg(originalSvgContent, originalContainer);
    displaySvg(originalSvgContent, modifiedContainer);
    resetZoom();
}

fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result;
        // For now, we'll just directly inject the SVG content.
        // We will add more sophisticated parsing for Android XML later.
        if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) {
            loadAndDisplay(content);
        } else if (file.name.endsWith('.xml')) {
            handleAndroidVector(content);
        } else {
            originalContainer.innerHTML = '<h2>Original</h2><p>Unsupported file type.</p>';
            modifiedContainer.innerHTML = '<h2>Modified</h2><p>Unsupported file type.</p>';
        }
    };
    reader.readAsText(file);
});

function handleAndroidVector(xmlString) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
        const vectorNode = xmlDoc.querySelector('vector');

        if (!vectorNode) {
            throw new Error('Invalid Android Vector Drawable XML: <vector> tag not found.');
        }

        const width = vectorNode.getAttribute('android:width').replace('dp', '');
        const height = vectorNode.getAttribute('android:height').replace('dp', '');
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
                    // Basic group handling, can be extended for transformations
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

const simplifyPathButton = document.getElementById('simplify-path');
const zoomInButton = document.getElementById('zoom-in');
const zoomOutButton = document.getElementById('zoom-out');
const zoomResetButton = document.getElementById('zoom-reset');

simplifyPathButton.addEventListener('click', () => {
    if (!originalSvgContent) {
        alert('Please load an SVG or Vector Drawable first.');
        return;
    }

    const canvas = document.createElement('canvas');
    paper.setup(canvas);

    paper.project.importSVG(originalSvgContent, {
        onLoad: (item) => {
            const paths = item.getItems({ class: paper.Path, recursive: true });
            paths.forEach(path => {
                path.simplify(2.5);
            });

            const simplifiedSvgString = paper.project.exportSVG({ asString: true });
            displaySvg(simplifiedSvgString, modifiedContainer);

            paper.project.clear();
        },
        expandShapes: true
    });
});

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
