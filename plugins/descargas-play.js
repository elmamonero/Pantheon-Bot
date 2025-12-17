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
        
        // ✅ SOLUCIÓN FINAL: Enlace + Info completa (sin archivos)
        let texto = `*🎵 ${info.title}*\n\n`
        texto += `🎤 *Artista:* ${info.author}\n`
        texto += `📊 *Calidad:* ${info.download.quality}\n`
        texto += `📦 *Tamaño:* ${info.download.size}\n`
        texto += `⏱️ *Duración:* ${Math.floor(info.duration/60)}:${(info.duration%60).toString().padStart(2,'0')}min\n\n`
        texto += `🔗 *DESCARGAR MP3:* ${info.download.url}`
        
        // Enviar imagen de portada + texto
        await conn.sendFile(m.chat, info.image, 'portada.jpg', texto, m)
        
    } catch (error) {
        m.reply('*❌ Error al procesar canción*\nVerifica que el enlace sea correcto')
    }
}

handler.command = ['play']
handler.limit = true
handler.group = true

export default handler
