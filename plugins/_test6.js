import fetch from 'node-fetch';

let handler = async (m, { conn, args, usedPrefix, command }) => {
    const apiKey = '9f51309abe04626c88401dc9';  

    if (command === 'cambiar' || command === 'convertir') {
        try {
            if (args.length < 4 || args[2].toLowerCase() !== 'a') {
                m.reply(`⚠️ Uso incorrecto. Por favor, usa el formato:\n\`${usedPrefix}${command} [cantidad] [moneda_origen] a [moneda_destino]\`\nEjemplo: \`${usedPrefix}cambiar 100 USD a EUR\``);
                return;
            }

            const cantidad = parseFloat(args[0]);
            const monedaOrigen = args[1].toUpperCase();
            const monedaDestino = args[3].toUpperCase();

            if (isNaN(cantidad) || cantidad <= 0) {
                m.reply('⚠️ La cantidad debe ser un número positivo.');
                return;
            }

            const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${monedaOrigen}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.result !== 'success') {
                let errorMessage = '❌ No se pudo obtener la tasa de cambio.';
                if (data['error-type']) {
                    errorMessage += ` Error de la API: ${data['error-type'].replace(/_/g, ' ')}`;
                    if (data['error-type'] === 'unsupported-code') {
                         errorMessage += `\nVerifica que las monedas (${monedaOrigen} o ${monedaDestino}) sean códigos ISO válidos.`;
                    }
                }
                m.reply(errorMessage);
                return;
            }

            const rate = data.conversion_rates[monedaDestino];

            if (!rate) {
                m.reply(`❌ No se encontró la tasa de conversión para ${monedaDestino}.`);
                return;
            }

            const resultado = cantidad * rate;

            const mensaje = `📈 ${cantidad} *${monedaOrigen}* equivale a aproximadamente *${resultado.toFixed(2)} ${monedaDestino}*.\n_Tasas actualizadas al: ${new Date(data.time_last_update_utc).toLocaleString()}_`;
            
            conn.reply(m.chat, mensaje, m);

        } catch (error) {
            console.error(error);
            m.reply('❌ Ocurrió un error al procesar tu solicitud.');
        }
    }
};

handler.help = ['cambiar <cantidad> <moneda_origen> a <moneda_destino>', 'convertir <cantidad> <moneda_origen> a <moneda_destino>'];
handler.tags = ['herramientas'];
handler.command = ['cambiar', 'convertir'];

export default handler;
