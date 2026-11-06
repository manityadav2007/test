// 3D Interactive Falling-Leaves Tree Simulation

const container = document.getElementById('canvas-container');
let scene, camera, renderer, treeGroup, leaves = [];
let mouseX = 0, mouseY = 0;
let targetX = 0, targetY = 0;
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;
let windIntensity = 1.0;

function init() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#030712');
    scene.fog = new THREE.FogExp2('#030712', 0.015);

    // Camera setup
    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 4, 18);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x1e293b, 1.5);
    scene.add(ambientLight);

    const moonLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
    moonLight.position.set(15, 25, 10);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 2048;
    moonLight.shadow.mapSize.height = 2048;
    scene.add(moonLight);

    const fillLight = new THREE.DirectionalLight(0x10b981, 0.8);
    fillLight.position.set(-15, 10, -10);
    scene.add(fillLight);

    // Environment ground
    const groundGeo = new THREE.PlaneGeometry(100, 100);
    const groundMat = new THREE.MeshStandardMaterial({
        color: 0x050b14,
        roughness: 0.8,
        metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -3;
    ground.receiveShadow = true;
    scene.add(ground);

    // Build Procedural Bonsai Tree
    createTree();

    // Create Falling Leaves Particle System
    createLeavesSystem();

    // Event Listeners
    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('mousemove', onDocumentMouseMove, false);

    // Interactive button action
    document.getElementById('explore-btn').addEventListener('click', () => {
        // Smooth camera cinematic dolly-in
        gsapCameraMove();
    });

    const windBtn = document.getElementById('toggle-wind');
    windBtn.addEventListener('click', () => {
        if (windIntensity === 1.0) {
            windIntensity = 2.5;
            windBtn.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span><span>Wind: Strong</span>';
        } else if (windIntensity === 2.5) {
            windIntensity = 0.2;
            windBtn.innerHTML = '<span class="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span><span>Wind: Gentle</span>';
        } else {
            windIntensity = 1.0;
            windBtn.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span><span>Wind: Moderate</span>';
        }
    });

    animate();
}

function createTree() {
    treeGroup = new THREE.Group();

    // Trunk Material
    const trunkMat = new THREE.MeshStandardMaterial({
        color: 0x1f1712,
        roughness: 0.9,
        metalness: 0.1
    });

    // Main Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.6, 1.2, 7, 8);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.5;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeGroup.add(trunk);

    // Secondary branches
    createBranch(0, 3, 0, 2.5, 0.4, Math.PI / 6, Math.PI / 4, trunkMat, 3);
    createBranch(0, 3.5, 0, 2.8, 0.35, -Math.PI / 5, -Math.PI / 3, trunkMat, 3);
    createBranch(0, 4.5, 0, 2.2, 0.28, Math.PI / 4, Math.PI / 2, trunkMat, 2);
    createBranch(0, 5.2, 0, 1.8, 0.2, -Math.PI / 6, Math.PI, trunkMat, 2);

    treeGroup.position.y = -3;
    scene.add(treeGroup);
}

function createBranch(x, y, z, length, radius, angleX, angleZ, material, depth) {
    if (depth <= 0) return;

    const branchGeo = new THREE.CylinderGeometry(radius * 0.7, radius, length, 6);
    branchGeo.translate(0, length / 2, 0);
    const branch = new THREE.Mesh(branchGeo, material);
    
    branch.position.set(x, y, z);
    branch.rotation.x = angleX;
    branch.rotation.z = angleZ;
    branch.castShadow = true;
    branch.receiveShadow = true;
    
    treeGroup.add(branch);

    // Tip position for sub-branches or foliage cluster
    const tipY = y + Math.cos(angleX) * length;
    const tipX = x + Math.sin(angleZ) * length;
    const tipZ = z + Math.cos(angleZ) * length;

    if (depth > 1) {
        createBranch(tipX, tipY, tipZ, length * 0.7, radius * 0.65, angleX + 0.3, angleZ + 0.5, material, depth - 1);
        createBranch(tipX, tipY, tipZ, length * 0.7, radius * 0.65, angleX - 0.4, angleZ - 0.5, material, depth - 1);
    } else {
        // Add foliage cluster
        createFoliageCluster(tipX, tipY, tipZ);
    }
}

function createFoliageCluster(x, y, z) {
    const clusterGeo = new THREE.DodecahedronGeometry(1.4, 1);
    const clusterMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        roughness: 0.6,
        metalness: 0.1,
        flatShading: true
    });
    const cluster = new THREE.Mesh(clusterGeo, clusterMat);
    cluster.position.set(x, y, z);
    cluster.castShadow = true;
    treeGroup.add(cluster);
}

function createLeavesSystem() {
    const leafCount = 200;
    const leafGeo = new THREE.PlaneGeometry(0.35, 0.35);
    
    // Leaf variations in color (Emerald, Teal, Lime, Mint)
    const colors = [0x10b981, 0x34d399, 0x059669, 0x6ee7b7, 0x2dd4bf];

    for (let i = 0; i < leafCount; i++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        const leafMat = new THREE.MeshStandardMaterial({
            color: color,
            side: THREE.DoubleSide,
            roughness: 0.5,
            transparent: true,
            opacity: 0.9
        });

        const leaf = new THREE.Mesh(leafGeo, leafMat);
        
        resetLeafPosition(leaf, true);
        
        scene.add(leaf);
        leaves.push(leaf);
    }
}

function resetLeafPosition(leaf, initial = false) {
    // Scatter around canopy bounds
    const radius = Math.random() * 3.5;
    const theta = Math.random() * Math.PI * 2;
    
    leaf.position.x = Math.cos(theta) * radius;
    leaf.position.y = initial ? (Math.random() * 5 - 1) : (6 + Math.random() * 2);
    leaf.position.z = Math.sin(theta) * radius;

    leaf.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
    );

    // Custom physics properties stored directly on mesh
    leaf.userData = {
        velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 0.02,
            -0.03 - Math.random() * 0.03,
            (Math.random() - 0.5) * 0.02
        ),
        rotationSpeed: new THREE.Vector3(
            (Math.random() - 0.5) * 0.05,
            (Math.random() - 0.5) * 0.05,
            (Math.random() - 0.5) * 0.05
        ),
        amplitude: 0.5 + Math.random() * 1.5,
        frequency: 1.0 + Math.random() * 2.0,
        offset: Math.random() * Math.PI * 2
    };
}

function onWindowResize() {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onDocumentMouseMove(event) {
    mouseX = (event.clientX - windowHalfX) / windowHalfX;
    mouseY = (event.clientY - windowHalfY) / windowHalfY;
}

function gsapCameraMove() {
    let startTime = null;
    const startPos = camera.position.clone();
    const targetPos = new THREE.Vector3(0, 1, 8);
    const duration = 2000;

    function animateCam(currentTime) {
        if (!startTime) startTime = currentTime;
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 0.5 - Math.cos(progress * Math.PI) / 2;

        camera.position.lerpVectors(startPos, targetPos, easeProgress);

        if (progress < 1) {
            requestAnimationFrame(animateCam);
        }
    }
    requestAnimationFrame(animateCam);
}

function animate(timestamp = 0) {
    requestAnimationFrame(animate);

    const time = timestamp * 0.001;

    // Smooth camera parallax based on mouse position
    targetX = mouseX * 2.5;
    targetY = -mouseY * 1.5 + 4;
    camera.position.x += (targetX - camera.position.x) * 0.05;
    camera.position.y += (targetY - camera.position.y) * 0.05;
    camera.lookAt(0, 1, 0);

    // Rotate tree very slowly for cinematic presence
    if (treeGroup) {
        treeGroup.rotation.y = Math.sin(time * 0.3) * 0.15;
    }

    // Update falling leaves physics
    leaves.forEach(leaf => {
        // Apply wind drift sine waves
        const windEffect = Math.sin(time * leaf.userData.frequency + leaf.userData.offset) * 0.03 * windIntensity;
        
        leaf.position.x += leaf.userData.velocity.x + windEffect;
        leaf.position.y += leaf.userData.velocity.y;
        leaf.position.z += leaf.userData.velocity.z;

        // Spin leaf
        leaf.rotation.x += leaf.userData.rotationSpeed.x;
        leaf.rotation.y += leaf.userData.rotationSpeed.y;
        leaf.rotation.z += leaf.userData.rotationSpeed.z;

        // Reset when leaf reaches ground
        if (leaf.position.y < -3) {
            resetLeafPosition(leaf);
        }
    });

    renderer.render(scene, camera);
}

init();