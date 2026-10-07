const navbar = document.getElementById('navbar');
const themeToggle = document.getElementById('theme-toggle');
const html = document.documentElement;
const firstSection = document.getElementById('about');

// Control del Scroll y Navbar
window.addEventListener('scroll', () => {
    const scrollPosition = window.scrollY;
    const firstSectionTop = firstSection.offsetTop;

    if (scrollPosition > 80) {
        navbar.classList.add('visible');
    } else {
        navbar.classList.remove('visible');
    }

    if (scrollPosition <= firstSectionTop + 50) {
        html.classList.add('snap-active');
    } else {
        html.classList.remove('snap-active');
    }
});

// Control de Tema Claro / Oscuro
themeToggle.addEventListener('click', () => {
    const currentTheme = html.getAttribute('data-theme');

    if (currentTheme === 'light') {
        html.removeAttribute('data-theme');
        themeToggle.textContent = '🌙';
    } else {
        html.setAttribute('data-theme', 'light');
        themeToggle.textContent = '☀️';
    }
});

// Copiar correo electrónico y mostrar Toast
function copyEmail() {
    const email = "adrianlorenzolasarte@outlook.com"; // Cambiar por tu correo real
    navigator.clipboard.writeText(email).then(() => {
        const toast = document.getElementById("toast");
        toast.classList.add("show");

        setTimeout(() => {
            toast.classList.remove("show");
        }, 3000);
    });
}

// Abrir y cerrar la imagen del Bento Grid en grande
function openBentoImage(src) {
    const lightbox = document.getElementById('bento-lightbox');
    const img = document.getElementById('bento-lightbox-img');
    img.src = src;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden'; // Evita que se haga scroll de fondo
}

function closeBentoImage() {
    const lightbox = document.getElementById('bento-lightbox');
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
}
