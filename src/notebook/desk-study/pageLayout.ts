import {publicLinks, isPendingHref} from '../../content/publicLinks';

export type PageSide = 'left' | 'right';
export const PAGE_SIZE = {width:1024, height:1536, worldWidth:3.168, worldHeight:4.58} as const;
export const PAGE_DISTANCE_FACTOR = PAGE_SIZE.worldWidth / PAGE_SIZE.width * 400;

export function pageToWorld(side:PageSide,x:number,y:number,height:number):[number,number,number]{
  return [(side==='left'?-3.18:.012)+x/PAGE_SIZE.width*PAGE_SIZE.worldWidth,height,y/PAGE_SIZE.height*PAGE_SIZE.worldHeight-2.29];
}

// Canvas artwork, projected controls and visit marks use the same page coordinates.
export const passportStamps = [
  {chapter:'start', label:'Start', x:280, y:689, border:'#65734d', ink:'#3f5938'},
  {chapter:'making', label:'Making', x:692, y:744, border:'#697b89', ink:'#36536b'},
  {chapter:'projects', label:'Projects', x:300, y:1060, border:'#65734d', ink:'#3f5938'},
  {chapter:'contact', label:'Contact', x:707, y:1104, border:'#9e6c55', ink:'#87452f'}
] as const;

export const contactLinks = [
  {label:'Email', ariaLabel:'Email Fiona', value:publicLinks.emailAddress, href:publicLinks.emailHref, y:780, color:'#ead9b7'},
  {label:'Résumé', ariaLabel:'Open résumé PDF', value:publicLinks.resumePdfReady?'Open PDF ↗':'PDF to be added', href:publicLinks.resumePdfReady?publicLinks.resumePdfHref:'', y:940, color:'#d9e3df'},
  {label:'GitHub', ariaLabel:'GitHub', value:isPendingHref(publicLinks.gitHubHref)?'Link to be added':'Code ↗', href:publicLinks.gitHubHref, y:1100, color:'#e5e5d3'},
  {label:'LinkedIn', ariaLabel:'LinkedIn', value:isPendingHref(publicLinks.linkedInHref)?'Link to be added':'Profile ↗', href:publicLinks.linkedInHref, y:1250, color:'#e8d9ce'}
] as const;
export const contactLinkBox = {x:104, width:816, height:124, targetOffsetY:64} as const;
