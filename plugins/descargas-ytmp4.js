import axios from 'axios';
import fs from 'fs';
import path from 'path';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB límite
const TEMP_DIR = '/tmp'; // carpeta temporal, cambiar si usas otro sistema

// Valida URL de YouTube (básico)
const isValidYouTubeUrl = (url) =>
  /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/.test(url);

// Limpia nombre para archivo seguro
const cleanFileName = (name) =>
  name.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_');

const downloadVideoFile = async (videoUrl, dest) => {
  const response = await axios.get(videoUrl, {
    responseType: 'stream',
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Referer: 'https://www.youtube.com',
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

  const API_KEY = 'sylphy-eab7'; // Usa tu api key aquí
  const apiEndpoint = `https://api.sylphy.xyz/download/ytmp4?url=${encodeURIComponent(url)}&apikey=${API_KEY}`;

  try {
    await m.react('🕒');

    // Consultar API Sylphy
    const { data } = await axios.get(apiEndpoint);

    if (!data || !data.result) {
      await m.react('✖️');
      return m.reply('⚠️ No se pudo obtener información del video.');
    }

    const videoInfo = data.result;
    const title = videoInfo.title || 'video';
    const videoUrl = videoInfo.url; // esta API devuelve el link directo al MP4
    if (!videoUrl) {
      await m.react('✖️');
      return m.reply('⚠️ No se encontró URL para descargar el video.');
    }

    const fileName = cleanFileName(`${title}.mp4`);
    const destPath = path.join(TEMP_DIR, `${Date.now()}_${fileName}`);

    // Descargar el video temporalmente
    await downloadVideoFile(videoUrl, destPath);

    // Validar tamaño del archivo
    const stats = fs.statSync(destPath);
    if (stats.size > MAX_FILE_SIZE) {
      fs.unlinkSync(destPath);
      await m.react('✖️');
      return m.reply('⚠️ El video es demasiado grande para enviar (más de 100MB).');
    }

    // Enviar video con stream para ahorro de memoria
    await conn.sendMessage(m.chat, {
      video: fs.createReadStream(destPath),
      mimetype: 'video/mp4',
      fileName,
      contextInfo: {
        externalAdReply: {
          title,
          body: 'Descarga vía Sylphy API',
          mediaUrl: url,
          thumbnailUrl: videoInfo.thumbnail || null,
        }
      }
    }, { quoted: m });

    fs.unlinkSync(destPath);
    await m.react('✅');
  } catch (e) {
    console.error('Error en handler ytmp4 Sylphy API:', e);
    await m.react('✖️');
    m.reply('⚠️ Error al descargar el video o con la API. Intenta con otro enlace.');
  }
};

handler.help = ['ytmp4 <url>'];
handler.command = ['ytmp4'];
handler.tags = ['download'];

export default handler;
