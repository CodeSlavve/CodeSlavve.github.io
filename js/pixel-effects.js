(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const hero = document.querySelector(".hero");
  const canvas = document.querySelector(".hero-canvas");
  const mark = document.querySelector(".hero-mark");
  const drawable = hero && canvas ? canvas.getContext("2d") : null;

  function colorToRgb(value) {
    const hex = value.trim().replace("#", "");
    const normalized = hex.length === 3
      ? hex.split("").map((part) => part + part).join("")
      : hex;
    if (!/^[0-9a-f]{6}$/i.test(normalized)) {
      return null;
    }
    return [
      Number.parseInt(normalized.slice(0, 2), 16),
      Number.parseInt(normalized.slice(2, 4), 16),
      Number.parseInt(normalized.slice(4, 6), 16)
    ];
  }

  let heroVisible = false;
  let pageVisible = !document.hidden;
  let animationFrame = 0;
  let lastFrame = 0;
  let width = 0;
  let height = 0;
  let pointerCell = null;
  const scale = 4;
  const cellSize = 3;
  const frameDuration = 1000 / 24;
  const touchDevice = !finePointer.matches;

  function resizeCanvas() {
    if (!drawable || !hero) {
      return;
    }
    const bounds = hero.getBoundingClientRect();
    width = Math.max(1, Math.ceil(bounds.width / scale));
    height = Math.max(1, Math.ceil(bounds.height / scale));
    canvas.width = width;
    canvas.height = height;
    drawable.imageSmoothingEnabled = false;
    draw(0);
  }

  function draw(time) {
    if (!drawable) {
      return;
    }
    const styles = getComputedStyle(document.documentElement);
    const accent = colorToRgb(styles.getPropertyValue("--color-accent"));
    const text = colorToRgb(styles.getPropertyValue("--color-text"));
    if (!accent || !text) {
      return;
    }
    drawable.clearRect(0, 0, width, height);
    const columns = Math.ceil(width / cellSize);
    const rows = Math.ceil(height / cellSize);
    const pulseThreshold = touchDevice ? 0.975 : 0.965;
    const driftThreshold = touchDevice ? 0.006 : 0.004;
    const t = reducedMotion.matches ? 0 : time / 1000;

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const seed = Math.abs(Math.sin(column * 127.1 + row * 311.7) * 43758.5453) % 1;
        const pulse = (Math.sin(t * 0.55 + seed * 24) + 1) / 2;
        const drifts = seed < driftThreshold;
        const isPulsingCell = seed > pulseThreshold;
        let pointerLight = 0;
        if (!reducedMotion.matches && !touchDevice && pointerCell) {
          const distance = Math.hypot(column - pointerCell.column, row - pointerCell.row);
          pointerLight = Math.max(0, 1 - distance / 7);
        }
        if (!drifts && (!isPulsingCell || pulse < 0.72) && pointerLight === 0) {
          continue;
        }

        let x = column * cellSize;
        let y = row * cellSize;
        if (!reducedMotion.matches && drifts) {
          const phase = t * 0.12 + seed * 30;
          x += Math.floor(Math.sin(phase) * 2);
          y += Math.floor(Math.sin(phase + 1) * 2);
        }

        const alpha = (drifts ? 0.045 : 0.018 + pulse * 0.025) + pointerLight * 0.12;
        const color = seed < 0.6 ? accent : text;
        drawable.fillStyle = `rgba(${color.join(",")},${alpha})`;
        drawable.fillRect(x, y, cellSize, cellSize);
      }
    }
  }

  function stopCanvas() {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
  }

  function animate(timestamp) {
    animationFrame = 0;
    if (!heroVisible || !pageVisible || reducedMotion.matches) {
      return;
    }
    if (timestamp - lastFrame >= frameDuration) {
      lastFrame = timestamp;
      draw(timestamp);
    }
    animationFrame = requestAnimationFrame(animate);
  }

  function syncCanvasAnimation() {
    stopCanvas();
    if (!heroVisible || !pageVisible || reducedMotion.matches) {
      draw(0);
      return;
    }
    lastFrame = 0;
    animationFrame = requestAnimationFrame(animate);
  }

  if (hero && canvas && drawable) {
    resizeCanvas();
    const heroObserver = new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting;
      syncCanvasAnimation();
    });
    heroObserver.observe(hero);
    new ResizeObserver(resizeCanvas).observe(hero);
    document.addEventListener("visibilitychange", () => {
      pageVisible = !document.hidden;
      syncCanvasAnimation();
    });
    reducedMotion.addEventListener("change", syncCanvasAnimation);

    if (finePointer.matches) {
      hero.addEventListener("pointermove", (event) => {
        if (reducedMotion.matches) {
          return;
        }
        const bounds = canvas.getBoundingClientRect();
        pointerCell = {
          column: Math.floor((event.clientX - bounds.left) / scale / cellSize),
          row: Math.floor((event.clientY - bounds.top) / scale / cellSize)
        };
        if (mark) {
          const markBounds = mark.getBoundingClientRect();
          const offsetX = Math.max(-2, Math.min(2, Math.round((event.clientX - markBounds.left - markBounds.width / 2) / markBounds.width * 2)));
          const offsetY = Math.max(-2, Math.min(2, Math.round((event.clientY - markBounds.top - markBounds.height / 2) / markBounds.height * 2)));
          mark.style.setProperty("--mark-shift-x", `${offsetX * 2}px`);
          mark.style.setProperty("--mark-shift-y", `${offsetY * 2}px`);
        }
      });
      hero.addEventListener("pointerleave", () => {
        pointerCell = null;
        if (mark) {
          mark.style.setProperty("--mark-shift-x", "0px");
          mark.style.setProperty("--mark-shift-y", "0px");
        }
      });
      if (mark) {
        mark.addEventListener("pointerenter", () => {
          if (!reducedMotion.matches) {
            mark.classList.add("is-hovered");
          }
        });
        mark.addEventListener("pointerleave", () => mark.classList.remove("is-hovered"));
      }
    }
  }

  const dividers = document.querySelectorAll(".content-section, .project-prose section");
  dividers.forEach((divider) => divider.classList.add("pixel-divider"));
  if (!reducedMotion.matches && "IntersectionObserver" in window) {
    const dividerObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("pixel-revealed");
          dividerObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    dividers.forEach((divider) => dividerObserver.observe(divider));
  } else {
    dividers.forEach((divider) => divider.classList.add("pixel-revealed"));
  }

  const updateCursor = () => document.body.classList.toggle("pixel-cursor", !reducedMotion.matches && finePointer.matches);
  updateCursor();
  reducedMotion.addEventListener("change", updateCursor);
  finePointer.addEventListener("change", updateCursor);
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) {
      dividers.forEach((divider) => divider.classList.add("pixel-revealed"));
      if (mark) {
        mark.classList.remove("is-hovered");
        mark.style.setProperty("--mark-shift-x", "0px");
        mark.style.setProperty("--mark-shift-y", "0px");
      }
    }
  });

  if (document.querySelector(".not-found")) {
    const sequence = [
      "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
      "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
      "b", "a", "Enter"
    ];
    let progress = 0;
    document.addEventListener("keydown", (event) => {
      if (event.target instanceof HTMLElement && event.target.isContentEditable) {
        return;
      }
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      progress = key === sequence[progress] ? progress + 1 : key === sequence[0] ? 1 : 0;
      if (progress === sequence.length) {
        document.body.classList.toggle("easter-egg");
        progress = 0;
      }
    });
  }
})();
