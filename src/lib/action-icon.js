const TOOLBAR_ICON_SIZES = [16, 32];

export async function setToolbarIcon({
  action,
  tabId,
  enabled,
  createImageData = createToolbarImageData
}) {
  const imageData = createImageData(enabled);
  await action.setIcon({ tabId, imageData });
}

export function createToolbarImageData(enabled) {
  return Object.fromEntries(
    TOOLBAR_ICON_SIZES.map((size) => [size, drawIcon(size, enabled)])
  );
}

function drawIcon(size, enabled) {
  const canvas = new OffscreenCanvas(size, size);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const inset = Math.max(1, size * 0.06);
  const extent = size - inset * 2;

  context.beginPath();
  context.roundRect(inset, inset, extent, extent, size * 0.22);
  if (enabled) {
    const gradient = context.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, "#6D5EF8");
    gradient.addColorStop(1, "#3A8DFF");
    context.fillStyle = gradient;
  } else {
    context.fillStyle = "#A7ADB8";
  }
  context.fill();

  context.strokeStyle = "rgba(255,255,255,.32)";
  context.lineWidth = Math.max(1, size * 0.025);
  context.beginPath();
  context.moveTo(size * 0.5, size * 0.25);
  context.lineTo(size * 0.5, size * 0.75);
  context.stroke();

  context.fillStyle = "#FFFFFF";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `700 ${size * 0.4}px "PingFang SC", "Noto Sans CJK SC", sans-serif`;
  context.fillText("文", size * 0.29, size * 0.53);
  context.font = `700 ${size * 0.39}px Arial, sans-serif`;
  context.fillText("A", size * 0.73, size * 0.53);

  return context.getImageData(0, 0, size, size);
}
