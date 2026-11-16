p5.disableFriendlyErrors = true;

class Mandala {
 
  // #region constructor
  constructor(config = {}) {

    this.cfg = Object.assign({
      f: 5,
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
    function easeOutElastic(t) {
      let c4 = (2 * p.PI) / 3;

      if (t === 0) return 0;
      if (t === 1) return 1;

      return p.pow(2, -10 * t) * p.sin((t * 10 - 0.75) * c4) + 1;
    }

    // #region p5 lifecycle
    p.setup = () => {
      p.frameRate(60);
      p.pixelDensity(1);
      p.createCanvas(p.windowWidth, p.windowHeight);
      Object.assign(p.canvas.style, {
        position: 'fixed', top: '0', left: '0', zIndex: '0'
      });
      p.canvas.classList.add('p5-background');

      p.strokeWeight(3);
      p.background(0);
      p.colorMode(p.HSB, 100);
    };

    p.windowResized = () => {
      p.resizeCanvas(p.windowWidth, p.windowHeight);
    };

    p.draw = () => {
      const t = 330;
      let bounce = 1;p.sqrt(easeOutElastic(p.millis()%t/t));
      let layers = this.pots[0] * 200 + 5;
      let leaf = 40 - this.pots[0] * 30;
      p.background(0, 7);
      for (let i = 0; i < layers; i++) {
        let il = i / layers;
        let timer = ((p.millis()+10035) / 1500) + this.pots[2] * 5;
        let rotation = p.PI * timer * il;
        
        // size
        let size_ = p.min(p.width / 2, p.height / 2) * (this.pots[3]*3+0.5);
        let perlin = p.pow(p.noise(p.millis() / 600.0 + i * this.pots[2] * 0.07), this.pots[7] * 3 + 2);
        let radius = size_ * (1-il);
        radius *= 1.0;
        
        // color
        let epylepsy = p.noise(p.millis() / 5000) * 400;
        let perlin2 = p.noise(p.millis() / 888 + i / 10 * (this.pots[6]+0.03) * p.pow(this.pots[6], 0.5) + 10000) * epylepsy % 100;
        p.stroke(
          perlin2,
          p.randomGaussian(this.pots[5] * 200, 20) + p.noise(p.millis()/100.0/(this.pots[6]+.1))*20,
          p.randomGaussian(100, this.pots[6] * 20),
          p.pow(p.abs(0.5 -this.pots[4]/0.99)*1.7, 2)*100 * (1-this.pots[0]*0.99)
          )
        p.fill(
          100-perlin2,
          p.noise(p.millis()/100.0%1)*20,
          p.randomGaussian(100, 1),
          (1-p.pow(p.abs(0.5 -this.pots[4]/0.99)*1.7, 2)) * 100 * (p.pow(1-this.pots[0]*0.99, 3))
        );

        for (let i = 0; i < leaf; i++) {
          let il = i / layers;
          let xx = (-1.2+3*this.pots[5])*il+7*p.noise((p.millis()/100.0))
          let yy = (this.pots[6]-2.3*this.pots[5]+p.noise(p.millis()/10000.0)/2)*il*4;
          let c = p.cos(p.TAU * (xx) * il + rotation);
          let d = p.sin(p.TAU * (yy) / il + rotation);
          let norm = p.max(p.abs(c), p.abs(d));
          if (norm > 0) { c /= norm; d /= norm; }
          c /= 3;
          d /= 3;//(1.2*il+0.1*p.noise((p.millis()/100.0)));
          radius *= (1-il);

        
          p.rectMode(p.CENTER)
          p.rect(p.width / 2 + (c * radius) * bounce, 
                  p.height / 2 + (d * radius) * bounce,
                  radius * perlin / 3, 
                  radius * perlin / 3,           
                )

        }
      }
    };
    // #endregion
  }

  // #endregion
}

