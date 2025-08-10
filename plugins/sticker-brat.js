import fetch from 'node-fetch';

let handler = async (m, { conn, text }) => {
  try {
    if (!text) {
      return conn.reply(m.chat, '⚠️ Por favor, ingresa un texto para crear el sticker.', m);
    }

    await m.react('🕒');

    const url = `https://api.nekorinn.my.id/maker/brat-v2?text=${encodeURIComponent(text)}`;
    const response = await fetch(url);

    if (!response.ok) throw new Error('No se pudo descargar el sticker.');

    const buffer = await response.buffer();

    // Enviar sticker visual
    await conn.sendMessage(m.chat, {
      sticker: buffer
    }, { quoted: m });

    // Enviar sticker como archivo para descarga
    await conn.sendMessage(m.chat, {
      document: buffer,
      fileName: `${text}.webp`,
      mimetype: 'image/webp',
      caption: 'Sticker en formato descargable'
    }, { quoted: m });

    await m.react('✅');
  } catch (e) {
    console.error(e);
    await m.react('✖️');
    m.reply('Error al generar el sticker.');
  }
};

handler.help = ['brat <texto>'];
handler.tags = ['sticker'];
handler.command = /^brat$/i;

export default handler;
