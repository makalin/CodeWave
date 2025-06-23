import { App } from './core/App.js';

// Initialize CodeWave application
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Show loading indicator
    const loading = document.getElementById('loading');
    loading.style.display = 'flex';

    // Initialize the application
    const app = new App();
    
    // Hide loading indicator
    loading.style.display = 'none';
    
    // Make app globally available for debugging
    window.CodeWave = app;
    
    console.log('CodeWave initialized successfully!');
  } catch (error) {
    console.error('Failed to initialize CodeWave:', error);
    
    // Hide loading and show error
    document.getElementById('loading').style.display = 'none';
    showError('Failed to initialize CodeWave: ' + error.message);
  }
});

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  showError('An unexpected error occurred: ' + event.error.message);
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  showError('An unexpected error occurred: ' + event.reason);
});

// Utility function to show errors
function showError(message) {
  const notification = document.getElementById('error-notification');
  const messageEl = document.getElementById('error-message');
  
  messageEl.textContent = message;
  notification.style.display = 'flex';
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    notification.style.display = 'none';
  }, 5000);
}

// Close error notification
document.addEventListener('click', (event) => {
  if (event.target.classList.contains('error-close')) {
    event.target.parentElement.style.display = 'none';
  }
}); 