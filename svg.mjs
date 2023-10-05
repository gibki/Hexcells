import React from 'https://cdn.skypack.dev/react';
export const SVGDisplay = props => {
  const width = props.width || 100;
  const height = props.height || 100;
  const cx = width / 2;
  const cy = height / 2;
  const scale = Math.min(cx, cy);
  const onClick = props.onClick || (() => {});
  const onClickTransform = e => {
    e.preventDefault();
    return onClick({
      x: (e.pageX - cx) / scale,
      y: (cy - e.pageY) / scale,
      button: e.button
    });
  };
  return /*#__PURE__*/React.createElement("svg", {
    onClick: onClickTransform,
    onContextMenu: onClickTransform,
    width: width,
    height: height
    // width="100%"
    // height="100%"
    ,
    viewBox: "0 0 " + width + " " + height
  }, props.elements.map(element => {
    switch (element.type) {
      case 'circle':
        {
          return /*#__PURE__*/React.createElement("circle", {
            cx: cx + element.x * scale,
            cy: cy - element.y * scale,
            r: scale * element.r
          });
        }
      case 'polygon':
        return /*#__PURE__*/React.createElement("polygon", {
          points: element.points.map(([x, y]) => [cx + x * scale, cy - y * scale].join(",")).join(","),
          style: {
            fill: element.fill,
            stroke: "gray",
            strokeWidth: "4"
          }
        });
      default:
        break;
    }
  }));
};