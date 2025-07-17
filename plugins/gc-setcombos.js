import fs from 'fs';

// Handler para el comando de combos  
const handler = async (m, { conn, text, chat }) => {  
  const datas = global;  
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;  

  // Obtener el ID del grupo o chat actual  
  const chatId = m.chat;  

  // Inicializar combos para este grupo si no existe  
  if (!global.db.data.combos) {  
    global.db.data.combos = {};  
  }  
  if (!global.db.data.combos[chatId]) {  
    global.db.data.combos[chatId] = {};  
  }  

  const groupCombos = global.db.data.combos[chatId]; // Combos específicos del grupo  

  // Comando para consultar los combos  
  if (m.text.startsWith('.combos')) {  
    if (Object.keys(groupCombos).length === 0) {  
      m.reply("🧑‍💼✨ **𝐈𝐧𝐯𝐞𝐧𝐭𝐚𝐫𝐢𝐨 𝐝𝐞 𝐂𝐨𝐦𝐛𝐨𝐬 𝐕𝐚𝐜í𝐨** ✨"); // Mensaje si no hay combos  
      return;  
    }  

    let combosMessage = '';  
    for (const combo in groupCombos) {  
      combosMessage += `${combo}\n`; // Agregar solo el nombre del combo  
    }  

    m.reply(combosMessage.trim()); // Enviar la lista de combos sin otro texto adicional  
    return;  
  }  

  // Comando para establecer los combos  
  if (m.text.startsWith('.setcombos')) {  
    if (!text) {  
      m.reply("𝙀𝙨𝙘𝙧𝙞𝙗𝙚 𝙡𝙤𝙨 𝙘𝙤𝙢𝙗𝙤𝙨 📦."); // Mensaje de uso correcto  
      return;  
    }  

    const combo = text; // Usar todo el texto como nombre de combo  

    // Eliminar combos anteriores y agregar el nuevo combo
    global.db.data.combos[chatId] = {}; // Reiniciar combos específicos del grupo  
    global.db.data.combos[chatId][combo] = true; // Almacenar el combo como existente  
    fs.writeFileSync('./database.json', JSON.stringify(global.db)); // Guardar los cambios en la base de datos
    m.reply(`𝘾𝙤𝙢𝙗𝙤𝙨 𝘼𝙘𝙩𝙪𝙖𝙡𝙞𝙯𝙖𝙙𝙤𝙨 📦`);  
  }  
};  

handler.help = ['combos', 'setcombos <combo>', 'resetcombos'];  
handler.tags = ['group'];  
handler.command = ['combos', 'setcombos', 'resetcombos', 'combo', 'setcombo'];  
handler.admin = true;  

export default handler;
