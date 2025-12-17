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
        
        // ✅ Enviar como documento MP3 (evita 403)
        let docMsg = {
            document: { url: downloadUrl },
            mimetype: 'audio/mpeg',
            fileName: `${info.title.replace(/[^\w\s-]/gi, '')}.mp3`,
            contextInfo: {
                externalAdReply: {
                    title: info.title,
                    body: `${info.download.quality} | ${info.download.size}`,
                    sourceUrl: urlYt,
                    mediaType: 1,
                    mediaUrl: `https://youtu.be/${info.id}`,
                    thumbnailUrl: info.image
                }
            }
        }
        
        await conn.sendMessage(m.chat, docMsg, { quoted: m })
        m.reply(`✅ *${info.title}*\n📦 ${info.download.size} | ${info.download.quality}`)
        
    } catch (error) {
        console.error(error)
        m.reply('*❌ Error al procesar*\n\n*🔗 Enlace directo:*\nhttps://da.gd/JijyY\n\nDescarga manualmente')
    }
}

handler.help = ['play <url>']
handler.tags = ['downloader']
handler.command = ['play']
handler.limit = true

export default handler
