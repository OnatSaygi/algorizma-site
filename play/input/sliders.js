// Slider input module — manual control via on-screen range sliders
// Exposes: connect(), disconnect(), setSliderDataCallback(cb), isConnected()
// Callback receives: number[8]  (raw 0..1023, same format as other input modules)

(function () {
const CHANNELS = 8;

let _onData = () => {};
let _connected = false;
let _panel = null;
let _values = Array.from({ length: CHANNELS }, () => Math.round(Math.random() * 1023));

function _emit() {
    if (typeof _onData === 'function') {
        try { _onData(_values.slice()); } catch (e) { console.warn('SliderControl callback error', e); }
    }
}

function _buildPanel() {
    const panel = document.createElement('div');
    panel.id = 'slider-control-panel';
    panel.style.cssText = 'margin-top:6px';

    const title = document.createElement('div');
    title.style.cssText = 'font-weight:600;margin-bottom:6px';
    title.textContent = 'Sliders';
    panel.appendChild(title);

    for (let i = 0; i < CHANNELS; i++) {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:4px';

        const label = document.createElement('span');
        label.style.cssText = 'font-size:11px;width:26px;flex-shrink:0';
        label.textContent = 'CH' + i;

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '0';
        slider.max = '1023';
        slider.value = String(_values[i]);
        slider.style.cssText = 'flex:1;cursor:pointer;accent-color:#fff';

        const valueLabel = document.createElement('span');
        valueLabel.style.cssText = 'font-size:11px;width:32px;text-align:right;flex-shrink:0';
        valueLabel.textContent = String(_values[i]);

        slider.addEventListener('input', () => {
            const v = parseInt(slider.value, 10);
            _values[i] = v;
            valueLabel.textContent = v;
            _emit();
        });

        row.appendChild(label);
        row.appendChild(slider);
        row.appendChild(valueLabel);
        panel.appendChild(row);
    }

    return panel;
}

function connect() {
    if (_connected) return Promise.resolve(true);
    const uiPanel = document.getElementById('ui-panel');
    if (!uiPanel) return Promise.reject(new Error('ui-panel not found'));

    _panel = _buildPanel();

    // Insert after the conn-list / conn-active divs, before the first <hr>
    const firstHr = uiPanel.querySelector('hr');
    if (firstHr) {
        uiPanel.insertBefore(_panel, firstHr);
    } else {
        uiPanel.appendChild(_panel);
    }

    _connected = true;
    _emit(); // emit initial all-zero state
    return Promise.resolve(true);
}

function disconnect() {
    if (_panel && _panel.parentNode) {
        _panel.parentNode.removeChild(_panel);
    }
    _panel = null;
    _values.fill(0);
    _connected = false;
    return Promise.resolve(true);
}

function setSliderDataCallback(cb) {
    _onData = cb || (() => {});
}

function isConnected() {
    return _connected;
}

window.SliderControl = { connect, disconnect, setSliderDataCallback, isConnected };
})();
