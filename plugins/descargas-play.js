import axios from 'axios';
import fs from 'fs';
import path from 'path';
import yts from 'yt-search';
import fetch from 'node-fetch';

// Control de sesiones activas por usuario para invalidar previas sin aviso
const sesionesActivas = new Map();

const handler = async (m, { conn, args }) => {
  const userId = m.sender;

  if (!args[0]) return m.reply('Por favor, ingresa un nombre o URL de un video de YouTube');

  // Cancelar sesión previa sin avisar
  if (sesionesActivas.has(userId)) {
    sesionesActivas.get(userId).cancelled = true;
    sesionesActivas.delete(userId);
  }
  // Nueva sesión activa
  const session = { cancelled: false };
  sesionesActivas.set(userId, session);

  // Procesar URL o búsqueda
  let url = args[0];
  const isUrl = /(youtube\.com|youtu\.be)/.test(url);
  if (!isUrl) {
    const resultados = await yts(args.join(' '));
    if (!resultados.videos.length) {
      sesionesActivas.delete(userId);
      return m.reply('No se encontraron resultados para tu búsqueda');
    }
    url = resultados.videos[0].url;
  }

  // Obtener info para mostrar
  const info = await yts(url);
  const video = info.videos[0];
  if (!video) {
    sesionesActivas.delete(userId);
    return m.reply('No se pudo obtener información del video');
  }

  const infoText =
`🎬 *${video.title}*

📺 Canal: ${video.author.name || 'Desconocido'}
⏳ Duración: ${video.timestamp}
👁️ Vistas: ${video.views.toLocaleString()}

Responde *al mensaje* con:
*1* para descargar Audio
*2* para descargar Video`;

  // Enviar mensaje y guardar info de mensaje enviado
  const sentMsg = await conn.reply(m.chat, infoText, m);

  try {
    // Tiempo muy alto (24h) para esperar sin cancelar por tiempo
    const LONG_TIMEOUT = 86400000;

    while (true) {
      const response = await conn.waitMessage(m.chat, LONG_TIMEOUT, (msg) => {
        return (
          msg.quoted &&
          msg.quoted.id === sentMsg.id &&
          ['1', '2'].includes(msg.text?.trim()) &&
          msg.sender === userId
        );
      });

      // Verificar si sesión sigue activa
      if (!sesionesActivas.has(userId) || sesionesActivas.get(userId).cancelled) {
        continue; // Ignorar respuesta antigua y seguir esperando
      }

      sesionesActivas.delete(userId); // Se procesa esta respuesta, sesión concluida

      const choice = response.text.trim();

      if (choice === '1') {
        // Descargar y enviar AUDIO vía API Vreden
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

        // Enviar audio
        await conn.sendMessage(m.chat, {
          audio: fs.readFileSync(dest),
          mimetype: 'audio/mpeg',
          fileName,
        }, { quoted: m });

        fs.unlinkSync(dest);
        await m.react('✅');
        return;

      } else if (choice === '2') {
        // Descargar y enviar VIDEO vía API Sylphy
        await m.react('🕒');

        const apikey = 'sylphy-eab7';
        const apiUrl = `https://api.sylphy.xyz/download/ytmp4?url=${encodeURIComponent(url)}&apikey=${apikey}`;

        const resp = await fetch(apiUrl);
        if (!resp.ok) {
          await m.react('✖️');
          return m.reply('✖️ Error al obtener el video.');
        }
        const json = await resp.json();

        if (!json.res || !json.res.url) {
          await m.react('✖️');
          return m.reply('✖️ No se pudo obtener el enlace del video para descargar.');
        }

        await conn.sendFile(
          m.chat,
          json.res.url,
          `${json.res.title || video.title}.mp4`,
          video.title,
          m
        );

        await m.react('✅');
        return;
      } else {
        await m.reply('Respuesta no válida, operación cancelada.');
        return;
      }
    }
  } catch (e) {
    sesionesActivas.delete(userId); 
    // No envía mensaje de tiempo agotado para evitar ruido
    return;
  }
};

handler.command = ['play'];
handler.tags = ['descargas'];
handler.help = ['play <nombre|URL>'];

export default handler;
