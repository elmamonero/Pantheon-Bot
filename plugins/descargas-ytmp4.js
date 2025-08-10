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

    // Obtener videoId de la URL o usar texto para buscar
    const videoIdMatch = text.match(youtubeRegexID);
    const searchQuery = videoIdMatch ? `https://youtu.be/${videoIdMatch[1]}` : text;
    const searchResult = await yts(searchQuery);

    let videoInfo;
    if (videoIdMatch) {
      videoInfo = searchResult.all.find(v => v.videoId === videoIdMatch[1]) || searchResult.videos.find(v => v.videoId === videoIdMatch[1]);
    }

    videoInfo = videoInfo || (searchResult.all && searchResult.all[0]) || (searchResult.videos && searchResult.videos[0]);

    if (!videoInfo) {
      await m.reply('✧ No se encontraron resultados para tu búsqueda.', m);
      return;
    }

    // Asignaciones sin operador ||= para compatibilidad
    let title = videoInfo.title ? videoInfo.title : 'No encontrado';
    let thumbnail = videoInfo.thumbnail ? videoInfo.thumbnail : '';
    let timestamp = videoInfo.timestamp ? videoInfo.timestamp : 'No disponible';
    let views = videoInfo.views ? videoInfo.views : 0;
    let ago = videoInfo.ago ? videoInfo.ago : 'No disponible';
    let url = videoInfo.url ? videoInfo.url : 'No disponible';
    let author = videoInfo.author ? videoInfo.author : {};

    const vistas = formatViews(Number(views));
    const canal = author.name ? author.name : 'Desconocido';

    // Obtener la miniatura (si tu bot lo soporta)
    let thumb = null;
    if (thumbnail && conn.getFile) {
      const fileInfo = await conn.getFile(thumbnail);
      thumb = fileInfo?.data || null;
    }

    const infoMessage =
`「✦」Descargando *<${title}>*

> 📺 Canal ✦ *${canal}*
> 👀 Vistas ✦ *${vistas}*
> ⏳ Duración ✦ *${timestamp}*
> 📆 Publicado ✦ *${ago}*
> 🖇️ Link ✦ ${url}`;

    const context = {
      contextInfo: {
        externalAdReply: {
          title: botname,
          body: dev,
          mediaType: 1,
          previewType: 0,
          mediaUrl: url,
          sourceUrl: url,
          thumbnail: thumb,
          renderLargerThumbnail: true,
        },
      },
    };

    await conn.reply(m.chat, infoMessage, m, context);

    const apikey = "sylphy-eab7"; // Tu API key oficial
    const apiUrl = `https://api.sylphy.xyz/download/ytmp4?url=${encodeURIComponent(url)}&apikey=${apikey}`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
      await conn.reply(m.chat, '✦ Error en la solicitud a la API Sylphy.', m);
      return;
    }

    const json = await response.json();

    if (!json.res || !json.res.url) {
      await conn.reply(m.chat, '✦ No se pudo obtener el enlace del video para descargar.', m);
      return;
    }

    // Enviar el video mp4
    await conn.sendFile(
      m.chat,
      json.res.url,
      `${json.res.title || title}.mp4`,
      title,
      m
    );

    return;

  } catch (error) {
    console.error(error);
    await m.reply(`✦ Ocurrió un error al descargar el video:\n${error.message || error}`, m);
  }
};

handler.command = ['play2', 'ytmp4'];
handler.tags = ['descargas'];
handler.help = ['play2 <nombre|URL>', 'ytmp4 <nombre|URL>'];

export default handler;
