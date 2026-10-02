import type {BoardDocument} from '../types/document.js';
import type {StatePorts} from '@interactive-project/core';
export function createEditingPorts(options:{activity:BoardDocument;validateDocument:(input:unknown)=>{valid:boolean};deletionPolicy?:'reject'|'cascade';historyEntries?:number;historyBytes?:number}):StatePorts;
export function createGestureBuffer(options?:{maxOperations?:number;maxBytes?:number}):{begin(id:string):void;append(operation:unknown):void;commit():unknown;cancel():void;getPreview():unknown;dispose():void};
