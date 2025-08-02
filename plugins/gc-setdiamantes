import fs from 'fs';

// Handler para el comando de diamantes  
const handler = async (m, { conn, text, chat }) => {  
  const datas = global;  
  const idioma = datas.db.data.users[m.sender]?.language || global.defaultLenguaje;  

  // Obtener el ID del grupo o chat actual  
  const chatId = m.chat;  

  // Inicializar diamantes para este grupo si no existe  
  if (!global.db.data.diamantes) {  
    global.db.data.diamantes = {};  
  }  
  if (!global.db.data.diamantes[chatId]) {  
    global.db.data.diamantes[chatId] = {};  
  }  

  const groupDiamantes = global.db.data.diamantes[chatId]; // Diamantes específicos del grupo  

  // Comando para consultar los diamantes  
  if (m.text.startsWith('.diamantes')) {  
    if (Object.keys(groupDiamantes).length === 0) {  
      m.reply("🧑‍💼✨ **Inventario vacío** ✨"); // Mensaje si no hay productos  
      return;  
    }  

    let diamantesMessage = '';  
    for (const producto in groupDiamantes) {  
      diamantesMessage += `${producto}\n`; // Agregar solo el nombre del producto  
    }  

    m.reply(diamantesMessage.trim()); // Enviar la lista de diamantes sin otro texto adicional  
    return;  
  }  

  // Comando para establecer los diamantes  
  if (m.text.startsWith('.setdiamantes')) {  
    if (!text) {  
      m.reply("𝙀𝙨𝙘𝙧𝙞𝙗𝙚 𝙩𝙪 𝙨𝙩𝙤𝙘𝙠 𝙙𝙚 𝙙𝙞𝙖𝙢𝙖𝙣𝙩𝙚𝙨💎."); // Mensaje de uso correcto  
      return;  
    }  

    const producto = text; // Usar todo el texto como producto  

    // Reiniciar los diamantes específicos del grupo y agregar el nuevo producto  
    global.db.data.diamantes[chatId] = {};  
    global.db.data.diamantes[chatId][producto] = true;  

    fs.writeFileSync('./database.json', JSON.stringify(global.db)); // Guardar cambios  
    m.reply("💎 𝙎𝙩𝙤𝙘𝙠 𝙙𝙚 𝙙𝙞𝙖𝙢𝙖𝙣𝙩𝙚𝙨 𝙖𝙘𝙩𝙪𝙖𝙡𝙞𝙯𝙖𝙙𝙤💎");  
  }  
};  

handler.help = ['diamantes', 'setdiamantes <producto>', 'resetdiamantes'];  
handler.tags = ['group'];  
handler.command = ['diamantes', 'setdiamantes', 'resetdiamantes', 'diamante', 'setdiamante'];  
handler.admin = true;  

export default handler;
