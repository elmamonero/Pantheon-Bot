import fetch from 'node-fetch'
import yts from 'yt-search'
import { ogmp3 } from '../lib/youtubedl.js'

const LimitAud = 725 * 1024 * 1024 // 725MB
let tempStorage = {}

let handler = async (m, { conn, command, text, usedPrefix }) => {
    if (!text) return m.reply(`*🎵 PLAY*\n\n*➜ Uso:* ${usedPrefix + command} <link o título>`)

    let urlYt = text.trim()
    m.reply('*⏳ 🎵 Preparando canción...*')

    try {
        let info, downloadUrl

        // Si es URL de YouTube directo
        if (ogmp3.isUrl(urlYt)) {
            const result = await ogmp3.download(urlYt, '128', 'audio') // 128kbps liviano
            if (!result.status) throw new Error(result.error)
            
            info = result.result
            downloadUrl = info.download
        } else {
            // Si es búsqueda por texto
            const search = await yts(urlYt)
            if (!search.videos.length) throw new Error('❌ No se encontraron resultados')
            
            const video = search.videos[0]
            const result = await ogmp3.download(video.url, '128', 'audio')
            if (!result.status) throw new Error(result.error)
            
            info = result.result
            downloadUrl = info.download
        }

        // Descargar el MP3 como Buffer
        let audioRes = await fetch(downloadUrl)
        if (!audioRes.ok) throw new Error('No se pudo descargar el audio')
        
        let audioBuffer = await audioRes.buffer()
        
        // Verificar límite de tamaño
        if (audioBuffer.length > LimitAud) {
            throw new Error('❌ Archivo muy pesado (>725MB)')
        }

        // Info formateada
        let texto = `*🎵 ${info.title}*\n\n🎤 *Artista:* ${info.title.split(' - ')[0] || 'Desconocido'}\n📊 *Calidad:* ${info.quality}kbps\n⏱️ *Duración:* ${Math.floor(info.duration/60)}:${(info.duration%60).toString().padStart(2,'0')}min`

        // Enviar portada con info
        await conn.sendFile(m.chat, info.thumbnail, 'portada.jpg', texto, m)

        // ✅ Enviar el MP3 como audio real (128kbps = liviano)
        await conn.sendMessage(m.chat, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            fileName: `${info.title.slice(0,30)}.mp3`,
            ptt: false
        }, { quoted: m })

        m.reply('✅ *¡Listo! Reproduce tocando el audio*')

    } catch (error) {
        console.error(error)
        m.reply(`*❌ Error al procesar canción*\n\n${error.message}\n\nVerifica que el enlace/título sea correcto`)
    }
}

handler.command = ['play']
handler.limit = true
handler.group = true

export default handler
