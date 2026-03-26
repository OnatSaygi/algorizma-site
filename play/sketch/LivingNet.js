// LivingNet — single-class p5 instance-mode sketch
// Usage:  new LivingNet()   or   new LivingNet({ numAgents: 80 })

class LivingNet {
 
  // #region constructor
  constructor(config = {}) {

    // Default parameter values (formerly slider defaults)
    this.cfg = Object.assign({
      numAgents:         40,
      forceStrength:     0.0005,
      interactionRadius: 90,
      maxConnections:    3,
      kCoupling:         0.0062,
      naturalFrequency:  0.07,
      phaseRandom:       0.04,
      moveSpeed:         20.4,
      arcWiggle:         20,
      arcGrowthSpeed:    0.05,
      dutyCycle:         0.1,
      respawnSpeed:      0,
      cellRadius:        5,
      ghostFade:         175,
    }, config);

    // BLE pot values (8 channels, 0-1023)
    this.pots = new Array(8).fill(0.5);

    // Which pot index drives which config key
    this.pinBindings = [
      ['numAgents',         7],
      ['forceStrength',     2],
      ['interactionRadius', 3],
      ['maxConnections',    4],
      ['moveSpeed',         5],
      ['respawnSpeed',      6],
      ['cellRadius',        0],
      ['ghostFade',         1],
    ];

    // Valid ranges for each pot-driven parameter (used in _applyPot)
    this._ranges = {
      numAgents:         [70,   400],
      forceStrength:     [0.001,    0.010],
      interactionRadius: [150,   500],
      maxConnections:    [3,    5],
      moveSpeed:         [1,    5],
      respawnSpeed:      [0.02,    1.0],
      cellRadius:        [3,    40],
      ghostFade:         [20,    255],
    };

    this.agents = [];

    // Spin up the p5 instance
    this._p5 = new p5(p => this._sketch(p));
  }

  // #endregion

  // #region p5 sketch
  _sketch(p) {
    const cfg    = this.cfg;
    const agents = this.agents;

    let dimAgentColor, brightAgentColor, brightAgentColor2, connectionColor;
    let frameRates = [];
    // #region helpers
    const displayFPS = (x, y, n = 60) => {
      frameRates.push(p.frameRate());
      if (frameRates.length > n) frameRates.shift();
      const avg = frameRates.reduce((a, b) => a + b, 0) / frameRates.length;
      p.stroke(0); p.fill(255); p.textSize(20);
      p.text('Avg FPS: ' + p.round(avg), x, y);
    };

    const distSq = (a, b) => {
      const dx = a.x - b.x, dy = a.y - b.y;
      return dx * dx + dy * dy;
    };

    // #endregion
    // #region spatial grid
    const gridKey = (x, y, cs) =>
      `${Math.floor(x / cs)},${Math.floor(y / cs)}`;

    const buildGrid = (list, cs) => {
      const g = new Map();
      for (const ag of list) {
        const k = gridKey(ag.pos.x, ag.pos.y, cs);
        if (!g.has(k)) g.set(k, []);
        g.get(k).push(ag);
      }
      return g;
    };

    const getNeighbors = (ag, grid, cs) => {
      const out = [];
      const col = Math.floor(ag.pos.x / cs);
      const row = Math.floor(ag.pos.y / cs);
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++) {
          const k = `${col + dx},${row + dy}`;
          if (grid.has(k)) for (const n of grid.get(k)) out.push(n);
        }
      return out;
    };

    // #endregion
    // #region Agent class
    class Agent {
      constructor(x, y, r) {
        this.pos = p.createVector(x, y);
        this.r   = r;
        this.vel = p5.Vector.random2D().mult(cfg.moveSpeed);
        this.acc = p.createVector(0, 0);
        this.connections    = [];
        this.growthProgress = new Map();
        this.phase = p.random(p.TAU);
      }

      applyForces(others) {
        for (const other of others) {
          if (other === this) continue;
          const dir = p5.Vector.sub(other.pos, this.pos);
          const d   = dir.mag();
          if (d < cfg.interactionRadius && d > 1) {
            const force = (d - cfg.interactionRadius / 2) * cfg.forceStrength;
            dir.normalize().mult(force);
            this.acc.add(dir);
          }
        }
      }

      updateOscillator() {
        let sum = 0;
        for (const n of this.connections)
          if (this.growthProgress.get(n) === 1)
            sum += Math.sin(n.phase - this.phase);

        this.phase += cfg.naturalFrequency + cfg.kCoupling * sum;
        if (this.phase > p.TAU) {
          this.phase -= p.TAU + p.random(-p.TAU, p.TAU) * cfg.phaseRandom;
          this.connections = [];
        }
      }

      update() {
        this.acc.mult(0.9);
        this.vel.add(this.acc);
        this.vel.limit(cfg.moveSpeed);
        this.pos.add(this.vel);
        if (this.pos.x <= 0 || this.pos.x >= p.width) {
          this.vel.x *= -0.5;
          this.pos.x  = p.constrain(this.pos.x, 0, p.width);
        }
        if (this.pos.y <= 0 || this.pos.y >= p.height) {
          this.vel.y *= -0.5;
          this.pos.y  = p.constrain(this.pos.y, 0, p.height);
        }
      }

      display() {
        p.noStroke();
        const isFlashing = (this.phase / p.TAU) > cfg.dutyCycle;
        const foo = Math.min(1, p.map(this.phase / p.TAU, 0, cfg.dutyCycle, 0, 1));
        p.fill(isFlashing
          ? p.lerpColor(brightAgentColor, brightAgentColor2, Math.pow(foo, 0.7))
          : dimAgentColor);
        const sca = 1.7 + Math.pow(foo, 1.7) / 2;
        const z   = 1 + this.vel.mag() / 15;
        p.push();
        p.translate(this.pos.x, this.pos.y);
        p.rotate(this.vel.heading() + p.HALF_PI);
        p.ellipse(0, 0, this.r * sca / z, this.r * sca * z, 7);
        p.pop();
      }

      connect(other) {
        if (!this.connections.includes(other)) {
          this.connections.push(other);
          this.growthProgress.set(other, 0);
        }
      }

      showConnections() {
        p.stroke(connectionColor);
        p.strokeWeight(1.5);
        p.noFill();
        for (const other of this.connections) {
          const prog = Math.min(
            (this.growthProgress.get(other) || 0) + cfg.arcGrowthSpeed, 1);
          this.growthProgress.set(other, prog);
          const op  = this.pos.copy().sub(other.pos).setMag(cfg.cellRadius).add(other.pos);
          const tp  = other.pos.copy().sub(this.pos).setMag(cfg.cellRadius).add(this.pos);
          const end = p5.Vector.lerp(tp, op, prog * prog * prog);
          const w   = cfg.arcWiggle * Math.abs(other.phase - this.phase) / p.TAU;
          const c1  = p5.Vector.lerp(tp, end, 0.3).add(p5.Vector.random2D().mult(w));
          const c2  = p5.Vector.lerp(tp, end, 0.7).add(p5.Vector.random2D().mult(w));
          p.bezier(tp.x, tp.y, c1.x, c1.y, c2.x, c2.y, end.x, end.y);
        }
      }

      // #endregion
    }
      // #region scene init
    const initAgents = () => {
      p.background(0, 40);
      agents.length = 0;
      for (let i = 0; i < cfg.numAgents; i++)
        agents.push(new Agent(p.random(p.width), p.random(p.height), cfg.cellRadius));
    };

      // #region p5 lifecycle
    p.setup = () => {
      p.createCanvas(p.windowWidth, p.windowHeight);
      Object.assign(p.canvas.style, {
        position: 'fixed', top: '0', left: '0', zIndex: '0'
      });
      dimAgentColor     = p.color(150, 200,   0, 130);
      brightAgentColor  = p.color(150, 200, 200,  80);
      brightAgentColor2 = p.color(150, 200, 200,  20);
      connectionColor   = p.color(100, 180, 160,  40);
      initAgents();
    };

    p.windowResized = () => p.resizeCanvas(p.windowWidth, p.windowHeight);

    p.draw = () => {
      // Apply BLE pot values to config
      for (const [name, id] of this.pinBindings)
        this._applyPot(name, this.pots[id] ?? 0.5);

      const fade = (1 - Math.pow(cfg.ghostFade / 255, 0.15)) * 255;
      p.background(0, 0, 0, fade);
      displayFPS(10, 30);

      // Keep agent radii in sync
      for (const a of agents) a.r = cfg.cellRadius;

      // Add / remove agents to match numAgents
      const diff = cfg.numAgents - agents.length;
      if (diff > 0)
        for (let i = 0; i < diff; i++)
          agents.push(new Agent(p.random(p.width), p.random(p.height), cfg.cellRadius));
      else if (diff < 0)
        agents.splice(diff);

      // Respawn agents
      const rc = Math.floor(cfg.respawnSpeed) +
                 (p.random(1) < (cfg.respawnSpeed % 1) ? 1 : 0);
      agents.splice(0, rc);
      for (let i = 0; i < rc; i++)
        agents.push(new Agent(p.random(p.width), p.random(p.height), cfg.cellRadius));

      // Build grid, update every agent
      const grid = buildGrid(agents, cfg.interactionRadius);
      for (const a of agents) {
        const neighbors = getNeighbors(a, grid, cfg.interactionRadius);
        if (a.connections.length !== cfg.maxConnections) {
          a.connections = [];
          const sorted = neighbors
            .filter(b => b !== a)
            .map(b => ({ agent: b, d2: distSq(a.pos, b.pos) }))
            .sort((x, y) => x.d2 - y.d2);
          for (let k = 0; k < Math.min(cfg.maxConnections, sorted.length); k++)
            a.connect(sorted[k].agent);
        }
        a.applyForces(neighbors);
        a.updateOscillator();
        a.update();
        a.display();
        a.showConnections();
      }
    };

    // #endregion
  }

  // #region pot → config mapping
  _applyPot(name, raw) {
    const r = this._ranges[name];
    if (!r) return;
    const [min, max] = r;
    let v = min + (raw) * (max - min);
    if (name === 'numAgents' || name === 'maxConnections') v = Math.round(v);
    this.cfg[name] = v;
  }

  // #endregion
}

