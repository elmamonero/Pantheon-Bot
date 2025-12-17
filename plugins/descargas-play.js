let handler = async (m, { conn, command, text, usedPrefix }) => {
    if (!text) return m.reply(`*🎵 YTMP3 DOWNLOADER*\n\n*➜ Uso:* ${usedPrefix + command} <link de youtube>\n\n*Ejemplo:* ${usedPrefix + command} https://youtu.be/TdrL3QxjyVw`)

    let urlYt = text.trim()
    
    m.reply('*⏳ Procesando...*')
    
    try {
        // API de Delirius ytmp3
        let apiUrl = `https://delirius-apiofc.vercel.app/download/ytmp3?url=${encodeURIComponent(urlYt)}`
        
        let response = await fetch(apiUrl)
        let data = await response.json()
        
        if (!data.status) throw new Error('❌ Error en la API')
        
        let info = data.data
        let downloadUrl = info.download.url
        let title = info.title
        let size = info.download.size
        let quality = info.download.quality
        
        let texto = `*🎵 ${title}*\n\n`
        texto += `📊 *Calidad:* ${quality}\n`
        texto += `📦 *Tamaño:* ${size}\n`
        texto += `👤 *Artista:* ${info.author}\n`
        texto += `▶️ *[Descargar MP3]*(${downloadUrl})`
        
        await m.reply(texto.trim())
        
    } catch (error) {
        console.error(error)
        m.reply('*❌ Error al procesar el video*\nIntenta con otro enlace o más tarde')
    }
}

handler.help = ['ytmp3 <url>']
handler.tags = ['downloader']
handler.command = ['ytmp3', 'mp3', 'audio', 'musica']
handler.limit = true

export default handler
