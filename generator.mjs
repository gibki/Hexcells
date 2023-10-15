import { integer, real, shuffle, pick } from 'https://cdn.skypack.dev/random-js';
import { get_tiles, is_solved, get_tiles_empty, get_neighbours_empty, get_neighbours_candidates, get_line_headers, get_line_empty, level_to_string } from './level.mjs';
const generate_hexagonal_layout = rng => {
  let size = integer(4, 6)(rng);
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
const generate_triangle_layout = rng => {
  let size = integer(7, 10)(rng);
  const level_layout = Array(size + 2);
  for (let i of Array(size + 2).keys()) {
    level_layout[i] = Array(size + 2);
    for (let j of Array(size + 2).keys()) {
      level_layout[i][j] = 'X';
    }
  }
  for (let i of Array(size).keys()) {
    for (let j of Array(size - i).keys()) {
      level_layout[i + 1][j + 1] = ' ';
    }
  }
  for (let i of Array(size).keys()) {
    level_layout[0][i + 1] = 'l';
    level_layout[i + 1][0] = 'r';
    level_layout[size + 1 - i][i + 2] = 'u';
    if (i < size - 1) {
      level_layout[size - i][i + 2] = 'u';
    }
  }
  return level_layout;
};
const generate_diamond_layout = rng => {
  let size = integer(6, 8)(rng);
  const level_layout = Array(size + 2);
  for (let i of Array(size + 2).keys()) {
    level_layout[i] = Array(size + 2);
    for (let j of Array(size + 2).keys()) {
      level_layout[i][j] = 'X';
    }
  }
  for (let i of Array(size).keys()) {
    for (let j of Array(size).keys()) {
      level_layout[i + 1][j + 1] = ' ';
    }
  }
  for (let i of Array(size).keys()) {
    level_layout[0][i + 1] = 'l';
    level_layout[i + 1][0] = 'r';
    level_layout[size + 1 - i][size + 1] = 'u';
    level_layout[size + 1][size + 1 - i] = 'u';
  }
  return level_layout;
};
const generate_square_layout = rng => {
  const level_layout = Array(size + 2);
  for (let i of Array(size + 2).keys()) {
    level_layout[i] = Array(size + 2);
    for (let j of Array(size + 2).keys()) {
      level_layout[i][j] = 'X';
    }
  }
  for (let i of Array(size).keys()) {
    for (let j of Array(size - i).keys()) {
      level_layout[i + 1][j + 1] = ' ';
    }
  }
  for (let i of Array(size).keys()) {
    level_layout[0][i + 1] = 'l';
    level_layout[i + 1][0] = 'r';
    level_layout[size + 1 - i][i + 2] = 'u';
    if (i < size - 1) {
      level_layout[size - i][i + 2] = 'u';
    }
  }
  return level_layout;
};
const get_random_layout = rng => {
  return pick(rng, [generate_hexagonal_layout, generate_diamond_layout, generate_triangle_layout
  // generate_square_layout
  ])(rng);
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
const get_seed_constraint = (level, rng) => {
  let candidate_tiles = get_tiles(level).filter(([x, y]) => ['H', 'T'].includes(level[y][x]) && get_neighbours_empty(level, x, y) > 0);
  if (candidate_tiles.length == 0) {
    candidate_tiles = get_tiles_empty(level);
  }
  let candidates = candidate_tiles.map(([x, y]) => {
    let v = level[y][x];
    let tiles = [];
    switch (v) {
      case ' ':
      case 'H':
      case 'T':
        tiles = get_neighbours_empty(level, x, y);
        break;
      case 'l':
      case 'r':
      case 'u':
        tiles = get_line_empty(level, x, y, v);
        break;
    }
    return {
      x: x,
      y: y,
      tiles: tiles
    };
  });
  let non_trivial_candidates = candidates.filter(t => t.tiles.length > 1);
  let chosen, value;
  if (non_trivial_candidates.length > 0) {
    chosen = pick(rng, non_trivial_candidates);
    value = integer(1, chosen.tiles.length - 1)(rng);
  } else {
    chosen = pick(rng, candidates);
    value = integer(0, 1)(rng) * chosen.tiles.length;
  }
  chosen.min = value;
  chosen.max = value;
  return chosen;
};
const get_unique_tiles = tiles => {
  tiles = tiles.sort(([ax, ay], [bx, by]) => {
    if (ax == bx) {
      return ay - by;
    }
    return ax - bx;
  });
  let unique_tiles = tiles.slice(0, 1);
  let i = 1;
  while (i < tiles.length) {
    let [ax, ay] = tiles[i - 1];
    let [bx, by] = tiles[i];
    if (ax != bx || ay != by) {
      unique_tiles.push(tiles[i]);
    }
    i += 1;
  }
  return unique_tiles;
};
const get_updated_constraint = (level, constraint) => {
  let updated = {
    x: constraint.x,
    y: constraint.y,
    min: constraint.min,
    max: constraint.max,
    tiles: constraint.tiles.filter(([x, y]) => level[y][x] == ' ')
  };
  for (let [x, y] of constraint.tiles) {
    if (['T', 'Y'].includes(level[y][x])) {
      updated.min -= 1;
      updated.max -= 1;
    }
  }
  return updated;
};
const compare_constraints = (a, b) => {
  if (a.min != b.min) {
    return a.min - b.min;
  }
  if (a.max != b.max) {
    return a.max - b.max;
  }
  if (a.tiles.length != b.tiles.length) {
    return a.tiles.length - b.tiles.length;
  }
  for (let i of Array(a.tiles.length).keys()) {
    let [ax, ay] = a.tiles[i];
    let [bx, by] = b.tiles[i];
    if (ax != bx) {
      return ax - bx;
    }
    if (ay != by) {
      return ay - by;
    }
  }
  return 0;
};
const is_useless = constraint => constraint.tiles.length == 0 || constraint.min == 0 && constraint.max == constraint.tiles.length;
const is_deduction = constraint => constraint.tiles.length > 0 && (constraint.max == 0 || constraint.min == constraint.tiles.length);
const is_contradiction = constraint => constraint.max < 0 || constraint.min > constraint.tiles.length;
const cross_constraints = (a, b) => {
  if (!compare_constraints(a, b)) {
    return [];
  }
  let [ct, at, bt] = split_tile_lists(a.tiles, b.tiles);
  if (ct.length == 0) {
    return [];
  }
  const c_constraint = {
    tiles: ct,
    min: Math.max(a.min - at.length, b.min - bt.length, 0),
    max: Math.min(ct.length, a.max, b.max)
  };
  const a_constraint = {
    tiles: at,
    min: Math.max(a.min - c_constraint.max, 0),
    max: Math.min(at.length, a.max - c_constraint.min)
  };
  const b_constraint = {
    tiles: bt,
    min: Math.max(b.min - c_constraint.max, 0),
    max: Math.min(bt.length, b.max - c_constraint.min)
  };
  // if(c_constraint.min > c_constraint.max || a_constraint.min > a_constraint.max || b_constraint.min > b_constraint.max){
  //     throw new MergeError();
  // }
  return [a_constraint, c_constraint, b_constraint].filter(c => !is_useless(c));
};
const update_constraints = (level, constraints) => {
  let new_constraints = [];
  let deductions = [];
  for (let c of constraints) {
    let updated_constraint = get_updated_constraint(level, c);
    if (!is_useless(updated_constraint)) {
      if (is_deduction(updated_constraint) || is_contradiction(updated_constraint)) {
        deductions.push(updated_constraint);
      } else {
        new_constraints.push(updated_constraint);
      }
    }
  }
  for (let d of deductions) {
    if (!is_contradiction(d)) {
      for (let [x, y] of d.tiles) {
        if (d.min == 0) {
          level[y][x] = 'H';
        } else {
          level[y][x] = 'T';
        }
      }
    }
  }
  if (deductions.length > 0) {
    let new_deductions;
    [new_deductions, new_constraints] = update_constraints(level, new_constraints);
    return [[...deductions, ...new_deductions], new_constraints];
  }
  return [[], new_constraints];
};
const merge_constraint = (level, current_constraints, new_constraint) => {
  new_constraint = get_updated_constraint(level, new_constraint);
  if (is_useless(new_constraint)) {
    return [[], current_constraints];
  }
  if (is_deduction(new_constraint)) {
    current_constraints.push(new_constraint);
    return update_constraints(level, current_constraints);
  }
  let is_relevant = true;
  for (let c of current_constraints) {
    is_relevant = is_relevant && compare_constraints(new_constraint, c);
  }
  let deductions = [];
  if (is_relevant) {
    let to_add = [];
    for (let c of current_constraints) {
      to_add = [...to_add, ...cross_constraints(new_constraint, c)];
    }
    current_constraints.push(new_constraint);
    for (let c of to_add) {
      let [new_deductions, new_constraints] = merge_constraint(level, current_constraints, c);
      deductions = [...deductions, ...new_deductions];
      current_constraints = new_constraints;
    }
  }
  return [deductions, current_constraints];
};
const reveal = (level, x, y) => {
  switch (level[y][x]) {
    case ' ':
      level[y][x] = 'N';
      return [[x, y]];
      break;
    case 'H':
      level[y][x] = 'N';
      break;
    case 'T':
      level[y][x] = 'Y';
      break;
    case 'l':
    case 'r':
    case 'u':
      level[y][x] = level[y][x].toUpperCase();
      return [[x, y]];
      break;
  }
  return [];
};
const calculate_constraint_type = (level, constraints, constraint) => {
  let tile_type;
  if (['H', 'T'].includes(level[constraint.y][constraint.x])) {
    tile_type = "reveal";
  } else {
    tile_type = "direct";
  }
  let constraint_type;
  if (is_deduction(constraint)) {
    constraint_type = 'trivial';
  } else {
    let level_copy = copy_level(level);
    reveal(level_copy, constraint.x, constraint.y);
    let constraints_copy = constraints.map(c => get_updated_constraint(level_copy, c));
    let found_trivial = false;
    let found_contradiction = false;
    for (let c of constraints_copy) {
      if (is_deduction(c)) {
        found_trivial = true;
      }
      if (is_contradiction(c)) {
        found_contradiction = true;
      }
    }
    if (found_contradiction) {
      constraint_type = 'contradiction';
    } else if (found_trivial) {
      constraint_type = 'trivial';
    } else {
      let [deductions, merged_constraints] = merge_constraint(level_copy, constraints_copy, constraint);
      let found_deduction = false;
      let found_contradiction = false;
      for (let d of deductions) {
        if (is_deduction(d)) {
          found_deduction = true;
        }
        if (is_contradiction(d)) {
          found_contradiction = true;
        }
      }
      if (found_contradiction) {
        constraint_type = 'contradiction';
      } else {
        if (found_deduction) {
          constraint_type = 'deduction';
        } else {
          constraint_type = 'constraint';
        }
      }
    }
  }
  return {
    constraint: constraint,
    tile: tile_type,
    type: constraint_type
  };
};
const generate_candidate_constraints = (level, constraint) => {
  let constraint_current = get_updated_constraint(level, constraint);
  let candidates = [];
  for (let [tx, ty] of constraint_current.tiles) {
    candidates = [...candidates, ...get_neighbours_candidates(level, tx, ty), ...get_line_headers(level, tx, ty)];
  }
  candidates = get_unique_tiles(candidates);
  let output = [];
  for (let candidate of candidates) {
    let [x, y] = candidate;
    let cv = level[y][x];
    let tiles;
    switch (cv) {
      case ' ':
      case 'H':
      case 'T':
        tiles = get_neighbours_empty(level, x, y);
        break;
      case 'l':
      case 'r':
      case 'u':
        tiles = get_line_empty(level, x, y, cv.toUpperCase());
        break;
    }
    if (tiles.length > 0) {
      for (let value of Array(tiles.length + 1).keys()) {
        output.push({
          x: x,
          y: y,
          min: value,
          max: value,
          tiles: tiles
        });
      }
    }
  }
  return output;
};
const copy_level = level => level.map(line => line.map(tile => tile));
const pick_constraint = (typed_constraints, rng) => {
  let chosen_type;
  let reveal_deductions = typed_constraints.filter(c => c.tile == 'reveal' && c.type == 'deduction').map(c => c.constraint);
  let direct_deductions = typed_constraints.filter(c => c.tile == 'direct' && c.type == 'deduction').map(c => c.constraint);
  let reveal_constraints = typed_constraints.filter(c => c.tile == 'reveal' && c.type == 'constraint').map(c => c.constraint);
  let direct_constraints = typed_constraints.filter(c => c.tile == 'direct' && c.type == 'constraint').map(c => c.constraint);
  if (reveal_deductions.length + direct_deductions.length + reveal_constraints.length + direct_constraints.length > 0) {
    const DEDUCTION_CHANCE = 0.75;
    let flip = real(0, 1, true)(rng) < DEDUCTION_CHANCE;
    if (flip && reveal_deductions.length + direct_deductions.length > 0 || reveal_constraints.length + direct_constraints.length == 0) {
      if (reveal_deductions.length > 0) {
        chosen_type = reveal_deductions;
      } else {
        chosen_type = direct_deductions;
      }
    } else {
      if (reveal_constraints.length > 0) {
        chosen_type = reveal_constraints;
      } else {
        chosen_type = direct_constraints;
      }
    }
  } else {
    let reveal_fallbacks = typed_constraints.filter(c => c.tile == 'reveal' && c.type == 'trivial').map(c => c.constraint);
    let direct_fallbacks = typed_constraints.filter(c => c.tile == 'direct' && c.type == 'trivial').map(c => c.constraint);
    if (reveal_fallbacks.length > 0) {
      chosen_type = reveal_fallbacks;
    } else {
      chosen_type = direct_fallbacks;
    }
  }
  return pick(rng, chosen_type);
};
const constraints_to_string = constraints => {
  return constraints.map(c => [c.min, "[", c.x, c.y, "]", clues_to_string(c.tiles)].join(' ')).join(' ');
};
const clues_to_string = clues => {
  return clues.map(([x, y]) => "[" + x + " " + y + "]").join(" ");
};
export const generate_level = rng => {
  let level = get_random_layout(rng);
  // log_level(level);
  let used_clues = [];
  let constraints = [];
  let deductions;
  let steps = 0;
  while (!is_solved(level)) {
    // while(steps < 3){
    steps += 1;
    let chosen_constraint;
    if (constraints.length == 0) {
      chosen_constraint = get_seed_constraint(level, rng);
    } else {
      let parent_constraint = constraints.slice(-1)[0];
      let candidates = generate_candidate_constraints(level, parent_constraint).map(c => calculate_constraint_type(level, constraints, c));
      chosen_constraint = pick_constraint(candidates, rng);
    }
    used_clues = [...used_clues, ...reveal(level, chosen_constraint.x, chosen_constraint.y)];
    [deductions, constraints] = merge_constraint(level, constraints, chosen_constraint);
    console.log(constraints_to_string(constraints));
    console.log(clues_to_string(used_clues));
    console.log(level_to_string(level));
  }
  level = level.map(line => line.map(tile => {
    if (tile != 'X') {
      return tile.toLowerCase();
    }
    return tile;
  }));
  console.log(level_to_string(level));
  for (let [cx, cy] of used_clues) {
    level[cy][cx] = level[cy][cx].toUpperCase();
  }
  console.log(level_to_string(level));
  return level;
};