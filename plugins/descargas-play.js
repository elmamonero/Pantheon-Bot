let handler = async (m, { conn, command, text, usedPrefix }) => {
    if (!text) return m.reply(`*🎵 PLAY*\n\n*➜ Uso:* ${usedPrefix + command} <link de youtube>\n\n*Ejemplo:* ${usedPrefix + command} https://youtu.be/zlCBM48A2Dk`)

    let urlYt = text.trim()
    
    m.reply('*⏳ Procesando audio...*')
    
    try {
        // API de Delirius ytmp3
        let apiUrl = `https://delirius-apiofc.vercel.app/download/ytmp3?url=${encodeURIComponent(urlYt)}`
        
        let response = await fetch(apiUrl)
        let data = await response.json()
        
        if (!data.status) throw new Error('❌ Audio no disponible')
        
        let info = data.data
        let downloadUrl = info.download.url
        
        // ✅ SOLUCIÓN DEFINITIVA: Solo enlace + info (sin enviar archivo)
        let texto = `*🎵 ${info.title}*\n\n`
        texto += `📊 *Calidad:* ${info.download.quality}\n`
        texto += `📦 *Tamaño:* ${info.download.size}\n`
        texto += `👤 *Artista:* ${info.author}\n`
        texto += `🎼 *Duración:* ${Math.floor(info.duration/60)}:${(info.duration%60).toString().padStart(2,'0')}min\n\n`
        texto += `🔗 *[Descargar MP3]*(${downloadUrl})`
        
        await m.reply(texto)
        
    } catch (error) {
        console.error(error)
        m.reply('*❌ Error al procesar*\n\nRevisa que el enlace sea de YouTube válido')
    }
}

handler.help = ['play <url>']
handler.tags = ['downloader']
handler.command = ['play']
handler.limit = true

export default handler
