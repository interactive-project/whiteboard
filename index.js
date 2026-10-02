import {computeMatrices} from './geometry.js';
import {copyGeneratedJson} from '@interactive-project/protocol/generation/json';
export class WhiteboardError extends Error{constructor(code){super('Whiteboard operation rejected.');this.name='WhiteboardError';this.code=code;}}
export function copyDocument(input){const r=copyGeneratedJson(input,{maxBytes:2097152,maxDepth:32,maxCollectionSize:1000,maxStringLength:100000,maxNodes:50000});if(!r.valid)throw new WhiteboardError('whiteboard.nonJson');return r.value;}
export function normalizeDocument(input,validateDocument){const document=copyDocument(input);let r;try{r=validateDocument(document);}catch{}if(r&&typeof r.then==='function'){Promise.resolve(r).catch(()=>{});throw new WhiteboardError('whiteboard.validator');}if(r?.valid!==true)throw new WhiteboardError('whiteboard.document');return document;}

export function worldTransform(input,objectId){try{const result=computeMatrices(copyDocument(input)).get(objectId);if(!result)throw new Error();return result;}catch{throw new WhiteboardError('whiteboard.transform');}}
