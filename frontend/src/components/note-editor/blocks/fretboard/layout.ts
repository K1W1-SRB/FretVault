export type FretboardLayout = {
  width: number;
  height: number;
  markerY: number;
  gridTop: number;
  gridBottom: number;
  gridLeft: number;
  gridRight: number;
  stringCount: number;
  fretCount: number;
  xForString: (i: number) => number;
  yForFretLine: (f: number) => number;
  yForFretCenter: (f: number) => number;
};

export function buildFretboardLayout({
  width = 150,
  height = 190,
  stringCount = 6,
  fretsToShow = 4,
}: {
  width?: number;
  height?: number;
  stringCount?: number;
  fretsToShow?: number;
} = {}): FretboardLayout {
  const padTop = 28;
  const padLeft = 18;
  const padRight = 18;
  const padBottom = 18;

  const markerY = padTop + 8;
  const gridTop = padTop + 20;
  const gridBottom = height - padBottom;
  const gridLeft = padLeft;
  const gridRight = width - padRight;

  const gridW = gridRight - gridLeft;
  const gridH = gridBottom - gridTop;

  const stringGap = gridW / (stringCount - 1);
  const fretGap = gridH / fretsToShow;

  const xForString = (i: number) => gridLeft + i * stringGap;
  const yForFretLine = (f: number) => gridTop + f * fretGap;
  const yForFretCenter = (f: number) => gridTop + (f - 0.5) * fretGap;

  return {
    width,
    height,
    markerY,
    gridTop,
    gridBottom,
    gridLeft,
    gridRight,
    stringCount,
    fretCount: fretsToShow,
    xForString,
    yForFretLine,
    yForFretCenter,
  };
}
