/* ============================================
   app/rooms.js — 群聊房间
   ============================================ */

import { config, rooms, personas, runtime } from './state.js'
import { saveRooms } from './storage.js'
import { getProvider, getActiveApiKey } from './provider.js'
import { emit, Events } from './events.js'

export function createRoom(name, memberIds) {
  const room = { id: 'r_' + Date.now(), name, members: memberIds, messages: [] }
  rooms.unshift(room); saveRooms()
  runtime.activeRoomId = room.id
  return room
}

export function deleteRoom(id) {
  const idx = rooms.findIndex(r => r.id === id)
  if (idx >= 0) { rooms.splice(idx, 1); saveRooms() }
  if (runtime.activeRoomId === id) {
    runtime.activeRoomId = rooms.length ? rooms[0].id : null
  }
}

export function getActiveRoom() {
  return rooms.find(r => r.id === runtime.activeRoomId)
}

export async function sendGroupMsg(text) {
  if (runtime.isGenerating || !getActiveApiKey()) return
  const room = getActiveRoom(); if (!room) return
  const um = { role: 'user', content: text, ts: Date.now() }
  room.messages.push(um); saveRooms()
  runtime.isGenerating = true

  const provider = getProvider(); const api = provider.getConfig()
  const isDS = config.apiProvider === 'deepseek'

  for (const mid of room.members) {
    const p = personas.find(x => x.id === mid); if (!p) continue
    const recent = room.messages.slice(-20)
    let convo = '以下是群聊对话记录：\n'
    recent.forEach(m => {
      if (m.role === 'user') convo += '用户' + (config.userName ? '(' + config.userName + ')' : '') + '说：' + m.content + '\n'
      else { const s = personas.find(x => x.id === m.personaId); convo += (s ? s.name : '某人') + '说：' + m.content + '\n' }
    })
    const msgs = [{ role: 'system', content: `你是${p.name}。现在在群聊里和别人聊天。\n\n${p.systemPrompt || ''}\n\n${convo}\n\n现在轮到${p.name}说话了。请简短自然地回应（1-3句话），可以说给任何人。只说${p.name}说的话，不要加前缀。` }]
    try {
      const res = await fetch(api.baseUrl, {
        method: 'POST', headers: api.headers,
        body: JSON.stringify({ model: isDS ? 'deepseek-chat' : api.model, messages: msgs, temperature: (p.temperature || 1.3) * 0.8, max_tokens: 300, stream: false })
      })
      if (!res.ok) continue
      const j = await res.json(); const reply = j.choices?.[0]?.message?.content || ''
      if (reply) {
        const clean = reply.replace(/^(沈度|Monday|Butler|Nox|' + p.name + ')[:：]\s*/, '').trim()
        room.messages.push({ role: 'assistant', content: clean, personaId: mid, ts: Date.now() })
        saveRooms()
      }
    } catch (e) { }
  }
  runtime.isGenerating = false
  emit(Events.GROUP_MSG_SENT, { roomId: room.id })
}
