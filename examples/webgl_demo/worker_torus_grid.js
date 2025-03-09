var Module = { TOTAL_MEMORY: 512*1024*1024 };

importScripts('../../builds/ammo.js');

Ammo().then(function(Ammo) {
  var NUM = 0, NUMRANGE = [];
  var TORUS_RADIUS = 1.0;
  var TUBE_RADIUS = 0.3;
  var RINGS_PER_ROW = 4;
  var ROW_SPACING = 3.0;
  var RING_SPACING = 3.0;

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

  function createTorusShape() {
    // Create a convex hull shape approximation of a torus
    var vertices = [];
    var numSegments = 16;
    var numPoints = 8;
    
    // Generate points around the torus
    for (var i = 0; i < numSegments; i++) {
      var theta = (i / numSegments) * Math.PI * 2;
      var centerX = TORUS_RADIUS * Math.cos(theta);
      var centerZ = TORUS_RADIUS * Math.sin(theta);
      
      for (var j = 0; j < numPoints; j++) {
        var phi = (j / numPoints) * Math.PI * 2;
        var x = centerX + TUBE_RADIUS * Math.cos(phi) * Math.cos(theta);
        var y = TUBE_RADIUS * Math.sin(phi);
        var z = centerZ + TUBE_RADIUS * Math.cos(phi) * Math.sin(theta);
        vertices.push(new Ammo.btVector3(x, y, z));
      }
    }

    // Create convex hull shape from vertices
    var shape = new Ammo.btConvexHullShape();
    for (var i = 0; i < vertices.length; i++) {
      shape.addPoint(vertices[i]);
    }
    
    // Optimize the shape for better performance
    shape.setMargin(0.05);
    shape.initializePolyhedralFeatures();
    
    return shape;
  }

  var torusShape = createTorusShape();

  function resetPositions() {
    var numRows = Math.ceil(NUM / RINGS_PER_ROW);
    var i = 1;
    
    // Calculate the total width of the grid
    var totalWidth = (RINGS_PER_ROW - 1) * RING_SPACING;
    var startX = -totalWidth / 2;
    
    // Start height for the grid (slightly above ground)
    var startHeight = 10;
    
    for (var row = 0; row < numRows; row++) {
      for (var col = 0; col < RINGS_PER_ROW; col++) {
        if (i >= bodies.length) break;
        
        var body = bodies[i++];
        var origin = body.getWorldTransform().getOrigin();
        
        // Position rings in a grid pattern
        origin.setX(startX + col * RING_SPACING);
        origin.setY(startHeight + row * ROW_SPACING);
        origin.setZ(-row * (ROW_SPACING * 0.5)); // Slight z-offset for better visibility
        
        body.activate();
        
        // Set initial rotation to make rings stand upright
        var rotation = body.getWorldTransform().getRotation();
        var angle = Math.PI / 2; // 90 degrees to stand upright
        rotation.setRotation(new Ammo.btVector3(1, 0, 0), angle);
      }
    }
  }

  function startUp() {
    NUMRANGE.forEach(function(i) {
      var startTransform = new Ammo.btTransform();
      startTransform.setIdentity();
      var mass = 1;
      var localInertia = new Ammo.btVector3(0, 0, 0);
      torusShape.calculateLocalInertia(mass, localInertia);

      var myMotionState = new Ammo.btDefaultMotionState(startTransform);
      var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, myMotionState, torusShape, localInertia);
      var body = new Ammo.btRigidBody(rbInfo);

      // Add some damping to make the simulation more stable
      body.setDamping(0.1, 0.1);
      body.setFriction(0.8);
      body.setRestitution(0.3);

      dynamicsWorld.addRigidBody(body);
      bodies.push(body);
    });

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

  var nextTimeToRestart = 0;
  function timeToRestart() {
    if (nextTimeToRestart) {
      if (Date.now() >= nextTimeToRestart) {
        nextTimeToRestart = 0;
        return true;
      }
      return false;
    }
    for (var i = 1; i <= NUM; i++) {
      var body = bodies[i];
      if (!body.isActive()) {
        nextTimeToRestart = Date.now() + 2000; // Wait longer before reset
        break;
      }
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

    var data = { objects: [], currFPS: Math.round(1000/meanDt), allFPS: Math.round(1000/meanDt2) };

    // Read bullet data into JS objects
    for (var i = 0; i < NUM; i++) {
      var object = [];
      readBulletObject(i+1, object);
      data.objects[i] = object;
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
    RINGS_PER_ROW = data.ringsPerRow;
    ROW_SPACING = data.rowSpacing;
    RING_SPACING = data.ringSpacing;
    
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