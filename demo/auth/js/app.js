// ============================================
// TRACE Shared JavaScript
// ============================================

document.addEventListener("DOMContentLoaded", () => {

    fadeIn();

    buttonEffects();

});



// ============================================
// Fade-in Animation
// ============================================

function fadeIn() {

    const container =
        document.querySelector(".auth-container");

    if (!container) return;

    container.animate(

        [
            {
                opacity: 0,
                transform: "translateY(20px)"
            },

            {
                opacity: 1,
                transform: "translateY(0)"
            }

        ],

        {
            duration: 700,
            easing: "ease",
            fill: "forwards"
        }

    );

}



// ============================================
// Button Hover Animation
// ============================================

function buttonEffects() {

    const buttons =
        document.querySelectorAll(".btn");

    buttons.forEach(button => {

        button.addEventListener("mouseenter", () => {

            button.style.transform =
                "translateY(-2px)";

        });

        button.addEventListener("mouseleave", () => {

            button.style.transform =
                "translateY(0)";

        });

    });

}



// ============================================
// Smooth Focus Effect
// ============================================

document.querySelectorAll(".input").forEach(input => {

    input.addEventListener("focus", () => {

        input.parentElement.classList.add("focused");

    });

    input.addEventListener("blur", () => {

        input.parentElement.classList.remove("focused");

    });

});



// ============================================
// Auto-remove Errors While Typing
// ============================================

document.querySelectorAll(".input").forEach(input => {

    input.addEventListener("input", () => {

        const error =
            input.parentElement.querySelector(".error");

        if (error) {

            error.textContent = "";

        }

    });

});



// ============================================
// Footer Year
// ============================================

const footerYear =
    document.getElementById("year");

if (footerYear) {

    footerYear.textContent =
        new Date().getFullYear();

}
