function makeCanvasTexture(scene, key, width, height, draw) {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, width, height);
  const ctx = texture.getContext();
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, height);
  draw(ctx, width, height);
  texture.refresh();
}

function rect(ctx, x, y, width, height, fill, stroke = null) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, width, height);
  if (!stroke) return;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);
}

function poly(ctx, points, fill, stroke = null) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (!stroke) return;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.stroke();
}

export function registerGeneratedTextures(scene) {
  makeCanvasTexture(scene, "item-branch", 32, 32, (ctx) => {
    poly(ctx, [[9, 23], [20, 7], [24, 9], [13, 25]], "#9f6b3e", "#3e2818");
    rect(ctx, 18, 10, 4, 4, "#c69252");
  });

  makeCanvasTexture(scene, "item-leaf", 32, 32, (ctx) => {
    poly(ctx, [[16, 4], [27, 15], [18, 28], [5, 17]], "#68aa63", "#1f5537");
    rect(ctx, 15, 8, 2, 18, "#d8d28a");
  });

  makeCanvasTexture(scene, "item-plastic", 32, 32, (ctx) => {
    poly(ctx, [[7, 9], [22, 5], [27, 19], [12, 27]], "#d8ecef", "#405861");
    rect(ctx, 18, 8, 4, 4, "#ffffff");
  });

  makeCanvasTexture(scene, "item-scrap", 32, 32, (ctx) => {
    poly(ctx, [[6, 12], [22, 6], [27, 19], [12, 26]], "#9ba7ad", "#2e454f");
    rect(ctx, 18, 9, 4, 4, "#dce6e8");
  });

  makeCanvasTexture(scene, "item-loot", 32, 32, (ctx) => {
    poly(ctx, [[8, 8], [24, 10], [22, 25], [7, 23]], "#d8c478", "#4e3a1d");
    rect(ctx, 18, 11, 4, 4, "#fff0aa");
  });

  makeCanvasTexture(scene, "raft-plank", 32, 32, (ctx) => {
    rect(ctx, 5, 5, 22, 22, "#8b5a32", "#51311c");
    rect(ctx, 8, 7, 16, 3, "#a96e3b");
    rect(ctx, 8, 21, 16, 3, "#6f4328");
  });

  makeCanvasTexture(scene, "raft-plank-damaged", 32, 32, (ctx) => {
    rect(ctx, 5, 5, 22, 22, "#7a3f2b", "#3b2118");
    poly(ctx, [[18, 6], [23, 12], [18, 17], [21, 25], [14, 18]], "#402319");
  });

  makeCanvasTexture(scene, "raft-net", 32, 32, (ctx) => {
    rect(ctx, 4, 4, 24, 24, "#234b52", "#a4d6cf");
    ctx.strokeStyle = "#a4d6cf";
    ctx.lineWidth = 2;
    for (let i = 9; i <= 23; i += 7) {
      ctx.beginPath();
      ctx.moveTo(i, 5);
      ctx.lineTo(i, 27);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(5, i);
      ctx.lineTo(27, i);
      ctx.stroke();
    }
  });

  makeCanvasTexture(scene, "raft-beam-h", 32, 32, (ctx) => {
    rect(ctx, 3, 13, 26, 6, "#5f3a1e", "#f5d6a1");
  });

  makeCanvasTexture(scene, "raft-beam-v", 32, 32, (ctx) => {
    rect(ctx, 13, 3, 6, 26, "#5f3a1e", "#f5d6a1");
  });

  makeCanvasTexture(scene, "hero", 32, 32, (ctx) => {
    ctx.fillStyle = "#382017";
    ctx.beginPath();
    ctx.arc(17, 17, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f0b36b";
    ctx.beginPath();
    ctx.arc(16, 16, 9, 0, Math.PI * 2);
    ctx.fill();
    rect(ctx, 22, 12, 4, 8, "#ffd18c");
  });

  makeCanvasTexture(scene, "creature-shark", 64, 40, (ctx) => {
    poly(ctx, [[32, 3], [48, 22], [32, 38], [16, 22]], "#53636a", "#172833");
    poly(ctx, [[20, 17], [8, 14], [18, 25]], "#6f858c", "#172833");
    poly(ctx, [[44, 17], [56, 14], [46, 25]], "#46565e", "#172833");
    poly(ctx, [[32, 38], [22, 40], [32, 32], [42, 40]], "#46565e", "#172833");
    rect(ctx, 29, 11, 3, 3, "#e8f4f7");
    rect(ctx, 34, 11, 3, 3, "#e8f4f7");
    ctx.fillStyle = "#2c4048";
    ctx.fillRect(31, 17, 2, 15);
  });

  makeCanvasTexture(scene, "world-island", 160, 112, (ctx) => {
    ctx.fillStyle = "#d8c478";
    ctx.beginPath();
    ctx.ellipse(80, 59, 70, 43, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3d8c62";
    ctx.beginPath();
    ctx.ellipse(68, 54, 48, 30, -0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7c7770";
    ctx.beginPath();
    ctx.arc(111, 65, 12, 0, Math.PI * 2);
    ctx.fill();
    rect(ctx, 42, 38, 10, 28, "#7a4d2a", "#3f2816");
    ctx.fillStyle = "#2f6d48";
    ctx.beginPath();
    ctx.arc(47, 32, 20, 0, Math.PI * 2);
    ctx.fill();
  });

  makeCanvasTexture(scene, "world-port", 128, 96, (ctx) => {
    ctx.fillStyle = "rgba(15,114,131,0.35)";
    ctx.beginPath();
    ctx.ellipse(64, 50, 56, 34, 0, 0, Math.PI * 2);
    ctx.fill();
    rect(ctx, 24, 54, 78, 14, "#7a4d2a", "#3f2816");
    rect(ctx, 28, 22, 16, 46, "#8b5a32", "#3f2816");
    rect(ctx, 72, 25, 30, 24, "#b47a3d", "#ffd18c");
    rect(ctx, 80, 15, 14, 9, "#7a3f2b");
    ctx.fillStyle = "#ffe7a3";
    ctx.beginPath();
    ctx.arc(104, 14, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  makeCanvasTexture(scene, "world-city", 160, 112, (ctx) => {
    ctx.fillStyle = "rgba(15,114,131,0.32)";
    ctx.beginPath();
    ctx.ellipse(80, 62, 68, 42, 0, 0, Math.PI * 2);
    ctx.fill();
    rect(ctx, 36, 31, 88, 42, "#7f725f", "#e7d7b0");
    rect(ctx, 72, 48, 18, 28, "#493b31", "#ffd18c");
    poly(ctx, [[31, 30], [50, 12], [69, 30]], "#b65f42", "#5a2d22");
    poly(ctx, [[91, 30], [110, 12], [129, 30]], "#b65f42", "#5a2d22");
    rect(ctx, 50, 44, 10, 10, "#ffdf9d");
    rect(ctx, 101, 44, 10, 10, "#ffdf9d");
  });

  const islandItems = {
    log: ["#8c5a32", "#3f2816"],
    fruit: ["#e27c48", "#612919"],
    stone: ["#8a8174", "#403f3d"],
    sand: ["#d8c478", "#6a5a28"],
    ore: ["#6f7784", "#2e343b"]
  };
  Object.entries(islandItems).forEach(([key, [fill, stroke]]) => {
    makeCanvasTexture(scene, `island-${key}`, 32, 32, (ctx) => {
      if (key === "fruit") {
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.arc(16, 17, 10, 0, Math.PI * 2);
        ctx.fill();
        rect(ctx, 15, 5, 3, 7, "#477f4d");
      } else if (key === "log") {
        rect(ctx, 6, 12, 21, 10, fill, stroke);
        rect(ctx, 8, 14, 3, 6, "#b27a47");
      } else {
        poly(ctx, [[8, 12], [18, 6], [27, 16], [21, 26], [9, 24]], fill, stroke);
        rect(ctx, 17, 10, 4, 4, "#ffffff");
      }
    });
  });

  makeCanvasTexture(scene, "hazard-sand", 64, 32, (ctx) => {
    ctx.fillStyle = "rgba(199,179,107,0.68)";
    ctx.beginPath();
    ctx.ellipse(32, 18, 28, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(240,217,141,0.8)";
    ctx.stroke();
  });

  makeCanvasTexture(scene, "hazard-thorn", 44, 44, (ctx) => {
    poly(ctx, [[22, 2], [27, 17], [42, 12], [31, 24], [40, 38], [24, 31], [16, 43], [14, 27], [2, 31], [11, 20], [4, 8], [18, 14]], "#61704d", "#28361f");
  });

  makeCanvasTexture(scene, "hazard-snake", 64, 32, (ctx) => {
    ctx.fillStyle = "#2f6d48";
    ctx.beginPath();
    ctx.ellipse(28, 18, 24, 7, 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#17301f";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#477f4d";
    ctx.beginPath();
    ctx.arc(51, 16, 7, 0, Math.PI * 2);
    ctx.fill();
    rect(ctx, 52, 14, 2, 2, "#f3fbf7");
  });

  makeCanvasTexture(scene, "hazard-scorpion", 44, 44, (ctx) => {
    ctx.fillStyle = "#5a3a24";
    ctx.beginPath();
    ctx.arc(20, 24, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2a170c";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(27, 14, 10, Math.PI * 1.1, Math.PI * 1.95);
    ctx.stroke();
    rect(ctx, 8, 21, 7, 3, "#5a3a24", "#2a170c");
    rect(ctx, 25, 21, 7, 3, "#5a3a24", "#2a170c");
  });
}
