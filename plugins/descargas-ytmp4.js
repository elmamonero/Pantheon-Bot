import fetch from 'node-fetch';
import yts from 'yt-search';
import axios from 'axios';

const youtubeRegexID = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/;
const botname = "Pantheon Bot";

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

    const { title, thumbnail, timestamp, url } = videoInfo;

    // Enviar mensaje de espera
    await conn.sendMessage(m.chat, {
      image: { url: thumbnail },
      caption: `「✦」Descargando *Video*\n\n> 📺 Canal ✦ *${videoInfo.author.name}*\n> ⏳ Duración ✦ *${timestamp}*\n\n*Cargando archivo... por favor espere.*`,
    }, { quoted: m });

    // API Stellarwa
    const apiUrl = `https://api.stellarwa.xyz/dl/ytmp4?url=${encodeURIComponent(url)}&quality=360&key=GataDios`;
    const response = await fetch(apiUrl);
    const json = await response.json();

    if (!json.status || !json.data || !json.data.dl) {
      await m.react('✖️');
      return m.reply('✦ Error: La API no devolvió un enlace de descarga válido.');
    }

    const videoUrl = json.data.dl;

    // --- SOLUCIÓN AL ERROR 403 ---
    // Descargamos el video como Buffer para saltar el bloqueo de Google
    const videoStream = await axios({
      method: 'get',
      url: videoUrl,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
        'Referer': 'https://youtube.com/'
      }
    });

    const videoBuffer = Buffer.from(videoStream.data);

    // Enviar el video como Buffer (evita el error de JID y el 403)
    await conn.sendMessage(m.chat, {
      video: videoBuffer,
      fileName: `${title}.mp4`,
      mimetype: 'video/mp4',
      caption: `✅ *${title}*\n\n*${botname}*`
    }, { quoted: m });

    await m.react('✅');

  } catch (error) {
    console.error('Error detallado:', error);
    await m.react('✖️');
    m.reply(`✦ Ocurrió un error al procesar el video. Intenta de nuevo.\n\n*Error:* ${error.message}`);
  }
};

handler.command = ['play2', 'ytmp4'];
handler.tags = ['descargas'];
handler.help = ['play2 <nombre|URL>', 'ytmp4 <nombre|URL>'];

export default handler;
