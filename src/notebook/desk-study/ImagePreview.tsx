import {useEffect,useRef} from 'react';
import {publicAsset} from '../../lib/publicAsset';

export function ImagePreview({onClose}:{onClose:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    const trigger=document.activeElement as HTMLElement|null;
    dialog.current?.showModal();
    return()=>trigger?.focus({preventScroll:true});
  },[]);
  return <dialog ref={dialog} className="study-image-preview" aria-label="PawPal image preview"
    onCancel={event=>{event.preventDefault();onClose();}}
    onKeyDown={event=>event.stopPropagation()} onWheel={event=>event.stopPropagation()}
    onClick={event=>{if(event.target===event.currentTarget)onClose();}}>
    <img src={publicAsset('/desk-study/projects/pawpal-agent-actions.png')} alt="PawPal agent activity and bubble actions"/>
    <button type="button" aria-label="Close image preview" onClick={onClose}>×</button>
  </dialog>;
}
