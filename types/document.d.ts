import type {ContentNode} from '@interactive-project/content-node';
import type {ActivitySpec} from '@interactive-project/protocol/types';
export interface Geometry {readonly x:number;readonly y:number;readonly width:number;readonly height:number;readonly rotation:number;readonly scaleX:number;readonly scaleY:number}
export interface Style {readonly stroke:string;readonly fill:string;readonly strokeWidth:number;readonly opacity:number}
export interface Anchor {readonly objectId:string|null;readonly x:number;readonly y:number}
export interface ObjectBase {readonly id:string;readonly groupId:string|null;readonly geometry:Geometry}
export type BoardObject=ObjectBase & (
 {readonly type:'shape';readonly shape:'rectangle'|'ellipse'|'diamond';readonly style:Style}|
 {readonly type:'text'|'image'|'formula';readonly content:ContentNode}|
 {readonly type:'connector';readonly from:Anchor;readonly to:Anchor;readonly directed:boolean;readonly style:Style}|
 {readonly type:'freehand';readonly points:readonly {readonly x:number;readonly y:number;readonly pressure:number}[];readonly style:Style}|
 {readonly type:'group'}|
 {readonly type:'activity';readonly activity:ActivitySpec});
export interface BoardDocument {readonly documentVersion:'1.0.0';readonly id:string;readonly units:'css-px';readonly objects:readonly BoardObject[]}
