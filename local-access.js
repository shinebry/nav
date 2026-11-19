const loopbackNames=new Set(['127.0.0.1','localhost','[::1]']);
function trustedLocalRequest(req){try{const host=new URL('http://'+req.headers.host);if(!loopbackNames.has(host.hostname))return false;if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))return false;if(req.headers['sec-fetch-site']==='cross-site')return false;return !req.headers.origin||new URL(req.headers.origin).host===host.host}catch{return false}}
module.exports={trustedLocalRequest};
