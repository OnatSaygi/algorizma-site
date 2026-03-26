// Bluetooth helper module for browser BLE using Nordic UART-style service
// Exposes: connectBluetooth(), disconnectBluetooth(), sendBluetooth(),
// setBluetoothDataCallback(cb), isConnected()

(function () {
const BLE_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const BLE_RX_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // write -> device
const BLE_TX_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // notify <- device

let _device = null;
let _server = null;
let _service = null;
let _txChar = null; // notify from device
let _rxChar = null; // write to device
let _onData = (data) => { console.log('BLE data:', data); };

async function connectBluetooth() {
  try {
    _device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [BLE_SERVICE_UUID] }]
    });

    _device.addEventListener('gattserverdisconnected', () => {
      console.log('BLE disconnected');
    });

    _server = await _device.gatt.connect();
    _service = await _server.getPrimaryService(BLE_SERVICE_UUID);

    _txChar = await _service.getCharacteristic(BLE_TX_UUID);
    _rxChar = await _service.getCharacteristic(BLE_RX_UUID);

    await _txChar.startNotifications();
    _txChar.addEventListener('characteristicvaluechanged', (ev) => {
      const value = ev.target.value;
      const decoder = new TextDecoder();
      const text = decoder.decode(value);
      try {
        // try parse JSON first, otherwise pass raw string
        const parsed = JSON.parse(text);
        _onData(parsed);
      } catch (e) {
        _onData(text);
      }
    });

    console.log('BLE connected');
    return true;
  } catch (err) {
    console.error('BLE connect failed', err);
    throw err;
  }
}

async function disconnectBluetooth() {
  if (!_device) return;
  try {
    if (_txChar) {
      try { await _txChar.stopNotifications(); } catch (e) {}
      _txChar.removeEventListener('characteristicvaluechanged', () => {});
    }
    if (_device.gatt.connected) _device.gatt.disconnect();
  } finally {
    _device = null;
    _server = null;
    _service = null;
    _txChar = null;
    _rxChar = null;
  }
}

function setBluetoothDataCallback(cb) {
  _onData = cb || (() => {});
}

function isConnected() {
  return !!(_device && _device.gatt && _device.gatt.connected);
}

async function sendBluetooth(data) {
  if (!_rxChar) throw new Error('BLE RX characteristic not available');
  let bytes;
  if (typeof data === 'string') {
    bytes = new TextEncoder().encode(data);
  } else if (data instanceof Uint8Array) {
    bytes = data;
  } else if (Array.isArray(data)) {
    bytes = new Uint8Array(data);
  } else {
    bytes = new TextEncoder().encode(String(data));
  }
  await _rxChar.writeValue(bytes);
}

window.BluetoothControl = {
  connectBluetooth,
  disconnectBluetooth,
  sendBluetooth,
  setBluetoothDataCallback,
  isConnected,
};
})();
