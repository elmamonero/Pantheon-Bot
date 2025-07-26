import fs from 'fs';
import path from 'path';

const progPath = path.resolve('./programaciongrupo.js');

// Leer configuración guardada
async function leerProgramacion() {
  try {
    const datos = await import(progPath + '?update=' + Date.now());
    return datos.default || {};
  } catch {
    return {};
  }
}

// Función para determinar si la hora actual está dentro del rango abrir-cerrar
function estaEnRango(horaActual, abrir, cerrar) {
  if (!abrir || !cerrar) return false;
  const [hA, mA] = horaActual.split(':').map(Number);
  const [hAbrir, mAbrir] = abrir.split(':').map(Number);
  const [hCerrar, mCerrar] = cerrar.split(':').map(Number);

  const totalA = hA * 60 + mA;
  const totalAbrir = hAbrir * 60 + mAbrir;
  const totalCerrar = hCerrar * 60 + mCerrar;

  if (totalAbrir <= totalCerrar) {
    return totalA >= totalAbrir && totalA < totalCerrar;
  } else {
    // Rango que pasa la medianoche
    return totalA >= totalAbrir || totalA < totalCerrar;
  }
}

const estadoGrupo = {}; // Guarda el estado actual para no repetir mensajes

// Función que revisa todos los grupos y cambia estado si aplica
async function revisarYAplicarEstados(conn) {
  let progData = await leerProgramacion();
  for (const chatId of Object.keys(progData)) {
    const config = progData[chatId];
    if (!config) continue;
    const { abrir, cerrar, zona } = config;
    if (!abrir && !cerrar) continue;

    // Obtener hora actual en zona configurada
    let horaAhora;
    try {
      horaAhora = new Date().toLocaleString('en-US', { timeZone: zona });
    } catch {
      horaAhora = new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' });
    }
    const d = new Date(horaAhora);
    const horaStr = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;

    const debeEstarAbierto = estaEnRango(horaStr, abrir, cerrar);

    if (estadoGrupo[chatId] === undefined) estadoGrupo[chatId] = debeEstarAbierto ? 'abierto' : 'cerrado';

    if (debeEstarAbierto && estadoGrupo[chatId] !== 'abierto') {
      try {
        await conn.groupSettingChange(chatId, 'not_announcement'); // Permite que hablen todos
        await conn.sendMessage(chatId, { text: '✅ El grupo se ha *ABIERTO* según programación.' });
        estadoGrupo[chatId] = 'abierto';
      } catch (e) {
        console.error(`Error abriendo grupo ${chatId}:`, e);
      }
    } else if (!debeEstarAbierto && estadoGrupo[chatId] !== 'cerrado') {
      try {
        await conn.groupSettingChange(chatId, 'announcement'); // Solo admins pueden hablar
        await conn.sendMessage(chatId, { text: '⛔ El grupo se ha *CERRADO* según programación.' });
        estadoGrupo[chatId] = 'cerrado';
      } catch (e) {
        console.error(`Error cerrando grupo ${chatId}:`, e);
      }
    }
  }
}

// Función para iniciar el verificador (llamar desde donde inicias el bot)
function iniciarVerificadorAutomático(conn) {
  // Revisa cada minuto
  setInterval(() => {
    revisarYAplicarEstados(conn).catch(err => console.error('Error verificador programación:', err));
  }, 60 * 1000);

  // Ejecutar una vez al iniciar
  revisarYAplicarEstados(conn).catch(err => console.error('Error verificador inicial:', err));
}

export { iniciarVerificadorAutomático };
