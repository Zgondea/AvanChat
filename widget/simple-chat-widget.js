(function() {
  console.log('Simple widget loading...');
  
  document.addEventListener('DOMContentLoaded', function() {
    console.log('Creating simple widget...');
    
    // Create button
    const button = document.createElement('button');
    button.innerHTML = '💬';
    button.style.cssText = `
      position: fixed !important;
      bottom: 20px !important;
      right: 20px !important;
      width: 60px !important;
      height: 60px !important;
      background: #1976d2 !important;
      color: white !important;
      border: none !important;
      border-radius: 50% !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 24px !important;
      z-index: 999999 !important;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
    `;
    
    // Add click handler
    button.addEventListener('click', function() {
      alert('Chat widget clicked! It works!');
    });
    
    document.body.appendChild(button);
    console.log('Simple widget button added to DOM');
  });
})();