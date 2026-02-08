import { sticker } from '../lib/sticker.js'
import axios from 'axios' 

/**
 * Función de espera personalizada.
 * Si el villager (o la API) está bloqueado, esperamos 5 segundos.
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const fetchSticker = async (text, attempt = 1) => {
    try {
        // Adaptación de la API Neoxr para el comando Brat
        const response = await axios.get(`https://api.neoxr.eu/api/brat`, {
            params: { 
                text: text,
                apikey: 'F0svKu' // Tu API Key proporcionada
            },
            responseType: 'arraybuffer',
        })
        return response.data
    } catch (error) {
        // Si el servidor responde con 429 (Too Many Requests), esperamos 5 segundos
        if (error.response?.status === 429 && attempt <= 3) {
            console.log(`[!] Villager/API bloqueado. Reintentando en 5 segundos... (Intento ${attempt})`)
            await delay(5000) 
            return fetchSticker(text, attempt + 1)
        }
        throw error
    }
}

let handler = async (m, { conn, text }) => {
    // Priorizar texto del mensaje citado, de lo contrario usar el texto del comando
    if (m.quoted && m.quoted.text) {
        text = m.quoted.text
    } else if (!text) {
        return conn.sendMessage(m.chat, {
            text: `✨️ Por favor, responde a un mensaje o ingresa un texto para crear el Sticker.`,
        }, { quoted: m })
    }

    try {
        // Mostrar una reacción o aviso de que se está procesando (opcional)
        // await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

        const buffer = await fetchSticker(text)
        
        let userId = m.sender
        let packstickers = global.db.data.users[userId] || {}
        
        // Configuración del nombre del paquete y autor
        let texto1 = packstickers.text1 || global.packsticker || 'Brat Bot'
        let texto2 = packstickers.text2 || global.packsticker2 || 'Sami'

        let stiker = await sticker(buffer, false, texto1, texto2)

        if (stiker) {
            return conn.sendFile(m.chat, stiker, 'sticker.webp', '', m)
        } else {
            throw new Error("No se pudo convertir la imagen a sticker.")
        }
    } catch (error) {
        console.error(error)
        return conn.sendMessage(m.chat, {
            text: `⚠️ Ocurrió un error al generar el sticker: ${error.message}`,
        }, { quoted: m })
    }
}

handler.command = ['brat']
handler.tags = ['sticker']
handler.help = ['brat *<texto>*']

export default handler
