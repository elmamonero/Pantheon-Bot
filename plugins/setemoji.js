import fs from "fs";
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

function guardarEmojisGrupo(data) {
  const contenido = "export default " + JSON.stringify(data, null, 2) + ";\n";
  fs.writeFileSync(emojisPath, contenido);
}

const handler = async (msg, { conn, args, command }) => {
  const chatId = msg.key.remoteJid;
  const senderJid = msg.key.participant || msg.key.remoteJid;

  if (!chatId.endsWith("@g.us")) {
    return await conn.sendMessage(
      chatId,
      { text: "❌ Este comando solo puede usarse en grupos." },
      { quoted: msg }
    );
  }

  // Verificar si es admin
  const metadata = await conn.groupMetadata(chatId);
  const participant = metadata.participants.find(p => p.id === senderJid);
  const isAdmin = participant?.admin === "admin" || participant?.admin === "superadmin";

  if (!isAdmin) {
    return await conn.sendMessage(
      chatId,
      { text: "❌ Solo los administradores pueden usar este comando." },
      { quoted: msg }
    );
  }

  let datos = await leerEmojisGrupo();

  if (command.toLowerCase() === "setemoji") {
    if (!args.length) {
      return await conn.sendMessage(
        chatId,
        { text: "❗️ Por favor, usa el comando seguido del emoji deseado. Ejemplo: `.setemoji ⚡`" },
        { quoted: msg }
      );
    }
    const emoji = args[0];
    datos[chatId] = emoji;
    guardarEmojisGrupo(datos);
    await conn.sendMessage(
      chatId,
      { text: `✅ Emoji del grupo cambiado a: ${emoji}` },
      { quoted: msg }
    );

  } else if (command.toLowerCase() === "resetemoji") {
    if (datos[chatId]) {
      delete datos[chatId];
      guardarEmojisGrupo(datos);
      await conn.sendMessage(
        chatId,
        { text: "✅ Emoji del grupo ha sido reseteado al predeterminado." },
        { quoted: msg }
      );
    } else {
      await conn.sendMessage(
        chatId,
        { text: "ℹ️ No había emoji personalizado para resetear." },
        { quoted: msg }
      );
    }
  }
};

handler.command = /^(setemoji|resetemoji)$/i;

export default handler;
