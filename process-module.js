document.addEventListener('DOMContentLoaded', () => {
    initProcessModule();
});

async function initProcessModule() {
    const container = document.getElementById('process-module-container');
    if (!container) return;

    try {
        const response = await fetch('process-data.json');
        if (!response.ok) throw new Error('No se pudo cargar process-data.json');
        const data = await response.json();

        renderProcessModule(container, data);
    } catch (error) {
        console.error('Error inicializando el módulo:', error);
    }
}

function renderProcessModule(container, data) {
    // 1. ESTRUCTURA PRINCIPAL
    const wrapper = document.createElement('div');
    wrapper.className = 'process-module-wrapper';

    // Carrusel
    const carousel = document.createElement('div');
    carousel.className = 'process-carousel';

    // Contenedor estético original (El de tu style.css)
    const processContainer = document.createElement('div');
    processContainer.className = 'process-container';

    const processTabs = document.createElement('div');
    processTabs.className = 'process-tabs';

    const processDisplay = document.createElement('div');
    processDisplay.className = 'process-content';

    // Contenido interno del display
    const contentInner = document.createElement('div');
    contentInner.className = 'process-content-inner';
    const displayTitle = document.createElement('h3');
    const displayDesc = document.createElement('p');
    contentInner.appendChild(displayTitle);
    contentInner.appendChild(displayDesc);
    processDisplay.appendChild(contentInner);

    // Arrays para referencias lógicas
    const imageElements = [];
    const tabElements = {};
    let isAutoScrolling = false; // Evita bucles cuando el JS mueve el scroll

    // 2. CREAR IMÁGENES DEL CARRUSEL
    data.images.forEach((imgData, index) => {
        const isVideo = /\.mp4$/i.test(imgData.src);
        let el;
        if (isVideo) {
            el = document.createElement('video');
            el.src = imgData.src;
            el.alt = imgData.alt || '';
            el.className = 'process-image-item process-video-item';
            el.dataset.group = imgData.groupId;
            el.dataset.index = index; // Para el modal
            el.autoplay = true;
            el.loop = true;
            el.muted = true;
            el.playsInline = true;
            // Al clicar el video, abrimos el lightbox para reproducirlo en grande
            el.addEventListener('click', () => {
                openLightbox(data.images, index);
            });
        } else {
            el = document.createElement('img');
            el.src = imgData.src;
            el.alt = imgData.alt;
            el.className = 'process-image-item';
            el.dataset.group = imgData.groupId;
            el.dataset.index = index; // Para el modal

            // Al clicar una imagen, se abre el Modal
            el.addEventListener('click', () => {
                openLightbox(data.images, index);
            });
        }

        carousel.appendChild(el);
        imageElements.push(el);
    });

    // 3. CREAR PESTAÑAS (TABS)
    data.groups.forEach((group, index) => {
        const tab = document.createElement('div');
        tab.className = 'tab';
        tab.textContent = group.buttonText;
        tab.dataset.group = group.id;

        // Al clicar una pestaña
        tab.addEventListener('click', () => {
            isAutoScrolling = true; // Bloqueamos el observer temporalmente
            activateGroup(group.id);

            // Buscar la primera imagen de este grupo y scrollear hacia ella
            const firstImg = imageElements.find(i => i.dataset.group === group.id);
            if (firstImg) {
                firstImg.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }

            // Desbloquear el observer cuando termine el scroll
            setTimeout(() => { isAutoScrolling = false; }, 600);
        });

        processTabs.appendChild(tab);
        tabElements[group.id] = tab;
    });

    // Ensamblaje DOM
    processContainer.appendChild(processTabs);
    processContainer.appendChild(processDisplay);

    wrapper.appendChild(carousel);
    wrapper.appendChild(processContainer);
    container.appendChild(wrapper);

    // 4. LÓGICA DE ACTUALIZACIÓN VISUAL
    function activateGroup(groupId) {
        // Actualizar pestañas
        Object.values(tabElements).forEach(t => t.classList.remove('active'));
        if (tabElements[groupId]) tabElements[groupId].classList.add('active');

        // Actualizar textos con transición
        const groupData = data.groups.find(g => g.id === groupId);
        if (groupData) {
            contentInner.style.opacity = '0';
            setTimeout(() => {
                displayTitle.textContent = groupData.title;
                displayDesc.textContent = groupData.description;
                contentInner.style.opacity = '1';
                contentInner.style.transition = 'opacity 0.3s ease';
            }, 150);
        }

        // Actualizar highlight de imágenes en carrusel
        imageElements.forEach(img => {
            if (img.dataset.group === groupId) {
                img.classList.add('active-group');
            } else {
                img.classList.remove('active-group');
            }
        });
    }

    // 5. OBSERVER PARA EL SCROLL MANUAL DEL CARRUSEL
    // Detecta qué imagen está en el centro del carrusel para cambiar la pestaña activa
    const observer = new IntersectionObserver((entries) => {
        if (isAutoScrolling) return; // Si el scroll fue por clic en pestaña, ignoramos

        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const groupId = entry.target.dataset.group;
                activateGroup(groupId);
            }
        });
    }, {
        root: carousel,
        threshold: 0.6 // Se dispara cuando el 60% de la imagen es visible
    });

    imageElements.forEach(img => observer.observe(img));

    // Inicializar el primer grupo
    if (data.groups.length > 0) activateGroup(data.groups[0].id);

    // 6. INYECCIÓN Y LÓGICA DEL MODAL (LIGHTBOX)
    setupLightbox();
}

/* ==========================================================================
 *  SISTEMA DE MODAL (LIGHTBOX)
 *  ========================================================================== */
let currentImages = [];
let currentIndex = 0;
let lightboxOverlay, lightboxMedia;

function setupLightbox() {
    // Inyectar HTML del Lightbox al final del body
    const html = `
    <div id="process-lightbox" class="lightbox-overlay">
    <div class="lightbox-content">
    <span class="lightbox-close">&times;</span>
    <button class="lightbox-btn prev">&larr;</button>
    <div class="lightbox-media"></div>
    <button class="lightbox-btn next">&rarr;</button>
    </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);

    lightboxOverlay = document.getElementById('process-lightbox');
    lightboxMedia = lightboxOverlay.querySelector('.lightbox-media');
    const closeBtn = lightboxOverlay.querySelector('.lightbox-close');
    const nextBtn = lightboxOverlay.querySelector('.lightbox-btn.next');
    const prevBtn = lightboxOverlay.querySelector('.lightbox-btn.prev');

    // Eventos
    closeBtn.addEventListener('click', closeLightbox);
    nextBtn.addEventListener('click', (e) => { e.stopPropagation(); navigateLightbox(1); });
    prevBtn.addEventListener('click', (e) => { e.stopPropagation(); navigateLightbox(-1); });

    // Clicar fuera de la imagen (en el overlay) para cerrar
    lightboxOverlay.addEventListener('click', (e) => {
        if (e.target === lightboxOverlay || e.target.classList.contains('lightbox-content')) {
            closeLightbox();
        }
    });

    // Soporte para flechas del teclado
    document.addEventListener('keydown', (e) => {
        if (!lightboxOverlay.classList.contains('active')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') navigateLightbox(1);
        if (e.key === 'ArrowLeft') navigateLightbox(-1);
    });
}

function openLightbox(imagesData, startIndex) {
    currentImages = imagesData;
    currentIndex = startIndex;
    updateLightboxImage();
    lightboxOverlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Evita scroll en la web de fondo
}

function closeLightbox() {
    lightboxOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

function navigateLightbox(direction) {
    currentIndex += direction;
    // Bucle infinito (Si llegas al final, vuelve a la primera y viceversa)
    if (currentIndex >= currentImages.length) currentIndex = 0;
    if (currentIndex < 0) currentIndex = currentImages.length - 1;
    updateLightboxImage();
}

function updateLightboxImage() {
    const data = currentImages[currentIndex];
    // Limpiar contenido previo
    lightboxMedia.innerHTML = '';
    if (/\.mp4$/i.test(data.src)) {
        const v = document.createElement('video');
        v.src = data.src;
        v.alt = data.alt || '';
        v.controls = true;
        v.autoplay = true;
        v.loop = true;
        v.muted = true;
        v.playsInline = true;
        v.className = 'lightbox-video';
        lightboxMedia.appendChild(v);
    } else {
        const img = document.createElement('img');
        img.className = 'lightbox-img';
        img.src = data.src;
        img.alt = data.alt || 'Imagen de proceso';
        lightboxMedia.appendChild(img);
    }
}
