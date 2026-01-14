import fs from 'fs';
import path from 'path';
import yts from 'yt-search';

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

    // Nueva API davidcyriltech.my.id/play con el esquema correcto
    const query = encodeURIComponent(args.join(' '));
    const apiUrl = `https://apis.davidcyriltech.my.id/play?query=${query}`;
    console.log('Llamando a API con query:', apiUrl);

    const apiResponse = await fetch(apiUrl);
    const data = await apiResponse.json();

    console.log('Respuesta completa de la API:', JSON.stringify(data, null, 2));

    if (!data.status || !data.result) {
      await m.react('✖️');
      return m.reply(`*✖️ Error:* No se pudo obtener el audio. Respuesta: ${data.message || 'API no disponible'}`);
    }

    const { title, thumbnail, download_url: audioUrl, video_url } = data.result;
    
    if (!audioUrl) {
      await m.react('✖️');
      return m.reply('*✖️ Error:* No se pudo obtener el enlace de descarga del audio');
    }

    const fileName = `${title.replace(/[^\w\s-]/g, '')}.mp3`.replace(/\s+/g, '_').substring(0, 50);

    console.log('Enlace de audio obtenido:', audioUrl);

    const dest = path.join('/tmp', `${Date.now()}_${fileName}`);

    // Descargar el audio usando fetch
    const audioResponse = await fetch(audioUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://youtube.com/',
      },
    });

    if (!audioResponse.ok) {
      throw new Error(`Error en descarga: ${audioResponse.status} ${audioResponse.statusText}`);
    }

    const arrayBuffer = await audioResponse.arrayBuffer();
    fs.writeFileSync(dest, Buffer.from(arrayBuffer));

    // Verificar si el archivo se descargó correctamente (tamaño > 0)
    const stats = fs.statSync(dest);
    if (stats.size === 0) {
      fs.unlinkSync(dest);
      throw new Error('Archivo descargado vacío');
    }

    console.log(`Archivo descargado exitosamente: ${stats.size} bytes (~${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);

    // Enviar imagen de thumbnail si existe
    if (thumbnail) {
      try {
        const thumbBuffer = await (await fetch(thumbnail)).arrayBuffer();
        await conn.sendMessage(m.chat, {
          image: Buffer.from(thumbBuffer),
          caption: `🎵 *${title}*\n\n📎 URL: ${video_url || url}\n⏱️ Duración: ${data.result.duration}\n👀 Vistas: ${(data.result.views / 1000000).toFixed(1)}M\n\nDescarga MP3 desde YouTube`,
          footer: 'Pantheon Bot',
        }, { quoted: m });
      } catch (thumbError) {
        console.log('Error enviando thumbnail:', thumbError.message);
      }
    }

    // Enviar el audio como mensaje de audio
    await conn.sendMessage(m.chat, {
      audio: fs.readFileSync(dest),
      mimetype: 'audio/mpeg',
      fileName,
    }, { quoted: m });

    // Limpiar archivo temporal
    fs.unlinkSync(dest);
    await m.react('✅');
  } catch (error) {
    console.error('Error al descargar MP3:', error.message || error);
    await m.react('✖️');
    m.reply('⚠️ La descarga ha fallado, posible error en la API o video muy pesado.');
  }
};

handler.help = ['play <nombre|URL>'];
handler.command = ['play'];
handler.tags = ['descargas'];
export default handler;
