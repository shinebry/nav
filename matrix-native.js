const pending = new Map();

function inputError(message) {
  return Object.assign(new Error(message), {status: 400});
}

function validateTarget(target) {
  if (typeof target !== 'string' || !/^[@!#][^\s:]+:(?:[a-zA-Z0-9.-]+|\[[a-fA-F0-9:]+\])(?::[0-9]+)?$/.test(target)) {
    throw inputError('Enter a Matrix user ID, room ID, or room alias');
  }
  return target;
}

async function directRoom(client, userId, target) {
  if (target === userId) throw inputError('Choose another Matrix user');
  let direct;
  try {
    direct = await client.getAccountData('m.direct');
  } catch (error) {
    if (error.errcode !== 'M_NOT_FOUND' && error.body?.errcode !== 'M_NOT_FOUND') throw error;
    direct = {};
  }
  const joined = new Set(await client.getJoinedRooms());
  for (const room of direct[target] || []) {
    if (!joined.has(room)) continue;
    const members = await client.getRoomState(room);
    const current = members.filter(e => e.type === 'm.room.member' && ['join','invite'].includes(e.content?.membership));
    if (current.length === 2 && current.some(e => e.state_key === target)) {
      const encryption = members.find(e => e.type === 'm.room.encryption' && e.state_key === '');
      if (encryption && encryption.content?.algorithm !== 'm.megolm.v1.aes-sha2') {
        throw Object.assign(new Error('This conversation uses an unsupported encryption algorithm'), {status: 409});
      }
      if (!encryption) await client.sendStateEvent(room, 'm.room.encryption', '', {algorithm: 'm.megolm.v1.aes-sha2'});
      return room;
    }
  }
  const room = await client.createRoom({
    invite: [target],
    is_direct: true,
    preset: 'trusted_private_chat',
    initial_state: [{type: 'm.room.encryption', state_key: '', content: {algorithm: 'm.megolm.v1.aes-sha2'}}]
  });
  // Retain the room even if a subsequent account-data write fails.
  try {
    const latest = await client.getAccountData('m.direct');
    direct = latest;
  } catch {}
  direct[target] = [...new Set([...(direct[target] || []), room])];
  try { await client.setAccountData('m.direct', direct); } catch {
    return {room, warning: 'Conversation created. Matrix direct-chat metadata could not be saved.'};
  }
  return room;
}

async function openNativeChat({client, userId}, input) {
  const target = validateTarget(typeof input?.target === 'string' ? input.target.trim() : undefined);
  const key = userId + '\0' + target;
  if (pending.has(key)) return pending.get(key);
  const request = (async () => {
    const result = target.startsWith('@')
      ? await directRoom(client, userId, target)
      : await client.joinRoom(target);
    const room = typeof result === 'string' ? result : result.room;
    let name;
    try { name = (await client.getRoomStateEvent(room, 'm.room.name')).name; } catch {}
    return {id: room, title: name || target, network: 'Matrix', accountID: 'matrix', type: target.startsWith('@') ? 'single' : 'group', isReadOnly: false, warning: result.warning};
  })();
  pending.set(key, request);
  try { return await request; } finally { pending.delete(key); }
}

module.exports = {validateTarget, openNativeChat};
