import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

let modalAnimationId = null;

document.addEventListener('DOMContentLoaded', () => {
    initModelSection();
});

async function initModelSection() {
    const container = document.getElementById('model-section-container');
    if (!container) return;

    try {
        const response = await fetch('./assets/data/model-data.json');
        if (!response.ok) throw new Error('No se pudo cargar model-data.json');

        const data = await response.json();
        buildDOM(container, data);
        setup3DViewer('inline-viewer-container', data.model.path, false);
    } catch (error) {
        console.error('Error inicializando el módulo 3D:', error);
    }
}

function buildDOM(container, data) {
    const wrapper = document.createElement('div');
    wrapper.className = 'model-module-wrapper';

    const columns = document.createElement('div');
    columns.className = 'model-columns';

    const leftColumn = document.createElement('div');
    leftColumn.className = 'model-col-left';
    leftColumn.id = 'inline-viewer-container';
    leftColumn.innerHTML = `
        <div id="inline-model-viewer" class="inline-model-viewer"></div>
        <div class="viewer-controls">
            <button class="viewer-btn active" data-mode="normal" type="button">Normal</button>
            <button class="viewer-btn" data-mode="wireframe" type="button">Wireframe</button>
            <button class="viewer-btn" data-mode="diffuse" type="button">Diffuse</button>
            <button class="viewer-btn expand-btn" title="Ver en grande" type="button">⛶ Ampliar</button>
        </div>
    `;

    leftColumn.querySelector('.expand-btn')?.addEventListener('click', () => {
        open3DModal(data.model.path);
    });

    const rightColumn = document.createElement('div');
    rightColumn.className = 'model-col-right';
    rightColumn.innerHTML = `
        <h3 class="model-title">${data.model.title}</h3>
        <p class="model-desc">${data.model.description}</p>
        ${data.model.sketchfabUrl ? `<a href="${data.model.sketchfabUrl}" target="_blank" rel="noreferrer" class="btn-primary" style="align-self: flex-start; margin-top: 1.5rem;">Ver en Sketchfab</a>` : ''}
    `;

    columns.append(leftColumn, rightColumn);
    wrapper.appendChild(columns);

    const carousel = document.createElement('div');
    carousel.className = 'model-carousel';
    setupModelLightbox(data.carousel);

    data.carousel.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'model-card';
        card.innerHTML = `
            <img src="${item.image}" alt="${item.title}" class="model-card-img">
            <h4 class="model-card-title">${item.title}</h4>
        `;
        card.addEventListener('click', () => openModelLightbox(index));
        carousel.appendChild(card);
    });

    wrapper.appendChild(carousel);
    container.appendChild(wrapper);
}

function setup3DViewer(containerId, modelPath, isModal = false) {
    const parentContainer = document.getElementById(containerId);
    if (!parentContainer) return;

    const canvasContainer = isModal
        ? parentContainer.querySelector('#modal-model-viewer')
        : parentContainer.querySelector('#inline-model-viewer');

    if (!canvasContainer) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, canvasContainer.clientWidth / canvasContainer.clientHeight, 0.1, 100);
    camera.position.set(0, 1.2, 3);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    canvasContainer.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    let autoRotate = true;
    controls.addEventListener('start', () => { autoRotate = false; });
    controls.addEventListener('end', () => { autoRotate = true; });

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);

    new RGBELoader().load('./resources/studio.hdr', (hdr) => {
        hdr.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = hdr;
    }, undefined, () => {
        console.debug('HDR no encontrado, usando luces base.');
    });

    let model;
    const originalMaterials = new Map();

    new GLTFLoader().load(modelPath, (gltf) => {
        model = gltf.scene;
        model.traverse((child) => {
            if (child.isMesh) {
                child.material.side = THREE.FrontSide;
                originalMaterials.set(child.uuid, child.material);
            }
        });
        scene.add(model);
    });

    const modeButtons = parentContainer.querySelectorAll('.viewer-btn[data-mode]');
    modeButtons.forEach((button) => {
        button.addEventListener('click', () => {
            modeButtons.forEach((element) => element.classList.remove('active'));
            button.classList.add('active');
            applyRenderMode(button.dataset.mode);
        });
    });

    function applyRenderMode(mode) {
        if (!model) return;

        if (mode === 'normal') {
            model.traverse((child) => {
                if (child.isMesh) {
                    child.material = originalMaterials.get(child.uuid);
                    const customEdges = child.getObjectByName('customEdges');
                    if (customEdges) customEdges.visible = false;
                }
            });
            return;
        }

        if (mode === 'wireframe') {
            model.traverse((child) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshStandardMaterial({
                        color: 0x808080,
                        roughness: 0.8,
                        metalness: 0.1,
                    });

                    let edges = child.getObjectByName('customEdges');
                    if (!edges) {
                        const edgeGeometry = new THREE.WireframeGeometry(child.geometry);
                        const edgeMaterial = new THREE.LineBasicMaterial({
                            color: 0x000000,
                            transparent: true,
                            opacity: 0.6,
                        });
                        edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
                        edges.name = 'customEdges';
                        child.add(edges);
                    }
                    edges.visible = true;
                }
            });
            return;
        }

        model.traverse((child) => {
            if (child.isMesh) {
                const originalMaterial = originalMaterials.get(child.uuid);
                const baseMap = originalMaterial ? originalMaterial.map : null;
                child.material = new THREE.MeshBasicMaterial({
                    map: baseMap,
                    color: baseMap ? 0xffffff : (originalMaterial ? originalMaterial.color : 0xffffff),
                });

                const customEdges = child.getObjectByName('customEdges');
                if (customEdges) customEdges.visible = false;
            }
        });
    }

    const resizeHandler = () => {
        if (!canvasContainer || !renderer) return;
        camera.aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    };

    window.addEventListener('resize', resizeHandler);

    function animate() {
        const animationId = requestAnimationFrame(animate);
        if (isModal) modalAnimationId = animationId;

        if (!isModal) {
            const rect = canvasContainer.getBoundingClientRect();
            if (rect.bottom < 0 || rect.top > window.innerHeight) return;
        }

        if (model && autoRotate) model.rotation.y += 0.003;
        controls.update();
        renderer.render(scene, camera);
    }

    animate();
}

function open3DModal(modelPath) {
    let modal = document.getElementById('model-3d-lightbox');

    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'model-3d-lightbox';
        modal.className = 'lightbox-overlay';
        modal.innerHTML = `
            <div class="lightbox-3d-content" id="modal-viewer-container">
                <span class="lightbox-close">&times;</span>
                <div id="modal-model-viewer" style="width: 100%; height: 100%;"></div>
                <div class="viewer-controls">
                    <button class="viewer-btn active" data-mode="normal" type="button">Normal</button>
                    <button class="viewer-btn" data-mode="wireframe" type="button">Wireframe</button>
                    <button class="viewer-btn" data-mode="diffuse" type="button">Diffuse</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    const closeButton = modal.querySelector('.lightbox-close');
    closeButton?.addEventListener('click', () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        if (modalAnimationId) {
            cancelAnimationFrame(modalAnimationId);
            modalAnimationId = null;
        }
    }, { once: true });

    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }, { once: true });

    setup3DViewer('modal-viewer-container', modelPath, true);
}

let lightboxState = {
    images: [],
    index: 0,
    overlay: null,
    media: null,
};

function setupModelLightbox(images) {
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

    overlay.querySelector('.lightbox-close')?.addEventListener('click', closeModelLightbox);
    overlay.querySelector('.lightbox-btn.prev')?.addEventListener('click', (event) => {
        event.stopPropagation();
        navigateModelLightbox(-1);
    });
    overlay.querySelector('.lightbox-btn.next')?.addEventListener('click', (event) => {
        event.stopPropagation();
        navigateModelLightbox(1);
    });

    overlay.addEventListener('click', (event) => {
        if (event.target === overlay || event.target.classList.contains('lightbox-content')) {
            closeModelLightbox();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (!overlay.classList.contains('active')) return;
        if (event.key === 'Escape') closeModelLightbox();
        if (event.key === 'ArrowRight') navigateModelLightbox(1);
        if (event.key === 'ArrowLeft') navigateModelLightbox(-1);
    });

    lightboxState.images = images;
}

function openModelLightbox(index) {
    const { overlay, media } = lightboxState;
    if (!overlay || !media) return;

    lightboxState.index = index;
    const image = lightboxState.images[index];
    if (!image) return;

    media.innerHTML = `<img src="${image.image}" alt="${image.title}" class="lightbox-img">`;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModelLightbox() {
    const { overlay } = lightboxState;
    if (!overlay) return;

    overlay.classList.remove('active');
    document.body.style.overflow = '';
}

function navigateModelLightbox(direction) {
    const { images } = lightboxState;
    if (!images.length) return;

    lightboxState.index = (lightboxState.index + direction + images.length) % images.length;
    openModelLightbox(lightboxState.index);
}
