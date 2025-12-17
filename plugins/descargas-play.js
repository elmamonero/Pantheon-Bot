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
        
        // ✅ CORREGIDO: Variables definidas ANTES de usar
        await conn.sendFile(m.chat, downloadUrl, `${info.title.slice(0,50)}.mp3`, '', m)
        
    } catch (error) {
        console.error(error)
        m.reply('*❌ Falló el envío*\n\n🔗 Enlace directo:\nhttps://da.gd/JijyY')
    }
}

handler.command = ['play']
handler.limit = true
handler.group = true

export default handler
