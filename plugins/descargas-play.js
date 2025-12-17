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
        
        // Enviar audio directamente
        let audioMsg = {
            audio: { url: downloadUrl },
            mimetype: 'audio/mp4',
            ptt: false,
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
        
        await conn.sendMessage(m.chat, audioMsg, { quoted: m })
        
    } catch (error) {
        console.error(error)
        m.reply('*❌ Error al enviar audio*\n*Enlace directo:* https://da.gd/JijyY\nVerifica el enlace')
    }
}

handler.help = ['play <url>']
handler.tags = ['downloader']
handler.command = ['play']
handler.limit = true
handler.group = true

export default handler
