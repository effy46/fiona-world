"""
Procedural 3D model generator for the reference eyeglasses.

Builds a shape-accurate, clean, low/medium-poly model of a pair of glasses:
  - black glossy full-rim front frame with two large rounded-panto lenses
  - narrow, gently curved bridge
  - clear translucent silicone nose pads on thin metal arms
  - small warm-gold accent pieces at the top-outer hinge corners
  - thin black temples, mostly straight then hooked down at the ends
  - clear transparent lenses

Exports glTF-binary (.glb) and Wavefront (.obj). Run render_preview.py for
orthographic preview images.

Coordinate system (glTF, Y-up, right-handed):
  +X : wearer's left  -> screen right (frame width)
  +Y : up
  +Z : toward the wearer / back (temples extend toward +Z)
  -Z : front of the glasses (faces the world)

Scale is arbitrary; proportions match the reference photos. Units ~ centimetres.
"""

import numpy as np
import trimesh
from trimesh.visual.material import PBRMaterial

# --------------------------------------------------------------------------
# small vector helpers
# --------------------------------------------------------------------------

def _norm(v):
    n = np.linalg.norm(v)
    return v / n if n > 1e-12 else v


def rotate_about_axis(v, axis, angle):
    """Rodrigues rotation of vector v about unit axis by angle (rad)."""
    axis = _norm(axis)
    c, s = np.cos(angle), np.sin(angle)
    return v * c + np.cross(axis, v) * s + axis * np.dot(axis, v) * (1.0 - c)


# --------------------------------------------------------------------------
# cross-section profiles (closed 2D loops in (u, v))
# --------------------------------------------------------------------------

def rounded_rect_profile(width, height, radius, seg_per_corner=4):
    """Closed rounded-rectangle profile centred on the origin.
    width spans u, height spans v."""
    w, h, r = width / 2.0, height / 2.0, radius
    r = min(r, w, h)
    corners = [
        (w - r, h - r, 0.0),            # top-right
        (-(w - r), h - r, np.pi / 2),   # top-left
        (-(w - r), -(h - r), np.pi),    # bottom-left
        (w - r, -(h - r), 1.5 * np.pi), # bottom-right
    ]
    pts = []
    for cx, cy, a0 in corners:
        for k in range(seg_per_corner + 1):
            a = a0 + (np.pi / 2) * (k / seg_per_corner)
            pts.append((cx + r * np.cos(a), cy + r * np.sin(a)))
    return np.array(pts)


def ellipse_profile(width, height, n=16):
    a = np.linspace(0, 2 * np.pi, n, endpoint=False)
    return np.column_stack([(width / 2) * np.cos(a), (height / 2) * np.sin(a)])


# --------------------------------------------------------------------------
# sweep helpers
# --------------------------------------------------------------------------

def _quad_faces(n_path, m_prof, path_closed):
    """Triangle indices connecting consecutive rings of a swept tube."""
    faces = []
    rings = n_path if path_closed else n_path - 1
    for i in range(rings):
        i0 = i * m_prof
        i1 = ((i + 1) % n_path) * m_prof
        for j in range(m_prof):
            j1 = (j + 1) % m_prof
            a, b = i0 + j, i0 + j1
            c, d = i1 + j, i1 + j1
            faces.append((a, b, d))
            faces.append((a, d, c))
    return faces


def sweep_radial(path_xyz, profile_uv, center_xy, depth_axis=(0, 0, 1)):
    """Sweep a profile along a CLOSED planar-ish loop, orienting the profile's
    u-axis radially (outward from center_xy in the XY plane) and the v-axis
    along depth_axis. Ideal for lens rims: u = rim thickness, v = frame depth.
    Produces watertight torus topology."""
    depth_axis = _norm(np.asarray(depth_axis, float))
    cx, cy = center_xy
    verts = []
    for p in path_xyz:
        radial = _norm(np.array([p[0] - cx, p[1] - cy, 0.0]))
        for u, v in profile_uv:
            verts.append(p + u * radial + v * depth_axis)
    verts = np.array(verts)
    faces = _quad_faces(len(path_xyz), len(profile_uv), path_closed=True)
    return verts, np.array(faces)


def sweep_ptf(path_xyz, profile_uv, closed=False, cap=True, up_hint=(0, 1, 0)):
    """Sweep a profile along an open curve using a parallel-transport frame.
    Used for the bridge, temples and nose-pad arms."""
    path = np.asarray(path_xyz, float)
    n = len(path)
    # tangents
    tan = np.zeros_like(path)
    tan[1:-1] = path[2:] - path[:-2]
    tan[0] = path[1] - path[0]
    tan[-1] = path[-1] - path[-2]
    tan = np.array([_norm(t) for t in tan])

    # initial normal perpendicular to first tangent
    up = _norm(np.asarray(up_hint, float))
    if abs(np.dot(up, tan[0])) > 0.95:
        up = np.array([1.0, 0.0, 0.0])
    normals = [_norm(np.cross(np.cross(tan[0], up), tan[0]))]
    for i in range(1, n):
        v = np.cross(tan[i - 1], tan[i])
        s = np.linalg.norm(v)
        if s < 1e-9:
            normals.append(normals[-1])
        else:
            ang = np.arctan2(s, np.dot(tan[i - 1], tan[i]))
            normals.append(_norm(rotate_about_axis(normals[-1], v / s, ang)))
    verts = []
    for i in range(n):
        nrm = normals[i]
        binr = _norm(np.cross(tan[i], nrm))
        for u, v in profile_uv:
            verts.append(path[i] + u * nrm + v * binr)
    verts = np.array(verts)
    faces = _quad_faces(n, len(profile_uv), path_closed=closed)
    m = len(profile_uv)
    if cap and not closed:
        # start cap (fan)
        c0 = len(verts)
        verts = np.vstack([verts, path[0]])
        for j in range(m):
            faces.append((c0, (j + 1) % m, j))
        # end cap (fan)
        c1 = len(verts)
        verts = np.vstack([verts, path[-1]])
        base = (n - 1) * m
        for j in range(m):
            faces.append((c1, base + j, base + (j + 1) % m))
    return verts, np.array(faces)


# --------------------------------------------------------------------------
# geometry: lens rim outline
# --------------------------------------------------------------------------

LENS_CX = 3.55          # horizontal distance of each lens centre from origin
RX = 2.55               # lens half-width
RY_TOP = 2.28           # lens half-height (upper)
RY_BOT = 2.46           # lens half-height (lower, slightly fuller -> egg/panto)
SUPER_N = 2.25          # superellipse exponent (>2 = rounded polygon)
TILT_DEG = 5.0          # panto tilt: top leans outward
BASE_CURVE = 0.45       # how far the outer edges wrap back (+Z)
XMAX = LENS_CX + RX

RIM_THK = 0.30          # rim thickness seen from the front (radial, u)
RIM_DEPTH = 0.52        # rim depth seen from the side (front-back, v)


def lens_outline(side, n=96):
    """Centre-line of one lens rim as an (n,3) closed loop.
    side = +1 -> wearer's left (screen right), -1 -> the other lens."""
    cx = side * LENS_CX
    tilt = np.deg2rad(TILT_DEG) * (-side)  # top leans toward the outer edge
    th = np.linspace(0, 2 * np.pi, n, endpoint=False)
    ct, st = np.cos(th), np.sin(th)
    # superellipse, fuller bottom half
    ry = np.where(st >= 0, RY_TOP, RY_BOT)
    x = RX * np.sign(ct) * np.abs(ct) ** (2.0 / SUPER_N)
    y = ry * np.sign(st) * np.abs(st) ** (2.0 / (SUPER_N + 0.15))
    # panto tilt about the lens centre
    xr = x * np.cos(tilt) - y * np.sin(tilt)
    yr = x * np.sin(tilt) + y * np.cos(tilt)
    xw = cx + xr
    yw = yr
    # spherical-ish base curve: outer points wrap toward the wearer
    zw = BASE_CURVE * (xw / XMAX) ** 2
    return np.column_stack([xw, yw, zw])


# --------------------------------------------------------------------------
# build each component
# --------------------------------------------------------------------------

def build_rim(side):
    outline = lens_outline(side)
    prof = rounded_rect_profile(RIM_THK, RIM_DEPTH, RIM_THK * 0.45)
    v, f = sweep_radial(outline, prof, center_xy=(side * LENS_CX, 0.0))
    return trimesh.Trimesh(v, f, process=False)


def _outline_point(side, deg):
    """Point on a lens centre-line at a given polar angle (deg, 0=+x, CCW)."""
    o = lens_outline(side, n=720)
    cx = side * LENS_CX
    ang = (np.degrees(np.arctan2(o[:, 1], o[:, 0] - cx)) % 360)
    idx = int(np.argmin(np.abs((ang - deg + 180) % 360 - 180)))
    return o[idx]


def build_bridge():
    """Narrow, gently curved keyhole bridge connecting the two inner-top rims."""
    pr = _outline_point(+1, 158)   # right lens, inner-upper
    pl = _outline_point(-1, 22)    # left lens, inner-upper
    mid_top = np.array([0.0, max(pr[1], pl[1]) + 0.30, (pr[2] + pl[2]) / 2 - 0.05])
    # slight keyhole dip just below the apex
    q_r = np.array([0.55, (pr[1] + mid_top[1]) / 2 + 0.05, pr[2] - 0.02])
    q_l = np.array([-0.55, (pl[1] + mid_top[1]) / 2 + 0.05, pl[2] - 0.02])
    ctrl = np.array([pr, q_r, mid_top, q_l, pl])
    path = catmull_rom(ctrl, samples=48)
    prof = ellipse_profile(0.26, 0.34, n=14)
    v, f = sweep_ptf(path, prof, cap=True, up_hint=(0, 0, 1))
    return trimesh.Trimesh(v, f, process=False)


def catmull_rom(ctrl, samples=40):
    ctrl = np.asarray(ctrl, float)
    pts = np.vstack([ctrl[0], ctrl, ctrl[-1]])  # phantom endpoints
    out = []
    for i in range(1, len(pts) - 2):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[i + 1], pts[i + 2]
        for t in np.linspace(0, 1, samples, endpoint=(i == len(pts) - 3)):
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t +
                              (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
                              (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    return np.array(out)


def build_temple(side):
    """Thin temple: runs gently back near hinge height, then hooks down at
    the ear end. Stays close to straight in top view (slight open angle)."""
    hinge = _outline_point(side, 32 if side > 0 else 148)
    start = hinge + np.array([side * 0.02, 0.0, RIM_DEPTH * 0.5])
    sx = side
    ox = LENS_CX + RX  # outer reference x
    pts = [
        start,
        np.array([sx * (ox + 0.05), 1.55, 1.8]),
        np.array([sx * (ox + 0.10), 1.25, 4.2]),
        np.array([sx * (ox + 0.05), 0.85, 7.0]),  # mostly straight, gentle drop
        np.array([sx * (ox - 0.05), 0.30, 9.4]),
        np.array([sx * (ox - 0.12), -0.55, 11.0]),  # ear hook starts down
        np.array([sx * (ox - 0.18), -1.45, 11.9]),
        np.array([sx * (ox - 0.22), -2.25, 12.1]),  # rounded tip
    ]
    path = catmull_rom(np.array(pts), samples=16)
    prof = rounded_rect_profile(0.22, 0.33, 0.10)  # slim, taller than wide
    v, f = sweep_ptf(path, prof, cap=True, up_hint=(0, 1, 0))
    return trimesh.Trimesh(v, f, process=False)


def build_gold_accent(side):
    """Small warm-gold wedge over the top-outer hinge corner."""
    p = _outline_point(side, 38 if side > 0 else 142)
    box = trimesh.creation.box(extents=(0.95, 0.34, 0.62))
    # orient roughly along the rim tangent at that corner
    ang = np.deg2rad(-25 * side)
    R = trimesh.transformations.rotation_matrix(ang, [0, 0, 1])
    box.apply_transform(R)
    box.apply_translation(p + np.array([side * 0.08, 0.06, RIM_DEPTH * 0.15]))
    return box


def build_nose_pad(side):
    """Clear silicone pad + thin metal support arm tucked just under the
    bridge, near the inner-upper corner of the rim."""
    a0 = np.array([side * 1.65, 1.05, 0.22])   # springs off the inner-upper rim
    a1 = np.array([side * 0.95, 0.25, 0.55])
    a2 = np.array([side * 0.60, -0.42, 0.82])  # pad attachment point
    arm_path = catmull_rom(np.array([a0, a1, a2]), samples=12)
    arm_prof = ellipse_profile(0.11, 0.11, n=8)
    av, af = sweep_ptf(arm_path, arm_prof, cap=True)
    arm = trimesh.Trimesh(av, af, process=False)

    pad = trimesh.creation.icosphere(subdivisions=2, radius=0.40)
    pad.apply_scale([0.50, 1.05, 0.34])           # flatten into a pad
    Rz = trimesh.transformations.rotation_matrix(np.deg2rad(-side * 16), [0, 0, 1])
    Rx = trimesh.transformations.rotation_matrix(np.deg2rad(20), [1, 0, 0])
    pad.apply_transform(Rz @ Rx)
    pad.apply_translation([side * 0.55, -0.60, 0.95])
    return arm, pad


def build_lens(side):
    """Slightly domed transparent lens filling the rim opening."""
    o = lens_outline(side, n=96)
    cx = side * LENS_CX
    # pull the outline inward to the inner edge of the rim
    inner = []
    for p in o:
        radial = _norm(np.array([p[0] - cx, p[1], 0.0]))
        inner.append(p - radial * (RIM_THK * 0.5))
    inner = np.array(inner)
    center = np.array([cx, 0.0, inner[:, 2].mean() + 0.06])
    verts = np.vstack([inner, center])
    ci = len(inner)
    faces = [(i, (i + 1) % len(inner), ci) for i in range(len(inner))]
    return trimesh.Trimesh(verts, np.array(faces), process=False)


# --------------------------------------------------------------------------
# materials
# --------------------------------------------------------------------------

def mat_black():
    return PBRMaterial(name="FrameBlackGloss",
                       baseColorFactor=[18, 18, 20, 255],
                       metallicFactor=0.1, roughnessFactor=0.18,
                       doubleSided=True)


def mat_gold():
    return PBRMaterial(name="GoldAccent",
                       baseColorFactor=[212, 168, 70, 255],
                       metallicFactor=1.0, roughnessFactor=0.28,
                       doubleSided=True)


def mat_pad():
    return PBRMaterial(name="NosePadSilicone",
                       baseColorFactor=[235, 238, 240, 90],
                       metallicFactor=0.0, roughnessFactor=0.35,
                       alphaMode="BLEND", doubleSided=True)


def mat_lens():
    return PBRMaterial(name="Lens",
                       baseColorFactor=[225, 232, 240, 38],
                       metallicFactor=0.0, roughnessFactor=0.05,
                       alphaMode="BLEND", doubleSided=True)


def mat_metal():
    return PBRMaterial(name="ArmMetal",
                       baseColorFactor=[120, 122, 126, 255],
                       metallicFactor=0.9, roughnessFactor=0.3,
                       doubleSided=True)


# --------------------------------------------------------------------------
# assemble
# --------------------------------------------------------------------------

def build_scene():
    scene = trimesh.Scene()

    def add(mesh, name, material):
        mesh.visual = trimesh.visual.TextureVisuals(material=material)
        scene.add_geometry(mesh, geom_name=name)

    for side, tag in ((+1, "R"), (-1, "L")):
        add(build_rim(side), f"rim_{tag}", mat_black())
        add(build_temple(side), f"temple_{tag}", mat_black())
        add(build_gold_accent(side), f"gold_{tag}", mat_gold())
        arm, pad = build_nose_pad(side)
        add(arm, f"nosearm_{tag}", mat_metal())
        add(pad, f"nosepad_{tag}", mat_pad())
        add(build_lens(side), f"lens_{tag}", mat_lens())
    add(build_bridge(), "bridge", mat_black())
    return scene


if __name__ == "__main__":
    import os
    out_dir = os.path.join(os.path.dirname(__file__), "..", "public", "models")
    out_dir = os.path.abspath(out_dir)
    os.makedirs(out_dir, exist_ok=True)
    scene = build_scene()

    glb = os.path.join(out_dir, "glasses.glb")
    scene.export(glb)
    print("wrote", glb)

    obj = os.path.join(out_dir, "glasses.obj")
    scene.export(obj)
    print("wrote", obj)

    # quick stats
    total = sum(len(g.faces) for g in scene.geometry.values())
    print(f"geometries: {len(scene.geometry)}  total faces: {total}")
    print("bounds:", np.round(scene.bounds, 3).tolist())
