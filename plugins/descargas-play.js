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
        // Búsqueda con yts
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
                { buttonId: `.playaudio ${yt.url}`, buttonText: { displayText: '🎵 AUDIO' }, type: 1 },
                { buttonId: `.playvideo ${yt.url}`, buttonText: { displayText: '🎥 VIDEO' }, type: 1 }
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

    m.reply('*⏳ 🎵 Descargando...*')

    try {
        // MÚLTIPLES APIs como tu ejemplo
        const audioApis = [
            // 1. ogmp3 (tu lib)
            async () => {
                const result = await ogmp3.download(userData.url, '128', 'audio')
                return result.status ? result.result.download : null
            },
            // 2. Delirius
            async () => {
                const res = await fetch(`https://delirius-apiofc.vercel.app/download/ytmp3?url=${encodeURIComponent(userData.url)}`)
                const data = await res.json().catch(() => ({}))
                return data.status && data.data?.download?.url ? data.data.download.url : null
            },
            // 3. Zenkey
            async () => {
                const res = await fetch(`https://api.zenkey.my.id/api/download/ytmp3?apikey=zenkey&url=${userData.url}`)
                const data = await res.json().catch(() => ({}))
                return data.result?.download?.url || null
            },
            // 4. Neoxr
            async () => {
                const res = await fetch(`https://api.neoxr.eu/api/youtube?url=${userData.url}&type=audio&quality=128kbps&apikey=GataDios`)
                const data = await res.json().catch(() => ({}))
                return data.data?.url || null
            }
        ]

        let downloadUrl = null
        for (const api of audioApis) {
            try {
                downloadUrl = await api()
                if (downloadUrl) break
            } catch (e) {
                console.log('API falló:', e.message)
                continue
            }
        }

        if (!downloadUrl) throw new Error('❌ Todas las APIs fallaron')

        // Verificar tamaño
        const fileSize = await getFileSize(downloadUrl)
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

        m.reply('✅ *¡Listo!*')

    } catch (error) {
        m.reply(`*❌ Error*\n${error.message}`)
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
