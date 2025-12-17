let handler = async (m, { conn, command, text, usedPrefix }) => {
    if (!text) return m.reply(`*🎵 PLAY*\n\n*➜ Uso:* ${usedPrefix + command} <link de youtube>`)

    let urlYt = text.trim()
    
    m.reply('*⏳ Preparando audio...*')
    
    try {
        let apiUrl = `https://delirius-apiofc.vercel.app/download/ytmp3?url=${encodeURIComponent(urlYt)}`
        let response = await fetch(apiUrl)
        let data = await response.json()
        
        if (!data.status) throw new Error('❌ Audio no disponible')
        
        let info = data.data
        let downloadUrl = info.download.url
        
        // ✅ PTT AUDIO DIRECTO (reproducible, NO documento)
        await conn.sendMessage(m.chat, {
            audio: { url: downloadUrl },
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true,
            contextInfo: {
                externalAdReply: {
                    title: info.title.slice(0, 60),
                    body: info.download.quality,
                    sourceUrl: urlYt,
                    mediaType: 1,
                    mediaUrl: `https://youtu.be/${info.id}`,
                    thumbnailUrl: info.image
                }
            }
        }, { quoted: m })
        
    } catch (error) {
        m.reply('*❌ Error*\n\n🔗 Descarga directa:\n' + downloadUrl)
    }
}

handler.command = ['play']
handler.limit = true
handler.group = true

export default handler
