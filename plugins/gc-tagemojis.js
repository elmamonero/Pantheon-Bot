import fs from 'fs';
import path from 'path';

const emojiFile = path.resolve('./emojigrupo.js'); // Archivo .js

const emojisTag = [
  '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😉','😍','🥰','😘','😗','😙','😚','😋','😜','🤪',
  '😝','🤑','🤗','🤭','🤫','🤔','🤐','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴',
  '😷','🤒','🤕','🤢','🤮','🥵','🥶','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','☹️',
  '😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩',
  '😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','🤡','👹','👺','👻','👽','👾','🤖','💩',
  '👋','🤚','🖐','✋','🖖','👌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️',
  '👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏',
];

// Leer archivo .js con import dinámico
async function leerArchivoEmojis() {
  try {
    const datos = await import(emojiFile + "?update=" + Date.now());
    return datos.default || {};
  } catch {
    return {};
  }
}

// Guardar archivo .js con export default
function guardarArchivoEmojis(data) {
  const contenido = "export default " + JSON.stringify(data, null, 2) + ";";
  fs.writeFileSync(emojiFile, contenido, 'utf-8');
}

function randomEmoji() {
  return emojisTag[Math.floor(Math.random() * emojisTag.length)];
}

const tagemojisHandler = async (m, { conn }) => {
  if (!m.isGroup) {
    await conn.sendMessage(m.chat, { text: "⚠️ Este comando solo funciona en grupos." }, { quoted: m });
    return;
  }

  const chatId = m.chat;
  const metadata = await conn.groupMetadata(chatId);
  const participantes = metadata.participants.map(p => p.id);

  if (!participantes.length) {
    await conn.sendMessage(chatId, { text: "No se encontraron participantes para asignar emojis." }, { quoted: m });
    return;
  }

  const emojisGuardados = await leerArchivoEmojis();

  if (typeof emojisGuardados[chatId] !== 'object' || emojisGuardados[chatId] === null) {
    emojisGuardados[chatId] = {};
  }

  participantes.forEach(userId => {
    emojisGuardados[chatId][userId] = randomEmoji();
  });

  guardarArchivoEmojis(emojisGuardados);

  await conn.sendMessage(
    chatId,
    { text: `✅ Emojis actualizados para cada participante y se usarán en el próximo comando .todos` },
    { quoted: m }
  );
};

tagemojisHandler.help = ['tagemojis'];
tagemojisHandler.tags = ['group'];
tagemojisHandler.command = /^tagemojis$/i;
tagemojisHandler.group = true;

export default tagemojisHandler;
