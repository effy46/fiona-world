import { publicAsset } from '../../lib/publicAsset';
export const PAGE_FONTS={
  serif:{family:'StudyLora',src:publicAsset('/fonts/Lora-Regular.ttf')},
  hand:{family:'StudyHand',src:publicAsset('/fonts/PatrickHand-Regular.ttf')},
} as const;
export const PAGE_INK={text:'#302c22',muted:'#3b422d',making:'#29485f',sage:'#34452c',contact:'#78351f',pending:'#5f6454'} as const;
export const COVER_TYPE={title:.46,eyebrow:36,subtitle:41,footer:31,ink:'#ffe7af',outline:.0035} as const;
export const PAGE_OUTLINE=.0008;
// Raster glyphs need slightly more edge coverage to match SDF when the page tilts.
export const PAGE_PRINT_OUTLINE=PAGE_OUTLINE*2;
// Shared by live text and the printed artwork carried by turning pages.
export const PAGE_TYPE={
  title:{font:'serif',size:82},
  section:{font:'serif',size:54},
  sceneTitle:{font:'serif',size:48},
  subtitle:{font:'hand',size:42},
  body:{font:'hand',size:40},
  caption:{font:'hand',size:35},
  eyebrow:{font:'serif',size:26},
  footer:{font:'serif',size:24},
  stepNumber:{font:'hand',size:32},
  stampLabel:{font:'hand',size:52},
  stampImpression:{font:'hand',size:21},
} as const;
export type PageTextRole=keyof typeof PAGE_TYPE;
export type PageTextRun={copy:string;x:number;y:number;size:number;role:PageTextRole;color:string;center:boolean;angle:number;hideWhenCollected:boolean};
