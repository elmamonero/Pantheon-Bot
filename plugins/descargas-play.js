import fetch from 'node-fetch'

let handler = async (m, { conn, command, text, usedPrefix }) => {
    if (!text) return m.reply(`*🎵 PLAY*\n\n*➜ Uso:* ${usedPrefix + command} <link de youtube>`)

    let urlYt = text.trim()
    m.reply('*⏳ 🎵 Preparando canción...*')

    try {
        let apiUrl = `https://delirius-apiofc.vercel.app/download/ytmp3?url=${encodeURIComponent(urlYt)}`
        let response = await fetch(apiUrl)
        let data = await response.json()

        if (!data.status) throw new Error('❌ Canción no disponible')

        let info = data.data

        // Descargar el MP3 como Buffer
        let audioRes = await fetch(info.download.url)
        if (!audioRes.ok) throw new Error('No se pudo descargar el audio')
        let audioBuffer = await audioRes.buffer()

        // Enviar portada con info
        let texto = `*🎵 ${info.title}*\n\n🎤 *Artista:* ${info.author}\n📊 *Calidad:* ${info.download.quality}\n📦 *Tamaño:* ${info.download.size}\n⏱️ *Duración:* ${Math.floor(info.duration/60)}:${(info.duration%60).toString().padStart(2,'0')} min`
        await conn.sendFile(m.chat, info.image, 'portada.jpg', texto, m)

        // ✅ Enviar el MP3 como audio real
        await conn.sendMessage(m.chat, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            fileName: `${info.title}.mp3`,
            ptt: false
        }, { quoted: m })

    } catch (error) {
        console.error(error)
        m.reply('*❌ Error al procesar canción*\nVerifica que el enlace sea correcto')
    }
}

handler.command = ['play']
handler.limit = true
handler.group = true

export default handler
