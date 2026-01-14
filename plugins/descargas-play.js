import fs from 'fs';
import path from 'path';
import yts from 'yt-search';

const MAX_SIZE_MB = 50;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

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

    const query = encodeURIComponent(args.join(' '));
    const apiUrl = `https://apis.davidcyriltech.my.id/play?query=${query}`;
    
    console.log('Llamando a API:', apiUrl);

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

    if (!data.status || !data.result) {
      await m.react('✖️');
      return m.reply(`*✖️ Error:* No se pudo obtener el audio.\n\n*Pantheon Bot*`);
    }

    const { title, thumbnail, download_url: audioUrl, video_url, duration } = data.result;
    
    if (!audioUrl) {
      await m.react('✖️');
      return m.reply('*✖️ Error:* No hay enlace de descarga disponible\n\n*Pantheon Bot*');
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

    // Thumbnail + info CON PANTHEON BOT COMO TEXTO
    if (thumbnail) {
      try {
        const thumbResponse = await fetch(thumbnail, { 
          signal: AbortSignal.timeout(5000) 
        });
        const thumbBuffer = await thumbResponse.arrayBuffer();
        await conn.sendMessage(m.chat, {
          image: Buffer.from(thumbBuffer),
          caption: `🎵 *${title}*\n⏱️ ${duration}\n📎 ${video_url || url}\n💾 ${(stats.size/1024/1024).toFixed(1)}MB\n\n*Pantheon Bot*`,
        }, { quoted: m });
      } catch (e) {
        console.log('Thumbnail falló:', e.message);
        // Fallback texto
        await conn.sendMessage(m.chat, {
          text: `🎵 *${title}*\n⏱️ ${duration}\n📎 ${video_url || url}\n💾 ${(stats.size/1024/1024).toFixed(1)}MB\n\n*Pantheon Bot*`,
        }, { quoted: m });
      }
    } else {
      await conn.sendMessage(m.chat, {
        text: `🎵 *${title}*\n⏱️ ${duration}\n📎 ${video_url || url}\n💾 ${(stats.size/1024/1024).toFixed(1)}MB\n\n*Pantheon Bot*`,
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
      return m.reply(`⏰ *Timeout* - Canción muy pesada (>${MAX_SIZE_MB}MB)\n\n*Pantheon Bot*`);
    }
    
    if (error.message.includes('muy pesado')) {
      await m.react('📏');
      return m.reply(`${error.message}\n\n*Pantheon Bot*`);
    }
    
    console.error('Error completo:', error);
    await m.react('✖️');
    m.reply('⚠️ Falló la descarga. Prueba con otra canción.\n\n*Pantheon Bot*');
  }
};

handler.help = ['play <nombre|URL>'];
handler.command = ['play'];
handler.tags = ['descargas'];
export default handler;
