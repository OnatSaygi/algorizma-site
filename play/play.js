// Controls UI and connection handlers (uses BluetoothControl and SerialControl modules)

// UI and input-timing logic
let uiDiv;
let lastInputTime = 0;
const VISIBLE_MS = 3000;

function initUI() {
    // create UI container
    uiDiv = document.createElement('div');
    Object.assign(uiDiv.style, {
        position: 'fixed',
        right: '16px',
        top: '16px',
        padding: '12px',
        background: 'rgba(0,0,0,0.75)',
        color: '#fff',
        borderRadius: '8px',
        fontFamily: 'sans-serif',
        zIndex: 9999,
        transition: 'opacity 0.2s ease',
        opacity: '0',
        pointerEvents: 'none',
        minWidth: '220px'
    });

    uiDiv.innerHTML = `
        <div style="margin-bottom:8px;font-weight:600">Connection</div>
        <div style="display:flex;gap:4px;align-items:center;margin-bottom:6px">
            <select id="conn-select" style="flex:1">
                <option value="bluetooth">Bluetooth</option>
                <option value="serial">Serial</option>
                <option value="autonomous">Autonomous</option>
            </select>
            <button id="conn-connect">Connect</button>
            <button id="conn-disconnect">Disconnect</button>
        </div>
        <div id="conn-status" style="font-size:11px;margin-bottom:4px;opacity:0.9">idle</div>
        <div id="conn-list" style="font-size:11px;margin-bottom:4px;opacity:0.9">
            <div>Bluetooth: <span id="status-bluetooth">disconnected</span></div>
            <div>Serial: <span id="status-serial">disconnected</span></div>
            <div>Autonomous: <span id="status-autonomous">stopped</span></div>
        </div>

        <div id="conn-active" style="font-size:11px;margin-bottom:4px;opacity:0.9">Playing: <span id="active-source">-</span></div>
        <hr style="border-color:rgba(255,255,255,0.2);margin:6px 0">
        <div style="font-weight:600;margin-bottom:6px">Sketch</div>
        <div style="display:flex;gap:4px;align-items:center">
            <select id="embed-select" style="flex:1">
                <option value="LivingNet">LivingNet</option>
                <option value="ThymeFlows">ThymeFlows</option>
            </select>
        </div>
        <hr style="border-color:rgba(255,255,255,0.2);margin:6px 0">
        <label style="font-size:11px;display:flex;align-items:center;gap:6px;cursor:pointer;margin-bottom:6px">
            <input type="checkbox" id="hide-until-click">
            Hide UI until click / double-tap
        </label>

    `;
    document.body.appendChild(uiDiv);

    const connSelect       = uiDiv.querySelector('#conn-select');
    const connConnectBtn    = uiDiv.querySelector('#conn-connect');
    const connDisconnectBtn = uiDiv.querySelector('#conn-disconnect');
    const connStatusDiv     = uiDiv.querySelector('#conn-status');
    const statusBluetoothEl = uiDiv.querySelector('#status-bluetooth');
    const statusSerialEl    = uiDiv.querySelector('#status-serial');
    const statusAutoEl      = uiDiv.querySelector('#status-autonomous');
    const activeSourceEl    = uiDiv.querySelector('#active-source');

    // connection flags
    let isBluetoothConnected = false;
    let isSerialConnected = false;
    let isAutonomousRunning = false;

    function setConnStatus(txt) { connStatusDiv.textContent = txt; }

    connConnectBtn.addEventListener('click', async () => {
        const method = connSelect.value;
        setConnStatus('connecting...');
            try {
                if (method === 'bluetooth') {
                    if (window.BluetoothControl && typeof window.BluetoothControl.connectBluetooth === 'function') {
                        await window.BluetoothControl.connectBluetooth();
                        isBluetoothConnected = true;
                        setConnStatus('bluetooth connected');
                    } else { setConnStatus('bluetooth unsupported'); }
                } else if (method === 'serial') {
                    if (window.SerialControl && typeof window.SerialControl.connectSerial === 'function') {
                        await window.SerialControl.connectSerial();
                        isSerialConnected = true;
                        setConnStatus('serial connected');
                    } else { setConnStatus('serial unsupported'); }
                } else if (method === 'autonomous') {
                    // start autonomous generator alongside any other active connections
                    if (window.AutonomousControl && typeof window.AutonomousControl.start === 'function') {
                        try { await window.AutonomousControl.start(); isAutonomousRunning = true; } catch (_) { }
                    }
                    setConnStatus('autonomous');
                }
        } catch (e) {
            console.warn('connect failed', e);
            setConnStatus('error: ' + e.message);
        }
        updateUI();
    });

    connDisconnectBtn.addEventListener('click', async () => {
        try {
            if (window.BluetoothControl && typeof window.BluetoothControl.disconnectBluetooth === 'function') {
                try { await window.BluetoothControl.disconnectBluetooth(); } catch (_) {}
            }
            if (window.SerialControl && typeof window.SerialControl.disconnectSerial === 'function') {
                try { await window.SerialControl.disconnectSerial(); } catch (_) {}
            }
            // attempt to stop autonomous if available
            if (window.AutonomousControl && typeof window.AutonomousControl.stop === 'function') {
                try { await window.AutonomousControl.stop(); } catch (_) {}
            }
            isBluetoothConnected = false;
            isSerialConnected = false;
            isAutonomousRunning = false;
            setConnStatus('disconnected');
        } catch (e) { console.warn(e); }
        updateUI();
    });

    // ---- Sketch section ----
    let currentSketch = null;
    // latest raw data received from each source
    const latestData = { bluetooth: null, serial: null, autonomous: null };
    // which source feeds the sketch (mirrors the conn-select dropdown)
    let activeSource = connSelect.value;
    connSelect.addEventListener('change', () => { activeSource = connSelect.value; updateUI(); });

    const embedSelect = uiDiv.querySelector('#embed-select');
    // ensure LivingNet is the default selected sketch
    embedSelect.value = 'LivingNet';
    // auto-load the default selected sketch immediately
    if (!currentSketch) {
        if (embedSelect.value === 'ThymeFlows')     currentSketch = new ThymeFlows();
        else if (embedSelect.value === 'LivingNet') currentSketch = new LivingNet();
        wireDataCallbacks();
    }

    function wireDataCallbacks() {
        // Each source gets its own handler; only the active source writes to the sketch.
        const makeHandler = (source) => (data) => {
            let arr = null;
            if (Array.isArray(data)) arr = data;
            else if (data && Array.isArray(data.pots)) arr = data.pots;
            else if (typeof data === 'string') {
                try { arr = JSON.parse(data); } catch (_) {
                    arr = data.split(',').map(Number);
                }
            }
            // always buffer the latest values for this source
            if (Array.isArray(arr)) latestData[source] = arr;
            // only push to the sketch if this source is currently selected
            if (source === activeSource && currentSketch && Array.isArray(arr)) {
                arr.forEach((v, i) => {
                    if (i < currentSketch.pots.length) currentSketch.pots[i] = v / 1023;
                });
            }
        };
        if (window.BluetoothControl) window.BluetoothControl.setBluetoothDataCallback(makeHandler('bluetooth'));
        if (window.SerialControl)    window.SerialControl.setSerialDataCallback(makeHandler('serial'));
        if (window.AutonomousControl && typeof window.AutonomousControl.setAutonomousDataCallback === 'function') {
            window.AutonomousControl.setAutonomousDataCallback(makeHandler('autonomous'));
        }
    }
    // register callbacks immediately so data is buffered from the moment connections open
    wireDataCallbacks();

    function destroySketch() {
        if (currentSketch) { currentSketch._p5.remove(); currentSketch = null; }
    }

    embedSelect.addEventListener('change', () => {
        const name = embedSelect.value;
        if (!name) return;
        destroySketch();
        if      (name === 'ThymeFlows')     currentSketch = new ThymeFlows();
        else if (name === 'LivingNet') currentSketch = new LivingNet();
        wireDataCallbacks();
        updateUI();
    });

    // (embed-close button removed) no explicit close handler
    // ---- end Sketch ----

    updateUI();

    // Update visual statuses for connections and currently active source
    function updateUI() {
        // summary status
        const anyConnected = isBluetoothConnected || isSerialConnected || isAutonomousRunning;
        if (anyConnected) setConnStatus('connected');
        else setConnStatus('idle');

        statusBluetoothEl.textContent = isBluetoothConnected ? 'connected' : 'disconnected';
        statusSerialEl.textContent = isSerialConnected ? 'connected' : 'disconnected';
        statusAutoEl.textContent = isAutonomousRunning ? 'running' : 'stopped';

        activeSourceEl.textContent = activeSource || '-';
    }

    // input listeners
    const hideUntilClickCheckbox = uiDiv.querySelector('#hide-until-click');

    // double-tap detection for mobile
    let lastTapTime = 0;
    const DOUBLE_TAP_MS = 320;

    const onMouseDown = () => {
        lastInputTime = Date.now();
        showUI();
    };
    const touchOrMouse = () => {
        if (hideUntilClickCheckbox.checked) return;
        lastInputTime = Date.now();
        showUI();
    };
    const onTouchEnd = (e) => {
        if (hideUntilClickCheckbox.checked) {
            // require double-tap to show when checkbox is on
            const now = Date.now();
            if (now - lastTapTime < DOUBLE_TAP_MS) {
                lastInputTime = now;
                showUI();
                lastTapTime = 0;
            } else {
                lastTapTime = now;
            }
        } else {
            lastInputTime = Date.now();
            showUI();
        }
    };
    window.addEventListener('mousemove', touchOrMouse, { passive: true });
    window.addEventListener('mousedown', onMouseDown, { passive: true });
    window.addEventListener('keydown', touchOrMouse, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    // periodically check visibility
    setInterval(() => {
        if (Date.now() - lastInputTime > VISIBLE_MS) hideUI();
        else showUI();
    }, 200);
}

function showUI() {
    uiDiv.style.opacity = '1';
    uiDiv.style.pointerEvents = 'auto';
}

function hideUI() {
    uiDiv.style.opacity = '0';
    uiDiv.style.pointerEvents = 'none';
}

function updateUI() {
    // status text is managed inline; nothing extra needed here
}

// init after load
window.addEventListener('load', initUI);
