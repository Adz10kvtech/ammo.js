var Module = { TOTAL_MEMORY: 512*1024*1024 };

importScripts('../../builds/ammo.js');

Ammo().then(function(Ammo) {
  var NUM = 0, NUMRANGE = [];
  var TORUS_RADIUS = 1.0;
  var TUBE_RADIUS = 0.3;
  var NUM_PEGS = 5;
  
  // Add cloth variables
  var clothSoftBody;
  var clothWidth = 30;
  var clothHeight = 30;
  var clothNumSegmentsX = 15;
  var clothNumSegmentsY = 15;
  var isPullingCloth = false;
  var clothPullDirection = new Ammo.btVector3(0, 10, 0);
  var pullingAnchorIndex = -1;
  
  // Update physics initialization to include softbody
  var collisionConfiguration = new Ammo.btSoftBodyRigidBodyCollisionConfiguration();
  var dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
  var overlappingPairCache = new Ammo.btDbvtBroadphase();
  var solver = new Ammo.btSequentialImpulseConstraintSolver();
  var softBodySolver = new Ammo.btDefaultSoftBodySolver();
  var dynamicsWorld = new Ammo.btSoftRigidDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration, softBodySolver);
  dynamicsWorld.setGravity(new Ammo.btVector3(0, -3.0, 0));
  dynamicsWorld.getWorldInfo().set_m_gravity(new Ammo.btVector3(0, -3.0, 0));

  // ... existing code ...

  // Add function to create cloth
  function setupCloth() {
    var tankDepth = 4;
    var tankWidth = 24;
    var tankHeight = 25;
    
    // Create cloth positioned to drape over the tank
    var clothPos = new Ammo.btVector3(0, tankHeight/2 + 5, 0);
    
    var clothCorner00 = new Ammo.btVector3(clothPos.x() - clothWidth/2, clothPos.y(), clothPos.z() - clothHeight/2);
    var clothCorner01 = new Ammo.btVector3(clothPos.x() - clothWidth/2, clothPos.y(), clothPos.z() + clothHeight/2);
    var clothCorner10 = new Ammo.btVector3(clothPos.x() + clothWidth/2, clothPos.y(), clothPos.z() - clothHeight/2);
    var clothCorner11 = new Ammo.btVector3(clothPos.x() + clothWidth/2, clothPos.y(), clothPos.z() + clothHeight/2);
    
    var softBodyHelpers = new Ammo.btSoftBodyHelpers();
    clothSoftBody = softBodyHelpers.CreatePatch(
      dynamicsWorld.getWorldInfo(),
      clothCorner00, clothCorner01, clothCorner10, clothCorner11,
      clothNumSegmentsX + 1, clothNumSegmentsY + 1,
      0, true
    );
    
    var sbConfig = clothSoftBody.get_m_cfg();
    sbConfig.set_viterations(10);
    sbConfig.set_piterations(10);
    sbConfig.set_kDF(0.5); // Dynamic friction coefficient
    sbConfig.set_kDP(0.01); // Damping coefficient
    
    clothSoftBody.setTotalMass(1.0, false);
    Ammo.castObject(clothSoftBody, Ammo.btCollisionObject).getCollisionShape().setMargin(0.05);
    
    // Set material properties for better cloth behavior
    clothSoftBody.get_m_materials().at(0).set_m_kLST(0.8); // Linear stiffness
    clothSoftBody.get_m_materials().at(0).set_m_kAST(0.8); // Angular stiffness
    
    // Disable deactivation
    clothSoftBody.setActivationState(4);
    
    // Add the cloth to the world
    dynamicsWorld.addSoftBody(clothSoftBody, 1, -1);
    
    // Set fixed points to help position the cloth initially
    // These will be released after the cloth settles
    pullingAnchorIndex = (clothNumSegmentsX + 1) * (clothNumSegmentsY + 1) / 2; // Center point
    
    // Add extra function to reset cloth
    resetCloth();
  }
  
  function resetCloth() {
    if (!clothSoftBody) return;
    
    // Remove from world
    dynamicsWorld.removeSoftBody(clothSoftBody);
    
    // Recreate cloth
    setupCloth();
    
    isPullingCloth = false;
  }
  
  function pullCloth() {
    if (!clothSoftBody) return;
    
    // Find center node of cloth to pull
    var nodes = clothSoftBody.get_m_nodes();
    var centerNodeIndex = Math.floor((clothNumSegmentsX + 1) * (clothNumSegmentsY + 1) / 2);
    
    // Apply a upward force to the center node
    var centerNode = nodes.at(centerNodeIndex);
    var pullForce = new Ammo.btVector3(0, 20, 0);
    clothSoftBody.addForce(pullForce, centerNodeIndex);
    
    isPullingCloth = true;
  }

  function startUp() {
    // ... existing code ...
    
    // Create toruses
    NUMRANGE.forEach(function(i) {
      // ... existing torus code ...
    });

    // Create fixed pegs and tank
    setupPegs();
    setupTank();
    setupCloth(); // Add cloth setup
    
    resetPositions();
  }

  // ... existing code ...

  // Update the simulate function to collect cloth data
  function simulate(dt) {
    dt = dt || 1;

    dynamicsWorld.stepSimulation(dt, 2);
    
    // ... existing code ...

    var data = { 
      objects: [], 
      pegs: [],
      balls: [],
      tankPanels: [],
      currFPS: Math.round(1000/meanDt), 
      allFPS: Math.round(1000/meanDt2) 
    };

    // ... existing code for toruses, pegs, balls, tanks ...
    
    // Add cloth data
    if (clothSoftBody) {
      var nodes = clothSoftBody.get_m_nodes();
      var numNodes = nodes.size();
      var clothVertices = new Float32Array(numNodes * 3);
      
      for (var i = 0; i < numNodes; i++) {
        var node = nodes.at(i);
        var pos = node.get_m_x();
        clothVertices[i * 3] = pos.x();
        clothVertices[i * 3 + 1] = pos.y();
        clothVertices[i * 3 + 2] = pos.z();
      }
      
      data.clothVertices = clothVertices;
    }

    postMessage(data);

    if (timeToRestart()) resetPositions();
  }

  // ... existing code ...

  onmessage = function(event) {
    var data = event.data;
    
    // Handle cloth commands
    if (data.command === 'pullCloth') {
      pullCloth();
      return;
    }
    
    if (data.command === 'resetCloth') {
      resetCloth();
      return;
    }
    
    // ... existing handling for force commands and initialization ...
  };
  
  postMessage({isReady: true});
}); 