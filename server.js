const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Servir archivos estáticos desde /public
app.use(express.static('public'));

wss.on('connection', ws => {
  console.log('📱 Cliente conectado');

  ws.on('message', message => {
    const data = JSON.parse(message.toString());
    console.log('📟 NFC recibido:', data);
    ws.send('NFC recibido correctamente');
  });

  ws.on('close', () => {
    console.log('❌ Cliente desconectado');
  });
});

server.listen(3000, '0.0.0.0', () => {
  console.log('🚀 Servidor activo en el puerto 3000');
});