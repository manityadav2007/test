'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Seeded Random for consistent tree generation
class SeededRandom {
  private seed: number;
  constructor(seed = 1337) {
    this.seed = seed;
  }
  next() {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }
  range(min: number, max: number) {
    return min + this.next() * (max - min);
  }
}

// Procedural Bark Noise Texture Generator
function createBarkTexture(): THREE.CanvasTexture {
  if (typeof document === 'undefined') return new THREE.CanvasTexture(new Image());
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#4a3426';
  ctx.fillRect(0, 0, 512, 512);
  
  // Draw vertical bark striations
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const h = 20 + Math.random() * 80;
    const w = 1 + Math.random() * 3;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(30, 20, 15, 0.4)' : 'rgba(90, 70, 55, 0.4)';
    ctx.fillRect(x, y, w, h);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 6);
  return texture;
}

// Procedural 5-Petal Blossom Texture
function createBlossomTexture(): THREE.CanvasTexture {
  if (typeof document === 'undefined') return new THREE.CanvasTexture(new Image());
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);
  
  ctx.save();
  ctx.translate(64, 64);
  for (let i = 0; i < 5; i++) {
    ctx.rotate((Math.PI * 2) / 5);
    ctx.beginPath();
    ctx.fillStyle = '#ffb7c5';
    ctx.ellipse(0, -32, 16, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner white highlight
    ctx.beginPath();
    ctx.fillStyle = '#ffe9f0';
    ctx.ellipse(0, -30, 10, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Center yellow dot
  ctx.beginPath();
  ctx.fillStyle = '#fff1b0';
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  
  return new THREE.CanvasTexture(canvas);
}

interface BranchNode {
  geom: THREE.BufferGeometry;
  depth: number;
  endPoint: THREE.Vector3;
}

function generateSakuraGeometry(): { treeGeometry: THREE.BufferGeometry; blossomAnchors: THREE.Vector3[] } {
  const rng = new SeededRandom(42);
  const branchGeometries: THREE.BufferGeometry[] = [];
  const blossomAnchors: THREE.Vector3[] = [];

  function buildBranch(
    start: THREE.Vector3,
    dir: THREE.Vector3,
    length: number,
    radius: number,
    depth: number
  ) {
    if (depth > 6) return;

    // Slight natural bend
    const bend = new THREE.Vector3(
      rng.range(-0.15, 0.15),
      rng.range(0.1, 0.3), // Upward bias
      rng.range(-0.15, 0.15)
    );
    const end = start.clone().add(dir.clone().multiplyScalar(length)).add(bend);

    const curve = new THREE.CatmullRomCurve3([
      start,
      start.clone().lerp(end, 0.33).add(new THREE.Vector3(rng.range(-0.1, 0.1), rng.range(0, 0.1), rng.range(-0.1, 0.1))),
      start.clone().lerp(end, 0.66).add(new THREE.Vector3(rng.range(-0.1, 0.1), rng.range(0, 0.1), rng.range(-0.1, 0.1))),
      end
    ]);

    const endRadius = radius * 0.65;
    const tube = new THREE.TubeGeometry(curve, 8, radius, 8, false);
    
    // Adjust radius scaling along tube
    const posAttr = tube.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < posAttr.count; i++) {
      v.fromBufferAttribute(posAttr, i);
      // Scale radii towards the end
      const t = v.distanceTo(start) / start.distanceTo(end);
      if (!isNaN(t) && t >= 0 && t <= 1) {
        // Keep center, scale radial distance
      }
    }

    branchGeometries.push(tube);

    if (depth >= 3) {
      blossomAnchors.push(end.clone());
    }

    const childCount = depth === 0 ? 3 : Math.floor(rng.range(2, 4));
    for (let i = 0; i < childCount; i++) {
      const angle = rng.range(0, Math.PI * 2);
      const spread = rng.range(0.3, 0.8);
      const childDir = new THREE.Vector3(
        Math.cos(angle) * spread,
        rng.range(0.3, 1.0),
        Math.sin(angle) * spread
      ).normalize();

      buildBranch(end, childDir, length * 0.72, endRadius, depth + 1);
    }
  }

  // Root trunk start
  const rootStart = new THREE.Vector3(0, 0, 0);
  const rootDir = new THREE.Vector3(0.05, 1, 0.02).normalize();
  buildBranch(rootStart, rootDir, 3.2, 0.38, 0);

  const merged = mergeGeometries(branchGeometries, false);
  return {
    treeGeometry: merged || new THREE.BoxGeometry(),
    blossomAnchors
  }
}

function SakuraTreeModel() {
  const barkTex = useMemo(() => createBarkTexture(), []);
  const blossomTex = useMemo(() => createBlossomTexture(), []);
  const { treeGeometry, blossomAnchors } = useMemo(() => generateSakuraGeometry(), []);

  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const canopyMeshRef = useRef<THREE.InstancedMesh>(null);

  const totalBlossoms = 10000;

  useEffect(() => {
    if (!instancedMeshRef.current) return;
    const dummy = new THREE.Object3D();
    const rng = new SeededRandom(123);

    let index = 0;
    const anchorsPerBlossom = Math.ceil(totalBlossoms / blossomAnchors.length);

    blossomAnchors.forEach((anchor) => {
      const count = Math.floor(rng.range(25, 42));
      for (let i = 0; i < count && index < totalBlossoms; i++) {
        // Scatter inside sphere radius 0.45
        const u = rng.range(0, 1);
        const v = rng.range(0, 1);
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = 0.45 * Math.cbrt(rng.range(0.1, 1.0));
        
        const x = anchor.x + r * Math.sin(phi) * Math.cos(theta);
        const y = anchor.y + r * Math.sin(phi) * Math.sin(theta);
        const z = anchor.z + r * Math.cos(phi);

        dummy.position.set(x, y, z);
        dummy.rotation.set(
          rng.range(0, Math.PI),
          rng.range(0, Math.PI),
          rng.range(0, Math.PI)
        );
        const scale = rng.range(0.7, 1.4);
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();

        instancedMeshRef.current!.setMatrixAt(index, dummy.matrix);

        // Color variation: white to soft pink
        const shade = rng.range(0.85, 1.0);
        const color = new THREE.Color(1.0, shade * 0.92, shade * 0.95);
        instancedMeshRef.current!.setColorAt(index, color);

        index++;
      }
    });

    // Fill remainder if any
    while (index < totalBlossoms) {
      const anchor = blossomAnchors[Math.floor(rng.range(0, blossomAnchors.length))];
      dummy.position.set(
        anchor.x + rng.range(-0.5, 0.5),
        anchor.y + rng.range(-0.5, 0.5),
        anchor.z + rng.range(-0.5, 0.5)
      );
      dummy.scale.setScalar(rng.range(0.7, 1.2));
      dummy.updateMatrix();
      instancedMeshRef.current!.setMatrixAt(index, dummy.matrix);
      instancedMeshRef.current!.setColorAt(index, new THREE.Color(1, 0.9, 0.93));
      index++;
    }

    instancedMeshRef.current.instanceMatrix.needsUpdate = true;
    if (instancedMeshRef.current.instanceColor) {
      instancedMeshRef.current.instanceColor.needsUpdate = true;
    }
  }, [blossomAnchors]);

  return (
    <group position={[0, 0, 0]}>
      {/* Tree Trunk & Branches */}
      <mesh geometry={treeGeometry} castShadow receiveShadow>
        <meshStandardMaterial
          color="#4a3426"
          roughness={0.95}
          metalness={0.05}
          bumpMap={barkTex}
          bumpScale={0.04}
        />
      </mesh>

      {/* Instanced Blossoms */}
      <instancedMesh
        ref={instancedMeshRef}
        args={[undefined, undefined, totalBlossoms]}
        castShadow
      />
      <planeGeometry args={[0.15, 0.15]} />
      <meshStandardMaterial
        map={blossomTex}
        transparent={true}
        alphaTest={0.4}
        side={THREE.DoubleSide}
        roughness={0.6}
      />
    </group>
  );
}

function SceneEnvironment() {
  return (
    <>
      {/* Ground plane */*}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[120, 120, 128, 128]} />
        <meshStandardMaterial color="#4a5c3d" roughness={0.9} />
      </mesh>

      {/* Far Hills / Background Layers */*}
      <mesh position={[0, 15, -45]} receiveShadow>
        <sphereGeometry args={[50, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <meshBasicMaterial color="#d4a39b" />
      </mesh>
      <mesh position={[0, 8, -35]} receiveShadow>
        <sphereGeometry args={[40, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <meshBasicMaterial color="#e2bcad" />
      </mesh>

      {/* Lighting */}
      <ambientLight intensity={0.7} color="#ffe5f0" />
      <directionalLight
        position={[18, 12, 12]}
        intensity={2.8}
        color="#ffd2a1"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
      />
      <hemisphereLight args={['#ffd6e5', '#7a5c4a', 0.9]} />
      
      {/* Fog to match horizon */}
      <fog attach="fog" args={['#ffb09e', 15, 55]} />
    </>
  );
}

function CameraController() {
  useFrame(({ camera, clock }) => {
    const t = clock.getElapsedTime() * 0.08;
    // Gentle auto-orbit around the tree
    const radius = 13;
    camera.position.x = Math.sin(t) * radius;
    camera.position.z = Math.cos(t) * radius;
    camera.position.y = 3.8 + Math.sin(t * 0.5) * 0.3;
    camera.lookAt(0, 3.8, 0);
  });
  return null;
}

export default function SakuraCanvas() {
  return (
    <div className="w-full h-full absolute inset-0">
      <Canvas
        shadows
        camera={{ position: [0, 3.5, 13], fov: 40 }}
        gl={{ antialias: true, outputColorSpace: THREE.SRGBColorSpace }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.1;
        }}
      >
        <color attach="background" args={['#ffb09e']} />
        <SceneEnvironment />
        <SakuraTreeModel />
        <CameraController />
        <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 2 - 0.05} minDistance={8} maxDistance={22} />
      </Canvas>
    </div>
  );
}
