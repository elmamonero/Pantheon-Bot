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

    const videoIdMatch = text.match(youtubeRegexID);
    const searchQuery = videoIdMatch ? `https://www.youtube.com/watch?v=${videoIdMatch[1]}` : text;
    const searchResult = await yts(searchQuery);

    let videoInfo = videoIdMatch 
      ? (searchResult.all.find(v => v.videoId === videoIdMatch[1]) || searchResult.videos[0])
      : searchResult.videos[0];

    if (!videoInfo) {
      await m.react('✖️');
      await m.reply('✧ No se encontraron resultados.', m);
      return;
    }

    const { title, thumbnail, timestamp, views, ago, url, author } = videoInfo;
    const vistas = formatViews(Number(views));
    const canal = author.name || 'Desconocido';

    const infoMessage = `「✦」Descargando *Video*\n\n> 📺 Canal ✦ *${canal}*\n> 👀 Vistas ✦ *${vistas}*\n> ⏳ Duración ✦ *${timestamp}*\n> 📆 Publicado ✦ *${ago}*\n> 🖇️ Link ✦ ${url}`;

    await conn.sendMessage(m.chat, {
      image: { url: thumbnail },
      caption: infoMessage,
    }, { quoted: m });

    // Llamada a la API
    const apiUrl = `https://api.stellarwa.xyz/dl/ytmp4?url=${encodeURIComponent(url)}&quality=360&key=GataDios`;
    console.log('Llamando a API Stellarwa Video:', apiUrl);

    const response = await fetch(apiUrl);
    const json = await response.json();

    /* Ajuste según la respuesta de la API:
       json.data.dl["360p"] es donde suele venir el link de descarga en esta API para video
    */
    let downloadLink = json.data?.download || (json.data?.dl ? json.data.dl["360p"] : null);

    if (!json.status || !downloadLink) {
      await m.react('✖️');
      await conn.reply(m.chat, '✦ No se pudo obtener el enlace de descarga del video. Intenta con otro video o calidad.', m);
      return;
    }

    await conn.sendMessage(m.chat, {
      video: { url: downloadLink },
      fileName: `${title}.mp4`,
      mimetype: 'video/mp4',
      caption: `✅ *${title}*\n\n*${botname}*`
    }, { quoted: m });

    await m.react('✅');

  } catch (error) {
    console.error(error);
    await m.react('✖️');
    await m.reply(`✦ Ocurrió un error:\n${error.message}`, m);
  }
};

handler.command = ['play2', 'ytmp4'];
handler.tags = ['descargas'];
handler.help = ['play2 <nombre|URL>', 'ytmp4 <nombre|URL>'];

export default handler;
