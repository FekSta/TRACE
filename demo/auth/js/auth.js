// ============================================
// TRACE Authentication Functions
// ============================================

// Toggle Password Visibility
document.addEventListener("DOMContentLoaded", () => {

    const toggleButtons = document.querySelectorAll(".toggle-password");

    toggleButtons.forEach(button => {

        button.addEventListener("click", () => {

            const input = document.getElementById(
                button.dataset.target
            );

            const icon = button.querySelector("span");

            if (!input) return;

            if (input.type === "password") {
                input.type = "text";
                icon.textContent = "visibility_off";
            } else {
                input.type = "password";
                icon.textContent = "visibility";
            }

        });

    });

});


// Email Validation
function isValidEmail(email) {

    const pattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return pattern.test(email);

}


// Password Validation
function isStrongPassword(password) {

    // Minimum 8 characters
    // At least one letter
    // At least one number

    const pattern =
        /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

    return pattern.test(password);

}


// Display Error
function showError(id, message) {

    const element = document.getElementById(id);

    if (!element) return;

    element.textContent = message;

}


// Clear Error
function clearError(id) {

    const element = document.getElementById(id);

    if (!element) return;

    element.textContent = "";

}



// ============================================
// Login Form
// ============================================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", function (e) {

        e.preventDefault();

        let valid = true;

        const email =
            document.getElementById("email").value.trim();

        const password =
            document.getElementById("password").value;

        clearError("emailError");
        clearError("passwordError");

        if (!isValidEmail(email)) {

            showError(
                "emailError",
                "Please enter a valid email."
            );

            valid = false;

        }

        if (!isStrongPassword(password)) {

            showError(
                "passwordError",
                "Password must be at least 8 characters."
            );

            valid = false;

        }

        if (valid) {

            window.location.href =
                "login-success.html";

        }

    });

}



// ============================================
// Register Form
// ============================================

const registerForm =
    document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener("submit", function (e) {

        e.preventDefault();

        let valid = true;

        const email =
            document.getElementById("email").value.trim();

        const password =
            document.getElementById("password").value;

        const confirm =
            document.getElementById("confirmPassword").value;

        clearError("emailError");
        clearError("passwordError");

        if (!isValidEmail(email)) {

            showError(
                "emailError",
                "Please enter a valid email."
            );

            valid = false;

        }

        if (!isStrongPassword(password)) {

            showError(
                "passwordError",
                "Password must contain at least 8 characters and a number."
            );

            valid = false;

        }

        if (password !== confirm) {

            showError(
                "passwordError",
                "Passwords do not match."
            );

            valid = false;

        }

        if (valid) {

            window.location.href =
                "register-success.html";

        }

    });

}
