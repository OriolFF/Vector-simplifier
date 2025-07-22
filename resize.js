export function showResizeTool() {
    // Create a custom modal for the resize tool
    const modal = document.createElement('div');
    modal.className = 'custom-modal show';
    modal.innerHTML = `
        <div class="custom-modal-content">
            <div class="custom-modal-header">
                <h5 class="custom-modal-title">Resize Tool</h5>
                <button type="button" class="custom-close-btn">&times;</button>
            </div>
            <div class="custom-modal-body">
                <p>Resize tool is selected!</p>
            </div>
            <div class="custom-modal-footer">
                <button type="button" class="btn btn-secondary close-modal-btn">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
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
