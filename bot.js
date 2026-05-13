import pkg from '@whiskeysockets/baileys';
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = pkg;
import P from 'pino';
import http from 'http';

async function startCrocker() {
    // --- SERVIDOR PARA A RENDER NÃO DESLIGAR O BOT ---
    const port = process.env.PORT || 3000;
    http.createServer((req, res) => {
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end('Crocker Bot Online 24h!');
    }).listen(port, '0.0.0.0', () => {
        console.log(`Porta ${port} aberta com sucesso.`);
    });

    // --- CONFIGURAÇÃO DE SESSÃO ---
    co
