import React from 'https://cdn.skypack.dev/react';
export const SVGDisplay = props => {
  const resolution = props.resolution || 5000;
  const backgroundColor = props.backgroundColor || "#EEEEEE";
  const elements = props.elements || [];
  return /*#__PURE__*/React.createElement("svg", {
    preserveAspectRatio: "xMidYMid meet",
    width: "100%",
    height: "100%",
    style: {
      backgroundColor: backgroundColor
    },
    viewBox: "0 0 " + 2 * resolution + " " + 2 * resolution
  }, elements.map(element => {
    switch (element.type) {
      case 'circle':
        {
          return /*#__PURE__*/React.createElement("circle", {
            cx: resolution * (element.x + 1),
            cy: resolution * (1 - element.y),
            r: resolution * element.r
          });
        }
      case 'polygon':
        return /*#__PURE__*/React.createElement("polygon", {
          points: element.points.map(([x, y]) => [resolution * (x + 1), resolution * (1 - y)].join(",")).join(","),
          style: {
            fill: element.fill || "white",
            stroke: element.stroke || "grey",
            strokeWidth: resolution * (element.borderWidth || 0.008)
          }
        });
      default:
        break;
    }
  }));
};