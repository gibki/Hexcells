import React from 'https://cdn.skypack.dev/react';
import { render } from 'https://cdn.skypack.dev/react-dom';
import { BrowserRouter, Routes, Route } from 'https://cdn.skypack.dev/react-router-dom';
import { MersenneTwister19937 } from 'https://cdn.skypack.dev/random-js';
import { SVGDisplay } from './svg.mjs';
import { generate_level } from './generator.mjs';
import { calculate_line_count, calculate_neighbour_count, hide_line_clues, get_tiles, get_level_bounds } from './level.mjs';
const rng = MersenneTwister19937.autoSeed();
const DEFAULT_SEED = Math.abs(rng.next());
let seeded_rng = MersenneTwister19937.seed(DEFAULT_SEED);
let level = generate_level(seeded_rng);
let DEBUG_LEVEL = false;
const HEX_ANGLE = 2.0 * Math.PI / 6.0;
const HEX_RATIO = Math.sqrt(3) / 2.0;
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
const calculate_hex_dimensions = (level, [_, __, width, height]) => {
  let width_ratio = 1,
    height_ratio = 1;
  if (width > height) {
    width_ratio = width / height;
  } else {
    height_ratio = height / width;
  }
  let [top, left, bottom, right] = get_level_bounds(level);
  // console.log(top, bottom, left, right);
  const fit_width = ((right - left + 1) * 3 + 1) / 4 + 0.75;
  const fit_height = (bottom - top + 2) / 2 + 1;
  // console.log(fit_width, fit_height);
  const max_hex_r_wide = width_ratio / fit_width;
  const max_hex_r_tall = height_ratio / (fit_height * HEX_RATIO);
  // console.log(max_hex_r_wide, max_hex_r_tall);
  const hex_r = Math.min(max_hex_r_wide, max_hex_r_tall);
  const hex_dx = hex_r * 3.0 / 2.0;
  const hex_dy = hex_r * HEX_RATIO;
  // console.log(hex_r, hex_dx, hex_dy);
  // // console.log(hex_r, hex_dx, hex_dy);
  // const start_x = - (fit_width) * hex_dx / 2;
  const start_x = -(left + right) / 2 * hex_dx;
  const start_y = (top + bottom) / 2 * hex_dy;
  // console.log(start_x, start_y);
  return [hex_r, hex_dx, hex_dy, start_x, start_y];
};
const calculate_screen_space_dimensions = ([hex_r, hex_dx, hex_dy, start_x, start_y], [left, top, width, height]) => {
  const scale = Math.min(width, height) / 2;
  return [hex_r * scale, hex_dx * scale, hex_dy * scale, left + width / 2 + start_x * scale, top + height / 2 - start_y * scale];
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
            case 'T':
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
const parse_labels = (level, [hex_r, hex_dx, hex_dy, start_x, start_y]) => {
  const labels = [];
  for (let [x, y] of get_tiles(level)) {
    let v = level[y][x];
    let label = null;
    let color = "black";
    switch (v) {
      case 'Y':
      case 'N':
        let remaining_count = calculate_neighbour_count(level, x, y, ['y', 't']);
        if (remaining_count == 0) {
          if (calculate_neighbour_count(level, x, y, ['n', 'h']) != 0) {
            label = 0;
          }
        } else {
          label = remaining_count;
        }
        color = "white";
        break;
      case 'L':
      case 'R':
      case 'U':
        label = calculate_line_count(level, x, y, v, ['y', 't']);
        break;
    }
    if (label != null) {
      labels.push({
        x: start_x + x * hex_dx - y * hex_dx,
        y: start_y + x * hex_dy + y * hex_dy,
        r: hex_r * HEX_RATIO,
        label: label,
        color: color
      });
    }
  }
  return labels;
};
const App = () => {
  const [seed, setSeed] = React.useState("" + DEFAULT_SEED);
  const [refresh, forceRefresh] = React.useState(true);
  const [displayDimensions, setDisplayDimensions] = React.useState([0, 0, 1, 1]);
  const generate = () => {
    const numerical_seed = parseInt(seed, 10) || DEFAULT_SEED;
    seeded_rng = MersenneTwister19937.seed(numerical_seed);
    level = generate_level(seeded_rng);
    forceRefresh(!refresh);
  };
  const dimensions = calculate_hex_dimensions(level, displayDimensions);
  const screen_space_dimensions = calculate_screen_space_dimensions(dimensions, displayDimensions);
  const parsed_level = parse_level(level, dimensions);
  const parsed_labels = parse_labels(level, screen_space_dimensions);
  const [hex_r, hex_dx, hex_dy, start_x, start_y] = dimensions;
  const handleClick = e => {
    // console.log(e);
    const boardX = e.x - start_x;
    const boardY = start_y - e.y;
    const x = Math.round((boardX + boardY * hex_dx / hex_dy) / (2 * hex_dx));
    const y = Math.round((boardY - boardX * hex_dy / hex_dx) / (2 * hex_dy));
    // console.log(x, y);
    if (y >= 0 && y < level.length) {
      if (x >= 0 && x < level[y].length) {
        if (e.button == 0 && ['y', 't'].includes(level[y][x]) || e.button == 2 && ['n', 'h'].includes(level[y][x])) {
          level[y][x] = level[y][x].toUpperCase();
          hide_line_clues(level, x, y);
          forceRefresh(!refresh);
        } else {
          if (['y', 'n', 'h', 't'].includes(level[y][x])) {
            window.alert('Game Over');
          }
        }
      }
    }
    return false;
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "container-fluid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "col",
    style: {
      maxHeight: "100vh"
    }
  }, /*#__PURE__*/React.createElement(LevelView, {
    svg_elements: parsed_level,
    labels: parsed_labels,
    setDisplayDimensions: setDisplayDimensions,
    handleClick: handleClick
  })), /*#__PURE__*/React.createElement("div", {
    className: "col col-auto d-flex flex-column",
    style: {
      minHeight: "100vh",
      maxHeight: "100vh"
    }
  }, /*#__PURE__*/React.createElement("label", null, "Seed"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("input", {
    type: "text",
    onChange: e => setSeed(e.target.value),
    value: seed
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn btn-primary m-1",
    onClick: generate
  }, "Generate"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn btn-secondary m-1",
    onClick: () => setSeed("" + Math.abs(rng.next()))
  }, "Random Seed")))));
};
const LevelView = props => {
  const labels = props.labels || [];
  const svg_elements = props.svg_elements || [];
  const handleClick = props.handleClick || (() => {});
  const svgDisplayContainerRef = React.useRef();
  const onClickTransform = e => {
    e.preventDefault();
    if (svgDisplayContainerRef.current != null) {
      const rect = svgDisplayContainerRef.current.getBoundingClientRect();
      const screenDx = e.pageX - rect.x - rect.width / 2;
      const screenDy = -1 * (e.pageY - rect.y - rect.height / 2);
      // console.log(screenDx, screenDy);
      const scale = Math.min(rect.width, rect.height) / 2;
      const x = screenDx / scale;
      const y = screenDy / scale;
      // console.log(x, y);
      return handleClick({
        x: x,
        y: y,
        button: e.button
      });
    }
    return false;
  };
  const resizeHandler = () => {
    if (svgDisplayContainerRef.current != null) {
      let rect = svgDisplayContainerRef.current.getBoundingClientRect();
      props.setDisplayDimensions([rect.x, rect.y, rect.width, rect.height]);
    }
  };
  React.useEffect(() => {
    window.addEventListener("resize", resizeHandler);
    resizeHandler();
  }, []);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    ref: svgDisplayContainerRef,
    onClick: onClickTransform,
    onContextMenu: onClickTransform,
    style: {
      height: "100%"
    }
  }, /*#__PURE__*/React.createElement(SVGDisplay, {
    elements: svg_elements
  })), labels.map(hex => {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        color: hex.color,
        left: hex.x - hex.r,
        top: hex.y - hex.r,
        width: 2 * hex.r,
        height: 2 * hex.r,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        cursor: "default"
      }
    }, /*#__PURE__*/React.createElement("a", null, hex.label));
  }));
};
render( /*#__PURE__*/React.createElement(BrowserRouter, {
  basename: "Hexcells"
}, /*#__PURE__*/React.createElement(Routes, null, /*#__PURE__*/React.createElement(Route, {
  path: "/",
  element: /*#__PURE__*/React.createElement(App, null)
}))), document.getElementById('app'));