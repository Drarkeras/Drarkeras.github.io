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
        const response = await fetch('model-data.json');
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

    // 1. Layout Columnas (Visualizador 3D + Texto)
    const columns = document.createElement('div');
    columns.className = 'model-columns';

    // Columna Izquierda: Visor + Controles sobrepuestos
    const colLeft = document.createElement('div');
    colLeft.className = 'model-col-left';
    colLeft.id = 'inline-viewer-container';

    colLeft.innerHTML = `
    <div id="inline-model-viewer" class="inline-model-viewer"></div>
    <div class="viewer-controls">
    <button class="viewer-btn active" data-mode="normal">Normal</button>
    <button class="viewer-btn" data-mode="wireframe">Wireframe</button>
    <button class="viewer-btn" data-mode="diffuse">Diffuse</button>
    <button class="viewer-btn expand-btn" title="Ver en grande">⛶ Ampliar</button>
    </div>
    `;

    // Evento para abrir el modal en grande
    colLeft.querySelector('.expand-btn').addEventListener('click', () => {
        open3DModal(data.model.path);
    });

    // Columna Derecha: Texto
    const colRight = document.createElement('div');
    colRight.className = 'model-col-right';
    colRight.innerHTML = `
    <h3 class="model-title">${data.model.title}</h3>
    <p class="model-desc">${data.model.description}</p>
    ${data.model.sketchfabUrl ? `<a href="${data.model.sketchfabUrl}" target="_blank" class="btn-primary" style="align-self: flex-start; margin-top: 1.5rem;">Ver en Sketchfab</a>` : ''}
    `;

    columns.appendChild(colLeft);
    columns.appendChild(colRight);
    wrapper.appendChild(columns);

    // 2. Carrusel de Tarjetas
    const carousel = document.createElement('div');
    carousel.className = 'model-carousel';

    // Inicializar el Lightbox con las imágenes
    setupModelLightbox(data.carousel);

    // Añadimos el (item, index) para saber qué imagen abrir al clicar
    data.carousel.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'model-card';
        card.innerHTML = `
        <img src="${item.image}" alt="${item.title}" class="model-card-img">
        <h4 class="model-card-title">${item.title}</h4>
        `;

        // Evento para abrir el modal en la imagen correspondiente
        card.addEventListener('click', () => openModelLightbox(index));

        carousel.appendChild(card);
    });

    wrapper.appendChild(carousel);
    container.appendChild(wrapper);
}

/* ==========================================================================
 *  SISTEMA DE RENDERIZADO THREE.JS Y CAMBIO DE MODOS
 *  ========================================================================== */
function setup3DViewer(containerId, modelPath, isModal = false) {
    const parentContainer = document.getElementById(containerId);
    if (!parentContainer) return;

    const canvasContainer = isModal
    ? parentContainer.querySelector('#modal-model-viewer')
    : parentContainer.querySelector('#inline-model-viewer');

    if (!canvasContainer) return;

    let scene = new THREE.Scene();
    let camera = new THREE.PerspectiveCamera(45, canvasContainer.clientWidth / canvasContainer.clientHeight, 0.1, 100);
    camera.position.set(0, 1.2, 3);

    let renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    canvasContainer.appendChild(renderer.domElement);

    let controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    let autoRotate = true;
    controls.addEventListener('start', () => autoRotate = false);
    controls.addEventListener('end', () => autoRotate = true);

    // Iluminación
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    scene.add(hemiLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);

    new RGBELoader().load('./resources/studio.hdr', (hdr) => {
        hdr.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = hdr;
    }, undefined, () => console.log('HDR no encontrado, usando luces base.'));

    // Carga de Modelo y Mapa de Materiales Originales
    let model;
    let originalMaterials = new Map();

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

    // Lógica de Modos de Renderizado (Normal, Wireframe, Diffuse)
    const modeButtons = parentContainer.querySelectorAll('.viewer-btn[data-mode]');
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyRenderMode(btn.dataset.mode);
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
        } else if (mode === 'wireframe') {
            model.traverse((child) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshStandardMaterial({
                        color: 0x808080,
                        roughness: 0.8,
                        metalness: 0.1
                    });
                    let edges = child.getObjectByName('customEdges');
                    if (!edges) {
                        const edgeGeo = new THREE.WireframeGeometry(child.geometry);
                        const lineMat = new THREE.LineBasicMaterial({
                            color: 0x000000,
                            transparent: true,
                            opacity: 0.6
                        });
                        edges = new THREE.LineSegments(edgeGeo, lineMat);
                        edges.name = 'customEdges';
                        child.add(edges);
                    }
                    edges.visible = true;
                }
            });
        } else if (mode === 'diffuse') {
            model.traverse((child) => {
                if (child.isMesh) {
                    const originalMat = originalMaterials.get(child.uuid);
                    const baseMap = originalMat ? originalMat.map : null;
                    child.material = new THREE.MeshBasicMaterial({
                        map: baseMap,
                        color: baseMap ? 0xffffff : (originalMat ? originalMat.color : 0xffffff)
                    });
                    const customEdges = child.getObjectByName('customEdges');
                    if (customEdges) customEdges.visible = false;
                }
            });
        }
    }

    // Adaptación a Resize
    const resizeHandler = () => {
        if (!canvasContainer || !renderer) return;
        camera.aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    };
    window.addEventListener('resize', resizeHandler);

    // Animación
    function animate() {
        const animId = requestAnimationFrame(animate);
        if (isModal) modalAnimationId = animId;

        if (!isModal) {
            const rect = canvasContainer.getBoundingClientRect();
            if (rect.bottom < 0 || rect.top > window.innerHeight) return; // Pausa si está fuera de pantalla
        }

        if (model && autoRotate) model.rotation.y += 0.003;
        controls.update();
        renderer.render(scene, camera);
    }
    animate();
}

/* ==========================================================================
 *  SISTEMA DE MODAL DEDICADO PARA VER EN GRANDE EL MODELO
 *  ========================================================================== */
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
        <button class="viewer-btn active" data-mode="normal">Normal</button>
        <button class="viewer-btn" data-mode="wireframe">Wireframe</button>
        <button class="viewer-btn" data-mode="diffuse">Diffuse</button>
        </div>
        </div>
        `;
        document.body.appendChild(modal);

        // Cierre del modal
        modal.querySelector('.lightbox-close').addEventListener('click', close3DModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) close3DModal();
        });
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Iniciar render 3D dentro del modal en grande
    setTimeout(() => {
        setup3DViewer('modal-viewer-container', modelPath, true);
    }, 50);
}

function close3DModal() {
    const modal = document.getElementById('model-3d-lightbox');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
    if (modalAnimationId) {
        cancelAnimationFrame(modalAnimationId);
        modalAnimationId = null;
    }
    const canvasContainer = document.getElementById('modal-model-viewer');
    if (canvasContainer) {
        canvasContainer.innerHTML = ''; // Limpia el canvas al cerrar para liberar GPU
    }
}

/* ==========================================================================
 *  SISTEMA DE MODAL (LIGHTBOX) PARA EL CARRUSEL 3D
 *  ========================================================================== */
let carouselImages = [];
let currentCarouselIndex = 0;
let modelLightboxOverlay, modelLightboxImg;

function setupModelLightbox(imagesData) {
    carouselImages = imagesData;

    // Crear e inyectar el HTML solo si no existe
    if (!document.getElementById('model-carousel-lightbox')) {
        const html = `
        <div id="model-carousel-lightbox" class="lightbox-overlay">
        <div class="lightbox-content">
        <span class="lightbox-close">&times;</span>
        <button class="lightbox-btn prev">&larr;</button>
        <img class="lightbox-img" src="" alt="">
        <button class="lightbox-btn next">&rarr;</button>
        </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    }

    modelLightboxOverlay = document.getElementById('model-carousel-lightbox');
    modelLightboxImg = modelLightboxOverlay.querySelector('.lightbox-img');
    const closeBtn = modelLightboxOverlay.querySelector('.lightbox-close');
    const nextBtn = modelLightboxOverlay.querySelector('.lightbox-btn.next');
    const prevBtn = modelLightboxOverlay.querySelector('.lightbox-btn.prev');

    // Eventos de botones
    closeBtn.addEventListener('click', closeModelLightbox);
    nextBtn.addEventListener('click', (e) => { e.stopPropagation(); navigateModelLightbox(1); });
    prevBtn.addEventListener('click', (e) => { e.stopPropagation(); navigateModelLightbox(-1); });

    // Cerrar al clicar fuera de la imagen (en el fondo oscuro)
    modelLightboxOverlay.addEventListener('click', (e) => {
        if (e.target === modelLightboxOverlay || e.target.classList.contains('lightbox-content')) {
            closeModelLightbox();
        }
    });
}

function openModelLightbox(index) {
    currentCarouselIndex = index;
    updateModelLightboxImage();
    modelLightboxOverlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Bloquea el scroll del fondo
}

function closeModelLightbox() {
    if (modelLightboxOverlay) {
        modelLightboxOverlay.classList.remove('active');
        document.body.style.overflow = ''; // Devuelve el scroll al fondo
    }
}

function navigateModelLightbox(direction) {
    currentCarouselIndex += direction;

    // Si llega al final, vuelve a la primera y viceversa
    if (currentCarouselIndex >= carouselImages.length) currentCarouselIndex = 0;
    if (currentCarouselIndex < 0) currentCarouselIndex = carouselImages.length - 1;

    updateModelLightboxImage();
}

function updateModelLightboxImage() {
    const item = carouselImages[currentCarouselIndex];
    modelLightboxImg.src = item.image;
    modelLightboxImg.alt = item.title;
}

// Soporte para flechas del teclado y escape
document.addEventListener('keydown', (e) => {
    if (modelLightboxOverlay && modelLightboxOverlay.classList.contains('active')) {
        if (e.key === 'Escape') closeModelLightbox();
        if (e.key === 'ArrowRight') navigateModelLightbox(1);
        if (e.key === 'ArrowLeft') navigateModelLightbox(-1);
    }
});

// Soporte para tecla Escape al cerrar el modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close3DModal();
});
