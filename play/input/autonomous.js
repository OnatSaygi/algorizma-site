(function () {
let _interval = null;
let _onData = (d) => {};
let _running = false;

const CHANNELS = 9;
const SAMPLE_MS = 50; // ~20Hz

// smooth random state
const smoothTargets = new Array(CHANNELS).fill(0);
const smoothValues = new Array(CHANNELS).fill(0);
const nextTargetAt = new Array(CHANNELS).fill(0);

function _rand(min=0, max=1) { return Math.random() * (max - min) + min; }
function _lerp(a,b,t){ return a + (b-a)*t; }
function _frac(x){ return x - Math.floor(x); }

function _toRaw(v){ // 0..1 -> 0..1023 int
    return Math.round(Math.max(0, Math.min(1, v)) * 1023);
}

function _tick() {
    const t = performance.now() / 1000;
    const out = new Array(CHANNELS);

    for (let i=0;i<CHANNELS;i++) {
        // ensure smooth targets occasionally change
        if (t > nextTargetAt[i]) {
            smoothTargets[i] = Math.random();
            nextTargetAt[i] = t + _rand(0.8, 4.0);
        }
        // nudge smooth value toward target
        smoothValues[i] = _lerp(smoothValues[i], smoothTargets[i], 0.02);
    }

    // channel 0: slow sine LFO
    out[0] = _toRaw((Math.sin(t * 0.6 + 0.1) + 1) * 0.5);
    // channel 1: triangle-like ramp (saw folded)
    out[1] = _toRaw(Math.abs(_frac(t*0.18)*2 - 1));
    // channel 2: stepped sequence
    {
        const seq = [0,0.2,0.5,0.7,1,0.4];
        const idx = Math.floor(t * 0.6) % seq.length;
        out[2] = _toRaw(seq[idx]);
    }
    // channel 3: smooth random (slow evolving)
    out[3] = _toRaw(smoothValues[3]);
    // channel 4: combined beats / harmonics
    out[4] = _toRaw((Math.sin(t*1.1) * 0.6 + Math.sin(t*0.22)*0.4 + 1) * 0.5);
    // channel 5: slow square pulse
    out[5] = _toRaw((Math.sin(t*0.25) > 0 ? 1 : 0));
    // channel 6: shimmer (small HF on slow base)
    out[6] = _toRaw((0.5 + Math.sin(t*0.4)*0.35) + Math.sin(t*6.7)*0.05);
    // channel 7: occasional pulse
    out[7] = _toRaw((Math.random() < 0.02) ? 1 : smoothValues[7]);
    // channel 8: mirrored / complementary
    out[8] = _toRaw(1 - ((Math.sin(t*0.6+1.2)+1)*0.5));

    if (typeof _onData === 'function' && _onData) {
        try {
            _onData(out);
        } catch (e) {
            console.warn('Autonomous callback error', e);
        }
    }
}

function start() {
    if (_running) return Promise.resolve(true);
    // initialize smooth values
    for (let i=0;i<CHANNELS;i++) {
        smoothTargets[i] = Math.random();
        smoothValues[i] = smoothTargets[i];
        nextTargetAt[i] = performance.now()/1000 + _rand(0.5, 3.0);
    }
    _interval = setInterval(_tick, SAMPLE_MS);
    _running = true;
    return Promise.resolve(true);
}

function stop() {
    if (_interval) { clearInterval(_interval); _interval = null; }
    _running = false;
    return Promise.resolve(true);
}

function setAutonomousDataCallback(cb) {
    _onData = cb || (() => {});
}

function isRunning() { return _running; }

window.AutonomousControl = {
    start,
    stop,
    setAutonomousDataCallback,
    isRunning,
};
})();
