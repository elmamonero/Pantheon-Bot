let handler = async (m, { conn }) => {
  if (!global.db.data.settings[conn.user.jid].restrict) {
    return m.reply('*[ ⚠️ ] El owner tiene restringido el uso de este comando.*');
  }
  
  let kickte = `*[ ℹ️ ] Menciona ala usuario que deseas eliminar.*`

  if (!m.mentionedJid[0] && !m.quoted) 
    return m.reply(kickte, m.chat, { mentions: conn.parseMention(kickte)})

  let user = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : null
  if (!user) return m.reply(kickte)

  // --- PROTECCIÓN DEL BOT ---
  const botId = conn.user.jid.split('@')[0]   // normalizamos
  const targetId = user.split('@')[0]         // normalizamos

  if (botId === targetId) {
    return m.reply(`*[ ℹ️ ] No se puede eliminar al bot del grupo bajo ninguna circunstancia.*`)
  }

  try {
    let groupMetadata = await conn.groupMetadata(m.chat)
    let owner = groupMetadata.owner

    // Protección del creador del grupo
    if (user === owner) {
      return m.reply(`*[ ℹ️ ] No puedes eliminar al creador del grupo.*`)
    }

    // Ejecutamos el kick
    await conn.groupParticipantsUpdate(m.chat, [user], 'remove')
    m.reply(`*[ ℹ️ ] El participante ${user.split('@')[0]} fue eliminado.*`)
    
  } catch (error) {
    m.reply(`*[ ❌ ] Error al eliminar al usuario. Verifica permisos de admin.*`)
  }
}

handler.help = ['kick *<@tag>*']
handler.tags = ['gc']
handler.command = ['kick', 'expulsar', 'ban', 'rip', 'sacar'] 
handler.admin = true
handler.group = true
handler.botAdmin = true

export default handler
