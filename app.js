document.addEventListener('DOMContentLoaded', () => {
    const loader = document.getElementById('loader');
    const loaderStatus = document.getElementById('loader-status');
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');

    let appInitialized = false;

    function hideLoader() {
        if (loader && !loader.classList.contains('fade-out')) {
            loader.classList.add('fade-out');
            setTimeout(() => loader.style.display = 'none', 500);
        }
    }

    function showError(err) {
        console.error('Sakura Sanctuary Error:', err);
        if (loaderStatus) loaderStatus.style.display = 'none';
        if (errorContainer && errorMessage) {
            errorMessage.textContent = err.message || 'An unexpected error occurred during 3D scene creation.';
            errorContainer.classList.remove('hidden');
        }
    }

    // Safety timeout: hide loader after 8 seconds no matter what
    const safetyTimeout = setTimeout(() => {
        if (!appInitialized) {
            console.warn('Safety timeout triggered: hiding loader.');
            hideLoader();
        }
    }, 8000);

    try {
        // Initialize Three.js Scene with all classes fully namespaced under THREE.
        const container = document.getElementById('canvas-container');
        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#0b0f19');
        scene.fog = new THREE.FogExp2('#0b0f19', 0.015);

        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 5, 18);

        const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        container.appendChild(renderer.domElement);

        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxPolarAngle = Math.PI / 2 - 0.05;
        controls.minDistance = 5;
        controls.maxDistance = 40;
        controls.target.set(0, 4, 0);

        // Lighting
        const ambientLight = new THREE.AmbientLight('#ffeedd', 0.8);
        scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight('#ffb7c5', 2.5);
        sunLight.position.set(20, 15, 15);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 50;
        const d = 15;
        sunLight.shadow.camera.left = -d;
        sunLight.shadow.camera.right = d;
        sunLight.shadow.camera.top = d;
        sunLight.shadow.camera.bottom = -d;
        scene.add(sunLight);

        // Terrain / Ground
        const groundGeo = new THREE.PlaneGeometry(100, 100, 32, 32);
        const groundMat = new THREE.MeshStandardMaterial({ 
            color: '#1a2332', 
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);

        // Procedural Tree Trunk & Branches
        const trunkGroup = new THREE.Group();
        scene.add(trunkGroup);

        const woodMaterial = new THREE.MeshStandardMaterial({
            color: '#3a2618',
            roughness: 0.9,
            metalness: 0.1
        });

        function createBranch(length, radius, depth, position, rotation) {
            const branchGeo = new THREE.CylinderGeometry(radius * 0.7, radius, length, 6);
            const branchMesh = new THREE.Mesh(branchGeo, woodMaterial);
            
            const pivot = new THREE.Object3D();
            pivot.position.copy(position);
            pivot.rotation.copy(rotation);
            
            branchMesh.position.set(0, length / 2, 0);
            branchMesh.castShadow = true;
            branchMesh.receiveShadow = true;
            pivot.add(branchMesh);
            
            if (depth > 0) {
                const tipPos = new THREE.Vector3(0, length, 0);
                for (let i = 0; i < 2; i++) {
                    const subRot = new THREE.Euler(
                        (Math.random() - 0.5) * 0.8,
                        (Math.random() - 0.5) * 0.8,
                        (Math.random() - 0.5) * 0.8
                    );
                    const subPivot = createBranch(length * 0.75, radius * 0.7, depth - 1, tipPos, subRot);
                    pivot.add(subPivot);
                }
            } else {
                createPetals(new THREE.Vector3(0, length, 0), pivot);
            }
            return pivot;
        }

        // Petals generator using InstancedMesh
        const petalCount = 2000;
        const petalGeo = new THREE.PlaneGeometry(0.2, 0.2);
        const petalMat = new THREE.MeshStandardMaterial({
            color: '#ffb7c5',
            side: THREE.DoubleSide,
            roughness: 0.4
        });
        const petalMesh = new THREE.InstancedMesh(petalGeo, petalMat, petalCount);
        petalMesh.castShadow = true;

        const dummy = new THREE.Object3D();
        const petalData = [];

        function createPetals(localPos, parentGroup) {
            for (let i = 0; i < 15; i++) {
                if (petalData.length >= petalCount) break;
                const offset = new THREE.Vector3(
                    (Math.random() - 0.5) * 3,
                    (Math.random() - 0.5) * 1.5,
                    (Math.random() - 0.5) * 3
                );
                const pos = localPos.clone().add(offset);
                
                dummy.position.copy(pos);
                dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
                dummy.updateMatrix();
                petalMesh.setMatrixAt(petalData.length, dummy.matrix);
                
                petalData.push({
                    position: pos,
                    baseY: pos.y,
                    phase: Math.random() * Math.PI * 2
                });
            }
            parentGroup.add(petalMesh);
        }

        // Build root trunk
        const rootRot = new THREE.Euler(0, 0, 0);
        const mainTrunk = createBranch(4, 0.8, 4, new THREE.Vector3(0, 0, 0), rootRot);
        trunkGroup.add(mainTrunk);
        petalMesh.instanceMatrix.needsUpdate = true;

        // Animation Loop
        let clock = new THREE.Clock();
        let windEnabled = true;

        function animate() {
            requestAnimationFrame(animate);
            const delta = clock.getDelta();
            const time = clock.getElapsedTime();

            if (windEnabled) {
                for (let i = 0; i < petalData.length; i++) {
                    const data = petalData[i];
                    data.position.y -= delta * 0.5;
                    data.position.x += Math.sin(time + data.phase) * 0.02;
                    
                    if (data.position.y < 0) {
                        data.position.y = data.baseY;
                    }
                    
                    dummy.position.copy(data.position);
                    dummy.rotation.x += 0.01;
                    dummy.rotation.y += 0.01;
                    dummy.updateMatrix();
                    petalMesh.setMatrixAt(i, dummy.matrix);
                }
                petalMesh.instanceMatrix.needsUpdate = true;
            }

            controls.update();
            renderer.render(scene, camera);
        }

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // UI Interactions
        const tabBtns = document.querySelectorAll('.tab-btn');
        const views = document.querySelectorAll('.view');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                views.forEach(v => v.classList.add('hidden'));
                btn.classList.add('active');
                const targetView = document.getElementById(`${btn.dataset.tab}-view`);
                if (targetView) targetView.classList.remove('hidden');
            });
        });

        const windBtn = document.getElementById('toggle-wind');
        if (windBtn) {
            windBtn.addEventListener('click', () => {
                windEnabled = !windEnabled;
                windBtn.classList.toggle('active', windEnabled);
                windBtn.textContent = `Wind: ${windEnabled ? 'On' : 'Off'}`;
            });
        }

        animate();
        appInitialized = true;
        clearTimeout(safetyTimeout);
        hideLoader();

    } catch (err) {
        clearTimeout(safetyTimeout);
        showError(err);
    }
});