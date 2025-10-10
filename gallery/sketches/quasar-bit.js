let layers = 49;
let leaf = 7;

function setup() {
  createCanvas(500, 500);
  strokeWeight(3);
  background(0);
  colorMode(HSB, 100);
}

function draw() {
  background(0, 4);
  for (let i = 0; i < layers; i++) {
    let timer = ((millis()+10035) / 3500);
    let rotation = (PI / leaf) * timer * i;

    // size
    let size_ = min(width / 2, height / 2);
    let perlin = pow(noise(millis() / 600.0 + i * 0.2), 3.4);
    let radius = size_ * (1-(i / layers));
    radius *= 1.0;

    // color
    let epylepsy = noise(millis() / 5000.0) * 400;
    let perlin2 = noise(millis() / 888.0 + i * 0.07 + 10000) * epylepsy % 100;
    stroke(
      perlin2,
      randomGaussian(20, 40) + noise(millis()/100.0)*20,
      randomGaussian(100, 1),
      90
      )
    fill(
      100-perlin2,
      noise(millis()/100.0%1)*20,
      randomGaussian(100, 1),
      84
    );

    for (let i = 0; i < leaf; i++) {
      let c = cos(TAU * (1.2*i+0.1*noise((millis()/100.0))) / leaf + rotation) / 1.4;
      let d = sin(TAU * ((1+noise(millis()/10000.0)/2)*i) / leaf + rotation) / (1.2*i+0.1*noise((millis()/100.0)));

      rectMode(CENTER)
      rect(width / 2 + (c * radius),
              height / 2 + (d * radius),
              radius * perlin / 3,
              radius * perlin / 3,
             )

    }
  }
}
