const INSTALLATION_MODE = true;
const REMOTE_ENABLED = false;
const PIN_COUNT = 8;
const BAUD_RATE = 9600;
const sliderData = [
  //name,              min,    max,     val,    step,  pin
  ["numAgents", 20, 400, 30, 1, 7],
  ["forceStrength", 0, 0.01, 0.0005, 0.00001, 2],
  ["interactionRadius", 50, 500, 250, 1, 3],
  ["maxConnections", 0, 5, 3, 1, 4],
  ["kCoupling", 0, 0.01, 0.0062, 0.0001, null],
  ["naturalFrequency", 0, 0.2, 0.08, 0.001, null],
  ["phaseRandom", 0, 0.3, 0.08, 0.01, null],
  ["", 0, 0, 0, 0, null],
  ["moveSpeed", 0, 5, 0.4, 0.01, 5],
  ["arcWiggle", 0, 80, 30, 1, null],
  ["arcGrowthSpeed", 0, 0.1, 0.5, 0.001, null],
  ["dutyCycle", 0, 1, 0.08, 0.001, null],
  ["respawnSpeed", 0, 1.0, 0.2, 0.01, 6],
  ["", 0, 0, 0, 0, null],
  ["cellRadius", 3, 40, 8, 0.1, 0],
  ["ghostFade", 2, 255, 205, 1, 1],
];

let connectBtn;
let sliderSerialBindings = [];
let sliders = {};
let sliderLabels = {};
let sliderValueDisplays = {};
let slidersVisible;
let agents = [];
let dimAgentColor;
let brightAgentColor;
let brightAgentColor2;
let connectionColor;
let port;
let latestData = "";

function touchEnded() {
  return false;
}
// Initialize agents
function initAgents() {
  background(0, 40);
  agents = [];
  let num = int(getSliderValue("numAgents"));
  let cellRadiusValue = getSliderValue("cellRadius");
  for (let i = 0; i < num; i++) {
    agents.push(
      new Agent(random(width), random(height), false, cellRadiusValue),
    );
  }
}
let canvas;

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  canvas.addClass("p5-background");
  canvas.style.zIndex = "-20";
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";

  createSliders();
  dimAgentColor = color(150, 200, 0, 130);
  brightAgentColor = color(150, 200, 200, 80);
  brightAgentColor2 = color(150, 200, 200, 20);
  connectionColor = color(100, 180, 160, 40);

  // Setup serial device connection
  // Enter boot loop if unable to connect
  port = createSerial();
  let usedPorts = usedSerialPorts();
  if (!REMOTE_ENABLED) {
  } else if (usedPorts.length > 0) {
    port.open(usedPorts[0], BAUD_RATE);
  } else {
    connectBtn = createButton("Kitlesel Idare Paneline Baglan");
    connectBtn.position(width / 2, height / 10);
    connectBtn.mousePressed(connectBtnClick);
    setTimeout(restart, 7000);
  }

  initAgents();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  getSliders();
  background(0, 0, 0, fade);
  translate(width / 2, height / 2);
  if (slidersVisible) displayAverageFrameRate(10, 30, 60);

  // Read serial data and write to sliders
  let data = "";
  let newdata;
  do {
    newdata = port.readUntil("\n");
    if (newdata != "") data = newdata;
  } while (newdata != "");
  let parts = data.split(",").map(Number);

  if (parts.length === PIN_COUNT + 1) {
    console.log(parts);
    let reset_ = parts.pop();
    for (var [name, id] of sliderSerialBindings) {
      setSliderSerial(name, parts[id]);
    }
    if (reset_) {
      initAgents();
    }
  }

  // Update agent radii
  agents.forEach((agent) => (agent.r = currentCellRadius));

  // Respawn agents
  if (currentNumAgents !== agents.length) {
    let diff = currentNumAgents - agents.length;
    if (diff > 0) {
      for (let i = 0; i < diff; i++) {
        agents.push(
          new Agent(random(width), random(height), currentCellRadius),
        );
      }
    } else if (diff < 0) {
      agents.splice(diff);
    }
  }
  let respawnCount = floor(respawnSpeed) + (random(1) < respawnSpeed % 1);
  agents.splice(0, respawnCount);
  for (let i = 0; i < respawnCount; i++) {
    agents.push(new Agent(random(width), random(height), currentCellRadius));
  }

  // Build spatial grid
  // Update and display agents
  let spatialGrid = buildSpatialGrid(agents, gridSize);
  for (let a of agents) {
    const potentialNeighbors = getNeighbors(a, spatialGrid, gridSize);
    if (a.connections.length !== maxCon) {
      a.connections = [];
      const neighborsWithDistances = potentialNeighbors
        .filter((b) => b !== a)
        .map((b) => ({
          agent: b,
          distSq: distSq(a.pos, b.pos),
        }));
      neighborsWithDistances.sort((p, q) => p.distSq - q.distSq);
      let conn = 0;
      for (
        let k = 0;
        k < Math.min(maxCon, neighborsWithDistances.length);
        k++
      ) {
        const neighborInfo = neighborsWithDistances[k];
        a.connect(neighborInfo.agent);
        conn++;
      }
    }
    a.applyForces(potentialNeighbors);
    a.updateOscillator();
    a.update();
    a.display();
    a.showConnections();
  }
}

function keyPressed() {
  if (key === " ") {
    initAgents();
  }
  if (key === "s" || key === "S") {
    sliderVisibility(!slidersVisible);
  }
  if (key === "q") {
    const info = port.getInfo();
    console.log(info.usbVendorId, info.usbProductId);
  }
}
