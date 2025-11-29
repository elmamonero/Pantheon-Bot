let handler = async (m, { conn, participants, usedPrefix, command, isROwner }) => {
  if (!global.db.data.settings[conn.user.jid].restrict) {
    return m.reply('*[ ⚠️ ] 𝙴𝙻 𝙾𝚆𝙽𝙴𝚁 𝚃𝙸𝙴𝙽𝙴 𝚁𝙴𝚂𝚃𝚁𝙸𝙽𝙶𝙸𝙳𝙾 (𝚎𝚗𝚊𝚋𝚕𝚎 𝚛𝚎𝚜𝚝𝚛𝚒𝚌𝚝 / 𝚍𝚒𝚜𝚊𝚋𝚕𝚎 𝚛𝚎𝚜𝚝𝚛𝚒𝚌𝚝) 𝙴𝙻 𝚄𝚂𝙾 𝙳𝙴 𝙴𝚂𝚃𝙴 𝙲𝙾𝙼𝙰𝙽𝙳𝙾*');
  }
  
  let kickte = `*[ ℹ️ ] Menciona al usuario que deseas eliminar.*`

  if (!m.mentionedJid[0] && !m.quoted) return m.reply(kickte, m.chat, { mentions: conn.parseMention(kickte)})

  let user = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : null
  
  // Si no hay usuario válido
  if (!user) return m.reply(kickte)

  // **PROTECCIÓN DEL BOT - VERIFICACIÓN MÁS ESTRICTA**
  const botId = conn.user.jid
  if (user === botId) {
    return m.reply(`*[ ℹ️ ] No se puede eliminar al bot del grupo.*`)
  }

  // Verificamos si el usuario a eliminar es el creador del grupo
  try {
    let groupMetadata = await conn.groupMetadata(m.chat)
    let owner = groupMetadata.owner

    if (user === owner) {
      return m.reply(`*[ ℹ️ ] No puedes eliminar al creador del grupo.*`)
    }

    // Solo aquí ejecutamos el kick
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
