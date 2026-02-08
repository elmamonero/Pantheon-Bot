import { sticker } from '../lib/sticker.js'
import axios from 'axios' 

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const fetchSticker = async (text, attempt = 1) => {
    try {
        // 1. Petición a la API para obtener el JSON con la URL de la imagen
        const { data } = await axios.get(`https://api.neoxr.eu/api/brat`, {
            params: { 
                text: text,
                apikey: 'F0svKu' 
            }
        })

        // Verificamos si la API respondió correctamente según la estructura que me pasaste
        if (!data.status || !data.data.url) {
            throw new Error("La API no devolvió una URL válida.")
        }

        // 2. Descargar la imagen real desde la URL proporcionada en el JSON
        const imageResponse = await axios.get(data.data.url, {
            responseType: 'arraybuffer'
        })

        return imageResponse.data
    } catch (error) {
        // Si el villager o la API están bloqueados (Error 429), esperamos 5 segundos
        if (error.response?.status === 429 && attempt <= 3) {
            console.log(`[!] Bloqueado. Esperando 5 segundos para reintentar...`)
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
        // Obtenemos el buffer de la imagen tras procesar el JSON
        const buffer = await fetchSticker(text)
        
        let userId = m.sender
        let packstickers = global.db.data.users[userId] || {}
        let texto1 = packstickers.text1 || global.packsticker || 'Brat'
        let texto2 = packstickers.text2 || global.packsticker2 || 'Sami'

        // Convertimos el buffer de imagen a sticker de WhatsApp (.webp)
        let stiker = await sticker(buffer, false, texto1, texto2)

        if (stiker) {
            return conn.sendFile(m.chat, stiker, 'sticker.webp', '', m)
        } else {
            throw new Error("No se pudo generar el sticker a partir de la imagen.")
        }
    } catch (error) {
        console.error(error)
        return conn.sendMessage(m.chat, {
            text: `⚠️ Ocurrió un error: ${error.message}`,
        }, { quoted: m })
    }
}

handler.command = ['brat']
handler.tags = ['sticker']
handler.help = ['brat *<texto>*']

export default handler
handler.help = ['brat *<texto>*']

export default handler
