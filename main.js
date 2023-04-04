"use strict";

let gl; // The webgl context.
let surface; // A surface model
let shProgram; // A shader program
let spaceball; // A SimpleRotator object that lets the user rotate the view by mouse.
let texture;
let stereoCamera;

let webCamTexture, webCamVideo, webCamTrack, webCamSurface;

let handlePosition = 0.0;

const texturePoint = { x: 100, y: 400 };

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

    gl.vertexAttribPointer(shProgram.iNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iNormal);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
    gl.vertexAttribPointer(shProgram.iTextureCoords, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iTextureCoords);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
  };
  this.DrawBackground = function () {
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
  // Location of the uniform specifying a color for the primitive.
  this.iColor = -1;
  // Location of the uniform matrix representing the combined transformation.
  this.iModelViewProjectionMatrix = -1;

  this.iNormal = -1;
  this.iNormalMatrix = -1;

  this.iAmbientColor = -1;
  this.iDiffuseColor = -1;
  this.iSpecularColor = -1;

  this.iShininess = -1;
  this.iLightPosition = -1;
  this.iLightVec = -1;

  this.iTextureCoords = -1;
  this.iTextureU = -1;
  this.iTextureAngle = -1;
  this.iTexturePoint = -1;

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

  // let projection = m4.perspective(Math.PI / 8, 1, 8, 12);
  let projection = m4.orthographic(0, 1, 0, 1, -1, 1);

  let projectionLeft = leftFrustum(stereoCamera);
  let projectionRight = rightFrustum(stereoCamera);

  let modelView = spaceball.getViewMatrix();

  let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0);
  let translateToPointZero = m4.translation(0.0, 0, -10);
  let translateToLeft = m4.translation(-0.03, 0, -20);
  let translateToRight = m4.translation(0.03, 0, -20);

  let matAccum = m4.multiply(rotateToPointZero, modelView);
  let noRot = m4.multiply(
    rotateToPointZero,
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
  );
  let matAccum1 = m4.multiply(translateToPointZero, noRot);
  let modelViewProjection = m4.multiply(projection, matAccum1);
  const modelViewInverse = m4.inverse(matAccum1, new Float32Array(16));
  const normalMatrix = m4.transpose(modelViewInverse, new Float32Array(16));

  gl.uniformMatrix4fv(
    shProgram.iModelViewProjectionMatrix,
    false,
    modelViewProjection
  );
  gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normalMatrix);

  gl.uniform3fv(shProgram.iLightPosition, lightCoordinates());
  gl.uniform3fv(shProgram.iLightDirection, [1, 0, 0]);
  gl.uniform3fv(shProgram.iLightVec, new Float32Array(3));
  gl.uniform1f(shProgram.iShininess, 1.0);

  gl.uniform3fv(shProgram.iAmbientColor, [0.5, 1, 1.0]);
  gl.uniform3fv(shProgram.iDiffuseColor, [0.5, 1.0, 0.0]);
  gl.uniform3fv(shProgram.iSpecularColor, [0.5, 1.0, 1.0]);
  /* Draw the six faces of a cube, with different colors. */
  gl.uniform4fv(shProgram.iColor, [1, 1, 1, 1]);

  const angle = document.getElementById("rAngle").value;
  gl.uniform1f(shProgram.iTextureAngle, deg2rad(+angle));

  const u = deg2rad(texturePoint.x);
  const v = deg2rad(texturePoint.y);

  gl.uniform2fv(shProgram.iTexturePoint, [
    a * (b - cos(u)) * sin(u) * cos(v),
    a * (b - cos(u)) * sin(u) * sin(v),
  ]);

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
  webCamSurface.DrawBackground();
  gl.uniform4fv(shProgram.iColor, [0, 0, 0, 1]);

  gl.activeTexture(gl.TEXTURE0);
  gl.uniform1i(shProgram.iTextureU, 0);

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  // surface.Draw();
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
  shProgram.iColor = gl.getUniformLocation(prog, "color");

  shProgram.iNormal = gl.getAttribLocation(prog, "normal");
  shProgram.iNormalMatrix = gl.getUniformLocation(prog, "normalMatrix");

  shProgram.iAmbientColor = gl.getUniformLocation(prog, "ambientColor");
  shProgram.iDiffuseColor = gl.getUniformLocation(prog, "diffuseColor");
  shProgram.iSpecularColor = gl.getUniformLocation(prog, "specularColor");
  shProgram.iColor = gl.getUniformLocation(prog, "colorU");

  shProgram.iShininess = gl.getUniformLocation(prog, "shininess");

  shProgram.iLightPosition = gl.getUniformLocation(prog, "lightPosition");
  shProgram.iLightVec = gl.getUniformLocation(prog, "lightVec");

  shProgram.iTextureCoords = gl.getAttribLocation(prog, "textureCoords");
  shProgram.iTextureU = gl.getUniformLocation(prog, "textureU");
  shProgram.iTextureAngle = gl.getUniformLocation(prog, "textureAngle");
  shProgram.iTexturePoint = gl.getUniformLocation(prog, "texturePoint");

  surface = new Model("Surface");
  const { vertexList, textureList } = CreateSurfaceData();
  surface.BufferData(vertexList, textureList);
  webCamSurface = new Model("Background");
  webCamSurface.BufferData(
    [
      0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0,
      0.0, 0.0, 0.0,
    ],
    [1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1]
  );

  loadTexture();

  gl.enable(gl.DEPTH_TEST);
}

const continiousDraw = () => {
  draw();
  window.requestAnimationFrame(continiousDraw);
};

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
    window.vid = webCamVideo;
    getWebcam();
    webCamTexture = createWebCamTexture();
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

  stereoCamera = {
    eyeSeparation: 0.004,
    convergence: 1,
    aspectRatio: gl.canvas.width / gl.canvas.height,
    fov: deg2rad(15),
    near: 10,
    far: 20,
  };

  const eyeSeparationInput = document.getElementById("eyeSeparation");
  const convergenceInput = document.getElementById("convergence");
  const fovInput = document.getElementById("fov");
  const nearInput = document.getElementById("near");

  const stereoCam = () => {
    stereoCamera.eyeSeparation = parseFloat(eyeSeparationInput.value);
    stereoCamera.convergence = parseFloat(convergenceInput.value);
    stereoCamera.fov = deg2rad(parseFloat(fovInput.value));
    stereoCamera.near = parseFloat(nearInput.value);
    draw();
  };

  eyeSeparationInput.addEventListener("input", stereoCam);
  convergenceInput.addEventListener("input", stereoCam);
  fovInput.addEventListener("input", stereoCam);
  nearInput.addEventListener("input", stereoCam);

  spaceball = new TrackballRotator(canvas, draw, 0);

  continiousDraw();
}

const reDraw = () => {
  const { vertexList, textureList } = CreateSurfaceData();
  surface.BufferData(vertexList, textureList);
  draw();
};

const loadTexture = () => {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src =
    "https://www.the3rdsequence.com/texturedb/download/162/texture/jpg/1024/irregular+wood+tiles-1024x1024.jpg";

  image.addEventListener("load", () => {
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  });
};

const getWebcam = () => {
  navigator.getUserMedia(
    { video: true, audio: false },
    function (stream) {
      webCamVideo.srcObject = stream;
      webCamTrack = stream.getTracks()[0];
    },
    function (e) {
      console.error("Rejected!", e);
    }
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

const pressW = () => {
  texturePoint.y += 0.5;
  reDraw();
};

const pressS = () => {
  texturePoint.y -= 0.5;
  reDraw();
};

const pressA = () => {
  texturePoint.x -= 0.5;
  reDraw();
};

const pressD = () => {
  texturePoint.x += 0.5;
  reDraw();
};

const left = () => {
  handlePosition -= 0.07;
  reDraw();
};

const right = () => {
  handlePosition += 0.07;
  reDraw();
};

const lightCoordinates = () => {
  let coord = Math.sin(handlePosition) * 1.2;
  return [coord, -30, coord * coord];
};

window.addEventListener("keydown", function (event) {
  switch (event.code) {
    case "ArrowLeft":
      left();
      break;
    case "ArrowRight":
      right();
      break;
    case "KeyW":
      pressW();
      break;
    case "KeyS":
      pressS();
      break;
    case "KeyD":
      pressD();
      break;
    case "KeyA":
      pressA();
      break;
    default:
      return;
  }
  reDraw();
});
