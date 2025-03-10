// Global variables
let physicsWorld;
let scene, camera, renderer, controls;
let clock = new THREE.Clock();
let rigidBodies = [];
let tmpTrans = null;
let fpsElement;

// Torus parameters
const TORUS_RADIUS = 1.0;      // Major radius of the torus
const TUBE_RADIUS = 0.3;       // Minor radius of the torus
const TORUS_SEGMENTS = 16;     // Increased back to 16 for smoother toruses
const TUBE_SEGMENTS = 12;      // Increased back to 12 for smoother toruses

// Game objects
let toruses = [];
let pegs = [];
let smallBalls = [];
let tankPanels = [];
let bubble;

// Constants
const FLOOR_SIZE = 100;
const FLOOR_HEIGHT = -56;
const TANK_HEIGHT = 40;

// Physics simulation parameters
const MAX_SUBSTEPS = 2;        // Use the same number of substeps as the original (2)
const FIXED_TIMESTEP = 1/60;   // Standard physics timestep

// Frame rate tracking
let lastFrameTime = 0;
let frameCount = 0;
let fps = 0;

// Shared geometries and physics shapes
let torusGeometries = [];
let torusCompoundShape;

// Wait for DOM to load and Ammo to initialize
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('start-button').addEventListener('click', startDemo);
});

function startDemo() {
    const torusCount = parseInt(document.getElementById('torus-count').value);
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('force-controls').style.display = 'block';
    
    // Initialize Ammo.js
    Ammo().then(function(Ammo) {
        tmpTrans = new Ammo.btTransform();
        initPhysics(Ammo);
        initGraphics();
        // Pre-create shared resources
        createSharedResources(Ammo);
        // Create game objects
        createObjects(Ammo, torusCount);
        setupEventListeners();
        animate();
    });
}

function initPhysics(Ammo) {
    // Create physics world
    let collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
    let dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
    let overlappingPairCache = new Ammo.btDbvtBroadphase();
    let solver = new Ammo.btSequentialImpulseConstraintSolver();
    physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
    physicsWorld.setGravity(new Ammo.btVector3(0, -3.0, 0));
}

function initGraphics() {
    // Create Three.js scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xbfd1e5);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.2, 2000);
    camera.position.set(0, 5, 25);
    camera.lookAt(0, 0, 0);
    
    // Create renderer with performance optimizations
    renderer = new THREE.WebGLRenderer({ 
        antialias: false,  // Disable antialiasing for performance
        powerPreference: 'high-performance' 
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    
    // Add orbit controls with damping disabled for better performance
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.target.set(0, 0, 0);
    controls.update();
    
    // Add lighting - simplified for better performance
    const ambientLight = new THREE.AmbientLight(0x808080, 0.7); // Increased intensity
    scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(10, 10, 5);
    scene.add(dirLight);
    
    // Set up FPS display
    fpsElement = document.getElementById('fps');
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Create shared resources to improve performance
function createSharedResources(Ammo) {
    // Create shared torus geometries for each color
    const colors = [
        0xff3333, // Red
        0x33ff33, // Green
        0x3333ff, // Blue
        0xffff33, // Yellow
        0xff33ff  // Purple
    ];
    
    for (let i = 0; i < colors.length; i++) {
        const geometry = new THREE.TorusGeometry(
            TORUS_RADIUS, 
            TUBE_RADIUS, 
            TUBE_SEGMENTS, 
            TORUS_SEGMENTS
        );
        const material = new THREE.MeshPhongMaterial({ 
            color: colors[i],
            shininess: 0 // Disable specular highlights for performance
        });
        torusGeometries.push({ geometry, material });
    }
    
    // Create shared compound shape for torus
    torusCompoundShape = createCompoundTorusShape(Ammo);
}

function createObjects(Ammo, torusCount) {
    createFloor(Ammo);
    createTank(Ammo);
    createPegs(Ammo);
    createToruses(Ammo, torusCount);
    createBubble(Ammo);
}

function createFloor(Ammo) {
    // Create visual floor (simplified)
    const floorGeometry = new THREE.BoxGeometry(FLOOR_SIZE, 100, FLOOR_SIZE);
    const floorMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x808080,
        shininess: 0 // Disable specular highlights for performance
    });
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.position.set(0, FLOOR_HEIGHT - 50, 0);
    scene.add(floorMesh);
    
    // Create physics floor
    const floorShape = new Ammo.btBoxShape(new Ammo.btVector3(FLOOR_SIZE / 2, 50, FLOOR_SIZE / 2));
    const floorTransform = new Ammo.btTransform();
    floorTransform.setIdentity();
    floorTransform.setOrigin(new Ammo.btVector3(0, FLOOR_HEIGHT - 50, 0));
    
    const mass = 0; // static object
    createRigidBody(Ammo, floorMesh, floorShape, mass, floorTransform);
}

function createTank(Ammo) {
    const tankDepth = 4;  // Reduced from 8 to 4 (50% thinner)
    const tankWidth = 24;  // Wide enough to cover all pegs with some margin
    const panelThickness = 0.05;
    
    // Create material - transparent blue
    const tankMaterial = new THREE.MeshPhongMaterial({
        color: 0x7eb8dd, 
        transparent: true, 
        opacity: 0.3,
        shininess: 0 // Disable specular highlights for performance
    });
    
    // Create tank panels
    createTankPanel(Ammo, tankMaterial, [tankWidth, TANK_HEIGHT, panelThickness], [0, 0, tankDepth/2]);
    createTankPanel(Ammo, tankMaterial, [tankWidth, TANK_HEIGHT, panelThickness], [0, 0, -tankDepth/2]);
    createTankPanel(Ammo, tankMaterial, [panelThickness, TANK_HEIGHT, tankDepth], [-tankWidth/2, 0, 0]);
    createTankPanel(Ammo, tankMaterial, [panelThickness, TANK_HEIGHT, tankDepth], [tankWidth/2, 0, 0]);
    createTankPanel(Ammo, tankMaterial, [tankWidth, panelThickness, tankDepth], [0, TANK_HEIGHT/2, 0]);
    createTankPanel(Ammo, tankMaterial, [tankWidth, panelThickness, tankDepth], [0, -TANK_HEIGHT/2, 0]);
}

function createTankPanel(Ammo, material, dimensions, position) {
    // Create panel mesh
    const geometry = new THREE.BoxGeometry(dimensions[0], dimensions[1], dimensions[2]);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position[0], position[1], position[2]);
    scene.add(mesh);
    tankPanels.push(mesh);
    
    // Create physics body
    const shape = new Ammo.btBoxShape(new Ammo.btVector3(dimensions[0]/2, dimensions[1]/2, dimensions[2]/2));
    const transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(position[0], position[1], position[2]));
    
    const mass = 0; // static object
    createRigidBody(Ammo, mesh, shape, mass, transform);
}

function createPegs(Ammo) {
    // Create materials (shared for all pegs)
    const pegMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x999999,
        shininess: 0 // Disable specular highlights for performance
    });
    const baseMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xff3333,
        shininess: 0 // Disable specular highlights for performance
    });
    
    // Create shared geometries
    const pinGeometry = new THREE.CylinderGeometry(0.15, 0.15, 2.5, 8); // Reduced segments
    const baseGeometry = new THREE.CylinderGeometry(1.2, 1.2, 0.5, 16); // Reduced segments
    
    // Create shared compound shape for physics
    const compoundShape = createPegCompoundShape(Ammo);
    
    // Create 5 pegs in a row
    for (let i = 0; i < 5; i++) {
        const x = (i - 2) * 4;  // Space them out
        
        // Create parent group
        const pegGroup = new THREE.Group();
        pegGroup.position.set(x, 0, 0);
        scene.add(pegGroup);
        pegs.push(pegGroup);
        
        // Create pin part
        const pinMesh = new THREE.Mesh(pinGeometry, pegMaterial);
        pinMesh.position.set(0, 2.05, 0);
        pegGroup.add(pinMesh);
        
        // Create base part
        const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
        baseMesh.position.set(0, 0.55, 0);
        pegGroup.add(baseMesh);
        
        // Create rigid body
        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(x, 0, 0));
        
        const mass = 0; // static object
        createRigidBody(Ammo, pegGroup, compoundShape, mass, transform);
    }
}

// Create a shared compound shape for all pegs
function createPegCompoundShape(Ammo) {
    const compoundShape = new Ammo.btCompoundShape();
    
    // Add pin shape - vertical cylinder
    const pinShape = new Ammo.btCylinderShape(new Ammo.btVector3(0.15, 1.25, 0.15)); // Half-height is 1.25
    const pinTransform = new Ammo.btTransform();
    pinTransform.setIdentity();
    pinTransform.setOrigin(new Ammo.btVector3(0, 2.05, 0));
    compoundShape.addChildShape(pinTransform, pinShape);
    
    // Add base shape - also a vertical cylinder
    const baseShape = new Ammo.btCylinderShape(new Ammo.btVector3(1.2, 0.25, 1.2)); // Half-height is 0.25
    const baseTransform = new Ammo.btTransform();
    baseTransform.setIdentity();
    baseTransform.setOrigin(new Ammo.btVector3(0, 0.55, 0));
    compoundShape.addChildShape(baseTransform, baseShape);
    
    return compoundShape;
}

function createToruses(Ammo, count) {
    // Tank dimensions for reference
    const tankWidth = 24;
    const tankDepth = 4;
    
    // Grid layout parameters
    const maxPerRow = 5;
    const spacing = 4; // Space between toruses
    const startHeight = 15; // Start from the top of the tank
    const heightIncrement = 3; // Vertical distance between rows
    
    // Create toruses in a grid pattern
    for (let i = 0; i < count; i++) {
        // Calculate grid position
        const row = Math.floor(i / maxPerRow);
        const col = i % maxPerRow;
        
        // Calculate position within the tank
        const rowWidth = Math.min(count - row * maxPerRow, maxPerRow) * spacing;
        const startX = -(rowWidth - spacing) / 2;
        
        const x = startX + col * spacing;
        const y = startHeight - row * heightIncrement;
        const z = 0; // Center in the tank depth-wise
        
        // Use pre-created shared geometry and material
        const { geometry, material } = torusGeometries[i % torusGeometries.length];
        const torus = new THREE.Mesh(geometry, material);
        
        // Rotate torus to be flat/horizontal (like a plate) with the hole facing up/down
        // This is the proper orientation for rings to slide over vertical pegs
        torus.rotation.x = Math.PI / 2;
        
        // Add a slight random rotation for variety
        torus.rotation.z = Math.random() * 0.1 - 0.05;
        
        // Position in the grid pattern
        torus.position.set(x, y, z);
        
        scene.add(torus);
        toruses.push(torus);
        
        // Create physics body with the correct orientation
        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(x, y, z));
        
        // Match physics rotation to visual rotation
        const quaternion = new Ammo.btQuaternion();
        // First rotate 90 degrees around X to make the torus horizontal
        quaternion.setRotation(new Ammo.btVector3(1, 0, 0), Math.PI / 2);
        transform.setRotation(quaternion);
        
        const mass = 1;
        const localInertia = new Ammo.btVector3(0, 0, 0);
        torusCompoundShape.calculateLocalInertia(mass, localInertia);
        
        createRigidBody(Ammo, torus, torusCompoundShape, mass, transform, 0.3, 0.3);
    }
}

function createCompoundTorusShape(Ammo) {
    const compoundShape = new Ammo.btCompoundShape();
    const segments = 16; // Increased back to 16 for better collision detection
    
    // Create shape in the original orientation (like a standing coin)
    // The hole will be facing horizontally (along the Z axis)
    for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        
        // Create a cylinder for each segment
        const cylinderShape = new Ammo.btCylinderShape(
            new Ammo.btVector3(TUBE_RADIUS, TUBE_RADIUS, TORUS_RADIUS * 0.25)
        );
        
        // Position the cylinder
        const transform = new Ammo.btTransform();
        transform.setIdentity();
        
        // Calculate position on the ring (in X-Y plane for a vertical/coin orientation)
        const x = TORUS_RADIUS * Math.cos(angle);
        const y = TORUS_RADIUS * Math.sin(angle);
        transform.setOrigin(new Ammo.btVector3(x, y, 0));
        
        // Rotate to form the ring
        const q = new Ammo.btQuaternion();
        q.setRotation(new Ammo.btVector3(0, 0, 1), angle + Math.PI/2);
        transform.setRotation(q);
        
        compoundShape.addChildShape(transform, cylinderShape);
    }
    
    // No need for additional rotation as we're already creating it in the desired orientation
    
    return compoundShape;
}

function createBubble(Ammo) {
    // Create visual bubble (using a sphere since Three.js renders them well)
    const geometry = new THREE.SphereGeometry(2.0, 16, 12); // Reduced segments
    const material = new THREE.MeshPhongMaterial({ 
        color: 0xff0000,  // Red bubble
        transparent: true,
        opacity: 0.8,
        shininess: 0 // Disable specular highlights for performance
    });
    bubble = new THREE.Mesh(geometry, material);
    bubble.position.set(0, -15, 0); // Bottom of the tank
    scene.add(bubble);
    
    // Create physics body (using a sphere shape)
    const shape = new Ammo.btSphereShape(2.0);
    const transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(0, -15, 0));
    
    const mass = 0.1; // Light mass for buoyancy
    const localInertia = new Ammo.btVector3(0, 0, 0);
    shape.calculateLocalInertia(mass, localInertia);
    
    const body = createRigidBody(Ammo, bubble, shape, mass, transform);
    
    // Add water-like physics properties
    body.setDamping(0.9, 0.9);   // High damping for water resistance
    body.setRestitution(0.7);    // Bouncy
    body.setFriction(0.1);       // Low friction in water
}

function createRigidBody(Ammo, threeObject, physicsShape, mass, transform, linearDamping = 0, angularDamping = 0) {
    const motionState = new Ammo.btDefaultMotionState(transform);
    const localInertia = new Ammo.btVector3(0, 0, 0);
    
    if (mass > 0) {
        physicsShape.calculateLocalInertia(mass, localInertia);
    }
    
    const rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, physicsShape, localInertia);
    const body = new Ammo.btRigidBody(rbInfo);
    
    // Apply damping only for toruses (similar to original values)
    if (linearDamping > 0 || angularDamping > 0) {
        body.setDamping(0.3, 0.3); // Use original torus damping values
    }
    
    // Use original-like settings for restitution and friction
    body.setRestitution(0.2);  // Standard value
    body.setFriction(0.5);     // Medium friction
    
    // Disable CCD as it wasn't used in the original
    // body.setCcdMotionThreshold(1.0);
    // body.setCcdSweptSphereRadius(0.2);
    
    // Keep deactivation enabled as in the original
    // This allows objects to go to sleep when they stop moving
    // which helps with stacking stability
    
    threeObject.userData.physicsBody = body;
    
    if (mass > 0) {
        rigidBodies.push(threeObject);
    }
    
    physicsWorld.addRigidBody(body);
    
    return body;
}

function setupEventListeners() {
    // Force strength slider
    document.getElementById('force-strength').addEventListener('input', function() {
        document.getElementById('strength-value').textContent = this.value;
    });
    
    // Apply force button
    document.getElementById('apply-force').addEventListener('click', function() {
        const direction = document.getElementById('force-direction').value;
        const strength = parseInt(document.getElementById('force-strength').value);
        
        // Convert direction to vector
        let forceVector = new Ammo.btVector3(0, 0, 0);
        switch(direction) {
            case 'up':
                forceVector = new Ammo.btVector3(0, strength, 0);
                break;
            case 'down':
                forceVector = new Ammo.btVector3(0, -strength, 0);
                break;
            case 'left':
                forceVector = new Ammo.btVector3(-strength, 0, 0);
                break;
            case 'right':
                forceVector = new Ammo.btVector3(strength, 0, 0);
                break;
            case 'forward':
                forceVector = new Ammo.btVector3(0, 0, -strength);
                break;
            case 'backward':
                forceVector = new Ammo.btVector3(0, 0, strength);
                break;
        }
        
        // Apply force to all toruses
        applyForceToToruses(forceVector);
    });
    
    // Apply random forces button
    document.getElementById('apply-random').addEventListener('click', function() {
        const maxStrength = parseInt(document.getElementById('force-strength').value);
        applyRandomForcesToToruses(maxStrength);
    });
}

function applyForceToToruses(forceVector) {
    for (let i = 0; i < toruses.length; i++) {
        const torus = toruses[i];
        const body = torus.userData.physicsBody;
        
        if (body) {
            body.activate(true); // Make sure the rigid body is active
            body.applyCentralImpulse(forceVector);
        }
    }
}

function applyRandomForcesToToruses(maxStrength) {
    for (let i = 0; i < toruses.length; i++) {
        const torus = toruses[i];
        const body = torus.userData.physicsBody;
        
        if (body) {
            const randomForce = new Ammo.btVector3(
                (Math.random() - 0.5) * maxStrength * 2,
                (Math.random() - 0.5) * maxStrength * 2,
                (Math.random() - 0.5) * maxStrength * 2
            );
            
            body.activate(true);
            body.applyCentralImpulse(randomForce);
        }
    }
}

function updatePhysics(deltaTime) {
    // Similar to original implementation
    deltaTime = deltaTime || 1/60;
    
    // Step the physics world with fixed settings like the original
    physicsWorld.stepSimulation(deltaTime, MAX_SUBSTEPS);
    
    // Update rigid bodies
    for (let i = 0; i < rigidBodies.length; i++) {
        const objThree = rigidBodies[i];
        const objPhys = objThree.userData.physicsBody;
        const ms = objPhys.getMotionState();
        
        if (ms) {
            ms.getWorldTransform(tmpTrans);
            const p = tmpTrans.getOrigin();
            const q = tmpTrans.getRotation();
            
            objThree.position.set(p.x(), p.y(), p.z());
            objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());
        }
    }
    
    // Calculate FPS
    frameCount++;
    
    const currentTime = performance.now();
    if (currentTime > lastFrameTime + 1000) {
        fps = Math.round((frameCount * 1000) / (currentTime - lastFrameTime));
        fpsElement.textContent = 'FPS: ' + fps;
        
        frameCount = 0;
        lastFrameTime = currentTime;
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = clock.getDelta();
    updatePhysics(deltaTime);
    renderer.render(scene, camera);
    controls.update();
} 