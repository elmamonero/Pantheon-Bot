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
        
        // Texto informativo
        let texto = `*🎵 ${info.title}*\n\n`
        texto += `🎤 *Artista:* ${info.author}\n`
        texto += `📊 *Calidad:* ${info.download.quality}\n`
        texto += `📦 *Tamaño:* ${info.download.size}\n`
        texto += `⏱️ *Duración:* ${Math.floor(info.duration/60)}:${(info.duration%60).toString().padStart(2,'0')}min\n`

        // Enviar portada con info
        await conn.sendFile(m.chat, info.image, 'portada.jpg', texto, m)

        // ✅ Enviar el MP3 directamente
        await conn.sendFile(m.chat, info.download.url, `${info.title}.mp3`, null, m, true, { type: 'audioMessage' })

    } catch (error) {
        console.error(error)
        m.reply('*❌ Error al procesar canción*\nVerifica que el enlace sea correcto')
    }
}

handler.command = ['play']
handler.limit = true
handler.group = true

export default handler
