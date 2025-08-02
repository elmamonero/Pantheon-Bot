import path from "path";

const emojisPath = path.resolve("./emojigrupo.js");

async function leerEmojisGrupo() {
  try {
    const datos = await import(emojisPath + "?update=" + Date.now());
    return datos.default || {};
  } catch {
    return {};
  }
}

const handler = async (msg, { conn, args }) => {
  const chatId = msg.key.remoteJid;

  if (!chatId.endsWith("@g.us")) {
    return await conn.sendMessage(
      chatId,
      { text: "⚠️ *Este comando solo se puede usar en grupos.*" },
      { quoted: msg }
    );
  }

  const metadata = await conn.groupMetadata(chatId);
  const participants = metadata.participants;
  const memberCount = participants.length;

  const senderJid = msg.key.participant || msg.key.remoteJid;
  const sender = metadata.participants.find(p => p.id === senderJid);
  const isAdmin = sender?.admin === "admin" || sender?.admin === "superadmin";

  if (!isAdmin) {
    return await conn.sendMessage(
      chatId,
      { text: "❌ Solo los administradores pueden usar este comando." },
      { quoted: msg }
    );
  }

  const datos = await leerEmojisGrupo();

  const aviso = (args.join(" ").trim().length > 0) 
      ? `*AVISO:* ${args.join(" ")}`
      : "*AVISO:* ¡Atención a todos!*";

  const mentionList = participants
    .map(p => {
      const grp = datos[chatId] || { default: "⚡", users: {} };
      const userEmoji = grp.users[p.id] || grp.default || "⚡";
      return `${userEmoji} ⇝ @${p.id.split("@")[0]}`;
    })
    .join("\n");

  const mentionIds = participants.map(p => p.id);

  const finalMsg = `╭━[ *INVOCACIÓN MASIVA* ]━⬣
┃🔹 *PANTHEON BOT* ⚡
┃👤 *Invocado por:* @${senderJid.split("@")[0]}
┃👥 *Miembros del grupo: ${memberCount}*
╰━━━━━━━⋆★⋆━━━━━━━⬣

${aviso}

📲 *Etiquetando a todos los miembros...*

${mentionList}
╰─[ *Pantheon Bot WhatsApp* ⚡ ]─`;

  await conn.sendMessage(
    chatId,
    {
      text: finalMsg,
      mentions: mentionIds
    },
    { quoted: msg }
  );
};

handler.command = /^(todos4)$/i;

export default handler;
