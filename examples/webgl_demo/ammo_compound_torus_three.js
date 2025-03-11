// Global variables
let physicsWorld;
let scene, camera, renderer, controls;
let clock = new THREE.Clock();
let rigidBodies = [];
let tmpTrans = null;
let fpsElement;
let backgroundMusic;
let isMusicPlaying = false;

// Character selection variables
let selectedCharacter = null;
let selectedBedroom = null;
let characterBackgrounds = {
    'beach': {
        skyColor: 0x87CEEB,
        floorColor: 0xF5DEB3, // Sandy color
        fogColor: 0xE0FFFF,
        fogDensity: 0.005
    },
    'space': {
        skyColor: 0x000011,
        floorColor: 0x333333, // Dark gray
        fogColor: 0x000022,
        fogDensity: 0.002
    },
    'forest': {
        skyColor: 0x458B00,
        floorColor: 0x556B2F, // Dark olive green
        fogColor: 0x90EE90,
        fogDensity: 0.01
    },
    'volcano': {
        skyColor: 0x993300,
        floorColor: 0x8B4513, // Saddle brown
        fogColor: 0xFF4500, 
        fogDensity: 0.02
    }
};

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
const BUBBLE_LIFETIME = 2500; // All bubbles last 2.5 seconds

// Add these global variables near the top with other globals
let lastBubbleTime = 0;
let bubbleFlowActive = false;
let bubbleSpawnPosition = { x: 5.5, y: -15, z: 0 }; // Updated default spawn position
let bubblePower = 10; // Default bubble power (will be controlled by slider)
let bubbleAngle = 90; // Default angle is straight up (90 degrees)
let isPumpButtonHeld = false; // Track if pump button is being held
const MAX_PUMP_HOLD_TIME = 5000; // Maximum pump hold time in milliseconds (5 seconds)
let pumpStartTime = 0; // When the pump button was pressed
const BUBBLE_SPAWN_INTERVAL = 30; // Spawn bubbles more frequently (33 per second)
const PEG_DETECTION_DISTANCE = 0.5; // Distance to detect if a ring is on a peg
const PEG_STABILITY_CHECK_INTERVAL = 500; // Check if rings are on pegs every 500ms

// Add these global variables near the top with the other globals
let score = 0;
let scoreElement;
let highScore = 0;

// Wait for DOM to load and Ammo to initialize
document.addEventListener('DOMContentLoaded', function() {
    // Set up character selection
    document.querySelectorAll('.character-card').forEach(card => {
        card.addEventListener('click', function() {
            selectedCharacter = this.id;
            const background = this.getAttribute('data-background');
            // Store the selected bedroom image for later use
            selectedBedroom = this.getAttribute('data-bedroom');
            
            // Hide character selection and show start screen
            document.getElementById('character-selection').style.display = 'none';
            document.getElementById('start-screen').style.display = 'block';
            
            // Store selected background for later use
            localStorage.setItem('selectedBackground', background);
            localStorage.setItem('selectedBedroom', selectedBedroom);
        });
    });
    
    // Set up start button
    document.getElementById('start-button').addEventListener('click', startDemo);
});

function startDemo() {
    // Initialize graphics
    initGraphics();
    
    // Set up the bedroom frame
    setupBedroomFrame();
    
    // Initialize Ammo.js
    Ammo().then(function(Ammo) {
        // Set up transformations
        tmpTrans = new Ammo.btTransform();
        
        initPhysics(Ammo);
        
        // Pre-create shared resources
        createSharedResources(Ammo);
        
        // Get the number of rings selected
        const torusCount = parseInt(document.getElementById('torus-count').value);
        
        // Create the objects
        createObjects(Ammo, torusCount);
        
        // Initialize music
        initBackgroundMusic();
        
        // Set up event listeners
        setupEventListeners();
        
        // Hide the start screen
        document.getElementById('start-screen').style.display = 'none';
        
        // Controls are hidden by default now
        document.getElementById('force-controls').style.display = 'none';
        
        // Start animation
        animate();
    });
}

// Initialize background music
function initBackgroundMusic() {
    // Array of available music tracks
    const musicTracks = [
        'dubmood.mp3',
        'Mesmerizing-Galaxy-Loop.mp3',
        'mothership.mp3',
        'Ringing Back the 90s.mp3',
        'Ringing Back the 90s 2.mp3',
        'Ring Toss Thrill.mp3',
        'My Ring-Flinging Game.mp3'
    ];
    
    // Randomly select a track
    const randomTrack = musicTracks[Math.floor(Math.random() * musicTracks.length)];
    
    // Get the audio element
    backgroundMusic = document.getElementById('background-music');
    
    // Update the source to the randomly selected track
    const sourceElement = backgroundMusic.querySelector('source');
    sourceElement.src = `music/${randomTrack}`;
    
    // Need to reload the audio element after changing source
    backgroundMusic.load();
    
    // Display which track is playing
    console.log(`Now playing: ${randomTrack}`);
    
    // Update the track name display
    document.getElementById('track-name').textContent = randomTrack.replace('.mp3', '');
    
    // Set initial volume
    backgroundMusic.volume = 0.5; // Set initial volume to 50%
    
    // Start playing music by default
    backgroundMusic.play()
        .then(() => {
            isMusicPlaying = true;
            document.getElementById('toggle-music').textContent = '🔊';
        })
        .catch(e => {
            // Handle autoplay restrictions (common in browsers)
            console.log("Autoplay failed:", e);
            // We'll leave the button in default state for user to press
        });
}

function setupBedroomFrame() {
    // Get the selected bedroom image from localStorage
    const bedroomImage = localStorage.getItem('selectedBedroom');
    
    // Set the bedroom image
    const bedroomImageElement = document.getElementById('bedroom-image');
    bedroomImageElement.src = 'images/' + bedroomImage;
    
    // Show the bedroom frame
    document.getElementById('bedroom-frame').style.display = 'block';
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
    
    // Apply character-specific background
    const selectedBackground = localStorage.getItem('selectedBackground') || 'beach'; // Default to beach if none selected
    const bgSettings = characterBackgrounds[selectedBackground];
    
    // Make scene background transparent instead of using the color
    scene.background = null; // Set to null for transparency
    
    // Either remove fog completely or make it very subtle and transparent
    // scene.fog = new THREE.FogExp2(bgSettings.fogColor, bgSettings.fogDensity);
    
    // Create camera with a more direct view of the game area
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.2, 2000);
    
    // Position the camera to face the game more directly, but lower down
    camera.position.set(100, -20, 50); // Lower Y position for a better view
    camera.lookAt(0, -35, 0); // Adjust lookAt point to match lower position
    
    // Create renderer with alpha transparency enabled
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true // Enable transparency
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.setClearColor(0x000000, 0); // Set clear color with 0 alpha (fully transparent)
    
    // Append to game viewport instead of directly to body
    const gameViewport = document.getElementById('game-viewport');
    gameViewport.appendChild(renderer.domElement);
    
    // Create orbit controls with limits and set target to match camera lookAt
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, -30, 0); // Set the orbit target to match the lookAt point
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 20;
    controls.maxDistance = 100;
    controls.maxPolarAngle = Math.PI / 2;
    
    // Create lighting
    // Add hemisphere light (sky + ground)
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7);
    scene.add(hemisphereLight);
    
    // Add directional light with shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(30, 100, 30);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 200;
    directionalLight.shadow.mapSize.width = 2048; // Higher resolution shadows
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    // Add a subtle ambient light for better visibility of transparent objects
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);
    
    // Add a point light inside the tank for a glowing effect
    const tankLight = new THREE.PointLight(0x88ccff, 0.7, 50);
    tankLight.position.set(0, -15, 0);
    scene.add(tankLight);
    
    // Set up FPS display
    fpsElement = document.getElementById('fps');
    
    // Set up score display
    scoreElement = document.createElement('div');
    scoreElement.id = 'score';
    scoreElement.style.position = 'absolute';
    scoreElement.style.top = '10px';
    scoreElement.style.left = '10px';
    scoreElement.style.background = 'rgba(0, 0, 0, 0.5)';
    scoreElement.style.color = 'white';
    scoreElement.style.padding = '5px';
    scoreElement.style.borderRadius = '5px';
    scoreElement.style.fontFamily = 'Arial, sans-serif';
    scoreElement.style.fontSize = '16px';
    scoreElement.textContent = 'Score: 0';
    document.body.appendChild(scoreElement);
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    // Get the game viewport dimensions for proper rendering
    const gameViewport = document.getElementById('game-viewport');
    const viewportRect = gameViewport.getBoundingClientRect();
    
    // Update camera
    camera.aspect = viewportRect.width / viewportRect.height;
    camera.updateProjectionMatrix();
    
    // Update renderer size based on the actual game viewport dimensions
    renderer.setSize(viewportRect.width, viewportRect.height);
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
    // Get the selected background theme
    const selectedBackground = localStorage.getItem('selectedBackground') || 'beach';
    const bgSettings = characterBackgrounds[selectedBackground];
    
    // Create visual floor with character-specific color
    const floorGeometry = new THREE.BoxGeometry(FLOOR_SIZE, 100, FLOOR_SIZE);
    const floorMaterial = new THREE.MeshPhongMaterial({ 
        color: bgSettings.floorColor,
        transparent: true,
        opacity: 0.6,       // Make floor partially transparent
        shininess: 60,      // Add some shininess for a glossy effect
        specular: 0x333333  // Slight specular highlight
    });
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.position.set(0, FLOOR_HEIGHT - 50, 0);
   // scene.add(floorMesh);
    
    // Remove environment-specific decorations to clean up the scene
    /*
    // Add environment-specific decorations based on character theme
    if (selectedBackground === 'beach') {
        // Add some palm trees or beach decorations
        addBeachDecorations();
    } else if (selectedBackground === 'space') {
        // Add stars or space decorations
        addSpaceDecorations();
    } else if (selectedBackground === 'forest') {
        // Add trees or forest decorations
        addForestDecorations();
    } else if (selectedBackground === 'volcano') {
        // Add lava or volcano decorations
        addVolcanoDecorations();
    }
    */
    
    // Create physics floor
    const floorShape = new Ammo.btBoxShape(new Ammo.btVector3(FLOOR_SIZE / 2, 50, FLOOR_SIZE / 2));
    const floorTransform = new Ammo.btTransform();
    floorTransform.setIdentity();
    floorTransform.setOrigin(new Ammo.btVector3(0, FLOOR_HEIGHT - 50, 0));
    
    const mass = 0; // static object
    createRigidBody(Ammo, floorMesh, floorShape, mass, floorTransform);
}

// Add these helper functions for character-specific decorations
function addBeachDecorations() {
    // Add some palm trees or beach decorations
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 40;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        // Create a simple palm tree
        const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.8, 10, 8);
        const trunkMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.set(x, FLOOR_HEIGHT - 45, z);
        scene.add(trunk);
        
        // Create palm leaves
        const leavesGeometry = new THREE.SphereGeometry(3, 4, 4);
        leavesGeometry.scale(1, 0.3, 1);
        const leavesMaterial = new THREE.MeshPhongMaterial({ color: 0x00AA00 });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.set(x, FLOOR_HEIGHT - 40, z);
        scene.add(leaves);
    }
}

function addSpaceDecorations() {
    // Add stars in the background
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
        color: 0xFFFFFF,
        size: 0.5,
        sizeAttenuation: false
    });
    
    const starsVertices = [];
    for (let i = 0; i < 1000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starsVertices.push(x, y, z);
    }
    
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const starField = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starField);
    
    // Add a distant planet
    const planetGeometry = new THREE.SphereGeometry(15, 32, 32);
    const planetMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x996633,
        emissive: 0x331100,
        shininess: 0
    });
    const planet = new THREE.Mesh(planetGeometry, planetMaterial);
    planet.position.set(-80, 40, -100);
    scene.add(planet);
}

function addForestDecorations() {
    // Add trees around the play area
    for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        const radius = 45;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        // Tree trunk
        const trunkGeometry = new THREE.CylinderGeometry(1, 1.5, 12, 8);
        const trunkMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.set(x, FLOOR_HEIGHT - 44, z);
        scene.add(trunk);
        
        // Tree foliage (conical for forest trees)
        const foliageGeometry = new THREE.ConeGeometry(5, 15, 8);
        const foliageMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x228B22,
            shininess: 0
        });
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.set(x, FLOOR_HEIGHT - 35, z);
        scene.add(foliage);
    }
}

function addVolcanoDecorations() {
    // Add volcanic rocks
    for (let i = 0; i < 15; i++) {
        const angle = (i / 15) * Math.PI * 2;
        const radius = 42;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        // Create a volcanic rock
        const rockGeometry = new THREE.DodecahedronGeometry(Math.random() * 3 + 2);
        const rockMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x333333,
            emissive: 0x330000,
            shininess: 0
        });
        const rock = new THREE.Mesh(rockGeometry, rockMaterial);
        rock.position.set(x, FLOOR_HEIGHT - 49 + Math.random() * 2, z);
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        scene.add(rock);
        
        // Create a lava flow or glow
        if (i % 3 === 0) {
            const lavaGeometry = new THREE.CircleGeometry(Math.random() * 2 + 1, 16);
            const lavaMaterial = new THREE.MeshPhongMaterial({ 
                color: 0xFF4500,
                emissive: 0xFF2000,
                emissiveIntensity: 0.8,
                shininess: 80
            });
            const lava = new THREE.Mesh(lavaGeometry, lavaMaterial);
            lava.rotation.x = -Math.PI / 2; // Lay flat
            lava.position.set(x + Math.random() * 4 - 2, FLOOR_HEIGHT - 49.5, z + Math.random() * 4 - 2);
            scene.add(lava);
        }
    }
    
    // Add a distant volcano in the background
    const volcanoGeometry = new THREE.ConeGeometry(20, 40, 16);
    const volcanoMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x8B0000,
        shininess: 0
    });
    const volcano = new THREE.Mesh(volcanoGeometry, volcanoMaterial);
    volcano.position.set(-80, FLOOR_HEIGHT - 20, -80);
    scene.add(volcano);
}

function createSlope(Ammo) {
    // Get the tank's base position and dimensions
    const tankHeight = 40;
    const tankWidth = 18;
    const tankDepth = 2.8;
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
        opacity: 0.4,     // Semi-transparent
        shininess: 90,    // Highly glossy
        specular: 0xffffff // Strong specular highlight
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
    const tankDepth = 2.8;  // Reduced by ~30% from original 4 units
    const tankWidth = 18;  // Slightly narrower for toy-like proportions
    const tankHeight = 40;  // Keep the same height
    const panelThickness = 0.05;
    
    // Create materials
    
    // Clear glass material for main tank body
    const tankClearMaterial = new THREE.MeshPhongMaterial({
        color: 0xe0f4ff, // Extremely light blue tint
        transparent: true, 
        opacity: 0.2,     // More transparent
        shininess: 100,   // More glossy/glass look
        specular: 0xffffff, // Stronger specular highlight for glass
        reflectivity: 1.0  // Maximum reflectivity
    });
    
    // Red plastic material for top and bottom
    const tankRedMaterial = new THREE.MeshPhongMaterial({
        color: 0xdd1111, // Bright red
        transparent: true,
        opacity: 0.8,     // Slightly transparent
        shininess: 80,
        specular: 0xffffff // Stronger specular highlight
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
    const tankDepth = 2.8;
    const tankHeight = 40;
    const tankY = FLOOR_HEIGHT + tankHeight/2 + 1; // Same as in createTank
    
    // Define matching colors for pegs to match torus colors
    const pegColors = [
        0xff3333, // Red
        0x33ff33, // Green
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
    
    // Create 2 pegs with staggered heights
    for (let i = 0; i < 2; i++) {
        // Position the pegs - move the green peg (i=1) 2 units to the left
        let x = 0;
        if (i === 0) {
            x = -5; // Red peg position unchanged
        } else {
            x = 1; // Green peg moved from 5 to 3 (2 units left)
        }
        
        // Stagger the heights - one higher, one lower
        const heightOffset = (i === 0) ? -4 : 2; // First peg lower, second peg higher
        
        // Create material for this peg with matching color
        const pegMaterial = new THREE.MeshPhongMaterial({ 
            color: pegColors[i],
        
            shininess: 90,
            specular: 0x666666,
            side: THREE.DoubleSide, // Render both sides of geometry
            depthWrite: false, // Improve transparency rendering
            polygonOffset: true,
            polygonOffsetFactor: -4
        });
        
        // Create parent group
        const pegGroup = new THREE.Group();
        pegGroup.position.set(x, tankY + heightOffset, 0);  // Position with height offset
        scene.add(pegGroup);
        pegs.push(pegGroup);
        
        // Create pin part - adjust height based on staggering
        const pinLength = 2.5 + (i === 0 ? -0.5 : 1); // First peg shorter, second peg longer
        const customPinGeometry = new THREE.CylinderGeometry(0.15, 0.15, pinLength, 8);
        
        const pinMesh = new THREE.Mesh(customPinGeometry, pegMaterial);
        pinMesh.position.set(0, 2.05, 0);
        pegGroup.add(pinMesh);
        
        // Add rounded cap at the top of each pin
        const pinCapMesh = new THREE.Mesh(pinCapGeometry, pegMaterial);
        pinCapMesh.position.set(0, 2.05 + pinLength/2, 0); // Position at top of pin
        pegGroup.add(pinCapMesh);
        
        // Create base part - flat disc
        const baseGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.2, 16); // Smaller, flatter base
        const baseMesh = new THREE.Mesh(baseGeometry, pegMaterial);
        baseMesh.position.set(0, 0.3, 0); // Lower base 
        pegGroup.add(baseMesh);
        
        // Create a custom compound shape for this particular peg
    const compoundShape = new Ammo.btCompoundShape();
    
        // Add pin shape - vertical cylinder with adjusted height
        const pinShape = new Ammo.btCylinderShape(new Ammo.btVector3(0.15, pinLength/2, 0.15)); // Half-height
    const pinTransform = new Ammo.btTransform();
    pinTransform.setIdentity();
    pinTransform.setOrigin(new Ammo.btVector3(0, 2.05, 0));
    compoundShape.addChildShape(pinTransform, pinShape);
    
    // Add pin cap - sphere at top
    const capShape = new Ammo.btSphereShape(0.15);
    const capTransform = new Ammo.btTransform();
    capTransform.setIdentity();
        capTransform.setOrigin(new Ammo.btVector3(0, 2.05 + pinLength/2, 0));
    compoundShape.addChildShape(capTransform, capShape);
    
    // Add base shape - flatter cylinder
    const baseShape = new Ammo.btCylinderShape(new Ammo.btVector3(0.8, 0.1, 0.8)); // Smaller, flatter base
    const baseTransform = new Ammo.btTransform();
    baseTransform.setIdentity();
    baseTransform.setOrigin(new Ammo.btVector3(0, 0.3, 0));
    compoundShape.addChildShape(baseTransform, baseShape);
    
        // Create rigid body
        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(x, tankY + heightOffset, 0));
        
        const mass = 0; // static object
        createRigidBody(Ammo, pegGroup, compoundShape, mass, transform);
    }
}

function createToruses(Ammo, count) {
    // Get the tank's vertical position
    const tankDepth = 2.8;
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
    const tankDepth = 2.8;
    const tankHeight = 40;
    const tankY = FLOOR_HEIGHT + tankHeight/2 + 1; // Same as in createTank
    
    // Define bubble parameters
    const bubbleCount = 16; // Increased for more consistent stream
    // Use consistent small sizes for water-like bubbles
    const bubbleSizes = [
        0.25, 0.25, 0.25, 0.25,   // Very small bubbles
        0.3, 0.3, 0.3, 0.3,       // Small bubbles
        0.35, 0.35, 0.35, 0.35,   // Medium bubbles
        0.4, 0.4, 0.4, 0.4        // Slightly larger bubbles
    ];
    
    // Use mostly water-blue colors with occasional white for realism
    const bubbleColors = [
        0x88ccff, // Light blue
        0x66bbff, // Medium blue
        0x77ccff, // Blue
        0xaaddff, // Pale blue
        0x99ccff, // Sky blue
        0xbbddff, // Very light blue
        0xffffff, // White (for occasional variation)
        0xaaddff, // Pale blue
        0x88ccff, // Light blue
        0x66bbff, // Medium blue
        0x77ccff, // Blue
        0xaaddff, // Pale blue
        0x99ccff, // Sky blue
        0xbbddff, // Very light blue
        0xffffff, // White (for occasional variation)
        0xaaddff  // Pale blue
    ];
    const bubbles = [];
    
    // Create multiple bubbles for water stream
    for (let i = 0; i < bubbleCount; i++) {
        const size = bubbleSizes[i % bubbleSizes.length];
        const color = bubbleColors[i % bubbleColors.length];
        
        // Create bubble visual (transparent sphere with color)
        const bubbleGeometry = new THREE.SphereGeometry(size, 16, 16);
        const bubbleMaterial = new THREE.MeshPhongMaterial({
            color: color,

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
        
        // All bubbles have identical physical properties
        const mass = 0.01;            // Low consistent mass
        const linearDamping = 0.2;    // Low damping for consistent flow
        const angularDamping = 0.2;
        
        // Create rigid body
        const body = createRigidBody(Ammo, bubbleMesh, bubbleShape, mass, transform, linearDamping, angularDamping);
        
        // Same physics properties for consistent behavior
        body.setRestitution(0.7);
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

// Completely rewrite the bubble spawning function for consistent water-like stream
function spawnBubblesInFlow() {
    // If flow is not active, stop spawning
    if (!bubbleFlowActive) return;
    
    const currentTime = Date.now();
    
    // Check if we've exceeded the maximum hold time
    if (isPumpButtonHeld && currentTime - pumpStartTime > MAX_PUMP_HOLD_TIME) {
        // Stop the flow if max hold time is reached
        bubbleFlowActive = false;
        return;
    }
    
    // If button is no longer held
    if (!isPumpButtonHeld && currentTime - pumpStartTime > 100) {
        // Stop the flow when button is released
        bubbleFlowActive = false;
        return;
    }
    
    // Spawn bubbles on regular intervals
    if (currentTime - lastBubbleTime > BUBBLE_SPAWN_INTERVAL) {
        lastBubbleTime = currentTime;
        
        // Get the tank dimensions
        const tankWidth = 18;
        const tankDepth = 2.8;
        const tankHeight = 40;
        const tankY = FLOOR_HEIGHT + tankHeight/2 + 1;
        
        // Use the position from the sliders with minimal variance
        const releaseX = bubbleSpawnPosition.x;
        const releaseY = tankY + bubbleSpawnPosition.y;
        // Get the Z value directly from the slider to ensure it's current
        const zSliderValue = parseFloat(document.getElementById('bubble-z').value);
        const releaseZ = zSliderValue; // Use the direct slider value instead of bubbleSpawnPosition.z
        
        // Log spawn coordinates for debugging
        console.log("Spawning bubble at:", { x: releaseX, y: releaseY, z: releaseZ });
        
        // Try to find an inactive bubble
        let spawnedBubble = false;
        for (let i = 0; i < activeBubbles.length; i++) {
            const bubble = activeBubbles[i];
            
            if (!bubble.userData.isActive) {
                const size = bubble.userData.size;
                
                // Very minimal position variance - creates a tight stream
                // Will still look natural due to physics interactions but follow a consistent path
                const variance = 0.03; // Very small variance
                const x = releaseX + (Math.random() * variance * 2 - variance);
                const y = releaseY + (Math.random() * variance * 2 - variance);
                const z = releaseZ + (Math.random() * variance * 2 - variance);
                
                // Position bubble
                bubble.position.set(x, y, z);
                
                // Update physics body position
                const body = bubble.userData.physicsBody;
                const worldTransform = body.getWorldTransform();
                worldTransform.setOrigin(new Ammo.btVector3(x, y, z));
                
                // Calculate a water-like trajectory - a gentle arc toward the center-top
                // Use a fixed destination point for consistency
                const targetX = 0; // Center of tank
                const targetY = tankY + tankHeight/3; // About 1/3 up the tank
                const targetZ = 0; // Center of tank
                
                // Direction vector toward target (the water arc)
                const dirX = targetX - releaseX;
                const dirY = targetY - releaseY;
                const dirZ = targetZ - releaseZ;
                
                // Normalize for consistent force
                const length = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
                const normX = dirX / length;
                const normY = dirY / length;
                const normZ = dirZ / length;
                
                // Calculate x-component based on angle (convert from degrees to radians)
                const angleRadians = (bubbleAngle * Math.PI) / 180;
                
                // Angle affects the X and Y components
                // At 90 degrees, all force is upward (Y)
                // At angles < 90, force has a negative X component (left)
                // At angles > 90, force has a positive X component (right)
                const angleX = Math.cos((90 - bubbleAngle) * Math.PI / 180);
                const angleY = Math.sin(angleRadians);
                
                // Activate bubble physics
                body.activate();
                
                // Apply consistent force modified by power slider and angle
                const baseForce = 8; // Constant base force
                const powerFactor = bubblePower / 10; // Power slider effect
                
                // Apply force with angle adjustment
                body.applyCentralForce(new Ammo.btVector3(
                    baseForce * angleX * powerFactor, // X force based on angle
                    baseForce * angleY * 2.2 * powerFactor, // Y force (upward) adjusted for angle
                    baseForce * normZ * powerFactor // Z stays the same
                ));
                
                // Mark as active
                bubble.userData.isActive = true;
                
                // Set bubble lifetime
                bubbleLifetimes[i] = currentTime + BUBBLE_LIFETIME;
                
                // Make bubble visible immediately with a slight fade-in
                bubble.material.opacity = 0;
                const startTime = Date.now();
                const fadeIn = function() {
                    const elapsed = Date.now() - startTime;
                    if (elapsed < 100) { // Faster fade-in (100ms)
                        bubble.material.opacity = Math.min(0.6, elapsed / 100 * 0.6);
                        requestAnimationFrame(fadeIn);
                    } else {
                        bubble.material.opacity = 0.6;
                    }
                };
                fadeIn();
                
                spawnedBubble = true;
                break;
            }
        }
    }
    
    // Continue the flow if active
    if (bubbleFlowActive) {
        requestAnimationFrame(spawnBubblesInFlow);
    }
}

// Also update the bubble-ring collision function for consistency
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
                
                // Get the ring mesh to check if it's on a peg
                const ringIndex = rigidBodies.findIndex(r => r.userData.physicsBody === ringBody);
                const ringMesh = ringIndex >= 0 ? rigidBodies[ringIndex] : null;
                
                // Get the bubble to determine its size for scaling force
                const bubbleIndex = activeBubbles.findIndex(b => b.userData.physicsBody === bubbleBody);
                const bubbleMesh = bubbleIndex >= 0 ? activeBubbles[bubbleIndex] : null;
                
                if (bubbleIndex >= 0 && bubbleMesh) {
                    // Check if the ring is on a peg
                    const isOnPeg = ringMesh && ringMesh.userData.isOnPeg;
                    
                    // Log when a bubble hits a ring on a peg
                    if (isOnPeg) {
                        console.log(`Bubble hit Ring #${ringIndex} which is on a peg! Applying reduced force.`);
                    }
                    
                    const bubbleSize = bubbleMesh.userData.size;
                    
                    // For water-like impact, use consistent forces with less randomness
                    const sizeMultiplier = bubbleSize * 3.0; // Scale impact by size
                    const powerFactor = bubblePower / 10; // Convert slider value to a multiplier (10 is baseline)
                    
                    // Check if the ring is on a peg to apply reduced force
                    const bubbleResistance = (ringMesh && ringMesh.userData.isOnPeg) ? 
                        (ringMesh.userData.bubbleResistance || 0.3) : 1.0;
                    
                    // Apply a more consistent upward force to the ring
                    ringBody.activate();
                    
                    // Less horizontal randomness, more consistent upward force
                    ringBody.applyCentralForce(new Ammo.btVector3(
                        (Math.random() * 0.6 - 0.3) * 80 * sizeMultiplier * powerFactor * bubbleResistance,  // Reduced horizontal randomness
                        (90 + Math.random() * 30) * sizeMultiplier * powerFactor * bubbleResistance,         // More consistent upward force
                        (Math.random() * 0.6 - 0.3) * 80 * sizeMultiplier * powerFactor * bubbleResistance   // Reduced horizontal randomness
                    ));
                    
                    // Reduced spin for more realistic water physics
                    ringBody.applyTorqueImpulse(new Ammo.btVector3(
                        (Math.random() - 0.5) * 3 * powerFactor * bubbleResistance,
                        (Math.random() - 0.5) * 3 * powerFactor * bubbleResistance,
                        (Math.random() - 0.5) * 3 * powerFactor * bubbleResistance
                    ));
                    
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
    // Start a bubble flow
    bubbleFlowActive = true;
    lastBubbleTime = 0; // Reset to start immediately
    
    // Start spawning bubbles
    spawnBubblesInFlow();
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
    // Controls toggle button
    document.getElementById('toggle-controls').addEventListener('click', function() {
        const controlsElement = document.getElementById('force-controls');
        if (controlsElement.style.display === 'none' || controlsElement.style.display === '') {
            controlsElement.style.display = 'block';
            this.style.backgroundColor = 'rgba(76, 158, 217, 0.7)'; // Highlight button when controls are shown
        } else {
            controlsElement.style.display = 'none';
            this.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'; // Return to original color
        }
    });

    // Music toggle button
    document.getElementById('toggle-music').addEventListener('click', function() {
        if (isMusicPlaying) {
            // Pause music
            backgroundMusic.pause();
            this.textContent = '🔇';
            isMusicPlaying = false;
        } else {
            // Play music
            backgroundMusic.play().catch(e => console.log("Audio play failed:", e));
            this.textContent = '🔊';
            isMusicPlaying = true;
        }
    });
    
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
    
    // Fix for the bubble-z slider
    document.getElementById('bubble-z').addEventListener('input', function() {
        // Parse the slider value as a float
        const value = parseFloat(this.value);
        
        // Update the display text
        document.getElementById('bubble-z-value').textContent = value;
        
        // Update the global bubble spawn position
        bubbleSpawnPosition.z = value;
        
        // Log the updated position for debugging
        console.log("Bubble Z position updated to:", value);
    });
    
    // Add bubble power slider listener
    document.getElementById('bubble-power').addEventListener('input', function() {
        const value = parseInt(this.value);
        document.getElementById('bubble-power-value').textContent = value;
        bubblePower = value;
    });
    
    // Add bubble angle slider listener
    document.getElementById('bubble-angle').addEventListener('input', function() {
        const value = parseInt(this.value);
        document.getElementById('bubble-angle-value').textContent = value + '°';
        bubbleAngle = value;
    });
    
    // Add pump bubbles button with mousedown/mouseup events for hold behavior
    const pumpButton = document.getElementById('pump-bubbles');
    
    // Mouse down starts pumping
    pumpButton.addEventListener('mousedown', function() {
        isPumpButtonHeld = true;
        pumpStartTime = Date.now();
        bubbleFlowActive = true;
        spawnBubblesInFlow();
    });
    
    // Mouse up stops pumping
    pumpButton.addEventListener('mouseup', function() {
        isPumpButtonHeld = false;
    });
    
    // Mouse leaving the button also stops pumping (in case dragged out)
    pumpButton.addEventListener('mouseleave', function() {
        isPumpButtonHeld = false;
    });
    
    // Touch events for mobile support
    pumpButton.addEventListener('touchstart', function(e) {
        e.preventDefault(); // Prevent default touch behavior
        isPumpButtonHeld = true;
        pumpStartTime = Date.now();
        bubbleFlowActive = true;
        spawnBubblesInFlow();
    });
    
    pumpButton.addEventListener('touchend', function() {
        isPumpButtonHeld = false;
    });
    
    // Add floating pump button functionality
    const floatingPumpButton = document.getElementById('floating-pump-button');
    
    // Mouse down starts pumping
    floatingPumpButton.addEventListener('mousedown', function() {
        isPumpButtonHeld = true;
        pumpStartTime = Date.now();
        bubbleFlowActive = true;
        spawnBubblesInFlow();
        
        // Add visual feedback
        this.style.transform = 'scale(0.95)';
    });
    
    // Mouse up stops pumping
    floatingPumpButton.addEventListener('mouseup', function() {
        isPumpButtonHeld = false;
        this.style.transform = '';
    });
    
    // Mouse leaving the button also stops pumping
    floatingPumpButton.addEventListener('mouseleave', function() {
        isPumpButtonHeld = false;
        this.style.transform = '';
    });
    
    // Touch events for mobile support
    floatingPumpButton.addEventListener('touchstart', function(e) {
        e.preventDefault(); // Prevent default touch behavior
        isPumpButtonHeld = true;
        pumpStartTime = Date.now();
        bubbleFlowActive = true;
        spawnBubblesInFlow();
        
        // Add visual feedback
        this.style.transform = 'scale(0.95)';
    });
    
    floatingPumpButton.addEventListener('touchend', function() {
        isPumpButtonHeld = false;
        this.style.transform = '';
    });
    
    // Add keyboard shortcuts
    window.addEventListener('keydown', function(event) {
        if (event.key === 's' || event.key === 'S') {
            dropRingsOnSlope();
        } else if (event.key === 'b' || event.key === 'B') {
            // For keyboard, use the traditional approach (timer-based burst)
            pumpStartTime = Date.now();
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
    
    // Check if rings are on pegs periodically
    const currentTime = Date.now();
    if (!window.lastPegCheckTime || currentTime - window.lastPegCheckTime > PEG_STABILITY_CHECK_INTERVAL) {
        window.lastPegCheckTime = currentTime;
        checkRingsOnPegs();
    }
    
    // Check for bubble lifetimes
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

// Add a new function to check if rings are on pegs and stabilize them
function checkRingsOnPegs() {
    // Skip if no pegs or rings
    if (!pegs || pegs.length === 0 || !rigidBodies || rigidBodies.length === 0) return;
    
    console.log("Checking for rings on pegs...");
    
    // Check each ring (skip the first rigidBody which is typically the ground)
    for (let i = 1; i < rigidBodies.length; i++) {
        const ring = rigidBodies[i];
        
        // Skip non-torus objects and objects that are already marked as on a peg
        if (!ring.geometry || !ring.geometry.type || ring.geometry.type !== 'TorusGeometry') continue;
        
        // For each peg, check if the ring is positioned on it
        for (let j = 0; j < pegs.length; j++) {
            const peg = pegs[j];
            const pegPos = peg.position;
            const ringPos = ring.position;
            
            // Check if ring is horizontally aligned with a peg
            const horizontalDistance = Math.sqrt(
                Math.pow(ringPos.x - pegPos.x, 2) + 
                Math.pow(ringPos.z - pegPos.z, 2)
            );
            
            // If ring is centered over a peg with small tolerance
            if (horizontalDistance < PEG_DETECTION_DISTANCE) {
                console.log(`Ring #${i} is horizontally aligned with Peg #${j} (distance: ${horizontalDistance.toFixed(2)})`);
                
                // Check vertical position relative to peg top
                // This varies depending on which peg and ring height, so we use approximate values
                const pegHeight = (j === 0) ? 2.0 : 3.5; // Approximate heights from createPegs function
                const pegTop = pegPos.y + pegHeight / 2;
                
                // Get the torus tube radius and major radius for better height detection
                const tubeRadius = ring.geometry.parameters.tube || 0.3; // Default if not found
                const majorRadius = ring.geometry.parameters.radius || 1.0; // Default if not found
                
                // Log the ring's position relative to the peg
                console.log(`Ring position Y: ${ringPos.y.toFixed(2)}, Peg top Y: ${pegTop.toFixed(2)}`);
                
                // MUCH more forgiving height check:
                // 1. Allow rings to be positioned quite a bit below the peg (down to pegTop - 2 units)
                // 2. Keep the upper limit for stacking
                const lowerLimit = pegTop - 2.0; // Extremely forgiving - allow rings to be well below the peg
                const upperLimit = pegTop + 10; // Keep the existing upper limit for stacked rings
                
                // Check if ring is within the extremely forgiving height range
                if (ringPos.y >= lowerLimit && ringPos.y <= upperLimit) {
                    console.log(`Ring #${i} is at the correct height for Peg #${j}!`);
                    
                    // Ring is on peg! Stabilize it
                    
                    // If already stabilized, skip
                    if (ring.userData.isOnPeg) {
                        console.log(`Ring #${i} is already stabilized on Peg #${j}`);
                        continue;
                    }
                    
                    // Mark as on peg
                    ring.userData.isOnPeg = true;
                    console.log(`SUCCESS: Ring #${i} is now stabilized on Peg #${j}!`);
                    
                    // Get physics body
                    const body = ring.userData.physicsBody;
                    if (body) {
                        // Make it more stable on the peg
                        
                        // Increase friction significantly
                        body.setFriction(1.0); // Max friction (default was likely 0.5)
                        
                        // Reduce bounciness
                        body.setRestitution(0.0); // No bounce
                        
                        // Increase angular damping to limit rotation
                        body.setDamping(0.8, 0.9); // High linear and angular damping
                        
                        // Apply a small downward force to keep it seated
                        body.applyCentralForce(new Ammo.btVector3(0, -2.0, 0));
                        
                        // Make it less affected by bubble hits
                        ring.userData.bubbleResistance = 0.3; // Will only apply 30% of normal bubble force
                        
                        // Optional: Add visual feedback (subtle glow effect or color change)
                        if (ring.material) {
                            // Store original color
                            if (!ring.userData.originalColor) {
                                ring.userData.originalColor = ring.material.color.clone();
                            }
                            
                            // Add subtle highlight
                            ring.material.emissive = new THREE.Color(0x222222);
                            ring.material.needsUpdate = true;
                        }
                    }
                } else {
                    console.log(`Ring #${i} is aligned with Peg #${j} but NOT at the correct height. Valid range: ${lowerLimit.toFixed(2)} to ${upperLimit.toFixed(2)}`);
                    
                    // If ring was previously on peg but now isn't, reset properties
                    if (ring.userData.isOnPeg) {
                        console.log(`Ring #${i} was knocked off Peg #${j}! Resetting properties.`);
                        // Remove on-peg status
                        ring.userData.isOnPeg = false;
                        
                        // Get physics body
                        const body = ring.userData.physicsBody;
                        if (body) {
                            // Reset physics properties
                            body.setFriction(0.5); // Normal friction
                            body.setRestitution(0.2); // Normal bounce
                            body.setDamping(0.3, 0.3); // Normal damping
                            
                            // Remove bubble resistance
                            ring.userData.bubbleResistance = 1.0; // Normal bubble force impact
                        }
                        
                        // Reset visual feedback
                        if (ring.material && ring.userData.originalColor) {
                            ring.material.emissive = new THREE.Color(0x000000);
                            ring.material.needsUpdate = true;
                        }
                    }
                }
            }
        }
    }
    
    // Count rings on pegs
    const ringsOnPegs = rigidBodies.filter(obj => obj.userData && obj.userData.isOnPeg).length;
    console.log(`Total rings currently on pegs: ${ringsOnPegs}`);
    
    // Update the score display
    updateScore();
}

function updateScore() {
    // Count rings on pegs
    const ringsOnPegs = rigidBodies.filter(obj => obj.userData && obj.userData.isOnPeg).length;
    
    // Update the score
    score = ringsOnPegs;
    
    // Update high score if needed
    if (score > highScore) {
        highScore = score;
        // Add a flash effect to the score display for new high scores
        scoreElement.style.backgroundColor = 'rgba(0, 128, 0, 0.7)'; // Green background
        setTimeout(() => {
            scoreElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'; // Back to normal
        }, 500);
    }
    
    // Update the score display
    scoreElement.textContent = `Score: ${score} | High: ${highScore}`;
    
    // Add celebration for high achievements
    if (score >= 3 && score === highScore) {
        showCelebration();
    }
}

function showCelebration() {
    // Create a celebration message
    const celebration = document.createElement('div');
    celebration.id = 'celebration';
    celebration.style.position = 'absolute';
    celebration.style.top = '50%';
    celebration.style.left = '50%';
    celebration.style.transform = 'translate(-50%, -50%)';
    celebration.style.fontSize = '32px';
    celebration.style.fontWeight = 'bold';
    celebration.style.color = '#ffcc00';
    celebration.style.textShadow = '0 0 10px rgba(255, 204, 0, 0.7)';
    celebration.style.opacity = '0';
    celebration.style.transition = 'opacity 0.5s';
    celebration.textContent = 'PERFECT SCORE!';
    document.body.appendChild(celebration);
    
    // Animate the celebration
    setTimeout(() => {
        celebration.style.opacity = '1';
    }, 100);
    
    setTimeout(() => {
        celebration.style.opacity = '0';
    }, 3000);
    
    setTimeout(() => {
        document.body.removeChild(celebration);
    }, 3500);
}

function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = clock.getDelta();
    updatePhysics(deltaTime);
    renderer.render(scene, camera);
    controls.update();
} 