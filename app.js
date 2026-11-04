document.addEventListener('DOMContentLoaded', () => {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const submitBtn = document.getElementById('submitBtn');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const loginForm = document.getElementById('loginForm');

    // Enable / Disable Login Button based on input validation
    function validateForm() {
        const userVal = usernameInput.value.trim();
        const passVal = passwordInput.value.trim();

        if (userVal.length > 0 && passVal.length >= 6) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-30', 'cursor-pointer');
            submitBtn.classList.add('opacity-100', 'cursor-pointer');
        } else {
            submitBtn.disabled = true;
            submitBtn.classList.add('opacity-30');
            submitBtn.classList.remove('opacity-100');
        }
    }

    usernameInput.addEventListener('input', validateForm);
    passwordInput.addEventListener('input', (e) => {
        if (e.target.value.length > 0) {
            togglePasswordBtn.classList.remove('hidden');
        } else {
            togglePasswordBtn.classList.add('hidden');
            passwordInput.type = 'password';
            togglePasswordBtn.textContent = 'Show';
        }
        validateForm();
    });

    // Toggle Password Visibility
    togglePasswordBtn.addEventListener('click', () => {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            togglePasswordBtn.textContent = 'Hide';
        } else {
            passwordInput.type = 'password';
            togglePasswordBtn.textContent = 'Show';
        }
    });

    // Form submit simulation
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = usernameInput.value;
        alert(`Simulating login for: ${user}`);
    });

    // Rotating phone mockup images
    const slides = document.querySelectorAll('.phone-slide');
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
