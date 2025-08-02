import fs from 'fs';
import path from 'path';

const emojiFile = path.resolve('./emojigrupo.json');

const emojisTag = [
  '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😉','😍','🥰','😘','😗','😙','😚','😋','😜','🤪',
  '😝','🤑','🤗','🤭','🤫','🤔','🤐','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴',
  '😷','🤒','🤕','🤢','🤮','🥵','🥶','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','☹️',
  '😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩',
  '😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','🤡','👹','👺','👻','👽','👾','🤖','💩',
  '👋','🤚','🖐','✋','🖖','👌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️',
  '👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏',
];

function leerArchivoEmojis() {
  try {
    if (!fs.existsSync(emojiFile)) return {};
    const data = fs.readFileSync(emojiFile, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function guardarArchivoEmojis(data) {
  fs.writeFileSync(emojiFile, JSON.stringify(data, null, 2));
}

function randomEmoji() {
  return emojisTag[Math.floor(Math.random() * emojisTag.length)];
}

const tagemojisHandler = async (m, { conn }) => {
  if (!m.isGroup) return await conn.sendMessage(m.chat, { text: "⚠️ Este comando solo funciona en grupos." }, { quoted: m });

  const chatId = m.chat;
  const participantes = Object.keys(conn.chats[chatId]?.presences || {});

  if (!participantes.length) return await conn.sendMessage(chatId, { text: "No se encontraron participantes para asignar emojis." }, { quoted: m });

  const emojisGuardados = leerArchivoEmojis();

  emojisGuardados[chatId] = emojisGuardados[chatId] || {};

  participantes.forEach(userId => {
    emojisGuardados[chatId][userId] = randomEmoji();
  });

  guardarArchivoEmojis(emojisGuardados);

  await conn.sendMessage(
    chatId,
    {
      text: `✅ Emojis actualizados para cada participante y se usarán en el próximo comando .todos`
    },
    { quoted: m }
  );
};

tagemojisHandler.help = ['tagemojis'];
tagemojisHandler.tags = ['group'];
tagemojisHandler.command = /^tagemojis$/i;
tagemojisHandler.group = true;

export default tagemojisHandler;
