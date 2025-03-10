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

// Add these global variables at the top of the file near other global declarations
let activeBubbles = [];
let bubbleLifetimes = [];
const BUBBLE_LIFETIME = 4000; // 4 seconds in milliseconds

// Add these global variables near the top with other globals
let lastBubbleTime = 0;
let bubbleFlowActive = false;
let bubbleSpawnPosition = { x: 8, y: -17, z: -1 }; // Default spawn position

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
    
    // Create camera with adjusted position to see the tank and slope on the floor
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.2, 2000);
    camera.position.set(0, -FLOOR_HEIGHT/4, 40); // Lower camera position for better view
    camera.lookAt(0, FLOOR_HEIGHT + 10, -10); // Look at the area where tank and slope sit on the floor
    
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
    controls.target.set(0, FLOOR_HEIGHT + 10, -10); // Update orbit controls target to match lookAt
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
    createSlope(Ammo);
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

function createSlope(Ammo) {
    // Get the tank's base position and dimensions
    const tankHeight = 40;
    const tankWidth = 14;
    const tankDepth = 4;
    const tankY = FLOOR_HEIGHT + tankHeight/2 + 1;
    
    // Calculate tank bottom position - this is where we want to align the slope
    const tankBottomY = tankY - (tankHeight - 6)/2 + 2;
    
    // Slope dimensions - make it longer on the horizontal plane
    const slopeWidth = 15.5; // Long enough to reach from outside the tank
    const slopeLength = tankDepth; // Match tank depth
    const slopeHeight = 0.5; // Thin height
    
    // Gentler angle for better gameplay
    const slopeAngle = Math.PI * 0.10; 
    
    // Create visual slope
    const slopeGeometry = new THREE.BoxGeometry(slopeWidth, slopeHeight, slopeLength);
    const slopeMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xc0e8ff,  // Very light blue tint
        transparent: true,
        opacity: 0.3,
        shininess: 90,     // More glossy/plastic look
        specular: 0x666666 // Light specular highlight
    });
    const slopeMesh = new THREE.Mesh(slopeGeometry, slopeMaterial);
    
    // Position the slope to the left (west) of the tank, aligned with the bottom
    slopeMesh.position.set(
        -tankWidth/7, // Position inside the tank, about 1/4 from the left side
        tankBottomY, // Align with bottom of the tank
        0 // Centered on Z-axis
    );
    
    // Rotate around Y axis (for west to east orientation)
    // Then apply Z rotation for the angle of the slope
    slopeMesh.rotation.z = -slopeAngle; // Negative angle to slope upward from left to right
    
    scene.add(slopeMesh);
    
    // Create physics body for the slope
    // We'll use a box shape rotated to match the visual slope
    const slopeShape = new Ammo.btBoxShape(new Ammo.btVector3(slopeWidth / 2, slopeHeight/2, slopeLength / 2));
    
    const slopeTransform = new Ammo.btTransform();
    slopeTransform.setIdentity();
    slopeTransform.setOrigin(new Ammo.btVector3(slopeMesh.position.x, slopeMesh.position.y, slopeMesh.position.z));
    
    // Apply the rotation to the physics body
    const q = new Ammo.btQuaternion();
    q.setRotation(new Ammo.btVector3(0, 0, 1), -slopeAngle); // Rotate around Z axis
    slopeTransform.setRotation(q);
    
    // Create rigid body
    const mass = 0; // Static object
    const body = createRigidBody(Ammo, slopeMesh, slopeShape, mass, slopeTransform);
    
    // Make the slope very slippery by setting a lower friction value
    body.setFriction(0.05); // Much lower friction than the default 0.5
    
    return slopeMesh;
}

function createTank(Ammo) {
    const tankDepth = 4;  // Keep same depth
    const tankWidth = 18;  // Slightly narrower for toy-like proportions
    const tankHeight = 40;  // Keep the same height
    const panelThickness = 0.05;
    
    // Create materials
    
    // Clear plastic material for main tank body
    const tankClearMaterial = new THREE.MeshPhongMaterial({
        color: 0xc0e8ff, // Very light blue tint
        transparent: true, 
        opacity: 0.2,
        shininess: 90, // More glossy/plastic look
        specular: 0x666666 // Light specular highlight
    });
    
    // Red plastic material for top and bottom
    const tankRedMaterial = new THREE.MeshPhongMaterial({
        color: 0xdd1111, // Bright red
        shininess: 70,
        specular: 0x666666 // Light specular highlight
    });
    
    // Position tank on the floor
    const tankY = FLOOR_HEIGHT + tankHeight/2 + 1; // Position the tank directly on the floor
    
    // Create tank panels - sides are clear plastic
    
    // Front panel
    createTankPanel(Ammo, tankClearMaterial, [tankWidth, tankHeight - 6, panelThickness], [0, tankY, tankDepth/2]);
    
    // Back panel
    createTankPanel(Ammo, tankClearMaterial, [tankWidth, tankHeight - 6, panelThickness], [0, tankY, -tankDepth/2]);
    
    // Left panel
    createTankPanel(Ammo, tankClearMaterial, [panelThickness, tankHeight - 6, tankDepth], [-tankWidth/2, tankY, 0]);
    
    // Right panel
    createTankPanel(Ammo, tankClearMaterial, [panelThickness, tankHeight - 6, tankDepth], [tankWidth/2, tankY, 0]);
    
    // Top panel - red
    createTankPanel(Ammo, tankRedMaterial, [tankWidth, 3, tankDepth], [0, tankY + (tankHeight - 6)/2 + 1.5, 0]);
    
    // Bottom panel - red
    createTankPanel(Ammo, tankRedMaterial, [tankWidth, 3, tankDepth], [0, tankY - (tankHeight - 6)/2 - 1.5, 0]);
    
    // Add a base for the tank
    const baseWidth = tankWidth + 4;
    const baseHeight = 6;
    const baseDepth = tankDepth + 2;
    
    // Create base geometry
    const baseGeometry = new THREE.BoxGeometry(baseWidth, baseHeight, baseDepth);
    const baseMesh = new THREE.Mesh(baseGeometry, tankRedMaterial);
    baseMesh.position.set(0, tankY - (tankHeight - 6)/2 - 4.5, 0);
    scene.add(baseMesh);
    tankPanels.push(baseMesh);
    
    // Create physics body for base
    const baseShape = new Ammo.btBoxShape(new Ammo.btVector3(baseWidth/2, baseHeight/2, baseDepth/2));
    const baseTransform = new Ammo.btTransform();
    baseTransform.setIdentity();
    baseTransform.setOrigin(new Ammo.btVector3(baseMesh.position.x, baseMesh.position.y, baseMesh.position.z));
    createRigidBody(Ammo, baseMesh, baseShape, 0, baseTransform);
    
    // Add control knob on the right side
    const knobGeometry = new THREE.CylinderGeometry(1.5, 1.5, 1, 16);
    const knobMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xeeeeee, // Off-white 
        shininess: 80
    });
    const knobMesh = new THREE.Mesh(knobGeometry, knobMaterial);
    // Rotate to make cylinder horizontal
    knobMesh.rotation.z = Math.PI/2;
    knobMesh.position.set(tankWidth/2 + 1.5, tankY - (tankHeight - 6)/2 - 2.5, 0);
    scene.add(knobMesh);
    
    // Round the edges of the tank by adding cylindrical edge pieces
    addRoundedEdges(Ammo, tankWidth, tankDepth, tankHeight, tankClearMaterial, tankY);
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

// Function to add rounded edges to the tank
function addRoundedEdges(Ammo, width, depth, height, material, tankY) {
    const radius = 0.5; // Edge radius
    const segments = 8;  // Number of segments for the cylinders
    const actualHeight = height - 6; // Account for red top and bottom
    
    // Create vertical edge cylinders (at the 4 corners)
    for (let x = -1; x <= 1; x += 2) {
        for (let z = -1; z <= 1; z += 2) {
            const edgeGeometry = new THREE.CylinderGeometry(radius, radius, actualHeight, segments, 1, false, Math.PI/2, Math.PI/2);
            const edgeMesh = new THREE.Mesh(edgeGeometry, material);
            
            edgeMesh.position.set(x * (width/2), tankY, z * (depth/2));
            
            // Rotate based on which corner this is
            if (x > 0 && z > 0) { 
                edgeMesh.rotation.y = 0;
            } else if (x < 0 && z > 0) {
                edgeMesh.rotation.y = Math.PI/2;
            } else if (x < 0 && z < 0) {
                edgeMesh.rotation.y = Math.PI;
            } else {
                edgeMesh.rotation.y = -Math.PI/2; 
            }
            
            scene.add(edgeMesh);
        }
    }
}

function createPegs(Ammo) {
    // Get the tank's vertical position
    const tankDepth = 4;
    const tankHeight = 40;
    const tankY = FLOOR_HEIGHT + tankHeight/2 + 1; // Same as in createTank
    
    // Define matching colors for pegs to match torus colors
    const pegColors = [
        0xff3333, // Red
        0x33ff33, // Green
        0x3333ff, // Blue
        0xffff33, // Yellow
        0xff33ff  // Purple
    ];
    
    // Red plastic for bases (same as tank base)
    const baseMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xdd1111, // Bright red
        shininess: 70,
        specular: 0x666666
    });
    
    // Create shared geometries
    const pinGeometry = new THREE.CylinderGeometry(0.15, 0.15, 2.5, 8); // Pin is thinner
    
    // Add rounded tops to pins
    const pinCapGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    
    // Create shared compound shape for physics
    const compoundShape = createPegCompoundShape(Ammo);
    
    // Create 5 pegs in a row
    for (let i = 0; i < 5; i++) {
        const x = (i - 2) * 3;  // Space them closer for the toy look
        
        // Create material for this peg with matching color
        const pegMaterial = new THREE.MeshPhongMaterial({ 
            color: pegColors[i],
            transparent: true,
            opacity: 0.7, // Semi-transparent
            shininess: 90,
            specular: 0x666666,
            side: THREE.DoubleSide, // Render both sides of geometry
            depthWrite: false, // Improve transparency rendering
            polygonOffset: true,
            polygonOffsetFactor: -4
        });
        
        // Create parent group
        const pegGroup = new THREE.Group();
        pegGroup.position.set(x, tankY, 0);  // Position relative to tank's Y position
        scene.add(pegGroup);
        pegs.push(pegGroup);
        
        // Create pin part
        const pinMesh = new THREE.Mesh(pinGeometry, pegMaterial);
        pinMesh.position.set(0, 2.05, 0);
        pegGroup.add(pinMesh);
        
        // Add rounded cap at the top of each pin
        const pinCapMesh = new THREE.Mesh(pinCapGeometry, pegMaterial);
        pinCapMesh.position.set(0, 3.4, 0); // Position at top of pin
        pegGroup.add(pinCapMesh);
        
        // Create base part - flat disc
        const baseGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.2, 16); // Smaller, flatter base
        const baseMesh = new THREE.Mesh(baseGeometry, pegMaterial); // Use same colored material for base
        baseMesh.position.set(0, 0.3, 0); // Lower base 
        pegGroup.add(baseMesh);
        
        // Create rigid body
        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(x, tankY, 0));
        
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
    
    // Add pin cap - sphere at top
    const capShape = new Ammo.btSphereShape(0.15);
    const capTransform = new Ammo.btTransform();
    capTransform.setIdentity();
    capTransform.setOrigin(new Ammo.btVector3(0, 3.4, 0));
    compoundShape.addChildShape(capTransform, capShape);
    
    // Add base shape - flatter cylinder
    const baseShape = new Ammo.btCylinderShape(new Ammo.btVector3(0.8, 0.1, 0.8)); // Smaller, flatter base
    const baseTransform = new Ammo.btTransform();
    baseTransform.setIdentity();
    baseTransform.setOrigin(new Ammo.btVector3(0, 0.3, 0));
    compoundShape.addChildShape(baseTransform, baseShape);
    
    return compoundShape;
}

function createToruses(Ammo, count) {
    // Get the tank's vertical position
    const tankDepth = 4;
    const tankHeight = 40;
    const tankY = FLOOR_HEIGHT + tankHeight/2 + 1; // Same as in createTank
    
    // Tank dimensions for reference
    const tankWidth = 18;
    
    // Grid layout parameters
    const maxPerRow = 5;
    const spacing = 4; // Space between toruses
    const startHeight = tankY + 15; // Start from the top of the tank
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
        
        // Set mass, linear damping, and angular damping
        const mass = 1.0;
        const linearDamping = 0.5;  // Add some drag to slow down motion
        const angularDamping = 0.5; // Add some rotational damping
        
        // Create the rigid body
        let body = createRigidBody(Ammo, torus, torusCompoundShape, mass, transform, linearDamping, angularDamping);
        
        // Allow sleeping to improve performance
        body.setSleepingThresholds(0.1, 0.1);
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
    // Get the tank's vertical position
    const tankDepth = 4;
    const tankHeight = 40;
    const tankY = FLOOR_HEIGHT + tankHeight/2 + 1; // Same as in createTank
    
    // Define bubble parameters
    const bubbleCount = 8;
    const bubbleSizes = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.6, 0.5];
    // Add some variety of colors for bubbles
    const bubbleColors = [
        0x88ccff, // Light blue
        0xbbffdd, // Light green
        0xffddbb, // Light orange
        0xeeddff, // Light purple
        0xffffff, // White
        0xaaeeff, // Cyan
        0xffddee, // Pink
        0xeeffbb  // Light yellow
    ];
    const bubbles = [];
    
    // Create multiple small bubbles
    for (let i = 0; i < bubbleCount; i++) {
        // Initially place bubbles out of view - they'll be activated by the pump
        const size = bubbleSizes[i % bubbleSizes.length];
        const color = bubbleColors[i % bubbleColors.length];
        
        // Create bubble visual (transparent sphere with color)
        const bubbleGeometry = new THREE.SphereGeometry(size, 16, 16);
        const bubbleMaterial = new THREE.MeshPhongMaterial({
            color: color,
            transparent: true,
            opacity: 0.3,
            shininess: 90,
            specular: 0x666666
        });
        
        const bubbleMesh = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
        
        // Position bubble out of view initially
        bubbleMesh.position.set(0, -100, 0); // Hide below the scene
        scene.add(bubbleMesh);
        bubbles.push(bubbleMesh);
        
        // Create physics body for bubble
        const bubbleShape = new Ammo.btSphereShape(size);
        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(0, -100, 0)); // Hide below the scene
        
        // Set very low mass for buoyancy
        const mass = 0.01;
        const linearDamping = 0.8; // Water-like damping
        const angularDamping = 0.2;
        
        // Create rigid body
        const body = createRigidBody(Ammo, bubbleMesh, bubbleShape, mass, transform, linearDamping, angularDamping);
        
        // Increase restitution (bounciness)
        body.setRestitution(0.8);
        
        // Decrease friction
        body.setFriction(0.1);
        
        // Store the active status
        bubbleMesh.userData.isActive = false;
        
        // Store size for later use
        bubbleMesh.userData.size = size;
        
        // Store color for later use
        bubbleMesh.userData.color = color;
    }
    
    // Store the bubbles in the global array
    activeBubbles = bubbles;
    
    // Store the first bubble for compatibility with existing code
    bubble = bubbles[0];
    
    return bubbles;
}

// Function to create a bubble pop effect
function createBubblePop(position, color, size) {
    // Create a group of small spheres that expand outward
    const particleCount = 8;
    const particles = [];
    
    for (let i = 0; i < particleCount; i++) {
        // Create a small sphere
        const particleGeometry = new THREE.SphereGeometry(size * 0.2, 8, 8);
        const particleMaterial = new THREE.MeshPhongMaterial({
            color: color,
            transparent: true,
            opacity: 0.7,
            shininess: 90
        });
        
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        particle.position.copy(position);
        
        // Set random direction vector
        const direction = new THREE.Vector3(
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
            Math.random() * 2 - 1
        ).normalize();
        
        particle.userData.direction = direction;
        particle.userData.speed = 0.2 + Math.random() * 0.3;
        particle.userData.creationTime = Date.now();
        particle.userData.lifetime = 500 + Math.random() * 300; // 0.5-0.8 seconds
        
        scene.add(particle);
        particles.push(particle);
    }
    
    // Animation to expand particles and fade them out
    const animateParticles = function() {
        const currentTime = Date.now();
        let allDone = true;
        
        for (let i = 0; i < particles.length; i++) {
            const particle = particles[i];
            const elapsed = currentTime - particle.userData.creationTime;
            
            if (elapsed < particle.userData.lifetime) {
                allDone = false;
                
                // Move particle outward
                particle.position.add(
                    particle.userData.direction.clone().multiplyScalar(particle.userData.speed)
                );
                
                // Scale down and fade out
                const progress = elapsed / particle.userData.lifetime;
                particle.material.opacity = 0.7 * (1 - progress);
                particle.scale.setScalar(1 - 0.5 * progress);
            } else if (particle.parent) {
                // Remove expired particles
                scene.remove(particle);
            }
        }
        
        if (!allDone) {
            requestAnimationFrame(animateParticles);
        }
    };
    
    // Start animation
    animateParticles();
}

// Update the checkBubbleRingCollisions function to add visual effects
function checkBubbleRingCollisions() {
    // Get dispatcher from physics world
    const dispatcher = physicsWorld.getDispatcher();
    const numManifolds = dispatcher.getNumManifolds();
    
    // Check each contact manifold
    for (let i = 0; i < numManifolds; i++) {
        const contactManifold = dispatcher.getManifoldByIndexInternal(i);
        const numContacts = contactManifold.getNumContacts();
        
        if (numContacts > 0) {
            // Get the two objects in contact
            const body0 = Ammo.castObject(contactManifold.getBody0(), Ammo.btRigidBody);
            const body1 = Ammo.castObject(contactManifold.getBody1(), Ammo.btRigidBody);
            
            // Check if one is a bubble and one is a ring
            const isBubble0 = activeBubbles.some(b => b.userData.physicsBody === body0);
            const isRing0 = rigidBodies.some(r => r.userData.physicsBody === body0 && r !== bubble);
            const isBubble1 = activeBubbles.some(b => b.userData.physicsBody === body1);
            const isRing1 = rigidBodies.some(r => r.userData.physicsBody === body1 && r !== bubble);
            
            if ((isBubble0 && isRing1) || (isBubble1 && isRing0)) {
                // Bubble-ring collision detected!
                const bubbleBody = isBubble0 ? body0 : body1;
                const ringBody = isBubble0 ? body1 : body0;
                
                // Apply an upward force to the ring
                ringBody.activate();
                ringBody.applyCentralForce(new Ammo.btVector3(
                    (Math.random() - 0.5) * 30,  // Random horizontal component
                    50 + Math.random() * 50,     // Strong upward force
                    (Math.random() - 0.5) * 30   // Random horizontal component
                ));
                
                // Deactivate the bubble (pop it)
                const bubbleIndex = activeBubbles.findIndex(b => b.userData.physicsBody === bubbleBody);
                if (bubbleIndex >= 0) {
                    const bubbleMesh = activeBubbles[bubbleIndex];
                    
                    // Create pop effect before hiding the bubble
                    createBubblePop(
                        bubbleMesh.position.clone(),
                        bubbleMesh.userData.color,
                        bubbleMesh.userData.size
                    );
                    
                    // Deactivate and hide the bubble
                    bubbleMesh.userData.isActive = false;
                    bubbleMesh.position.set(0, -100, 0); // Hide it
                    const transform = bubbleBody.getWorldTransform();
                    transform.setOrigin(new Ammo.btVector3(0, -100, 0));
                    bubbleMesh.material.opacity = 0;
                }
            }
        }
    }
}

function activateBubbles() {
    // Start a bubble flow that continues over time
    bubbleFlowActive = true;
    lastBubbleTime = 0; // Reset to start immediately
    
    // Call the bubble spawner function that will continue as long as flow is active
    spawnBubblesInFlow();
}

// New function to handle continuous bubble spawning
function spawnBubblesInFlow() {
    // If flow is not active, stop spawning
    if (!bubbleFlowActive) return;
    
    const currentTime = Date.now();
    
    // Only spawn a bubble every 150ms for a steady stream
    if (currentTime - lastBubbleTime > 150) {
        lastBubbleTime = currentTime;
        
        // Get the tank dimensions
        const tankWidth = 18;
        const tankDepth = 4;
        const tankHeight = 40;
        const tankY = FLOOR_HEIGHT + tankHeight/2 + 1;
        
        // Use the position from the sliders
        // Convert from slider space to world space
        const releaseX = bubbleSpawnPosition.x;
        const releaseY = tankY + bubbleSpawnPosition.y; // Adjust to tank position
        const releaseZ = bubbleSpawnPosition.z;
        
        // Find an inactive bubble
        let spawnedBubble = false;
        for (let i = 0; i < activeBubbles.length; i++) {
            const bubble = activeBubbles[i];
            
            if (!bubble.userData.isActive) {
                const size = bubble.userData.size;
                
                // Add small random variation to make it look natural
                const x = releaseX + (Math.random() * 0.3 - 0.15);
                const y = releaseY + (Math.random() * 0.3 - 0.15);
                const z = releaseZ + (Math.random() * 0.3 - 0.15);
                
                // Move to position
                bubble.position.set(x, y, z);
                
                // Update the physics body
                const body = bubble.userData.physicsBody;
                const worldTransform = body.getWorldTransform();
                worldTransform.setOrigin(new Ammo.btVector3(x, y, z));
                
                // Calculate direction vector from spawn position to center of tank
                const centerX = 0;
                const centerY = tankY;
                const centerZ = 0;
                
                const dirX = centerX - releaseX;
                const dirY = Math.max(5, centerY - releaseY); // Always some upward component
                const dirZ = centerZ - releaseZ;
                
                // Normalize the direction vector
                const length = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
                const normX = dirX / length;
                const normY = dirY / length;
                const normZ = dirZ / length;
                
                // Apply a force in the calculated direction
                body.activate();
                
                // Base force strength with small variation for natural look
                const forceStrength = 8 + Math.random() * 2;
                
                // Apply force in the direction toward center with strong upward bias
                body.applyCentralForce(new Ammo.btVector3(
                    forceStrength * normX,
                    forceStrength * normY * 1.5, // Extra upward force
                    forceStrength * normZ
                ));
                
                // Mark as active
                bubble.userData.isActive = true;
                
                // Set bubble lifetime
                bubbleLifetimes[i] = Date.now() + BUBBLE_LIFETIME;
                
                // Make bubble visible with animation
                bubble.material.opacity = 0;
                const startTime = Date.now();
                const fadeIn = function() {
                    const elapsed = Date.now() - startTime;
                    if (elapsed < 200) {
                        bubble.material.opacity = Math.min(0.7, elapsed / 200 * 0.7);
                        requestAnimationFrame(fadeIn);
                    } else {
                        bubble.material.opacity = 0.7;
                    }
                };
                fadeIn();
                
                spawnedBubble = true;
                break;
            }
        }
        
        // Stop the flow if we've been active for 3 seconds
        if (currentTime - (lastBubbleTime - 150) > 3000) {
            bubbleFlowActive = false;
        }
    }
    
    // Continue the flow
    if (bubbleFlowActive) {
        requestAnimationFrame(spawnBubblesInFlow);
    }
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
    
    // Add drop on slope button
    document.getElementById('drop-on-slope').addEventListener('click', function() {
        dropRingsOnSlope();
    });
    
    // Setup bubble position sliders
    document.getElementById('bubble-x').addEventListener('input', function() {
        const value = parseFloat(this.value);
        document.getElementById('bubble-x-value').textContent = value;
        bubbleSpawnPosition.x = value;
    });
    
    document.getElementById('bubble-y').addEventListener('input', function() {
        const value = parseFloat(this.value);
        document.getElementById('bubble-y-value').textContent = value;
        bubbleSpawnPosition.y = value;
    });
    
    document.getElementById('bubble-z').addEventListener('input', function() {
        const value = parseFloat(this.value);
        document.getElementById('bubble-z-value').textContent = value;
        bubbleSpawnPosition.z = value;
    });
    
    // Add pump bubbles button
    document.getElementById('pump-bubbles').addEventListener('click', function() {
        activateBubbles();
    });
    
    // Add keyboard shortcuts
    window.addEventListener('keydown', function(event) {
        if (event.key === 's' || event.key === 'S') {
            dropRingsOnSlope();
        } else if (event.key === 'b' || event.key === 'B') {
            activateBubbles();
        }
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

// Function to drop rings on the slope
function dropRingsOnSlope() {
    // Get the tank dimensions
    const tankHeight = 40;
    const tankWidth = 18;
    const tankY = FLOOR_HEIGHT + tankHeight/2 + 1;
    
    // Calculate tank bottom position where the slope aligns
    const tankBottomY = tankY - (tankHeight - 6)/2 - 1.5;
    
    // Slope dimensions and position
    const slopeWidth = 30;
    
    // Activate each torus physics body
    for (let i = 0; i < toruses.length; i++) {
        const torus = toruses[i];
        const physicsBody = torus.userData.physicsBody;
        
        // Position rings at the far left of the slope (west end)
        const x = -(tankWidth/2 + slopeWidth - 5); // Far left side of the slope
        const y = tankBottomY + 5; // Above the slope
        const z = (Math.random() - 0.5) * 3; // Small random variation in Z
        
        // Reset position
        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(x, y, z));
        
        // Set rotation - keep rings horizontal
        const quaternion = new Ammo.btQuaternion();
        quaternion.setRotation(new Ammo.btVector3(1, 0, 0), Math.PI / 2); // Horizontal orientation
        transform.setRotation(quaternion);
        
        // Apply transform
        physicsBody.setWorldTransform(transform);
        
        // Reset velocity and angular velocity
        physicsBody.setLinearVelocity(new Ammo.btVector3(0, 0, 0));
        physicsBody.setAngularVelocity(new Ammo.btVector3(0, 0, 0));
        
        // Activate the body
        physicsBody.activate();
    }
}

function updatePhysics(deltaTime) {
    // Step simulation
    deltaTime = deltaTime || 1/60;
    physicsWorld.stepSimulation(deltaTime, MAX_SUBSTEPS);
    
    // Update rigid bodies
    for (let i = 0, il = rigidBodies.length; i < il; i++) {
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
    
    // Check for bubble lifetimes
    const currentTime = Date.now();
    let activeBubbleCount = 0;
    
    for (let i = 0; i < activeBubbles.length; i++) {
        const bubble = activeBubbles[i];
        
        if (bubble.userData.isActive) {
            activeBubbleCount++;
            
            // Check if bubble lifetime has expired
            if (currentTime > bubbleLifetimes[i]) {
                // Deactivate the bubble
                bubble.userData.isActive = false;
                bubble.position.set(0, -100, 0); // Hide it
                const body = bubble.userData.physicsBody;
                const transform = body.getWorldTransform();
                transform.setOrigin(new Ammo.btVector3(0, -100, 0));
                bubble.material.opacity = 0;
            }
        }
    }
    
    // Check for bubble-ring collisions
    checkBubbleRingCollisions();
    
    // Calculate FPS
    frameCount++;
    
    const currentFPSTime = performance.now();
    if (currentFPSTime > lastFrameTime + 1000) {
        fps = Math.round((frameCount * 1000) / (currentFPSTime - lastFrameTime));
        fpsElement.textContent = 'FPS: ' + fps;
        
        frameCount = 0;
        lastFrameTime = currentFPSTime;
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = clock.getDelta();
    updatePhysics(deltaTime);
    renderer.render(scene, camera);
    controls.update();
} 