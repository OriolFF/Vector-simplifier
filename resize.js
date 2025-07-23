/**
 * Shows the resize tool dialog and handles the resize functionality
 */
export function showResizeTool() {
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
                                <input class="form-check-input" type="radio" name="export-format" id="format-png" value="png" checked>
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
        
        // Get the SVG content
        const svgElement = document.querySelector('#modified-container svg');
        if (!svgElement) {
            alert('Error: Could not find SVG element');
            return;
        }
        
        // Create a clone of the SVG to modify
        const svgClone = svgElement.cloneNode(true);
        
        // Get the original dimensions from viewBox
        const viewBox = svgElement.getAttribute('viewBox');
        if (!viewBox) {
            alert('Error: SVG does not have a viewBox attribute');
            return;
        }
        
        const [minX, minY, origWidth, origHeight] = viewBox.split(' ').map(Number);
        
        // Update the SVG attributes for the new size
        svgClone.setAttribute('width', width);
        svgClone.setAttribute('height', height);
        
        // Keep the viewBox the same to maintain the content's aspect ratio
        // The browser will handle the scaling
        
        // Get the original filename and file type from the SVG element's data attributes
        let filename = 'resized.svg';
        let fileType = 'svg';
        
        // Get the SVG element
        const currentSvgElement = document.querySelector('#modified-container svg');
        if (currentSvgElement) {
            const storedFilename = currentSvgElement.getAttribute('data-original-filename');
            const storedFileType = currentSvgElement.getAttribute('data-file-type');
            
            if (storedFilename) {
                filename = storedFilename;
                console.log('Using filename from SVG data attribute:', storedFilename);
            } else {
                console.log('No filename stored in SVG data attribute');
            }
            
            if (storedFileType) {
                fileType = storedFileType; // 'svg' or 'xml'
                console.log('Using file type from SVG data attribute:', storedFileType);
            }
        } else {
            console.log('SVG element not found');
        }

        // Convert the SVG element to a string
        const serializer = new XMLSerializer();
        let svgString = serializer.serializeToString(svgClone);
        
        // Ensure the SVG has the correct XML declaration and namespace
        if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
            svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        
        svgString = '<?xml version="1.0" encoding="UTF-8"?>' + svgString;
        
        // Use the file type we determined earlier to set the correct MIME type
        const mimeType = fileType === 'xml' ? 'application/xml' : 'image/svg+xml';
        
        // Create a Blob with the appropriate MIME type
        const blob = new Blob([svgString], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        // Create a download link
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        
        // Make sure we have valid values to work with
        if (!filename) {
            filename = fileType === 'xml' ? 'image.xml' : 'image.svg';
        }
        
        // We already know if it's an XML file from the fileType variable
        
        console.log('Processing filename for download:', filename);
        
        // Split the filename to insert the size suffix before the extension
        const lastDotIndex = filename.lastIndexOf('.');
        let nameWithoutExt = filename;
        let extension = '';
        
        if (lastDotIndex !== -1) {
            nameWithoutExt = filename.substring(0, lastDotIndex);
            extension = filename.substring(lastDotIndex); // Includes the dot
        }
        
        // Use only the width for the suffix if width and height are the same
        const sizeSuffix = width === height ? `_${width}` : `_${width}x${height}`;
        
        // Combine everything back together
        const downloadFilename = `${nameWithoutExt}${sizeSuffix}${extension}`;
        console.log('Final download filename:', downloadFilename);
        
        downloadLink.download = downloadFilename;
        
        // Trigger the download
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        // Clean up
        URL.revokeObjectURL(url);
        
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
