import { calculatePixelsPerFoot } from "../geo/calibration";
// src/components/calibration-tool.ts
import type { Point } from "../types";

export interface CalibrationResult {
  pixelsPerFoot: number;
  points: [Point, Point];
  distanceFt: number;
}

export function renderCalibrationTool(
  container: HTMLElement,
  imageDataUrl: string,
  onCalibrated: (result: CalibrationResult) => void,
  onCancel: () => void,
): void {
  // Clear container safely
  while (container.firstChild) container.removeChild(container.firstChild);

  const points: Point[] = [];

  // Wrapper holds image + SVG overlay
  const wrapper = document.createElement("div");
  wrapper.className = "calibration-wrapper";
  wrapper.style.position = "relative";
  wrapper.style.display = "inline-block";

  const img = document.createElement("img");
  img.src = imageDataUrl;
  img.style.display = "block";
  img.style.maxWidth = "100%";
  img.style.cursor = "crosshair";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.style.position = "absolute";
  svg.style.top = "0";
  svg.style.left = "0";
  svg.style.width = "100%";
  svg.style.height = "100%";
  svg.style.pointerEvents = "none";

  wrapper.append(img, svg);

  // Controls
  const controls = document.createElement("div");
  controls.className = "calibration-controls";
  controls.style.marginTop = "8px";

  const instructions = document.createElement("div");
  instructions.className = "calibration-instructions";

  const distanceRow = document.createElement("div");
  distanceRow.className = "calibration-distance-row";
  distanceRow.style.display = "none";

  const distanceLabel = document.createElement("label");
  const distanceLabelText = document.createTextNode("Distance (ft): ");
  distanceLabel.appendChild(distanceLabelText);

  const distanceInput = document.createElement("input");
  distanceInput.type = "number";
  distanceInput.min = "0.1";
  distanceInput.step = "0.1";
  distanceInput.className = "calibration-distance-input";
  distanceInput.placeholder = "e.g. 20";

  distanceLabel.appendChild(distanceInput);
  distanceRow.appendChild(distanceLabel);

  const setScaleBtn = document.createElement("button");
  setScaleBtn.className = "calibration-set-scale";
  setScaleBtn.textContent = "Set Scale";
  setScaleBtn.style.display = "none";

  const resetBtn = document.createElement("button");
  resetBtn.className = "calibration-reset";
  resetBtn.textContent = "Reset";

  const backBtn = document.createElement("button");
  backBtn.className = "calibration-back";
  backBtn.textContent = "Back";

  const errorMsg = document.createElement("div");
  errorMsg.className = "calibration-error";
  errorMsg.style.color = "red";
  errorMsg.style.display = "none";

  controls.append(
    instructions,
    distanceRow,
    setScaleBtn,
    resetBtn,
    backBtn,
    errorMsg,
  );
  container.append(wrapper, controls);

  function getImagePoint(e: MouseEvent): Point {
    const rect = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function toSvgCoords(p: Point): { cx: number; cy: number } {
    const rect = img.getBoundingClientRect();
    const scaleX = rect.width / img.naturalWidth;
    const scaleY = rect.height / img.naturalHeight;
    return { cx: p.x * scaleX, cy: p.y * scaleY };
  }

  function renderOverlay(): void {
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    if (points.length >= 2) {
      const { cx: x1, cy: y1 } = toSvgCoords(points[0]);
      const { cx: x2, cy: y2 } = toSvgCoords(points[1]);

      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line",
      );
      line.setAttribute("x1", String(x1));
      line.setAttribute("y1", String(y1));
      line.setAttribute("x2", String(x2));
      line.setAttribute("y2", String(y2));
      line.setAttribute("stroke", "#f59e0b");
      line.setAttribute("stroke-width", "2");
      svg.appendChild(line);
    }

    points.forEach((p, i) => {
      const { cx, cy } = toSvgCoords(p);

      const circle = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle",
      );
      circle.setAttribute("cx", String(cx));
      circle.setAttribute("cy", String(cy));
      circle.setAttribute("r", "8");
      circle.setAttribute("fill", "#f59e0b");
      circle.setAttribute("stroke", "#fff");
      circle.setAttribute("stroke-width", "2");

      const label = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text",
      );
      label.setAttribute("x", String(cx));
      label.setAttribute("y", String(cy + 4));
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("fill", "#fff");
      label.setAttribute("font-size", "10");
      label.setAttribute("font-weight", "bold");
      label.setAttribute("pointer-events", "none");
      label.textContent = String(i + 1);

      svg.appendChild(circle);
      svg.appendChild(label);
    });
  }

  function updateUI(): void {
    if (points.length === 0) {
      instructions.textContent = "Click point 1 on the image.";
      distanceRow.style.display = "none";
      setScaleBtn.style.display = "none";
    } else if (points.length === 1) {
      instructions.textContent = "Click point 2 on the image.";
      distanceRow.style.display = "none";
      setScaleBtn.style.display = "none";
    } else {
      instructions.textContent =
        "Enter the real-world distance between the two points.";
      distanceRow.style.display = "block";
      setScaleBtn.style.display = "inline-block";
    }
    errorMsg.style.display = "none";
    renderOverlay();
  }

  img.addEventListener("click", (e: MouseEvent) => {
    if (points.length >= 2) return;
    points.push(getImagePoint(e));
    updateUI();
  });

  setScaleBtn.addEventListener("click", () => {
    const distanceFt = Number.parseFloat(distanceInput.value);
    if (Number.isNaN(distanceFt) || distanceFt <= 0) {
      errorMsg.textContent = "Please enter a positive distance.";
      errorMsg.style.display = "block";
      return;
    }
    try {
      const pixelsPerFoot = calculatePixelsPerFoot(
        points[0],
        points[1],
        distanceFt,
      );
      onCalibrated({
        pixelsPerFoot,
        points: [points[0], points[1]],
        distanceFt,
      });
    } catch (err) {
      errorMsg.textContent =
        err instanceof Error ? err.message : "Calibration failed.";
      errorMsg.style.display = "block";
    }
  });

  resetBtn.addEventListener("click", () => {
    points.length = 0;
    distanceInput.value = "";
    updateUI();
  });

  backBtn.addEventListener("click", () => {
    onCancel();
  });

  updateUI();
}
