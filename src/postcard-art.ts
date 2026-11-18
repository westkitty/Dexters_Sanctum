export function finishPostcard(context: CanvasRenderingContext2D, width: number, height: number) {
  const unit = Math.min(width * .022, height * .039);
  const margin = unit * 1.30;
  const baseline = height - margin;
  context.save();
  const shade = context.createLinearGradient(0, height - unit * 5, 0, height);
  shade.addColorStop(0, '#0c162000');
  shade.addColorStop(1, '#0c1620e6');
  context.fillStyle = shade;
  context.fillRect(0, height - unit * 5, width, unit * 5);

  context.strokeStyle = '#dfbe8190';
  context.lineWidth = Math.max(1, unit * .035);
  context.beginPath();
  context.moveTo(margin, baseline - unit * 1.54);
  context.lineTo(width - margin, baseline - unit * 1.54);
  context.stroke();

  context.fillStyle = '#f5d4a0';
  context.font = `italic ${unit}px Georgia, serif`;
  context.fillText('Dexter’s Sanctum', margin, baseline - unit * .31);
  context.fillStyle = '#d8b984';
  context.font = `600 ${unit * .31}px system-ui, sans-serif`;
  context.fillText('L A N T E R N   I S L E', margin, baseline + unit * .23);

  const size = unit * .65;
  context.translate(width - margin - size, baseline - unit * .43);
  context.strokeStyle = '#dfbe81bb';
  context.lineWidth = Math.max(1, unit * .033);
  context.beginPath();
  context.arc(0, 0, size, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.arc(-size * .075, 0, size * .55, -.39 * Math.PI, 1.29 * Math.PI);
  context.quadraticCurveTo(size * .29, size * .095, size * .12, -size * .52);
  context.stroke();
  context.beginPath();
  context.moveTo(size * .39, -size * .28);
  context.lineTo(size * .39, size * .10);
  context.moveTo(size * .23, -size * .09);
  context.lineTo(size * .55, -size * .09);
  context.stroke();
  context.restore();
}
