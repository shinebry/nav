const {test} = require('node:test');
const assert = require('node:assert/strict');
const {validateTarget, openNativeChat} = require('../matrix-native');

test('native Matrix accepts explicit IDs and rejects URLs, malformed IDs, and missing targets', () => {
  for (const target of ['@peer:nav.local', '#room:example.org', '!opaque:example.org:8448', '@user/name:example.org', '#room:[::1]:8448']) assert.equal(validateTarget(target), target);
  for (const target of [undefined, null, 3, {}, 'https://example.org', '@peer', '#room:server/path', '@a b:server']) assert.throws(() => validateTarget(target), {status: 400});
});

test('direct chats reuse a joined two-person conversation and create no duplicate rooms', async () => {
  const client = {
    getAccountData: async () => ({'@peer:nav.local': ['!left:nav.local','!existing:nav.local']}),
    getJoinedRooms: async () => ['!existing:nav.local'],
    getRoomState: async () => ['@self:nav.local','@peer:nav.local'].map(state_key => ({type:'m.room.member',state_key,content:{membership:'join'}})),
    sendStateEvent: async (room,type,key,content) => {assert.equal(room,'!existing:nav.local');assert.equal(type,'m.room.encryption');assert.equal(content.algorithm,'m.megolm.v1.aes-sha2')},
    getRoomStateEvent: async () => ({name:'Existing chat'}),
    createRoom: () => {throw Error('Must reuse existing room')}
  };
  const result = await openNativeChat({client,userId:'@self:nav.local'}, {target:'@peer:nav.local'});
  assert.equal(result.id,'!existing:nav.local');
  assert.equal(result.title,'Existing chat');
});

test('new direct chats enable encryption, persist m.direct, and coalesce concurrent requests', async () => {
  let creates=0, saved;
  const client = {
    getAccountData: async () => ({}), getJoinedRooms: async () => [],
    createRoom: async options => {creates++; assert.deepEqual(options.invite,['@peer:nav.local']);assert.equal(options.initial_state[0].content.algorithm,'m.megolm.v1.aes-sha2');return '!new:nav.local'},
    setAccountData: async (key,data) => {assert.equal(key,'m.direct');saved=data},
    getRoomStateEvent: async () => ({})
  };
  const session={client,userId:'@self:nav.local'};
  const [a,b]=await Promise.all([openNativeChat(session,{target:'@peer:nav.local'}),openNativeChat(session,{target:'@peer:nav.local'})]);
  assert.equal(creates,1);assert.equal(a.id,b.id);assert.deepEqual(saved,{'@peer:nav.local':['!new:nav.local']});
});

test('room aliases are joined explicitly without sending a message', async () => {
  const client={joinRoom:async target=>{assert.equal(target,'#room:nav.local');return '!room:nav.local'},getRoomStateEvent:async()=>({name:'Room'})};
  assert.equal((await openNativeChat({client,userId:'@self:nav.local'},{target:'#room:nav.local'})).id,'!room:nav.local');
});

test('account-data failures cannot silently create a duplicate direct chat', async () => {
  const client={getAccountData:async()=>{throw Error('Unavailable')}};
  await assert.rejects(openNativeChat({client,userId:'@self:nav.local'},{target:'@peer:nav.local'}),/Unavailable/);
});
