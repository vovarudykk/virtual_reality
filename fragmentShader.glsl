const fragmentShaderSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
#else
    precision mediump float;
#endif

varying vec4 color;
varying vec2 vTextureCoords;
uniform sampler2D tmu;

void main() {
  vec4 texture = texture2D(tmu, vTextureCoords);
  gl_FragColor = texture * color;
}`;