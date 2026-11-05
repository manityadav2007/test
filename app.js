// Shared Interactive Application Logic for Instagram & Telegram Login Flow

document.addEventListener('DOMContentLoaded', () => {
  // Elements for Telegram Login Page
  const countrySelect = document.getElementById('countrySelect');
  const countryCodeInput = document.getElementById('countryCodeInput');
  const phoneInput = document.getElementById('phoneInput');
  const sendCodeBtn = document.getElementById('sendCodeBtn');
  const toggleQrBtn = document.getElementById('toggleQrBtn');
  const togglePhoneBtn = document.getElementById('togglePhoneBtn');
  const backToPhoneBtn = document.getElementById('backToPhoneBtn');
  
  const phoneView = document.getElementById('phoneView');
  const qrView = document.getElementById('qrView');
  const codeView = document.getElementById('codeView');
  const successView = document.getElementById('successView');
  
  const cardTitle = document.getElementById('cardTitle');
  const cardSubtitle = document.getElementById('cardSubtitle');
  const displayPhone = document.getElementById('displayPhone');
  const timerSpan = document.getElementById('timer');
  const otpInputs = document.querySelectorAll('.otp-box');

  let countdownInterval = null;

  // Telegram Country Code Sync
  if (countrySelect && countryCodeInput) {
    countrySelect.addEventListener('change', (e) => {
      countryCodeInput.value = e.target.value;
    });
  }

  // Toggle to QR Code View
  if (toggleQrBtn) {
    toggleQrBtn.addEventListener('click', () => {
      phoneView.classList.add('hidden');
      qrView.classList.remove('hidden');
      qrView.classList.add('animate-fade-in');
      cardTitle.textContent = 'Log in by QR Code';
      cardSubtitle.textContent = 'Scan the QR code with your Telegram mobile app';
    });
  }

  // Toggle back to Phone View
  if (togglePhoneBtn) {
    togglePhoneBtn.addEventListener('click', () => {
      qrView.classList.add('hidden');
      phoneView.classList.remove('hidden');
      phoneView.classList.add('animate-fade-in');
      cardTitle.textContent = 'Sign in to Telegram';
      cardSubtitle.textContent = 'Please confirm your country code and enter your phone number.';
    });
  }

  // Submit Phone Number -> Go to Verification Step
  if (sendCodeBtn) {
    sendCodeBtn.addEventListener('click', () => {
      const rawPhone = phoneInput ? phoneInput.value.trim() : '';
      const code = countryCodeInput ? countryCodeInput.value : '+91';
      const fullPhone = rawPhone ? `${code} ${rawPhone}` : `${code} 98765 43210`;
      
      if (displayPhone) displayPhone.textContent = fullPhone;

      phoneView.classList.add('hidden');
      codeView.classList.remove('hidden');
      codeView.classList.add('animate-fade-in');
      cardTitle.textContent = 'Enter Verification Code';
      cardSubtitle.textContent = 'Check your Telegram app or SMS messages for the code.';
      
      if (otpInputs.length > 0) otpInputs[0].focus();
      startTimer();
    });
  }

  // Back from OTP to Phone edit
  if (backToPhoneBtn) {
    backToPhoneBtn.addEventListener('click', () => {
      clearInterval(countdownInterval);
      codeView.classList.add('hidden');
      phoneView.classList.remove('hidden');
      phoneView.classList.add('animate-fade-in');
      cardTitle.textContent = 'Sign in to Telegram';
      cardSubtitle.textContent = 'Please confirm your country code and enter your phone number.';
    });
  }

  // Handle OTP Inputs auto-advance
  if (otpInputs.length > 0) {
    otpInputs.forEach((input, index) => {
      input.addEventListener('input', (e) => {
        if (e.target.value.length === 1 && index < otpInputs.length - 1) {
          otpInputs[index + 1].focus();
        }
        checkOtpComplete();
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
          otpInputs[index - 1].focus();
        }
      });
    });
  }

  function checkOtpComplete() {
    let filled = true;
    otpInputs.forEach(input => {
      if (!input.value) filled = false;
    });
    if (filled) {
      setTimeout(() => {
        codeView.classList.add('hidden');
        successView.classList.remove('hidden');
        successView.classList.add('animate-fade-in');
        cardTitle.textContent = 'Welcome Back!';
        cardSubtitle.textContent = 'Successfully authenticated with Telegram Web.';
      }, 300);
    }
  }

  // Verification Timer Simulation
  function startTimer() {
    let timeLeft = 45;
    if (timerSpan) timerSpan.textContent = '00:45';
    clearInterval(countdownInterval);
    
    countdownInterval = setInterval(() => {
      timeLeft--;
      const sec = timeLeft < 10 ? `0${timeLeft}` : timeLeft;
      if (timerSpan) timerSpan.textContent = `00:${sec}`;
      
      if (timeLeft <= 0) {
        clearInterval(countdownInterval);
        if (timerSpan) timerSpan.textContent = 'Resend now';
      }
    }, 1000);
  }
});