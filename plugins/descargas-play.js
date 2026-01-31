import fs from 'fs';
import path from 'path';
import yts from 'yt-search';

const MAX_SIZE_MB = 50;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const handler = async (m, { conn, args, command }) => {
  if (!args[0]) return m.reply('Por favor, ingresa un nombre o URL de un video de YouTube');

  let url = args[0];
  const isUrl = /(youtube\\.com|youtu\\.be)/.test(url);

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

    // NUEVAS APIs - Usamos la primera que funcione
    const apis = [
      `https://api-adonix.ultraplus.click/download/ytaudio?apikey=AdonixKey2lph3k2117&url=${encodeURIComponent(url)}`,
      `https://api.vreden.my.id/api/v1/download/play/audio?query=${encodeURIComponent(args.join(' '))}`
    ];

    let data = null;
    let apiUsed = '';

    for (const apiUrl of apis) {
      try {
        console.log('Probando API:', apiUrl);
        const apiResponse = await fetch(apiUrl, { 
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (apiResponse.ok) {
          data = await apiResponse.json();
          apiUsed = apiUrl;
          console.log('API exitosa:', apiUrl);
          break;
        }
      } catch (e) {
        console.log(`API ${apiUrl} falló:`, e.message);
        continue;
      }
    }

    clearTimeout(timeoutId);

    if (!data) {
      await m.react('✖️');
      return m.reply(`*✖️ Error:* Todas las APIs fallaron.\\n\\n*Eli Bot*`);
    }

    // Adaptar respuesta según la API usada
    let title, thumbnail, audioUrl, video_url, duration;
    
    if (apiUsed.includes('adonix')) {
      // API Adonix format
      title = data.title || 'Audio de YouTube';
      thumbnail = data.thumb || data.thumbnail;
      audioUrl = data.url || data.download_url;
      duration = data.duration || 'Desconocido';
      video_url = url;
    } else {
      // API Vreden format  
      title = data.title || data.result?.title || 'Audio de YouTube';
      thumbnail = data.thumbnail || data.result?.thumbnail;
      audioUrl = data.result?.download_url || data.download_url;
      duration = data.duration || data.result?.duration || 'Desconocido';
      video_url = data.video_url || url;
    }

    if (!audioUrl) {
      await m.react('✖️');
      return m.reply('*✖️ Error:* No hay enlace de descarga disponible\\n\\n*Eli Bot*');
    }

    const fileName = `${title.replace(/[^\w\s-]/g, '')}.mp3`.replace(/\s+/g, '_').substring(0, 50);

    // Descarga silenciosa
    const dest = path.join('/tmp', `${Date.now()}_${fileName}`);
    
    console.log('Descargando audio desde:', audioUrl);

    const audioResponse = await fetch(audioUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
          caption: `🎵 *${title}*\n⏱️ ${duration}\n📎 ${video_url}\n💾 ${(stats.size/1024/1024).toFixed(1)}MB\n\n*Eli Bot*`,
        }, { quoted: m });
      } catch (e) {
        console.log('Thumbnail falló:', e.message);
        await conn.sendMessage(m.chat, {
          text: `🎵 *${title}*\n⏱️ ${duration}\n📎 ${video_url}\n💾 ${(stats.size/1024/1024).toFixed(1)}MB\n\n*Eli Bot*`,
        }, { quoted: m });
      }
    } else {
      await conn.sendMessage(m.chat, {
        text: `🎵 *${title}*\n⏱️ ${duration}\n📎 ${video_url}\n💾 ${(stats.size/1024/1024).toFixed(1)}MB\n\n*Eli Bot*`,
      }, { quoted: m });
    }

    // Audio directo (primero para mejor UX)
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
