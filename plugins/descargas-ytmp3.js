import axios from 'axios';

// Handler sencillo usando la API de Vreden
const handler = async (m, { conn, args }) => {
  if (!args[0]) return m.reply(`Por favor, ingresa una URL de un video o audio de YouTube`);
  const url = args[0];

  // Validación básica de URL de YouTube
  if (!/(youtube\.com|youtu\.be)/.test(url)) 
    return m.reply("⚠️ Ingresa un link válido de YouTube.");

  try {
    await m.react('🕒');
    // Consultar la API de Vreden
    const { data } = await axios.get(`https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(url)}`);

    // Verificar si la API respondió correctamente
    if (!data.status) {
      await m.react('✖️');
      return m.reply("*✖️ Error:* " + (data.message || "No se pudo obtener el mp3"));
    }

    // data.result podría diferir, asegúrate con la documentación o prueba con un video real
    const { title, url: audioUrl, thumbnail } = data.result;

    await conn.sendMessage(m.chat, {
      audio: { url: audioUrl },
      mimetype: 'audio/mpeg',
      fileName: `${title}.mp3`,
      contextInfo: {
        externalAdReply: {
          title,
          body: "Descargar MP3 de YouTube",
          thumbnailUrl: thumbnail,
          mediaUrl: url
        }
      }
    }, { quoted: m });

    await m.react('✅');
  } catch (e) {
    await m.react('✖️');
    m.reply("⚠️ La descarga ha fallado, posible error en la API o el video es muy pesado.");
  }
};

handler.help = ['ytmp3'];
handler.command = ['ytmp3'];
handler.tags = ['download'];

export default handler;
