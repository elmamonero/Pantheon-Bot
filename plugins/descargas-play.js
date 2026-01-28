import fs from 'fs';
import path from 'path';
import yts from 'yt-search';

const MAX_SIZE_MB = 50;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const handler = async (m, { conn, args, command }) => {
  if (!args[0]) return m.reply('Por favor, ingresa un nombre o URL de un video de YouTube');

  let searchQuery = args.join(' ');
  
  try {
    await m.react('🕒');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    // Nueva API de Stellarwa
    const query = encodeURIComponent(searchQuery);
    const apiUrl = `https://api.stellarwa.xyz/dl/youtubeplay?query=${query}&key=GataDios`;
    
    console.log('Llamando a API Stellarwa:', apiUrl);

    const apiResponse = await fetch(apiUrl, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    
    clearTimeout(timeoutId);

    if (!apiResponse.ok) {
      throw new Error(`API error: ${apiResponse.status}`);
    }

    const data = await apiResponse.json();

    // La API de Stellarwa usa data.result para los detalles
    if (!data.status || !data.result) {
      await m.react('✖️');
      return m.reply(`*✖️ Error:* No se encontró el contenido.\n\n*Pantheon Bot*`);
    }

    const { title, thumb, download: audioUrl, source: video_url, duration_seconds } = data.result;
    
    // Convertir segundos a formato mm:ss para el mensaje
    const duration = new Date(duration_seconds * 1000).toISOString().substr(14, 5);

    if (!audioUrl) {
      await m.react('✖️');
      return m.reply('*✖️ Error:* No hay enlace de descarga disponible\n\n*Pantheon Bot*');
    }

    const fileName = `${title.replace(/[^\w\s-]/g, '')}.mp3`.replace(/\s+/g, '_').substring(0, 50);
    const dest = path.join('/tmp', `${Date.now()}_${fileName}`);
    
    console.log('Descargando audio...');

    const audioResponse = await fetch(audioUrl, {
      signal: AbortSignal.timeout(30000)
    });

    if (!audioResponse.ok) throw new Error(`Error descarga: ${audioResponse.status}`);

    const arrayBuffer = await audioResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    if (buffer.length > MAX_SIZE_BYTES) {
      throw new Error(`Archivo muy pesado (${(buffer.length/1024/1024).toFixed(1)}MB). Máximo ${MAX_SIZE_MB}MB`);
    }

    fs.writeFileSync(dest, buffer);
    const stats = fs.statSync(dest);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(1);

    // Envío de miniatura e información
    const infoText = `🎵 *${title}*\n⏱️ ${duration}\n📎 ${video_url}\n💾 ${sizeMB}MB\n\n*Pantheon Bot*`;

    if (thumb) {
      await conn.sendMessage(m.chat, {
        image: { url: thumb },
        caption: infoText,
      }, { quoted: m });
    } else {
      await conn.sendMessage(m.chat, { text: infoText }, { quoted: m });
    }

    // Envío del archivo de audio
    await conn.sendMessage(m.chat, {
      audio: buffer,
      mimetype: 'audio/mpeg',
      fileName: `${title}.mp3`,
    }, { quoted: m });

    // Limpieza
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    await m.react('✅');
    
  } catch (error) {
    console.error('Error detallado:', error);
    if (error.name === 'AbortError') {
      await m.react('⏰');
      return m.reply(`⏰ *Timeout* - La conexión tardó demasiado.\n\n*Pantheon Bot*`);
    }
    
    if (error.message.includes('muy pesado')) {
      await m.react('📏');
      return m.reply(`${error.message}\n\n*Pantheon Bot*`);
    }
    
    await m.react('✖️');
    m.reply('⚠️ Falló la descarga con esta API. Intenta de nuevo más tarde.\n\n*Pantheon Bot*');
  }
};

handler.help = ['play <nombre|URL>'];
handler.command = ['play'];
handler.tags = ['descargas'];

export default handler;
