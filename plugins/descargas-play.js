import fs from 'fs';
import path from 'path';

const MAX_SIZE_MB = 50;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const handler = async (m, { conn, args, command }) => {
  if (!args[0]) return m.reply('Por favor, ingresa un nombre o URL de un video de YouTube');

  let searchQuery = args.join(' ');
  
  try {
    await m.react('🕒');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    // API Stellarwa con tu Key
    const query = encodeURIComponent(searchQuery);
    const apiUrl = `https://api.stellarwa.xyz/dl/youtubeplay?query=${query}&key=GataDios`;
    
    console.log('Llamando a API Stellarwa:', apiUrl);

    const apiResponse = await fetch(apiUrl, { 
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    clearTimeout(timeoutId);

    if (!apiResponse.ok) {
      throw new Error(`API error: ${apiResponse.status}`);
    }

    const json = await apiResponse.json();

    // Cambiado de data.result a json.data según tu ejemplo
    if (!json.status || !json.data) {
      await m.react('✖️');
      return m.reply(`*✖️ Error:* No se encontró el contenido en esta API.\n\n*Pantheon Bot*`);
    }

    // Extraemos los datos exactos del JSON que me pasaste
    const { title, thumbnail, download, url: video_url, duration } = json.data;

    if (!download) {
      await m.react('✖️');
      return m.reply('*✖️ Error:* No hay enlace de descarga disponible para este audio.\n\n*Pantheon Bot*');
    }

    const fileName = `${title.replace(/[^\w\s-]/g, '')}.mp3`.replace(/\s+/g, '_').substring(0, 50);
    
    console.log('Descargando audio desde CDN...');

    const audioResponse = await fetch(download, {
      signal: AbortSignal.timeout(60000) // 1 minuto para descargar
    });

    if (!audioResponse.ok) throw new Error(`Error en el servidor de descarga: ${audioResponse.status}`);

    const arrayBuffer = await audioResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    if (buffer.length > MAX_SIZE_BYTES) {
      throw new Error(`Archivo muy pesado (${(buffer.length/1024/1024).toFixed(1)}MB). Máximo ${MAX_SIZE_MB}MB`);
    }

    // Info del mensaje
    const sizeMB = (buffer.length / 1024 / 1024).toFixed(1);
    const infoText = `🎵 *${title}*\n⏱️ ${duration}\n📎 ${video_url}\n💾 ${sizeMB}MB\n\n*Pantheon Bot*`;

    // Enviar Miniatura + Info
    if (thumbnail) {
      await conn.sendMessage(m.chat, {
        image: { url: thumbnail },
        caption: infoText,
      }, { quoted: m });
    } else {
      await conn.sendMessage(m.chat, { text: infoText }, { quoted: m });
    }

    // Enviar el archivo de Audio
    await conn.sendMessage(m.chat, {
      audio: buffer,
      mimetype: 'audio/mpeg',
      fileName: `${title}.mp3`,
    }, { quoted: m });

    await m.react('✅');
    
  } catch (error) {
    console.error('Error en el comando play:', error);
    
    if (error.name === 'AbortError') {
      await m.react('⏰');
      return m.reply(`⏰ *Timeout* - El servidor tardó mucho en responder.\n\n*Pantheon Bot*`);
    }
    
    if (error.message.includes('muy pesado')) {
      await m.react('📏');
      return m.reply(`⚠️ ${error.message}\n\n*Pantheon Bot*`);
    }
    
    await m.react('✖️');
    m.reply('⚠️ Falló la descarga. Intenta con otro nombre o URL.\n\n*Pantheon Bot*');
  }
};

handler.help = ['play <nombre|URL>'];
handler.command = ['play'];
handler.tags = ['descargas'];

export default handler;
