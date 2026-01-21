import * as THREE from 'three';
    import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';
    import { GLTFLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
    import { RGBELoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/RGBELoader.js';

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 1.2, 3);

    const renderer = new THREE.WebGLRenderer({
  antialias: false,
  alpha: true
});


    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    document.getElementById('viewer').appendChild(renderer.domElement);
const viewer = document.getElementById('viewer');
renderer.setSize(viewer.clientWidth, viewer.clientHeight);


    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);

    let model;
    let autoRotate = true;

    new RGBELoader()
      .load('./resources/studio.hdr', (hdr) => {
        hdr.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = hdr;
      });

    const loader = new GLTFLoader();
    loader.load('./resources/tuktukDrarkeras.glb', (gltf) => {
      model = gltf.scene;
      model.traverse((child) => {
        if (child.isMesh) {
          child.material.side = THREE.FrontSide;
          child.material.depthWrite = true;
          child.material.depthTest = true;
        }
      });

      scene.add(model);
    });

    controls.addEventListener('start', () => autoRotate = false);
    controls.addEventListener('end', () => autoRotate = true);

    document.getElementById('wireframeBtn').addEventListener('click', () => {
      if (!model) return;
      model.traverse((child) => {
        if (child.isMesh) {
          child.material.wireframe = !child.material.wireframe;
        }
      });
    });

    function animate() {
      requestAnimationFrame(animate);
      if (model && autoRotate) model.rotation.y += 0.003;
      controls.update();
      renderer.render(scene, camera);
    }
requestAnimationFrame(() => {
  const width = viewer.clientWidth;
  const height = viewer.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});
window.addEventListener('resize', () => {
		const width = viewer.clientWidth;
		const height = viewer.clientHeight;

		camera.aspect = width / height;
		camera.updateProjectionMatrix();
		renderer.setSize(width, height);
});
    animate();