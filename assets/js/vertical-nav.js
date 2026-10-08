document.addEventListener('DOMContentLoaded', () => {
    let navContainer = document.querySelector('.vertical-nav');

    if (!navContainer) {
        navContainer = document.createElement('nav');
        navContainer.className = 'vertical-nav';
        navContainer.setAttribute('aria-label', 'Navegación de secciones');
        document.body.appendChild(navContainer);
    } else {
        navContainer.innerHTML = '';
    }

    const sections = Array.from(document.querySelectorAll('[data-nav]'));
    if (sections.length === 0) return;

    sections.forEach((section, index) => {
        if (!section.id) {
            const label = section.getAttribute('data-nav') || `section-${index + 1}`;
            section.id = label.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
        }
    });

    const createNavItem = (section) => {
        const item = document.createElement('a');
        const targetId = section.id;
        const labelText = section.getAttribute('data-nav');

        item.href = `#${targetId}`;
        item.className = 'nav-item';
        item.setAttribute('data-target', targetId);

        const label = document.createElement('span');
        label.className = 'nav-label';
        label.textContent = labelText;

        const dotWrapper = document.createElement('div');
        dotWrapper.className = 'dot-wrapper';

        const dot = document.createElement('span');
        dot.className = 'nav-dot';
        dotWrapper.appendChild(dot);

        item.append(label, dotWrapper);
        return item;
    };

    let activeGroup = null;
    let activeGroupName = null;

    sections.forEach((section) => {
        const groupName = section.getAttribute('data-nav-group');

        if (groupName) {
            if (!activeGroup || activeGroupName !== groupName) {
                activeGroup = document.createElement('div');
                activeGroup.className = 'nav-connected-group';
                navContainer.appendChild(activeGroup);
                activeGroupName = groupName;
            }
            activeGroup.appendChild(createNavItem(section));
        } else {
            activeGroup = null;
            activeGroupName = null;
            navContainer.appendChild(createNavItem(section));
        }
    });

    const navItems = navContainer.querySelectorAll('.nav-item');
    let isProgrammaticScrolling = false;

    const observerOptions = {
        root: null,
        rootMargin: '-20% 0px -20% 0px',
        threshold: 0.2,
    };

    const observer = new IntersectionObserver((entries) => {
        if (isProgrammaticScrolling) return;

        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            navItems.forEach((item) => item.classList.remove('active'));
            const targetId = entry.target.id;
            const activeItem = navContainer.querySelector(`.nav-item[data-target="${targetId}"]`);
            if (activeItem) activeItem.classList.add('active');
        });
    }, observerOptions);

    sections.forEach((section) => observer.observe(section));

    if (navItems.length > 0 && window.scrollY < 100) {
        navItems[0].classList.add('active');
    }

    navItems.forEach((item) => {
        item.addEventListener('click', (event) => {
            event.preventDefault();

            const targetId = item.getAttribute('data-target');
            const targetSection = document.getElementById(targetId);
            if (!targetSection) return;

            navItems.forEach((navItem) => navItem.classList.remove('active'));
            item.classList.add('active');

            isProgrammaticScrolling = true;
            document.documentElement.style.scrollSnapType = 'none';
            targetSection.scrollIntoView({ behavior: 'smooth' });

            window.setTimeout(() => {
                document.documentElement.style.scrollSnapType = '';
                isProgrammaticScrolling = false;
            }, 800);
        });
    });
});
