"""
Procedural 3D model of the TRAVELER'S COMPANY brass clip stand.

An engraved arched brass nameplate held by a folding binder-clip-style stand:
  - arched "signboard" brass plate, engraved front (border + lettering)
  - compact brass clip body gripping the plate's bottom edge
  - round pivot bosses (rivets) on each side
  - two flat brass handle-arms folded down into a 4-footed easel stand

Exports .glb (+ .obj). Run with no args to also write preview renders.

Coordinate system (glTF, Y-up, right-handed):
  +X right, +Y up, +Z toward the viewer's back (plate leans toward +Z).
  Ground plane is y = 0 (the four feet rest here).
Scale is arbitrary; proportions match the 9-view reference.
"""

import os
import numpy as np
import trimesh
from shapely.geometry import Polygon
from PIL import Image, ImageDraw, ImageFont
from trimesh.visual.material import PBRMaterial
from trimesh.visual import TextureVisuals

from build_glasses import sweep_ptf, catmull_rom  # reuse swept-tube helpers

FONT_DIR = "/usr/local/lib/python3.11/dist-packages/matplotlib/mpl-data/fonts/ttf"

# --------------------------------------------------------------------------
# plate geometry
# --------------------------------------------------------------------------

A = 0.72           # plate half width
HS = 1.04          # shoulder height (where the arch springs)
RISE = 0.26        # arch rise above the shoulders
ARCH_HALF = 0.44   # half-width of the central arch span
T = 0.06           # plate thickness
YMAX = HS + RISE


def plate_outline(n_arch=40):
    """Closed 2D outline of the signboard plate (x right, y up, bottom at 0)."""
    pts = [(-A, 0.0), (A, 0.0), (A, HS), (ARCH_HALF, HS)]   # bottom, right, shoulder
    for k in range(1, n_arch):                              # central arch
        t = np.pi * k / n_arch
        pts.append((ARCH_HALF * np.cos(t), HS + RISE * np.sin(t)))
    pts.append((-ARCH_HALF, HS))                            # left shoulder
    pts.append((-A, HS))
    return pts


# --------------------------------------------------------------------------
# engraved front texture
# --------------------------------------------------------------------------

def make_plate_texture():
    px = 760
    aspect = (2 * A) / YMAX
    iw, ih = int(px * aspect), px
    brass = (179, 150, 92)
    ink = (54, 40, 22)
    im = Image.new("RGB", (iw, ih), brass)
    d = ImageDraw.Draw(im)

    def to_px(x, y):
        return ((x + A) / (2 * A) * iw, (YMAX - y) / YMAX * ih)

    def font(name, frac):
        return ImageFont.truetype(os.path.join(FONT_DIR, name), int(ih * frac))

    f_big = font("DejaVuSerif-Bold.ttf", 0.090)
    f_med = font("DejaVuSerif-Bold.ttf", 0.052)
    f_small = font("DejaVuSans.ttf", 0.040)
    f_note = font("DejaVuSerif-Italic.ttf", 0.082)
    f_tiny = font("DejaVuSans.ttf", 0.034)

    # subtle vertical brushed shading
    for row in range(ih):
        pass

    # double-line engraved border
    bl, br = -0.585, 0.585
    bt, bb = 1.075, 0.105
    for inset in (0.0, 0.035):
        x0, y0 = to_px(bl + inset, bt - inset)
        x1, y1 = to_px(br - inset, bb + inset)
        d.rectangle([x0, y0, x1, y1], outline=ink, width=max(1, int(ih * 0.006)))

    def ctext(y, s, fnt, ls=0.0):
        # centred text with optional letter spacing
        if ls == 0:
            cx, cy = to_px(0.0, y)
            d.text((cx, cy), s, font=fnt, fill=ink, anchor="mm")
            return
        widths = [d.textlength(ch, font=fnt) for ch in s]
        total = sum(widths) + ls * ih * (len(s) - 1)
        cx, cy = to_px(0.0, y)
        x = cx - total / 2
        for ch, w in zip(s, widths):
            d.text((x, cy), ch, font=fnt, fill=ink, anchor="lm")
            x += w + ls * ih

    def hline(y, half):
        x0, y0 = to_px(-half, y)
        x1, y1 = to_px(half, y)
        d.line([x0, y0, x1, y1], fill=ink, width=max(1, int(ih * 0.006)))

    ctext(0.95, "TRAVELER'S", f_big, ls=0.006)
    ctext(0.80, "COMPANY", f_med, ls=0.010)
    # JAPAN flanked by dashes
    ctext(0.675, "—  JAPAN  —", f_small, ls=0.004)
    ctext(0.545, "TRAVELER'S", f_med, ls=0.004)
    ctext(0.415, "notebook", f_note)
    hline(0.30, 0.45)
    ctext(0.225, "MADE IN JAPAN", f_tiny, ls=0.006)

    path = os.path.join(os.path.dirname(__file__), "_plate_tex.png")
    im.save(path)
    return im


# --------------------------------------------------------------------------
# brass materials
# --------------------------------------------------------------------------

def mat_brass(name="Brass", base=(174, 143, 82), rough=0.42, metal=1.0):
    return PBRMaterial(name=name,
                       baseColorFactor=[base[0], base[1], base[2], 255],
                       metallicFactor=metal, roughnessFactor=rough,
                       doubleSided=True)


def mat_brass_dark():
    return mat_brass("BrassDark", base=(150, 120, 66), rough=0.5)


# --------------------------------------------------------------------------
# build plate (brass body + engraved decal)
# --------------------------------------------------------------------------

TILT = np.deg2rad(26.0)          # plate leans back
ATTACH = np.array([0.0, 0.48, 0.0])


def _plate_transform():
    Rx = trimesh.transformations.rotation_matrix(TILT, [1, 0, 0])
    Tt = trimesh.transformations.translation_matrix(ATTACH)
    return Tt @ Rx


def build_plate():
    poly = Polygon(plate_outline())
    body = trimesh.creation.extrude_polygon(poly, T)
    body.apply_translation([0, 0, -T / 2.0])          # centre thickness
    M = _plate_transform()
    body.apply_transform(M)
    body.visual = TextureVisuals(material=mat_brass("PlateBrass", rough=0.46))

    # engraved decal: triangulate the same outline, place flush on the front
    v2d, f2d = trimesh.creation.triangulate_polygon(poly, engine="earcut")
    # subdivide so the engraving texture is finely resolved on the surface
    v3 = np.column_stack([v2d, np.zeros(len(v2d))])
    v3, f2d = trimesh.remesh.subdivide_to_size(v3, f2d, max_edge=0.035)
    v2d = v3[:, :2]
    z = T / 2.0 + 0.002
    verts = np.column_stack([v2d[:, 0], v2d[:, 1], np.full(len(v2d), z)])
    # standard mapping: +u along +x, +v downward (glTF). Reads correctly when
    # the engraved +Z face is viewed from the front (+Z, +X to the right).
    uv = np.column_stack([(v2d[:, 0] + A) / (2 * A),
                          (YMAX - v2d[:, 1]) / YMAX])
    decal = trimesh.Trimesh(verts, f2d, process=False)
    decal.apply_transform(M)
    tex = make_plate_texture()
    decal.visual = TextureVisuals(
        uv=uv,
        material=PBRMaterial(name="Engraving", baseColorTexture=tex,
                             metallicFactor=0.55, roughnessFactor=0.5,
                             doubleSided=True))
    return body, decal


# --------------------------------------------------------------------------
# clip body + pivot bosses
# --------------------------------------------------------------------------

PIVOT_Y = 0.40
BODY_W = 0.52


def _xcyl(radius, height, x, y, z=0.0, sections=28):
    c = trimesh.creation.cylinder(radius=radius, height=height, sections=sections)
    c.apply_transform(trimesh.transformations.rotation_matrix(np.pi / 2, [0, 1, 0]))
    c.apply_translation([x, y, z])
    return c


def _zcyl(radius, height, x, y, z, sections=24):
    c = trimesh.creation.cylinder(radius=radius, height=height, sections=sections)
    c.apply_translation([x, y, z])
    return c


def build_clip_body():
    parts = []
    # compact bracket that grips the plate bottom (extruded along X)
    sec = Polygon([(-0.17, 0.26), (0.17, 0.26), (0.19, 0.39),
                   (0.15, 0.54), (-0.15, 0.54), (-0.19, 0.39)])  # (z,y) profile
    body = trimesh.creation.extrude_polygon(sec, BODY_W)
    body.vertices = body.vertices[:, [2, 1, 0]]      # (z,y,x)->(x,y,z)
    body.apply_translation([-BODY_W / 2.0, 0, 0])
    parts.append(body)

    parts.append(_xcyl(0.07, BODY_W + 0.14, 0, PIVOT_Y))   # pivot axle
    for sx in (-1, 1):                                      # side rivet bosses
        parts.append(_xcyl(0.15, 0.06, sx * (BODY_W / 2 + 0.05), PIVOT_Y, sections=32))
        parts.append(_xcyl(0.042, 0.09, sx * (BODY_W / 2 + 0.07), PIVOT_Y))
    # small decorative rivets on the front/back faces of the body
    parts.append(_zcyl(0.06, 0.05, 0, 0.40, -0.19))
    parts.append(_zcyl(0.06, 0.05, 0, 0.40, 0.19))
    return parts


# --------------------------------------------------------------------------
# folding handle-arms (two U-shaped pieces -> 4 feet)
# --------------------------------------------------------------------------

def _flat_profile(width, thick):
    w, t = width / 2.0, thick / 2.0
    return np.array([(-w, -t), (w, -t), (w, t), (-w, t)])


def build_handle(zsign):
    """One folded binder-clip handle: a narrow flat U that drops from the pivot
    to two feet, splaying mostly front/back (compact in X) so the front view
    stays plate-dominant. zsign = -1 front handle, +1 back handle."""
    foot_z = zsign * 0.56       # short, low stance
    loop_z = zsign * 0.07
    fx_out = 0.52               # feet land near the plate's bottom corners
    fy = 0.035                  # foot height off the ground
    pts = [
        (-fx_out, fy, foot_z),
        (-0.30, 0.20, foot_z * 0.6),
        (-0.13, PIVOT_Y, loop_z),
        (0.0, PIVOT_Y + 0.04, loop_z * 0.6),   # loop apex over the pivot
        (0.13, PIVOT_Y, loop_z),
        (0.30, 0.20, foot_z * 0.6),
        (fx_out, fy, foot_z),
    ]
    path = catmull_rom(np.array(pts), samples=16)
    prof = _flat_profile(0.15, 0.045)
    v, f = sweep_ptf(path, prof, cap=True, up_hint=(0, 0, zsign))
    arm = trimesh.Trimesh(v, f, process=False)

    feet = []
    for fx in (-fx_out, fx_out):
        foot = trimesh.creation.icosphere(subdivisions=2, radius=0.07)
        foot.apply_scale([1.2, 0.6, 1.5])
        foot.apply_translation([fx, fy, foot_z])
        feet.append(foot)
    return [arm] + feet


# --------------------------------------------------------------------------
# assemble
# --------------------------------------------------------------------------

def build_scene():
    scene = trimesh.Scene()

    def add(mesh, name, material=None):
        if material is not None:
            mesh.visual = TextureVisuals(material=material)
        scene.add_geometry(mesh, geom_name=name)

    body, decal = build_plate()
    scene.add_geometry(body, geom_name="plate_body")
    scene.add_geometry(decal, geom_name="plate_engraving")

    for i, m in enumerate(build_clip_body()):
        add(m, f"clip_{i}", mat_brass_dark())
    for zs, tag in ((-1, "front"), (1, "back")):
        for j, m in enumerate(build_handle(zs)):
            add(m, f"handle_{tag}_{j}", mat_brass())
    return scene


if __name__ == "__main__":
    out_dir = os.path.abspath(os.path.join(os.path.dirname(__file__),
                                           "..", "public", "models"))
    os.makedirs(out_dir, exist_ok=True)
    scene = build_scene()
    glb = os.path.join(out_dir, "clip_stand.glb")
    scene.export(glb)
    print("wrote", glb)
    scene.export(os.path.join(out_dir, "clip_stand.obj"))
    total = sum(len(g.faces) for g in scene.geometry.values())
    print(f"geometries: {len(scene.geometry)}  faces: {total}")
    print("bounds:", np.round(scene.bounds, 3).tolist())
