// GorunmezBaglar — Hayat Ağacı ve Görünmez Bağlar (Bıçakçılar Sergisi)
// Single-class p5 instance-mode sketch for algorizma-site/play
// Usage: new GorunmezBaglar()

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

    // Sketch değiştirildiğinde (_p5.remove çağrıldığında) UI ve eventleri temizle
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

    // Saf JS matematik yardımcıları (p5 v1 ve v2 farklarından %100 bağımsız)
    const PI = Math.PI;
    const TWO_PI = Math.PI * 2;
    const HALF_PI = Math.PI / 2;
    const lerp = (a, b, t) => a + (b - a) * t;
    const constrain = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const map = (v, inMin, inMax, outMin, outMax) =>
      outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin);
    const rand = (min = 0, max = 1) =>
      min + Math.random() * (max - min);

    const rgba = (r, g, b, a255) =>
      `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${constrain(a255 / 255, 0, 1).toFixed(3)})`;

    const evalBezier = (a, b, c, d, t) => {
      const mt = 1 - t;
      return mt * mt * mt * a + 3 * mt * mt * t * b + 3 * mt * t * t * c + t * t * t * d;
    };

    const PLANT_TYPES = {
      mimosa: {
        id: 'mimosa',
        name: 'Küstüm Otu',
        subtitle: 'Mimosa Pudica — Duyarlı & Çift Yaprakçıklı',
        key: '1',
        colorPrimary: [242, 196, 143],
        colorSecondary: [217, 130, 148],
        colorGlow: [255, 210, 165],
        params: {
          branchCount: 2,
          branchAngle: 0.48,
          lengthScale: 0.78,
          curvature: 0.15,
          fiberStrands: 6,
          fiberSpread: 4.5,
          foliageType: 'pinnate',
          reactivity: 1.0,
          webDensity: 0.25
        }
      },
      palm: {
        id: 'palm',
        name: 'Palmiye Yaprakları',
        subtitle: 'Arecaceae — Yelpaze & Işınsal Lifler',
        key: '2',
        colorPrimary: [232, 213, 165],
        colorSecondary: [176, 196, 138],
        colorGlow: [255, 240, 195],
        params: {
          branchCount: 4,
          branchAngle: 0.72,
          lengthScale: 0.84,
          curvature: 0.42,
          fiberStrands: 10,
          fiberSpread: 7.0,
          foliageType: 'fronds',
          reactivity: 0.35,
          webDensity: 0.3
        }
      },
      monkey_tail: {
        id: 'monkey_tail',
        name: 'Maymun Kuyruğu',
        subtitle: 'Hildewintera — Sarmal & Tüysü Sukulent',
        key: '3',
        colorPrimary: [240, 230, 214],
        colorSecondary: [204, 154, 108],
        colorGlow: [255, 248, 235],
        params: {
          branchCount: 2,
          branchAngle: 0.32,
          lengthScale: 0.88,
          curvature: 0.95,
          fiberStrands: 12,
          fiberSpread: 9.5,
          foliageType: 'spiny_fur',
          reactivity: 0.6,
          webDensity: 0.45
        }
      },
      moss: {
        id: 'moss',
        name: 'Yosun',
        subtitle: 'Bryophyta — Mikro-Fraktal Ağ & Kök Bağları',
        key: '4',
        colorPrimary: [162, 212, 168],
        colorSecondary: [118, 176, 152],
        colorGlow: [195, 245, 200],
        params: {
          branchCount: 3,
          branchAngle: 0.88,
          lengthScale: 0.68,
          curvature: 0.65,
          fiberStrands: 8,
          fiberSpread: 11.0,
          foliageType: 'moss_web',
          reactivity: 0.5,
          webDensity: 0.95
        }
      }
    };

    const PLANT_LIST = Object.values(PLANT_TYPES);

    let organism = null;
    let ripples = [];
    let floatingFibers = [];
    let lastTimeSec = 0;

    // RFID Simülatör Durumu
    const rfidState = {
      seeds: [
        { id: 'TAG-01', label: 'Tohum #1', history: ['moss', 'palm', 'mimosa'] },
        { id: 'TAG-02', label: 'Tohum #2', history: ['monkey_tail', 'mimosa', 'palm', 'moss'] },
        { id: 'TAG-03', label: 'Tohum #3', history: [] }
      ],
      activeSeedIndex: 0,
      inFountain: true,
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
        this.angle = rand(0, TWO_PI);
        this.distRatio = Math.sqrt(rand(0.05, 0.95));
        this.speed = rand(0.0008, 0.0025) * (Math.random() < 0.5 ? 1 : -1);
        this.len = rand(4, 12);
        this.alpha = rand(35, 95);
        this.phase = rand(0, TWO_PI);
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

    // ── Parametrik Bitki Organizması ────────────────────────────────────────
    class PlantOrganism {
      constructor(historyIds, maxRadius) {
        this.historyIds = [...historyIds];
        this.maxRadius = maxRadius;
        this.stages = this.buildEvolutionStages(this.historyIds);
        this.nodes = [];
        this.segments = [];
        this.invisibleBonds = [];
        this.growthProgress = 0;
        this.growthSpeed = 0.45;
        this.dissolving = false;
        this.dissolveAlpha = 1.0;
        this.generateStructure();
      }

      buildEvolutionStages(historyIds) {
        const targetStages = Math.max(4, Math.min(historyIds.length, 6));
        const result = [];
        for (let i = 0; i < targetStages; i++) {
          const histIdx = Math.min(
            historyIds.length - 1,
            Math.floor((i / targetStages) * historyIds.length)
          );
          const plantId = historyIds[histIdx];
          result.push({
            stageIndex: i,
            historyStep: histIdx,
            plant: PLANT_TYPES[plantId] || PLANT_TYPES.moss
          });
        }
        return result;
      }

      generateStructure() {
        const rootNode = {
          x: 0,
          y: 0,
          stageIndex: 0,
          angle: 0,
          plant: this.stages[0].plant
        };
        this.nodes.push(rootNode);

        const firstStage = this.stages[0].plant;
        const initialTrunkCount = firstStage.id === 'palm' ? 6 : firstStage.id === 'moss' ? 7 : 5;

        let currentWaveNodes = [];
        const baseSegmentLen = this.maxRadius / (this.stages.length + 0.65);

        for (let i = 0; i < initialTrunkCount; i++) {
          const baseAngle = (TWO_PI / initialTrunkCount) * i + rand(-0.12, 0.12);
          const len = baseSegmentLen * rand(0.85, 1.08);
          const seg = this.createSegment(rootNode, baseAngle, len, 0, i);
          this.segments.push(seg);
          this.nodes.push(seg.endNode);
          currentWaveNodes.push(seg.endNode);
        }

        for (let s = 1; s < this.stages.length; s++) {
          const stageObj = this.stages[s];
          const plant = stageObj.plant;
          const pm = plant.params;
          const nextWaveNodes = [];
          const maxBranchesAtStage = s >= 4 ? 2 : pm.branchCount;

          for (let parentIdx = 0; parentIdx < currentWaveNodes.length; parentIdx++) {
            const parentNode = currentWaveNodes[parentIdx];
            const bCount = maxBranchesAtStage;

            for (let b = 0; b < bCount; b++) {
              let spreadOffset = 0;
              if (bCount > 1) {
                spreadOffset = map(b, 0, bCount - 1, -pm.branchAngle, pm.branchAngle);
              }
              const jitter = rand(-0.14, 0.14) * (1 + pm.curvature * 0.4);
              const newAngle = parentNode.angle + spreadOffset + jitter;
              const stageScale = Math.pow(pm.lengthScale, s * 0.55);
              const len = baseSegmentLen * stageScale * rand(0.82, 1.14);

              const seg = this.createSegment(parentNode, newAngle, len, s, b);
              this.segments.push(seg);
              this.nodes.push(seg.endNode);
              nextWaveNodes.push(seg.endNode);
            }
          }
          currentWaveNodes = nextWaveNodes;
        }

        this.buildInvisibleBonds();
      }

      createSegment(startNode, angle, length, stageIndex, branchIndex) {
        const plant = this.stages[stageIndex].plant;
        const pm = plant.params;
        const noiseSeedVal = rand(0, 1000);

        const curveDir = (branchIndex % 2 === 0 ? 1 : -1) * pm.curvature;
        const midAngle1 = angle + curveDir * 0.28 + rand(-0.1, 0.1);
        const midAngle2 = angle - curveDir * 0.18 + rand(-0.1, 0.1);

        const endX = startNode.x + Math.cos(angle) * length;
        const endY = startNode.y + Math.sin(angle) * length;

        const distFromCenter = Math.hypot(endX, endY);
        const clampFactor = distFromCenter > this.maxRadius ? this.maxRadius / distFromCenter : 1.0;

        const finalX = endX * clampFactor;
        const finalY = endY * clampFactor;

        const endNode = {
          x: finalX,
          y: finalY,
          stageIndex,
          angle,
          plant
        };

        const strands = [];
        for (let i = 0; i < pm.fiberStrands; i++) {
          strands.push({
            offsetPhase: rand(0, TWO_PI),
            spreadRatio: map(i, 0, pm.fiberStrands - 1, -1, 1),
            weight: rand(0.6, 1.55),
            alphaRatio: rand(0.45, 0.95)
          });
        }

        return {
          startNode,
          endNode,
          cp1: {
            x: startNode.x + Math.cos(midAngle1) * (length * 0.35),
            y: startNode.y + Math.sin(midAngle1) * (length * 0.35)
          },
          cp2: {
            x: startNode.x + Math.cos(midAngle2) * (length * 0.7),
            y: startNode.y + Math.sin(midAngle2) * (length * 0.7)
          },
          length: length * clampFactor,
          angle,
          stageIndex,
          plant,
          strands,
          noiseSeedVal
        };
      }

      buildInvisibleBonds() {
        for (let i = 1; i < this.nodes.length; i++) {
          const nA = this.nodes[i];
          const density = nA.plant.params.webDensity;

          for (let j = i + 1; j < this.nodes.length; j++) {
            const nB = this.nodes[j];
            const d = Math.hypot(nA.x - nB.x, nA.y - nB.y);

            if (d > 28 && d < this.maxRadius * 0.42) {
              if (Math.random() < density * 0.14 && this.invisibleBonds.length < 160) {
                this.invisibleBonds.push({
                  nodeA: nA,
                  nodeB: nB,
                  stageIndex: Math.max(nA.stageIndex, nB.stageIndex),
                  slack: rand(12, 36) * (Math.random() < 0.5 ? 1 : -1),
                  phase: rand(0, TWO_PI),
                  color: nA.plant.colorSecondary
                });
              }
            }
          }
        }
      }

      dissolve() {
        this.dissolving = true;
      }

      isCompletelyDissolved() {
        return this.dissolving && this.dissolveAlpha <= 0.02;
      }

      update(dt) {
        if (this.dissolving) {
          this.dissolveAlpha *= 0.93;
        } else if (this.growthProgress < this.stages.length + 0.5) {
          this.growthProgress += dt * this.growthSpeed;
        }
      }

      display(ctx, time) {
        const masterAlpha = this.dissolveAlpha;
        this.drawInvisibleBonds(ctx, time, masterAlpha);

        for (const seg of this.segments) {
          const localGrowth = constrain(this.growthProgress - seg.stageIndex, 0, 1);
          if (localGrowth <= 0.001) continue;
          const easedGrowth = 1 - Math.pow(1 - localGrowth, 3);
          this.drawSegment(ctx, seg, easedGrowth, time, masterAlpha);
        }

        this.drawSeedCore(ctx, time, masterAlpha);
      }

      drawInvisibleBonds(ctx, time, masterAlpha) {
        for (const bond of this.invisibleBonds) {
          const localGrowth = constrain(this.growthProgress - bond.stageIndex - 0.2, 0, 1);
          if (localGrowth <= 0) continue;

          const c = bond.color;
          const pulse = 0.65 + 0.35 * Math.sin(time * 1.8 + bond.phase);
          ctx.strokeStyle = rgba(c[0], c[1], c[2], 52 * localGrowth * pulse * masterAlpha);
          ctx.lineWidth = 0.75;

          const midX = (bond.nodeA.x + bond.nodeB.x) * 0.5 + Math.sin(time + bond.phase) * bond.slack * 0.35;
          const midY = (bond.nodeA.y + bond.nodeB.y) * 0.5 + Math.cos(time + bond.phase) * bond.slack * 0.35;
          const tx = bond.nodeB.x * localGrowth + bond.nodeA.x * (1 - localGrowth);
          const ty = bond.nodeB.y * localGrowth + bond.nodeA.y * (1 - localGrowth);

          ctx.beginPath();
          ctx.moveTo(bond.nodeA.x, bond.nodeA.y);
          ctx.quadraticCurveTo(midX, midY, tx, ty);
          ctx.stroke();
        }
      }

      drawSegment(ctx, seg, growth, time, masterAlpha) {
        const pm = seg.plant.params;
        const colPri = seg.plant.colorPrimary;
        const colSec = seg.plant.colorSecondary;
        const colGlow = seg.plant.colorGlow;

        const swayAngle = Math.sin(time * 1.4 + seg.noiseSeedVal) * 0.045 * pm.reactivity * (seg.stageIndex + 1);

        const steps = 14;
        const spinePoints = [];
        for (let i = 0; i <= steps; i++) {
          const t = (i / steps) * growth;
          let bx = evalBezier(seg.startNode.x, seg.cp1.x, seg.cp2.x, seg.endNode.x, t);
          let by = evalBezier(seg.startNode.y, seg.cp1.y, seg.cp2.y, seg.endNode.y, t);

          const swayAmt = t * seg.length * Math.sin(swayAngle);
          const perpAngle = seg.angle + HALF_PI;
          bx += Math.cos(perpAngle) * swayAmt;
          by += Math.sin(perpAngle) * swayAmt;

          spinePoints.push({ x: bx, y: by, t });
        }

        // A) İç çelik tel omurga
        ctx.strokeStyle = rgba(colGlow[0], colGlow[1], colGlow[2], 115 * masterAlpha);
        ctx.lineWidth = Math.max(0.7, (this.stages.length - seg.stageIndex) * 0.45);
        ctx.beginPath();
        for (let i = 0; i < spinePoints.length; i++) {
          if (i === 0) ctx.moveTo(spinePoints[i].x, spinePoints[i].y);
          else ctx.lineTo(spinePoints[i].x, spinePoints[i].y);
        }
        ctx.stroke();

        // B) Dış jüt iplikleri
        const perpX = Math.cos(seg.angle + HALF_PI);
        const perpY = Math.sin(seg.angle + HALF_PI);

        for (const strand of seg.strands) {
          const mix = (strand.spreadRatio + 1) * 0.5;
          ctx.strokeStyle = rgba(
            lerp(colPri[0], colSec[0], mix),
            lerp(colPri[1], colSec[1], mix),
            lerp(colPri[2], colSec[2], mix),
            165 * strand.alphaRatio * masterAlpha
          );
          ctx.lineWidth = strand.weight * map(seg.stageIndex, 0, this.stages.length, 1.3, 0.65);

          ctx.beginPath();
          for (let i = 0; i < spinePoints.length; i++) {
            const pt = spinePoints[i];
            const twist = Math.sin(pt.t * PI * 3.5 + strand.offsetPhase + time * 0.9);
            const envelope = Math.sin(pt.t * PI) * pm.fiberSpread * (1 - seg.stageIndex * 0.12);
            const offset = strand.spreadRatio * envelope * twist;
            const sx = pt.x + perpX * offset;
            const sy = pt.y + perpY * offset;
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          }
          ctx.stroke();
        }

        // C) Bitkiye özgü organlar
        if (growth > 0.25) {
          const organAlpha = map(growth, 0.25, 1, 0, 1) * masterAlpha;
          this.drawBotanicalOrgans(ctx, seg, spinePoints, time, organAlpha);
        }
      }

      drawBotanicalOrgans(ctx, seg, spinePoints, time, alpha) {
        const type = seg.plant.params.foliageType;
        const colPri = seg.plant.colorPrimary;
        const colSec = seg.plant.colorSecondary;
        const colGlow = seg.plant.colorGlow;

        if (type === 'pinnate') {
          const foldWave = Math.sin(time * 2.4 - seg.stageIndex * 1.1 + seg.noiseSeedVal);
          const foldRatio = constrain(map(foldWave, 0.15, 0.95, 0, 1), 0, 1);

          for (let i = 2; i < spinePoints.length - 1; i += 2) {
            const pt = spinePoints[i];
            const leafletLen = map(i, 0, spinePoints.length, 18, 8) * (1 - seg.stageIndex * 0.1);
            const openAngle = lerp(PI * 0.42, PI * 0.08, foldRatio);

            for (const side of [-1, 1]) {
              const leafAngle = seg.angle + side * openAngle;
              const lx = pt.x + Math.cos(leafAngle) * leafletLen;
              const ly = pt.y + Math.sin(leafAngle) * leafletLen;

              ctx.strokeStyle = rgba(colPri[0], colPri[1], colPri[2], 190 * alpha);
              ctx.lineWidth = 1.1;
              ctx.beginPath();
              ctx.moveTo(pt.x, pt.y);
              ctx.lineTo(lx, ly);
              ctx.stroke();

              ctx.fillStyle = rgba(colGlow[0], colGlow[1], colGlow[2], (140 + 90 * foldRatio) * alpha);
              ctx.beginPath();
              ctx.arc(lx, ly, 1.3, 0, TWO_PI);
              ctx.fill();
            }
          }
        } else if (type === 'fronds') {
          ctx.strokeStyle = rgba(colPri[0], colPri[1], colPri[2], 135 * alpha);
          ctx.lineWidth = 0.95;
          for (let i = 3; i < spinePoints.length; i += 3) {
            const pt = spinePoints[i];
            const frondCount = 3;
            const baseLen = map(i, 0, spinePoints.length, 32, 16);

            for (let f = -frondCount; f <= frondCount; f++) {
              if (f === 0) continue;
              const spreadAngle = seg.angle + f * 0.24 + Math.sin(time * 1.2 + i) * 0.06;
              const fx = pt.x + Math.cos(spreadAngle) * baseLen;
              const fy = pt.y + Math.sin(spreadAngle) * baseLen;
              const cpx = pt.x + Math.cos(spreadAngle - f * 0.12) * (baseLen * 0.6);
              const cpy = pt.y + Math.sin(spreadAngle - f * 0.12) * (baseLen * 0.6);

              ctx.beginPath();
              ctx.moveTo(pt.x, pt.y);
              ctx.quadraticCurveTo(cpx, cpy, fx, fy);
              ctx.stroke();
            }
          }
        } else if (type === 'spiny_fur') {
          ctx.strokeStyle = rgba(colPri[0], colPri[1], colPri[2], 150 * alpha);
          ctx.lineWidth = 0.8;
          for (let i = 1; i < spinePoints.length; i++) {
            const pt = spinePoints[i];
            for (let h = 0; h < 4; h++) {
              const side = h % 2 === 0 ? 1 : -1;
              const hairPhase = i * 0.7 + h * 1.9 + seg.noiseSeedVal;
              const hairLen = (14 + Math.sin(hairPhase) * 7) * (1 - pt.t * 0.3);
              const hairAngle = seg.angle + side * (HALF_PI * 0.65) + Math.sin(time * 1.8 + hairPhase) * 0.25;

              const hx = pt.x + Math.cos(hairAngle) * hairLen;
              const hy = pt.y + Math.sin(hairAngle) * hairLen;
              const cx = pt.x + Math.cos(hairAngle + side * 0.3) * (hairLen * 0.55);
              const cy = pt.y + Math.sin(hairAngle + side * 0.3) * (hairLen * 0.55);

              ctx.beginPath();
              ctx.moveTo(pt.x, pt.y);
              ctx.quadraticCurveTo(cx, cy, hx, hy);
              ctx.stroke();
            }
          }
        } else if (type === 'moss_web') {
          for (let i = 2; i < spinePoints.length; i += 2) {
            const pt = spinePoints[i];
            const clusterRadius = 10 + 5 * Math.sin(i * 1.3 + seg.noiseSeedVal);

            for (let m = 0; m < 5; m++) {
              const a = (TWO_PI / 5) * m + i + time * 0.4;
              const r = clusterRadius * (0.6 + 0.4 * Math.sin(time * 2 + m));
              const mx = pt.x + Math.cos(a) * r;
              const my = pt.y + Math.sin(a) * r;

              ctx.strokeStyle = rgba(colSec[0], colSec[1], colSec[2], 125 * alpha);
              ctx.lineWidth = 0.8;
              ctx.beginPath();
              ctx.moveTo(pt.x, pt.y);
              ctx.lineTo(mx, my);
              ctx.stroke();

              ctx.fillStyle = rgba(colGlow[0], colGlow[1], colGlow[2], 165 * alpha);
              ctx.beginPath();
              ctx.arc(mx, my, 1.1, 0, TWO_PI);
              ctx.fill();
            }
          }
        }
      }

      drawSeedCore(ctx, time, masterAlpha) {
        const pulse = 1 + 0.12 * Math.sin(time * 3);
        ctx.lineWidth = 1.5;
        for (let i = 0; i < this.historyIds.length; i++) {
          const pl = PLANT_TYPES[this.historyIds[i]] || PLANT_TYPES.moss;
          const col = pl.colorPrimary;
          const r = (8 + i * 5.5) * pulse;
          ctx.strokeStyle = rgba(col[0], col[1], col[2], 180 * masterAlpha);
          const startA = time * (i % 2 === 0 ? 1 : -1) + i;
          ctx.beginPath();
          ctx.arc(0, 0, r, startA, startA + PI * 1.55);
          ctx.stroke();
        }

        ctx.fillStyle = rgba(255, 245, 220, 220 * masterAlpha);
        ctx.beginPath();
        ctx.arc(0, 0, 3.5 * pulse, 0, TWO_PI);
        ctx.fill();
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
      const seed = rfidState.activeSeed;
      if (rfidState.inFountain) {
        rfidState.inFountain = false;
        if (organism) organism.dissolve();
        ripples.push(new WaterRipple(0, 0, BASE_RADIUS * 0.5, [180, 200, 210]));
      }
      if (seed.history.length >= 8) seed.history.shift();
      seed.history.push(plantId);

      const angle = rand(0, TWO_PI);
      ripples.push(new WaterRipple(Math.cos(angle) * BASE_RADIUS * 0.7, Math.sin(angle) * BASE_RADIUS * 0.7, BASE_RADIUS * 0.4, plant.colorPrimary));
      updateSimulatorUI();
    };

    const placeInFountain = () => {
      const seed = rfidState.activeSeed;
      rfidState.inFountain = true;
      ripples.push(new WaterRipple(0, 0, BASE_RADIUS * 0.95, [240, 220, 180]));
      ripples.push(new WaterRipple(0, 0, BASE_RADIUS * 0.6, [200, 230, 210], 15));

      if (seed.history.length > 0) {
        organism = new PlantOrganism(seed.history, BASE_RADIUS * 0.88);
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
      const count = Math.floor(Math.random() * 3) + 3;
      rfidState.activeSeed.history = [];
      for (let i = 0; i < count; i++) {
        rfidState.activeSeed.history.push(keys[Math.floor(Math.random() * keys.length)]);
      }
      placeInFountain();
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
          position: fixed; top: 16px; left: 16px; bottom: 16px; width: 330px; z-index: 9990;
          background: rgba(14, 15, 13, 0.86); backdrop-filter: blur(14px);
          border: 1px solid rgba(212, 194, 154, 0.18); border-radius: 14px; padding: 16px;
          display: flex; flex-direction: column; gap: 12px; overflow-y: auto;
          color: #e6dfd3; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
          box-shadow: 0 20px 50px rgba(0,0,0,0.85); user-select: none;
        }
        #gb-simulator-panel.gb-hidden { transform: translateX(-360px); opacity: 0; pointer-events: none; }
        #gb-simulator-panel .gb-tag { font-size: 10px; letter-spacing: 2px; color: #c8b082; font-weight: 600; }
        #gb-simulator-panel h2 { font-size: 17px; font-weight: 600; color: #f4ece0; margin: 2px 0; }
        #gb-simulator-panel .gb-sub { font-size: 11.5px; color: #9c9484; }
        #gb-simulator-panel .gb-sec-title { display:flex; justify-content:space-between; align-items:center; font-size:11px; font-weight:600; color:#b8af9e; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px; }
        #gb-simulator-panel .gb-seed-row { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; }
        #gb-simulator-panel .gb-seed-btn { background:rgba(255,255,255,0.03); border:1px solid rgba(212,194,154,0.16); color:#bfb6a6; padding:6px; border-radius:8px; font-size:11px; cursor:pointer; }
        #gb-simulator-panel .gb-seed-btn.active { background:rgba(212,194,154,0.18); border-color:#d4c29a; color:#fff8eb; font-weight:600; }
        #gb-simulator-panel .gb-station-grid { display:flex; flex-direction:column; gap:6px; }
        #gb-simulator-panel .gb-station-btn { display:flex; align-items:center; gap:9px; width:100%; text-align:left; background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.08); border-left:3px solid var(--plant-color, #d4c29a); padding:8px 10px; border-radius:8px; color:#eae3d5; cursor:pointer; }
        #gb-simulator-panel .gb-station-btn:hover { background:rgba(255,255,255,0.07); }
        #gb-simulator-panel .gb-key { font-family:monospace; font-size:11px; color:var(--plant-color); background:rgba(0,0,0,0.35); padding:2px 5px; border-radius:4px; }
        #gb-simulator-panel .gb-timeline { min-height:52px; background:rgba(0,0,0,0.42); border:1px dashed rgba(212,194,154,0.22); border-radius:8px; padding:8px; display:flex; flex-wrap:wrap; align-items:center; gap:5px; font-size:11px; }
        #gb-simulator-panel .gb-step { display:flex; flex-direction:column; background:rgba(255,255,255,0.04); border:1px solid; border-radius:6px; padding:3px 7px; }
        #gb-simulator-panel .gb-primary-btn { width:100%; background:linear-gradient(135deg,#d8be8b 0%,#b59862 100%); color:#14120e; border:none; border-radius:8px; padding:10px 12px; font-size:12.5px; font-weight:700; cursor:pointer; display:flex; justify-content:space-between; align-items:center; }
        #gb-simulator-panel .gb-sec-actions { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:6px; }
        #gb-simulator-panel .gb-sec-btn { background:rgba(255,255,255,0.04); border:1px solid rgba(212,194,154,0.16); color:#ccc3b2; padding:7px 9px; border-radius:7px; font-size:11px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; }
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
          <div class="gb-sub">Jüt Bitkisel Figürler &amp; Taş Çeşme RFID Projeksiyonu</div>
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
          <div class="gb-sec-title"><span>3. Tohumun Hafızası (Evreler)</span></div>
          <div id="gb-timeline" class="gb-timeline"></div>
        </div>
        <div style="margin-top:auto">
          <button id="gb-btn-fountain" class="gb-primary-btn"><span>◎ Taş Çeşmeye Bırak</span><kbd style="background:rgba(0,0,0,0.2);color:#14120e">SPACE</kbd></button>
          <div class="gb-sec-actions">
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

      // Tohum butonları
      const seedContainer = panel.querySelector('#gb-seeds');
      rfidState.seeds.forEach((seed, idx) => {
        const btn = document.createElement('button');
        btn.className = 'gb-seed-btn';
        btn.textContent = seed.label;
        btn.onclick = () => selectSeed(idx);
        seedContainer.appendChild(btn);
      });

      // İstasyon butonları
      const stContainer = panel.querySelector('#gb-stations');
      PLANT_LIST.forEach(pl => {
        const btn = document.createElement('button');
        btn.className = 'gb-station-btn';
        btn.style.setProperty('--plant-color', `rgb(${pl.colorPrimary.join(',')})`);
        btn.innerHTML = `<span class="gb-key">[${pl.key}]</span><div><div style="font-size:12.5px;font-weight:600">${pl.name}</div><div style="font-size:10.5px;color:#968e7e">${pl.subtitle}</div></div>`;
        btn.onclick = () => tapPlantStation(pl.id);
        stContainer.appendChild(btn);
      });

      panel.querySelector('#gb-btn-fountain').onclick = () => placeInFountain();
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
      const seed = rfidState.activeSeed;
      if (seed.history.length === 0) {
        tl.innerHTML = `<span style="color:#7d7668">Henüz hiçbir bitki heykeline okutulmadı.</span>`;
      } else {
        tl.innerHTML = seed.history.map((id, i) => {
          const pl = PLANT_TYPES[id] || PLANT_TYPES.moss;
          const col = `rgb(${pl.colorPrimary.join(',')})`;
          return `<div class="gb-step" style="border-color:${col}"><span style="font-size:8.5px;color:#8f887a">${i + 1}. EVRE</span><strong style="color:${col}">${pl.name}</strong></div>`;
        }).join('<span style="color:#6e675b">→</span>');
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

    // ── Yardımcı Çizim Fonksiyonları ────────────────────────────────────────
    const getBasinRadius = () => Math.min(p.width, p.height) * cfg.radiusScale;

    const getBasinCenter = () => {
      const sidebarOffset = cfg.uiVisible && p.width > 900 ? 150 : 0;
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

    const drawIdleFountainCore = (ctx, time) => {
      const pulse = 14 + Math.sin(time * 2.2) * 5;
      ctx.strokeStyle = rgba(180, 195, 175, 50 + Math.sin(time * 2.2) * 25);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, pulse, 0, TWO_PI);
      ctx.stroke();

      ctx.strokeStyle = rgba(220, 200, 165, 90);
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, TWO_PI);
      ctx.stroke();
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
      placeInFountain();
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

      // İç sahneyi çapa göre komple ölçekle
      ctx.scale(sceneScale, sceneScale);

      drawWaterAmbience(ctx, BASE_RADIUS, nowSec);

      for (const f of floatingFibers) {
        f.update(BASE_RADIUS, nowSec);
        f.display(ctx);
      }

      for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i].update();
        ripples[i].display(ctx);
        if (ripples[i].isDead()) ripples.splice(i, 1);
      }

      if (organism) {
        organism.update(dt);
        organism.display(ctx, nowSec);
        if (organism.isCompletelyDissolved()) organism = null;
      } else {
        drawIdleFountainCore(ctx, nowSec);
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
