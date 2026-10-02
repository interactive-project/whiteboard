// Internal: caller supplies already copied, schema-checked JSON.
export function computeMatrices(document){
 const objects=new Map(document.objects.map(o=>[o.id,o])),cache=new Map();
 for(const start of document.objects){const chain=[],seen=new Set();let current=start;
  while(current&&!cache.has(current.id)){if(seen.has(current.id))throw new Error();seen.add(current.id);chain.push(current);if(current.groupId===null)break;current=objects.get(current.groupId);if(!current||current.type!=='group')throw new Error();}
  while(chain.length){const o=chain.pop(),g=o.geometry,m=o.groupId===null?[1,0,0,1,0,0]:cache.get(o.groupId);if(!m)throw new Error();const cos=Math.cos(g.rotation),sin=Math.sin(g.rotation),n=[cos*g.scaleX,sin*g.scaleX,-sin*g.scaleY,cos*g.scaleY,g.x,g.y];const result=[m[0]*n[0]+m[2]*n[1],m[1]*n[0]+m[3]*n[1],m[0]*n[2]+m[2]*n[3],m[1]*n[2]+m[3]*n[3],m[0]*n[4]+m[2]*n[5]+m[4],m[1]*n[4]+m[3]*n[5]+m[5]];if(!result.every(v=>Number.isFinite(v)&&Math.abs(v)<=1e12))throw new Error();cache.set(o.id,Object.freeze(result));}
 }
 return cache;
}
