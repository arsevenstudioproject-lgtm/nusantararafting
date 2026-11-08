
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

    const state = {
      species: 'deer', antlerType: 'royal', deerAnim: 'walk',
      spotCount: 14, antlerScale: 1, fishType: 'trout', fishAnim: 'swim',
      fishSize: 1, finScale: 1, animSpeed: 1, seed: 12345
    };
    let randomSeed = state.seed;
    function randRange(min, max) {
      randomSeed = (Math.imul(randomSeed, 1664525) + 1013904223) >>> 0;
      return min + (randomSeed / 4294967296) * (max - min);
    }

    // --- 2. SETUP SCENE, KAMERA, DAN RENDERER ---
    const container = document.getElementById('canvas-container');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#07111a');
    scene.fog = new THREE.FogExp2('#07111a', 0.022);

    const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 150);
    camera.position.set(5.5, 3.2, 5.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1.0, 0);
    controls.maxPolarAngle = Math.PI / 2 + 0.05;
    controls.minDistance = 2.5;
    controls.maxDistance = 20;

    // --- 3. PENCAHAYAAN STUDIO ---
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x0f172a, 1.35);
    hemiLight.position.set(0, 25, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 2.5);
    sunLight.position.set(8, 15, 9);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    const d = 6.0;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    const backLight = new THREE.DirectionalLight(0x38bdf8, 1.1);
    backLight.position.set(-8, 6, -8);
    scene.add(backLight);

    // --- 4. MATERIAL ---
    const deerMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: false,
      roughness: 0.68,
      metalness: 0.03
    });

    const antlerMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: false,
      roughness: 0.45,
      metalness: 0.08
    });

    const fishMaterial = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      flatShading: false,
      roughness: 0.16,
      metalness: 0.22,
      clearcoat: 1.0,
      clearcoatRoughness: 0.12,
      side: THREE.DoubleSide
    });

    function paintGeometry(geo, bottomColor, topColor = null, computeNormals = true) {
      const targetGeo = geo.index ? geo.toNonIndexed() : geo;
      const pos = targetGeo.attributes.position;
      const count = pos.count;
      const colors = new Float32Array(count * 3);
      const temp = new THREE.Color();

      let minY = Infinity;
      let maxY = -Infinity;
      for (let i = 0; i < count; i++) {
        const y = pos.getY(i);
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }

      for (let i = 0; i < count; i++) {
        if (topColor) {
          const t = THREE.MathUtils.clamp((pos.getY(i) - minY) / Math.max(0.001, maxY - minY), 0, 1);
          temp.copy(bottomColor).lerp(topColor, t);
        } else {
          temp.copy(bottomColor);
        }
        colors[i * 3] = temp.r;
        colors[i * 3 + 1] = temp.g;
        colors[i * 3 + 2] = temp.b;
      }

      targetGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      if (computeNormals) targetGeo.computeVertexNormals();
      return targetGeo;
    }

    function createCurvedTubeGeometry(points, radiusStart, radiusEnd, tubularSegs = 16, radialSegs = 10, colBottom, colTop, mat = antlerMaterial) {
      const curve = new THREE.CatmullRomCurve3(points);
      const geo = new THREE.TubeGeometry(curve, tubularSegs, 1.0, radialSegs, false);
      const pos = geo.attributes.position;
      const uvs = geo.attributes.uv;
      const center = new THREE.Vector3();
      const vertex = new THREE.Vector3();

      for (let i = 0; i < pos.count; i++) {
        const t = THREE.MathUtils.clamp(uvs.getX(i), 0, 1);
        curve.getPointAt(t, center);
        vertex.fromBufferAttribute(pos, i);
        vertex.sub(center);
        const r = THREE.MathUtils.lerp(radiusStart, radiusEnd, Math.pow(t, 0.85));
        vertex.multiplyScalar(r).add(center);
        pos.setXYZ(i, vertex.x, vertex.y, vertex.z);
      }

      const tipPoint = points[points.length - 1];
      for (let i = pos.count - radialSegs - 1; i < pos.count; i++) {
        if (i >= 0) pos.setXYZ(i, tipPoint.x, tipPoint.y, tipPoint.z);
      }

      geo.computeVertexNormals();
      const painted = paintGeometry(geo, colBottom, colTop, false);
      const mesh = new THREE.Mesh(painted, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    }

    // --- 5. RUSA TUTUL REALISTIS ---
    const DEER_COLORS = {
      coatBase: new THREE.Color('#b85d19'),
      coatBack: new THREE.Color('#5c2808'),
      coatFlank: new THREE.Color('#d97724'),
      bellyWhite: new THREE.Color('#fdf8ee'),
      spotWhite: new THREE.Color('#fffdf9'),
      hoofDark: new THREE.Color('#171412'),
      antlerBone: new THREE.Color('#f5efe6'),
      antlerBase: new THREE.Color('#8c6d53')
    };

    function buildAntlers(type, scale) {
      const antlerRoot = new THREE.Group();
      antlerRoot.name = "Sepasang_Tanduk";
      if (type === 'doe') return antlerRoot;

      [-1, 1].forEach((side) => {
        const sideGroup = new THREE.Group();
        const burrGeo = new THREE.CylinderGeometry(0.028 * scale, 0.024 * scale, 0.04 * scale, 10);
        const burrMesh = new THREE.Mesh(paintGeometry(burrGeo, DEER_COLORS.antlerBase), antlerMaterial);
        burrMesh.position.set(side * 0.068, 0.145, -0.025);
        burrMesh.rotation.z = side * -0.35;
        sideGroup.add(burrMesh);

        const s = scale;
        if (type === 'royal') {
          const mainBeam = createCurvedTubeGeometry([
            new THREE.Vector3(side * 0.068, 0.15, -0.025),
            new THREE.Vector3(side * (0.068 + 0.14 * s), 0.15 + 0.14 * s, -0.08 * s),
            new THREE.Vector3(side * (0.068 + 0.24 * s), 0.15 + 0.34 * s, -0.14 * s),
            new THREE.Vector3(side * (0.068 + 0.20 * s), 0.15 + 0.56 * s, -0.04 * s),
            new THREE.Vector3(side * (0.068 + 0.12 * s), 0.15 + 0.72 * s, 0.10 * s)
          ], 0.024 * s, 0.004 * s, 20, 10, DEER_COLORS.antlerBase, DEER_COLORS.antlerBone);
          sideGroup.add(mainBeam);

          const browTine = createCurvedTubeGeometry([
            new THREE.Vector3(side * (0.068 + 0.08 * s), 0.15 + 0.08 * s, -0.05 * s),
            new THREE.Vector3(side * (0.068 + 0.10 * s), 0.15 + 0.12 * s, 0.08 * s),
            new THREE.Vector3(side * (0.068 + 0.06 * s), 0.15 + 0.22 * s, 0.18 * s)
          ], 0.016 * s, 0.003 * s, 12, 8, DEER_COLORS.antlerBase, DEER_COLORS.antlerBone);
          sideGroup.add(browTine);

          const midTine = createCurvedTubeGeometry([
            new THREE.Vector3(side * (0.068 + 0.21 * s), 0.15 + 0.28 * s, -0.12 * s),
            new THREE.Vector3(side * (0.068 + 0.26 * s), 0.15 + 0.39 * s, -0.02 * s),
            new THREE.Vector3(side * (0.068 + 0.22 * s), 0.15 + 0.52 * s, 0.10 * s)
          ], 0.015 * s, 0.003 * s, 12, 8, DEER_COLORS.antlerBase, DEER_COLORS.antlerBone);
          sideGroup.add(midTine);

        } else if (type === 'palmate') {
          const stem = createCurvedTubeGeometry([
            new THREE.Vector3(side * 0.068, 0.15, -0.025),
            new THREE.Vector3(side * (0.068 + 0.13 * s), 0.15 + 0.13 * s, -0.06 * s),
            new THREE.Vector3(side * (0.068 + 0.22 * s), 0.15 + 0.28 * s, -0.09 * s)
          ], 0.024 * s, 0.020 * s, 12, 9, DEER_COLORS.antlerBase, DEER_COLORS.antlerBone);
          sideGroup.add(stem);

          const palmGeo = new THREE.SphereGeometry(0.18 * s, 14, 12);
          palmGeo.scale(0.22, 1.25, 0.85);
          const pPos = palmGeo.attributes.position;
          for (let i = 0; i < pPos.count; i++) {
            const py = pPos.getY(i);
            const pz = pPos.getZ(i);
            pPos.setX(i, pPos.getX(i) + side * (py * py + pz * pz) * 0.45);
          }
          palmGeo.computeVertexNormals();
          const palmMesh = new THREE.Mesh(
            paintGeometry(palmGeo, DEER_COLORS.antlerBase, DEER_COLORS.antlerBone, false),
            antlerMaterial
          );
          palmMesh.position.set(side * (0.068 + 0.25 * s), 0.15 + 0.42 * s, -0.10 * s);
          palmMesh.rotation.z = side * -0.42;
          palmMesh.rotation.x = -0.25;
          sideGroup.add(palmMesh);

        } else if (type === 'spike') {
          const mainSpike = createCurvedTubeGeometry([
            new THREE.Vector3(side * 0.068, 0.15, -0.025),
            new THREE.Vector3(side * (0.068 + 0.11 * s), 0.15 + 0.15 * s, -0.06 * s),
            new THREE.Vector3(side * (0.068 + 0.15 * s), 0.15 + 0.34 * s, -0.02 * s),
            new THREE.Vector3(side * (0.068 + 0.10 * s), 0.15 + 0.48 * s, 0.06 * s)
          ], 0.021 * s, 0.003 * s, 16, 8, DEER_COLORS.antlerBase, DEER_COLORS.antlerBone);
          sideGroup.add(mainSpike);
        }

        antlerRoot.add(sideGroup);
      });
      return antlerRoot;
    }

    function createRealisticDeerTorsoGeometry() {
      const geo = new THREE.CylinderGeometry(1.0, 1.0, 1.34, 28, 26, false);
      geo.rotateX(Math.PI / 2);

      const pos = geo.attributes.position;
      const count = pos.count;
      const spotCenters = [];
      const halfSpots = Math.floor(state.spotCount / 2);
      for (let s = 0; s < halfSpots; s++) {
        const sz = randRange(-0.52, 0.46);
        const sy = randRange(-0.08, 0.22);
        const r = randRange(0.036, 0.056);
        spotCenters.push({ y: sy, z: sz, r, side: 1 });
        spotCenters.push({ y: sy + randRange(-0.018, 0.018), z: sz + randRange(-0.02, 0.02), r, side: -1 });
      }

      const colors = new Float32Array(count * 3);
      const vCol = new THREE.Color();

      for (let i = 0; i < count; i++) {
        const vx = pos.getX(i);
        const vy = pos.getY(i);
        const vz = pos.getZ(i);

        const u = (vz + 0.67) / 1.34;
        const angle = Math.atan2(vy, vx);
        const sinA = Math.sin(angle);
        const cosA = Math.cos(angle);

        const endCap = Math.sin(THREE.MathUtils.clamp(u, 0.001, 0.999) * Math.PI);
        const capCurve = Math.pow(endCap, 0.38);

        const ribWidth = 0.235 + 0.045 * Math.sin(u * Math.PI * 1.85) + (u < 0.28 ? 0.025 : 0);
        const chestDepth = u > 0.48 ? 0.30 * Math.sin(((u - 0.3) / 0.7) * Math.PI * 0.85) : 0.21 + u * 0.14;
        const spineLine = 0.055 * Math.exp(-Math.pow((u - 0.78) / 0.16, 2)) + 0.035 * Math.exp(-Math.pow((u - 0.18) / 0.15, 2)) - 0.015 * Math.sin(u * Math.PI);
        const bellyLine = -0.055 * Math.exp(-Math.pow((u - 0.74) / 0.22, 2)) + 0.085 * Math.exp(-Math.pow((u - 0.28) / 0.18, 2));

        const sideBulge = 1.0 - 0.12 * sinA;
        const nx = cosA * ribWidth * sideBulge * capCurve;
        const ny = (sinA * chestDepth * capCurve) + (sinA > 0 ? spineLine : bellyLine) * capCurve;
        const nz = vz;

        pos.setXYZ(i, nx, ny, nz);

        if (ny < -0.11 + bellyLine * 0.6) {
          const bellyBlend = THREE.MathUtils.clamp((-0.07 - ny) / 0.09, 0, 1);
          vCol.copy(DEER_COLORS.coatFlank).lerp(DEER_COLORS.bellyWhite, bellyBlend);
        } else if (u < 0.09 && ny > -0.08 && Math.abs(nx) < 0.14) {
          vCol.copy(DEER_COLORS.bellyWhite);
        } else {
          const hNorm = THREE.MathUtils.clamp((ny + 0.12) / 0.42, 0, 1);
          if (hNorm < 0.5) {
            vCol.copy(DEER_COLORS.coatFlank).lerp(DEER_COLORS.coatBase, hNorm * 2.0);
          } else {
            vCol.copy(DEER_COLORS.coatBase).lerp(DEER_COLORS.coatBack, (hNorm - 0.5) * 1.85);
          }

          let maxSpotFactor = 0;
          const vSide = nx >= 0 ? 1 : -1;
          for (let sp = 0; sp < spotCenters.length; sp++) {
            const c = spotCenters[sp];
            if (c.side !== vSide) continue;
            const dy = ny - c.y;
            const dz = nz - c.z;
            const dSq = dy * dy + dz * dz;
            if (dSq < c.r * c.r) {
              const dist = Math.sqrt(dSq);
              const factor = 1.0 - THREE.MathUtils.smoothstep(dist, c.r * 0.25, c.r);
              if (factor > maxSpotFactor) maxSpotFactor = factor;
            }
          }

          if (maxSpotFactor > 0.01) {
            vCol.lerp(DEER_COLORS.spotWhite, maxSpotFactor * 0.95);
          }
        }

        colors[i * 3] = vCol.r;
        colors[i * 3 + 1] = vCol.g;
        colors[i * 3 + 2] = vCol.b;
      }

      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geo.computeVertexNormals();
      return geo;
    }

    function buildSpottedDeer() {
      const deerRoot = new THREE.Group();
      deerRoot.name = "Rusa_Tutul_Sungai";

      const bodyPivot = new THREE.Group();
      bodyPivot.name = "Deer_Body";
      bodyPivot.position.set(0, 1.06, 0);
      deerRoot.add(bodyPivot);

      const torsoGeo = createRealisticDeerTorsoGeometry();
      const torsoMesh = new THREE.Mesh(torsoGeo, deerMaterial);
      torsoMesh.castShadow = true;
      torsoMesh.receiveShadow = true;
      bodyPivot.add(torsoMesh);

      const tailPivot = new THREE.Group();
      tailPivot.name = "Deer_Tail";
      tailPivot.position.set(0, 0.14, -0.63);
      const tailMesh = createCurvedTubeGeometry([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, -0.09, -0.09),
        new THREE.Vector3(0, -0.22, -0.13)
      ], 0.055, 0.015, 10, 8, DEER_COLORS.bellyWhite, DEER_COLORS.coatBack, deerMaterial);
      tailPivot.add(tailMesh);
      bodyPivot.add(tailPivot);

      const neckPivot = new THREE.Group();
      neckPivot.name = "Deer_Neck";
      neckPivot.position.set(0, 0.12, 0.52);
      bodyPivot.add(neckPivot);

      const neckGeo = new THREE.CylinderGeometry(0.115, 0.21, 0.64, 16, 10);
      neckGeo.translate(0, 0.28, 0);
      const nPos = neckGeo.attributes.position;
      const nCols = new Float32Array(nPos.count * 3);
      const nTemp = new THREE.Color();

      for (let i = 0; i < nPos.count; i++) {
        const vx = nPos.getX(i);
        const vy = nPos.getY(i);
        const vz = nPos.getZ(i);
        const t = THREE.MathUtils.clamp(vy / 0.64, 0, 1);
        const forwardCurve = Math.sin(t * Math.PI * 0.65) * 0.18;
        nPos.setX(i, vx * 0.84);
        nPos.setZ(i, vz * 1.08 + forwardCurve);

        if (vz > 0.03) {
          nTemp.copy(DEER_COLORS.coatBase).lerp(DEER_COLORS.bellyWhite, THREE.MathUtils.clamp(vz / 0.14, 0, 0.9));
        } else {
          nTemp.copy(DEER_COLORS.coatBase).lerp(DEER_COLORS.coatBack, (1 - t) * 0.45);
        }
        nCols[i * 3] = nTemp.r;
        nCols[i * 3 + 1] = nTemp.g;
        nCols[i * 3 + 2] = nTemp.b;
      }
      neckGeo.setAttribute('color', new THREE.BufferAttribute(nCols, 3));
      neckGeo.computeVertexNormals();
      const neckMesh = new THREE.Mesh(neckGeo, deerMaterial);
      neckMesh.castShadow = true;
      neckPivot.add(neckMesh);

      const headPivot = new THREE.Group();
      headPivot.name = "Deer_Head";
      headPivot.position.set(0, 0.56, 0.18);
      neckPivot.add(headPivot);

      const headGeo = new THREE.SphereGeometry(0.16, 20, 18);
      const hPos = headGeo.attributes.position;
      const hCols = new Float32Array(hPos.count * 3);
      const hCol = new THREE.Color();

      for (let i = 0; i < hPos.count; i++) {
        let hx = hPos.getX(i);
        let hy = hPos.getY(i);
        let hz = hPos.getZ(i);

        if (hz > 0) {
          const noseT = hz / 0.16;
          hz *= 2.35;
          const taper = THREE.MathUtils.lerp(0.88, 0.36, Math.pow(noseT, 0.8));
          hx *= taper;
          hy = hy * taper - Math.pow(noseT, 1.3) * 0.045;
        } else {
          hx *= 0.85;
          hy *= 0.92;
          hz *= 1.15;
        }
        hPos.setXYZ(i, hx, hy, hz);

        if (hz > 0.32) {
          hCol.copy(DEER_COLORS.hoofDark);
        } else if (hy < -0.045) {
          hCol.copy(DEER_COLORS.bellyWhite);
        } else {
          hCol.copy(DEER_COLORS.coatBase);
        }
        hCols[i * 3] = hCol.r;
        hCols[i * 3 + 1] = hCol.g;
        hCols[i * 3 + 2] = hCol.b;
      }
      headGeo.setAttribute('color', new THREE.BufferAttribute(hCols, 3));
      headGeo.computeVertexNormals();
      const headMesh = new THREE.Mesh(headGeo, deerMaterial);
      headMesh.castShadow = true;
      headPivot.add(headMesh);

      const eyeMat = new THREE.MeshStandardMaterial({ color: 0x120d0a, roughness: 0.1, metalness: 0.2 });
      [-1, 1].forEach((side) => {
        const eyeball = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 12), eyeMat);
        eyeball.position.set(side * 0.118, 0.035, 0.075);
        headPivot.add(eyeball);
      });

      const antlers = buildAntlers(state.antlerType, state.antlerScale);
      headPivot.add(antlers);

      const legConfigs = [
        { name: 'Deer_Leg_FL', lowName: 'Deer_Knee_FL', x: 0.165, y: -0.04, z: 0.44, isHind: false },
        { name: 'Deer_Leg_FR', lowName: 'Deer_Knee_FR', x: -0.165, y: -0.04, z: 0.44, isHind: false },
        { name: 'Deer_Leg_BL', lowName: 'Deer_Knee_BL', x: 0.175, y: 0.02, z: -0.46, isHind: true },
        { name: 'Deer_Leg_BR', lowName: 'Deer_Knee_BR', x: -0.175, y: 0.02, z: -0.46, isHind: true }
      ];

      legConfigs.forEach((cfg) => {
        const upperPivot = new THREE.Group();
        upperPivot.name = cfg.name;
        upperPivot.position.set(cfg.x, cfg.y, cfg.z);

        const upperLen = cfg.isHind ? 0.48 : 0.44;
        const upperGeo = new THREE.CylinderGeometry(0.046, cfg.isHind ? 0.135 : 0.105, upperLen, 12, 6);
        upperGeo.rotateZ(Math.PI);
        upperGeo.scale(0.82, 1.0, cfg.isHind ? 1.32 : 1.12);
        upperGeo.translate(0, -upperLen * 0.48, 0);

        const uMesh = new THREE.Mesh(paintGeometry(upperGeo, DEER_COLORS.coatFlank, DEER_COLORS.coatBase), deerMaterial);
        uMesh.castShadow = true;
        upperPivot.add(uMesh);

        const lowerPivot = new THREE.Group();
        lowerPivot.name = cfg.lowName;
        lowerPivot.position.set(0, -upperLen + 0.03, 0);
        upperPivot.add(lowerPivot);

        const lowerLen = cfg.isHind ? 0.50 : 0.47;
        const lowerGeo = new THREE.CylinderGeometry(0.036, 0.026, lowerLen, 10, 4);
        lowerGeo.rotateZ(Math.PI);
        lowerGeo.translate(0, -lowerLen * 0.5, 0);
        const lMesh = new THREE.Mesh(paintGeometry(lowerGeo, DEER_COLORS.coatBack, DEER_COLORS.coatFlank), deerMaterial);
        lMesh.castShadow = true;
        lowerPivot.add(lMesh);

        const hoofGeo = new THREE.CylinderGeometry(0.028, 0.042, 0.085, 8);
        hoofGeo.translate(0, -lowerLen - 0.03, 0);
        const hoofMesh = new THREE.Mesh(paintGeometry(hoofGeo, DEER_COLORS.hoofDark), deerMaterial);
        hoofMesh.castShadow = true;
        lowerPivot.add(hoofMesh);

        bodyPivot.add(upperPivot);
      });

      return deerRoot;
    }

    // --- 6. IKAN SUNGAI REALISTIS ---
    const FISH_PALETTES = {
      trout: {
        back: new THREE.Color('#1a382c'),
        mid: new THREE.Color('#d8e2dc'),
        stripe: new THREE.Color('#f43f5e'),
        belly: new THREE.Color('#ffffff'),
        fin: new THREE.Color('#8d99ae'),
        finTip: new THREE.Color('#e2e8f0'),
        spot: new THREE.Color('#09111e')
      },
      mahseer: {
        back: new THREE.Color('#3b1d06'),
        mid: new THREE.Color('#f59e0b'),
        stripe: new THREE.Color('#d97706'),
        belly: new THREE.Color('#fffbeb'),
        fin: new THREE.Color('#b91c1c'),
        finTip: new THREE.Color('#fb923c'),
        spot: new THREE.Color('#451a03')
      },
      koi: {
        back: new THREE.Color('#ea580c'),
        mid: new THREE.Color('#f8fafc'),
        stripe: new THREE.Color('#f97316'),
        belly: new THREE.Color('#ffffff'),
        fin: new THREE.Color('#fb923c'),
        finTip: new THREE.Color('#fff7ed'),
        spot: new THREE.Color('#0f172a')
      }
    };

    function createRayedFinGeometry(width, length, rays = 10, curveBack = 0.25, colBase, colTip) {
      const geo = new THREE.PlaneGeometry(width, length, rays, 6);
      geo.translate(0, length * 0.5, 0);
      const pos = geo.attributes.position;
      const colors = new Float32Array(pos.count * 3);
      const c = new THREE.Color();

      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i);
        let y = pos.getY(i);
        const v = THREE.MathUtils.clamp(y / length, 0, 1);
        const u = (x / width) + 0.5;

        const fanSpread = THREE.MathUtils.lerp(0.38, 1.25, Math.pow(v, 0.75));
        x *= fanSpread;
        y *= (0.65 + 0.35 * Math.sin(u * Math.PI));

        const rayWave = Math.sin(u * Math.PI * rays) * 0.012 * v;
        const sweepZ = -Math.pow(v, 1.5) * curveBack;

        pos.setXYZ(i, x, y, sweepZ + rayWave);
        c.copy(colBase).lerp(colTip, Math.min(1, v * 0.9));
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }

      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geo.computeVertexNormals();
      return geo;
    }

    function buildRealisticFish() {
      const fishRoot = new THREE.Group();
      fishRoot.name = "Ikan_Sungai_Realistis";

      const pal = FISH_PALETTES[state.fishType] || FISH_PALETTES.trout;
      const sz = state.fishSize;
      const fScale = state.finScale;

      const headBodyPivot = new THREE.Group();
      headBodyPivot.name = "Fish_Root";
      headBodyPivot.position.set(0, 0.95, 0);
      fishRoot.add(headBodyPivot);

      function getFishProfile(zNorm) {
        const t = THREE.MathUtils.clamp(zNorm, 0, 1);
        const heightProfile = t < 0.32
          ? Math.pow(t / 0.32, 0.62) * 0.31
          : 0.042 + 0.268 * Math.pow(Math.cos(((t - 0.32) / 0.68) * Math.PI * 0.5), 1.35);
        const widthProfile = heightProfile * (state.fishType === 'koi' ? 0.62 : 0.52);
        return { rx: widthProfile * sz, ry: heightProfile * sz, yOff: Math.sin(t * Math.PI) * 0.025 * sz };
      }

      function createSeamlessFishSection(tStart, tEnd, zOriginOffset = 0, segsZ = 14) {
        const totalLength = 1.65 * sz;
        const zStart = (0.5 - tStart) * totalLength;
        const zEnd = (0.5 - tEnd) * totalLength;
        const secLen = Math.abs(zStart - zEnd);

        const geo = new THREE.CylinderGeometry(1, 1, secLen, 28, segsZ, true);
        geo.rotateX(Math.PI / 2);

        const pos = geo.attributes.position;
        const colors = new Float32Array(pos.count * 3);
        const col = new THREE.Color();

        for (let i = 0; i < pos.count; i++) {
          const vx = pos.getX(i);
          const vy = pos.getY(i);
          const vz = pos.getZ(i);

          const localFrac = 0.5 - (vz / secLen);
          const globalT = THREE.MathUtils.lerp(tStart, tEnd, localFrac);
          const worldZ = THREE.MathUtils.lerp(zStart, zEnd, localFrac);

          const angle = Math.atan2(vy, vx);
          const prof = getFishProfile(globalT);

          let nx = Math.cos(angle) * prof.rx;
          let ny = Math.sin(angle) * prof.ry + prof.yOff;
          pos.setXYZ(i, nx, ny, worldZ - zOriginOffset);

          const yNorm = THREE.MathUtils.clamp((Math.sin(angle) + 1) * 0.5, 0, 1);
          if (yNorm < 0.36) {
            col.copy(pal.belly).lerp(pal.mid, yNorm / 0.36);
          } else if (yNorm < 0.58) {
            col.copy(pal.mid).lerp(pal.stripe, 0.5);
          } else {
            col.copy(pal.mid).lerp(pal.back, (yNorm - 0.58) / 0.42);
          }

          const pattern = Math.sin(globalT * 67 + state.seed) * Math.cos(angle * 13 + state.seed * 0.7);
          if (state.fishType === 'trout' && pattern > 0.72 && yNorm > 0.3) col.lerp(pal.spot, 0.85);
          if (state.fishType === 'koi') {
            const patch = Math.sin(globalT * 17 + state.seed) + Math.cos(angle * 3 + state.seed * 0.2);
            col.copy(pal.belly).lerp(pal.stripe, THREE.MathUtils.smoothstep(patch, 0.1, 0.55));
          }
          colors[i * 3] = col.r;
          colors[i * 3 + 1] = col.g;
          colors[i * 3 + 2] = col.b;
        }

        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, fishMaterial);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
      }

      const frontSection = createSeamlessFishSection(0.0, 0.45, 0, 18);
      headBodyPivot.add(frontSection);

      const noseCap = new THREE.Mesh(paintGeometry(new THREE.SphereGeometry(0.032 * sz, 12, 10), pal.back), fishMaterial);
      noseCap.scale.set(0.8, 0.65, 1.2);
      noseCap.position.set(0, 0.005 * sz, 0.815 * sz);
      headBodyPivot.add(noseCap);
      const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x080d10, roughness: 0.18 });
      [-1, 1].forEach((side) => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.026 * sz, 12, 8), eyeMaterial);
        eye.position.set(side * 0.105 * sz, 0.075 * sz, 0.57 * sz);
        headBodyPivot.add(eye);
      });

      ['Fish_Fin_L', 'Fish_Fin_R'].forEach((name, idx) => {
        const side = idx === 0 ? 1 : -1;
        const finPivot = new THREE.Group();
        finPivot.name = name;
        finPivot.position.set(side * 0.135 * sz, -0.11 * sz, 0.36 * sz);
        const pFinGeo = createRayedFinGeometry(0.16 * sz * fScale, 0.34 * sz * fScale, 9, 0.12 * sz, pal.fin, pal.finTip);
        const pFinMesh = new THREE.Mesh(pFinGeo, fishMaterial);
        pFinMesh.rotation.z = side * -1.15;
        pFinMesh.rotation.x = -0.58;
        finPivot.add(pFinMesh);
        headBodyPivot.add(finPivot);
      });

      const dorsalGeo = createRayedFinGeometry(0.28 * sz * fScale, 0.32 * sz * fScale, 12, 0.18 * sz, pal.back, pal.fin);
      dorsalGeo.rotateY(Math.PI / 2);
      const dorsalMesh = new THREE.Mesh(dorsalGeo, fishMaterial);
      dorsalMesh.position.set(0, 0.26 * sz, 0.05 * sz);
      headBodyPivot.add(dorsalMesh);

      const zMidOrigin = (0.5 - 0.45) * 1.65 * sz;
      const midSpinePivot = new THREE.Group();
      midSpinePivot.name = "Fish_MidSpine";
      midSpinePivot.position.set(0, 0, zMidOrigin);
      headBodyPivot.add(midSpinePivot);

      const midSection = createSeamlessFishSection(0.45, 0.78, zMidOrigin, 14);
      midSpinePivot.add(midSection);

      const zTailOrigin = (0.5 - 0.78) * 1.65 * sz;
      const tailSpinePivot = new THREE.Group();
      tailSpinePivot.name = "Fish_TailFin";
      tailSpinePivot.position.set(0, 0, zTailOrigin - zMidOrigin);
      midSpinePivot.add(tailSpinePivot);

      const tailSection = createSeamlessFishSection(0.78, 1.0, zTailOrigin, 10);
      tailSpinePivot.add(tailSection);

      const caudalLength = (0.5 - 1.0) * 1.65 * sz - zTailOrigin;
      [1, -1].forEach((lobeDir) => {
        const lobeGeo = createRayedFinGeometry(0.22 * sz * fScale, 0.44 * sz * fScale, 12, 0.14 * sz * lobeDir, pal.back, pal.fin);
        lobeGeo.rotateY(Math.PI / 2);
        if (lobeDir < 0) lobeGeo.rotateZ(Math.PI);
        const lobeMesh = new THREE.Mesh(lobeGeo, fishMaterial);
        lobeMesh.position.set(0, lobeDir * 0.02 * sz, caudalLength + 0.04 * sz);
        tailSpinePivot.add(lobeMesh);
      });

      return fishRoot;
    }

    // --- 7. SISTEM ANIMASI & EKSPOR .GLB ---
    let mixer = null;
    let activeClips = [];

    function buildAnimationClipForCurrentAsset(rootObject) {
      const tracks = [];
      const steps = 24;
      const duration = 1.6 / state.animSpeed;
      const times = [];
      for (let i = 0; i <= steps; i++) times.push((i / steps) * duration);

      function addRotationTrack(nodeName, eulerCallback) {
        const node = rootObject.getObjectByName(nodeName);
        if (!node) return;
        const baseEuler = node.rotation.clone();
        const values = [];
        const q = new THREE.Quaternion();
        const e = new THREE.Euler();

        for (let i = 0; i <= steps; i++) {
          const phase = (i / steps) * Math.PI * 2;
          const offset = eulerCallback(phase);
          e.set(baseEuler.x + offset.x, baseEuler.y + offset.y, baseEuler.z + offset.z);
          q.setFromEuler(e);
          values.push(q.x, q.y, q.z, q.w);
        }
        tracks.push(new THREE.QuaternionKeyframeTrack(`${nodeName}.quaternion`, times, values));
      }

      function addPositionTrack(nodeName, posCallback) {
        const node = rootObject.getObjectByName(nodeName);
        if (!node) return;
        const basePos = node.position.clone();
        const values = [];

        for (let i = 0; i <= steps; i++) {
          const phase = (i / steps) * Math.PI * 2;
          const offset = posCallback(phase);
          values.push(basePos.x + offset.x, basePos.y + offset.y, basePos.z + offset.z);
        }
        tracks.push(new THREE.VectorKeyframeTrack(`${nodeName}.position`, times, values));
      }

      if (state.species === 'deer') {
        const mode = state.deerAnim;
        if (mode === 'graze') {
          addPositionTrack('Deer_Body', (p) => ({ x: 0, y: Math.sin(p) * 0.02, z: 0 }));
          addRotationTrack('Deer_Neck', (p) => ({ x: 0.78 + Math.sin(p) * 0.25, y: 0, z: 0 }));
          addRotationTrack('Deer_Head', (p) => ({ x: -0.35 + Math.sin(p) * 0.18, y: 0, z: 0 }));
          addRotationTrack('Deer_Leg_FL', (p) => ({ x: -0.22, y: 0, z: 0 }));
          addRotationTrack('Deer_Knee_FL', (p) => ({ x: 0.28, y: 0, z: 0 }));
        } else if (mode === 'walk') {
          addPositionTrack('Deer_Body', (p) => ({ x: 0, y: Math.abs(Math.sin(p)) * 0.045, z: 0 }));
          const walkLegs = [
            { up: 'Deer_Leg_FL', low: 'Deer_Knee_FL', offset: 0 },
            { up: 'Deer_Leg_BR', low: 'Deer_Knee_BR', offset: 0.45 },
            { up: 'Deer_Leg_FR', low: 'Deer_Knee_FR', offset: Math.PI },
            { up: 'Deer_Leg_BL', low: 'Deer_Knee_BL', offset: Math.PI + 0.45 }
          ];
          walkLegs.forEach((lg) => {
            addRotationTrack(lg.up, (p) => ({ x: Math.sin(p + lg.offset) * 0.42, y: 0, z: 0 }));
            addRotationTrack(lg.low, (p) => ({ x: Math.max(0, Math.cos(p + lg.offset)) * 0.58, y: 0, z: 0 }));
          });
        } else if (mode === 'run') {
          addPositionTrack('Deer_Body', (p) => ({ x: 0, y: Math.max(-0.04, Math.sin(p) * 0.24), z: 0 }));
          ['FL', 'FR', 'BL', 'BR'].forEach((leg, i) => {
            const offset = [0, 0.35, Math.PI, Math.PI + 0.35][i];
            addRotationTrack('Deer_Leg_' + leg, (p) => ({ x: Math.sin(p + offset) * 0.72, y: 0, z: 0 }));
            addRotationTrack('Deer_Knee_' + leg, (p) => ({ x: Math.max(0, Math.cos(p + offset)) * 0.95, y: 0, z: 0 }));
          });
        }
      } else {
        const mode = state.fishAnim;
        const freq = mode === 'dart' ? 2.0 : 1.0;
        addPositionTrack('Fish_Root', (p) => ({ x: 0, y: mode === 'jump' ? Math.sin(p) * 0.55 : 0, z: 0 }));
        addRotationTrack('Fish_MidSpine', (p) => ({ x: 0, y: Math.sin(p * freq - 0.9) * 0.34, z: 0 }));
        addRotationTrack('Fish_TailFin', (p) => ({ x: 0, y: Math.sin(p * freq - 1.8) * 0.52, z: 0 }));
      }

      return new THREE.AnimationClip(state.species === 'deer' ? state.deerAnim : state.fishAnim, duration, tracks);
    }

    // --- 8. PREVIEW SCENE ---
    const envGroup = new THREE.Group();
    scene.add(envGroup);

    const waterGeo = new THREE.CircleGeometry(20, 32);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMesh = new THREE.Mesh(waterGeo, new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2, transparent: true, opacity: 0.7 }));
    waterMesh.position.y = 0.02;
    envGroup.add(waterMesh);

    const exportableRoot = new THREE.Group();
    scene.add(exportableRoot);

    function rebuildScene() {
      if (mixer) { mixer.stopAllAction(); mixer = null; }
      exportableRoot.traverse((obj) => {
        if (obj.isMesh) {
          obj.geometry.dispose();
          if (![deerMaterial, antlerMaterial, fishMaterial].includes(obj.material)) obj.material.dispose();
        }
      });
      exportableRoot.clear();
      randomSeed = state.seed;

      let model = state.species === 'deer' ? buildSpottedDeer() : buildRealisticFish();
      exportableRoot.add(model);
      model.traverse(node => {
        node.userData.restPosition = node.position.toArray();
        node.userData.restQuaternion = node.quaternion.toArray();
      });

      const clip = buildAnimationClipForCurrentAsset(exportableRoot);
      activeClips = [clip];
      mixer = new THREE.AnimationMixer(exportableRoot);
      mixer.clipAction(clip).play();

      let tris = 0;
      exportableRoot.traverse((obj) => {
        if (obj.isMesh && obj.geometry) tris += (obj.geometry.index ? obj.geometry.index.count : obj.geometry.attributes.position.count) / 3;
      });
      document.getElementById('poly-counter').textContent = `Segitiga: ${Math.round(tris).toLocaleString('id-ID')} tris`;
    }

    rebuildScene();

    const exporter = new GLTFExporter();
    function exportToGLB() {
      const button = document.getElementById('btn-export');
      if (button.disabled) return;
      button.disabled = true;
      button.textContent = 'Menyiapkan GLB…';
      const filename = state.species + '_' + (state.species === 'deer' ? state.antlerType : state.fishType) + '_' + activeClips[0].name + '_' + state.seed + '.glb';
      const snapshot = exportableRoot.clone(true);
      const clips = activeClips.map(clip => clip.clone());
      snapshot.traverse(node => {
        if (node.userData.restPosition) node.position.fromArray(node.userData.restPosition);
        if (node.userData.restQuaternion) node.quaternion.fromArray(node.userData.restQuaternion);
        node.userData = {};
      });
      const finish = () => { button.disabled = false; button.textContent = 'Unduh .GLB'; };
      exporter.parse(
        snapshot,
        (glb) => {
          const blob = new Blob([glb], { type: 'model/gltf-binary' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 10000);
          finish();
          const toast = document.getElementById('export-toast');
          toast.classList.remove('hidden');
          setTimeout(() => toast.classList.add('hidden'), 3000);
        },
        (error) => {
          finish();
          console.error(error);
          alert('Ekspor GLB gagal: ' + error.message);
        },
        { binary: true, animations: clips, trs: true }
      );
    }

    // UI Events
    document.getElementById('tab-deer').addEventListener('click', (e) => {
      state.species = 'deer';
      e.currentTarget.className = 'species-btn active py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-amber-400 bg-amber-500/20 text-white transition';
      document.getElementById('tab-fish').className = 'species-btn py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-800 transition';
      document.getElementById('panel-deer-options').classList.remove('hidden');
      document.getElementById('panel-fish-options').classList.add('hidden');
      rebuildScene();
    });

    document.getElementById('tab-fish').addEventListener('click', (e) => {
      state.species = 'fish';
      e.currentTarget.className = 'species-btn active py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-amber-400 bg-amber-500/20 text-white transition';
      document.getElementById('tab-deer').className = 'species-btn py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-800 transition';
      document.getElementById('panel-fish-options').classList.remove('hidden');
      document.getElementById('panel-deer-options').classList.add('hidden');
      rebuildScene();
    });

    document.querySelectorAll('.antler-btn').forEach(b => b.addEventListener('click', (e) => {
      document.querySelectorAll('.antler-btn').forEach(x => { x.className = 'antler-btn flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-semibold bg-slate-800/60 border border-slate-700 text-slate-300 hover:bg-slate-800'; x.querySelector('.indicator').className = 'indicator text-transparent text-xs'; });
      e.currentTarget.className = 'antler-btn active flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-semibold bg-amber-500/20 border border-amber-400 text-white';
      e.currentTarget.querySelector('.indicator').className = 'indicator text-amber-400 text-xs';
      state.antlerType = e.currentTarget.dataset.antler;
      rebuildScene();
    }));

    document.querySelectorAll('.deer-anim-btn').forEach(b => b.addEventListener('click', (e) => {
      document.querySelectorAll('.deer-anim-btn').forEach(x => { x.className = 'deer-anim-btn py-2 px-2 rounded-lg text-[11px] font-semibold border border-slate-700 bg-slate-800/60 text-slate-300'; });
      e.currentTarget.className = 'deer-anim-btn active py-2 px-2 rounded-lg text-[11px] font-bold border border-amber-400 bg-amber-500/20 text-white';
      state.deerAnim = e.currentTarget.dataset.deerAnim;
      rebuildScene();
    }));

    document.querySelectorAll('.fish-type-btn').forEach(b => b.addEventListener('click', (e) => {
      document.querySelectorAll('.fish-type-btn').forEach(x => { x.className = 'fish-type-btn flex items-center justify-between px-3.5 py-2 rounded-xl text-left text-xs font-semibold bg-slate-800/60 border border-slate-700 text-slate-300 hover:bg-slate-800'; x.querySelector('.indicator').className = 'indicator text-transparent text-xs'; });
      e.currentTarget.className = 'fish-type-btn active flex items-center justify-between px-3.5 py-2 rounded-xl text-left text-xs font-semibold bg-amber-500/20 border border-amber-400 text-white';
      e.currentTarget.querySelector('.indicator').className = 'indicator text-amber-400 text-xs';
      state.fishType = e.currentTarget.dataset.fish;
      rebuildScene();
    }));

    document.querySelectorAll('.fish-anim-btn').forEach(b => b.addEventListener('click', (e) => {
      document.querySelectorAll('.fish-anim-btn').forEach(x => { x.className = 'fish-anim-btn py-2 px-2 rounded-lg text-[11px] font-semibold border border-slate-700 bg-slate-800/60 text-slate-300'; });
      e.currentTarget.className = 'fish-anim-btn active py-2 px-2 rounded-lg text-[11px] font-bold border border-amber-400 bg-amber-500/20 text-white';
      state.fishAnim = e.currentTarget.dataset.fishAnim;
      rebuildScene();
    }));

    document.getElementById('slider-spots').addEventListener('input', (e) => {
      state.spotCount = parseInt(e.target.value);
      document.getElementById('val-spots').textContent = `${state.spotCount} Bintik`;
      rebuildScene();
    });

    document.getElementById('slider-antler-scale').addEventListener('input', (e) => {
      state.antlerScale = parseFloat(e.target.value);
      document.getElementById('val-antler-scale').textContent = `${state.antlerScale.toFixed(2)}x`;
      rebuildScene();
    });

    document.getElementById('slider-fish-size').addEventListener('input', (e) => {
      state.fishSize = parseFloat(e.target.value);
      document.getElementById('val-fish-size').textContent = `${state.fishSize.toFixed(2)}x`;
      rebuildScene();
    });

    document.getElementById('slider-fin-scale').addEventListener('input', (e) => {
      state.finScale = parseFloat(e.target.value);
      document.getElementById('val-fin-scale').textContent = `${state.finScale.toFixed(2)}x`;
      rebuildScene();
    });

    document.getElementById('slider-anim-speed').addEventListener('input', (e) => {
      state.animSpeed = parseFloat(e.target.value);
      document.getElementById('val-anim-speed').textContent = `${state.animSpeed.toFixed(1)}x`;
      rebuildScene();
    });

    document.getElementById('btn-randomize').addEventListener('click', () => {
      state.seed = Math.floor(Math.random() * 99999) + 1;
      rebuildScene();
    });

    document.getElementById('btn-export').addEventListener('click', exportToGLB);

    window.addEventListener('resize', () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    });

    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();
      if (mixer) mixer.update(delta);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();
  
