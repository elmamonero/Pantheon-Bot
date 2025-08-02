import fs from "fs";
import path from "path";

const emojisPath = path.resolve("./emojigrupo.json");

async function leerEmojisGrupo() {
  try {
    const datosRaw = await fs.promises.readFile(emojisPath, 'utf-8');
    return JSON.parse(datosRaw);
  } catch {
    return {};
  }
}

const todosHandler = async (msg, { conn, args }) => {
  const rawID = conn.user?.id || "";
  const subbotID = rawID.split(":")[0] + "@s.whatsapp.net";
  const botNumber = rawID.split(":")[0].replace(/[^0-9]/g, "");

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
  const senderNum = senderJid.replace(/[^0-9]/g, "");
  const senderTag = `@${senderNum}`;

  const participant = participants.find(p => p.id.includes(senderNum));
  const isAdmin = participant?.admin === "admin" || participant?.admin === "superadmin";
  const isBot = botNumber === senderNum;

  if (!isAdmin && !isBot) {
    return await conn.sendMessage(
      chatId,
      {
        text: "❌ Solo los administradores del grupo o el subbot pueden usar este comando."
      },
      { quoted: msg }
    );
  }

  const datos = await leerEmojisGrupo();
  const emoji = datos[chatId] || "⚡"; // Si no hay emoji guardado, se usa esta opción por defecto

  const mentionIds = participants.map(p => p.id);
  const extraMsg = args.join(" ");
  const aviso =
    extraMsg.trim().length > 0
      ? `*AVISO:* ${extraMsg}`
      : "*AVISO:* ¡Atención a todos!*";

  const mentionList = participants
    .map(p => `${emoji} ⇝ @${p.id.split("@")[0]}`)
    .join("\n");

  const finalMsg = `╭━[ *INVOCACIÓN MASIVA* ]━⬣
┃🔹 *PANTHEON BOT* ⚡
┃👤 *Invocado por:* ${senderTag}
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

todosHandler.command = /^(todos4)$/i;

export default todosHandler;
