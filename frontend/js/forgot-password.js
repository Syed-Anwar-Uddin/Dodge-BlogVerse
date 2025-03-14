// API Base URL
const API_BASE_URL = 'http://localhost:3000/api';

// Get DOM elements
const usernameStep = document.getElementById('usernameStep');
const securityStep = document.getElementById('securityStep');
const passwordStep = document.getElementById('passwordStep');

let resetToken = null;

// Step 1: Username Form
document.getElementById('usernameForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/get-security-question`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to get security question');
        }

        const data = await response.json();
        document.getElementById('securityQuestionText').textContent = data.securityQuestion;
        
        // Show security question step
        usernameStep.style.display = 'none';
        securityStep.style.display = 'block';
    } catch (error) {
        alert(error.message);
    }
});

// Step 2: Security Answer Form
document.getElementById('securityForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const answer = document.getElementById('securityAnswer').value;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/verify-security-answer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, answer })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Incorrect security answer');
        }

        const data = await response.json();
        resetToken = data.resetToken;
        
        // Show password reset step
        securityStep.style.display = 'none';
        passwordStep.style.display = 'block';
    } catch (error) {
        alert(error.message);
    }
});

// Step 3: Password Reset Form
document.getElementById('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                resetToken,
                newPassword
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to reset password');
        }

        alert('Password reset successful! Please login with your new password.');
        window.location.href = 'login.html';
    } catch (error) {
        alert(error.message);
    }
});
