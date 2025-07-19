import fetch from 'node-fetch';

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (command === 'cambiar' || command === 'convertir' || command === 'moneda' || command === 'monedas') {
        // Handler para conversión de divisas
        const apiKey = '9f51309abe04626c88401dc9';

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
    } else if (command === 'divisas') {
        // Handler para mostrar lista de divisas
        const message = `
💱 *DIVISAS DE LATAM*
*┈┈┈┈┈┈┈┈┈┈┈┈┈┈*

PAÍS ┋ MONEDA
🇭🇳 ┋ HNL  
🇺🇸 ┋ USD
🇲🇽 ┋ MXN
🇨🇴 ┋ COP
🇨🇱 ┋ CLP
🇦🇷 ┋ ARS
🇵🇪 ┋ PEN
🇬🇹 ┋ GTQ
🇳🇮 ┋ NIO
🇨🇷 ┋ CRC
🇵🇦 ┋ PAB
🇵🇾 ┋ PYG
🇺🇾 ┋ UYU
🇩🇴 ┋ DOP
🇧🇴 ┋ BOB
🇧🇷 ┋ BRL
🇻🇪 ┋ VES

🌍 *DIVISAS DE EUROPA Y OTROS*
*┈┈┈┈┈┈┈┈┈┈┈*

🇪🇺 ┋ EUR (Euro)
🇬🇧 ┋ GBP (Libra esterlina)
🇨🇭 ┋ CHF (Franco suizo)
🇷🇺 ┋ RUB (Rublo ruso)
🇳🇴 ┋ NOK (Corona noruega)
🇸🇪 ┋ SEK (Corona sueca)
🇩🇰 ┋ DKK (Corona danesa)
🇵🇱 ┋ PLN (Zloty polaco)
🇹🇷 ┋ TRY (Lira turca)
🇯🇵 ┋ JPY (Yen japonés)
🇨🇦 ┋ CAD (Dólar canadiense)
🇦🇺 ┋ AUD (Dólar australiano)
🇳🇿 ┋ NZD (Dólar neozelandés)
`;
        await conn.reply(m.chat, message, m);
    }
};

handler.help = [
    'cambiar <cantidad> <moneda_origen> a <moneda_destino>',
    'convertir <cantidad> <moneda_origen> a <moneda_destino>',
    'divisas'
];
handler.tags = ['herramientas'];
handler.command = ['cambiar', 'convertir', 'divisas', 'moneda', 'monedas' ];

export default handler;
