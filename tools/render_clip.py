"""Flat multi-view previews of the brass clip stand, with per-face colour
sampled from material base colour or the engraving texture (so the lettering
is visible). Painter's algorithm + simple shading -- a shape/label check."""

import os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.collections import PolyCollection

from build_clip_stand import build_scene


def gather():
    scene = build_scene()
    tris, cols = [], []
    for name, g in scene.geometry.items():
        v, f = g.vertices, g.faces
        vis = g.visual
        tex = None
        uv = None
        base = np.array([0.68, 0.56, 0.32])
        mat = getattr(vis, "material", None)
        if mat is not None:
            bcf = getattr(mat, "baseColorFactor", None)
            if bcf is not None:
                base = np.array(bcf[:3], float)
                if base.max() > 1.5:
                    base = base / 255.0
            bct = getattr(mat, "baseColorTexture", None)
            if bct is not None and getattr(vis, "uv", None) is not None:
                tex = np.asarray(bct).astype(float) / 255.0
                uv = np.asarray(vis.uv)
        for face in f:
            tris.append(v[face])
            if tex is not None:
                fuv = uv[face].mean(axis=0)
                px = int(np.clip(fuv[0], 0, 1) * (tex.shape[1] - 1))
                py = int(np.clip(fuv[1], 0, 1) * (tex.shape[0] - 1))
                cols.append(tex[py, px, :3])
            else:
                cols.append(base)
    return np.array(tris), np.array(cols)


def _rot(axis, deg):
    a = np.deg2rad(deg); c, s = np.cos(a), np.sin(a)
    if axis == "y":
        return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])


def render(tris, cols, R, title, path, light=(0.35, 0.55, 0.75)):
    light = np.array(light); light = light / np.linalg.norm(light)
    t = tris @ R.T
    n = np.cross(t[:, 1] - t[:, 0], t[:, 2] - t[:, 0])
    ln = np.linalg.norm(n, axis=1, keepdims=True); ln[ln == 0] = 1
    shade = np.clip(np.abs((n / ln) @ light), 0.2, 1.0) * 0.65 + 0.35
    # standard front camera: looks along -Z (+X right, +Y up). Far drawn first.
    order = np.argsort(t[:, :, 2].mean(axis=1))
    polys = [t[i][:, :2] for i in order]
    fc = [np.clip(cols[i] * shade[i], 0, 1) for i in order]
    fig, ax = plt.subplots(figsize=(5, 6), dpi=130)
    ax.add_collection(PolyCollection(polys, facecolors=fc, edgecolors="none"))
    allp = np.vstack(polys)
    ax.set_xlim(allp[:, 0].min() - 0.2, allp[:, 0].max() + 0.2)
    ax.set_ylim(allp[:, 1].min() - 0.2, allp[:, 1].max() + 0.2)
    ax.set_aspect("equal"); ax.set_facecolor("#efe9dc")
    ax.set_title(title); ax.set_xticks([]); ax.set_yticks([])
    fig.tight_layout(); fig.savefig(path); plt.close(fig)
    print("wrote", path)


VIEWS = {
    "front": np.eye(3),
    "side":  _rot("y", -90),
    "front34": _rot("x", 10) @ _rot("y", 28),
    "back34": _rot("x", 12) @ _rot("y", 180 + 32),
}


if __name__ == "__main__":
    out = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "previews"))
    os.makedirs(out, exist_ok=True)
    tris, cols = gather()
    for name, R in VIEWS.items():
        render(tris, cols, R, f"clip {name}", os.path.join(out, f"clip_{name}.png"))
