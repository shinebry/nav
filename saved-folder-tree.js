(function(root){
 const parentOf=(parents,name)=>parents.get(name)||null;
 function ancestry(parents,name){const path=[],seen=new Set();while(name&&!seen.has(name)){seen.add(name);path.push(name);name=parentOf(parents,name)}return path.reverse()}
 function canMove(parents,name,parent){if(!parent)return true;const seen=new Set();while(parent){if(parent===name||seen.has(parent))return false;seen.add(parent);parent=parentOf(parents,parent)}return true}
 function inside(parents,name,folder){return name===folder||ancestry(parents,name).includes(folder)}
 const api={ancestry,canMove,inside};if(typeof module==='object'&&module.exports)module.exports=api;else root.SavedFolderTree=api;
})(typeof globalThis==='object'?globalThis:this);
