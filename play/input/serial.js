// Serial helper module for Web Serial API
// Exposes: connectSerial(), disconnectSerial(), sendSerial(), setSerialDataCallback(cb), isConnected()
//
// Arduino format: A0,A1,A2,A3,A4,A5,A6,A7,reset\n
// Callback receives: { analog: [A0..A7], reset: bool, raw: string }

(function () {
const TARGET_VID = 0x1A86;
const TARGET_PID = 0x7523;

let _serialPort = null;
let _reader = null;
let _isOpen = false;
let _onData = (data) => { console.log('Serial data:', data); };

async function autoConnect() {
  if (!('serial' in navigator)) return false;
  if (_isOpen) return true;
  const ports = await navigator.serial.getPorts();
  const match = ports.find(p => {
    const info = p.getInfo();
    return info.usbVendorId === TARGET_VID && info.usbProductId === TARGET_PID;
  });
  if (!match) return false;
  _serialPort = match;
  try {
    await _serialPort.open({ baudRate: 115200 });
    _isOpen = true;
    readLoop();
    return true;
  } catch (e) {
    console.warn('autoConnect open failed', e);
    _serialPort = null;
    return false;
  }
}

// Cihaz takılınca otomatik bağlan
if ('serial' in navigator) {
  navigator.serial.addEventListener('connect', async (e) => {
    const info = e.port.getInfo();
    if (info.usbVendorId === TARGET_VID && info.usbProductId === TARGET_PID && !_isOpen) {
      _serialPort = e.port;
      try {
        await _serialPort.open({ baudRate: 115200 });
        _isOpen = true;
        readLoop();
        window.dispatchEvent(new CustomEvent('serialAutoConnected'));
      } catch (err) {
        console.warn('hot-plug connect failed', err);
        _serialPort = null;
      }
    }
  });
}

async function connectSerial() {
  if (!('serial' in navigator)) throw new Error('Web Serial unsupported');
  // Önceki bağlantı açıksa önce kapat
  if (_isOpen || _serialPort) {
    await disconnectSerial();
  }
  try {
    _serialPort = await navigator.serial.requestPort({ filters: [{ usbVendorId: TARGET_VID, usbProductId: TARGET_PID }] });
    await _serialPort.open({ baudRate: 115200 });
    _isOpen = true;
    readLoop();
    return true;
  } catch (err) {
    console.error('Serial connect failed', err);
    _isOpen = false;
    throw err;
  }
}

async function disconnectSerial() {
  try {
    if (_reader) {
      try { await _reader.cancel(); } catch (e) {}
      _reader = null;
    }
    if (_serialPort) {
      try { await _serialPort.close(); } catch (e) {}
      _serialPort = null;
    }
  } finally {
    _isOpen = false;
  }
}

function isConnected() {
  return !!_isOpen;
}

function setSerialDataCallback(cb) {
  _onData = cb || (() => {});
}

// Arduino: "A0,A1,A2,A3,A4,A5,A6,A7,reset"
function parseSerialLine(line) {
  const parts = line.split(',');
  if (parts.length !== 9) return null; // beklenmedik format
  const analog = parts.slice(0, 8).map(Number);
  const reset = parts[8].trim() === '1';
  if (analog.some(isNaN)) return null;
  return { analog, reset, raw: line };
}

async function readLoop() {
  if (!_serialPort || !_serialPort.readable) return;
  _reader = _serialPort.readable.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let synced = false; // bağlanırken gelen ilk yarım satırı atlamak için
  try {
    while (true) {
      const { value, done } = await _reader.read();
      if (done) break;
      if (value) {
        buffer += decoder.decode(value);
        const lines = buffer.split('\n');
        // Son eleman tam olmayabilir, bir sonraki chunk'a bırak
        buffer = lines.pop();
        for (const line of lines) {
          const trimmed = line.trim();
          if (!synced) {
            // İlk '\n' görüldü: öncesi potansiyel yarım satır, atla
            synced = true;
            continue;
          }
          if (trimmed) {
            const parsed = parseSerialLine(trimmed);
            if (parsed) {
              _onData(parsed.analog);
            } else {
              console.warn('Serial: geçersiz satır atlandı:', trimmed);
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('Serial read error', e);
  } finally {
    try { _reader.releaseLock(); } catch (e) {}
    _reader = null;
  }
}

async function sendSerial(data) {
  if (!_serialPort || !_serialPort.writable) throw new Error('Serial not open');
  const writer = _serialPort.writable.getWriter();
  try {
    let bytes;
    if (typeof data === 'string') bytes = new TextEncoder().encode(data);
    else if (data instanceof Uint8Array) bytes = data;
    else if (Array.isArray(data)) bytes = new Uint8Array(data);
    else bytes = new TextEncoder().encode(String(data));
    await writer.write(bytes);
  } finally {
    writer.releaseLock();
  }
}

window.SerialControl = {
  connectSerial,
  disconnectSerial,
  sendSerial,
  setSerialDataCallback,
  isConnected,
  autoConnect,
};
})();
