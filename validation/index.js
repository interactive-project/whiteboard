import {computeMatrices} from '../geometry.js';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {validateContent} from '@interactive-project/content-node/validation';
import {validateActivitySpec} from '@interactive-project/protocol/validation';
import {copyDocument} from '../index.js';
const require=createRequire(import.meta.url),ajv=new Ajv2020({strict:true,allErrors:true,ownProperties:true});addFormats(ajv);
for(const name of ['@interactive-project/protocol/schemas/shared-content.v1.schema.json','@interactive-project/content-node/schemas/content-node.v1.schema.json','@interactive-project/protocol/schemas/activity-spec.v1.schema.json'])ajv.addSchema(JSON.parse(readFileSync(require.resolve(name))));
const schema=ajv.compile(JSON.parse(readFileSync(new URL('../schemas/document.v1.schema.json',import.meta.url))));
const error=(code,path)=>({code,path,severity:'error',message:'The whiteboard document violates its portable contract.'});
export function validateDocument(input){
 let document;try{document=copyDocument(input);}catch{return{valid:false,diagnostics:[error('whiteboard.nonJson','')]};}
 if(!schema(document))return{valid:false,diagnostics:[error('whiteboard.schema','')]};
 const diagnostics=[],ids=new Set(),objects=new Map(document.objects.map(o=>[o.id,o]));let pointCount=0;
 document.objects.forEach((o,i)=>{const p='/objects/'+i;if(ids.has(o.id))diagnostics.push(error('whiteboard.duplicateId',p+'/id'));ids.add(o.id);
  if(o.groupId!==null&&objects.get(o.groupId)?.type!=='group')diagnostics.push(error('whiteboard.group',p+'/groupId'));
  let parent=o.groupId;const seen=new Set([o.id]);while(parent!==null&&objects.has(parent)){if(seen.has(parent)){diagnostics.push(error('whiteboard.groupCycle',p+'/groupId'));break;}seen.add(parent);parent=objects.get(parent).groupId;}
  if(['text','image','formula'].includes(o.type)){const r=validateContent(o.content);if(!r.valid)diagnostics.push(...r.diagnostics.map(d=>({...d,path:p+'/content'+d.path})));if(o.type==='image'&&o.content.kind!=='image'||o.type==='formula'&&o.content.kind!=='math')diagnostics.push(error('whiteboard.contentKind',p+'/content/kind'));}
  if(o.type==='connector')for(const side of ['from','to']){const ref=o[side].objectId;if(ref!==null&&(!objects.has(ref)||objects.get(ref).type==='connector'))diagnostics.push(error('whiteboard.connector',p+'/'+side+'/objectId'));}
  if(o.type==='freehand'){pointCount+=o.points.length;o.points.forEach((v,j)=>{if(v.x>o.geometry.width||v.y>o.geometry.height)diagnostics.push(error('whiteboard.pointBounds',p+'/points/'+j));});}
  if(o.type==='activity'){if(!validateActivitySpec(o.activity).valid)diagnostics.push(error('whiteboard.activity',p+'/activity'));if(o.activity.type==='interactive-project/whiteboard')diagnostics.push(error('whiteboard.recursiveActivity',p+'/activity/type'));}
 });
 try{computeMatrices(document);}catch{diagnostics.push(error('whiteboard.transform','/objects'));}
 if(pointCount>20000)diagnostics.push(error('whiteboard.pointLimit','/objects'));
 return diagnostics.length?{valid:false,diagnostics}:{valid:true,diagnostics:[]};
}
