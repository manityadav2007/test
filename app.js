/**
 * Sakura Sanctuary — Golden Hour Edition
 * Complete Three.js Immersive 3D Experience
 */

// Main Application State
let scene, camera, renderer, controls;
let treeGroup, petalsParticleSystem;
let audioCtx, isAudioPlaying = false;
let clock = new THREE.Clock();

// Configuration & Lighting Themes
const themes = {
    golden: {
        skyTop: new THREE.Color('#311c18'),
        skyBottom: new THREE.Color('#d97757'),
        lightColor: new THREE.Color('#ffc885'),
        lightIntensity: 2.2,
        ambientColor: new THREE.Color('#5c3830'),
        ambientIntensity: 0.8,
        fogColor: new THREE.Color('#241512'),
        fogDensity: 0.015
    },
    sakura: {
        skyTop: new THREE.Color('#211b2b'),
        skyBottom: new THREE.Color('#b565a7'),
        lightColor: new THREE.Color('#ffd1dc'),
        lightIntensity: 1.8,
        ambientColor: new THREE.Color('#42304a'),
        ambientIntensity: 0.9,
        fogColor: new THREE.Color('#191321'),
        fogDensity: 0.018
    },
    zen: {
        skyTop: new THREE.Color('#0a0d14'),
        skyBottom: new THREE.Color('#1e3559'),
        lightColor: new THREE.Color('#a3c1ad'),
        lightIntensity: 1.2,
        ambientColor: new THREE.Color('#1f2836'),
        ambientIntensity: 0.7,
        fogColor: new THREE.Color('#0d1117'),
        fogDensity: 0.02
    }
};

let currentTheme = 'golden';
let mainLight, ambientLight, hemiLight;
let shaderSky;

// Initialize Application with Safety Timeout & Error Boundary
window.addEventListener('DOMContentLoaded', () => {
    const loader = document.getElementById('loader');
    const loaderTitle = document.getElementById('loader-title');
    const loaderSubtitle = document.getElementById('loader-subtitle');
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');

    // Safety timeout: hide loader after 8 seconds no matter what
    const safetyTimeout = setTimeout(() => {
        if (loader && loader.style.opacity !== '0') {
            console.warn('Safety timeout triggered: hiding loader.');
            fadeOutLoader();
        }
    }, 8000);

    try {
        init3D();
        setupUI();
        animate();

        // Successful init - clear timeout and fade loader
        clearTimeout(safetyTimeout);
        setTimeout(() => {
            fadeOutLoader();
        }, 600);

    } catch (err) {
        console.error('Critical initialization error:', err);
        clearTimeout(safetyTimeout);
        if (loaderTitle) loaderTitle.textContent = 'Sanctuary Unavailable';
        if (loaderSubtitle) loaderSubtitle.classList.add('hidden');
        if (errorContainer) errorContainer.classList.remove('hidden');
        if (errorMessage) errorMessage.textContent = err.message || 'An unexpected error occurred while setting up the 3D sanctuary.';
    }
});

function fadeOutLoader() {
    const loader = document.getElementById('loader');
    if (!loader) return;
    gsap.to(loader, {
        opacity: 0,
        duration: 1.2,
        ease: 'power2.out',
        onComplete: () => {
            loader.style.display = 'none';
        }
    });
}

// 3D Scene Setup
function init3D() {
    const canvas = document.getElementById('webgl-canvas');
    if (!canvas) throw new Error('WebGL canvas element not found.');

    // Scene
    scene = new THREE.Scene();
    const theme = themes[currentTheme];
    scene.background = theme.fogColor;
    scene.fog = new THREE.FogExp2(theme.fogColor, theme.fogDensity);

    // Camera
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 10, 32);

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    // Controls
    if (typeof THREE.OrbitControls === 'undefined') {
        throw new Error('THREE.OrbitControls is not loaded.');
    }
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.minDistance = 10;
    controls.maxDistance = 60;
    controls.target.new = new THREE.Vector3(0, 7, 0);
    controls.target.set(0, 7, 0);

    // Lighting
    ambientLight = new THREE.AmbientLight(theme.ambientColor, theme.ambientIntensity);
    scene.add(ambientLight);

    hemiLight = new THREE.HemisphereLight(theme.skyTop, theme.skyBottom, 0.6);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    mainLight = new THREE.DirectionalLight(theme.lightColor, theme.lightIntensity);
    mainLight.position.set(25, 35, 20);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 100;
    const d = 25;
    mainLight.shadow.camera.left = -d;
    mainLight.shadow.camera.right = d;
    mainLight.shadow.camera.top = d;
    mainLight.shadow.camera.bottom = -d;
    mainLight.shadow.bias = -0.0005;
    scene.add(mainLight);

    // Build Environment & Procedural Sakura Tree
    createEnvironment();
    createProceduralSakuraTree();
    createPetals();

    // Window resize handler
    window.addEventListener('resize', onWindowResize);
}

// Environment (Terrain, Rocks, Lanterns, Water Pool)
function createEnvironment() {
    // Ground Sanctuary Platform
    const groundGeo = new THREE.CylinderGeometry(22, 24, 1.5, 64);
    const groundMat = new THREE.MeshStandardMaterial({
        color: 0x1c1412,
        roughness: 0.9,
        metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -0.75;
    ground.receiveShadow = true;
    scene.add(ground);

    // Mossy top disc
    const mossGeo = new THREE.CylinderGeometry(21.5, 21.5, 0.2, 64);
    const mossMat = new THREE.MeshStandardMaterial({
        color: 0x242b1e,
        roughness: 0.85,
        metalness: 0.05
    });
    const moss = new THREE.Mesh(mossGeo, mossMat);
    moss.position.y = 0.01;
    moss.receiveShadow = true;
    scene.add(moss);

    // Serene Water Reflection Pool
    const poolGeo = new THREE.CylinderGeometry(6, 6, 0.3, 32);
    const poolMat = new THREE.MeshStandardMaterial({
        color: 0x111c24,
        roughness: 0.2,
        metalness: 0.8,
        transparent: true,
        opacity: 0.85
    });
    const pool = new THREE.Mesh(poolGeo, poolMat);
    pool.position.set(6, 0.1, 4);
    pool.receiveShadow = true;
    scene.add(pool);

    // Stone Lantern (Toro)
    createStoneLantern(-7, 0, 5);
    createStoneLantern(5, 0, -6);
}

function createStoneLantern(x, y, z) {
    const lanternGroup = new THREE.Group();

    const baseGeo = new THREE.BoxGeometry(1.2, 0.3, 1.2);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x3d3835, roughness: 0.9 });
    const base = new THREE.Mesh(baseGeo, stoneMat);
    base.position.y = y + 0.15;
    base.castShadow = true;
    base.receiveShadow = true;
    lanternGroup.add(base);

    const pillarGeo = new THREE.CylinderGeometry(0.3, 0.4, 1.8, 8);
    const pillar = new THREE.Mesh(pillarGeo, stoneMat);
    pillar.position.y = y + 1.2;
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    lanternGroup.add(pillar);

    const lightBoxGeo = new THREE.BoxGeometry(1, 1, 1);
    const lightBoxMat = new THREE.MeshStandardMaterial({ color: 0x2b2624, roughness: 0.8 });
    const lightBox = new THREE.Mesh(lightBoxGeo, lightBoxMat);
    lightBox.position.y = y + 2.3;
    lightBox.castShadow = true;
    lanternGroup.add(lightBox);

    // Warm lantern glow
    const pointLight = new THREE.PointLight(0xff9e57, 1.5, 8);
    pointLight.position.set(0, y + 2.3, 0);
    lanternGroup.add(pointLight);

    const roofGeo = new THREE.ConeGeometry(1.4, 0.8, 4);
    const roof = new THREE.Mesh(roofGeo, stoneMat);
    roof.position.y = y + 3.0;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    lanternGroup.add(roof);

    lanternGroup.position.set(x, 0, z);
    scene.add(lanternGroup);
}

// Procedural Sakura Tree Generator
function createProceduralSakuraTree() {
    treeGroup = new THREE.Group();

    const barkMaterial = new THREE.MeshStandardMaterial({
        color: 0x2b1e1a,
        roughness: 0.85,
        metalness: 0.05,
        bumpScale: 0.05
    });

    // Recursive Branch Generation
    function addBranch(startPos, dir, radius, length, level) {
        if (level > 4) {
            // Add blossom cluster at terminal branches
            addBlossomCluster(startPos);
            return;
        }

        const endPos = startPos.clone().add(dir.clone().multiplyScalar(length));
        const branchGeo = new THREE.CylinderGeometry(radius * 0.7, radius, length, 6);
        branchGeo.translate(0, length / 2, 0);

        const branchMesh = new THREE.Mesh(branchGeo, barkMaterial);
        branchMesh.position.copy(startPos);
        branchMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
        branchMesh.castShadow = true;
        branchMesh.receiveShadow = true;
        treeGroup.add(branchMesh);

        // Spawn sub-branches
        const count = level === 1 ? 3 : (Math.random() > 0.3 ? 2 : 1);
        for (let i = 0; i < count; i++) {
            const newDir = dir.clone();
            newDir.applyAxisAngle(new THREE.Vector3(1, 0, 0), (Math.random() - 0.5) * 0.9);
            newDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), (Math.random() - 0.5) * Math.PI * 1.5);
            newDir.normalize();

            addBranch(endPos, newDir, radius * 0.7, length * 0.75, level + 1);
        }
    }

    // Main Trunk
    const trunkHeight = 7;
    const trunkGeo = new THREE.CylinderGeometry(1.1, 1.6, trunkHeight, 8);
    trunkGeo.translate(0, trunkHeight / 2, 0);
    const trunk = new THREE.Mesh(trunkGeo, barkMaterial);
    trunk.position.y = 0;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeGroup.add(trunk);

    // Start recursive branches from top of trunk
    const topTrunkPos = new THREE.Vector3(0, trunkHeight, 0);
    addBranch(topTrunkPos, new THREE.Vector3(0, 1, 0), 1.1, 4.5, 1);
    addBranch(topTrunkPos.clone().add(new THREE.Vector3(1, -1, 0)), new THREE.Vector3(0.8, 0.6, 0.2).normalize(), 0.9, 4, 1);
    addBranch(topTrunkPos.clone().add(new THREE.Vector3(-1, -0.8, 0.5)), new THREE.Vector3(-0.8, 0.5, 0.3).normalize(), 0.9, 4, 1);

    scene.add(treeGroup);
}

// Blossom Cluster Generation
function addBlossomCluster(pos) {
    const clusterCount = 12;
    const blossomGeo = new THREE.DodecahedronGeometry(0.35, 0);
    const colors = [0xffb7c5, 0xffd1dc, 0xffc0cb, 0xf88379];

    for (let i = 0; i < clusterCount; i++) {
        const colorHex = colors[Math.floor(Math.random() * colors.length)];
        const blossomMat = new THREE.MeshStandardMaterial({
            color: colorHex,
            roughness: 0.6,
            metalness: 0.1,
            flatShading: true
        });
        const blossom = new THREE.Mesh(blossomGeo, blossomMat);

        const offset = new THREE.Vector3(
            (Math.random() - 0.5) * 2.2,
            (Math.random() - 0.5) * 2.2,
            (Math.random() - 0.5) * 2.2
        );
        blossom.position.copy(pos).add(offset);
        const scale = 0.6 + Math.random() * 0.8;
        blossom.scale.set(scale, scale, scale);
        blossom.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        blossom.castShadow = true;
        treeGroup.add(blossom);
    }
}

// Falling Petals Particle System
function createPetals() {
    const particleCount = 600;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);

    for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 35;
        positions[i + 1] = Math.random() * 18;
        positions[i + 2] = (Math.random() - 0.5) * 35;
        scales[i / 3] = 0.4 + Math.random() * 0.8;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Custom canvas texture for petal
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffb7c5';
    ctx.beginPath();
    ctx.ellipse(32, 32, 28, 16, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
        size: 0.6,
        map: texture,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.NormalBlending
    });

    petalsParticleSystem = new THREE.Points(geometry, material);
    scene.add(petalsParticleSystem);
}

// Animation Loop
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    // Rotate petals downwards & wind sway
    if (petalsParticleSystem) {
        const positions = petalsParticleSystem.geometry.attributes.position.array;
        for (let i = 1; i < positions.length; i += 3) {
            positions[i] -= delta * 1.2;
            positions[i - 1] += Math.sin(elapsedTime + i) * 0.02;

            if (positions[i] < 0) {
                positions[i] = 18;
                positions[i - 1] = (Math.random() - 0.5) * 35;
                positions[i + 1] = (Math.random() - 0.5) * 35;
            }
        }
        petalsParticleSystem.geometry.attributes.position.needsUpdate = true;
    }

    // Gentle tree sway
    if (treeGroup) {
        treeGroup.rotation.z = Math.sin(elapsedTime * 0.8) * 0.015;
    }

    if (controls) controls.update();
    if (renderer && scene && camera) renderer.render(scene, camera);
}

// Window Resize Handler
function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// UI Interactions & Lighting Modes
function setupUI() {
    // Info Modal bindings
    const btnInfo = document.getElementById('btn-info');
    const infoModal = document.getElementById('info-modal');
    const modalClose = document.getElementById('modal-close');
    const modalAction = document.getElementById('modal-action');

    function toggleModal(show) {
        if (!infoModal) return;
        if (show) {
            infoModal.classList.remove('opacity-0', 'pointer-events-none');
            infoModal.querySelector('div').classList.remove('scale-95');
            infoModal.querySelector('div').classList.add('scale-100');
        } else {
            infoModal.classList.add('opacity-0', 'pointer-events-none');
            infoModal.querySelector('div').classList.remove('scale-100');
            infoModal.querySelector('div').classList.add('scale-95');
        }
    }

    if (btnInfo) btnInfo.addEventListener('click', () => toggleModal(true));
    if (modalClose) modalClose.addEventListener('click', () => toggleModal(false));
    if (modalAction) modalAction.addEventListener('click', () => toggleModal(false));

    if (infoModal) {
        infoModal.addEventListener('click', (e) => {
            if (e.target === infoModal) toggleModal(false);
        });
    }

    // Reset Camera button
    const btnCamera = document.getElementById('btn-camera');
    if (btnCamera) {
        btnCamera.addEventListener('click', () => {
            if (!camera || !controls) return;
            gsap.to(camera.position, {
                x: 0,
                y: 10,
                z: 32,
                duration: 1.5,
                ease: 'power2.out',
                onUpdate: () => controls.update()
            });
        });
    }

    // Ambient Audio Generator (Web Audio API)
    const btnAudio = document.getElementById('btn-audio');
    if (btnAudio) {
        btnAudio.addEventListener('click', toggleAudio);
    }
}

function toggleAudio() {
    const btnAudio = document.getElementById('btn-audio');
    const icon = btnAudio ? btnAudio.querySelector('i') : null;

    if (!isAudioPlaying) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(174.61, audioCtx.currentTime); // F3 calming tone
            gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            window._audioOsc = osc;

            isAudioPlaying = true;
            if (icon) {
                icon.className = 'fa-solid fa-volume-high text-xs text-[#d97757] scale-110 transition-transform';
            }
        } catch (e) {
            console.error('AudioContext error:', e);
        }
    } else {
        if (window._audioOsc) {
            window._audioOsc.stop();
            window._audioOsc.disconnect();
        }
        if (audioCtx) audioCtx.close();
        isAudioPlaying = false;
        if (icon) {
            icon.className = 'fa-solid fa-xmark text-xs transition-transform';
            setTimeout(() => {
                icon.className = 'fa-solid fa-volume-xmark text-xs transition-transform';
            }, 200);
        }
    }
}

// Switch Atmospheric Lighting Themes
window.setLightingMode = function(mode) {
    if (!themes[mode]) return;
    currentTheme = mode;
    const theme = themes[mode];

    // Update button active states
    document.querySelectorAll('.lighting-btn').forEach(btn => {
        btn.className = 'lighting-btn py-2 px-3 rounded-lg bg-[#ffffff08] border border-[#ffffff10] text-xs text-[#a3988c] font-medium hover:text-[#f4efe6] transition-all';
    });
    event.currentTarget.className = 'lighting-btn py-2 px-3 rounded-lg bg-[#d97757]/20 border border-[#d97757]/40 text-xs text-[#f4efe6] font-medium transition-all';

    // GSAP tween lighting & fog
    if (scene) {
        scene.background = theme.fogColor;
        scene.fog.color = theme.fogColor;
    }

    if (mainLight) {
        gsap.to(mainLight.color, { r: theme.lightColor.r, g: theme.lightColor.g, b: theme.lightColor.b, duration: 1.5 });
        mainLight.intensity = theme.lightIntensity;
    }

    if (ambientLight) {
        gsap.to(ambientLight.color, { r: theme.ambientColor.r, g: theme.ambientColor.g, b: theme.ambientColor.b, duration: 1.5 });
        ambientLight.intensity = theme.ambientIntensity;
    }

    if (hemiLight) {
        hemiLight.color = theme.skyTop;
        hemiLight.groundColor = theme.skyBottom;
    }
};
