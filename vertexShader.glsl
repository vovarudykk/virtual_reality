const vertexShaderSource = `
attribute vec3 vertex;
attribute vec3 normal;
attribute vec2 textureCoords;

uniform mat4 normalMatrix;
uniform mat4 ModelViewProjectionMatrix;
uniform mat4 ModelViewMatrix, ProjectionMatrix;
uniform float shininess;
uniform vec3 ambientColor;
uniform vec3 diffuseColor;
uniform vec3 specularColor;

uniform vec3 lightPosition;

uniform float textureAngle;
uniform vec2 texturePoint;

varying vec4 color;
varying vec2 vTextureCoords;
uniform vec4 colorU;

mat4 getRotateMatix(float angleRad) {
  float c = cos(angleRad);
  float s = sin(angleRad);

  return mat4(
    vec4(c, s, 0.0, 0.0),
    vec4(-s, c, 0.0, 0.0),
    vec4(0.0, 0.0, 1.0, 0.0),
    vec4(0.0, 0.0, 0.0, 1.0)
  );
}

mat4 getTranslateMatrix(vec2 point) {
  return mat4(
    vec4(1.0, 0.0, 0.0, point.x),
    vec4(0.0, 1.0, 0.0, point.y),
    vec4(0.0, 0.0, 1.0, 0.0),
    vec4(0.0, 0.0, 0.0, 1.0)
  );
}

void main() {
    vec4 vertexPosition4 = ModelViewMatrix * vec4(vertex, 1.0);
    vec3 vertexPosition = vec3(vertexPosition4) / vertexPosition4.w;
    vec3 normalInterpolation = vec3(normalMatrix * vec4(normal, 0.0));
    gl_Position = ProjectionMatrix*vertexPosition4;
    
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

    mat4 rotatedMatrix = getRotateMatix(textureAngle);
    mat4 translatedMatrix = getTranslateMatrix(-texturePoint);
    mat4 translatedBackMatrix = getTranslateMatrix(texturePoint);

    vec4 vTranslatedMatrix = translatedMatrix * vec4(textureCoords, 0, 0);
    vec4 vRotatedMatrix = vTranslatedMatrix * rotatedMatrix;
    vec4 vTranslatedBackMatrix = vRotatedMatrix * translatedBackMatrix;

    vTextureCoords = vec2(vTranslatedBackMatrix);
    vTextureCoords = textureCoords;

    color = vec4(diffuse + ambient + specular, 1.0);
}`;