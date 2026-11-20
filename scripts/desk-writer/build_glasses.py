"""Folded dark acetate reading glasses, based on the project's physical-photo reference."""
import bpy
import math
import numpy as np
from mathutils import Vector


def build_glasses(scene):
    root = bpy.data.objects.new('Glasses', None)
    scene.collection.objects.link(root)

    def mat(name, rgb, roughness, metal=0, transmission=0):
        material = bpy.data.materials.new('WD_glasses_' + name)
        material.use_nodes = True
        shader = next(n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        colors = [int(rgb[i:i + 2], 16) / 255 for i in (0, 2, 4)]
        shader.inputs['Base Color'].default_value = tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in colors) + (1,)
        shader.inputs['Roughness'].default_value = roughness
        shader.inputs['Metallic'].default_value = metal
        shader.inputs['Transmission Weight'].default_value = transmission
        shader.inputs['IOR'].default_value = 1.46
        shader.inputs['Coat Weight'].default_value = .25 if not transmission else 0
        return material

    acetate = mat('dark tortoise acetate', '2d241d', .26)
    gold = mat('small brass hardware', 'bc9654', .32, .5)
    glass = mat('clear lens', 'ffffff', .045)
    glass_shader = next(n for n in glass.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    glass_shader.inputs['Alpha'].default_value = .09
    glass_shader.inputs['Coat Weight'].default_value = .18
    glass.surface_render_method = 'BLENDED'
    silicone = mat('silicone nose pads', 'eee8dc', .22, transmission=.65)
    screw = mat('screw recess', '3b3126', .5)

    # Subtle nonperiodic amber flecks, stored in sRGB for the portable glTF material.
    rng = np.random.default_rng(74)
    noise = rng.random((32, 32))
    noise = np.repeat(np.repeat(noise, 8, axis=0), 8, axis=1)
    for _ in range(15):
        noise = (noise + np.roll(noise, 1, 0) + np.roll(noise, -1, 0) + np.roll(noise, 1, 1) + np.roll(noise, -1, 1)) / 5
    blend = np.clip((noise - .48) * 4, 0, 1)
    pixels = np.ones((256, 256, 4), np.float32)
    for i, (a, b) in enumerate(zip((.10, .075, .055), (.30, .19, .105))):
        pixels[:, :, i] = a + (b - a) * blend
    image = bpy.data.images.new('WD_tortoise_flecks', width=256, height=256)
    image.pixels.foreach_set(pixels.ravel()); image.pack()
    shader = next(n for n in acetate.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    texture = acetate.node_tree.nodes.new('ShaderNodeTexImage'); texture.image = image
    acetate.node_tree.links.new(texture.outputs['Color'], shader.inputs['Base Color'])

    def point(p): return (p[0], -p[2], p[1])

    def finish(ob, name, material):
        ob.name = name; ob.parent = root; ob.data.materials.append(material)
        for face in getattr(ob.data, 'polygons', []): face.use_smooth = True
        return ob

    def mesh(name, vertices, faces, material):
        data = bpy.data.meshes.new(name); data.from_pydata([point(p) for p in vertices], [], faces); data.update()
        ob = bpy.data.objects.new(name, data); scene.collection.objects.link(ob)
        finish(ob, name, material)
        # Meshes use a consistent outward winding, including the thin lens shells.
        import bmesh
        bm = bmesh.new(); bm.from_mesh(data); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(data); bm.free()
        return ob

    def tube(name, points, radius, material):
        data = bpy.data.curves.new(name, 'CURVE'); data.dimensions = '3D'
        spline = data.splines.new('BEZIER'); spline.bezier_points.add(len(points) - 1)
        for v, p in zip(spline.bezier_points, points):
            v.co = point(p); v.handle_left_type = 'AUTO'; v.handle_right_type = 'AUTO'
        data.resolution_u = 16; data.bevel_depth = radius; data.bevel_resolution = 4; data.use_fill_caps = True
        ob = bpy.data.objects.new(name, data); scene.collection.objects.link(ob)
        return finish(ob, name, material)

    def ellipsoid(name, center, scale, material):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, location=point(center))
        ob = bpy.context.object; ob.scale = (scale[0], scale[2], scale[1])
        return finish(ob, name, material)

    # Front face is almost horizontal with a modest resting tilt; round Boston silhouette.
    def height(z): return .24 - .105 * z
    def outline(a):
        c, s = math.cos(a), math.sin(a)
        if s < 0:
            return .64 * math.copysign(abs(c) ** .8, c), -.54 * abs(s) ** .65
        return .64 * c, .565 * s

    n = 128
    for side in [-1, 1]:
        cx = side * .76
        vertices, faces = [], []
        for radial, offset in [(1.055, .027), (.955, .027), (1.055, -.027), (.955, -.027)]:
            for i in range(n):
                a = i * math.tau / n
                x, z = outline(a)
                r = radial - (.035 * max(0, -math.sin(a)) ** 2 if radial < 1 else 0)
                vertices.append((cx + r * x, height(r * z) + offset, r * z))
        for i in range(n):
            j = (i + 1) % n
            for a, b in [(0, 1), (2, 0), (1, 3), (3, 2)]:
                faces.append((a * n + i, a * n + j, b * n + j, b * n + i))
        frame = mesh('Sculpted acetate lens rim', vertices, faces, acetate)
        bevel = frame.modifiers.new('Rounded polished rim edges', 'BEVEL'); bevel.width = .012; bevel.segments = 3
        # Convex transparent lens seats continuously into the inner rim, with a thin edge.
        vertices, faces = [], []
        rings = 9
        for face in [1, -1]:
            for ring in range(rings):
                r = max(.0001, ring / (rings - 1))
                for i in range(n):
                    x, z = outline(i * math.tau / n); x *= .96 * r; z *= .96 * r
                    vertices.append((cx + x, height(z) + face * (.005 + (.026 if face > 0 else .004) * (1 - r * r)), z))
        layer = rings * n
        for face in [0, 1]:
            for ring in range(rings - 1):
                for i in range(n):
                    a = face * layer + ring * n + i; b = face * layer + ring * n + (i + 1) % n
                    faces.append((a, b, b + n, a + n))
        for i in range(n):
            a = (rings - 1) * n + i; b = (rings - 1) * n + (i + 1) % n
            faces.append((a, b, b + layer, a + layer))
        mesh('Thin clear convex lens', vertices, faces, glass)

        # Both arms fold from the outer hinges, stay below the lenses and cross at separate heights.
        hx = side * 1.39; hz = -.16; hy = height(hz) - .015
        tube('Acetate outer hinge tab', [(side * 1.36, hy, hz), (side * 1.47, hy, hz)], .045, acetate)
        bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=.039, depth=.075, location=point((side * 1.45, hy, hz)))
        finish(bpy.context.object, 'Brass hinge barrel', gold)
        tube('Hinge screw slot', [(side * 1.45 - .018, hy + .04, hz), (side * 1.45 + .018, hy + .04, hz)], .004, screw)
        y = .072 if side < 0 else .135
        arm = [(side * 1.45, hy - .01, hz), (side * 1.38, y + .022, -.13), (side * .95, y, .04), (side * .25, y, .22), (-side * .60, y, .35), (-side * .98, y - .006, .44)]
        tube('Folded tapered temple', arm, .027, acetate)
        tube('Rounded earpiece curve', [arm[-2], arm[-1], (-side * 1.12, y - .026, .49), (-side * 1.18, .031, .48)], .039, acetate)
        ellipsoid('Rounded temple end', (-side * 1.18, .031, .48), (.055, .031, .044), acetate)
        tube('Nose pad metal support', [(side * .19, height(.05), .05), (side * .18, .052, .13)], .012, gold)
        ellipsoid('Translucent oval nose pad', (side * .18, .019, .13), (.041, .027, .085), silicone)
        ellipsoid('Small outer rivet', (side * 1.34, height(-.16) + .035, -.16), (.023, .009, .013), gold)

    tube('Continuous saddle bridge', [(-.16, height(-.05), -.05), (-.11, height(-.12), -.12), (0, height(-.20), -.20), (.11, height(-.12), -.12), (.16, height(-.05), -.05)], .06, acetate)
    root.location.z = .008
    return root
