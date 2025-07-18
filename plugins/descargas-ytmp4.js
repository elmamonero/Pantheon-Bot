import axios from 'axios';
import fs from 'fs';
import path from 'path';

const handler = async (m, { conn, args }) => {
  if (!args[0]) return m.reply('Por favor, ingresa una URL de un video de YouTube');
  const url = args[0];

  if (!/(youtube\.com|youtu\.be)/.test(url)) 
    return m.reply("⚠️ Ingresa un link válido de YouTube.");

  try {
    await m.react('🕒');
    // 1. Consultar la API de Vreden para obtener el video
    const { data } = await axios.get(`https://api.vreden.my.id/api/ytmp4?url=${encodeURIComponent(url)}`);

    if (!data.result?.download?.status) {
      await m.react('✖️');
      return m.reply("*✖️ Error:* No se pudo obtener el video");
    }

    // 2. Extraer los datos relevantes
    const title = data.result.metadata.title || "video";
    const videoUrl = data.result.download.url;
    const fileName = data.result.download.filename || `${title}.mp4`;
    const thumbnail = data.result.metadata.thumbnail || data.result.metadata.image;

    // 3. Descargar el archivo MP4 a directorio temporal
    const dest = path.join('/tmp', `${Date.now()}_${fileName.replace(/[\\/\s]/g, '_')}`);
    const response = await axios.get(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://youtube.com'
      },
      responseType: 'stream'
    });
    const writer = fs.createWriteStream(dest);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // 4. Enviar el video al chat
    await conn.sendMessage(m.chat, {
      video: fs.readFileSync(dest),
      mimetype: 'video/mp4',
      fileName,
      contextInfo: {
        externalAdReply: {
          title,
          body: "Descargar MP4 de YouTube",
          thumbnailUrl: thumbnail,
          mediaUrl: url
        }
      }
    }, { quoted: m });

    fs.unlinkSync(dest); // Borra temporal al terminar

    await m.react('✅');
  } catch (e) {
    console.error('Error al descargar MP4:', e, e.response?.data);
    await m.react('✖️');
    m.reply("⚠️ La descarga ha fallado, posible error en la API o el video es muy pesado.");
  }
};

handler.help = ['ytmp4'];
handler.command = ['ytmp4'];
handler.tags = ['download'];

export default handler;
