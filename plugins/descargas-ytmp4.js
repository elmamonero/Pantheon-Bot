import fetch from 'node-fetch';
import yts from 'yt-search';

const youtubeRegexID = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/;
const botname = "Pantheon Bot";

function formatViews(views) {
  if (!views) return "No disponible";
  if (views >= 1000000000) return (views / 1000000000).toFixed(1) + "B";
  if (views >= 1000000) return (views / 1000000).toFixed(1) + "M";
  if (views >= 1000) return (views / 1000).toFixed(1) + "k";
  return views.toString();
}

const handler = async (m, { conn, text = '', usedPrefix, command }) => {
  try {
    if (!text.trim()) {
      await conn.reply(m.chat, `❀ Por favor, ingresa el nombre o enlace del video de YouTube.`, m);
      return;
    }

    await m.react('🕒');

    // Búsqueda del video
    const videoIdMatch = text.match(youtubeRegexID);
    const searchQuery = videoIdMatch ? `https://www.youtube.com/watch?v=${videoIdMatch[1]}` : text;
    const searchResult = await yts(searchQuery);
    const videoInfo = searchResult.videos[0];

    if (!videoInfo) {
      await m.react('✖️');
      await m.reply('✧ No se encontraron resultados para tu búsqueda.', m);
      return;
    }

    const { title, thumbnail, timestamp, views, ago, url } = videoInfo;

    // Mensaje de información (caption)
    const infoMessage = `「✦」Descargando *Video*\n\n> 📺 Canal ✦ *${videoInfo.author.name}*\n> 👀 Vistas ✦ *${formatViews(views)}*\n> ⏳ Duración ✦ *${timestamp}*\n> 📆 Publicado ✦ *${ago}*\n> 🖇️ Link ✦ ${url}\n\n*${botname}*`;

    // Enviamos la miniatura con la info primero
    await conn.sendMessage(m.chat, {
      image: { url: thumbnail },
      caption: infoMessage,
    }, { quoted: m });

    // Llamada a la API de Stellarwa
    // Usamos el ID del video para asegurar que la API encuentre el correcto
    const apiUrl = `https://api.stellarwa.xyz/dl/ytmp4?url=${encodeURIComponent(url)}&quality=360&key=GataDios`;
    
    console.log('Llamando a API Stellarwa Video:', apiUrl);

    const response = await fetch(apiUrl);
    const json = await response.json();

    // Según el JSON que pasaste: json.data.dl es el link directo
    if (!json.status || !json.data || !json.data.dl) {
      await m.react('✖️');
      await conn.reply(m.chat, '✦ Error: La API no devolvió un enlace de descarga (dl).', m);
      return;
    }

    const videoUrl = json.data.dl;

    // Enviar el archivo de video
    await conn.sendMessage(m.chat, {
      video: { url: videoUrl },
      fileName: `${title}.mp4`,
      mimetype: 'video/mp4',
      caption: `✅ *${title}*\n\n*${botname}*`
    }, { quoted: m });

    await m.react('✅');

  } catch (error) {
    console.error('Error en ytmp4:', error);
    await m.react('✖️');
    await m.reply(`✦ Ocurrió un error inesperado:\n${error.message}`, m);
  }
};

handler.command = ['play2', 'ytmp4'];
handler.tags = ['descargas'];
handler.help = ['play2 <nombre|URL>', 'ytmp4 <nombre|URL>'];

export default handler;
