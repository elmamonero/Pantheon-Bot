import { sticker } from '../lib/sticker.js';
import fetch from 'node-fetch';

let handler = async (m, { conn, text }) => {
  try {
    if (!text) {
      return conn.reply(m.chat, '*⚠️ Por favor, ingresa un texto para realizar tu sticker.*', m);
    }

    await m.react('☁️');

    // Construir URL con el texto
    const url = `https://api.nekorinn.my.id/maker/brat-v2?text=${encodeURIComponent(text)}`;

    // Descargar la imagen o recurso
    const response = await fetch(url);
    if (!response.ok) throw new Error('No se pudo descargar la imagen para el sticker.');

    const imageBuffer = await response.buffer();

    // Definir packname y author si la función sticker los requiere
    const packname = 'MiPack';
    const author = 'MiBot';

    // Generar el sticker a partir del buffer descargado
    const stiker = await sticker(null, imageBuffer, packname, author);

    if (!stiker) throw new Error('Error al generar el sticker.');

    // Enviar el sticker generado
    await conn.sendFile(m.chat, stiker, 'sticker.webp', '', m);

    await m.react('✅');
  } catch (err) {
    console.error(err);
    await m.react('✖️');
    m.reply(typeof err === 'string' ? err : 'Ocurrió un error al generar el sticker.');
  }
};

handler.help = ['brat <texto>'];
handler.tags = ['sticker'];
handler.command = /^brat$/i;

export default handler;
