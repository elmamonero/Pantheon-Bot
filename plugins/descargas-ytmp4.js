import axios from 'axios';
import fs from 'fs';
import path from 'path';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB - tamaño máximo para envío (WhatsApp suele limitar)
const TEMP_DIR = '/tmp'; // carpeta temporal, ajustar si usas otro SO

// Validar url de YouTube
const isValidYouTubeUrl = (url) => /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/.test(url);

const cleanFileName = (name) => name.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_');

const getVideoDataFromVreden = async (url) => {
  const apiUrl = `https://api.vreden.my.id/api/ytmp4?url=${encodeURIComponent(url)}`;
  const { data } = await axios.get(apiUrl);
  if (!data?.result?.download?.status) {
    throw new Error('No se pudo obtener la descarga del video');
  }
  return data.result; // contiene metadata y download info
};

const downloadVideo = async (videoUrl, dest) => {
  const response = await axios.get(videoUrl, {
    responseType: 'stream',
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Referer': 'https://youtube.com',
    },
    timeout: 30000,
  });

  await new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(dest);
    response.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });

  return dest;
};

let handler = async (m, { conn, args }) => {
  if (!args[0]) return m.reply('Por favor, proporciona una URL de YouTube.');

  let url = args[0];
  if (!isValidYouTubeUrl(url)) return m.reply('⚠️ URL inválida de YouTube.');

  try {
    await m.react('🕒');
    const videoData = await getVideoDataFromVreden(url);

    const title = videoData.metadata.title || 'video';
    const thumbnail = videoData.metadata.thumbnail || videoData.metadata.image;
    const videoUrl = videoData.download.url;
    const fileNameRaw = videoData.download.filename || `${title}.mp4`;
    const fileName = cleanFileName(fileNameRaw);

    // Descargar video temporalmente
    const destPath = path.join(TEMP_DIR, `${Date.now()}_${fileName}`);

    // Descargar video
    await downloadVideo(videoUrl, destPath);

    // Verificar tamaño para no enviar videos muy grandes
    const stats = fs.statSync(destPath);
    if (stats.size > MAX_FILE_SIZE) {
      fs.unlinkSync(destPath);
      await m.react('✖️');
      return m.reply('⚠️ El video es demasiado grande para enviar (más de 100MB).');
    }

    // Enviar video (usando stream para ahorro memoria)
    await conn.sendMessage(m.chat, {
      video: fs.createReadStream(destPath),
      mimetype: 'video/mp4',
      fileName,
      contextInfo: {
        externalAdReply: {
          title,
          body: 'Descargar MP4 de YouTube',
          thumbnailUrl: thumbnail,
          mediaUrl: url,
        }
      }
    }, { quoted: m });

    fs.unlinkSync(destPath);
    await m.react('✅');
  } catch (e) {
    console.error('Error en handler ytmp4:', e);
    await m.react('✖️');
    m.reply('⚠️ No se pudo descargar el video o ocurrió un error. Intenta con otro enlace.');
  }
};

handler.help = ['ytmp4 <url>'];
handler.command = ['ytmp4'];
handler.tags = ['download'];

export default handler;
