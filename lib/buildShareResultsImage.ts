type Poll = {
  question: string;
  description?: string | null;
  category: string;
  slug: string;
};

type PollOption = {
  id: number;
  option_text: string;
  vote_count: number;
  image_url?: string | null;
};

type VoteCounts = Record<number, number>;

const OPTION_COLOURS = ["#2563eb", "#22c55e", "#fbbf24", "#ec4899", "#8b5cf6", "#14b8a6", "#f97316", "#ef4444"];

const CATEGORY_COLOURS: Record<string, { text: string; bg: string; border: string; solid: string }> = {
  All: { text: "#e5e7eb", bg: "rgba(31, 41, 55, 0.9)", border: "rgba(75, 85, 99, 1)", solid: "#374151" },
  Business: { text: "#93c5fd", bg: "rgba(37, 99, 235, 0.12)", border: "rgba(37, 99, 235, 0.55)", solid: "#2563eb" },
  Community: { text: "#fca5a5", bg: "rgba(239, 68, 68, 0.12)", border: "rgba(239, 68, 68, 0.55)", solid: "#ef4444" },
  Education: { text: "#fde68a", bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.55)", solid: "#f59e0b" },
  Finance: { text: "#86efac", bg: "rgba(34, 197, 94, 0.12)", border: "rgba(34, 197, 94, 0.55)", solid: "#22c55e" },
  Fun: { text: "#f9a8d4", bg: "rgba(236, 72, 153, 0.12)", border: "rgba(236, 72, 153, 0.55)", solid: "#ec4899" },
  General: { text: "#67e8f9", bg: "rgba(6, 182, 212, 0.12)", border: "rgba(6, 182, 212, 0.55)", solid: "#06b6d4" },
  Lifestyle: { text: "#d8b4fe", bg: "rgba(168, 85, 247, 0.12)", border: "rgba(168, 85, 247, 0.55)", solid: "#a855f7" },
  Health: { text: "#fdba74", bg: "rgba(249, 115, 22, 0.12)", border: "rgba(249, 115, 22, 0.55)", solid: "#f97316" },
  Politics: { text: "#fcd34d", bg: "rgba(234, 179, 8, 0.12)", border: "rgba(234, 179, 8, 0.55)", solid: "#eab308" },
  Sport: { text: "#c4b5fd", bg: "rgba(139, 92, 246, 0.12)", border: "rgba(139, 92, 246, 0.55)", solid: "#8b5cf6" },
  Sports: { text: "#c4b5fd", bg: "rgba(139, 92, 246, 0.12)", border: "rgba(139, 92, 246, 0.55)", solid: "#8b5cf6" },
  Tech: { text: "#f9a8d4", bg: "rgba(217, 70, 239, 0.12)", border: "rgba(217, 70, 239, 0.55)", solid: "#d946ef" },
};

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (ctx.measureText(nextLine).width <= maxWidth) {
      currentLine = nextLine;
      continue;
    }

    if (currentLine) lines.push(currentLine);
    currentLine = word;

    if (lines.length === maxLines - 1) break;
  }

  if (currentLine && lines.length < maxLines) lines.push(currentLine);

  return lines.length ? lines : [text];
}

async function loadLogoImage() {
  return await new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = `${window.location.origin}/logo.png`;
  });
}

export async function buildShareResultsImageFile({
  poll,
  options,
  voteCounts,
}: {
  poll: Poll;
  options: PollOption[];
  voteCounts: VoteCounts;
}) {
  const canvas = document.createElement("canvas");
  canvas.width = 640;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const totalVotes = Object.values(voteCounts).reduce((sum, count) => sum + count, 0);
  const logo = await loadLogoImage();

  ctx.font = "700 42px Arial";
  const questionLines = wrapCanvasText(ctx, poll.question, 470, 6);

  const questionHeight = questionLines.length * 56;
  const getShareOptionHeight = (option: PollOption) => (option.image_url ? 320 : 180);
  const optionsHeight = options.reduce((sum, option) => sum + getShareOptionHeight(option), 0);
  const footerHeight = 240;
  const cardHeight = 180 + questionHeight + optionsHeight + footerHeight;

  canvas.height = cardHeight;

   ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

const insetX = 20;

drawRoundedRect(
  ctx,
  insetX,
  0,
  canvas.width - insetX * 2,
  canvas.height,
  64
);
ctx.fillStyle = "#111827";
ctx.fill();

ctx.strokeStyle = "rgba(255,255,255,0.28)";
ctx.lineWidth = 2;
ctx.stroke();

  const categoryText = poll.category || "General";
  ctx.font = "600 20px Arial";
  const categoryWidth = ctx.measureText(categoryText).width + 38;
  const topMetaY = 54;

const categoryStyle = CATEGORY_COLOURS[categoryText] || CATEGORY_COLOURS.General;

drawRoundedRect(ctx, 60, topMetaY - 20, categoryWidth, 40, 20);
ctx.fillStyle = categoryStyle.bg;
ctx.fill();
ctx.strokeStyle = categoryStyle.border;
ctx.lineWidth = 2;
ctx.stroke();

ctx.textAlign = "center";
ctx.textBaseline = "middle";
ctx.fillStyle = categoryStyle.text;
ctx.fillText(categoryText, 60 + categoryWidth / 2, topMetaY);

  ctx.textAlign = "right";
  ctx.font = "700 28px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.fillText(`${totalVotes.toLocaleString()} votes`, 580, topMetaY);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = "700 42px Arial";
  ctx.fillStyle = "#ffffff";

  let y = 140;

  questionLines.forEach((line) => {
    ctx.fillText(line, 60, y);
    y += 56;
  });

  y += 24;

  const barWidth = 430;

  for (const [i, opt] of options.entries()) {
    const votes = voteCounts[opt.id] || 0;
    const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
    const colour = OPTION_COLOURS[i] || OPTION_COLOURS[0];
    const optionHeight = opt.image_url ? 290 : 136;

    ctx.fillStyle = "rgba(255,255,255,0.05)";
    drawRoundedRect(ctx, 46, y, 548, optionHeight - 34, 22);
    ctx.fill();

    let contentY = y + 24;

    if (opt.image_url) {
      const image = await new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = opt.image_url as string;
      });

      if (image) {
        const imageX = 64;
        const imageY = y + 18;
        const imageSize = 120;

        ctx.save();
        drawRoundedRect(ctx, imageX, imageY, imageSize, imageSize, 16);
        ctx.clip();

        const imageRatio = image.width / image.height;
        let drawWidth = imageSize;
        let drawHeight = imageSize;
        let drawX = imageX;
        let drawY = imageY;

        if (imageRatio > 1) {
          drawWidth = imageSize * imageRatio;
          drawX = imageX - (drawWidth - imageSize) / 2;
        } else {
          drawHeight = imageSize / imageRatio;
          drawY = imageY - (drawHeight - imageSize) / 2;
        }

        ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();
      }

      contentY = y + 160;
    }

ctx.font = "600 26px Arial";
ctx.fillStyle = "#ffffff";
ctx.textAlign = "left";

const optionLines = wrapCanvasText(ctx, opt.option_text, 500, 4);

let lineY = contentY + 18;
optionLines.forEach(line => {
  ctx.fillText(line, 64, lineY);
  lineY += 30;
});

const textHeight = optionLines.length * 30;

ctx.textAlign = "right";
ctx.font = "700 28px Arial";

ctx.fillText(
  `${pct}% • ${votes.toLocaleString()} ${votes === 1 ? "vote" : "votes"}`,
  580,
  contentY + textHeight + 6
);

    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.12)";

drawRoundedRect(ctx, 64, contentY + textHeight + 40, barWidth, 14, 8);
    ctx.fill();

    const fill = pct > 0 ? Math.max((barWidth * pct) / 100, 10) : 0;

    ctx.fillStyle = colour;
    drawRoundedRect(ctx, 64, contentY + textHeight + 40, fill, 14, 8);
    ctx.fill();

    y += optionHeight;
  }

  y += 50;

  if (logo) {
    ctx.globalAlpha = 0.9;
    const logoWidth = 210;
    const logoHeight = logoWidth * (logo.height / logo.width);
    const logoX = (canvas.width - logoWidth) / 2;
    ctx.drawImage(logo, logoX, y, logoWidth, logoHeight);
    ctx.globalAlpha = 1;
  }

  y += 95;

  ctx.textAlign = "center";
  ctx.font = "400 24px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText("Vote and see what others think:", 320, y);

  y += 34;

  ctx.font = "600 26px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillText("pollandsee.com", 320, y);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/png");
  });

  if (!blob) return null;

  return new File([blob], `pollandsee-${poll.slug}.png`, { type: "image/png" });
}