import { sticker } from '../lib/sticker.js'
import uploadFile from '../lib/uploadFile.js'
import uploadImage from '../lib/uploadImage.js'
import { webp2png } from '../lib/webp2mp4.js'

let handler = async (m, { conn, args }) => {
  let stiker = false
  let q = m.quoted || m
  let mime = (q.msg || q).mimetype || q.mediaType || ''
  const xsticker = '🧩' // Puedes cambiar este emoji por el que prefieras
  const mensajeError = `*${xsticker} Responde a una imagen o video para convertir en stiker.*`

  try {
    if (mime.startsWith('image/') || mime.startsWith('video/') || mime === 'image/webp') {
      let media = await q.download?.()
      if (!media) return m.reply(mensajeError)

      try {
        stiker = await sticker(media, false, global.packN, global.authN)
      } catch (e) {
        console.error('❌ Error al generar sticker directo:', e)
        let url

        if (mime === 'image/webp') url = await webp2png(media)
        else if (mime.startsWith('image/')) url = await uploadImage(media)
        else if (mime.startsWith('video/')) url = await uploadFile(media)

        if (!url || typeof url !== 'string' || !isValidUrl(url)) {
          return m.reply('❌ No se pudo obtener una URL válida del archivo.')
        }

        stiker = await sticker(false, url, global.packN, global.authN)
      }

    } else if (args[0]) {
      if (!isValidUrl(args[0])) return m.reply('❌ La *URL* es inválida.')
      stiker = await sticker(false, args[0], global.packN, global.authN)
    } else {
      return m.reply(mensajeError)
    }

  } catch (e) {
    console.error('❌ Error general:', e)
    stiker = false
  }

  if (stiker && Buffer.isBuffer(stiker)) {
    await conn.sendFile(m.chat, stiker, 'sticker.webp', '', m)
  } else {
    m.reply('❌ No se pudo generar el sticker. Asegúrate de que el archivo sea válido.')
  }
}

handler.help = ['sticker']
handler.tags = ['sticker']
handler.command = ['stickerprueba']

export default handler

function isValidUrl(text) {
  return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|mp4)$/i.test(text)
}
