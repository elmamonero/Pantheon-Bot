import { sticker } from '../lib/sticker.js'
import axios from 'axios' 

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const fetchSticker = async (text, attempt = 1) => {
    try {
        // 1. Obtener el JSON con la URL
        const { data } = await axios.get(`https://api.neoxr.eu/api/brat`, {
            params: { 
                text: text,
                apikey: 'F0svKu' 
            }
        })

        if (!data.status || !data.data.url) {
            throw new Error("La API no devolvió una URL válida.")
        }

        let imageUrl = data.data.url
        
        /* * Ajuste para tmpfiles.org: 
         * Si la URL contiene /dl/, intentamos asegurar que sea la descarga directa.
         */
        if (imageUrl.includes('tmpfiles.org/dl/')) {
            imageUrl = imageUrl.replace('tmpfiles.org/dl/', 'tmpfiles.org/')
        }

        // 2. Descargar la imagen real
        const imageResponse = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        })

        return imageResponse.data
    } catch (error) {
        // Si hay bloqueo (429), esperamos 5 segundos según tus instrucciones
        if (error.response?.status === 429 && attempt <= 3) {
            console.log(`[!] Bloqueado. Reintentando en 5 segundos...`)
            await delay(5000)
            return fetchSticker(text, attempt + 1)
        }
        throw error
    }
}

let handler = async (m, { conn, text }) => {
    if (m.quoted && m.quoted.text) {
        text = m.quoted.text
    } else if (!text) {
        return conn.sendMessage(m.chat, {
            text: `✨️ Por favor, responde a un mensaje o ingresa un texto para crear el Sticker.`,
        }, { quoted: m })
    }

    try {
        const buffer = await fetchSticker(text)
        
        let userId = m.sender
        let packstickers = global.db.data.users[userId] || {}
        let texto1 = packstickers.text1 || global.packsticker || 'Brat'
        let texto2 = packstickers.text2 || global.packsticker2 || 'Sami'

        // El buffer ahora debería ser una imagen válida, evitando el error de ffmpeg
        let stiker = await sticker(buffer, false, texto1, texto2)

        if (stiker) {
            return conn.sendFile(m.chat, stiker, 'sticker.webp', '', m)
        } else {
            throw new Error("El conversor no pudo procesar la imagen.")
        }
    } catch (error) {
        console.error(error)
        return conn.sendMessage(m.chat, {
            text: `⚠️ Error de procesamiento: Asegúrate de que el texto no sea demasiado largo o intenta de nuevo.`,
        }, { quoted: m })
    }
}

handler.command = ['brat']
handler.tags = ['sticker']
handler.help = ['brat *<texto>*']

export default handler
