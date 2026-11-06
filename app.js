// Sakura 3D Sanctuary - Production Grade Three.js Application

class SakuraSanctuary {
  constructor() {
    this.container = document.getElementById('webgl-canvas');
    this.loaderEl = document.getElementById('loader');
    this.progressBar = document.getElementById('load-progress');
    this.loadStatus = document.getElementById('load-status');
    this.heroContent = document.getElementById('hero-content');
    
    this.densityBtn = document.getElementById('density-btn');
    this.densityText = document.getElementById('density-text');
    this.soundBtn = document.getElementById('sound-btn');
    this.soundIconOn = document.getElementById('sound-icon-on');
    this.soundIconOff = document.getElementById('sound-icon-off');

    this.width = window.innerWidth;
    this.height = window.innerHeight;
    
    this.petalDensityMode = 'high'; // high: 2000, medium: 1000, low: 400
    this.maxPetals = 2000;
    this.audioEnabled = false;
    this.audioCtx = null;
    this.analyser = null;
    this.windGain = null;

    this.mouse = new THREE.Vector2(0, 0);
    this.targetMouse = new THREE.Vector2(0, 0);
    this.raycaster = new THREE.Raycaster();
    this.scrollProgress = 0;
    this.targetScrollProgress = 0;

    this.clock = new THREE.Clock();
    this.init();
  }

  async init() {
    this.updateProgress(20, 'Initializing WebGL context...');
    await this.delay(150);

    // Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0b070e');
    this.scene.fog = new THREE.FogExp2('#150d1a', 0.025);

    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 100);
    this.camera.position.set(0, 4, 18);

    this.updateProgress(40, 'Building atmospheric lighting...');
    await this.delay(150);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas: this.container, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.setupLighting();

    this.updateProgress(65, 'Procedurally growing Sakura tree...');
    await this.delay(200);

    this.createEnvironment();
    this.createTree();

    this.updateProgress(85, 'Spawning falling petals particle system...');
    await this.delay(150);

    this.createPetals();

    this.updateProgress(100, 'Ready.');
    await this.delay(300);

    this.hideLoader();
    this.bindEvents();
    this.animate();
  }

  updateProgress(percent, text) {
    if (this.progressBar) this.progressBar.style.width = percent + '%';
    if (this.loadStatus) this.loadStatus.textContent = text;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  hideLoader() {
    if (this.loaderEl) {
      gsap.to(this.loaderEl, {
        opacity: 0,
        duration: 0.8,
        onComplete: () => {
          this.loaderEl.style.display = 'none';
          gsap.to(this.heroContent, {
            opacity: 1,
            y: 0,
            duration: 1.2,
            ease: 'power3.out'
          });
        }
      });
    }
  }

  setupLighting() {
    // Ambient golden/pink glow
    const ambientLight = new THREE.AmbientLight(0x2d1a24, 1.5);
    this.scene.add(ambientLight);

    // Warm sunset directional sun
    const sunLight = new THREE.DirectionalLight(0xffeedd, 2.5);
    sunLight.position.set(12, 16, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 40;
    const d = 12;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    this.scene.add(sunLight);

    // Soft pink rim light from opposite side
    const rimLight = new THREE.DirectionalLight(0xdc6b9d, 1.2);
    rimLight.position.set(-15, 8, -10);
    this.scene.add(rimLight);

    // Upward glow from grass
    const groundGlow = new THREE.PointLight(0x4a1f33, 2, 15);
    groundGlow.position.set(0, 0.5, 0);
    this.scene.add(groundGlow);
  }

  createEnvironment() {
    // Ground terrain with fallen petals carpet
    const groundGeo = new THREE.PlaneGeometry(60, 60, 32, 32);
    groundGeo.rotateX(-Math.PI / 2);
    
    // Displace vertices slightly for organic undulation
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = Math.sin(x * 0.2) * Math.cos(z * 0.2) * 0.3;
      pos.setY(i, y);
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x141018,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Distant blurred trees / mountains for depth
    const distantGroup = new THREE.Group();
    const treeMat = new THREE.MeshBasicMaterial({ color: 0x120a17, fog: true });
    for (let i = 0; i < 25; i++) {
      const angle = (i / 25) * Math.PI * 2;
      const radius = 25 + Math.random() * 10;
      const height = 4 + Math.random() * 6;
      const treeGeo = new THREE.ConeGeometry(2 + Math.random() * 2, height, 5);
      const tree = new THREE.Mesh(treeGeo, treeMat);
      tree.position.set(Math.cos(angle) * radius, height / 2 - 1, Math.sin(angle) * radius);
      distantGroup.add(tree);
    }
    this.scene.add(distantGroup);
  }

  createTree() {
    this.treeGroup = new THREE.Group();
    this.scene.add(this.treeGroup);

    // Trunk & Branches (Procedural Recursive Generation)
    const barkMat = new THREE.MeshStandardMaterial({
      color: 0x241915,
      roughness: 0.85,
      metalness: 0.05,
      bumpScale: 0.05
    });

    const branchesData = [];
    
    // Recursive branch generator
    const generateBranch = (startPos, direction, length, radius, level) => {
      if (level > 4 || length < 0.4) return;

      const endPos = startPos.clone().add(direction.clone().multiplyScalar(length));
      
      // Create cylinder segment
      const segGeo = new THREE.CylinderGeometry(radius * 0.7, radius, length, 6);
      segGeo.translate(0, length / 2, 0);
      segGeo.rotateX(Math.PI / 2);
      
      const segMesh = new THREE.Mesh(segGeo, barkMat);
      segMesh.position.copy(startPos);
      segMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.clone().normalize());
      segMesh.castShadow = true;
      segMesh.receiveShadow = true;
      this.treeGroup.add(segMesh);

      // Save tip positions for blossom clusters
      if (level >= 3) {
        branchesData.push(endPos.clone());
      }

      // Spawn sub-branches
      const count = level === 1 ? 3 : 2;
      for (let i = 0; i < count; i++) {
        const newDir = direction.clone();
        // Add twist and randomness
        newDir.x += (Math.random() - 0.5) * 0.8;
        newDir.y += (Math.random() - 0.2) * 0.5;
        newDir.z += (Math.random() - 0.5) * 0.8;
        newDir.normalize();

        generateBranch(endPos, newDir, length * (0.65 + Math.random() * 0.15), radius * 0.65, level + 1);
      }
    };

    // Root trunk
    const rootStart = new THREE.Vector3(0, 0, 0);
    const initialDir = new THREE.Vector3(0.1, 1, 0.05).normalize();
    generateBranch(rootStart, initialDir, 4.5, 0.7, 1);

    // Blossom Clusters using InstancedMesh
    this.createBlossomClusters(branchesData);
  }

  createBlossomClusters(tips) {
    // Create flower petal shape
    const flowerShape = new THREE.Shape();
    const petalsCount = 5;
    for (let i = 0; i < petalsCount; i++) {
      const angle = (i / petalsCount) * Math.PI * 2;
      const rx = Math.cos(angle) * 0.15;
      const ry = Math.sin(angle) * 0.15;
      if (i === 0) flowerShape.moveTo(rx, ry);
      else flowerShape.bezierCurveTo(rx * 1.5, ry * 1.5, rx * 0.8, ry * 0.8, rx, ry);
    }

    const extrudeSettings = { depth: 0.01, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.01, bevelThickness: 0.01 };
    const petalGeo = new THREE.ExtrudeGeometry(flowerShape, extrudeSettings);
    petalGeo.center();

    const flowerMat = new THREE.MeshStandardMaterial({
      color: 0xffd1dc,
      roughness: 0.4,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    // Generate instances around tips
    const totalInstances = tips.length * 12;
    this.blossomInstanced = new THREE.InstancedMesh(petalGeo, flowerMat, totalInstances);
    this.blossomInstanced.castShadow = true;

    const dummy = new THREE.Object3D();
    let index = 0;

    tips.forEach(tip => {
      for (let i = 0; i < 12; i++) {
        const offset = new THREE.Vector3(
          (Math.random() - 0.5) * 1.8,
          (Math.random() - 0.5) * 1.8,
          (Math.random() - 0.5) * 1.8
        );
        dummy.position.copy(tip).add(offset);
        dummy.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );
        const scale = 0.6 + Math.random() * 0.8;
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        this.blossomInstanced.setMatrixAt(index++, dummy.matrix);
      }
    });

    this.blossomInstanced.instanceMatrix.needsUpdate = true;
    this.treeGroup.add(this.blossomInstanced);
  }

  createPetals() {
    // Falling Petals particle system
    const petalShape = new THREE.PlaneGeometry(0.18, 0.28);
    const petalMat = new THREE.MeshStandardMaterial({
      color: 0xffe6ee,
      roughness: 0.5,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95
    });

    this.petalCount = this.maxPetals;
    this.petalMesh = new THREE.InstancedMesh(petalShape, petalMat, this.petalCount);
    this.scene.add(this.petalMesh);

    // Petal physics attributes
    this.petalData = [];
    const dummy = new THREE.Object3D();

    for (let i = 0; i < this.petalCount; i++) {
      const data = {
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 12,
          Math.random() * 9 + 2,
          (Math.random() - 0.5) * 12
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          -Math.random() * 0.03 - 0.01,
          (Math.random() - 0.5) * 0.02
        ),
        rotation: new THREE.Euler(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        ),
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.04,
          (Math.random() - 0.5) * 0.04,
          (Math.random() - 0.5) * 0.04
        ),
        life: Math.random(),
        maxLife: 1.0 + Math.random() * 1.5,
        scale: 0.7 + Math.random() * 0.6
      };
      this.petalData.push(data);

      dummy.position.copy(data.position);
      dummy.rotation.copy(data.rotation);
      dummy.scale.set(data.scale, data.scale, data.scale);
      dummy.updateMatrix();
      this.petalMesh.setMatrixAt(i, dummy.matrix);
    }
    this.petalMesh.instanceMatrix.needsUpdate = true;
  }

  bindEvents() {
    window.addEventListener('resize', () => this.onWindowResize());
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        this.onMouseMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
      }
    }, { passive: true });

    window.addEventListener('wheel', (e) => {
      this.targetScrollProgress += e.deltaY * 0.001;
      this.targetScrollProgress = Math.max(0, Math.min(1.5, this.targetScrollProgress));
    }, { passive: true });

    // UI Toggles
    this.density0 = false;
    this.densityBtn.addEventListener('click', () => {
      if (this.petalDensityMode === 'high') {
        this.petalDensityMode = 'medium';
        this.maxPetals = 1000;
        this.densityText.textContent = 'Petals: Med (1000)';
      } else if (this.petalDensityMode === 'medium') {
        this.petalDensityMode = 'low';
        this.maxPetals = 400;
        this.densityText.textContent = 'Petals: Low (400)';
      } else {
        this.petalDensityMode = 'high';
        this.maxPetals = 2000;
        this.densityText.textContent = 'Petals: High (2000)';
      }
      this.petalMesh.count = this.maxPetals;
    });

    this.soundBtn.addEventListener('click', () => {
      this.audioEnabled = !this.audioEnabled;
      if (this.audioEnabled) {
        this.initAudio();
        this.soundIconOn.classList.remove('hidden');
        this.soundIconOff.classList.add('hidden');
      } else {
        if (this.audioCtx) this.audioCtx.suspend();
        this.soundIconOn.classList.add('hidden');
        this.soundIconOff.classList.remove('hidden');
      }
    });
  }

  initAudio() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();

      // Create pink noise generator for wind sound
      const bufferSize = 4096;
      const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.audioCtx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 350;
      filter.Q.value = 1.0;

      this.windGain = this.audioCtx.createGain();
      this.windGain.gain.value = 0.15;

      whiteNoise.connect(filter);
      filter.connect(this.windGain);
      this.windGain.connect(this.audioCtx.destination);
      whiteNoise.start(0);
    } else {
      this.audioCtx.resume();
    }
  }

  onWindowResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  onMouseMove(e) {
    this.targetMouse.x = (e.clientX / this.width) * 2 - 1;
    this.targetMouse.y = -(e.clientY / this.height) * 2 + 1;
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // Smooth mouse interpolation
    this.mouse.lerp(this.targetMouse, 0.05);
    this.scrollProgress += (this.targetScrollProgress - this.scrollProgress) * 0.05;

    // Camera motion & Parallax
    const baseCamZ = 18;
    const baseCamY = 4;
    const targetZ = baseCamZ - this.scrollProgress * 8;
    const targetY = baseCamY + this.scrollProgress * 5;
    
    this.camera.position.x += (this.mouse.x * 2.5 - this.camera.position.x) * 0.05;
    this.camera.position.y += (targetY + this.mouse.y * 1.5 - this.camera.position.y) * 0.05;
    this.camera.position.z += (targetZ - this.camera.position.z) * 0.05;
    this.camera.lookAt(0, 3 + this.scrollProgress * 2, 0);

    // Tree & Blossom gentle sway
    if (this.treeGroup) {
      this.treeGroup.rotation.y = Math.sin(time * 0.5) * 0.02;
      this.treeGroup.rotation.z = Math.cos(time * 0.4) * 0.01;
    }

    // Update Falling Petals Physics
    const dummy = new THREE.Object3D();
    const windForce = new THREE.Vector3(
      Math.sin(time * 0.8) * 0.015 + 0.01,
      -0.015,
      Math.cos(time * 0.6) * 0.015
    );

    for (let i = 0; i < this.maxPetals; i++) {
      const data = this.petalData[i];

      // Wind & Mouse repulsion drift
      const distToMouse = data.position.distanceTo(new THREE.Vector3(this.mouse.x * 5, this.mouse.y * 5 + 3, 0));
      if (distToMouse < 4) {
        const pushDir = data.position.clone().sub(new THREE.Vector3(this.mouse.x * 5, this.mouse.y * 5 + 3, 0)).normalize();
        data.velocity.add(pushDir.multiplyScalar(0.005));
      }

      data.velocity.add(windForce);
      data.velocity.clampLength(0.001, 0.08);

      data.position.add(data.velocity);

      data.rotation.x += data.rotSpeed.x;
      data.rotation.y += data.rotSpeed.y;
      data.rotation.z += data.rotSpeed.z;

      // Reset when touching ground or out of bounds
      if (data.position.y < 0.1 || Math.abs(data.position.x) > 15 || Math.abs(data.position.z) > 15) {
        data.position.set(
          (Math.random() - 0.5) * 10,
          Math.random() * 4 + 7,
          (Math.random() - 0.5) * 10
        );
        data.velocity.set(
          (Math.random() - 0.5) * 0.02,
          -Math.random() * 0.03 - 0.01,
          (Math.random() - 0.5) * 0.02
        );
      }

      dummy.position.copy(data.position);
      dummy.rotation.copy(data.rotation);
      dummy.scale.set(data.scale, data.scale, data.scale);
      dummy.updateMatrix();

      this.petalMesh.setMatrixAt(i, dummy.matrix);
    }
    this.petalMesh.instanceMatrix.needsUpdate = true;

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new SakuraSanctuary();
});