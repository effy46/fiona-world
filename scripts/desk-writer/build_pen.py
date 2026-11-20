"""Rounded lacquer fountain pen with posted cap and formed, split metal nib."""
import bpy
import math


def build_pen(scene):
    parent = bpy.data.objects.new('Pen', None)
    scene.collection.objects.link(parent)

    def material(name, color, roughness, metallic):
        m = bpy.data.materials.new('WD_pen_' + name)
        m.use_nodes = True
        shader = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        rgb = [int(color[i:i + 2], 16) / 255 for i in (0, 2, 4)]
        shader.inputs['Base Color'].default_value = tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in rgb) + (1,)
        shader.inputs['Roughness'].default_value = roughness
        shader.inputs['Metallic'].default_value = metallic
        return m

    lacquer = material('deep olive lacquer', '354a3d', .24, .08)
    gold = material('champagne gold', 'c9a665', .28, .55)
    steel = material('palladium inlay', 'c8c5b7', .32, .48)
    dark = material('ebonite feed', '252723', .58, 0)
    engraving = material('recessed engraving', '78603b', .5, .25)
    axis_height = .172

    def mesh(name, vertices, faces, mat):
        data = bpy.data.meshes.new(name)
        # Author coordinates as (length, up, across); Blender is Z-up.
        data.from_pydata([(x, -z, y) for x, y, z in vertices], [], faces)
        data.update()
        ob = bpy.data.objects.new(name, data)
        scene.collection.objects.link(ob)
        ob.parent = parent
        data.materials.append(mat)
        for polygon in data.polygons:
            polygon.use_smooth = True
        return ob

    def turned(name, profile, mat):
        vertices, faces = [], []
        n = 72
        for x, radius in profile:
            for i in range(n):
                a = i * math.tau / n
                vertices.append((x, axis_height + radius * math.cos(a), radius * math.sin(a)))
        for row in range(len(profile) - 1):
            for i in range(n):
                a, b = row * n + i, row * n + (i + 1) % n
                faces.append((a, b, b + n, a + n))
        return mesh(name, vertices, faces, mat)

    def line(name, points, radius, mat):
        data = bpy.data.curves.new(name, 'CURVE')
        data.dimensions = '3D'
        data.bevel_depth = radius
        data.bevel_resolution = 3
        spline = data.splines.new('POLY')
        spline.points.add(len(points) - 1)
        for q, (x, y, z) in zip(spline.points, points):
            q.co = (x, -z, y, 1)
        ob = bpy.data.objects.new(name, data)
        scene.collection.objects.link(ob)
        ob.parent = parent
        data.materials.append(mat)
        return ob

    turned('Tapered lacquer barrel', [(-.96, 0), (-.96, .108), (-.87, .119), (-.65, .13), (-.1, .143), (.5, .14), (.91, .124), (1.12, .1), (1.16, 0)], lacquer)
    turned('Gold section collar', [(-.99, .107), (-.99, .123), (-.94, .123), (-.94, .107)], gold)
    turned('Sculpted ebonite grip', [(-1.32, 0), (-1.32, .085), (-1.26, .105), (-1.15, .09), (-1.04, .095), (-.99, .108), (-.99, 0)], dark)
    for x in [-1.08, -1.11, -1.14]:
        turned('Fine grip ridge', [(x - .005, .09), (x, .096), (x + .005, .09)], dark)

    # Cap is posted over the rear barrel; rounded crown and raised rolled lip.
    turned('Posted cap rounded shell', [(.69, .128), (.69, .155), (.73, .164), (.82, .167), (1.35, .169), (1.6, .157), (1.72, .125), (1.8, .062), (1.82, 0)], lacquer)
    turned('Wide rolled cap band', [(.73, .164), (.74, .175), (.84, .175), (.85, .165)], gold)
    turned('Cap band fine bead', [(.88, .166), (.885, .172), (.904, .172), (.909, .167)], gold)
    turned('Cap crown gold ring', [(1.64, .149), (1.66, .155), (1.68, .148)], gold)
    # A curved broad pocket clip, with a visible gap above the lacquer surface.
    clip_points = [(1.66, .307), (1.65, .347), (1.53, .379), (1.35, .385), (1.08, .377), (.94, .36), (.91, .332)]
    vertices = [(x, y, z) for x, y in clip_points for z in [-.032, .032]]
    clip = mesh('Arched pocket clip', vertices, [(i * 2, i * 2 + 1, i * 2 + 3, i * 2 + 2) for i in range(len(clip_points) - 1)], gold)
    mod = clip.modifiers.new('Clip sheet thickness', 'SOLIDIFY'); mod.thickness = .016
    mod = clip.modifiers.new('Rolled clip edges', 'BEVEL'); mod.width = .009; mod.segments = 3
    line('Clip tip bead', [(.91, .331, -.029), (.91, .331, .029)], .018, gold)

    # Rolled traditional nib: rounded shoulders, small breather, slit only ahead of hole.
    stations = []
    for i in range(41):
        t = i / 40
        width = (.085 + .115 * math.sin(math.pi * t)) * (1 - t) ** .8 + .003
        stations.append((-1.30 - .69 * t, width))

    def surface(x, z):
        t = (-x - 1.30) / .69
        return axis_height + .037 + .078 * math.sqrt(max(0, 1 - (z / .16) ** 2)) - .038 * t

    for sign in [-1, 1]:
        vertices, faces = [], []
        for x, width in stations:
            gap = .0018 if x < -1.55 else 0
            for i in range(13):
                z = sign * (gap + (width - gap) * i / 12)
                vertices.append((x, surface(x, z), z))
        for row in range(len(stations) - 1):
            for i in range(12):
                a = row * 13 + i
                faces.append((a + 13, a + 14, a + 1, a) if sign > 0 else (a, a + 1, a + 14, a + 13))
        nib = mesh('Rolled gold nib tine', vertices, faces, gold)
        solid = nib.modifiers.new('Thin formed nib metal', 'SOLIDIFY'); solid.thickness = .009
        bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=.016, depth=.2, location=(-1.55, 0, surface(-1.55, 0)))
        cutter = bpy.context.object
        cutter.data.materials.append(gold)
        boolean = nib.modifiers.new('Round breather hole', 'BOOLEAN'); boolean.operation = 'DIFFERENCE'; boolean.object = cutter
        bpy.context.view_layer.objects.active = nib
        bpy.ops.object.modifier_apply(modifier=solid.name)
        bpy.ops.object.modifier_apply(modifier=boolean.name)
        bpy.data.objects.remove(cutter, do_unlink=True)
        for slot in nib.material_slots:
            if slot.material is None:
                slot.material = gold
        # Subtle engraved shoulder line, without the previous raised silver arrow border.
        border = [(x, surface(x, sign * width * .77) + .001, sign * width * .77) for x, width in stations[4:32]]
        line('Fine nib shoulder engraving', border, .0015, engraving)

    # Small hard tipping material; the dark feed stays beneath the metal shoulders.
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=1, location=(-1.985, 0, surface(-1.985, 0) - .004))
    tip = bpy.context.object; tip.name = 'Rounded writing tip'; tip.parent = parent
    tip.scale = (.018, .014, .012); tip.data.materials.append(steel)
    for polygon in tip.data.polygons: polygon.use_smooth = True
    turned('Recessed ebonite nib feed', [(-1.85, 0), (-1.8, .021), (-1.66, .037), (-1.4, .052), (-1.29, .063), (-1.29, 0)], dark)
    for i in range(8):
        x = -1.72 + i * .045
        radius = .03 + i * .003
        turned('Recessed feed fin', [(x - .004, radius), (x, radius + .004), (x + .004, radius)], dark)
    return parent
