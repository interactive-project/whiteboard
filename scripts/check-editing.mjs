import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createEditingPorts,createGestureBuffer} from '../editing/index.js';
import {worldTransform} from '../index.js';
import {validateDocument} from '../validation/index.js';
import {createRuntime} from '@interactive-project/core';
import {validateActivitySpec} from '@interactive-project/protocol/validation';
import {validateAction,validateResult} from '@interactive-project/protocol/validation/interoperability';
import {validateEvent} from '@interactive-project/events/validation';
const board=JSON.parse(readFileSync(new URL('../fixtures/teaching.valid.json',import.meta.url))),clone=v=>JSON.parse(JSON.stringify(v)),uuid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');let event=100,actionId=200;
function runtime(options={}){
 const r=createRuntime({activity:{protocolVersion:'1.0.0',id:uuid(1),type:'interactive-project/whiteboard',activitySchemaVersion:'1.0.0',metadata:{title:'Board'},config:board},sessionId:uuid(2),sourceId:uuid(4),engineId:'interactive-project/whiteboard',engineStateVersion:'1.0.0',clock:()=>0,random:()=>0,nextEventId:()=>uuid(event++),validators:{activity:validateActivitySpec,action:validateAction,result:validateResult,event:validateEvent},ports:createEditingPorts({activity:board,validateDocument,...options})});r.start();
 const dispatch=(kind,payload={})=>r.dispatch({protocolVersion:'1.0.0',actionVersion:'1.0.0',id:uuid(actionId++),activityId:uuid(1),sessionId:uuid(2),sequence:r.getState().revision,type:'interactive-project/whiteboard.'+kind,payload});return{r,dispatch,document:()=>r.getState().state.document};
}
{
 const {r,dispatch,document}=runtime(),initial=clone(document());assert.equal(dispatch('delete',{id:'diagramGroup'}).status,'accepted');assert.deepEqual(document().objects.map(o=>o.id),['lesson','equation','illustration','stroke']);assert.equal(dispatch('undo').status,'accepted');assert.deepEqual(document(),initial);assert.equal(dispatch('redo').status,'accepted');assert.equal(dispatch('undo').status,'accepted');assert.deepEqual(document().objects.map(o=>o.id),board.objects.map(o=>o.id));assert.equal(dispatch('undo').status,'rejected');r.dispose();
}
{
 const {r,dispatch,document}=runtime({deletionPolicy:'reject'}),before=r.getState();assert.equal(dispatch('delete',{id:'componentA'}).status,'rejected');assert.equal(r.getState(),before);assert.equal(dispatch('transaction',{operations:[{kind:'delete',id:'componentA'},{kind:'delete',id:'link'}]}).status,'accepted');assert.equal(dispatch('undo').status,'accepted');assert.deepEqual(document(),board);r.dispose();
}
{
 const {r,dispatch,document}=runtime(),before=r.getState();assert.equal(dispatch('transaction',{operations:[{kind:'update',id:'lesson',changes:{geometry:{...board.objects[0].geometry,x:50}}},{kind:'delete',id:'missing'}]}).status,'rejected');assert.equal(r.getState(),before);assert.equal(dispatch('update',{id:'lesson',changes:{id:'changed'}}).status,'rejected');assert.equal(dispatch('update',{id:'lesson',changes:{geometry:board.objects[0].geometry}}).status,'rejected');assert.equal(r.getState(),before);assert.equal(dispatch('selection',{ids:['lesson']}).status,'rejected');assert.equal(dispatch('viewport',{zoom:2}).status,'rejected');
 const g=createGestureBuffer();g.begin('move');g.append({kind:'update',id:'lesson',changes:{geometry:{...board.objects[0].geometry,x:50}}});assert.equal(r.getState(),before);g.cancel();assert.equal(g.getPreview(),null);assert.equal(r.getState(),before);g.begin('move2');g.append({kind:'update',id:'lesson',changes:{geometry:{...board.objects[0].geometry,x:50}}});g.append({kind:'update',id:'equation',changes:{geometry:{...board.objects[1].geometry,y:20}}});assert.equal(dispatch('transaction',g.commit()).status,'accepted');assert.equal(r.getState().state.undo.length,1);assert.equal(document().objects[0].geometry.x,50);assert.equal(dispatch('undo').status,'accepted');assert.deepEqual(document(),board);g.dispose();assert.throws(()=>g.begin('late'));r.dispose();
}
{
 const {r,dispatch,document}=runtime(),group={...clone(board.objects[3]),id:'newGroup',groupId:null};assert.equal(dispatch('group',{object:group,ids:['lesson','equation']}).status,'accepted');assert.equal(document().objects.find(o=>o.id==='lesson').groupId,'newGroup');assert.equal(dispatch('group',{object:group,ids:['lesson']}).status,'rejected');
 assert.equal(dispatch('update',{id:'newGroup',changes:{geometry:{...group.geometry,x:10,y:20,scaleX:2,scaleY:2}}}).status,'accepted');const before=worldTransform(document(),'lesson');assert.equal(dispatch('ungroup',{id:'newGroup'}).status,'accepted');assert.deepEqual(worldTransform(document(),'lesson'),before);assert.equal(document().objects.find(o=>o.id==='lesson').groupId,null);assert.equal(dispatch('undo').status,'accepted');assert.equal(document().objects.find(o=>o.id==='lesson').groupId,'newGroup');r.dispose();
}
{
 const {r,dispatch,document}=runtime(),stroke={...clone(board.objects[7]),id:'newStroke'};assert.equal(dispatch('draw',{object:stroke}).status,'accepted');assert.equal(dispatch('extendStroke',{id:'newStroke',points:[{x:50,y:50,pressure:.5}]}).status,'accepted');assert.equal(document().objects.find(o=>o.id==='newStroke').points.length,3);const before=r.getState();assert.equal(dispatch('extendStroke',{id:'newStroke',points:Array.from({length:129},()=>({x:1,y:1,pressure:.5}))}).status,'rejected');assert.equal(r.getState(),before);assert.equal(dispatch('draw',{object:stroke}).status,'rejected');assert.equal(dispatch('connect',{object:{...clone(board.objects[6]),id:'newLink'}}).status,'accepted');assert.equal(dispatch('insert',{object:{...clone(board.objects[0]),id:'newText'},index:0}).status,'accepted');assert.equal(document().objects[0].id,'newText');r.dispose();
}
{
 const {r,dispatch}=runtime({historyEntries:2});for(let i=1;i<=4;i++)assert.equal(dispatch('update',{id:'lesson',changes:{geometry:{...board.objects[0].geometry,x:i}}}).status,'accepted');assert.equal(r.getState().state.undo.length,2);assert.equal(dispatch('undo').status,'accepted');assert.equal(dispatch('undo').status,'accepted');assert.equal(dispatch('undo').status,'rejected');assert.equal(dispatch('update',{id:'lesson',changes:{geometry:{...board.objects[0].geometry,x:99}}}).status,'accepted');assert.equal(dispatch('redo').status,'rejected');assert.equal(r.evaluate().status,'unevaluable');r.dispose();
 const tiny=runtime({historyBytes:1024});assert.equal(tiny.dispatch('update',{id:'lesson',changes:{geometry:{...board.objects[0].geometry,x:10}}}).status,'accepted');assert.equal(tiny.r.getState().state.undo.length,0);tiny.r.dispose();
 const buffer=createGestureBuffer({maxOperations:1});buffer.begin('drawing');buffer.append({kind:'delete',id:'lesson'});assert.throws(()=>buffer.append({kind:'delete',id:'equation'}));assert.equal(buffer.getPreview().operations.length,1);buffer.cancel();buffer.dispose();
}
{
 const {r,dispatch}=runtime(),group={...clone(board.objects[3]),id:'shearGroup',groupId:null};assert.equal(dispatch('group',{object:group,ids:['lesson']}).status,'accepted');assert.equal(dispatch('update',{id:'shearGroup',changes:{geometry:{...group.geometry,scaleX:2}}}).status,'accepted');assert.equal(dispatch('update',{id:'lesson',changes:{geometry:{...board.objects[0].geometry,rotation:Math.PI/4}}}).status,'accepted');const before=r.getState();assert.equal(dispatch('ungroup',{id:'shearGroup'}).status,'rejected');assert.equal(r.getState(),before);r.dispose();
}
console.log('Whiteboard editing: actual Core atomic transactions, cascade/reject deletion, stable IDs on undo/redo, grouping transforms, bounded strokes/history and interrupted ephemeral gestures passed.');
