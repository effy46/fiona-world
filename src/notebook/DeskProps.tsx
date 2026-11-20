// Live desk candle and coffee steam shared by the integrated notebook.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function makeSteamTex() {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(256, 512);
  for (let y = 0; y < 512; y++) {
    const v = y / 511, center = 128 + Math.sin(v * 3.8 + 0.4) * 13 + Math.sin(v * 7.1) * 5;
    const width = 20 + (1 - v) * 24;
    for (let x = 0; x < 256; x++) {
      const falloff = Math.exp(-(((x - center) / width) ** 2));
      const alpha = falloff * Math.sin(v * Math.PI) ** 1.6 * 0.36;
      const i = (y * 256 + x) * 4;
      image.data[i] = 255; image.data[i + 1] = 251; image.data[i + 2] = 241; image.data[i + 3] = Math.round(alpha * 255);
    }
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function MugSteam({ reduced }: { reduced: boolean }) {
  const tex = useMemo(makeSteamTex, []);
  const root = useRef<THREE.Group>(null);
  const inverseParent = useMemo(() => new THREE.Quaternion(), []);
  const puffs = useRef<THREE.Mesh[]>([]);
  const count = 4;
  useEffect(() => () => tex.dispose(), [tex]);
  useFrame((state) => {
    const t = reduced ? 0 : state.clock.elapsedTime;
    if (!root.current) return;
    root.current.getWorldQuaternion(inverseParent).invert();
    puffs.current.forEach((wisp, i) => {
      const life = ((reduced ? 0.35 : t * 0.12) + i / count) % 1;
      const lane = (i % 2 - 0.5) * 0.055;
      const drift = Math.sin(t * 0.34 - life * 1.7 + i * 1.3) * 0.045 * (0.2 + life * 0.7);
      wisp.position.set(lane + drift, 0.54 + life * 0.85, Math.cos(t * 0.25 + i) * 0.018);
      wisp.scale.set(0.28 + life * 0.20, 0.3 + life * 0.4, 1);
      // Coffee is rotated with its desk group; compensate that transform before facing the camera.
      wisp.quaternion.copy(inverseParent).multiply(state.camera.quaternion);
      (wisp.material as THREE.MeshBasicMaterial).opacity = (reduced ? 0.08 : 0.28) * Math.sin(life * Math.PI) ** 1.3;
    });
  });
  return <group ref={root}>
    {Array.from({ length: count }, (_, i) => <mesh key={i} ref={mesh => { if (mesh) puffs.current[i] = mesh; }} raycast={() => null}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} opacity={0} color="#fff9ec" toneMapped={false} />
    </mesh>)}
  </group>;
}

export function Candle({ position, rot = 0, reduced }: { position: [number, number, number]; rot?: number; reduced: boolean }) {
  const flame = useRef<THREE.Group>(null);
  // gentle flame flicker (frozen when reduced motion)
  useFrame((state) => {
    if (!flame.current) return;
    if (reduced) { flame.current.scale.set(1, 1, 1); return; }
    const t = state.clock.elapsedTime;
    const s = 1 + Math.sin(t * 9) * 0.06 + Math.sin(t * 21) * 0.03;
    flame.current.scale.set(1 - (s - 1) * 0.4, s, 1 - (s - 1) * 0.4);
    flame.current.position.x = Math.sin(t * 6) * 0.004;
  });
  const RJ = 0.4;            // jar outer radius (slightly narrower → a touch taller-feeling)
  const JH = 0.66;           // jar wall height
  // FIX (r4): r3 still read as a 3-band "plastic bucket" (cream top / gray-brown mid / hard
  // orange bottom). Root causes removed this round:
  //   (a) the strong-emissive amber CORE cylinder (made a solid orange band) — DELETED. The warm
  //       bottom glow now comes only from the glass's own amber attenuation getting deeper toward
  //       the base (a natural vignette), not a glowing solid cylinder, so there is no hard cut.
  //   (b) the cold cream wax (#f3ecda) read GRAY behind the amber tint with no env reflection.
  //       Wax warmed to a creamy amber-yellow (#f0e2bf) so it transmits as warm cream, not gray.
  //   (c) glass tint pulled toward a single warm amber (no separate hi/lo bands); attenuation
  //       does the top-light→bottom-deep gradient continuously.
  // FIX (r6 review #2): r5 glass read as an opaque cream/tan cylinder — the amber tint was too pale
  // and opacity 0.6 let the bright inner wax fill the wall, so the AMBER GLASS never registered.
  // This round the wall colour is deepened + more saturated (a real amber-brown) and opacity is
  // lowered so the glass wall's own amber tint wins over the cream wax behind it; a fresnel-style
  // emissive rim keeps the wall edges readable as glass (no env map in this scene).
  // FIX (r4 — review #1, the recurring FAIL): transmission needs an env map to fold light/
  // refraction through the wall; this scene has NONE, so every prior round's transmissive
  // meshPhysicalMaterial just read as one flat matte amber wall — no透过感, no glass highlight.
  // This round drops transmission entirely and FAKES the glass with layered translucent shells:
  //   • a slightly-undersized CREAM WAX core that actually shows through,
  //   • an UPPER reveal shell (low-opacity amber) so the cream core reads through the top half,
  //   • a LOWER shell pressed to amberDeep (the wax pool is dark down there),
  //   • a Fresnel emissive RIM baked into the wall material (onBeforeCompile) so the silhouette
  //     edges glow like a glossy glass profile, plus a small warm rim light from the side.
  // FIX (r7 review #1 — the recurring "amber glass never registers", this time flipped to dead
  // cream): r6's #955226 wall at opacity 0.8 was too pale/light, and the cream core was bright
  // enough that the wall lost to the core (front-face sample read ≈(142,122,86) khaki, not amber).
  // This round deepens + saturates the wall to a true honey-brown, raises its emissive a touch so
  // the wall itself carries a warm translucent glow, AND dims/narrows the cream core so what you
  // read is "warm-glowing wax SEEN THROUGH deep amber glass", not a pale solid cylinder.
  // FIX (r7 — codex items 2 & 3): r6 still read as an OPAQUE deep-brown inner pillar with pale-gray
  // transparent side walls — not a continuous translucent amber-glass jar. Two root causes fixed:
  //   (a) glass wall opacity 0.82 was high enough that it read as a solid wall, and the side walls
  //       (grazing the cold scene) went pale-gray; lowered to a true translucent amber (0.58) so the
  //       warm wax behind glows THROUGH the glass and the whole jar reads as one amber body.
  //   (b) the tall cream core acted as a solid inner cylinder. The core is now SHORT (a low wax pool
  //       in the bottom third) + warmer amber, so most of the jar height is glass with warm glow,
  //       not a visible solid pillar.
  // Amber palette warmed + lightened a touch so the translucent glass reads as glowing honey, not
  // a dead chocolate brown.
  // r8 (self-review #1 — the recurring "amber glass never registers, flipped to dead cream"):
  // r7's wall stayed at opacity 0.8 (the comment claimed 0.56 but the value was never lowered), so
  // the bright wax core showed THROUGH the wall and washed the jar to a pale orange/cream cylinder
  // with amber only at the rim — exactly the inverse of the reference. This round forces the AMBER
  // GLASS to win: (a) opacity dropped 0.8 → 0.6 so the wall is genuinely translucent but its own
  // deep amber tint dominates the now-dim wax behind it; (b) the wall colour itself is pulled
  // deeper/darker so even at 0.6 it reads as honey-brown glass, not pale orange; (c) the wax core
  // is shortened to a low pool + darkened (below) so most of the jar height is glass-over-dark.
  // r9 (codex item 1 — the recurring "amber glass never registers / washes to cream"): every prior
  // round chased透过感 with a LOW-opacity wall + a bright cream core showing through, and every round
  // the core washed the side walls to cream/khaki plastic. Root cause: a translucent wall over a
  // light core can only ever read as "light core tinted faintly" from a grazing angle. The reference
  // jars are NOT see-through — they are fairly OPAQUE deep-amber glass with a warm glow only near the
  // top melt-pool. This round flips the whole approach: the wall is now a near-opaque honey-amber
  // (opacity 0.92) so its own colour wins everywhere, the wax core is dark + small so it never bleeds
  // through, and the Fresnel edge highlight is a DEEP AMBER (not white) so side walls glow amber at
  // grazing angles instead of washing to pale grey.
  // r1-续 (codex item 2 — r9's near-opaque #8a4a1c@0.92 + deep #532b0f gradient read as a DEAD
  // BLACK BUCKET, not lit amber glass). Root cause: opacity 0.92 over a dark wax core, plus a
  // bottom-pinned deep-brown gradient, killed all luminance — the jar went charcoal. This round
  // pulls the whole amber palette LIGHTER + warmer (honey, not chocolate), keeps the wall opaque
  // enough to read as a body but adds (a) a dedicated INNER GLOW shell just inside the wall that
  // emits warm amber so the glass is lit from within, and (b) a vertical specular highlight strip
  // baked into the wall so it reads as curved glossy GLASS, not a matte tube.
  // A3 r2 (codex item 7 "amber glass too pale, reads layered/cylindrical, inner core visible; darken
  // transmission color, increase opacity, blend inner geometry so cross-section reads single glass
  // wall"): every prior round the wall washed to pale cream because the bright inner glow + wax core
  // out-shone a thin translucent wall. This round commits to the REFERENCE read — the jars are a
  // fairly OPAQUE deep honey-amber glass, glow only near the top melt-pool. Palette DEEPENED so even
  // at higher opacity it reads as rich amber (not bright orange, not pale cream), and the inner glow
  // is tamed (below) so the wall colour wins everywhere.
  // A3 r3 (wf-a2a3, 2026-06-06): the r2 near-opaque #8a4416 @ opacity 0.94 read as a DEAD-ORANGE
  // solid bucket in every side cell — no interior glow, no glass translucency (the recurring
  // "amber glass never registers", this round flipped to "死橙桶"). Root cause re-diagnosed: a
  // 0.94-opacity wall fully OCCLUDES the inner-glow shell behind it, so the warm interior never
  // transmits → flat orange wall. This round lowers the wall opacity so the inner glow reads
  // THROUGH it, lifts the inner-glow + melt-pool wax, and pulls the wall colour toward HONEY (not
  // dead orange). The Fresnel rim stays amber but the body now reads "warm wax through honey glass".
  const amber = '#9a5a26';   // honey-amber glass base (lightened from #8a4416 toward honey so the
                             // wall reads as glowing amber glass, not a dead-orange solid)
  const amberDeep = '#5e360f';// deep amber for the lower body + base (lifted from #542c0e)
  const amberMid = '#8a4f22'; // mid amber for the Fresnel edge (a warm amber rim, never white)
  // wax fill DARKENED to a deep amber — seen through the amber glass it must NOT brighten the wall to
  // cream. Only the very TOP surface (waxLit) is the lighter melt-pool cream near the flame.
  // A3 r2 (codex item 7): the bright wax body bled through the translucent wall and washed the jar
  // to pale cream every prior round. DEEPENED to a dark amber-brown so the interior no longer
  // out-shines the wall — most of the jar height now reads as the wall's deep amber glass, with the
  // warm glow confined to the top melt-pool (waxLit), as in the reference.
  const wax = '#7e4e1e';     // A3 r3: lifted from #5e3414 — the dark wax read as an unlit interior
                             // (no warmth透过). A warmer mid amber-brown so the wax pool透 honey
                             // through the now-lower-opacity glass wall (warm interior, not black).
  const waxLit = '#efdcb4';  // r9 (top-pass): lit upper melt-pool surface — a pale warm CREAM (lifted
                             // again from #e2bd84) so even under the warm candle point-lights the top
                             // view reads as a light cream wax pool, not orange/red coffee. Only the
                             // very top surface uses this; the body stays deep amber.
  // r5 (codex FAIL #2 "分层塑料杯"): the previous build stacked TWO glass shells (light-amber upper
  // + deep-amber lower) at different opacities → a hard horizontal seam mid-jar that read as two
  // cups stacked, and the cream wax core bled through the low-opacity upper as a bright cream band.
  // This round uses ONE continuous tapered amber wall whose tint deepens smoothly bottom→top via a
  // shader vertical gradient (no seam), at a HIGH opacity so the wall's own amber wins over the
  // cream wax behind it (the cream now only glows at the very top, as in the reference). A Fresnel
  // emissive rim keeps the silhouette edges glassy (no env map in this scene).
  const glassWall = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: amber, roughness: 0.18, metalness: 0,
      // r2 (codex item 2 — "罐身仍读死黑桶, opacity+depthWrite 组合导致整面遮光"): the prior wall
      // ran opacity 0.82 + depthWrite:true, which made the front face write depth and OCCLUDE the
      // new inner-glow shell behind it, so the jar read as one solid uniform brown tube. This round
      // the wall is depthWrite:FALSE (renderOrder draws it last over the lit interior) so the warm
      // inner-glow shell + wax glow read THROUGH the glass as real interior depth, and opacity is
      // eased to 0.7 so the centre transmits warmth while the silhouette keeps its amber tint. The
      // emissive baseline carries the body so it never goes charcoal; a vertical specular strip
      // (below) gives the curved glossy-glass sheen.
      // A3 r3: opacity 0.94 → 0.66 so the inner-glow shell + warm wax read THROUGH the wall (the
      // 0.94 wall fully occluded the interior → dead-orange bucket). emissive lifted so the glass
      // body itself carries a warm honey glow even where the interior is dim.
      transparent: true, opacity: 0.66, side: THREE.DoubleSide, depthWrite: false,
      emissive: new THREE.Color(amber), emissiveIntensity: 0.26,
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uDeep = { value: new THREE.Color(amberDeep) };
      // pass local Y (0..1 over the wall height) so the fragment shader can deepen the tint
      // continuously toward the base — one wall, no stacked-shell seam.
      shader.vertexShader = 'varying float vWallY;\nvarying float vWallAng;\n' + shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n vWallY = clamp((position.y + 0.5), 0.0, 1.0);\n vWallAng = atan(position.x, position.z);',
      );
      shader.fragmentShader = 'uniform vec3 uDeep;\nvarying float vWallY;\nvarying float vWallAng;\n' + shader.fragmentShader
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
           {
             // r1-续 (codex item 2): continuous bottom→top tint but the FLOOR is raised — the lower
             // body eases toward uDeep (now a warm deep-amber, not near-black) only at the very base,
             // so the jar reads as a continuous GLOWING honey-amber glass body, never a charcoal
             // bucket. mix factor floored at 0.5 so even the base keeps half the bright honey tone.
             float _g = mix(0.5, 1.0, smoothstep(0.0, 0.95, vWallY));
             diffuseColor.rgb = mix(uDeep, diffuseColor.rgb, _g);
           }`,
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
           {
             // r2 (codex item 2): three cues so the wall reads as lit, curved GLASS — not a matte
             // dark tube. (a) a deep-amber Fresnel edge so the silhouette glows amber at grazing
             // angles AND the centre (head-on) stays clearer/warmer (transmits the inner glow).
             // (b) a BRIGHT VERTICAL specular highlight STRIP down the front of the curved wall (a
             // glossy glass reflection band) — widened + brightened so even the flat side faces
             // carry a clear glass sheen, killing the "死黑桶" uniform-brown read. (c) a faint warm
             // centre lift so the middle of the wall transmits the interior warmth.
             // r2 (codex item 7 "amber glass too pale"): the prior centre-transmission lift (0.30)
             // brightened the whole front face → pale cream read. CUT to 0.10 so the wall keeps its
             // deep amber tint head-on; only a NARROW glossy specular strip (not a broad lift) sells
             // the curved-glass sheen. Fresnel edge kept so the silhouette glows amber.
             vec3 _V = normalize(vViewPosition);
             float _ndv = clamp(dot(normalize(vNormal), _V), 0.0, 1.0);
             float _fEdge = pow(1.0 - _ndv, 4.0);
             totalEmissiveRadiance += vec3(0.50, 0.24, 0.09) * _fEdge * 0.50;
             // faint warm centre transmission (subtle — must NOT wash the amber to cream)
             totalEmissiveRadiance += vec3(0.40, 0.22, 0.10) * _ndv * 0.10 * smoothstep(0.1, 0.9, vWallY);
             // primary glossy strip: a NARROW warm band centred at one azimuth, fading top→bottom.
             float _strip = exp(-pow((vWallAng - 0.9) / 0.20, 2.0));
             totalEmissiveRadiance += vec3(0.95, 0.72, 0.46) * _strip * 0.40 * smoothstep(0.04, 0.9, vWallY);
             // secondary thin sheen on the opposite shoulder (subtle, so the cylinder reads round)
             float _strip2 = exp(-pow((vWallAng + 1.7) / 0.18, 2.0));
             totalEmissiveRadiance += vec3(0.80, 0.58, 0.36) * _strip2 * 0.16 * smoothstep(0.1, 0.85, vWallY);
           }`,
        );
    };
    return m;
  }, []);
  // FIX (r6 review #1 + #3): bake the cream label background AND the SANDALWOOD text into ONE
  // canvas texture (Fiona lock 2026-06-06: "一个 decal 搞定,字在标签内水平垂直居中留边距"). The r5
  // separate <Text> plane floated off the curved label + the text never read; and the bare-cream
  // label flared as a peeling sticker at grazing angles. Here: a single muted cream label with the
  // word baked in, soft-feathered edges (no hard rectangle), and a slightly darker米褐 tone so it
  // no longer flares brighter than the glass at tangent views.
  const labelTex = useMemo(() => {
    // r4-iter3: W widened 512 → 1024. ROOT CAUSE of the persistent end-letter clipping: the font
    // auto-shrink loop floors at 30px, and SANDALWOOD at 30px Georgia-bold renders ~210px wide — i.e.
    // ~0.41 of a 512px canvas — regardless of the `band` value, so lowering `band` below ~0.4 did
    // nothing and the word always wrapped ~0.20-rad of arc, clipping at a graze. Doubling the canvas
    // width keeps the SAME legible font but halves the word's FRACTION of the texture (≈0.20), so the
    // baked word occupies a much narrower arc and both az0/az45 keep S…D on the front face.
    const W = 1024, H = 256;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d')!;
    // r5 (codex FAIL #1 "字只露半截/标签不够清晰"): the previous label had WIDE 46px feather on a
    // 320px canvas → the rectangle dissolved at the edges and read mushy; and the word filled the
    // whole canvas width so the curved cylinder swept the end letters off the front face. This round:
    //   • bigger 512px canvas (crisper text under minification),
    //   • the WORD occupies only the centre ~62% of the width (big side margins) so even on the
    //     curved wall the whole word stays on the front face, centred,
    //   • a CRISP cream rectangle with only a NARROW edge feather (the four sides stay soft but the
    //     main rectangle is clearly a solid plate, per codex "减少羽化使主体矩形清楚").
    // r8 (self-review #2): with the wall now a deep amber-brown, the cream label naturally pops; to
    // guarantee legibility at low-grazing views the ground is brightened a touch (#e6dcc0) so it
    // reads as a distinct cream plate against the dark glass.
    x.fillStyle = '#e6dcc0'; x.fillRect(0, 0, W, H);
    x.globalAlpha = 0.07; x.fillStyle = '#a8966f';
    for (let i = 0; i < 90; i++) {
      x.beginPath(); x.arc(Math.random() * W, Math.random() * H, 3 + Math.random() * 7, 0, Math.PI * 2); x.fill();
    }
    x.globalAlpha = 1;
    // SANDALWOOD — dark, centred H+V, constrained to the centre 62% of width so it never curves off.
    // r8 (self-review #2): text deepened (#281d10) + slightly heavier weight below for max contrast
    // against the cream plate so the full word is legible at front + low-grazing views.
    x.fillStyle = '#211609';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    const word = 'SANDALWOOD';
    // r2 (codex item 1 — "az45 只读到 SAND.../az270 只剩 ...WOOD; 文字再收窄"): the word is pulled into
    // the centre ~42% of the texture so even at a ±45° azimuth view the whole SANDALWOOD stays on the
    // front-facing portion of the 156° plate (the end letters no longer curve off the side). Ink
    // deepened (#211609) + tighter letter-spacing keeps it legible at the smaller size.
    // r3 (round-2 review item 1 + codex item 3 — read at BOTH az0 and az45): the label is now centred
    // between the two views (rot≈3.70 ⇒ centre ~az22), so each view is only ~22° off the label
    // normal. The word is pulled tighter still (centre ~36% of the texture) so even from a 22° tilt
    // the whole SANDALWOOD stays on the face-on arc with side margin, never wrapping off.
    // r4 (self-review FAIL "az0 读成 ANDALWOOD / az45 读成 SANDALWOO"): the ACTUAL root cause was the
    // callsite rot=2.82 aiming the label normal at az108 (≈straight at the az90 camera), 108° off az0
    // and 63° off az45 — so each named view saw the label at a steep graze and the end letter (S or D)
    // curved off the visible edge. The rot is corrected at the callsite to aim the normal at az22.5
    // (the az0↔az45 bisector). As a belt-and-suspenders end-letter safety margin, the word band is
    // also narrowed 0.27 → 0.23 (and the visible arc to 154° below) so the whole S…D sits well inside
    // the front-facing arc with equal L/R margin from either 22.5°-off view.
    // band as a FRACTION of the (now-wider) canvas. With W=1024 the 30px-floor word (~210px) is only
    // ~0.205 of W, so a 0.24 band leaves margin without forcing the font below the legible floor.
    // r2 (codex item 6): band widened 0.24 → 0.30 so the word fills more of the now-narrower (96°)
    // label patch → SANDALWOOD reads as a distinct sticker, not a small line on a wide band. Still
    // leaves side margin inside the patch so the end letters stay on the front-facing arc.
    const band = W * 0.30;
    let fontPx = 56; let ls = 0.6;
    const measure = (fp: number, lsp: number) => {
      x.font = `700 ${fp}px Georgia, serif`;
      let tot = 0; word.split('').forEach((ch) => { tot += x.measureText(ch).width + lsp; });
      return tot - lsp;
    };
    while (measure(fontPx, ls) > band && fontPx > 26) fontPx -= 1;
    x.font = `700 ${fontPx}px Georgia, serif`;
    const widths = word.split('').map((ch) => x.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0) + ls * (word.length - 1);
    let cur = W / 2 - total / 2;
    word.split('').forEach((ch, i) => { x.fillText(ch, cur + widths[i] / 2, H / 2); cur += widths[i] + ls; });
    // NARROW edge feather (~20px) so the rectangle reads as a clean solid plate with just-soft edges,
    // not a dissolving smudge. Four-side linear ramp via destination-in.
    const fade = 36;   // r4-iter3: scaled up with the wider 1024px canvas so the edge feather keeps
                       // the same proportion (~3.5% of width) — a clean plate with just-soft edges.
    const mask = document.createElement('canvas'); mask.width = W; mask.height = H;
    const mx = mask.getContext('2d')!;
    const fL = mx.createLinearGradient(0, 0, fade, 0); fL.addColorStop(0, 'rgba(255,255,255,0)'); fL.addColorStop(1, 'rgba(255,255,255,1)');
    const fR = mx.createLinearGradient(W - fade, 0, W, 0); fR.addColorStop(0, 'rgba(255,255,255,1)'); fR.addColorStop(1, 'rgba(255,255,255,0)');
    const fT = mx.createLinearGradient(0, 0, 0, fade); fT.addColorStop(0, 'rgba(255,255,255,0)'); fT.addColorStop(1, 'rgba(255,255,255,1)');
    const fB = mx.createLinearGradient(0, H - fade, 0, H); fB.addColorStop(0, 'rgba(255,255,255,1)'); fB.addColorStop(1, 'rgba(255,255,255,0)');
    mx.globalCompositeOperation = 'source-over';
    mx.fillStyle = fL; mx.fillRect(0, 0, W, H);
    mx.globalCompositeOperation = 'destination-in';
    mx.fillStyle = fR; mx.fillRect(0, 0, W, H);
    mx.fillStyle = fT; mx.fillRect(0, 0, W, H);
    mx.fillStyle = fB; mx.fillRect(0, 0, W, H);
    x.globalCompositeOperation = 'destination-in';
    x.drawImage(mask, 0, 0);
    x.globalCompositeOperation = 'source-over';
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true;
    return t;
  }, []);
  return (
    <group position={position} rotation={[0, rot, 0]}>
      {/* WARM WAX FILL — r7 (codex item 2): the old core was DARK (deep-brown lower slice) which read
          as an opaque inner pillar through the glass. The candle reads as FULL (wax surface near the
          rim, like the reference), but the whole fill is now a WARM GLOWING amber-cream — not a dark
          cylinder. Combined with the glass wall's lowered opacity (0.56), the wax now glows THROUGH
          the amber glass as one continuous lit body, instead of a dark pillar behind pale-gray walls.
          One continuous fill (no hi/lo seam); a vertical emissive gradient via material does the
          subtle top-bright / base-deep falloff. Core radius RJ-0.085 so amber glass rings it. */}
      <mesh position={[0, 0.30, 0]} castShadow>
        {/* r9 (top-pass): core TOP lowered to y≈0.55 (was 0.608, coplanar with the melt pool → it
            z-fought and showed as a dark-red disc in the top view). Now the cream melt pool sits a
            clear 0.06 above the core top, so the top reads as one continuous cream pool. */}
        <cylinderGeometry args={[RJ - 0.085, RJ - 0.085, 0.5, 40]} />
        {/* r8/r9: dark wax core (below the visible melt pool). Hidden behind the now-near-opaque
            amber wall, so it only sets the deep interior tone; it must NOT show as a dark-red disc
            from the top — the bright melt pool above (widened below) covers the whole interior. */}
        {/* A3 r3: wax core emissive lifted (0.03 → 0.14) so the interior reads as a WARM wax body
            through the now-translucent glass, not a black void. */}
        <meshStandardMaterial color={wax} roughness={0.96} emissive="#5a3410" emissiveIntensity={0.14} />
      </mesh>
      {/* WAX MELT POOL (top surface). FIX (r9 — codex item 3 "顶视偏深红像咖啡"): the prior pool was
          a narrow disc (RJ-0.055) ringed by the DARK core, so the top read as a small bright dot in a
          deep red-brown ring. Now the pool is WIDENED to nearly the inner wall (RJ-0.02) and the
          colour lifted to a warm CREAM/honey (waxLit) so from above the whole interior reads as a
          warm cream wax pool with a glow near the flame — not dark liquid. emissive kept gentle. */}
      <mesh position={[0, 0.04 + JH * 0.86, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[RJ - 0.02, 44]} />
        {/* r9 (top-pass): emissive cut to a faint warm tint (0.16→0.06) so the pool reads by its
            pale-cream DIFFUSE, not as a self-lit orange disc. */}
        <meshStandardMaterial color={waxLit} roughness={0.92} emissive="#d9b878" emissiveIntensity={0.06} />
      </mesh>
      {/* tiny warm-shadow ring right at the wick base (a melt dip), small so it doesn't read as a
          dark central hole — just a soft wax dimple under the flame. FIX (r2 — codex item 9 "wick
          dimple near-coplanar with the pool, no DECAL → z-fight as the camera orbits"): lifted to a
          clear +0.006 above the pool AND given DECAL material props (transparent + depthWrite:false +
          polygonOffset −2/−2) so it never z-fights the wax-pool disc. */}
      <mesh position={[0, 0.04 + JH * 0.86 + 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.05, 24]} />
        <meshStandardMaterial color="#b98a4c" roughness={0.92} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
      </mesh>
      {/* dark wick — taller so its tip + flame clear the jar rim (0.7) and read from 3/4 angles.
          FIX (r2 — codex item 8 "add a small dark wick cylinder visible as a dot from the top"): top
          radius bumped 0.012 → 0.016 and the colour pushed near-black so that, with the flame bloom
          now narrowed, the top view reads a small dark wick dot at the pool centre (not a glowing
          bullseye). */}
      <mesh position={[0, 0.04 + JH * 0.86 + 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.016, 0.018, 0.09, 8]} />
        <meshStandardMaterial color="#1c150e" roughness={0.95} />
      </mesh>
      {/* flame: inner bright cone + outer warm glow cone (self-illuminating, additive halo).
          FIX (r3 item 3): raised the whole flame group (~0.13 above wax) and grew the cones so the
          tip reaches ~y=0.97 — well above the jar rim (0.7), visible from low 3/4 angles, not
          buried inside the glass. */}
      {/* A3 r3 (review item 2 "侧格看不到火苗 — 火苗太小/被裁"): the flame is GROWN and RAISED so it
          stands clearly above the jar rim and reads at low 3/4 angles. Group raised +0.04, cones
          enlarged (outer 0.034→0.044×0.18→0.24, inner 0.022→0.032×0.14→0.19) so the tip reaches a
          clear distance above the rim. */}
      <group ref={flame} position={[0, 0.04 + JH * 0.86 + 0.16, 0]}>
        {/* outer warm halo cone — narrow enough that the top view stays a small warm point, not a
            bullseye ring, but tall enough to read as a flame from 3/4. */}
        <mesh>
          <coneGeometry args={[0.044, 0.24, 14]} />
          <meshBasicMaterial color="#ffb24a" transparent opacity={0.30} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh position={[0, -0.018, 0]}>
          <coneGeometry args={[0.032, 0.19, 12]} />
          <meshBasicMaterial color="#fff1c2" toneMapped={false} />
        </mesh>
      </group>
      {/* warm point light for the cozy glow. FIX (r2): distance pulled 3.2 → 2.2 so the warm pool
          lights the jar's own glow but no longer spills onto the latte cup. FIX (r3 item 3):
          intensity nudged up a touch for a readable lit-candle halo; distance held at 2.2 and the
          candle is now further from the mug, so no spill onto the coffee surface. */}
      <pointLight position={[0, 0.04 + JH * 1.04, 0]} color="#ffb866" intensity={reduced ? 0.45 : 0.8} distance={2.2} decay={2} />

      {/* r2 (codex item 2 — "加内暖发光层"): a dedicated INNER GLOW shell just inside the glass wall.
          It is an open cylinder a hair smaller than the wall, emitting a warm honey glow with NO
          depthWrite, drawn before the (also depthWrite-off) wall, so the jar is lit from within and
          the wall transmits that warmth instead of reading as a flat opaque brown bucket. Doubled-
          sided + additive-ish warm emissive gives the soft internal candle-glow seen in the ref. */}
      <mesh position={[0, 0.05 + (JH - 0.05) * 0.5, 0]} scale={[1, JH - 0.05, 1]} renderOrder={3}>
        <cylinderGeometry args={[RJ - 0.05, RJ - 0.06, 1, 48, 1, true]} />
        {/* A3 r2 (codex item 7): inner glow TAMED — the r1 emissive 0.5 lit the interior bright
            enough to wash the amber wall to pale cream. Dropped to 0.22 + a deeper warm tint so the
            jar still glows from within near the top but the deep-amber wall colour wins; reads as one
            continuous dark amber glass body, not a pale layered cylinder. */}
        {/* A3 r3: inner glow LIFTED (emissive 0.22 → 0.46, opacity 0.4 → 0.62) so it now reads
            THROUGH the lowered-opacity (0.66) glass wall as a warm interior honey glow — the body
            no longer reads as a flat opaque orange cylinder. */}
        <meshStandardMaterial color="#c08038" roughness={0.6} transparent opacity={0.62} depthWrite={false}
          side={THREE.BackSide} emissive="#cf8a3c" emissiveIntensity={0.46} />
      </mesh>
      {/* FAKE-GLASS WALL — ONE continuous tapered amber wall (r5 fix for codex "分层塑料杯"): a single
          unit-height cylinder, scaled to the wall height, drawn LAST with depthWrite off over the
          undersized cream core. Its shader deepens the amber tint smoothly bottom→top (no stacked-
          shell seam) at high opacity so the WALL's amber wins over the cream core (cream only glows
          at the top, as in the reference). Fresnel emissive rim baked into glassWall. Unit cylinder
          (height 1, y∈[-0.5,0.5]) so the shader's vWallY=position.y+0.5 maps 0..1 over the wall. */}
      <mesh position={[0, 0.05 + (JH - 0.05) * 0.5, 0]} scale={[1, JH - 0.05, 1]} material={glassWall} renderOrder={4} castShadow>
        <cylinderGeometry args={[RJ - 0.005, RJ - 0.018, 1, 56, 1, true]} />
      </mesh>
      {/* warm side rim light so the curved glass wall carries a soft glossy highlight strip (a glass
          read cue transmission would have given). Low intensity, short distance → just the jar. */}
      <pointLight position={[RJ + 0.5, 0.04 + JH * 0.55, 0.35]} color="#ffcaa0" intensity={reduced ? 0.2 : 0.32} distance={1.6} decay={2} />
      {/* r5: the separate amber-deep bottom skirt is REMOVED — it re-introduced a hard ring/band at
          the base (part of the "分层" read). The single glassWall shader now deepens toward the base
          on its own (continuous gradient), so no extra skirt is needed. */}
      {/* glossy amber rim at the jar mouth (reference jars draw in slightly + catch a bright glass
          highlight on the lip). Solid glossy amber so the top edge reads as a thick glass rim. */}
      {/* FIX (r7 — codex item 3): the rim torus (tube 0.022, emissive 0.06) still read as a THICK
          deep-brown plastic hoop with a bright top line, stealing the glass lip. Per the reference,
          the lip is a THIN, near-black glass edge with only a narrow specular sheen. Tube cut
          0.022 → 0.013 (a slim rim, no bucket band), colour pulled toward amberDeep so it reads as a
          dark glass edge, emissive nearly off (0.02) so there's no glowing hoop — the only highlight
          is a narrow specular streak from the low roughness. */}
      <mesh position={[0, 0.04 + JH - 0.004, 0]} rotation={[Math.PI / 2, 0, 0]} renderOrder={5}>
        <torusGeometry args={[RJ - 0.006, 0.013, 14, 48]} />
        <meshStandardMaterial color={amberDeep} roughness={0.14} metalness={0.05} emissive={amber} emissiveIntensity={0.02} />
      </mesh>
      {/* jar base (solid deep-amber disc so you don't see through the bottom) */}
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[RJ - 0.012, RJ - 0.03, 0.05, 48]} />
        <meshStandardMaterial color={amberDeep} roughness={0.3} />
      </mesh>

      {/* cream rectangular SANDALWOOD label — CURVED to hug the jar wall. FIX (r4 item 3): the r3
          arc read as a peeling flat card (radius/arc too small for RJ; az45 stuck out). Now the
          arc radius is set just proud of the glass OUTER wall (RJ+0.006) and the wrap is widened
          to ~120° of the front so any horizontal view sees label edges lying ON the glass curve,
          never a detached chord. Centered exactly on the −Z front face. renderOrder high so it
          draws over the transparent glass; depthWrite off so it never z-fights the wall. */}
      {(() => {
        // FIX (r5c): the real peel cause — the GLASS wall TAPERS in toward the base (top RJ → bottom
        // RJ-0.012) but the label was a STRAIGHT cylinder at RJ+0.002, so the label's lower edge sat
        // ~0.014 PROUD of the inward-leaning glass and lifted off as a flat flap at 3/4 angles. Now
        // the label cylinder TAPERS to match the glass slope, staying a hair proud everywhere.
        // r5: re-matched to the NEW single tapered wall (top 0.395 @ y0.66 → bottom 0.382 @ y0.05).
        // The label spans y≈0.263..0.503, where the wall radius is ≈0.387..0.392; set the label a
        // hair proud (+0.004) at each edge so it hugs the curve without lifting (no peel flap).
        // r3 (round-2 review item 1 — "SANDALWOOD 基线向右下倾斜, 尾字绕出标签"): the prior label was a
        // TAPERED cone (top 0.396 → bottom 0.391). On a cone the texture's horizontal text line maps
        // to a SLANTED screen line — that is the down-right tilt Fiona flagged. Fix: make the label a
        // STRAIGHT cylinder (single radius, no taper) so the baked-in horizontal word renders truly
        // horizontal. The wall taper is tiny (0.013 over the whole height), so a flat band at a
        // constant radius hugs it without lifting. Radius = the wall radius at the label's mid-height.
        const labelR = 0.392;                     // single constant radius — flat band, no cone tilt
        const labelRTop = labelR;
        const labelRBot = labelR;
        // r2 (codex item 1 — "az45 只读到 SAND..., az270 只剩 ...WOOD; label arc 加宽到 150-160°"):
        // the cream plate arc widened 128°→156° so a 3/4-front view (az45/az315, ±45° off the front
        // normal) sweeps the WHOLE centred word onto a face-on portion of the wall instead of cutting
        // it at a chord. The WORD is kept in the centre ~50% of the texture (band below) so even on
        // the wider wrap the end letters (S…D) stay on the front-facing arc, never curving past the
        // side; combined with the wider plate, az45/az315 now read the full SANDALWOOD.
        // r4 (self-review): arc narrowed 172° → 154° so a larger fraction of the plate faces the
        // viewer head-on; combined with the band 0.23 and the corrected callsite rot (normal at
        // az22.5), the worst-case end-letter grazing from az0/az45 is ~40°, well inside the readable
        // range — both views read the full SANDALWOOD with equal side margin.
        // FIX (r2 — codex item 6 "label wraps as a wide cream band across az0/135/225/315 instead of
        // a discrete paper patch; narrow the arc, text scaled up so it reads as a distinct sticker"):
        // the 154° plate swept nearly half the jar → a wraparound band. Narrowed to 96° so the cream
        // plate is a modest front patch (≈27% of circumference) with bare amber glass to either side,
        // reading as a stuck-on paper label like the reference. The baked word band is widened to
        // 0.30 (below) so SANDALWOOD scales UP to fill the narrower patch — a clear sticker, not a
        // thin line lost on a wide band.
        const labelArc = (96 * Math.PI) / 180;
        // three's cylinder theta=0 lies on +X; −Z front is at theta = -PI/2. Center the arc there.
        const thetaStart = -Math.PI / 2 - labelArc / 2;
        return (
          <group>
            {/* faint contact-shadow band on the glass just under the label, so the label reads as
                STUCK ON the curved wall (a contact darkening) rather than floating proud. */}
            <mesh position={[0, 0.04 + JH * 0.52 - 0.135, 0]} renderOrder={5}>
              <cylinderGeometry args={[labelRBot + 0.001, labelRBot - 0.001, 0.05, 40, 1, true, thetaStart, labelArc]} />
              <meshBasicMaterial color="#2a1c0c" transparent opacity={0.16} depthWrite={false} side={THREE.FrontSide} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
            </mesh>
            {/* the label itself: roughness 0.96 + metalness 0 so the key light cannot drive it into
                a specular white chip; wide-feathered edges baked into the texture alpha. */}
            {/* r2 (codex item 6): label height 0.30 → 0.24 so the patch is a modest paper sticker
                (~36% of jar height) rather than a tall band, matching the reference proportion. */}
            <mesh position={[0, 0.04 + JH * 0.52, 0]} renderOrder={6}>
              <cylinderGeometry args={[labelRTop, labelRBot, 0.24, 40, 1, true, thetaStart, labelArc]} />
              <meshStandardMaterial map={labelTex} roughness={0.96} metalness={0} side={THREE.FrontSide} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3} />
            </mesh>
          </group>
        );
      })()}
    </group>
  );
}
