// contador.js
import fs from "fs";
import path from "path";

const conteoPath = path.resolve("./conteo.js");

async function leerConteo() {
  const datos = await import(conteoPath + "?update=" + Date.now());
  return datos.default || {};
}

function guardarConteo(data) {
  const contenido = "export default " + JSON.stringify(data, null, 2) + ";\n";
  fs.writeFileSync(conteoPath, contenido);
}

async function contarMensaje(msg, conn) {
  if (!msg.key.remoteJid.endsWith("@g.us")) return;

  const chatId = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  let conteoData;
  try {
    conteoData = await leerConteo();
  } catch {
    conteoData = {};
  }

  if (!conteoData[chatId]) conteoData[chatId] = {};
  if (!conteoData[chatId][sender]) conteoData[chatId][sender] = 0;

  conteoData[chatId][sender] += 1;

  guardarConteo(conteoData);
}

export { contarMensaje };
