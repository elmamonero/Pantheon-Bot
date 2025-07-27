import fs from "fs";
import path from "path";

const emojisPath = path.resolve("./emojis.js");

async function leerEmojis() {
  try {
    const datos = await import(emojisPath + "?update=" + Date.now());
    return datos.default || {};
  } catch {
    return {};
  }
}

const handler = async (msg, { conn, args }) => {
  // ... tu código actual arriba sin cambios ...

  const metadata = await conn.groupMetadata(chatId);
  const participants = metadata.participants;
  const memberCount = participants.length;

  // Cargar emojis guardados
  let emojisData = await leerEmojis();
  const grupoEmojis = emojisData[chatId] || {};

  const extraMsg = args.join(" ");
  const aviso = extraMsg.trim().length > 0 ? `*AVISO:* ${extraMsg}` : "*AVISO:* ¡Atención a todos!";

  // Construir la lista con emojis personalizados o default
  const mentionList = participants
    .map((p) => {
      const emoji = grupoEmojis[p.id] || "👋";
      return `${emoji} │➜ @${p.id.split("@")[0]}`;
    })
    .join("\n");

  const mentionIds = participants.map((p) => p.id);

  const finalMsg = `╭━[ *INVOCACIÓN MASIVA* ]━⬣
┃🔹 *PANTHEON BOT* ⚡
┃👤 *Invocado por:* ${senderTag}
┃👥 *Miembros del grupo: ${memberCount}*
╰━━━━━━━⋆★⋆━━━━━━━⬣

*${aviso}*

📲 *Etiquetando a todos los miembros...*

${mentionList}
╰─[ *Pantheon Bot WhatsApp* ⚡ ]─`;

  // ... envío igual que antes ...
  await conn.sendMessage(
    chatId,
    {
      text: finalMsg,
      mentions: mentionIds,
    },
    { quoted: msg }
  );
};

handler.command = /^(tagall|t|invocar|marcar|todos|invocación)$/i;

export default handler;
