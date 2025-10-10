let layers = 19;
let leaf = 7;

function setup() {
  createCanvas(500, 500);
  strokeWeight(3);
  colorMode(HSB, 100);
  background(0);
}

let bghue = 0

// Easing function: easeOutElastic
function easeOutElastic(t) {
  let c4 = (2 * PI) / 3;

  if (t === 0) return 0;
  if (t === 1) return 1;

  return pow(2, -10 * t) * sin((t * 10 - 0.75) * c4) + 1;
}

function draw() {
  let bounce = sqrt(easeOutElastic(millis()%1500/1500.0));

  background(0, 100, 0, 1);
  for (let i = 0; i < layers; i++) {
    let timer = millis() / ((millis()%1000/1000)*1000+300)*.1;
    let rotation = (PI / leaf) * timer * i * 2;

    // size
    let size_ = min(width / 2, height / 2);
    let perlin = pow(noise(millis() / 600.0 + i * 0.2), 2.4);
    let radius = size_ * (1-(i / layers));
    radius *= 1.5;

    // color
    let epylepsy = noise(millis() / 5000.0) * 400;
    let perlin2 = noise(millis() / 888.0 + i * 0.07 + 10000) * epylepsy % 100;
    stroke(
      perlin2 / 5 + 20,
      randomGaussian(60, 3) + noise(millis()/100.0)*20,
      randomGaussian(100, 1),
      20
      )
    fill(
      perlin2,
      100+randomGaussian(60, 3) + noise(millis()/100.0)*20,
      -100-randomGaussian(100, 1),
      20
    );

    for (let i = 0; i < leaf; i++) {
      let c = cos(TAU * i / leaf + rotation) * bounce;
      let d = sin(TAU * i / leaf + rotation) * bounce;

      rectMode(CENTER)
      rect(width / 2 + (c * radius),
              height / 2 + (d * radius),
              radius * perlin,
              radius * perlin,
             )
      // ellipse();
    }
  }
}
