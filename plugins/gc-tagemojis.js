export async function tagemojis(m, { conn }) {
  if (!m.isGroup)
    return await conn.sendMessage(m.chat, { text: "❌ Este comando solo funciona en grupos." }, { quoted: m });

  const mensaje = "✅ Emojis aleatorios configurados exitosamente.\n🎯 Se usarán en el próximo .todos";

  await conn.sendMessage(m.chat, { text: mensaje }, { quoted: m });
}

tagemojis.command = /^tagemojis$/i;
tagemojis.group = true;
tagemojis.tags = ['group'];
tagemojis.help = ['tagemojis'];
