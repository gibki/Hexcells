export const calculate_neighbour_count = (level, x, y, values) => {
  let count = 0;
  for (let [nx, ny] of get_neighbours(level, x, y)) {
    let nv = level[ny][nx];
    if (values.includes(nv)) {
      count += 1;
    }
  }
  return count;
};
export const get_level_bounds = level => {
  let [top, left, bottom, right] = [Number.MAX_VALUE, Number.MAX_VALUE, 0, 0];
  for (let [x, y] of get_tiles(level)) {
    top = Math.min(x + y, top);
    bottom = Math.max(x + y, bottom);
    left = Math.min(x - y, left);
    right = Math.max(x - y, right);
  }
  return [top, left, bottom, right];
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
export const calculate_line_count = (level, x, y, direction, values) => {
  let count = 0;
  for (let [tx, ty] of get_line(level, x, y, direction)) {
    if (values.includes(level[ty][tx])) {
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
      if (['y', 'n', 'h', 't'].includes(lv)) {
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
export const get_neighbours_empty = (level, x, y) => get_neighbours(level, x, y).filter(([x, y]) => level[y][x] == ' ');
export const get_neighbours_candidates = (level, x, y) => get_neighbours(level, x, y).filter(([x, y]) => [' ', 'H', 'T'].includes(level[y][x]));
export const get_line_empty = (level, x, y, d) => get_line(level, x, y, d).filter(([x, y]) => level[y][x] == ' ');
export const get_line_headers = (level, x, y) => {
  let output = [];
  for (let d of ['L', 'R', 'U']) {
    let line = get_line(level, x, y, d);
    if (line.length > 0) {
      let [lx, ly] = line[0];
      if (['l', 'r'].includes(level[ly][lx])) {
        output.push(line[0]);
      }
      [lx, ly] = line[line.length - 1];
      if ('u' == level[ly][lx]) {
        output.push(line[line.length - 1]);
      }
    }
  }
  return output;
};
export const get_tiles_empty = level => get_tiles(level).filter(([x, y]) => level[y][x] == ' ');
export const level_to_string = level => {
  let [top, left, bottom, right] = get_level_bounds(level);
  let dx = -left;
  let dy = -top;
  let level_data = Array(bottom - top + 1);
  for (let j of Array(bottom - top + 1).keys()) {
    level_data[j] = Array(2 * (right - left + 1));
    for (let i of Array(2 * (right - left + 1)).keys()) {
      level_data[j][i] = ' ';
    }
  }
  for (let [x, y] of get_tiles(level)) {
    let j = x + y + dy;
    // let i = 2 * (dx + x - y) + j % 2;
    let i = dx + x - y;
    // console.log(j, i);
    if (level[y][x] == ' ') {
      level_data[j][i] = '.';
    } else {
      level_data[j][i] = level[y][x];
    }
  }
  let output = "";
  for (let j of Array(bottom - top + 1).keys()) {
    output += level_data[j].join('') + "\n";
  }
  return output;
};
export const is_solved = level => {
  for (let [x, y] of get_tiles(level)) {
    if (level[y][x] == ' ') {
      return false;
    }
  }
  return true;
};