import fs from "fs";
import path from "path";

const conteoPath = path.resolve("./conteo.json");

const conteo = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;
  if (!chatId || !chatId.endsWith("@g.us")) return; // Solo contar mensajes en grupos

  // Leer el archivo conteo.json o crear objeto vacío
  let conteoData = {};
  if (fs.existsSync(conteoPath)) {
    try {
      conteoData = JSON.parse(fs.readFileSync(conteoPath, "utf-8"));
    } catch (e) {
      console.error("Error leyendo conteo.json:", e);
      conteoData = {};
    }
  }

  // Si no hay registro para el grupo, inicializar
  if (!conteoData[chatId]) {
    conteoData[chatId] = {};
  }

  // Obtener el ID del remitente del mensaje
  const senderJid = msg.key.participant || msg.key.remoteJid;

  // Inicializar contador si no existe
  if (!conteoData[chatId][senderJid]) {
    conteoData[chatId][senderJid] = 0;
  }

  // Incrementar contador
  conteoData[chatId][senderJid] += 1;

  // Guardar de nuevo en el archivo
  try {
    fs.writeFileSync(conteoPath, JSON.stringify(conteoData, null, 2));
  } catch (e) {
    console.error("Error guardando conteo.json:", e);
  }
};

export default conteo;
