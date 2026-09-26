import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

RectAreaLightUniformsLib.init();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const gltfLoader = new GLTFLoader();
const fbxLoader = new FBXLoader();
const nightRainScreenPosition = new THREE.Vector3(-1.9, 2, -3.5);
const nightRainScreenHeight = 2;
let ArcadeMachine, ArcadeMachine1, ArcadeMachine2, ArcadeMachine3, ArcadeMachine4, ArcadeMachine5, ArcadeMachine6;
let nightRainAnimation = null;
let tubeLightFlicker = null;

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
  ArcadeMachine1 = arcadeModel.clone();
  ArcadeMachine2 = arcadeModel.clone();
  ArcadeMachine3 = arcadeModel.clone();
  ArcadeMachine4 = arcadeModel.clone();
  ArcadeMachine5 = arcadeModel.clone();
  ArcadeMachine6 = arcadeModel.clone();

  ArcadeMachine.position.x = -2
  ArcadeMachine1.position.z += 1;
  ArcadeMachine2.position.z += 2;
  ArcadeMachine3.position.z += -1;
  ArcadeMachine4.position.z += -2;
  ArcadeMachine5.position.z += 3;
  ArcadeMachine6.position.z += -3;
  scene.add(ArcadeMachine);
  // scene.add(ArcadeMachine1);
  // scene.add(ArcadeMachine2);
  // scene.add(ArcadeMachine3);
  // scene.add(ArcadeMachine4);
  // scene.add(ArcadeMachine5);
  // scene.add(ArcadeMachine6);

} );

function importBilardoFbx() {
  loadFBX('/pool-table/table.fbx', (object) => {

    object.scale.set(0.2, 0.2, 0.2);
    object.position.set(1.5, -1, -4);

    const tableBounds = new THREE.Box3().setFromObject(object);
    const tableCenter = tableBounds.getCenter(new THREE.Vector3());
    const tableLight = new THREE.SpotLight(0xffffff, 100, 0, Math.PI / 5, 0.5, 2);
    tableLight.position.set(tableCenter.x, tableBounds.max.y + 3, tableCenter.z);
    tableLight.target.position.copy(tableCenter);

    scene.add(object);
    scene.add(tableLight, tableLight.target);
  });
    loadGLTF('/pool-table/hanging_light.glb', (gltf) => {
    
    gltf.position.set(1.5, 2, -4);
    gltf.scale.set(1,1,1);

    scene.add(gltf);
  });

}

importBilardoFbx();

function importPubCounter() {
  loadGLTF('/counter/pub_counter.glb', (pubCounter) => {
    pubCounter.position.set(-4, -1, 5);
    pubCounter.scale.set(1.2,1.2,1.2);
    scene.add(pubCounter);
  });
}

importPubCounter();

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
    
    scene.add(vendingMachine);
  });
}

importVendingMachine();
importTubeLight();
importNightRainGif();
importRainWindow();

const canvas = document.querySelector('#c');
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize( window.innerWidth, window.innerHeight );
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.75,
  1,
  4,
));
composer.addPass(new OutputPass());
windowResponsiveResize();

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// 2. Track mouse movement and normalize coordinates (-1 to +1)
window.addEventListener('click', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    checkIntersection();
});

window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    MouseIconChange();
});

renderer.setAnimationLoop( animate );

const controls = new OrbitControls( camera, renderer.domElement );
// Optional: Adjust start settings
camera.position.set(1.7737506528193059, 1.6912528560941789, -6); // Positioned for Arcade

controls.minPolarAngle = 1.2736690747229489; 
controls.maxPolarAngle = 1.2736690747229489; // Preventing updates
controls.minAzimuthAngle = 1.57;
controls.maxAzimuthAngle = 1.57; // Preventing updates
controls.update(); // Position doesn't update without it

scene.add(new THREE.AmbientLight(0xffffff, 0)); 

let textureLoader = new THREE.TextureLoader();

let texture = textureLoader.load('/Floor.png');
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;
texture.repeat.set(3, 3);
let floor = createPlane(10, 15, 0x808080, { x: 0, y: -1, z: 0 }, { x: -Math.PI / 2, y: 0, z: 0 }, texture);
let ceiling = createPlane(10, 15, 0x808080, { x: 0, y: 5, z: 0 }, { x: Math.PI / 2, y: 0, z: 0 });
let wall = createPlane(15, 10, 0xffffff, { x: -3, y: 0, z: 0 }, { x: 0, y: Math.PI/2, z: 0 });
let rightwall = createPlane(15, 10, 0xffffff, { x: 0, y: 0, z: 7.5 }, { x: 0, y: 0, z: 0 });
let leftwall = createPlane(15, 10, 0xffffff, { x: 0, y: 0, z: -7.5 }, { x: 0, y: 0, z: 0 }, );
scene.add(wall);
scene.add(floor);
scene.add(ceiling);
scene.add(leftwall);
scene.add(rightwall);

//controls.enabled = false;

function animate( time ) {
  updateTubeLightFlicker(time);

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
  if (typeof ImageDecoder === 'undefined') {
    console.error('This browser does not support animated GIF decoding.');
    return;
  }

  try {
    const response = await fetch('/Night%20Rain.gif');
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
    const bounds = new THREE.Box3().setFromObject(rainWindow);
    rainWindow.scale.set(1,0.5,0.75);

    const scaledCenter = new THREE.Box3().setFromObject(rainWindow).getCenter(new THREE.Vector3());
    rainWindow.position.add(nightRainScreenPosition.clone().sub(scaledCenter));
    scene.add(rainWindow);
  });
}

function createPlane(width, height, color = 0xffffff, position = { x: 0, y: 0, z: 0 }, rotation = { x: 0, y: 0, z: 0 }, texture = null) {
  const geometry = new THREE.PlaneGeometry(width, height);
  const materialOptions = { color: color, side: THREE.DoubleSide };
  if (texture) materialOptions.map = texture;
  const material = new THREE.MeshStandardMaterial(materialOptions);
  const plane = new THREE.Mesh(geometry, material);
  plane.position.set(position.x, position.y, position.z);
  plane.rotation.set(rotation.x, rotation.y, rotation.z);
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    composer.setSize(width, height);
});
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
  if (!ArcadeMachine) {
    canvas.style.cursor = 'default';
    return;
  }

  raycaster.setFromCamera(mouse, camera);
  const intersectsArcadeMachine = raycaster.intersectObject(ArcadeMachine, true).length > 0;
  canvas.style.cursor = intersectsArcadeMachine ? 'pointer' : 'default';
}

