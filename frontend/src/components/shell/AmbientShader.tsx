/** Ambient WebGL background — a slow, domain-warped fbm field in charcoal with drifting
 *  brass and cool-blue blooms. Sits behind everything (fixed, pointer-events:none) as the
 *  living ground of the app, in the spirit of luma.com's shader backdrops but tuned dark and
 *  quiet so text contrast is never harmed.
 *
 *  Perf-conscious: DPR capped, ~30fps, pauses when the tab is hidden, and renders a single
 *  static frame under prefers-reduced-motion. Dependency-free (raw WebGL1).
 */
import { useEffect, useRef } from "react";
import { getTheme } from "@/lib/themes";
import { useSettings } from "@/store/settings";

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec3 u_accent;

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
// ── hue helpers: build a themed palette from the single accent colour ──
vec3 rgb2hsv(vec3 c){
  vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  return vec3(abs(q.z + (q.w - q.y) / (6.0*d + 1e-10)), d / (q.x + 1e-10), q.x);
}
vec3 hsv2rgb(vec3 c){
  vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
// shift the accent's hue by d turns (0..1), keeping it vivid
vec3 shiftHue(vec3 base, float d, float sat, float val){
  vec3 h = rgb2hsv(base);
  return hsv2rgb(vec3(fract(h.x + d), clamp(h.y * sat, 0.0, 1.0), clamp(h.z * val, 0.0, 1.0)));
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  vec2 p = uv * vec2(u_res.x/u_res.y, 1.0) * 1.7;
  float t = u_time * 0.035;

  // domain warp for slow, organic flow
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t*0.8));
  float n  = fbm(p + 1.9*q + t*0.5);
  float n2 = fbm(p*1.25 + vec2(2.7,9.1) - t*0.7);
  float n3 = fbm(p*0.85 + vec2(8.4,3.6) + t*0.45);

  vec3 base = vec3(0.043, 0.049, 0.058);   // ~#0b0c0e charcoal ground

  // a three-hue palette derived from the accent: the accent itself, a near-analogous
  // partner, and a far complement. Every theme therefore paints a different sky, not a
  // recolour of the same one.
  vec3 cA = u_accent;
  vec3 cB = shiftHue(u_accent,  0.13, 1.15, 1.05);
  vec3 cC = shiftHue(u_accent, -0.42, 1.00, 0.95);

  // bold blooms — squared falloff keeps them shapely rather than muddy
  float g1 = smoothstep(0.44, 0.90, n);
  float g2 = smoothstep(0.46, 0.88, n2);
  float g3 = smoothstep(0.50, 0.92, n3);
  vec3 col = base
    + cA * g1 * g1 * 0.62
    + cB * g2 * g2 * 0.42
    + cC * g3 * g3 * 0.30;

  // three large drifting light sources for unmistakable movement
  vec2 l1 = vec2(0.26 + 0.18*sin(t*0.60), 0.30 + 0.14*cos(t*0.50));
  vec2 l2 = vec2(0.80 + 0.16*cos(t*0.40), 0.70 + 0.17*sin(t*0.45));
  vec2 l3 = vec2(0.52 + 0.22*sin(t*0.31), 0.88 + 0.12*cos(t*0.37));
  col += cA * 0.30 * smoothstep(0.52, 0.0, distance(uv, l1));
  col += cB * 0.24 * smoothstep(0.58, 0.0, distance(uv, l2));
  col += cC * 0.20 * smoothstep(0.50, 0.0, distance(uv, l3));

  // accent keylight from the app's top-left light source
  col += cA * 0.16 * smoothstep(0.95, 0.0, distance(uv, vec2(0.06, -0.05)));

  // vignette so the edges settle and centre content stays readable
  col *= mix(0.60, 1.0, smoothstep(1.35, 0.15, distance(uv, vec2(0.5))));

  gl_FragColor = vec4(col, 1.0);
}`;

const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

export function AmbientShader() {
  const ref = useRef<HTMLCanvasElement>(null);
  const themeId = useSettings((s) => s.theme);
  const fpsPref = useSettings((s) => s.fps);
  const detected = useSettings((s) => s.detectedFps);

  // read through refs so theme/fps changes take effect without tearing down the GL context
  const accentRef = useRef<[number, number, number]>(getTheme(themeId).shader);
  const fpsRef = useRef(60);
  accentRef.current = getTheme(themeId).shader;
  fpsRef.current = fpsPref === "auto" ? detected ?? 60 : fpsPref;

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
    const uAccent = gl.getUniformLocation(prog, "u_accent");

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
    const start = performance.now();

    const paint = (t: number) => {
      const [r, g, b] = accentRef.current;
      resize();
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.uniform3f(uAccent, r, g, b);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (document.hidden) return;
      // frame budget follows the live setting (auto-matched to the display, or pinned)
      const frameMs = 1000 / Math.max(1, fpsRef.current);
      if (now - last < frameMs - 0.5) return;
      last = now;
      paint((now - start) / 1000);
    };

    if (reduce) {
      paint(12.0); // one static frame, no animation loop
    } else {
      raf = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      // NOTE: deliberately no WEBGL_lose_context here. Forcing context loss on cleanup
      // permanently poisons the canvas: React StrictMode mounts effects twice in dev, and
      // the second run would getContext() the same already-lost context, fail to link, and
      // bail — leaving a 0x0 canvas and no visible background. The canvas lives for the
      // app's lifetime; the browser reclaims the context with the element.
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
      // slightly translucent so the field composites over the charcoal ground on <html>
      // rather than replacing it — keeps text contrast honest while the colour stays bold
      style={{ opacity: 0.82 }}
    />
  );
}
