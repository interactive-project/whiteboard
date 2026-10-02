import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import ts from 'typescript';
import {normalizeDocument,worldTransform} from '../index.js';
import {validateDocument} from '../validation/index.js';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url))),clone=v=>JSON.parse(JSON.stringify(v)),board=read('fixtures/teaching.valid.json');
for(const file of readdirSync(new URL('../fixtures/',import.meta.url))){const r=validateDocument(read('fixtures/'+file));assert.equal(r.valid,file.includes('.valid.'),file+JSON.stringify(r));}
const a=normalizeDocument(board,validateDocument),b=normalizeDocument(clone(board),validateDocument);assert.deepEqual(a,b);assert(Object.isFrozen(a.objects[0].geometry));assert.equal(a.objects[9].activity.type,'interactive-project/quiz');assert.equal(a.objects[1].content.kind,'math');assert.equal(a.objects[2].content.asset.kind,'asset-ref');assert(!JSON.stringify(a).includes('viewport'));assert(!JSON.stringify(a).includes('solutions'));
const transform=clone(board);transform.objects[3].geometry.x=100;transform.objects[3].geometry.y=200;transform.objects[3].geometry.scaleX=2;transform.objects[3].geometry.scaleY=2;transform.objects[8].geometry.x=10;transform.objects[8].geometry.y=20;transform.objects[9].geometry.x=5;transform.objects[9].geometry.y=7;
assert(validateDocument(transform).valid);assert.deepEqual(worldTransform(transform,'quiz'),[2,0,0,2,130,254]);const rotated=clone(board);rotated.objects[0].geometry.rotation=Math.PI/2;const m=worldTransform(rotated,'lesson');assert(Math.abs(m[0])<1e-12);assert.equal(m[1],1);assert.equal(m[2],-1);assert(Math.abs(m[3])<1e-12);
const nonfinite=clone(board);nonfinite.objects[0].geometry.x=Infinity;assert(!validateDocument(nonfinite).valid);const getter={};Object.defineProperty(getter,'objects',{get(){throw Error('should not run')},enumerable:true});assert(!validateDocument(getter).valid);
const limit=clone(board);limit.objects=Array.from({length:1001},(_,i)=>({...clone(board.objects[0]),id:'n'+i}));assert(!validateDocument(limit).valid);
const points=clone(board);points.objects=Array.from({length:21},(_,i)=>({...clone(board.objects[7]),id:'stroke'+i,points:Array.from({length:1000},()=>({x:1,y:1,pressure:.5}))}));assert(!validateDocument(points).valid);
const overflow={...clone(board),objects:Array.from({length:8},(_,i)=>({...clone(board.objects[3]),id:'g'+i,groupId:i?'g'+(i-1):null,geometry:{...board.objects[3].geometry,scaleX:100,scaleY:100}}))};assert(!validateDocument(overflow).valid);
assert.throws(()=>normalizeDocument({...board,pointer:{x:1,y:1}},validateDocument));assert.throws(()=>worldTransform(board,'missing'));
const program=ts.createProgram([new URL('./type-consumer.mts',import.meta.url).pathname],{strict:true,noEmit:true,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext,lib:['lib.es2022.d.ts']});const diagnostics=ts.getPreEmitDiagnostics(program);assert.equal(diagnostics.length,0,diagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,'\n')).join('\n'));
console.log('Whiteboard document: teaching board rich content/formula/image/diagram/nested quiz, stable order and transforms, connector/group/geometry/content limits, frozen JSON and ephemeral state rejection passed.');
