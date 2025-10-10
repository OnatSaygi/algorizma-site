let intRad;
let forceStr;
let arcSpeed;
let cellRad;
let arcWiggle;
let movSpeed; 
let natFrq;
let kCoup;
let duty;
let currentNumAgents;
let currentCellRadius;
let respawnSpeed;
let gridSize;
let maxCon;
let fade;

function getSliders() {
  intRad = getSliderValue('interactionRadius');
  forceStr = getSliderValue('forceStrength')
  arcSpeed = getSliderValue('arcGrowthSpeed');
  cellRad = getSliderValue('cellRadius');
  arcWiggle = getSliderValue('arcWiggle');
  movSpeed = getSliderValue('moveSpeed');
  natFrq = getSliderValue('naturalFrequency');
  kCoup = getSliderValue('kCoupling');
  phaseRandom = getSliderValue('phaseRandom')
  duty = getSliderValue('dutyCycle');
  currentNumAgents = getSliderValue('numAgents');
  currentCellRadius = getSliderValue('cellRadius');
  respawnSpeed = getSliderValue('respawnSpeed');
  gridSize = getSliderValue('interactionRadius');
  maxCon = getSliderValue('maxConnections');
  fade = getSliderValue('ghostFade');
  fade = (1-pow(fade / 255, 0.15)) * 255;
}

function createSliders() {
  let y = 40;
  for (let [name, minV, maxV, def, step, pin] of sliderData) {
    if (!(pin === null)) {
      sliderSerialBindings.push([name, pin]);
    }
    if (name == '') {
      y += 15;
      continue;
    }
    let label = createDiv(name);
    label.style('color', 'white');
    label.style('opacity', '0.8');
    label.position(10, y);
    sliderLabels[name] = label;

    let slider = createSlider(minV, maxV, def, step);
    slider.position(125, y);
    slider.style('width', '100px');
    slider.style('opacity', '0.2');
    sliders[name] = slider;

    let valueDisplay = createDiv(def);
    valueDisplay.style('color', 'white');
    valueDisplay.style('opacity', '0.8');
    valueDisplay.position(230, y);
    sliderValueDisplays[name] = valueDisplay;

    slider.input(() => {
      sliderValueDisplays[name].html(slider.value());
    });

    y += 20;
    
    if (INSTALLATION_MODE) {
      sliders[name].hide();
      sliderLabels[name].hide();
      sliderValueDisplays[name].hide();
    }
  }
  getSliders();
  slidersVisible = !INSTALLATION_MODE;
}

function getSliderValue(name) {
  return sliders[name].value();
}

// val from 0 to 1023
function setSliderSerial(name, val) {
  let slider = sliders[name];
  val = map(val, 0, 1023, parseFloat(slider.elt.min), parseFloat(slider.elt.max));
  slider.value(val);
  sliderValueDisplays[name].html(slider.value());
}

function sliderVisibility(val) {
  slidersVisible = val;
  for (let name in sliders) {
    if (slidersVisible) {
      sliders[name].show();
      sliderLabels[name].show();
      sliderValueDisplays[name].show();
    } else {
      sliders[name].hide();
      sliderLabels[name].hide();
      sliderValueDisplays[name].hide();
    }
  }
}