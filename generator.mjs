import { integer, real, shuffle } from 'https://cdn.skypack.dev/random-js';
import { reveal_known_line, reveal_and_propagate, get_tiles, get_neighbours, get_line } from './level.mjs';
export const generate_hexagonal_layout = size => {
  let line_size = 2 * size + 1;
  const level_layout = Array(line_size);
  for (let i of Array(line_size).keys()) {
    level_layout[i] = Array(line_size);
  }
  for (let i of Array(line_size).keys()) {
    for (let j of Array(line_size).keys()) {
      level_layout[i][j] = 'X';
    }
  }
  for (let i of Array(size).keys()) {
    for (let j of Array(size + i).keys()) {
      level_layout[i + 1][j + 1] = ' ';
      level_layout[line_size - 2 - i][line_size - 2 - j] = ' ';
    }
    level_layout[0][i + 1] = 'l';
    level_layout[i][size + i] = 'l';
    level_layout[i + 1][0] = 'r';
    level_layout[size + i][i] = 'r';
    level_layout[line_size - 1 - i][line_size - 1] = 'u';
    level_layout[line_size - 1][line_size - 1 - i] = 'u';
  }
  return level_layout;
};
const random_fill_level = (level_layout, rng) => {
  let tile_count = 0;
  level_layout.map(line => line.map(tile => {
    if (tile == ' ') {
      tile_count += 1;
    }
  }));
  const COLOR_SPREAD_FACTOR = 0.2;
  const COLOR_SPREAD = Math.floor(tile_count * COLOR_SPREAD_FACTOR);
  const HIDDEN_BLACK_CHANCE = 0.2;
  const BLUE = Math.floor(tile_count / 2.0) + integer(-COLOR_SPREAD, COLOR_SPREAD - 1)(rng);
  // const BLACK = tile_count - BLUE;
  const tiles = Array(tile_count);
  let i = 0;
  while (i < BLUE) {
    tiles[i] = 'y';
    i += 1;
  }
  while (i < tile_count) {
    if (real(0.0, 1.0)(rng) < HIDDEN_BLACK_CHANCE) {
      tiles[i] = 'h';
    } else {
      tiles[i] = 'n';
    }
    i += 1;
  }
  shuffle(rng, tiles);
  const level = Array(level_layout.length);
  let current_tile = 0;
  let y = 0;
  while (y < level.length) {
    level[y] = Array(level_layout[y].length);
    let x = 0;
    while (x < level[y].length) {
      if (level_layout[y][x] == ' ') {
        level[y][x] = tiles[current_tile];
        current_tile += 1;
      } else {
        level[y][x] = level_layout[y][x];
      }
      x += 1;
    }
    y += 1;
  }
  return level;
};
const generate_clues = (level, rng) => {
  let clues = [];
  const TILE_PREFERENCE = 1;
  const BLACK_TILE_PREFERENCE = 0;
  for (let [x, y] of get_tiles(level)) {
    let v = level[y][x];
    if (['y', 'n', 'h'].includes(v)) {
      for (let i = 0; i < TILE_PREFERENCE; i++) {
        if (['n', 'h'].includes(v)) {
          for (let j = 0; j < BLACK_TILE_PREFERENCE; j++) {
            clues.push([v.toUpperCase(), x, y]);
          }
        }
        clues.push([v.toUpperCase(), x, y]);
      }
    }
    if (['l', 'r', 'u'].includes(v)) {
      clues.push([v.toUpperCase(), x, y]);
    }
  }
  shuffle(rng, clues);
  return clues;
};
const split_tile_lists = (a, b) => {
  let i = 0,
    j = 0;
  let [at, bt, ct] = [[], [], []];
  while (i < a.length && j < b.length) {
    let [ax, ay] = a[i];
    let [bx, by] = b[j];
    if (ax == bx && ay == by) {
      ct.push([ax, ay]);
      i++;
      j++;
    } else {
      if (ay < by || ay == by && ax < bx) {
        at.push([ax, ay]);
        i++;
      } else {
        bt.push([bx, by]);
        j++;
      }
    }
  }
  at = [...at, ...a.slice(i)];
  bt = [...bt, ...b.slice(j)];
  return [ct, at, bt];
};
const is_deduction = constraint => {
  return constraint.tiles.length > 0 && (constraint.max == 0 || constraint.min == constraint.tiles.length);
};
const get_constraints = (constraint_map, tiles) => {
  const constraints = [];
  for (const [x, y] of tiles) {
    for (const constraint of constraint_map[y][x]) {
      let unique = true;
      for (let c of constraints) {
        if (!compare_constraints(constraint, c)) {
          unique = false;
          break;
        }
      }
      if (unique) {
        constraints.push(constraint);
      }
    }
  }
  return constraints;
};
const is_useless = constraint => {
  return constraint.tiles.length == 0 || constraint.min == 0 && constraint.max == constraint.tiles.length;
};
const compare_constraints = (a, b) => {
  if (a.tiles.length != b.tiles.length) {
    return a.tiles.length - b.tiles.length;
  }
  let i = 0;
  while (i < a.tiles.length) {
    let [ax, ay] = a.tiles[i];
    let [bx, by] = b.tiles[i];
    if (ay != by) {
      return ay - by;
    }
    if (ax != bx) {
      return ax - bx;
    }
    i += 1;
  }
  if (a.min != b.min) {
    return a.min - b.min;
  }
  return a.max - b.max;
};
const is_parent = (a, b) => {
  for (let parent of a.parents) {
    if (compare_constraints(b, parent) == 0) {
      return true;
    }
  }
  return false;
};
const remove_constraint = (constraint_map, constraint) => {
  for (let [x, y] of constraint.tiles) {
    constraint_map[y][x] = constraint_map[y][x].filter(c => compare_constraints(c, constraint) != 0);
  }
};
const update_constraint_map = (level, constraint_map, tiles) => {
  for (let [x, y] of tiles) {
    let deductions = [];
    let remove = [];
    for (let constraint of constraint_map[y][x]) {
      let updated_constraint = {
        min: constraint.min,
        max: constraint.max,
        tiles: []
      };
      for (let tile of constraint.tiles) {
        let [tx, ty] = tile;
        if (['Y', 'H', 'N'].includes(level[ty][tx])) {
          if (level[ty][tx] == 'Y') {
            updated_constraint.min = Math.max(0, updated_constraint.min - 1);
            updated_constraint.max = Math.max(0, updated_constraint.max - 1);
          }
        } else {
          updated_constraint.tiles.push(tile);
        }
      }
      if (is_deduction(updated_constraint)) {
        deductions.push(constraint);
        remove.push(constraint);
      } else if (is_useless(constraint)) {
        remove.push(constraint);
      } else {
        constraint.min = updated_constraint.min;
        constraint.max = updated_constraint.max;
        constraint.tiles = updated_constraint.tiles;
      }
    }
    for (let constraint of remove) {
      remove_constraint(constraint_map, constraint);
    }
    for (let constraint of deductions) {
      update_constraint_map(level, constraint_map, constraint.tiles);
    }
  }
};
const merge_constraints = (constraint_map, constraint) => {
  // console.log('merge');
  const a = constraint;
  let current_constraints = get_constraints(constraint_map, constraint.tiles);
  for (const b of current_constraints) {
    if (compare_constraints(a, b) == 0) {
      return [];
    }
  }
  // for(const [x, y] of a.tiles){
  //     constraint_map[y][x].push(a);
  // }
  let new_constraints = [constraint];
  for (const b of current_constraints) {
    if (!is_parent(a, b)) {
      const [ct, at, bt] = split_tile_lists(a.tiles, b.tiles);
      const c_constraint = {
        tiles: ct,
        min: Math.max(a.min - at.length, b.min - bt.length, 0),
        max: Math.min(ct.length, a.max, b.max),
        parents: [...a.parents, ...b.parents]
      };
      const a_constraint = {
        tiles: at,
        min: Math.max(a.min - c_constraint.max, 0),
        max: Math.min(at.length, a.max - c_constraint.min),
        parents: a.parents
      };
      const b_constraint = {
        tiles: bt,
        min: Math.max(b.min - c_constraint.max, 0),
        max: Math.min(bt.length, b.max - c_constraint.min),
        parents: b.parents
      };
      for (let constraint of [a_constraint, b_constraint, c_constraint]) {
        if (!is_useless(constraint)) {
          new_constraints.push(constraint);
        }
      }
    }
  }
  console.log(new_constraints);
  return new_constraints;
};
const is_solved = level => {
  let count = 0;
  for (let [x, y] of get_tiles(level)) {
    let v = level[y][x];
    if (['y', 'n', 'h'].includes(v)) {
      count += 1;
    }
  }
  ;
  return count == 0;
};
export const start_generation = (level_layout, rng) => {
  const level = random_fill_level(level_layout, rng);
  const clues = generate_clues(level, rng);
  // const level = [
  //     ['y', 'y', 'X'],
  //     ['y', 'n', 'n'],
  //     ['r', 'y', 'n'],
  // ];
  // const clues = [
  //     ['N', 2, 1],
  //     ['R', 0, 2],
  //     ['N', 1, 1],
  // ]

  const constraint_map = Array(level_layout.length);
  for (let i = 0; i < constraint_map.length; i++) {
    constraint_map[i] = Array(level_layout[i].length);
    for (let j = 0; j < level_layout[i].length; j++) {
      constraint_map[i][j] = [];
    }
  }
  return [level, constraint_map, clues];
};
export const generation_step = (level, constraint_map, clues, start_clue) => {
  // console.log('step');
  let current_clue = start_clue;
  let used_clue = null;
  let new_constraints = [];
  while (used_clue == null && current_clue < clues.length) {
    let [cv, cx, cy] = clues[current_clue];
    switch (cv) {
      case 'Y':
        if (level[cy][cx] == 'y') {
          used_clue = clues[current_clue];
          update_constraint_map(level, constraint_map, reveal_and_propagate(level, [[cx, cy]]));
          break;
        }
      case 'H':
      case 'N':
        if (['h', 'n'].includes(level[cy][cx])) {
          used_clue = clues[current_clue];
          update_constraint_map(level, constraint_map, reveal_and_propagate(level, [[cx, cy]]));
          if (cv == 'N') {
            let count = 0;
            let constraint_tiles = [];
            for (let [nx, ny] of get_neighbours(level, cx, cy)) {
              let nv = level[ny][nx];
              if (['y', 'n', 'h'].includes(nv)) {
                if (nv == 'y') {
                  count += 1;
                }
                constraint_tiles.push([nx, ny]);
              }
            }
            let constraint = {
              tiles: constraint_tiles,
              min: count,
              max: count
            };
            constraint.parents = [constraint];
            new_constraints = [...new_constraints, ...merge_constraints(constraint_map, constraint)];
          }
        }
        break;
      case 'L':
      case 'R':
      case 'U':
        let count_blue = 0;
        let count_black = 0;
        let constraint_tiles = [];
        for (let [lx, ly] of get_line(level, cx, cy, cv)) {
          let lv = level[ly][lx];
          if (lv == 'y') {
            count_blue += 1;
            constraint_tiles.push([lx, ly]);
          }
          if (lv == 'n' || lv == 'h') {
            count_black += 1;
            constraint_tiles.push([lx, ly]);
          }
        }
        if (count_blue > 0 || count_black > 0) {
          let constraint = {
            tiles: constraint_tiles,
            min: count_blue,
            max: count_blue
          };
          level[cy][cx] = cv;
          constraint.parents = [constraint];
          used_clue = clues[current_clue];
          new_constraints = [...new_constraints, ...merge_constraints(constraint_map, constraint)];
        }
        break;
    }
    for (const constraint of new_constraints) {
      if (is_deduction(constraint)) {
        console.log("deduction", constraint);
        update_constraint_map(level, constraint_map, reveal_and_propagate(level, constraint.tiles));
      } else {
        for (let [x, y] of constraint.tiles) {
          constraint_map[y][x].push(constraint);
        }
      }
    }
    current_clue += 1;
  }
  return [used_clue, current_clue];
};
export const generate_level = (level_layout, rng) => {
  let [level, constraint_map, clues] = start_generation(level_layout, rng);
  const level_copy = level.map(line => line.map(tile => tile));
  let current_clue = 0;
  let new_constraints = [];
  let used_clues = [];
  let used_clue = null;
  // phase 1
  while (current_clue < clues.length && !is_solved(level)) {
    [used_clue, current_clue] = generation_step(level, constraint_map, clues, current_clue);
    if (used_clue != null) {
      used_clues.push(used_clue);
    }
  }
  // phase 2
  level = level_copy.map(line => line.map(tile => tile));
  for (let line of constraint_map) {
    let i = 0;
    while (i < line.length) {
      line[i] = [];
      i++;
    }
  }
  current_clue = 0;
  clues = used_clues.reverse();
  used_clues = [];
  used_clue = null;
  while (current_clue < clues.length && !is_solved(level)) {
    [used_clue, current_clue] = generation_step(level, constraint_map, clues, current_clue);
    if (used_clue != null) {
      used_clues.push(used_clue);
    }
  }
  // for(let [cv, cx, cy] of clues.slice(0, current_clue)){
  console.log(used_clues);
  for (let [cv, cx, cy] of used_clues) {
    if (['Y', 'N', 'H'].includes(cv)) {
      level_copy[cy][cx] = cv;
      // reveal_and_propagate(level_copy, [[cx, cy]]);
    } else {
      level_copy[cy][cx] = cv;
      // reveal_known_line(level_copy, cx, cy);
    }
  }

  return level_copy;
};