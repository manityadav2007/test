# Sakura Sanctuary — Golden Hour Edition

A breathtaking single-page immersive 3D web experience featuring a procedurally generated cherry blossom tree in golden-hour light.

## Features & Fixes

- **Robust Error Handling & Safety Timeout**: Scene initialization is wrapped in try/catch with an 8-second safety timeout, guaranteeing the loader always dismisses and displays helpful error text if WebGL fails.
- **Strict Three.js Namespace Compliance**: All Three.js constructors and classes (Vector3, Color, FogExp2, BufferGeometry, etc.) are properly namespaced with `THREE.` to prevent reference errors.
- **Procedural Sakura Tree**: Recursive trunk and branch generation with bark and instanced pink-white blossoms.
- **Golden Hour Environment**: Warm directional lighting, soft PCF shadows, custom gradient sky, and serene atmosphere with multiple lighting themes (Golden, Twilight, Zen).

## Local Development

Simply open `index.html` in any modern web browser or serve via a local static file server (e.g. `npx serve`).
