import axios from 'axios';

const DOWNLOAD_URL = 'https://api.delirius.store/download/spotifydl';
const SEARCH_URL   = 'https://api.delirius.store/search/spotify';

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (m.fromMe) return;

  if (!text) {
    const usage = `╭────═[ PANTHEON BOT ]═─────⋆
│ 🎵 *SPOTIFY DOWNLOADER*
│ Uso: ${usedPrefix + command} <nombre o enlace>
│ Ej:
│ • ${usedPrefix + command} I Can't Stop Me
│ • ${usedPrefix + command} https://open.spotify.com/track/37ZtpRBkHcaq6hHy0X98zn
╰───────────═┅═──────────`;
    return await conn.sendMessage(m.chat, { text: usage }, { quoted: m });
  }

  await m.react?.('⌛️');

  try {
    let spotifyUrl = text.trim();
    const isUrl = /https?:\/\/open\.spotify\.com\//i.test(text);

    // 1) SI ES TEXTO → BUSCAR EN /search/spotify
    if (!isUrl) {
      const { data: search } = await axios.get(
        `${SEARCH_URL}?q=${encodeURIComponent(text.trim())}&limit=1`,
        { timeout: 30000 }
      );

      // Ajusta esta parte según cómo responda tu API de Delirius
      let item = Array.isArray(search?.data) ? search.data[0] : search?.data || search?.result?.[0];

      // Aquí probamos varios posibles campos de URL
      spotifyUrl =
        item?.external_urls?.spotify ||
        item?.url ||
        item?.link;

      if (!spotifyUrl) {
        throw new Error('No se encontró ningún resultado de Spotify para esa búsqueda.');
      }
    }

    // 2) DESCARGAR CON /download/spotifydl?url=
    const { data: response } = await axios.get(
      `${DOWNLOAD_URL}?url=${encodeURIComponent(spotifyUrl)}`,
      { timeout: 30000 }
    );

    if (!response || response.status !== true) {
      throw new Error('La API no devolvió una respuesta válida.');
    }

    const { title, author, duration, image, download } = response.data;

    const formatTime = (ms) => {
      const seconds = Math.floor((ms / 1000) % 60);
      const minutes = Math.floor((ms / (1000 * 60)) % 60);
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const durationStr = formatTime(duration);

    const caption = `╭────═[ PANTHEON BOT - MD ]═─────⋆
│ 🎵 *TÍTULO:* ${title}
│ 🎙️ *ARTISTA:* ${author}
│ ⏳ *DURACIÓN:* ${durationStr}
│ ✨ *ESTADO:* Descargando...
╰───────────═┅═──────────`;

    await conn.sendMessage(m.chat, {
      text: caption,
      contextInfo: {
        externalAdReply: {
          showAdAttribution: true,
          title: 'Spotify Player',
          body: author,
          mediaType: 1,
          thumbnailUrl: image,
          sourceUrl: spotifyUrl
        }
      }
    }, { quoted: m });

    await conn.sendMessage(m.chat, {
      audio: { url: download },
      fileName: `${title}.mp3`,
      mimetype: 'audio/mpeg'
    }, { quoted: m });

    await m.react?.('✅');

  } catch (e) {
    console.error('Error en Spotify Pantheon:', e);
    await m.react?.('❌');

    const errorMsg = `╭────═[ ERROR - PANTHEON ]═─────⋆
│ ${e.message}
│ Intente con otro nombre o enlace.
╰───────────═┅═──────────`;
    await m.reply(errorMsg);
  }
};

handler.command = ['spotify', 'music'];
export default handler;
