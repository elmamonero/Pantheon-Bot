const handler = async (m, { conn }) => {
  try {
    // Obtiene la información del grupo
    const groupMetadata = await conn.groupMetadata(m.chat);
    const desc = groupMetadata.desc || 'No hay descripción establecida para este grupo.';

    m.reply(`*📃 Descripción del grupo:*\n\n${desc}`);
  } catch (error) {
    console.error(error);
    m.reply('*✖️ Ocurrió un error al obtener la descripción del grupo.*');
  }
};

handler.help = ['desc', 'descripcion'];
handler.tags = ['grupo'];
handler.command = ['desc', 'descripcion'];
handler.group = true; // Solo funciona en grupos

export default handler;
