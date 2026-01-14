import fetch from 'node-fetch'
import yts from 'yt-search'
import { ogmp3 } from '../lib/youtubedl.js'

const LimitAud = 725 * 1024 * 1024 // 725MB
let tempStorage = {}

let handler = async (m, { conn, command, text, usedPrefix }) => {
    if (!text) {
        return m.reply(`╭────═[ PANTHEON BOT ]═─────⋆
│ 🎵 *PLAY*
│
│ *Uso:* ${usedPrefix + command} <título o link>
│ *Ej:* ${usedPrefix + command} Billie Eilish
╰───────────═┅═──────────`)
    }

    m.reply('*⏳ 🔎 Buscando...*')

    try {
        // Búsqueda
        const search = await yts(text.trim())
        if (!search.videos.length) throw new Error('❌ No se encontraron resultados')

        const yt = search.videos[0]
        tempStorage[m.sender] = { url: yt.url, title: yt.title }

        const texto = `╭────═[ PANTHEON BOT ]═─────⋆
│ 🎵 *${yt.title.slice(0,50)}*
│ 🎤 *${yt.author.name}*
│ ⏱️ *${Math.floor(yt.duration.seconds/60)}:${(yt.duration.seconds%60).toString().padStart(2,'0')}*
│ 👀 *${(yt.views/1000000).toFixed(1)}M vistas*
│ 🔗 ${yt.url.replace('https://','')}
╰───────────═┅═──────────

🎶 *Escribe "audio"* para descargar`

        await conn.sendMessage(m.chat, {
            image: { url: yt.thumbnail },
            caption: texto,
            buttons: [
                { buttonId: `.playaudio ${yt.url}`, buttonText: { displayText: '🎵 AUDIO' }, type: 1 }
            ]
        }, { quoted: m })

    } catch (error) {
        m.reply(`*❌ Error*\n${error.message}`)
    }
}

handler.before = async (m, { conn }) => {
    const text = m.text.trim().toLowerCase()
    if (!['audio', '🎶'].includes(text)) return

    const userData = tempStorage[m.sender]
    if (!userData?.url) return m.reply('❌ Primero usa .play <canción>')

    m.reply('*⏳ 🎵 Procesando con youtubedl...*')

    try {
        // ✅ SOLO ogmp3 (tu lib estable)
        const result = await ogmp3.download(userData.url, '128', 'audio')
        
        if (!result.status) {
            throw new Error(result.error || 'ogmp3 falló')
        }

        const downloadUrl = result.result.download

        // Verificar tamaño
        const fileSize = await getFileSize(downloadUrl)
        console.log(`Tamaño: ${fileSize/1024/1024}MB`)

        if (fileSize > LimitAud) {
            await conn.sendMessage(m.chat, {
                document: { url: downloadUrl },
                mimetype: 'audio/mpeg',
                fileName: `${userData.title.slice(0,30)}.mp3`
            }, { quoted: m })
        } else {
            await conn.sendMessage(m.chat, {
                audio: { url: downloadUrl },
                mimetype: 'audio/mpeg',
                fileName: `${userData.title.slice(0,30)}.mp3`
            }, { quoted: m })
        }

        m.reply('✅ *¡Listo con youtubedl!* 🎵')

    } catch (error) {
        console.error('ogmp3 error:', error)
        m.reply(`*❌ Error con youtubedl*\n${error.message}`)
    } finally {
        delete tempStorage[m.sender]
    }
}

async function getFileSize(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' })
        return parseInt(response.headers.get('content-length') || 0)
    } catch {
        return 0
    }
}

handler.command = ['play']
handler.limit = true
handler.group = true
export default handler
