import { Color } from "tns-core-modules/color";

export function hslaColorToCssValue(value) {
  if (!value) {
    return 'rgba(255, 255, 255, 1)';
  }
  const { r, g, b, a } = convertHslaColorToRgbaColor(value);

  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function lightenOrDarkenHslaColor(hslaColor, percent = 15) {
    const color = { ...hslaColor };
    const rgbaColor = convertHslaColorToRgbaColor(color);

    color.l = isDarkBetterForContrastWith(rgbaColor)
        ? Math.max(0, color.l - percent)
        : Math.min(100, color.l + percent);

    return color;
}

export function convertHslaColorToRgbaColor(hslaColor) {
    const { h, s, l, a } = hslaColor;
    const [r, g, b] = convertHslToRgb(h, s / 100, l / 100);

    return { r, g, b, a };
}

export function isDarkBetterForContrastWith(color) {
    return ((color.r * 299 + color.g * 587 + color.b * 114) / 1000) > 125;
}

export function convertRgbaColorToColor(rgbaColor) {
    const { r, g, b, a } = rgbaColor;

    return new Color(a * 255, r, g, b);
}

export function convertHslaColorToHexColor(hslaColor) {
    const rgbaColor = convertHslaColorToRgbaColor(hslaColor);
    const color = convertRgbaColorToColor(rgbaColor);

    return color.hex;
}

const hue = (p, q, t) => {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1/6) return p + (q - p) * 6 * t;
  if (t < 1/2) return q;
  if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;

  return p;
}

const convertHslToRgb = (h, s, l) => {
  let r, g, b;
  h = h / 360;

  if (s == 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue(p, q, h + 1/3);
    g = hue(p, q, h);
    b = hue(p, q, h - 1/3);
  }

  return [
    Math.max(0, Math.min(Math.round(r * 255), 255)),
    Math.max(0, Math.min(Math.round(g * 255), 255)),
    Math.max(0, Math.min(Math.round(b * 255), 255))
  ];
};