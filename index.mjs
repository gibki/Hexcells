import React from 'https://cdn.skypack.dev/react';
import { render } from 'https://cdn.skypack.dev/react-dom';
import { BrowserRouter, Routes, Route } from 'https://cdn.skypack.dev/react-router-dom';
import { MersenneTwister19937 } from 'https://cdn.skypack.dev/random-js';
import { SVGDisplay } from './svg.mjs';
import { generate_hexagonal_layout, generate_level, start_generation, generation_step } from './generator.mjs';
import { calculate_line_count, reveal_and_propagate, calculate_neighbour_count, apply_clues, hide_line_clues, get_tiles } from './level.mjs';
const rng = MersenneTwister19937.autoSeed();
let seeded_rng = MersenneTwister19937.seed(0);
let DEBUG_LEVEL = false;
const HEX_ANGLE = 2.0 * Math.PI / 6.0;
const createHexPoints = (x, y, scale) => {
  return [...Array(6).keys()].map(index => {
    return [x + Math.cos(index * HEX_ANGLE) * scale, y + Math.sin(index * HEX_ANGLE) * scale];
  });
};
const createArrowPoints = (x, y, scale, angle) => {
  const point_length = 0.6;
  const arm_lenght = 0.5;
  const arm_angle = Math.PI / 12;
  return [[x + Math.cos(angle) * point_length * scale, y + Math.sin(angle) * point_length * scale], [x + Math.cos(angle + arm_angle) * arm_lenght * scale, y + Math.sin(angle + arm_angle) * arm_lenght * scale], [x + Math.cos(angle - arm_angle) * arm_lenght * scale, y + Math.sin(angle - arm_angle) * arm_lenght * scale]];
};
const calculate_hex_dimensions = level => {
  let [top, left, bottom, right] = [Number.MAX_VALUE, Number.MAX_VALUE, 0, 0];
  for (let [x, y] of get_tiles(level)) {
    top = Math.min(x + y, top);
    bottom = Math.max(x + y, bottom);
    left = Math.min(x - y, left);
    right = Math.max(x - y, right);
  }
  // // console.log(top, bottom, left, right);
  const max_hex_r_wide = 1 / (0.75 * (right - left) + 1);
  const max_hex_r_tall = 4 / (Math.sqrt(3) * (bottom - top + 2));
  const hex_r = Math.min(max_hex_r_tall, max_hex_r_wide);
  const hex_dx = hex_r * 3.0 / 2.0;
  const hex_dy = hex_r / 2.0 * Math.sqrt(3);
  // // console.log(hex_r, hex_dx, hex_dy);
  const start_x = (-left - right) * hex_r / 2;
  const start_y = (bottom - top + 2) * hex_dy / 2;
  return [hex_r, hex_dx, hex_dy, start_x, start_y];
};
const parse_level = (level, [hex_r, hex_dx, hex_dy, start_x, start_y]) => {
  const primitives = [];
  let y = 0;
  while (y < level.length) {
    let x = 0;
    let line = level[y];
    while (x < line.length) {
      let v = line[x];
      if (!['X', 'l', 'r', 'u'].includes(v)) {
        if (['L', 'R', 'U'].includes(v)) {
          let angle;
          switch (v) {
            case 'U':
              angle = Math.PI / 2;
              break;
            case 'L':
              angle = 7 * Math.PI / 6;
              break;
            case 'R':
              angle = 11 * Math.PI / 6;
              break;
          }
          primitives.push({
            type: 'polygon',
            points: createArrowPoints(start_x + x * hex_dx - y * hex_dx, start_y - x * hex_dy - y * hex_dy, hex_r, angle),
            fill: 'grey'
          });
        } else {
          let hex = {
            type: 'polygon',
            points: createHexPoints(start_x + x * hex_dx - y * hex_dx, start_y - x * hex_dy - y * hex_dy, hex_r)
          };
          switch (v) {
            case 'Y':
              hex.fill = "blue";
              break;
            case 'N':
            case 'H':
              hex.fill = "black";
              break;
            case 'y':
              if (DEBUG_LEVEL) {
                hex.fill = "lightblue";
              } else {
                hex.fill = "white";
              }
              break;
            case 'n':
            case 'h':
              if (DEBUG_LEVEL) {
                hex.fill = "gray";
              } else {
                hex.fill = "white";
              }
              break;
            default:
              hex.fill = "white";
          }
          primitives.push(hex);
        }
      }
      x += 1;
    }
    y += 1;
  }
  return primitives;
};
const parse_labels = level => {
  const labels = [];
  for (let [x, y] of get_tiles(level)) {
    let v = level[y][x];
    let label = null;
    let color = "black";
    switch (v) {
      case 'N':
        let remaining_count = calculate_neighbour_count(level, x, y, 'y');
        if (remaining_count == 0) {
          if (calculate_neighbour_count(level, x, y, 'n') + calculate_neighbour_count(level, x, y, 'h') != 0) {
            label = 0;
          }
        } else {
          label = remaining_count;
        }
        color = "white";
        break;
      case 'H':
        if (calculate_neighbour_count(level, x, y, 'y') + calculate_neighbour_count(level, x, y, 'n') + calculate_neighbour_count(level, x, y, 'h') != 0) {
          label = '?';
        }
        color = "white";
        break;
      case 'L':
      case 'R':
      case 'U':
        label = calculate_line_count(level, x, y, v);
        break;
    }
    if (label != null) {
      labels.push({
        x: x,
        y: y,
        label: label,
        color: color
      });
    }
  }
  return labels;
};
let level_layout = generate_hexagonal_layout(2);
// const level_layout = [
//     ['X', 'l', 'l', 'l', 'l', 'X'],
//     ['r', ' ', ' ', ' ', ' ', 'X'],
//     ['r', ' ', ' ', ' ', ' ', 'u'],
//     ['X', 'X', 'u', 'u', 'u', 'u'],
// ]
let level = generate_level(level_layout, seeded_rng);
let constraint_map, clues;
let used_clue, current_clue;
let used_clues;
let level_copy;
let pass;
const App = () => {
  const [rerender, forceRerender] = React.useState(false);
  const [seed, setSeed] = React.useState("0");
  const [size, setSize] = React.useState("2");
  const [[width, height], setSVGSize] = React.useState([0, 0]);
  const displayContainerRef = React.useRef();
  const resizeSVG = () => {
    // console.log('resizing');
    setSVGSize([0, 0]); // allow container div style to fill
    const rect = displayContainerRef.current.getBoundingClientRect();
    setSVGSize([rect.width, rect.height]);
  };
  const generate = () => {
    const numerical_seed = parseInt(seed, 10) || 0;
    setSeed("" + numerical_seed);
    seeded_rng = MersenneTwister19937.seed(numerical_seed);
    const numerical_size = parseInt(size, 10) || 4;
    level_layout = generate_hexagonal_layout(numerical_size);
    level = generate_level(level_layout, seeded_rng);
    DEBUG_LEVEL = false;
    forceRerender(!rerender);
  };
  React.useEffect(() => {
    // console.log('use effect');
    window.addEventListener('resize', resizeSVG);
    resizeSVG();
  }, []);
  const dimensions = calculate_hex_dimensions(level);
  const [hex_r, hex_dx, hex_dy, start_x, start_y] = dimensions; // world space
  const scale = Math.min(width, height) / 2;
  const [HEX_R, HEX_DX, HEX_DY, START_X, START_Y] = [
  // screen space
  hex_r * scale, hex_dx * scale, hex_dy * scale, width / 2 + start_x * scale, height / 2 - start_y * scale];
  const parsed_level = parse_level(level, dimensions);
  const labels = parse_labels(level);
  const handle_click = e => {
    // // console.log(e);
    const boardX = e.x - start_x;
    const boardY = start_y - e.y;
    const x = Math.round((boardX + boardY * hex_dx / hex_dy) / (2 * hex_dx));
    const y = Math.round((boardY - boardX * hex_dy / hex_dx) / (2 * hex_dy));
    // // console.log(x, y);
    if (y >= 0 && y < level.length) {
      if (x >= 0 && x < level[y].length) {
        if (e.button == 0 && level[y][x] == 'y' || e.button == 2 && (level[y][x] == 'n' || level[y][x] == 'h')) {
          // reveal_and_propagate(level, [[x, y]]);
          level[y][x] = level[y][x].toUpperCase();
          hide_line_clues(level, x, y);
          forceRerender(!rerender);
        } else {
          if (['y', 'n', 'h'].includes(level[y][x])) {
            window.alert('Game Over');
          }
        }
      }
    }
    return false;
  };
  const start = e => {
    const numerical_seed = parseInt(seed, 10) || 0;
    setSeed("" + numerical_seed);
    seeded_rng = MersenneTwister19937.seed(numerical_seed);
    const numerical_size = parseInt(size, 10) || 4;
    level_layout = generate_hexagonal_layout(numerical_size);
    [level, constraint_map, clues] = start_generation(level_layout, seeded_rng);
    level_copy = level.map(line => line.map(tile => tile));
    used_clue = false;
    used_clues = [];
    current_clue = 0;
    pass = 0;
    DEBUG_LEVEL = true;
    forceRerender(!rerender);
  };
  const step = e => {
    if (used_clue != null) {
      [used_clue, current_clue] = generation_step(level, constraint_map, clues, current_clue);
      forceRerender(!rerender);
    }
    if (used_clue == null) {
      if (pass == 0) {
        console.log('Phase 1 done');
        pass = 1;
        level = level_copy.map(line => line.map(tile => tile));
        for (let line of constraint_map) {
          let i = 0;
          while (i < line.length) {
            line[i] = [];
            i++;
          }
        }
        clues = used_clues.reverse();
        used_clues = [];
        current_clue = 0;
        used_clue = false;
        forceRerender(!rerender);
      } else {
        console.log('Phase 2 done');
        level = apply_clues(level_copy, used_clues);
        DEBUG_LEVEL = false;
        forceRerender(!rerender);
      }
    } else {
      used_clues.push(used_clue);
      console.log(used_clue);
    }
  };
  // // console.log(parsed_level);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "row"
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: displayContainerRef,
    style: {
      minHeight: "100vh",
      width: "100%"
    }
  }, /*#__PURE__*/React.createElement(SVGDisplay, {
    width: width,
    height: height,
    onClick: handle_click,
    elements: parsed_level
    // elements={[{
    //     type: "polygon",
    //     fill: "blue",
    //     points: [[0.0, 0.5], [0.5, 0.0], [-0.5, -0.5]],
    // }]}
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "150px",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("label", null, "Seed"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    onChange: e => setSeed(e.target.value),
    value: seed
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => setSeed("" + rng.next())
  }, "Random Seed"), /*#__PURE__*/React.createElement("label", null, "Size"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    onChange: e => setSize(e.target.value),
    value: size
  }), /*#__PURE__*/React.createElement("button", {
    onClick: generate
  }, "Generate Full"), /*#__PURE__*/React.createElement("button", {
    onClick: start
  }, "Start Generation"), /*#__PURE__*/React.createElement("button", {
    onClick: step
  }, "Generation Step")), labels.map(hex => {
    const screen_x = START_X + hex.x * HEX_DX - hex.y * HEX_DX - HEX_R / 2.0;
    const screen_y = START_Y + hex.x * HEX_DY + hex.y * HEX_DY - HEX_R / 2.0;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        color: hex.color,
        left: screen_x,
        top: screen_y,
        width: HEX_R,
        height: HEX_R,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        cursor: "default"
      }
    }, /*#__PURE__*/React.createElement("a", null, hex.label));
  }));
};
render( /*#__PURE__*/React.createElement(BrowserRouter, null, /*#__PURE__*/React.createElement(Routes, null, /*#__PURE__*/React.createElement(Route, {
  path: "/",
  element: /*#__PURE__*/React.createElement(App, null)
}))), document.getElementById('app'));