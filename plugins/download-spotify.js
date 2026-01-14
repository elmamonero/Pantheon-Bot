import axios from 'axios';

// API Base (ajustada para búsqueda y descarga separada si es necesario)
const SEARCH_API = 'https://api.delirius.store/download/spotifydl?url=https://open.spotify.com/track/37ZtpRBkHcaq6hHy0X98zn'; // Endpoint de búsqueda
const DOWNLOAD_API = 'https://api.delirius.store/download/spotifydl?url=https://open.spotify.com/track/37ZtpRBkHcaq6hHy0X98zn'; // Endpoint de descarga

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (m.fromMe) return;

  if (!text) {
    return await conn.sendMessage(m.chat, { 
      text: `╭────═[ PANTHEON BOT ]═─────⋆\n│ Escriba el nombre de la canción.\n╰───────────═┅═──────────` 
    }, { quoted: m });
  }

  await m.react?.('⌛️');

  try {
    let spotifyUrl = text.trim();
    const isUrl = /https?:\/\/open\.spotify\.com\//i.test(text);

    // --- PASO 1: SI NO ES LINK, BUSCAR EL LINK ---
    if (!isUrl) {
      const searchRes = await axios.get(`${SEARCH_API}?q=${encodeURIComponent(text)}`);
      
      // Intentamos extraer el link de la búsqueda
      // Si la API devuelve una lista en 'data', tomamos el primero. 
      // Si devuelve un objeto directo, tomamos ese.
      const results = searchRes.data.data || searchRes.data.result;
      
      if (Array.isArray(results) && results.length > 0) {
        spotifyUrl = results[0].url || results[0].link;
      } else if (results && (results.url || results.link)) {
        spotifyUrl = results.url || results.link;
      } else {
        throw new Error('No se encontraron resultados de búsqueda.');
      }
    }

    // --- PASO 2: DESCARGAR CON EL LINK OBTENIDO ---
    const downloadRes = await axios.get(`${DOWNLOAD_API}?url=${encodeURIComponent(spotifyUrl)}`);

    if (!downloadRes.data || downloadRes.data.status !== true) {
      throw new Error('La API de descarga no respondió correctamente.');
    }

    const { title, author, duration, image, download } = downloadRes.data.data;

    // Formatear Duración
    const formatTime = (ms) => {
      const min = Math.floor(ms / 60000);
      const sec = ((ms % 60000) / 1000).toFixed(0);
      return `${min}:${(sec < 10 ? '0' : '')}${sec}`;
    };

    const info = `╭────═[ PANTHEON BOT ]═─────⋆\n` +
                 `│ 🎵 *TÍTULO:* ${title}\n` +
                 `│ 🎙️ *ARTISTA:* ${author}\n` +
                 `│ ⏳ *DURACIÓN:* ${formatTime(duration)}\n` +
                 `╰───────────═┅═──────────`;

    // Enviar Info con Portada
    await conn.sendMessage(m.chat, {
      text: info,
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

    // Enviar Audio
    await conn.sendMessage(m.chat, {
      audio: { url: download },
      fileName: `${title}.mp3`,
      mimetype: 'audio/mpeg'
    }, { quoted: m });

    await m.react?.('✅');

  } catch (e) {
    console.error('Error detallado:', e);
    await m.react?.('❌');
    await m.reply(`╭────═[ ERROR ]═─────⋆\n│ No se pudo obtener la canción.\n│ Detalle: ${e.message}\n╰───────────═┅═──────────`);
  }
};

handler.command = ['spotify', 'music'];
export default handler;
