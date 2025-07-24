import fs from "fs";
import path from "path";

const handler = async (msg, { conn }) => {
  try {
    const chatId = msg.key.remoteJid;
    const senderJid = msg.key.participant || msg.key.remoteJid;

    if (!chatId.endsWith("@g.us")) return; // Solo grupos

    const rawID = conn.user?.id || "";
    const botNumber = rawID.split(":")[0].replace(/[^0-9]/g, "");

    // Leer prefijo (por si tienes prefijos distintos)
    const prefixPath = path.resolve("prefixes.json");
    let prefixes = {};
    if (fs.existsSync(prefixPath)) {
      prefixes = JSON.parse(fs.readFileSync(prefixPath, "utf-8"));
    }
    const usedPrefix = prefixes[rawID.split(":")[0] + "@s.whatsapp.net"] || ".";

    // Obtener texto mensaje en minúsculas
    const body = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || "").toLowerCase();

    // ----- INCREMENTAR conteo de mensajes ¡SIEMPRE! aunque sea comando o no
    if (!global.db) global.db = {};
    if (!global.db.data) global.db.data = {};
    if (!global.db.data.groupChats) global.db.data.groupChats = {};
    if (!global.db.data.groupChats[chatId] == null) global.db.data.groupChats[chatId] = {};
    if (!global.db.data.groupChats[chatId][senderJid] == null) global.db.data.groupChats[chatId][senderJid] = { chat: 0 };
    global.db.data.groupChats[chatId][senderJid].chat += 1;

    // ----- SOLO responder si es un comando con el prefijo correcto
    if (!body.startsWith(usedPrefix)) return;

    // Extraer comando sin prefijo ni argumentos
    const command = body.slice(usedPrefix.length).trim().split(/\s+/)[0];

    // Obtener info del grupo y participantes
    const metadata = await conn.groupMetadata(chatId);
    const participants = metadata.participants;

    if (command === "totalmensajes") {
      // Preparar lista de usuarios excluyendo al bot
      let usuariosMensajes = participants
        .filter(user => !user.id.includes(botNumber))
        .map(user => ({
          id: user.id,
          mensajes: global.db.data.groupChats[chatId]?.[user.id]?.chat || 0,
        }));

      // Ordenar de mayor a menor
      usuariosMensajes.sort((a, b) => b.mensajes - a.mensajes);

      // Crear texto con ranking
      let texto = `📊 *Total de Mensajes por Usuario en este Grupo* 📊\n\n`;
      texto += usuariosMensajes
        .map((u, i) => `${i + 1}. @${u.id.split("@")[0]} - *${u.mensajes}* mensajes`)
        .join("\n");

      return await conn.sendMessage(
        chatId,
        { text: texto, mentions: usuariosMensajes.map(u => u.id) },
        { quoted: msg }
      );
    }

    if (command === "resetmensaje") {
      // Solo admins o bot pueden resetear
      const sender = participants.find(p => p.id === senderJid);
      const isAdmin = sender?.admin === "admin" || sender?.admin === "superadmin";
      const isBot = botNumber === senderJid.replace(/[^0-9]/g, "");

      if (!isAdmin && !isBot) {
        return await conn.sendMessage(
          chatId,
          { text: "❌ Solo administradores o el bot pueden usar este comando." },
          { quoted: msg }
        );
      }

      participants.forEach(user => {
        if (!global.db.data.groupChats[chatId]) global.db.data.groupChats[chatId] = {};
        global.db.data.groupChats[chatId][user.id] = { chat: 0 };
      });

      return await conn.sendMessage(
        chatId,
        { text: "✅ Contador de mensajes reiniciado para todos los participantes." },
        { quoted: msg }
      );
    }
  } catch (error) {
    console.error("Error en handler totalmensajes:", error);
  }
};

// **IMPORTANTE**
// Para que este handler se ejecute en todos los mensajes y reconozca el comando,
// DEBES establecer este regex para que el sistema llame al handler en esos comandos:
//
// Esto sí hará que solo se ejecute para mensajes que coincidan con estos comandos:
//
// Por eso el conteo solo sumará cuando escribas comandos,
// a menos que tu bot permita ejecutar el handler sin esta línea.

// Pero si tu entorno **exige** esta propiedad, ponla así:

handler.command = /^(totalmensajes|resetmensaje)$/i;

// Si tu bot soporta otro sistema, elimina esa línea o crea un handler separado para el conteo.

export default handler;
