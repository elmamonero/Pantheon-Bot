import fs from "fs";
import path from "path";

const handler = async (msg, { conn, args }) => {
  // 📈 Conteo automático de mensajes por usuario
  const senderJid = msg.key.participant || msg.key.remoteJid;
  if (!global.db.data.users[senderJid]) global.db.data.users[senderJid] = {};
  global.db.data.users[senderJid].chat = (global.db.data.users[senderJid].chat || 0) + 1;

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
  const senderNum = senderJid.replace(/[^0-9]/g, "");

  if (!chatId.endsWith("@g.us")) {
    return await conn.sendMessage(
      chatId,
      { text: "⚠️ *Este comando solo se puede usar en grupos.*" },
      { quoted: msg }
    );
  }

  const metadata = await conn.groupMetadata(chatId);
  const participants = metadata.participants;

  const participant = participants.find((p) => p.id.includes(senderNum));
  const isAdmin = participant?.admin === "admin" || participant?.admin === "superadmin";
  const isBot = botNumber === senderNum;

  if (!isAdmin && !isBot) {
    return await conn.sendMessage(
      chatId,
      { text: "❌ Solo los administradores del grupo o el subbot pueden usar este comando." },
      { quoted: msg }
    );
  }

  const body = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || "").toLowerCase();
  const prefixEscaped = usedPrefix.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
  const commandRegex = new RegExp(`^${prefixEscaped}(\\w+)`);
  const commandMatch = body.match(commandRegex);
  const command = commandMatch ? commandMatch[1] : "";

  // 🔁 Reconstrucción de historial si existe `global.db.data.chats`
  if (command === "totalmensajes" && global.db?.data?.chats) {
    for (const chat in global.db.data.chats) {
      const mensajes = global.db.data.chats[chat];
      for (const m of mensajes) {
        const id = m.sender;
        if (!id || id.includes(botNumber)) continue;
        if (!global.db.data.users[id]) global.db.data.users[id] = {};
        global.db.data.users[id].chat = (global.db.data.users[id].chat || 0) + 1;
      }
    }
  }

  if (command === "totalmensajes") {
    let usuariosMensajes = participants
      .filter((user) => !user.id.includes(botNumber))
      .map((user) => ({
        id: user.id,
        mensajes: global.db.data.users[user.id]?.chat || 0,
      }));

    usuariosMensajes.sort((a, b) => b.mensajes - a.mensajes);

    let texto = `📊 *Total de Mensajes por Usuario* 📊\n\n`;
    texto += usuariosMensajes
      .map((u, i) => `${i + 1}. @${u.id.split("@")[0]} - *${u.mensajes}* mensajes`)
      .join("\n");

    return await conn.sendMessage(
      chatId,
      { text: texto, mentions: usuariosMensajes.map((u) => u.id) },
      { quoted: msg }
    );
  } else if (command === "resetmensaje") {
    participants.forEach((user) => {
      if (!global.db.data.users[user.id]) global.db.data.users[user.id] = {};
      global.db.data.users[user.id].chat = 0;
    });

    return await conn.sendMessage(
      chatId,
      { text: "✅ Conteo de mensajes reiniciado para todos los participantes." },
      { quoted: msg }
    );
  }
};

handler.command = /^(totalmensajes|resetmensaje)$/i;
handler.admin = true;
handler.botAdmin = true;

export default handler;
