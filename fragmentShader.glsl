const fragmentShaderSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
#else
    precision mediump float;
#endif

varying vec4 color;
varying vec2 vTextureCoords;
uniform sampler2D textureU;
uniform vec4 colorU;

void main() {
  vec4 texture = texture2D(textureU, vTextureCoords);
  gl_FragColor = texture * color;
  if(colorU.x>0.5){
    gl_FragColor = texture;
  }
}`;