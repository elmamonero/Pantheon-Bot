import fetch from 'node-fetch';

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) {
    await m.reply(`*📀 Por favor, ingresa el enlace o nombre de una canción de Spotify.*\n> *\`Ejemplo:\`* ${usedPrefix + command} Ponte bonita - Cris mj`);
    return;
  }

  await m.react('⌛');

  try {
    // Llamada a API pública sin apikey
    const response = await fetch(`https://api.nekorinn.my.id/downloader/spotifyplay?q=${encodeURIComponent(text)}`);
    const data = await response.json();

    if (!data.result || !data.result.downloadUrl) {
      throw new Error('No se encontró la canción o el enlace es inválido.');
    }

    // Enviar audio al chat desde la url obtenida
    await conn.sendMessage(m.chat, {
      audio: { url: data.result.downloadUrl },
      mimetype: 'audio/mpeg'
    }, { quoted: m });

    await m.react('✅');
  } catch (e) {
    console.error('Error al enviar audio:', e);
    await m.reply(`❌ Error al obtener el audio:\n${e.message}`);
    await m.react('❌');
  }
};

handler.help = ['spotify *<texto>*'];
handler.tags = ['descargas'];
handler.command = ['spotify', 'spotifydl', 'spdl'];

export default handler;
