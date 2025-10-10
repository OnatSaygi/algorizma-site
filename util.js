let frameRates = [];
function displayAverageFrameRate(x, y, numFrames = 60) {
  frameRates.push(frameRate());
  if (frameRates.length > numFrames) {
    frameRates.shift(); // Remove the oldest frame rate
  }
  let sum = 0;
  for (let i = 0; i < frameRates.length; i++) {
    sum += frameRates[i];
  }
  let averageFrameRate = sum / frameRates.length;
  stroke(0);
  fill(255); // Set the text color
  textSize(20);  // Set the text size
  text("Avg FPS: " + round(averageFrameRate), x, y);
}

function distSq(pos1, pos2) {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  return dx * dx + dy * dy;
}
// Reload window
function restart() {
  if (!port.opened()) {
      window.location.reload();
  }
}

// Open serial 
function connectBtnClick() {
  try {
    port.open('Kitlesel_Idari_Panel', BAUD_RATE);
    connectBtn.remove();
  } catch (err) {
    restart();
  }
}
