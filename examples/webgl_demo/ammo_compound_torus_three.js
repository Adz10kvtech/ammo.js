// Global variables
let physicsWorld;
let scene, camera, renderer, controls;
let clock = new THREE.Clock();
let rigidBodies = [];
let tmpTrans = null;
let fpsElement;
let backgroundMusic;
let isMusicPlaying = false;

// Sound variables
let soundEnabled = true; // Default sound to enabled
let bubblePopSound;
let bubbleMissSound;
let coinGetSound;
let bubblesPoppingSound;
let victoryFanfareSound;

// Radio variables
let radioPlayer;
let isRadioPlaying = false;
let currentRadioStation = 'none';
let hasInternetConnection = true;
let isCheckingInternetConnection = false;
let preferRadio = true; // User preference for radio vs local music

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
const BUBBLE_LIFETIME = 3500; // All bubbles last 2.5 seconds
let bubbleImmunityTimes = []; // Add this new array to track immunity time for each bubble
const BUBBLE_IMMUNITY_PERIOD = 200; // Immunity period in milliseconds after spawning

// Add these global variables near the top with other globals
let lastBubbleTime = 0;
let bubbleFlowActive = false;
let bubbleSpawnPosition = { x: 5.5, y: -17, z: 0 }; // Lowered the default spawn position on Y axis
let bubblePower = 10; // Default bubble power (will be controlled by slider)
let bubbleAngle = 90; // Default angle is straight up (90 degrees)
let isPumpButtonHeld = false; // Track if pump button is being held
const MAX_PUMP_HOLD_TIME = 5000; // Maximum pump hold time in milliseconds (5 seconds)
let pumpStartTime = 0; // When the pump button was pressed
const BUBBLE_SPAWN_INTERVAL = 30; // Spawn bubbles more frequently (33 per second)
const PEG_DETECTION_DISTANCE = 0.5; // Distance to detect if a ring is on a peg
const PEG_STABILITY_CHECK_INTERVAL = 1500; // Check if rings are on pegs every 500ms
let isBubbleSoundPlaying = false; // Track if bubble sound is currently playing

// Add these global variables near the top with the other globals
let score = 0;
let scoreElement;
let highScore = 0;

// Add a bubble containment box variable
let bubbleContainmentBox = null;
const BUBBLE_BOX_POSITION = { x: 1000, y: 1000, z: 1000 }; // Far away from visible scene

// Near the top of the file with other globals
// Add camera shake variables
let isShakingCamera = false;
let cameraShakeOffset = null;
let cameraShakeIntensity = 0.01; // Reduced from 0.3 for much more subtle shake
let cameraShakeTimer = 0; // Add a timer to make shake less constant

// Add these global variables near the other globals
let pegLayout = 'default';
let selectedPeg = null;
let isDraggingPeg = false;
let pegBeingMoved = null;
let originalPegPositions = [];
let pegColors = [
    0xff3333, // Red
    0x33ff33, // Green
    0x3333ff, // Blue
    0xffff33, // Yellow
    0xff33ff, // Magenta
];

// Add these global variables near other score-related variables around line 102-105
const POSITIVE_QUOTES_90S = [
    "Booyah!",
    "That's totally rad!",
    "As if! You're killing it!",
    "Way cool!",
    "You da bomb!",
    "Talk to the hand, haters!",
    "That's the 411!",
    "All that and a bag of chips!",
    "Totally awesome!",
    "You're all that!",
    "Psych! That was amazing!",
    "That's fresh!",
    "Cowabunga, dude!",
    "Word up!",
    "Boo-yah!"
];

const NEGATIVE_QUOTES_90S = [
    "Aw, snap!",
    "Talk to the hand!",
    "Whatever!",
    "That's buggin'!",
    "Harsh!",
    "Don't have a cow, man!",
    "That's weak sauce!",
    "As if!",
    "Dude, that's whack!",
    "That's janky!",
    "Psych! Just kidding!",
    "Not!",
    "Dude, that's so not fly!",
    "Major bummer!",
    "Chill out, it happens!"
];

let quoteElement = null;
let lastDisplayedQuote = "";
let quoteTimeout = null;

// Add this variable near other score-related variables (before updateScore function)
let highScoreElement = null;

// Add a global function to reset rings that can be called from anywhere
window.resetRings = function() {
    console.log("Global resetRings function called");
    if (typeof dropRingsOnSlope === 'function') {
        dropRingsOnSlope();
        if (typeof applyCameraShake === 'function') {
            applyCameraShake(0.5, 500);
        }
        return true;
    } else {
        console.error("dropRingsOnSlope function not available");
        return false;
    }
};

// Also add an inline onclick attribute to the button
document.addEventListener('DOMContentLoaded', function() {
    const resetButton = document.getElementById('reset-rings-button');
    if (resetButton) {
        resetButton.setAttribute('onclick', 'window.resetRings(); this.style.transform="scale(0.9)"; setTimeout(function(){document.getElementById("reset-rings-button").style.transform="scale(1)";}, 200);');
        console.log("Added onclick attribute to reset button");
    }
});

// Wait for DOM to load and Ammo to initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM content loaded, setting up additional event listeners");
    
    // Setup reset button listener that works even before the game fully initializes
    const setupResetButton = function() {
        const resetButton = document.getElementById('reset-rings-button');
        if (resetButton) {
            console.log("Found reset button in DOM, attaching event listener");
            resetButton.addEventListener('click', function() {
                console.log("Reset button clicked from DOM listener");
                if (typeof dropRingsOnSlope === 'function') {
                    dropRingsOnSlope();
                    
                    // Add a little shake effect when resetting
                    if (typeof applyCameraShake === 'function') {
                        applyCameraShake(0.5, 500);
                    }
                    
                    // Visual feedback on button click
                    this.style.transform = "scale(0.9)";
                    setTimeout(() => {
                        this.style.transform = "scale(1)";
                    }, 200);
                } else {
                    console.error("dropRingsOnSlope function not available yet");
                    alert("Game not fully loaded. Please wait and try again.");
                }
            });
            console.log("Reset button event listener attached successfully");
        } else {
            console.log("Reset button not found in DOM, will try again shortly");
            setTimeout(setupResetButton, 1000); // Try again in 1 second
        }
    };
    
    // Start trying to set up the reset button
    setupResetButton();
    
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
    
    // Set up mode selection buttons
    document.getElementById('zen-mode-button').addEventListener('click', function() {
        // Set game mode to Zen
        localStorage.setItem('gameMode', 'zen');
        
        // Get the selected peg layout
        const pegLayoutSelect = document.getElementById('peg-layout');
        const selectedLayout = pegLayoutSelect.value;
        localStorage.setItem('pegLayout', selectedLayout);
        
        startDemo();
    });
    
    document.getElementById('arcade-mode-button').addEventListener('click', function() {
        // Set game mode to Arcade
        localStorage.setItem('gameMode', 'arcade');
        
        // Get the selected peg layout
        const pegLayoutSelect = document.getElementById('peg-layout');
        const selectedLayout = pegLayoutSelect.value;
        localStorage.setItem('pegLayout', selectedLayout);
        
        startDemo();
    });
    
    // Add an event listener for the radio preference checkbox
    document.getElementById('prefer-radio').addEventListener('change', function() {
        preferRadio = this.checked;
        console.log(`Radio preference set to: ${preferRadio ? 'Radio' : 'Local Music'}`);
        
        // If we're not playing anything, start playing based on preference
        if (!isMusicPlaying && !isRadioPlaying) {
            if (preferRadio && hasInternetConnection) {
                tryStartRadio();
            } else {
                startLocalMusic();
            }
        }
    });
});

function startDemo() {
    // Initialize graphics
    initGraphics();
    
    // Set up the bedroom frame
    setupBedroomFrame();
    
    // Initialize the victory message flag
    window.victoryMessageShown = false;
    
    // Initialize Ammo.js
    Ammo().then(function(Ammo) {
        // Set up transformations
        tmpTrans = new Ammo.btTransform();
        
        initPhysics(Ammo);
        
        // Pre-create shared resources
        createSharedResources(Ammo);
        
        // Get the number of rings selected
        const torusCount = parseInt(document.getElementById('torus-count').value);
        totalRings = torusCount; // Store the selected number of rings globally
        
        // Create the objects
        createObjects(Ammo, torusCount);
        
        // Initialize music
        initBackgroundMusic();
        
        // Initialize sound effects
        initSoundEffects();
        
        // Set up event listeners
        setupEventListeners();
        
        // Hide the start screen
        document.getElementById('start-screen').style.display = 'none';
        
        // Controls are hidden by default now
        document.getElementById('force-controls').style.display = 'none';
        
        // Start the intro animation to show the tank is 3D
        startTankIntroAnimation();
        
        // Start animation
        animate();
    });
    
    // Add this line to startDemo function or wherever appropriate
    // startDemo function or initGraphics - add after your other initializations
    initScoreElements();
}

// Initialize background music and radio
function initBackgroundMusic() {
    console.log("Initializing background music system...");
    
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
    console.log("Selected random track:", randomTrack);
    
    // Get the audio elements
    backgroundMusic = document.getElementById('background-music');
    radioPlayer = document.getElementById('radio-player');
    
    // Update the source to the randomly selected track
    const sourceElement = backgroundMusic.querySelector('source');
    sourceElement.src = `music/${randomTrack}`;
    console.log("Set background music source to:", sourceElement.src);
    
    // Need to reload the audio element after changing source
    backgroundMusic.load();
    console.log("Local music loaded");
    
    // Display which track is playing
    console.log(`Local track ready: ${randomTrack}`);
    
    // Update the track name display
    document.getElementById('track-name').textContent = randomTrack.replace('.mp3', '');
    
    // Set initial volume
    backgroundMusic.volume = 0.5; // Set initial volume to 50%
    radioPlayer.volume = 0.7; // Set initial volume to 70%
    console.log("Set audio volumes - Background:", backgroundMusic.volume, "Radio:", radioPlayer.volume);
    
    // Add event listeners for radio player
    console.log("Adding event listeners to radio player");
    radioPlayer.addEventListener('error', handleRadioError);
    radioPlayer.addEventListener('stalled', handleRadioStalled);
    radioPlayer.addEventListener('waiting', handleRadioBuffering);
    radioPlayer.addEventListener('playing', handleRadioPlaying);
    
    // Add debug listener for all events
    const audioEvents = ['abort', 'canplay', 'canplaythrough', 'durationchange', 'emptied', 
                         'ended', 'loadeddata', 'loadedmetadata', 'loadstart', 'pause', 
                         'play', 'progress', 'ratechange', 'seeked', 'seeking', 'suspend', 
                         'timeupdate', 'volumechange'];
    
    audioEvents.forEach(event => {
        radioPlayer.addEventListener(event, () => {
            console.log(`Radio event: ${event}`);
        });
    });
    
    // Check internet connection and start appropriate audio
    console.log("Checking internet connection...");
    checkInternetConnection().then(isConnected => {
        hasInternetConnection = isConnected;
        console.log("Internet connection check result:", isConnected ? "Connected" : "Not connected");
        
        // Update UI to reflect connection status
        updateRadioUI();
        
        const preferRadioElement = document.getElementById('prefer-radio');
        preferRadio = preferRadioElement.checked;
        console.log("Radio preference from UI:", preferRadio);
        
        if (isConnected && preferRadio) {
            console.log("Internet connected and radio preferred - trying radio");
            // Try to start radio if there's internet and user prefers it
            tryStartRadio();
        } else {
            console.log("Starting with local music", isConnected ? "(internet available but not preferred)" : "(no internet)");
            // Fall back to local music
            startLocalMusic();
        }
    });
}

// Function to check internet connection
function checkInternetConnection() {
    console.log("Starting internet connection check...");
    
    if (isCheckingInternetConnection) {
        console.log("Already checking connection, returning cached result:", hasInternetConnection);
        return Promise.resolve(hasInternetConnection);
    }
    
    isCheckingInternetConnection = true;
    console.log("Initiating new connection test");
    
    return new Promise(resolve => {
        // Try to fetch a small resource from a reliable CDN
        const startTime = Date.now();
        console.log("Fetching test resource...");
        
        fetch('https://cdn.jsdelivr.net/npm/jquery@3/dist/jquery.min.js', { 
            mode: 'no-cors',
            cache: 'no-store',
            method: 'HEAD',
            timeout: 5000
        })
        .then(() => {
            const elapsedTime = Date.now() - startTime;
            console.log(`Internet connection available (took ${elapsedTime}ms)`);
            isCheckingInternetConnection = false;
            resolve(true);
        })
        .catch(error => {
            const elapsedTime = Date.now() - startTime;
            console.log(`No internet connection (took ${elapsedTime}ms):`, error);
            console.log("Error name:", error.name);
            console.log("Error message:", error.message);
            isCheckingInternetConnection = false;
            resolve(false);
        });
        
        // Set a timeout in case the fetch hangs
        setTimeout(() => {
            if (isCheckingInternetConnection) {
                console.log('Connection check timed out after 5 seconds');
                isCheckingInternetConnection = false;
                resolve(false);
            }
        }, 5000);
    });
}

// Function to update the radio UI based on connection status
function updateRadioUI() {
    const radioControls = document.getElementById('radio-controls');
    const radioStationSelect = document.getElementById('radio-station');
    const radioStatus = document.getElementById('radio-status');
    const toggleRadioBtn = document.getElementById('toggle-radio');
    
    if (!hasInternetConnection) {
        // Update UI to show offline status
        radioStatus.textContent = 'Offline - Using Local Music';
        radioStationSelect.disabled = true;
        toggleRadioBtn.classList.add('offline');
    } else {
        // Update UI to show online status
        radioStatus.textContent = isRadioPlaying ? 
            document.getElementById('radio-station').options[document.getElementById('radio-station').selectedIndex].text : 
            'Online - Ready';
        radioStationSelect.disabled = false;
        toggleRadioBtn.classList.remove('offline');
    }
    
    // Update radio button appearance based on playback state
    if (isRadioPlaying) {
        toggleRadioBtn.classList.add('active');
    } else {
        toggleRadioBtn.classList.remove('active');
    }
}

// Function to start local music
function startLocalMusic() {
    console.log("Starting local music playback...");
    
    // First ensure radio is off
    if (isRadioPlaying) {
        console.log("Radio was playing - stopping radio first");
        radioPlayer.pause();
        document.getElementById('toggle-radio').classList.remove('active');
        isRadioPlaying = false;
    }
    
    // Play local music
    console.log("Attempting to play local music:", backgroundMusic.querySelector('source').src);
    backgroundMusic.play()
        .then(() => {
            console.log("Local music started successfully!");
            isMusicPlaying = true;
            document.getElementById('toggle-music').textContent = '🔊';
            document.getElementById('radio-status').textContent = 'Using Local Music';
        })
        .catch(e => {
            console.log("Audio play failed:", e);
            console.log("Error details:", e.name, e.message);
            console.log("Audio element state:", {
                paused: backgroundMusic.paused,
                currentSrc: backgroundMusic.currentSrc,
                readyState: backgroundMusic.readyState,
                networkState: backgroundMusic.networkState,
                error: backgroundMusic.error
            });
            document.getElementById('radio-status').textContent = 'Failed to play audio';
            document.getElementById('toggle-music').textContent = '🔇';
            isMusicPlaying = false;
        });
}

// Function to try starting radio
function tryStartRadio() {
    console.log("Attempting to start radio...");
    
    // First check if we have a selected station
    const stationUrl = document.getElementById('radio-station').value;
    console.log("Selected station URL:", stationUrl);
    
    if (stationUrl === 'none') {
        // No station selected, just pick the first one
        document.getElementById('radio-station').selectedIndex = 1; // Select the first station
        console.log("No station selected - Auto-selecting first station");
    }
    
    const selectedStationUrl = document.getElementById('radio-station').value;
    console.log("Final station URL to play:", selectedStationUrl);
    
    // Only proceed if we have internet
    if (hasInternetConnection && selectedStationUrl !== 'none') {
        console.log("Internet available, proceeding with radio");
        
        // First ensure local music is off
        if (isMusicPlaying) {
            console.log("Local music was playing - pausing now");
            backgroundMusic.pause();
            document.getElementById('toggle-music').textContent = '🔇';
            isMusicPlaying = false;
        }
        
        // Update the radio source
        const sourceElement = radioPlayer.querySelector('source');
        sourceElement.src = selectedStationUrl;
        console.log("Updated radio source to:", selectedStationUrl);
        
        // Reload and play
        console.log("Loading radio stream...");
        radioPlayer.load();
        
        console.log("Attempting to play radio stream...");
        radioPlayer.play().then(() => {
            console.log("Radio play promise resolved successfully!");
            document.getElementById('toggle-radio').classList.add('active');
            isRadioPlaying = true;
            
            // Get the station name from the selected option
            const stationSelect = document.getElementById('radio-station');
            const stationName = stationSelect.options[stationSelect.selectedIndex].text;
            document.getElementById('radio-status').textContent = stationName;
            
            console.log(`Now playing radio: ${stationName}`);
        }).catch(e => {
            console.log("Radio play promise rejected:", e);
            console.log("Error details:", e.name, e.message);
            document.getElementById('radio-status').textContent = 'Failed to play radio';
            document.getElementById('toggle-radio').classList.remove('active');
            
            // Fall back to local music
            console.log("Falling back to local music");
            startLocalMusic();
        });
    } else {
        console.log("Cannot play radio: " + 
                   (hasInternetConnection ? "Internet connected" : "No internet") + 
                   ", Station: " + selectedStationUrl);
        // Fall back to local music
        startLocalMusic();
    }
}

// Radio error handling functions
function handleRadioError() {
    console.log("Radio stream error!", radioPlayer.error);
    console.log("Error code:", radioPlayer.error ? radioPlayer.error.code : "unknown");
    console.log("Error message:", radioPlayer.error ? radioPlayer.error.message : "unknown");
    
    document.getElementById('radio-status').textContent = "Error - Using Local Music";
    document.getElementById('toggle-radio').classList.remove('active');
    isRadioPlaying = false;
    
    // Check internet connection again
    checkInternetConnection().then(isConnected => {
        hasInternetConnection = isConnected;
        console.log("Internet check after radio error:", isConnected ? "Connected" : "Disconnected");
        updateRadioUI();
        
        // Fall back to local music
        if (!isMusicPlaying) {
            console.log("Radio failed - Switching to local music");
            startLocalMusic();
        }
    });
}

function handleRadioStalled() {
    console.log("Radio stream stalled! Time:", new Date().toLocaleTimeString());
    console.log("Current src:", radioPlayer.currentSrc);
    console.log("Ready state:", radioPlayer.readyState);
    document.getElementById('radio-status').textContent = "Stalled - Buffering...";
}

function handleRadioBuffering() {
    console.log("Radio stream buffering... Time:", new Date().toLocaleTimeString());
    console.log("Current src:", radioPlayer.currentSrc);
    console.log("Ready state:", radioPlayer.readyState);
    document.getElementById('radio-status').textContent = "Buffering...";
}

function handleRadioPlaying() {
    console.log("Radio stream playing! Time:", new Date().toLocaleTimeString());
    console.log("Current src:", radioPlayer.currentSrc);
    console.log("Ready state:", radioPlayer.readyState);
    
    const stationSelect = document.getElementById('radio-station');
    const stationName = stationSelect.options[stationSelect.selectedIndex].text;
    document.getElementById('radio-status').textContent = stationName;
}

// Initialize sound effects
function initSoundEffects() {
    // Preload sound effects
    bubblePopSound = document.getElementById('bubble-pop-sound');
    bubbleMissSound = document.getElementById('bubble-miss-sound');
    coinGetSound = document.getElementById('coin-get-sound');
    bubblesPoppingSound = document.getElementById('bubbles-popping-sound');
    victoryFanfareSound = document.getElementById('victory-fanfare-sound');
    
    // Set initial volume for all sounds
    if (bubblePopSound) {
        bubblePopSound.volume = 0.7;
        // Attempt to preload by loading metadata
        bubblePopSound.load();
    }
    
    if (bubbleMissSound) {
        bubbleMissSound.volume = 0.5;
        // Attempt to preload by loading metadata
        bubbleMissSound.load();
    }
    
    if (coinGetSound) {
        coinGetSound.volume = 0.6;
        // Attempt to preload by loading metadata
        coinGetSound.load();
    }
    
    if (bubblesPoppingSound) {
        bubblesPoppingSound.volume = 0.4; // Lower volume for continuous sound
        // Attempt to preload by loading metadata
        bubblesPoppingSound.load();
    }
    
    if (victoryFanfareSound) {
        victoryFanfareSound.volume = 0.8; // Slightly louder for celebration
        // Attempt to preload by loading metadata
        victoryFanfareSound.load();
    }
    
    console.log("Sound effects initialized");
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
    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.2, 2000);
    
    // Position the camera to face the game more directly, but lower down
    camera.position.set(1, 1, 100); // Raise Y position by 2 units and reduce Z slightly for more zoom
    camera.lookAt(0, -45, 0); // Keep lookAt point the same
    
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
    controls.target.set(0, -35, 0); // Set the orbit target to match the lookAt point
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 15; // Decreased from 20 for closer zoom
    controls.maxDistance = 55; // Decreased from 100 for closer zoom
    controls.maxPolarAngle = Math.PI / 2;
    // We'll temporarily disable controls during the intro animation
    controls.enabled = false;
    
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
    scoreElement.style.top = '50px';
    scoreElement.style.left = '50%';
    scoreElement.style.transform = 'translateX(-50%)';
    scoreElement.style.background = 'rgba(0, 0, 0, 0.5)';
    scoreElement.style.color = 'white';
    scoreElement.style.padding = '5px';
    scoreElement.style.borderRadius = '5px';
    scoreElement.style.zIndex = '999999';
    scoreElement.style.fontFamily = 'Arial, sans-serif';
    scoreElement.style.fontSize = '18px';
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
    createTopSlope(Ammo); // Add the new top reversed slope
    
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
    const tankBottomY = tankY - (tankHeight - 6)/2 + 4;
    
    // Slope dimensions - make it longer on the horizontal plane
    const slopeWidth = 16.5; // Long enough to reach from outside the tank
    const slopeLength = tankDepth; // Match tank depth
    const slopeHeight = 0.1; // Thin height
    
    // Gentler angle for better gameplay
    const slopeAngle = Math.PI * 0.15; 
    
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
        -tankWidth/22, // Position inside the tank, about 1/4 from the left side
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

function createTopSlope(Ammo) {
    // Get the tank's base position and dimensions
    const tankHeight = 40;
    const tankWidth = 18;
    const tankDepth = 2.8;
    const tankY = FLOOR_HEIGHT + tankHeight/2 + 1;
    
    // Calculate tank top position - this is where we want to align the slope
    const tankTopY = tankY + (tankHeight - 6)/2 - 1;
    
    // Slope dimensions - make it longer on the horizontal plane
    const slopeWidth = 2; // Long enough to reach from outside the tank
    const slopeLength = tankDepth; // Match tank depth
    const slopeHeight = 0.1; // Thin height
    
    // Gentler angle for better gameplay
    const slopeAngle = Math.PI * -0.20; 
    
    // Create visual slope
    const slopeGeometry = new THREE.BoxGeometry(slopeWidth, slopeHeight, slopeLength);
    const slopeMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xc0e8ff,  // Very light blue tint
        opacity: 0.2,     // Semi-transparent
        shininess: 90,    // Highly glossy
        specular: 0xffffff // Strong specular highlight
    });
    const slopeMesh = new THREE.Mesh(slopeGeometry, slopeMaterial);
    
    // Position the slope to the right (east) of the tank, aligned with the top
    slopeMesh.position.set(
        tankWidth/2.2, // Position inside the tank, about 1/4 from the right side
        tankTopY, // Align with top of the tank
        0 // Centered on Z-axis
    );
    
    // Rotate around Y axis (for east to west orientation)
    // Then apply Z rotation for the angle of the slope
    slopeMesh.rotation.z = slopeAngle; // Positive angle to slope downward from left to right
    
    scene.add(slopeMesh);
    
    // Create physics body for the slope
    // We'll use a box shape rotated to match the visual slope
    const slopeShape = new Ammo.btBoxShape(new Ammo.btVector3(slopeWidth / 2, slopeHeight/2, slopeLength / 2));
    
    const slopeTransform = new Ammo.btTransform();
    slopeTransform.setIdentity();
    slopeTransform.setOrigin(new Ammo.btVector3(slopeMesh.position.x, slopeMesh.position.y, slopeMesh.position.z));
    
    // Apply the rotation to the physics body
    const q = new Ammo.btQuaternion();
    q.setRotation(new Ammo.btVector3(0, 0, 1), slopeAngle); // Rotate around Z axis with positive angle
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
        transparent: false, // No longer transparent
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
    
    // Add control knob on the front side
    const knobGeometry = new THREE.CylinderGeometry(1.5, 1.5, 1, 16);
    const knobMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xeeeeee, // Off-white 
        shininess: 80
    });
    const knobMesh = new THREE.Mesh(knobGeometry, knobMaterial);
    // Rotate to make cylinder horizontal
    knobMesh.rotation.x = Math.PI/2;
    knobMesh.position.set(8, tankY - (tankHeight - 3)/2 - 2.5, tankDepth/2 + 1.5);
    scene.add(knobMesh);
    // Store the knob mesh in a global variable for animation
    window.tankControlKnob = knobMesh;
    // Store original position for reset
    window.tankControlKnobOriginalPosition = knobMesh.position.z;
    
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
    // Clear existing pegs array
    pegs = [];
    
    // Get the tank's vertical position
    const tankDepth = 2.8;
    const tankHeight = 40;
    const tankY = FLOOR_HEIGHT + tankHeight/2 + 1; // Same as in createTank
    
    // Get the selected layout
    pegLayout = localStorage.getItem('pegLayout') || 'default';
    
    // If custom layout is somehow selected, default to default layout
    if (pegLayout === 'custom') {
        pegLayout = 'default';
        localStorage.setItem('pegLayout', 'default');
    }
    
    // Define peg positions based on the layout
    let pegPositions = [];
    
    switch(pegLayout) {
        case 'challenge':
            // Challenge mode: 3 pegs in a triangle formation
            pegPositions = [
                { x: -4.5, y: -4, color: 0 }, // Red peg (lower left)
                { x: 1, y: 2, color: 1 },     // Green peg (upper right)
                { x: -2, y: 6, color: 2 },    // Blue peg (top)
            ];
            break;
        
        case 'expert':
            // Expert mode: 5 pegs in more complex arrangement
            pegPositions = [
                { x: -5, y: -2, color: 0 },   // Red peg (lower left)
                { x: 5, y: -2, color: 1 },    // Green peg (lower right)
                { x: 0, y: 4, color: 2 },     // Blue peg (middle top)
                { x: -3, y: 8, color: 3 },    // Yellow peg (upper left)
                { x: 3, y: 8, color: 4 },     // Magenta peg (upper right)
            ];
            break;
            
        case 'random':
            // Random placement: 3-5 pegs in random locations
            const numPegs = Math.floor(Math.random() * 3) + 3; // 3-5 pegs
            
            for (let i = 0; i < numPegs; i++) {
                // Random position within tank bounds
                const x = Math.random() * 14 - 7; // -7 to 7
                const y = Math.random() * 16 - 6; // -6 to 10
                
                pegPositions.push({
                    x: x,
                    y: y,
                    color: i % pegColors.length
                });
            }
            break;
            
        default: // 'default'
            // Original layout: 2 pegs
            pegPositions = [
                { x: -4.5, y: -4, color: 0 }, // Red peg (lower left)
                { x: 1, y: 2, color: 1 },     // Green peg (upper right)
            ];
    }
    
    // Store original positions for reset functionality
    originalPegPositions = JSON.parse(JSON.stringify(pegPositions));
    
    // Create a shared peg base material (red plastic)
    const baseMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xdd1111, // Bright red
        shininess: 70
    });
    
    // Create shared geometries
    const pinGeometry = new THREE.CylinderGeometry(0.15, 0.15, 2.5, 8); // Pin is thinner
    const pinCapGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    
    // Create pegs based on the positions
    for (let i = 0; i < pegPositions.length; i++) {
        const pos = pegPositions[i];
        const colorIndex = pos.color;
        
        // Create material for this peg with color
        const pegMaterial = new THREE.MeshPhongMaterial({ 
            color: pegColors[colorIndex],
            shininess: 90,
            specular: 0x666666,
            side: THREE.DoubleSide,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -4
        });
        
        // Create parent group
        const pegGroup = new THREE.Group();
        pegGroup.position.set(pos.x, tankY + pos.y, 0);
        pegGroup.userData.pegIndex = i;
        pegGroup.userData.colorIndex = colorIndex;
        scene.add(pegGroup);
        pegs.push(pegGroup);
        
        // Create pin part
        const pinLength = 2.5 + (pos.y < 0 ? -0.5 : 1); // Lower pegs are shorter
        const customPinGeometry = new THREE.CylinderGeometry(0.15, 0.15, pinLength, 8);
        
        const pinMesh = new THREE.Mesh(customPinGeometry, pegMaterial);
        const pinYPosition = pos.y < 0 ? 1.3 : 2.05; // Adjust based on height
        pinMesh.position.set(0, pinYPosition, 0);
        pegGroup.add(pinMesh);
        
        // Add rounded cap at the top of each pin
        const pinCapMesh = new THREE.Mesh(pinCapGeometry, pegMaterial);
        pinCapMesh.position.set(0, pinYPosition + pinLength/2, 0); // Position at top of pin
        pegGroup.add(pinCapMesh);
        
        // Set very low friction for the pin cap to make rings slide easily
        const capBody = pinCapMesh.userData.physicsBody;
        if (capBody) {
            capBody.setFriction(0.05); // Very low friction value
        }
        
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
        pinTransform.setOrigin(new Ammo.btVector3(0, pinYPosition, 0));
    compoundShape.addChildShape(pinTransform, pinShape);
    
    // Add pin cap - sphere at top
    const capShape = new Ammo.btSphereShape(0.15);
    const capTransform = new Ammo.btTransform();
    capTransform.setIdentity();
        capTransform.setOrigin(new Ammo.btVector3(0, pinYPosition + pinLength/2, 0));
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
        transform.setOrigin(new Ammo.btVector3(pos.x, tankY + pos.y, 0));
        
        const mass = 0; // static object
        const body = createRigidBody(Ammo, pegGroup, compoundShape, mass, transform);
        pegGroup.userData.physicsBody = body;
        
        // No longer making pegs draggable since we removed that functionality
        pegGroup.userData.isDraggable = false;
    }
    
    // Peg control UI is no longer needed
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
        const linearDamping = 0.3;  // Add some drag to slow down motion
        const angularDamping = 0.2; // Add some rotational damping
        
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
    const bubbleCount = 33; // Increased for more consistent stream
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
    
    // Create containment box for inactive bubbles
    createBubbleContainmentBox(Ammo);
    
    // Create multiple bubbles for water stream
    for (let i = 0; i < bubbleCount; i++) {
        const size = bubbleSizes[i % bubbleSizes.length];
        const color = bubbleColors[i % bubbleColors.length];
        
        // Create bubble visual (transparent sphere with color)
        const bubbleGeometry = new THREE.SphereGeometry(size, 16, 16);
        const bubbleMaterial = new THREE.MeshPhongMaterial({
            color: color,
            transparent: true,
            opacity: 0.6,
            shininess: 90,
            specular: 0x666666
        });
        
        const bubbleMesh = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
        
        // Position bubble in the containment box
        const boxSize = 4;
        const posX = BUBBLE_BOX_POSITION.x + (Math.random() - 0.5) * boxSize;
        const posY = BUBBLE_BOX_POSITION.y + (Math.random() - 0.5) * boxSize;
        const posZ = BUBBLE_BOX_POSITION.z + (Math.random() - 0.5) * boxSize;
        
        bubbleMesh.position.set(posX, posY, posZ);
        scene.add(bubbleMesh);
        bubbles.push(bubbleMesh);
        
        // Create physics body for bubble
        const bubbleShape = new Ammo.btSphereShape(size);
        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(posX, posY, posZ));
        
        // All bubbles have identical physical properties
        const mass = 0.07;            // Low consistent mass
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

// Add this new function to create a containment box for inactive bubbles
function createBubbleContainmentBox(Ammo) {
    // Create a containment box that will keep inactive bubbles
    const boxSize = 6; // Size of the containment box
    const boxPos = BUBBLE_BOX_POSITION;
    
    // Create invisible box mesh
    const boxGeometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
    const boxMaterial = new THREE.MeshBasicMaterial({ 
        visible: false // Make it invisible
    });
    const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
    boxMesh.position.set(boxPos.x, boxPos.y, boxPos.z);
    scene.add(boxMesh);
    
    // Create physics body
    const boxShape = new Ammo.btBoxShape(new Ammo.btVector3(boxSize/2, boxSize/2, boxSize/2));
    const transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(boxPos.x, boxPos.y, boxPos.z));
    
    // Create rigid body - static (mass = 0)
    const boxBody = createRigidBody(Ammo, boxMesh, boxShape, 0, transform);
    
    // Adjust physics properties to contain bubbles
    boxBody.setRestitution(0.5); // Some bounce to keep bubbles inside
    boxBody.setFriction(0.1);    // Low friction
    
    // Store for later use
    bubbleContainmentBox = boxMesh;
    bubbleContainmentBox.userData.physicsBody = boxBody;
    
    return boxMesh;
}

// Function to create a bubble pop effect
function createBubblePop(position, color, size) {
    // Play pop sound immediately - moved to the beginning of the function
    const bubblePopSound = document.getElementById('bubble-pop-sound');
    if (bubblePopSound) {
        // Random volume for variety
        bubblePopSound.volume = 0.6 + Math.random() * 0.2;
        
        // Reset sound if it's already playing
        bubblePopSound.currentTime = 0;
        
        // Play the sound
        const playPromise = bubblePopSound.play();
        
        // Handle potential play() promise rejection (browsers may block autoplay)
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log("Audio play prevented: ", error);
            });
        }
    }
    
    // Create bubble pop particles
    const particleCount = Math.floor(5 + size * 10); // Increased particles for better visibility
    const particles = [];
    const particleGeometry = new THREE.SphereGeometry(0.08, 4, 4); // Slightly larger particles
    const particleMaterial = new THREE.MeshBasicMaterial({ 
        color: color,
        transparent: true,
        opacity: 0.8 // Increased opacity for better visibility
    });
    
    // Store creation time for all particles
    const startTime = Date.now();
    
    // Create particles
    for (let i = 0; i < particleCount; i++) {
        const particle = new THREE.Mesh(particleGeometry, particleMaterial.clone());
        particle.position.copy(position);
        
        // Add random offset with larger spread
        particle.position.x += (Math.random() - 0.5) * 0.2;
        particle.position.y += (Math.random() - 0.5) * 0.2;
        particle.position.z += (Math.random() - 0.5) * 0.2;
        
        // Set random velocity with increased speed
        particle.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * (0.4 + size * 0.2),
            (Math.random() - 0.5) * (0.4 + size * 0.2),
            (Math.random() - 0.5) * (0.4 + size * 0.2)
        );
        
        // Set particle metadata - store the creation time properly
        particle.userData.lifetime = 800 + Math.random() * 400; // Milliseconds instead of seconds
        particle.userData.birthTime = startTime;
        
        scene.add(particle);
        particles.push(particle);
    }
    
    // Animation loop for particles
    const animateParticles = function() {
        const currentTime = Date.now();
        let allDone = true;
        
        for (let i = 0; i < particles.length; i++) {
            const particle = particles[i];
            const elapsed = currentTime - particle.userData.birthTime; // Use birthTime instead of age
            
            if (elapsed < particle.userData.lifetime) {
                allDone = false;
                
                // Move particle outward
                particle.position.add(particle.userData.velocity);
                
                // Scale down and fade out
                const progress = elapsed / particle.userData.lifetime;
                particle.material.opacity = 0.8 * (1 - progress);
                particle.scale.setScalar(1 - 0.5 * progress);
            } else if (particle.parent) {
                // Remove expired particles
                scene.remove(particle);
                particle.geometry.dispose();
                particle.material.dispose();
            }
        }
        
        if (!allDone) {
            requestAnimationFrame(animateParticles);
        } else {
            // Clean up any remaining particles
            particles.forEach(p => {
                if (p.parent) {
                    scene.remove(p);
                    p.geometry.dispose();
                    p.material.dispose();
                }
            });
        }
    };
    
    // Start animation
    animateParticles();
}

// Completely rewrite the bubble spawning function for consistent water-like stream
function spawnBubblesInFlow() {
    // If flow is not active, stop spawning
    if (!bubbleFlowActive) {
        return;
    }
    
    const currentTime = Date.now();
    
    // Check for max pump time or button release
    if ((isPumpButtonHeld && currentTime - pumpStartTime > MAX_PUMP_HOLD_TIME) || 
        (!isPumpButtonHeld && currentTime - pumpStartTime > 100)) {
        bubbleFlowActive = false;
        return;
    }
    
    // Spawn bubbles on regular intervals
    if (currentTime - lastBubbleTime > BUBBLE_SPAWN_INTERVAL) {
        lastBubbleTime = currentTime;
        
        // Get tank dimensions (moved outside the bubble loop)
        const tankWidth = 18;
        const tankDepth = 2.8;
        const tankHeight = 40;
        const tankY = FLOOR_HEIGHT + tankHeight/2 + 1;
        
        // Setup spawn position (calculations done once)
        const releaseX = bubbleSpawnPosition.x;
        const releaseY = tankY + bubbleSpawnPosition.y;
        const releaseZ = parseFloat(document.getElementById('bubble-z').value);
        
        // Precalculate target values and angle factors
        const targetX = 0; // Center of tank
        const targetY = tankY + tankHeight/3;
        const targetZ = 0; // Center of tank
        
        // Calculate angle components once
        const angleRadians = (bubbleAngle * Math.PI) / 180;
        const angleX = Math.cos((90 - bubbleAngle) * Math.PI / 180);
        const angleY = Math.sin(angleRadians);
        
        // Calculate direction vector once
        const dirX = targetX - releaseX;
        const dirY = targetY - releaseY;
        const dirZ = targetZ - releaseZ;
        
        // Normalize once
        const length = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
        const normX = dirX / length;
        const normY = dirY / length;
        const normZ = dirZ / length;
        
        // Force calculations
        const baseForce = 20;
        const powerFactor = bubblePower / 10 + 1;
        
        trySpawnBubble(currentTime, releaseX, releaseY, releaseZ, angleX, angleY, 
                      normZ, baseForce, powerFactor);
    }
    
    // Continue the flow if active
    if (bubbleFlowActive) {
        requestAnimationFrame(spawnBubblesInFlow);
    }
}

// New helper function to attempt to spawn a bubble
function trySpawnBubble(currentTime, releaseX, releaseY, releaseZ, angleX, angleY, 
                       normZ, baseForce, powerFactor) {
    // Try to find an inactive bubble
    for (let i = 0; i < activeBubbles.length; i++) {
        const bubble = activeBubbles[i];
        
        if (!bubble.userData.isActive) {
            const size = bubble.userData.size;
            const variance = 0.3; // Very small variance
            
            // Position with minimal variance
            const x = releaseX + (Math.random() * variance * 2 - variance + 2);
            const y = releaseY;
            const z = releaseZ; // No variance on z-axis as requested
            
            // Update bubble position
            bubble.position.set(x, y, z);
            
            // Update physics body position
            const body = bubble.userData.physicsBody;
            const worldTransform = body.getWorldTransform();
            worldTransform.setOrigin(new Ammo.btVector3(x, y, z));
            
            // Activate bubble physics
            body.activate();
            
            // Apply force with angle adjustment
            body.applyCentralForce(new Ammo.btVector3(
                baseForce * angleX * powerFactor,
                baseForce * angleY * 5.5 * powerFactor,
                baseForce * normZ * powerFactor
            ));
            
            // Mark as active and set timers
            bubble.userData.isActive = true;
            bubbleLifetimes[i] = currentTime + BUBBLE_LIFETIME;
            bubbleImmunityTimes[i] = currentTime + BUBBLE_IMMUNITY_PERIOD;
            
            // Make bubble visible with a fade-in
            fadeBubbleIn(bubble);
            return true;
        }
    }
    return false;
}

// New helper function for the fade-in animation
function fadeBubbleIn(bubble) {
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
}

// Also update the bubble-ring collision function for consistency
function checkBubbleRingCollisions() {
    // Get current time for immunity check
    const currentTime = Date.now();
    
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
                    // Check if bubble is still in immunity period
                    if (currentTime < bubbleImmunityTimes[bubbleIndex]) {
                        // Skip this collision - bubble is immune
                        continue;
                    }
                    
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
                    
                    // Get bubble and ring positions and velocities
                    const bubblePos = new THREE.Vector3();
                    bubbleMesh.getWorldPosition(bubblePos);
                    const ringPos = new THREE.Vector3();
                    ringMesh.getWorldPosition(ringPos);

                    // Get velocities
                    const bubbleVel = new THREE.Vector3(
                        bubbleBody.getLinearVelocity().x(),
                        bubbleBody.getLinearVelocity().y(),
                        bubbleBody.getLinearVelocity().z()
                    );
                    const ringVel = new THREE.Vector3(
                        ringBody.getLinearVelocity().x(),
                        ringBody.getLinearVelocity().y(),
                        ringBody.getLinearVelocity().z()
                    );

                    // Calculate impact direction and relative velocity
                    const impactDir = new THREE.Vector3().subVectors(bubblePos, ringPos).normalize();
                    const relativeVel = new THREE.Vector3().subVectors(bubbleVel, ringVel);
                    const impactSpeed = relativeVel.length();

                    // Calculate impact point (approximate as being on the ring's outer edge in direction of bubble)
                    const ringRadius = 1.0; // Adjust based on your actual ring size
                    const impactPoint = new THREE.Vector3().copy(impactDir).multiplyScalar(ringRadius);

                    // Calculate torque using cross product of impact point and impact force
                    const impactForce = new THREE.Vector3().copy(impactDir).multiplyScalar(impactSpeed * powerFactor * sizeMultiplier * bubbleResistance);
                    const torque = new THREE.Vector3().crossVectors(impactPoint, impactForce);

                    // Scale torque for appropriate gameplay feel
                    const torqueScaleFactor = 1.5; // Adjust this to control the amount of spin
                    torque.multiplyScalar(torqueScaleFactor);

                    // Apply the calculated torque instead of random values
                    ringBody.applyTorqueImpulse(new Ammo.btVector3(
                        torque.x, 
                        torque.y, 
                        torque.z
                    ));

                    // Still apply central force as before for the upward movement
                    ringBody.applyCentralForce(new Ammo.btVector3(
                        (Math.random() * 0.6 - 0.3) * 80 * sizeMultiplier * powerFactor * bubbleResistance,
                        (90 + Math.random() * 30) * sizeMultiplier * powerFactor * bubbleResistance,
                        (Math.random() * 0.6 - 0.3) * 80 * sizeMultiplier * powerFactor * bubbleResistance
                    ));
                    
                    // Create pop effect before hiding the bubble
                    createBubblePop(
                        bubbleMesh.position.clone(),
                        bubbleMesh.userData.color,
                        bubbleMesh.userData.size
                    );
                    
                    // Deactivate bubble and return to containment box
                    returnBubbleToContainmentBox(bubbleMesh, bubbleBody);
                }
            }
        }
    }
}

// Add this new function to return bubbles to the containment box
function returnBubbleToContainmentBox(bubbleMesh, bubbleBody) {
    // Mark as inactive
    bubbleMesh.userData.isActive = false;
    
    // Generate a random position within the containment box
    const boxSize = 5;
    const posX = BUBBLE_BOX_POSITION.x + (Math.random() - 0.5) * boxSize;
    const posY = BUBBLE_BOX_POSITION.y + (Math.random() - 0.5) * boxSize;
    const posZ = BUBBLE_BOX_POSITION.z + (Math.random() - 0.5) * boxSize;
    
    // Update visual position
    bubbleMesh.position.set(posX, posY, posZ);
    
    // Update physics body position
    const transform = bubbleBody.getWorldTransform();
    transform.setOrigin(new Ammo.btVector3(posX, posY, posZ));
    
    // Reset velocities
    bubbleBody.setLinearVelocity(new Ammo.btVector3(0, 0, 0));
    bubbleBody.setAngularVelocity(new Ammo.btVector3(0, 0, 0));
    
    // Hide it visually
    bubbleMesh.material.opacity = 0;
}

function activateBubbles() {
    // Start a bubble flow
    bubbleFlowActive = true;
    lastBubbleTime = 0; // Reset to start immediately
    
    // Start spawning bubbles
    spawnBubblesInFlow();
    
    // Play the bubbles popping sound when activated by keyboard
    if (soundEnabled && bubblesPoppingSound) {
        bubblesPoppingSound.play().catch(err => {
            console.log("Could not play bubbles popping sound:", err);
        });
    }
    
    // Show pumping feedback for visual cues
    if (typeof showPumpingFeedback === 'function') {
        showPumpingFeedback();
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

    // Reset rings button in bottom left
    const resetButton = document.getElementById('reset-rings-button');
    if (resetButton) {
        console.log("Setting up reset button event listener in setupEventListeners");
        resetButton.addEventListener('click', function() {
            console.log("Reset button clicked!");
            dropRingsOnSlope();
            // Add a little shake effect when resetting
            applyCameraShake(0.5, 500);
            
            // Visual feedback on button click
            this.style.transform = "scale(0.9)";
            setTimeout(() => {
                this.style.transform = "scale(1)";
            }, 200);
        });
    } else {
        console.error("Reset button not found in DOM during setupEventListeners");
    }

    // Music toggle button
    document.getElementById('toggle-music').addEventListener('click', function() {
        if (isMusicPlaying) {
            // Pause music
            backgroundMusic.pause();
            this.textContent = '🔇';
            isMusicPlaying = false;
        } else {
            // User explicitly wants local music
            preferRadio = false; // Update the preference when user directly clicks music button
            this.textContent = '🔊';
            
            // First ensure radio is off to avoid playing both
            if (isRadioPlaying) {
                radioPlayer.pause();
                document.getElementById('toggle-radio').classList.remove('active');
                document.getElementById('radio-status').textContent = 'Switched to Local Music';
                isRadioPlaying = false;
            }
            
            // Play music
            startLocalMusic();
        }
    });
    
    // Radio toggle button
    document.getElementById('toggle-radio').addEventListener('click', function() {
        if (isRadioPlaying) {
            // Pause radio
            radioPlayer.pause();
            this.classList.remove('active');
            document.getElementById('radio-status').textContent = hasInternetConnection ? 'Online - Ready' : 'Offline';
            isRadioPlaying = false;
            
            // If no music is playing, start local music
            if (!isMusicPlaying) {
                startLocalMusic();
            }
        } else {
            // User explicitly wants radio
            preferRadio = true;
            
            // Check internet connection first
            checkInternetConnection().then(isConnected => {
                hasInternetConnection = isConnected;
                updateRadioUI();
                
                if (isConnected) {
                    // Try to start radio
                    tryStartRadio();
                } else {
                    // Alert user that we can't play radio
                    alert("Internet connection not available. Using local music instead.");
                    startLocalMusic();
                }
            });
        }
    });
    
    // Radio station selection
    document.getElementById('radio-station').addEventListener('change', function() {
        const stationUrl = this.value;
        
        // If radio is already playing, update the stream
        if (isRadioPlaying && stationUrl !== 'none' && hasInternetConnection) {
            // Update the radio source
            const sourceElement = radioPlayer.querySelector('source');
            sourceElement.src = stationUrl;
            
            // Reload and play
            radioPlayer.load();
            radioPlayer.play().then(() => {
                // Get the station name from the selected option
                const stationName = this.options[this.selectedIndex].text;
                document.getElementById('radio-status').textContent = stationName;
                
                console.log(`Now playing radio: ${stationName}`);
            }).catch(e => {
                console.log("Radio play failed:", e);
                
                // Check internet again
                checkInternetConnection().then(isConnected => {
                    hasInternetConnection = isConnected;
                    updateRadioUI();
                    
                    if (!isConnected) {
                        alert("Internet connection lost. Using local music instead.");
                        startLocalMusic();
                    } else {
                        alert("Unable to play radio stream. Please try another station.");
                    }
                });
            });
        } else if (stationUrl !== 'none' && hasInternetConnection && preferRadio && !isRadioPlaying) {
            // User selected a station while radio isn't playing, but prefers radio
            // Start playing the selected station
            tryStartRadio();
        }
    });
    
    // Add periodic internet connection check (every 30 seconds)
    setInterval(() => {
        // Only check if radio is playing or user prefers radio
        if (isRadioPlaying || (preferRadio && !isMusicPlaying)) {
            checkInternetConnection().then(isConnected => {
                // Only update if connection status has changed
                if (hasInternetConnection !== isConnected) {
                    hasInternetConnection = isConnected;
                    updateRadioUI();
                    
                    // If we lost connection while radio was playing, switch to local music
                    if (!isConnected && isRadioPlaying) {
                        radioPlayer.pause();
                        document.getElementById('toggle-radio').classList.remove('active');
                        isRadioPlaying = false;
                        
                        alert("Internet connection lost. Switching to local music.");
                        startLocalMusic();
                    }
                }
            });
        }
    }, 30000); // Check every 30 seconds
    
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
    
    // Create a pump status indicator
    const pumpStatusIndicator = document.createElement('div');
    pumpStatusIndicator.id = 'pump-status';
    pumpStatusIndicator.textContent = 'PUMPING!';
    pumpStatusIndicator.style.position = 'absolute';
    pumpStatusIndicator.style.bottom = '80px';
    pumpStatusIndicator.style.right = '20px';
    pumpStatusIndicator.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
    pumpStatusIndicator.style.color = 'white';
    pumpStatusIndicator.style.padding = '8px 15px';
    pumpStatusIndicator.style.borderRadius = '20px';
    pumpStatusIndicator.style.fontWeight = 'bold';
    pumpStatusIndicator.style.fontSize = '18px';
    pumpStatusIndicator.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.5)';
    pumpStatusIndicator.style.display = 'none';
    pumpStatusIndicator.style.zIndex = '100';
    document.body.appendChild(pumpStatusIndicator);
    
    // Function to show active pumping feedback
    function showPumpingFeedback() {
        // Enhance button appearance
        floatingPumpButton.style.transform = 'scale(0.9)';
        floatingPumpButton.style.backgroundColor = '#ff5555';
        floatingPumpButton.style.boxShadow = '0 0 15px rgba(255, 0, 0, 0.7)';
        floatingPumpButton.style.animation = 'none'; // Stop normal pulsing
        floatingPumpButton.style.animation = 'pump-pulse 0.5s infinite alternate'; // Add faster pulsing
        
        // Show status indicator
        pumpStatusIndicator.style.display = 'block';
        
        // Enable camera shake
        isShakingCamera = true;
        
        // Play bubbles popping sound
        if (soundEnabled && bubblesPoppingSound) {
            bubblesPoppingSound.play().catch(err => {
                console.log("Could not play bubbles popping sound:", err);
            });
        }
        
        // Animate the control knob
        if (window.tankControlKnob) {
            // Push the knob inward when pumping
            if (typeof gsap !== 'undefined') {
                // Use GSAP if available
                gsap.to(window.tankControlKnob.position, {
                    z: window.tankControlKnobOriginalPosition - 0.9, // Move inward
                    duration: 0.15,
                    ease: "power2.out"
                });
            } else {
                // Fallback animation if GSAP isn't available
                window.tankControlKnob.position.z = window.tankControlKnobOriginalPosition - 0.9;
            }
            
            // Add a slight vibration effect to the knob
            window.knobVibrationInterval = setInterval(() => {
                if (window.tankControlKnob) {
                    // Small random position adjustments for vibration effect
                    window.tankControlKnob.position.y += (Math.random() - 0.5) * 0.02;
                    window.tankControlKnob.position.x += (Math.random() - 0.5) * 0.02;
                }
            }, 50);
        }
    }
    
    // Function to reset button appearance
    function resetPumpingFeedback() {
        floatingPumpButton.style.transform = '';
        floatingPumpButton.style.backgroundColor = '';
        floatingPumpButton.style.boxShadow = '';
        floatingPumpButton.style.animation = 'pulse 1.5s infinite'; // Restore original pulse
        
        // Hide status indicator
        pumpStatusIndicator.style.display = 'none';
        
        // Disable camera shake
        isShakingCamera = false;
        
        // Stop bubbles popping sound
        if (bubblesPoppingSound) {
            bubblesPoppingSound.pause();
            bubblesPoppingSound.currentTime = 0;
        }
        
        // Reset the control knob
        if (window.tankControlKnob && typeof window.tankControlKnobOriginalPosition !== 'undefined') {
            // Return knob to original position
            if (typeof gsap !== 'undefined') {
                // Use GSAP if available
                gsap.to(window.tankControlKnob.position, {
                    z: window.tankControlKnobOriginalPosition,
                    duration: 0.3,
                    ease: "back.out(1.5)"
                });
            } else {
                // Fallback animation if GSAP isn't available
                window.tankControlKnob.position.z = window.tankControlKnobOriginalPosition;
            }
            
            // Clear the vibration interval
            if (window.knobVibrationInterval) {
                clearInterval(window.knobVibrationInterval);
            }
        }
    }
    
    // Add a style for the pumping animation
    const pumpStyle = document.createElement('style');
    pumpStyle.textContent = `
        @keyframes pump-pulse {
            0% { transform: scale(0.9); box-shadow: 0 0 15px rgba(255, 0, 0, 0.7); }
            100% { transform: scale(1.1); box-shadow: 0 0 25px rgba(255, 0, 0, 0.9); }
        }
    `;
    document.head.appendChild(pumpStyle);
    
    // Mouse down starts pumping
    floatingPumpButton.addEventListener('mousedown', function() {
        isPumpButtonHeld = true;
        pumpStartTime = Date.now();
        bubbleFlowActive = true;
        spawnBubblesInFlow();
        
        // Show feedback
        showPumpingFeedback();
    });
    
    // Mouse up stops pumping
    floatingPumpButton.addEventListener('mouseup', function() {
        isPumpButtonHeld = false;
        
        // Reset feedback
        resetPumpingFeedback();
    });
    
    // Mouse leaving the button also stops pumping
    floatingPumpButton.addEventListener('mouseleave', function() {
        isPumpButtonHeld = false;
        
        // Reset feedback
        resetPumpingFeedback();
    });
    
    // Touch events for mobile support
    floatingPumpButton.addEventListener('touchstart', function(e) {
        e.preventDefault(); // Prevent default touch behavior
        isPumpButtonHeld = true;
        pumpStartTime = Date.now();
        bubbleFlowActive = true;
        spawnBubblesInFlow();
        
        // Show feedback
        showPumpingFeedback();
    });
    
    floatingPumpButton.addEventListener('touchend', function() {
        isPumpButtonHeld = false;
        
        // Reset feedback
        resetPumpingFeedback();
    });
    
    // Variables for button cooldown
    let bumpButtonsOnCooldown = false;
    let cooldownTimeRemaining = 0;
    let cooldownInterval = null;
    
    // Function to start cooldown
    function startBumpButtonCooldown() {
        if (bumpButtonsOnCooldown) return; // Already on cooldown
        
        bumpButtonsOnCooldown = true;
        cooldownTimeRemaining = 10; // 10 second cooldown
        
        // Disable both buttons
        bumpLeftButton.disabled = true;
        bumpRightButton.disabled = true;
        
        // Add visual cooldown class
        bumpLeftButton.classList.add('on-cooldown');
        bumpRightButton.classList.add('on-cooldown');
        
        // Set initial text to show cooldown
        bumpLeftButton.innerHTML = cooldownTimeRemaining;
        bumpRightButton.innerHTML = cooldownTimeRemaining;
        
        // Clear any existing interval
        if (cooldownInterval) clearInterval(cooldownInterval);
        
        // Start cooldown timer
        cooldownInterval = setInterval(function() {
            cooldownTimeRemaining--;
            
            // Update countdown text
            bumpLeftButton.innerHTML = cooldownTimeRemaining;
            bumpRightButton.innerHTML = cooldownTimeRemaining;
            
            if (cooldownTimeRemaining <= 0) {
                // Reset when cooldown is done
                clearInterval(cooldownInterval);
                cooldownInterval = null;
                bumpButtonsOnCooldown = false;
                
                // Re-enable buttons
                bumpLeftButton.disabled = false;
                bumpRightButton.disabled = false;
                
                // Remove cooldown styling
                bumpLeftButton.classList.remove('on-cooldown');
                bumpRightButton.classList.remove('on-cooldown');
                
                // Restore original icons
                bumpLeftButton.innerHTML = "👈";
                bumpRightButton.innerHTML = "👉";
            }
        }, 1000);
    }
    
    // Bump Left Button
    const bumpLeftButton = document.getElementById('bump-left-button');
    bumpLeftButton.addEventListener('mousedown', function() {
        // Only apply force if not on cooldown
        if (!bumpButtonsOnCooldown) {
            // Apply force to the left with a moderate strength value
            const strength = 5; // Adjust this value as needed for a good gameplay feel
            const forceVector = new Ammo.btVector3(-strength, 0, 0);
            applyForceToToruses(forceVector);
            
            // Add visual feedback
            this.style.transform = 'scale(0.95)';
            
            // Start cooldown
            startBumpButtonCooldown();
        }
    });
    
    bumpLeftButton.addEventListener('mouseup', function() {
        if (!bumpButtonsOnCooldown) {
            this.style.transform = '';
        }
    });
    
    bumpLeftButton.addEventListener('mouseleave', function() {
        if (!bumpButtonsOnCooldown) {
            this.style.transform = '';
        }
    });
    
    // Touch events for mobile support
    bumpLeftButton.addEventListener('touchstart', function(e) {
        e.preventDefault(); // Prevent default touch behavior
        
        // Only apply force if not on cooldown
        if (!bumpButtonsOnCooldown) {
            // Apply force to the left with a moderate strength value
            const strength = 5; // Adjust this value as needed for a good gameplay feel
            const forceVector = new Ammo.btVector3(-strength, 0, 0);
            applyForceToToruses(forceVector);
            
            // Add visual feedback
            this.style.transform = 'scale(0.95)';
            
            // Start cooldown
            startBumpButtonCooldown();
        }
    });
    
    bumpLeftButton.addEventListener('touchend', function() {
        if (!bumpButtonsOnCooldown) {
            this.style.transform = '';
        }
    });
    
    // Bump Right Button
    const bumpRightButton = document.getElementById('bump-right-button');
    bumpRightButton.addEventListener('mousedown', function() {
        // Only apply force if not on cooldown
        if (!bumpButtonsOnCooldown) {
            // Apply force to the right with a moderate strength value
            const strength = 5; // Adjust this value as needed for a good gameplay feel
            const forceVector = new Ammo.btVector3(strength, 0, 0);
            applyForceToToruses(forceVector);
            
            // Add visual feedback
            this.style.transform = 'scale(0.95)';
            
            // Start cooldown
            startBumpButtonCooldown();
        }
    });
    
    bumpRightButton.addEventListener('mouseup', function() {
        if (!bumpButtonsOnCooldown) {
            this.style.transform = '';
        }
    });
    
    bumpRightButton.addEventListener('mouseleave', function() {
        if (!bumpButtonsOnCooldown) {
            this.style.transform = '';
        }
    });
    
    // Touch events for mobile support
    bumpRightButton.addEventListener('touchstart', function(e) {
        e.preventDefault(); // Prevent default touch behavior
        
        // Only apply force if not on cooldown
        if (!bumpButtonsOnCooldown) {
            // Apply force to the right with a moderate strength value
            const strength = 5; // Adjust this value as needed for a good gameplay feel
            const forceVector = new Ammo.btVector3(strength, 0, 0);
            applyForceToToruses(forceVector);
            
            // Add visual feedback
            this.style.transform = 'scale(0.95)';
            
            // Start cooldown
            startBumpButtonCooldown();
        }
    });
    
    bumpRightButton.addEventListener('touchend', function() {
        if (!bumpButtonsOnCooldown) {
            this.style.transform = '';
        }
    });
    
    // Add keyboard shortcuts
    window.addEventListener('keydown', function(event) {
        if (event.key === 's' || event.key === 'S') {
            dropRingsOnSlope();
        } else if (event.key === 'b' || event.key === 'B') {
            // For keyboard, use the traditional approach (timer-based burst)
            isPumpButtonHeld = true;
            pumpStartTime = Date.now();
            activateBubbles();
        }
    });
    
    // Add keyboard release handler
    window.addEventListener('keyup', function(event) {
        if (event.key === 'b' || event.key === 'B') {
            isPumpButtonHeld = false;
            
            // Stop bubbles flow
            bubbleFlowActive = false;
            
            // Reset pump feedback
            if (typeof resetPumpingFeedback === 'function') {
                resetPumpingFeedback();
            }
        }
    });
    
    // Add peg layout selection to localStorage when changed
    document.getElementById('peg-layout').addEventListener('change', function() {
        const layout = this.value;
        localStorage.setItem('pegLayout', layout);
    });
    
    // Add peg controls toggle
    document.getElementById('toggle-peg-controls').addEventListener('click', function() {
        const pegControls = document.getElementById('peg-controls');
        if (pegControls.style.display === 'none') {
            pegControls.style.display = 'block';
        } else {
            pegControls.style.display = 'none';
        }
    });
    
    // Add close button for peg controls
    document.getElementById('close-peg-controls').addEventListener('click', function() {
        document.getElementById('peg-controls').style.display = 'none';
    });
    
    // Add button for adding new pegs
    document.getElementById('add-peg-button').addEventListener('click', function() {
        addNewPeg(Ammo);
    });
    
    // Add button for resetting pegs
    document.getElementById('reset-pegs-button').addEventListener('click', function() {
        resetPegs(Ammo);
    });
    
    // Add mouse/touch event listeners for dragging pegs
    const gameViewport = document.getElementById('game-viewport');
    
    // Track mouse/touch position
    let lastClientX = 0;
    let lastClientY = 0;
    
    // Mouse move event for dragging pegs
    gameViewport.addEventListener('mousemove', function(e) {
        // Peg dragging functionality has been removed
        
        // Update last position
        lastClientX = e.clientX;
        lastClientY = e.clientY;
    });
    
    // Touch move for mobile
    gameViewport.addEventListener('touchmove', function(e) {
        // Peg dragging functionality has been removed
        
        // Update last position
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            lastClientX = touch.clientX;
            lastClientY = touch.clientY;
        }
    });
    
    // Mouse up event for stopping drag
    window.addEventListener('mouseup', function() {
        // Peg dragging functionality has been removed
    });
    
    // Touch end for mobile
    window.addEventListener('touchend', function() {
        // Peg dragging functionality has been removed
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
    // Initialize tracking arrays for animations
    ringDropAnimations = [];
    
    // Reset the score and update display
    score = 0;
    if (typeof updateScoreDisplay === 'function') {
        updateScoreDisplay();
    }
    
    // Reset victory message shown flag
    window.victoryMessageShown = false;

    // Loop through all rigid bodies and reset the positions
    for (let i = 0; i < rigidBodies.length; i++) {
        const object = rigidBodies[i];
        
        // Only consider torus objects
        if (object.geometry && object.geometry.type === 'TorusGeometry') {
            const body = object.userData.physicsBody;
            
            // Determine new position on slope
            const posX = (Math.random() * 14) - 7; // Random X position
            const posY = FLOOR_HEIGHT + (Math.random() * 4) + 10; // Random height above slope
            const posZ = (Math.random() * 3) - 1.5; // Random Z position
            
            if (body) {
                const transform = new Ammo.btTransform();
                transform.setIdentity();
                transform.setOrigin(new Ammo.btVector3(posX, posY, posZ));
                
                // Reset rotation
                const quat = new THREE.Quaternion();
                quat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2); // Flat orientation
                transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
                
                // Set the transform
                body.setWorldTransform(transform);
                
                // Reset velocities
                body.setLinearVelocity(new Ammo.btVector3(0, 0, 0));
                body.setAngularVelocity(new Ammo.btVector3(0, 0, 0));
                
                // Activate the body
                body.activate();
                
                // Reset any on-peg status
                if (object.userData.isOnPeg) {
                    object.userData.isOnPeg = false;
                    
                    // Reset physics properties
                    body.setFriction(0.5); // Normal friction
                    body.setRestitution(0.2); // Normal bounce
                    body.setDamping(0.3, 0.3); // Normal damping
                    
                    // Reset visual feedback
                    if (object.material && object.userData.originalColor) {
                        object.material.emissive = new THREE.Color(0x000000);
                        object.material.needsUpdate = true;
                    }
                }
            }
        }
    }
    
    // Also reset all toruses in the toruses array to ensure complete reset
    for (let i = 0; i < toruses.length; i++) {
        const torus = toruses[i];
        torus.userData.isOnPeg = false;
        
        // Reset visual feedback
        if (torus.material && torus.userData.originalColor) {
            torus.material.emissive = new THREE.Color(0x000000);
            torus.material.needsUpdate = true;
        }
    }
    
    // Apply camera shake for visual feedback
    applyCameraShake(0.5, 500);
    
    // Hide any visible quotes
    if (quoteTimeout) {
        clearTimeout(quoteTimeout);
    }
    if (quoteElement) {
        quoteElement.style.opacity = '0';
    }
    
    console.log("Game reset complete!");
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
    for (let i = 0; i < activeBubbles.length; i++) {
        const bubble = activeBubbles[i];
        
        if (bubble.userData.isActive) {
            // Check if bubble lifetime has expired
            if (currentTime > bubbleLifetimes[i]) {
                // Get the physics body
                const body = bubble.userData.physicsBody;
                
                // Return bubble to containment box
                returnBubbleToContainmentBox(bubble, body);
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
    if (!pegs || pegs.length === 0 || !toruses || toruses.length === 0) return;
    
    console.log("Checking for rings on pegs...");
    
    // Add debug information about rigid bodies and toruses array
    console.log(`Total rigid bodies: ${rigidBodies.length}, Total toruses array length: ${toruses.length}`);
    
    // Define a floor threshold - rings below this are automatically NOT on pegs
    const floorThreshold = FLOOR_HEIGHT + 3; // Adjust based on your floor height
    
    // First, reset status for rings below the floor threshold
    for (let i = 0; i < toruses.length; i++) {
        const ring = toruses[i];
        if (ring.position.y < floorThreshold) {
            // If this ring was previously marked as on peg, log that it fell off
            if (ring.userData.isOnPeg) {
                console.log(`Ring #${i+1} is below floor threshold (${ring.position.y.toFixed(2)} < ${floorThreshold}). Marking as NOT on peg.`);
                ring.userData.isOnPeg = false;
                
                // Reset physics properties if needed
                const body = ring.userData.physicsBody;
                if (body) {
                    body.setFriction(0.5);
                    body.setRestitution(0.2);
                    body.setDamping(0.3, 0.3);
                    ring.userData.bubbleResistance = 1.0;
                }
                
                // Reset visual feedback
                if (ring.material && ring.userData.originalColor) {
                    ring.material.emissive = new THREE.Color(0x000000);
                    ring.material.needsUpdate = true;
                }
            }
        }
    }
    
    // Log details about each torus from the toruses array for debugging
    console.log("Toruses in the toruses array:");
    toruses.forEach((torus, index) => {
        console.log(`Torus ${index} position: ${torus.position.x.toFixed(2)}, ${torus.position.y.toFixed(2)}, ${torus.position.z.toFixed(2)}, isOnPeg: ${torus.userData.isOnPeg || false}`);
    });
    
    // Check each ring in the toruses array - this ensures we check ALL rings
    for (let i = 0; i < toruses.length; i++) {
        const ring = toruses[i];
        
        // Skip rings already identified as below floor threshold
        if (ring.position.y < floorThreshold) continue;
        
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
                console.log(`Ring #${i+1} is horizontally aligned with Peg #${j} (distance: ${horizontalDistance.toFixed(2)})`);
                
                // Check vertical position relative to peg top
                // This varies depending on which peg and ring height, so we use approximate values
                const pegHeight = (j === 0) ? 2.0 : 3.5; // Approximate heights from createPegs function
                const pegTop = pegPos.y + pegHeight / 2;
                
                // Log the ring's position relative to the peg
                console.log(`Ring position Y: ${ringPos.y.toFixed(2)}, Peg top Y: ${pegTop.toFixed(2)}`);
                
                // More strict height check to prevent false positives
                // Ring should be at or slightly below the peg top, but not too far below
                const lowerLimit = pegTop - 1.5; // Less forgiving - closer to peg top
                const upperLimit = pegTop + 5;  // Reasonable limit for stacked rings
                
                // Check if ring is within the height range
                if (ringPos.y >= lowerLimit && ringPos.y <= upperLimit) {
                    console.log(`Ring #${i+1} is at the correct height for Peg #${j}!`);
                    
                    // Ring is on peg! Stabilize it
                    
                    // If already stabilized, skip
                    if (ring.userData.isOnPeg) {
                        console.log(`Ring #${i+1} is already stabilized on Peg #${j}`);
                        continue;
                    }
                    
                    // Mark as on peg
                    ring.userData.isOnPeg = true;
                    console.log(`SUCCESS: Ring #${i+1} is now stabilized on Peg #${j}!`);
                    
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
                    console.log(`Ring #${i+1} is aligned with Peg #${j} but NOT at the correct height. Valid range: ${lowerLimit.toFixed(2)} to ${upperLimit.toFixed(2)}`);
                    
                    // If ring was previously on peg but now isn't, reset properties
                    if (ring.userData.isOnPeg) {
                        console.log(`Ring #${i+1} was knocked off Peg #${j}! Resetting properties.`);
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
    
    // Count rings on pegs using the toruses array
    const ringsOnPegs = toruses.filter(obj => obj.userData && obj.userData.isOnPeg).length;
    console.log(`Total rings currently on pegs: ${ringsOnPegs}`);
    
    // Update the score display
    updateScore();
}

// Add this function to display a quote
function displayQuote(quote, isPositive) {
    // Clear any existing timeout
    if (quoteTimeout) {
        clearTimeout(quoteTimeout);
    }
    
    // Create the quote element if it doesn't exist
    if (!quoteElement) {
        quoteElement = document.createElement('div');
        quoteElement.style.position = 'absolute';
        quoteElement.style.top = '120px';
        quoteElement.style.left = '50%';
        quoteElement.style.transform = 'translateX(-50%)';
        quoteElement.style.fontFamily = "'Comic Sans MS', cursive";
        quoteElement.style.fontSize = '24px';
        quoteElement.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
        quoteElement.style.padding = '10px';
        quoteElement.style.borderRadius = '10px';
        quoteElement.style.zIndex = '1000';
        quoteElement.style.transition = 'all 0.3s ease-in-out';
        quoteElement.style.opacity = '0';
        quoteElement.style.transform = 'translateX(-50%) scale(0.8)';
        document.body.appendChild(quoteElement);
    }
    
    // Don't show the same quote twice in a row if possible
    if (quote === lastDisplayedQuote && (isPositive ? POSITIVE_QUOTES_90S.length > 1 : NEGATIVE_QUOTES_90S.length > 1)) {
        // Try to get a different quote
        const quotes = isPositive ? POSITIVE_QUOTES_90S : NEGATIVE_QUOTES_90S;
        let newQuote;
        do {
            newQuote = quotes[Math.floor(Math.random() * quotes.length)];
        } while (newQuote === lastDisplayedQuote && quotes.length > 1);
        quote = newQuote;
    }
    
    lastDisplayedQuote = quote;
    
    // Set styles based on positive/negative
    quoteElement.style.backgroundColor = isPositive ? 'rgba(0, 255, 0, 0.7)' : 'rgba(255, 0, 0, 0.7)';
    quoteElement.style.color = 'white';
    quoteElement.textContent = quote;
    
    // Animate in
    setTimeout(() => {
        quoteElement.style.opacity = '1';
        quoteElement.style.transform = 'translateX(-50%) scale(1)';
    }, 10);
    
    // Fade out after 2 seconds
    quoteTimeout = setTimeout(() => {
        quoteElement.style.opacity = '0';
        quoteElement.style.transform = 'translateX(-50%) scale(0.8)';
    }, 2000);
}

// Modify updateScore function to include quotes
function updateScore() {
    // Store previous score to check for changes
    const previousScore = score;
    
    // Count rings on pegs using the toruses array
    const ringsOnPegs = toruses.filter(obj => obj.userData && obj.userData.isOnPeg).length;
    
    // Update the score
    score = ringsOnPegs;
    
    // Update high score if needed
    if (score > highScore) {
        highScore = score;
        // Remove localStorage persistence
    }
    
    // This section is where you're calculating the new score value
    // After calculating the new score, compare with previous:
    
    if (score > previousScore) {
        // Score increased by 1
        if (score - previousScore === 1) {
            const randomQuote = POSITIVE_QUOTES_90S[Math.floor(Math.random() * POSITIVE_QUOTES_90S.length)];
            displayQuote(randomQuote, true);
            // Play the coin sound when score increases
            if (soundEnabled && coinGetSound) {
                coinGetSound.play();
            }
        }
    } else if (score < previousScore) {
        // Score decreased by 1
        if (previousScore - score === 1) {
            const randomQuote = NEGATIVE_QUOTES_90S[Math.floor(Math.random() * NEGATIVE_QUOTES_90S.length)];
            displayQuote(randomQuote, false);
            // Play a negative sound if you have one
            if (soundEnabled && bubbleMissSound) {
                bubbleMissSound.play();
            }
        }
    }
    
    // Update the combined score display
    updateScoreDisplay();
    
    // Check for win condition - all pegs have rings
    if (score > 0 && score === totalRings) {
        // Only show victory message if we haven't shown it already for this game session
        if (!window.victoryMessageShown) {
            window.victoryMessageShown = true;
            
            // Short delay before showing victory message to let the last coin sound play
            setTimeout(() => {
                showVictoryMessage();
            }, 500);
        }
    }
}

// Also, make sure to initialize the high score element when the game starts
// Add this to your startDemo or initGraphics function
function initScoreElements() {
    // Create score element if it doesn't exist
    if (!scoreElement) {
        scoreElement = document.createElement('div');
        scoreElement.style.position = 'absolute';
        scoreElement.style.top = '40px';
        scoreElement.style.left = '20px';
        scoreElement.style.color = 'white';
        scoreElement.style.fontFamily = 'Arial, sans-serif';
        scoreElement.style.fontSize = '20px';
        scoreElement.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
        scoreElement.style.backgroundColor = 'rgba(0,0,0,0.5)';
        scoreElement.style.padding = '10px 15px';
        scoreElement.style.borderRadius = '10px';
        document.body.appendChild(scoreElement);
    }
    
    // Initialize high score to 0 for each session
    highScore = 0;
    
    // Update the score display to show both score and high score
    updateScoreDisplay();
}

// New function to update the combined score display
function updateScoreDisplay() {
    if (scoreElement) {
        scoreElement.innerHTML = `Score: <span style="color: white;">${score}</span> | High Score: <span style="color: yellow;">${highScore}</span>`;
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

// Function to start the tank intro animation when the game first loads
function startTankIntroAnimation() {
    // Calculate the tank position (use the same calculation as in createTank)
    const tankHeight = 40;
    const tankY = FLOOR_HEIGHT + tankHeight/2 + 1;
    const tankPosition = new THREE.Vector3(0, tankY, 0);
    
    // Store original camera position and target for restoration later
    const originalCameraPosition = camera.position.clone();
    const originalControlsTarget = controls.target.clone();
    
    // Set up animation parameters
    let animationDuration = 5000; // 5 seconds for the full rotation
    let startTime = performance.now();
    let animationComplete = false;
    
    // Update controls target to focus on tank
    controls.target.copy(tankPosition);
    
    // Position camera for a good view of the tank
    const distanceFromTank = 50;
    camera.position.set(
        tankPosition.x + distanceFromTank, 
        tankPosition.y + 10, 
        tankPosition.z
    );
    
    // Create the animation function
    function updateTankIntroAnimation() {
        if (animationComplete) return;
        
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / animationDuration, 1);
        
        // Rotate camera around the tank
        const angle = progress * Math.PI * 2; // Complete 360° rotation
        camera.position.x = tankPosition.x + Math.sin(angle) * distanceFromTank;
        camera.position.z = tankPosition.z + Math.cos(angle) * distanceFromTank;
        camera.lookAt(tankPosition);
        
        if (progress < 1) {
            // Continue animation
            requestAnimationFrame(updateTankIntroAnimation);
        } else {
            // Animation complete
            animationComplete = true;
            
            // Just enable controls without transitioning back to original position
            // This keeps the camera at the current position after rotation
            controls.enabled = true;
            
            // Show the drag instruction message
            showDragInstructionMessage();
        }
    }
    
    // Start the animation
    updateTankIntroAnimation();
}

// Function to show a message informing users they can drag to spin the game
function showDragInstructionMessage() {
    // Create the message element
    const message = document.createElement('div');
    message.id = 'drag-instruction';
    message.style.position = 'absolute';
    message.style.top = '50%'; // Center vertically
    message.style.left = '50%';
    message.style.transform = 'translate(-50%, -50%)';
    message.style.fontSize = '24px';
    message.style.fontWeight = 'bold';
    message.style.color = '#ffffff';
    message.style.textShadow = '0 0 10px rgba(0, 0, 0, 0.7)';
    message.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    message.style.padding = '12px 20px';
    message.style.borderRadius = '10px';
    message.style.opacity = '0';
    message.style.transition = 'opacity 0.8s';
    message.style.zIndex = '1000';
    message.style.pointerEvents = 'none'; // Make sure it doesn't interfere with clicks
    message.textContent = 'DRAG TO SPIN THE GAME';
    document.body.appendChild(message);
    
    // Fade in
    setTimeout(() => {
        message.style.opacity = '1';
    }, 300);
    
    // Fade out after 4 seconds
    setTimeout(() => {
        message.style.opacity = '0';
    }, 4300);
    
    // Remove from DOM after fade out and show bubble instruction
    setTimeout(() => {
        if (message.parentNode) {
            document.body.removeChild(message);
        }
        // Show the bubble instruction after the first message is gone
        showBubbleInstructionMessage();
    }, 5100);
}

// Function to show a message about the bubble controls
function showBubbleInstructionMessage() {
    // Create the message element
    const message = document.createElement('div');
    message.id = 'bubble-instruction';
    message.style.position = 'absolute';
    message.style.top = '50%'; // Center vertically
    message.style.left = '50%';
    message.style.transform = 'translate(-50%, -50%)';
    message.style.fontSize = '24px';
    message.style.fontWeight = 'bold';
    message.style.color = '#ffffff';
    message.style.textShadow = '0 0 10px rgba(0, 0, 0, 0.7)';
    message.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    message.style.padding = '12px 20px';
    message.style.borderRadius = '10px';
    message.style.opacity = '0';
    message.style.transition = 'opacity 0.8s';
    message.style.zIndex = '1000';
    message.style.pointerEvents = 'none'; // Make sure it doesn't interfere with clicks
    message.textContent = 'TAP BUBBLE BUTTON OR HOLD FOR MORE BUBBLES';
    document.body.appendChild(message);
    
    // Fade in
    setTimeout(() => {
        message.style.opacity = '1';
    }, 300);
    
    // Fade out after 4 seconds
    setTimeout(() => {
        message.style.opacity = '0';
    }, 4300);
    
    // Remove from DOM after fade out
    setTimeout(() => {
        if (message.parentNode) {
            document.body.removeChild(message);
        }
    }, 5100);
}

// Apply camera shake effect
function applyCameraShake() {
    // Remove previous shake offset if it exists
    if (cameraShakeOffset) {
        camera.position.x -= cameraShakeOffset.x;
        camera.position.y -= cameraShakeOffset.y;
    }
    
    // Only update the shake every few frames for more subtle effect
    cameraShakeTimer++;
    if (cameraShakeTimer < 2) {
        // Skip this frame for smoother, less jittery shake
        if (cameraShakeOffset) {
            // Re-apply the existing offset
            camera.position.x += cameraShakeOffset.x;
            camera.position.y += cameraShakeOffset.y;
        }
        return;
    }
    
    // Reset timer
    cameraShakeTimer = 0;
    
    // Generate new random shake offset with reduced intensity
    cameraShakeOffset = {
        x: (Math.random() * 2 - 1) * cameraShakeIntensity,
        y: (Math.random() * 2 - 1) * cameraShakeIntensity * 0.3 // Further reduced vertical shake
    };
    
    // Apply new shake offset
    camera.position.x += cameraShakeOffset.x;
    camera.position.y += cameraShakeOffset.y;
}

function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = clock.getDelta();
    updatePhysics(deltaTime);
    
    // Apply camera shake if active
    if (isShakingCamera) {
        applyCameraShake();
    }
    
    renderer.render(scene, camera);
    controls.update();
}

// Function to show fancy victory message and play fanfare when player wins
function showVictoryMessage() {
    // Create a victory container for the message
    const victoryContainer = document.createElement('div');
    victoryContainer.id = 'victory-container';
    victoryContainer.style.position = 'absolute';
    victoryContainer.style.top = '0';
    victoryContainer.style.left = '0';
    victoryContainer.style.width = '100%';
    victoryContainer.style.height = '100%';
    victoryContainer.style.display = 'flex';
    victoryContainer.style.flexDirection = 'column';
    victoryContainer.style.justifyContent = 'center';
    victoryContainer.style.alignItems = 'center';
    victoryContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    victoryContainer.style.zIndex = '1000';
    victoryContainer.style.opacity = '0';
    victoryContainer.style.transition = 'opacity 1s ease-in-out';
    document.body.appendChild(victoryContainer);
    
    // Create the main victory message
    const victoryMessage = document.createElement('div');
    victoryMessage.textContent = 'YOU WIN!';
    victoryMessage.style.color = 'gold';
    victoryMessage.style.fontSize = '5rem';
    victoryMessage.style.fontWeight = 'bold';
    victoryMessage.style.textShadow = '0 0 20px rgba(255, 223, 0, 0.8)';
    victoryMessage.style.marginBottom = '30px';
    victoryMessage.style.fontFamily = 'Arial, sans-serif';
    victoryMessage.style.transform = 'scale(0.5)';
    victoryMessage.style.opacity = '0';
    victoryMessage.style.transition = 'transform 1s ease-out, opacity 1s ease-out';
    victoryContainer.appendChild(victoryMessage);
    
    // Create the sub-message
    const subMessage = document.createElement('div');
    subMessage.textContent = 'Perfect Score! All Rings Placed!';
    subMessage.style.color = 'white';
    subMessage.style.fontSize = '2rem';
    subMessage.style.fontWeight = 'bold';
    subMessage.style.textShadow = '0 0 10px rgba(255, 255, 255, 0.6)';
    subMessage.style.opacity = '0';
    subMessage.style.transform = 'translateY(20px)';
    subMessage.style.transition = 'opacity 1s ease-out 0.5s, transform 1s ease-out 0.5s';
    victoryContainer.appendChild(subMessage);
    
    // Create a replay button
    const replayButton = document.createElement('button');
    replayButton.textContent = 'Play Again';
    replayButton.style.marginTop = '40px';
    replayButton.style.padding = '15px 30px';
    replayButton.style.fontSize = '1.5rem';
    replayButton.style.fontWeight = 'bold';
    replayButton.style.backgroundColor = '#4facfe';
    replayButton.style.color = 'white';
    replayButton.style.border = 'none';
    replayButton.style.borderRadius = '10px';
    replayButton.style.cursor = 'pointer';
    replayButton.style.boxShadow = '0 0 15px rgba(79, 172, 254, 0.7)';
    replayButton.style.opacity = '0';
    replayButton.style.transform = 'translateY(20px)';
    replayButton.style.transition = 'opacity 1s ease-out 1s, transform 1s ease-out 1s, background-color 0.3s';
    replayButton.onmouseover = function() {
        this.style.backgroundColor = '#3a8cd5';
    };
    replayButton.onmouseout = function() {
        this.style.backgroundColor = '#4facfe';
    };
    replayButton.onclick = function() {
        document.body.removeChild(victoryContainer);
        // Reset game
        dropRingsOnSlope();
    };
    victoryContainer.appendChild(replayButton);
    
    // Animate in the container
    setTimeout(() => {
        victoryContainer.style.opacity = '1';
    }, 100);
    
    // Animate in the elements with staggered timing
    setTimeout(() => {
        victoryMessage.style.transform = 'scale(1)';
        victoryMessage.style.opacity = '1';
    }, 600);
    
    setTimeout(() => {
        subMessage.style.opacity = '1';
        subMessage.style.transform = 'translateY(0)';
    }, 1000);
    
    setTimeout(() => {
        replayButton.style.opacity = '1';
        replayButton.style.transform = 'translateY(0)';
    }, 1500);
    
    // Play the victory fanfare
    if (soundEnabled && victoryFanfareSound) {
        victoryFanfareSound.currentTime = 0;
        victoryFanfareSound.play().catch(err => {
            console.log("Could not play victory fanfare:", err);
        });
    }
}