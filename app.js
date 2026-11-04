document.addEventListener('DOMContentLoaded', () => {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const submitBtn = document.getElementById('submit-btn');
    const togglePasswordBtn = document.getElementById('toggle-password');
    
    // Form validation to enable/disable login button
    function validateForm() {
        const userVal = usernameInput.value.trim();
        const passVal = passwordInput.value.trim();
        
        if (userVal.length > 0 && passVal.length >= 6) {
            submitBtn.removeAttribute('disabled');
        } else {
            submitBtn.setAttribute('disabled', 'true');
        }
    }

    usernameInput.addEventListener('input', validateForm);
    passwordInput.addEventListener('input', () => {
        if (passwordInput.value.length > 0) {
            togglePasswordBtn.classList.remove('hidden');
        } else {
            togglePasswordBtn.classList.add('hidden');
            passwordInput.type = 'password';
            togglePasswordBtn.textContent = 'Show';
        }
        validateForm();
    });

    // Show / Hide password toggle
    togglePasswordBtn.addEventListener('click', () => {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            togglePasswordBtn.textContent = 'Hide';
        } else {
            passwordInput.type = 'password';
            togglePasswordBtn.textContent = 'Show';
        }
    });

    // Phone Mockup Image Rotation slideshow
    const slides = document.querySelectorAll('.slide-img');
    let currentSlide = 0;
    
    if (slides.length > 0) {
        setInterval(() => {
            slides[currentSlide].classList.remove('opacity-100');
            slides[currentSlide].classList.add('opacity-0');
            
            currentSlide = (currentSlide + 1) % slides.length;
            
            slides[currentSlide].classList.remove('opacity-0');
            slides[currentSlide].classList.add('opacity-100');
        }, 4000);
    }
});
