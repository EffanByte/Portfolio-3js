import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
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

const physics = await createPoolPhysics();

let ArcadeMachine, ArcadeMachine1, ArcadeMachine2, ArcadeMachine3, ArcadeMachine4, ArcadeMachine5, ArcadeMachine6;
let nightRainAnimation = null;
let tubeLightFlicker = null;
let cueBallBody = null;
let cueBallHitDirection = null;
let previousPhysicsTime = 0;
let arcadeScreenMaterial = null;
let arcadeHtmlScreen = null;
let tableLightPivot = null;
let hangingLightPivot = null;
let screen = null;
let cameraPan = null;
let coinAnimation = null;
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
  let screenTexture = new THREE.TextureLoader().load("/Floor.png");
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

  const screenLight = new THREE.PointLight(0x8adfff, 0.5, 1, 4);
  screenLight.position.copy(screenPosition).add(new THREE.Vector3(0.35, 0.05, 0));
  scene.add(screenLight);
} );

function importBilardoFbx() {
  loadFBX('/pool-table/table.fbx', (object) => {

    object.scale.set(0.2, 0.2, 0.2);
    object.position.set(1.5, -1, -4);

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
      }

      if (cueBallBody && rackBallCount > 0) {
        rackCenter.divideScalar(rackBallCount);
        cueBallHitDirection = rackCenter.sub(cueBallBody.position).setY(0).normalize();
      }
    });
    tableLightPivot = new THREE.Group();
    tableLightPivot.position.set(tableCenter.x, tableBounds.max.y + 3.5, tableCenter.z);
    const tableLight = new THREE.SpotLight(0xffffff, 75, 0, Math.PI / 5, 0.5, 2);
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

importBilardoFbx();

function importPubCounter() {
  loadGLTF('/counter/pub_counter.glb', (pubCounter) => {
    pubCounter.position.set(-4, -1, 5);
    pubCounter.scale.set(1.2,1.2,1.2);
    scene.add(pubCounter);
  });
}

importPubCounter();

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
  0.6,
  1,
  3,
));
composer.addPass(new OutputPass());

const cssRenderer = new CSS3DRenderer();
cssRenderer.setSize(window.innerWidth, window.innerHeight);
cssRenderer.domElement.className = 'arcade-html-renderer';
document.body.appendChild(cssRenderer.domElement);

windowResponsiveResize();

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();


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
      if (hitObject.userData.physicsBody === cueBallBody) {
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
camera.position.set(1.7737506528193059, 1.6912528560941789, -6); // Positioned for Arcade

controls.minPolarAngle = 1.2736690747229489; 
controls.maxPolarAngle = 1.2736690747229489; // Preventing updates
controls.minAzimuthAngle = 1.57;
controls.maxAzimuthAngle = 1.57; // Preventing updates
controls.update(); // Position doesn't update without it

scene.add(new THREE.AmbientLight(0xffffff, 0.05)); 

const floorTexture = new THREE.TextureLoader().load('/Floor.png');
floorTexture.wrapS = THREE.RepeatWrapping;
floorTexture.wrapT = THREE.RepeatWrapping;
floorTexture.repeat.set(3, 3);
scene.add(createPlane(
  10,
  15,
  0x808080,
  { x: 0, y: -1, z: 0 },
  new THREE.Euler(-Math.PI / 2, 0, 0),
  floorTexture
));


loadGLTF('/Room.glb', (room) => {
  room.scale.setScalar(3);
  room.updateMatrixWorld(true);
const roomCenter = new THREE.Box3().setFromObject(room).getCenter(new THREE.Vector3());
  room.position.set(-roomCenter.x, 2 - roomCenter.y, -roomCenter.z);
  scene.add(room);
});


function animate( time ) {
  updateCoinAnimation(time);

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
      controls.enabled = true;
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    composer.setSize(width, height);
    cssRenderer.setSize(width, height);
});
}

function panCameratoScreen() {
  if (!screen || cameraPan) return;

  screen.updateMatrixWorld(true);
  const screenCenter = screen.getWorldPosition(new THREE.Vector3());
  const screenNormal = screen.getWorldDirection(new THREE.Vector3()).normalize();
  const destination = screenCenter.clone()
    .addScaledVector(screenNormal, 0.6)
    .add(new THREE.Vector3(0, 0.04, 0));

  cameraPan = {
    startTime: performance.now(),
    duration: 1600,
    startPosition: camera.position.clone(),
    endPosition: destination,
    startTarget: controls.target.clone(),
    endTarget: screenCenter
  };
  controls.enabled = false;
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
