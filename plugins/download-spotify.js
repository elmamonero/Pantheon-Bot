import axios from 'axios';

// SIN URL FIJA
const BASE_URL = 'https://api.delirius.store/download/spotifydl';

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (m.fromMe) return;

  if (!text) {
    const usage = `╭────═[ PANTHEON BOT - MD ]═─────⋆
│ 🎵 *SPOTIFY DOWNLOADER*
│
│ Use el comando de la siguiente forma:
│ • ${usedPrefix + command} <nombre o enlace>
│
│ Ejemplo:
│ • ${usedPrefix + command} I Can't Stop Me
╰───────────═┅═──────────`;
    return await conn.sendMessage(m.chat, { text: usage }, { quoted: m });
  }

  await m.react?.('⌛️');

  try {
    const isUrl = /https?:\/\/open\.spotify\.com\//i.test(text);
    const query = encodeURIComponent(text.trim());

    // SI ES LINK: usa ?url=
    // SI ES TEXTO: usa ?q= (o el parámetro que use realmente tu API para buscar)
    const apiEndpoint = `${BASE_URL}?${isUrl ? 'url' : 'q'}=${query}`;

    const { data: response } = await axios.get(apiEndpoint, { timeout: 30000 });

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
          sourceUrl: isUrl ? text : 'https://www.spotify.com'
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
│ No se pudo procesar la canción.
│ Intente con otro nombre o enlace.
╰───────────═┅═──────────`;
    await m.reply(errorMsg);
  }
};

handler.command = ['spotify', 'music'];
export default handler;
