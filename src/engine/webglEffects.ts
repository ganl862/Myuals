/**
 * GPU-accelerated WebGL post-processing pass for:
 * - Beat Bloom Brightness (up to 180%)
 * - Radial Exposure Blur (0 -> 14px)
 * - Directional Horizontal Whip Blur (0 -> 24px)
 * - Rotational Zoom Blur ("روتيشن زوم بلور") combining spin + radial zoom + RGB chromatic split
 * - Whiteout Screen Exposure Blast (mix-blend-mode: screen math)
 */

const VERTEX_SHADER_SRC = `
attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = (a_position + 1.0) * 0.5;
  v_texCoord.y = 1.0 - v_texCoord.y;
}
`;

const FRAGMENT_SHADER_SRC = `
precision mediump float;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform float u_brightness;
uniform float u_bloomFlare;
uniform float u_radialBlurPx;
uniform float u_horizontalBlurPx;
uniform float u_whiteout;
uniform float u_rotationalBlur;
uniform float u_rotationalZoom;
uniform float u_chromaticPx;
varying vec2 v_texCoord;

vec2 rotateVec(vec2 v, float a) {
  float s = sin(a);
  float c = cos(a);
  return vec2(v.x * c - v.y * s, v.x * s + v.y * c);
}

void main() {
  vec2 uv = v_texCoord;
  vec3 acc = vec3(0.0);
  float totalWeight = 0.0;

  // 1. Rotational Zoom Blur ("روتيشن زوم بلور" - Phase 5 Finale)
  if (u_rotationalBlur > 0.001 || u_rotationalZoom > 0.001) {
    vec2 center = vec2(0.5, 0.5);
    vec2 rel = uv - center;
    for (int i = -5; i <= 5; i++) {
      float fi = float(i) / 5.0;
      float w = 1.0 - abs(fi) * 0.45;
      float ang = fi * u_rotationalBlur;
      float z = 1.0 - fi * u_rotationalZoom;
      vec2 sampleUv = clamp(center + rotateVec(rel * z, ang), 0.001, 0.999);
      acc += texture2D(u_image, sampleUv).rgb * w;
      totalWeight += w;
    }
  } else if (u_radialBlurPx > 0.25) {
    // 2. Radial Exposure Blur (Phase 2)
    vec2 dir = uv - vec2(0.5, 0.5);
    float maxOffset = u_radialBlurPx / max(u_resolution.x, u_resolution.y);
    for (int i = 0; i < 10; i++) {
      float fi = float(i) / 9.0;
      float w = 1.0 - fi * 0.55;
      vec2 sampleUv = clamp(uv - dir * (fi * maxOffset * 2.2), 0.001, 0.999);
      acc += texture2D(u_image, sampleUv).rgb * w;
      totalWeight += w;
    }
  } else if (u_horizontalBlurPx > 0.25) {
    // 3. Directional Horizontal Whip Motion Blur (Phase 4 & 5)
    float stepX = (u_horizontalBlurPx / u_resolution.x) * 1.4;
    for (int i = -6; i <= 6; i++) {
      float fi = float(i) / 6.0;
      float w = 1.0 - abs(fi) * 0.5;
      vec2 sampleUv = clamp(vec2(uv.x + fi * stepX, uv.y), 0.001, 0.999);
      acc += texture2D(u_image, sampleUv).rgb * w;
      totalWeight += w;
    }
  } else {
    acc = texture2D(u_image, uv).rgb;
    totalWeight = 1.0;
  }

  vec3 color = acc / max(totalWeight, 0.0001);

  // Subtle RGB Chromatic Split on velocity / beat peaks
  if (u_chromaticPx > 0.25) {
    vec2 radialDir = uv - vec2(0.5, 0.5);
    float split = (u_chromaticPx / max(u_resolution.x, u_resolution.y)) * 1.8;
    float rCh = texture2D(u_image, clamp(uv + radialDir * split, 0.001, 0.999)).r;
    float bCh = texture2D(u_image, clamp(uv - radialDir * split, 0.001, 0.999)).b;
    color.r = mix(color.r, rCh, 0.45);
    color.b = mix(color.b, bCh, 0.45);
  }

  // Beat brightness surge (1.0 -> 1.8 = 180%)
  color *= u_brightness;

  // Warm golden-peach bloom flare
  if (u_bloomFlare > 0.001) {
    float dist = length(uv - vec2(0.5, 0.45));
    float radialGlow = smoothstep(0.95, 0.05, dist) * u_bloomFlare;
    vec3 flareColor = vec3(1.0, 0.88, 0.68) * radialGlow * 0.55;
    color = 1.0 - (1.0 - clamp(color, 0.0, 1.0)) * (1.0 - clamp(flareColor, 0.0, 1.0));
  }

  // Peak Whiteout Exposure Blast (mix-blend-mode: screen)
  if (u_whiteout > 0.001) {
    vec3 blast = vec3(1.0, 0.98, 0.93) * clamp(u_whiteout, 0.0, 1.0);
    color = 1.0 - (1.0 - clamp(color, 0.0, 1.0)) * (1.0 - blast);
  }

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

export interface WebGLPostParams {
  brightness: number;
  bloomFlare: number;
  radialBlurPx: number;
  horizontalBlurPx: number;
  whiteout: number;
  rotationalBlur: number;
  rotationalZoom: number;
  chromaticPx: number;
}

export class WebGLPostProcessor {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  public readonly available: boolean;

  constructor(width: number, height: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;

    try {
      const gl = this.canvas.getContext('webgl', {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      });
      if (!gl) {
        this.available = false;
        return;
      }
      this.gl = gl;
      this.available = this.initPipeline(gl);
    } catch {
      this.available = false;
    }
  }

  private compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  private initPipeline(gl: WebGLRenderingContext): boolean {
    const vert = this.compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
    const frag = this.compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
    if (!vert || !frag) return false;

    const program = gl.createProgram();
    if (!program) return false;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      return false;
    }

    this.program = program;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    this.positionBuffer = buffer;

    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    this.texture = tex;

    this.uniforms = {
      u_resolution: gl.getUniformLocation(program, 'u_resolution'),
      u_brightness: gl.getUniformLocation(program, 'u_brightness'),
      u_bloomFlare: gl.getUniformLocation(program, 'u_bloomFlare'),
      u_radialBlurPx: gl.getUniformLocation(program, 'u_radialBlurPx'),
      u_horizontalBlurPx: gl.getUniformLocation(program, 'u_horizontalBlurPx'),
      u_whiteout: gl.getUniformLocation(program, 'u_whiteout'),
      u_rotationalBlur: gl.getUniformLocation(program, 'u_rotationalBlur'),
      u_rotationalZoom: gl.getUniformLocation(program, 'u_rotationalZoom'),
      u_chromaticPx: gl.getUniformLocation(program, 'u_chromaticPx'),
    };

    return true;
  }

  public process(
    sourceCanvas: HTMLCanvasElement,
    targetCtx: CanvasRenderingContext2D,
    params: WebGLPostParams
  ): boolean {
    if (!this.available || !this.gl || !this.program || !this.texture) {
      return false;
    }

    const w = sourceCanvas.width;
    const h = sourceCanvas.height;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }

    const gl = this.gl;
    gl.viewport(0, 0, w, h);
    gl.useProgram(this.program);

    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);

    gl.uniform2f(this.uniforms.u_resolution, w, h);
    gl.uniform1f(this.uniforms.u_brightness, params.brightness);
    gl.uniform1f(this.uniforms.u_bloomFlare, params.bloomFlare);
    gl.uniform1f(this.uniforms.u_radialBlurPx, params.radialBlurPx);
    gl.uniform1f(this.uniforms.u_horizontalBlurPx, params.horizontalBlurPx);
    gl.uniform1f(this.uniforms.u_whiteout, params.whiteout);
    gl.uniform1f(this.uniforms.u_rotationalBlur, params.rotationalBlur);
    gl.uniform1f(this.uniforms.u_rotationalZoom, params.rotationalZoom);
    gl.uniform1f(this.uniforms.u_chromaticPx, params.chromaticPx);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    targetCtx.drawImage(this.canvas, 0, 0, w, h);
    return true;
  }

  public dispose(): void {
    const gl = this.gl;
    if (!gl) return;
    if (this.texture) gl.deleteTexture(this.texture);
    if (this.positionBuffer) gl.deleteBuffer(this.positionBuffer);
    if (this.program) gl.deleteProgram(this.program);
  }
}
