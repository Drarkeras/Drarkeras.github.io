document.addEventListener('DOMContentLoaded', () => {
    initProcessModule();
});

async function initProcessModule() {
    const container = document.getElementById('process-module-container');
    if (!container) return;

    try {
        const response = await fetch('./assets/data/process-data.json');
        if (!response.ok) throw new Error('No se pudo cargar process-data.json');

        const data = await response.json();
        renderProcessModule(container, data);
    } catch (error) {
        console.error('Error inicializando el módulo:', error);
    }
}

function renderProcessModule(container, data) {
    const wrapper = document.createElement('div');
    wrapper.className = 'process-module-wrapper';

    const carousel = document.createElement('div');
    carousel.className = 'process-carousel';

    const processContainer = document.createElement('div');
    processContainer.className = 'process-container';

    const processTabs = document.createElement('div');
    processTabs.className = 'process-tabs';

    const processDisplay = document.createElement('div');
    processDisplay.className = 'process-content';

    const contentInner = document.createElement('div');
    contentInner.className = 'process-content-inner';
    const displayTitle = document.createElement('h3');
    const displayDesc = document.createElement('p');
    contentInner.append(displayTitle, displayDesc);
    processDisplay.appendChild(contentInner);

    const imageElements = [];
    const tabElements = {};
    let isAutoScrolling = false;

    data.images.forEach((imageData, index) => {
        const isVideo = /\.mp4$/i.test(imageData.src);
        let element;

        if (isVideo) {
            element = document.createElement('video');
            element.src = imageData.src;
            element.alt = imageData.alt || '';
            element.className = 'process-image-item process-video-item';
            element.dataset.group = imageData.groupId;
            element.dataset.index = index;
            element.preload = 'auto';
            element.autoplay = true;
            element.loop = true;
            element.muted = true;
            element.playsInline = true;
            element.setAttribute('playsinline', 'true');
            element.setAttribute('webkit-playsinline', 'true');
            element.setAttribute('autoplay', 'true');
            element.setAttribute('muted', 'true');
            element.setAttribute('loop', 'true');
            element.setAttribute('aria-label', imageData.alt || 'Video de proceso');
            element.disablePictureInPicture = true;
            element.controls = false;

            const tryPlayVideo = () => {
                element.muted = true;
                element.play().catch(() => {
                    window.setTimeout(() => element.play().catch(() => {}), 250);
                });
            };

            element.addEventListener('loadeddata', tryPlayVideo, { once: true });
            element.addEventListener('canplay', tryPlayVideo, { once: true });
            element.addEventListener('click', () => openLightbox(data.images, index));
        } else {
            element = document.createElement('img');
            element.src = imageData.src;
            element.alt = imageData.alt;
            element.className = 'process-image-item';
            element.dataset.group = imageData.groupId;
            element.dataset.index = index;
            element.addEventListener('click', () => openLightbox(data.images, index));
        }

        carousel.appendChild(element);
        imageElements.push(element);
    });

    data.groups.forEach((group) => {
        const tab = document.createElement('div');
        tab.className = 'tab';
        tab.textContent = group.buttonText;
        tab.dataset.group = group.id;

        tab.addEventListener('click', () => {
            isAutoScrolling = true;
            activateGroup(group.id);

            const firstImage = imageElements.find((image) => image.dataset.group === group.id);
            if (firstImage) {
                firstImage.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }

            window.setTimeout(() => {
                isAutoScrolling = false;
            }, 600);
        });

        processTabs.appendChild(tab);
        tabElements[group.id] = tab;
    });

    processContainer.append(processTabs, processDisplay);
    wrapper.append(carousel, processContainer);
    container.appendChild(wrapper);

    function activateGroup(groupId) {
        Object.values(tabElements).forEach((tab) => tab.classList.remove('active'));
        if (tabElements[groupId]) tabElements[groupId].classList.add('active');

        const groupData = data.groups.find((group) => group.id === groupId);
        if (groupData) {
            contentInner.style.opacity = '0';
            window.setTimeout(() => {
                displayTitle.textContent = groupData.title;
                displayDesc.textContent = groupData.description;
                contentInner.style.opacity = '1';
                contentInner.style.transition = 'opacity 0.3s ease';
            }, 150);
        }

        imageElements.forEach((image) => {
            image.classList.toggle('active-group', image.dataset.group === groupId);
        });
    }

    const observer = new IntersectionObserver((entries) => {
        if (isAutoScrolling) return;

        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const groupId = entry.target.dataset.group;
                activateGroup(groupId);
            }
        });
    }, {
        root: carousel,
        threshold: 0.6,
    });

    imageElements.forEach((image) => observer.observe(image));

    if (data.groups.length > 0) activateGroup(data.groups[0].id);
    setupLightbox();
}

let lightboxState = {
    images: [],
    index: 0,
    overlay: null,
    media: null,
};

function setupLightbox() {
    const overlay = document.createElement('div');
    overlay.id = 'process-lightbox';
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML = `
        <div class="lightbox-content">
            <span class="lightbox-close">&times;</span>
            <button class="lightbox-btn prev" type="button" aria-label="Anterior">&larr;</button>
            <div class="lightbox-media"></div>
            <button class="lightbox-btn next" type="button" aria-label="Siguiente">&rarr;</button>
        </div>
    `;
    document.body.appendChild(overlay);

    lightboxState.overlay = overlay;
    lightboxState.media = overlay.querySelector('.lightbox-media');

    overlay.querySelector('.lightbox-close')?.addEventListener('click', closeLightbox);
    overlay.querySelector('.lightbox-btn.prev')?.addEventListener('click', (event) => {
        event.stopPropagation();
        navigateLightbox(-1);
    });
    overlay.querySelector('.lightbox-btn.next')?.addEventListener('click', (event) => {
        event.stopPropagation();
        navigateLightbox(1);
    });

    overlay.addEventListener('click', (event) => {
        if (event.target === overlay || event.target.classList.contains('lightbox-content')) {
            closeLightbox();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (!overlay.classList.contains('active')) return;
        if (event.key === 'Escape') closeLightbox();
        if (event.key === 'ArrowRight') navigateLightbox(1);
        if (event.key === 'ArrowLeft') navigateLightbox(-1);
    });
}

function openLightbox(imagesData, startIndex) {
    lightboxState.images = imagesData;
    lightboxState.index = startIndex;
    updateLightboxImage();
    lightboxState.overlay?.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    lightboxState.overlay?.classList.remove('active');
    document.body.style.overflow = '';
}

function navigateLightbox(direction) {
    if (!lightboxState.images.length) return;

    lightboxState.index = (lightboxState.index + direction + lightboxState.images.length) % lightboxState.images.length;
    updateLightboxImage();
}

function updateLightboxImage() {
    const { overlay, media, images, index } = lightboxState;
    if (!overlay || !media || !images[index]) return;

    const item = images[index];
    const isVideo = /\.mp4$/i.test(item.src);

    if (isVideo) {
        media.innerHTML = `
            <video class="lightbox-img" autoplay loop muted playsinline controls>
                <source src="${item.src}" type="video/mp4">
            </video>
        `;
        return;
    }

    media.innerHTML = `<img src="${item.src}" alt="${item.alt}" class="lightbox-img">`;
}
