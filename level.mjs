export const calculate_neighbour_count = (level, x, y, value) => {
  let count = 0;
  for (let [nx, ny] of get_neighbours(level, x, y)) {
    let nv = level[ny][nx];
    if (nv == value) {
      count += 1;
    }
  }
  return count;
};
export const reveal_known_neighbour = (level, x, y) => {
  if (calculate_neighbour_count(level, x, y, 'y') == 0 || calculate_neighbour_count(level, x, y, 'n') + calculate_neighbour_count(level, x, y, 'h') == 0) {
    return reveal_and_propagate(level, get_neighbours(level, x, y));
  }
  return [];
};
export const reveal_known_line = (level, x, y) => {
  let affected = [];
  for (let direction of ['L', 'R', 'U']) {
    let all_y = true;
    let all_n = true;
    let has_clue = false;
    for (let [lx, ly] of get_line(level, x, y, direction)) {
      let lv = level[ly][lx];
      if (lv == 'y') {
        all_n = false;
      }
      if (lv == 'n' || lv == 'h') {
        all_y = false;
      }
      if (lv == direction) {
        has_clue = true;
      }
    }
    if (has_clue && (all_y || all_n)) {
      // console.log('reveal line', x, y, direction);
      affected = [...affected, ...reveal_and_propagate(level, get_line(level, x, y, direction))];
    }
  }
  return affected;
};
export const reveal_and_propagate = (level, tiles) => {
  let affected = [];
  for (let tile of tiles) {
    let [x, y] = tile;
    if (['y', 'n', 'h'].includes(level[y][x])) {
      console.log('reveal', x, y);
      level[y][x] = level[y][x].toUpperCase();
      affected.push(tile);
      if (level[y][x] == 'N') {
        affected = [...affected, ...reveal_known_neighbour(level, x, y)];
      }
      for (let [nx, ny] of get_neighbours(level, x, y)) {
        let nv = level[ny][nx];
        if (nv == 'N') {
          affected = [...affected, ...reveal_known_neighbour(level, nx, ny)];
        }
      }
      affected = [...affected, ...reveal_known_line(level, x, y)];
    }
  }
  // console.log("reveal", affected);
  return affected;
};
export const get_neighbours = (level, x, y) => {
  const neighbours = [[-1, -1], [0, -1], [-1, 0], [1, 0], [0, 1], [1, 1]];
  return neighbours.map(([nx, ny]) => [x + nx, y + ny]).filter(([lx, ly]) => ly >= 0 && ly < level.length && lx >= 0 && lx < level[ly].length && level[ly][lx] != 'X');
};
export const get_line = (level, x, y, direction) => {
  let cx, cy;
  let dx, dy;
  switch (direction) {
    case 'R':
      [dx, dy] = [1, 0];
      [cx, cy] = [0, y];
      break;
    case 'L':
      [dx, dy] = [0, 1];
      [cx, cy] = [x, 0];
      break;
    case 'U':
      [dx, dy] = [1, 1];
      [cx, cy] = [x - Math.min(x, y), y - Math.min(x, y)];
      break;
    default:
      return;
  }
  let line = [];
  while (cy < level.length && cx < level[cy].length) {
    if (level[cy][cx] != 'X') {
      line.push([cx, cy]);
    }
    cx += dx;
    cy += dy;
  }
  return line;
};
export const calculate_line_count = (level, x, y, direction) => {
  let count = 0;
  for (let [tx, ty] of get_line(level, x, y, direction)) {
    if (level[ty][tx] == 'y') {
      count += 1;
    }
  }
  return count;
};
export const get_tiles = level => {
  let tiles = [];
  let y = 0;
  while (y < level.length) {
    let x = 0;
    while (x < level[y].length) {
      if (level[y][x] != 'X') {
        tiles.push([x, y]);
      }
      x += 1;
    }
    y += 1;
  }
  return tiles;
};
export const hide_line_clues = (level, x, y) => {
  for (let direction of ['L', 'R', 'U']) {
    let clue_position = null;
    let is_done = true;
    for (let [lx, ly] of get_line(level, x, y, direction)) {
      let lv = level[ly][lx];
      if (['y', 'n', 'h'].includes(lv)) {
        is_done = false;
      }
      if (lv == direction) {
        clue_position = [lx, ly];
      }
    }
    if (is_done && clue_position != null) {
      let [x, y] = clue_position;
      level[y][x] = level[y][x].toLowerCase();
    }
  }
};
export const apply_clues = (level, clues) => {
  level = level.map(line => line.map(tile => tile));
  // for(let [cv, cx, cy] of clues){
  //     if(['Y', 'N', 'H'].includes(cv)){
  //         reveal_and_propagate(level, [[cx, cy]]);
  //     }else{
  //         level[cy][cx] = level[cy][cx].toUpperCase();
  //         reveal_known_line(level, cx, cy);
  //     }
  // }
  for (let [cv, cx, cy] of clues) {
    level[cy][cx] = level[cy][cx].toUpperCase();
  }
  return level;
};