import {copyDocument,normalizeDocument,WhiteboardError} from '../index.js';
import {canonicalJson} from '@interactive-project/protocol/interoperability';
const bytes=v=>new TextEncoder().encode(canonicalJson(v)).byteLength;
const local=g=>{const c=Math.cos(g.rotation),s=Math.sin(g.rotation);return[c*g.scaleX,s*g.scaleX,-s*g.scaleY,c*g.scaleY,g.x,g.y];};
function flatten(parent,child){const a=local(parent),b=local(child),m=[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]],sx=Math.hypot(m[0],m[1]),sy=Math.hypot(m[2],m[3]);if(sx===0||sy===0||Math.abs(m[0]*m[2]+m[1]*m[3])>1e-10*sx*sy)throw new WhiteboardError('whiteboard.shear');return{...child,x:m[4],y:m[5],rotation:Math.atan2(m[1],m[0]),scaleX:sx,scaleY:sy};}
export function createEditingPorts({activity:input,validateDocument,deletionPolicy='cascade',historyEntries=32,historyBytes=1048576}){
 const initial=normalizeDocument(input,validateDocument);if(!['reject','cascade'].includes(deletionPolicy)||!Number.isSafeInteger(historyEntries)||historyEntries<1||historyEntries>32||!Number.isSafeInteger(historyBytes)||historyBytes<1024||historyBytes>1048576)throw new WhiteboardError('whiteboard.options');
 const policyKey=canonicalJson({deletionPolicy,historyEntries,historyBytes});let disposed=false;
 function pack(state){while(state.undo.length+state.redo.length>historyEntries||bytes([state.undo,state.redo])>historyBytes){if(state.undo.length)state.undo.shift();else state.redo.shift();}while(true){try{return copyDocument(state);}catch{if(state.undo.length)state.undo.shift();else if(state.redo.length)state.redo.shift();else throw new WhiteboardError('whiteboard.state');}}}
 function apply(document,op){
  if(!op||typeof op!=='object'||Array.isArray(op))throw new WhiteboardError('whiteboard.action');const keys=Object.keys(op).sort().join(','),find=id=>document.objects.find(o=>o.id===id);
  if(['insert','connect','draw'].includes(op.kind)){
   if(!['kind,object','index,kind,object'].includes(keys)||!op.object||op.kind==='connect'&&op.object.type!=='connector'||op.kind==='draw'&&op.object.type!=='freehand')throw new WhiteboardError('whiteboard.action');
   const index=op.index??document.objects.length;if(!Number.isSafeInteger(index)||index<0||index>document.objects.length)throw new WhiteboardError('whiteboard.action');document.objects.splice(index,0,op.object);return;
  }
  if(op.kind==='update'){const object=find(op.id);if(keys!=='changes,id,kind'||!object||!op.changes||Array.isArray(op.changes)||typeof op.changes!=='object'||Object.hasOwn(op.changes,'id')||Object.hasOwn(op.changes,'type'))throw new WhiteboardError('whiteboard.action');document.objects[document.objects.indexOf(object)]={...object,...op.changes};return;}
  if(op.kind==='extendStroke'){const object=find(op.id);if(keys!=='id,kind,points'||object?.type!=='freehand'||!Array.isArray(op.points)||op.points.length<1||op.points.length>128)throw new WhiteboardError('whiteboard.action');document.objects[document.objects.indexOf(object)]={...object,points:[...object.points,...op.points]};return;}
  if(op.kind==='delete'){
   if(keys!=='id,kind'||!find(op.id))throw new WhiteboardError('whiteboard.action');const removed=new Set([op.id]);
   if(deletionPolicy==='cascade'){let size;do{size=removed.size;for(const o of document.objects)if(removed.has(o.groupId))removed.add(o.id);}while(size!==removed.size);for(const o of document.objects)if(o.type==='connector'&&(removed.has(o.from.objectId)||removed.has(o.to.objectId)))removed.add(o.id);}
   document.objects=document.objects.filter(o=>!removed.has(o.id));return;
  }
  if(op.kind==='group'){
   if(keys!=='ids,kind,object'||op.object?.type!=='group'||!Array.isArray(op.ids)||op.ids.length<1||op.ids.length>128||new Set(op.ids).size!==op.ids.length)throw new WhiteboardError('whiteboard.action');const members=op.ids.map(find);if(members.some(o=>!o)||members.some(o=>o.groupId!==op.object.groupId))throw new WhiteboardError('whiteboard.action');
   const g=op.object.geometry;if(!g||g.x!==0||g.y!==0||g.rotation!==0||g.scaleX!==1||g.scaleY!==1)throw new WhiteboardError('whiteboard.groupTransform');
   const selected=new Set(op.ids),index=Math.min(...members.map(o=>document.objects.indexOf(o)));document.objects=document.objects.map(o=>selected.has(o.id)?{...o,groupId:op.object.id}:o);document.objects.splice(index,0,op.object);return;
  }
  if(op.kind==='ungroup'){
   const group=find(op.id);if(keys!=='id,kind'||group?.type!=='group')throw new WhiteboardError('whiteboard.action');
   document.objects=document.objects.map(o=>o.groupId===group.id?{...o,groupId:group.groupId,geometry:flatten(group.geometry,o.geometry)}:o).filter(o=>o.id!==group.id);
   if(deletionPolicy==='cascade')document.objects=document.objects.filter(o=>o.type!=='connector'||o.from.objectId!==group.id&&o.to.objectId!==group.id);return;
  }
  throw new WhiteboardError('whiteboard.action');
 }
 function reduce(state,action){try{
  if(disposed||state.stateVersion!=='1.0.0'||state.policyKey!==policyKey)throw new WhiteboardError('whiteboard.state');const kind=action.type?.replace(/^interactive-project\/whiteboard\./,''),next=JSON.parse(canonicalJson(state));
  if(kind==='undo'||kind==='redo'){if(!action.payload||Object.keys(action.payload).length)throw new WhiteboardError('whiteboard.action');const source=kind==='undo'?next.undo:next.redo,target=kind==='undo'?next.redo:next.undo;if(source.length===0)return{accepted:false};target.push(next.document);next.document=source.pop();return{accepted:true,state:pack(next)};}
  let operations;if(kind==='transaction'){if(!action.payload||Object.keys(action.payload).join(',')!=='operations'||!Array.isArray(action.payload.operations)||action.payload.operations.length<1||action.payload.operations.length>64)throw new WhiteboardError('whiteboard.action');operations=action.payload.operations;}else{if(!action.payload||Object.hasOwn(action.payload,'kind'))throw new WhiteboardError('whiteboard.action');operations=[{...action.payload,kind}];}
  for(const operation of operations)apply(next.document,operation);next.document=normalizeDocument(next.document,validateDocument);if(canonicalJson(next.document)===canonicalJson(state.document))return{accepted:false};next.undo.push(state.document);next.redo=[];return{accepted:true,state:pack(next)};
 }catch{return{accepted:false};}}
 return Object.freeze({initialState:spec=>{if(disposed||spec.type!=='interactive-project/whiteboard'||canonicalJson(spec.config)!==canonicalJson(initial))throw new WhiteboardError('whiteboard.activity');return pack({stateVersion:'1.0.0',policyKey,document:initial,undo:[],redo:[]});},reduce,evaluate:(_state,context,revision)=>({protocolVersion:'1.0.0',resultVersion:'1.0.0',activityId:context.identity.activityId,sessionId:context.identity.sessionId,...(context.identity.attemptId===undefined?{}:{attemptId:context.identity.attemptId}),revision,evidence:[],status:'unevaluable',reason:'unassessed'}),dispose(){disposed=true;}});
}
export function createGestureBuffer({maxOperations=64,maxBytes=65536}={}){
 if(!Number.isSafeInteger(maxOperations)||maxOperations<1||maxOperations>64||!Number.isSafeInteger(maxBytes)||maxBytes<1024||maxBytes>65536)throw new WhiteboardError('whiteboard.options');let active=null,disposed=false;
 return Object.freeze({begin(id){if(disposed||active||typeof id!=='string'||!/^[A-Za-z][A-Za-z0-9._-]{0,63}$/.test(id))throw new WhiteboardError('whiteboard.gesture');active={id,operations:[]};},append(input){if(disposed||!active)throw new WhiteboardError('whiteboard.gesture');const operation=copyDocument(input),next=[...active.operations,operation];if(next.length>maxOperations||bytes(next)>maxBytes)throw new WhiteboardError('whiteboard.gestureLimit');active.operations=next;},commit(){if(disposed||!active||active.operations.length===0)throw new WhiteboardError('whiteboard.gesture');const payload=copyDocument({operations:active.operations});active=null;return payload;},cancel(){active=null;},getPreview(){return active?copyDocument(active):null;},dispose(){disposed=true;active=null;}});
}
