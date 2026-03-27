// ThymeFlows — single-class p5 instance-mode sketch
// Usage:  new ThymeFlows()   or   new ThymeFlows({ f: 8, samples: 4 })

p5.disableFriendlyErrors = true;

class ThymeFlows {
 
  // #region constructor
  constructor(config = {}) {

    this.cfg = Object.assign({
      speed:            0.6,
      fpsCounter:       false,
      f:                6,
      b:                6,
      samples:          3,
      multipler:        0.65,
      baseWeight:       0.22,
      interactiveIndex: 1,
    }, config);

    // Pot values (9 channels, 0–1)
    this.pots = new Array(9).fill(0.8);

    // Spin up the p5 instance
    this._p5 = new p5(p => this._sketch(p));
  }

  // #endregion

  // #region p5 sketch
  _sketch(p) {
    const cfg = this.cfg;

    // #region JS math aliases
    const PI      = Math.PI;
    const HALF_PI = Math.PI / 2;
    const cos     = Math.cos;
    const sin     = Math.sin;
    const pow     = Math.pow;
    const sqrt    = Math.sqrt;
    const atan2   = Math.atan2;

    const MAX_STACK_SIZE = 10000;
    const STACK_STRIDE   = 6;
    // #endregion

    // #region mutable animation state
    let curv        = -0.03;
    let dir         = 1.0;
    let distribution, weightoffset;
    let sed, fc     = 0;
    let size        = 0.25;
    let thickness;
    let spread      = -0.13;
    let branchHeight;
    let orderliness = 0.2;
    let topology    = 6;
    let breathing   = 0, breathingLast = 0, breathingDelta = 0;
    let plantSwitch = 0;
    let refresh     = 0;
    let stackData, powCache, img;
    let smoothFPS   = 0;
    const fpsLerp   = 0.07;
    // #endregion

    // #region fractalIterative
    const fractalIterative = (startX, startY, startLx, startLy, startLayer, branch, startMutation, sz) => {
      let sp = 0;
      stackData[sp++] = startX;  stackData[sp++] = startY;
      stackData[sp++] = startLx; stackData[sp++] = startLy;
      stackData[sp++] = startLayer; stackData[sp++] = startMutation;

      const ctx = p.drawingContext;
      const { f, multipler, baseWeight } = cfg;

      for (let i = 0; i < branch; i++)
        powCache[i] = pow((i + 1) / branch, distribution);

      const g  = baseWeight;
      const wh = (p.width + p.height) / 1150;

      while (sp > 0) {
        let mutation = stackData[--sp];
        let layer    = stackData[--sp];
        let ly       = stackData[--sp];
        let lx       = stackData[--sp];
        let y        = stackData[--sp];
        let x        = stackData[--sp];

        let mut    = p.noise(mutation, fc / 253) * 0.5 + 0.1;
        let lenMag = sqrt(lx * lx + ly * ly) * sz * mut;
        let x2 = x + lx, y2 = y + ly;

        let alpha     = (baseWeight * layer) / f + baseWeight;
        let noiseComp = p.noise(mutation);
        let sw        = wh * ((layer + weightoffset) + noiseComp);

        if (sw > 0.1) {
          ctx.lineWidth   = sw * 0.7 * mut * 2;
          ctx.strokeStyle = `rgba(0, ${Math.floor(g * 255)}, 0, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }

        if (layer > 1) {
          let noiseVal     = 1;
          let currentAngle = atan2(ly, lx);

          for (let i = branch - 1; i >= 0; i--) {
            let t         = powCache[i];
            let newX      = x + lx * t;
            let newY      = y + ly * t;
            let newLenMag = lenMag * (multipler + noiseVal);

            let angleOffset = (i * PI + HALF_PI);
            angleOffset    += (((((i + 1) % 2) * 2) - 1) * (curv - dir));
            angleOffset    += p.randomGaussian(0, orderliness); // Gaussian varyasyon

            let totalAngle  = currentAngle + angleOffset;
            let newLx       = cos(totalAngle) * newLenMag;
            let newLy       = sin(totalAngle) * newLenMag;
            let newMutation = mutation + p.random() * 2000;

            stackData[sp++] = newX;  stackData[sp++] = newY;
            stackData[sp++] = newLx; stackData[sp++] = newLy;
            stackData[sp++] = layer - 1; stackData[sp++] = newMutation;
          }
        }
      }
    };
    // #endregion

    // #region fractalInteractive
    const fractalInteractive = (startX, startY, startLx, startLy, startLayer, branch, startMutation, sz) => {
      let sp = 0;
      stackData[sp++] = startX;  stackData[sp++] = startY;
      stackData[sp++] = startLx; stackData[sp++] = startLy;
      stackData[sp++] = startLayer; stackData[sp++] = startMutation;

      const ctx = p.drawingContext;
      const { f, multipler, baseWeight } = cfg;

      for (let i = 0; i < branch; i++)
        powCache[i] = pow((i + 1) / branch, branchHeight);

      const g  = baseWeight;
      const wh = (p.width + p.height) / 1150;

      while (sp > 0) {
        let mutation = stackData[--sp];
        let layer    = stackData[--sp];
        let ly       = stackData[--sp];
        let lx       = stackData[--sp];
        let y        = stackData[--sp];
        let x        = stackData[--sp];

        let mut    = p.noise(mutation, fc / 253 + this.pots[5] * 2) * 0.5 + 0.1;
        let lenMag = sqrt(lx * lx + ly * ly) * sz * mut;
        let x2 = x + lx, y2 = y + ly;

        let alpha     = (baseWeight * layer) / f + baseWeight;
        let noiseComp = p.noise(mutation);
        let sw        = wh * ((layer + weightoffset) + noiseComp);

        if (sw > 0.1) {
          ctx.lineWidth   = sw * 0.7 * mut * (1 + 1.5 * thickness);
          ctx.strokeStyle = `rgba(0, ${Math.floor(g * 255)}, 0, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }

        if (layer > 1) {
          let noiseVal     = 1;
          let currentAngle = atan2(ly, lx);

          for (let i = branch - 1; i >= 0; i--) {
            let t         = powCache[i];
            let newX      = x + lx * t;
            let newY      = y + ly * t;
            let newLenMag = lenMag * (multipler + noiseVal);

            let angleOffset = (i * PI + HALF_PI);
            angleOffset    += (((((i + 1) % 2) * 2) - 1) * spread);
            angleOffset    += p.randomGaussian(0, orderliness); // Gaussian varyasyon

            let totalAngle  = currentAngle + angleOffset;
            let newLx       = cos(totalAngle) * newLenMag;
            let newLy       = sin(totalAngle) * newLenMag;
            let newMutation = mutation + p.random() * 2000;

            stackData[sp++] = newX;  stackData[sp++] = newY;
            stackData[sp++] = newLx; stackData[sp++] = newLy;
            stackData[sp++] = layer - 1; stackData[sp++] = newMutation;
          }
        }
      }
    };
    // #endregion

    // #region esas
    const esas = (isInteractive) => {
      const { f, b, samples, speed: SPEED, interactiveIndex: INTERACTIVE_INDEX } = cfg;

      for (let i = 0; i < samples; i++) {
        p.push();
        p.translate(p.width / 2, p.height / 2);
        p.rotate(PI);
        p.translate(-p.width / 2, -p.height / 2);
        p.scale(0.3);
        p.translate(p.width * 0.5, p.height * 0.4);
        fc = p.frameCount * SPEED + i * 1000000 + refresh + plantSwitch;

        if (isInteractive) {
          if (INTERACTIVE_INDEX == i) {
            size         = pow(this.pots[0], 0.35) * 0.6 + 0.5;
            thickness    = this.pots[1];
            orderliness  = this.pots[2] / 2 - 0.4;
            branchHeight = this.pots[3] * 2.4;
            spread       = (p.noise(234 - fc / 1383) + this.pots[4] - 0.5) * -HALF_PI - PI + PI;
            breathingDelta = this.pots[5] - breathingLast;
            breathingLast  = this.pots[5];
            breathing     += breathingDelta;
            topology     = Math.floor(p.map(this.pots[6], 0, 0.95, 1, 6));
            plantSwitch  = Math.floor(p.map(this.pots[7], 0, 1, 0, 10)) * 10000;

            let shiftX = (p.noise(fc / 100) - 0.5) * 200;
            let shiftY = (p.noise(fc / 100) - 0.5) * 200;

            fractalInteractive(
              p.width / samples * ((i * 3) - ((samples - 3) / 3)) + shiftX,
              p.height * 0.15 + shiftY,
              (p.width / (samples + 1)) * (size * size) * 1.1,
              p.height * size * size * 1.1,
              f, topology, 0, size
            );
          }
          p.pop();

        } else {
          if (INTERACTIVE_INDEX != i) {
            distribution  = pow(5, 2 * p.noise(fc / 552) - 1);
            weightoffset  = p.noise(fc / 55) * 4 - 1;
            curv          = (pow(p.noise(234 - fc / 783), 0.7) - 0.5) + PI / 3;
            dir           = -PI - HALF_PI * pow(p.noise(0, fc / 1323 + 1000), 0.5) * 1.4;
            orderliness   = p.noise(123254 + fc / 345) * 0.7 - 0.1;
            let localSize = pow(p.noise(34234 - (fc / 1308)), 0.35) * 0.6 + 0.5;

            let shiftX = (p.noise(fc / 100) - 0.5) * 200;
            let shiftY = (p.noise(fc / 100) - 0.5) * 200;

            fractalIterative(
              p.width / samples * ((i * 3) - ((samples - 3) / 3)) + shiftX,
              p.height * 0.15 + shiftY,
              (p.width / (samples + 1)) * (localSize * localSize) * 1.1,
              p.height * localSize * localSize * 1.1,
              f, b, 0, localSize
            );
          }
          p.pop();
        }
      }
    };
    // #endregion

    // #region p5 lifecycle
    p.setup = () => {
      p.frameRate(30);
      p.pixelDensity(1);
      sed = p.random() * 999999999;
      p.noiseDetail(3, 0.4);
      p.createCanvas(p.windowWidth, p.windowHeight);
      Object.assign(p.canvas.style, {
        position: 'fixed', top: '0', left: '0', zIndex: '0'
      });
      p.canvas.classList.add('p5-background');
      p.noFill();
      p.colorMode(p.RGB, 1);
      p.strokeCap(p.SQUARE);
      stackData = new Float64Array(MAX_STACK_SIZE * STACK_STRIDE);
      powCache  = new Float32Array(cfg.b);
    };

    p.windowResized = () => p.resizeCanvas(p.windowWidth, p.windowHeight);

    p.keyPressed = () => {
      if (p.key === 'a') refresh += 12345;
      if (p.key === 'f') p.fullscreen(true);
    };

    p.draw = () => {
      p.randomSeed(sed);
      const ctx = p.drawingContext;

      ctx.fillStyle = 'rgba(205, 205, 185, 0.53)';
      if (typeof img !== 'undefined' && img) {
        p.tint(1, 0.03);
        p.image(img, 0, 0, p.width, p.height);
        p.tint(1, 1);
      } else {
        p.tint(1, 1);
      }
      ctx.fillRect(0, 0, p.width, p.height);

      if (cfg.fpsCounter) {
        p.stroke(0); p.noFill(); p.strokeWeight(0.5);
        p.text(this.pots.map((v, i) => `${i}: ${v.toFixed(2)}`).join(',   '), 10, 40);
        let currentFPS = 1000 / p.deltaTime;
        smoothFPS += (currentFPS - smoothFPS) * fpsLerp;
        p.fill(0.9); p.noStroke();
        p.rect(0, 0, 60, 30);
        p.fill(0);
        p.text(smoothFPS.toFixed(1), 10, 20);
      }

      esas(false);
      esas(true);
    };
    // #endregion
  }

  // #endregion
}

