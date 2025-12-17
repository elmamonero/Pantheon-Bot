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
        
        // ✅ VARIABLES DEFINIDAS ANTES DEL CATCH
        let downloadUrl = info.download.url
        let title = info.title.slice(0, 50)
        
        // ✅ AUDIO PTT DIRECTO - NO DOCUMENTO
        await conn.sendMessage(m.chat, {
            audio: { url: downloadUrl },
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true,
            contextInfo: {
                externalAdReply: {
                    title: title,
                    body: `${info.download.quality} • ${info.download.size}`,
                    sourceUrl: urlYt,
                    mediaType: 1,
                    mediaUrl: `https://youtu.be/${info.id}`,
                    thumbnailUrl: info.image
                }
            }
        }, { quoted: m })
        
    } catch (error) {
        console.error(error)
        m.reply('*❌ Error*\n\n🔗 Enlace directo:\nhttps://da.gd/JijyY')
    }
}

handler.command = ['play']
handler.limit = true
handler.group = true

export default handler

