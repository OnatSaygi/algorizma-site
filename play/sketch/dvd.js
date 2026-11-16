p5.disableFriendlyErrors = true;

/*
dvd — kelime sektirme efekti (DVD ekran koruyucu tarzı)

Pot haritası (0–1023, ham):
  pots[0] → hız            (0.5 – 52 piksel/kare)
  pots[1] → yazı boyutu    (18 – 280 piksel)
  pots[2] → kelime sayısı  (1 – 16)
  pots[3] → iz solması     (0 = iz yok, 1023 = uzun iz)
  pots[4] → kelime değişim sıklığı (0 = hiç, 1023 = çok sık)
  pots[5] → büyüme/küçülme hızı (perlin-noise hızı, 0 = yavaş, 1023 = hızlı)
*/

class dvd {

  constructor(config = {}) {
    this.pots = new Array(9).fill(512);
    this.rawPots = true;

    this._p5 = new p5(p => this._sketch(p));
  }

  _sketch(p) {

    const WORDS = [
      'Sende',
      'love',
      'Bellek!',
      'denge',
      'dinamizm',
      'boşluk',
      'hisler',
      'söz',
      'güneş',
      'döngü',
      'hayat',
      'cesaret',
      'Doğa',
      'kaos',
      'sevgi',
      'göz',
      'değil',
      'gören',
      'kaplan',
      'Her',
      'Gözün',
      'Görüşü',
      'Kendine göredir'
    ];

    const FONTS = [
      'monospace', 'Georgia', 'Helvetica', 'Times New Roman',
      'Courier New', 'Verdana', 'Palatino', 'Impact', 'Comic Sans MS'
    ];

    const MAX_BALLS = 16;
    let balls = [];
    let cornerFlash = null; // { x, y, alpha }
    let wordTimer = 0;

    // ── Ball sınıfı ──────────────────────────────────────────────────────────
    class Ball {
      constructor(initRandom = false) {
        this.word  = p.random(WORDS);
        this.hue   = p.random(360);
        this.size  = 60;
        this.noiseSeed = p.random(1000);
        this.font = p.random(FONTS);
        this._cachedMetrics = { w: 0, h: 0 };
        this._lastSize = null;
        this._lastWord = null;
        // başlangıç konumu: initRandom ise rastgele, değilse merkez
        this.x = initRandom ? p.random(p.width  * 0.1, p.width  * 0.9) : p.width  / 2;
        this.y = initRandom ? p.random(p.height * 0.1, p.height * 0.9) : p.height / 2;
        const spd   = 3;
        const angle = p.random(p.TWO_PI);
        this.vx = Math.cos(angle) * spd;
        this.vy = Math.sin(angle) * spd;
      }

      // ölçülen metin genişliği/yüksekliği (textSize ayarlandıktan sonra çağrılmalı)
      _metrics() {
        if (this.size === this._lastSize && this.word === this._lastWord) {
          return this._cachedMetrics;
        }
        p.textSize(this.size);
        const w = p.textWidth(this.word);
        const h = this.size * 0.75; // yaklaşık cap-height
        this._cachedMetrics = { w, h };
        this._lastSize = this.size;
        this._lastWord = this.word;
        return this._cachedMetrics;
      }

      update(speed, textSz, noiseSpeed) {
        // her kelime için perlin-noise ile bağımsız boyut
        const n = p.noise(this.noiseSeed + p.frameCount * noiseSpeed);
        this.size = p.lerp(textSz * 0.2, textSz * 1.6, n);

        // performans: çok büyük yazı boyutlarını ekrana göre sınırla
        const maxAllowed = Math.max(60, Math.min(p.width, p.height) * 0.18);
        if (this.size > maxAllowed) this.size = maxAllowed;

        // hızı normalize edip hedef büyüklüğe getir
        const cur = Math.hypot(this.vx, this.vy);
        if (cur > 0) {
          this.vx = (this.vx / cur) * speed;
          this.vy = (this.vy / cur) * speed;
        } else {
          const a = p.random(p.TWO_PI);
          this.vx = Math.cos(a) * speed;
          this.vy = Math.sin(a) * speed;
        }

        this.x += this.vx;
        this.y += this.vy;

        const { w, h } = this._metrics();
        const L = w / 2, T = h * 0.9;

        let hitX = false, hitY = false;

        if (this.x - L <= 0) {
          this.x = L;
          this.vx = Math.abs(this.vx);
          hitX = true;
        } else if (this.x + L >= p.width) {
          this.x = p.width - L;
          this.vx = -Math.abs(this.vx);
          hitX = true;
        }

        if (this.y - T <= 0) {
          this.y = T;
          this.vy = Math.abs(this.vy);
          hitY = true;
        } else if (this.y + h * 0.1 >= p.height) {
          this.y = p.height - h * 0.1;
          this.vy = -Math.abs(this.vy);
          hitY = true;
        }

        if (hitX || hitY) {
          this.hue = (this.hue + 47 + p.random(60)) % 360;
          this.font = p.random(FONTS);
          if (hitX && hitY) {
            cornerFlash = { x: this.x, y: this.y, alpha: 255 };
          }
        }
      }

      draw() {
        p.textSize(this.size);
        p.textAlign(p.CENTER, p.BASELINE);
        // performans: stroke rendering ağır, noStroke ile hız kazanalım
        //p.noStroke();
        p.stroke(0);
        p.strokeWeight(20);
        p.fill(this.hue, 80, 95, 255);
        p.textFont(this.font);
        p.text(this.word, this.x, this.y);
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    p.setup = () => {
      p.frameRate(60);
      p.pixelDensity(1);
      p.createCanvas(p.windowWidth, p.windowHeight);
      Object.assign(p.canvas.style, {
        position: 'fixed', top: '0', left: '0', zIndex: '0'
      });
      p.canvas.classList.add('p5-background');
      p.colorMode(p.HSB, 360, 100, 100, 255);
      p.textFont('monospace');
      p.background(0);

      balls.push(new Ball(false));
    };

    p.windowResized = () => {
      p.resizeCanvas(p.windowWidth, p.windowHeight);
    };

    p.draw = () => {
      const pots = this.pots;

      const speed      = p.map(pots[0], 0, 1023,   0.5,  52);
      const textSz     = p.map(pots[7], 0, 1023,    18, 280);
      const numBalls   = Math.max(1, Math.round(p.map(pots[2], 0, 1023, 1, MAX_BALLS)));
      const fadeAlpha  = p.map(pots[3], 0, 1023,     7,  70);   // arka plan iz miktarı
      const wordPeriod = Math.round(p.map(pots[4], 0, 1023, 600, 30)); // kare sayısı
      // noise hızını pot[5] ile kontrol et (büyüme/küçülme hızı)
      // performans isteği: normal hızın 1/10'u
      const noiseSpeed = p.map(pots[5], 0, 1023, 0.002, 0.06) * 0.03;

      // top sayısını ayarla
      while (balls.length < numBalls) balls.push(new Ball(true));
      while (balls.length > numBalls) balls.pop();

      // arka plan (iz efekti)
      p.fill(0, 0, 0, fadeAlpha);
      p.noStroke();
      p.rect(0, 0, p.width, p.height);

      // köşe çarpma efekti
      if (cornerFlash) {
        p.noStroke();
        p.fill(0, 0, 100, cornerFlash.alpha);
        p.circle(cornerFlash.x, cornerFlash.y, 160);
        cornerFlash.alpha -= 10;
        if (cornerFlash.alpha <= 0) cornerFlash = null;
      }

      // kelime değişim zamanlayıcısı
      wordTimer++;
      if (wordTimer >= wordPeriod) {
        wordTimer = 0;
        const b = p.random(balls);
        b.word = p.random(WORDS);
      }

      // topları güncelle ve çiz
      p.textFont('monospace');
      for (const b of balls) {
        b.update(speed, textSz, noiseSpeed);
        b.draw();
      }
    };
  }
}