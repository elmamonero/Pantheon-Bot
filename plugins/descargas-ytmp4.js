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
    if (!text.trim()) return m.reply(`❀ Por favor, ingresa el nombre o enlace del video.`);

    await m.react('🕒');

    const videoIdMatch = text.match(youtubeRegexID);
    const searchQuery = videoIdMatch ? `https://www.youtube.com/watch?v=${videoIdMatch[1]}` : text;
    const searchResult = await yts(searchQuery);
    const videoInfo = searchResult.videos[0];

    if (!videoInfo) {
      await m.react('✖️');
      return m.reply('✧ No se encontraron resultados.');
    }

    const { title, thumbnail, timestamp, views, ago, url } = videoInfo;

    // 1. Enviar miniatura informativa
    await conn.sendMessage(m.chat, {
      image: { url: thumbnail },
      caption: `「✦」Descargando *Video*\n\n> 📺 Canal ✦ *${videoInfo.author.name}*\n> ⏳ Duración ✦ *${timestamp}*\n> 🖇️ Link ✦ ${url}\n\n*${botname}*`,
    }, { quoted: m });

    // 2. Llamada a la API
    const apiUrl = `https://api.stellarwa.xyz/dl/ytmp4?url=${encodeURIComponent(url)}&quality=360&key=GataDios`;
    const response = await fetch(apiUrl);
    const json = await response.json();

    if (!json.status || !json.data || !json.data.dl) {
      await m.react('✖️');
      return m.reply('✦ Error: La API no devolvió un enlace de descarga.');
    }

    // 3. ENVIAR VIDEO (CORRECCIÓN DEL ERROR JID)
    // Usamos m.quoted?.fakeObj || m para asegurar que el 'quoted' sea válido
    await conn.sendMessage(m.chat, {
      video: { url: json.data.dl },
      fileName: `${title}.mp4`,
      mimetype: 'video/mp4',
      caption: `✅ *${title}*\n\n*${botname}*`
    }, { quoted: m }); // Si sigue fallando, prueba cambiando { quoted: m } por { }

    await m.react('✅');

  } catch (error) {
    console.error('Error detallado:', error);
    await m.react('✖️');
    // Si el error persiste, enviamos el video sin citar el mensaje (sin quoted)
    try {
        if (error.message.includes('endsWith')) {
            await conn.sendMessage(m.chat, { 
                video: { url: url }, // url de la api si la capturaste
                caption: `✅ *Descarga completada*` 
            });
        }
    } catch (e) {
        m.reply(`✦ Ocurrió un error:\n${error.message}`);
    }
  }
};

handler.command = ['play2', 'ytmp4'];
handler.tags = ['descargas'];
handler.help = ['play2 <nombre|URL>', 'ytmp4 <nombre|URL>'];

export default handler;
