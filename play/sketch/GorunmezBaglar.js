// GorunmezBaglar — Hayat Ağacı, Rizom ve Görünmez Bağlar (Bıçakçılar Sergisi)
// Emergent Morphogenesis & Epigenetic Sequence Engine
// Single-class p5 instance-mode sketch for algorizma-site/play

p5.disableFriendlyErrors = true;

class GorunmezBaglar {
  constructor(config = {}) {
    this.pots = new Array(9).fill(0.5);
    this.cfg = Object.assign({
      radiusScale: 0.43,
      offsetX: 0,
      offsetY: 0,
      showBasinRing: true,
      uiVisible: true
    }, config);

    this._uiElements = [];
    this._keyHandler = null;

    this._p5 = new p5(p => this._sketch(p));

    if (this._p5 && typeof this._p5.remove === 'function') {
      const origRemove = this._p5.remove.bind(this._p5);
      this._p5.remove = () => {
        this._cleanup();
        origRemove();
      };
    }
  }

  _cleanup() {
    if (this._keyHandler) {
      window.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    for (const el of this._uiElements) {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }
    this._uiElements = [];
  }

  _sketch(p) {
    const BASE_RADIUS = 360;
    const cfg = this.cfg;

    const PI = Math.PI;
    const TWO_PI = Math.PI * 2;
    const HALF_PI = Math.PI / 2;
    const lerp = (a, b, t) => a + (b - a) * t;
    const constrain = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const map = (v, inMin, inMax, outMin, outMax) =>
      outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin);

    // Deterministik + organik tohumlu PRNG (aynı geçmiş dizilimi kendi karakteristik türünü üretir)
    const createRNG = (seedInt) => {
      let s = (seedInt >>> 0) || 123456789;
      return (min = 0, max = 1) => {
        s ^= s << 13;
        s ^= s >>> 17;
        s ^= s << 5;
        const t = ((s >>> 0) % 1000000) / 1000000;
        return min + t * (max - min);
      };
    };

    // Çok katmanlı organik curl/akış alanı (p5.noise bağımsız, hızlı deterministik sinüs-basınç alanı)
    const flowField = (x, y, z = 0) => {
      const sx = x * 0.012;
      const sy = y * 0.012;
      const v1 = Math.sin(sx * 1.7 + Math.cos(sy * 1.9 + z * 0.7));
      const v2 = Math.cos(sy * 2.3 - Math.sin(sx * 1.4 - z * 0.5));
      const v3 = Math.sin((sx + sy) * 1.1 + z * 0.3);
      return (v1 + v2 + v3) / 3; // -1 .. 1
    };

    const rgba = (r, g, b, a255) =>
      `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${constrain(a255 / 255, 0, 1).toFixed(3)})`;

    const PLANT_TYPES = {
      mimosa: {
        id: 'mimosa',
        name: 'Küstüm Otu',
        roleDesc: '1. ise: Sinaptik Kasılan Çiftli İskelet | Sonrakilerde: Nabız & Duyarlı Yaprakçık',
        key: '1',
        colorPrimary: [244, 194, 138],
        colorSecondary: [224, 118, 142],
        colorGlow: [255, 222, 175]
      },
      palm: {
        id: 'palm',
        name: 'Palmiye Yaprakları',
        roleDesc: '1. ise: Yelpaze Kemer Mimari | Sonrakilerde: Işınsal Kaburga & Kanat Açılımı',
        key: '2',
        colorPrimary: [235, 214, 158],
        colorSecondary: [164, 198, 130],
        colorGlow: [255, 244, 200]
      },
      monkey_tail: {
        id: 'monkey_tail',
        name: 'Maymun Kuyruğu',
        roleDesc: '1. ise: Sarmal Girdap Omurgası | Sonrakilerde: Kıvrımlı Dokunaç & Tüysü Lifler',
        key: '3',
        colorPrimary: [242, 230, 212],
        colorSecondary: [208, 148, 96],
        colorGlow: [255, 248, 235]
      },
      moss: {
        id: 'moss',
        name: 'Yosun',
        roleDesc: '1. ise: Çok Merkezli Rizom Kolonisi | Sonrakilerde: Kaynaşan Miselyum Ağı',
        key: '4',
        colorPrimary: [152, 218, 166],
        colorSecondary: [104, 182, 158],
        colorGlow: [195, 250, 205]
      }
    };

    const PLANT_LIST = Object.values(PLANT_TYPES);

    // ── Emergent Kombinasyon & Sıra Sentezleyici ────────────────────────────
    // Okutulan bitkilerin SIRASINA göre organizmanın:
    // 1) Beden Planı (Archetype), 2) Kuvvet Alanları (Vortex, Tropism, Anastomosis),
    // 3) Rezonans/Melez Organları ve 4) Emergent Tür İsmi hesaplanır.
    const synthesizeGenome = (historyIds) => {
      const seq = historyIds.length > 0 ? [...historyIds] : ['moss'];
      const founder = seq[0]; // İlk okutulan bitki tüm topolojiyi/beden planını kurar!

      // Sıraya duyarlı hash (ör. ['moss','palm'] !== ['palm','moss'])
      let seqHash = 2166136261;
      for (let i = 0; i < seq.length; i++) {
        const id = seq[i];
        for (let c = 0; c < id.length; c++) {
          seqHash ^= id.charCodeAt(c) + (i + 1) * 37;
          seqHash = Math.imul(seqHash, 16777619);
        }
      }
      seqHash = (seqHash >>> 0) + Math.floor(Math.random() * 999);

      // Pozisyon ağırlıklı gen etkileri (ilk sıralar yapısal/makro, son sıralar morfolojik/mikro)
      const macroWeights = { mimosa: 0, palm: 0, monkey_tail: 0, moss: 0 };
      const microWeights = { mimosa: 0, palm: 0, monkey_tail: 0, moss: 0 };
      let macroSum = 0;
      let microSum = 0;

      seq.forEach((id, idx) => {
        const mw = Math.pow(0.65, idx); // İlk okutulanlar yüksek makro ağırlık
        const uw = Math.pow(1.45, idx); // Son okutulanlar yüksek uç/organ ağırlığı
        macroWeights[id] += mw;
        microWeights[id] += uw;
        macroSum += mw;
        microSum += uw;
      });
      for (const k of Object.keys(macroWeights)) {
        macroWeights[k] /= macroSum || 1;
        microWeights[k] /= microSum || 1;
      }

      // Ardışık İkili Geçiş Matrisi (Transition Pairs: A -> B)
      // Sıranın yönü burada bambaşka melez mutasyonlar tetikler!
      const transitions = [];
      let spiralBias = 0;        // Sarmal burgu kuvveti
      let anastomosisRate = 0;   // Dalların birbirine kaynaşıp kapalı rizom halkası kurma oranı
      let peristalticWave = 0;   // Gövdenin boğum boğum kasılma/nabız dalgası
      let fanAsymmetry = 0;      // Tek yönlü kanat/yelpaze açılımı
      let weepingTendrils = 0;   // Uçlardan sarkan uzun tüysü dokunaçlar
      let synapticSpore = 0;     // Ağ düğümlerinde ateşlenen biyolüminesan sinapslar
      let hyperResonance = 0;    // Aynı bitkinin üst üste okutulmasından doğan fraktal aşırı güçlenme

      for (let i = 0; i < seq.length - 1; i++) {
        const a = seq[i];
        const b = seq[i + 1];
        const pair = `${a}->${b}`;
        transitions.push(pair);

        if (a === b) {
          hyperResonance += 0.45;
          if (a === 'monkey_tail') spiralBias += 0.7;
          if (a === 'moss') anastomosisRate += 0.65;
          if (a === 'mimosa') peristalticWave += 0.7;
          if (a === 'palm') fanAsymmetry += 0.6;
        }
        // Yönlü kombinasyon farkları (A->B ile B->A tamamen farklı!)
        if (pair === 'moss->mimosa') {
          // Yosun ağı üzerinde ateşlenen duyarlı sinaptik yaprakçıklar
          synapticSpore += 0.85;
          peristalticWave += 0.45;
        } else if (pair === 'mimosa->moss') {
          // Simetrik dalların uçlarında kapanan yosun kozaları ve yoğun perde ağları
          anastomosisRate += 0.8;
          synapticSpore += 0.35;
        } else if (pair === 'monkey_tail->palm') {
          // Kıvrımlı kuyruk sırtından tek yöne açılan ejderha/deniz şakayığı kanatları
          fanAsymmetry += 0.9;
          spiralBias += 0.4;
        } else if (pair === 'palm->monkey_tail') {
          // Geniş yelpaze kemerlerinden suya sarkan uzun tüylü medüz dokunaçları
          weepingTendrils += 0.95;
          spiralBias += 0.35;
        } else if (pair === 'mimosa->monkey_tail') {
          // Peristaltik kırbaç: Küstüm otunun kasılma dalgası sarmal kuyrukları yılan gibi büker
          peristalticWave += 0.95;
          spiralBias += 0.55;
        } else if (pair === 'monkey_tail->mimosa') {
          // Sarmal gövdeden fışkıran dikenli/duyarlı çift sıra mimoza tüyleri
          weepingTendrils += 0.45;
          peristalticWave += 0.6;
        } else if (pair === 'moss->palm') {
          // Çoklu rizom çekirdeklerini birbirine bağlayan kavisli mangrov kemerleri
          anastomosisRate += 0.55;
          fanAsymmetry += 0.55;
        } else if (pair === 'palm->moss') {
          // Yelpaze kaburgalarının arasında örülen ince dantel/liken perdeleri
          anastomosisRate += 0.9;
        } else if (pair === 'moss->monkey_tail') {
          // Rizom düğümlerinden çıkan kıvrımlı solucan/kök sarmalları
          spiralBias += 0.65;
          anastomosisRate += 0.4;
        } else if (pair === 'monkey_tail->moss') {
          // Kalın sarmal kuyrukların etrafını saran biyolüminesan yosun kürkü
          synapticSpore += 0.7;
          weepingTendrils += 0.5;
        } else if (pair === 'palm->mimosa') {
          // Yelpaze yaprakların her bir şeridinin nefes alır gibi kapanıp açılması
          peristalticWave += 0.8;
          fanAsymmetry += 0.4;
        } else if (pair === 'mimosa->palm') {
          // Çatallanan simetrik dalların uçlarında aniden açılan lotus/palmet taçları
          fanAsymmetry += 0.75;
        }
      }

      // Emergent Tür İsmi (Sol panelde ziyaretçiye yarattığı benzersiz melezin karakterini gösterir)
      const founderNames = {
        moss: 'Rizomatik Koloni',
        monkey_tail: 'Sarmal Girdap',
        palm: 'Yelpaze Kemer',
        mimosa: 'Sinaptik Çatal'
      };
      const lastPlant = seq[seq.length - 1];
      const modifierNames = {
        moss: 'Miselyum Örgüsü',
        monkey_tail: 'Tüysü Dokunaç',
        palm: 'Işınsal Palmet',
        mimosa: 'Duyarlı Mimoza'
      };
      const emergentTitle = seq.length === 1
        ? `Saf ${PLANT_TYPES[founder].name} Arketipi`
        : `${founderNames[founder]} × ${modifierNames[lastPlant]}`;

      return {
        seq,
        founder,
        seqHash,
        macroWeights,
        microWeights,
        transitions,
        emergentTitle,
        spiralBias: constrain(spiralBias + macroWeights.monkey_tail * 0.8, 0, 2.2),
        anastomosisRate: constrain(anastomosisRate + macroWeights.moss * 0.75, 0, 2.0),
        peristalticWave: constrain(peristalticWave + macroWeights.mimosa * 0.85, 0, 2.2),
        fanAsymmetry: constrain(fanAsymmetry + macroWeights.palm * 0.75, 0, 2.0),
        weepingTendrils: constrain(weepingTendrils + microWeights.monkey_tail * 0.8, 0, 2.0),
        synapticSpore: constrain(synapticSpore + microWeights.moss * 0.7, 0, 2.0),
        hyperResonance: constrain(hyperResonance, 0, 2.0)
      };
    };

    let organism = null;
    let ghostOrganism = null; // Bir önceki ziyaretçinin suyun dibinde kalan silik rizom izi!
    let ripples = [];
    let floatingFibers = [];
    let lastTimeSec = 0;
    let idleTimer = 0;
    let guideAlpha = 0;

    const rfidState = {
      seeds: [
        { id: 'TAG-01', label: 'Tohum #1', history: ['moss', 'mimosa', 'palm'] },
        { id: 'TAG-02', label: 'Tohum #2', history: ['monkey_tail', 'palm', 'moss', 'mimosa'] },
        { id: 'TAG-03', label: 'Tohum #3', history: ['palm', 'monkey_tail'] }
      ],
      activeSeedIndex: 0,
      inFountain: false,
      get activeSeed() {
        return this.seeds[this.activeSeedIndex];
      }
    };

    // ── Su Dalgası ──────────────────────────────────────────────────────────
    class WaterRipple {
      constructor(x, y, maxR, color = [220, 210, 185], delayFrames = 0) {
        this.x = x;
        this.y = y;
        this.r = 4;
        this.maxR = maxR;
        this.color = color;
        this.alpha = 210;
        this.delay = delayFrames;
      }
      update() {
        if (this.delay > 0) {
          this.delay--;
          return;
        }
        this.r = lerp(this.r, this.maxR, 0.035);
        this.alpha *= 0.965;
      }
      display(ctx) {
        if (this.delay > 0) return;
        ctx.strokeStyle = rgba(this.color[0], this.color[1], this.color[2], this.alpha);
        ctx.lineWidth = map(this.alpha, 0, 210, 0.4, 2.2);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, TWO_PI);
        ctx.stroke();
      }
      isDead() {
        return this.alpha < 2.5;
      }
    }

    // ── Suda Yüzen Lifler ───────────────────────────────────────────────────
    class FloatingFiber {
      constructor() {
        this.angle = Math.random() * TWO_PI;
        this.distRatio = Math.sqrt(0.05 + Math.random() * 0.9);
        this.speed = (0.0008 + Math.random() * 0.0017) * (Math.random() < 0.5 ? 1 : -1);
        this.len = 4 + Math.random() * 8;
        this.alpha = 35 + Math.random() * 60;
        this.phase = Math.random() * TWO_PI;
        this.x = 0;
        this.y = 0;
        this.orient = 0;
      }
      update(basinRadius, time) {
        this.angle += this.speed;
        const r = this.distRatio * basinRadius;
        this.x = Math.cos(this.angle) * r + Math.sin(time + this.phase) * 4;
        this.y = Math.sin(this.angle) * r + Math.cos(time + this.phase) * 4;
        this.orient = this.angle + HALF_PI + Math.sin(time * 0.7 + this.phase) * 0.5;
      }
      display(ctx) {
        ctx.strokeStyle = rgba(215, 200, 165, this.alpha);
        ctx.lineWidth = 0.85;
        ctx.beginPath();
        ctx.moveTo(
          this.x - Math.cos(this.orient) * this.len * 0.5,
          this.y - Math.sin(this.orient) * this.len * 0.5
        );
        ctx.lineTo(
          this.x + Math.cos(this.orient) * this.len * 0.5,
          this.y + Math.sin(this.orient) * this.len * 0.5
        );
        ctx.stroke();
      }
    }

    // ============================================================================
    // EMERGENT BİTKİ ORGANİZMASI (Ajan Tabanlı Morfogenez & Epigenetik Sıra)
    // ============================================================================
    class EmergentOrganism {
      constructor(historyIds, maxRadius) {
        this.historyIds = [...historyIds];
        this.maxRadius = maxRadius;
        this.genome = synthesizeGenome(this.historyIds);
        this.rng = createRNG(this.genome.seqHash);

        this.seedCenters = [];    // Başlangıç çekirdekleri (Yosunda çoklu koloni, diğerlerinde merkeze bağlı)
        this.branches = [];       // Büyüyen dal izleri (her biri çok adımlı omurga + jüt lifleri)
        this.allNodes = [];       // Anastomoz (kaynaşma) ve rizom ağları için uzaysal düğümler
        this.rhizomeBridges = []; // Dallar arası emergent kaynaşma/miselyum köprüleri
        this.tendrils = [];       // Melez kombinasyonlardan doğan sarkık/kıvrımlı dokunaçlar

        this.growthTime = 0;
        this.maxGrowthTime = 1.0;
        this.maxDepthSeen = 0;
        this.holdTimer = 0;
        this.holdDuration = 4.2; // Tüm dallar büyüdükten sonra suda nefes alma (suspension) süresi
        this.dissolving = false;
        this.dissolveTime = 0;
        this.maxDissolveTime = 2.0;
        this.dissolveAlpha = 1.0;
        this.isGhost = false;

        this.simulateMorphogenesis();
      }

      simulateMorphogenesis() {
        const g = this.genome;
        const rng = this.rng;
        const seq = g.seq;
        // 3, 4 veya daha fazla bitki okutulduğunda tüm kademelerin oynaması için dinamik derinlik
        const dynamicMaxDepth = Math.max(3, Math.min(seq.length - 1, 5));

        // ── 1. KURUCU BİTKİYE (1. SIRA) GÖRE TOPOLOJİ VE TOHUM ÇEKİRDEKLERİ ──
        let activeTips = [];

        if (g.founder === 'moss') {
          // YOSUN BAŞLANGICI: Tek bir ağaç değil, suyun içinde dağılmış 4-6 adet
          // "Rizom Koloni Çekirdeği" ve bunları birbirine bağlayan ana miselyum köprüleri!
          const colonyCount = 4 + Math.floor(rng(0, 3));
          for (let c = 0; c < colonyCount; c++) {
            const rad = c === 0 ? 0 : rng(55, this.maxRadius * 0.48);
            const ang = (TWO_PI / (colonyCount - 1 || 1)) * c + rng(-0.35, 0.35);
            const cx = Math.cos(ang) * rad;
            const cy = Math.sin(ang) * rad;
            this.seedCenters.push({ x: cx, y: cy, plantId: 'moss', r: c === 0 ? 9 : 6 });

            // Her koloni adacığından dışa ve komşu adacıklara doğru filizler çıkar
            const sprouts = c === 0 ? 4 : 3;
            for (let s = 0; s < sprouts; s++) {
              const sa = ang + (TWO_PI / sprouts) * s + rng(-0.25, 0.25);
              activeTips.push({
                x: cx,
                y: cy,
                angle: sa,
                energy: 1.0,
                depth: 0,
                maxDepth: dynamicMaxDepth,
                startTime: c === 0 ? 0 : 0.12 + c * 0.05,
                branchId: s + c * 10,
                chirality: s % 2 === 0 ? 1 : -1
              });
            }
          }
          // Koloniler arası doğrudan kök-sap (rizom) ana hatları
          for (let i = 0; i < this.seedCenters.length; i++) {
            for (let j = i + 1; j < this.seedCenters.length; j++) {
              const a = this.seedCenters[i];
              const b = this.seedCenters[j];
              if (Math.hypot(a.x - b.x, a.y - b.y) < this.maxRadius * 0.55) {
                this.rhizomeBridges.push({
                  x1: a.x, y1: a.y,
                  x2: b.x, y2: b.y,
                  cx: (a.x + b.x) * 0.5 + rng(-25, 25),
                  cy: (a.y + b.y) * 0.5 + rng(-25, 25),
                  appearTime: 0.08,
                  depth: 0,
                  color: PLANT_TYPES.moss.colorPrimary,
                  thick: 1.8
                });
              }
            }
          }
        } else if (g.founder === 'monkey_tail') {
          // MAYMUN KUYRUĞU BAŞLANGICI: Yıldız gibi dağılmaz!
          // Merkezden birbirine sarılarak dönen 2 veya 3 dev sarmal "Omurga Kuyruk" (Vortex) çıkar!
          this.seedCenters.push({ x: 0, y: 0, plantId: 'monkey_tail', r: 10 });
          const tailCount = 2 + (seq.length % 2); // 2 veya 3 ana kuyruk
          const spinDir = rng() < 0.5 ? 1 : -1;
          for (let t = 0; t < tailCount; t++) {
            const baseA = (TWO_PI / tailCount) * t + rng(-0.1, 0.1);
            activeTips.push({
              x: 0,
              y: 0,
              angle: baseA,
              energy: 1.35, // Çok uzun, kıvrımlı ana gövde
              depth: 0,
              maxDepth: dynamicMaxDepth,
              startTime: 0,
              branchId: t,
              chirality: spinDir
            });
          }
        } else if (g.founder === 'palm') {
          // PALMİYE BAŞLANGICI: Bilateral / Yelpaze Kadeh Mimarisi!
          // İki zıt veya tek bir ana eksenden katmanlı yelpaze kanatları halinde yükselir.
          this.seedCenters.push({ x: 0, y: 0, plantId: 'palm', r: 10 });
          const axisAngle = rng(0, TWO_PI);
          const fanCount = 7;
          const fanArc = PI * 1.15; // Yelpaze açıklığı
          for (let f = 0; f < fanCount; f++) {
            const norm = map(f, 0, fanCount - 1, -1, 1);
            const a = axisAngle + norm * (fanArc * 0.5);
            // Ortadaki yaprak kaburgaları daha uzun, yanlardakiler kavisli
            const energy = 1.15 - Math.abs(norm) * 0.32;
            activeTips.push({
              x: 0,
              y: 0,
              angle: a,
              energy,
              depth: 0,
              maxDepth: dynamicMaxDepth,
              startTime: Math.abs(norm) * 0.1,
              branchId: f,
              chirality: norm >= 0 ? 1 : -1
            });
          }
        } else {
          // KÜSTÜM OTU (MIMOSA) BAŞLANGICI: Keskin Geometrik Çiftli (Dikotomik) Sinir İskeleti!
          this.seedCenters.push({ x: 0, y: 0, plantId: 'mimosa', r: 9 });
          const primaryPairs = 4;
          const baseRot = rng(0, PI);
          for (let i = 0; i < primaryPairs; i++) {
            const a = baseRot + (TWO_PI / primaryPairs) * i;
            activeTips.push({
              x: 0,
              y: 0,
              angle: a,
              energy: 1.0,
              depth: 0,
              maxDepth: dynamicMaxDepth,
              startTime: 0,
              branchId: i,
              chirality: i % 2 === 0 ? 1 : -1
            });
          }
        }

        // ── 2. ADIM ADIM AJAN BÜYÜMESİ VE EVRELER ARASI MELEZLENME ───────────
        let queue = [...activeTips];
        let safetyCounter = 0;

        while (queue.length > 0 && safetyCounter < 750) {
          safetyCounter++;
          const tip = queue.shift();

          // Bu derinliğin hangi okutulan bitkiye denk geldiğini bul (ve bir öncekiyle melezle!)
          const seqIdx = Math.min(seq.length - 1, Math.floor((tip.depth / (tip.maxDepth + 1)) * seq.length));
          const prevSeqIdx = Math.max(0, seqIdx - 1);
          const currentPlant = PLANT_TYPES[seq[seqIdx]] || PLANT_TYPES.moss;
          const prevPlant = PLANT_TYPES[seq[prevSeqIdx]] || currentPlant;

          // Bu dalın kaç adım yürüyeceği ve adım uzunluğu
          const stepCount = currentPlant.id === 'monkey_tail' ? 18 : currentPlant.id === 'palm' ? 15 : 12;
          const baseStepLen = (this.maxRadius / (tip.maxDepth * 11 + 8)) * tip.energy *
            (currentPlant.id === 'monkey_tail' ? 1.35 : currentPlant.id === 'moss' ? 0.82 : 1.05);

          const points = [];
          let cx = tip.x;
          let cy = tip.y;
          let cAngle = tip.angle;
          const duration = 0.22 + (tip.depth === 0 ? 0.08 : 0.04);

          points.push({ x: cx, y: cy, angle: cAngle, tNorm: 0 });

          for (let step = 1; step <= stepCount; step++) {
            const tNorm = step / stepCount;

            // A) SARMAL GİRDAP (Vortex / Curl): Maymun kuyruğu genetiği ve geçişlerinden gelir
            const curlVal = flowField(cx, cy, tip.branchId * 0.7 + tip.depth);
            let deltaAngle = 0;

            if (currentPlant.id === 'monkey_tail' || g.spiralBias > 0.4) {
              const vortexTwist = tip.chirality * (0.055 + g.spiralBias * 0.035) * (1 - tNorm * 0.3);
              deltaAngle += vortexTwist + curlVal * 0.14 * (1 + g.spiralBias * 0.4);
            }

            // B) YELPAZE KEMER EĞİMİ (Palm Arch): Palmiye genetiğinden gelir
            if (currentPlant.id === 'palm' || g.fanAsymmetry > 0.3) {
              deltaAngle += tip.chirality * 0.048 * (1 + g.fanAsymmetry * 0.5) * Math.sin(tNorm * PI);
            }

            // C) KÜSTÜM OTU ZİKZAK / SİNİR EKSENİ:
            if (currentPlant.id === 'mimosa') {
              deltaAngle += (step % 2 === 0 ? 1 : -1) * 0.04 + curlVal * 0.04;
            }

            // D) YOSUN KIVRIMI VE ÇEKİMİ (Anastomoz / Komşu düğüme yönelme):
            if (currentPlant.id === 'moss' || g.anastomosisRate > 0.5) {
              deltaAngle += curlVal * 0.22;
            }

            cAngle += deltaAngle;
            cx += Math.cos(cAngle) * baseStepLen;
            cy += Math.sin(cAngle) * baseStepLen;

            // Çeşme sınırına yaklaşınca teğetsel/dairesel kıvrılma (duvara çarpıp kesilmek yerine suyun kenarında dolanır!)
            const distFromCenter = Math.hypot(cx, cy);
            if (distFromCenter > this.maxRadius * 0.86) {
              const radialAngle = Math.atan2(cy, cx);
              const tangentAngle = radialAngle + tip.chirality * HALF_PI;
              cAngle = lerp(cAngle, tangentAngle, 0.35);
              const clampR = Math.min(distFromCenter, this.maxRadius * 0.96);
              cx = Math.cos(radialAngle) * clampR;
              cy = Math.sin(radialAngle) * clampR;
            }

            points.push({ x: cx, y: cy, angle: cAngle, tNorm });

            if (step % 3 === 0) {
              this.allNodes.push({
                x: cx,
                y: cy,
                depth: tip.depth,
                time: tip.startTime + duration * tNorm,
                plant: currentPlant,
                branchId: tip.branchId
              });
            }
          }

          // Jüt İplik Demetleri (önceki bitki ile şimdiki bitkinin renklerini melezler!)
          const strandCount = currentPlant.id === 'monkey_tail' ? 10
            : currentPlant.id === 'palm' ? 8
            : currentPlant.id === 'moss' ? 7 : 5;
          const strands = [];
          for (let s = 0; s < strandCount; s++) {
            strands.push({
              phase: rng(0, TWO_PI),
              spreadRatio: map(s, 0, strandCount - 1, -1, 1),
              weight: rng(0.65, 1.55),
              alpha: rng(0.45, 0.95),
              usePrevColor: s % 3 === 0 // Önceki evrenin lifi yeni evrenin içinde damar olarak devam eder!
            });
          }

          const STAGE_SUSPENSION = 0.28; // Kademeler arası nefes / askıda kalma süresi
          const endTime = tip.startTime + duration;
          const nextStageStart = endTime + STAGE_SUSPENSION;
          this.maxGrowthTime = Math.max(this.maxGrowthTime, endTime);
          this.maxDepthSeen = Math.max(this.maxDepthSeen, tip.depth);

          this.branches.push({
            points,
            plant: currentPlant,
            prevPlant,
            depth: tip.depth,
            maxDepth: tip.maxDepth,
            startTime: tip.startTime,
            endTime,
            chirality: tip.chirality,
            strands,
            phaseSeed: rng(0, 100)
          });

          // ── 3. EMERGENT ÇATALLANMA (Sonraki Evreye Geçiş Kuralları) ────────
          if (tip.depth < tip.maxDepth) {
            const nextSeqIdx = Math.min(seq.length - 1, Math.floor(((tip.depth + 1) / (tip.maxDepth + 1)) * seq.length));
            const nextPlant = PLANT_TYPES[seq[nextSeqIdx]] || currentPlant;
            const pairKey = `${currentPlant.id}->${nextPlant.id}`;
            const endPt = points[points.length - 1];

            // Dal sayısı çok büyürse son aşamaların kesilmemesi için tekil devam dalına düş
            const totalPending = this.branches.length + queue.length;
            if (totalPending > 240) {
              if (tip.branchId % 2 === 0) {
                queue.push({
                  x: endPt.x,
                  y: endPt.y,
                  angle: endPt.angle + rng(-0.22, 0.22),
                  energy: tip.energy * 0.78,
                  depth: tip.depth + 1,
                  maxDepth: tip.maxDepth,
                  startTime: nextStageStart,
                  branchId: tip.branchId + 1,
                  chirality: tip.chirality
                });
              }
            } else if (pairKey === 'monkey_tail->palm') {
              // SARMAL GÖVDENİN SIRTINDA AÇILAN YELPAZE KANATLAR!
              // Sadece uçtan değil, kıvrımlı gövdenin boyunca tek taraflı 4 adet palmiye kanadı çıkar
              for (let w = 1; w <= 4; w++) {
                const idx = Math.floor((w / 5) * (points.length - 1));
                const spinePt = points[idx];
                const wingAngle = spinePt.angle + tip.chirality * (0.55 + w * 0.12);
                queue.push({
                  x: spinePt.x,
                  y: spinePt.y,
                  angle: wingAngle,
                  energy: tip.energy * 0.68,
                  depth: tip.depth + 1,
                  maxDepth: tip.maxDepth,
                  startTime: nextStageStart + (w - 1) * 0.08,
                  branchId: tip.branchId * 7 + w,
                  chirality: tip.chirality
                });
              }
            } else if (pairKey === 'palm->monkey_tail') {
              // YELPAZE UÇLARINDAN SARKAN KIVRIMLI MEDÜZ DOKUNAÇLARI!
              for (const side of [-1, 1]) {
                queue.push({
                  x: endPt.x,
                  y: endPt.y,
                  angle: endPt.angle + side * 0.22,
                  energy: tip.energy * 0.92,
                  depth: tip.depth + 1,
                  maxDepth: tip.maxDepth,
                  startTime: nextStageStart,
                  branchId: tip.branchId * 5 + (side > 0 ? 1 : 2),
                  chirality: side
                });
              }
            } else if (nextPlant.id === 'palm') {
              // Palmiye çatallanması: 3'lü veya 4'lü yelpaze taç
              const splitCount = tip.depth >= 2 ? 3 : 4;
              const spreadArc = 0.68 + g.fanAsymmetry * 0.18;
              for (let b = 0; b < splitCount; b++) {
                const offsetA = map(b, 0, splitCount - 1, -spreadArc, spreadArc);
                queue.push({
                  x: endPt.x,
                  y: endPt.y,
                  angle: endPt.angle + offsetA,
                  energy: tip.energy * (0.78 - Math.abs(offsetA) * 0.15),
                  depth: tip.depth + 1,
                  maxDepth: tip.maxDepth,
                  startTime: nextStageStart,
                  branchId: tip.branchId * 4 + b,
                  chirality: offsetA >= 0 ? 1 : -1
                });
              }
            } else if (nextPlant.id === 'mimosa') {
              // Küstüm otu çatallanması: Hassas simetrik ikili çatal (dikotomi)
              const splitAngle = 0.46 + (g.peristalticWave * 0.08);
              for (const side of [-1, 1]) {
                queue.push({
                  x: endPt.x,
                  y: endPt.y,
                  angle: endPt.angle + side * splitAngle,
                  energy: tip.energy * 0.76,
                  depth: tip.depth + 1,
                  maxDepth: tip.maxDepth,
                  startTime: nextStageStart,
                  branchId: tip.branchId * 3 + (side > 0 ? 1 : 2),
                  chirality: side
                });
              }
            } else if (nextPlant.id === 'monkey_tail') {
              // Maymun kuyruğu: Ana sarmal devam ederken yandan bir kıvrımlı sürgün verir
              queue.push({
                x: endPt.x,
                y: endPt.y,
                angle: endPt.angle + tip.chirality * 0.15,
                energy: tip.energy * 0.86,
                depth: tip.depth + 1,
                maxDepth: tip.maxDepth,
                startTime: nextStageStart,
                branchId: tip.branchId * 3 + 1,
                chirality: tip.chirality
              });
              const midPt = points[Math.floor(points.length * 0.55)];
              queue.push({
                x: midPt.x,
                y: midPt.y,
                angle: midPt.angle - tip.chirality * 0.62,
                energy: tip.energy * 0.65,
                depth: tip.depth + 1,
                maxDepth: tip.maxDepth,
                startTime: nextStageStart + 0.06,
                branchId: tip.branchId * 3 + 2,
                chirality: -tip.chirality
              });
            } else {
              // Yosun çatallanması: Asimetrik 3 yönlü organik ağ yayılımı
              const angles = [-0.75, rng(-0.15, 0.15), 0.75];
              for (let b = 0; b < angles.length; b++) {
                if (tip.depth >= 3 && b === 1) continue;
                queue.push({
                  x: endPt.x,
                  y: endPt.y,
                  angle: endPt.angle + angles[b] + rng(-0.15, 0.15),
                  energy: tip.energy * 0.72,
                  depth: tip.depth + 1,
                  maxDepth: tip.maxDepth,
                  startTime: nextStageStart,
                  branchId: tip.branchId * 4 + b,
                  chirality: b % 2 === 0 ? 1 : -1
                });
              }
            }
          }
        }

        // ── 4. ANASTOMOZ & GÖRÜNMEZ BAĞLAR (Farklı Dalların Kaynaşması) ──────
        const bridgeLimit = Math.floor(65 + g.anastomosisRate * 85);
        for (let i = 0; i < this.allNodes.length; i++) {
          const nA = this.allNodes[i];
          for (let j = i + 2; j < this.allNodes.length; j++) {
            const nB = this.allNodes[j];
            if (nA.branchId === nB.branchId) continue;
            const d = Math.hypot(nA.x - nB.x, nA.y - nB.y);
            const maxBridgeDist = 34 + g.anastomosisRate * 38;
            if (d > 14 && d < maxBridgeDist) {
              if (rng() < (0.08 + g.anastomosisRate * 0.12) && this.rhizomeBridges.length < bridgeLimit) {
                this.rhizomeBridges.push({
                  x1: nA.x, y1: nA.y,
                  x2: nB.x, y2: nB.y,
                  cx: (nA.x + nB.x) * 0.5 + rng(-18, 18),
                  cy: (nA.y + nB.y) * 0.5 + rng(-18, 18),
                  appearTime: Math.max(nA.time, nB.time),
                  depth: Math.max(nA.depth, nB.depth),
                  color: nA.plant.colorSecondary,
                  thick: rng(0.55, 1.25),
                  hasSpore: g.synapticSpore > 0.3 && rng() < 0.45
                });
              }
            }
          }
        }

        // Ritmik yokoluş toplam süresi (en uçtan merkeze, her kademe arası suspension ile)
        this.maxDissolveTime = (this.maxDepthSeen + 2) * 0.58;
      }

      dissolve() {
        this.dissolving = true;
      }

      makeGhost() {
        this.isGhost = true;
        this.dissolveAlpha = 0.22; // Önceki ziyaretçiden kalan yarı saydam su altı rizom izi
      }

      isCompletelyDissolved() {
        return this.dissolving && this.dissolveTime >= this.maxDissolveTime;
      }

      getDepthFadeAlpha(depth) {
        if (!this.dissolving) return 1.0;
        const FADE_DUR = 0.34;
        const FADE_SUSPEND = 0.24;
        const FADE_PERIOD = FADE_DUR + FADE_SUSPEND;
        const layerIdx = Math.max(0, this.maxDepthSeen - depth);
        const start = layerIdx * FADE_PERIOD;
        const t = constrain((this.dissolveTime - start) / FADE_DUR, 0, 1);
        return 1 - t * t * (3 - 2 * t);
      }

      update(dt) {
        if (this.dissolving) {
          this.dissolveTime += dt * 0.42;
        } else if (!this.isGhost) {
          if (this.growthTime < this.maxGrowthTime) {
            this.growthTime += dt * 0.30;
          } else {
            this.holdTimer += dt;
            if (this.holdTimer >= this.holdDuration) {
              this.dissolving = true;
            }
          }
        }
      }

      display(ctx, time) {
        const g = this.genome;

        // 1. Anastomoz / Rizom Köprüleri ve Sinaptik Sporlar
        this.drawRhizomeNetwork(ctx, time);

        // 2. Büyüyen Emergent Dallar ve Melez Organlar (Kendi kademe ritmiyle doğar ve söner)
        for (const br of this.branches) {
          const span = Math.max(0.05, br.endTime - br.startTime);
          const localProg = this.isGhost ? 1.0 : constrain((this.growthTime - br.startTime) / span, 0, 1);
          if (localProg <= 0.001) continue;

          const branchAlpha = this.isGhost ? this.dissolveAlpha : this.getDepthFadeAlpha(br.depth);
          if (branchAlpha <= 0.004) continue;

          const eased = 1 - Math.pow(1 - localProg, 3);
          this.drawBranch(ctx, br, eased, time, branchAlpha);
        }

        // 3. Tohum / Koloni Çekirdekleri (En son sönen kademe: depth -1)
        if (!this.isGhost) {
          const coreAlpha = this.getDepthFadeAlpha(-1);
          if (coreAlpha > 0.004) {
            this.drawSeedCores(ctx, time, coreAlpha);
          }
        }
      }

      drawRhizomeNetwork(ctx, time) {
        for (const b of this.rhizomeBridges) {
          const prog = this.isGhost ? 1.0 : constrain((this.growthTime - b.appearTime) / 0.18, 0, 1);
          if (prog <= 0) continue;

          const bridgeAlpha = this.isGhost ? this.dissolveAlpha : this.getDepthFadeAlpha(b.depth || 0);
          if (bridgeAlpha <= 0.004) continue;

          const c = b.color;
          const pulse = 0.65 + 0.35 * Math.sin(time * 2.1 + b.x1 * 0.05);
          ctx.strokeStyle = rgba(c[0], c[1], c[2], 70 * prog * pulse * bridgeAlpha);
          ctx.lineWidth = b.thick;

          const tx = lerp(b.x1, b.x2, prog);
          const ty = lerp(b.y1, b.y2, prog);
          const swayX = b.cx + Math.sin(time * 1.3 + b.y1 * 0.04) * 5;
          const swayY = b.cy + Math.cos(time * 1.3 + b.x1 * 0.04) * 5;

          ctx.beginPath();
          ctx.moveTo(b.x1, b.y1);
          ctx.quadraticCurveTo(swayX, swayY, tx, ty);
          ctx.stroke();

          // Yosun × Küstüm Otu melezinden doğan ateşlenen sinaptik düğümler
          if (b.hasSpore && prog > 0.8 && !this.isGhost) {
            const fire = Math.pow(0.5 + 0.5 * Math.sin(time * 3.8 + b.x1), 4);
            ctx.fillStyle = rgba(255, 235, 185, (60 + 180 * fire) * bridgeAlpha);
            ctx.beginPath();
            ctx.arc(swayX, swayY, 1.2 + fire * 2.0, 0, TWO_PI);
            ctx.fill();
          }
        }
      }

      drawBranch(ctx, br, growth, time, masterAlpha) {
        const g = this.genome;
        const colPri = br.plant.colorPrimary;
        const colSec = br.plant.colorSecondary;
        const colGlow = br.plant.colorGlow;
        const prevCol = br.prevPlant.colorPrimary;

        const pts = br.points;
        const activeCount = Math.max(2, Math.floor(pts.length * growth));

        // Dinamik Peristaltik / Su Akıntısı Deformasyonu
        // Küstüm otu + Maymun kuyruğu kombinasyonunda gövde yılan/kalp gibi dalgalanır
        const waveAmp = (2.5 + g.peristalticWave * 5.5) * (1 + br.depth * 0.25);
        const waveFreq = 2.2 + g.spiralBias * 1.5;

        const deformed = [];
        for (let i = 0; i < activeCount; i++) {
          const pt = pts[i];
          const perp = pt.angle + HALF_PI;
          const wave = Math.sin(time * 2.2 - pt.tNorm * waveFreq + br.phaseSeed) * waveAmp * pt.tNorm;
          deformed.push({
            x: pt.x + Math.cos(perp) * wave,
            y: pt.y + Math.sin(perp) * wave,
            angle: pt.angle,
            tNorm: pt.tNorm
          });
        }

        // A) İç Çelik Tel Omurga
        ctx.strokeStyle = rgba(colGlow[0], colGlow[1], colGlow[2], 125 * masterAlpha);
        ctx.lineWidth = Math.max(0.65, (br.maxDepth - br.depth + 1) * 0.45);
        ctx.beginPath();
        for (let i = 0; i < deformed.length; i++) {
          if (i === 0) ctx.moveTo(deformed[i].x, deformed[i].y);
          else ctx.lineTo(deformed[i].x, deformed[i].y);
        }
        ctx.stroke();

        // B) Çok Telli Jüt Lifleri (Önceki bitkinin rengi damarların içinde taşınır!)
        const baseSpread = br.plant.id === 'monkey_tail' ? 8.5
          : br.plant.id === 'moss' ? 9.5
          : br.plant.id === 'palm' ? 6.0 : 4.2;

        for (const st of br.strands) {
          const cSource = st.usePrevColor ? prevCol : colPri;
          const mix = (st.spreadRatio + 1) * 0.5;
          ctx.strokeStyle = rgba(
            lerp(cSource[0], colSec[0], mix),
            lerp(cSource[1], colSec[1], mix),
            lerp(cSource[2], colSec[2], mix),
            165 * st.alpha * masterAlpha
          );
          ctx.lineWidth = st.weight * map(br.depth, 0, br.maxDepth, 1.25, 0.6);

          ctx.beginPath();
          for (let i = 0; i < deformed.length; i++) {
            const dp = deformed[i];
            const perp = dp.angle + HALF_PI;
            // Peristaltik nabızla genişleyip daralan lif zarfı
            const pulseEnv = 1 + g.peristalticWave * 0.25 * Math.sin(time * 3.2 - dp.tNorm * 4 + br.phaseSeed);
            const twist = Math.sin(dp.tNorm * PI * (3 + g.spiralBias * 2) + st.phase + time * 0.9);
            const env = Math.sin(dp.tNorm * PI) * baseSpread * pulseEnv * (1 - br.depth * 0.14);
            const off = st.spreadRatio * env * twist;
            const sx = dp.x + Math.cos(perp) * off;
            const sy = dp.y + Math.sin(perp) * off;
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          }
          ctx.stroke();
        }

        // C) Melezlenmiş Botanik Organlar (Okutulma Sırasındaki Geçişlere Göre Şekillenir)
        if (!this.isGhost && growth > 0.2) {
          const organAlpha = map(growth, 0.2, 1, 0, 1) * masterAlpha;
          this.drawHybridOrgans(ctx, br, deformed, time, organAlpha);
        }
      }

      drawHybridOrgans(ctx, br, deformed, time, alpha) {
        const g = this.genome;
        const id = br.plant.id;
        const prevId = br.prevPlant.id;
        const colPri = br.plant.colorPrimary;
        const colSec = br.plant.colorSecondary;
        const colGlow = br.plant.colorGlow;

        if (id === 'mimosa') {
          // KÜSTÜM OTU:
          // Eğer öncesinde Maymun Kuyruğu varsa yaprakçıklar kıvrımlı/tüysü olur;
          // Eğer öncesinde Palmiye varsa yaprakçıklar çok uzun yelpaze tüyü gibi açılır!
          const foldWave = Math.sin(time * (2.4 + g.peristalticWave * 0.8) - br.depth * 1.2 + br.phaseSeed);
          const foldRatio = constrain(map(foldWave, 0.05, 0.92, 0, 1), 0, 1);
          const lenMult = prevId === 'palm' ? 1.55 : prevId === 'monkey_tail' ? 1.25 : 1.0;

          for (let i = 2; i < deformed.length - 1; i += 2) {
            const dp = deformed[i];
            const leafletLen = map(i, 0, deformed.length, 19, 8) * lenMult * (1 - br.depth * 0.1);
            const openAngle = lerp(PI * 0.44, PI * 0.06, foldRatio);

            for (const side of [-1, 1]) {
              const la = dp.angle + side * openAngle;
              const lx = dp.x + Math.cos(la) * leafletLen;
              const ly = dp.y + Math.sin(la) * leafletLen;

              ctx.strokeStyle = rgba(colPri[0], colPri[1], colPri[2], 195 * alpha);
              ctx.lineWidth = 1.05;
              ctx.beginPath();
              ctx.moveTo(dp.x, dp.y);
              if (prevId === 'monkey_tail') {
                // Sarmal kavisli mimoza tüyü
                const cx = (dp.x + lx) * 0.5 + Math.cos(la + side * 0.5) * 6;
                const cy = (dp.y + ly) * 0.5 + Math.sin(la + side * 0.5) * 6;
                ctx.quadraticCurveTo(cx, cy, lx, ly);
              } else {
                ctx.lineTo(lx, ly);
              }
              ctx.stroke();

              ctx.fillStyle = rgba(colGlow[0], colGlow[1], colGlow[2], (140 + 95 * foldRatio) * alpha);
              ctx.beginPath();
              ctx.arc(lx, ly, 1.4, 0, TWO_PI);
              ctx.fill();
            }
          }
        } else if (id === 'palm') {
          // PALMİYE:
          // Eğer öncesinde Maymun Kuyruğu varsa sadece dış sırtta tek yönlü kanat (asimetrik yüzgeç) açar!
          // Eğer öncesinde Küstüm Otu varsa palmiye şeritleri nefes alır gibi kapanıp açılır!
          const oneSided = prevId === 'monkey_tail' || g.fanAsymmetry > 0.85;
          const breathing = prevId === 'mimosa' ? (0.55 + 0.45 * Math.sin(time * 2.5 + br.phaseSeed)) : 1.0;

          ctx.strokeStyle = rgba(colPri[0], colPri[1], colPri[2], 145 * alpha);
          ctx.lineWidth = 0.95;

          for (let i = 2; i < deformed.length; i += 3) {
            const dp = deformed[i];
            const baseLen = map(i, 0, deformed.length, 34, 15) * (1 + g.fanAsymmetry * 0.15);

            const startF = oneSided ? 1 : -3;
            const endF = 3;
            for (let f = startF; f <= endF; f++) {
              if (f === 0) continue;
              const side = oneSided ? br.chirality * f : f;
              const spreadA = dp.angle + side * 0.23 * breathing + Math.sin(time * 1.3 + i) * 0.06;
              const fx = dp.x + Math.cos(spreadA) * baseLen;
              const fy = dp.y + Math.sin(spreadA) * baseLen;
              const cpx = dp.x + Math.cos(spreadA - side * 0.12) * (baseLen * 0.58);
              const cpy = dp.y + Math.sin(spreadA - side * 0.12) * (baseLen * 0.58);

              ctx.beginPath();
              ctx.moveTo(dp.x, dp.y);
              ctx.quadraticCurveTo(cpx, cpy, fx, fy);
              ctx.stroke();
            }
          }
        } else if (id === 'monkey_tail') {
          // MAYMUN KUYRUĞU:
          // Eğer öncesinde Palmiye varsa tüyler çok uzun sarkık dokunaçlara (weeping tendrils) dönüşür!
          ctx.strokeStyle = rgba(colPri[0], colPri[1], colPri[2], 155 * alpha);
          ctx.lineWidth = 0.85;
          const lenBoost = 1 + g.weepingTendrils * 0.65;

          for (let i = 1; i < deformed.length; i++) {
            const dp = deformed[i];
            for (let h = 0; h < 4; h++) {
              const side = h % 2 === 0 ? 1 : -1;
              const hairPhase = i * 0.7 + h * 1.9 + br.phaseSeed;
              const hairLen = (15 + Math.sin(hairPhase) * 8) * lenBoost * (1 - dp.tNorm * 0.25);
              const hairAngle = dp.angle + side * (HALF_PI * 0.62) + Math.sin(time * 2.0 + hairPhase) * 0.32;

              const hx = dp.x + Math.cos(hairAngle) * hairLen;
              const hy = dp.y + Math.sin(hairAngle) * hairLen;
              const cx = dp.x + Math.cos(hairAngle + side * 0.38) * (hairLen * 0.55);
              const cy = dp.y + Math.sin(hairAngle + side * 0.38) * (hairLen * 0.55);

              ctx.beginPath();
              ctx.moveTo(dp.x, dp.y);
              ctx.quadraticCurveTo(cx, cy, hx, hy);
              ctx.stroke();
            }
          }
        } else if (id === 'moss') {
          // YOSUN:
          // Boğumlardan yayılan mikro-fraktal koza ağları ve spor bulutları
          for (let i = 2; i < deformed.length; i += 2) {
            const dp = deformed[i];
            const clusterRadius = (10 + 5 * Math.sin(i * 1.3 + br.phaseSeed)) * (1 + g.anastomosisRate * 0.2);

            for (let m = 0; m < 5; m++) {
              const a = (TWO_PI / 5) * m + i + time * 0.45;
              const r = clusterRadius * (0.6 + 0.4 * Math.sin(time * 2.1 + m));
              const mx = dp.x + Math.cos(a) * r;
              const my = dp.y + Math.sin(a) * r;

              ctx.strokeStyle = rgba(colSec[0], colSec[1], colSec[2], 130 * alpha);
              ctx.lineWidth = 0.8;
              ctx.beginPath();
              ctx.moveTo(dp.x, dp.y);
              ctx.lineTo(mx, my);
              ctx.stroke();

              ctx.fillStyle = rgba(colGlow[0], colGlow[1], colGlow[2], 175 * alpha);
              ctx.beginPath();
              ctx.arc(mx, my, 1.25, 0, TWO_PI);
              ctx.fill();
            }
          }
        }
      }

      drawSeedCores(ctx, time, masterAlpha) {
        const coreFade = constrain(this.growthTime / 0.35, 0, 1) * masterAlpha;
        if (coreFade <= 0.005) return;
        const pulse = 1 + 0.12 * Math.sin(time * 3);

        for (let cIdx = 0; cIdx < this.seedCenters.length; cIdx++) {
          const sc = this.seedCenters[cIdx];
          ctx.lineWidth = 1.4;

          for (let i = 0; i < this.historyIds.length; i++) {
            const pl = PLANT_TYPES[this.historyIds[i]] || PLANT_TYPES.moss;
            const col = pl.colorPrimary;
            const r = (sc.r * 0.8 + i * 4.5) * pulse;
            ctx.strokeStyle = rgba(col[0], col[1], col[2], 175 * coreFade);
            const startA = time * (i % 2 === 0 ? 1 : -1) + i + cIdx;
            ctx.beginPath();
            ctx.arc(sc.x, sc.y, r, startA, startA + PI * 1.5);
            ctx.stroke();
          }

          ctx.fillStyle = rgba(255, 245, 220, 220 * coreFade);
          ctx.beginPath();
          ctx.arc(sc.x, sc.y, sc.r * 0.38 * pulse, 0, TWO_PI);
          ctx.fill();
        }
      }
    }

    // ── RFID Etkileşim Fonksiyonları ────────────────────────────────────────
    const selectSeed = (idx) => {
      if (idx < 0 || idx >= rfidState.seeds.length) return;
      rfidState.activeSeedIndex = idx;
      updateSimulatorUI();
    };

    const tapPlantStation = (plantId) => {
      const plant = PLANT_TYPES[plantId];
      if (!plant) return;
      idleTimer = 0;
      const seed = rfidState.activeSeed;
      if (rfidState.inFountain) {
        rfidState.inFountain = false;
        if (organism) organism.dissolve();
        ripples.push(new WaterRipple(0, 0, BASE_RADIUS * 0.5, [180, 200, 210]));
      }
      if (seed.history.length >= 7) seed.history.shift();
      seed.history.push(plantId);

      const angle = Math.random() * TWO_PI;
      ripples.push(new WaterRipple(Math.cos(angle) * BASE_RADIUS * 0.7, Math.sin(angle) * BASE_RADIUS * 0.7, BASE_RADIUS * 0.4, plant.colorPrimary));
      updateSimulatorUI();
    };

    const placeInFountain = () => {
      idleTimer = 0;
      const seed = rfidState.activeSeed;
      rfidState.inFountain = true;
      ripples.push(new WaterRipple(0, 0, BASE_RADIUS * 0.95, [240, 220, 180]));
      ripples.push(new WaterRipple(0, 0, BASE_RADIUS * 0.6, [200, 230, 210], 15));

      if (seed.history.length > 0) {
        ghostOrganism = null;
        organism = new EmergentOrganism(seed.history, BASE_RADIUS * 0.92);
      } else if (organism) {
        organism.dissolve();
      }
      updateSimulatorUI();
    };

    const clearActiveSeed = () => {
      rfidState.activeSeed.history = [];
      rfidState.inFountain = false;
      if (organism) organism.dissolve();
      ripples.push(new WaterRipple(0, 0, BASE_RADIUS * 0.5, [180, 200, 210]));
      updateSimulatorUI();
    };

    const randomizeAndPlay = () => {
      const keys = Object.keys(PLANT_TYPES);
      const count = Math.floor(Math.random() * 3) + 2; // 2-4 bitki kombinasyonu
      rfidState.activeSeed.history = [];
      for (let i = 0; i < count; i++) {
        rfidState.activeSeed.history.push(keys[Math.floor(Math.random() * keys.length)]);
      }
      placeInFountain();
    };

    const reverseOrderAndPlay = () => {
      // Sıranın önemini tek tıkla görmek için mevcut geçmişi ters çevirip oynatır!
      const seed = rfidState.activeSeed;
      if (seed.history.length > 1) {
        seed.history.reverse();
        placeInFountain();
      }
    };

    const toggleProjectionMode = () => {
      cfg.uiVisible = !cfg.uiVisible;
      const panel = document.getElementById('gb-simulator-panel');
      if (panel) panel.classList.toggle('gb-hidden', !cfg.uiVisible);
    };

    // ── Sol Kontrol Paneli (DOM) ────────────────────────────────────────────
    const mountSimulatorUI = () => {
      const existing = document.getElementById('gb-simulator-panel');
      if (existing) existing.remove();

      const style = document.createElement('style');
      style.textContent = `
        #gb-simulator-panel {
          position: fixed; top: 16px; left: 16px; bottom: 16px; width: 340px; z-index: 9990;
          background: rgba(14, 15, 13, 0.88); backdrop-filter: blur(14px);
          border: 1px solid rgba(212, 194, 154, 0.18); border-radius: 14px; padding: 16px;
          display: flex; flex-direction: column; gap: 11px; overflow-y: auto;
          color: #e6dfd3; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
          box-shadow: 0 20px 50px rgba(0,0,0,0.85); user-select: none;
        }
        #gb-simulator-panel.gb-hidden { transform: translateX(-370px); opacity: 0; pointer-events: none; }
        #gb-simulator-panel .gb-tag { font-size: 10px; letter-spacing: 2px; color: #c8b082; font-weight: 600; }
        #gb-simulator-panel h2 { font-size: 17px; font-weight: 600; color: #f4ece0; margin: 2px 0; }
        #gb-simulator-panel .gb-sub { font-size: 11px; color: #9c9484; }
        #gb-simulator-panel .gb-sec-title { display:flex; justify-content:space-between; align-items:center; font-size:10.5px; font-weight:600; color:#b8af9e; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:5px; }
        #gb-simulator-panel .gb-seed-row { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; }
        #gb-simulator-panel .gb-seed-btn { background:rgba(255,255,255,0.03); border:1px solid rgba(212,194,154,0.16); color:#bfb6a6; padding:6px; border-radius:8px; font-size:11px; cursor:pointer; }
        #gb-simulator-panel .gb-seed-btn.active { background:rgba(212,194,154,0.18); border-color:#d4c29a; color:#fff8eb; font-weight:600; }
        #gb-simulator-panel .gb-station-grid { display:flex; flex-direction:column; gap:5px; }
        #gb-simulator-panel .gb-station-btn { display:flex; align-items:center; gap:9px; width:100%; text-align:left; background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.08); border-left:3px solid var(--plant-color, #d4c29a); padding:7px 9px; border-radius:8px; color:#eae3d5; cursor:pointer; }
        #gb-simulator-panel .gb-station-btn:hover { background:rgba(255,255,255,0.07); }
        #gb-simulator-panel .gb-key { font-family:monospace; font-size:11px; color:var(--plant-color); background:rgba(0,0,0,0.35); padding:2px 5px; border-radius:4px; }
        #gb-simulator-panel .gb-timeline { min-height:48px; background:rgba(0,0,0,0.42); border:1px dashed rgba(212,194,154,0.22); border-radius:8px; padding:8px; display:flex; flex-wrap:wrap; align-items:center; gap:5px; font-size:11px; }
        #gb-simulator-panel .gb-step { display:flex; flex-direction:column; background:rgba(255,255,255,0.04); border:1px solid; border-radius:6px; padding:3px 7px; }
        #gb-simulator-panel .gb-emergent-badge { background:rgba(212,194,154,0.09); border:1px solid rgba(212,194,154,0.25); border-radius:7px; padding:6px 9px; font-size:11px; color:#ebd9b4; }
        #gb-simulator-panel .gb-primary-btn { width:100%; background:linear-gradient(135deg,#d8be8b 0%,#b59862 100%); color:#14120e; border:none; border-radius:8px; padding:10px 12px; font-size:12.5px; font-weight:700; cursor:pointer; display:flex; justify-content:space-between; align-items:center; }
        #gb-simulator-panel .gb-sec-actions { display:grid; grid-template-columns:1fr 1fr 1fr; gap:5px; margin-top:6px; }
        #gb-simulator-panel .gb-sec-btn { background:rgba(255,255,255,0.04); border:1px solid rgba(212,194,154,0.16); color:#ccc3b2; padding:7px 7px; border-radius:7px; font-size:10.5px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; }
        #gb-simulator-panel kbd { font-family:monospace; font-size:9.5px; background:rgba(255,255,255,0.08); padding:1px 4px; border-radius:3px; color:#d4c29a; }
      `;
      document.head.appendChild(style);
      this._uiElements.push(style);

      const panel = document.createElement('aside');
      panel.id = 'gb-simulator-panel';
      panel.innerHTML = `
        <div>
          <div class="gb-tag">BIÇAKÇILAR SERGİSİ</div>
          <h2>Hayat Ağacı &amp; Görünmez Bağlar</h2>
          <div class="gb-sub">Emergent Morfogenez &amp; Sıra-Duyarlı Rizom Simülatörü</div>
        </div>
        <div>
          <div class="gb-sec-title"><span>1. RFID Tohumu</span><span id="gb-status" style="color:#a2d4a8;font-size:10px">● Çeşmede</span></div>
          <div id="gb-seeds" class="gb-seed-row"></div>
        </div>
        <div>
          <div class="gb-sec-title"><span>2. Bitkisel Figürlere Okut</span><small style="color:#7d776b">1 - 4</small></div>
          <div id="gb-stations" class="gb-station-grid"></div>
        </div>
        <div>
          <div class="gb-sec-title"><span>3. Epigenetik Sıra (1. = Beden Planı)</span></div>
          <div id="gb-timeline" class="gb-timeline"></div>
          <div id="gb-emergent-info" class="gb-emergent-badge" style="margin-top:6px"></div>
        </div>
        <div style="margin-top:auto">
          <button id="gb-btn-fountain" class="gb-primary-btn"><span>◎ Taş Çeşmeye Bırak</span><kbd style="background:rgba(0,0,0,0.2);color:#14120e">SPACE</kbd></button>
          <div class="gb-sec-actions">
            <button id="gb-btn-reverse" class="gb-sec-btn" title="Sırayı ters çevirip farkı gör"><span>⇄ Sırayı Tersle</span><kbd>T</kbd></button>
            <button id="gb-btn-random" class="gb-sec-btn"><span>Rastgele</span><kbd>R</kbd></button>
            <button id="gb-btn-clear" class="gb-sec-btn"><span>Sıfırla</span><kbd>C</kbd></button>
          </div>
        </div>
        <div style="border-top:1px solid rgba(212,194,154,0.12);padding-top:8px;font-size:10px;color:#857e70;display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px">
          <span><kbd>H</kbd> Paneli Gizle</span>
          <span><kbd>B</kbd> Çember</span>
          <span><kbd>+</kbd><kbd>-</kbd> Çap</span>
          <span><kbd>←↑↓→</kbd> Hizala</span>
        </div>
      `;
      document.body.appendChild(panel);
      this._uiElements.push(panel);

      const seedContainer = panel.querySelector('#gb-seeds');
      rfidState.seeds.forEach((seed, idx) => {
        const btn = document.createElement('button');
        btn.className = 'gb-seed-btn';
        btn.textContent = seed.label;
        btn.onclick = () => selectSeed(idx);
        seedContainer.appendChild(btn);
      });

      const stContainer = panel.querySelector('#gb-stations');
      PLANT_LIST.forEach(pl => {
        const btn = document.createElement('button');
        btn.className = 'gb-station-btn';
        btn.style.setProperty('--plant-color', `rgb(${pl.colorPrimary.join(',')})`);
        btn.innerHTML = `<span class="gb-key">[${pl.key}]</span><div><div style="font-size:12px;font-weight:600">${pl.name}</div><div style="font-size:9.5px;color:#968e7e">${pl.roleDesc}</div></div>`;
        btn.onclick = () => tapPlantStation(pl.id);
        stContainer.appendChild(btn);
      });

      panel.querySelector('#gb-btn-fountain').onclick = () => placeInFountain();
      panel.querySelector('#gb-btn-reverse').onclick = () => reverseOrderAndPlay();
      panel.querySelector('#gb-btn-random').onclick = () => randomizeAndPlay();
      panel.querySelector('#gb-btn-clear').onclick = () => clearActiveSeed();

      updateSimulatorUI();
    };

    const updateSimulatorUI = () => {
      const panel = document.getElementById('gb-simulator-panel');
      if (!panel) return;
      const seedBtns = panel.querySelectorAll('.gb-seed-btn');
      seedBtns.forEach((b, idx) => b.classList.toggle('active', idx === rfidState.activeSeedIndex));

      const tl = panel.querySelector('#gb-timeline');
      const info = panel.querySelector('#gb-emergent-info');
      const seed = rfidState.activeSeed;

      if (seed.history.length === 0) {
        tl.innerHTML = `<span style="color:#7d7668">Henüz hiçbir bitki heykeline okutulmadı.</span>`;
        if (info) info.textContent = 'Tohum boş — 1. okutacağınız bitki ana topolojiyi kuracak.';
      } else {
        tl.innerHTML = seed.history.map((id, i) => {
          const pl = PLANT_TYPES[id] || PLANT_TYPES.moss;
          const col = `rgb(${pl.colorPrimary.join(',')})`;
          const roleLabel = i === 0 ? '1. KURUCU TOPOLOJİ' : `${i + 1}. MUTASYON`;
          return `<div class="gb-step" style="border-color:${col}"><span style="font-size:8px;color:#8f887a">${roleLabel}</span><strong style="color:${col}">${pl.name}</strong></div>`;
        }).join('<span style="color:#6e675b">→</span>');

        if (info) {
          const previewGenome = synthesizeGenome(seed.history);
          info.innerHTML = `<strong style="color:#fff4d6">Emergent Tür:</strong> ${previewGenome.emergentTitle}`;
        }
      }

      const st = panel.querySelector('#gb-status');
      if (rfidState.inFountain && seed.history.length > 0) {
        st.textContent = '● Taş Çeşmede (Aktif)';
        st.style.color = '#a2d4a8';
      } else if (rfidState.inFountain) {
        st.textContent = '○ Taş Çeşmede (Boş)';
        st.style.color = '#999';
      } else {
        st.textContent = '◌ Elde Okutuluyor...';
        st.style.color = '#f2c48f';
      }
    };

    const getBasinRadius = () => Math.min(p.width, p.height) * cfg.radiusScale;

    const getBasinCenter = () => {
      const sidebarOffset = cfg.uiVisible && p.width > 900 ? 155 : 0;
      return {
        x: p.width / 2 + sidebarOffset + cfg.offsetX,
        y: p.height / 2 + cfg.offsetY
      };
    };

    const drawWaterAmbience = (ctx, radius, time) => {
      ctx.strokeStyle = rgba(35, 48, 46, 40);
      ctx.lineWidth = 1;
      for (let i = 1; i <= 4; i++) {
        const r = radius * (i / 4) * (0.97 + 0.02 * Math.sin(time * 0.8 + i));
        ctx.beginPath();
        for (let step = 0; step <= 42; step++) {
          const a = (step / 42) * TWO_PI;
          const wave = Math.sin(a * 3 + time * 0.9 + i) * 4 + Math.cos(a * 5 - time * 0.6) * 3;
          const rad = r + wave;
          const vx = Math.cos(a) * rad;
          const vy = Math.sin(a) * rad;
          if (step === 0) ctx.moveTo(vx, vy);
          else ctx.lineTo(vx, vy);
        }
        ctx.closePath();
        ctx.stroke();
      }
    };

    const drawIdleRitualGuide = (ctx, time, masterAlpha) => {
      // Yerdeki taş çeşmeye 360° her açıdan bakan ziyaretçiler için
      // DIAP (diyapozitif slayt) çerçeveli, 90° açılı, saat yönünün tersine dönen 4 adımlı ritüel rehberi
      const cycle = (time * 0.55) % 4;
      const stepGlow = (idx) => {
        const d = Math.abs(cycle - idx);
        const wrapD = Math.min(d, 4 - d);
        return 0.45 + 0.55 * Math.max(0, 1 - wrapD * 1.15);
      };

      const colBase = [228, 214, 184];
      const colAccent = [252, 238, 205];

      // Sabit duran izleyiciye sağdan 1 -> 2 -> 3 -> 4 şeklinde gelmesi için saat yönünde (+) döner;
      // kartlar bize yakın olan alt kenarda (saat 6) tam düz hizalıdır.
      const globalRot = time * 0.16 + Math.sin(time * 0.55) * 0.20;
      const orbitR = 195;
      const cardScale = 1.68;

      // DIAP (Slayt/Diyapozitif) Çerçevesi
      const drawDiapFrame = (w, h, gA) => {
        ctx.save();
        ctx.fillStyle = `rgba(12, 14, 12, ${(0.45 * gA).toFixed(3)})`;
        ctx.strokeStyle = rgba(colBase[0], colBase[1], colBase[2], 95 * gA);
        ctx.lineWidth = 1.0;

        // Yuvarlatılmış slayt dış çerçevesi
        const r = 8;
        const x0 = -w / 2;
        const y0 = -h / 2;
        ctx.beginPath();
        ctx.moveTo(x0 + r, y0);
        ctx.lineTo(x0 + w - r, y0);
        ctx.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
        ctx.lineTo(x0 + w, y0 + h - r);
        ctx.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
        ctx.lineTo(x0 + r, y0 + h);
        ctx.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r);
        ctx.lineTo(x0, y0 + r);
        ctx.quadraticCurveTo(x0, y0, x0 + r, y0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Köşe kadraj işaretleri (diyapozitif hissi)
        const m = 4;
        ctx.strokeStyle = rgba(colAccent[0], colAccent[1], colAccent[2], 125 * gA);
        ctx.beginPath();
        ctx.moveTo(x0 + m, y0 + m + 5); ctx.lineTo(x0 + m, y0 + m); ctx.lineTo(x0 + m + 5, y0 + m);
        ctx.moveTo(x0 + w - m - 5, y0 + m); ctx.lineTo(x0 + w - m, y0 + m); ctx.lineTo(x0 + w - m, y0 + m + 5);
        ctx.moveTo(x0 + m, y0 + h - m - 5); ctx.lineTo(x0 + m, y0 + h - m); ctx.lineTo(x0 + m + 5, y0 + h - m);
        ctx.moveTo(x0 + w - m - 5, y0 + h - m); ctx.lineTo(x0 + w - m, y0 + h - m); ctx.lineTo(x0 + w - m, y0 + h - m - 5);
        ctx.stroke();
        ctx.restore();
      };

      // Daha belirgin IKEA-stili önkol + el + kavrayan parmaklar
      const drawHandArm = (hx, hy, angle, gripOpen, gA) => {
        ctx.save();
        ctx.translate(hx, hy);
        ctx.rotate(angle);
        ctx.strokeStyle = rgba(colAccent[0], colAccent[1], colAccent[2], 215 * gA);
        ctx.lineWidth = 1.65;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        // Önkol
        ctx.moveTo(-30, -5);
        ctx.lineTo(-6, -5);
        // Başparmak (kavrama kavisli)
        ctx.quadraticCurveTo(1, -13 - gripOpen * 3, 8, -7 - gripOpen * 4);
        // İşaret parmağı
        ctx.moveTo(-6, -3);
        ctx.quadraticCurveTo(4, -5, 11, -1 - gripOpen * 2);
        // Avuç alt kenarı ve diğer parmaklar
        ctx.moveTo(-30, 5);
        ctx.lineTo(-4, 5);
        ctx.quadraticCurveTo(4, 6, 9, 4 + gripOpen * 3);
        ctx.stroke();
        ctx.restore();
      };

      const drawStepNumber = (nx, ny, num, gA) => {
        ctx.save();
        ctx.fillStyle = rgba(colAccent[0], colAccent[1], colAccent[2], 30 * gA);
        ctx.strokeStyle = rgba(colAccent[0], colAccent[1], colAccent[2], 180 * gA);
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.arc(nx, ny, 10, 0, TWO_PI);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = rgba(colAccent[0], colAccent[1], colAccent[2], 235 * gA);
        ctx.font = '700 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(num), nx, ny + 0.5);
        ctx.restore();
      };

      ctx.save();
      ctx.rotate(globalRot);

      // Adımlar arası dairesel oklar (saat 6'daki 1'den sağdaki 2'ye doğru: 1 -> 2 -> ... -> 3 -> 4 -> 1)
      for (let i = 0; i < 4; i++) {
        const aStart = HALF_PI - i * HALF_PI - 0.56;
        const aEnd = HALF_PI - (i + 1) * HALF_PI + 0.56;
        const aMid = (aStart + aEnd) * 0.5;

        ctx.save();
        ctx.strokeStyle = rgba(colBase[0], colBase[1], colBase[2], 105 * masterAlpha);
        ctx.lineWidth = 1.6;

        if (i === 1) {
          // 2 ile 3 arasında belirgin "..." (üç nokta: birden fazla istasyon gezilebilir)
          ctx.setLineDash([5, 6]);
          ctx.beginPath();
          ctx.arc(0, 0, orbitR, aStart, aMid + 0.14, true);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 0, orbitR, aMid - 0.14, aEnd, true);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = rgba(colAccent[0], colAccent[1], colAccent[2], 215 * masterAlpha);
          for (const dA of [-0.075, 0, 0.075]) {
            const dx = Math.cos(aMid + dA) * orbitR;
            const dy = Math.sin(aMid + dA) * orbitR;
            ctx.beginPath();
            ctx.arc(dx, dy, 3.6, 0, TWO_PI);
            ctx.fill();
          }
        } else {
          ctx.setLineDash([6, 7]);
          ctx.beginPath();
          ctx.arc(0, 0, orbitR, aStart, aEnd, true);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Yay ucunda ok başı (anticlockwise teğet yönü: aEnd - HALF_PI)
        const ax = Math.cos(aEnd) * orbitR;
        const ay = Math.sin(aEnd) * orbitR;
        const tang = aEnd - HALF_PI;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - Math.cos(tang - 0.45) * 10, ay - Math.sin(tang - 0.45) * 10);
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - Math.cos(tang + 0.45) * 10, ay - Math.sin(tang + 0.45) * 10);
        ctx.stroke();
        ctx.restore();
      }

      // ── 4 ADIM (Bize yakın alt kenarda tam düz, 1 -> 2 -> 3 -> 4 sağdan gelen sıra) ──
      for (let stepIdx = 0; stepIdx < 4; stepIdx++) {
        const angle = -stepIdx * HALF_PI;
        const gA = masterAlpha * stepGlow(stepIdx);

        ctx.save();
        ctx.rotate(angle);
        ctx.translate(0, orbitR);
        ctx.scale(cardScale, cardScale);

        drawDiapFrame(100, 90, gA);
        drawStepNumber(-34, -30, stepIdx + 1, gA);

        if (stepIdx === 0) {
          // 1: El çeşmeden tohumu belirgin şekilde kavrayıp yukarı alıyor
          const lift = (Math.sin(time * 2.2) * 0.5 + 0.5) * 10; // 0..10px yukarı çekme hareketi
          // Çeşme kasesi ve su yüzeyi
          ctx.strokeStyle = rgba(colBase[0], colBase[1], colBase[2], 165 * gA);
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(4, 20, 22, 0.15, PI - 0.15);
          ctx.stroke();
          ctx.strokeStyle = rgba(colBase[0], colBase[1], colBase[2], 70 * gA);
          ctx.beginPath();
          ctx.moveTo(-14, 22);
          ctx.lineTo(22, 22);
          ctx.stroke();

          // Parmakların kavradığı tohum + yukarı uzanan el-kol
          drawHandArm(-12, 2 - lift, -0.35, 0.15, gA);
          ctx.strokeStyle = rgba(colAccent[0], colAccent[1], colAccent[2], 225 * gA);
          ctx.fillStyle = rgba(colAccent[0], colAccent[1], colAccent[2], 95 * gA);
          ctx.beginPath();
          ctx.arc(-2, -1 - lift, 6, 0, TWO_PI);
          ctx.fill();
          ctx.stroke();

          // Belirgin yukarı çekme oku
          ctx.strokeStyle = rgba(colAccent[0], colAccent[1], colAccent[2], 175 * gA);
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(22, 16);
          ctx.lineTo(22, -14);
          ctx.lineTo(17, -8);
          ctx.moveTo(22, -14);
          ctx.lineTo(27, -8);
          ctx.stroke();
        } else if (stepIdx === 1) {
          // 2: Bir istasyona (RFID okuyucuya) tohumu okutuyor
          const tap = (Math.sin(time * 2.6) * 0.5 + 0.5) * 8;
          // Bitki heykeli
          ctx.strokeStyle = rgba(162, 212, 168, 190 * gA);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(22, 28);
          ctx.quadraticCurveTo(18, 4, 24, -22);
          ctx.moveTo(21, 8);
          ctx.quadraticCurveTo(32, 0, 36, -12);
          ctx.moveTo(21, -2);
          ctx.quadraticCurveTo(10, -12, 12, -24);
          ctx.stroke();

          // Heykelin üzerindeki RFID Okuyucu İstasyon Halkası
          ctx.strokeStyle = rgba(colAccent[0], colAccent[1], colAccent[2], 165 * gA);
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(14, 6, 6.5, 0, TWO_PI);
          ctx.stroke();

          // Okuyucuya yaklaşan el + tohum + RFID dalgaları
          drawHandArm(-20 + tap, 6, 0, 0.1, gA);
          ctx.strokeStyle = rgba(colAccent[0], colAccent[1], colAccent[2], 220 * gA);
          ctx.fillStyle = rgba(colAccent[0], colAccent[1], colAccent[2], 80 * gA);
          ctx.beginPath();
          ctx.arc(-8 + tap, 6, 5.5, 0, TWO_PI);
          ctx.fill();
          ctx.stroke();

          for (let r = 1; r <= 2; r++) {
            ctx.strokeStyle = rgba(colAccent[0], colAccent[1], colAccent[2], 135 * gA);
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.arc(-2 + tap, 6, 5 + r * 4, -0.75, 0.75);
            ctx.stroke();
          }
        } else if (stepIdx === 2) {
          // 3: Başka bir bitki heykeliyle etkileşiyor (Palmiye / Sukulent)
          const tap = (Math.sin(time * 2.4 + 1.0) * 0.5 + 0.5) * 8;
          // Farklı bitki silüeti (Palmiye yelpazesi)
          ctx.strokeStyle = rgba(242, 196, 143, 190 * gA);
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(22, 28);
          ctx.lineTo(22, 2);
          ctx.moveTo(22, 2); ctx.quadraticCurveTo(10, -10, 6, -22);
          ctx.moveTo(22, 2); ctx.quadraticCurveTo(22, -12, 22, -25);
          ctx.moveTo(22, 2); ctx.quadraticCurveTo(33, -10, 36, -20);
          ctx.stroke();

          // Okuyucu istasyonu
          ctx.strokeStyle = rgba(colAccent[0], colAccent[1], colAccent[2], 165 * gA);
          ctx.beginPath();
          ctx.arc(14, 10, 6, 0, TWO_PI);
          ctx.stroke();

          // El + tohum
          drawHandArm(-20 + tap, 10, 0, 0.1, gA);
          ctx.fillStyle = rgba(colAccent[0], colAccent[1], colAccent[2], 80 * gA);
          ctx.strokeStyle = rgba(colAccent[0], colAccent[1], colAccent[2], 220 * gA);
          ctx.beginPath();
          ctx.arc(-8 + tap, 10, 5.5, 0, TWO_PI);
          ctx.fill();
          ctx.stroke();

          // "+" kombinasyon işareti
          ctx.strokeStyle = rgba(colAccent[0], colAccent[1], colAccent[2], 180 * gA);
          ctx.beginPath();
          ctx.moveTo(2, -20); ctx.lineTo(2, -10);
          ctx.moveTo(-3, -15); ctx.lineTo(7, -15);
          ctx.stroke();
        } else if (stepIdx === 3) {
          // 4: Çeşmenin okuyucusuna bırakıp elini geri çekiyor, ağaç filizleniyor
          const releasePhase = (time * 0.9) % 1;
          const handPull = releasePhase * 8;

          // Çeşme kasesi
          ctx.strokeStyle = rgba(colBase[0], colBase[1], colBase[2], 165 * gA);
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(4, 18, 22, 0.15, PI - 0.15);
          ctx.stroke();

          // Çeşmenin ortasındaki okuyucu yuvası (çift halka)
          ctx.strokeStyle = rgba(colAccent[0], colAccent[1], colAccent[2], 160 * gA);
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.arc(4, 20, 7.5, 0, TWO_PI);
          ctx.stroke();

          // Bırakıp geri çekilen açık el
          drawHandArm(-16 - handPull, -12 - handPull * 0.5, 0.45, 0.85, gA * (1 - releasePhase * 0.35));

          // Okuyucu yuvasına oturmuş tohum ve filizlenen Hayat Ağacı
          const bloom = 0.78 + 0.22 * Math.sin(time * 2.2);
          ctx.strokeStyle = rgba(235, 214, 158, 205 * gA);
          ctx.lineWidth = 1.35;
          ctx.beginPath();
          ctx.moveTo(4, 20);
          ctx.lineTo(4, -10 * bloom);
          ctx.moveTo(4, 6);
          ctx.quadraticCurveTo(-8 * bloom, -4, -12 * bloom, -14 * bloom);
          ctx.moveTo(4, 6);
          ctx.quadraticCurveTo(16 * bloom, -4, 20 * bloom, -14 * bloom);
          ctx.stroke();

          ctx.fillStyle = rgba(colAccent[0], colAccent[1], colAccent[2], 220 * gA);
          ctx.beginPath();
          ctx.arc(4, 20, 4.5, 0, TWO_PI);
          ctx.fill();
        }

        ctx.restore();
      }

      ctx.restore();
    };

    // ── p5 Lifecycle ────────────────────────────────────────────────────────
    p.setup = () => {
      p.frameRate(60);
      p.pixelDensity(1);
      p.createCanvas(p.windowWidth, p.windowHeight);
      Object.assign(p.canvas.style, {
        position: 'fixed', top: '0', left: '0', zIndex: '0'
      });
      p.canvas.classList.add('p5-background');

      for (let i = 0; i < 65; i++) {
        floatingFibers.push(new FloatingFiber());
      }

      mountSimulatorUI();
      lastTimeSec = p.millis() * 0.001;

      this._keyHandler = (e) => {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
        const k = e.key;
        if (k === '1') tapPlantStation('mimosa');
        else if (k === '2') tapPlantStation('palm');
        else if (k === '3') tapPlantStation('monkey_tail');
        else if (k === '4') tapPlantStation('moss');
        else if (k === 'Enter' || k === ' ') {
          e.preventDefault();
          placeInFountain();
        } else if (k === 't' || k === 'T') {
          reverseOrderAndPlay();
        } else if (k === 'c' || k === 'C' || k === 'Backspace') {
          clearActiveSeed();
        } else if (k === 'r' || k === 'R') {
          randomizeAndPlay();
        } else if (k === 'h' || k === 'H') {
          toggleProjectionMode();
        } else if (k === 'b' || k === 'B') {
          cfg.showBasinRing = !cfg.showBasinRing;
        } else if (k === '+' || k === '=') {
          cfg.radiusScale = constrain(cfg.radiusScale + 0.02, 0.1, 1.5);
        } else if (k === '-' || k === '_') {
          cfg.radiusScale = constrain(cfg.radiusScale - 0.02, 0.1, 1.5);
        } else {
          const step = e.shiftKey ? 15 : 4;
          if (k === 'ArrowLeft') cfg.offsetX -= step;
          if (k === 'ArrowRight') cfg.offsetX += step;
          if (k === 'ArrowUp') cfg.offsetY -= step;
          if (k === 'ArrowDown') cfg.offsetY += step;
        }
      };
      window.addEventListener('keydown', this._keyHandler);
    };

    p.windowResized = () => {
      p.resizeCanvas(p.windowWidth, p.windowHeight);
    };

    p.draw = () => {
      p.background(0);
      const ctx = p.drawingContext;
      const nowSec = p.millis() * 0.001;
      const dt = constrain(nowSec - lastTimeSec, 0.001, 0.1);
      lastTimeSec = nowSec;

      ctx.save();

      const center = getBasinCenter();
      const radius = getBasinRadius();
      const sceneScale = radius / BASE_RADIUS;

      ctx.translate(center.x, center.y);

      // Dairesel Taş Çeşme Clip Maskesi
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, TWO_PI);
      ctx.clip();

      ctx.scale(sceneScale, sceneScale);

      drawWaterAmbience(ctx, BASE_RADIUS, nowSec);

      for (const f of floatingFibers) {
        f.update(BASE_RADIUS, nowSec);
        f.display(ctx);
      }

      // Önceki ziyaretçiden kalan silik rizom hafızası (suyun dibinde)
      if (ghostOrganism) {
        ghostOrganism.display(ctx, nowSec * 0.6);
      }

      for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i].update();
        ripples[i].display(ctx);
        if (ripples[i].isDead()) ripples.splice(i, 1);
      }

      if (organism) {
        idleTimer = 0;
        guideAlpha = Math.max(0, guideAlpha - dt * 1.8);
        organism.update(dt);
        organism.display(ctx, nowSec);
        if (organism.isCompletelyDissolved()) {
          organism = null;
          rfidState.inFountain = false;
          updateSimulatorUI();
        }
      } else {
        idleTimer += dt;
        // İlk 2.5 saniye tamamen boş başlar, ardından IKEA-stili yazısız ritüel rehberi yavaşça belirir
        if (idleTimer > 2.5) {
          guideAlpha = Math.min(1, guideAlpha + dt * 0.45);
        } else {
          guideAlpha = Math.max(0, guideAlpha - dt * 1.5);
        }
      }

      if (guideAlpha > 0.005) {
        drawIdleRitualGuide(ctx, nowSec, guideAlpha);
      }

      ctx.restore();

      // Taş Çeşme Sınır Çemberi
      if (cfg.showBasinRing) {
        ctx.strokeStyle = rgba(90, 85, 72, 95);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, TWO_PI);
        ctx.stroke();

        ctx.strokeStyle = rgba(180, 170, 145, 30);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.985, 0, TWO_PI);
        ctx.stroke();
      }

      ctx.restore();
    };
  }
}
