const vertexShaderSource = `
attribute vec3 vertex;
attribute vec3 normal;
attribute vec2 textureCoords;

uniform mat4 normalMatrix;
uniform mat4 ModelViewProjectionMatrix;

uniform float shininess;
uniform vec3 ambientColor;
uniform vec3 diffuseColor;
uniform vec3 specularColor;

uniform vec3 lightPosition;

// TEXTURE
uniform float fAngleRad;
uniform vec2 fUserPoint;

varying vec4 color;
varying vec2 vTextureCoords;

mat4 getRotateMat(float angleRad) {
  float c = cos(angleRad);
  float s = sin(angleRad);

  return mat4(
    vec4(c, s, 0.0, 0.0),
    vec4(-s, c, 0.0, 0.0),
    vec4(0.0, 0.0, 1.0, 0.0),
    vec4(0.0, 0.0, 0.0, 1.0)
  );
}

mat4 getTranslateMat(vec2 point) {
  return mat4(
    vec4(1.0, 0.0, 0.0, point.x),
    vec4(0.0, 1.0, 0.0, point.y),
    vec4(0.0, 0.0, 1.0, 0.0),
    vec4(0.0, 0.0, 0.0, 1.0)
  );
}

void main() {
    vec4 vertexPosition4 = ModelViewProjectionMatrix * vec4(vertex, 1.0);
    vec3 vertexPosition = vec3(vertexPosition4) / vertexPosition4.w;
    vec3 normalInterpolation = vec3(normalMatrix * vec4(normal, 0.0));
    gl_Position = vertexPosition4;
    
    vec3 normal = normalize(normalInterpolation);
    vec3 lightDirection = normalize(lightPosition - vertexPosition);
    
    float nDotLight = max(dot(normal, lightDirection), 0.0);
    float specularLight = 0.0;
    if (nDotLight > 0.0) {
        vec3 viewDirection = normalize(-vertexPosition);
        vec3 halfDirection = normalize(lightDirection + viewDirection);
        float specularAngle = max(dot(halfDirection, normal), 0.0);
        specularLight = pow(specularAngle, shininess);
    }
    vec3 diffuse = nDotLight * diffuseColor;
    vec3 ambient = ambientColor;
    vec3 specular = specularLight * specularColor;

    mat4 rotatedMat = getRotateMat(fAngleRad);
    mat4 translated = getTranslateMat(-fUserPoint);
    mat4 translatedBack = getTranslateMat(fUserPoint);

    vec4 tr = translated * vec4(textureCoords, 0, 0);
    vec4 rotated = tr * rotatedMat;
    vec4 trBack = rotated * translatedBack;

    vTextureCoords = vec2(trBack);

    color = vec4(diffuse + ambient + specular, 1.0);
}`;