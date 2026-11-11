import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createPoolPhysics } from './poolPhysics.js';
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';


RectAreaLightUniformsLib.init();

const scene = new THREE.Scene();
const arcadeHtmlScene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const gltfLoader = new GLTFLoader();
const fbxLoader = new FBXLoader();
const nightRainScreenPosition = new THREE.Vector3(-1.9, 2, -3.5);
const nightRainScreenHeight = 2;
const floorMaterialSettings = { parallaxScale: 0.012, bevelDepth: 0.018, updateBevel: null };
const rainWindowUniforms = {
  time: { value: 0 },
  dropSize: { value: 1 },
  dropAmount: { value: 0.34 },
  fallingAmount: { value: 0.55 },
  fallingSpeed: { value: 1 }
};

const physics = await createPoolPhysics();

let ArcadeMachine, ArcadeMachine1, ArcadeMachine2, ArcadeMachine3, ArcadeMachine4, ArcadeMachine5, ArcadeMachine6;
let nightRainAnimation = null;
let tubeLightFlicker = null;
let cueBallBody = null;
let eightBallBody = null;
let cueBallHitDirection = null;
let previousPhysicsTime = 0;
let arcadeScreenMaterial = null;
let arcadeHtmlScreen = null;
let tableLightPivot = null;
let hangingLightPivot = null;
let screen = null;
let cameraPan = null;
let cameraHomePosition = null;
let cameraHomeTarget = null;
let isCameraZoomedIn = false;
let coinAnimation = null;
const candleAnimations = [];
const cueBallMass = 0.17;
const coinAnimationDuration = 2000;
const coinDropDistance = 0.1;

function loadGLTF(path, onLoad) {
  gltfLoader.load(path, (gltf) => onLoad(gltf.scene), undefined, (error) => {
    console.error(`Failed to load GLTF/GLB asset: ${path}`, error);
  });
}

function loadFBX(path, onLoad) {
  fbxLoader.load(path, onLoad, undefined, (error) => {
    console.error(`Failed to load FBX asset: ${path}`, error);
  });
}

loadGLTF('/arcade-machine/Arcade_Machine.glb', (arcadeModel) => {

  arcadeModel.position.y = -1;
  ArcadeMachine = arcadeModel;
  ArcadeMachine.position.x = -2
  scene.add(ArcadeMachine);

  const insertCoinTexture = new THREE.TextureLoader().load('/InsertCoin.png');
  insertCoinTexture.colorSpace = THREE.SRGBColorSpace;
  const insertCoin = new THREE.Mesh(
    new THREE.PlaneGeometry(0.105, 0.105),
    new THREE.MeshBasicMaterial({
      map: insertCoinTexture,
      transparent: true,
      alphaTest: 0.05,
      toneMapped: false
    })
  );
  insertCoin.name = 'InsertCoin';
  // Sit just above the sloped control panel, to the left of the joystick.
  insertCoin.position.set(0.3389, 0.978, 0.136);
  insertCoin.rotation.set(-Math.PI / 2 + 0.182, Math.PI / 2, 0, 'YXZ');
  ArcadeMachine.add(insertCoin);
  
  const screenPosition = ArcadeMachine.position.clone()
    .add(new THREE.Vector3(0.3, 1.348, 0));
  let screenTexture = new THREE.TextureLoader().load("/Floor.webp");
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  screen = createPlane(
  0.61,
  0.53,
  0xffffff,
  screenPosition,
  new THREE.Euler(-0.3, Math.PI/2, 0),
  screenTexture
);
// 4. Create the Material
  const noiseMaterial = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    uniforms: {
      uTime: { value: 3.0 }
    }
  });
  arcadeScreenMaterial = noiseMaterial;
  screen.material = noiseMaterial;
  scene.add(screen);
  showArcadeHtmlScreen();

  const screenLight = new THREE.PointLight(0x8adfff, 0.5, 1, 4);
  screenLight.position.copy(screenPosition).add(new THREE.Vector3(0.35, 0.05, 0));
  scene.add(screenLight);
} );

function importBilardoFbx() {
  loadFBX('/pool-table/table.fbx', (object) => {

    object.scale.set(0.2, 0.2, 0.2);
    object.position.set(1.5, -1, -4);
    const feltBumpMap = createFeltBumpMap();
    object.traverse((child) => {
      if (!child.isMesh) return;

      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (/uphol|velvet|reseda|felt|baize|cloth/i.test(material.name)) {
          material.color.set(0x35512e);
          material.shininess = 12;
          material.specular.set(0x101610);
          material.bumpMap = feltBumpMap;
          material.bumpScale = 0.004;
          material.needsUpdate = true;
        } else if (/wood|lacquer|material #0/i.test(material.name)) {
          material.color.multiply(new THREE.Color(1.18, 1.05, 0.9));
          material.shininess = 28;
          material.specular.set(0x30251a);
          material.needsUpdate = true;
        }
      }
    });

    const tableBounds = new THREE.Box3().setFromObject(object);
    const tableCenter = tableBounds.getCenter(new THREE.Vector3());
    const tableSize = tableBounds.getSize(new THREE.Vector3());
    const feltHeight = tableBounds.max.y - 0.0166;
    const cushionWidth = 0.12;
    const cushionHeight = 0.12;
    const playWidth = tableSize.x - cushionWidth * 2;
    const playDepth = tableSize.z - cushionWidth * 2;

    function addStaticBox(position, size) {
      const collider = new THREE.Mesh(
        new THREE.BoxGeometry(size.x, size.y, size.z),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      collider.position.copy(position);
      scene.add(collider);
      physics.addMesh(collider);
    }

    addStaticBox(
      new THREE.Vector3(tableCenter.x, feltHeight - 0.04, tableCenter.z),
      new THREE.Vector3(playWidth, 0.08, playDepth)
    );
    addStaticBox(
      new THREE.Vector3(tableCenter.x - playWidth / 2 - cushionWidth / 2, feltHeight + cushionHeight / 2, tableCenter.z),
      new THREE.Vector3(cushionWidth, cushionHeight, playDepth + cushionWidth * 2)
    );
    addStaticBox(
      new THREE.Vector3(tableCenter.x + playWidth / 2 + cushionWidth / 2, feltHeight + cushionHeight / 2, tableCenter.z),
      new THREE.Vector3(cushionWidth, cushionHeight, playDepth + cushionWidth * 2)
    );
    addStaticBox(
      new THREE.Vector3(tableCenter.x, feltHeight + cushionHeight / 2, tableCenter.z - playDepth / 2 - cushionWidth / 2),
      new THREE.Vector3(playWidth, cushionHeight, cushionWidth)
    );
    addStaticBox(
      new THREE.Vector3(tableCenter.x, feltHeight + cushionHeight / 2, tableCenter.z + playDepth / 2 + cushionWidth / 2),
      new THREE.Vector3(playWidth, cushionHeight, cushionWidth)
    );

    loadGLTF('/pool-balls/eight-ball-set.gltf', (poolBalls) => {
      poolBalls.position.set(tableCenter.x, feltHeight, tableCenter.z);
      poolBalls.rotation.y = Math.PI / 2;
      scene.add(poolBalls);
      poolBalls.updateMatrixWorld(true);
      const rackCenter = new THREE.Vector3();
      let rackBallCount = 0;

      for (let ballNumber = 0; ballNumber <= 15; ballNumber++) {
        const ballName = ballNumber === 0
          ? 'CueBall'
          : `Ball_${String(ballNumber).padStart(2, '0')}`;
        const visual = poolBalls.getObjectByName(ballName);
        if (!visual?.isMesh) continue;

        const body = new THREE.Mesh(
          new THREE.SphereGeometry(0.05, 16, 12),
          new THREE.MeshBasicMaterial({ visible: false })
        );
        body.name = `${ballName}_PhysicsBody`;
        body.position.copy(visual.getWorldPosition(new THREE.Vector3()));
        body.quaternion.copy(visual.getWorldQuaternion(new THREE.Quaternion()));
        scene.attach(visual);
        scene.add(body);
        body.attach(visual);
        physics.addMesh(body, cueBallMass, 0.82);

        if (ballName === 'CueBall') {
          cueBallBody = body;
          visual.userData.physicsBody = body;
        } else {
          rackCenter.add(body.position);
          rackBallCount++;
        }
        if (ballName === 'Ball_08') {
          eightBallBody = body;
          visual.userData.physicsBody = body;
        }
      }

      if (cueBallBody && rackBallCount > 0) {
        rackCenter.divideScalar(rackBallCount);
        cueBallHitDirection = rackCenter.sub(cueBallBody.position).setY(0).normalize();
      }
    });
    tableLightPivot = new THREE.Group();
    tableLightPivot.position.set(tableCenter.x, tableBounds.max.y + 3.5, tableCenter.z);
    const tableLight = new THREE.SpotLight(0xffffff, 88, 0, Math.PI / 5, 0.5, 2);
    tableLight.position.y = -0.5;
    tableLight.target.position.set(0, tableCenter.y - tableLightPivot.position.y, 0);
    tableLightPivot.add(tableLight, tableLight.target);
    scene.add(object);
    scene.add(tableLightPivot);
  });
  loadGLTF('/pool-table/hanging_light.glb', (gltf) => {
    gltf.scale.set(1, 1, 1);
    gltf.updateMatrixWorld(true);
    const lightBounds = new THREE.Box3().setFromObject(gltf);
    const suspensionY = lightBounds.max.y;
    hangingLightPivot = new THREE.Group();
    hangingLightPivot.position.set(1.5, 2 + suspensionY, -4);
    gltf.position.y = -suspensionY;
    hangingLightPivot.add(gltf);
    scene.add(hangingLightPivot);
  });

}

function createFeltBumpMap() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create the pool-table felt bump texture.');

  const image = context.createImageData(size, size);
  for (let index = 0; index < image.data.length; index += 4) {
    const shade = 118 + Math.random() * 20;
    image.data[index] = shade;
    image.data[index + 1] = shade;
    image.data[index + 2] = shade;
    image.data[index + 3] = 255;
  }
  context.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  return texture;
}

importBilardoFbx();

function importPubCounter() {
  loadGLTF('/counter/pub_counter.glb', (pubCounter) => {
    pubCounter.position.set(-4, -1, 5);
    pubCounter.scale.set(1.2,1.2,1.2);
    scene.add(pubCounter);
    pubCounter.updateMatrixWorld(true);
    createCounterCandles(pubCounter);
  });
}

importPubCounter();

function createCounterCandles(counter) {
  const counterBounds = new THREE.Box3().setFromObject(counter);
  const counterSize = counterBounds.getSize(new THREE.Vector3());
  const counterCenter = counterBounds.getCenter(new THREE.Vector3());
  const spreadAlongX = counterSize.x >= counterSize.z;
  const spread = Math.min((spreadAlongX ? counterSize.x : counterSize.z) * 0.18, 0.65);
  const flameShape = new THREE.LatheGeometry([
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.012, 0.018),
    new THREE.Vector2(0.027, 0.048),
    new THREE.Vector2(0.025, 0.075),
    new THREE.Vector2(0.015, 0.105),
    new THREE.Vector2(0, 0.135)
  ], 10);
  const waxMaterial = new THREE.MeshStandardMaterial({
    color: 0xc9b58d,
    roughness: 0.88
  });
  const brassMaterial = new THREE.MeshStandardMaterial({
    color: 0x75512d,
    metalness: 0.55,
    roughness: 0.48
  });
  const wickMaterial = new THREE.MeshStandardMaterial({
    color: 0x211914,
    roughness: 1
  });
  const outerFlameMaterial = new THREE.MeshStandardMaterial({
    color: 0x9e3b10,
    emissive: 0xff5718,
    emissiveIntensity: 2.2,
    roughness: 0.48
  });
  const innerFlameMaterial = new THREE.MeshStandardMaterial({
    color: 0xffa634,
    emissive: 0xffbd57,
    emissiveIntensity: 3.2,
    roughness: 0.38
  });

  for (let index = 0; index < 2; index++) {
    const candle = new THREE.Group();
    candle.name = `Bar candle ${index + 1}`;
    const axisOffset = index === 0 ? -spread : spread;
    const position = counterCenter.clone();
    if (spreadAlongX) {
      position.x += axisOffset;
    } else {
      position.z += axisOffset;
    }
    position.y = counterBounds.max.y + 0.008;
    candle.position.copy(position);

    const holder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.063, 0.069, 0.022, 16),
      brassMaterial
    );
    holder.position.y = 0.011;
    candle.add(holder);

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.039, 0.043, 0.17, 16),
      waxMaterial
    );
    body.position.y = 0.105;
    candle.add(body);

    const wick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.003, 0.003, 0.025, 6),
      wickMaterial
    );
    wick.position.y = 0.202;
    candle.add(wick);

    const flame = new THREE.Group();
    flame.name = `Candle flame ${index + 1}`;
    flame.position.set(0, 0.214, 0);
    const outerFlame = new THREE.Mesh(flameShape, outerFlameMaterial);
    outerFlame.scale.set(0.9, 0.8, 0.9);
    flame.add(outerFlame);

    const innerFlame = new THREE.Mesh(flameShape, innerFlameMaterial);
    innerFlame.scale.set(0.42, 0.54, 0.42);
    innerFlame.position.y = 0.008;
    flame.add(innerFlame);
    candle.add(flame);

    const light = new THREE.PointLight(0xff873b, 1.05, 2.4, 2);
    light.position.set(0, 0.29, 0);
    candle.add(light);
    scene.add(candle);
    candleAnimations.push({
      flame,
      light,
      phase: index * 2.7,
      baseRotation: (index === 0 ? -1 : 1) * 0.08
    });
  }
}

function updateCandleFlicker(time) {
  const seconds = time / 1000;
  for (const candle of candleAnimations) {
    const slowFlicker = Math.sin(seconds * 8.1 + candle.phase) * 0.055;
    const quickFlicker = Math.sin(seconds * 19.7 + candle.phase * 1.7) * 0.035;
    const flutter = Math.sin(seconds * 12.4 + candle.phase * 0.6) * 0.025;
    const brightness = 1 + slowFlicker + quickFlicker;
    candle.flame.scale.set(
      1 + flutter,
      brightness,
      1 - flutter * 0.5
    );
    candle.flame.rotation.z = candle.baseRotation + Math.sin(seconds * 5 + candle.phase) * 0.045;
    candle.light.intensity = 1.05 * brightness;
  }
}

function insertCoin() {
  const insertCoinObject = ArcadeMachine?.getObjectByName('InsertCoin');
  if (!insertCoinObject || coinAnimation) return;

  loadGLTF('/coin.glb', (coin) => {
    if (coinAnimation) return;

    coin.position.copy(insertCoinObject.getWorldPosition(new THREE.Vector3()));
    coin.position.y += 0.06;
    coin.position.z += 0.031;
    coin.position.x += 0.01;
    coin.scale.set(0.2, 0.2, 0.2);
    scene.add(coin);
    coinAnimation = {
      coin,
      startTime: performance.now(),
      startY: coin.position.y,
      startRotationZ: coin.rotation.z
    };
  });
}

function updateCoinAnimation(time) {
  if (!coinAnimation) return;

  const progress = THREE.MathUtils.clamp(
    (time - coinAnimation.startTime) / coinAnimationDuration, 0, 1
  );
  coinAnimation.coin.position.y = coinAnimation.startY - coinDropDistance * progress;
  coinAnimation.coin.rotation.z = coinAnimation.startRotationZ + Math.PI * 2 * progress;

  if (progress === 1) {
    coinAnimation = null;
    showArcadeHtmlScreen();
  }
}

function showArcadeHtmlScreen() {
  if (!screen || arcadeHtmlScreen) return;

  const pixelsPerUnit = 1000;
  const surface = document.createElement('div');
  surface.className = 'arcade-screen-surface';
  surface.style.width = `${screen.geometry.parameters.width * pixelsPerUnit}px`;
  surface.style.height = `${screen.geometry.parameters.height * pixelsPerUnit}px`;

  const iframe = document.createElement('iframe');
  iframe.src = '/arcadescreen.html';
  iframe.title = 'Arcade screen';
  iframe.className = 'arcade-screen-frame';
  iframe.addEventListener('load', () => {
    iframe.contentDocument.addEventListener('click', panCameratoScreen);
  });
  surface.appendChild(iframe);

  screen.updateMatrixWorld(true);
  arcadeHtmlScreen = new CSS3DObject(surface);
  arcadeHtmlScreen.name = 'ArcadeHtmlScreen';
  screen.getWorldPosition(arcadeHtmlScreen.position);
  screen.getWorldQuaternion(arcadeHtmlScreen.quaternion);
  screen.getWorldScale(arcadeHtmlScreen.scale).multiplyScalar(1 / pixelsPerUnit);
  arcadeHtmlScene.add(arcadeHtmlScreen);

  screen.visible = false;
  arcadeScreenMaterial?.dispose();
  arcadeScreenMaterial = null;
}

function importTubeLight() {
  loadGLTF('/tubelight/light.gltf', (tubeLight) => {
    tubeLight.position.set(-2, 3, 3);
    tubeLight.rotation.set(-Math.PI / 2, 0, Math.PI/2);
    tubeLight.scale.set(2.5,2.5,2.5);
    const emissiveMaterials = [];
    tubeLight.traverse((child) => {
      if (!child.isMesh) return;

      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (material.name === 'Material.006') {
          material.emissive.set(0xffffff);
          material.emissiveIntensity = 4;
          emissiveMaterials.push(material);
        }
      }
    });
    const width = 2.0;
  const height = 0.1; // Thin strip to mimic a tube
  const intensity = 5.0;

  const rectLight = new THREE.RectAreaLight(0xffffff, intensity, width, height);
  rectLight.position.set(-2, 3, 3); // Match your fixture position
  rectLight.rotation.set(-Math.PI / 2, 0, Math.PI/2); // Point downward
  scene.add(rectLight);
  
    const pointLight = new THREE.PointLight(0xffffff, 1, 10);
    pointLight.position.set(-2, 3, 3);
    scene.add(pointLight);
    scene.add(tubeLight);
    tubeLightFlicker = {
      emissiveMaterials,
      rectLight,
      pointLight,
      burstUntil: 0,
      nextPulseAt: 0,
      nextFlickerAt: performance.now() + 1500 + Math.random() * 1000
    };
  });
}

function importVendingMachine() {
  loadGLTF('/vending-machine/drink_vending_machine.glb', (vendingMachine) => {
    vendingMachine.position.set(-2, -1, 3);
    vendingMachine.rotation.set(0, Math.PI/2,0);
    vendingMachine.scale.set(3, 3, 3);

    vendingMachine.traverse((child) => {
      if (!child.isMesh) return;

      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        const sideEmissionMap = material.emissiveMap;
        material.emissive.set(0xffffff);
        material.emissiveMap = material.map;
        material.emissiveIntensity = material.map ? 1.5 : 0;
        // Keep the sign artwork bright and restore the original white edge lights.
        material.onBeforeCompile = (shader) => {
          shader.uniforms.vendingSideEmissionMap = { value: sideEmissionMap };
          shader.uniforms.vendingSideEmissionIntensity = { value: sideEmissionMap ? 1.35 : 0 };
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `#include <common>
            uniform sampler2D vendingSideEmissionMap;
            uniform float vendingSideEmissionIntensity;`
          );
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <emissivemap_fragment>',
            `#include <emissivemap_fragment>
            #ifdef USE_EMISSIVEMAP
              vec2 signMin = vec2(0.71213, 0.08507);
              vec2 signMax = vec2(0.95319, 0.18671);
              vec2 insideSign = step(signMin, vEmissiveMapUv)
                * step(vEmissiveMapUv, signMax);
              float signMask = insideSign.x * insideSign.y;
              totalEmissiveRadiance *= signMask;
              totalEmissiveRadiance += texture2D(vendingSideEmissionMap, vEmissiveMapUv).rgb
                * vendingSideEmissionIntensity * (1.0 - signMask);
            #endif`
          );
        };
        material.customProgramCacheKey = () => 'vending-sign-and-side-emission';
        material.needsUpdate = true;
      }
    });

    scene.add(vendingMachine);
  });
}

importVendingMachine();
importTubeLight();
// importNightRainGif();
importRainWindow();

const canvas = document.querySelector('#c');
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const gtaoPass = new GTAOPass(scene, camera, window.innerWidth, window.innerHeight);
gtaoPass.blendIntensity = 0.4;
gtaoPass.updateGtaoMaterial({ radius: 0.22, scale: 1.1, thickness: 0.1, samples: 4 });
gtaoPass.updatePdMaterial({ samples: 8 });
composer.addPass(gtaoPass);
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.35,
  0.25,
  1.3,
);
composer.addPass(bloomPass);
const filmGrainPass = new ShaderPass({
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uIntensity: { value: 0.007 },
    uGrainSize: { value: 1.1 },
    uSpeed: { value: 24 },
    uShadowResponse: { value: 0.65 },
    uColorGrade: { value: 0.22 },
    uVignette: { value: 0.15 },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uEnabled: { value: true }
  },
  vertexShader: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uIntensity;
    uniform float uGrainSize;
    uniform float uSpeed;
    uniform float uShadowResponse;
    uniform float uColorGrade;
    uniform float uVignette;
    uniform vec2 uResolution;
    uniform bool uEnabled;
    varying vec2 vUv;

    float hashNoise(vec2 point, float frame) {
      vec2 seed = point + vec2(frame * 0.754877666, frame * 0.569840296);
      return fract(sin(dot(seed, vec2(12.9898, 78.233))) * 43758.5453);
    }

    float coherentGrain(vec2 point, float frame) {
      return hashNoise(floor(point), frame) * 2.0 - 1.0;
    }

    vec3 linearToSRGB(vec3 color) {
      vec3 linearPart = color * 12.92;
      vec3 gammaPart = 1.055 * pow(max(color, 0.0), vec3(1.0 / 2.4)) - 0.055;
      return mix(gammaPart, linearPart, step(color, vec3(0.0031308)));
    }

    vec3 sRGBToLinear(vec3 color) {
      vec3 displayColor = max(color, 0.0);
      vec3 linearPart = displayColor / 12.92;
      vec3 gammaPart = pow((displayColor + 0.055) / 1.055, vec3(2.4));
      return mix(gammaPart, linearPart, step(displayColor, vec3(0.04045)));
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float luminance = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
      float shadowMask = 1.0 - smoothstep(0.04, 0.45, luminance);
      float highlightMask = smoothstep(0.25, 0.85, luminance);
      color.r = max(color.r - uColorGrade * shadowMask * 0.025, 0.0);
      color.b += uColorGrade * shadowMask * 0.04;
      color.r += uColorGrade * highlightMask * 0.025;

      vec2 centeredUv = vUv - 0.5;
      centeredUv.x *= uResolution.x / max(uResolution.y, 1.0);
      float vignette = 1.0 - uVignette * smoothstep(0.18, 0.78, length(centeredUv));
      color.rgb *= vignette;

      vec2 grainPosition = vUv * uResolution / max(uGrainSize, 0.1);
      float frame = floor(uTime * uSpeed);
      float grain = coherentGrain(grainPosition, frame);
      vec3 displayColor = linearToSRGB(color.rgb);
      float grainLuminance = dot(displayColor, vec3(0.2126, 0.7152, 0.0722));
      float shadowBias = 1.0 - smoothstep(0.15, 0.9, grainLuminance);
      float response = mix(1.0, shadowBias, uShadowResponse);
      float grainAmount = uEnabled ? uIntensity : 0.0;
      displayColor = max(displayColor + grain * grainAmount * response, 0.0);
      gl_FragColor = vec4(sRGBToLinear(displayColor), color.a);
    }
  `
});
composer.addPass(filmGrainPass);
composer.addPass(new OutputPass());
function resizePostProcessing(width, height) {
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(width, height);
  gtaoPass.setSize(
    Math.max(1, Math.floor(width * renderer.getPixelRatio() * 0.5)),
    Math.max(1, Math.floor(height * renderer.getPixelRatio() * 0.5))
  );
}
resizePostProcessing(window.innerWidth, window.innerHeight);

const cssRenderer = new CSS3DRenderer();
cssRenderer.setSize(window.innerWidth, window.innerHeight);
cssRenderer.domElement.className = 'arcade-html-renderer';
document.body.appendChild(cssRenderer.domElement);

windowResponsiveResize();

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const zoomOutButton = document.createElement('button');
zoomOutButton.className = 'zoom-out-button';
zoomOutButton.type = 'button';
zoomOutButton.setAttribute('aria-label', 'Zoom out from arcade screen');
zoomOutButton.title = 'Zoom out';
zoomOutButton.hidden = true;
zoomOutButton.innerHTML = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="10.5" cy="10.5" r="6.25"></circle>
    <path d="M15.1 15.1 21 21M7.5 10.5h6"></path>
  </svg>
`;
document.body.appendChild(zoomOutButton);
zoomOutButton.addEventListener('click', zoomOutFromScreen);
const interactionHints = [
  { element: createInteractionHint(), getPosition: () => cueBallBody?.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.14, 0)) },
  { element: createInteractionHint(), getPosition: () => screen?.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.36, 0)) }
];

function createInteractionHint() {
  const hint = document.createElement('span');
  hint.className = 'interaction-hint';
  hint.setAttribute('aria-hidden', 'true');
  document.body.appendChild(hint);
  return hint;
}

function updateInteractionHints() {
  camera.updateMatrixWorld();

  for (const hint of interactionHints) {
    const worldPosition = hint.getPosition();
    if (!worldPosition) {
      hint.element.hidden = true;
      continue;
    }

    const projectedPosition = worldPosition.project(camera);
    const x = (projectedPosition.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-projectedPosition.y * 0.5 + 0.5) * window.innerHeight;
    const visible = projectedPosition.z >= -1 && projectedPosition.z <= 1
      && x >= 0 && x <= window.innerWidth
      && y >= 0 && y <= window.innerHeight;

    hint.element.hidden = !visible;
    if (visible) {
      hint.element.style.left = `${x}px`;
      hint.element.style.top = `${y}px`;
    }
  }
}


function shootCueBall() {
  if (!cueBallBody || !cueBallHitDirection) return;
  const speed = Number(2);
  physics.applyCentralImpulse(
    cueBallBody,
    cueBallHitDirection.clone().multiplyScalar(cueBallMass * speed)
  );
}

// 2. Track mouse movement and normalize coordinates (-1 to +1)
window.addEventListener('click', (event) => {
    if (event.target !== canvas) return;
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    const intersection = checkIntersection();
    let hitObject = intersection?.object;
    while (hitObject && hitObject !== scene) {
      if (hitObject.userData.physicsBody === cueBallBody
        || hitObject.userData.physicsBody === eightBallBody) {
        shootCueBall();
        return;
      }
      if(hitObject.name === 'InsertCoin') {
        insertCoin();
      }
      if (hitObject === ArcadeMachine || hitObject === screen) {
        panCameratoScreen();
        return;
      }
      
      hitObject = hitObject.parent;
    }
});

window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    MouseIconChange();
});

renderer.setAnimationLoop( animate );

const controls = new OrbitControls( camera, renderer.domElement );
// Optional: Adjust start settings
camera.position.set(1.7737506528193059, 1.6912528560941789, -5); // Positioned closer to the arcade

controls.minPolarAngle = 1.2736690747229489; 
controls.maxPolarAngle = 1.2736690747229489; // Preventing updates
controls.minAzimuthAngle = 1.57;
controls.maxAzimuthAngle = 1.57; // Preventing updates
controls.update(); // Position doesn't update without it
controls.enabled = false;
cameraHomePosition = camera.position.clone();
cameraHomeTarget = controls.target.clone();

scene.add(new THREE.AmbientLight(0xffffff, 0.05)); 

const floorTexture = new THREE.TextureLoader().load('/Floor.webp', createRusticFloorboards);
floorTexture.colorSpace = THREE.SRGBColorSpace;
floorTexture.wrapS = THREE.RepeatWrapping;
floorTexture.wrapT = THREE.RepeatWrapping;
floorTexture.repeat.set(3, 3);
const floorNormalMap = new THREE.TextureLoader().load('/floor-normal.webp');
const floorHeightMap = new THREE.TextureLoader().load('/floor-height.webp');
for (const texture of [floorNormalMap, floorHeightMap]) {
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.copy(floorTexture.repeat);
}
const floor = createPlane(
  10,
  15,
  0x808080,
  { x: 0, y: -1.06, z: 0 },
  new THREE.Euler(-Math.PI / 2, 0, 0),
  floorTexture
);
floor.material.color.setHex(0x51402f);
floor.material.roughness = 0.9;
floor.material.normalMap = floorNormalMap;
floor.material.normalScale.set(0.35, 0.35);
floor.material.onBeforeCompile = (shader) => {
 shader.uniforms.floorHeightMap = { value: floorHeightMap };
 shader.uniforms.floorParallaxScale = { value: floorMaterialSettings.parallaxScale };

 shader.vertexShader = shader.vertexShader
   .replace(
     '#include <common>',
     '#include <common>\nvarying vec3 vFloorViewPosition;'
   )
   .replace(
     '#include <project_vertex>',
     '#include <project_vertex>\nvFloorViewPosition = -mvPosition.xyz;'
   );

 shader.fragmentShader = shader.fragmentShader
   .replace(
     '#include <common>',
     `#include <common>
     uniform sampler2D floorHeightMap;
     uniform float floorParallaxScale;
     varying vec3 vFloorViewPosition;

     vec2 floorParallaxUv(vec2 uv, vec3 viewPosition) {
       vec3 positionDx = dFdx(viewPosition);
       vec3 positionDy = dFdy(viewPosition);
       vec2 uvDx = dFdx(uv);
       vec2 uvDy = dFdy(uv);
       vec3 geometricNormal = normalize(cross(positionDx, positionDy));
       if (dot(geometricNormal, viewPosition) < 0.0) geometricNormal = -geometricNormal;

       vec3 tangent = cross(positionDy, geometricNormal) * uvDx.x
         + cross(geometricNormal, positionDx) * uvDy.x;
       vec3 bitangent = cross(positionDy, geometricNormal) * uvDx.y
         + cross(geometricNormal, positionDx) * uvDy.y;
       float frameScale = inversesqrt(max(dot(tangent, tangent), dot(bitangent, bitangent)));
       mat3 tangentFrame = mat3(tangent * frameScale, bitangent * frameScale, geometricNormal);
       vec3 tangentView = normalize(transpose(tangentFrame) * normalize(viewPosition));

       float layerCount = mix(12.0, 6.0, clamp(abs(tangentView.z), 0.0, 1.0));
       float layerStep = 1.0 / layerCount;
       vec2 uvStep = tangentView.xy / max(abs(tangentView.z), 0.12)
         * floorParallaxScale / layerCount;
       vec2 currentUv = uv;
       float currentLayer = 0.0;
       float sampledHeight = texture2D(floorHeightMap, currentUv).r;

       for (int layer = 0; layer < 12; layer++) {
         if (currentLayer >= sampledHeight) break;
         currentUv -= uvStep;
         currentLayer += layerStep;
         sampledHeight = texture2D(floorHeightMap, currentUv).r;
       }

       vec2 previousUv = currentUv + uvStep;
       float afterDepth = sampledHeight - currentLayer;
       float beforeDepth = texture2D(floorHeightMap, previousUv).r
         - currentLayer + layerStep;
       float blend = clamp(afterDepth / (afterDepth - beforeDepth), 0.0, 1.0);
       return mix(currentUv, previousUv, blend);
     }`
   )
   .replace(
     '#include <map_fragment>',
     `vec2 floorParallaxCoords = floorParallaxUv(vMapUv, vFloorViewPosition);
     #ifdef USE_MAP
       vec4 sampledDiffuseColor = texture2D(map, floorParallaxCoords);
       diffuseColor *= sampledDiffuseColor;
     #endif`
   )
   .replace(
     '#include <normal_fragment_maps>',
     `#ifdef USE_NORMALMAP_TANGENTSPACE
       vec3 mapN = texture2D(normalMap, floorParallaxCoords).xyz * 2.0 - 1.0;
       #ifdef USE_PACKED_NORMALMAP
         mapN = vec3(mapN.xy, sqrt(saturate(1.0 - dot(mapN.xy, mapN.xy))));
       #endif
       mapN.xy *= normalScale;
       normal = normalize(tbn * mapN);
       #ifdef DOUBLE_SIDED
         normal *= faceDirection;
       #endif
     #elif defined(USE_BUMPMAP)
       normal = perturbNormalArb(-vViewPosition, normal, dHdxy_fwd(), faceDirection);
     #endif`
   );
};
floor.material.customProgramCacheKey = () => 'floor-parallax-occlusion-v1';
scene.add(floor);

function createRusticFloorboards(sourceTexture) {
  const sourceImage = sourceTexture.image;
  const atlasColumns = 8;
  const atlasRows = 8;
  const cellWidth = 256;
  const cellHeight = 64;
  const atlas = document.createElement('canvas');
  atlas.width = atlasColumns * cellWidth;
  atlas.height = atlasRows * cellHeight;
  const context = atlas.getContext('2d');
  if (!context) throw new Error('Could not create a canvas for the floorboard texture atlas.');

  let seed = 1729;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };

  for (let tile = 0; tile < atlasColumns * atlasRows; tile++) {
    const row = Math.floor(random() * 15);
    const rowHeight = sourceImage.height / 15;
    const cropHeight = Math.min(42, rowHeight * 0.62);
    const cropWidth = 150 + random() * 420;
    const sourceX = random() * Math.max(0, sourceImage.width - cropWidth);
    const sourceY = row * rowHeight + (rowHeight - cropHeight) / 2;
    const destinationX = (tile % atlasColumns) * cellWidth;
    const destinationY = Math.floor(tile / atlasColumns) * cellHeight;
    context.filter = `brightness(${0.72 + random() * 0.18}) saturate(0.68) sepia(0.12)`;
    context.drawImage(
      sourceImage,
      sourceX,
      sourceY,
      cropWidth,
      cropHeight,
      destinationX + 2,
      destinationY + 2,
      cellWidth - 4,
      cellHeight - 4
    );
  }
  context.filter = 'none';

  const boardTexture = new THREE.CanvasTexture(atlas);
  boardTexture.colorSpace = THREE.SRGBColorSpace;
  boardTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const floorLeft = -5;
  const floorRight = 5;
  const floorFront = -7.5;
  const floorBack = 7.5;
  const boardThickness = 0.05;
  const boards = [];

  for (let z = floorFront; z < floorBack;) {
    const boardWidth = 0.34 + random() * 0.08;
    const gap = 0.012 + random() * 0.006;
    const z0 = z + gap * 0.5;
    const z1 = Math.min(z + boardWidth, floorBack) - gap * 0.5;
    if (z1 > z0) {
      let x = floorLeft - (0.35 + random() * 1.2);
      while (x < floorRight) {
        const length = 0.9 + random() * 1.15;
        const x0 = Math.max(x + gap * 0.5, floorLeft);
        const x1 = Math.min(x + length - gap * 0.5, floorRight);
        if (x1 > x0 && z1 > z0) {
          const top = -0.985 + (random() - 0.5) * 0.018;
          boards.push({ x0, x1, z0, z1, top, index: boards.length });
        }
        x += length;
      }
    }
    z += boardWidth;
  }

  const tops = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshStandardMaterial({ map: boardTexture, roughness: 0.92 })
  );
  const edges = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshStandardMaterial({
      color: 0x382719,
      roughness: 0.96,
      side: THREE.DoubleSide
    })
  );
  tops.name = 'Rustic floorboard tops';
  edges.name = 'Rustic floorboard edges';
  tops.receiveShadow = true;
  edges.receiveShadow = true;
  scene.add(tops, edges);

  const addQuad = (positions, uvs, corners, texcoords) => {
    for (const index of [0, 1, 2, 0, 2, 3]) {
      positions.push(...corners[index]);
      uvs.push(...texcoords[index]);
    }
  };
  const updateBevel = (depth) => {
    const topVertices = [];
    const topUvs = [];
    const sideVertices = [];
    const sideUvs = [];
    const edgeBevel = depth * 0.45;
    const bevelHeight = depth * 0.5;

    for (const board of boards) {
      const { x0, x1, z0, z1, top, index } = board;
      const bottom = top - boardThickness;
      const bevelY = top - bevelHeight;
      const insetX0 = x0 + edgeBevel;
      const insetX1 = x1 - edgeBevel;
      const insetZ0 = z0 + edgeBevel;
      const insetZ1 = z1 - edgeBevel;
      const atlasColumn = index % atlasColumns;
      const atlasRow = Math.floor(index / atlasColumns) % atlasRows;
      const u0 = (atlasColumn + 0.035) / atlasColumns;
      const u1 = (atlasColumn + 0.965) / atlasColumns;
      const v0 = 1 - (atlasRow + 0.965) / atlasRows;
      const v1 = 1 - (atlasRow + 0.035) / atlasRows;
      addQuad(
        topVertices,
        topUvs,
        [
          [insetX0, top, insetZ0],
          [insetX0, top, insetZ1],
          [insetX1, top, insetZ1],
          [insetX1, top, insetZ0]
        ],
        [[u0, v0], [u0, v1], [u1, v1], [u1, v0]]
      );

      const bottomCorners = [
        [x0, bottom, z0],
        [x1, bottom, z0],
        [x1, bottom, z1],
        [x0, bottom, z1]
      ];
      const outerCorners = [
        [x0, bevelY, z0],
        [x1, bevelY, z0],
        [x1, bevelY, z1],
        [x0, bevelY, z1]
      ];
      const insetCorners = [
        [insetX0, top, insetZ0],
        [insetX1, top, insetZ0],
        [insetX1, top, insetZ1],
        [insetX0, top, insetZ1]
      ];
      const neutralUvs = [[0, 0], [0, 0], [0, 0], [0, 0]];
      for (let side = 0; side < 4; side++) {
        const next = (side + 1) % 4;
        addQuad(
          sideVertices,
          sideUvs,
          [bottomCorners[side], bottomCorners[next], outerCorners[next], outerCorners[side]],
          neutralUvs
        );
        addQuad(
          sideVertices,
          sideUvs,
          [outerCorners[side], outerCorners[next], insetCorners[next], insetCorners[side]],
          neutralUvs
        );
      }
    }

    const topGeometry = new THREE.BufferGeometry();
    topGeometry.setAttribute('position', new THREE.Float32BufferAttribute(topVertices, 3));
    topGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(topUvs, 2));
    topGeometry.computeVertexNormals();
    const sideGeometry = new THREE.BufferGeometry();
    sideGeometry.setAttribute('position', new THREE.Float32BufferAttribute(sideVertices, 3));
    sideGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(sideUvs, 2));
    sideGeometry.computeVertexNormals();
    tops.geometry.dispose();
    edges.geometry.dispose();
    tops.geometry = topGeometry;
    edges.geometry = sideGeometry;
  };

  floorMaterialSettings.updateBevel = updateBevel;
  updateBevel(floorMaterialSettings.bevelDepth);
}


loadGLTF('/Room.glb', (room) => {
  room.scale.setScalar(3);
  room.updateMatrixWorld(true);
const roomCenter = new THREE.Box3().setFromObject(room).getCenter(new THREE.Vector3());
  room.position.set(-roomCenter.x, 2 - roomCenter.y, -roomCenter.z);
  scene.add(room);
});


function animate( time ) {
  filmGrainPass.uniforms.uTime.value = time / 1000;
  rainWindowUniforms.time.value = time / 1000;
  updateCoinAnimation(time);
  updateCandleFlicker(time);

  if (cameraPan) {
    const progress = Math.min((performance.now() - cameraPan.startTime) / cameraPan.duration, 1);
    const easedProgress = progress * progress * (3 - 2 * progress);
    camera.position.lerpVectors(cameraPan.startPosition, cameraPan.endPosition, easedProgress);
    controls.target.lerpVectors(cameraPan.startTarget, cameraPan.endTarget, easedProgress);
    camera.lookAt(controls.target);

    if (progress === 1) {
      const offset = camera.position.clone().sub(controls.target);
      const spherical = new THREE.Spherical().setFromVector3(offset);
      controls.minPolarAngle = spherical.phi;
      controls.maxPolarAngle = spherical.phi;
      controls.minAzimuthAngle = spherical.theta;
      controls.maxAzimuthAngle = spherical.theta;
      if (cameraPan.kind === 'zoom-in') {
        isCameraZoomedIn = true;
        zoomOutButton.hidden = false;
      } else {
        const homeOffset = cameraHomePosition.clone().sub(cameraHomeTarget);
        const homeSpherical = new THREE.Spherical().setFromVector3(homeOffset);
        controls.minPolarAngle = homeSpherical.phi;
        controls.maxPolarAngle = homeSpherical.phi;
        controls.minAzimuthAngle = homeSpherical.theta;
        controls.maxAzimuthAngle = homeSpherical.theta;
        isCameraZoomedIn = false;
      }
      controls.update();
      cameraPan = null;
    }
  }

  const seconds = time / 500;
  if (tableLightPivot) {
    tableLightPivot.rotation.x = 0.25 * Math.sin(seconds * 0.7 + 1.4);
    tableLightPivot.rotation.z = 0.25 * Math.sin(seconds * 0.55);
  }
  if (hangingLightPivot) {
    hangingLightPivot.rotation.x = 0.25 * Math.sin(seconds * 0.7 + 1.4);
    hangingLightPivot.rotation.z = 0.25 * Math.sin(seconds * 0.55);
  }
  if (arcadeScreenMaterial) {
    arcadeScreenMaterial.uniforms.uTime.value = time / 1000;
  }
  const deltaSeconds = previousPhysicsTime === 0
    ? 0
    : (time - previousPhysicsTime) / 1000;
  previousPhysicsTime = time;
  physics.step(deltaSeconds);
  updateTubeLightFlicker(time);
  updateInteractionHints();

  if (nightRainAnimation && time >= nightRainAnimation.nextFrameTime && !nightRainAnimation.isDecoding) {
    nightRainAnimation.isDecoding = true;
    const frameIndex = nightRainAnimation.frameIndex;

    nightRainAnimation.decoder.decode({ frameIndex, completeFramesOnly: true }).then(({ image }) => {
      nightRainAnimation.context.drawImage(image, 0, 0);
      nightRainAnimation.texture.needsUpdate = true;
      nightRainAnimation.frameIndex = (frameIndex + 1) % nightRainAnimation.frameCount;
      nightRainAnimation.nextFrameTime = time + image.duration / 1000;
      image.close();
    }).catch((error) => {
      console.error('Failed to decode Night Rain GIF frame:', error);
    }).finally(() => {
      nightRainAnimation.isDecoding = false;
    });
  }
  composer.render();
  if (arcadeHtmlScreen) cssRenderer.render(arcadeHtmlScene, camera);
}

function updateTubeLightFlicker(time) {
  if (!tubeLightFlicker) return;

  const flicker = tubeLightFlicker;
  if (time >= flicker.burstUntil) {
    flicker.emissiveMaterials.forEach((material) => material.emissiveIntensity = 4);
    flicker.rectLight.intensity = 5;
    flicker.pointLight.intensity = 1;

    if (time >= flicker.nextFlickerAt) {
      flicker.burstUntil = time + 120 + Math.random() * 380;
      flicker.nextPulseAt = time;
      flicker.nextFlickerAt = flicker.burstUntil + 1800 + Math.random() * 5200;
    }
    return;
  }

  if (time < flicker.nextPulseAt) return;

  const levels = [0, 0.015, 0.08, 0.25, 0.65, 1.25];
  const level = levels[Math.floor(Math.random() * levels.length)];
  flicker.emissiveMaterials.forEach((material) => material.emissiveIntensity = 4 * level);
  flicker.rectLight.intensity = 5 * level;
  flicker.pointLight.intensity = level;
  flicker.nextPulseAt = time + 25 + Math.random() * 75;
}

async function importNightRainGif() {

  try {
    const response = await fetch('/Night Rain.gif');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const decoder = new ImageDecoder({
      data: await response.arrayBuffer(),
      type: 'image/gif'
    });
    await decoder.tracks.ready;

    const frameCount = decoder.tracks.selectedTrack.frameCount;
    const firstFrame = await decoder.decode({ frameIndex: 0, completeFramesOnly: true });
    const gifCanvas = document.createElement('canvas');
    gifCanvas.width = firstFrame.image.displayWidth;
    gifCanvas.height = firstFrame.image.displayHeight;
    const context = gifCanvas.getContext('2d');
    context.drawImage(firstFrame.image, 0, 0);

    const texture = new THREE.CanvasTexture(gifCanvas);
    const screenWidth = nightRainScreenHeight * gifCanvas.width / gifCanvas.height;
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(screenWidth, nightRainScreenHeight),
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide })
    );
    screen.position.copy(nightRainScreenPosition);
    screen.position.x -= 0.03;
    screen.rotation.set(0, Math.PI / 2, 0);
    scene.add(screen);

    nightRainAnimation = {
      decoder,
      frameCount,
      frameIndex: 1 % frameCount,
      nextFrameTime: performance.now() + firstFrame.image.duration / 1000,
      isDecoding: false,
      context,
      texture
    };
    firstFrame.image.close();
  } catch (error) {
    console.error('Failed to load Night Rain GIF:', error);
  }
}

function importRainWindow() {
  loadGLTF('/Rain/window.gltf', (rainWindow) => {
    rainWindow.updateMatrixWorld(true);
    rainWindow.scale.set(1,0.5,0.75);

    const scaledCenter = new THREE.Box3().setFromObject(rainWindow).getCenter(new THREE.Vector3());
    rainWindow.position.add(nightRainScreenPosition.clone().sub(scaledCenter));
    const exteriorMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;

        float rainBackdropHash(vec2 point) {
          return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453);
        }

        float rainBackdropNoise(vec2 point) {
          vec2 cell = floor(point);
          vec2 local = fract(point);
          local = local * local * (3.0 - 2.0 * local);
          float lower = mix(rainBackdropHash(cell), rainBackdropHash(cell + vec2(1.0, 0.0)), local.x);
          float upper = mix(rainBackdropHash(cell + vec2(0.0, 1.0)), rainBackdropHash(cell + vec2(1.0, 1.0)), local.x);
          return mix(lower, upper, local.y);
        }

        float rainBackdropFbm(vec2 point) {
          float value = 0.0;
          float amplitude = 0.5;
          for (int octave = 0; octave < 4; octave++) {
            value += rainBackdropNoise(point) * amplitude;
            point *= 2.03;
            amplitude *= 0.5;
          }
          return value;
        }

        void main() {
          vec2 uv = vUv;
          float cloud = rainBackdropFbm(uv * vec2(5.0, 8.0));
          vec3 sky = mix(vec3(0.16, 0.2, 0.21), vec3(0.32, 0.37, 0.38),
            smoothstep(0.0, 0.92, uv.y + cloud * 0.22));
          float distantTreeNoise = rainBackdropFbm(vec2(uv.x * 13.0, uv.y * 17.0));
          float horizon = 0.43 + rainBackdropFbm(vec2(uv.x * 5.0, 2.4)) * 0.15;
          float canopy = 1.0 - smoothstep(
            horizon - 0.035 + distantTreeNoise * 0.055,
            horizon + 0.025 + distantTreeNoise * 0.055,
            uv.y
          );
          float leafDetail = rainBackdropFbm(uv * vec2(32.0, 38.0));
          vec3 foliage = mix(vec3(0.035, 0.055, 0.05), vec3(0.12, 0.16, 0.12), leafDetail);
          float ground = 1.0 - smoothstep(0.18, 0.3, uv.y);
          vec3 exterior = mix(sky, foliage, canopy * 0.88);
          exterior = mix(exterior, vec3(0.08, 0.105, 0.08), ground * 0.7);
          gl_FragColor = vec4(exterior, 1.0);
        }
      `
    });
    const rainBackdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(nightRainScreenHeight, nightRainScreenHeight),
      exteriorMaterial
    );
    rainBackdrop.position.copy(nightRainScreenPosition);
    rainBackdrop.position.x -= 0.035;
    rainBackdrop.rotation.set(0, Math.PI / 2, 0);
    scene.add(rainBackdrop);

    rainWindow.traverse((child) => {
      if (!child.isMesh) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (material.name !== 'Material.064' && !(material.transmission > 0)) continue;

        const originalCompile = material.onBeforeCompile;
        material.onBeforeCompile = (shader, webglRenderer) => {
          originalCompile?.(shader, webglRenderer);
          shader.uniforms.rainWindowTime = rainWindowUniforms.time;
          shader.uniforms.rainWindowDropSize = rainWindowUniforms.dropSize;
          shader.uniforms.rainWindowDropAmount = rainWindowUniforms.dropAmount;
          shader.uniforms.rainWindowFallingAmount = rainWindowUniforms.fallingAmount;
          shader.uniforms.rainWindowFallingSpeed = rainWindowUniforms.fallingSpeed;
          shader.vertexShader = shader.vertexShader
            .replace(
              '#include <common>',
              '#include <common>\nvarying vec3 vRainWindowPosition;'
            )
            .replace(
              '#include <begin_vertex>',
              '#include <begin_vertex>\nvRainWindowPosition = position;'
            );
          shader.fragmentShader = shader.fragmentShader
            .replace(
              '#include <common>',
              `#include <common>
              uniform float rainWindowTime;
              uniform float rainWindowDropSize;
              uniform float rainWindowDropAmount;
              uniform float rainWindowFallingAmount;
              uniform float rainWindowFallingSpeed;
              varying vec3 vRainWindowPosition;

              float rainWindowHash(vec2 point) {
                return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453);
              }

              vec3 rainWindowDroplets(vec2 position, vec2 density, float occupancy) {
                vec2 gridPosition = position * density;
                vec2 cell = floor(gridPosition);
                vec2 localPosition = fract(gridPosition);
                vec2 center = vec2(
                  mix(0.18, 0.82, rainWindowHash(cell + vec2(17.0, 3.0))),
                  mix(0.18, 0.82, rainWindowHash(cell + vec2(5.0, 29.0)))
                );

                vec2 radius = vec2(
                  mix(0.26, 0.58, rainWindowHash(cell + vec2(11.0, 7.0))),
                  mix(0.32, 0.68, rainWindowHash(cell + vec2(23.0, 19.0)))
                ) * rainWindowDropSize;
                vec2 dropPosition = vec2(
                  (localPosition.x - center.x) / radius.x,
                  (localPosition.y - center.y) / radius.y
                );
                float distanceToDrop = length(dropPosition);
                float bead = (1.0 - smoothstep(0.72, 1.0, distanceToDrop))
                  * step(1.0 - min(occupancy * rainWindowDropAmount / 0.34, 1.0),
                    rainWindowHash(cell + vec2(43.0, 13.0)));
                float rim = smoothstep(0.64, 0.8, distanceToDrop)
                  * (1.0 - smoothstep(0.86, 1.04, distanceToDrop)) * bead;
                vec2 glintPosition = dropPosition - vec2(-0.34, 0.32);
                float glint = exp(-dot(glintPosition, glintPosition) * 30.0) * bead;
                return vec3(bead, rim, glint) * step(0.001, rainWindowDropAmount);
              }

              vec2 rainWindowStreaks(vec2 position) {
                float columnCount = mix(3.0, 20.0, rainWindowFallingAmount);
                float column = floor(position.x * columnCount);
                float seed = rainWindowHash(vec2(column, 2.0));
                float trailX = (column + mix(0.24, 0.76, rainWindowHash(vec2(column, 4.0)))) / columnCount;
                trailX += sin(position.y * 2.2 + seed * 17.0) * 0.018
                  + sin(position.y * 4.7 + seed * 9.0) * 0.006;
                float width = mix(0.012, 0.024, rainWindowHash(vec2(column + 31.0, 5.0)));
                float distanceToTrail = abs(position.x - trailX);
                float trailShape = 1.0 - smoothstep(width * 0.3, width, distanceToTrail);

                float phase = fract(position.y * 0.52 + rainWindowTime
                  * mix(0.09, 0.2, rainWindowHash(vec2(column, 8.0))) * rainWindowFallingSpeed
                  + rainWindowHash(vec2(column, 13.0)));
                float trailSegment = smoothstep(0.01, 0.035, phase)
                  * (1.0 - smoothstep(0.24, 0.31, phase));
                float activeTrail = step(1.0 - rainWindowFallingAmount, seed);
                float trail = trailShape * trailSegment * activeTrail;
                float beadHead = trailShape * exp(-phase * phase * 950.0) * activeTrail;
                return vec2(trail, beadHead) * step(0.001, rainWindowFallingAmount);
              }`
            )
            .replace(
              '#include <opaque_fragment>',
              `float rainWindowVerticalPosition = clamp((vRainWindowPosition.y - 7.0) * (410.0 / 395.0), 0.0, 410.0);
              vec2 rainWindowPosition = vec2(vRainWindowPosition.z, rainWindowVerticalPosition) * 0.01;
              vec3 rainWindowBeads = rainWindowDroplets(rainWindowPosition, vec2(16.0, 20.0), 0.34);
              vec3 rainWindowMicroDrops = rainWindowDroplets(rainWindowPosition, vec2(31.0, 39.0), 0.06);
              vec2 rainWindowRunoff = rainWindowStreaks(rainWindowPosition);
              float rainWindowBeadMask = max(rainWindowBeads.x, rainWindowMicroDrops.x * 0.55);
              float rainWindowRim = max(rainWindowBeads.y, rainWindowMicroDrops.y * 0.55);
              float rainWindowGlint = max(rainWindowBeads.z, rainWindowMicroDrops.z * 0.55);
              outgoingLight = mix(outgoingLight, vec3(0.26, 0.35, 0.39),
                rainWindowBeadMask * 0.14 + rainWindowRunoff.x * 0.1);
              outgoingLight += vec3(0.3, 0.4, 0.44) * rainWindowRim * 0.48;
              outgoingLight += vec3(0.68, 0.78, 0.82) * rainWindowGlint * 0.78;
              outgoingLight += vec3(0.42, 0.53, 0.57) * rainWindowRunoff.y * 0.48;
              float rainWindowOpacity = max(rainWindowBeadMask * 0.42, rainWindowRunoff.x * 0.32);
              diffuseColor.a = max(diffuseColor.a, rainWindowOpacity);
              #include <opaque_fragment>`
            );
        };
        material.customProgramCacheKey = () => 'rain-window-fine-beads-rivulets-v5';
        material.needsUpdate = true;
      }
    });
    scene.add(rainWindow);
  });
}

function createPlane(width, height, color = 0xffffff, position = { x: 0, y: 0, z: 0 }, rotation = new THREE.Euler(), texture = null) {
  const geometry = new THREE.PlaneGeometry(width, height);
  const materialOptions = { color: color, side: THREE.DoubleSide };
  if (texture) materialOptions.map = texture;
  const material = new THREE.MeshStandardMaterial(materialOptions);
  const plane = new THREE.Mesh(geometry, material);
  plane.position.set(position.x, position.y, position.z);
  plane.rotateOnWorldAxis(new THREE.Vector3(1, 0, 0), rotation.x);
  plane.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), rotation.y);
  plane.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), rotation.z);
  return plane;
}

// To resize without issues
function windowResponsiveResize()
{
  window.addEventListener('resize', () => {
    // 1. Update sizes
    const width = window.innerWidth;
    const height = window.innerHeight;

    // 2. Update camera aspect ratio
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    // 3. Update renderer size and pixel ratio
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    resizePostProcessing(width, height);
    filmGrainPass.uniforms.uResolution.value.set(width, height);
    cssRenderer.setSize(width, height);
});
}

function createPostProcessingPanel({ filmGrainPass, gtaoPass, bloomPass, renderer, floorMaterialSettings, rainWindowUniforms }) {
  const panel = document.createElement('details');
  panel.className = 'film-grain-panel';
  panel.open = true;
  panel.innerHTML = `
    <summary>
      <span>Scene postprocessing</span>
      <button class="film-grain-drag-handle" type="button" aria-label="Move developer tools panel with drag or arrow keys" title="Drag to move">Move</button>
    </summary>
    <div class="film-grain-controls">
      <section class="postprocess-group">
        <h2>Floor boards</h2>
        <label class="film-grain-control">
          <span>Bevel depth <output data-value="bevelDepth">0.018</output></span>
          <input data-setting="bevelDepth" type="range" min="0" max="0.05" step="0.001" value="0.018">
        </label>
      </section>
      <section class="postprocess-group">
        <h2>Image</h2>
        <label class="film-grain-toggle">
          <input type="checkbox" data-toggle="toneMapping" checked>
          <span>Filmic tone mapping</span>
        </label>
        <label class="film-grain-control">
          <span>Exposure <output data-value="exposure">1.25</output></span>
          <input data-setting="exposure" type="range" min="0.5" max="2" step="0.01" value="1.25">
        </label>
        <label class="film-grain-control">
          <span>Cool shadows <output data-value="grade">0.22</output></span>
          <input data-setting="grade" type="range" min="0" max="1" step="0.01" value="0.22">
        </label>
        <label class="film-grain-control">
          <span>Vignette <output data-value="vignette">0.15</output></span>
          <input data-setting="vignette" type="range" min="0" max="0.65" step="0.01" value="0.15">
        </label>
      </section>
      <section class="postprocess-group">
        <h2>Ambient occlusion</h2>
        <label class="film-grain-toggle">
          <input type="checkbox" data-toggle="ao" checked>
          <span>Enabled</span>
        </label>
        <label class="film-grain-control">
          <span>Strength <output data-value="aoIntensity">0.40</output></span>
          <input data-setting="aoIntensity" type="range" min="0" max="2" step="0.01" value="0.40">
        </label>
        <label class="film-grain-control">
          <span>Radius <output data-value="aoRadius">0.22</output></span>
          <input data-setting="aoRadius" type="range" min="0.05" max="1.5" step="0.01" value="0.22">
        </label>
      </section>
      <section class="postprocess-group">
        <h2>Bloom</h2>
        <label class="film-grain-control">
          <span>Strength <output data-value="bloomStrength">0.35</output></span>
          <input data-setting="bloomStrength" type="range" min="0" max="2" step="0.01" value="0.35">
        </label>
        <label class="film-grain-control">
          <span>Radius <output data-value="bloomRadius">0.25</output></span>
          <input data-setting="bloomRadius" type="range" min="0" max="1" step="0.01" value="0.25">
        </label>
        <label class="film-grain-control">
          <span>Threshold <output data-value="bloomThreshold">1.30</output></span>
          <input data-setting="bloomThreshold" type="range" min="0" max="3" step="0.01" value="1.3">
        </label>
      </section>
      <section class="postprocess-group">
        <h2>Film grain</h2>
        <label class="film-grain-toggle">
          <input type="checkbox" data-toggle="grain" checked>
          <span>Enabled</span>
        </label>
        <label class="film-grain-control">
          <span>Amount <output data-value="intensity">0.007</output></span>
          <input data-setting="intensity" type="range" min="0" max="0.08" step="0.001" value="0.007">
        </label>
        <label class="film-grain-control">
          <span>Grain size <output data-value="size">1.10 px</output></span>
          <input data-setting="size" type="range" min="0.5" max="4" step="0.05" value="1.1">
        </label>
        <label class="film-grain-control">
          <span>Motion <output data-value="speed">24</output></span>
          <input data-setting="speed" type="range" min="0" max="30" step="1" value="24">
        </label>
        <label class="film-grain-control">
          <span>Shadow bias <output data-value="shadow">0.65</output></span>
          <input data-setting="shadow" type="range" min="0" max="1" step="0.01" value="0.65">
        </label>
      </section>
      <section class="postprocess-group">
        <h2>Window rain</h2>
        <label class="film-grain-control">
          <span>Stuck droplet size <output data-value="rainDropSize">1.00×</output></span>
          <input data-setting="rainDropSize" type="range" min="0.5" max="2.5" step="0.05" value="1">
        </label>
        <label class="film-grain-control">
          <span>Stuck droplet amount <output data-value="rainDropAmount">34%</output></span>
          <input data-setting="rainDropAmount" type="range" min="0" max="1" step="0.01" value="0.34">
        </label>
        <label class="film-grain-control">
          <span>Falling rain amount <output data-value="rainFallingAmount">55%</output></span>
          <input data-setting="rainFallingAmount" type="range" min="0" max="1" step="0.01" value="0.55">
        </label>
        <label class="film-grain-control">
          <span>Falling rain speed <output data-value="rainFallingSpeed">1.00×</output></span>
          <input data-setting="rainFallingSpeed" type="range" min="0" max="3" step="0.05" value="1">
        </label>
      </section>
      <div class="postprocess-actions">
        <button type="button" data-action="reset">Reset</button>
      </div>
    </div>
  `;
  document.body.appendChild(panel);
  panel.scrollTop = 0;

  const dragHandle = panel.querySelector('.film-grain-drag-handle');
  const positionStorageKey = 'portfolio.devtools-position.v1';
  const clampPosition = (left, top) => ({
    left: Math.max(0, Math.min(left, window.innerWidth - panel.offsetWidth)),
    top: Math.max(0, Math.min(top, window.innerHeight - panel.offsetHeight))
  });
  const setPanelPosition = (left, top) => {
    const position = clampPosition(left, top);
    panel.style.left = `${position.left}px`;
    panel.style.top = `${position.top}px`;
    panel.style.right = 'auto';
    return position;
  };
  const savePanelPosition = () => {
    const position = {
      left: Number.parseFloat(panel.style.left),
      top: Number.parseFloat(panel.style.top)
    };
    try {
      localStorage.setItem(positionStorageKey, JSON.stringify(position));
    } catch (error) {
      console.error('Failed to save developer tools position.', error);
    }
  };

  try {
    const savedPosition = localStorage.getItem(positionStorageKey);
    if (savedPosition) {
      const position = JSON.parse(savedPosition);
      if (Number.isFinite(position.left) && Number.isFinite(position.top)) {
        setPanelPosition(position.left, position.top);
      } else {
        throw new Error('Saved developer tools position is invalid.');
      }
    }
  } catch (error) {
    console.error('Failed to read saved developer tools position.', error);
  }

  let dragStart = null;
  dragHandle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const bounds = panel.getBoundingClientRect();
    dragStart = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: bounds.left,
      top: bounds.top
    };
    setPanelPosition(bounds.left, bounds.top);
    dragHandle.setPointerCapture(event.pointerId);
  });
  dragHandle.addEventListener('pointermove', (event) => {
    if (!dragStart || event.pointerId !== dragStart.pointerId) return;
    setPanelPosition(
      dragStart.left + event.clientX - dragStart.x,
      dragStart.top + event.clientY - dragStart.y
    );
  });
  const finishDragging = (event) => {
    if (!dragStart || event.pointerId !== dragStart.pointerId) return;
    dragStart = null;
    savePanelPosition();
  };
  dragHandle.addEventListener('pointerup', finishDragging);
  dragHandle.addEventListener('pointercancel', finishDragging);
  dragHandle.addEventListener('keydown', (event) => {
    const movement = event.shiftKey ? 25 : 10;
    const directions = {
      ArrowLeft: [-movement, 0],
      ArrowRight: [movement, 0],
      ArrowUp: [0, -movement],
      ArrowDown: [0, movement]
    };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    const bounds = panel.getBoundingClientRect();
    setPanelPosition(
      bounds.left + direction[0],
      bounds.top + direction[1]
    );
    savePanelPosition();
  });
  dragHandle.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  window.addEventListener('resize', () => {
    if (panel.style.left) {
      setPanelPosition(Number.parseFloat(panel.style.left), Number.parseFloat(panel.style.top));
    }
  });

  const storageKey = 'portfolio.graphics-settings.v1';
  const toggles = [
    { name: 'toneMapping', onChange: (enabled) => {
      renderer.toneMapping = enabled ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
    } },
    { name: 'ao', onChange: (enabled) => {
      gtaoPass.enabled = enabled;
    } },
    { name: 'grain', onChange: (enabled) => {
      filmGrainPass.uniforms.uEnabled.value = enabled;
    } }
  ];
  for (const toggle of toggles) {
    const input = panel.querySelector(`[data-toggle="${toggle.name}"]`);
    input.addEventListener('input', () => toggle.onChange(input.checked));
  }

  const settings = [
    { name: 'bevelDepth', format: (value) => Number(value).toFixed(3), onChange: (value) => {
      floorMaterialSettings.bevelDepth = value;
      if (floorMaterialSettings.updateBevel) floorMaterialSettings.updateBevel(value);
    } },
    { name: 'exposure', format: (value) => Number(value).toFixed(2), onChange: (value) => {
      renderer.toneMappingExposure = value;
    } },
    { name: 'grade', format: (value) => Number(value).toFixed(2), uniform: 'uColorGrade' },
    { name: 'vignette', format: (value) => Number(value).toFixed(2), uniform: 'uVignette' },
    { name: 'aoIntensity', format: (value) => Number(value).toFixed(2), onChange: (value) => {
      gtaoPass.blendIntensity = value;
    } },
    { name: 'aoRadius', format: (value) => Number(value).toFixed(2), onChange: (value) => {
      gtaoPass.updateGtaoMaterial({ radius: value });
    } },
    { name: 'bloomStrength', format: (value) => Number(value).toFixed(2), onChange: (value) => {
      bloomPass.strength = value;
    } },
    { name: 'bloomRadius', format: (value) => Number(value).toFixed(2), onChange: (value) => {
      bloomPass.radius = value;
    } },
    { name: 'bloomThreshold', format: (value) => Number(value).toFixed(2), onChange: (value) => {
      bloomPass.threshold = value;
    } },
    { name: 'intensity', format: (value) => Number(value).toFixed(3), uniform: 'uIntensity' },
    { name: 'size', format: (value) => `${Number(value).toFixed(2)} px`, uniform: 'uGrainSize' },
    { name: 'speed', format: (value) => value, uniform: 'uSpeed' },
    { name: 'shadow', format: (value) => Number(value).toFixed(2), uniform: 'uShadowResponse' },
    { name: 'rainDropSize', format: (value) => `${Number(value).toFixed(2)}×`, onChange: (value) => {
      rainWindowUniforms.dropSize.value = value;
    } },
    { name: 'rainDropAmount', format: (value) => `${Math.round(value * 100)}%`, onChange: (value) => {
      rainWindowUniforms.dropAmount.value = value;
    } },
    { name: 'rainFallingAmount', format: (value) => `${Math.round(value * 100)}%`, onChange: (value) => {
      rainWindowUniforms.fallingAmount.value = value;
    } },
    { name: 'rainFallingSpeed', format: (value) => `${Number(value).toFixed(2)}×`, onChange: (value) => {
      rainWindowUniforms.fallingSpeed.value = value;
    } }
  ];
  const controls = [
    ...toggles.map((toggle) => ({
      name: toggle.name,
      kind: 'toggle',
      input: panel.querySelector(`[data-toggle="${toggle.name}"]`),
      apply: toggle.onChange
    })),
    ...settings.map((setting) => {
      const output = panel.querySelector(`[data-value="${setting.name}"]`);
      return {
        name: setting.name,
        kind: 'range',
        input: panel.querySelector(`[data-setting="${setting.name}"]`),
        apply: (value) => {
          if (setting.uniform) filmGrainPass.uniforms[setting.uniform].value = value;
          if (setting.onChange) setting.onChange(value);
          output.textContent = setting.format(value);
        }
      };
    })
  ];

  function defaults() {
    return Object.fromEntries(controls.map((control) => [
      control.name,
      control.kind === 'toggle' ? control.input.defaultChecked : Number(control.input.defaultValue)
    ]));
  }

  function readSavedSettings() {
    try {
      const serialized = localStorage.getItem(storageKey);
      if (!serialized) return defaults();

      const saved = JSON.parse(serialized);
      if (saved.version !== 1 || !saved.settings || typeof saved.settings !== 'object') {
        throw new Error('Unsupported graphics settings JSON format.');
      }

      const values = defaults();
      for (const control of controls) {
        const value = control.name === 'bevelDepth'
          ? saved.settings.bevelDepth ?? saved.settings.parallaxScale
          : saved.settings[control.name];
        if (control.kind === 'toggle') {
          if (typeof value === 'boolean') values[control.name] = value;
          continue;
        }
        const min = Number(control.input.min);
        const max = Number(control.input.max);
        if (typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max) {
          values[control.name] = value;
        }
      }
      return values;
    } catch (error) {
      console.error('Failed to read saved graphics settings; using defaults.', error);
      return defaults();
    }
  }

  let currentSettings = readSavedSettings();
  function applySettings(values) {
    for (const control of controls) {
      const value = values[control.name];
      if (control.kind === 'toggle') {
        control.input.checked = value;
      } else {
        control.input.value = String(value);
      }
      control.apply(value);
    }
  }

  function saveSettings() {
    currentSettings = Object.fromEntries(controls.map((control) => [
      control.name,
      control.kind === 'toggle' ? control.input.checked : Number(control.input.value)
    ]));
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        version: 1,
        settings: currentSettings
      }));
    } catch (error) {
      console.error('Failed to save graphics settings to browser storage.', error);
    }
  }

  applySettings(currentSettings);

  for (const control of controls) {
    control.input.addEventListener('input', () => {
      control.apply(control.kind === 'toggle' ? control.input.checked : Number(control.input.value));
      saveSettings();
    });
  }

  panel.querySelector('[data-action="reset"]').addEventListener('click', () => {
    applySettings(defaults());
    saveSettings();
  });
}

function panCameratoScreen() {
  if (!screen || cameraPan || isCameraZoomedIn) return;

  screen.updateMatrixWorld(true);
  const screenCenter = screen.getWorldPosition(new THREE.Vector3());
  const screenNormal = screen.getWorldDirection(new THREE.Vector3()).normalize();
  const screenUp = screen.localToWorld(
    new THREE.Vector3(0, screen.geometry.parameters.height, 0)
  ).sub(screenCenter);
  const viewUp = camera.up.clone()
    .addScaledVector(screenNormal, -camera.up.dot(screenNormal))
    .normalize();
  const projectedScreenHeight = Math.abs(screenUp.dot(viewUp));
  const targetScreenCoverage = 0.8;
  const viewDistance = projectedScreenHeight
    / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * targetScreenCoverage);
  const destination = screenCenter.clone()
    .addScaledVector(screenNormal, viewDistance);

  cameraPan = {
    kind: 'zoom-in',
    startTime: performance.now(),
    duration: 1600,
    startPosition: camera.position.clone(),
    endPosition: destination,
    startTarget: controls.target.clone(),
    endTarget: screenCenter
  };
  controls.enabled = false;
}

function zoomOutFromScreen() {
  if (!isCameraZoomedIn || cameraPan || !cameraHomePosition || !cameraHomeTarget) return;

  zoomOutButton.hidden = true;
  cameraPan = {
    kind: 'zoom-out',
    startTime: performance.now(),
    duration: 1200,
    startPosition: camera.position.clone(),
    endPosition: cameraHomePosition.clone(),
    startTarget: controls.target.clone(),
    endTarget: cameraHomeTarget.clone()
  };
}

// Perform the raycast in the animation loop or click event
function checkIntersection() {
    // Update the ray with camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Calculate objects intersecting the picking ray
    // Pass an array of objects to test against (e.g., scene.children)
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
          return intersects[0];
    }

    return null;
}

function MouseIconChange() {
  raycaster.setFromCamera(mouse, camera);
  const intersectsEightBall = eightBallBody
    && raycaster.intersectObject(eightBallBody, true).length > 0;
  const intersectsArcadeMachine = ArcadeMachine
    && raycaster.intersectObject(ArcadeMachine, true).length > 0;
  canvas.style.cursor = intersectsEightBall || intersectsArcadeMachine ? 'pointer' : 'default';
}

// 1. Classical 3D Noise function by Stefan Gustavson (or use any GLSL Perlin/Simplex noise)
const noiseGLSL = `
  vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
  
  float snoise(vec3 v){
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 =   v - i + dot(i, C.xxx) ;
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - D.yyy;
    i = mod(i, 289.0 );
    vec4 p = permute( permute( permute(
               i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
             + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                  dot(p2,x2), dot(p3,x3) ) );
  }
`;

// 2. Vertex Shader (Passes UV coordinates)
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// 3. Fragment Shader (Generates noise using UV + Time)
const fragmentShader = `
  varying vec2 vUv;
  uniform float uTime;
  
  ${noiseGLSL}

  void main() {
    // Scale the noise coordinates to make it finer or coarser
    vec2 uvScale = vUv * 30.0; 
    
    // Animate the noise by passing uTime into the Z axis of 3D noise
    float noiseVal = snoise(vec3(uvScale, uTime * 5.0));
    
    // Map noise from [-1, 1] to [0, 1] range
    noiseVal = noiseVal * 0.5 + 0.5;
    
    // Create colors using the noise value
    vec3 colorA = vec3(0.1, 0.1,0.1); // Deep Blue
    vec3 colorB = vec3(1.0,1.0,1.0); // Warm Amber
    vec3 finalColor = mix(colorA, colorB, noiseVal);
    float emissionMask = smoothstep(0.82, 0.98, noiseVal);
    vec3 emittedColor = finalColor * (2.0 + emissionMask * 2.0);

    gl_FragColor = vec4(emittedColor, 1.0);
  }
`;
