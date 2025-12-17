let handler = async (m, { conn, command, text, usedPrefix }) => {
    if (!text) return m.reply(`*🎵 PLAY*\n\n*➜ Uso:* ${usedPrefix + command} <link de youtube>`)

    let urlYt = text.trim()
    
    m.reply('*⏳ Descargando audio...*')
    
    try {
        // API de Delirius ytmp3
        let apiUrl = `https://delirius-apiofc.vercel.app/download/ytmp3?url=${encodeURIComponent(urlYt)}`
        let response = await fetch(apiUrl)
        let data = await response.json()
        
        if (!data.status) throw new Error('❌ Audio no disponible')
        
        let info = data.data
        let downloadUrl = info.download.url
        
        // ✅ SOLUCIÓN: Audio como PTT (funciona con da.gd)
        let audioMsg = {
            audio: { url: downloadUrl },
            mimetype: 'audio/mp4; codecs=mp3', 
            ptt: true,  // Voice note style
            contextInfo: {
                externalAdReply: {
                    title: info.title.slice(0, 60),
                    body: `${info.download.quality} • ${info.download.size}`,
                    sourceUrl: `https://youtu.be/${info.id}`,
                    mediaType: 1,
                    mediaUrl: `https://youtu.be/${info.id}`,
                    thumbnailUrl: info.image
                }
            }
        }
        
        await conn.sendFile(m.chat, downloadUrl, `${info.title}.mp3`, '', m)
        
    } catch (error) {
        console.error(error)
        m.reply(`*❌ Falló el audio*\n\n${info?.title || 'Canción'}\n🔗 ${downloadUrl || 'https://da.gd/JijyY'}`)
    }
}

handler.command = ['play']
handler.limit = true
handler.group = true

export default handler
