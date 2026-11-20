"""Original cotton-cardstock maps. No reference-image pixels are used."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parents[2] / 'assets/desk-study/paper'
OUT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(421)
size = 512


def noise(grid):
    image = Image.fromarray(rng.integers(0, 256, (grid, grid), dtype=np.uint8))
    return np.asarray(image.resize((size, size), Image.Resampling.BICUBIC), dtype=float)/255-.5


height = .5 + .23*noise(64) + .18*noise(160) + .08*noise(512)
fibers = Image.new('L', (size, size), 128)
draw = ImageDraw.Draw(fibers)
for _ in range(9500):
    x,y=rng.uniform(0,size,2)
    angle=rng.uniform(0,np.pi)
    length=rng.uniform(1.5,9)
    value=int(rng.choice([65,85,175,200]))
    # Wrapped copies keep individual fibers continuous at texture boundaries.
    for xx in (x-size,x,x+size):
        for yy in (y-size,y,y+size):
            draw.line((xx,yy,xx+np.cos(angle)*length,yy+np.sin(angle)*length),fill=value,width=1)
fibers=np.asarray(fibers.filter(ImageFilter.GaussianBlur(.42)),dtype=float)/255-.5
height=np.clip(height + fibers*.55,0,1)
dx=(np.roll(height,-1,axis=1)-np.roll(height,1,axis=1))*.5
dy=(np.roll(height,-1,axis=0)-np.roll(height,1,axis=0))*.5
normal=np.stack([-dx*7,-dy*7,np.ones_like(height)],axis=-1)
normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
Image.fromarray(np.uint8((normal*.5+.5)*255)).save(OUT/'cotton-normal.png')
Image.fromarray(np.uint8(np.clip(.89+height*.10,0,1)*255)).save(OUT/'cotton-roughness.png')

palette={
    'sage':'#a5b082', 'pine':'#416d60', 'blue':'#7daca8',
    'river':'#8fb7ba', 'snow':'#f2eddb', 'ochre':'#cdb37c',
    'meadow':'#c3c498', 'clay':'#c18755', 'light-pine':'#779970', 'backdrop':'#355e50',
    'ember':'#c7754c', 'flame':'#ebbb77', 'stone':'#b1b5a5',
}
for name,color in palette.items():
    rgb=np.array([int(color[i:i+2],16) for i in (1,3,5)],dtype=float)
    tooth=(1+(height-.5)*.24)[...,None]
    image=Image.fromarray(np.uint8(np.clip(rgb*tooth,0,255)))
    if name == 'backdrop':
        # Local printed contour marks, not a repeating surface pattern.
        mask=Image.new('L',(size,size),0)
        pen=ImageDraw.Draw(mask)
        for polygon in [((.09,.45),(.22,.26),(.34,.36),(.46,.16),(.54,.38),(.32,.53)),
                        ((.64,.30),(.77,.39),(.87,.58),(.69,.51))]:
            pen.polygon([(x*size,y*size) for x,y in polygon],fill=140)
        stripes=Image.new('L',(size,size),0)
        pen=ImageDraw.Draw(stripes)
        for x in range(-size,size*2,11):
            pen.line((x,0,x+size,size),fill=255,width=3)
        ink=np.minimum(np.asarray(mask),np.asarray(stripes))
        image=Image.composite(Image.new('RGB',(size,size),'#eee5c9'),image,Image.fromarray(ink))
    image.resize((256,256),Image.Resampling.LANCZOS).save(OUT/f'{name}.jpg',quality=93,subsampling=0,optimize=True)
    (OUT/f'{name}.png').unlink(missing_ok=True)
print(f'Wrote {len(palette)+2} cotton-cardstock maps to {OUT}')
