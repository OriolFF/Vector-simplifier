export function showResizeTool(originalContent, originalFileType) {

    // Check if there's an SVG loaded
    if (!document.querySelector('#modified-container svg')) {
        alert('Please load and modify an SVG image first.');
        return;
    }

    // Create a custom modal for the resize tool
    const modal = document.createElement('div');
    modal.className = 'custom-modal show';
    modal.innerHTML = `
        <div class="custom-modal-content">
            <div class="custom-modal-header">
                <h5 class="custom-modal-title">Resize Image</h5>
                <button type="button" class="custom-close-btn">&times;</button>
            </div>
            <div class="custom-modal-body">
                <form id="resize-form">
                    <div class="mb-3">
                        <label for="resize-size" class="form-label">Select Size (px):</label>
                        <div class="d-flex gap-2 mb-2">
                            <button type="button" class="btn btn-outline-primary size-preset" data-size="24">24×24</button>
                            <button type="button" class="btn btn-outline-primary size-preset" data-size="48">48×48</button>
                            <button type="button" class="btn btn-outline-primary size-preset" data-size="512">512×512</button>
                        </div>
                        <div class="input-group">
                            <input type="number" class="form-control" id="resize-width" placeholder="Width" min="1" required>
                            <span class="input-group-text">×</span>
                            <input type="number" class="form-control" id="resize-height" placeholder="Height" min="1" required>
                            <span class="input-group-text">px</span>
                        </div>
                        <div class="form-check mt-2">
                            <input class="form-check-input" type="checkbox" id="maintain-aspect-ratio" checked>
                            <label class="form-check-label" for="maintain-aspect-ratio">
                                Maintain aspect ratio
                            </label>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Export Format:</label>
                        <div class="d-flex gap-2">
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="export-format" id="format-svg" value="svg">
                                <label class="form-check-label" for="format-svg">SVG</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="export-format" id="format-xml" value="xml">
                                <label class="form-check-label" for="format-xml">XML</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="export-format" id="format-png" value="png">
                                <label class="form-check-label" for="format-png">PNG</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="export-format" id="format-webp" value="webp">
                                <label class="form-check-label" for="format-webp">WebP</label>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="custom-modal-footer">
                <button type="button" class="btn btn-secondary close-modal-btn">Cancel</button>
                <button type="button" class="btn btn-primary" id="resize-confirm-btn">Export</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);

    // Set the default export format based on the original file type
    if (originalFileType === 'xml') {
        modal.querySelector('#format-xml').checked = true;
    } else if (originalFileType === 'svg') {
        modal.querySelector('#format-svg').checked = true;
    } else {
        modal.querySelector('#format-png').checked = true; // Default to PNG for other cases
    }
    
    // Get the original SVG dimensions to set as default
    const svgElement = document.querySelector('#modified-container svg');
    if (svgElement) {
        const viewBox = svgElement.getAttribute('viewBox');
        if (viewBox) {
            const [, , width, height] = viewBox.split(' ').map(Number);
            document.getElementById('resize-width').value = width;
            document.getElementById('resize-height').value = height;
        }
    }
    
    // Add event listeners for size presets
    const sizePresets = modal.querySelectorAll('.size-preset');
    sizePresets.forEach(button => {
        button.addEventListener('click', () => {
            const size = parseInt(button.dataset.size, 10);
            const widthInput = document.getElementById('resize-width');
            const heightInput = document.getElementById('resize-height');
            
            // Set both width and height to the preset size
            widthInput.value = size;
            heightInput.value = size;
        });
    });
    
    // Add event listener for aspect ratio maintenance
    const widthInput = document.getElementById('resize-width');
    const heightInput = document.getElementById('resize-height');
    const aspectRatioCheckbox = document.getElementById('maintain-aspect-ratio');
    
    let aspectRatio = 1;
    if (svgElement) {
        const viewBox = svgElement.getAttribute('viewBox');
        if (viewBox) {
            const [, , width, height] = viewBox.split(' ').map(Number);
            aspectRatio = width / height;
        }
    }
    
    widthInput.addEventListener('input', () => {
        if (aspectRatioCheckbox.checked) {
            const newWidth = parseFloat(widthInput.value) || 0;
            heightInput.value = Math.round(newWidth / aspectRatio);
        }
    });
    
    heightInput.addEventListener('input', () => {
        if (aspectRatioCheckbox.checked) {
            const newHeight = parseFloat(heightInput.value) || 0;
            widthInput.value = Math.round(newHeight * aspectRatio);
        }
    });
    
    // Add event listener for the export button
    const exportButton = document.getElementById('resize-confirm-btn');
    exportButton.addEventListener('click', () => {
        const width = parseInt(widthInput.value, 10);
        const height = parseInt(heightInput.value, 10);
        const format = document.querySelector('input[name="export-format"]:checked').value;

        const svgElement = document.querySelector('#modified-container svg');
        if (!svgElement) {
            alert('Error: Could not find SVG element');
            return;
        }

        // Get the original filename from the SVG element's data attributes
        let filename = 'resized.svg';
        const storedFilename = svgElement.getAttribute('data-original-filename');
        if (storedFilename) {
            filename = storedFilename;
        }

        const lastDotIndex = filename.lastIndexOf('.');
        let nameWithoutExt = filename;
        if (lastDotIndex !== -1) {
            nameWithoutExt = filename.substring(0, lastDotIndex);
        }

        const sizeSuffix = width === height ? `_${width}` : `_${width}x${height}`;
        const downloadFilename = `${nameWithoutExt}${sizeSuffix}.${format}`;

        if (format === 'svg') {
            // SVG export logic
            const svgClone = svgElement.cloneNode(true);
            svgClone.setAttribute('width', width);
            svgClone.setAttribute('height', height);

            const serializer = new XMLSerializer();
            let svgString = serializer.serializeToString(svgClone);

            if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
                svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
            }
            svgString = '<?xml version="1.0" encoding="UTF-8"?>' + svgString;

            const mimeType = 'image/svg+xml';
            const blob = new Blob([svgString], { type: mimeType });
            const url = URL.createObjectURL(blob);

            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = downloadFilename;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(url);

        } else if (format === 'xml' && originalFileType === 'xml') {
            // XML (Android Vector Drawable) export logic
            try {
                const svgElement = document.querySelector('#modified-container svg');
                const serializer = new XMLSerializer();
                const modifiedSvgString = serializer.serializeToString(svgElement);

                const parser = new DOMParser();
                const svgDoc = parser.parseFromString(modifiedSvgString, 'image/svg+xml');
                const svgNode = svgDoc.querySelector('svg');

                if (!svgNode) {
                    throw new Error('Invalid SVG for XML conversion.');
                }

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

                const mimeType = 'application/xml';
                const blob = new Blob([xml], { type: mimeType });
                const url = URL.createObjectURL(blob);

                const downloadLink = document.createElement('a');
                downloadLink.href = url;
                downloadLink.download = downloadFilename;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                URL.revokeObjectURL(url);

            } catch (error) {
                alert(`Error exporting XML: ${error.message}`);
                console.error('Error exporting XML:', error);
            }
        } else {
            // PNG/WebP export logic
            const svgClone = svgElement.cloneNode(true);
            svgClone.setAttribute('width', width);
            svgClone.setAttribute('height', height);

            const serializer = new XMLSerializer();
            let svgString = serializer.serializeToString(svgClone);

            if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
                svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            const img = new Image();

            const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            img.onload = () => {
                ctx.drawImage(img, 0, 0);
                URL.revokeObjectURL(url);

                const dataUrl = canvas.toDataURL(`image/${format}`);
                const downloadLink = document.createElement('a');
                downloadLink.href = dataUrl;
                downloadLink.download = downloadFilename;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
            };

            img.src = url;
        }

        // Close the modal
        modal.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(modal);
        }, 300);
    });
    
    // Add event listeners to close the modal
    const closeButtons = modal.querySelectorAll('.custom-close-btn, .close-modal-btn');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            modal.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(modal);
            }, 300); // Wait for animation to complete
        });
    });
    
    // Close modal when clicking outside of it
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(modal);
            }, 300); // Wait for animation to complete
        }
    });
}