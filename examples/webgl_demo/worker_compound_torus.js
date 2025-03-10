var Module = { TOTAL_MEMORY: 512*1024*1024 };

importScripts('../../builds/ammo.js');

Ammo().then(function(Ammo) {
  var NUM = 0, NUMRANGE = [];
  var TORUS_RADIUS = 1.0;  // Major radius (distance from center to middle of tube)
  var TUBE_RADIUS = 0.3;   // Minor radius (thickness of the tube)
  var NUM_PEGS = 5;        // Number of fixed pegs to demonstrate hole penetration
  
  // Bullet-interfacing code
  var collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
  var dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
  var overlappingPairCache = new Ammo.btDbvtBroadphase();
  var solver = new Ammo.btSequentialImpulseConstraintSolver();
  var dynamicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
  dynamicsWorld.setGravity(new Ammo.btVector3(0, -3.0, 0));

  // Create ground shape
  var groundShape = new Ammo.btBoxShape(new Ammo.btVector3(50, 50, 50));

  var bodies = [];
  var pegs = [];
  var smallBalls = []; // Small objects that can pass through holes
  var tankPanels = []; // Tank panels for the water ring game
  
  // Set up ground
  var groundTransform = new Ammo.btTransform();
  groundTransform.setIdentity();
  groundTransform.setOrigin(new Ammo.btVector3(0, -56, 0));

  (function() {
    var mass = 0;
    var localInertia = new Ammo.btVector3(0, 0, 0);
    var myMotionState = new Ammo.btDefaultMotionState(groundTransform);
    var rbInfo = new Ammo.btRigidBodyConstructionInfo(0, myMotionState, groundShape, localInertia);
    var body = new Ammo.btRigidBody(rbInfo);

    dynamicsWorld.addRigidBody(body);
    bodies.push(body);
  })();

  // Create a compound shape for the torus
  function createTorusShape() {
    var compoundShape = new Ammo.btCompoundShape();
    var segments = 16;
    
    for (var i = 0; i < segments; i++) {
      var angle = (i / segments) * Math.PI * 2;
      
      // Create a cylinder for each segment
      // Note: We're using X-Z plane for the circle, with Y as up
      var cylinderShape = new Ammo.btCylinderShape(
        new Ammo.btVector3(TUBE_RADIUS, TUBE_RADIUS, TORUS_RADIUS * 0.25)
      );
      
      // Position the cylinder
      var transform = new Ammo.btTransform();
      transform.setIdentity();
      
      // Calculate position on the ring (in X-Z plane)
      var x = TORUS_RADIUS * Math.cos(angle);
      var z = TORUS_RADIUS * Math.sin(angle);
      transform.setOrigin(new Ammo.btVector3(x, 0, z));
      
      // Rotate to form the ring
      var q = new Ammo.btQuaternion();
      q.setRotation(new Ammo.btVector3(0, 1, 0), angle + Math.PI/2);
      transform.setRotation(q);
      
      compoundShape.addChildShape(transform, cylinderShape);
    }
    
    return compoundShape;
  }

  // Create the peg shape (vertical pin with cylindrical base)
  function createPegShape() {
    // Create a compound shape for the peg
    var compoundShape = new Ammo.btCompoundShape();
    
    // Create the pin shape (thin vertical cylinder)
    var pinShape = new Ammo.btCylinderShape(new Ammo.btVector3(0.15, 1.25, 0.15)); // Height 2.5 (half-height is 1.25)
    
    // Create the base shape (cylinder)
    var baseShape = new Ammo.btCylinderShape(new Ammo.btVector3(1.5, 0.25, 1.5)); // Radius 1.5, height 0.5 (half-height 0.25)
    
    // Set transforms for each shape
    var pinTransform = new Ammo.btTransform();
    pinTransform.setIdentity();
    pinTransform.setOrigin(new Ammo.btVector3(0, 2.05, 0)); // Adjusted to 2.05 based on new height
    
    var baseTransform = new Ammo.btTransform();
    baseTransform.setIdentity();
    baseTransform.setOrigin(new Ammo.btVector3(0, 0.55, 0)); // Adjusted for cylinder height
    
    // Add shapes to compound
    compoundShape.addChildShape(pinTransform, pinShape);
    compoundShape.addChildShape(baseTransform, baseShape);
    
    return compoundShape;
  }

  // Create small balls that can pass through torus holes
  function createBallShape() {
    return new Ammo.btSphereShape(TORUS_RADIUS * 0.4); // Smaller than the hole
  }

  function setupPegs() {
    var tankHeight = 40; // Match the tank height from setupTank (increased from 25 to 40)
    
    for (var i = 0; i < NUM_PEGS; i++) {
      // Vary the height of each peg - with HALVED heights
      var pegHeight = 5.0 + (i * 0.75);  // Heights will be 5.0, 5.75, 6.5, 7.25, 8.0 (half of previous values)
      
      var pegShape = createPegShape();
      var pegTransform = new Ammo.btTransform();
      pegTransform.setIdentity();
      
      // Position pegs evenly spaced in a row
      var x = (i - (NUM_PEGS/2)) * 4;
      
      // Position pegs so their bottom is at y=0
      var y = pegHeight/2;  // Half height because cylinder is centered
      
      pegTransform.setOrigin(new Ammo.btVector3(x, y, 0));
      
      var mass = 0; // Static (fixed) object
      var localInertia = new Ammo.btVector3(0, 0, 0);
      var myMotionState = new Ammo.btDefaultMotionState(pegTransform);
      var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, myMotionState, pegShape, localInertia);
      var body = new Ammo.btRigidBody(rbInfo);
      
      dynamicsWorld.addRigidBody(body);
      pegs.push(body);
    }
  }

  function setupSmallBalls() {
    var ballShape = createBallShape();
    
    for (var i = 0; i < 10; i++) {
      var ballTransform = new Ammo.btTransform();
      ballTransform.setIdentity();
      
      // Position balls above the pegs
      var x = (Math.random() - 0.5) * NUM_PEGS * 4;
      ballTransform.setOrigin(new Ammo.btVector3(x, 10 + i, -10));
      
      var mass = 0.5; // Lighter than toruses
      var localInertia = new Ammo.btVector3(0, 0, 0);
      ballShape.calculateLocalInertia(mass, localInertia);
      
      var myMotionState = new Ammo.btDefaultMotionState(ballTransform);
      var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, myMotionState, ballShape, localInertia);
      var body = new Ammo.btRigidBody(rbInfo);
      
      // Add water-like physics properties
      body.setDamping(0.7, 0.7);   // High damping for water resistance
      body.setRestitution(0.5);    // Medium bounciness
      body.setFriction(0.3);       // Low friction in water
      
      dynamicsWorld.addRigidBody(body);
      smallBalls.push(body);
    }
  }

  function resetPositions() {
    // Position each torus directly above a peg
    for (var i = 1; i <= NUM; i++) {
      if (i >= bodies.length) break;
      
      var body = bodies[i];
      var transform = body.getWorldTransform();
      var origin = transform.getOrigin();
      
      // Calculate which peg to position above
      var pegIndex = (i-1) % NUM_PEGS;
      var pegX = (pegIndex - (NUM_PEGS/2)) * 4;
      
      // Position torus directly above the peg
      origin.setX(pegX);
      origin.setY(7 + Math.floor((i-1)/NUM_PEGS) * 2); // Increased from 10 to 20
      origin.setZ(0); // Centered on z-axis
      
      // Set rotation so the hole faces down (horizontal orientation)
      // For a torus to slide onto a vertical peg, we need the hole axis to be vertical
      var q = new Ammo.btQuaternion();
      // No rotation needed - the compound shape is already created with the hole facing up/down
      q.setRotation(new Ammo.btVector3(1, 0, 0), 0); // Identity rotation
      transform.setRotation(q);
      
      body.setWorldTransform(transform);
      body.activate();
    }
    
    // Reset the small balls
    for (var i = 0; i < smallBalls.length; i++) {
      var body = smallBalls[i];
      var origin = body.getWorldTransform().getOrigin();
      
      // Position balls above the pegs
      var pegIndex = i % NUM_PEGS;
      var pegX = (pegIndex - (NUM_PEGS/2)) * 4;
      
      origin.setX(pegX);
      origin.setY(30); // Increased from 20 to 30
      origin.setZ(0);
      
      body.activate();
    }
  }

  // Create a tank shape for water ring game
  function createTankShape(width, height, depth) {
    return new Ammo.btBoxShape(new Ammo.btVector3(width/2, height/2, depth/2));
  }

  // Set up tank for water ring game
  function setupTank() {
    var tankDepth = 4;  // Reduced from 8 to 4 (50% thinner)
    var tankWidth = 24;  // Wide enough to cover all pegs with some margin
    var tankHeight = 40;  // Increased from 25 to 40 for a taller tank
    var panelThickness = 0.05;
    
    // Create front panel
    var frontShape = createTankShape(tankWidth, tankHeight, panelThickness);
    var frontTransform = new Ammo.btTransform();
    frontTransform.setIdentity();
    frontTransform.setOrigin(new Ammo.btVector3(0, 0, tankDepth/2));
    
    var mass = 0; // Static object
    var localInertia = new Ammo.btVector3(0, 0, 0);
    var myMotionState = new Ammo.btDefaultMotionState(frontTransform);
    var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, myMotionState, frontShape, localInertia);
    var body = new Ammo.btRigidBody(rbInfo);
    
    dynamicsWorld.addRigidBody(body);
    tankPanels.push(body);
    
    // Create back panel
    var backShape = createTankShape(tankWidth, tankHeight, panelThickness);
    var backTransform = new Ammo.btTransform();
    backTransform.setIdentity();
    backTransform.setOrigin(new Ammo.btVector3(0, 0, -tankDepth/2));
    
    myMotionState = new Ammo.btDefaultMotionState(backTransform);
    rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, myMotionState, backShape, localInertia);
    body = new Ammo.btRigidBody(rbInfo);
    
    dynamicsWorld.addRigidBody(body);
    tankPanels.push(body);
    
    // Create left panel
    var leftShape = createTankShape(panelThickness, tankHeight, tankDepth);
    var leftTransform = new Ammo.btTransform();
    leftTransform.setIdentity();
    leftTransform.setOrigin(new Ammo.btVector3(-tankWidth/2, 0, 0));
    
    myMotionState = new Ammo.btDefaultMotionState(leftTransform);
    rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, myMotionState, leftShape, localInertia);
    body = new Ammo.btRigidBody(rbInfo);
    
    dynamicsWorld.addRigidBody(body);
    tankPanels.push(body);
    
    // Create right panel
    var rightShape = createTankShape(panelThickness, tankHeight, tankDepth);
    var rightTransform = new Ammo.btTransform();
    rightTransform.setIdentity();
    rightTransform.setOrigin(new Ammo.btVector3(tankWidth/2, 0, 0));
    
    myMotionState = new Ammo.btDefaultMotionState(rightTransform);
    rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, myMotionState, rightShape, localInertia);
    body = new Ammo.btRigidBody(rbInfo);
    
    dynamicsWorld.addRigidBody(body);
    tankPanels.push(body);
    
    // Create top panel
    var topShape = createTankShape(tankWidth, panelThickness, tankDepth);
    var topTransform = new Ammo.btTransform();
    topTransform.setIdentity();
    topTransform.setOrigin(new Ammo.btVector3(0, tankHeight/2, 0));
    
    myMotionState = new Ammo.btDefaultMotionState(topTransform);
    rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, myMotionState, topShape, localInertia);
    body = new Ammo.btRigidBody(rbInfo);
    
    dynamicsWorld.addRigidBody(body);
    tankPanels.push(body);
    
    // Create bottom panel
    var bottomShape = createTankShape(tankWidth, panelThickness, tankDepth);
    var bottomTransform = new Ammo.btTransform();
    bottomTransform.setIdentity();
    bottomTransform.setOrigin(new Ammo.btVector3(0, -tankHeight/2, 0));
    
    myMotionState = new Ammo.btDefaultMotionState(bottomTransform);
    rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, myMotionState, bottomShape, localInertia);
    body = new Ammo.btRigidBody(rbInfo);
    
    dynamicsWorld.addRigidBody(body);
    tankPanels.push(body);
  }

  function startUp() {
    var torusShape = createTorusShape();
    
    // Create toruses
    NUMRANGE.forEach(function(i) {
      var startTransform = new Ammo.btTransform();
      startTransform.setIdentity();
      
      var mass = 1;
      var localInertia = new Ammo.btVector3(0, 0, 0);
      torusShape.calculateLocalInertia(mass, localInertia);

      var myMotionState = new Ammo.btDefaultMotionState(startTransform);
      var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, myMotionState, torusShape, localInertia);
      var body = new Ammo.btRigidBody(rbInfo);

      // Add damping for water-like resistance
      body.setDamping(0.3, 0.3); // Increased linear and angular damping for water resistance
      body.setFriction(0.4);      // Reduced friction slightly
      body.setRestitution(0.2);   // Reduced bounciness

      dynamicsWorld.addRigidBody(body);
      bodies.push(body);
    });

    // Create fixed pegs and small balls
    setupPegs();
    setupTank(); // Add the tank
    
    resetPositions();
  }

  var transform = new Ammo.btTransform();

  function readBulletObject(i, object) {
    var body = bodies[i];
    body.getMotionState().getWorldTransform(transform);
    var origin = transform.getOrigin();
    object[0] = origin.x();
    object[1] = origin.y();
    object[2] = origin.z();
    var rotation = transform.getRotation();
    object[3] = rotation.x();
    object[4] = rotation.y();
    object[5] = rotation.z();
    object[6] = rotation.w();
  }
  
  function readBulletPeg(i, object) {
    var body = pegs[i];
    body.getMotionState().getWorldTransform(transform);
    var origin = transform.getOrigin();
    object[0] = origin.x();
    object[1] = origin.y();
    object[2] = origin.z();
    var rotation = transform.getRotation();
    object[3] = rotation.x();
    object[4] = rotation.y();
    object[5] = rotation.z();
    object[6] = rotation.w();
  }
  
  function readBulletBall(i, object) {
    var body = smallBalls[i];
    body.getMotionState().getWorldTransform(transform);
    var origin = transform.getOrigin();
    object[0] = origin.x();
    object[1] = origin.y();
    object[2] = origin.z();
    var rotation = transform.getRotation();
    object[3] = rotation.x();
    object[4] = rotation.y();
    object[5] = rotation.z();
    object[6] = rotation.w();
  }
  
  // Read tank panel data
  function readBulletTankPanel(i, object) {
    var body = tankPanels[i];
    body.getMotionState().getWorldTransform(transform);
    var origin = transform.getOrigin();
    object[0] = origin.x();
    object[1] = origin.y();
    object[2] = origin.z();
    var rotation = transform.getRotation();
    object[3] = rotation.x();
    object[4] = rotation.y();
    object[5] = rotation.z();
    object[6] = rotation.w();
  }

  var nextTimeToRestart = 0;
  function timeToRestart() {
    if (nextTimeToRestart) {
      if (Date.now() >= nextTimeToRestart) {
        nextTimeToRestart = 0;
        return true;
      }
      return false;
    }
    
    // Check if all objects have settled
    var allSleeping = true;
    for (var i = 1; i <= NUM; i++) {
      if (i < bodies.length && bodies[i].isActive()) {
        allSleeping = false;
        break;
      }
    }
    
    for (var i = 0; i < smallBalls.length; i++) {
      if (smallBalls[i].isActive()) {
        allSleeping = false;
        break;
      }
    }
    
    if (allSleeping) {
      nextTimeToRestart = Date.now() + 3000; // Wait 3 seconds before restarting
    }
    
    return false;
  }

  var meanDt = 0, meanDt2 = 0, frame = 1;

  function simulate(dt) {
    dt = dt || 1;

    dynamicsWorld.stepSimulation(dt, 2);
    
    var alpha;
    if (meanDt > 0) {
      alpha = Math.min(0.1, dt/1000);
    } else {
      alpha = 0.1;
    }
    meanDt = alpha*dt + (1-alpha)*meanDt;

    var alpha2 = 1/frame++;
    meanDt2 = alpha2*dt + (1-alpha2)*meanDt2;

    var data = { 
      objects: [], 
      pegs: [],
      balls: [],
      tankPanels: [], // Add tankPanels to the data
      currFPS: Math.round(1000/meanDt), 
      allFPS: Math.round(1000/meanDt2) 
    };

    // Read torus data
    for (var i = 0; i < NUM; i++) {
      var object = [];
      readBulletObject(i+1, object);
      data.objects[i] = object;
    }
    
    // Read peg data
    for (var i = 0; i < pegs.length; i++) {
      var object = [];
      readBulletPeg(i, object);
      data.pegs[i] = object;
    }
    
    // Read ball data
    for (var i = 0; i < smallBalls.length; i++) {
      var object = [];
      readBulletBall(i, object);
      data.balls[i] = object;
    }
    
    // Read tank panel data
    for (var i = 0; i < tankPanels.length; i++) {
      var object = [];
      readBulletTankPanel(i, object);
      data.tankPanels[i] = object;
    }

    postMessage(data);

    if (timeToRestart()) resetPositions();
  }

  var interval = null;

  // Apply force to all rings
  function applyForceToRings(forceVector) {
    var force = new Ammo.btVector3(forceVector[0], forceVector[1], forceVector[2]);
    
    // Apply to each torus body (starting from index 1, as 0 is the ground)
    for (var i = 1; i <= NUM; i++) {
      if (i < bodies.length) {
        var body = bodies[i];
        
        // Make sure the body is active
        body.activate();
        
        // Apply central force
        body.applyCentralForce(force);
      }
    }
  }
  
  // Apply random forces to rings
  function applyRandomForcesToRings(maxStrength) {
    // Apply to each torus body (starting from index 1, as 0 is the ground)
    for (var i = 1; i <= NUM; i++) {
      if (i < bodies.length) {
        var body = bodies[i];
        
        // Generate random force vector
        var forceX = (Math.random() * 2 - 1) * maxStrength;
        var forceY = (Math.random() * 2 - 1) * maxStrength;
        var forceZ = (Math.random() * 2 - 1) * maxStrength;
        
        var force = new Ammo.btVector3(forceX, forceY, forceZ);
        
        // Make sure the body is active
        body.activate();
        
        // Apply central force
        body.applyCentralForce(force);
      }
    }
  }

  onmessage = function(event) {
    var data = event.data;
    
    // Handle force commands
    if (data.command === 'applyForce') {
      applyForceToRings(data.force);
      return;
    }
    
    if (data.command === 'applyRandomForces') {
      applyRandomForcesToRings(data.maxStrength);
      return;
    }
    
    // Handle initialization data
    NUM = data.num;
    TORUS_RADIUS = data.torusRadius;
    TUBE_RADIUS = data.tubeRadius;
    
    NUMRANGE.length = 0;
    while (NUMRANGE.length < NUM) NUMRANGE.push(NUMRANGE.length+1);

    frame = 1;
    meanDt = meanDt2 = 0;

    startUp();

    var last = Date.now();
    function mainLoop() {
      var now = Date.now();
      simulate(now - last);
      last = now;
    }
    if (interval) clearInterval(interval);
    interval = setInterval(mainLoop, 1000/60);
  };
  
  postMessage({isReady: true});
}); 