import fs from "fs";
import path from "path";

const emojisPath = path.resolve("./emojigrupo.js");

const emojisTag = [
  '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😉','😍','🥰','😘','😗','😙','😚','😋','😜','🤪',
  '😝','🤑','🤗','🤭','🤫','🤔','🤐','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴',
  '😷','🤒','🤕','🤢','🤮','🥵','🥶','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','☹️',
  '😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩',
  '😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','🤡','👹','👺','👻','👽','👾','🤖','💩',
  '👋','🤚','🖐','✋','🖖','👌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️',
  '👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏',
];

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

function randomEmoji() {
  return emojisTag[Math.floor(Math.random() * emojisTag.length)];
}

const handler = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;

  if (!chatId.endsWith("@g.us")) {
    return await conn.sendMessage(
      chatId,
      { text: "⚠️ Este comando solo funciona en grupos." },
      { quoted: msg }
    );
  }

  const metadata = await conn.groupMetadata(chatId);
  const participantes = metadata.participants.map(p => p.id);
  if (!participantes.length) {
    return await conn.sendMessage(
      chatId,
      { text: "No se encontraron participantes para asignar emojis." },
      { quoted: msg }
    );
  }

  // Solo admins pueden usarlo
  const senderJid = msg.key.participant || msg.key.remoteJid;
  const sender = metadata.participants.find(p => p.id === senderJid);
  const isAdmin = sender?.admin === "admin" || sender?.admin === "superadmin";
  if (!isAdmin) {
    return await conn.sendMessage(
      chatId,
      { text: "❌ Solo administradores pueden usar este comando." },
      { quoted: msg }
    );
  }

  const datos = await leerEmojisGrupo();
  if (!datos[chatId] || typeof datos[chatId] !== "object") {
    datos[chatId] = { default: "⚡", users: {} };
  } else if (!datos[chatId].users || typeof datos[chatId].users !== "object") {
    datos[chatId].users = {};
  }

  participantes.forEach(userId => {
    datos[chatId].users[userId] = randomEmoji();
  });

  guardarEmojisGrupo(datos);

  await conn.sendMessage(
    chatId,
    { text: "✅ Emojis asignados aleatoriamente a cada participante. Se usarán en el próximo comando de etiqueta masiva." },
    { quoted: msg }
  );
};

// handler.command = /^tagemojis$/i;

export default handler;
