import yts from 'yt-search'
import fetch from 'node-fetch'

const xdownload = '🔊 Descargar'
const dev = 'Bot creado por TuNombre'
const LOLHUMAN_API_KEY = 'TU_API_KEY_AQUI' // Consigue tu key en https://api.lolhuman.xyz/

const handler = async (m, { conn, command, text, usedPrefix }) => {
  console.log('[INFO] Comando recibido:', command, 'Texto:', text)
  if (!text) {
    console.log('[WARN] No se ingresó texto')
    return m.reply(`*${xdownload} Por favor, ingresa un título de YouTube.*\n> *\`Ejemplo:\`* ${usedPrefix + command} Anna Carina & La única tropical Prohibido`)
  }

  await m.react('⏳')
  console.log('[INFO] Buscando en YouTube:', text)

  try {
    const search = await yts(text)
    console.log('[INFO] Resultados de búsqueda:', search.videos && search.videos.length)
    if (!search.videos || !search.videos.length) {
      await m.react('✖️')
      console.log('[ERROR] No se encontraron resultados')
      return m.reply('*✖️ No se encontraron resultados.*')
    }

    const vid = search.videos[0]
    const { title, thumbnail, url, author, timestamp } = vid
    console.log('[INFO] Video seleccionado:', title, url)

    const captext = `\`\`\`◜YTA - Download◞\`\`\`

🌴 *\`Título:\`* ${title || 'no encontrado'}
⏰ *\`Duración:\`* ${timestamp || 'no encontrado'}
👤 *\`Artista:\`* ${author?.name || 'no encontrado'}

> ${dev}
`

    await conn.sendMessage(m.chat, {
      image: { url: thumbnail },
      caption: captext
    }, { quoted: m })
    console.log('[INFO] Imagen enviada')

    // Descargar audio usando la API de lolhuman
    const apiUrl = `https://api.lolhuman.xyz/api/ytmusic?apikey=${LOLHUMAN_API_KEY}&url=${url}`
    console.log('[INFO] Solicitando a lolhuman:', apiUrl)
    const res = await fetch(apiUrl)
    const data = await res.json()
    console.log('[INFO] Respuesta lolhuman:', data)

    if (!data.result || !data.result.link) {
      console.log('[ERROR] No se pudo obtener el enlace de descarga')
      await m.react('✖️')
      return m.reply('*⛔ No se pudo obtener el enlace de descarga.*')
    }

    await conn.sendMessage(m.chat, {
      audio: { url: data.result.link },
      mimetype: 'audio/mp3',
      fileName: `${title}.mp3`
    }, { quoted: m })
    await m.react('✅')
    console.log('[SUCCESS] Audio enviado correctamente')

  } catch (e) {
    await m.react('✖️')
    console.error('[FATAL ERROR]', e)
    m.reply('*⛔ Ocurrió un error al intentar descargar o enviar el audio.*')
  }
}

handler.help = ['play2'].map(v => v + ' *<consulta>*')
handler.tags = ['downloader']
handler.command = /^(yta|song|musica)$/i

export default handler
