"use strict";

let gl; // The webgl context.
let surface; // A surface model
let shProgram; // A shader program
let spaceball; // A SimpleRotator object that lets the user rotate the view by mouse.
let texture;
let stereoCamera;

let webCamTexture, webCamVideo, webCamBackground;

let orientationEvent = { alpha: 0, beta: 0, gamma: 0 };

let sphere, textureSphere;

let audio = null;
let audioContext, audioSource, audioPanner, audioFilter, cutoffFrequency;

let xPosition = 0;
let yPosition = 0;
let zPosition = 0;

let a = 0.5;
let b = 1;

const deg2rad = (angle) => {
  return (angle * Math.PI) / 180;
};

// Constructor
function Model(name) {
  this.name = name;
  this.iVertexBuffer = gl.createBuffer();
  this.iTextureBuffer = gl.createBuffer();
  this.count = 0;

  this.BufferData = function (vertices, textures) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textures), gl.STREAM_DRAW);

    gl.enableVertexAttribArray(shProgram.iTextureCoords);
    gl.vertexAttribPointer(shProgram.iTextureCoords, 2, gl.FLOAT, false, 0, 0);

    this.count = vertices.length / 3;
  };

  this.Draw = function () {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
    gl.vertexAttribPointer(shProgram.iTextureCoords, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iTextureCoords);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
  };
}

// Constructor
function ShaderProgram(name, program) {
  this.name = name;
  this.prog = program;
  // Location of the attribute variable in the shader program.
  this.iAttribVertex = -1;
  // Location of the uniform matrix representing the combined transformation.
  this.iModelViewProjectionMatrix = -1;
  this.iTextureCoords = -1;
  this.iTextureU = -1;

  this.Use = function () {
    gl.useProgram(this.prog);
  };
}

const leftFrustum = (stereoCamera) => {
  const { eyeSeparation, convergence, aspectRatio, fov, near, far } =
    stereoCamera;
  const top = near * Math.tan(fov / 2);
  const bottom = -top;

  const a = aspectRatio * Math.tan(fov / 2) * convergence;
  const b = a - eyeSeparation / 2;
  const c = a + eyeSeparation / 2;

  const left = (-b * near) / convergence;
  const right = (c * near) / convergence;

  return m4.orthographic(left, right, bottom, top, near, far);
};

const rightFrustum = (stereoCamera) => {
  const { eyeSeparation, convergence, aspectRatio, fov, near, far } =
    stereoCamera;
  const top = near * Math.tan(fov / 2);
  const bottom = -top;

  const a = aspectRatio * Math.tan(fov / 2) * convergence;
  const b = a - eyeSeparation / 2;
  const c = a + eyeSeparation / 2;

  const left = (-c * near) / convergence;
  const right = (b * near) / convergence;
  return m4.orthographic(left, right, bottom, top, near, far);
};

function draw() {
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  let projection = m4.orthographic(0, 1, 0, 1, -1, 1);

  let modelView = spaceball.getViewMatrix();
  let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0);

  const stereoCamera = {
    eyeSeparation: parseFloat(document.getElementById("eyeSeparation").value),
    convergence: parseFloat(document.getElementById("convergence").value),
    aspectRatio: gl.canvas.width / gl.canvas.height,
    fov: parseFloat(document.getElementById("fov").value),
    near: parseFloat(document.getElementById("near").value),
    far: 100.0,
  };

  let noRot = m4.multiply(
    rotateToPointZero,
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
  );

  // draw background
  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, noRot);
  gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projection);
  gl.bindTexture(gl.TEXTURE_2D, webCamTexture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    webCamVideo
  );
  webCamBackground?.Draw();

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.clear(gl.DEPTH_BUFFER_BIT);

  // draw sphere

  let modelView1 = null;

  gl.bindTexture(gl.TEXTURE_2D, textureSphere);

  xPosition = parseFloat(document.getElementById("xPosition").value);
  yPosition = parseFloat(document.getElementById("yPosition").value);
  zPosition = parseFloat(document.getElementById("zPosition").value);

  if (
    orientationEvent.alpha &&
    orientationEvent.beta &&
    orientationEvent.gamma
  ) {
    let rotationMatrix = getRotationMatrix(
      orientationEvent.alpha,
      orientationEvent.beta,
      orientationEvent.gamma
    );
    let translationMatrix = m4.translation(0, 0, -1);

    xPosition = orientationEvent.gamma;
    yPosition = orientationEvent.beta;
    // zPosition = orientationEvent.alpha;

    modelView1 = m4.multiply(rotationMatrix, translationMatrix);
  }

  if (audioPanner) {
    cutoffFrequency = document.getElementById("cutoffFrequency");
    audioFilter.frequency.value = parseFloat(cutoffFrequency.value);
    // high value for change panner position slower
    let pannerCoef = 0.7;

    audioPanner.setPosition(
      xPosition * pannerCoef,
      yPosition * pannerCoef,
      zPosition
    );
  }

  let translateToPointZero = m4.translation(50, 50, 0);
  const translationMatrix = m4.translation(xPosition, yPosition, zPosition);
  let matAccumSphere = m4.multiply(
    rotateToPointZero,
    modelView1 ? modelView1 : modelView
  );
  let translationMatrixSphere = m4.multiply(translationMatrix, matAccumSphere);

  const scaleMatrix = m4.scaling(0.01, 0.01, 0.01);

  const matAccumSphere0 = m4.multiply(
    scaleMatrix,
    m4.multiply(translateToPointZero, translationMatrixSphere)
  );
  gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projection);
  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccumSphere0);
  sphere.Draw();
  gl.clear(gl.DEPTH_BUFFER_BIT);

  // draw surface

  gl.bindTexture(gl.TEXTURE_2D, texture);

  let matAccum = m4.multiply(rotateToPointZero, modelView);

  let projectionLeft = leftFrustum(stereoCamera);
  let projectionRight = rightFrustum(stereoCamera);

  let translateToLeft = m4.translation(-0.03, 0, -20);
  let translateToRight = m4.translation(0.03, 0, -20);

  let matAccumLeft = m4.multiply(translateToLeft, matAccum);
  let matAccumRight = m4.multiply(translateToRight, matAccum);

  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccumLeft);
  gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projectionLeft);
  gl.colorMask(true, false, false, false);
  surface.Draw();

  gl.clear(gl.DEPTH_BUFFER_BIT);

  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccumRight);
  gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projectionRight);
  gl.colorMask(false, true, true, false);
  surface.Draw();

  gl.colorMask(true, true, true, true);
}

function getRotationMatrix(alpha, beta, gamma) {
  var _x = beta ? deg2rad(beta) : 0; // beta value
  var _y = gamma ? deg2rad(gamma) : 0; // gamma value
  var _z = alpha ? deg2rad(alpha) : 0; // alpha value

  var cX = Math.cos(_x);
  var cY = Math.cos(_y);
  var cZ = Math.cos(_z);
  var sX = Math.sin(_x);
  var sY = Math.sin(_y);
  var sZ = Math.sin(_z);

  //
  // ZXY rotation matrix construction.
  //

  var m11 = cZ * cY - sZ * sX * sY;
  var m12 = -cX * sZ;
  var m13 = cY * sZ * sX + cZ * sY;

  var m21 = cY * sZ + cZ * sX * sY;
  var m22 = cZ * cX;
  var m23 = sZ * sY - cZ * cY * sX;

  var m31 = -cX * sY;
  var m32 = sX;
  var m33 = cX * cY;

  return [m11, m12, m13, 0, m21, m22, m23, 0, m31, m32, m33, 0, 0, 0, 0, 1];
}

const step = (max, splines = 20) => {
  return max / (splines - 1);
};

const cos = (x) => {
  return Math.cos(x);
};

const sin = (x) => {
  return Math.sin(x);
};

const CreateSurfaceData = () => {
  let vertexList = [];
  let textureList = [];
  let splines = 20;

  let maxU = Math.PI;
  let maxV = 2 * Math.PI;
  let stepU = step(maxU, splines);
  let stepV = step(maxV, splines);

  let getU = (u) => {
    return u / maxU;
  };

  let getV = (v) => {
    return v / maxV;
  };

  for (let u = 0; u <= maxU; u += stepU) {
    for (let v = 0; v <= maxV; v += stepV) {
      vertexList.push(
        a * (b - cos(u)) * sin(u) * cos(v),
        a * (b - cos(u)) * sin(u) * sin(v),
        cos(u)
      );
      textureList.push(getU(u), getV(v));
      vertexList.push(
        a * (b - cos(u + stepU)) * sin(u + stepU) * cos(v + stepV),
        a * (b - cos(u + stepU)) * sin(u + stepU) * sin(v + stepV),
        cos(u + stepU)
      );
      textureList.push(getU(u + stepU), getV(v + stepV));
    }
  }
  return { vertexList, textureList };
};

const CreateSphereData = (radius) => {
  const vertexList = [];
  const textureList = [];
  const splines = 20;

  const maxU = Math.PI;
  const maxV = 2 * Math.PI;
  const stepU = maxU / splines;
  const stepV = maxV / splines;

  const getU = (u) => {
    return u / maxU;
  };

  const getV = (v) => {
    return v / maxV;
  };

  for (let u = 0; u <= maxU; u += stepU) {
    for (let v = 0; v <= maxV; v += stepV) {
      const x = radius * Math.sin(u) * Math.cos(v);
      const y = radius * Math.sin(u) * Math.sin(v);
      const z = radius * Math.cos(u);

      vertexList.push(x, y, z);
      textureList.push(getU(u), getV(v));

      const xNext = radius * Math.sin(u + stepU) * Math.cos(v + stepV);
      const yNext = radius * Math.sin(u + stepU) * Math.sin(v + stepV);
      const zNext = radius * Math.cos(u + stepU);

      vertexList.push(xNext, yNext, zNext);
      textureList.push(getU(u + stepU), getV(v + stepV));
    }
  }

  return {
    verticesSphere: vertexList,
    texturesSphere: textureList,
  };
};

/* Initialize the WebGL context. Called from init() */
function initGL() {
  let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

  shProgram = new ShaderProgram("Basic", prog);
  shProgram.Use();

  shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
  shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(
    prog,
    "ModelViewProjectionMatrix"
  );
  shProgram.iModelViewMatrix = gl.getUniformLocation(prog, "ModelViewMatrix");
  shProgram.iProjectionMatrix = gl.getUniformLocation(prog, "ProjectionMatrix");

  shProgram.iTextureCoords = gl.getAttribLocation(prog, "textureCoords");
  shProgram.iTextureU = gl.getUniformLocation(prog, "textureU");

  sphere = new Model("Sphere");
  const { verticesSphere, texturesSphere } = CreateSphereData(10);
  sphere.BufferData(verticesSphere, texturesSphere);

  surface = new Model("Surface");
  const { vertexList, textureList } = CreateSurfaceData();
  surface.BufferData(vertexList, textureList);

  webCamBackground = new Model("Background");
  webCamBackground.BufferData(
    [
      0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0,
      0.0, 0.0, 0.0,
    ],
    [1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1]
  );

  loadTexture();

  loadSphereTexture();

  gl.enable(gl.DEPTH_TEST);
}

/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
  let vsh = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vsh, vShader);
  gl.compileShader(vsh);
  if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
    throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
  }
  let fsh = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fsh, fShader);
  gl.compileShader(fsh);
  if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
    throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
  }
  let prog = gl.createProgram();
  gl.attachShader(prog, vsh);
  gl.attachShader(prog, fsh);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
  }
  return prog;
}

/**
 * initialization function that will be called when the page has loaded
 */
function init() {
  let canvas;
  try {
    canvas = document.getElementById("webglcanvas");
    gl = canvas.getContext("webgl");

    webCamVideo = document.createElement("video");
    webCamVideo.setAttribute("autoplay", true);
    webCamTexture = createWebCamTexture(gl);

    getWebcam().then((stream) => (webCamVideo.srcObject = stream));

    if (!gl) {
      throw "Browser does not support WebGL";
    }
  } catch (e) {
    console.log(e);
    document.getElementById("canvas-holder").innerHTML =
      "<p>Sorry, could not get a WebGL graphics context.</p>";
    return;
  }
  try {
    initGL(); // initialize the WebGL graphics context
  } catch (e) {
    console.log(e);
    document.getElementById("canvas-holder").innerHTML =
      "<p>Sorry, could not initialize the WebGL graphics context: " +
      e +
      "</p>";
    return;
  }

  // get elements for 3D render
  const eyeSeparationInput = document.getElementById("eyeSeparation");
  const convergenceInput = document.getElementById("convergence");
  const fovInput = document.getElementById("fov");
  const nearInput = document.getElementById("near");

  // get custom audio sphere coords
  const xPositionInput = document.getElementById("xPosition");
  const yPositionInput = document.getElementById("yPosition");
  const zPositionInput = document.getElementById("zPosition");

  const cutoffFrequencyInput = document.getElementById("cutoffFrequency");

  // add eventListeners for 3D params
  eyeSeparationInput.addEventListener("input", draw);
  convergenceInput.addEventListener("input", draw);
  fovInput.addEventListener("input", draw);
  nearInput.addEventListener("input", draw);

  // add eventListeners for inputs custom audio sphere coords
  xPositionInput.addEventListener("input", draw);
  yPositionInput.addEventListener("input", draw);
  zPositionInput.addEventListener("input", draw);

  cutoffFrequencyInput.addEventListener("input", draw);

  spaceball = new TrackballRotator(canvas, draw, 0);

  if ("DeviceOrientationEvent" in window) {
    window.addEventListener("deviceorientation", handleOrientation);
  } else {
    console.log("Device orientation not supported");
  }

  // get audio element
  audio = document.getElementById("audio");

  // add eventListener for audio pause
  audio.addEventListener("pause", () => {
    audioContext.resume();
  });

  // add eventListener for audio play
  audio.addEventListener("play", () => {
    if (!audioContext) {
      // Create an AudioContext instance
      audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Create an AudioSource
      audioSource = audioContext.createMediaElementSource(audio);

      // Create a PannerNode
      audioPanner = audioContext.createPanner();

      // Create a highpass filter
      audioFilter = audioContext.createBiquadFilter();

      // Set the panning model
      audioPanner.panningModel = "HRTF";
      // Set the distance model
      audioPanner.distanceModel = "linear";
      // set type of filter
      audioFilter.type = "highpass";
      // Set the cutoff frequency
      audioFilter.frequency.value = cutoffFrequencyInput.value;

      // Connect the audio source to the panner,
      audioSource.connect(audioPanner);
      // and the panner to the filter,
      audioPanner.connect(audioFilter);
      // and the filter to the audio context destination
      audioFilter.connect(audioContext.destination);

      audioContext.resume();
    }
  });

  // get element of filter
  let filterOn = document.getElementById("filterCheckbox");

  // add eventListener for change filter checkbox
  filterOn.addEventListener("change", function () {
    if (filterOn.checked) {
      audioPanner.disconnect();
      audioPanner.connect(audioFilter);
      audioFilter.connect(audioContext.destination);
    } else {
      audioPanner.disconnect();
      audioPanner.connect(audioContext.destination);
    }
  });

  audio.play();

  reDraw();
}

const reDraw = () => {
  draw();
  window.requestAnimationFrame(reDraw);
};

const loadTexture = () => {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src =
    "https://www.the3rdsequence.com/texturedb/download/212/texture/jpg/1024/concrete+wall+decoration-64x64.jpg";

  image.addEventListener("load", () => {
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  });
};

const loadSphereTexture = () => {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = "./sphere-texture.jpg";

  image.addEventListener("load", () => {
    textureSphere = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, textureSphere);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  });
};

const getWebcam = () => {
  return new Promise((resolve) =>
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((s) => resolve(s))
  );
};

const createWebCamTexture = () => {
  let textureID = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, textureID);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return textureID;
};

const handleOrientation = (event) => {
  orientationEvent.alpha = event.alpha;
  orientationEvent.beta = event.beta;
  orientationEvent.gamma = event.gamma;
};
