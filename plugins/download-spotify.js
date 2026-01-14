import axios from 'axios';

// Usaremos el mismo endpoint para todo
const BASE_URL = 'https://api.delirius.store/download/spotifydl?url=https://open.spotify.com/track/37ZtpRBkHcaq6hHy0X98zn';

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (m.fromMe) return;

  if (!text) {
    return await conn.sendMessage(m.chat, { 
      text: `╭────═[ PANTHEON BOT ]═─────⋆\n│ Ingrese el nombre de la canción o un link.\n╰───────────═┅═──────────` 
    }, { quoted: m });
  }

  await m.react?.('⌛️');

  try {
    let spotifyUrl = text.trim();
    const isUrl = /https?:\/\/open\.spotify\.com\//i.test(text);

    // --- PASO 1: SI ES NOMBRE, BUSCAR EL LINK PRIMERO ---
    if (!isUrl) {
      // Llamada a la API de búsqueda
      const searchRes = await axios.get(`${BASE_URL}?q=${encodeURIComponent(text)}`);
      
      // Intentamos encontrar el link de Spotify en la respuesta de búsqueda
      // Buscamos en: res.data (si es un objeto directo) o res.data[0] (si es una lista)
      let results = searchRes.data.data || searchRes.data.result || searchRes.data;
      
      let item = Array.isArray(results) ? results[0] : results;
      spotifyUrl = item?.url || item?.link || item?.external_urls?.spotify;

      if (!spotifyUrl) {
        throw new Error('No se pudo encontrar un link de Spotify para esa búsqueda.');
      }
    }

    // --- PASO 2: DESCARGAR USANDO EL LINK (SEA EL ORIGINAL O EL ENCONTRADO) ---
    const downloadRes = await axios.get(`${BASE_URL}?url=${encodeURIComponent(spotifyUrl)}`);

    // Validamos la descarga con el esquema que me pasaste antes
    if (!downloadRes.data || !downloadRes.data.status) {
      throw new Error('La API no pudo procesar la descarga de este link.');
    }

    const { title, author, duration, image, download } = downloadRes.data.data;

    const formatTime = (ms) => {
      if (!ms) return '00:00';
      const min = Math.floor(ms / 60000);
      const sec = ((ms % 60000) / 1000).toFixed(0);
      return `${min}:${(sec < 10 ? '0' : '')}${sec}`;
    };

    const caption = `╭────═[ PANTHEON BOT ]═─────⋆\n` +
                    `│ 🎵 *TÍTULO:* ${title}\n` +
                    `│ 🎙️ *ARTISTA:* ${author}\n` +
                    `│ ⏳ *DURACIÓN:* ${formatTime(duration)}\n` +
                    `╰───────────═┅═──────────`;

    // Enviar mensaje informativo
    await conn.sendMessage(m.chat, {
      text: caption,
      contextInfo: {
        externalAdReply: {
          showAdAttribution: true,
          title: 'Spotify Downloader',
          body: author,
          thumbnailUrl: image,
          sourceUrl: spotifyUrl,
          mediaType: 1
        }
      }
    }, { quoted: m });

    // Enviar el archivo de audio
    await conn.sendMessage(m.chat, {
      audio: { url: download },
      fileName: `${title}.mp3`,
      mimetype: 'audio/mpeg'
    }, { quoted: m });

    await m.react?.('✅');

  } catch (e) {
    console.error('Error en Spotify:', e);
    await m.react?.('❌');
    await m.reply(`╭────═[ ERROR ]═─────⋆\n│ ${e.message}\n╰───────────═┅═──────────`);
  }
};

handler.command = ['spotify', 'music'];
export default handler;
