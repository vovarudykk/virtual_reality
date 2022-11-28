const fragmentShaderSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
#else
    precision mediump float;
#endif

#define GLSLIFY 1

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform float u_frame;

varying vec3 v_position;
varying vec3 v_normal;

float diffuseFactor(vec3 normal, vec3 light_direction) {
    float df = dot(normalize(normal), normalize(light_direction));
    if (gl_FrontFacing) {
        df = -df;
    }
    return max(0.0, df);
}


void main() {
    float min_resolution = min(u_resolution.x, u_resolution.y);
    vec3 light_direction = -vec3((u_mouse - 0.5 * u_resolution) / min_resolution, 0.5);

    float df = diffuseFactor(v_normal, light_direction);

    float nSteps = 4.0;
    float step = sqrt(1.0) * nSteps;
    step = (floor(step) + smoothstep(0.48, 0.52, fract(step))) / nSteps;

    float surface_color = step * step;

    gl_FragColor = vec4(vec3(surface_color), 1.0);
}`;