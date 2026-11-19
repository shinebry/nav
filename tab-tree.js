(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.TabTree=factory()})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  const color=value=>/^#[a-f0-9]{6}$/i.test(value||'')?value:'#ffffff';
  function ancestors(groups,id){const result=[],seen=new Set();let group=groups.find(g=>g.id===id);while(group&&!seen.has(group.id)){seen.add(group.id);result.push(group.id);group=groups.find(g=>g.id===group.parentId)}return result}
  function canParent(groups,id,parentId){return !parentId||(groups.some(g=>g.id===parentId)&&!ancestors(groups,parentId).includes(id))}
  function remove(groups,tabs,id){const parent=groups.find(g=>g.id===id)?.parentId||null;return {groups:groups.filter(g=>g.id!==id).map(g=>g.parentId===id?{...g,parentId:parent}:g),tabs:tabs.map(t=>t.groupId===id?{...t,groupId:parent}:t)}}
  return {color,ancestors,canParent,remove};
});
