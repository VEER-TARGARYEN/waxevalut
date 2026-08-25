/** Ambient WebGL background — a slow, domain-warped fbm field in charcoal with drifting
 *  brass and cool-blue blooms. Sits behind everything (fixed, pointer-events:none) as the
 *  living ground of the app, in the spirit of luma.com's shader backdrops but tuned dark and
 *  quiet so text contrast is never harmed.
 *
 *  Perf-conscious: DPR capped, ~30fps, pauses when the tab is hidden, and renders a single
 *  static frame under prefers-reduced-motion. Dependency-free (raw WebGL1).
 */
import { useEffect, useRef } from "react";

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;

float hash(vec2 p){ p = fract(p*vec2(123.34, 345.45)); p += dot(p, p+34.345); return fract(p.x*p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i+vec2(1.,0.)), c = hash(i+vec2(0.,1.)), d = hash(i+vec2(1.,1.));
  vec2 u = f*f*(3.-2.*f);
  return mix(a,b,u.x) + (c-a)*u.y*(1.-u.x) + (d-b)*u.x*u.y;
}
float fbm(vec2 p){
  float v = 0., a = 0.5;
  for(int i=0;i<5;i++){ v += a*noise(p); p *= 2.03; a *= 0.5; }
  return v;
}
void main(){
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  vec2 p = uv * vec2(u_res.x/u_res.y, 1.0) * 1.6;
  float t = u_time * 0.018;

  // domain warp for slow, organic flow
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t*0.8));
  float n = fbm(p + 1.6*q + t*0.4);
  float n2 = fbm(p*1.25 + vec2(2.7,9.1) - t*0.6);

  vec3 base  = vec3(0.041, 0.047, 0.055);   // ~#0b0c0e charcoal
  vec3 brass = vec3(0.878, 0.659, 0.376);   // wax-seal brass
  vec3 blue  = vec3(0.42, 0.58, 0.77);

  float glow = smoothstep(0.52, 0.98, n);
  float glow2 = smoothstep(0.55, 0.95, n2);
  vec3 col = base
    + brass * glow  * 0.085
    + blue  * glow2 * 0.035;

  // top-left brass keylight, matching the app's light source
  col += brass * 0.05 * smoothstep(0.9, 0.0, distance(uv, vec2(0.1, -0.05)));

  // gentle vignette so edges settle into black
  col *= mix(0.82, 1.0, smoothstep(1.25, 0.25, distance(uv, vec2(0.5))));

  gl_FragColor = vec4(col, 1.0);
}`;

const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

export function AmbientShader() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false });
    if (!gl) return; // graceful: CSS background remains as fallback

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const resize = () => {
      const w = Math.floor(window.innerWidth * dpr);
      const h = Math.floor(window.innerHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let last = 0;
    const frameMs = 1000 / 30; // cap ~30fps
    const start = performance.now();

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (document.hidden) return;
      if (now - last < frameMs) return;
      last = now;
      resize();
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    if (reduce) {
      // one static frame, no animation loop
      resize();
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, 12.0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else {
      raf = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      const ext = gl.getExtension("WEBGL_lose_context");
      ext?.loseContext();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
      style={{ opacity: 0.9 }}
    />
  );
}
