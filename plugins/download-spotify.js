import axios from 'axios';

const BASE_URL = 'https://api.delirius.store/download/spotifydl';

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (m.fromMe) return;

  if (!text) {
    return await conn.sendMessage(m.chat, { 
      text: `╭────═[ PANTHEON BOT ]═─────⋆
│ Ingrese el nombre de la canción o un link.
╰───────────═┅═──────────` 
    }, { quoted: m });
  }

  await m.react?.('⌛️');

  try {
    let spotifyUrl = text.trim();
    const isUrl = /https?:\/\/open\.spotify\.com\//i.test(text);

    // SI ES TEXTO -> BUSCAR
    if (!isUrl) {
      const searchRes = await axios.get(
        `${BASE_URL}/search?q=${encodeURIComponent(text)}`
      );
      // ADAPTA ESTA PARTE SEGÚN LA RESPUESTA REAL DE LA API
      let results = searchRes.data.data || searchRes.data.result || searchRes.data;
      let item = Array.isArray(results) ? results[0] : results;
      spotifyUrl = item?.url || item?.link || item?.external_urls?.spotify;

      if (!spotifyUrl) {
        throw new Error('No se pudo encontrar un link de Spotify para esa búsqueda.');
      }
    }

    // DESCARGA POR LINK (sea el que mandó o el que buscamos)
    const downloadRes = await axios.get(
      `${BASE_URL}?url=${encodeURIComponent(spotifyUrl)}`
    );

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

    const caption = `╭────═[ PANTHEON BOT ]═─────⋆
│ 🎵 *TÍTULO:* ${title}
│ 🎙️ *ARTISTA:* ${author}
│ ⏳ *DURACIÓN:* ${formatTime(duration)}
╰───────────═┅═──────────`;

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

    await conn.sendMessage(m.chat, {
      audio: { url: download },
      fileName: `${title}.mp3`,
      mimetype: 'audio/mpeg'
    }, { quoted: m });

    await m.react?.('✅');

  } catch (e) {
    console.error('Error en Spotify:', e);
    await m.react?.('❌');
    await m.reply(`╭────═[ ERROR ]═─────⋆
│ ${e.message}
╰───────────═┅═──────────`);
  }
};

handler.command = ['spotify', 'music'];
export default handler;
