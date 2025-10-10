let layers = 15;
let leaf = 5;

function setup() {
  createCanvas(500, 500);
  strokeWeight(4);
  background(0);
  colorMode(HSB, 100);
}

function draw() {
  background(0, 5);
  for (let i = 0; i < layers; i++) {
    let timer = millis() / 1500;
    let rotation = (PI / leaf) * timer * i;

    // size
    let size_ = min(width / 2, height / 2);
    let perlin = pow(noise(millis() / 600.0 + i * 0.2), 2.4);
    let radius = size_ * (1-(i / layers));
    radius *= 1.5;

    // color
    let epylepsy = noise(millis() / 7000.0) * 400;
    let perlin2 = noise(millis() / 888.0 + i * 0.07 + 10000) * epylepsy % 100;
    stroke(
      perlin2,
      randomGaussian(60, 3) + noise(millis()/100.0)*20,
      randomGaussian(100, 1),
      100
      )
    fill(
      perlin2,
      randomGaussian(60, 3) + noise(millis()/100.0)*20,
      randomGaussian(100, 1),
      10
    );
    let symmetry = 3;
    for (let i = 0; i < symmetry; i++) {
      let c = cos(TAU * (1.4*i+0.1*noise((millis()/100.0))) / leaf + rotation);
      let d = sin(TAU * i / leaf + rotation);

      let angle = 360 / symmetry;

      rectMode(CENTER)
      rect(width / 2 + (c * radius),
              height / 2 + (d * radius),
              radius * perlin,
              radius * perlin,
             )      
    }
  }
}
