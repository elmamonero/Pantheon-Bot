import axios from 'axios';

// Nueva API configurada con tu esquema
const BASE_URL = 'https://api.delirius.store/download/spotifydl?url=https://open.spotify.com/track/37ZtpRBkHcaq6hHy0X98zn';

let handler = async (m, { conn, text, usedPrefix, command }) => {
  // Evitar bucles
  if (m.fromMe) return;

  // Validación de texto
  if (!text) {
    const usage = `╭────═[ PANTHEON BOT - MD ]═─────⋆\n` +
                  `│ 🎵 *SPOTIFY DOWNLOADER*\n` +
                  `│\n` +
                  `│ Use el comando de la siguiente forma:\n` +
                  `│ • ${usedPrefix + command} <nombre o enlace>\n` +
                  `│\n` +
                  `│ Ejemplo:\n` +
                  `│ • ${usedPrefix + command} I Can't Stop Me\n` +
                  `╰───────────═┅═──────────`;
    return await conn.sendMessage(m.chat, { text: usage }, { quoted: m });
  }

  await m.react?.('⌛️');

  try {
    // Detectar si el usuario envió un link o una búsqueda
    const isUrl = /https?:\/\/open\.spotify\.com\//i.test(text);
    const apiEndpoint = `${BASE_URL}?${isUrl ? 'url' : 'q'}=${encodeURIComponent(text.trim())}`;

    // Petición a la API
    const { data: response } = await axios.get(apiEndpoint, { timeout: 30000 });

    // Validar según tu esquema (status: true)
    if (!response || response.status !== true) {
      throw new Error('La API no devolvió una respuesta válida.');
    }

    // Extraer datos del esquema: data { title, author, duration, image, download }
    const { title, author, duration, image, download } = response.data;

    // Convertir duración (ms a mm:ss)
    const formatTime = (ms) => {
      const seconds = Math.floor((ms / 1000) % 60);
      const minutes = Math.floor((ms / (1000 * 60)) % 60);
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const durationStr = formatTime(duration);

    // Formatear mensaje estilo PANTHEON
    const caption = `╭────═[ PANTHEON BOT - MD ]═─────⋆\n` +
                    `│ 🎵 *TÍTULO:* ${title}\n` +
                    `│ 🎙️ *ARTISTA:* ${author}\n` +
                    `│ ⏳ *DURACIÓN:* ${durationStr}\n` +
                    `│ ✨ *ESTADO:* Descargando...\n` +
                    `╰───────────═┅═──────────`;

    // 1. Enviar mensaje de información con la portada
    await conn.sendMessage(m.chat, {
      text: caption,
      contextInfo: {
        externalAdReply: {
          showAdAttribution: true,
          title: 'Spotify Player',
          body: author,
          mediaType: 1,
          thumbnailUrl: image,
          sourceUrl: isUrl ? text : 'https://www.spotify.com'
        }
      }
    }, { quoted: m });

    // 2. Enviar el archivo de audio
    await conn.sendMessage(m.chat, {
      audio: { url: download },
      fileName: `${title}.mp3`,
      mimetype: 'audio/mpeg'
    }, { quoted: m });

    await m.react?.('✅');

  } catch (e) {
    console.error('Error en Spotify Pantheon:', e);
    await m.react?.('❌');
    
    const errorMsg = `╭────═[ ERROR - PANTHEON ]═─────⋆\n` +
                     `│ No se pudo procesar la canción.\n` +
                     `│ Intente con otro nombre o enlace.\n` +
                     `╰───────────═┅═──────────`;
    await m.reply(errorMsg);
  }
};

handler.command = ['spotify', 'music'];
export default handler;
