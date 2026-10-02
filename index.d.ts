export type {Geometry,Style,Anchor,ObjectBase,BoardObject,BoardDocument} from './types/document.js';
import type {BoardDocument} from './types/document.js';
export class WhiteboardError extends Error {readonly code:string;constructor(code:string)}
export function copyDocument(input:unknown):unknown;
export function normalizeDocument(input:unknown,validateDocument:(input:unknown)=>{valid:boolean}):BoardDocument;
export function worldTransform(document:BoardDocument,objectId:string):readonly number[];
