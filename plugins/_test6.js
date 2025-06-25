const handler = async (m, {isOwner, isAdmin, conn, text, participants, args, command, usedPrefix}) => {

  if (!/^\.todostest$/i.test(m.text)) return;

  if (!(isAdmin || isOwner)) {
    global.dfail('admin', m, conn);
    throw false;
  }

  const mensaje = args.join(' ') || '¡Atención a todos!';
  const aviso = `*\`AVISO:\`* ${mensaje}`;

  // Obtener nombre del invocador
  const nombreInvocador = m.pushName || (await conn.getName(m.sender)) || `@${m.sender.split('@')[0]}`;

  // Obtener nombre del bot
  const botNumber = conn.user.jid;
  const nombreBot = (await conn.getName(botNumber)) || `@${botNumber.split('@')[0]}`;

  let teks = `╭━[ INVOCACIÓN MASIVA ]━⬣
┃🔹 PANTHEON BOT ⚡
┃👤 Invocado por: @${m.sender.split('@')[0]}
┃👥 Miembros del grupo: ${participants.length + 2}
╰━━━━━━━⋆★⋆━━━━━━━⬣

${aviso}

📲 Etiquetando a todos los miembros...

`;

  // Agregar invocador
  teks += `│➜ @${m.sender.split('@')[0]}\n`;

  // Agregar bot
  teks += `│➜ @${botNumber.split('@')[0]}\n`;

  // Agregar los demás participantes (excluyendo invocador y bot para evitar duplicados)
  for (const mem of participants) {
    if (mem.id === m.sender) continue;
    if (mem.id === botNumber) continue;
    let nombre = (await conn.getName(mem.id)) || `@${mem.id.split('@')[0]}`;
    teks += `│➜ @${mem.id.split('@')[0]}\n`;
  }

  teks += `╰─[ Pantheon Bot WhatsApp ⚡]─`;

  // Crear array de menciones incluyendo invocador, bot y participantes
  const mentions = [
    m.sender,
    botNumber,
    ...participants.filter(p => p.id !== m.sender && p.id !== botNumber).map(p => p.id)
  ];

  await conn.sendMessage(m.chat, {
    text: teks,
    mentions
  });
};

handler.help = ['todostest *<txt>*'];
handler.tags = ['gc'];
handler.command = /^todostest$/i;
handler.admin = true;
handler.group = true;
export default handler;
