"use strict";

let gl; // The webgl context.
let surface; // A surface model
let shProgram; // A shader program
let spaceball; // A SimpleRotator object that lets the user rotate the view by mouse.

let handlePosition = 0.0;
const userPoint = { x: 40, y: 400 };

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

  // TextureCoords
  this.iTextureCoords = -1;
  this.iTMU = -1;

  this.iFAngleRad = -1;
  this.iFUserPoint = -1;

  this.Use = function () {
    gl.useProgram(this.prog);
  };
}

/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  /* Set the values of the projection transformation */
  let projection = m4.perspective(Math.PI / 8, 1, 8, 12);

  /* Get the view matrix from the SimpleRotator object.*/
  let modelView = spaceball.getViewMatrix();

  let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
  let translateToPointZero = m4.translation(0, 0, -10);

  let matAccum0 = m4.multiply(rotateToPointZero, modelView);
  let matAccum1 = m4.multiply(translateToPointZero, matAccum0);
  const modelViewInverse = m4.inverse(matAccum1, new Float32Array(16));
  const normalMatrix = m4.transpose(modelViewInverse, new Float32Array(16));

  /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
  let modelViewProjection = m4.multiply(projection, matAccum1);

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

  gl.uniform3fv(shProgram.iAmbientColor, [0.5, 0, 0.4]);
  gl.uniform3fv(shProgram.iDiffuseColor, [1.3, 1.0, 0.0]);
  gl.uniform3fv(shProgram.iSpecularColor, [1.5, 1.0, 1.0]);
  /* Draw the six faces of a cube, with different colors. */
  gl.uniform4fv(shProgram.iColor, [1, 1, 0, 1]);

  const angle = document.getElementById("rAngle").value;
  gl.uniform1f(shProgram.iFAngleRad, deg2rad(+angle));

  const u = deg2rad(userPoint.x);
  const v = deg2rad(userPoint.y);

  gl.uniform2fv(shProgram.iFUserPoint, [
    a * (b - cos(u)) * sin(u) * cos(v),
    a * (b - cos(u)) * sin(u) * sin(v),
  ]);

  gl.activeTexture(gl.TEXTURE0);
  gl.uniform1i(shProgram.iTMU, 0);

  surface.Draw();
}

// const r = (z) => {
//   return z * Math.sqrt((z * (a - z)) / b);
// };

// const x = (z, beta) => {
//   return r(z) * Math.sin(beta);
// };

// const y = (z, beta) => {
//   return r(z) * Math.cos(beta);
// };

const step = (max, splines = 20) => {
  return max / (splines - 1);
};

// function CreateSurfaceData() {
//   let vertexList = [];
//   let textureList = [];

//   let splines = 32;

//   let zMax = a;
//   let betaMax = 2 * Math.PI;
//   let zStep = step(zMax, splines);
//   let betaStep = step(betaMax, splines);

//   for (let z = 0; z <= a; z += zStep) {
//     for (let beta = 0; beta <= 2 * Math.PI; beta += betaStep) {
//       vertexList.push(x(r(z), beta), y(r(z), beta), z);
//       textureList.push(z, beta);
//       vertexList.push(
//         x(r(z + zStep), beta + betaStep),
//         y(r(z + zStep), beta + betaStep),
//         z + zStep
//       );
//       textureList.push(z + zStep, beta + betaStep);
//     }
//   }

//   return { vertexList, textureList };
// }

const cos = (x) => {
  return Math.cos(x);
};

const sin = (x) => {
  return Math.sin(x);
};

function CreateSurfaceData() {
  let vertexList = [];
  let textureList = [];
  let splines = 20;

  let maxU = Math.PI;
  let maxV = 2 * Math.PI;
  let stepU = step(maxU, splines);
  let stepV = step(maxV, splines);

  let calculateUV = (u, v) => {
    return [u / maxU, v / maxV];
  };

  for (let u = 0; u <= maxU; u += stepU) {
    for (let v = 0; v <= maxV; v += stepV) {
      vertexList.push(
        a * (b - cos(u)) * sin(u) * cos(v),
        a * (b - cos(u)) * sin(u) * sin(v),
        cos(u)
      );
      // console.log(
      //   `x = ${a * (b - cos(u)) * sin(u) * cos(v)} | y = ${
      //     a * (b - cos(u)) * sin(u) * sin(v)
      //   } | z = ${cos(u)}`
      // );
      textureList.push(...calculateUV(u, v));
      // let tmp = calculateUV(u, v);
      // console.log(`u, v = ${tmp}`);
      vertexList.push(
        a * (b - cos(u + stepU)) * sin(u + stepU) * cos(v + stepV),
        a * (b - cos(u + stepU)) * sin(u + stepU) * sin(v + stepV),
        cos(u + stepU)
      );
      textureList.push(...calculateUV(u + stepU, v + stepV));
    }
  }
  return { vertexList, textureList };
}

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
  shProgram.iColor = gl.getUniformLocation(prog, "color");

  shProgram.iNormal = gl.getAttribLocation(prog, "normal");
  shProgram.iNormalMatrix = gl.getUniformLocation(prog, "normalMatrix");

  shProgram.iAmbientColor = gl.getUniformLocation(prog, "ambientColor");
  shProgram.iDiffuseColor = gl.getUniformLocation(prog, "diffuseColor");
  shProgram.iSpecularColor = gl.getUniformLocation(prog, "specularColor");

  shProgram.iShininess = gl.getUniformLocation(prog, "shininess");

  shProgram.iLightPosition = gl.getUniformLocation(prog, "lightPosition");
  shProgram.iLightVec = gl.getUniformLocation(prog, "lightVec");
  // TEXTURE
  shProgram.iTextureCoords = gl.getAttribLocation(prog, "textureCoords");
  shProgram.iTMU = gl.getUniformLocation(prog, "tmu");

  shProgram.iFAngleRad = gl.getUniformLocation(prog, "fAngleRad");
  shProgram.iFUserPoint = gl.getUniformLocation(prog, "fUserPoint");

  surface = new Model("Surface");
  const { vertexList, textureList } = CreateSurfaceData();
  surface.BufferData(vertexList, textureList);

  LoadTexture();

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
    if (!gl) {
      throw "Browser does not support WebGL";
    }
  } catch (e) {
    document.getElementById("canvas-holder").innerHTML =
      "<p>Sorry, could not get a WebGL graphics context.</p>";
    return;
  }
  try {
    initGL(); // initialize the WebGL graphics context
  } catch (e) {
    document.getElementById("canvas-holder").innerHTML =
      "<p>Sorry, could not initialize the WebGL graphics context: " +
      e +
      "</p>";
    return;
  }

  spaceball = new TrackballRotator(canvas, draw, 0);

  draw();
}

window.addEventListener("keydown", function (event) {
  switch (event.code) {
    case "ArrowLeft":
      left();
      break;
    case "ArrowRight":
      right();
      break;
    case "KeyW":
      console.log("keyW");
      pressW();
      break;
    case "KeyS":
      console.log("keyS");
      pressS();
      break;
    case "KeyD":
      console.log("keyD");
      pressD();
      break;
    case "KeyA":
      console.log("keyA");
      pressA();
      break;
    default:
      return;
  }
});

const LoadTexture = () => {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src =
    "https://www.the3rdsequence.com/texturedb/download/255/texture/jpg/1024/ice+frost-1024x1024.jpg";

  image.addEventListener("load", () => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  });
};

const pressW = () => {
  userPoint.y = userPoint.y + 1;
  reDraw();
};

const pressS = () => {
  userPoint.y = userPoint.y - 1;
  reDraw();
};

const pressA = () => {
  userPoint.x = userPoint.x - 1;
  reDraw();
};

const pressD = () => {
  userPoint.x = userPoint.x + 1;
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
  return [coord, -2, coord * coord];
};

const reDraw = () => {
  const { vertexList, textureList } = CreateSurfaceData();
  surface.BufferData(vertexList, textureList);
  console.log(`x = ${userPoint.x} | y = ${userPoint.y}`);
  draw();
};
