import fs from "fs";
import path from "path";
import moment from "moment-timezone";

const schedulePath = path.resolve("./grupo-programacion.json");

// Leer configuración guardada
function leerConfig() {
  if (!fs.existsSync(schedulePath)) return {};
  return JSON.parse(fs.readFileSync(schedulePath, "utf-8"));
}

// Guardar configuración
function guardarConfig(data) {
  fs.writeFileSync(schedulePath, JSON.stringify(data, null, 2));
}

const zonasValidas = {
  mexico: "America/Mexico_City",
  bogota: "America/Bogota",
  lima: "America/Lima",
  argentina: "America/Argentina/Buenos_Aires",
};

function parsearHora(textoHora, zona) {
  // Convierte formato tipo "8:00 am" o "22:30" a momento con zona
  // Por simplicidad, normaliza am/pm y usa moment-timezone
  const zonaTz = zona || "America/Mexico_City"; // default zona

  // Limpia la hora y separa partes
  let text = textoHora.toLowerCase().replace(/\s+/g, "");
  let ampm = null;
  if (text.includes("am")) {
    ampm = "am";
    text = text.replace("am", "");
  } else if (text.includes("pm")) {
    ampm = "pm";
    text = text.replace("pm", "");
  }

  let [h, m] = text.split(":");
  if (!m) m = "00";
  h = parseInt(h);
  m = parseInt(m);

  // Ajuste am/pm
  if (ampm === "pm" && h < 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;

  // Devuelve objeto momento con fecha actual (hoy) y zona, solo con hora y minutos
  return moment.tz({ hour: h, minute: m, second: 0 }, zonaTz);
}

async function programarGrupo(bot, chatId, abrirHora, cerrarHora, zona) {
  // Guardar configuración en archivo
  const config = leerConfig();
  config[chatId] = { abrirHora, cerrarHora, zona };
  guardarConfig(config);

  // Confirmar al grupo
  await bot.sendMessage(
    chatId,
    {
      text: `✅ Programación guardada para este grupo.\nAbrir: ${abrirHora}\nCerrar: ${cerrarHora}\nZona: ${zona || "America/Mexico_City"}`
    }
  );
}

// Función para aplicar apertura o cierre del grupo
async function setGrupoEstado(bot, chatId, abrir) {
  try {
    const metadata = await bot.groupMetadata(chatId);
    // Cambiar configuración del grupo para permitir o no enviar mensajes (cerrado o abierto)
    // (Esta función varía según librería, este es el método típico en whatsapp-web.js)
    await bot.groupSettingUpdate(chatId, abrir ? "not_announcement" : "announcement");

  } catch (error) {
    console.error("Error al cambiar estado del grupo:", error);
  }
}

// Función que se ejecuta cada minuto para revisar si abrir o cerrar
async function verificarYAplicar(bot) {
  const config = leerConfig();
  const ahoraUnix = moment().unix();

  for (const chatId in config) {
    const { abrirHora, cerrarHora, zona } = config[chatId];
    if (!abrirHora || !cerrarHora) continue;

    // Convertir horas a momentos hoy según zona
    const zonaTz = zonasValidas[zona?.toLowerCase()] || "America/Mexico_City";
    const ahora = moment.tz(zonaTz);
    
    const abrirMom = parsearHora(abrirHora, zonaTz).set({
      year: ahora.year(),
      month: ahora.month(),
      date: ahora.date(),
    });

    const cerrarMom = parsearHora(cerrarHora, zonaTz).set({
      year: ahora.year(),
      month: ahora.month(),
      date: ahora.date(),
    });

    // Estado actual del grupo?
    const metadata = await bot.groupMetadata(chatId);
    const isCerrado = metadata.announce; // true si cerrado

    // Si hora actual >= abrir y < cerrar, abrir grupo (dejar que todos hablen)
    if (ahora.isBetween(abrirMom, cerrarMom)) {
      if (isCerrado) await setGrupoEstado(bot, chatId, true); // abrir
    } else {
      // Si no, cerrar grupo (solo admins pueden enviar mensajes)
      if (!isCerrado) await setGrupoEstado(bot, chatId, false);
    }
  }
}

// Handler para el comando programargrupo
const handler = async (msg, { conn, args }) => {
  const chatId = msg.key.remoteJid;
  if (!chatId.endsWith("@g.us")) return;

  const metadata = await conn.groupMetadata(chatId);
  const participant = metadata.participants.find(p => p.id === (msg.key.participant || msg.key.remoteJid));
  const isAdmin = participant?.admin === "admin" || participant?.admin === "superadmin";
  if (!isAdmin) {
    return await conn.sendMessage(chatId, { text: "❌ Solo admins pueden usar este comando." }, { quoted: msg });
  }

  // Ejemplo técnico para parsear argumentos (simplificado)
  // Se esperan comandos como:
  // .programargrupo abrir 8:00 am cerrar 10:30 pm
  // o .programargrupo zona America/Mexico_City
  let abrirHora = null;
  let cerrarHora = null;
  let zona = null;

  // Parsear args
  for (let i = 0; i < args.length; i++) {
    const arg = args[i].toLowerCase();
    if (arg === "abrir" && i + 1 < args.length) {
      abrirHora = args[i + 1];
      i++;
      // puede ser 2 palabras si tiene am/pm ej "8:00 am"
      if (i + 1 < args.length && (args[i + 1].toLowerCase() === "am" || args[i + 1].toLowerCase() === "pm")) {
        abrirHora += " " + args[i + 1].toLowerCase();
        i++;
      }
    } else if (arg === "cerrar" && i + 1 < args.length) {
      cerrarHora = args[i + 1];
      i++;
      if (i + 1 < args.length && (args[i + 1].toLowerCase() === "am" || args[i + 1].toLowerCase() === "pm")) {
        cerrarHora += " " + args[i + 1].toLowerCase();
        i++;
      }
    } else if (arg === "zona" && i + 1 < args.length) {
      zona = args[i + 1];
      i++;
    }
  }

  if (!abrirHora && !cerrarHora && !zona) {
    return await conn.sendMessage(chatId, {
      text: `🌅 *Programación de grupo*\n\n*Uso correcto:*\n» .programargrupo abrir 8:00 am cerrar 10:30 pm\n» .programargrupo zona America/Mexico_City\n\n*Ejemplos:*\n• .programargrupo abrir 7:45 am\n• .programargrupo cerrar 11:15 pm\n• .programargrupo abrir 8:30 am cerrar 10:00 pm\n• .programargrupo zona America/Bogota\n\n⏰ *Puedes usar hora y minutos, y am/pm, y zonas soportadas: México, Bogota, Lima, Argentina`}, { quoted: msg });
  }

  // Si solo zona se quiere cambiar
  if (zona) {
    // Leer config, cambiar zona solo si config existe y tiene horarios
    const config = JSON.parse(fs.existsSync(schedulePath) ? fs.readFileSync(schedulePath, "utf-8") : "{}");
    if (!config[chatId]) config[chatId] = {};
    config[chatId].zona = zona;
    fs.writeFileSync(schedulePath, JSON.stringify(config, null, 2));
    await conn.sendMessage(chatId, { text: `✅ Zona horaria cambiada a ${zona}` }, { quoted: msg });
    return;
  }

  // Guardar horarios
  const config = JSON.parse(fs.existsSync(schedulePath) ? fs.readFileSync(schedulePath, "utf-8") : "{}");
  if (!config[chatId]) config[chatId] = {};
  if (abrirHora) config[chatId].abrirHora = abrirHora;
  if (cerrarHora) config[chatId].cerrarHora = cerrarHora;
  if (zona) config[chatId].zona = zona;
  else if (!config[chatId].zona) config[chatId].zona = "America/Mexico_City";
  fs.writeFileSync(schedulePath, JSON.stringify(config, null, 2));

  await conn.sendMessage(chatId, { text: `✅ Programación actualizada:\nAbrir: ${abrirHora || config[chatId].abrirHora}\nCerrar: ${cerrarHora || config[chatId].cerrarHora}\nZona: ${config[chatId].zona}` }, { quoted: msg });
};

// Exportar función de verificación para el bot que debe ejecutarse periódicamente
export { handler, verificarYAplicar };
