import type { VocabStatus } from "./iconColors";

const COLOR_MAP: Record<VocabStatus, Record<string, string>> = {
  new: {
    "#7F77DD": "#7F77DD",
    "#EEEDFE": "#EEEDFE",
    "#534AB7": "#534AB7",
  },
  practice: {
    "#7F77DD": "#EF9F27",
    "#EEEDFE": "#FAEEDA",
    "#534AB7": "#BA7517",
    "#AFA9EC": "#FAC775",
  },
  mastered: {
    "#7F77DD": "#1D9E75",
    "#EEEDFE": "#EAF3DE",
    "#534AB7": "#0F6E56",
    "#AFA9EC": "#5DCAA5",
  },
};

function replaceColor(svg: string, from: string, to: string): string {
  return svg.split(from).join(to).split(from.toLowerCase()).join(to);
}

export function injectColors(svgString: string, status: VocabStatus): string {
  let result = svgString;
  for (const [from, to] of Object.entries(COLOR_MAP[status])) {
    result = replaceColor(result, from, to);
  }
  return result;
}
