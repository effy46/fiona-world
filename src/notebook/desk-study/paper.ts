import { publicAsset } from '../../lib/publicAsset';
import * as THREE from 'three';
import {PAGE_FONTS,PAGE_INK,PAGE_TYPE,PAGE_PRINT_OUTLINE,type PageTextRole,type PageTextRun} from './typography';
export type PageTexture=THREE.CanvasTexture&{userData:{clean:THREE.CanvasTexture;textRuns:PageTextRun[];[key:string]:unknown}};
import {publicLinks,isPendingHref} from '../../content/publicLinks';
import {passportStamps,contactLinks,contactLinkBox} from './pageLayout';

export const spreads = ['start','making','making-notes','projects','contact'] as const;
export type Spread = typeof spreads[number];
export const chapters = ['start','making','projects','contact'] as const;
export type Chapter = typeof chapters[number];
export const chapterOf = (spread:Spread):Chapter => spread==='making-notes'?'making':spread;
export type StampChapter = typeof passportStamps[number]['label'];

// Printed content remains independent of the Blender meshes. UV-mapped page
// surfaces can change typography without rebuilding or duplicating the model.
export async function makePages() {
  const fonts=await Promise.all(Object.values(PAGE_FONTS).map(font=>new FontFace(font.family,`url(${font.src})`).load()));
  fonts.forEach(font=>document.fonts.add(font));
  const images=await Promise.all([publicAsset('/desk-study/projects/pawpal-agent-actions.png'),publicAsset('/desk-study/making/early.jpg'),publicAsset('/desk-study/making/current.jpg')].map(async src=>{const image=new Image();image.src=src;await image.decode();return image;}));
  const [pawpal,early,current]=images;

  function page(spread: Spread, side: 'left' | 'right') {
    const canvas = document.createElement('canvas');
    const resolution = spread === 'start' || (spread === 'projects' && side === 'left') ? 2 : 1;
    canvas.width = 1024 * resolution;
    canvas.height = 1536 * resolution;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(resolution, resolution);
    ctx.fillStyle = '#f4edda';
    ctx.fillRect(0, 0, 1024, 1536);
    // Deterministic, irregular paper tooth; no grid that shimmers at a distance.
    let seed = 4321;
    for (let i = 0; i < 23000; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const x = (seed % 1024);
      seed = (seed * 1664525 + 1013904223) >>> 0;
      ctx.fillStyle = i % 3 ? '#806f4a07' : '#ffffff45';
      ctx.fillRect(x, seed % 1536, 1.5, 1.5);
    }
    const line = (x: number, y: number, w: number, color = '#91826770') => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, 1.5);
    };
    const textRuns:PageTextRun[]=[];
    const text=(copy:string,x:number,y:number,role:PageTextRole='body',color:string=PAGE_INK.text,hideWhenCollected=false)=>{
      const style=PAGE_TYPE[role],matrix=ctx.getTransform();
      ctx.font=`${style.size}px ${PAGE_FONTS[style.font].family}`;ctx.fillStyle=color;
      textRuns.push({copy,x:(matrix.a*x+matrix.c*y+matrix.e)/resolution,y:(matrix.b*x+matrix.d*y+matrix.f)/resolution,
        size:style.size*Math.hypot(matrix.c,matrix.d)/resolution,role,color,center:ctx.textAlign==='center',angle:-Math.atan2(matrix.b,matrix.a),hideWhenCollected});
    };
    const stamp = (x: number, y: number, label: StampChapter, color: string) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-.07);
      ctx.scale(1.18,1.18);
      ctx.strokeStyle = color;
      ctx.lineWidth = 4.5;
      ctx.globalAlpha = .96;
      ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.arc(0, 0, 115, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(0, 0, 105, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a)*109, Math.sin(a)*109);
        ctx.lineTo(Math.cos(a)*113, Math.sin(a)*113);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';
      const labelInk = label === 'Making' ? PAGE_INK.making : label === 'Contact' ? PAGE_INK.contact : PAGE_INK.sage;
      text(label,0,172,'stampLabel',labelInk);
      {
        // Legible outline motifs distinguish empty slots without fading away.
        ctx.save();
        ctx.scale(1.40, 1.40);
        ctx.globalAlpha = 1;
        const motifInk = label === 'Making' ? '#36536b' : label === 'Contact' ? '#87452f' : '#3f5938';
        ctx.strokeStyle = motifInk;
        ctx.lineWidth = 5.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.fillStyle = motifInk;
        if (label === 'Start') {
          for (const [x,y,angle] of [[-41,-16,-.45],[-16,-44,-.15],[16,-44,.15],[41,-16,.45]]) {
            ctx.beginPath();ctx.ellipse(x,y,12,17,angle,0,Math.PI*2);ctx.stroke();
          }
          ctx.beginPath();ctx.moveTo(0,-5);
          ctx.bezierCurveTo(-12,-5,-15,4,-23,12);
          ctx.bezierCurveTo(-38,25,-33,43,-18,42);
          ctx.bezierCurveTo(-8,39,8,39,18,42);
          ctx.bezierCurveTo(33,43,38,25,23,12);
          ctx.bezierCurveTo(15,4,12,-5,0,-5);ctx.closePath();ctx.stroke();
        } else if (label === 'Making') {
          ctx.strokeRect(-25, -56, 50, 47);
          for (let y = -43; y < -19; y += 10) {
            ctx.beginPath(); ctx.moveTo(-14, y); ctx.lineTo(12, y); ctx.stroke();
          }
          ctx.beginPath(); ctx.moveTo(-42,-9); ctx.lineTo(42,-9); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-37,-3); ctx.lineTo(37,-3); ctx.lineTo(49,43); ctx.lineTo(-49,43); ctx.closePath(); ctx.stroke();
          ctx.strokeRect(-31,10,62,24);
          for (let row = 0; row < 2; row++) for (let key = 0; key < 6; key++) {
            ctx.beginPath(); ctx.arc(-23+key*9,18+row*9,1.7,0,Math.PI*2); ctx.fill();
          }
          ctx.beginPath(); ctx.moveTo(-16,48); ctx.lineTo(16,48); ctx.stroke();
        } else if (label === 'Projects') {
          ctx.strokeRect(-39,-51,78,98);
          ctx.strokeRect(-29,-41,58,59);
          ctx.beginPath(); ctx.moveTo(-28,9); ctx.lineTo(-9,-13); ctx.lineTo(5,3); ctx.lineTo(16,-10); ctx.lineTo(29,8); ctx.stroke();
          ctx.beginPath(); ctx.arc(15,-27,5,0,Math.PI*2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-13,33); ctx.lineTo(13,33); ctx.stroke();
        } else if (label === 'Contact') {
          ctx.strokeRect(-49,-30,98,67);
          ctx.beginPath(); ctx.moveTo(-49,-30); ctx.lineTo(0,6); ctx.lineTo(49,-30); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-49,37); ctx.lineTo(-17,9); ctx.moveTo(49,37); ctx.lineTo(17,9); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0,-17);
          ctx.bezierCurveTo(-12,-29,-19,-11,0,0);
          ctx.bezierCurveTo(19,-11,12,-29,0,-17); ctx.stroke();
        }
        ctx.restore();
      }
      // Small missing flecks sit within the impression; labels/fonts stay intact.
      let fleck = label.length * 199;
      ctx.fillStyle = '#f4edda';
      ctx.globalAlpha = .45;
      for (let i = 0; i < 170; i++) {
        fleck = (fleck * 1664525 + 1013904223) >>> 0;
        const px = (fleck % 230) - 115;
        fleck = (fleck * 1664525 + 1013904223) >>> 0;
        const py = (fleck % 230) - 115;
        if (px*px+py*py < 117*117) ctx.fillRect(px,py,1.2,1.4);
      }
      ctx.restore();
    };

    const tape=(x:number,y:number,w:number,color:string)=>{
      ctx.save();ctx.translate(x,y);ctx.rotate(-.07);ctx.fillStyle=color;ctx.globalAlpha=.86;ctx.fillRect(-w/2,-19,w,38);ctx.restore();
    };
    const photo=(image:HTMLImageElement,x:number,y:number,w:number,h:number,angle=0)=>{
      ctx.save();ctx.translate(x+w/2,y+h/2);ctx.rotate(angle);
      ctx.shadowColor='#51412b28';ctx.shadowBlur=12;ctx.shadowOffsetY=7;ctx.fillStyle='#fffaee';ctx.fillRect(-w/2,-h/2,w,h);ctx.shadowColor='transparent';
      const scale=Math.min((w-36)/image.width,(h-70)/image.height);
      ctx.drawImage(image,-image.width*scale/2,-h/2+17,image.width*scale,image.height*scale);ctx.restore();
      tape(x+w*.5,y+3,w*.28,'#b9c4a8');
    };
    const footerScene=(title:string,caption:string)=>{text(title,104,1320,'sceneTitle');text(caption,104,1375,'body',PAGE_INK.muted);};
    if(!(spread==='start'&&side==='right')&&!((spread==='making'||spread==='contact')&&side==='left')){
      text('FIONA FENG',104,117,'eyebrow');line(104,146,816);
    }
    if(spread==='start'&&side==='left'){
      text('Traveler’s',104,283,'title');text('passport.',104,376,'title');
      text('For the small, good things.',110,453,'subtitle',PAGE_INK.muted);
      passportStamps.forEach(({x,y,label,border})=>stamp(x,y,label,border));
      ctx.strokeStyle='#8d8b6a88';ctx.lineWidth=2;ctx.setLineDash([5,10]);ctx.beginPath();ctx.moveTo(397,690);ctx.bezierCurveTo(570,570,640,850,514,927);ctx.bezierCurveTo(420,1030,520,1110,590,1104);ctx.stroke();ctx.setLineDash([]);
      text('Every stamp is a tiny yes.',104,1363,'body');
    }else if(spread==='start'){
      text('Somewhere between pages.',104,1342,'sceneTitle');
      text('Click around to explore.',104,1397,'body',PAGE_INK.muted);
    }else if(spread==='making'&&side==='left'){
      text('Desert Detour',104,1342,'sceneTitle');text('A good place to pull over.',104,1397,'body',PAGE_INK.muted);
    }else if(spread==='contact'&&side==='left'){
      footerScene('Slow Post Station','Post a note from the mailbox by the spine.');
    }else if(spread==='making'){
      text('Making this',104,280,'title');text('notebook.',104,375,'title');text('References → Build together → Refine',110,447,'subtitle',PAGE_INK.making);
      const steps=[['References','Desk photos and paper-craft references.','Explore the look through prototypes.'],['Build together','Created with AI, Blender and Three.js.','Connect the notebook, scenes and cat.'],['Refine','Review screenshots and test in-browser.','Adjust the paper, movement and details.']];
      ctx.strokeStyle='#8293a480';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(154,570);ctx.lineTo(154,1210);ctx.stroke();
      steps.forEach(([title,a,b],i)=>{const y=600+i*265,ink=[PAGE_INK.making,PAGE_INK.sage,PAGE_INK.contact][i];ctx.fillStyle=['#dde6e9','#e2e6d7','#edddd0'][i];ctx.strokeStyle=ink+'66';ctx.beginPath();ctx.arc(154,y-13,35,0,Math.PI*2);ctx.fill();ctx.stroke();text(String(i+1).padStart(2,'0'),131,y-3,'stepNumber',ink);text(title,230,y,'section',ink);text(a,230,y+72,'body');text(b,230,y+125,'body');});
      tape(500,1352,790,'#d5dfe1');text('Process notes · layouts & before / after →',140,1366,'caption',PAGE_INK.making);
    }else if(spread==='making-notes'&&side==='left'){
      text('Layout overview',104,280,'title');text('How the notebook is arranged.',104,365,'subtitle',PAGE_INK.making);
      ctx.strokeStyle='#627b84';ctx.lineWidth=4;ctx.save();ctx.translate(125,480);ctx.rotate(-.025);ctx.strokeRect(0,0,770,570);ctx.strokeRect(70,60,300,430);ctx.strokeRect(385,60,300,430);ctx.beginPath();ctx.moveTo(377,45);ctx.lineTo(377,515);ctx.stroke();
      text('passport',108,290,'caption',PAGE_INK.making);text('paper world',414,290,'caption',PAGE_INK.making);ctx.beginPath();ctx.moveTo(430,225);ctx.lineTo(515,100);ctx.lineTo(605,225);ctx.closePath();ctx.stroke();ctx.restore();
      text('01 / One shared desk',104,1150,'body');text('02 / A book that opens and turns',104,1225,'body');text('03 / A different paper scene on each spread',104,1300,'body');
    }else if(spread==='making-notes'){
      text('Before / after',104,280,'title');text('From the early study to folded paper.',104,360,'subtitle',PAGE_INK.making);
      photo(early,108,435,800,390,-.02);text('Early scene study',130,875,'caption',PAGE_INK.making);
      photo(current,108,940,800,390,.018);text('Current paper model',130,1380,'caption',PAGE_INK.making);
    }else if(spread==='projects'&&side==='left'){
      text('PawPal',104,280,'title');text('A small companion for the desktop.',104,370,'subtitle',PAGE_INK.sage);
      photo(pawpal,104,475,816,510,-.025);tape(710,975,260,'#e6d1a6');
      [
        'A desktop pet for macOS and Windows.',
        'AI agent updates in little thought bubbles.',
        'Gentle nudges for water, breaks and focus.',
        'Meeting reminders, plus a monthly journal',
        'to track your water and break habits.',
      ].forEach((copy,index)=>text(copy,104,1060+index*58,'body',PAGE_INK.sage));
      text(isPendingHref(publicLinks.pawPalHref)?'Project link · to be added':'Open PawPal →',104,1370,'caption',PAGE_INK.sage);
    }else if(spread==='projects'){
      text('Next project',104,280,'title');text('Personal projects & experiments',104,375,'subtitle',PAGE_INK.sage);
      ctx.save();ctx.translate(510,845);ctx.rotate(.055);ctx.strokeStyle='#9ca68a';ctx.lineWidth=3;ctx.setLineDash([8,12]);ctx.strokeRect(-300,-290,600,540);ctx.setLineDash([]);ctx.restore();tape(500,555,220,'#c8d1b8');
      text('Space for the next project.',185,1270,'body',PAGE_INK.sage);
    }else{
      text('Hello,',104,280,'title');text('I’m Fiona.',104,377,'title');
      tape(320,535,430,'#e2c3ad');text('Collect postmark →',125,550,'body',PAGE_INK.contact,true);
      text('I work with data and build small tools.',104,665,'body');text('This notebook is one of my experiments.',104,717,'body');
      contactLinks.forEach(({label,value,y,color})=>{ctx.fillStyle=color;ctx.fillRect(contactLinkBox.x,y,contactLinkBox.width,contactLinkBox.height);text(label,128,y+39,'eyebrow',PAGE_INK.muted);text(value,128,y+88,'body',value==='Link to be added'?PAGE_INK.pending:PAGE_INK.text);});
    }
    line(104,1430,816);
    text(side==='left'?'FIONA’S LITTLE WORLD':spread==='making-notes'?'02 / PROCESS NOTES':`${String(chapters.indexOf(chapterOf(spread))+1).padStart(2,'0')} / ${chapterOf(spread).toUpperCase()}`,104,1474,'footer');
    const printed=document.createElement('canvas');printed.width=canvas.width;printed.height=canvas.height;
    const print=printed.getContext('2d')!;print.scale(resolution,resolution);
    for(const run of textRuns){
      print.save();print.translate(run.x,run.y);print.rotate(-run.angle);print.textAlign=run.center?'center':'left';
      print.font=`${run.size}px ${PAGE_FONTS[PAGE_TYPE[run.role].font].family}`;print.fillStyle=run.color;print.fillText(run.copy,0,0);
      print.strokeStyle=run.color;print.lineWidth=PAGE_PRINT_OUTLINE*2*1536/4.58;print.strokeText(run.copy,0,0);print.restore();
    }
    const clean=new THREE.CanvasTexture(canvas),texture=new THREE.CanvasTexture(printed) as PageTexture;
    for(const map of [clean,texture]){map.colorSpace=THREE.SRGBColorSpace;map.flipY=false;map.anisotropy=16;}
    texture.userData.clean=clean;texture.userData.textRuns=textRuns;
    return texture;
  }

  const pages=Object.fromEntries(spreads.map(spread=>[spread,{left:page(spread,'left'),right:page(spread,'right')}])) as Record<Spread,{left:PageTexture;right:PageTexture}>;
  impressVisit(pages,'start');
  return pages;
}
export type Pages=Awaited<ReturnType<typeof makePages>>;
export function impressVisit(pages:Pages,chapter:Chapter){
  for (const texture of [pages.start.left,pages.start.left.userData.clean]) {
  if(texture.userData[chapter])continue;
  const {x,y,ink:color}=passportStamps.find(stamp=>stamp.chapter===chapter)!;
  const ctx=(texture.image as HTMLCanvasElement).getContext('2d')!;ctx.save();ctx.translate(x,y);ctx.rotate(-.07);ctx.scale(1.18,1.18);ctx.fillStyle=color;ctx.fillRect(-76,67,152,30);ctx.fillStyle='#f4edda';ctx.font=`${PAGE_TYPE.stampImpression.size}px ${PAGE_FONTS.hand.family}`;ctx.textAlign='center';ctx.fillText('VISITED',0,90);ctx.restore();texture.userData[chapter]=true;texture.needsUpdate=true;
  }
}
export function impressPostmark(pages:Pages,kind:'station'|'balloon'){
  for(const texture of kind==='station'?[pages.contact.right,pages.contact.right.userData.clean]:[pages.making.left,pages.making.left.userData.clean]) {
  if(texture.userData.collected)continue;
  const ctx=(texture.image as HTMLCanvasElement).getContext('2d')!;
  ctx.save();ctx.translate(kind==='station'?320:760,kind==='station'?535:1250);ctx.rotate(-.1);ctx.fillStyle=kind==='station'?'#e2c3ad':'#f4edda';ctx.fillRect(-215,-53,430,106);ctx.strokeStyle=kind==='station'?'#87452f':'#65734d';ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=4;ctx.strokeRect(-180,-37,360,74);ctx.font=`${PAGE_TYPE.caption.size}px ${PAGE_FONTS.hand.family}`;ctx.textAlign='center';ctx.fillText(kind==='station'?'POSTED':'AIRMAIL RECEIVED',0,12);ctx.restore();texture.userData.collected=true;texture.needsUpdate=true;
  }
}
