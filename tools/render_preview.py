"""Render flat orthographic previews (front / side / top) of the glasses model
so the silhouette can be visually checked. Uses a simple painter's algorithm
with per-triangle Lambert shading. Not a beauty render -- a shape check."""

import os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.collections import PolyCollection

from build_glasses import build_scene

COLORS = {
    "rim": (0.07, 0.07, 0.08), "temple": (0.07, 0.07, 0.08),
    "bridge": (0.07, 0.07, 0.08), "gold": (0.83, 0.66, 0.27),
    "nosearm": (0.47, 0.48, 0.49), "nosepad": (0.80, 0.85, 0.88),
    "lens": (0.62, 0.72, 0.82),
}


def color_for(name):
    for k, c in COLORS.items():
        if name.startswith(k):
            return c
    return (0.5, 0.5, 0.5)


def gather():
    scene = build_scene()
    tris, cols, depth_axis_data = [], [], []
    for name, g in scene.geometry.items():
        v, f = g.vertices, g.faces
        base = np.array(color_for(name))
        for face in f:
            tris.append(v[face])
            cols.append(base)
    return np.array(tris), np.array(cols)


VIEWS = {
    # name: (axis_h, axis_v, depth_axis, flip_h, light_dir)
    "front": (0, 1, 2, False, np.array([0.3, 0.4, -1.0])),   # look down -Z
    "side":  (2, 1, 0, True, np.array([-1.0, 0.4, -0.3])),   # look along -X
    "top":   (0, 2, 1, False, np.array([0.2, -1.0, 0.3])),   # look down -Y
}


def _rot(axis, deg):
    a = np.deg2rad(deg)
    c, s = np.cos(a), np.sin(a)
    if axis == "y":
        return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])  # x


def render_hero(tris, cols, path):
    """Oblique 3/4 view via a rotated orthographic projection."""
    R = _rot("x", 18) @ _rot("y", -32)
    light = np.array([0.4, 0.5, 0.8]); light /= np.linalg.norm(light)
    t = tris @ R.T
    n = np.cross(t[:, 1] - t[:, 0], t[:, 2] - t[:, 0])
    ln = np.linalg.norm(n, axis=1, keepdims=True); ln[ln == 0] = 1
    shade = np.clip(np.abs((n / ln) @ light), 0.25, 1.0) * 0.7 + 0.3
    order = np.argsort(t[:, :, 2].mean(axis=1))
    polys = [t[i][:, :2] for i in order]
    facecols = [np.clip(cols[i] * shade[i], 0, 1) for i in order]
    fig, ax = plt.subplots(figsize=(7, 5), dpi=130)
    ax.add_collection(PolyCollection(polys, facecolors=facecols, edgecolors="none"))
    allp = np.vstack(polys)
    ax.set_xlim(allp[:, 0].min() - 0.5, allp[:, 0].max() + 0.5)
    ax.set_ylim(allp[:, 1].min() - 0.5, allp[:, 1].max() + 0.5)
    ax.set_aspect("equal"); ax.set_facecolor("#d9d2c5")
    ax.set_title("3/4 hero view"); ax.set_xticks([]); ax.set_yticks([])
    fig.tight_layout(); fig.savefig(path); plt.close(fig)
    print("wrote", path)


def render(tris, cols, view, path):
    h, vv, d, flip, light = VIEWS[view]
    light = light / np.linalg.norm(light)
    # normals + depth
    n = np.cross(tris[:, 1] - tris[:, 0], tris[:, 2] - tris[:, 0])
    ln = np.linalg.norm(n, axis=1, keepdims=True)
    ln[ln == 0] = 1
    n = n / ln
    shade = np.clip(np.abs(n @ light), 0.25, 1.0) * 0.7 + 0.3
    depth = tris[:, :, d].mean(axis=1)
    order = np.argsort(depth if d != 0 else -depth) if not flip else np.argsort(-depth)
    polys, facecols = [], []
    for i in order:
        t = tris[i]
        x = t[:, h] * (-1 if flip else 1)
        y = t[:, vv]
        polys.append(np.column_stack([x, y]))
        facecols.append(np.clip(cols[i] * shade[i], 0, 1))
    fig, ax = plt.subplots(figsize=(7, 5), dpi=130)
    pc = PolyCollection(polys, facecolors=facecols, edgecolors="none", antialiased=True)
    ax.add_collection(pc)
    allp = np.vstack(polys)
    ax.set_xlim(allp[:, 0].min() - 0.5, allp[:, 0].max() + 0.5)
    ax.set_ylim(allp[:, 1].min() - 0.5, allp[:, 1].max() + 0.5)
    ax.set_aspect("equal")
    ax.set_facecolor("#d9d2c5")
    ax.set_title(f"{view} view")
    ax.set_xticks([]); ax.set_yticks([])
    fig.tight_layout()
    fig.savefig(path)
    plt.close(fig)
    print("wrote", path)


if __name__ == "__main__":
    out = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "previews"))
    os.makedirs(out, exist_ok=True)
    tris, cols = gather()
    for view in VIEWS:
        render(tris, cols, view, os.path.join(out, f"preview_{view}.png"))
    render_hero(tris, cols, os.path.join(out, "preview_hero.png"))
