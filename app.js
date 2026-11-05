function handleOAuthRedirect(provider) {
  const status = document.getElementById('statusMessage');
  status.style.color = '#38bdf8';
  status.textContent = `Redirecting to official OAuth endpoint for ${provider}...`;
  
  // In a production application, perform standard OAuth 2.0 redirect:
  // window.location.href = `https://auth.example.com/oauth/authorize?client_id=...`;
}

function handleStandardLogin(event) {
  event.preventDefault();
  const status = document.getElementById('statusMessage');
  status.style.color = '#4ade80';
  status.textContent = 'Authentication request initiated securely.';
}