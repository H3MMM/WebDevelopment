const API_BASE = ''; // Relative path

// Theme Management
const themeToggle = document.getElementById('themeToggle');

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
}

// Initialize Theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    setTheme(savedTheme);
} else {
    setTheme('amber'); // Default
}

themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    setTheme(currentTheme === 'blue' ? 'amber' : 'blue');
});

// Tab Switching
const tabs = document.querySelectorAll('.auth-tab');
const forms = document.querySelectorAll('.auth-form');
const errorDisplay = document.getElementById('errorDisplay');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Reset active states
        tabs.forEach(t => t.classList.remove('active'));
        forms.forEach(f => f.style.display = 'none');
        errorDisplay.textContent = '';

        // Activate clicked tab
        tab.classList.add('active');
        const targetId = tab.getAttribute('data-target');
        document.getElementById(targetId).style.display = 'block';
    });
});

// Login Logic
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUser').value;
    const password = document.getElementById('loginPass').value;

    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', username);
            window.location.href = 'index.html';
        } else {
            showError(data.msg || 'LOGIN_FAILED');
        }
    } catch (err) {
        showError('CONNECTION_ERROR');
    }
});

// Signup Logic
document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('signupUser').value;
    const password = document.getElementById('signupPass').value;

    try {
        const res = await fetch(`${API_BASE}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.ok) {
            // Auto login after signup or ask user to login
            alert('USER_INITIALIZED. PLEASE LOGIN.');
            tabs[0].click(); // Switch to login tab
        } else {
            showError(data.msg || 'INIT_FAILED');
        }
    } catch (err) {
        showError('CONNECTION_ERROR');
    }
});

function showError(msg) {
    errorDisplay.textContent = `[ERROR]: ${msg}`;
    // Blink effect
    errorDisplay.style.opacity = 0;
    setTimeout(() => errorDisplay.style.opacity = 1, 100);
}