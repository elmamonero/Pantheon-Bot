import fetch from 'node-fetch';
import yts from 'yt-search';

const youtubeRegexID = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/;
const botname = "Pantheon Bot";

function formatViews(views) {
  if (!views) return "No disponible";
  if (views >= 1000000000) return (views / 1000000000).toFixed(1) + "B (" + views.toLocaleString() + ")";
  if (views >= 1000000) return (views / 1000000).toFixed(1) + "M (" + views.toLocaleString() + ")";
  if (views >= 1000) return (views / 1000).toFixed(1) + "k (" + views.toLocaleString() + ")";
  return views.toString();
}

const handler = async (m, { conn, text = '', usedPrefix, command }) => {
  try {
    if (!text.trim()) {
      await conn.reply(m.chat, `❀ Por favor, ingresa el nombre o enlace del video de YouTube que quieres descargar.`, m);
      return;
    }

    await m.react('🕒');

    // Búsqueda en YouTube
    const videoIdMatch = text.match(youtubeRegexID);
    const searchQuery = videoIdMatch ? `https://www.youtube.com/watch?v=${videoIdMatch[1]}` : text;
    const searchResult = await yts(searchQuery);

    let videoInfo = videoIdMatch 
      ? (searchResult.all.find(v => v.videoId === videoIdMatch[1]) || searchResult.videos[0])
      : searchResult.videos[0];

    if (!videoInfo) {
      await m.react('✖️');
      await m.reply('✧ No se encontraron resultados para tu búsqueda.', m);
      return;
    }

    const { title, thumbnail, timestamp, views, ago, url, author } = videoInfo;
    const vistas = formatViews(Number(views));
    const canal = author.name || 'Desconocido';

    const infoMessage = `「✦」Descargando *Video* > 📺 Canal ✦ *${canal}*
> 👀 Vistas ✦ *${vistas}*
> ⏳ Duración ✦ *${timestamp}*
> 📆 Publicado ✦ *${ago}*
> 🖇️ Link ✦ ${url}`;

    // Enviar información previa
    await conn.sendMessage(m.chat, {
      image: { url: thumbnail },
      caption: infoMessage,
      contextInfo: {
        externalAdReply: {
          title: botname,
          body: "Descargador de Video",
          mediaType: 1,
          sourceUrl: url,
          thumbnailUrl: thumbnail,
          renderLargerThumbnail: true,
        },
      },
    }, { quoted: m });

    // Llamada a la API de Stellarwa
    const apiUrl = `https://api.stellarwa.xyz/dl/ytmp4?url=${encodeURIComponent(url)}&quality=360&key=GataDios`;
    
    console.log('Llamando a API Stellarwa Video:', apiUrl);

    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`Error en la API: ${response.status}`);

    const json = await response.json();

    // Verificamos la estructura json.status y json.data
    if (!json.status || !json.data || !json.data.download) {
      await m.react('✖️');
      await conn.reply(m.chat, '✦ No se pudo obtener el enlace de descarga del video.', m);
      return;
    }

    // Enviar el video mp4
    await conn.sendMessage(m.chat, {
      video: { url: json.data.download },
      fileName: `${title}.mp4`,
      mimetype: 'video/mp4',
      caption: `✅ *${title}*\n\n*${botname}*`
    }, { quoted: m });

    await m.react('✅');

  } catch (error) {
    console.error(error);
    await m.react('✖️');
    await m.reply(`✦ Ocurrió un error al descargar el video:\n${error.message || error}`, m);
  }
};

handler.command = ['play2', 'ytmp4'];
handler.tags = ['descargas'];
handler.help = ['play2 <nombre|URL>', 'ytmp4 <nombre|URL>'];

export default handler;
