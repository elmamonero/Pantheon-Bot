import fs from 'fs';
import path from 'path';
import yts from 'yt-search';

const MAX_SIZE_MB = 50;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const API_KEY = 'AdonixKey2lph3k2117';

const handler = async (m, { conn, args, command }) => {
  if (!args[0]) return m.reply('Por favor, ingresa un nombre o URL de un video de YouTube');

  let url = args[0];
  const isUrl = /(youtube\.com|youtu\.be)/.test(url);

  if (!isUrl) {
    const searchResults = await yts(args.join(' '));
    if (!searchResults.videos.length) {
      return m.reply('No se encontraron resultados para tu búsqueda');
    }
    url = searchResults.videos[0].url;
  }

  try {
    await m.react('🕒');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const encodedUrl = encodeURIComponent(url);
    const apiUrl = `https://api-adonix.ultraplus.click/download/ytaudio?apikey=${API_KEY}&url=${encodedUrl}`;
    
    console.log('Llamando a nueva API:', apiUrl);

    const apiResponse = await fetch(apiUrl, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    clearTimeout(timeoutId);

    if (!apiResponse.ok) {
      throw new Error(`API error: ${apiResponse.status}`);
    }

    const data = await apiResponse.json();

    // ✅ CORREGIDO: La estructura es data.data, no data.result
    if (!data.status || !data.data || !data.data.url) {
      console.log('Respuesta completa de API:', JSON.stringify(data, null, 2));
      await m.react('✖️');
      return m.reply(`*✖️ Error:* No se pudo obtener el audio.\n\n*Eli Bot*`);
    }

    const { title, thumbnail, url: audioUrl, duration } = data.data;
    
    if (!audioUrl) {
      await m.react('✖️');
      return m.reply('*✖️ Error:* No hay enlace de descarga disponible\n\n*Eli Bot*');
    }

    const fileName = `${title?.replace(/[^\w\s-]/g, '') || 'audio'}.mp3`.replace(/\s+/g, '_').substring(0, 50);

    // Descarga silenciosa para verificar tamaño
    const dest = path.join('/tmp', `${Date.now()}_${fileName}`);
    
    console.log('Descargando audio desde:', audioUrl);

    const audioResponse = await fetch(audioUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://youtube.com/',
      },
      signal: AbortSignal.timeout(20000)
    });

    if (!audioResponse.ok) {
      throw new Error(`Error descarga: ${audioResponse.status}`);
    }

    const arrayBuffer = await audioResponse.arrayBuffer();
    
    if (arrayBuffer.byteLength > MAX_SIZE_BYTES) {
      throw new Error(`Archivo muy pesado (${(arrayBuffer.byteLength/1024/1024).toFixed(1)}MB). Máximo ${MAX_SIZE_MB}MB`);
    }

    fs.writeFileSync(dest, Buffer.from(arrayBuffer));
    const stats = fs.statSync(dest);

    // Thumbnail + info
    if (thumbnail) {
      try {
        const thumbResponse = await fetch(thumbnail, { 
          signal: AbortSignal.timeout(5000) 
        });
        const thumbBuffer = await thumbResponse.arrayBuffer();
        await conn.sendMessage(m.chat, {
          image: Buffer.from(thumbBuffer),
          caption: `🎵 *${title}*\n⏱️ ${duration || 'Desconocido'}\n📎 ${url}\n💾 ${(stats.size/1024/1024).toFixed(1)}MB\n\n*Eli Bot*`,
        }, { quoted: m });
      } catch (e) {
        console.log('Thumbnail falló:', e.message);
        await conn.sendMessage(m.chat, {
          text: `🎵 *${title}*\n⏱️ ${duration || 'Desconocido'}\n📎 ${url}\n💾 ${(stats.size/1024/1024).toFixed(1)}MB\n\n*Eli Bot*`,
        }, { quoted: m });
      }
    } else {
      await conn.sendMessage(m.chat, {
        text: `🎵 *${title}*\n⏱️ ${duration || 'Desconocido'}\n📎 ${url}\n💾 ${(stats.size/1024/1024).toFixed(1)}MB\n\n*Eli Bot*`,
      }, { quoted: m });
    }

    // Audio directo
    await conn.sendMessage(m.chat, {
      audio: { url: audioUrl },
      mimetype: 'audio/mpeg',
      fileName,
    }, { quoted: m });

    // Cleanup
    if (fs.existsSync(dest)) {
      fs.unlinkSync(dest);
    }
    
    await m.react('✅');
    
  } catch (error) {
    if (error.name === 'AbortError') {
      await m.react('⏰');
      return m.reply(`⏰ *Timeout* - Canción muy pesada (>${MAX_SIZE_MB}MB)\n\n*Eli Bot*`);
    }
    
    if (error.message.includes('muy pesado')) {
      await m.react('📏');
      return m.reply(`${error.message}\n\n*Eli Bot*`);
    }
    
    console.error('Error completo:', error);
    await m.react('✖️');
    m.reply('⚠️ Falló la descarga. Prueba con otra canción.\n\n*Eli Bot*');
  }
};

handler.help = ['play <nombre|URL>'];
handler.command = ['play'];
handler.tags = ['descargas'];
export default handler;
