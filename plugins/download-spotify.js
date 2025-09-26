import fetch from 'node-fetch';
import yts from 'yt-search';

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) {
    await m.reply(`*🎵 Por favor, ingresa el nombre o enlace de una canción de Spotify.*\nEjemplo:\n${usedPrefix + command} https://open.spotify.com/track/5TFD2bmFKGhoCRbX61nXY5\nO solo texto:\n${usedPrefix + command} Ponte bonita - Cris mj`);
    return;
  }

  await m.react('⌛');

  try {
    let url = text.trim();
    const isSpotifyUrl = /^https?:\/\/open\.spotify\.com\/track\/[a-zA-Z0-9]+/.test(url);

    if (!isSpotifyUrl) {
      // Si no es URL válida, buscar en YouTube y usar el primer resultado para descarga directa vía url
      const searchResults = await yts(text);
      if (!searchResults.videos.length) throw new Error('No se encontraron resultados para tu búsqueda');
      url = searchResults.videos[0].url;
    }

    const apiUrl = `https://delirius-apiofc.vercel.app/download/spotifydl?url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!data || !data.result || !data.result.url) {
      throw new Error('No se pudo obtener el audio desde la API.');
    }

    const { url: audioUrl, title, thumbnail } = data.result;

    if (thumbnail) {
      await conn.sendMessage(m.chat, {
        image: { url: thumbnail },
        caption: `🎵 *${title}*\n\n🔗 [Link](${url})`,
        footer: 'Delirius Spotify Downloader',
        parseMode: 'Markdown',
      }, { quoted: m });
    }

    await conn.sendMessage(m.chat, {
      audio: { url: audioUrl },
      mimetype: 'audio/mpeg',
      fileName: `${title}.mp3`,
    }, { quoted: m });

    await m.react('✅');
  } catch (error) {
    console.error('Error al obtener audio via Delirius API:', error);
    await m.react('❌');
    await m.reply(`❌ Error al obtener el audio:\n${error.message}`);
  }
};

handler.help = ['spotify <url|texto>'];
handler.tags = ['descargas'];
handler.command = ['spotify', 'spotifydl', 'spdl'];

export default handler;
