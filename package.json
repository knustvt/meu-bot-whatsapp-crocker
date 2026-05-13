import pkg from '@whiskeysockets/baileys';
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = pkg;
import P from 'pino';
import http from 'http';

const startCrocker = async () => {
    // Servidor para a Render não matar o bot
    http.createServer((req, res) => {
        res.writeHead(200);
        res.end('Crocker Vivo!');
    }).listen(process.env.PORT || 3000);

    const { state, saveCreds } = await useMultiFileAuthState('crocker_session');
    const { version } = await fetchLatestBaileysVersion();

    const conn = makeWASocket({
        version,
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ['Crocker Bot', 'Chrome', '1.0']
    });

    if (!conn.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let code = await conn.requestPairingCode("5491168285717");
                console.log(`\n\n================================\n   CÓDIGO DO ZAP: ${code}\n================================\n\n`);
            } catch {
                console.log("Gerando código...");
            }
        }, 10000);
    }

    conn.ev.on('creds.update', saveCreds);
    conn.ev.on('connection.update', (u) => { if (u.connection === 'close') startCrocker() });
    
    conn.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;
        if (m.message.conversation?.toLowerCase() === '/menu') {
            await conn.sendMessage(m.key.remoteJid, { text: '🧚‍♂️ Crocker Online!\n"FAAAAAAADAS!"' });
        }
    });
};

startCrocker().catch(err => console.log("Erro ao iniciar:", err));
