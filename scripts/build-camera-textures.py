"""Rebuild the paper camera still-life's small, deterministic material maps."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import random

out = Path(__file__).resolve().parents[1] / 'public/desk-camera'
out.mkdir(exist_ok=True)
rng = random.Random(122)
font = '/System/Library/Fonts/Helvetica.ttc'
for name, base in [('kraft', (173,133,83)), ('leather', (49,46,40)), ('silver', (185,183,171)), ('book', (84,53,36))]:
    im = Image.new('RGB', (512,512))
    pixels = []
    for _ in range(512*512):
        n = rng.gauss(0, 6 if name != 'silver' else 9)
        pixels.append(tuple(max(0,min(255,int(v+n))) for v in base))
    im.putdata(pixels)
    d = ImageDraw.Draw(im)
    for _ in range(2000):
        x,y=rng.randrange(512),rng.randrange(512)
        c=tuple(max(0,v-15) for v in base)
        d.line((x,y,x+rng.randrange(1,7),y+1), fill=c)
    if name == 'book':
        for inset in [25,31,47]:
            d.rectangle((inset,inset,511-inset,511-inset),outline='#b99a59',width=3)
        d.ellipse((159,159,353,353),outline='#b99a59',width=4)
        d.ellipse((173,173,339,339),outline='#b99a59',width=2)
        d.text((256,244),'FIELD',font=ImageFont.truetype(font,24),anchor='mm',fill='#c3a36c')
        d.text((256,278),'NOTES',font=ImageFont.truetype(font,24),anchor='mm',fill='#c3a36c')
    im.save(out/f'{name}.png')
im=Image.new('RGB',(512,256),'#242723'); d=ImageDraw.Draw(im)
d.rectangle((0,0,512,49),fill='#dda931'); d.text((256,25),'35 mm COLOR PRINT',font=ImageFont.truetype(font,22),anchor='mm',fill='#27271f')
d.text((22,65),'200',font=ImageFont.truetype(font,105),fill='#f4ebd9'); d.text((290,100),'36 exp.',font=ImageFont.truetype(font,36),fill='#e6dcc6')
d.line((18,220,490,220),fill='#c4a56b',width=2); im.save(out/'film-label.png')
# Fine leather pores, satin metal and compact paper edges for the realistic revision.
from PIL import ImageFilter
for name, base in [('leather',(30,32,33)), ('silver',(206,210,212)), ('book',(69,39,25))]:
    w,h=(512,768) if name=='book' else (512,512)
    im=Image.new('RGB',(w,h)); values=[]
    for y in range(h):
        for x in range(w):
            n=rng.gauss(0,2.3 if name=='silver' else 4)
            values.append(tuple(max(0,min(255,int(c+n))) for c in base))
    im.putdata(values)
    if name=='book':
        d=ImageDraw.Draw(im)
        for inset in (28,35): d.rounded_rectangle((inset,inset,w-inset,h-inset),radius=5,outline='#98753c',width=2)
        d.text((w/2, h*.43),'FIELD NOTES',font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Times New Roman.ttf',31),anchor='mm',fill='#b39555')
        d.text((w/2, h*.50),'A TRAVEL JOURNAL',font=ImageFont.truetype(font,12),anchor='mm',fill='#a58a53')
        d.line((w*.34,h*.46,w*.66,h*.46),fill='#9b7c42',width=1)
    im.save(out/f'{name}.png')
im=Image.new('RGB',(512,512),'#ded5bb');d=ImageDraw.Draw(im)
for y in range(512):
    c=rng.choice([194,207,218,225,229,231])
    d.line((0,y,512,y),fill=(c,min(255,c+1),max(0,c-12)))
im.save(out/'pages.png')
im=Image.new('RGB',(1024,192),'#4b2c1e');d=ImageDraw.Draw(im)
for x in (90,108,916,934):
    d.line((x,7,x,185),fill='#b39351',width=5)
d.text((512,96),'FIELD NOTES  ·  VOL. I',font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Times New Roman.ttf',35),anchor='mm',fill='#b99b60')
im.save(out/'spine.png')
# One repeated photographic frame, printed into the film's own surface.
film_rng=random.Random(122)
im=Image.new('RGB',(256,256),'#a76628');d=ImageDraw.Draw(im)
d.rectangle((49,26,207,230),fill='#633a22')
d.rectangle((54,31,202,225),outline='#754527',width=2)
for y in range(256):
    for x in range(256):
        r,g,b=im.getpixel((x,y));n=film_rng.choice([-2,-1,0,0,1,2])
        im.putpixel((x,y),(max(0,r+n),max(0,g+n),max(0,b+n)))
im.save(out/'film-strip.png')
