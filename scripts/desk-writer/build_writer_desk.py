"""Blender source for Fiona's newly selected writer desk, 2026-11-13.

Coordinates throughout: (right, up, towards viewer). Exported GLBs use Three's Y-up.
Run in a dedicated scene; keep the original and Slow Post scenes intact.
"""
import bpy
import math
from pathlib import Path
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/desk-writer'
OUT.mkdir(parents=True, exist_ok=True)
name = 'Fiona - Writer Desk'
scene = bpy.data.scenes.get(name) or bpy.data.scenes.new(name)
owned=set(scene.objects)
for obj in list(owned):
    owned.update(obj.children_recursive)
for obj in list(owned): bpy.data.objects.remove(obj, do_unlink=True)
bpy.context.window.scene = scene
with bpy.context.temp_override(scene=scene, view_layer=scene.view_layers[0]):
    roots = {}

    def pt(p): return (p[0], -p[2], p[1])
    def linear(v): return v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4
    def rgba(hex): return tuple(linear(int(hex[i:i+2],16)/255) for i in (0,2,4)) + (1,)

    def mat(name, color, rough=.65, metal=0, emission=0, glass=0):
        m=bpy.data.materials.new('WD_'+name);m.use_nodes=True
        p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
        p.inputs['Base Color'].default_value=rgba(color)
        p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
        if emission:
            p.inputs['Emission Color'].default_value=rgba(color);p.inputs['Emission Strength'].default_value=emission
        if glass:
            p.inputs['Transmission Weight'].default_value=glass;p.inputs['IOR'].default_value=1.46
        return m

    black=mat('black enamel','242822',.4,.12)
    edge=mat('black edge','373b32',.47,.12)
    rubber=mat('rubber','171b16',.88)
    gold=mat('aged brass','ad8c4d',.42,.42,.035)
    gold_dark=mat('brass recess','736039',.65,.24)
    silver=mat('carriage steel','a09e8c',.4,.5)
    ivory=mat('cotton paper','f4ead3',.94)
    ink=mat('printed ink','3c382b',.92)
    ceramic=mat('ivory ceramic glaze','e7dbc2',.28)
    ceramic_rim=mat('glaze edge','bcaa82',.34)
    amber=mat('amber glass','9c5724',.21,.05,glass=.3)
    wax=mat('cream wax','e1ce9c',.9)
    wick=mat('charred wick','35291c',.96)
    flame=mat('warm flame','ffcf73',.6,emission=2.2)
    inkglass=mat('ink bottle green glass','26352b',.23,.1)
    pen_green=mat('olive lacquer','344537',.3,.1)
    walnut=mat('turned walnut','67402a',.43)

    def image_mat(name,path):
        m=mat(name,'ffffff',.9)
        node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=bpy.data.images.load(str(path),check_existing=True)
        p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
        m.node_tree.links.new(node.outputs['Color'],p.inputs['Base Color'])
        return m

    coffee=image_mat('cat latte',ROOT/'assets/desk-writer/latte-cat.png')

    def grain_material(material,base):
        # Low-amplitude, non-periodic color tooth; the texture is portable in glTF.
        gen=np.random.default_rng(41);n=256
        buf=np.ones((n,n,4),dtype=np.float32)
        noise=gen.normal(0,.018,(n,n))
        for ch in range(3):
            linear=np.clip(base[ch]*(1+noise),0,1)
            buf[:,:,ch]=np.where(linear<=.0031308,linear*12.92,1.055*linear**(1/2.4)-.055)
        image=bpy.data.images.new('WD_fine_grain',width=n,height=n)
        image.pixels.foreach_set(buf.ravel());image.pack()
        node=material.node_tree.nodes.new('ShaderNodeTexImage');node.image=image
        p=next(n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
        material.node_tree.links.new(node.outputs['Color'],p.inputs['Base Color'])

    grain_material(ivory,rgba('f4ead3')[:3])
    grain_material(walnut,rgba('67402a')[:3])

    # Uncoated warm writing stock, separate from the ink-bottle label material.
    typing_paper=mat('uncoated typing paper','f6edda',.98)
    rng=np.random.default_rng(126);paper_n=1024
    def soft_noise(cells):
        values=rng.normal(0,1,(cells,cells))
        source=np.linspace(0,paper_n-1,cells);dest=np.arange(paper_n)
        rows=np.array([np.interp(dest,source,row) for row in values])
        return np.array([np.interp(dest,source,row) for row in rows.T]).T
    cloud=soft_noise(13)*.011+soft_noise(61)*.006
    tooth=rng.normal(0,.004,(paper_n,paper_n))
    fibers=np.zeros((paper_n,paper_n))
    for _ in range(2200):
        x=int(rng.integers(8,paper_n-8));y=int(rng.integers(8,paper_n-8))
        length=int(rng.integers(2,8));angle=rng.uniform(0,math.tau)
        strength=rng.uniform(.003,.018)
        for k in range(length):
            xx=int(x+math.cos(angle)*k);yy=int(y+math.sin(angle)*k)
            fibers[yy,xx]+=strength*math.sin((k+1)/(length+1)*math.pi)
    variation=cloud+tooth-fibers
    pixels=np.ones((paper_n,paper_n,4),np.float32)
    for ch,base in enumerate((246/255,237/255,218/255)):
        pixels[:,:,ch]=np.clip(base+variation,0,1)
    paper_image=bpy.data.images.new('WD_uncoated_paper_fibers',width=paper_n,height=paper_n)
    paper_image.pixels.foreach_set(pixels.ravel());paper_image.pack()
    nodes=typing_paper.node_tree.nodes
    shader=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
    shader.inputs['Specular IOR Level'].default_value=.18
    shader.inputs['Sheen Weight'].default_value=.08
    color=nodes.new('ShaderNodeTexImage');color.image=paper_image
    typing_paper.node_tree.links.new(color.outputs['Color'],shader.inputs['Base Color'])
    # Tiny surface relief is baked into a tangent normal map for glTF portability.
    height=tooth*.4-fibers*.7
    dy,dx=np.gradient(height)
    normals=np.stack((-dx*1.6,-dy*1.6,np.ones_like(dx)),axis=-1)
    normals/=np.linalg.norm(normals,axis=-1,keepdims=True)
    normal_pixels=np.ones((paper_n,paper_n,4),np.float32);normal_pixels[:,:,:3]=normals*.5+.5
    normal_image=bpy.data.images.new('WD_paper_fiber_normal',width=paper_n,height=paper_n)
    normal_image.colorspace_settings.name='Non-Color'
    normal_image.pixels.foreach_set(normal_pixels.ravel());normal_image.pack()
    normal_tex=nodes.new('ShaderNodeTexImage');normal_tex.image=normal_image
    normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.35
    typing_paper.node_tree.links.new(normal_tex.outputs['Color'],normal.inputs['Color'])
    typing_paper.node_tree.links.new(normal.outputs['Normal'],shader.inputs['Normal'])
    font_path=Path('/System/Library/Fonts/Supplemental/Courier New.ttf')
    font=bpy.data.fonts.load(str(font_path)) if font_path.exists() else None
    active=None

    def root(label):
        global active
        active=bpy.data.objects.new(label,None);scene.collection.objects.link(active);roots[label]=active
        return active

    def finish(o,name,material,bevel=0,smooth=False):
        o.name=name;o.parent=active;o.data.materials.append(material)
        if bevel:
            m=o.modifiers.new('Soft manufactured edge','BEVEL');m.width=bevel;m.segments=3
        if smooth:
            for f in o.data.polygons:f.use_smooth=True
        return o

    def box(name,p,size,material,bevel=.01):
        bpy.ops.mesh.primitive_cube_add(size=1,location=pt(p));o=bpy.context.object
        o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        return finish(o,name,material,bevel)

    def cyl(name,p,r,h,material,axis='up',vertices=48):
        bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=h,location=pt(p));o=bpy.context.object
        if axis=='x':o.rotation_euler[1]=math.pi/2
        if axis=='front':o.rotation_euler[0]=math.pi/2
        return finish(o,name,material,smooth=True)

    def tube(name,coords,r,material):
        data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.resolution_u=12
        s=data.splines.new('POLY');s.points.add(len(coords)-1)
        for q,p in zip(s.points,coords):q.co=(*pt(p),1)
        data.bevel_depth=r;data.bevel_resolution=3
        obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.parent=active;data.materials.append(material)
        return obj

    def rod(name,a,b,r,material):return tube(name,[a,b],r,material)

    def panel(name,coords,material,thick=.025):
        mesh=bpy.data.meshes.new(name);mesh.from_pydata([pt(p) for p in coords],[],[list(range(len(coords)))]);mesh.update()
        obj=bpy.data.objects.new(name,mesh);scene.collection.objects.link(obj);finish(obj,name,material)
        m=obj.modifiers.new('Real sheet thickness','SOLIDIFY');m.thickness=thick
        return obj

    def text(name,body,p,size,material,flat=False):
        data=bpy.data.curves.new(name,'FONT');data.body=body;data.size=size;data.align_x='CENTER';data.align_y='CENTER'
        if font:data.font=font
        data.extrude=0
        obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.parent=active
        obj.location=pt(p);obj.rotation_euler[0]=0 if flat else math.pi/2
        data.materials.append(material)
        return obj

    def lathe(name,profile,material,segments=96):
        verts=[];faces=[]
        for r,y in profile:
            for i in range(segments):
                a=i*math.tau/segments;verts.append(pt((math.cos(a)*r,y,math.sin(a)*r)))
        for j in range(len(profile)-1):
            for i in range(segments):
                a=j*segments+i;b=j*segments+(i+1)%segments
                faces.append((a,a+segments,b+segments,b))
        mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
        obj=bpy.data.objects.new(name,mesh);scene.collection.objects.link(obj)
        return finish(obj,name,material,smooth=True)

    # ---------- TYPEWRITER: no plinth, booklet or feather ----------
    root('Typewriter')
    for x in [-1.42,1.42]:
        for z in [-.95,1.16]:cyl('Rubber foot',(x,.06,z),.13,.12,rubber)
    box('Black steel keyboard chassis',(0,.18,.2),(3.3,.15,2.65),black,.035)
    panel('Sloped keyboard deck',[(-1.56,.26,1.47),(1.56,.26,1.47),(1.56,.61,-.05),(-1.56,.61,-.05)],black,.06)
    for x in [-1.54,1.54]:
        panel('Keyboard side rail',[(x,.23,1.45),(x,.34,1.45),(x,.68,-.15),(x,1.4,-.85),(x,.3,-1.12)],black,.07)
        box('Upright shoulder frame',(x,1.01,-.5),(.14,.87,.75),black,.025)
    box('Rear back panel',(0,.91,-1.04),(3.18,1.27,.09),black,.018)
    box('Front skirt',(0,.22,1.51),(3.27,.22,.09),black,.025)
    rod('Fine brass front line',(-1.5,.3,1.56),(1.5,.3,1.56),.009,gold)
    rows=['ZXCVBNM,./','ASDFGHJKL;','QWERTYUIOP','1234567890']
    for row,letters in enumerate(rows):
        z=1.18-row*.29;y=.35+row*.083
        for col,ch in enumerate(letters):
            x=(col-4.5)*.277 + (row%2)*.04
            cyl('Key metal stem',(x,y-.045,z),.025,.08,silver,vertices=12)
            cyl('Round brass key rim',(x,y,z),.094,.035,gold,vertices=28)
            cyl('Black key face',(x,y+.023,z),.077,.018,rubber,vertices=28)
            text('Key '+ch,ch,(x,y+.035,z),.084,ivory,True)
    box('Spacebar',(0,.3,1.36),(1.88,.06,.1),rubber,.025)
    for x in [-.89,.89]:box('Spacebar mount',(x,.25,1.36),(.05,.12,.04),gold,.008)
    # Curved typebar basket, with real spaced radial bars, not a flat gold fan image.
    for radius in [.45,.72,.82]:
        tube('Type basket curved rim',[(radius*math.cos(a),1.25-radius*.79*math.sin(a),-.24) for a in np.linspace(0,math.pi,65)],.012,gold)
    for a in np.linspace(.035,math.pi-.035,43):
        rod('Individual brass typebar',(.46*math.cos(a),1.25-.46*.79*math.sin(a),-.22),(.8*math.cos(a),1.25-.8*.79*math.sin(a),-.22),.009,gold)
    for x in [-1.23,1.23]:
        box('Front frame upright',(x,.96,-.18),(.11,.62,.09),black,.015)
        for y in [.72,1.27]:cyl('Frame brass fixing',(x,y,-.115),.034,.01,gold,'front',20)
    box('Carriage frame crossbar',(0,1.32,-.24),(3.3,.13,.1),black,.01)
    rod('Front carriage guide',(-1.73,1.46,-.03),(1.73,1.46,-.03),.026,silver)
    rod('Brass graduated carriage rail',(-1.63,1.36,.035),(1.63,1.36,.035),.019,gold)
    for i in range(66):
        x=-1.57+i*.048
        rod('Carriage scale tick',(x,1.35,.06),(x,1.35+(.043 if i%5 else .072),.06),.0035,gold)
    cyl('Black rubber platen',(0,1.48,-.64),.155,3.08,rubber,'x')
    for x in [-1.78,1.78]:
        cyl('Carriage knob',(x,1.48,-.64),.155,.19,edge,'x')
        cyl('Carriage steel hub',(x,1.48,-.64),.08,.21,silver,'x')
        rod('Side paper arm',(x*.93,1.3,-.1),(x*.93,1.59,-.84),.025,silver)
        cyl('Arm pivot',(x*.93,1.32,-.12),.046,.06,silver,'x',24)
    rod('Carriage return lever',(-1.76,1.56,-.73),(-2.06,1.69,-.54),.022,silver)
    box('Return lever grip',(-2.1,1.7,-.5),(.21,.075,.16),edge,.025)
    box('Rear paper support',(0,1.62,-.93),(2.83,.28,.06),black,.012)
    for i in range(30):
        rod('Rear scale',(-1.35+i*.09,1.69,-.885),(-1.35+i*.09,1.73,-.885),.003,gold)
    # Feed wraps the rear of the platen; the free sheet leaves its vertical tangent smoothly.
    # This surface is reused for the ink so a side view never reveals detached lettering.
    def paper_front(x,y):
        if y <= 1.48:
            return -.64-math.sqrt(.158**2-(y-1.48)**2)
        t=(y-1.48)/.8
        return -.798-.25*t*t+.05*t**4+.003*(x/.88)**2*t*t+.004*t**5*math.sin(x*2.3+.4)

    vertices=[];faces=[];uvs=[];nx=24;ny=72
    for j in range(ny+1):
        y=1.35+j/ny*.93
        for i in range(nx+1):
            x=-.88+i/nx*1.76
            vertices.append(pt((x,y,paper_front(x,y))));uvs.append((i/nx,j/ny))
    for j in range(ny):
        for i in range(nx):
            a=j*(nx+1)+i;faces.append((a,a+1,a+nx+2,a+nx+1))
    mesh=bpy.data.meshes.new('Letter paper');mesh.from_pydata(vertices,[],faces);mesh.update()
    obj=bpy.data.objects.new('Letter paper',mesh);scene.collection.objects.link(obj);finish(obj,'Letter paper',typing_paper,smooth=True)
    layer=mesh.uv_layers.new()
    for poly in mesh.polygons:
        for li in poly.loop_indices:layer.data[li].uv=uvs[mesh.loops[li].vertex_index]
    solid=obj.modifiers.new('Thin paper edge','SOLIDIFY');solid.thickness=.001
    t=text('Typed greeting','hello world!',(0,2.04,paper_front(0,2.04)+.0015),.195,ink)
    t.rotation_euler[0]=math.pi/2
    # Rear construction is visible on orbit too.
    for x in [-.9,.9]:
        cyl('Rear ribbon spool',(x,.92,-1.1),.27,.035,edge,'front')
        cyl('Rear spool centre',(x,.92,-1.127),.09,.016,gold,'front',24)
    for i in range(25):
        rod('Rear escapement',(-.72+i*.057,.46,-1.1),(-.62+i*.048,1.0,-1.1),.007,gold_dark)

    # ---------- COFFEE + SAUCER ----------
    root('Coffee')
    lathe('Thin ceramic saucer',[(0,.025),(.38,.025),(.75,.04),(1.14,.10),(1.25,.15),(1.26,.19),(1.18,.22),(.75,.14),(.38,.105),(0,.105)],ceramic)
    lathe('Hollow cup',[(0,.12),(.43,.12),(.52,.18),(.65,.4),(.75,.9),(.77,1.15),(.75,1.2),(.70,1.2),(.695,1.13),(.68,.9),(.57,.4),(.42,.22),(0,.22)],ceramic)
    tube('Cup glaze lip',[(.736*math.cos(a),1.2,.736*math.sin(a)) for a in np.linspace(0,math.tau,97)],.014,ceramic_rim)
    curve=[]
    for a in np.linspace(-math.pi/2,math.pi/2,65):curve.append((.68+.5*math.cos(a),.7+.39*math.sin(a),0))
    tube('Open ceramic handle',curve,.075,ceramic)
    segments=96;v=[pt((0,1.125,0))];f=[]
    for i in range(segments):
        a=i*math.tau/segments;v.append(pt((.69*math.cos(a),1.125,.69*math.sin(a))))
    for i in range(segments):f.append((0,(i+1)%segments+1,i+1))
    m=bpy.data.meshes.new('Latte surface');m.from_pydata(v,[],f);m.update()
    o=bpy.data.objects.new('Cat latte art',m);scene.collection.objects.link(o);finish(o,'Cat latte art',coffee)
    uv=m.uv_layers.new()
    for p in m.polygons:
        for li in p.loop_indices:
            vert=m.vertices[m.loops[li].vertex_index].co
            uv.data[li].uv=(.5+vert.x/.69*.475,.5+vert.y/.69*.475)

    # ---------- CANDLE ----------
    root('Candle')
    lathe('Amber glass jar',[(0,0),(.42,0),(.49,.06),(.50,.16),(.50,1.12),(.49,1.22),(.46,1.24),(.425,1.20),(.44,1.11),(.44,.17),(.40,.08),(0,.08)],amber)
    cyl('Wax pool',(0,1.08,0),.435,.09,wax)
    cyl('Dark wick',(0,1.15,0),.016,.08,wick,vertices=16)
    lathe('Candle flame',[(0,1.17),(.04,1.2),(.055,1.29),(.03,1.4),(0,1.51)],flame,48)
    # Label is a real curved paper band, following the jar wall.
    verts=[]
    for y in [.31,.72]:
        for a in np.linspace(-.65,.65,33):verts.append(pt((math.sin(a)*.505,y,math.cos(a)*.505)))
    faces=[(i,i+1,i+34,i+33) for i in range(32)]
    m=bpy.data.meshes.new('Candle label');m.from_pydata(verts,[],faces);m.update()
    o=bpy.data.objects.new('Candle cream label',m);scene.collection.objects.link(o);finish(o,'Candle cream label',ivory)
    text('Candle label word','SANDALWOOD',(0,.52,.515),.063,ink)

    # ---------- INK ----------
    root('Ink')
    box('Bevelled green glass bottle',(0,.48,0),(.88,.96,.72),inkglass,.065)
    cyl('Bottle neck',(0,1.0,0),.25,.17,inkglass)
    cyl('Ribbed ink cap',(0,1.18,0),.31,.27,rubber)
    for i in range(48):
        a=i*math.tau/48;rod('Cap fine rib',(.312*math.cos(a),1.08,.312*math.sin(a)),(.312*math.cos(a),1.28,.312*math.sin(a)),.006,edge)
    box('Ink paper label',(0,.47,.365),(.52,.4,.008),ivory,.012)
    text('Ink lettering','INK',(0,.49,.373),.17,ink)

    # ---------- FOUNTAIN PEN ----------
    pen_builder = {}
    exec(compile((ROOT/'scripts/desk-writer/build_pen.py').read_text(), 'build_pen.py', 'exec'), pen_builder)
    roots['Pen'] = pen_builder['build_pen'](scene)

    glasses_builder = {}
    exec(compile((ROOT/'scripts/desk-writer/build_glasses.py').read_text(), 'build_glasses.py', 'exec'), glasses_builder)
    roots['Glasses'] = glasses_builder['build_glasses'](scene)

    # ---------- LYING POSTAL STAMP ----------
    stamp=root('Stamp')
    lathe('Turned walnut handle',[(0,.26),(.24,.26),(.24,.33),(.17,.43),(.12,.64),(.17,.85),(.26,1.02),(.27,1.16),(.21,1.31),(.09,1.38),(0,1.4)],walnut)
    cyl('Brass stamp base',(0,.16,0),.39,.22,gold)
    cyl('Rubber stamp face',(0,.035,0),.36,.06,rubber)
    cyl('Base bevel ring',(0,.27,0),.37,.035,gold)
    stamp.rotation_euler[1]=-math.radians(97)
    bpy.context.view_layer.update()
    bounds=[ob.matrix_world@v.co for ob in stamp.children if ob.type=='MESH' for v in ob.data.vertices]
    stamp.location.z-=min(v.z for v in bounds)
    stamp.location.x-=(min(v.x for v in bounds)+max(v.x for v in bounds))/2

    # Convert curves/text to meshes; keep every editable key, ring and frame in the source.
    for ob in list(scene.objects):
        if ob.type in {'CURVE','FONT'}:
            bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob
            bpy.ops.object.convert(target='MESH')
    # Printed ink follows the actual sheet, rather than floating in front and casting letter shadows.
    bpy.context.view_layer.update()
    for ob in roots['Typewriter'].children:
        if ob.type=='MESH' and ob.name.startswith('Typed greeting'):
            inverse=ob.matrix_world.inverted()
            for vertex in ob.data.vertices:
                p=ob.matrix_world@vertex.co;x=p.x;y=p.z
                front=paper_front(x,y)+.0015
                p.y=-front;vertex.co=inverse@p
    for ob in list(scene.objects):
        if ob.type!='MESH' or ob.data.uv_layers:continue
        bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob
        bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.02);bpy.ops.object.mode_set(mode='OBJECT')

    source=ROOT/'assets/desk-writer/writer-desk.blend'
    depsgraph=bpy.context.evaluated_depsgraph_get()
    for label,parent in roots.items():
        copies={}
        for ob in list(parent.children):
            if ob.type!='MESH':continue
            mesh=bpy.data.meshes.new_from_object(ob.evaluated_get(depsgraph),depsgraph=depsgraph)
            copy=bpy.data.objects.new('EXPORT_'+ob.name,mesh);scene.collection.objects.link(copy);copy.matrix_world=ob.matrix_world.copy()
            copies.setdefault(tuple(m.name for m in mesh.materials),[]).append(copy)
        exports=[]
        for objects in copies.values():
            bpy.ops.object.select_all(action='DESELECT')
            for ob in objects:ob.select_set(True)
            bpy.context.view_layer.objects.active=objects[0]
            if len(objects)>1:bpy.ops.object.join()
            exports.append(bpy.context.object)
        bpy.ops.object.select_all(action='DESELECT')
        for ob in exports:ob.select_set(True)
        bpy.ops.export_scene.gltf(filepath=str(OUT/(label.lower()+'.glb')),export_format='GLB',use_selection=True,use_active_scene=True,export_apply=True)
        for ob in exports:bpy.data.objects.remove(ob,do_unlink=True)
    # Present the editable originals at the same sizes/poses as the app, after local-space export.
    poses={'Typewriter':((12.8,-.18,-3.0),3.0,-.1),'Coffee':((-5.5,-.18,6.0),1.25,-.4),
           'Candle':((4.5,-.18,-6.2),1.55,0),'Ink':((-1.4,-.18,-6.1),1.3,-.12),
           'Glasses':((-4.8,-.18,-5.0),1.0,.16),'Pen':((-5.0,-.18,-7.0),1.0,-.15),'Stamp':((12.1,-.18,5.7),1.6,.3)}
    for label,(p,scale,yaw) in poses.items():
        parent=roots[label];parent.location=parent.location*scale+Vector(pt(p));parent.scale=(scale,scale,scale)
        # Three's Y rotation maps to Blender's Z rotation with the same handedness.
        parent.rotation_euler[2]+=yaw
    bpy.ops.object.camera_add(location=pt((5,21,17)))
    cam=bpy.context.object;cam.name='Writer desk inspection camera'
    cam.rotation_euler=(Vector(pt((5,0,0)))-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type='ORTHO';cam.data.ortho_scale=31;scene.camera=cam
    for p,power in [((-5,14,10),2200),((15,10,-4),1600)]:
        bpy.ops.object.light_add(type='AREA',location=pt(p));o=bpy.context.object;o.data.energy=power;o.data.size=12
        o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
    scene.world=bpy.data.worlds.new('Writer daylight');scene.world.use_nodes=True
    background=next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND')
    background.inputs['Color'].default_value=(.6,.56,.5,1);background.inputs['Strength'].default_value=.7
    bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(source))
    print('WRITER_DESK_BUILT',[(p.name,p.stat().st_size) for p in OUT.glob('*.glb')])
    print('SOURCE',source)
