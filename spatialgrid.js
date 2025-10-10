// Spatial grid helpers
function getGridKey(x, y, cellSize) {
  return `${floor(x / cellSize)},${floor(y / cellSize)}`;
}

function buildSpatialGrid(agents, cellSize) {
  let grid = new Map();
  for (let agent of agents) {
    let key_ = getGridKey(agent.pos.x, agent.pos.y, cellSize);
    if (!grid.has(key_)) grid.set(key_, []);
    grid.get(key_).push(agent);
  }
  return grid;
}

function getNeighbors(agent, grid, cellSize) {
  let neighbors = [];
  let col = floor(agent.pos.x / cellSize);
  let row = floor(agent.pos.y / cellSize);

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      let key_ = `${col + dx},${row + dy}`;
      if (grid.has(key_)) {
        const cellAgents = grid.get(key_);
        for (let i = 0; i < cellAgents.length; i++) {
          neighbors.push(cellAgents[i]);
        }
      }
    }
  }
  return neighbors;
}
