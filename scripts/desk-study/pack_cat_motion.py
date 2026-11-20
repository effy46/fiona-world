"""Extract generated animation cells, preserving original alpha and drawing.

Registration only: same pixel scale, fixed support-foot baseline, head-centre X.
No limb warping, repainting, synthesized in-betweens or silhouette keying.
"""
from pathlib import Path
import json
from PIL import Image
import numpy as np

root=Path(__file__).resolve().parents[2]
source=root/'assets/cat-motion/generated-sheet-v1.png'
out=root/'public/desk-study/cat-motion'
out.mkdir(parents=True,exist_ok=True)
sheet=Image.open(source).convert('RGBA')
walk_sheet=Image.open(root/'assets/cat-motion/generated-walk-stop-v3-arms.png').convert('RGBA')
w,h=sheet.size
assert w%4==0 and h%3==0
cw,ch=w//4,h//3
frames=[]
manifest=[]
for i in range(16):
    image=sheet if i<4 else walk_sheet
    j=i if i<4 else i-4
    sw,sh=image.width//4,image.height//3
    cell=image.crop((j%4*sw,j//4*sh,(j%4+1)*sw,(j//4+1)*sh))
    alpha=np.asarray(cell)[:,:,3]
    ys,xs=np.where(alpha>200)
    # Ignore translucent generated edge noise when measuring registration only.
    head=alpha[:int(ch*.43)]>200
    hx=np.where(head)[1].mean()
    dx=round(180-hx)
    dy=362-int(ys.max())
    frame=Image.new('RGBA',(384,384))
    frame.alpha_composite(cell,(dx,dy))
    frame.save(out/f'frame-{i:02d}.png')
    frames.append(frame)
    manifest.append({'frame':i,'source':'generated-sheet-v1.png' if i<4 else 'generated-walk-stop-v3-arms.png','source_cell':j,'shift':[dx,dy], 'source_bounds':[int(xs.min()),int(ys.min()),int(xs.max()),int(ys.max())]})
# Keep fixed shared cells for a fast browser/GIF preview; alpha is unmodified.
packed=Image.new('RGBA',(384*4,384*4))
for i,frame in enumerate(frames): packed.alpha_composite(frame,(i%4*384,i//4*384))
packed.save(out/'poses.png')
(root/'assets/cat-motion/registration.json').write_text(json.dumps({'sources':[str(source.relative_to(root)),'assets/cat-motion/generated-walk-stop-v3-arms.png'], 'cell':[384,384],'frames':manifest},indent=2)+'\n')
walk=[]
for frame in frames[4:12]:
    bg=Image.new('RGBA',frame.size,'#e8dfca');bg.alpha_composite(frame);walk.append(bg.convert('RGB'))
(root/'output/cat-motion-study').mkdir(parents=True,exist_ok=True)
walk[0].save(root/'output/cat-motion-study/walk-cycle.gif',save_all=True,append_images=walk[1:],duration=110,loop=0)
print(json.dumps({'frames':len(frames),'sheet':str(out/'poses.png'),'raw_size':[w,h]}))
