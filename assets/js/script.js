document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.getElementById('navbar');
    const firstSection = document.getElementById('about');
    const html = document.documentElement;

    const updateNavbarState = () => {
        const scrollPosition = window.scrollY;
        const firstSectionTop = firstSection ? firstSection.offsetTop : 0;

        navbar?.classList.toggle('visible', scrollPosition > 80);
        html.classList.toggle('snap-active', scrollPosition <= firstSectionTop + 50);
    };

    window.addEventListener('scroll', updateNavbarState, { passive: true });
    updateNavbarState();

    const showToast = () => {
        const toast = document.getElementById('toast');
        if (!toast) return;

        toast.classList.add('show');
        window.clearTimeout(showToast.timeoutId);
        showToast.timeoutId = window.setTimeout(() => toast.classList.remove('show'), 3000);
    };

    window.copyEmail = function copyEmail() {
        const email = 'adrianlorenzolasarte@outlook.com';
        if (!navigator.clipboard) {
            showToast();
            return;
        }

        navigator.clipboard.writeText(email).finally(showToast);
    };

    window.closeBentoImage = function closeBentoImage() {
        const lightbox = document.getElementById('bento-lightbox');
        if (!lightbox) return;

        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    };
});
