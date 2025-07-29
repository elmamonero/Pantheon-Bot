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
    console.log(`Solicitando video: ${url}`);

    // 1. Consultar la API de Vreden para obtener el video
    const { data } = await axios.get(`https://api.vreden.my.id/api/ytmp4?url=${encodeURIComponent(url)}`);

    if (!data.result?.download?.status) {
      await m.react('✖️');
      return m.reply("*✖️ Error:* No se pudo obtener el video");
    }

    // 2. Extraer los datos relevantes
    const title = data.result.metadata.title || "video";
    const videoUrl = data.result.download.url;
    const fileNameRaw = data.result.download.filename || `${title}.mp4`;
    // Limpieza básica del nombre para evitar caracteres inválidos
    const fileName = fileNameRaw.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_');
    const thumbnail = data.result.metadata.thumbnail || data.result.metadata.image;

    console.log(`Título: ${title}`);
    console.log(`URL de descarga: ${videoUrl}`);
    console.log(`Archivo: ${fileName}`);

    // 3. Descargar el archivo MP4 a directorio temporal
    const dest = path.join('/tmp', `${Date.now()}_${fileName}`);
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

    const stats = fs.statSync(dest);
    console.log(`Video guardado: ${dest} (tamaño ${stats.size} bytes)`);

    // Validar límite aproximado de tamaño permitido (generalmente WhatsApp: <100MB)
    const MAX_SIZE = 100 * 1024 * 1024;
    if (stats.size > MAX_SIZE) {
      fs.unlinkSync(dest);
      await m.react('✖️');
      return m.reply('⚠️ El archivo es demasiado grande para enviarlo por WhatsApp.');
    }

    // 4. Enviar el video al chat usando stream para menor uso de memoria
    await conn.sendMessage(m.chat, {
      video: fs.createReadStream(dest),
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

    fs.unlinkSync(dest); // borra archivo temporal

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
