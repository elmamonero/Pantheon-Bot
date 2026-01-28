import fs from 'fs';
import path from 'path';
import axios from 'axios';
import yts from 'yt-search';

const MAX_SIZE_MB = 100; // El video suele ser más pesado que el audio
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const handler = async (m, { conn, args, command }) => {
  if (!args[0]) return m.reply('Por favor, ingresa un nombre o URL de un video de YouTube');

  try {
    await m.react('🕒');

    // 1. Buscar info del video
    const searchQuery = args.join(' ');
    const searchResult = await yts(searchQuery);
    const video = searchResult.videos[0];

    if (!video) {
      await m.react('✖️');
      return m.reply('No se encontraron resultados.');
    }

    const { title, thumbnail, timestamp, url } = video;

    // 2. Llamada a la API de Stellarwa (Video)
    const apiUrl = `https://api.stellarwa.xyz/dl/ytmp4?url=${encodeURIComponent(url)}&quality=360&key=GataDios`;
    
    const apiResponse = await fetch(apiUrl);
    const json = await apiResponse.json();

    if (!json.status || !json.data || !json.data.dl) {
      await m.react('✖️');
      return m.reply('*✖️ Error:* La API no devolvió un enlace de descarga válido.');
    }

    const videoUrl = json.data.dl;
    const fileName = `${title.replace(/[^\w\s-]/g, '')}.mp4`.replace(/\s+/g, '_').substring(0, 50);
    const dest = path.join('/tmp', `${Date.now()}_${fileName}`);

    // 3. Descarga física al servidor (Igual que en tu .play que sí funciona)
    const response = await axios({
      method: 'get',
      url: videoUrl,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
      }
    });

    const writer = fs.createWriteStream(dest);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    const stats = fs.statSync(dest);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(1);

    if (stats.size > MAX_SIZE_BYTES) {
      fs.unlinkSync(dest);
      return m.reply(`El video es demasiado pesado (${sizeMB}MB). El límite es ${MAX_SIZE_MB}MB.`);
    }

    // 4. Enviar Miniatura e Info
    await conn.sendMessage(m.chat, {
      image: { url: thumbnail },
      caption: `🎵 *${title}*\n⏱️ ${timestamp}\n📎 ${url}\n💾 ${sizeMB}MB\n\n*Pantheon Bot*`,
    }, { quoted: m });

    // 5. Enviar el Video descargado
    await conn.sendMessage(m.chat, {
      video: fs.readFileSync(dest),
      mimetype: 'video/mp4',
      fileName: `${title}.mp4`,
      caption: `✅ Aquí tienes tu video.`
    }, { quoted: m });

    // 6. Limpiar archivo temporal
    if (fs.existsSync(dest)) {
      fs.unlinkSync(dest);
    }
    
    await m.react('✅');

  } catch (error) {
    console.error('Error en play2:', error);
    await m.react('✖️');
    m.reply(`⚠️ Falló la descarga.\n\n*Detalle:* ${error.message}`);
  }
};

handler.help = ['play2 <nombre|URL>', 'ytmp4 <nombre|URL>'];
handler.command = ['play2', 'ytmp4'];
handler.tags = ['descargas'];

export default handler;
