import fetch from 'node-fetch'
import yts from 'yt-search'

let handler = async (m, { conn, command, text, usedPrefix }) => {
    if (!text) return m.reply(`*🎵 PLAY*\n\n*➜ Uso:* ${usedPrefix + command} <link o título>`)

    let urlYt = text.trim()
    m.reply('*⏳ 🎵 Preparando canción...*')

    try {
        let apiUrl, info

        // Si es URL directa
        const isUrl = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/i.test(urlYt)
        if (isUrl) {
            apiUrl = `https://delirius-apiofc.vercel.app/download/ytmp3?url=${encodeURIComponent(urlYt)}`
        } else {
            // Búsqueda por texto
            const search = await yts(urlYt)
            if (!search.videos.length) throw new Error('❌ No se encontraron resultados')
            apiUrl = `https://delirius-apiofc.vercel.app/download/ytmp3?url=${encodeURIComponent(search.videos[0].url)}`
        }

        // ✅ VALIDAR RESPONSE PRIMERO
        let response = await fetch(apiUrl)
        
        // Verificar si es HTML de error
        const contentType = response.headers.get('content-type')
        if (!contentType?.includes('application/json')) {
            throw new Error('❌ API no responde correctamente (403/HTML)')
        }

        let data = await response.json()

        if (!data.status) throw new Error('❌ Canción no disponible')

        info = data.data

        let texto = `*🎵 ${info.title}*\n\n🎤 *Artista:* ${info.author}\n📊 *Calidad:* ${info.download.quality}\n📦 *Tamaño:* ${info.download.size}\n⏱️ *Duración:* ${Math.floor(info.duration/60)}:${(info.duration%60).toString().padStart(2,'0')} min`

        // Enviar portada con info
        await conn.sendFile(m.chat, info.image, 'portada.jpg', texto, m)

        // ✅ URL DIRECTA (sin buffer)
        await conn.sendMessage(m.chat, {
            audio: { url: info.download.url },
            mimetype: 'audio/mpeg',
            fileName: `${info.title.slice(0,30)}.mp3`,
            ptt: false
        }, { quoted: m })

        m.reply('✅ *¡Listo! Reproduce tocando el audio*')

    } catch (error) {
        console.error(error)
        // ✅ info solo existe si la API funcionó
        const directLink = info?.download?.url || 'No disponible'
        m.reply(`*❌ Error*\n\n${error.message}\n\n🔗 Enlace directo:\n${directLink}`)
    }
}

handler.command = ['play']
handler.limit = true
handler.group = true

export default handler
