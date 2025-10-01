import { igdl } from "ruhend-scraper"

let processing = new Set() // Para evitar procesamiento concurrente del mismo chat

let handler = async (m, { args, conn }) => {
  if (!args[0]) {
    return conn.reply(m.chat, '*[ ☕ ] Ingresa un link de Instagram*')
  }

  if (processing.has(m.chat)) {
    return conn.reply(m.chat, '*[ ℹ️ ] Ya estoy procesando tu solicitud, espera un momento...*')
  }

  processing.add(m.chat)

  try {
    await m.react('⏳️')
    conn.reply(m.chat, `*[ ☕ ] Ƈᴀʀɢᴀɴᴅᴏ...*\n▰▰▰▰▰▰▰▰▭▭`)
    let res = await igdl(args[0])
    let data = res.data
    for (let media of data) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      await conn.sendFile(m.chat, media.url, 'instagram.mp4', '*_DESCARGAS - INSTAGRAM_*\n\n> * [ 🍢 ] Vídeo de Instagram descargado correctamente por Pantheon Bot - MD*')
    }
  } catch {
    await m.react('❌')
    conn.reply(m.chat, '*[ ℹ️ ] Ocurrió un error.*')
  } finally {
    processing.delete(m.chat)
  }
}

handler.command = ['instagram', 'ig', 'instagram2', 'ig2']
handler.tags = ['downloader']
handler.help = ['instagram', 'ig']

export default handler