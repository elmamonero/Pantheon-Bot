import fs from 'fs';

// Handler para el comando de pago  
const handler = async (m, { conn, text, chat }) => {  
  const datas = global;  
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;  

  // Obtener el ID del grupo o chat actual  
  const chatId = m.chat;  

  // Inicializar pago para este grupo si no existe  
  if (!global.db.data.pago) {  
    global.db.data.pago = {};  
  }  
  if (!global.db.data.pago[chatId]) {  
    global.db.data.pago[chatId] = {};  
  }  

  const groupPago = global.db.data.pago[chatId]; // Pago específico del grupo  

  // Comando para consultar el pago  
  if (m.text.startsWith('.pago')) {  
    if (Object.keys(groupPago).length === 0) {  
      m.reply("🧑‍💼✨ **𝐈𝐧𝐯𝐞𝐧𝐭𝐚𝐫𝐢𝐨 𝐯𝐚𝐜𝐢𝐨** ✨"); // Mensaje si no hay productos  
      return;  
    }  

    let PagoMessage = '';  
    for (const product in groupPago) {  
      PagoMessage += `${product}\n`; // Agregar solo el nombre del producto  
    }  

    m.reply(PagoMessage.trim()); // Enviar la lista de pagos sin otro texto adicional  
    return;  
  }  

  // Comando para establecer el pago  
  if (m.text.startsWith('.setpago')) {  
    if (!text) {  
      m.reply("𝙀𝙨𝙘𝙧𝙞𝙗𝙚 𝙩𝙪 𝙢𝙚𝙩𝙤𝙙𝙤 𝙙𝙚 𝙥𝙖𝙜𝙤🏛️."); // Mensaje de uso correcto  
      return;  
    }  

    const product = text; // Usar todo el texto como producto  

    // Eliminar pagos anteriores y agregar el nuevo producto al pago
    global.db.data.pago[chatId] = {}; // Reiniciar el pago específico del grupo  
    global.db.data.pago[chatId][product] = true; // Almacenar el producto como existente  
    fs.writeFileSync('./database.json', JSON.stringify(global.db)); // Guardar los cambios en la base de datos
    m.reply(`𝙈𝙚𝙩𝙤𝙙𝙤 𝙙𝙚 𝙋𝙖𝙜𝙤 𝘼𝙘𝙩𝙪𝙖𝙡𝙞𝙯𝙖𝙙𝙤🏛️`);  
  }  
};  

handler.help = ['pago', 'setpago <producto>', 'resetpago'];  
handler.tags = ['group'];  
handler.command = ['pago', 'setpago'];  
handler.admin = true;  

export default handler;
