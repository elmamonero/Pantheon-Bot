import axios from 'axios';
import fs from 'fs';
import path from 'path';
import yts from 'yt-search';
import fetch from 'node-fetch'; // para la API Sylphy

const handler = async (m, { conn, args }) => {
  if (!args[0]) return m.reply('Por favor, ingresa un nombre o URL de un video de YouTube');

  // Determinar URL o buscar video
  let url = args[0];
  const isUrl = /(youtube\.com|youtu\.be)/.test(url);
  if (!isUrl) {
    const searchResults = await yts(args.join(' '));
    if (!searchResults.videos.length) return m.reply('No se encontraron resultados para tu búsqueda');
    url = searchResults.videos[0].url;
  }

  // Obtener info de video para mostrar
  const searchInfo = await yts(url);
  const video = searchInfo.videos[0];
  if (!video) return m.reply('No se pudo obtener información del video');

  // Preparar mensaje inicial con opciones
  const infoText =
`🎬 *${video.title}*

📺 Canal: ${video.author.name || 'Desconocido'}
⏳ Duración: ${video.timestamp}
👁️ Vistas: ${video.views.toLocaleString()}

Responde con:
*1* para descargar Audio
*2* para descargar Video`;

  // Enviar mensaje con opción de respuesta
  const sentMsg = await conn.reply(m.chat, infoText, m);

  // Esperar respuesta (timeout 30 segundos), solo "1" o "2"
  try {
    const response = await conn.waitMessage(m.chat, 30000, (msg) => {
      return msg.quoted && msg.quoted.id === sentMsg.id && ['1', '2'].includes(msg.text?.trim());
    });

    if (!response) {
      await conn.sendMessage(m.chat, { text: '⏳ Tiempo agotado: no se recibió una respuesta válida.' }, { quoted: m });
      return;
    }

    const choice = response.text.trim();

    if (choice === '1') {
      // Descargar audio con API Vreden

      await m.react('🕒');

      const { data } = await axios.get(`https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(url)}`);

      if (!data.result?.download?.status) {
        await m.react('✖️');
        return m.reply('*✖️ Error:* No se pudo obtener el mp3');
      }

      const title = data.result.metadata.title || 'audio';
      const audioUrl = data.result.download.url;
      const fileName = data.result.download.filename || `${title}.mp3`;
      const thumbnail = data.result.metadata.thumbnail || data.result.metadata.image;

      const dest = path.join('/tmp', `${Date.now()}_${fileName.replace(/[\\/\s]/g, '_')}`);
      const responseStream = await axios.get(audioUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Referer': 'https://youtube.com',
        },
        responseType: 'stream',
      });
      const writer = fs.createWriteStream(dest);
      responseStream.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      // Enviar imagen con info
      await conn.sendMessage(m.chat, {
        image: { url: thumbnail },
        caption: `🎵 *${title}*\n\n📎 URL: ${url}\n\nDescarga MP3 desde YouTube`,
        footer: 'Pantheon Bot',
        contextInfo: {
          externalAdReply: {
            title,
            body: 'Descargar MP3 de YouTube',
            thumbnailUrl: thumbnail,
            mediaUrl: url,
          },
        },
      }, { quoted: m });

      // Enviar el audio
      await conn.sendMessage(m.chat, {
        audio: fs.readFileSync(dest),
        mimetype: 'audio/mpeg',
        fileName,
      }, { quoted: m });

      fs.unlinkSync(dest);
      await m.react('✅');

    } else if (choice === '2') {
      // Descargar video con API Sylphy

      await m.react('🕒');

      const apikey = 'sylphy-eab7';
      const apiUrl = `https://api.sylphy.xyz/download/ytmp4?url=${encodeURIComponent(url)}&apikey=${apikey}`;

      const response = await fetch(apiUrl);
      if (!response.ok) {
        await m.react('✖️');
        return m.reply('✖️ Error al obtener el video.');
      }

      const json = await response.json();

      if (!json.res || !json.res.url) {
        await m.react('✖️');
        return m.reply('✖️ No se pudo obtener el enlace del video para descargar.');
      }

      // Enviar video
      await conn.sendFile(
        m.chat,
        json.res.url,
        `${json.res.title || video.title}.mp4`,
        video.title,
        m
      );

      await m.react('✅');

    } else {
      await m.reply('Respuesta no válida, cancela la operación.');
      return;
    }
  } catch (e) {
    await m.reply('⚠️ No se recibió respuesta a tiempo, operación cancelada.');
    return;
  }
};

handler.command = ['play'];
handler.tags = ['descargas'];
handler.help = ['play <nombre|URL>'];

export default handler;
