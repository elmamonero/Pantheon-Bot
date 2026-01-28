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

    await conn.sendMessage(m.chat, {
      image: { url: thumbnail },
      caption: `「✦」Descargando *Video*\n\n> 📺 Canal ✦ *${videoInfo.author.name}*\n> ⏳ Duración ✦ *${timestamp}*\n\n*Procesando con enlace directo...*`,
    }, { quoted: m });

    // Llamada a la API
    const apiUrl = `https://api.stellarwa.xyz/dl/ytmp4?url=${encodeURIComponent(url)}&quality=360&key=GataDios`;
    const response = await fetch(apiUrl);
    const json = await response.json();

    if (!json.status || !json.data || !json.data.dl) {
      await m.react('✖️');
      return m.reply('✦ Error: El servidor de la API rechazó la solicitud.');
    }

    const videoUrl = json.data.dl;

    // Intentamos enviar directamente usando el servidor de WhatsApp como puente
    // Esto suele saltarse el 403 del servidor local
    await conn.sendMessage(m.chat, {
      video: { url: videoUrl },
      fileName: `${title}.mp4`,
      mimetype: 'video/mp4',
      caption: `✅ *${title}*\n\n*${botname}*`
    }, { quoted: m });

    await m.react('✅');

  } catch (error) {
    console.error('Error detallado:', error);
    
    // Si falla por 403, intentamos un último método: Stream simple con fetch
    try {
        const videoUrlFallback = (await (await fetch(`https://api.stellarwa.xyz/dl/ytmp4?url=${encodeURIComponent(text)}&quality=360&key=GataDios`)).json()).data.dl;
        
        await conn.sendMessage(m.chat, {
            document: { url: videoUrlFallback },
            mimetype: 'video/mp4',
            fileName: `${title || 'video'}.mp4`,
            caption: `*Nota:* Se envió como documento debido a restricciones de YouTube.\n\n*${botname}*`
        }, { quoted: m });
        await m.react('✅');
    } catch (e) {
        await m.react('✖️');
        m.reply(`⚠️ No fue posible descargar este video debido a las restricciones de YouTube (Error 403). Intenta con otro enlace.`);
    }
  }
};

handler.command = ['play2', 'ytmp4'];
handler.tags = ['descargas'];
handler.help = ['play2 <nombre|URL>', 'ytmp4 <nombre|URL>'];

export default handler;
