import axios from 'axios';

// Tu nueva API
const BASE_URL = 'https://api.delirius.store/download/spotifydl?url=https://open.spotify.com/track/37ZtpRBkHcaq6hHy0X98zn';

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (m.fromMe) return;

  if (!text) {
    const usage = `╭────═[ PANTHEON BOT - MD ]═─────⋆\n` +
                  `│ 🎵 *SPOTIFY DOWNLOADER*\n` +
                  `│\n` +
                  `│ • ${usedPrefix + command} <nombre de canción>\n` +
                  `│ • ${usedPrefix + command} <enlace de spotify>\n` +
                  `╰───────────═┅═──────────`;
    return await conn.sendMessage(m.chat, { text: usage }, { quoted: m });
  }

  await m.react?.('⌛️');

  try {
    // DETECCIÓN: Si el texto contiene "spotify.com", usa el parámetro 'url', si no, usa 'q' (búsqueda)
    const isUrl = /https?:\/\/open\.spotify\.com\//i.test(text);
    const apiEndpoint = `${BASE_URL}?${isUrl ? 'url' : 'q'}=${encodeURIComponent(text.trim())}`;

    // Petición a la API
    const { data: response } = await axios.get(apiEndpoint, { timeout: 30000 });

    // Validar esquema: { status: true, data: {...} }
    if (!response || response.status !== true || !response.data) {
      throw new Error('No se encontró la canción o la API falló.');
    }

    const { title, author, duration, image, download } = response.data;

    // Convertir duración de ms a mm:ss
    const formatTime = (ms) => {
      if (!ms) return '--:--';
      const seconds = Math.floor((ms / 1000) % 60);
      const minutes = Math.floor((ms / (1000 * 60)) % 60);
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const durationStr = formatTime(duration);

    // Mensaje de información
    const caption = `╭────═[ PANTHEON BOT - MD ]═─────⋆\n` +
                    `│ 🎵 *TÍTULO:* ${title}\n` +
                    `│ 🎙️ *ARTISTA:* ${author}\n` +
                    `│ ⏳ *DURACIÓN:* ${durationStr}\n` +
                    `│ 📂 *TIPO:* ${isUrl ? 'Enlace' : 'Búsqueda'}\n` +
                    `╰───────────═┅═──────────`;

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

    // Envío del Audio
    await conn.sendMessage(m.chat, {
      audio: { url: download },
      fileName: `${title}.mp3`,
      mimetype: 'audio/mpeg'
    }, { quoted: m });

    await m.react?.('✅');

  } catch (e) {
    console.error('Error:', e);
    await m.react?.('❌');
    await m.reply(`╭────═[ ERROR ]═─────⋆\n│ No se pudo encontrar: "${text}"\n╰───────────═┅═──────────`);
  }
};

handler.command = ['spotify', 'music'];
export default handler;
