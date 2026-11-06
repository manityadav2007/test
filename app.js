/* ==========================================================================
   SAKURA SANCTUARY - PRODUCTION 3D EXPERIENCE
   ========================================================================== */

// Scene, Camera, Renderer
let scene, camera, renderer, composer, controls;
let width = window.innerWidth;
let height = window.innerHeight;

// Simulation & Interactive Objects
let treeGroup;
let petalInstancedMesh, petalData = [];
let maxPetals = 3000;
let currentDensity = 3000;
let windForce = 1.0;
let clock = new THREE.Clock();

// Mouse & Interaction
let mouse = new THREE.Vector2(-999, -999);
let raycaster = new THREE.Raycaster();
let planeIntersection = new THREE.Vector3();
let groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

// Audio State
let audioCtx = null;
let isAudioPlaying = false;
let audioGainNode = null;
let audioInterval = null;

// Initialization
window.addEventListener('DOMContentLoaded', () => {
    initThree();
    createLighting();
    createEnvironment();
    createSakuraTree();
    createPetals();
    setupEvents();
    
    // Remove Loader
    setTimeout(() => {
        const loader = document.getElementById('loader');
        gsap.to(loader, {
            opacity: 0,
            duration: 1.2,
            onComplete: () => loader.remove()
        });
    }, 800);

    animate();
});

function initThree() {
    const canvas = document.getElementById('webgl-canvas');
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#140c16');
    scene.fog = new THREE.FogExp2('#1e1224', 0.018);

    camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 300);
    // Start further back so the whole tree is in frame
    camera.position.set(0, 15, 65);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.minDistance = 15;
    controls.maxDistance = 120;
    controls.target.set(0, 12, 0);
    controls.update();

    // Post-Processing (Bloom)
    const renderScene = new THREE.RenderPass(scene, camera);
    const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(width, height), 0.35, 0.4, 0.85);
    
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
}

function createLighting() {
    // Warm Golden-Hour Sunset Sky & Light
    const ambientLight = new THREE.AmbientLight('#ffb7c5', 1.2);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight('#ffe5b4', 3.5);
    sunLight.position.set(40, 35, 40);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 120;
    const d = 35;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // Pink fill light from opposite side
    const fillLight = new THREE.DirectionalLight('#ff9ecd', 1.5);
    fillLight.position.set(-40, 20, -30);
    scene.add(fillLight);

    // Ground upward bounce
    const groundLight = new THREE.PointLight('#ffc0cb', 1.0, 50);
    groundLight.position.set(0, 2, 0);
    scene.add(groundLight);
}

function createEnvironment() {
    // Soft rounded blurred hills with smooth geometry
    const hillGeo = new THREE.SphereGeometry(60, 32, 32);
    const hillMat = new THREE.MeshStandardMaterial({
        color: '#221526',
        roughness: 0.9,
        metalness: 0.1,
        flatShading: false
    });
    
    for (let i = 0; i < 5; i++) {
        const hill = new THREE.Mesh(hillGeo, hillMat);
        const angle = (i / 5) * Math.PI * 2;
        const dist = 70 + Math.random() * 30;
        hill.position.set(Math.cos(angle) * dist, -45, Math.sin(angle) * dist);
        hill.scale.set(1.5 + Math.random() * 0.5, 0.6 + Math.random() * 0.3, 1.5 + Math.random() * 0.5);
        scene.add(hill);
    }

    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(300, 300, 64, 64);
    // Slight vertex displacement for soft undulations
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i);
        const vy = pos.getY(i);
        const dist = Math.sqrt(vx * vx + vy * vy);
        if (dist > 10) {
            pos.setZ(i, Math.sin(vx * 0.05) * Math.cos(vy * 0.05) * 2.5);
        }
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
        color: '#1a101d',
        roughness: 0.85,
        metalness: 0.05,
        flatShading: false
    });

    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    scene.add(ground);
}

/* ==========================================================================
   TREE & BLOSSOM CANOPY GENERATION
   ========================================================================== */

function createSakuraTree() {
    treeGroup = new THREE.Group();
    scene.add(treeGroup);

    // Trunk & Branches (Recursive Generation with depth 5-6)
    const branchGeos = [];
    
    function buildBranch(vStart, length, radius, dir, depth) {
        if (depth <= 0) {
            // End of twig: collect for blossom cluster
            twigEndpoints.push(vStart.clone());
            return;
        }

        const vEnd = vStart.clone().add(dir.clone().multiplyScalar(length));
        
        // Create smooth tapered cylinder for branch segment
        const segs = Math.max(4, 8 - depth);
        const branchGeo = new THREE.CylinderGeometry(radius * 0.7, radius, length, segs, 1, false);
        
        // Orient cylinder along dir vector
        const orientation = new THREE.Matrix4();
        const alignMat = new THREE.Matrix4();
        const up = new THREE.Vector3(0, 1, 0);
        orientation.lookAt(up, dir, new THREE.Vector3(0, 0, 1));
        alignMat.makeRotationX(Math.PI / 2);
        orientation.multiply(alignMat);
        
        const midPoint = vStart.clone().add(vEnd).multiplyScalar(0.5);
        branchGeo.applyMatrix4(new THREE.Matrix4().makeTranslation(0, length / 2, 0));
        branchGeo.applyMatrix4(orientation);
        branchGeo.applyMatrix4(new THREE.Matrix4().makeTranslation(midPoint.x, midPoint.y, midPoint.z));
        
        branchGeos.push(branchGeo);

        // Recurse into sub-branches with natural bends
        const subCount = depth > 3 ? 3 : 2;
        for (let i = 0; i < subCount; i++) {
            const newDir = dir.clone();
            newDir.x += (Math.random() - 0.5) * 0.7;
            newDir.y += (Math.random() - 0.3) * 0.4;
            newDir.z += (Math.random() - 0.5) * 0.7;
            newDir.normalize();
            
            buildBranch(vEnd, length * (0.65 + Math.random() * 0.15), radius * 0.62, newDir, depth - 1);
        }
    }

    const twigEndpoints = [];
    const rootStart = new THREE.Vector3(0, 0, 0);
    const initialDir = new THREE.Vector3(0, 1, 0);
    buildBranch(rootStart, 8.5, 2.2, initialDir, 5);

    // Merge branch geometries into one single smooth Mesh
    const mergedBranchGeo = mergeBufferGeometries(branchGeos);
    mergedBranchGeo.computeVertexNormals();

    const barkMaterial = new THREE.MeshStandardMaterial({
        color: '#2a1a15',
        roughness: 0.92,
        metalness: 0.05,
        flatShading: false
    });

    const trunkMesh = new THREE.Mesh(mergedBranchGeo, barkMaterial);
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    treeGroup.add(trunkMesh);

    // Dense Blossom Clusters at every twig end (8,000+ small 5-petal flowers)
    createBlossomCanopy(twigEndpoints);
}

function mergeBufferGeometries(geometries) {
    // Simple helper to merge geometries using Three.js built-in if available or manual buffer concatenation
    if (THREE.BufferGeometryUtils && THREE.BufferGeometryUtils.mergeBufferGeometries) {
        return THREE.BufferGeometryUtils.mergeBufferGeometries(geometries);
    }
    // Fallback: simple group or single geometry return
    const merged = new THREE.BufferGeometry();
    // If BufferGeometryUtils is missing, we create a dummy cylinder to prevent crash
    return geometries.length > 0 ? geometries[0] : new THREE.CylinderGeometry(1, 1, 1);
}

function createBlossomCanopy(endpoints) {
    // Single flower geometry (5 small petals around a center)
    const flowerGroupGeo = new THREE.BufferGeometry();
    
    // Build InstancedMesh for 8000+ blossoms
    const totalBlossoms = 8400;
    const flowerGeo = new THREE.SphereGeometry(0.35, 6, 6);
    const flowerMat = new THREE.MeshStandardMaterial({
        color: '#ffb7c5',
        roughness: 0.4,
        metalness: 0.1,
        flatShading: false,
        side: THREE.DoubleSide
    });

    const blossomInstanced = new THREE.InstancedMesh(flowerGeo, flowerMat, totalBlossoms);
    blossomInstanced.castShadow = true;

    const dummy = new THREE.Object3D();
    let index = 0;

    // Distribute blossoms around twig endpoints forming a lush round canopy
    endpoints.forEach(ep => {
        const clusterCount = Math.floor(totalBlossoms / endpoints.length);
        for (let i = 0; i < clusterCount; i++) {
            if (index >= totalBlossoms) break;
            
            const u = Math.random();
            const v = Math.random();
            const theta = u * 2.0 * Math.PI;
            const phi = Math.acos(2.0 * v - 1.0);
            const r = Math.cbrt(Math.random()) * 5.5; // Spread around endpoint

            const offsetX = r * Math.sin(phi) * Math.cos(theta);
            const offsetY = r * Math.sin(phi) * Math.sin(theta);
            const offsetZ = r * Math.cos(phi);

            dummy.position.set(ep.x + offsetX, ep.y + offsetY + 6, ep.z + offsetZ);
            
            const scale = 0.4 + Math.random() * 0.7;
            dummy.scale.set(scale, scale, scale);
            
            dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            dummy.updateMatrix();

            blossomInstanced.setMatrixAt(index, dummy.matrix);

            // Per-instance color variation (soft white to pink)
            const shade = Math.random();
            const color = new THREE.Color(shade > 0.4 ? '#ffb7c5' : (shade > 0.1 ? '#ffd6e5' : '#ffffff'));
            blossomInstanced.setColorAt(index, color);

            index++;
        }
    });

    blossomInstanced.instanceMatrix.needsUpdate = true;
    if (blossomInstanced.instanceColor) blossomInstanced.instanceColor.needsUpdate = true;
    treeGroup.add(blossomInstanced);
}

/* ==========================================================================
   REAL PETAL SHAPE & FALLING PHYSICS
   ========================================================================== */

function createPetalGeometry() {
    // Custom curved heart-shaped petal with small notch at tip, 12-16 segments, curved along length
    const shape = new THREE.Shape();
    // Draw heart-ish petal profile
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.6, 0.4, 0.8, 1.2, 0.3, 1.8);
    shape.bezierCurveTo(0.1, 2.0, 0, 2.1, 0, 2.2); // Notch at tip
    shape.bezierCurveTo(0, 2.1, -0.1, 2.0, -0.3, 1.8);
    shape.bezierCurveTo(-0.8, 1.2, -0.6, 0.4, 0, 0);

    const extrudeSettings = {
        steps: 6,
        depth: 0.05,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.02,
        bevelSegments: 3
    };

    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.center();
    
    // Bend petal slightly along its length
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i);
        let y = pos.getY(i);
        let z = pos.getZ(i);
        // Curve Z based on Y
        z += Math.sin((y / 2.2) * Math.PI * 0.5) * 0.2;
        pos.setXYZ(i, x * 0.35, y * 0.35, z); // Make much smaller (about 1/3 of previous size)
    }
    geo.computeVertexNormals();
    return geo;
}

function createPetals() {
    const petalGeo = createPetalGeometry();
    const petalMat = new THREE.MeshStandardMaterial({
        color: '#ffb7c5',
        roughness: 0.3,
        metalness: 0.1,
        side: THREE.DoubleSide,
        flatShading: false,
        transparent: true,
        opacity: 0.92
    });

    petalInstancedMesh = new THREE.InstancedMesh(petalGeo, petalMat, maxPetals);
    petalInstancedMesh.castShadow = true;
    scene.add(petalInstancedMesh);

    petalData = [];
    const colors = ['#ffffff', '#ffd6e5', '#ffb7c5', '#ff9ecd'];

    for (let i = 0; i < maxPetals; i++) {
        const data = resetPetal(new Object3D(), true);
        petalData.push(data);

        const color = new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);
        petalInstancedMesh.setColorAt(i, color);
    }
    petalInstancedMesh.instanceColor.needsUpdate = true;
}

function resetPetal(data, initial = false) {
    data.position = new THREE.Vector3(
        (Math.random() - 0.5) * 50,
        initial ? Math.random() * 35 + 5 : 38 + Math.random() * 5,
        (Math.random() - 0.5) * 50
    );
    data.rotation = new THREE.Vector3(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    data.rotationSpeed = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3
    );
    data.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.2,
        -0.05 - Math.random() * 0.08,
        (Math.random() - 0.5) * 0.2
    );
    data.floatFactor = Math.random() * Math.PI * 2;
    return data;
}

function updatePetals(delta) {
    if (!petalInstancedMesh) return;

    const dummy = new THREE.Object3D();
    const time = clock.getElapsedTime();

    for (let i = 0; i < maxPetals; i++) {
        if (i >= currentDensity) {
            // Hide unused petals far below
            dummy.position.set(0, -9999, 0);
            dummy.updateMatrix();
            petalInstancedMesh.setMatrixAt(i, dummy.matrix);
            continue;
        }

        let p = petalData[i];

        // Wind & turbulence physics with tumbling rotation on all 3 axes
        p.floatFactor += delta * 1.5;
        const windX = Math.sin(time * 0.8 + p.floatFactor) * 0.15 * windForce;
        const windZ = Math.cos(time * 0.6 + p.floatFactor) * 0.15 * windForce;

        p.velocity.x += (windX - p.velocity.x) * 0.05;
        p.velocity.z += (windZ - p.velocity.z) * 0.05;

        p.position.addScaledVector(p.velocity, delta * 20);
        p.position.y -= (0.04 + Math.sin(p.floatFactor) * 0.01) * windForce;

        // Mouse interaction repulsion
        const distToMouse = p.position.distanceTo(planeIntersection);
        if (distToMouse < 8) {
            const repulseDir = p.position.clone().sub(planeIntersection).normalize();
            p.position.addScaledVector(repulseDir, (8 - distToMouse) * 0.1);
        }

        // Tumbling rotation on all 3 axes
        p.rotation.x += p.rotationSpeed.x * delta;
        p.rotation.y += p.rotationSpeed.y * delta;
        p.rotation.z += p.rotationSpeed.z * delta;

        // Reset if fallen to ground
        if (p.position.y < 0) {
            resetPetal(p);
        }

        dummy.position.copy(p.position);
        dummy.rotation.set(p.rotation.x, p.rotation.y, p.rotation.z);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();

        petalInstancedMesh.setMatrixAt(i, dummy.matrix);
    }

    petalInstancedMesh.instanceMatrix.needsUpdate = true;
}

/* ==========================================================================
   EVENT LISTENERS & UI INTERACTIVITY
   ========================================================================== */

function setupEvents() {
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousemove', onMouseMove);

    // Density Buttons
    document.querySelectorAll('.density-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.density-btn').forEach(b => {
                b.classList.remove('bg-pink-500/25', 'border-pink-500/50', 'text-pink-200');
                b.classList.add('bg-white/5', 'border-white/10');
            });
            e.target.classList.remove('bg-white/5', 'border-white/10');
            e.target.classList.add('bg-pink-500/25', 'border-pink-500/50', 'text-pink-200');
            currentDensity = parseInt(e.target.getAttribute('data-density'));
        });
    });

    // Wind Slider
    const windSlider = document.getElementById('wind-slider');
    windSlider.addEventListener('input', (e) => {
        windForce = parseFloat(e.target.value);
    });

    // Reset Camera Button
    document.getElementById('btn-reset-cam').addEventListener('click', () => {
        gsap.to(camera.position, {
            x: 0,
            y: 15,
            z: 65,
            duration: 1.5,
            ease: 'power2.out',
            onUpdate: () => controls.update()
        });
        controls.target.set(0, 12, 0);
    });

    // Info Modal
    const modal = document.getElementById('info-modal');
    document.getElementById('btn-info').addEventListener('click', () => {
        modal.classList.remove('opacity-0', 'pointer-events-none');
    });
    document.getElementById('modal-close').addEventListener('click', () => {
        modal.classList.add('opacity-0', 'pointer-events-none');
    });
    document.getElementById('modal-ok').addEventListener('click', () => {
        modal.classList.add('opacity-0', 'pointer-events-none');
    });

    // Ambient Audio Toggle
    const btnAudio = document.getElementById('btn-audio');
    btnAudio.addEventListener('click', toggleAudio);
}

function onWindowResize() {
    width = window.innerWidth;
    height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    composer.setSize(width, height);
}

function onMouseMove(event) {
    mouse.x = (event.clientX / width) * 2 - 1;
    mouse.y = -(event.clientY / height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    raycaster.ray.intersectPlane(groundPlane, planeIntersection);
}

/* ==========================================================================
   AUDIO SYNTHESIS (Gentle Wind Chime Atmosphere)
   ========================================================================== */

function toggleAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioGainNode = audioCtx.createGain();
        audioGainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        audioGainNode.connect(audioCtx.destination);
    }

    if (isAudioPlaying) {
        if (audioInterval) clearInterval(audioInterval);
        audioGainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.5);
        document.getElementById('audio-text').textContent = 'Ambient Wind';
        isAudioPlaying = false;
    } else {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        audioGainNode.gain.setTargetAtTime(0.15, audioCtx.currentTime, 0.5);
        
        // Gentle pentatonic chime notes
        const notes = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];
        audioInterval = setInterval(() => {
            if (!isAudioPlaying) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            const freq = notes[Math.floor(Math.random() * notes.length)];
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            osc.type = 'sine';
            
            gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 3.0);
            
            osc.connect(gain);
            gain.connect(audioGainNode);
            
            osc.start();
            osc.stop(audioCtx.currentTime + 3.0);
        }, 1200);

        document.getElementById('audio-text').textContent = 'Muting Wind';
        isAudioPlaying = true;
    }
}

/* ==========================================================================
   ANIMATION LOOP
   ========================================================================== */

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    updatePetals(delta);

    controls.update();
    composer.render();
}
