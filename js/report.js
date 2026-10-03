/**
 * Simulador de Mecánica de Fluidos y Túnel Aerodinámico 2D - Ambystoma Technologies
 * report.js - Generador de Informes Técnicos en Alta Definición (HD) con Captura y Telemetría
 */

(function () {
  'use strict';

  function drawRoundedRect(ctx, x, y, width, height, radius, fillStyle, strokeStyle, lineWidth) {
    ctx.save();
    ctx.beginPath();
    if (typeof radius === 'number') {
      if (ctx.roundRect) {
        ctx.roundRect(x, y, width, height, radius);
      } else {
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
      }
    } else if (Array.isArray(radius) && ctx.roundRect) {
      ctx.roundRect(x, y, width, height, radius);
    } else {
      ctx.rect(x, y, width, height);
    }
    ctx.closePath();

    if (fillStyle) {
      ctx.fillStyle = fillStyle;
      ctx.fill();
    }
    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth || 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBadge(ctx, text, x, y, bgColor, textColor, borderColor, fontSize = 13, bold = true, align = 'left') {
    ctx.save();
    ctx.font = `${bold ? 'bold ' : ''}${fontSize}px 'Inter', system-ui, -apple-system, sans-serif`;
    const paddingX = 14;
    const paddingY = 7;
    const textMetrics = ctx.measureText(text);
    const badgeW = textMetrics.width + paddingX * 2;
    const badgeH = fontSize + paddingY * 2;

    const drawX = align === 'right' ? x - badgeW : (align === 'center' ? x - badgeW / 2 : x);

    drawRoundedRect(ctx, drawX, y - badgeH / 2, badgeW, badgeH, 6, bgColor, borderColor, 1);

    ctx.fillStyle = textColor;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(text, drawX + paddingX, y + 1);
    ctx.restore();
    return badgeW;
  }

  function getActiveMaterialName(density, viscosity, isSpanish) {
    const d = density;
    const v = viscosity;
    if (Math.abs(d - 1.225) < 0.2 && v < 0.0003) {
      return isSpanish ? "Aire Estándar (15°C, 1 atm)" : "Standard Air (15°C, 1 atm)";
    }
    if (Math.abs(d - 1000) < 50 && v < 0.00005) {
      return isSpanish ? "Agua Líquida (20°C)" : "Liquid Water (20°C)";
    }
    if (Math.abs(d - 900) < 60 && v > 0.00005 && v < 0.0005) {
      return isSpanish ? "Aceite Lubricante" : "Lubricating Oil";
    }
    if (Math.abs(d - 1260) < 100 && v > 0.0008) {
      return isSpanish ? "Glicerina Pura" : "Pure Glycerin";
    }
    if (d <= 0.2 || v <= 0.00001) {
      return isSpanish ? "Superfluido Cuántico" : "Quantum Superfluid";
    }
    return isSpanish ? "Fluido Personalizado" : "Custom Fluid Medium";
  }

  function getVisModeName(mode, isSpanish) {
    switch (mode) {
      case 'smoke':
        return isSpanish ? "Humo y Líneas de Corriente" : "Smoke & Streamlines";
      case 'pressure':
        return isSpanish ? "Mapa de Presión Estática (Pa)" : "Static Pressure Field (Pa)";
      case 'velocity':
        return isSpanish ? "Magnitud de Velocidad (m/s)" : "Velocity Magnitude (m/s)";
      case 'vorticity':
        return isSpanish ? "Vorticidad y Remolinos (s⁻¹)" : "Vorticity & Eddies (s⁻¹)";
      case 'particles':
        return isSpanish ? "Trazadores de Partículas" : "Particle Tracers";
      case 'schroeder_curl':
        return isSpanish ? "LBM Schroeder: Vorticidad" : "LBM Schroeder: Vorticity";
      case 'schroeder_flowlines':
        return isSpanish ? "LBM Schroeder: Líneas de Flujo" : "LBM Schroeder: Flowlines";
      case 'schroeder_speed':
        return isSpanish ? "LBM Schroeder: Rapidez" : "LBM Schroeder: Speed";
      default:
        return mode;
    }
  }

  /**
   * Renderiza una tabla homogénea de parámetros con dimensiones y tipografía unificadas
   */
  function drawHomogeneousTable(ctx, cfg) {
    const { x, y, width, headerH = 48, rowH = 48, title, icon, badgeText, accentColor = '#00ffcc', rows = [] } = cfg;
    const totalH = headerH + rows.length * rowH;

    // Contenedor principal de la tabla
    drawRoundedRect(ctx, x, y, width, totalH, 8, 'rgba(17, 21, 35, 0.95)', 'rgba(54, 59, 88, 0.75)', 1);

    // Cabecera de la tabla
    drawRoundedRect(ctx, x, y, width, headerH, [8, 8, 0, 0], 'rgba(24, 29, 48, 0.95)', 'rgba(54, 59, 88, 0.8)', 1);

    // Título de la cabecera
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = accentColor;
    ctx.font = '800 16px "Inter", system-ui, sans-serif';
    ctx.fillText(`${icon ? icon + '  ' : ''}${title}`, x + 18, y + headerH / 2);

    // Badge lateral derecho si existe
    if (badgeText) {
      drawBadge(ctx, badgeText, x + width - 16, y + headerH / 2, 'rgba(255, 255, 255, 0.08)', '#ffffff', 'rgba(255, 255, 255, 0.2)', 12, true, 'right');
    }
    ctx.restore();

    // Columnas uniformes (grilla de 2 celdas por fila para máxima legibilidad y equilibrio)
    const colPad = 18;
    const innerW = width - colPad * 2;
    const colGap = 24;
    const colW = (innerW - colGap) / 2;

    rows.forEach((row, rIdx) => {
      const rowY = y + headerH + rIdx * rowH;
      const isEven = rIdx % 2 === 0;

      // Cebra alterna de fondo
      if (!isEven) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
        ctx.fillRect(x + 1, rowY, width - 2, rowH);
      }

      // Línea divisoria horizontal entre filas
      if (rIdx < rows.length - 1) {
        ctx.strokeStyle = 'rgba(54, 59, 88, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 10, rowY + rowH);
        ctx.lineTo(x + width - 10, rowY + rowH);
        ctx.stroke();
      }

      // Línea divisoria vertical sutil entre columna izquierda y derecha
      ctx.strokeStyle = 'rgba(54, 59, 88, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + colPad + colW + colGap / 2, rowY + 8);
      ctx.lineTo(x + colPad + colW + colGap / 2, rowY + rowH - 8);
      ctx.stroke();

      // Celdas (c1 y c2) con mismo tamaño homogéneo
      const cells = [row.c1, row.c2];
      cells.forEach((cell, cIdx) => {
        if (!cell) return;
        const cellX = x + colPad + cIdx * (colW + colGap);

        // Etiqueta del parámetro (izquierda)
        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 15px "Inter", system-ui, sans-serif';
        ctx.fillText(cell.label, cellX, rowY + rowH / 2);

        // Valor del parámetro (derecha)
        ctx.textAlign = 'right';
        ctx.fillStyle = cell.color || '#ffffff';
        ctx.font = cell.mono ? '700 15.5px monospace' : '700 15.5px "Inter", system-ui, sans-serif';
        ctx.fillText(cell.value, cellX + colW, rowY + rowH / 2);
        ctx.restore();
      });
    });

    return totalH;
  }

  function generateAerodynamicReport(sim) {
    if (!sim || !sim.canvas) {
      console.error("[Report] Simulation canvas is not available.");
      return;
    }

    const btnSaveReport = document.getElementById('btn-save-report');
    if (btnSaveReport) btnSaveReport.classList.add('loading');

    try {
      // 1. Asegurar último fotograma renderizado
      if (typeof sim.render === 'function') {
        sim.render();
      }

      const isSpanish = (window.currentLang === 'es' || (!window.currentLang && navigator.language.startsWith('es')));

      // 2. Determinar objeto de prueba y métricas aerodinámicas
      let targetElement = sim.selectedElement;
      if (!targetElement && sim.elements && sim.elements.length > 0) {
        targetElement = sim.elements.find(e => e && !e.isProbe) || sim.elements[0];
      }

      let elementName = isSpanish ? "Túnel Libre (Flujo sin obstáculos)" : "Clean Wind Tunnel (Free flow)";
      let metrics = {
        dragForce: 0,
        liftForce: 0,
        cd: 0,
        cl: 0,
        efficiency: 0,
        reynolds: 0,
        pMax: 0,
        pMin: 0,
        aoa: 0
      };
      let isProbe = false;

      if (targetElement) {
        elementName = targetElement.name || (isSpanish ? "Cuerpo Aerodinámico" : "Aerodynamic Body");
        if (targetElement.isProbe) {
          isProbe = true;
          metrics.dragForce = 0;
          metrics.liftForce = 0;
          metrics.pMax = targetElement.measuredP || 0;
          metrics.pMin = targetElement.measuredVorticity || 0;
        } else {
          const obsIdx = sim.elements.indexOf(targetElement);
          if (sim.isLBMMode && sim.lbm) {
            metrics = {
              dragForce: (sim.lbm.forceX || 0) * 1000,
              liftForce: (sim.lbm.forceY || 0) * 1000,
              cd: Math.abs(sim.lbm.forceX || 0) * 10,
              cl: (sim.lbm.forceY || 0) * 10,
              efficiency: Math.abs((sim.lbm.forceY || 0) / (Math.abs(sim.lbm.forceX || 0) + 1e-6)),
              reynolds: Math.round(sim.lbm.viscosity > 0 ? (sim.lbm.u0 * 20) / sim.lbm.viscosity * 100 : 0),
              pMax: 0,
              pMin: 0,
              aoa: targetElement.currentRotationDeg || 0
            };
          } else if (sim.fluid && typeof sim.fluid.calculateHydrodynamicForces === 'function') {
            const raw = sim.fluid.calculateHydrodynamicForces(targetElement, obsIdx);
            metrics = {
              dragForce: raw.dragForce || 0,
              liftForce: raw.liftForce || 0,
              cd: raw.cd || 0,
              cl: raw.cl || 0,
              efficiency: raw.efficiency || 0,
              reynolds: raw.reynolds || 0,
              pMax: (raw.pMax === -Infinity || raw.pMax === undefined) ? 0 : raw.pMax,
              pMin: (raw.pMin === Infinity || raw.pMin === undefined) ? 0 : raw.pMin,
              aoa: targetElement.currentRotationDeg || 0
            };
          }
        }
      }

      // 3. Crear Canvas de Informe Ultra HD (2560 x 1440 - Formato 16:9 QHD)
      const reportCanvas = document.createElement('canvas');
      reportCanvas.width = 2560;
      reportCanvas.height = 1440;
      const ctx = reportCanvas.getContext('2d');

      // --- FONDO PRINCIPAL ---
      const bgGrad = ctx.createRadialGradient(1280, 720, 100, 1280, 720, 1500);
      bgGrad.addColorStop(0, '#101424');
      bgGrad.addColorStop(0.7, '#0a0d18');
      bgGrad.addColorStop(1, '#06080e');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, reportCanvas.width, reportCanvas.height);

      // Cuadrícula Blueprint sutil de ingeniería
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 255, 204, 0.025)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= reportCanvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, reportCanvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= reportCanvas.height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(reportCanvas.width, y);
        ctx.stroke();
      }
      ctx.restore();

      // =========================================================================
      // --- 1. BARRA SUPERIOR DE CITACIÓN CIENTÍFICA (APA 7th) ---
      // =========================================================================
      const citX = 40;
      const citY = 22;
      const citW = 2480;
      const citH = 42;

      drawRoundedRect(ctx, citX, citY, citW, citH, 8, 'rgba(15, 23, 42, 0.95)', 'rgba(0, 255, 204, 0.35)', 1.2);

      // Badge de citación académica
      const citBadgeText = isSpanish ? "CITACIÓN (APA 7ª ed.):" : "CITATION (APA 7th):";
      const citBadgeW = drawBadge(ctx, `📖  ${citBadgeText}`, citX + 12, citY + citH / 2, 'rgba(0, 255, 204, 0.12)', '#00ffcc', 'rgba(0, 255, 204, 0.4)', 13, true);

      // Texto de citación exacto solicitado por el usuario
      const citFullText = "Segura Torres, B. A. (2026). Simulador 2D de Fluidos y Túnel de Viento Interactivo [Software computacional]. Ambystoma Technologies. ";
      const citUrl = "https://ambystomatechnologies.github.io/wind-tunnel-simulator/";

      ctx.save();
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      const citTextX = citX + 12 + citBadgeW + 14;

      ctx.font = '600 14px "Inter", system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(citFullText, citTextX, citY + citH / 2 + 1);

      const prefixW = ctx.measureText(citFullText).width;
      ctx.font = '700 14px "Inter", monospace, system-ui, sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(citUrl, citTextX + prefixW, citY + citH / 2 + 1);
      ctx.restore();

      // =========================================================================
      // --- 2. ENCABEZADO INSTITUCIONAL PRINCIPAL (LOGO CORREGIDO + BADGES) ---
      // =========================================================================
      const headerX = 40;
      const headerY = 74;
      const headerW = 2480;
      const headerH = 92;

      drawRoundedRect(ctx, headerX, headerY, headerW, headerH, 10, 'rgba(19, 23, 38, 0.94)', 'rgba(0, 255, 204, 0.35)', 1.5);

      // Logo de Ambystoma Technologies con proporción de aspecto real preservada
      const navLogo = document.querySelector('.navbar-logo-img');
      const targetLogoH = 58;
      // Proporción original de logo.png (2163 x 403 = ~5.367)
      const logoAspect = (navLogo && navLogo.naturalWidth && navLogo.naturalHeight)
        ? (navLogo.naturalWidth / navLogo.naturalHeight)
        : (2163 / 403);
      const targetLogoW = Math.round(targetLogoH * logoAspect);
      const logoX = headerX + 22;
      const logoY = headerY + Math.round((headerH - targetLogoH) / 2);

      if (navLogo && navLogo.complete && navLogo.naturalWidth > 0) {
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(navLogo, logoX, logoY, targetLogoW, targetLogoH);
        ctx.restore();
      } else {
        // Fallback vectorial en caso de que la imagen no esté lista en DOM
        drawRoundedRect(ctx, logoX, logoY, 74, targetLogoH, 8, 'rgba(0, 255, 204, 0.12)', '#00ffcc', 2);
        ctx.fillStyle = '#00ffcc';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('A', logoX + 37, logoY + targetLogoH / 2);
      }

      // Divisor vertical elegante entre logo y textos
      const divX = logoX + targetLogoW + 24;
      ctx.save();
      ctx.strokeStyle = 'rgba(54, 59, 88, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(divX, headerY + 16);
      ctx.lineTo(divX, headerY + headerH - 16);
      ctx.stroke();
      ctx.restore();

      // Título y Subtítulo Institucional
      const titleX = divX + 24;
      ctx.save();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';

      ctx.fillStyle = '#00ffcc';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('AERODYNAMICS & FLUID DYNAMICS RESEARCH LAB', titleX, headerY + 28);

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 24px "Inter", system-ui, -apple-system, sans-serif';
      const mainTitle = isSpanish
        ? "INFORME TÉCNICO DE SIMULACIÓN Y TELEMETRÍA AERODINÁMICA"
        : "AERODYNAMIC SIMULATION & TELEMETRY TECHNICAL REPORT";
      ctx.fillText(mainTitle, titleX, headerY + 56);

      ctx.fillStyle = '#8b949e';
      ctx.font = '500 13px "Inter", system-ui, -apple-system, sans-serif';
      const subTitle = isSpanish
        ? "Solucionador Navier-Stokes 2D & Lattice-Boltzmann (LBM D2Q9) • Captura Instantánea de Flujo"
        : "2D Navier-Stokes & Lattice-Boltzmann (LBM D2Q9) Solver • Instantaneous Flow Telemetry";
      ctx.fillText(subTitle, titleX, headerY + 77);
      ctx.restore();

      // Badges a la derecha del Header
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const timeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      let curBadgeX = headerX + headerW - 20;

      // Status Badge (Live / Paused)
      const statusText = sim.isPaused ? (isSpanish ? "PAUSADO" : "PAUSED") : (isSpanish ? "EN VIVO (60 FPS)" : "LIVE (60 FPS)");
      const statusBg = sim.isPaused ? 'rgba(255, 184, 108, 0.15)' : 'rgba(0, 255, 204, 0.15)';
      const statusColor = sim.isPaused ? '#ffb86c' : '#00ffcc';
      curBadgeX -= 150;
      drawBadge(ctx, `● ${statusText}`, curBadgeX, headerY + headerH / 2, statusBg, statusColor, statusColor, 13);

      // Engine badge
      const engineText = sim.isLBMMode ? "LBM D2Q9 (200x100)" : "CFD NAVIER-STOKES (160x90)";
      curBadgeX -= 255;
      drawBadge(ctx, `⚙ ${engineText}`, curBadgeX, headerY + headerH / 2, 'rgba(56, 189, 248, 0.12)', '#38bdf8', 'rgba(56, 189, 248, 0.4)', 13);

      // Timestamp badge
      curBadgeX -= 245;
      drawBadge(ctx, `🕒 ${timeStr}`, curBadgeX, headerY + headerH / 2, 'rgba(255, 255, 255, 0.06)', '#e2e8f0', 'rgba(255, 255, 255, 0.18)', 13);

      // =========================================================================
      // --- 3. PANELES PRINCIPALES: IZQUIERDA (SIMULACIÓN) Y DERECHA (TABLAS) ---
      // =========================================================================
      const panelsY = 176;
      const panelsH = 1205;

      // Dimensiones equilibradas
      const leftX = 40;
      const leftW = 1430;
      const rightX = 1490;
      const rightW = 1030;

      // -------------------------------------------------------------------------
      // --- PANEL IZQUIERDO: VISOR CFD EN ALTA DEFINICIÓN ---
      // -------------------------------------------------------------------------
      drawRoundedRect(ctx, leftX, panelsY, leftW, panelsH, 12, 'rgba(15, 19, 32, 0.88)', 'rgba(54, 59, 88, 0.8)', 1.5);

      // Barra superior del visor
      drawRoundedRect(ctx, leftX, panelsY, leftW, 46, [12, 12, 0, 0], 'rgba(23, 27, 44, 0.95)', 'rgba(54, 59, 88, 0.8)', 1);

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 15px "Inter", system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const capTitle = isSpanish ? "CAPTURA DE SIMULACIÓN CFD EN ALTA DEFINICIÓN" : "HIGH-DEFINITION CFD SIMULATION CAPTURE";
      ctx.fillText(capTitle, leftX + 20, panelsY + 23);

      const activeVisName = getVisModeName(sim.visMode, isSpanish);
      drawBadge(ctx, `${isSpanish ? "Visor" : "View"}: ${activeVisName}`, leftX + 430, panelsY + 23, 'rgba(0, 255, 204, 0.12)', '#00ffcc', 'rgba(0, 255, 204, 0.4)', 12);

      // Info de dominio y velocidad de corriente libre
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 13.5px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`DOMINIO: 16.0 m × 9.0 m  |  U∞: ${sim.fluid ? sim.fluid.inflowSpeed.toFixed(1) : '5.0'} m/s`, leftX + leftW - 20, panelsY + 23);

      // Área interna del lienzo de simulación
      const innerX = leftX + 16;
      const innerY = panelsY + 58;
      const innerW = leftW - 32;
      const innerH = panelsH - 126;

      drawRoundedRect(ctx, innerX, innerY, innerW, innerH, 8, '#090b10', 'rgba(0, 255, 204, 0.25)', 1);

      // Cálculo de encuadre proporcional perfecto (aspect-fit)
      const simAspect = (sim.canvas.width || 16) / (sim.canvas.height || 9);
      let drawW = innerW;
      let drawH = innerW / simAspect;
      if (drawH > innerH) {
        drawH = innerH;
        drawW = innerH * simAspect;
      }
      const drawX = innerX + (innerW - drawW) / 2;
      const drawY = innerY + (innerH - drawH) / 2;

      // Dibujar fotograma de simulación
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(sim.canvas, drawX, drawY, drawW, drawH);

      // Borde de encuadre fino
      ctx.strokeStyle = 'rgba(0, 255, 204, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(drawX, drawY, drawW, drawH);

      // Marcas de retícula en esquinas (Reticle Marks)
      const cornerLen = 14;
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 2.5;

      // Top-Left
      ctx.beginPath();
      ctx.moveTo(drawX, drawY + cornerLen);
      ctx.lineTo(drawX, drawY);
      ctx.lineTo(drawX + cornerLen, drawY);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(drawX + drawW - cornerLen, drawY);
      ctx.lineTo(drawX + drawW, drawY);
      ctx.lineTo(drawX + drawW, drawY + cornerLen);
      ctx.stroke();

      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(drawX, drawY + drawH - cornerLen);
      ctx.lineTo(drawX, drawY + drawH);
      ctx.lineTo(drawX + cornerLen, drawY + drawH);
      ctx.stroke();

      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(drawX + drawW - cornerLen, drawY + drawH);
      ctx.lineTo(drawX + drawW, drawY + drawH);
      ctx.lineTo(drawX + drawW, drawY + drawH - cornerLen);
      ctx.stroke();

      ctx.restore();

      // Barra inferior del visor: Escala de Colores / Leyenda CFD
      const barBoxY = panelsY + panelsH - 56;
      const barBoxH = 46;
      drawRoundedRect(ctx, leftX + 16, barBoxY, innerW, barBoxH, 6, 'rgba(20, 24, 40, 0.95)', 'rgba(54, 59, 88, 0.7)', 1);

      const gradBarX = leftX + 210;
      const gradBarY = barBoxY + 14;
      const gradBarW = 400;
      const gradBarH = 18;

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '600 13.5px "Inter", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const colormapLabel = isSpanish ? "Escala de Colores:" : "Colormap Scale:";
      ctx.fillText(colormapLabel, leftX + 32, barBoxY + barBoxH / 2);

      const colorGrad = ctx.createLinearGradient(gradBarX, 0, gradBarX + gradBarW, 0);
      let leftLegend = "";
      let rightLegend = "";

      if (sim.visMode === 'pressure') {
        colorGrad.addColorStop(0, '#0044ff');
        colorGrad.addColorStop(0.3, '#00ffff');
        colorGrad.addColorStop(0.5, '#222233');
        colorGrad.addColorStop(0.7, '#ffff00');
        colorGrad.addColorStop(1, '#ff1100');
        leftLegend = isSpanish ? "Succión (-P)" : "Suction (-P)";
        rightLegend = isSpanish ? "Estancamiento (+P)" : "Stagnation (+P)";
      } else if (sim.visMode === 'velocity') {
        colorGrad.addColorStop(0, '#0a0d24');
        colorGrad.addColorStop(0.35, '#00c8ff');
        colorGrad.addColorStop(0.7, '#00ff88');
        colorGrad.addColorStop(1, '#ff3b30');
        leftLegend = "0 m/s";
        rightLegend = isSpanish ? "Velocidad Máx" : "Max Velocity";
      } else if (sim.visMode === 'vorticity' || sim.visMode === 'schroeder_curl') {
        colorGrad.addColorStop(0, '#0066ff');
        colorGrad.addColorStop(0.5, '#000000');
        colorGrad.addColorStop(1, '#ff4400');
        leftLegend = isSpanish ? "Giro Horario (-ω)" : "Clockwise (-ω)";
        rightLegend = isSpanish ? "Antihorario (+ω)" : "Counter-CW (+ω)";
      } else {
        colorGrad.addColorStop(0, '#090b10');
        colorGrad.addColorStop(0.5, '#4a6b8c');
        colorGrad.addColorStop(1, '#ffffff');
        leftLegend = isSpanish ? "Flujo Libre" : "Free Stream";
        rightLegend = isSpanish ? "Alta Densidad / Humo" : "Dense Smoke";
      }

      ctx.save();
      drawRoundedRect(ctx, gradBarX, gradBarY, gradBarW, gradBarH, 4, colorGrad, 'rgba(255,255,255,0.25)', 1);
      ctx.restore();

      ctx.font = '500 11px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'left';
      ctx.fillText(leftLegend, gradBarX, gradBarY + gradBarH + 11);
      ctx.textAlign = 'right';
      ctx.fillText(rightLegend, gradBarX + gradBarW, gradBarY + gradBarH + 11);

      // Etiquetas informativas adicionales a la derecha
      ctx.textAlign = 'right';
      ctx.font = '500 13px monospace';
      ctx.fillStyle = '#8bb4e8';
      const resInfo = `CANVAS: ${sim.canvas.width}×${sim.canvas.height} px  |  HD 100% RAW FIDELITY`;
      ctx.fillText(resInfo, leftX + innerW - 15, barBoxY + barBoxH / 2);

      // -------------------------------------------------------------------------
      // --- PANEL DERECHO: SISTEMA DE TABLAS HOMOGÉNEAS Y UNIFICADAS ---
      // -------------------------------------------------------------------------
      // Contenedor principal del panel derecho
      drawRoundedRect(ctx, rightX, panelsY, rightW, panelsH, 12, 'rgba(15, 19, 32, 0.92)', 'rgba(54, 59, 88, 0.75)', 1.5);

      const tableInnerX = rightX + 16;
      const tableInnerW = rightW - 32;
      const deltaP = Math.abs((metrics.pMax || 0) - (metrics.pMin || 0));

      const regimeText = (Math.abs(metrics.cl) < 0.15 && metrics.cd > 0.8)
        ? (isSpanish ? "Pérdida / Stall" : "Separated (Stall)")
        : (metrics.reynolds > 8000 ? (isSpanish ? "Vórtices Desprendidos" : "Vortex Shedding") : (isSpanish ? "Flujo Laminar Adherido" : "Attached Laminar"));

      const regimeColor = (Math.abs(metrics.cl) < 0.15 && metrics.cd > 0.8)
        ? '#ff5577'
        : (metrics.reynolds > 8000 ? '#fbbf24' : '#22c55e');

      const activeMaterial = getActiveMaterialName(
        sim.fluid ? sim.fluid.density : 1.225,
        sim.fluid ? sim.fluid.viscosity : 0.00015,
        isSpanish
      );

      const turbulenceText = (sim.fluid && sim.fluid.isTurbulent)
        ? (isSpanish ? `Turbulento (Tu: ${sim.fluid.turbulenceIntensity || 10}%)` : `Turbulent (Tu: ${sim.fluid.turbulenceIntensity || 10}%)`)
        : (isSpanish ? "Laminar Uniforme (Tu: 0%)" : "Uniform Laminar (Tu: 0%)");

      const wallsText = (sim.fluid && sim.fluid.closedWalls)
        ? (isSpanish ? "Canal Cerrado (Paredes sólidas)" : "Closed Channel (Solid walls)")
        : (isSpanish ? "Túnel Abierto (Deslizamiento libre)" : "Open Tunnel (Free slip)");

      const flowActiveText = (sim.fluid && sim.fluid.isFlowActive)
        ? (isSpanish ? "Soplado Activo Constante" : "Active Inflow Blowing")
        : (isSpanish ? "Flujo Cortado (Disipación)" : "Inflow Cutoff");

      const elemCount = (sim.elements && sim.elements.length) || 0;

      // Parámetros de renderizado homogéneo:
      // Mismo alto de fila (48px), misma cabecera (48px), misma tipografía legible (15px label / 15.5px value)
      const uniformHeaderH = 46;
      const uniformRowH = 48;
      const tableGap = 18;
      let curTableY = panelsY + 16;

      // TABLA 1: TELEMETRÍA AERODINÁMICA Y FUERZAS
      const t1Rows = [
        {
          c1: { label: isSpanish ? "Cuerpo Evaluado:" : "Evaluated Body:", value: elementName, color: '#00ffcc' },
          c2: { label: isSpanish ? "Ángulo de Ataque (α):" : "Angle of Attack (α):", value: `${Math.round(metrics.aoa)}°`, color: '#38bdf8', mono: true }
        },
        {
          c1: { label: isSpanish ? "Fuerza Arrastre (Fd):" : "Drag Force (Fd):", value: `${metrics.dragForce.toFixed(2)} N`, color: '#fb923c', mono: true },
          c2: { label: isSpanish ? "Coeficiente Cd:" : "Drag Coeff. (Cd):", value: metrics.cd.toFixed(3), color: '#fb923c', mono: true }
        },
        {
          c1: { label: isSpanish ? "Fuerza Sustent. (Fl):" : "Lift Force (Fl):", value: `${metrics.liftForce.toFixed(2)} N`, color: '#38bdf8', mono: true },
          c2: { label: isSpanish ? "Coeficiente Cl:" : "Lift Coeff. (Cl):", value: metrics.cl.toFixed(3), color: '#38bdf8', mono: true }
        },
        {
          c1: { label: isSpanish ? "Eficiencia (L/D):" : "Aerodynamic Ratio (L/D):", value: metrics.efficiency.toFixed(2), color: '#00ffcc', mono: true },
          c2: { label: isSpanish ? "Número Reynolds (Re):" : "Reynolds Number (Re):", value: metrics.reynolds.toLocaleString(), color: '#a78bfa', mono: true }
        },
        {
          c1: { label: isSpanish ? "P. Estancamiento (+P):" : "Stagnation Press. (+P):", value: `+${(metrics.pMax || 0).toFixed(1)} Pa`, color: '#fb923c', mono: true },
          c2: { label: isSpanish ? "P. Succión Estela (-P):" : "Wake Suction Press. (-P):", value: `${(metrics.pMin || 0).toFixed(1)} Pa`, color: '#38bdf8', mono: true }
        },
        {
          c1: { label: isSpanish ? "Gradiente ΔP:" : "Pressure Delta (ΔP):", value: `${deltaP.toFixed(1)} Pa`, color: '#00ffcc', mono: true },
          c2: { label: isSpanish ? "Régimen Aerodinámico:" : "Aerodynamic Regime:", value: regimeText, color: regimeColor }
        }
      ];

      const h1 = drawHomogeneousTable(ctx, {
        x: tableInnerX,
        y: curTableY,
        width: tableInnerW,
        headerH: uniformHeaderH,
        rowH: uniformRowH,
        title: isSpanish ? "TELEMETRÍA AERODINÁMICA Y FUERZAS HIDRODINÁMICAS" : "AERODYNAMIC TELEMETRY & HYDRODYNAMIC FORCES",
        icon: "⚡",
        badgeText: targetElement ? (targetElement.name || "Cuerpo") : (isSpanish ? "Flujo Libre" : "Free Stream"),
        accentColor: "#00ffcc",
        rows: t1Rows
      });
      curTableY += h1 + tableGap;

      // TABLA 2: MEDIO FLUIDO Y CONDICIONES DE CORRIENTE LIBRE
      const t2Rows = [
        {
          c1: { label: isSpanish ? "Medio Material:" : "Fluid Medium:", value: activeMaterial, color: '#00ffcc' },
          c2: { label: isSpanish ? "Velocidad Entrada (U∞):" : "Inflow Speed (U∞):", value: `${sim.fluid ? sim.fluid.inflowSpeed.toFixed(2) : '5.00'} m/s  (${(sim.fluid ? sim.fluid.inflowSpeed * 3.6 : 18).toFixed(1)} km/h)`, mono: true }
        },
        {
          c1: { label: isSpanish ? "Densidad Fluido (ρ):" : "Fluid Density (ρ):", value: `${sim.fluid ? sim.fluid.density.toFixed(3) : '1.225'} kg/m³`, mono: true },
          c2: { label: isSpanish ? "Viscosidad Cinemática (ν):" : "Kinematic Viscosity (ν):", value: `${sim.fluid ? sim.fluid.viscosity.toExponential(3) : '1.500e-4'} m²/s`, mono: true }
        },
        {
          c1: { label: isSpanish ? "Ángulo de Inflow:" : "Inflow Flow Angle:", value: `${sim.fluid ? sim.fluid.inflowAngle : 0}°`, mono: true },
          c2: { label: isSpanish ? "Régimen de Entrada:" : "Inflow Turbulence:", value: turbulenceText }
        },
        {
          c1: { label: isSpanish ? "Condición de Paredes:" : "Boundary Walls:", value: wallsText },
          c2: { label: isSpanish ? "Estado del Flujo:" : "Flow Animation:", value: flowActiveText, color: (sim.fluid && sim.fluid.isFlowActive) ? '#00ffcc' : '#fb923c' }
        }
      ];

      const h2 = drawHomogeneousTable(ctx, {
        x: tableInnerX,
        y: curTableY,
        width: tableInnerW,
        headerH: uniformHeaderH,
        rowH: uniformRowH,
        title: isSpanish ? "MEDIO FLUIDO Y CONDICIONES DE CORRIENTE (INFLOW)" : "FLUID MEDIUM & FREE-STREAM INFLOW CONDITIONS",
        icon: "🌊",
        badgeText: sim.fluid ? `${sim.fluid.inflowSpeed.toFixed(1)} m/s` : "5.0 m/s",
        accentColor: "#38bdf8",
        rows: t2Rows
      });
      curTableY += h2 + tableGap;

      // TABLA 3: SOLVER NUMÉRICO Y PARÁMETROS COMPUTACIONALES
      const t3Rows = [
        {
          c1: { label: isSpanish ? "Algoritmo Físico:" : "Physics Algorithm:", value: sim.isLBMMode ? "LBM D2Q9 (Schroeder BGK)" : "Navier-Stokes (MacCormack + Poisson)" },
          c2: { label: isSpanish ? "Malla Computacional:" : "Computational Grid:", value: sim.isLBMMode ? "200 × 100 Nodos D2Q9" : "160 × 90 Celdas (Δx=0.1m)", mono: true }
        },
        {
          c1: { label: isSpanish ? "Suavizado Geometría:" : "Geometry Smoothing:", value: (targetElement && targetElement.isSmooth) ? "Catmull-Rom Spline" : (isSpanish ? "Poligonal Rectilínea" : "Linear Polygon") },
          c2: { label: isSpanish ? "Trazadores Partículas:" : "Particle Tracers:", value: (sim.showParticles !== false) ? (isSpanish ? "Visibles en Lienzo" : "Rendered on Canvas") : (isSpanish ? "Ocultos" : "Hidden") }
        },
        {
          c1: { label: isSpanish ? "Vectores de Fuerza:" : "Force Vectors Overlay:", value: sim.showForces ? (isSpanish ? "Activados (Fd & Fl)" : "Active (Fd & Fl)") : (isSpanish ? "Desactivados" : "Disabled") },
          c2: { label: isSpanish ? "Precisión de Cálculo:" : "Precision Mode:", value: "32-bit Float High Precision", color: '#a78bfa' }
        }
      ];

      const h3 = drawHomogeneousTable(ctx, {
        x: tableInnerX,
        y: curTableY,
        width: tableInnerW,
        headerH: uniformHeaderH,
        rowH: uniformRowH,
        title: isSpanish ? "SOLVER NUMÉRICO Y PARÁMETROS DISCRETOS" : "NUMERICAL SOLVER & DISCRETIZATION PARAMETERS",
        icon: "🔬",
        badgeText: sim.isLBMMode ? "LBM BGK" : "Navier-Stokes",
        accentColor: "#a78bfa",
        rows: t3Rows
      });
      curTableY += h3 + tableGap;

      // TABLA 4: RESUMEN DE ELEMENTOS Y SENSORES EN EL TÚNEL
      const t4Rows = [];
      if (elemCount === 0) {
        t4Rows.push({
          c1: { label: isSpanish ? "Estado de la Escena:" : "Scene Status:", value: isSpanish ? "Túnel Limpio sin obstáculos" : "Clean tunnel without obstacles", color: '#00ffcc' },
          c2: { label: isSpanish ? "Sensores de Sonda:" : "Probe Sensors:", value: isSpanish ? "Ninguno activo" : "None active" }
        });
      } else {
        const maxToShow = Math.min(elemCount, 3);
        for (let eIdx = 0; eIdx < maxToShow; eIdx++) {
          const el = sim.elements[eIdx];
          const isSel = (el === targetElement);
          const icon = el.isProbe ? '🎯' : '✈️';
          const rot = el.currentRotationDeg ? ` (α = ${Math.round(el.currentRotationDeg)}°)` : '';
          const pts = el.controlPoints ? ` [${el.controlPoints.length} pts]` : '';

          t4Rows.push({
            c1: {
              label: `${icon} #${eIdx + 1} ${el.name || "Elemento"}:`,
              value: el.isProbe ? (isSpanish ? "Sonda de Medición" : "Probe Sensor") : (isSpanish ? `Cuerpo Sólido${pts}` : `Solid Body${pts}`),
              color: isSel ? '#00ffcc' : '#ffffff'
            },
            c2: {
              label: isSpanish ? "Orientación / Estado:" : "Orientation / Status:",
              value: isSel ? (isSpanish ? `${rot || '0°'} ★ [Seleccionado]` : `${rot || '0°'} ★ [Selected]`) : (rot || 'α = 0°'),
              color: isSel ? '#00ffcc' : '#94a3b8'
            }
          });
        }
        if (elemCount > 3) {
          t4Rows.push({
            c1: { label: isSpanish ? "Otros Elementos:" : "Other Entities:", value: isSpanish ? `+${elemCount - 3} cuerpos adicionales en el dominio` : `+${elemCount - 3} more entities in domain` },
            c2: { label: isSpanish ? "Cálculo Interactivo:" : "Simulation State:", value: isSpanish ? "Todos procesados activamente" : "All actively solved", color: '#00ffcc' }
          });
        }
      }

      drawHomogeneousTable(ctx, {
        x: tableInnerX,
        y: curTableY,
        width: tableInnerW,
        headerH: uniformHeaderH,
        rowH: uniformRowH,
        title: isSpanish ? "RESUMEN DE CUERPOS Y MODELOS EN EL TÚNEL" : "TUNNEL BODIES & OBSTACLES SUMMARY",
        icon: "✈️",
        badgeText: `${elemCount} ${isSpanish ? "Elementos" : "Entities"}`,
        accentColor: "#f1f5f9",
        rows: t4Rows
      });

      // =========================================================================
      // --- 4. PIE DE PÁGINA INSTITUCIONAL ---
      // =========================================================================
      const footerY = 1396;
      ctx.save();
      ctx.strokeStyle = 'rgba(54, 59, 88, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, footerY);
      ctx.lineTo(2520, footerY);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '500 13px "Inter", system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        isSpanish
          ? "Ambystoma Technologies — Suite de Simulación CFD & Túnel Aerodinámico 2D  •  Código Abierto para Educación e Investigación"
          : "Ambystoma Technologies — 2D CFD & Wind Tunnel Simulation Suite  •  Open Source for Science, Education & Industry",
        45,
        footerY + 22
      );

      ctx.textAlign = 'right';
      ctx.fillText(
        "https://ambystomatechnologies.github.io/wind-tunnel-simulator/  •  Copyright © Ambystoma Studio",
        2515,
        footerY + 22
      );
      ctx.restore();

      // =========================================================================
      // --- 5. EXPORTAR Y DESCARGAR IMAGEN HD EN PNG ---
      // =========================================================================
      reportCanvas.toBlob(function (blob) {
        if (!blob) {
          console.error("[Report] Failed to create image blob.");
          if (btnSaveReport) btnSaveReport.classList.remove('loading');
          return;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const filenamePrefix = isSpanish ? "informe_aerodinamico" : "aerodynamic_report";
        const filenameDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
        a.href = url;
        a.download = `${filenamePrefix}_${filenameDate}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setTimeout(function () {
          URL.revokeObjectURL(url);
        }, 10000);

        if (typeof window.showToast === 'function') {
          const successMsg = window.t
            ? (window.t('reportSavedSuccess') || (isSpanish ? "¡Informe aerodinámico guardado en HD!" : "Aerodynamic report saved in HD!"))
            : (isSpanish ? "¡Informe aerodinámico guardado en HD!" : "Aerodynamic report saved in HD!");
          window.showToast(successMsg, 'success', 3500);
        }

        if (btnSaveReport) btnSaveReport.classList.remove('loading');
      }, 'image/png');

    } catch (err) {
      console.error("[Report] Error generating report:", err);
      if (typeof window.showToast === 'function') {
        window.showToast("Error al generar el informe: " + err.message, 'error', 4000);
      }
      if (btnSaveReport) btnSaveReport.classList.remove('loading');
    }
  }

  window.generateAerodynamicReport = generateAerodynamicReport;
})();
