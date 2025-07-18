import axios from 'axios';

const handler = async (m, { conn, args }) => {
  if (!args[0]) return m.reply('Por favor, ingresa una URL de un video o audio de YouTube');
  const url = args[0];

  if (!/(youtube\.com|youtu\.be)/.test(url))
    return m.reply("⚠️ Ingresa un link válido de YouTube.");

  try {
    await m.react('🕒');
    const { data } = await axios.get(`https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(url)}`);

    if (!data.result?.download?.status) {
      await m.react('✖️');
      return m.reply("*✖️ Error:* No se pudo obtener el mp3");
    }

    // Se extraen los datos según la estructura
    const title = data.result.metadata.title;
    const audioUrl = data.result.download.url;
    const fileName = data.result.download.filename || `${title}.mp3`;
    const thumbnail = data.result.metadata.thumbnail || data.result.metadata.image;

    await conn.sendMessage(m.chat, {
      audio: { url: audioUrl },
      mimetype: 'audio/mpeg',
      fileName,
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
    console.error('Error al descargar MP3:', e, e.response?.data);
    await m.react('✖️');
    m.reply("⚠️ La descarga ha fallado, posible error en la API o el video es muy pesado.");
  }
};

handler.help = ['ytmp3'];
handler.command = ['ytmp3'];
handler.tags = ['download'];

export default handler;
