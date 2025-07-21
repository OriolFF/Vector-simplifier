const fileInput = document.getElementById('file-input');
const imageContainer = document.getElementById('image-container');
let currentScale = 1;

function displaySvg(svgString) {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgElement = svgDoc.querySelector('svg');

    if (svgElement) {
        // Remove fixed dimensions to allow proper scaling and prevent cropping
        svgElement.removeAttribute('width');
        svgElement.removeAttribute('height');
        
        imageContainer.innerHTML = ''; // Clear previous content
        imageContainer.appendChild(svgElement);
        resetZoom(); // Reset zoom for the new image
    } else {
        imageContainer.innerHTML = '<p>Could not render SVG.</p>';
    }
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
            displaySvg(content);
        } else if (file.name.endsWith('.xml')) {
            // Placeholder for Android Vector Drawable handling
            handleAndroidVector(content);
        } else {
            imageContainer.innerHTML = '<p>Unsupported file type.</p>';
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

        displaySvg(svgContent);
    } catch (error) {
        console.error('Error converting Android Vector Drawable:', error);
        imageContainer.innerHTML = `<p>Could not convert the Android Vector Drawable file. ${error.message}</p>`;
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
    const svgElement = imageContainer.querySelector('svg');
    if (!svgElement) {
        alert('Please load an SVG or Vector Drawable first.');
        return;
    }

    // Create a hidden canvas for Paper.js to work with
    const canvas = document.createElement('canvas');
    paper.setup(canvas);

    // Import the SVG into the Paper.js project
    paper.project.importSVG(svgElement, {
        onLoad: (item) => {
            // Iterate over all paths in the imported SVG
            const paths = item.getItems({ class: paper.Path, recursive: true });
            paths.forEach(path => {
                // Simplify each path. A lower tolerance means less simplification.
                path.simplify(2.5);
            });

            // Export the project back to an SVG string
            const simplifiedSvgString = paper.project.exportSVG({ asString: true });

            // Update the image container with the simplified SVG
            displaySvg(simplifiedSvgString);

            // Clean up the paper scope
            paper.project.clear();
        },
        expandShapes: true
    });
});

function updateZoom() {
    const svgElement = imageContainer.querySelector('svg');
    if (svgElement) {
        svgElement.style.transform = `scale(${currentScale})`;
    }
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
