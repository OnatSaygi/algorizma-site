
/*
Richie Mendelsohn
Colorful moire patterns with lines
18/1/16 — refactored to p5 instance-mode class

Pot mapping (0–1):
  pots[0] → numLines  (1–120)
  pots[1] → opacity   (0–255)
  pots[2] → colorVal  (0–255)
  pots[3] → noise speed X for cursor drift
  pots[4] → noise speed Y for cursor drift
*/

p5.disableFriendlyErrors = true;

class RichieMoire {

  constructor(config = {}) {
    // Pot values (9 channels, 0–1023)
    this.pots = new Array(9).fill(512);
    this.rawPots = true;

    this._p5 = new p5(p => this._sketch(p));
  }

  _sketch(p) {

    // Noise accumulators for cursor drift
    let noiseT0 = 0;
    let noiseT1 = 10000; // offset so X and Y noise differ

    let colorButtonState = 0;

    const randNum = (min, max) =>
      Math.floor(Math.random() * (max - min + 1)) + min;

    const getRed = (percent, sliderVal) => {
      if (sliderVal < 60)  return 255 - percent * sliderVal;
      if (sliderVal > 170) return 168 + (255 - sliderVal) * percent;
      return randNum(120, 220);
    };

    const getGreen = (percent, sliderVal) => {
      if (sliderVal < 128) return sliderVal + percent * 128;
      return sliderVal - percent * 128;
    };

    const getBlue = (percent, sliderVal) => {
      if (sliderVal < 128) return 255 - sliderVal * percent * 2;
      return sliderVal * percent;
    };

    p.setup = () => {
      p.frameRate(60);
      p.pixelDensity(1);
      p.createCanvas(p.windowWidth, p.windowHeight);
      Object.assign(p.canvas.style, {
        position: 'fixed', top: '0', left: '0', zIndex: '0'
      });
      p.canvas.classList.add('p5-background');
      p.strokeWeight(1);
      p.background(255);

      // Toggle color mode on canvas click
      p.canvas.addEventListener('click', () => {
        colorButtonState = (colorButtonState + 1) % 3;
      });
    };

    p.windowResized = () => {
      p.resizeCanvas(p.windowWidth, p.windowHeight);
    };

    p.draw = () => {
      const pots = this.pots;

      const numLines  = Math.max(1, Math.floor(p.map(pots[0], 0, 1023, 1, 120)));
      const opacityVal = p.map(pots[1], 0, 1023, 0, 255);
      const colorVal   = p.map(pots[2], 0, 1023, 0, 255);

      // Noise cursor driven by pots[3] and pots[4]
      const speedX = p.map(pots[3], 0, 1023, 0, 0.02);
      const speedY = p.map(pots[4], 0, 1023, 0, 0.02);
      noiseT0 += speedX;
      noiseT1 += speedY;
      const noiseCursorX = p.map(p.noise(noiseT0), 0, 1, 0, p.width);
      const noiseCursorY = p.map(p.noise(noiseT1), 0, 1, 0, p.height);

      // Use noise cursor when pots are being driven (non-zero speed),
      // otherwise follow the mouse
      const useNoise = speedX > 0 || speedY > 0;
      const cursorX = useNoise ? noiseCursorX : p.mouseX;
      const cursorY = useNoise ? noiseCursorY : p.mouseY;

      p.background(255, 255, 255, opacityVal);

      let currentX = 0;
      let currentY = 0;

      for (let i = 0; i < numLines; i++) {
        const t = i / numLines;
        if (colorButtonState === 0) {
          p.stroke(getRed(t, colorVal), getBlue(t, colorVal), getGreen(t, colorVal));
        } else if (colorButtonState === 1) {
          p.stroke(randNum(0, 255), randNum(0, 255), randNum(0, 255));
        } else {
          p.stroke(0);
        }

        p.line(currentX, 0, cursorX, cursorY);
        p.line(currentX, 0, p.map(cursorY, 0, p.height, 0, p.width), p.map(cursorX, 0, p.width, 0, p.height));

        p.line(currentX, p.height, cursorX, cursorY);
        p.line(currentX, p.height, p.map(cursorY, 0, p.height, 0, p.width), p.map(cursorX, 0, p.width, 0, p.height));

        p.line(0, currentY, cursorX, cursorY);
        p.line(0, currentY, p.map(cursorY, 0, p.height, 0, p.width), p.map(cursorX, 0, p.width, 0, p.height));

        p.line(p.width, currentY, cursorX, cursorY);
        p.line(p.width, currentY, p.map(cursorY, 0, p.height, 0, p.width), p.map(cursorX, 0, p.width, 0, p.height));

        currentX += p.width  / numLines;
        currentY += p.height / numLines;
      }
    };
  }
}