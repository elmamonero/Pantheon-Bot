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

function guardarEmojis(data) {
  const contenido = "export default " + JSON.stringify(data, null, 2) + ";\n";
  fs.writeFileSync(emojisPath, contenido);
}

const handler = async (msg, { conn, args }) => {
  const chatId = msg.key.remoteJid;
  const senderJid = msg.key.participant || msg.key.remoteJid;

  if (!chatId.endsWith("@g.us")) {
    return await conn.sendMessage(
      chatId,
      { text: "❌ Este comando solo puede usarse en grupos." },
      { quoted: msg }
    );
  }

  if (!args.length) {
    return await conn.sendMessage(
      chatId,
      { text: "❗️ Por favor, usa el comando seguido del emoji deseado.\nEjemplo: `.setemoji 😎`" },
      { quoted: msg }
    );
  }

  const emoji = args[0]; // Simplemente toma el primer argumento

  // Opcional: Validar que sea un emoji (puedes ampliar esta validación si quieres)
  // Por simplicidad aquí no se valida

  let emojisData = await leerEmojis();
  if (!emojisData[chatId]) emojisData[chatId] = {};
  emojisData[chatId][senderJid] = emoji;

  guardarEmojis(emojisData);

  return await conn.sendMessage(
    chatId,
    {
      text: `✅ Emoji guardado como tu emoji personalizado: ${emoji}`,
      mentions: [senderJid],
    },
    { quoted: msg }
  );
};

handler.command = /^setemoji$/i;

export default handler;
