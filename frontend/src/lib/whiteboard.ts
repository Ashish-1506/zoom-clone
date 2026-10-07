export interface Point {
  x: number;
  y: number;
}

interface ShapeBase {
  id: string;
  color: string;
  strokeWidth: number;
}

type GeometryType = "line" | "rectangle" | "ellipse" | "arrow";
type GeometryShape = {
  [Kind in GeometryType]: ShapeBase & {
    type: Kind;
    x: number;
    y: number;
    width: number;
    height: number;
  };
}[GeometryType];
type TextShape = {
  [Kind in "text" | "sticky"]: ShapeBase & {
    type: Kind;
    x: number;
    y: number;
    text: string;
  };
}["text" | "sticky"];

export type WhiteboardShape =
  | (ShapeBase & { type: "path"; points: Point[]; opacity?: number })
  | GeometryShape
  | TextShape;

export type WhiteboardTool =
  | "select"
  | "pen"
  | "highlighter"
  | "eraser"
  | "line"
  | "rectangle"
  | "ellipse"
  | "arrow"
  | "text"
  | "sticky";

export function parseWhiteboardShapes(data: string): WhiteboardShape[] {
  const parsed: unknown = JSON.parse(data);
  if (!Array.isArray(parsed)) throw new Error("Whiteboard data must be a list.");
  return parsed.map((entry) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new Error("Whiteboard items must be shape objects.");
    }
    const shape = entry as Record<string, unknown>;
    const type = shape.type ?? shape.kind;
    if (
      type !== "path" &&
      type !== "line" &&
      type !== "rectangle" &&
      type !== "ellipse" &&
      type !== "arrow" &&
      type !== "text" &&
      type !== "sticky"
    ) {
      throw new Error("Whiteboard contains an unsupported shape.");
    }
    const normalized: Record<string, unknown> = { ...shape, type };
    delete normalized.kind;
    if (!isWhiteboardShape(normalized)) {
      throw new Error("Whiteboard contains an invalid shape.");
    }
    return normalized;
  });
}

function isWhiteboardShape(value: Record<string, unknown>): value is Record<string, unknown> & WhiteboardShape {
  if (
    typeof value.id !== "string" ||
    typeof value.color !== "string" ||
    typeof value.strokeWidth !== "number" ||
    !Number.isFinite(value.strokeWidth)
  ) {
    return false;
  }
  if (value.type === "path") {
    return Array.isArray(value.points) && value.points.every(isPoint);
  }
  if (value.type === "line" || value.type === "rectangle" || value.type === "ellipse" || value.type === "arrow") {
    return isFiniteNumber(value.x) && isFiniteNumber(value.y) &&
      isFiniteNumber(value.width) && isFiniteNumber(value.height);
  }
  if (value.type === "text" || value.type === "sticky") {
    return isFiniteNumber(value.x) && isFiniteNumber(value.y) && typeof value.text === "string";
  }
  return false;
}

function isPoint(value: unknown): value is Point {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const point = value as Record<string, unknown>;
  return isFiniteNumber(point.x) && isFiniteNumber(point.y);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function getShapePath(shape: Extract<WhiteboardShape, { type: "path" }>): string {
  return shape.points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

export async function downloadWhiteboardPng(shapes: WhiteboardShape[]): Promise<void> {
  const imageSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700"><defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#232333"/></marker></defs><rect width="1200" height="700" fill="white"/>${shapes
    .map((shape) => {
      const color = escapeXml(shape.color);
      if (shape.type === "path") {
        return `<path d="${getShapePath(shape)}" fill="none" stroke="${color}" stroke-width="${shape.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="${shape.opacity ?? 1}"/>`;
      }
      if (shape.type === "line" || shape.type === "arrow") {
        return `<line x1="${shape.x}" y1="${shape.y}" x2="${shape.x + shape.width}" y2="${shape.y + shape.height}" stroke="${color}" stroke-width="${shape.strokeWidth}" ${shape.type === "arrow" ? 'marker-end="url(#arrow)"' : ""}/>`;
      }
      if (shape.type === "rectangle") {
        return `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" fill="none" stroke="${color}" stroke-width="${shape.strokeWidth}"/>`;
      }
      if (shape.type === "ellipse") {
        return `<ellipse cx="${shape.x + shape.width / 2}" cy="${shape.y + shape.height / 2}" rx="${Math.abs(shape.width / 2)}" ry="${Math.abs(shape.height / 2)}" fill="none" stroke="${color}" stroke-width="${shape.strokeWidth}"/>`;
      }
      if (shape.type === "sticky") {
        return `<g><rect x="${shape.x}" y="${shape.y}" width="190" height="140" rx="8" fill="${color}"/><text x="${shape.x + 12}" y="${shape.y + 28}" font-family="Arial" font-size="18">${escapeXml(shape.text)}</text></g>`;
      }
      return `<text x="${shape.x}" y="${shape.y}" fill="${color}" font-family="Arial" font-size="22">${escapeXml(shape.text)}</text>`;
    })
    .join("")}</svg>`;
  const svgUrl = URL.createObjectURL(
    new Blob([imageSvg], { type: "image/svg+xml;charset=utf-8" }),
  );
  const image = new Image();
  try {
    image.src = svgUrl;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 700;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas export is not supported in this browser.");
    context.drawImage(image, 0, 0);
    const png = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error("Unable to create a PNG image."));
      }, "image/png");
    });
    const pngUrl = URL.createObjectURL(png);
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = "whiteboard.png";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (character) => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      "'": "&apos;",
      '"': "&quot;",
    };
    return entities[character] ?? character;
  });
}
