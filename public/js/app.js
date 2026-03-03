/* ── State ── */
let scanTotal = 0, sentTotal = 0, errorTotal = 0;
let logCount = 0;
let isScanning = false;

/* ── Elements ── */
const wsStatus    = document.getElementById('ws-status');
const wsLabel     = document.getElementById('ws-label');
const btnScan     = document.getElementById('btn-scan');
const nfcVisual   = document.getElementById('nfc-visual');
const scanText    = document.getElementById('scan-state-text');
const logEl       = document.getElementById('log');
const logCountEl  = document.getElementById('log-count');
const lastTag     = document.getElementById('last-tag');
const tagUidDisp  = document.getElementById('tag-uid-display');
const tagTimeDisp = document.getElementById('tag-time-display');
const tagWsDisp   = document.getElementById('tag-ws-display');
const statTotal   = document.getElementById('stat-total');
const statSent    = document.getElementById('stat-sent');
const statErrors  = document.getElementById('stat-errors');

/* ── Log helper ── */
function addLog(type, icon, msg, uid = null) {
  const emptyPh = document.getElementById('empty-placeholder');
  if (emptyPh) emptyPh.remove();

  logCount++;
  logCountEl.textContent = logCount;

  const timeStr = new Date().toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.innerHTML = `
    <div class="log-icon">${icon}</div>
    <div class="log-body">
      <span class="log-time">${timeStr}</span>
      <span class="log-msg">${msg}</span>
      ${uid ? `<br><span class="log-uid">${uid}</span>` : ''}
    </div>
  `;
  logEl.appendChild(entry);
  logEl.scrollTop = logEl.scrollHeight;
}

/* ── WebSocket ── */
const socket = new WebSocket(`wss://${location.host}`);

socket.onopen = () => {
  wsStatus.className = 'connected';
  wsLabel.textContent = 'Conectado';
  addLog('server', '🔗', 'Conexión WebSocket establecida');
};

socket.onmessage = e => {
  addLog('server', '📩', `Servidor: ${e.data}`);
};

socket.onerror = () => {
  wsStatus.className = 'error';
  wsLabel.textContent = 'Error WS';
  addLog('error', '❌', 'Error en la conexión WebSocket');
};

socket.onclose = () => {
  wsStatus.className = '';
  wsLabel.textContent = 'Desconectado';
  addLog('warn', '⚠️', 'WebSocket desconectado');
};

/* ── NFC Scanning ── */
btnScan.addEventListener('click', async () => {
  if (!('NDEFReader' in window)) {
    addLog('error', '❌', 'Web NFC no es compatible. Usa Chrome en Android.');
    errorTotal++;
    statErrors.textContent = errorTotal;
    return;
  }

  if (isScanning) return;
  isScanning = true;

  // UI: scanning state
  btnScan.disabled = true;
  btnScan.classList.add('active');
  btnScan.querySelector('span').textContent = '⬡ Escaneando...';
  nfcVisual.classList.add('scanning');
  scanText.className = 'active';
  scanText.innerHTML = 'Acerca una tarjeta NFC<span class="blink">_</span>';

  addLog('info', '📡', 'Escáner NFC iniciado. Acerca una tarjeta...');

  try {
    const reader = new NDEFReader();
    await reader.scan();

    reader.onreading = event => {
      const uid = event.serialNumber || 'UID no disponible';
      scanTotal++;
      statTotal.textContent = scanTotal;

      // Flash animation
      nfcVisual.classList.remove('scanning');
      nfcVisual.classList.add('read-flash');
      setTimeout(() => {
        nfcVisual.classList.remove('read-flash');
        nfcVisual.classList.add('scanning');
      }, 700);

      // Update last tag card
      lastTag.style.display = 'block';
      tagUidDisp.textContent = uid;
      tagTimeDisp.textContent = new Date().toLocaleTimeString('es-MX');
      tagWsDisp.textContent = socket.readyState === 1 ? 'Enviado ✓' : 'Sin conexión';

      addLog('nfc', '📟', 'Tag NFC detectado (NDEF)', uid);

      // Send via WebSocket
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'nfc', uid, time: Date.now() }));
        sentTotal++;
        statSent.textContent = sentTotal;
      } else {
        addLog('warn', '⚠️', 'Tag leído pero WS no disponible para enviar');
      }
    };

    reader.onreadingerror = () => {
      errorTotal++;
      statErrors.textContent = errorTotal;
      addLog('warn', '⚠️', 'NFC detectado pero el tipo de tarjeta no es compatible (no es NDEF)');
    };

  } catch (err) {
    isScanning = false;
    errorTotal++;
    statErrors.textContent = errorTotal;

    btnScan.disabled = false;
    btnScan.classList.remove('active');
    btnScan.querySelector('span').textContent = '⬡ Iniciar escaneo';
    nfcVisual.classList.remove('scanning');
    scanText.className = '';
    scanText.innerHTML = 'Listo para escanear<span class="blink">_</span>';

    addLog('error', '❌', `Error NFC: ${err.message || err}`);
  }
});

/* ── Clear log ── */
document.getElementById('btn-clear').addEventListener('click', () => {
  logEl.innerHTML = `
    <div class="empty-log" id="empty-placeholder">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
      Sin eventos aún
    </div>`;
  logCount = 0;
  logCountEl.textContent = 0;
});