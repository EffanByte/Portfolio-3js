import * as THREE from 'three';

const AMMO_PATH = 'https://cdn.jsdelivr.net/gh/kripken/ammo.js@79190a1f03845794b1bba1777f30037349967658/builds/ammo.wasm.js';

async function loadAmmo() {
  if (typeof Ammo === 'undefined') {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = AMMO_PATH;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  return Ammo();
}

export async function createPoolPhysics() {
  const AmmoLib = await loadAmmo();
  const collisionConfiguration = new AmmoLib.btDefaultCollisionConfiguration();
  const dispatcher = new AmmoLib.btCollisionDispatcher(collisionConfiguration);
  const broadphase = new AmmoLib.btDbvtBroadphase();
  const solver = new AmmoLib.btSequentialImpulseConstraintSolver();
  const world = new AmmoLib.btDiscreteDynamicsWorld(
    dispatcher,
    broadphase,
    solver,
    collisionConfiguration
  );
  world.setGravity(new AmmoLib.btVector3(0, -9.8, 0));

  const meshBodies = new WeakMap();
  const dynamicBodies = [];
  const retainedObjects = [];
  const transform = new AmmoLib.btTransform();

  function createShape(geometry) {
    const parameters = geometry.parameters;
    if (geometry.type === 'SphereGeometry') {
      return new AmmoLib.btSphereShape(parameters.radius);
    }
    if (geometry.type === 'BoxGeometry') {
      return new AmmoLib.btBoxShape(new AmmoLib.btVector3(
        parameters.width / 2,
        parameters.height / 2,
        parameters.depth / 2
      ));
    }
    throw new Error(`Unsupported pool collider geometry: ${geometry.type}`);
  }

  function addMesh(mesh, mass = 0, restitution = 0) {
    const shape = createShape(mesh.geometry);
    const position = mesh.getWorldPosition(new THREE.Vector3());
    const quaternion = mesh.getWorldQuaternion(new THREE.Quaternion());
    const bodyTransform = new AmmoLib.btTransform();
    bodyTransform.setIdentity();
    bodyTransform.setOrigin(new AmmoLib.btVector3(position.x, position.y, position.z));
    bodyTransform.setRotation(new AmmoLib.btQuaternion(
      quaternion.x,
      quaternion.y,
      quaternion.z,
      quaternion.w
    ));

    const motionState = new AmmoLib.btDefaultMotionState(bodyTransform);
    const localInertia = new AmmoLib.btVector3(0, 0, 0);
    if (mass > 0) shape.calculateLocalInertia(mass, localInertia);

    const bodyInfo = new AmmoLib.btRigidBodyConstructionInfo(
      mass,
      motionState,
      shape,
      localInertia
    );
    bodyInfo.set_m_restitution(restitution);
    const body = new AmmoLib.btRigidBody(bodyInfo);
    body.setFriction(0.3);
    body.setRollingFriction(0.02);
    world.addRigidBody(body);
    meshBodies.set(mesh, body);
    retainedObjects.push(shape, bodyTransform, motionState, bodyInfo, body);
    AmmoLib.destroy(localInertia);

    if (mass > 0) dynamicBodies.push({ mesh, body });
  }

  function applyCentralImpulse(mesh, impulse) {
    const body = meshBodies.get(mesh);
    if (!body) return;

    const ammoImpulse = new AmmoLib.btVector3(impulse.x, impulse.y, impulse.z);
    body.applyCentralImpulse(ammoImpulse);
    body.activate();
    AmmoLib.destroy(ammoImpulse);
  }

  function step(deltaSeconds) {
    if (deltaSeconds <= 0) return;
    world.stepSimulation(Math.min(deltaSeconds, 1 / 30), 10);

    for (const { mesh, body } of dynamicBodies) {
      const motionState = body.getMotionState();
      motionState.getWorldTransform(transform);
      const position = transform.getOrigin();
      const rotation = transform.getRotation();
      mesh.position.set(position.x(), position.y(), position.z());
      mesh.quaternion.set(rotation.x(), rotation.y(), rotation.z(), rotation.w());
      mesh.updateMatrixWorld(true);
    }
  }

  return { addMesh, applyCentralImpulse, step };
}