const handler = async (m, {isOwner, isAdmin, conn, text, participants, args, command, usedPrefix}) => {

  // Solo permite el comando .todostest
  if (!/^\.todostest$/i.test(m.text)) return;

  if (!(isAdmin || isOwner)) {
    global.dfail('admin', m, conn);
    throw false;
  }

  const mensaje = args.join(' ') || '¡Atención a todos!';
  const aviso = `*\`AVISO:\`* ${mensaje}`;
  let teks = `╭━[ INVOCACIÓN MASIVA ]━⬣
┃🔹 PANTHEON BOT ⚡
┃👤 Invocado por: @${m.pushName}
┃👥 Miembros del grupo: ${participants.length}
╰━━━━━━━⋆★⋆━━━━━━━⬣

${aviso}

📲 Etiquetando a todos los miembros...

`;

  // Etiquetar solo nombres o alias (sin números)
  for (const mem of participants) {
    let nombre = (await conn.getName(mem.id)) || `@${mem.id.split('@')[0]}`;
    teks += `│➜ ${nombre}\n`;
  }

  teks += `╰─[ Pantheon Bot WhatsApp ⚡]─`;

  conn.sendMessage(m.chat, {
    text: teks,
    mentions: participants.map((a) => a.id)
  });
};

handler.help = ['todostest *<txt>*'];
handler.tags = ['gc'];
handler.command = /^todostest$/i;
handler.admin = true;
handler.group = true;
export default handler;
