let linkRegex = /chat.whatsapp.com\/([0-9A-Za-z]{20,24})/i
import fetch from 'node-fetch'

export async function before(m, { isAdmin, isBotAdmin, conn }) {
  if (m.isBaileys && m.fromMe) return true
  if (!m.isGroup) return false
  if (m.sender === conn.user.jid) return true

  let chat = global.db.data.chats[m.chat]
  let delet = m.key.participant
  let bang = m.key.id
  const isGroupLink = linkRegex.exec(m.text)
  const grupo = `https://chat.whatsapp.com`

  if (!chat.antiLink) return true

  // Si es admin que manda link → no responder
  if (isAdmin && m.text.includes(grupo)) return true

  if (chat.antiLink && isGroupLink && !isAdmin) {
    if (isBotAdmin) {
      const linkThisGroup = `https://chat.whatsapp.com/${await this.groupInviteCode(m.chat)}`
      if (m.text.includes(linkThisGroup)) return true
    }

    if (!chat.antiLinkUsers) chat.antiLinkUsers = {}
    if (!(m.sender in chat.antiLinkUsers)) chat.antiLinkUsers[m.sender] = 0

    chat.antiLinkUsers[m.sender] += 1
    const advertencias = `${chat.antiLinkUsers[m.sender]}/3`

    if (chat.antiLinkUsers[m.sender] < 3) {
      const advertenciaTexto =
`➤ \`〔 𝗔𝗗𝗩𝗘𝗥𝗧𝗘𝗡𝗖𝗜𝗔 ⚠️ 〕\`

\`\`\`@${m.sender.split("@")[0]} 𝖯𝖱𝖮𝖧𝖨𝖡𝖨𝖣𝖮 𝖤𝖭𝖫𝖠𝖢𝖤𝖲 𝖣𝖤 𝖮𝖳𝖱𝖮𝖲 𝖦𝖱𝖴𝖯𝖮𝖲, 𝖠𝖭𝖳𝖨𝖫𝖨𝖭𝖪 𝖠𝖢𝖳𝖨𝖵𝖠𝖣𝖮 𝖵𝖤 𝖠 𝖧𝖠𝖢𝖤𝖱 𝖲𝖯𝖠𝖬 𝖠 𝖮𝖳𝖱𝖮 𝖫𝖠𝖣𝖮\`\`\`

\`\`\`≫ 𝖭𝖮 𝖫𝖨𝖭𝖪𝖲 𝖣𝖤 𝖮𝖳𝖱𝖮𝖲 𝖦𝖱𝖴𝖯𝖮𝖲
≫ 𝖠𝖣𝖵𝖤𝖱𝖳𝖤𝖭𝖢𝖨𝖠𝖲 ${advertencias}\`\`\``

      const iconoAdvertencia = 'https://cdn.russellxz.click/bdbe6f1f.jpeg'

      await conn.sendMessage(m.chat, {
        text: advertenciaTexto,
        contextInfo: {
          mentionedJid: [m.sender],
          externalAdReply: {
            title: '',
            body: '',
            thumbnail: await (await fetch(iconoAdvertencia)).buffer(),
            mediaType: 1,
            renderLargerThumbnail: true, // más grande
            showAdAttribution: false,
            thumbnailUrl: iconoAdvertencia,
            sourceUrl: '', 
            previewType: "NONE"
          }
        }
      }, { quoted: m })

      // El mensaje de externalAdReply siempre coloca la imagen a la DERECHA
      // cuando no pones título/cuerpo y usas renderLargerThumbnail = true

      // Borrar mensaje con enlace
      await conn.sendMessage(m.chat, { delete: { remoteJid: m.chat, fromMe: false, id: bang, participant: delet }})
      return true
    }

    // Si llega a 3/3 → expulsar
    if (chat.antiLinkUsers[m.sender] >= 3) {
      await conn.reply(m.chat, `*☕ ${await this.getName(m.sender)} ¡has alcanzado la tercera infracción con enlaces prohibidos y serás expulsado!*`, m)
      if (!isBotAdmin)
        return conn.reply(m.chat, `*☕ No soy admin, no puedo eliminar intrusos*`, m)

      await conn.sendMessage(m.chat, { delete: { remoteJid: m.chat, fromMe: false, id: bang, participant: delet }})
      await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
      delete chat.antiLinkUsers[m.sender]
    }
  }

  return true
}
