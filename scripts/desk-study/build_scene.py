"""Blender-authored notebook study. Run with Blender --background --python this_file.

Only writes this study's .blend, GLB and manifest. Existing scene assets are read-only.
Blender uses Z up; glTF export converts it to the web scene's Y up.
"""
from pathlib import Path
import json
import math
import random
import bpy
import bmesh
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/desk-study'
SOURCE = ROOT / 'assets/desk-study'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
random.seed(23)


def material(name, color, roughness=.6, metal=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    rgb = tuple(int(color[i:i+2], 16) / 255 for i in (1, 3, 5))
    # Hex palette values are sRGB; shader sockets store linear values.
    shader.inputs['Base Color'].default_value = tuple(((c+.055)/1.055)**2.4 if c > .04045 else c/12.92 for c in rgb) + (1,)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metal
    return mat


def mesh(name, vertices, faces, mat, parent=None, uv=None):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    obj.parent = parent
    projected_paper_uv = uv is None and 'cotton cardstock' in mat.name
    if uv or projected_paper_uv:
        layer = data.uv_layers.new(name='UVMap')
        for poly in data.polygons:
            normal_axis=max(range(3),key=lambda a: abs(poly.normal[a]))
            axes=[a for a in range(3) if a != normal_axis]
            for loop in poly.loop_indices:
                index=data.loops[loop].vertex_index
                layer.data[loop].uv = (vertices[index][axes[0]]/1.25,vertices[index][axes[1]]/1.25) if projected_paper_uv else uv[index]
    return obj


def group(name, location=(0, 0, 0)):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    return obj


def box(name, location, dimensions, mat, bevel=.025, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    obj.parent = parent
    if bevel:
        mod = obj.modifiers.new('Soft physical edges', 'BEVEL')
        mod.width, mod.segments = bevel, 3
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    for face in obj.data.polygons:
        face.use_smooth = True
    mod = obj.modifiers.new('Weighted corner normals', 'WEIGHTED_NORMAL')
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


def path(name, points, radius, mat, parent=None, cyclic=False):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = 12
    curve.bevel_depth, curve.bevel_resolution = radius, 3
    poly = curve.splines.new('POLY')
    poly.points.add(len(points)-1)
    for p, co in zip(poly.points, points):
        p.co = (*co, 1)
    poly.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    obj.parent = parent
    return obj


def lathe(name, profile, mat, parent=None, segments=64):
    vertices = [(r*math.cos(a*math.tau/segments), r*math.sin(a*math.tau/segments), z)
                for r, z in profile for a in range(segments)]
    faces = [(j*segments+i, j*segments+(i+1)%segments,
              (j+1)*segments+(i+1)%segments, (j+1)*segments+i)
             for j in range(len(profile)-1) for i in range(segments)]
    obj = mesh(name, vertices, faces, mat, parent)
    for face in obj.data.polygons:
        face.use_smooth = True
    if 'cotton cardstock' in mat.name:
        layer=obj.data.uv_layers.active
        radius=max(r for r,z in profile)
        for loop in obj.data.loops:
            j,i=divmod(loop.vertex_index,segments)
            layer.data[loop.index].uv=(i/segments*math.tau*radius/1.25,profile[j][1]/1.25)
    return obj


paper = material('Warm cotton paper', '#f4ecd8', .94)
edge = material('Page edge', '#d7c8aa', .9)
leather = material('Cognac leather', '#60412f', .67)
stitch = material('Linen stitching', '#bda181', .92)
ceramic = material('Ivory ceramic glaze', '#e1ddd0', .24)
coffee = material('Coffee', '#39251a', .22)
brass = material('Brushed brass', '#b18a4d', .38, .74)
lacquer = material('Forest lacquer', '#233e35', .25, .1)
wood = material('Walnut handle', '#5c3825', .43)
normal_image=bpy.data.images.load(str(SOURCE/'paper/cotton-normal.png'))
normal_image.colorspace_settings.name='Non-Color'
roughness_image=bpy.data.images.load(str(SOURCE/'paper/cotton-roughness.png'))
roughness_image.colorspace_settings.name='Non-Color'


def cardstock(name, color):
    mat=material(name+' cotton cardstock',color,1)
    nodes,links=mat.node_tree.nodes,mat.node_tree.links
    shader=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
    albedo=nodes.new('ShaderNodeTexImage')
    albedo.image=bpy.data.images.load(str(SOURCE/f'paper/{name}.jpg'))
    links.new(albedo.outputs['Color'],shader.inputs['Base Color'])
    normal_tex=nodes.new('ShaderNodeTexImage')
    normal_tex.image=normal_image
    normal=nodes.new('ShaderNodeNormalMap')
    normal.inputs['Strength'].default_value=.22
    links.new(normal_tex.outputs['Color'],normal.inputs['Color'])
    links.new(normal.outputs['Normal'],shader.inputs['Normal'])
    rough=nodes.new('ShaderNodeTexImage')
    rough.image=roughness_image
    links.new(rough.outputs['Color'],shader.inputs['Roughness'])
    return mat


sage=cardstock('sage','#a5b082')
dark_sage=cardstock('pine','#416d60')
blue=cardstock('blue','#7daca8')
river=cardstock('river','#8fb7ba')
snow=cardstock('snow','#f2eddb')
ochre=cardstock('ochre','#cdb37c')
meadow=cardstock('meadow','#c3c498')
clay=cardstock('clay','#c18755')
light_pine=cardstock('light-pine','#779970')
backdrop=cardstock('backdrop','#355e50')
ember=cardstock('ember','#c7754c')
flame=cardstock('flame','#ebbb77')
stone=cardstock('stone','#b1b5a5')

# Leather maps export directly through glTF's supported PBR channels.
shader = next(n for n in leather.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
tex = leather.node_tree.nodes.new('ShaderNodeTexImage')
tex.image=bpy.data.images.load(str(SOURCE/'leather/cover-color.jpg'))
leather.node_tree.links.new(tex.outputs['Color'],shader.inputs['Base Color'])
normal_tex=leather.node_tree.nodes.new('ShaderNodeTexImage')
normal_tex.image=bpy.data.images.load(str(SOURCE/'leather/cover-normal.png'))
normal_tex.image.colorspace_settings.name='Non-Color'
normal_node=leather.node_tree.nodes.new('ShaderNodeNormalMap')
normal_node.inputs['Strength'].default_value=.22
leather.node_tree.links.new(normal_tex.outputs['Color'],normal_node.inputs['Color'])
leather.node_tree.links.new(normal_node.outputs['Normal'],shader.inputs['Normal'])
rough_tex=leather.node_tree.nodes.new('ShaderNodeTexImage')
rough_tex.image=bpy.data.images.load(str(SOURCE/'leather/cover-roughness.png'))
rough_tex.image.colorspace_settings.name='Non-Color'
leather.node_tree.links.new(rough_tex.outputs['Color'],shader.inputs['Roughness'])

desk_mat = material('Oiled walnut desktop', '#bb9d80', .74)
nodes = desk_mat.node_tree.nodes
tex = nodes.new('ShaderNodeTexImage')
tex.image = bpy.data.images.load(str(ROOT/'assets/desk-study/desk-wood.jpg'))
shader = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
desk_mat.node_tree.links.new(tex.outputs['Color'], shader.inputs['Base Color'])
desk = box('Desktop', (0, 0, -.19), (45, 40, .35), desk_mat, .06)
# Large tabletop UVs rather than a repeated square wood pattern.
for layer in desk.data.uv_layers:
    for poly in desk.data.polygons:
        for li in poly.loop_indices:
            co = desk.data.vertices[desk.data.loops[li].vertex_index].co
            layer.data[li].uv = (co.x/15+.5, co.y/15+.5)

notebook = group('Notebook')


def rounded_outline(x0,x1,depth,outer_radius,inner_radius):
    points=[]
    for cx,cy,r,start in [(x0+inner_radius,-depth+inner_radius,inner_radius,math.pi),
                          (x1-outer_radius,-depth+outer_radius,outer_radius,math.pi*1.5),
                          (x1-outer_radius,depth-outer_radius,outer_radius,0),
                          (x0+inner_radius,depth-inner_radius,inner_radius,math.pi*.5)]:
        points.extend((cx+r*math.cos(start+i*math.pi/16),cy+r*math.sin(start+i*math.pi/16)) for i in range(9))
    return points


def page_height(x,y):
    u=(x-.012)/3.168
    v=y/4.58+.5
    return .325+.105*(1-math.exp(-x*3))-.025*u**3+.012*math.sin(v*math.pi)*u


def page_grid(side, offset=0):
    vertices, uv = [], []
    ends=[-2.29+.12*(1-math.cos(i*math.pi/16)) for i in range(9)]
    ys=ends+[-2.17+i*4.34/24 for i in range(1,24)]+[-y for y in reversed(ends)]
    columns=33
    for y in ys:
        v=y/4.58+.5
        d=max(0,abs(y)-(2.29-.12))
        outer=3.06+math.sqrt(max(0,.12**2-d**2))
        d=max(0,abs(y)-(2.29-.025))
        inner=.037-math.sqrt(max(0,.025**2-d**2))
        for i in range(columns):
            u=i/(columns-1)
            x=inner+u*(outer-inner)
            z=page_height(x,y)+offset
            vertices.append((x*side,y,z))
            uv.append((u if side > 0 else 1-u, v))
    faces = []
    for j in range(len(ys)-1):
        for i in range(columns-1):
            a=j*columns+i
            faces.append((a,a+1,a+columns+1,a+columns) if side>0 else (a+columns,a+columns+1,a+1,a))
    return vertices, faces, uv


def leather_height(x,y):
    return .052+.010*(x/3.38)**4+.004*(abs(y)/2.48)**8


paper_shades=[material('Cut paper ivory','#ece5d5',.98),
              material('Cut paper warm','#e4dcc9',.98),
              material('Cut paper light','#f2ecdd',.98)]
burnish=material('Burnished leather edge','#493024',.78)
cover_outline=rounded_outline(.015,3.38,2.48,.18,.025)

for side in (-1,1):
    # A thin flexible leather sheet, rounded in plan without a swollen cross-section.
    n=len(cover_outline)
    vertices=[(side*x,y,leather_height(x,y)+offset) for offset in (-.056,0) for x,y in cover_outline]
    vertices += [(side*1.69,0,leather_height(1.69,0)-.056),(side*1.69,0,leather_height(1.69,0))]
    faces=[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    faces += [(2*n,(i+1)%n,i) for i in range(n)]
    faces += [(2*n+1,i+n,(i+1)%n+n) for i in range(n)]
    uv=[((abs(x)-.015)/3.365,(y+2.48)/4.96) for x,y,z in vertices]
    cover=mesh('LeatherCoverLeft' if side<0 else 'LeatherCoverRight',vertices,faces,leather,notebook,uv)
    cover.data.materials.append(burnish)
    for polygon in list(cover.data.polygons)[:n]: polygon.material_index=1
    bm=bmesh.new(); bm.from_mesh(cover.data)
    bmesh.ops.recalc_face_normals(bm,faces=bm.faces); bm.to_mesh(cover.data); bm.free()
    bevel=cover.modifiers.new('Fine leather edge roll','BEVEL')
    bevel.width,bevel.segments=.005,3
    bpy.context.view_layer.objects.active=cover
    bpy.ops.object.modifier_apply(modifier=bevel.name)

    # Closed signatures share the exact upper-sheet curve; no void under the top page.
    vertices,faces,indices=[],[],[]
    weights=[.82+.36*(.5+.5*math.sin(i*2.31)) for i in range(24)]
    total=sum(weights)
    fraction=0
    for layer,weight in enumerate(weights):
        lo,hi=fraction,fraction+weight/total
        fraction=hi
        start=len(vertices)
        top_gap=.0036 if layer==23 else .0008
        jitter=0 if layer==23 else .0025*math.sin(layer*2.13)
        grid, surface_faces, _ = page_grid(side)
        n=len(grid)
        for t in (lo,hi):
            for x,y,z in grid:
                vertices.append((x+side*jitter*((abs(x)-.012)/3.168),y+jitter*.45,
                                 .068+t*(z-.068)-(top_gap if t==hi else 0)))
        for face in surface_faces:
            faces.append(tuple(start+i for i in reversed(face)))
            faces.append(tuple(start+n+i for i in face))
            indices.extend([layer%3,layer%3])
        columns=33
        rows=n//columns
        perimeter=(list(range(columns))+
                   [r*columns+columns-1 for r in range(1,rows)]+
                   list(range(n-2,n-columns-1,-1))+
                   [r*columns for r in range(rows-2,0,-1)])
        for i,j in zip(perimeter,perimeter[1:]+perimeter[:1]):
            faces.append((start+i,start+j,start+n+j,start+n+i))
            indices.append(layer%3)
    stack=mesh('PageBlockLeft' if side<0 else 'PageBlockRight',vertices,faces,paper_shades[0],notebook)
    for mat in paper_shades[1:]: stack.data.materials.append(mat)
    for polygon,index in zip(stack.data.polygons,indices): polygon.material_index=index
    bm=bmesh.new(); bm.from_mesh(stack.data)
    bmesh.ops.recalc_face_normals(bm,faces=bm.faces); bm.to_mesh(stack.data); bm.free()

    # Fine top-surface sewing follows all three exposed cover edges and both corners.
    stitch_outline=rounded_outline(.09,3.28,2.39,.12,.02)
    thread=bpy.data.curves.new(f'CoverStitches{side}','CURVE')
    thread.dimensions='3D'; thread.bevel_depth=.0024; thread.bevel_resolution=2
    segments=[]
    distance=0
    for a,b in zip(stitch_outline,stitch_outline[1:]):
        length=math.hypot(b[0]-a[0],b[1]-a[1])
        segments.append((a,b,distance,distance+length))
        distance+=length
    along=.03
    while along+.038<distance:
        spline=thread.splines.new('POLY'); spline.points.add(1)
        for point,travel in zip(spline.points,(along,along+.038)):
            for a,b,lo,hi in segments:
                if travel<=hi:
                    t=(travel-lo)/(hi-lo)
                    x,y=a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t
                    point.co=(side*x,y,leather_height(x,y)+.003,1)
                    break
        along+=.105
    obj=bpy.data.objects.new(f'CoverStitches{side}',thread)
    bpy.context.collection.objects.link(obj); obj.parent=notebook; obj.data.materials.append(stitch)

# Soft continuous leather under the sewn gutter joins the two cover halves.
spine_vertices=[]
for y in (-2.46,2.46):
    for i in range(13):
        x=-.19+.38*i/12
        spine_vertices.append((x,y,.043-.012*math.cos(x/.19*math.pi)))
spine=mesh('LeatherSpineWrap',spine_vertices,[(i,i+1,i+14,i+13) for i in range(12)],leather,notebook,
           [(i/12,j) for j in (0,1) for i in range(13)])
solid=spine.modifiers.new('Leather wrap thickness','SOLIDIFY'); solid.thickness=.045
bpy.context.view_layer.objects.active=spine; bpy.ops.object.modifier_apply(modifier=solid.name)


def page(name, side, offset=0):
    vertices, faces, uv = page_grid(side, offset)
    obj = mesh(name, vertices, faces, paper, notebook, uv)
    for p in obj.data.polygons:
        p.use_smooth = True
    solid=obj.modifiers.new('Thin top paper edge','SOLIDIFY'); solid.thickness=.003
    bpy.context.view_layer.objects.active=obj; bpy.ops.object.modifier_apply(modifier=solid.name)
    return obj

page('PageLeft', -1)
page('PageRight', 1)
page('TurningLeaf', 1, .008)

# Three hero props, made in Blender and loaded as a single scene asset.
cup = group('CeramicCup', (-4.55,.7,0))
lathe('Saucer', [(0,.025),(.57,.025),(.8,.06),(.9,.12),(.91,.145),(.88,.16),(.7,.1),(.5,.085),(0,.085)], ceramic, cup)
lathe('Cup', [(0,.1),(.4,.1),(.44,.16),(.5,.3),(.55,.72),(.57,.86),(.56,.9),(.52,.9),(.51,.85),(.48,.35),(.38,.18),(0,.18)], ceramic, cup)
lathe('CoffeeSurface', [(0,.79),(.513,.79)], coffee, cup)
path('CupHandle', [(.52+.34*math.sin(a), 0, .51+.29*math.cos(a)) for a in [i*math.pi/40 for i in range(41)]], .065, ceramic, cup)
# A fine irregular crema ring gives the coffee a physical meniscus.
path('Crema', [(.493*math.cos(i*math.tau/96),.493*math.sin(i*math.tau/96),.794) for i in range(96)], .007, ochre, cup, True)

pen = group('FountainPen', (.1,3.02,.115))
pen.rotation_euler[2] = -.17
pen.rotation_euler[1] = math.pi/2
lathe('PenBarrel', [(0,-1.5),(.07,-1.47),(.105,-1.3),(.115,-.4),(.105,-.2),(.105,.58),(.08,.76),(0,.78)], lacquer, pen, 40)
for z in (-.22,-.16,.61):
    lathe('PenBand', [(.109,z),(.109,z+.035)], brass, pen, 40)
path('PenClip', [(.106,0,-1.3),(.14,0,-1.27),(.145,0,-.58),(.13,0,-.52)], .018, brass, pen)
mesh('GoldNib', [(-.07,0,.77),(.07,0,.77),(0,.01,1.15),(0,.028,.86)], [(0,1,3),(1,2,3),(2,0,3)], brass, pen)

stamp = group('BrassStamp', (4.22,-1.44,0))
stamp.rotation_euler[1] = .10
lathe('StampFoot', [(0,.015),(.36,.015),(.37,.07),(.36,.12),(.3,.15),(0,.15)], brass, stamp)
lathe('StampHandle', [(0,.14),(.18,.14),(.14,.22),(.115,.4),(.17,.65),(.225,.74),(.24,.82),(.21,.91),(.11,.95),(0,.95)], wood, stamp)
lathe('StampFerrule', [(.17,.14),(.17,.19),(.145,.24)], brass, stamp)

# Layered cotton-cardstock theater: cut edges, air gaps, crossed paper firs.
world = group('PaperWorld', (0,-.31,0))


def cutout(name, outline, mat, y=0, z=.46, thickness=.035, floor=False):
    n=len(outline)
    if floor:
        vertices=[(x,yy,z+depth) for depth in (-thickness/2,thickness/2) for x,yy in outline]
    else:
        vertices=[(x,y+depth,z+h) for depth in (-thickness/2,thickness/2) for x,h in outline]
    faces=[tuple(reversed(range(n))),tuple(range(n,n*2))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    obj=mesh(name,vertices,faces,mat,world)
    bm=bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.recalc_face_normals(bm,faces=bm.faces)
    bm.to_mesh(obj.data)
    bm.free()
    bevel=obj.modifiers.new('Soft hand-cut paper edges','BEVEL')
    bevel.width,bevel.segments=.0045,3
    bpy.context.view_layer.objects.active=obj
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    return obj


outline=[]
for cx,cy,start in [(.45,-1.12,math.pi),(2.89,-1.12,math.pi*1.5),(2.89,1.14,0),(.45,1.14,math.pi*.5)]:
    outline += [(cx+.12*math.cos(start+i*math.pi/14),cy+.12*math.sin(start+i*math.pi/14)) for i in range(8)]
base_card=cutout('LandscapeBase',outline,meadow,z=.445,thickness=.032,floor=True)


def assembly_slot(name,x,y,length=.34):
    # The dark edge is a real hole through the card, sized for the inserted tongue.
    cutter=box(name+'Cutter',(x,y,.445),(length,.052,.16),edge,0,world)
    modifier=base_card.modifiers.new(name,'BOOLEAN')
    modifier.operation='DIFFERENCE'
    modifier.object=cutter
    bpy.context.view_layer.objects.active=base_card
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.data.objects.remove(cutter,do_unlink=True)


assembly_slot('BackdropInsert',1.64,1.10,.42)
assembly_slot('MountainLeftInsert',.96,.18,.24)
assembly_slot('MountainRightInsert',2.18,.18,.24)

# A die-cut skyline with an insertion tongue. Gentle curves soften the cut peaks.
knots=[(.32,.42),(.46,.90),(.73,1.12),(1.0,1.06),(1.36,1.42),
       (1.55,1.50),(1.85,1.17),(2.12,1.24),(2.40,.95),(2.63,1.06),(2.85,.74),(3.02,.33)]
contour=[]
padded=[knots[0]]+knots+[knots[-1]]
for i in range(1,len(padded)-2):
    p0,p1,p2,p3=padded[i-1:i+3]
    for step in range(8):
        t=step/8
        contour.append(tuple(.5*((2*p1[a])+(-p0[a]+p2[a])*t+
                    (2*p0[a]-5*p1[a]+4*p2[a]-p3[a])*t*t+
                    (-p0[a]+3*p1[a]-3*p2[a]+p3[a])*t*t*t) for a in range(2)))
outline=[(.32,0)]+contour+[knots[-1],(3.02,0),(1.82,0),(1.82,-.06),(1.46,-.06),(1.46,0)]
sky=cutout('SkyCard',outline,backdrop,y=1.10,thickness=.032)
for loop in sky.data.loops:
    co=sky.data.vertices[loop.vertex_index].co
    sky.data.uv_layers.active.data[loop.index].uv=((co.x-.32)/2.70,(co.z-.46)/1.52)


def hill(name,y,mat,peaks,base=.09):
    contour=[]
    for i in range(73):
        t=i/72
        h=base+sum(height*math.exp(-((t-center)/width)**2) for center,width,height in peaks)
        h += .0025*math.sin(t*91)+.0015*math.sin(t*173)
        contour.append((.34+t*2.66,h))
    cutout(name,[(.34,0)]+contour+[(3,0)],mat,y=y)
    # A visible cardstock foot holds each upright sheet on the page.
    cutout(name+'Foot',[(.5,y),(2.83,y),(2.83,y+.09),(.5,y+.09)],mat,z=.477,thickness=.025,floor=True)
    return contour


far=hill('DistantHills',.88,blue,[(.39,.25,.66),(.94,.22,.21)])
hill('ForestHills',.66,sage,[(.13,.26,.49),(.91,.22,.43)])
# Snow is another thin cut layer, with an undulating lower cut line.
cap=[(x,h) for x,h in far if h>.59]
cutout('SnowCap',cap+[(x,h-.09-.012*math.sin(x*35)) for x,h in reversed(cap)],snow,y=.853,thickness=.012)


def folded_sheet(name,vertices,faces,mat,thickness=.016,parent=None):
    obj=mesh(name,vertices,faces,mat,world if parent is None else parent)
    solid=obj.modifiers.new('Visible cardstock section','SOLIDIFY')
    solid.thickness=thickness
    bpy.context.view_layer.objects.active=obj
    bpy.ops.object.modifier_apply(modifier=solid.name)
    bevel=obj.modifiers.new('Soft cut edge','BEVEL')
    bevel.width,bevel.segments=.0025,2
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    return obj


# Two inclined sheets meet at a true projecting fold. The open rear and brace
# stay inspectable when the visitor changes the angle.
tip=(1.55,.46,1.62)
crease=(1.56,-.10,.49)
left_foot=(.83,.24,.49)
right_foot=(2.29,.24,.49)
folded_sheet('FoldedMountainLeft',[left_foot,tip,crease],[(0,1,2)],blue)
folded_sheet('FoldedMountainRight',[crease,tip,right_foot],[(0,1,2)],sage)
path('MountainFoldSpine',[crease,tip],.006,edge,world)
brace_ratio=(1.40-crease[2])/(tip[2]-crease[2])
brace_top=tuple(crease[a]+(tip[a]-crease[a])*brace_ratio for a in range(3))
folded_sheet('MountainRearBrace',[brace_top,(brace_top[0],.97,.48),(brace_top[0],.60,.48)],[(0,1,2)],snow)
cutout('MountainBraceFoot',[(1.50,.60),(1.60,.60),(1.60,.99),(1.50,.99)],snow,z=.472,thickness=.022,floor=True)
for name,a,b in [('Left',left_foot,crease),('Right',crease,right_foot)]:
    # The glued snow pieces follow each inclined face and share the ridge endpoint.
    offset=(-.003 if name=='Left' else .003,-.022,.012)
    points=[tuple(tip[k]+offset[k] for k in range(3))]
    for i in range(25):
        g=i/24
        t=.32+.035*math.sin(g*math.pi*3)
        foot=tuple(a[k]*(1-g)+b[k]*g for k in range(3))
        points.append(tuple(tip[k]*(1-t)+foot[k]*t+offset[k] for k in range(3)))
    folded_sheet('FoldedSnow'+name,points,[tuple(range(len(points)))],snow,.008)
for name,x in [('Left',.96),('Right',2.18)]:
    folded_sheet('Mountain'+name+'Foot',[(x-.10,.18,.405),(x+.10,.18,.405),
                 (x+.10,.18,.49),(x+.10,.30,.49),(x-.10,.30,.49),(x-.10,.18,.49)],
                 [(0,1,2,5),(5,2,3,4)],ochre,.012)
    path('Mountain'+name+'Score',[(x-.10,.18,.492),(x+.10,.18,.492)],.0025,edge,world)

# A narrow folded front apron makes the base read as an assembled paper insert.
cutout('BaseFoldedApron',[(.45,0),(2.89,0),(2.89,.048),(.45,.048)],ochre,y=-1.235,z=.397,thickness=.012)

for idx,cx in enumerate((.58,1.43,2.78)):
    outline=[(cx-.23,0),(cx-.22,.09),(cx-.14,.045),(cx-.10,.19),
             (cx-.025,.07),(cx+.04,.16),(cx+.10,.055),(cx+.20,.13),(cx+.23,0)]
    cutout(f'CutPaperGrass_{idx}',outline,light_pine,y=-1.06,thickness=.018)

# The sun and clouds are cut card, set behind the hills like a tiny paper theater.
cutout('PaperSun',[(2.57+.14*math.cos(i*math.tau/64),.80+.14*math.sin(i*math.tau/64)) for i in range(64)],clay,y=1.067,thickness=.025)
for index,(cx,cy,zz,width) in enumerate([(.77,1.062,.88,.44),(1.96,1.062,1.00,.37)]):
    circles=[(-.32,.17,.18),(-.11,.24,.25),(.14,.20,.21),(.33,.14,.16)]
    upper,lower=[],[]
    for i in range(65):
        u=-.50+.99*(i+.001)/64.002
        arcs=[(height,math.sqrt(radius*radius-(u-center)**2)) for center,height,radius in circles if abs(u-center)<radius]
        upper.append((cx+u*width,zz+max(height+arc for height,arc in arcs)*width))
        lower.append((cx+u*width,zz+min(height-arc for height,arc in arcs)*width))
    outline=upper+list(reversed(lower))
    cutout(f'PaperCloud{index}',outline,snow,y=cy,thickness=.03)

# Paper river ribbon laid over the landscape base.
verts=[]
for i in range(33):
    y = -1.12+i*.064
    x = 2.91+.025*math.sin(i*.13)
    for dx in (-.045,.045):
        verts.append((x+dx,y,.463))
mesh('PaperRiver', verts, [(2*i,2*i+1,2*i+3,2*i+2) for i in range(32)], river, world)
verts=[]
for i in range(36):
    x,y=1.05+.22*math.sin(i*.14),-1.07+i*.047
    verts.extend([(x-.046,y,.474),(x+.046,y,.474)])
mesh('Footpath',verts,[(2*i,2*i+1,2*i+3,2*i+2) for i in range(35)],ochre,world)

# Fiona chose this crossed-sheet fir silhouette; repeat it at staggered scales/depths.
profile=[(-.15,.10),(-.09,.35),(-.13,.33),(-.045,.64),(-.08,.60),(0,1),
         (.08,.60),(.045,.64),(.13,.33),(.09,.35),(.15,.10)]
tree_positions=[(.56,.20,.85,1.23),(2.75,.26,.98,1.40),
                (.44,-.37,.50,.90),(2.55,-.10,.57,.95),(.45,-.97,.30,.65)]
for index,(x,y,h,width) in enumerate(tree_positions):
    for side,angle in enumerate((-.55+index*.13,.8+index*.13)):
        vertices=[(x+xx*width*math.cos(angle),y+xx*width*math.sin(angle),.47+zz*h) for xx,zz in profile]
        folded_sheet(f'Fir{index}Fold{side}',vertices,[tuple(range(len(vertices)))],dark_sage if side else light_pine,.012)
    box(f'Fir{index}Trunk',(x,y,.515),(.022*width,.022*width,.10),wood,.003,world)

# A small open-front paper tent occupies the old bridge clearing.
cx,yf,yb=2.14,-.98,-.36
left,right,peak=cx-.42,cx+.42,1.12
interior=material('Tent interior shadow','#382f25',.97)
folded_sheet('TentLeftRoof',[(left,yf,.48),(cx,yf,peak),(cx,yb,peak),(left,yb,.48)],[(0,1,2,3)],snow,.012)
folded_sheet('TentRightRoof',[(cx,yf,peak),(right,yf,.48),(right,yb,.48),(cx,yb,peak)],[(0,1,2,3)],meadow,.012)
folded_sheet('TentRear',[(left,yb,.48),(cx,yb,peak),(right,yb,.48)],[(0,1,2)],ochre,.012)
cutout('TentGroundsheet',[(left,yf),(right,yf),(right,yb),(left,yb)],dark_sage,z=.474,thickness=.014,floor=True)
folded_sheet('TentLeftDoor',[(left,yf-.01,.48),(cx,yf-.01,peak),(cx-.12,yf-.065,.65),(cx-.22,yf-.075,.48)],[(0,1,2,3)],snow,.01)
folded_sheet('TentRightDoor',[(cx,yf-.01,peak),(right,yf-.01,.48),(cx+.22,yf-.075,.48),(cx+.12,yf-.065,.65)],[(0,1,2,3)],snow,.01)
folded_sheet('TentDarkOpening',[(cx-.20,yf+.18,.483),(cx,yf+.18,.96),(cx+.20,yf+.18,.483)],[(0,1,2)],interior,.006)
path('TentRidgePole',[(cx,yf-.015,peak+.006),(cx,yb+.015,peak+.006)],.006,edge,world)
for side in (left,right):
    path('TentFrontBinding',[(side,yf-.015,.48),(cx,yf-.015,peak+.006)],.005,ochre,world)
path('TentGuyRope',[(cx,yf-.02,peak),(cx+.47,yf-.15,.48)],.0025,stitch,world)
box('TentGuyPeg',(cx+.47,yf-.15,.48),(.028,.014,.036),wood,.003,world)

# Three crossed flame silhouettes and upright card stones keep the fire papercraft.
fx,fy=1.49,-.80
for i in range(9):
    a=i*math.tau/9
    x,y=fx+.16*math.cos(a),fy+.13*math.sin(a)
    cutout(f'FireRingStone{i}',[(x-.033,0),(x-.04,.035),(x-.023,.067),(x+.015,.073),(x+.038,.04),(x+.033,0)],stone,y=y,z=.47,thickness=.025)
for i,(x,y,w,h,mat) in enumerate([(fx,fy-.025,.12,.24,ember),(fx-.035,fy,.075,.29,flame),(fx+.045,fy+.025,.065,.20,ember),(fx+.01,fy-.05,.05,.15,flame)]):
    cutout(f'PaperFlame{i}',[(x-w*.6,0),(x-w,.07),(x-w*.45,h*.6),(x-w*.25,h*.43),
                            (x+w*.05,h),(x+w*.35,h*.55),(x+w*.65,h*.73),(x+w,.06),(x+w*.6,0)],mat,y=y,z=.48,thickness=.012)
path('FirewoodLogA',[(fx-.105,fy-.07,.49),(fx+.105,fy+.07,.49)],.017,wood,world)
path('FirewoodLogB',[(fx+.09,fy-.08,.49),(fx-.09,fy+.08,.49)],.017,wood,world)

# The annotated position is left of the fire, facing it rather than the stream.
chair=group('CampChair', (1.16,-.47,0))
chair.parent=world
chair.rotation_euler[2]=math.pi/4
for xx in (-.105,.105):
    path('CampChairCrossA',[(xx,-.12,.47),(xx,.11,.71)],.009,wood,chair)
    path('CampChairCrossB',[(xx,.12,.47),(xx,-.11,.69)],.009,wood,chair)
    path('CampChairBackPost',[(xx,.08,.61),(xx,.13,.86)],.008,wood,chair)
folded_sheet('CampChairSeat',[(-.10,-.09,.66),(.10,-.09,.66),(.10,.08,.66),(-.10,.08,.66)],[(0,1,2,3)],snow,.008,parent=chair)
folded_sheet('CampChairBack',[(-.10,.08,.69),(.10,.08,.69),(.10,.13,.85),(-.10,.13,.85)],[(0,1,2,3)],snow,.008,parent=chair)

# A printed paper arrow on a folded post, borrowing the reference's wayfinding role.
sx,sy=.63,-.85
cutout('WanderPost',[(sx-.018,0),(sx+.018,0),(sx+.018,.43),(sx-.018,.43)],ochre,y=sy,z=.47,thickness=.026)
cutout('WanderArrow',[(sx-.25,0),(sx+.18,0),(sx+.29,.08),(sx+.18,.16),(sx-.25,.16),(sx-.205,.08)],wood,y=sy-.018,z=.76,thickness=.02)
lettering=bpy.data.curves.new('WanderLettering','FONT')
lettering.body='Wander'
lettering.font=bpy.data.fonts.load(str(ROOT/'public/fonts/Lora-Regular.ttf'))
lettering.size=.085
lettering.align_x='CENTER'
lettering.align_y='CENTER'
obj=bpy.data.objects.new('WanderLettering',lettering)
bpy.context.collection.objects.link(obj)
obj.parent=world
obj.location=(sx,sy-.032,.842)
obj.rotation_euler=(math.pi/2,0,0)
obj.data.materials.append(paper)

for y,label,mat in [(1.5,'Start',sage),(.5,'Making',blue),
                    (-.5,'Projects',light_pine),(-1.5,'Contact',clay)]:
    tab=box(label+'Tab', (3.3,y,.25), (.36,.7,.045), mat, .045, notebook)
    curve=bpy.data.curves.new(label+'Lettering','FONT')
    curve.body=label
    curve.size=.11
    curve.align_x='CENTER'
    curve.font=bpy.data.fonts.load(str(ROOT/'public/fonts/Lora-Regular.ttf'))
    obj=bpy.data.objects.new(label+'Lettering',curve)
    bpy.context.collection.objects.link(obj)
    obj.parent=notebook
    obj.location=(3.32,y,.278)
    obj.rotation_euler[2]=math.pi/2
    obj.data.materials.append(material(label+'TabInk','#34483b',.95))

# Keep the saved source editable. Render setup is only for optional Blender inspection;
# the browser owns runtime lighting and camera choreography.
scene=bpy.context.scene
scene.world.color=(.2,.2,.2)
bpy.ops.object.camera_add(location=(.3,-9.8,10.5))
camera=bpy.context.object
camera.name='StudyCamera'
camera.rotation_euler=(Vector((0,0,.2))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.lens=48
scene.camera=camera
bpy.ops.object.light_add(type='AREA', location=(-4,-2,8))
light=bpy.context.object
light.name='WindowSoftbox'
light.data.energy=1100
light.data.shape='DISK'
light.data.size=7
scene.render.resolution_x,scene.render.resolution_y=1600,1100
scene.render.resolution_percentage=100
source=ROOT/'assets/desk-study/desk-study.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(source))
bpy.ops.export_scene.gltf(filepath=str(OUT/'desk-scene.glb'), export_format='GLB',
                          export_cameras=False, export_lights=False, export_animations=False,
                          export_apply=True, export_yup=True)
manifest={'source':'assets/desk-study/desk-study.blend','generator':'scripts/desk-study/build_scene.py',
          'blender':bpy.app.version_string,'meshes':sum(o.type=='MESH' for o in scene.objects),
          'glb_bytes':(OUT/'desk-scene.glb').stat().st_size,
          'runtime_nodes':['PageLeft','PageRight','TurningLeaf','PaperWorld','StartTab','MakingTab','ProjectsTab','ContactTab'],
          'props':['CeramicCup','FountainPen','BrassStamp']}
(OUT/'scene-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('DESK_STUDY_EXPORTED',json.dumps(manifest))
