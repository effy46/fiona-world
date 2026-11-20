"""Run in connected Blender. Three coordinates (x, up, front) map to Blender (x, -front, up).

Creates an isolated editable scene; exports only train/platform meshes to the live app.
No external asset service or generated-model credits are needed.
"""
import bpy
import math
import random
from pathlib import Path
import numpy as np
from mathutils import Vector

ROOT = Path('/Users/ffeng/Documents/Personal/fiona-world')
OUT = ROOT / 'public/slow-post/models'
OUT.mkdir(parents=True, exist_ok=True)
SCENE_NAME = 'Slow Post - Papercraft'
scene = bpy.data.scenes.get(SCENE_NAME)
if scene is None:
    scene = bpy.data.scenes.new(SCENE_NAME)
else:
    for obj in list(scene.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
bpy.context.window.scene = scene
rng = random.Random(37)

def point(p):
    return (p[0], -p[2], p[1])

def material(name, rgb, grain=0.1, wood=False):
    mat = bpy.data.materials.new('SP_' + name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Roughness'].default_value = 0.95
    bsdf.inputs['Metallic'].default_value = 0
    # Portable image textures survive GLB export; shader-only Noise would not.
    n = 256
    generator = np.random.default_rng(37)
    yy, xx = np.mgrid[0:n, 0:n]
    noise = generator.normal(0, 0.65, (n, n))
    if wood:
        # Irregular grain, not periodic stripes: avoid a ruled/moire appearance at web scale.
        bands = generator.normal(0, 0.7, n + 20)
        warped = yy + 8 + np.sin(xx * 0.024) * 3.5
        field = noise * 0.12 + np.interp(warped.ravel(), np.arange(n + 20), bands).reshape(n, n) * 0.32
    else:
        field = noise * 0.28
    rgba = np.ones((n, n, 4), dtype=np.float32)
    for c in range(3):
        rgba[:, :, c] = np.clip(rgb[c] * (1 + field * grain), 0, 1)
    img = bpy.data.images.new('SP_' + name + '_albedo', width=n, height=n, alpha=True)
    img.pixels.foreach_set(rgba.ravel())
    img.filepath_raw = str(OUT / (name + '-albedo.png'))
    img.file_format = 'PNG'
    img.save()
    tex = mat.node_tree.nodes.new('ShaderNodeTexImage'); tex.image = img
    mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    return mat

coal = material('charcoal-card', (0.18, 0.19, 0.17), 0.18)
coal2 = material('charcoal-folds', (0.23, 0.24, 0.21), 0.13)
edge = material('cut-card-edges', (0.43, 0.40, 0.32), 0.13)
dark = material('window-recess', (0.12, 0.145, 0.125), 0.08)
ivory = material('cream-card-roof', (0.79, 0.74, 0.61), 0.12)
roof_edge = material('roof-edge', (0.6, 0.53, 0.41), 0.1)
timber = material('warm-timber', (0.51, 0.30, 0.15), 0.18, True)
timber2 = material('light-timber', (0.63, 0.39, 0.20), 0.15, True)
red = material('red-printed-card', (0.62, 0.25, 0.15), 0.15)
inkcream = material('cream-print', (0.88, 0.82, 0.66), 0.07)
stone = [material('platform-stone-' + str(i), (0.53 + i * 0.018, 0.47 + i * 0.016, 0.37 + i * 0.013), 0.1) for i in range(4)]

train = bpy.data.objects.new('SlowPostTrain', None); scene.collection.objects.link(train)
platform = bpy.data.objects.new('SlowPostPlatform', None); scene.collection.objects.link(platform)

def finish(obj, name, mat, parent=train, bevel=0):
    obj.name = name
    obj.data.materials.append(mat)
    obj.parent = parent
    if bevel:
        mod = obj.modifiers.new('Thin cardstock edge', 'BEVEL')
        mod.width = bevel; mod.segments = 1
    return obj

def box(name, p, size, mat, parent=train, bevel=0.004):
    bpy.ops.mesh.primitive_cube_add(size=1, location=point(p))
    obj = bpy.context.object
    obj.dimensions = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, mat, parent, bevel)

def cylinder(name, p, radius, depth, mat, axis='up', vertices=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=point(p))
    obj = bpy.context.object
    if axis == 'x': obj.rotation_euler[1] = math.pi / 2
    if axis == 'front': obj.rotation_euler[0] = math.pi / 2
    return finish(obj, name, mat)

def strut(name, a, b, width, mat, parent=train):
    av, bv = Vector(point(a)), Vector(point(b))
    obj = box(name, (0, 0, 0), (width, (bv-av).length, width), mat, parent, bevel=0.002)
    obj.location = (av + bv) / 2
    obj.rotation_euler = (bv-av).to_track_quat('Z', 'Y').to_euler()
    return obj

def panel(name, coords, mat, thickness=0.018, parent=train):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([point(p) for p in coords], [], [list(range(len(coords)))])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh); scene.collection.objects.link(obj)
    finish(obj, name, mat, parent)
    solid = obj.modifiers.new('Visible cardstock thickness', 'SOLIDIFY'); solid.thickness = thickness
    solid.material_offset = 1
    solid.material_offset_rim = 1
    mesh.materials.append(roof_edge if mat == ivory else edge)
    return obj

# Chassis: stacked die-cut sheets, instead of one monolithic slab.
box('Engine underframe', (-1.13, 0.44, 0), (2.7, 0.13, 0.96), coal)
box('Engine deck exposed card edge', (-1.21, 0.525, 0), (2.73, 0.025, 1.03), edge)
box('Engine deck face', (-1.21, 0.55, 0), (2.73, 0.025, 1.01), coal2)
cylinder('Ten-panel folded boiler', (-1.5, 1.01, 0), 0.445, 1.6, coal, 'x', 10)
for x in [-2.3, -1.84, -1.25, -0.7]:
    cylinder('Raised boiler paper band', (x, 1.01, 0), 0.457, 0.022, coal2, 'x', 10)
    cylinder('Band cut edge', (x - 0.013, 1.01, 0), 0.46, 0.006, edge, 'x', 10)
cylinder('Front layered outer disc', (-2.329, 1.01, 0), 0.46, 0.025, edge, 'x', 12)
cylinder('Front charcoal disc', (-2.348, 1.01, 0), 0.43, 0.025, coal, 'x', 12)
cylinder('Printed red postal badge', (-2.368, 1.01, 0), 0.23, 0.008, red, 'x', 24)
for angle in np.linspace(0, math.tau, 8, endpoint=False):
    cylinder('Front plate paper rivet', (-2.368, 1.01 + math.sin(angle)*0.365, math.cos(angle)*0.365), 0.018, 0.008, edge, 'x', 8)
box('Front bumper layered edge', (-2.5, 0.5, 0), (0.16, 0.12, 1.1), edge)
box('Front bumper printed face', (-2.53, 0.52, 0), (0.14, 0.085, 1.07), coal)
for z in [-0.42, -0.21, 0, 0.21, 0.42]:
    strut('Folded pilot grille', (-2.62, 0.2, z), (-2.48, 0.49, z), 0.035, coal2)
strut('Pilot lower rail', (-2.62, 0.21, -0.49), (-2.62, 0.21, 0.49), 0.045, edge)
# Faceted funnel, collared rim and a low steam dome.
cylinder('Funnel base collar', (-1.98, 1.41, 0), 0.17, 0.11, coal2, vertices=8)
bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=0.12, radius2=0.19, depth=0.42, location=point((-1.98, 1.69, 0)))
finish(bpy.context.object, 'Folded funnel', coal)
cylinder('Funnel cut-card lip', (-1.98, 1.91, 0), 0.215, 0.025, edge, vertices=8)
cylinder('Funnel dark opening', (-1.98, 1.925, 0), 0.17, 0.008, dark, vertices=8)
cylinder('Steam dome', (-1.22, 1.49, 0), 0.145, 0.21, coal2, vertices=8)
cylinder('Boiler lamp bezel', (-2.32, 1.43, 0), 0.11, 0.07, edge, 'x')
cylinder('Warm paper headlamp', (-2.365, 1.43, 0), 0.08, 0.012, inkcream, 'x')
# Cab walls are frames with real openings; visible paper edge around windows.
box('Cab back panel', (0.025, 1.08, 0), (0.035, 1.05, 0.93), coal)
box('Cab lower shell', (-0.35, 0.86, 0), (0.76, 0.58, 0.91), coal)
for side in [-1, 1]:
    z = side * 0.47
    for x in [-0.7, -0.045]: box('Cab window upright', (x, 1.38, z), (0.065, 0.49, 0.035), coal2)
    box('Cab window lintel', (-0.37, 1.62, z), (0.72, 0.07, 0.035), coal2)
    box('Cab window sill edge', (-0.37, 1.15, z), (0.69, 0.035, 0.055), edge)
    box('Cab printed side badge', (-0.36, 0.91, side * 0.468), (0.28, 0.23, 0.012), red)
    strut('Cab grab handle', (-0.04, 0.81, side * 0.53), (-0.04, 1.23, side * 0.53), 0.024, edge)
    for y in [0.46, 0.32]: box('Cab access step', (-0.02, y, side * 0.58), (0.37, 0.035, 0.18), coal2)
for side in [-1, 1]:
    panel('Folded cab roof', [(-0.87,1.69,side*.57),(.14,1.69,side*.57),(.14,1.79,0),(-.87,1.79,0)], coal2, .026)
strut('Cab roof fold ridge', (-0.87,1.8,0), (.14,1.8,0), .016, edge)

def wheel(x, side, radius):
    z = side * 0.49
    cylinder('Layered wheel tyre', (x, radius+0.1, z), radius, .075, coal, 'front', 16)
    cylinder('Wheel cut edge', (x, radius+0.1, side*.535), radius*.91, .012, edge, 'front', 16)
    cylinder('Wheel inset face', (x, radius+0.1, side*.545), radius*.8, .012, coal2, 'front', 16)
    for angle in np.linspace(0, math.tau, 8, endpoint=False):
        strut('Die-cut wheel spoke', (x,radius+.1,side*.56), (x+math.cos(angle)*radius*.76,radius+.1+math.sin(angle)*radius*.76,side*.56), .022, edge)
    cylinder('Wheel hub', (x,radius+.1,side*.575), .065, .025, coal2, 'front', 10)

for side in [-1,1]:
    for x in [-1.97,-1.34,-.7]: wheel(x,side,.28)
    strut('Engine connecting rod', (-1.97,.36,side*.61),(-.7,.42,side*.61),.045,edge)
box('Coupling', (.24,.44,0),(.28,.055,.13),coal)
# Coach is individual wood-printed cardstock planks, inset window frames and thin roof facets.
box('Coach chassis', (1.45,.44,0),(2.18,.13,1.02),coal2)
box('Coach edge layer', (1.45,.53,0),(2.2,.025,.97),roof_edge)
for side in [-1,1]:
    for i in range(16):
        box('Coach vertical printed plank', (.44+i*.135,.81,side*.455),(.13,.52,.032),timber if i%3 else timber2,bevel=.003)
    for x in [.65,1.18,1.71,2.24]:
        box('Coach window dark inset', (x,1.29,side*.438),(.38,.35,.02),dark)
        for dx in [-.215,.215]: box('Coach window frame upright',(x+dx,1.3,side*.48),(.055,.45,.055),timber2)
        for y in [1.08,1.52]: box('Coach window frame crosspiece',(x,y,side*.48),(.48,.055,.055),timber2)
        box('Coach window sill cut edge',(x,1.07,side*.507),(.49,.023,.07),roof_edge)
    for y in [.58,1.04,1.56]: box('Coach long timber rail',(1.45,y,side*.483),(2.18,.044,.05),timber2)
for x in [.37,2.53]:
    box('Coach end wall',(x,1.04,0),(.035,1.04,.9),timber)
    box('Coach end door inset',(x+(.025 if x>1 else -.025),1.08,0),(.02,.83,.45),timber2)
for side in [-1,1]:
    for x in [.73,2.12]: wheel(x,side,.23)
    for inner,outer,hi,lo in [(0,.29,1.81,1.76),(.29,.57,1.76,1.62)]:
        panel('Cream folded coach roof', [(.27,lo,side*outer),(2.64,lo,side*outer),(2.64,hi,side*inner),(.27,hi,side*inner)],ivory,.026)
    strut('Coach roof folded seam',(.27,1.765,side*.29),(2.64,1.765,side*.29),.011,roof_edge)
# Fine exposed top edges, printed scoring lines and end fasteners.
for x in [.42,2.5]:
    for side in [-1,1]:
        for y in [.69,.96,1.5]: cylinder('Coach paper fastener',(x,y,side*.516),.012,.009,roof_edge,'front',8)

# Tiled platform: small colour variation and real mortar gaps, preserving the cat's height.
box('Platform layered foundation',(0,.13,-.03),(5.7,.18,2.27),stone[0],platform,bevel=.008)
for row in range(4):
    for col in range(12):
        x=-2.61+col*.475
        z=-.88+row*.56
        obj=box('Individual platform flagstone',(x,.25,z),(.466,.065,.548),stone[(row+col*3)%4],platform,bevel=.007)
for col in range(16):
    box('Platform front coping cut edge',(-2.67+col*.355,.277,.99),(.346,.043,.28),ivory,platform,bevel=.006)
for i in range(3):
    box('Platform card lamination',(0,.06+i*.025,1.108),(5.65,.009,.01),roof_edge,platform,bevel=0)

# UV-project each part before export. Individual planks have grain running along their faces.
for obj in list(scene.objects):
    if obj.type != 'MESH': continue
    bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); bpy.context.view_layer.objects.active=obj
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(island_margin=.02)
    bpy.ops.object.mode_set(mode='OBJECT')

# A local camera and soft lighting make the editable asset easy to inspect in Blender.
bpy.ops.object.camera_add(location=point((-5.3,5,8)))
camera=bpy.context.object; camera.name='SlowPost inspection camera'
camera.rotation_euler=(Vector(point((0, .8, 0)))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO'; camera.data.ortho_scale=8.5; scene.camera=camera
for p,power,size in [((-3,7,5),1000,7),((4,5,-2),650,6)]:
    bpy.ops.object.light_add(type='AREA',location=point(p)); light=bpy.context.object
    light.data.energy=power; light.data.shape='DISK'; light.data.size=size
    light.rotation_euler=(-light.location).to_track_quat('-Z','Y').to_euler()
scene.world=bpy.data.worlds.new('SlowPost warm studio'); scene.world.use_nodes=True
background=next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND')
background.inputs['Color'].default_value=(.55,.52,.46,1); background.inputs['Strength'].default_value=.7
scene.render.resolution_x=1200; scene.render.resolution_y=850; scene.render.resolution_percentage=100
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/slow-post/slow-post-papercraft.blend'))

# Export temporary evaluated copies merged by material. The editable source parts stay intact.
depsgraph=bpy.context.evaluated_depsgraph_get()
for root,filename in [(train,'train-papercraft.glb'),(platform,'platform-papercraft.glb')]:
    grouped={}
    for obj in list(root.children):
        if obj.type!='MESH': continue
        mesh=bpy.data.meshes.new_from_object(obj.evaluated_get(depsgraph),depsgraph=depsgraph)
        copy=bpy.data.objects.new('EXPORT_'+obj.name,mesh); scene.collection.objects.link(copy)
        copy.matrix_world=obj.matrix_world.copy()
        # Keep edge materials with their printed faces; grouping uses the full material tuple.
        key=tuple(m.name for m in mesh.materials)
        grouped.setdefault(key,[]).append(copy)
    exported=[]
    for objects in grouped.values():
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects: obj.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]; bpy.ops.object.join()
        exported.append(bpy.context.object)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in exported: obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(OUT/filename),export_format='GLB',use_selection=True,export_apply=True)
    for obj in exported: bpy.data.objects.remove(obj,do_unlink=True)
print('SLOW_POST_EXPORTED', len(train.children), 'train parts,',len(platform.children),'platform parts')
print('SOURCE',ROOT/'assets/slow-post/slow-post-papercraft.blend')
print('MODELS',[(p.name,p.stat().st_size) for p in OUT.glob('*.glb')])
