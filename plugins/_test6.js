const handler = async (m, {isOwner, isAdmin, conn, text, participants, args, command, usedPrefix}) => {

  if (!/^\.todostest$/i.test(m.text)) return;

  if (!(isAdmin || isOwner)) {
    global.dfail('admin', m, conn);
    throw false;
  }

  const mensaje = args.join(' ') || '¡Atención a todos!';
  const aviso = `*\`AVISO:\`* ${mensaje}`;

  // Obtener ID del bot y del invocador
  const botNumber = conn.user.jid;
  const invocador = m.sender;

  // Crear un set para evitar duplicados
  const uniqueParticipants = new Map();

  // Agregar participantes del grupo (sin duplicados)
  for (const p of participants) {
    uniqueParticipants.set(p.id, p);
  }

  // Asegurar que el bot y el invocador estén en el set
  uniqueParticipants.set(botNumber, {id: botNumber});
  uniqueParticipants.set(invocador, {id: invocador});

  // Contar miembros únicos
  const totalMiembros = uniqueParticipants.size;

  let teks = `╭━[ INVOCACIÓN MASIVA ]━⬣
┃🔹 PANTHEON BOT ⚡
┃👤 Invocado por: @${invocador.split('@')[0]}
┃👥 Miembros del grupo: ${totalMiembros}
╰━━━━━━━⋆★⋆━━━━━━━⬣

${aviso}

📲 Etiquetando a todos los miembros...

`;

  // Construir texto con menciones
  for (const [id] of uniqueParticipants) {
    teks += `│➜ @${id.split('@')[0]}\n`;
  }

  teks += `╰─[ Pantheon Bot WhatsApp ⚡]─`;

  // Enviar mensaje con todas las menciones
  await conn.sendMessage(m.chat, {
    text: teks,
    mentions: Array.from(uniqueParticipants.keys())
  });
};

handler.help = ['todostest *<txt>*'];
handler.tags = ['gc'];
handler.command = /^todostest$/i;
handler.admin = true;
handler.group = true;
export default handler;
