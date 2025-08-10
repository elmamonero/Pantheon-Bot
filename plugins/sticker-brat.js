import { sticker } from '../lib/sticker.js'

let handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    if (!text) {
      return conn.reply(m.chat, `*⚠️ Por favor, ingresa un texto para realizar tu sticker.*`, m)
    }

    await m.react('☁️')

    const url = `https://api.nekorinn.my.id/maker/brat-v2?text=${encodeURIComponent(text)}`
    const packname = 'MiPack'  // define tu packname si es requerido por la función sticker
    const author = 'MiBot'     // define tu author si es requerido
    const fkontak = null       // o el contexto que uses para responder

    const stiker = await sticker(null, url, packname, author)

    if (!stiker) throw 'Error al generar el sticker.'

    await conn.sendFile(m.chat, stiker, 'sticker.webp', '', fkontak)
    await m.react('✅')
  } catch (err) {
    console.error(err)
    await m.react('✖️')
    m.reply(typeof err === 'string' ? err : 'Ocurrió un error al generar el sticker.')
  }
}

handler.help = ['brat <texto>']
handler.tags = ['sticker']
handler.command = /^brat$/i

export default handler
