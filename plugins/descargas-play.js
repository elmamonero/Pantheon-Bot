import fetch from 'node-fetch'
import yts from 'yt-search'

let handler = async (m, { conn, command, text, usedPrefix }) => {
    if (!text) return m.reply(`*🎵 PLAY*\n\n*➜ Uso:* ${usedPrefix + command} <link o título>`)

    let urlYt = text.trim()
    m.reply('*⏳ 🎵 Preparando canción...*')

    try {
        let apiUrl

        // Si es URL directa
        const isUrl = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/i.test(urlYt)
        if (isUrl) {
            apiUrl = `https://delirius-apiofc.vercel.app/download/ytmp3?url=${encodeURIComponent(urlYt)}`
        } else {
            // Búsqueda por texto CON yt-search
            const search = await yts(urlYt)
            if (!search.videos.length) throw new Error('❌ No se encontraron resultados')
            apiUrl = `https://delirius-apiofc.vercel.app/download/ytmp3?url=${encodeURIComponent(search.videos[0].url)}`
        }

        let response = await fetch(apiUrl)
        let data = await response.json()

        if (!data.status) throw new Error('❌ Canción no disponible')

        let info = data.data

        let texto = `*🎵 ${info.title}*\n\n🎤 *Artista:* ${info.author}\n📊 *Calidad:* ${info.download.quality}\n📦 *Tamaño:* ${info.download.size}\n⏱️ *Duración:* ${Math.floor(info.duration/60)}:${(info.duration%60).toString().padStart(2,'0')} min`

        // Portada
        await conn.sendFile(m.chat, info.image, 'portada.jpg', texto, m)

        // ✅ URL DIRECTA (sin buffer = sin 403)
        await conn.sendMessage(m.chat, {
            audio: { url: info.download.url },
            mimetype: 'audio/mpeg',
            fileName: `${info.title.slice(0,30)}.mp3`,
            ptt: false
        }, { quoted: m })

        m.reply('✅ *¡Listo!*')

    } catch (error) {
        console.error(error)
        m.reply(`*❌ Error*\n${error.message}`)
    }
}

handler.command = ['play']
handler.limit = true
handler.group = true

export default handler
