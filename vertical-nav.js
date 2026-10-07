document.addEventListener('DOMContentLoaded', () => {
    // 1. Obtener o crear dinámicamente el contenedor principal del nav vertical
    let navContainer = document.querySelector('.vertical-nav');
    if (!navContainer) {
        navContainer = document.createElement('nav');
        navContainer.className = 'vertical-nav';
        navContainer.setAttribute('aria-label', 'Navegación de secciones');
        document.body.appendChild(navContainer);
    } else {
        navContainer.innerHTML = '';
    }

    // 2. Buscar todas las secciones declaradas mediante el atributo data-nav
    const sections = Array.from(document.querySelectorAll('[data-nav]'));
    if (sections.length === 0) return;

    // Asegurar que cada elemento tenga un ID para los hipervínculos
    sections.forEach((sec, idx) => {
        if (!sec.id) {
            const label = sec.getAttribute('data-nav');
            sec.id = 'section-' + label.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
        }
    });

    // Función constructora para un ítem del nav
    function createNavItem(sec) {
        const id = sec.id;
        const labelText = sec.getAttribute('data-nav');

        const a = document.createElement('a');
        a.href = `#${id}`;
        a.className = 'nav-item';
        a.setAttribute('data-target', id);

        const labelSpan = document.createElement('span');
        labelSpan.className = 'nav-label';
        labelSpan.textContent = labelText;

        const dotWrapper = document.createElement('div');
        dotWrapper.className = 'dot-wrapper';
        const dot = document.createElement('span');
        dot.className = 'nav-dot';
        dotWrapper.appendChild(dot);

        a.appendChild(labelSpan);
        a.appendChild(dotWrapper);

        return a;
    }

    // 3. Agrupar dinámicamente elementos conexos vs solitarios
    let currentGroupContainer = null;
    let currentGroupName = null;

    sections.forEach(sec => {
        const groupName = sec.getAttribute('data-nav-group');

        if (groupName) {
            // Si el elemento pertenece a un grupo, crea o reutiliza el contenedor agrupado
            if (!currentGroupContainer || currentGroupName !== groupName) {
                currentGroupContainer = document.createElement('div');
                currentGroupContainer.className = 'nav-connected-group';
                navContainer.appendChild(currentGroupContainer);
                currentGroupName = groupName;
            }
            currentGroupContainer.appendChild(createNavItem(sec));
        } else {
            // Elemento solitario
            currentGroupContainer = null;
            currentGroupName = null;
            navContainer.appendChild(createNavItem(sec));
        }
    });

    const navItems = navContainer.querySelectorAll('.nav-item');
    let isProgrammaticScrolling = false;

    // 4. Observador para activar la bolita correspondiente al hacer scroll manual
    const observerOptions = {
        root: null,
        rootMargin: '-20% 0px -20% 0px',
        threshold: 0.2
    };

    const observer = new IntersectionObserver((entries) => {
        if (isProgrammaticScrolling) return;

        entries.forEach(entry => {
            if (entry.isIntersecting) {
                navItems.forEach(item => item.classList.remove('active'));

                const targetId = entry.target.id;
                const activeItem = navContainer.querySelector(`.nav-item[data-target="${targetId}"]`);
                if (activeItem) {
                    activeItem.classList.add('active');
                }
            }
        });
    }, observerOptions);

    sections.forEach(sec => observer.observe(sec));

    // Activar el primer punto si se está en la parte superior
    if (navItems.length > 0 && window.scrollY < 100) {
        navItems[0].classList.add('active');
    }

    // 5. Gestión del Clic con scroll suave
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('data-target');
            const targetSection = document.getElementById(targetId);

            if (!targetSection) return;

            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            isProgrammaticScrolling = true;

            // Desactivar snap durante el desplazamiento programático
            document.documentElement.style.scrollSnapType = 'none';
            targetSection.scrollIntoView({ behavior: 'smooth' });

            setTimeout(() => {
                document.documentElement.style.scrollSnapType = '';
                isProgrammaticScrolling = false;
            }, 800);
        });
    });
});
