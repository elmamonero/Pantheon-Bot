import { sticker } from '../lib/sticker.js'
import axios from 'axios'

const xsticker = '❗'

let handler = async (m, { conn, usedPrefix, command, text }) => {
  if (!text) {
    return conn.reply(m.chat, `*${xsticker} Por favor, ingresa un texto para realizar tu sticker.*\n> *\`Ejemplo:\`* ${usedPrefix + command} Hello Word`, m)
  }

  m.react('⏳')

  try {
    let url = `https://api.nekorinn.my.id/maker/brat-v2?text=${encodeURIComponent(text)}`
    let res = await axios.get(url, { responseType: 'arraybuffer' })

    let contentType = res.headers['content-type']

    // A veces la API puede devolver 'image/webp' para stickers, aceptamos ese caso también
    if (
      !contentType || 
      (!contentType.startsWith('video/') && !contentType.startsWith('image/'))
    ) throw new Error('Error en la API: tipo de contenido inesperado.')

    let bratSticker = await sticker(res.data, null, global.packname, global.author)

    await conn.sendMessage(m.chat, { sticker: bratSticker }, { quoted: m })
    m.react('✅')

  } catch (err) {
    m.react('✖️')
    // Puedes agregar más detalles aquí si la respuesta tiene data para depurar
    m.reply(`✖️ Error en la API o fallo al generar el sticker.\n${err.message}`)
  }
}

handler.help = ['bratvid <texto>']
handler.command = ['bratvid', 'bratv']
handler.tags = ['sticker']

export default handler
