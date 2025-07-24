import fs from "fs";
import path from "path";

const handler = async (msg, { conn, args }) => {
  const rawID = conn.user?.id || "";
  const subbotID = rawID.split(":")[0] + "@s.whatsapp.net";
  const botNumber = rawID.split(":")[0].replace(/[^0-9]/g, "");

  const prefixPath = path.resolve("prefixes.json");
  let prefixes = {};
  if (fs.existsSync(prefixPath)) {
    prefixes = JSON.parse(fs.readFileSync(prefixPath, "utf-8"));
  }
  const usedPrefix = prefixes[subbotID] || ".";

  const chatId = msg.key.remoteJid;
  const senderJid = msg.key.participant || msg.key.remoteJid;
  const senderNum = senderJid.replace(/[^0-9]/g, "");
  const senderTag = `@${senderNum}`;

  if (!chatId.endsWith("@g.us")) {
    return await conn.sendMessage(
      chatId,
      {
        text: "⚠️ *Este comando solo se puede usar en grupos.*"
      },
      { quoted: msg }
    );
  }

  const metadata = await conn.groupMetadata(chatId);
  const participants = metadata.participants;
  const memberCount = participants.length;

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

  // Aquí detectamos el comando, asumiendo que lo capturas en `args[0]` o lo recibes de otro modo
  // Pero tienes aquí el handler para muchos comandos, así que mejor usar regex en handler.command

  // Para manejar totalmensajes y resetmensaje:

  // Nota: el comando lo capturará el sistema (cuando importes este handler)
  // Así que definimos el regex para que funcione para estos 2 comandos (además de otros que puedas tener)

  // Emulación de identificar comando:
  // Si estás usando un manejador global que llama este handler para varios comandos,
  // aquí el nombre de comando se deduce generalmente de msg.body o de otro método.
  // Para simplificar, lo mejor es usar el regex en handler.command.

  // Pero aquí voy a detectar el comando en base a msg.body o args[0]:

  let body = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || "").toLowerCase();
  // Extraemos sólo el comando limpio sin prefijo
  // Ejemplo: si usas prefijo '.', eliminamos y obtenemos el comando
  const prefixEscaped = usedPrefix.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
  const commandRegex = new RegExp(`^${prefixEscaped}(\\w+)`);
  let commandMatch = body.match(commandRegex);
  let command = commandMatch ? commandMatch[1] : "";

  if (command === "totalmensajes") {
    // Obtener mensajes ordenados y enviar
    let usuariosMensajes = participants.map(user => ({
      id: user.id,
      mensajes: (global.db.data.users[user.id]?.chat) || 0
    }));

    usuariosMensajes.sort((a, b) => b.mensajes - a.mensajes);

    let texto = `📊 *Total de Mensajes por Usuario* 📊\n\n`;
    texto += usuariosMensajes
      .map((u, i) => `${i + 1}. @${u.id.split("@")[0]} - *${u.mensajes}* mensajes`)
      .join("\n");

    return await conn.sendMessage(
      chatId,
      {
        text: texto,
        mentions: usuariosMensajes.map(u => u.id),
      },
      { quoted: msg }
    );
  } else if (command === "resetmensaje") {
    // Resetear mensajes
    participants.forEach(user => {
      if (!global.db.data.users[user.id]) global.db.data.users[user.id] = {};
      global.db.data.users[user.id].chat = 0;
    });

    return await conn.sendMessage(
      chatId,
      {
        text: "✅ Conteo de mensajes reiniciado para todos los participantes.",
      },
      { quoted: msg }
    );
  } else {
    // Aquí puedes mantener el otro código para otros comandos que tengas o eliminar si no aplican.
    // Si quieres ignorar otros comandos aquí, puedes simplemente terminar.
    return;
  }
};

handler.command = /^(totalmensajes|resetmensaje|tagall|t|invocar|marcar|todos|invocación)$/i;
export default handler;
