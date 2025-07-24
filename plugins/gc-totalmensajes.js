import fs from "fs";
import path from "path";

const handler = async (msg, { conn, args }) => {
  try {
    const chatId = msg.key.remoteJid;
    const senderJid = msg.key.participant || msg.key.remoteJid;

    // Solo contar mensajes de grupo
    if (!chatId.endsWith("@g.us")) return;

    const rawID = conn.user?.id || "";
    const subbotID = rawID.split(":")[0] + "@s.whatsapp.net";
    const botNumber = rawID.split(":")[0].replace(/[^0-9]/g, "");
    const senderNum = senderJid.replace(/[^0-9]/g, "");

    // Leer prefijos (si tienes varios bots y prefijos personalizados)
    const prefixPath = path.resolve("prefixes.json");
    let prefixes = {};
    if (fs.existsSync(prefixPath)) {
      prefixes = JSON.parse(fs.readFileSync(prefixPath, "utf-8"));
    }
    const usedPrefix = prefixes[subbotID] || ".";

    // Guardar el mensaje en minúsculas para detectar comandos más adelante
    const body = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || "").toLowerCase();

    // INCREMENTAR contador de mensajes para TODOS los mensajes en grupo
    if (!global.db) global.db = {};
    if (!global.db.data) global.db.data = {};
    if (!global.db.data.groupChats) global.db.data.groupChats = {};
    if (!global.db.data.groupChats[chatId]) global.db.data.groupChats[chatId] = {};
    if (!global.db.data.groupChats[chatId][senderJid]) global.db.data.groupChats[chatId][senderJid] = { chat: 0 };
    global.db.data.groupChats[chatId][senderJid].chat += 1;

    // Detectar si el mensaje es un comando con el prefijo correcto
    const prefixEscaped = usedPrefix.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
    const commandRegex = new RegExp(`^${prefixEscaped}(\\w+)`);
    const commandMatch = body.match(commandRegex);
    const command = commandMatch ? commandMatch[1] : null;

    if (!command) return; // Si no es comando, no hacer nada más

    // SOLO manejar comandos en grupos
    const metadata = await conn.groupMetadata(chatId);
    const participants = metadata.participants;

    // Comando para mostrar total de mensajes — disponible para cualquier usuario
    if (command === "totalmensajes") {
      let usuariosMensajes = participants
        .filter((user) => !user.id.includes(botNumber)) // Excluir al bot
        .map((user) => ({
          id: user.id,
          mensajes: global.db.data.groupChats[chatId]?.[user.id]?.chat || 0,
        }));

      usuariosMensajes.sort((a, b) => b.mensajes - a.mensajes);

      let texto = `📊 *Total de Mensajes por Usuario en este Grupo* 📊\n\n`;
      texto += usuariosMensajes
        .map((u, i) => `${i + 1}. @${u.id.split("@")[0]} - *${u.mensajes}* mensajes`)
        .join("\n");

      return await conn.sendMessage(
        chatId,
        { text: texto, mentions: usuariosMensajes.map((u) => u.id) },
        { quoted: msg }
      );
    }

    // Comando para resetear contador — solo admins y bots
    if (command === "resetmensaje") {
      const participant = participants.find((p) => p.id === senderJid);
      const isAdmin = participant?.admin === "admin" || participant?.admin === "superadmin";
      const isBot = botNumber === senderNum;

      if (!isAdmin && !isBot) {
        return await conn.sendMessage(
          chatId,
          { text: "❌ Solo los administradores del grupo o el bot pueden usar este comando." },
          { quoted: msg }
        );
      }

      participants.forEach((user) => {
        if (!global.db.data.groupChats[chatId]) global.db.data.groupChats[chatId] = {};
        global.db.data.groupChats[chatId][user.id] = { chat: 0 };
      });

      return await conn.sendMessage(
        chatId,
        { text: "✅ Conteo de mensajes reiniciado para todos los participantes de este grupo." },
        { quoted: msg }
      );
    }
  } catch (error) {
    console.error("Error en handler de conteo mensajes:", error);
  }
};

// IMPORTANTÍSIMO: Para que se ejecute en TODOS los mensajes (no solo comandos), 
// NO le asignamos 'handler.command' ni 'handler.admin' aquí.

// Así el handler se ejecutará para cada mensaje, y nosotros detectamos comandos dentro.

export default handler;
