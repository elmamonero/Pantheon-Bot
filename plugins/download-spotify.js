import axios from 'axios';

// Nueva API proporcionada
const BASE_API = 'https://api.delirius.store/download/spotifydl?url=https://open.spotify.com/track/37ZtpRBkHcaq6hHy0X98zn';

let handler = async (m, { conn, text, usedPrefix, command }) => {
  // Ignorar mensaje propio para evitar bucle
  if (m.fromMe) return;

  if (!text) {
    await conn.sendMessage(
      m.chat,
      {
        text:
          `*🎵 Comando Spotify*\n\nUsa:\n` +
          `• ${usedPrefix + command} <nombre de canción o enlace>\n\n` +
          `Ejemplos:\n` +
          `• ${usedPrefix + command} TWICE TT\n` +
          `• ${usedPrefix + command} https://open.spotify.com/track/0`
      },
      { quoted: m }
    );
    return; 
  }

  await m.react?.('⌛️');

  try {
    const isSpotifyUrl = /https?:\/\/open\.spotify\.com\/(track|album|playlist|episode)\/[A-Za-z0-9]+/i.test(text);
    let trackUrl = text.trim();
    let picked = null;

    if (!isSpotifyUrl) {
      // Búsqueda usando la NUEVA API
      // Nota: He mantenido la estructura de parámetros ?q=, si tu API usa otra, dímelo.
      const sURL = `${BASE_API}/search?q=${encodeURIComponent(text.trim())}`;
      const { data: sRes } = await axios.get(sURL, { timeout: 25000 });

      if (!sRes?.status || !Array.isArray(sRes?.data) || sRes.data.length === 0) {
          throw new Error('No se encontraron resultados.');
      }

      picked = sRes.data[0];
      trackUrl = picked.url;
    }

    // Descargar usando la NUEVA API
    const dURL = `${BASE_API}/download?url=${encodeURIComponent(trackUrl)}`;
    const { data: dRes } = await axios.get(dURL, { timeout: 25000 });

    if (!dRes?.status || !dRes?.data?.url) {
      throw new Error('No se pudo obtener el enlace de descarga.');
    }

    const {
      title = picked?.title || 'Desconocido',
      author = picked?.artist || 'Desconocido',
      image = picked?.image || '',
      duration = 0,
      url: download
    } = dRes.data || {};

    const toMMSS = (ms) => {
      const totalSec = Math.floor((+ms || 0) / 1000);
      const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
      const ss = String(totalSec % 60).padStart(2, '0');
      return `${mm}:${ss}`;
    };

    const mmss = duration && Number.isFinite(+duration) ? toMMSS(duration) : (picked?.duration || '—:—');
    const cover = image || picked?.image || '';

    const info = `🪼 *Título:*\n${title}\n🪩 *Artista:*\n${author}\n⏳ *Duración:*\n${mmss}\n🔗 *Enlace:*\n${trackUrl}\n\n✨ Spotify Downloader`;

    await conn.sendMessage(
      m.chat,
      {
        text: info,
        contextInfo: {
          forwardingScore: 9999999,
          isForwarded: true,
          externalAdReply: {
            showAdAttribution: true,
            containsAutoReply: true,
            renderLargerThumbnail: true,
            title: 'Spotify Music',
            mediaType: 1,
            thumbnailUrl: cover,
            mediaUrl: download,
            sourceUrl: download
          }
        }
      },
      { quoted: m }
    );

    await conn.sendMessage(
      m.chat,
      {
        audio: { url: download },
        fileName: `${title}.mp3`,
        mimetype: 'audio/mpeg'
      },
      { quoted: m }
    );

    await m.react?.('✅');

  } catch (e) {
    console.log('❌ Error spotify-reemplazo:', e?.message || e);
    await m.react?.('❌');
    await m.reply('❌ Ocurrió un error al procesar tu solicitud con la nueva API.');
  }
};

handler.command = ['spotify', 'music'];
export default handler;
