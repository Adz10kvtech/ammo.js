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
  dynamicsWorld.setGravity(new Ammo.btVector3(0, -10, 0));

  // Create ground shape
  var groundShape = new Ammo.btBoxShape(new Ammo.btVector3(50, 50, 50));

  var bodies = [];
  var pegs = [];
  var smallBalls = []; // Small objects that can pass through holes
  
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

  // Create the peg shape (vertical cylinder)
  function createPegShape() {
    return new Ammo.btCylinderShape(new Ammo.btVector3(0.15, 4.0, 0.15));
  }

  // Create small balls that can pass through torus holes
  function createBallShape() {
    return new Ammo.btSphereShape(TORUS_RADIUS * 0.4); // Smaller than the hole
  }

  function setupPegs() {
    var pegShape = createPegShape();
    
    for (var i = 0; i < NUM_PEGS; i++) {
      var pegTransform = new Ammo.btTransform();
      pegTransform.setIdentity();
      
      // Position pegs evenly spaced in a row
      var x = (i - (NUM_PEGS/2)) * 4;
      pegTransform.setOrigin(new Ammo.btVector3(x, 0, 0)); // Moved to z=0 (center)
      
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
      
      // Increase bounciness
      body.setRestitution(0.8);
      
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
      origin.setY(10 + Math.floor((i-1)/NUM_PEGS) * 3); // Stack toruses if more than pegs
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
      origin.setY(20); // Higher than toruses
      origin.setZ(0);
      
      body.activate();
    }
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

      // Add damping for stability
      body.setDamping(0.2, 0.2);
      body.setFriction(0.8);
      body.setRestitution(0.3);

      dynamicsWorld.addRigidBody(body);
      bodies.push(body);
    });

    // Create fixed pegs and small balls
    setupPegs();
    setupSmallBalls();
    
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

    postMessage(data);

    if (timeToRestart()) resetPositions();
  }

  var interval = null;

  onmessage = function(event) {
    var data = event.data;
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
  }
  
  postMessage({isReady: true});
}); 