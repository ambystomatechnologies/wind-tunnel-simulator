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
      case 'cfd_des_les':
        return isSpanish ? "CFD: Aerodinámica DES / LES (Fondo Claro & Vórtices)" : "CFD: DES / LES Aerodynamics (Light Field & Vortices)";
      case 'pressure':
        return isSpanish ? "Mapa de Presión Estática (Pa)" : "Static Pressure Field (Pa)";
      case 'velocity':
        return isSpanish ? "Magnitud de Velocidad (m/s)" : "Velocity Magnitude (m/s)";
      case 'vorticity':
        return isSpanish ? "Vorticidad y Remolinos (s⁻¹)" : "Vorticity & Eddies (s⁻¹)";
      case 'particles':
        return isSpanish ? "Trazadores de Partículas" : "Particle Tracers";
      case 'vectors':
        return isSpanish ? "Vectores de Velocidad" : "Velocity Vectors";
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
   * Obtiene la escala de colores y leyendas según el modo de visualización del simulador,
   * preservando intactos todos los esquemas de color consolidados.
   */
  function getColormapRamp(sim, ctx, gradBarX, gradBarW, isSpanish, customVisMode = null) {
    const colorGrad = ctx.createLinearGradient(gradBarX, 0, gradBarX + gradBarW, 0);
    let leftLegend = "";
    let centerLegend = "";
    let rightLegend = "";
    const activeMode = customVisMode || (sim ? sim.visMode : 'smoke');

    if (activeMode === 'cfd_des_les') {
      colorGrad.addColorStop(0, '#f8fafc');
      colorGrad.addColorStop(0.35, '#8898aa');
      colorGrad.addColorStop(0.60, '#1a2230');
      colorGrad.addColorStop(0.85, '#00d4ff');
      colorGrad.addColorStop(1, '#c0f6ff');
      leftLegend = isSpanish ? "Flujo Libre" : "Freestream";
      centerLegend = isSpanish ? "Estela / Separación" : "Separated Wake";
      rightLegend = isSpanish ? "Núcleos de Vórtice" : "Vortex Cores";

    } else if (activeMode === 'cfd_combustion') {
      colorGrad.addColorStop(0, '#030733');
      colorGrad.addColorStop(0.25, '#00b0ff');
      colorGrad.addColorStop(0.45, '#22c55e');
      colorGrad.addColorStop(0.60, '#facc15');
      colorGrad.addColorStop(0.75, '#ff5500');
      colorGrad.addColorStop(0.90, '#dc2626');
      colorGrad.addColorStop(1, '#660505');
      leftLegend = isSpanish ? "Fondo Azul Noche" : "Deep Night Blue";
      centerLegend = isSpanish ? "Cizalladura y Mezcla" : "Shear & Mixing";
      rightLegend = isSpanish ? "Llama / Núcleo Reactivo" : "Reacting Flame Core";

    } else if (activeMode === 'pressure') {
      colorGrad.addColorStop(0, '#0e44ff');
      colorGrad.addColorStop(0.28, '#00e5ff');
      colorGrad.addColorStop(0.50, '#101826');
      colorGrad.addColorStop(0.72, '#ffaa00');
      colorGrad.addColorStop(1, '#ff2200');
      leftLegend = isSpanish ? "Succión (-P)" : "Suction (-P)";
      centerLegend = "P = 0 Pa";
      rightLegend = isSpanish ? "Estancamiento (+P)" : "Stagnation (+P)";

    } else if (activeMode === 'velocity') {
      colorGrad.addColorStop(0, '#0a0d24');
      colorGrad.addColorStop(0.25, '#0077ff');
      colorGrad.addColorStop(0.50, '#00e5ff');
      colorGrad.addColorStop(0.70, '#00ff66');
      colorGrad.addColorStop(0.85, '#ffff00');
      colorGrad.addColorStop(1, '#ff3311');
      leftLegend = "0 m/s";
      centerLegend = isSpanish ? "Vel. Media" : "Mean Speed";
      rightLegend = isSpanish ? "Velocidad Máx" : "Max Velocity";

    } else if (activeMode === 'vorticity') {
      colorGrad.addColorStop(0, '#fc3228');
      colorGrad.addColorStop(0.35, '#c82020');
      colorGrad.addColorStop(0.50, '#0e121c');
      colorGrad.addColorStop(0.65, '#0088cc');
      colorGrad.addColorStop(1, '#19afff');
      leftLegend = isSpanish ? "Horario (-ω)" : "Clockwise (-ω)";
      centerLegend = "ω = 0 s⁻¹";
      rightLegend = isSpanish ? "Antihorario (+ω)" : "Counter-CW (+ω)";

    } else if (activeMode === 'schroeder_speed') {
      colorGrad.addColorStop(0, '#000088');
      colorGrad.addColorStop(0.18, '#0000ff');
      colorGrad.addColorStop(0.38, '#00ffff');
      colorGrad.addColorStop(0.58, '#00ff00');
      colorGrad.addColorStop(0.78, '#ffff00');
      colorGrad.addColorStop(0.92, '#ff0000');
      colorGrad.addColorStop(1, '#880000');
      leftLegend = isSpanish ? "0 m/s (Reposo)" : "0 m/s (Rest)";
      centerLegend = isSpanish ? "U∞ Nominal" : "Nominal U∞";
      rightLegend = isSpanish ? "Rapidez Máx" : "Max Speed";

    } else if (activeMode === 'schroeder_curl') {
      colorGrad.addColorStop(0, '#0000ff');
      colorGrad.addColorStop(0.25, '#00ffff');
      colorGrad.addColorStop(0.50, '#00ff00');
      colorGrad.addColorStop(0.75, '#ffff00');
      colorGrad.addColorStop(1, '#ff0000');
      leftLegend = isSpanish ? "Horario (-ω)" : "Clockwise (-ω)";
      centerLegend = isSpanish ? "ω = 0 (Irrotacional)" : "ω = 0 (Irrotational)";
      rightLegend = isSpanish ? "Antihorario (+ω)" : "Counter-CW (+ω)";

    } else {
      // Por defecto: Humo y líneas de corriente (Smoke & Streamlines)
      colorGrad.addColorStop(0, '#020617');
      colorGrad.addColorStop(0.35, '#0f172a');
      colorGrad.addColorStop(0.65, '#0284c7');
      colorGrad.addColorStop(0.88, '#38bdf8');
      colorGrad.addColorStop(1, '#ffffff');
      leftLegend = isSpanish ? "Fondo Túnel" : "Tunnel Background";
      centerLegend = isSpanish ? "Flujo Laminar" : "Laminar Stream";
      rightLegend = isSpanish ? "Trazador Humo" : "Smoke Tracer";
    }

    return { colorGrad, leftLegend, centerLegend, rightLegend };
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


    /**
   * Renderiza el diseño técnico completo de informe aerodinámico con panel derecho de telemetría y tablas
   */
  function drawReportLayout(ctx, sim, targetW = 2560, targetH = 1440, options = {}) {
    if (!ctx || !sim || !sim.canvas) return;

    const scaleX = targetW / 2560;
    const scaleY = targetH / 1440;
    try {
      ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);

      // --- FONDO PRINCIPAL GARANTIZADO ---
      const bgGrad = ctx.createRadialGradient(1280, 720, 100, 1280, 720, 1500);
      bgGrad.addColorStop(0, '#101424');
      bgGrad.addColorStop(0.7, '#0a0d18');
      bgGrad.addColorStop(1, '#06080e');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 2560, 1440);

      // Cuadrícula Blueprint sutil de ingeniería (optimizada en un solo trazo continuo)
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 255, 204, 0.025)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= 2560; x += 50) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 1440);
      }
      for (let y = 0; y <= 1440; y += 50) {
        ctx.moveTo(0, y);
        ctx.lineTo(2560, y);
      }
      ctx.stroke();
      ctx.restore();

      const activeLang = options.lang || window.currentLang || (typeof localStorage !== 'undefined' ? localStorage.getItem('fluid_sim_lang') : null);
      const isSpanish = (options.isSpanish !== undefined) ? options.isSpanish : (activeLang === 'es' || (!window.currentLang && !localStorage.getItem('fluid_sim_lang') && (navigator.language || '').startsWith('es')));

      // 2. Determinar objeto de prueba y métricas aerodinámicas (vincular a la pieza barrida si existe)
      let targetElement = null;
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

      try {
        const sweptElem = (window.AerodynamicSweep && typeof window.AerodynamicSweep.getLastSweptElement === 'function')
          ? window.AerodynamicSweep.getLastSweptElement()
          : null;
        targetElement = (sweptElem && sim.elements && sim.elements.includes(sweptElem))
          ? sweptElem
          : sim.selectedElement;
        if (!targetElement && sim.elements && sim.elements.length > 0) {
          targetElement = sim.elements.find(e => e && !e.isProbe) || sim.elements[0];
        }

        if (targetElement) {
          elementName = (typeof window.getLocalizedObstacleName === 'function')
            ? window.getLocalizedObstacleName(targetElement.name || '', isSpanish)
            : (targetElement.name || (isSpanish ? "Cuerpo Aerodinámico" : "Aerodynamic Body"));
          if (targetElement.isProbe) {
            isProbe = true;
            metrics.dragForce = 0;
            metrics.liftForce = 0;
            metrics.pMax = targetElement.measuredP || 0;
            metrics.pMin = targetElement.measuredVorticity || 0;
          } else {
            const obsIdx = sim.elements.indexOf(targetElement);
            if (sim.isLBMMode && sim.lbm) {
              const fx = (sim.lbm.forceX !== undefined) ? sim.lbm.forceX : (sim.lbm.barrierFx || 0);
              const fy = (sim.lbm.forceY !== undefined) ? sim.lbm.forceY : (sim.lbm.barrierFy || 0);
              metrics = {
                dragForce: fx * 1000,
                liftForce: fy * 1000,
                cd: Math.abs(fx) * 10,
                cl: fy * 10,
                efficiency: Math.abs(fy / (Math.abs(fx) + 1e-6)),
                reynolds: Math.round(sim.lbm.viscosity > 0 ? (sim.lbm.u0 * 20) / sim.lbm.viscosity * 100 : 0),
                pMax: 0,
                pMin: 0,
                aoa: targetElement.currentRotationDeg || 0
              };
            } else if (sim.fluid && typeof sim.fluid.calculateHydrodynamicForces === 'function') {
              const raw = sim.fluid.calculateHydrodynamicForces(targetElement, obsIdx) || {};
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
      } catch (telemetryErr) {
        console.warn("[Report] Telemetry extraction fallback:", telemetryErr);
      }

      // =========================================================================
      // --- 1. ENCABEZADO INSTITUCIONAL PRINCIPAL (LOGO + IDENTIFICACIÓN + BADGES) ---
      // =========================================================================
      const headerX = 40;
      const headerY = 30;
      const headerW = 2480;
      const headerH = 100;

      drawRoundedRect(ctx, headerX, headerY, headerW, headerH, 10, 'rgba(19, 23, 38, 0.94)', 'rgba(0, 255, 204, 0.35)', 1.5);

      // Logo de Ambystoma Technologies con proporción de aspecto real preservada
      const navLogo = document.querySelector('.navbar-logo-img');
      const targetLogoH = 62;
      // Proporción original de logo.png (2163 x 403 = ~5.367)
      const logoAspect = (navLogo && navLogo.naturalWidth && navLogo.naturalHeight)
        ? (navLogo.naturalWidth / navLogo.naturalHeight)
        : (2163 / 403);
      const targetLogoW = Math.round(targetLogoH * logoAspect);
      const logoX = headerX + 24;
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
      ctx.fillText('AERODYNAMICS & FLUID DYNAMICS RESEARCH LAB', titleX, headerY + 30);

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 24px "Inter", system-ui, -apple-system, sans-serif';
      const mainTitle = isSpanish
        ? "INFORME TÉCNICO DE SIMULACIÓN Y TELEMETRÍA AERODINÁMICA"
        : "AERODYNAMIC SIMULATION & TELEMETRY TECHNICAL REPORT";
      ctx.fillText(mainTitle, titleX, headerY + 60);

      ctx.fillStyle = '#8b949e';
      ctx.font = '500 13px "Inter", system-ui, -apple-system, sans-serif';
      const subTitle = isSpanish
        ? "Solucionador Navier-Stokes 2D & Lattice-Boltzmann (LBM D2Q9) • Captura Instantánea de Flujo"
        : "2D Navier-Stokes & Lattice-Boltzmann (LBM D2Q9) Solver • Instantaneous Flow Telemetry";
      ctx.fillText(subTitle, titleX, headerY + 83);
      ctx.restore();

      // Badges a la derecha del Header
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const timeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      // Badges a la derecha del Header alineados dinámicamente de derecha a izquierda para evitar desbordamiento
      let curBadgeRight = headerX + headerW - 24;
      const badgeSpacing = 16;

      // Status Badge (Live / Paused / Recording / Render)
      const statusText = (options && options.badgeTag) ? options.badgeTag : (sim.isPaused ? (isSpanish ? "PAUSADO" : "PAUSED") : (isSpanish ? "EN VIVO (60 FPS)" : "LIVE (60 FPS)"));
      const isRecordTag = !!(options && options.badgeTag);
      const statusBg = isRecordTag ? 'rgba(0, 255, 204, 0.15)' : (sim.isPaused ? 'rgba(255, 184, 108, 0.15)' : 'rgba(0, 255, 204, 0.15)');
      const statusColor = isRecordTag ? '#00ffcc' : (sim.isPaused ? '#ffb86c' : '#00ffcc');
      const statusW = drawBadge(ctx, `● ${statusText}`, curBadgeRight, headerY + headerH / 2, statusBg, statusColor, statusColor, 13, true, 'right');
      curBadgeRight -= (statusW + badgeSpacing);

      // Engine badge
      const engineText = sim.isLBMMode ? "LBM D2Q9 (200x100)" : "CFD NAVIER-STOKES (160x90)";
      const engineW = drawBadge(ctx, `⚙ ${engineText}`, curBadgeRight, headerY + headerH / 2, 'rgba(56, 189, 248, 0.12)', '#38bdf8', 'rgba(56, 189, 248, 0.4)', 13, true, 'right');
      curBadgeRight -= (engineW + badgeSpacing);

      // Timestamp badge
      const timeW = drawBadge(ctx, `🕒 ${timeStr}`, curBadgeRight, headerY + headerH / 2, 'rgba(255, 255, 255, 0.06)', '#e2e8f0', 'rgba(255, 255, 255, 0.18)', 13, true, 'right');
      curBadgeRight -= (timeW + badgeSpacing);

      // =========================================================================
      // --- 2. PANELES PRINCIPALES: IZQUIERDA (SIMULACIÓN) Y DERECHA (TABLAS) ---
      // =========================================================================
      const panelsY = 150;
      const panelsH = 1226;

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

      const activeVisMode = (options && options.visMode) ? options.visMode : (sim ? sim.visMode : "smoke");
      const activeVisName = getVisModeName(activeVisMode, isSpanish);
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

      // Origen del canvas de la simulación
      const sourceCanvas = (options && options.customSimCanvas) ? options.customSimCanvas : sim.canvas;

      // Cálculo de encuadre proporcional perfecto (aspect-fit)
      const simAspect = (sourceCanvas && sourceCanvas.width && sourceCanvas.height) ? (sourceCanvas.width / sourceCanvas.height) : ((sim.canvas.width || 16) / (sim.canvas.height || 9));
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
      if (sourceCanvas && sourceCanvas.width > 0 && sourceCanvas.height > 0) {
        try {
          ctx.drawImage(sourceCanvas, drawX, drawY, drawW, drawH);
        } catch (drawErr) {
          console.warn("[Report] Error drawing source canvas:", drawErr);
        }
      }

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

      const { colorGrad, leftLegend, centerLegend, rightLegend } = getColormapRamp(sim, ctx, gradBarX, gradBarW, isSpanish, activeVisMode);

      ctx.save();
      drawRoundedRect(ctx, gradBarX, gradBarY, gradBarW, gradBarH, 4, colorGrad, 'rgba(255,255,255,0.25)', 1);
      ctx.restore();

      ctx.font = '500 11px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'left';
      ctx.fillText(leftLegend, gradBarX, gradBarY + gradBarH + 11);
      if (centerLegend) {
        ctx.textAlign = 'center';
        ctx.fillText(centerLegend, gradBarX + gradBarW / 2, gradBarY + gradBarH + 11);
      }
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

      const flowActiveText = (sim.isFlowActive)
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
          c2: { label: isSpanish ? "Estado del Flujo:" : "Flow Animation:", value: flowActiveText, color: (sim.isFlowActive) ? '#00ffcc' : '#fb923c' }
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

      const h4 = drawHomogeneousTable(ctx, {
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
      curTableY += h4 + tableGap;

      // =========================================================================
      // --- CITACIÓN CIENTÍFICA INSTITUCIONAL (APA 7ª ed.) EN PANEL DERECHO ---
      // =========================================================================
      const citBoxX = tableInnerX;
      const citBoxW = tableInnerW;
      const citBoxY = curTableY;
      const maxPanelBottom = panelsY + panelsH - 16;
      const citBoxH = Math.max(126, maxPanelBottom - citBoxY);

      // Contenedor principal de la tarjeta de citación
      drawRoundedRect(ctx, citBoxX, citBoxY, citBoxW, citBoxH, 10, 'rgba(18, 22, 38, 0.96)', 'rgba(0, 255, 204, 0.35)', 1.2);

      // Cabecera de la tarjeta
      const citHeaderH = 40;
      drawRoundedRect(ctx, citBoxX, citBoxY, citBoxW, citHeaderH, [10, 10, 0, 0], 'rgba(24, 29, 50, 0.98)', 'rgba(54, 59, 88, 0.75)', 1);

      // Título de la cabecera
      ctx.save();
      ctx.fillStyle = '#00ffcc';
      ctx.font = '700 14.5px "Inter", system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const citHeaderTitle = isSpanish
        ? "📖  REFERENCIA Y CITACIÓN CIENTÍFICA (NORMA APA 7ª ED.)"
        : "📖  SCIENTIFIC REFERENCE & CITATION (APA 7th ED. FORMAT)";
      ctx.fillText(citHeaderTitle, citBoxX + 16, citBoxY + citHeaderH / 2);

      // Badge a la derecha de la cabecera (alineado a la derecha con margen uniforme de 16px)
      const citBadgeText = isSpanish ? "SOFTWARE CIENTÍFICO" : "COMPUTATIONAL SOFTWARE";
      drawBadge(ctx, citBadgeText, citBoxX + citBoxW - 16, citBoxY + citHeaderH / 2, 'rgba(0, 255, 204, 0.12)', '#00ffcc', 'rgba(0, 255, 204, 0.4)', 12, true, 'right');
      ctx.restore();

      // Textos dinámicos en el idioma seleccionado
      const citAuthorAndTitle = isSpanish
        ? "Segura Torres, B. A. (2026). Simulador 2D de Fluidos y Túnel de Viento Interactivo [Software computacional]. Ambystoma Technologies."
        : "Segura Torres, B. A. (2026). Interactive 2D Fluid & Wind Tunnel Simulator [Computational software]. Ambystoma Technologies.";
      const citUrl = "https://ambystomatechnologies.github.io/wind-tunnel-simulator/";
      const citPrompt = isSpanish
        ? "Para citar este simulador en tesis, artículos científicos, informes técnicos o proyectos de investigación:"
        : "To cite this software in theses, scientific papers, technical reports, or research projects:";
      const citMeta = isSpanish
        ? "Acceso Abierto (Open Access) • Licencia MIT • Repositorio Oficial"
        : "Open Access • MIT License • Official GitHub Repository";

      // Renderizado del contenido interno según el espacio disponible
      const hasAmpleRoom = citBoxH >= 165;
      const calloutX = citBoxX + 16;
      const calloutW = citBoxW - 32;

      if (hasAmpleRoom) {
        // 1. Línea de instrucción / prompt
        ctx.save();
        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 13px "Inter", system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(citPrompt, calloutX + 2, citBoxY + citHeaderH + 12);
        ctx.restore();

        // 2. Caja Callout resaltada con la cita APA
        const calloutY = citBoxY + citHeaderH + 34;
        const calloutH = 48;
        drawRoundedRect(ctx, calloutX, calloutY, calloutW, calloutH, 6, 'rgba(10, 14, 26, 0.85)', 'rgba(0, 255, 204, 0.25)', 1);

        // Barra vertical izquierda de acento
        ctx.fillStyle = '#00ffcc';
        ctx.fillRect(calloutX, calloutY + 2, 4, calloutH - 4);

        // Texto de la cita con ajuste de fuente automático
        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#f8fafc';
        let fSize = 14.5;
        ctx.font = `700 ${fSize}px "Inter", system-ui, sans-serif`;
        while (ctx.measureText(citAuthorAndTitle).width > (calloutW - 28) && fSize > 11) {
          fSize -= 0.5;
          ctx.font = `700 ${fSize}px "Inter", system-ui, sans-serif`;
        }
        ctx.fillText(citAuthorAndTitle, calloutX + 16, calloutY + calloutH / 2);
        ctx.restore();

        // 3. Fila inferior de Enlace URL y Metadatos
        const metaY = calloutY + calloutH + 18;
        ctx.save();
        ctx.textBaseline = 'middle';

        // URL (izquierda)
        ctx.textAlign = 'left';
        ctx.font = '700 13.5px monospace';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`🔗 ${citUrl}`, calloutX + 2, metaY);

        // Metadatos (derecha)
        ctx.textAlign = 'right';
        ctx.font = '500 12.5px "Inter", system-ui, sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText(citMeta, citBoxX + citBoxW - 18, metaY);
        ctx.restore();
      } else {
        // Formato compacto (cuando hay 3 o más cuerpos en el túnel)
        const calloutY = citBoxY + citHeaderH + 10;
        const calloutH = 42;
        drawRoundedRect(ctx, calloutX, calloutY, calloutW, calloutH, 6, 'rgba(10, 14, 26, 0.85)', 'rgba(0, 255, 204, 0.25)', 1);

        // Barra vertical izquierda de acento
        ctx.fillStyle = '#00ffcc';
        ctx.fillRect(calloutX, calloutY + 2, 4, calloutH - 4);

        // Texto de la cita
        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#f8fafc';
        let fSize = 14;
        ctx.font = `700 ${fSize}px "Inter", system-ui, sans-serif`;
        while (ctx.measureText(citAuthorAndTitle).width > (calloutW - 28) && fSize > 11) {
          fSize -= 0.5;
          ctx.font = `700 ${fSize}px "Inter", system-ui, sans-serif`;
        }
        ctx.fillText(citAuthorAndTitle, calloutX + 16, calloutY + calloutH / 2);
        ctx.restore();

        // URL y Metadatos
        const metaY = calloutY + calloutH + 15;
        ctx.save();
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.font = '700 13px monospace';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`🔗 ${citUrl}`, calloutX + 2, metaY);

        ctx.textAlign = 'right';
        ctx.font = '500 12px "Inter", system-ui, sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText(citMeta, citBoxX + citBoxW - 18, metaY);
        ctx.restore();
      }

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


    } catch (err) {
      console.error("[Report] Error in drawReportLayout:", err);
    } finally {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
  }

  /**
   * Obtiene el rectángulo exacto de recorte del dominio físico de la simulación,
   * descartando cualquier margen o franja negra exterior añadida por el canvas.
   */
  function getFluidDomainCrop(sim, sourceCanvas) {
    if (!sim || !sourceCanvas) return null;

    const sourceW = sourceCanvas.width;
    const sourceH = sourceCanvas.height;
    const simW = sim.width || (sourceW / (window.devicePixelRatio || 1));
    const simH = sim.height || (sourceH / (window.devicePixelRatio || 1));
    const dprX = sourceW / simW;
    const dprY = sourceH / simH;

    if (typeof sim.worldToScreen === 'function' && sim.fluid) {
      const origin = sim.worldToScreen(0, 0);
      const domainW = (sim.fluid.domainWidth || 16.0) * (sim.zoomLevel || 1.0);
      const domainH = (sim.fluid.domainHeight || 9.0) * (sim.zoomLevel || 1.0);

      let sx = Math.round(origin.x * dprX);
      let sy = Math.round(origin.y * dprY);
      let sw = Math.round(domainW * dprX);
      let sh = Math.round(domainH * dprY);

      if (sx >= -10 && sy >= -10 && sw > 50 && sh > 50) {
        const clampSx = Math.max(0, sx);
        const clampSy = Math.max(0, sy);
        const clampSw = Math.min(sourceW - clampSx, sw - (clampSx - sx));
        const clampSh = Math.min(sourceH - clampSy, sh - (clampSy - sy));
        if (clampSw > 50 && clampSh > 50) {
          return {
            sx: clampSx,
            sy: clampSy,
            sw: clampSw,
            sh: clampSh,
            aspect: clampSw / clampSh
          };
        }
      }
    }

    return {
      sx: 0,
      sy: 0,
      sw: sourceW,
      sh: sourceH,
      aspect: sourceW / sourceH
    };
  }

  /**
   * Renderiza el diseño visual limpio sin metadatos (tanto para video como para capturas JPG/PNG):
   * - Sin marcos de ningún tipo (ni en logo, ni en referencia, ni en la animación).
   * - Logotipo y referencia bajados, ubicados inmediatamente arriba del borde de la simulación.
   * - La simulación se recorta exactamente en su dominio físico: cero franjas negras arriba o abajo.
   */
  function drawCleanVideoLayout(ctx, sim, targetW = 1920, targetH = 1080, options = {}) {
    if (!ctx || !sim || !sim.canvas) return;

    try {
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      const activeLang = options.lang || window.currentLang || (typeof localStorage !== 'undefined' ? localStorage.getItem('fluid_sim_lang') : null);
      const isSpanish = (options.isSpanish !== undefined) ? options.isSpanish : (activeLang === 'es' || (!window.currentLang && !localStorage.getItem('fluid_sim_lang') && (navigator.language || '').startsWith('es')));

      // 1. Fondo continuo sin marcos
      ctx.fillStyle = '#090b10';
      ctx.fillRect(0, 0, targetW, targetH);

      // Factor de escala relativo a 1920
      const scale = targetW / 1920;

      // 2. Encabezado superior ajustado: logo y referencia bajados, pegados al borde de la simulación
      const headerH = Math.round(90 * scale);

      let navLogo = document.querySelector('.navbar-logo-img');
      if (!navLogo || !navLogo.complete || !navLogo.naturalWidth) {
        if (!window._cachedReportLogo) {
          window._cachedReportLogo = new Image();
          window._cachedReportLogo.src = 'logo.png';
        }
        navLogo = window._cachedReportLogo;
      }

      // Logotipo grande manteniendo las proporciones destacadas
      const targetLogoH = Math.round(68 * scale);
      const logoAspect = (navLogo && navLogo.naturalWidth && navLogo.naturalHeight)
        ? (navLogo.naturalWidth / navLogo.naturalHeight)
        : (2163 / 403);
      const targetLogoW = Math.round(targetLogoH * logoAspect);

      const logoX = Math.round(36 * scale);
      // Bajado para quedar a solo 10px del borde superior de la simulación
      const logoY = headerH - targetLogoH - Math.round(8 * scale);

      let logoDrawn = false;
      if (navLogo && navLogo.complete && navLogo.naturalWidth > 0) {
        try {
          ctx.drawImage(navLogo, logoX, logoY, targetLogoW, targetLogoH);
          logoDrawn = true;
        } catch (e) {
          logoDrawn = false;
        }
      }
      if (!logoDrawn) {
        ctx.save();
        ctx.fillStyle = '#00ffcc';
        ctx.font = `700 ${Math.round(28 * scale)}px "Inter", system-ui, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText("AMBYSTOMA TECH", logoX, logoY + targetLogoH / 2);
        ctx.restore();
      }

      // Referencia científica formal bajada y ubicada justo arriba de la simulación
      const refX = logoX + (logoDrawn ? targetLogoW : Math.round(365 * scale)) + Math.round(32 * scale);

      ctx.save();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      // Etiqueta formal APA y URL oficial (Línea 1)
      const tagFontSize = Math.round(14 * scale);
      ctx.fillStyle = '#38bdf8';
      ctx.font = `700 ${tagFontSize}px monospace`;
      const refTag = isSpanish
        ? "■  REFERENCIA CIENTÍFICA (NORMA APA 7ª ED.) • https://ambystomatechnologies.github.io/wind-tunnel-simulator/"
        : "■  SCIENTIFIC CITATION (APA 7TH ED.) • https://ambystomatechnologies.github.io/wind-tunnel-simulator/";
      ctx.fillText(refTag, refX, headerH - Math.round(54 * scale));

      // Cita de autoría y software (Línea 2, fuente destacada en blanco nítido)
      ctx.fillStyle = '#ffffff';
      let citFontSize = Math.round(18 * scale);
      ctx.font = `700 ${citFontSize}px "Inter", system-ui, sans-serif`;
      const refCitation = isSpanish
        ? "Segura Torres, B. A. (2026). Simulador 2D de Fluidos y Túnel de Viento Interactivo [Software computacional]. Ambystoma Technologies."
        : "Segura Torres, B. A. (2026). Interactive 2D Fluid Mechanics & Wind Tunnel Simulator [Computer software]. Ambystoma Technologies.";

      const maxRefW = targetW - refX - Math.round(36 * scale);
      while (ctx.measureText(refCitation).width > maxRefW && citFontSize > 11) {
        citFontSize -= 0.5;
        ctx.font = `700 ${citFontSize}px "Inter", system-ui, sans-serif`;
      }
      ctx.fillText(refCitation, refX, headerH - Math.round(22 * scale));

      ctx.restore();

      // 3. Área de Animación: Comienza inmediatamente en headerH y se extiende hasta targetH (sin franja negra abajo)
      const animY = headerH;
      const animW = targetW;
      const animH = targetH - animY;

      const sourceCanvas = (options && options.customSimCanvas) ? options.customSimCanvas : sim.canvas;
      const crop = getFluidDomainCrop(sim, sourceCanvas);

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      if (sourceCanvas && sourceCanvas.width > 0 && sourceCanvas.height > 0 && animH > 0) {
        try {
          if (crop) {
            ctx.drawImage(sourceCanvas, crop.sx, crop.sy, crop.sw, crop.sh, 0, animY, animW, animH);
          } else {
            ctx.drawImage(sourceCanvas, 0, animY, animW, animH);
          }
        } catch (drawErr) {
          console.warn("[Recorder] Error drawing clean video frame:", drawErr);
        }
      }
      ctx.restore();

    } catch (err) {
      console.error("[Report] Error in drawCleanVideoLayout:", err);
    } finally {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
  }

  /**
   * Renderiza el diseño limpio sin metadatos (tanto para imagen JPG/PNG como para vídeo):
   * - Sin marcos de ningún tipo (eliminados completamente).
   * - Idéntico al formato de vídeo sin metadatos: únicamente el logotipo a la izquierda y la cita de referencia arriba.
   * - La simulación se recorta exactamente en su dominio físico sin franjas negras.
   */
  function drawCleanReportLayout(ctx, sim, targetW = 2560, targetH = 1440, options = {}) {
    if (!ctx || !sim || !sim.canvas) return;
    drawCleanVideoLayout(ctx, sim, targetW, targetH, options);
    return;

    const scaleX = targetW / 2560;
    const scaleY = targetH / 1440;
    try {
      ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);

      const activeLang = options.lang || window.currentLang || (typeof localStorage !== 'undefined' ? localStorage.getItem('fluid_sim_lang') : null);
      const isSpanish = (options.isSpanish !== undefined) ? options.isSpanish : (activeLang === 'es' || (!window.currentLang && !localStorage.getItem('fluid_sim_lang') && (navigator.language || '').startsWith('es')));

      // 1. Fondo radial
      const bgGrad = ctx.createRadialGradient(1280, 720, 100, 1280, 720, 1500);
      bgGrad.addColorStop(0, '#101424');
      bgGrad.addColorStop(0.7, '#0a0d18');
      bgGrad.addColorStop(1, '#06080e');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 2560, 1440);

      // Cuadrícula Blueprint (optimizada en un solo trazo continuo)
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 255, 204, 0.025)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= 2560; x += 50) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 1440);
      }
      for (let y = 0; y <= 1440; y += 50) {
        ctx.moveTo(0, y);
        ctx.lineTo(2560, y);
      }
      ctx.stroke();
      ctx.restore();

      // 2. Encabezado Superior (Logo + Referencia APA + Badges)
      const headerY = 24;
      const headerH = 88;
      const navLogo = document.querySelector('.navbar-logo-img');
      const targetLogoH = 56;
      const logoAspect = (navLogo && navLogo.naturalWidth && navLogo.naturalHeight)
        ? (navLogo.naturalWidth / navLogo.naturalHeight)
        : (2163 / 403);
      const targetLogoW = Math.round(targetLogoH * logoAspect);

      // Caja Logo (Izquierda)
      const logoBoxX = 40;
      const logoBoxW = Math.max(320, targetLogoW + 48);
      drawRoundedRect(ctx, logoBoxX, headerY, logoBoxW, headerH, 10, 'rgba(19, 23, 38, 0.94)', 'rgba(0, 255, 204, 0.35)', 1.5);

      const logoDrawX = logoBoxX + Math.round((logoBoxW - targetLogoW) / 2);
      const logoDrawY = headerY + Math.round((headerH - targetLogoH) / 2);
      let logoDrawn = false;
      if (navLogo && navLogo.complete && navLogo.naturalWidth > 0) {
        try {
          ctx.drawImage(navLogo, logoDrawX, logoDrawY, targetLogoW, targetLogoH);
          logoDrawn = true;
        } catch (e) {
          logoDrawn = false;
        }
      }
      if (!logoDrawn) {
        ctx.save();
        ctx.fillStyle = '#00ffcc';
        ctx.font = '700 22px "Inter", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText("AMBYSTOMA TECH", logoBoxX + logoBoxW / 2, headerY + headerH / 2);
        ctx.restore();
      }

      // Caja Referencia APA (Centro-Izquierda)
      const refBoxX = logoBoxX + logoBoxW + 16;
      const badgesWidth = 520;
      const refBoxW = 2560 - 40 - badgesWidth - 16 - refBoxX;
      drawRoundedRect(ctx, refBoxX, headerY, refBoxW, headerH, 10, 'rgba(19, 23, 38, 0.94)', 'rgba(56, 189, 248, 0.30)', 1.5);

      ctx.save();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      // Título APA
      ctx.fillStyle = '#38bdf8';
      ctx.font = '700 12.5px monospace';
      ctx.fillText(
        isSpanish
          ? "■  REFERENCIA CIENTÍFICA (NORMA APA 7ª ED.) • https://ambystomatechnologies.github.io/wind-tunnel-simulator/"
          : "■  SCIENTIFIC CITATION (APA 7TH ED.) • https://ambystomatechnologies.github.io/wind-tunnel-simulator/",
        refBoxX + 20,
        headerY + 26
      );
      // Texto APA
      ctx.fillStyle = '#f8fafc';
      ctx.font = '600 14px "Inter", system-ui, sans-serif';
      ctx.fillText(
        isSpanish
          ? "Segura Torres, B. A. (2026). Simulador 2D de Fluidos y Túnel de Viento Interactivo [Software computacional]. Ambystoma Technologies."
          : "Segura Torres, B. A. (2026). Interactive 2D Fluid Mechanics & Wind Tunnel Simulator [Computer software]. Ambystoma Technologies.",
        refBoxX + 20,
        headerY + 58
      );
      ctx.restore();

      // Columna de Badges (Derecha)
      const badgesX = 2560 - 40 - badgesWidth;
      const badgeCol1W = 240;
      const badgeCol2W = 265;
      const badgeRow1Y = headerY + 22;
      const badgeRow2Y = headerY + 62;

      // Badges fila 1
      const engineText = sim.isLBMMode ? "LBM D2Q9 (SCHROEDER)" : "CFD NAVIER-STOKES";
      drawBadge(ctx, engineText, badgesX + badgeCol1W / 2, badgeRow1Y, 'rgba(56, 189, 248, 0.12)', '#38bdf8', 'rgba(56, 189, 248, 0.45)', 12, true, 'center');

      const isLiveRecord = Boolean(options && options.isLive);
      const isVideoRec = Boolean(options && (options.isVideo || options.isLive));
      const recText = isLiveRecord
        ? (isSpanish ? "● GRABACIÓN EN VIVO (30 FPS)" : "● LIVE RECORDING (30 FPS)")
        : (isVideoRec
          ? (isSpanish ? "● VÍDEO RENDERIZADO" : "● RENDERED VIDEO")
          : (isSpanish ? "● SIMULACIÓN EN VIVO" : "● LIVE SIMULATION"));
      drawBadge(ctx, recText, badgesX + badgeCol1W + 15 + badgeCol2W / 2, badgeRow1Y, 'rgba(0, 255, 204, 0.12)', '#00ffcc', 'rgba(0, 255, 204, 0.45)', 12, true, 'center');

      // Badges fila 2
      const activeVisMode = (options && options.visMode) ? options.visMode : (sim ? sim.visMode : 'smoke');
      const activeVisName = getVisModeName(activeVisMode, isSpanish);
      drawBadge(ctx, `Visor: ${activeVisName}`, badgesX + badgeCol1W / 2, badgeRow2Y, 'rgba(0, 229, 255, 0.12)', '#00e5ff', 'rgba(0, 229, 255, 0.45)', 11.5, true, 'center');

      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const timeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      drawBadge(ctx, `⏱ ${timeStr}`, badgesX + badgeCol1W + 15 + badgeCol2W / 2, badgeRow2Y, 'rgba(148, 163, 184, 0.12)', '#94a3b8', 'rgba(148, 163, 184, 0.35)', 11.5, true, 'center');

      // 3. Barra Inferior del Visor: Escala de Colores + Leyenda + Telemetría
      const barH = 76;
      const barY = 1440 - 24 - barH; // 1340
      const barX = 40;
      const barW = 2480;

      // 4. Área Central: Visor de Simulación CFD Amplio y Ajuste Inteligente
      const topAvailable = headerY + headerH + 12; // 24 + 88 + 12 = 124
      const bottomAvailable = barY - 12; // 1340 - 12 = 1328
      const availableH = bottomAvailable - topAvailable; // 1204
      const availableW = 2480;

      const sourceCanvas = (options && options.customSimCanvas) ? options.customSimCanvas : sim.canvas;
      const simAspect = (sourceCanvas && sourceCanvas.width && sourceCanvas.height)
        ? (sourceCanvas.width / sourceCanvas.height)
        : ((sim.canvas.width || 16) / (sim.canvas.height || 9));

      let drawW = availableW;
      let drawH = drawW / simAspect;
      if (drawH > availableH) {
        drawH = availableH;
        drawW = drawH * simAspect;
      }

      const drawX = Math.round(barX + (availableW - drawW) / 2);
      const drawY = Math.round(topAvailable + (availableH - drawH) / 2);

      // Marco contenedor estilizado ajustado a la geometría exacta de la simulación
      drawRoundedRect(ctx, drawX - 3, drawY - 3, drawW + 6, drawH + 6, 8, '#080b12', 'rgba(54, 59, 88, 0.85)', 1.5);

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      if (sourceCanvas && sourceCanvas.width > 0 && sourceCanvas.height > 0) {
        try {
          ctx.drawImage(sourceCanvas, drawX, drawY, drawW, drawH);
        } catch (drawErr) {
          console.warn("[Report] Error drawing clean source canvas:", drawErr);
        }
      }

      // Borde fino del lienzo
      ctx.strokeStyle = 'rgba(0, 255, 204, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(drawX, drawY, drawW, drawH);

      // Marcas de retícula HUD en las 4 esquinas de la simulación
      const cornerLen = 24;
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 3.0;

      ctx.beginPath();
      // Top-Left
      ctx.moveTo(drawX, drawY + cornerLen);
      ctx.lineTo(drawX, drawY);
      ctx.lineTo(drawX + cornerLen, drawY);
      // Top-Right
      ctx.moveTo(drawX + drawW - cornerLen, drawY);
      ctx.lineTo(drawX + drawW);
      ctx.lineTo(drawX + drawW, drawY + cornerLen);
      // Bottom-Left
      ctx.moveTo(drawX, drawY + drawH - cornerLen);
      ctx.lineTo(drawX, drawY + drawH);
      ctx.lineTo(drawX + cornerLen, drawY + drawH);
      // Bottom-Right
      ctx.moveTo(drawX + drawW - cornerLen, drawY + drawH);
      ctx.lineTo(drawX + drawW);
      ctx.lineTo(drawX + drawW, drawY + drawH - cornerLen);
      ctx.stroke();
      ctx.restore();

      // Render de la Barra Inferior (Contenedor estilizado)
      drawRoundedRect(ctx, barX, barY, barW, barH, 8, 'rgba(18, 22, 38, 0.96)', 'rgba(54, 59, 88, 0.85)', 1.5);

      // Badge "ESCALA DE COLOR" a la izquierda
      const labelBadgeW = drawBadge(
        ctx,
        isSpanish ? "ESCALA DE COLOR" : "COLORMAP SCALE",
        barX + 20,
        barY + barH / 2,
        'rgba(0, 255, 204, 0.12)',
        '#00ffcc',
        'rgba(0, 255, 204, 0.4)',
        13.5,
        true,
        'left'
      );

      const gradBarX = barX + 20 + labelBadgeW + 22;
      const gradBarW = 540;
      const gradBarH = 22;
      const gradBarY = barY + 14;

      const { colorGrad, leftLegend, centerLegend, rightLegend } = getColormapRamp(sim, ctx, gradBarX, gradBarW, isSpanish, activeVisMode);

      ctx.save();
      drawRoundedRect(ctx, gradBarX, gradBarY, gradBarW, gradBarH, 4, colorGrad, 'rgba(255, 255, 255, 0.45)', 1.2);
      ctx.restore();

      ctx.save();
      ctx.font = '700 13px "Inter", monospace';
      ctx.fillStyle = '#cbd5e1';
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillText(leftLegend, gradBarX, gradBarY + gradBarH + 6);
      if (centerLegend) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#00ffcc';
        ctx.fillText(centerLegend, gradBarX + gradBarW / 2, gradBarY + gradBarH + 6);
      }
      ctx.textAlign = 'right';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(rightLegend, gradBarX + gradBarW, gradBarY + gradBarH + 6);
      ctx.restore();

      // Badge del Visor Activo en el centro-derecha
      const modePillX = gradBarX + gradBarW + 30;
      drawBadge(
        ctx,
        `VISOR: ${activeVisName.toUpperCase()}`,
        modePillX,
        barY + barH / 2,
        'rgba(56, 189, 248, 0.14)',
        '#38bdf8',
        'rgba(56, 189, 248, 0.40)',
        13,
        true,
        'left'
      );

      // Info de telemetría a la derecha en la barra
      ctx.save();
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.font = '600 14px monospace';
      ctx.fillStyle = '#8bb4e8';
      const speedVal = (sim && sim.fluid && typeof sim.fluid.inflowSpeed === 'number') ? sim.fluid.inflowSpeed.toFixed(1) : '5.0';
      const resInfo = `CANVAS: ${sim.canvas.width}×${sim.canvas.height} px  |  HD RAW FIDELITY  |  DOMINIO: 16.0 m × 9.0 m  |  U∞: ${speedVal} m/s`;
      ctx.fillText(resInfo, barX + barW - 24, barY + barH / 2);
      ctx.restore();

    } catch (err) {
      console.error("[Report] Error in drawCleanReportLayout:", err);
    } finally {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
  }

  /**
   * Genera y descarga el informe técnico completo en formato PNG o JPG
   */
  function generateAerodynamicReport(sim, format = 'jpeg', options = {}) {
    if (!sim || !sim.canvas) {
      console.error("[Report] Simulation canvas is not available.");
      return;
    }

    const btnSaveReport = document.getElementById('btn-save-report');
    if (btnSaveReport) btnSaveReport.classList.add('loading');

    try {
      if (typeof sim.render === 'function') {
        sim.render();
      }

      const activeLang = window.currentLang || (typeof localStorage !== 'undefined' ? localStorage.getItem('fluid_sim_lang') : null);
      const isSpanish = (activeLang === 'es' || (!window.currentLang && !localStorage.getItem('fluid_sim_lang') && (navigator.language || '').startsWith('es')));

      const reportCanvas = document.createElement('canvas');
      reportCanvas.width = 2560;
      reportCanvas.height = 1440;
      const ctx = reportCanvas.getContext('2d');

      const isNoMeta = (options && options.layout === 'no_meta');
      if (isNoMeta) {
        drawCleanReportLayout(ctx, sim, 2560, 1440, options);
      } else {
        drawReportLayout(ctx, sim, 2560, 1440, options);
      }

      const exportFormat = (format && format.toLowerCase() === 'png') ? 'png' : 'jpeg';
      const mimeType = exportFormat === 'png' ? 'image/png' : 'image/jpeg';
      const quality = exportFormat === 'png' ? undefined : 0.95;
      const fileExt = exportFormat === 'png' ? 'png' : 'jpg';

      reportCanvas.toBlob(function (blob) {
        if (!blob) {
          console.error("[Report] Failed to create image blob.");
          if (btnSaveReport) btnSaveReport.classList.remove('loading');
          return;
        }

        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const filenamePrefix = isNoMeta
          ? (isSpanish ? "captura_simulacion_sin_metadatos" : "clean_simulation_capture")
          : (isSpanish ? "informe_aerodinamico" : "aerodynamic_report");
        const filenameDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
        a.href = url;
        a.download = `${filenamePrefix}_${filenameDate}.${fileExt}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setTimeout(function () {
          URL.revokeObjectURL(url);
        }, 10000);

        if (btnSaveReport) btnSaveReport.classList.remove('loading');
      }, mimeType, quality);

    } catch (err) {
      console.error("[Report] Error generating report:", err);
      if (btnSaveReport) btnSaveReport.classList.remove('loading');
    }
  }
  function sampleFluidAt(sim, x, y) {
    let uVal = 0, vVal = 0, pVal = 0, vortVal = 0, speed = 0;
    if (sim.isLBMMode && sim.lbm) {
      const lx = Math.max(1, Math.min(sim.lbm.nx - 2, (x / sim.fluid.domainWidth) * sim.lbm.nx));
      const ly = Math.max(1, Math.min(sim.lbm.ny - 2, (y / sim.fluid.domainHeight) * sim.lbm.ny));
      const idx = Math.floor(lx) + Math.floor(ly) * sim.lbm.nx;
      const scaleToMs = (sim.fluid && sim.fluid.inflowSpeed ? sim.fluid.inflowSpeed : 5.0) / Math.max(0.01, sim.lbm.speed);
      uVal = sim.lbm.ux[idx] * scaleToMs;
      vVal = sim.lbm.uy[idx] * scaleToMs;
      speed = Math.hypot(uVal, vVal);
      pVal = (sim.lbm.rho[idx] - 1.0) * (1.0 / 3.0) * sim.fluid.density * (scaleToMs * scaleToMs);
      vortVal = sim.lbm.curl[idx] * scaleToMs * (sim.lbm.nx / sim.fluid.domainWidth);
    } else if (sim.fluid) {
      const gx = x / sim.fluid.dx;
      const gy = y / sim.fluid.dy;
      uVal = sim.fluid.sampleBilinear(sim.fluid.u, gx, gy);
      vVal = sim.fluid.sampleBilinear(sim.fluid.v, gx, gy);
      pVal = sim.fluid.sampleBilinear(sim.fluid.p, gx, gy);
      vortVal = sim.fluid.sampleBilinear(sim.fluid.vorticity, gx, gy);
      speed = Math.hypot(uVal, vVal);
    }
    return { u: uVal, v: vVal, speed, p: pVal, vorticity: vortVal };
  }

  /**
   * Genera y descarga el archivo CSV científico completo con:
   * 1. Información y Logotipo ASCII oficial de Ambystoma Technologies
   * 2. Referencia y Citación Científica Académica (Norma APA 7ª edición)
   * 3. Metadatos generales de simulación y condiciones de corriente libre
   * 4. Telemetría de fuerzas aerodinámicas y coeficientes (Cd, Cl, L/D, ΔP)
   * 5. Datos de sondas y sensores de flujo (Tubo de Pitot: u, v, velocidad, presión estática, dinámica y total, vorticidad)
   * 6. Barrido automático de ángulo de ataque y polares de arrastre (Cl-α, Cd-α, Drag Polar)
   */
  function generateSimulationCSV(sim) {
    if (!sim) {
      console.error("[Report] Simulation instance is not available for CSV export.");
      return;
    }

    try {
      const activeLang = window.currentLang || (typeof localStorage !== 'undefined' ? localStorage.getItem('fluid_sim_lang') : null);
      const isSpanish = activeLang === 'es';

      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const timeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      const isoTime = now.toISOString();

      const density = (sim.fluid && sim.fluid.density) ? sim.fluid.density : 1.225;
      const viscosity = (sim.fluid && sim.fluid.viscosity) ? sim.fluid.viscosity : 0.00015;
      const dynamicViscosity = density * viscosity;
      const inflowSpeed = (sim.fluid && sim.fluid.inflowSpeed) ? sim.fluid.inflowSpeed : 5.0;
      const inflowAngle = (sim.fluid && sim.fluid.inflowAngle !== undefined) ? (sim.fluid.inflowAngle * 180 / Math.PI) : 0;
      const qInf = 0.5 * density * inflowSpeed * inflowSpeed;
      const activeMaterial = getActiveMaterialName(density, viscosity, isSpanish);

      // Determinar elemento objetivo (vincular a la pieza barrida si existe)
      const sweptElemReport = (window.AerodynamicSweep && typeof window.AerodynamicSweep.getLastSweptElement === 'function')
        ? window.AerodynamicSweep.getLastSweptElement()
        : null;
      let targetElement = (sweptElemReport && sim.elements && sim.elements.includes(sweptElemReport))
        ? sweptElemReport
        : sim.selectedElement;
      if (!targetElement && sim.elements && sim.elements.length > 0) {
        targetElement = sim.elements.find(e => e && !e.isProbe) || sim.elements[0];
      }

      let elementName = isSpanish ? "Túnel Libre (Sin obstáculos)" : "Clean Tunnel (No obstacles)";
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

      if (targetElement) {
        elementName = (typeof window.getLocalizedObstacleName === 'function')
          ? window.getLocalizedObstacleName(targetElement.name || '', isSpanish)
          : (targetElement.name || (isSpanish ? "Cuerpo Aerodinámico" : "Aerodynamic Body"));
        if (targetElement.isProbe) {
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

      const deltaP = Math.abs((metrics.pMax || 0) - (metrics.pMin || 0));
      const regimeText = (Math.abs(metrics.cl) < 0.15 && metrics.cd > 0.8)
        ? (isSpanish ? "Pérdida / Stall" : "Separated (Stall)")
        : (metrics.reynolds > 8000 ? (isSpanish ? "Vórtices Desprendidos" : "Vortex Shedding") : (isSpanish ? "Flujo Laminar Adherido" : "Attached Laminar"));

      // Construcción del documento CSV estructurado
      let csv = '\uFEFF'; // Byte Order Mark para compatibilidad total con Excel y caracteres UTF-8

      // =========================================================================
      // 1. ENCABEZADO INSTITUCIONAL, LOGOTIPO ASCII Y CITACIÓN CIENTÍFICA
      // =========================================================================
      csv += '# =========================================================================================\n';
      csv += '#       ___              _             _                           \n';
      csv += '#      /   | ____ ___  | |__  _   _ ___| |_ ___  _ __ ___   __ _   \n';
      csv += '#     / /| |/ __ `__ \\ | \'_ \\| | | / __| __/ _ \\| \'_ ` _ \\ / _` |  \n';
      csv += '#    / ___ | | | | | | | |_) | |_| \\__ \\ || (_) | | | | | | (_| |  \n';
      csv += '#   /_/  |_|_| |_| |_| |_.__/ \\__, |___/\\__\\___/|_| |_| |_|\\__,_|  \n';
      csv += '#                             |___/                                \n';
      csv += '#                  T E C H N O L O G I E S\n';
      csv += '# =========================================================================================\n';
      csv += '# AMBYSTOMA TECHNOLOGIES - LAB DE INVESTIGACIÓN AERODINÁMICA Y DINÁMICA DE FLUIDOS 2D\n';
      csv += '# Software: Simulador Interactivo de Túnel de Viento y Mecánica de Fluidos CFD\n';
      csv += '# Repositorio Oficial / Plataforma Web: https://ambystomatechnologies.github.io/wind-tunnel-simulator/\n';
      csv += '# Licencia: Código Abierto (MIT Open Source License) • Libre para Educación e Investigación\n';
      csv += '# =========================================================================================\n';
      csv += '#\n';
      csv += '# REFERENCIA Y CITACIÓN CIENTÍFICA OBLIGATORIA (NORMA APA 7ª EDICIÓN):\n';
      csv += '#\n';
      csv += '# En Español:\n';
      csv += '# Segura Torres, B. A. (2026). Simulador 2D de Fluidos y Túnel de Viento Interactivo [Software computacional]. Ambystoma Technologies. https://ambystomatechnologies.github.io/wind-tunnel-simulator/\n';
      csv += '#\n';
      csv += '# In English:\n';
      csv += '# Segura Torres, B. A. (2026). Interactive 2D Fluid & Wind Tunnel Simulator [Computational software]. Ambystoma Technologies. https://ambystomatechnologies.github.io/wind-tunnel-simulator/\n';
      csv += '#\n';
      csv += '# Por favor cite este simulador en tesis de grado, artículos de investigación y laboratorios.\n';
      csv += '# =========================================================================================\n\n';

      // =========================================================================
      // 2. METADATOS GENERALES DEL TÚNEL Y CONDICIONES AMBIENTALES
      // =========================================================================
      csv += isSpanish
        ? '[METADATA_SIMULACION_Y_CONDICIONES_AMBIENTALES]\nParametro,Valor,Unidad,Descripcion\n'
        : '[SIMULATION_METADATA_AND_FLOW_CONDITIONS]\nParameter,Value,Unit,Description\n';
      csv += isSpanish
        ? `Fecha_Generacion,"${timeStr}",Hora_Local,"Fecha y hora de exportación del dataset"\n`
        : `Generation_Date,"${timeStr}",Local_Time,"Dataset export date and time"\n`;
      csv += isSpanish
        ? `Timestamp_ISO,"${isoTime}",UTC,"Estándar ISO-8601"\n`
        : `ISO_Timestamp,"${isoTime}",UTC,"ISO-8601 standard"\n`;
      csv += isSpanish
        ? `Motor_Computacional,"${sim.isLBMMode ? "LBM D2Q9 (Schroeder BGK)" : "CFD Navier-Stokes (MacCormack + Poisson)"}",N/A,"Algoritmo numérico solver"\n`
        : `Solver_Engine,"${sim.isLBMMode ? "LBM D2Q9 (Schroeder BGK)" : "CFD Navier-Stokes (MacCormack + Poisson)"}",N/A,"Numerical solver algorithm"\n`;
      csv += isSpanish
        ? `Resolucion_Malla,"${sim.isLBMMode ? "200x100" : "160x90"}",${sim.isLBMMode ? "nodos" : "celdas"},"Resolución espacial discreta"\n`
        : `Grid_Resolution,"${sim.isLBMMode ? "200x100" : "160x90"}",${sim.isLBMMode ? "nodes" : "cells"},"Discrete spatial grid resolution"\n`;
      csv += isSpanish
        ? `Dimension_Dominio_X,${sim.fluid ? sim.fluid.domainWidth.toFixed(2) : "16.00"},m,"Longitud total del canal"\n`
        : `Domain_Dimension_X,${sim.fluid ? sim.fluid.domainWidth.toFixed(2) : "16.00"},m,"Total channel length"\n`;
      csv += isSpanish
        ? `Dimension_Dominio_Y,${sim.fluid ? sim.fluid.domainHeight.toFixed(2) : "9.00"},m,"Altura del túnel de viento"\n`
        : `Domain_Dimension_Y,${sim.fluid ? sim.fluid.domainHeight.toFixed(2) : "9.00"},m,"Wind tunnel height"\n`;
      csv += isSpanish
        ? `Paso_Espacial_dx,${sim.fluid ? sim.fluid.dx.toFixed(3) : "0.100"},m,"Paso de discretización espacial X"\n`
        : `Spatial_Step_dx,${sim.fluid ? sim.fluid.dx.toFixed(3) : "0.100"},m,"Spatial grid step X"\n`;
      csv += isSpanish
        ? `Paso_Espacial_dy,${sim.fluid ? sim.fluid.dy.toFixed(3) : "0.100"},m,"Paso de discretización espacial Y"\n`
        : `Spatial_Step_dy,${sim.fluid ? sim.fluid.dy.toFixed(3) : "0.100"},m,"Spatial grid step Y"\n`;
      csv += isSpanish
        ? `Medio_Material,"${activeMaterial}",N/A,"Fluido de trabajo"\n`
        : `Fluid_Medium,"${activeMaterial}",N/A,"Working fluid medium"\n`;
      csv += isSpanish
        ? `Densidad_rho,${density.toFixed(4)},kg/m3,"Densidad del medio fluido"\n`
        : `Density_rho,${density.toFixed(4)},kg/m3,"Fluid medium density"\n`;
      csv += isSpanish
        ? `Viscosidad_Cinematica_nu,${viscosity.toExponential(4)},m2/s,"Viscosidad cinemática"\n`
        : `Kinematic_Viscosity_nu,${viscosity.toExponential(4)},m2/s,"Kinematic viscosity"\n`;
      csv += isSpanish
        ? `Viscosidad_Dinamica_mu,${dynamicViscosity.toExponential(4)},Pa*s,"Viscosidad dinámica absoluta (mu = rho * nu)"\n`
        : `Dynamic_Viscosity_mu,${dynamicViscosity.toExponential(4)},Pa*s,"Absolute dynamic viscosity (mu = rho * nu)"\n`;
      csv += isSpanish
        ? `Velocidad_Inflow_Uinf,${inflowSpeed.toFixed(2)},m/s,"Velocidad de corriente libre en entrada"\n`
        : `Inflow_Velocity_Uinf,${inflowSpeed.toFixed(2)},m/s,"Free-stream inlet velocity"\n`;
      csv += isSpanish
        ? `Velocidad_Inflow_kmh,${(inflowSpeed * 3.6).toFixed(2)},km/h,"Velocidad de flujo en km/h"\n`
        : `Inflow_Velocity_kmh,${(inflowSpeed * 3.6).toFixed(2)},km/h,"Flow velocity in km/h"\n`;
      csv += isSpanish
        ? `Presion_Dinamica_qinf,${qInf.toFixed(2)},Pa,"Presión dinámica de corriente libre (0.5 * rho * U^2)"\n`
        : `Dynamic_Pressure_qinf,${qInf.toFixed(2)},Pa,"Free-stream dynamic pressure (0.5 * rho * U^2)"\n`;
      csv += isSpanish
        ? `Angulo_Inflow_deg,${inflowAngle.toFixed(1)},deg,"Ángulo de inclinación del flujo de entrada"\n`
        : `Inflow_Angle_deg,${inflowAngle.toFixed(1)},deg,"Inlet flow inclination angle"\n`;
      csv += isSpanish
        ? `Condicion_Paredes,"${(sim.fluid && sim.fluid.closedWalls) ? "Canal Cerrado (Paredes sólidas no-slip)" : "Túnel Abierto (Deslizamiento libre free-slip)"}",N/A,"Fronteras superior e inferior"\n`
        : `Wall_Condition,"${(sim.fluid && sim.fluid.closedWalls) ? "Closed Channel (Solid no-slip walls)" : "Open Tunnel (Free-slip boundary)"}",N/A,"Top and bottom boundaries"\n`;
      csv += isSpanish
        ? `Turbulencia,"${(sim.fluid && sim.fluid.isTurbulent) ? `Turbulento (Tu: ${sim.fluid.turbulenceIntensity || 10}%)` : "Laminar Uniforme (Tu: 0%)"}",N/A,"Régimen de turbulencia en corriente libre"\n\n`
        : `Turbulence,"${(sim.fluid && sim.fluid.isTurbulent) ? `Turbulent (Tu: ${sim.fluid.turbulenceIntensity || 10}%)` : "Uniform Laminar (Tu: 0%)"}",N/A,"Free-stream turbulence regime"\n\n`;

      // =========================================================================
      // 3. TELEMETRÍA AERODINÁMICA DE CUERPOS EN EL TÚNEL
      // =========================================================================
      csv += isSpanish ? '[TELEMETRIA_AERODINAMICA_Y_FUERZAS]\n' : '[AERODYNAMIC_TELEMETRY_AND_FORCES]\n';
      csv += isSpanish
        ? 'ID,Nombre,Tipo_Elemento,AoA_deg,Fuerza_Arrastre_Fd_N,Fuerza_Sustentacion_Fl_N,Cd,Cl,Eficiencia_L_over_D,Presion_Estancamiento_Pmax_Pa,Presion_Succion_Pmin_Pa,Delta_P_Pa,Numero_Reynolds_Re,Regimen_Aerodinamico\n'
        : 'ID,Name,Element_Type,AoA_deg,Drag_Force_Fd_N,Lift_Force_Fl_N,Cd,Cl,Efficiency_L_over_D,Stagnation_Pressure_Pmax_Pa,Suction_Pressure_Pmin_Pa,Delta_P_Pa,Reynolds_Number_Re,Aerodynamic_Regime\n';
      csv += `1,"${elementName}","${targetElement ? (targetElement.isProbe ? (isSpanish ? "SondaFlujo" : "FlowProbe") : (isSpanish ? "ObstaculoHidrodinamico" : "HydrodynamicObstacle")) : "None"}",${Math.round(metrics.aoa)},${metrics.dragForce.toFixed(3)},${metrics.liftForce.toFixed(3)},${metrics.cd.toFixed(4)},${metrics.cl.toFixed(4)},${metrics.efficiency.toFixed(2)},${(metrics.pMax || 0).toFixed(2)},${(metrics.pMin || 0).toFixed(2)},${deltaP.toFixed(2)},${metrics.reynolds},"${regimeText}"\n\n`;

      // =========================================================================
      // 4. DATOS DE SONDAS Y SENSORES DE FLUJO (TUBO DE PITOT VIRTUAL)
      // =========================================================================
      csv += isSpanish ? '[SONDAS_Y_SENSORES_DE_FLUJO]\n' : '[FLOW_PROBES_AND_SENSORS]\n';
      csv += isSpanish
        ? '# Lecturas puntuales de velocidad, presiones estática, dinámica y total, y vorticidad\nSonda_ID,Nombre,Categoria,Pos_X_m,Pos_Y_m,Velocidad_U_ms,Velocidad_V_ms,Velocidad_Magnitud_ms,Presion_Estatica_Pa,Presion_Dinamica_q_Pa,Presion_Total_P0_Pa,Vorticidad_s-1\n'
        : '# Pointwise readings of velocity, static, dynamic, total pressure, and vorticity\nProbe_ID,Name,Category,Pos_X_m,Pos_Y_m,Velocity_U_ms,Velocity_V_ms,Velocity_Magnitude_ms,Static_Pressure_Pa,Dynamic_Pressure_q_Pa,Total_Pressure_P0_Pa,Vorticity_s-1\n';

      let probeCount = 0;
      // Sondas creadas interactivamente por el usuario
      if (sim.elements && sim.elements.length > 0) {
        sim.elements.forEach((el) => {
          if (el && (el.isProbe || el.constructor.name === 'FlowProbe')) {
            probeCount++;
            const s = sampleFluidAt(sim, el.x, el.y);
            const speedVal = s.speed || el.measuredSpeed || 0;
            const uVal = s.u || el.measuredU || 0;
            const vVal = s.v || el.measuredV || 0;
            const pVal = s.p || el.measuredP || 0;
            const qVal = 0.5 * density * speedVal * speedVal;
            const pTotal = pVal + qVal;
            const vortVal = s.vorticity || el.measuredVorticity || 0;
            const pName = el.name ? ((typeof window.getLocalizedObstacleName === 'function') ? window.getLocalizedObstacleName(el.name, isSpanish) : el.name) : (isSpanish ? `Sonda ${probeCount}` : `Probe ${probeCount}`);
            const pCat = isSpanish ? "Sonda de Usuario" : "User Probe";

            csv += `${probeCount},"${pName}","${pCat}",${el.x.toFixed(2)},${el.y.toFixed(2)},${uVal.toFixed(3)},${vVal.toFixed(3)},${speedVal.toFixed(3)},${pVal.toFixed(2)},${qVal.toFixed(2)},${pTotal.toFixed(2)},${vortVal.toFixed(2)}\n`;
          }
        });
      }

      // Estaciones de medición de referencia estándar en el túnel (para enseñanza y laboratorio)
      const refStations = [
        { name: isSpanish ? "Pitot Entrada (Flujo Libre)" : "Inflow Pitot (Free Stream)", x: 1.5, y: 4.5 },
        { name: isSpanish ? "Borde de Ataque (Upstream)" : "Leading Edge (Upstream)", x: 4.0, y: 4.5 },
        { name: isSpanish ? "Extradós Superior (Succión)" : "Upper Extrados (Suction)", x: 6.0, y: 5.6 },
        { name: isSpanish ? "Intradós Inferior (Presión)" : "Lower Intrados (Pressure)", x: 6.0, y: 3.4 },
        { name: isSpanish ? "Estela Cercana (Wake Center)" : "Near Wake (Center)", x: 8.5, y: 4.5 },
        { name: isSpanish ? "Rastrillo Estela Superior (y=5.5m)" : "Wake Rake Upper (y=5.5m)", x: 11.0, y: 5.5 },
        { name: isSpanish ? "Rastrillo Estela Centro (y=4.5m)" : "Wake Rake Center (y=4.5m)", x: 11.0, y: 4.5 },
        { name: isSpanish ? "Rastrillo Estela Inferior (y=3.5m)" : "Wake Rake Lower (y=3.5m)", x: 11.0, y: 3.5 },
        { name: isSpanish ? "Pitot de Salida del Túnel" : "Tunnel Exit Pitot", x: 14.5, y: 4.5 }
      ];

      refStations.forEach(st => {
        probeCount++;
        const s = sampleFluidAt(sim, st.x, st.y);
        const qVal = 0.5 * density * s.speed * s.speed;
        const pTotal = s.p + qVal;
        const cat = isSpanish ? "Estación de Referencia" : "Reference Station";
        csv += `${probeCount},"${st.name}","${cat}",${st.x.toFixed(2)},${st.y.toFixed(2)},${s.u.toFixed(3)},${s.v.toFixed(3)},${s.speed.toFixed(3)},${s.p.toFixed(2)},${qVal.toFixed(2)},${pTotal.toFixed(2)},${s.vorticity.toFixed(2)}\n`;
      });
      csv += '\n';

      // =========================================================================
      // 5. BARRIDO AUTOMÁTICO DE ÁNGULO DE ATAQUE Y POLARES (Cl-α, Cd-α, Drag Polar)
      // =========================================================================
      csv += isSpanish ? '[BARRIDO_ANGULO_ATAQUE_Y_POLARES_CL_CD]\n' : '[ANGLE_OF_ATTACK_SWEEP_AND_POLARS_CL_CD]\n';
      csv += isSpanish
        ? '# Curva de sustentación, arrastre, polar de Lilienthal y rendimiento L/D\n'
        : '# Lift curve, drag polar of Lilienthal and L/D efficiency\n';
      csv += isSpanish
        ? 'AoA_grados,Cl_Sustentacion,Cd_Arrastre,Eficiencia_L_D,Fuerza_Arrastre_N,Fuerza_Sustentacion_N,Regimen_Aerodinamico\n'
        : 'AoA_deg,Cl_Lift,Cd_Drag,Efficiency_L_over_D,Drag_Force_N,Lift_Force_N,Aerodynamic_Regime\n';

      let sweepData = null;
      if (sim.lastAlphaSweep && sim.lastAlphaSweep.data && sim.lastAlphaSweep.data.length > 0) {
        sweepData = sim.lastAlphaSweep.data;
      } else if (window.AerodynamicSweep && typeof window.AerodynamicSweep.computeAerodynamicPolar === 'function' && targetElement && !targetElement.isProbe) {
        const sweepObj = window.AerodynamicSweep.computeAerodynamicPolar(targetElement, sim.fluid, -10, 20, 1, sim);
        if (sweepObj && sweepObj.data) {
          sweepData = sweepObj.data;
          sim.lastAlphaSweep = sweepObj;
        }
      }

      if (sweepData && sweepData.length > 0) {
        sweepData.forEach(pt => {
          const reg = (typeof window.getLocalizedRegime === 'function')
            ? window.getLocalizedRegime(pt.regime, isSpanish)
            : pt.regime;
          csv += `${pt.aoa},${pt.cl},${pt.cd},${pt.lod},${pt.fd},${pt.fl},"${reg}"\n`;
        });
      } else {
        csv += isSpanish
          ? `# No se detectó un perfil sólido para el cálculo de la polar. Agregue un perfil NACA o cuerpo en el túnel.\n`
          : `# No solid body detected for polar calculation. Add a NACA airfoil or body in the tunnel.\n`;
      }
      csv += '\n';

      // =========================================================================
      // 6. EXPORTAR Y DESCARGAR ARCHIVO CSV
      // =========================================================================
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const filenamePrefix = isSpanish ? "datos_simulacion_telemetria" : "simulation_telemetry_data";
      const filenameDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      a.href = url;
      a.download = `${filenamePrefix}_${filenameDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 10000);

      if (typeof window.showToast === 'function') {
        const successMsg = window.t
          ? (window.t('csvSavedSuccess') || (isSpanish ? "¡Datos de telemetría y sondas exportados a CSV con éxito!" : "Simulation telemetry and probe data successfully exported to CSV!"))
          : (isSpanish ? "¡Datos de telemetría y sondas exportados a CSV con éxito!" : "Simulation telemetry and probe data successfully exported to CSV!");
        window.showToast(successMsg, 'success', 3500);
      }

    } catch (err) {
      console.error("[Report] Error generating CSV:", err);
      if (typeof window.showToast === 'function') {
        window.showToast("Error al generar el archivo CSV: " + err.message, 'error', 4000);
      }
    }
  }


  window.drawReportLayout = drawReportLayout;
  window.drawCleanReportLayout = drawCleanReportLayout;
  window.drawCleanVideoLayout = drawCleanVideoLayout;
  window.getFluidDomainCrop = getFluidDomainCrop;
  window.generateAerodynamicReport = generateAerodynamicReport;
  window.generateSimulationCSV = generateSimulationCSV;
  window.sampleFluidAt = sampleFluidAt;
})();
