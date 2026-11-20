"""Prepare leather maps from the project's existing unlettered cover artwork."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

ROOT=Path(__file__).resolve().parents[2]
out=ROOT/'assets/desk-study/leather'
out.mkdir(parents=True,exist_ok=True)
source=Image.open(ROOT/'assets/desk-study/leather-cover-crop.png').convert('RGB')
w,h=source.size
color=source.crop((int(w*.20),int(h*.20),int(w*.80),int(h*.80))).resize((512,512),Image.Resampling.LANCZOS)
color.save(out/'cover-color.jpg',quality=91,subsampling=0,optimize=True)
gray=np.asarray(color.convert('L'),dtype=float)/255
low=np.asarray(color.convert('L').filter(ImageFilter.GaussianBlur(2.2)),dtype=float)/255
height=gray-low
dx=(np.roll(height,-1,axis=1)-np.roll(height,1,axis=1))*.5
dy=(np.roll(height,-1,axis=0)-np.roll(height,1,axis=0))*.5
normal=np.stack([-dx*5,dy*5,np.ones_like(height)],axis=-1)
normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
Image.fromarray(np.uint8((normal*.5+.5)*255)).save(out/'cover-normal.png')
Image.fromarray(np.uint8(np.clip(.75+height*.5,0,1)*255)).save(out/'cover-roughness.png')
print('Prepared leather albedo, normal and roughness maps')
