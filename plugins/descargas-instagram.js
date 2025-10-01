import { igdl } from "ruhend-scraper"

let processing = new Set()

let handler = async (m, { args, conn }) => {
  if (!args[0]) {
    return conn.reply(m.chat, '*[ ☕ ] Ingresa un link de Instagram*')
  }

  if (processing.has(m.id)) {
    return conn.reply(m.chat, '*[ ℹ️ ] Ya estoy procesando este mensaje, espera un momento...*')
  }

  processing.add(m.id)

  try {
    await m.react('⏳️')
    await conn.reply(m.chat, `*[ ☕ ] Ƈᴀʀɢᴀɴᴅᴏ...*\n▰▰▰▰▰▰▰▰▭▭`)

    let res = await igdl(args[0])
    let data = res.data

    let sentUrls = new Set()

    for (let media of data) {
      if (sentUrls.has(media.url)) {
        // Ya enviado, saltar
        continue
      }
      sentUrls.add(media.url)

      await new Promise(resolve => setTimeout(resolve, 2000))
      await conn.sendFile(m.chat, media.url, 'instagram.mp4', '*_DESCARGAS - INSTAGRAM_*\n\n> * [ 🍢 ] Vídeo de Instagram descargado correctamente por Pantheon Bot - MD*')
    }
  } catch (e) {
    console.error(e)
    await m.react('❌')
    await conn.reply(m.chat, '*[ ℹ️ ] Ocurrió un error.*')
  } finally {
    processing.delete(m.id)
  }
}

handler.command = ['instagram', 'ig', 'instagram2', 'ig2']
handler.tags = ['downloader']
handler.help = ['instagram', 'ig']

export default handler