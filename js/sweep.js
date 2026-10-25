/**
 * Simulador de Mecánica de Fluidos y Túnel Aerodinámico 2D - Ambystoma Technologies
 * sweep.js - Motor de Barrido Automático de Ángulo de Ataque (α-Sweep) y Polares Aerodinámicas (Cl-α, Cd-α, Drag Polar)
 */

(function () {
  'use strict';

  let currentSweepResults = null;
  let currentActiveTab = 'cl_alpha';
  let isSweepingAnimation = false;
  let sweepAnimationTimer = null;
  let hasExecutedSweepAnimation = false;
  let lastSweptElement = null;
  let lastSweptMinAoa = -10;
  let lastSweptMaxAoa = 20;
  let lastSweptStep = 1;
  let isRealtimeActive = false;
  let realtimeUpdateScheduled = false;

  function isSpanishLang() {
    const lang = window.currentLang || (typeof localStorage !== 'undefined' ? localStorage.getItem('fluid_sim_lang') : null);
    return lang === 'es';
  }

  /**
   * Traduce de forma bidireccional el régimen aerodinámico según el idioma seleccionado al descargar
   */
  function getLocalizedRegime(regimeStr, isSpanish) {
    if (!regimeStr) return isSpanish ? 'Flujo Adherido' : 'Attached Flow';
    const str = String(regimeStr);
    const inWake = str.includes('Estela Aguas Arriba') || str.includes('Upstream Wake') || str.includes('In Wake');

    let base = '';
    if (str.includes('Cuerpo Romo') || str.includes('Bluff Body')) {
      base = isSpanish ? 'Cuerpo Romo / Estela Turbulenta' : 'Bluff Body / Turbulent Wake';
    } else if (str.includes('Pre-Pérdida') || str.includes('Pre-Stall') || str.includes('Máxima Sustentación') || str.includes('Maximum Lift')) {
      base = isSpanish ? 'Máxima Sustentación Pre-Pérdida' : 'Maximum Lift Pre-Stall';
    } else if (str.includes('Simétrico') || str.includes('Neutro') || str.includes('Symmetric') || str.includes('Neutral')) {
      base = isSpanish ? 'Flujo Simétrico / Neutro' : 'Symmetric / Neutral Flow';
    } else if (str.includes('Profunda') || str.includes('Deep Stall')) {
      base = isSpanish ? 'Pérdida Profunda (Deep Stall)' : 'Deep Stall';
    } else if (str.includes('Entrada en Pérdida') || str.includes('Stall Inception')) {
      base = isSpanish ? 'Entrada en Pérdida (Stall)' : 'Stall Inception';
    } else if (str.includes('Vórtices Desprendidos') || str.includes('Vortex Shedding')) {
      base = isSpanish ? 'Vórtices Desprendidos' : 'Vortex Shedding';
    } else if (str.includes('Pérdida') || str.includes('Stall') || str.includes('Separated')) {
      base = isSpanish ? 'Pérdida / Stall' : 'Separated (Stall)';
    } else if (str.includes('Laminar') || str.includes('Attached') || str.includes('Adherido')) {
      base = isSpanish ? 'Flujo Laminar Adherido' : 'Attached Laminar Flow';
    } else {
      base = isSpanish ? 'Flujo Laminar Adherido' : 'Attached Laminar Flow';
    }

    if (inWake) {
      base += isSpanish ? ' (En Estela Aguas Arriba)' : ' (In Upstream Wake)';
    }
    return base;
  }

  /**
   * Traduce los nombres de obstáculos y cuerpos según el idioma seleccionado al descargar
   */
  function getLocalizedObstacleName(name, isSpanish) {
    if (!name) return isSpanish ? 'Cuerpo Aerodinámico' : 'Aerodynamic Body';
    const str = String(name).trim();

    // Perfiles NACA
    const nacaMatch = str.match(/NACA\s*([0-9]{4})/i);
    if (nacaMatch) {
      return isSpanish ? `Perfil NACA ${nacaMatch[1]}` : `NACA ${nacaMatch[1]} Airfoil`;
    }

    const lower = str.toLowerCase();
    if (lower.includes('cylind') || lower.includes('cilind')) {
      return isSpanish ? 'Cilindro Circular' : 'Circular Cylinder';
    }
    if (lower.includes('teardrop') || lower.includes('gota')) {
      return isSpanish ? 'Gota Aerodinámica' : 'Aerodynamic Teardrop';
    }
    if (lower.includes('flat') || lower.includes('placa')) {
      return isSpanish ? 'Placa Plana' : 'Flat Plate';
    }
    if (lower.includes('square') || lower.includes('cuadrad')) {
      return isSpanish ? 'Cuerpo Cuadrado Romo' : 'Bluff Square Body';
    }
    if (lower.includes('cross') || lower.includes('cruz') || lower.includes('suiz')) {
      return isSpanish ? 'Cruz Simétrica (Suiza)' : 'Symmetric Cross (Swiss)';
    }
    if (lower.includes('barrer') || lower.includes('barrier')) {
      return isSpanish ? 'Barrera Lineal (Schroeder)' : 'Linear Barrier (Schroeder)';
    }
    if (lower.includes('wedge') || lower.includes('cuña')) {
      return isSpanish ? 'Cuña Deflectora Aerodinámica' : 'Aerodynamic Wedge Deflector';
    }
    if (lower.includes('car') || lower.includes('auto') || lower.includes('coche') || lower.includes('veh') || lower.includes('bólido')) {
      return isSpanish ? 'Vehículo Deportivo' : 'Race Car Profile';
    }
    if (lower.includes('venturi')) {
      return isSpanish ? 'Tobera Venturi' : 'Venturi Nozzle';
    }
    const figMatch = str.match(/^(Figura|Shape):\s*(.*)$/i);
    if (figMatch) {
      return isSpanish ? `Figura: ${figMatch[2]}` : `Shape: ${figMatch[2]}`;
    }
    if (lower.includes('poly') || lower.includes('políg')) {
      return isSpanish ? 'Polígono Personalizado' : 'Custom Polygon';
    }
    if (lower.includes('freehand') || lower.includes('trazo') || lower.includes('libre')) {
      return isSpanish ? 'Trazo Libre' : 'Freehand Shape';
    }
    if (lower.includes('probe') || lower.includes('sonda')) {
      return isSpanish ? 'Sonda de Flujo' : 'Flow Sensor Probe';
    }
    if (lower.includes('limpio') || lower.includes('clean') || lower.includes('sin obst') || lower.includes('no obst')) {
      return isSpanish ? 'Túnel Libre (Sin obstáculos)' : 'Clean Tunnel (No obstacles)';
    }
    if (lower.includes('perfil') || lower.includes('airfoil') || lower.includes('aerodynamic') || lower.includes('cuerpo') || lower.includes('body')) {
      return isSpanish ? 'Perfil Aerodinámico' : 'Aerodynamic Profile';
    }

    return str;
  }

  // Exponer utilidades para reportes y telemetría
  window.getLocalizedRegime = getLocalizedRegime;
  window.getLocalizedObstacleName = getLocalizedObstacleName;


  /**
   * Muestrea el campo de flujo real (Navier-Stokes o LBM) aguas arriba de la pieza objetivo.
   * Detecta la presencia de obstáculos upstream y calcula:
   * 1. Velocidad incidente media local (U_local) y déficit de velocidad en la estela.
   * 2. Ángulo de desviación de flujo incidente (Downwash / Upwash).
   * 3. Nivel de turbulencia y reducción de presión dinámica efectiva (q_local vs q_inf).
   */
  function sampleLocalInflow(target, sim) {
    const defaultSpeed = (sim && sim.fluid && sim.fluid.inflowSpeed) ? sim.fluid.inflowSpeed : 5.0;
    const defaultDensity = (sim && sim.fluid && sim.fluid.density) ? sim.fluid.density : 1.225;
    const qInf = 0.5 * defaultDensity * defaultSpeed * defaultSpeed;

    if (!target) {
      return {
        uLocal: defaultSpeed,
        vLocal: 0,
        downwashAngle: 0,
        wakeDeficit: 0,
        qLocal: qInf,
        qRatio: 1.0,
        turbulenceIntensity: 0,
        hasUpstreamObstacle: false,
        upstreamObstacleName: null
      };
    }

    let aabb = [0, 0, 1, 1];
    if (typeof target.getAABB === 'function') {
      aabb = target.getAABB();
    }
    const chord = Math.max(0.2, aabb[2] - aabb[0]);
    const height = Math.max(0.1, aabb[3] - aabb[1]);
    const centroid = target.getCentroid ? target.getCentroid() : [(aabb[0] + aabb[2]) / 2, (aabb[1] + aabb[3]) / 2];

    // 1. Detectar obstáculos aguas arriba en el túnel
    const upstreamObstacles = [];
    if (sim && sim.elements && Array.isArray(sim.elements)) {
      for (const el of sim.elements) {
        if (!el || el === target || el.isProbe || el.isSolid === false || !el.isActive) continue;
        const oAABB = el.getAABB ? el.getAABB() : null;
        if (!oAABB) continue;
        const oCentroid = el.getCentroid ? el.getCentroid() : [(oAABB[0] + oAABB[2]) / 2, (oAABB[1] + oAABB[3]) / 2];
        // Está aguas arriba si su centroide o su borde derecho está antes del centroide o borde derecho del target
        if (oCentroid[0] < centroid[0] && oAABB[0] < aabb[2]) {
          upstreamObstacles.push({
            element: el,
            aabb: oAABB,
            centroid: oCentroid,
            dx: centroid[0] - oCentroid[0],
            dy: centroid[1] - oCentroid[1]
          });
        }
      }
    }

    const hasUpstream = upstreamObstacles.length > 0;
    let upstreamName = hasUpstream ? (upstreamObstacles[0].element.name || "Obstáculo") : null;

    // 2. Muestrear el campo de velocidades real de la simulación justo antes del borde de ataque
    const sampleX = Math.max(0.05, aabb[0] - 0.12 * chord);
    const sampleYMin = Math.max(0.05, aabb[1] - 0.25 * height);
    const sampleYMax = aabb[3] + 0.25 * height;
    const numSamples = 13;

    let sumU = 0;
    let sumV = 0;
    let validSamples = 0;
    const uVals = [];

    if (sim && (sim.fluid || (sim.isLBMMode && sim.lbm))) {
      for (let i = 0; i < numSamples; i++) {
        const sy = sampleYMin + (i / (numSamples - 1)) * (sampleYMax - sampleYMin);
        let u = defaultSpeed;
        let v = 0;

        if (sim.isLBMMode && sim.lbm) {
          const lbm = sim.lbm;
          const lx = Math.max(1, Math.min(lbm.nx - 2, (sampleX / sim.fluid.domainWidth) * lbm.nx));
          const ly = Math.max(1, Math.min(lbm.ny - 2, (sy / sim.fluid.domainHeight) * lbm.ny));
          const idx = Math.floor(lx) + Math.floor(ly) * lbm.nx;
          const scaleToMs = defaultSpeed / Math.max(0.01, lbm.speed);
          u = lbm.ux[idx] * scaleToMs;
          v = lbm.uy[idx] * scaleToMs;
        } else if (sim.fluid) {
          const fl = sim.fluid;
          const gx = sampleX / fl.dx;
          const gy = sy / fl.dy;
          u = fl.sampleBilinear(fl.u, gx, gy);
          v = fl.sampleBilinear(fl.v, gx, gy);
        }

        if (!isNaN(u) && !isNaN(v)) {
          sumU += u;
          sumV += v;
          uVals.push(u);
          validSamples++;
        }
      }
    }

    let uMean = validSamples > 0 ? (sumU / validSamples) : defaultSpeed;
    let vMean = validSamples > 0 ? (sumV / validSamples) : 0;

    // 3. Si hay obstáculos aguas arriba detectados geométricamente, contrastar con la sombra aerodinámica
    if (hasUpstream) {
      let maxDeficitTheor = 0;
      for (const obs of upstreamObstacles) {
        const distDistX = Math.max(0.1, obs.dx);
        const distDistY = Math.abs(obs.dy);
        const obsH = Math.max(0.15, obs.aabb[3] - obs.aabb[1]);
        const wakeWidth = obsH * 1.2 + 0.15 * distDistX;
        if (distDistY < wakeWidth * 1.5) {
          // Modelo de estela turbulenta gaussiana de Schlichting
          const gauss = Math.exp(-0.5 * Math.pow(distDistY / (wakeWidth * 0.65), 2));
          const decay = 1.0 / (1.0 + 0.35 * (distDistX / obsH));
          const def = 0.82 * gauss * decay;
          if (def > maxDeficitTheor) maxDeficitTheor = def;
        }
      }

      // Si la simulación física ya formó la estela en la malla, uMean será bajo.
      // Si la simulación recién se inició o está pausada, asegurar que maxDeficitTheor aplique.
      const gridDeficit = Math.max(0, 1.0 - (uMean / defaultSpeed));
      const effectiveDeficit = Math.max(gridDeficit, maxDeficitTheor);
      uMean = defaultSpeed * (1.0 - effectiveDeficit);
    }

    // Asegurar límites físicos razonables
    const minSafeSpeed = 0.15;
    const uLocal = Math.max(minSafeSpeed, Math.hypot(uMean, vMean));
    const downwashAngle = (Math.atan2(vMean, Math.max(0.01, uMean)) * 180.0) / Math.PI;
    const wakeDeficit = Math.max(0, Math.min(0.95, (defaultSpeed - uLocal) / defaultSpeed));

    // Desviación estándar como proxy de intensidad turbulenta
    let sumVar = 0;
    if (uVals.length > 1) {
      uVals.forEach(val => { sumVar += (val - uMean) * (val - uMean); });
    }
    const turbIntensity = uVals.length > 1 ? Math.sqrt(sumVar / uVals.length) / defaultSpeed : (wakeDeficit * 0.3);

    const qLocal = 0.5 * defaultDensity * uLocal * uLocal;
    const qRatio = Math.max(0.01, qLocal / Math.max(0.01, qInf));

    return {
      uLocal: parseFloat(uLocal.toFixed(3)),
      vLocal: parseFloat(vMean.toFixed(3)),
      downwashAngle: parseFloat(downwashAngle.toFixed(2)),
      wakeDeficit: parseFloat(wakeDeficit.toFixed(3)),
      qLocal: parseFloat(qLocal.toFixed(2)),
      qRatio: parseFloat(qRatio.toFixed(4)),
      turbulenceIntensity: parseFloat(turbIntensity.toFixed(3)),
      hasUpstreamObstacle: hasUpstream,
      upstreamObstacleName: upstreamName
    };
  }

  /**
   * Calcula el barrido aerodinámico (α-Sweep) para un obstáculo dado en el túnel.
   * Modela la respuesta aerodinámica combinando teoría de perfiles delgados (Thin Airfoil Theory),
   * corrección de espesor y curvatura, pérdidas inducidas por relación de aspecto, separación viscosa post-pérdida (Stall),
   * y perturbaciones reales generadas por obstáculos aguas arriba (estela turbulenta, déficit de velocidad y downwash).
   */
  function computeAerodynamicPolar(obstacle, fluid, minAoa = -10, maxAoa = 20, step = 1, sim = null) {
    if (!obstacle) return null;

    const density = (fluid && fluid.density) ? fluid.density : 1.225;
    const speed = (fluid && fluid.inflowSpeed) ? fluid.inflowSpeed : 5.0;
    const qInf = 0.5 * density * speed * speed; // Presión dinámica libre (Pa)

    // Muestrear flujo local incidente considerando estela de obstáculos aguas arriba
    const inflow = sampleLocalInflow(obstacle, sim);
    const uLocal = inflow.uLocal;
    const qLocal = inflow.qLocal;
    const downwashAngle = inflow.downwashAngle;
    const wakeDeficit = inflow.wakeDeficit;
    const qRatio = inflow.qRatio;

    // Dimensiones características a partir del AABB del obstáculo
    let chord = 2.0;
    let height = 0.4;
    if (typeof obstacle.getAABB === 'function') {
      const aabb = obstacle.getAABB();
      chord = Math.max(0.2, aabb[2] - aabb[0]);
      height = Math.max(0.1, aabb[3] - aabb[1]);
    }
    const thicknessRatio = Math.min(0.35, Math.max(0.06, height / chord));
    const span = 1.0; // Profundidad unitaria en 2D
    const planformArea = chord * span;

    // Clasificación del perfil o cuerpo
    const nameLower = (obstacle.name || '').toLowerCase();
    let isSymmetric = true;
    let alpha0 = 0.0;        // Ángulo de sustentación nula (deg)
    let baseStallAngle = 14.5;   // Ángulo de entrada en pérdida base (deg)
    let baseMaxCl = 1.35;        // Cl máximo teórico limpio
    let baseCd0 = 0.018;         // Coeficiente de arrastre parásito mínimo
    let isBluffBody = false;

    if (nameLower.includes('2412') || nameLower.includes('camber') || nameLower.includes('asimetrico')) {
      isSymmetric = false;
      alpha0 = -2.1;
      baseStallAngle = 15.0;
      baseMaxCl = 1.48;
      baseCd0 = 0.022;
    } else if (nameLower.includes('0012') || nameLower.includes('simetrico')) {
      isSymmetric = true;
      alpha0 = 0.0;
      baseStallAngle = 14.0;
      baseMaxCl = 1.32;
      baseCd0 = 0.016;
    } else if (nameLower.includes('cilindro') || nameLower.includes('circular') || nameLower.includes('circle')) {
      isBluffBody = true;
      baseCd0 = 0.95;
      baseStallAngle = 4.0;
      baseMaxCl = 0.25;
      alpha0 = 0.0;
    } else if (nameLower.includes('placa') || nameLower.includes('cuadrado') || nameLower.includes('square')) {
      isBluffBody = true;
      baseCd0 = 1.15;
      baseStallAngle = 8.0;
      baseMaxCl = 0.85;
      alpha0 = 0.0;
    } else if (nameLower.includes('cuña') || nameLower.includes('wedge')) {
      baseCd0 = 0.38;
      baseStallAngle = 11.0;
      baseMaxCl = 0.95;
      alpha0 = 0.0;
    } else if (nameLower.includes('bolido') || nameLower.includes('car')) {
      baseCd0 = 0.32;
      baseStallAngle = 12.0;
      baseMaxCl = 0.65;
      alpha0 = -1.0;
    } else {
      // Perfil general o forma deformada por el usuario
      if (obstacle.controlPoints && obstacle.controlPoints.length > 0) {
        let sumY = 0;
        obstacle.controlPoints.forEach(p => { sumY += p[1]; });
        const avgY = sumY / obstacle.controlPoints.length;
        const centroid = obstacle.getCentroid ? obstacle.getCentroid() : [0, avgY];
        const camberEstimate = (avgY - centroid[1]) / chord;
        alpha0 = -camberEstimate * 15.0;
      }
      baseCd0 = Math.max(0.018, thicknessRatio * 0.15);
      baseStallAngle = 13.5 + thicknessRatio * 10;
      baseMaxCl = 1.25 + thicknessRatio * 0.5;
    }

    // MODIFICACIONES POR LA ESTELA DE OBSTÁCULOS AGUAS ARRIBA:
    // 1. Reducción de stall angle y de maxCl debido a la turbulencia incidente y baja energía
    const stallAngle = Math.max(7.0, baseStallAngle * (0.70 + 0.30 * (1.0 - wakeDeficit)));
    const maxCl = baseMaxCl * (0.65 + 0.35 * (1.0 - wakeDeficit));
    // 2. Incremento de arrastre parásito debido a la estela turbulenta
    const cd0 = baseCd0 + 0.035 * wakeDeficit + 0.05 * inflow.turbulenceIntensity;

    const AR = 6.0; // Relación de aspecto efectiva en el canal
    const oswaldE = 0.88;
    const clAlphaSlope = (2 * Math.PI) / (1 + (2 / (AR * Math.PI))) * (Math.PI / 180.0);

    const points = [];
    let clMaxVal = -Infinity;
    let clMaxAngle = 0;
    let clMinVal = Infinity;
    let clMinAngle = 0;
    let cdMinVal = Infinity;
    let lodMaxVal = -Infinity;
    let lodMaxAngle = 0;

    for (let a = minAoa; a <= maxAoa; a += step) {
      const alpha = parseFloat(a.toFixed(2));
      // El ángulo de ataque efectivo toma en cuenta el ángulo de sustentación nula Y el downwash de la estela
      const effectiveAlpha = (alpha - alpha0) - downwashAngle;
      let clLocal = 0.0;
      let cdLocal = 0.0;
      let regime = "";

      if (isBluffBody) {
        clLocal = maxCl * Math.sin((effectiveAlpha * Math.PI) / 90.0);
        cdLocal = cd0 + 0.4 * Math.sin(Math.abs((alpha * Math.PI) / 180.0));
        regime = "Cuerpo Romo / Estela Turbulenta";
      } else {
        const radEff = (effectiveAlpha * Math.PI) / 180.0;

        if (Math.abs(effectiveAlpha) <= stallAngle) {
          // Régimen lineal adherido
          clLocal = clAlphaSlope * effectiveAlpha;
          const stallRatio = Math.abs(effectiveAlpha) / stallAngle;
          if (stallRatio > 0.7) {
            const factor = 1.0 - 0.12 * Math.pow((stallRatio - 0.7) / 0.3, 2);
            clLocal *= factor;
          }
          regime = (Math.abs(effectiveAlpha) > stallAngle * 0.85)
            ? "Máxima Sustentación Pre-Pérdida"
            : (Math.abs(effectiveAlpha) < 1.0 ? "Flujo Simétrico / Neutro" : "Flujo Laminar Adherido");
        } else {
          // Régimen post-pérdida
          const sign = effectiveAlpha >= 0 ? 1 : -1;
          const deltaStall = Math.abs(effectiveAlpha) - stallAngle;
          const dropFactor = Math.exp(-deltaStall * 0.18);
          const stallCl = clAlphaSlope * stallAngle * sign;
          const flatPlateCl = 1.1 * Math.sin(2 * radEff);
          clLocal = stallCl * dropFactor + flatPlateCl * (1.0 - dropFactor);
          regime = (deltaStall < 5.0) ? "Entrada en Pérdida (Stall)" : "Pérdida Profunda (Deep Stall)";
        }

        const inducedCd = (clLocal * clLocal) / (Math.PI * oswaldE * AR);
        const sepFactor = Math.max(0, (Math.abs(effectiveAlpha) - stallAngle * 0.75) / (stallAngle * 0.25));
        const sepCd = 1.25 * Math.pow(Math.sin(Math.abs(radEff)), 2) * Math.min(1.0, sepFactor);
        cdLocal = cd0 + inducedCd + sepCd;
      }

      const safeCd = Math.max(0.005, cdLocal);
      const lod = clLocal / safeCd;

      // Fuerzas físicas reales calculadas con la presión dinámica LOCAL que realmente llega al cuerpo
      const dragForce = safeCd * qLocal * planformArea;
      const liftForce = clLocal * qLocal * planformArea;

      // Coeficientes normalizados referidos al túnel de viento global (para reflejar la pérdida real por obstáculo previo)
      const clRef = clLocal * qRatio;
      const cdRef = safeCd * qRatio;

      if (clRef > clMaxVal) { clMaxVal = clRef; clMaxAngle = alpha; }
      if (clRef < clMinVal) { clMinVal = clRef; clMinAngle = alpha; }
      if (cdRef < cdMinVal) { cdMinVal = cdRef; }
      if (lod > lodMaxVal && alpha > 0) { lodMaxVal = lod; lodMaxAngle = alpha; }

      if (inflow.hasUpstreamObstacle && wakeDeficit > 0.15) {
        regime += " (En Estela Aguas Arriba)";
      }

      points.push({
        aoa: alpha,
        cl: parseFloat(clRef.toFixed(4)),
        cd: parseFloat(cdRef.toFixed(4)),
        clLocal: parseFloat(clLocal.toFixed(4)),
        cdLocal: parseFloat(safeCd.toFixed(4)),
        lod: parseFloat(lod.toFixed(2)),
        fd: parseFloat(dragForce.toFixed(3)),
        fl: parseFloat(liftForce.toFixed(3)),
        regime,
        uLocal: inflow.uLocal,
        qLocal: inflow.qLocal
      });
    }

    return {
      obstacleName: obstacle.name || "Perfil Aerodinámico",
      chord: parseFloat(chord.toFixed(3)),
      thicknessRatio: parseFloat((thicknessRatio * 100).toFixed(1)),
      qInf: parseFloat(qInf.toFixed(2)),
      density,
      speed,
      planformArea: parseFloat(planformArea.toFixed(3)),
      clMax: parseFloat(clMaxVal.toFixed(3)),
      clMaxAngle,
      clMin: parseFloat(clMinVal.toFixed(3)),
      clMinAngle,
      cdMin: parseFloat(cdMinVal.toFixed(4)),
      lodMax: parseFloat(lodMaxVal.toFixed(2)),
      lodMaxAngle,
      stallAngle: parseFloat(stallAngle.toFixed(1)),
      alpha0: parseFloat(alpha0.toFixed(2)),
      // Parámetros de la estela física
      uLocal: inflow.uLocal,
      qLocal: inflow.qLocal,
      downwashAngle: inflow.downwashAngle,
      wakeDeficit: inflow.wakeDeficit,
      hasUpstreamWake: inflow.hasUpstreamObstacle,
      upstreamObstacleName: inflow.upstreamObstacleName,
      data: points
    };
  }

  /**
   * Calcula una escala limpia y calibrada con ticks redondeados (Nice Ticks)
   */
  function computeNiceScale(dataMin, dataMax, targetTicks = 5, isAngle = false) {
    if (dataMax <= dataMin) {
      dataMax = dataMin + 1;
    }
    const span = dataMax - dataMin;
    const rawStep = span / targetTicks;
    const exponent = Math.floor(Math.log10(rawStep));
    const fraction = rawStep / Math.pow(10, exponent);

    let niceFraction;
    if (fraction <= 1.5) niceFraction = 1;
    else if (fraction <= 3.5) niceFraction = 2;
    else if (fraction <= 7.5) niceFraction = 5;
    else niceFraction = 10;

    let step = niceFraction * Math.pow(10, exponent);
    if (isAngle && step < 1) step = 1;

    let niceMin = Math.floor(dataMin / step) * step;
    let niceMax = Math.ceil(dataMax / step) * step;
    if (niceMax === niceMin) niceMax += step;

    const ticks = [];
    const decimals = step >= 1 ? 0 : Math.max(0, -exponent);
    for (let v = niceMin; v <= niceMax + step * 0.1; v += step) {
      const fixed = parseFloat(v.toFixed(decimals));
      ticks.push(fixed);
    }
    return { min: niceMin, max: niceMax, step, ticks, decimals };
  }

  /**
   * Renderiza el gráfico científico en el Canvas con resolución dinámica 1:1 exacta a pantalla
   * (eliminando distorsiones elípticas de puntos y textos) y fondo translúcido al 50%.
   *
   * @param {HTMLCanvasElement} canvas
   * @param {Object} results
   * @param {string} activeMode
   * @param {number|null} activeUpToIndex Índice hasta el cual dibujar (para animación)
  /**
   * Dibuja la cuadrícula científica limpia con la indicación de presionar 'Iniciar Barrido'
   */
  function renderEmptyChartPrompt(canvas) {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const displayW = Math.round(rect.width) || 500;
    const displayH = Math.round(rect.height) || 184;

    canvas.width = Math.round(displayW * dpr);
    canvas.height = Math.round(displayH * dpr);

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, displayW, displayH);

    const padLeft = 48;
    const padRight = 18;
    const padTop = 24;
    const padBottom = 24;
    const plotW = displayW - padLeft - padRight;
    const plotH = displayH - padTop - padBottom;
    const isSpanish = isSpanishLang();

    // Ejes y cuadrícula vacía
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padTop + (plotH / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotW, y);
      ctx.stroke();
    }
    for (let i = 0; i <= 6; i++) {
      const x = padLeft + (plotW / 6) * i;
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + plotH);
      ctx.stroke();
    }

    // Texto guía central
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#00ffcc';
    ctx.font = '700 12px Inter, sans-serif';
    ctx.fillText(isSpanish ? "▶ Pulsa \"Iniciar barrido α\" para generar las gráficas" : "▶ Click \"Run α-Sweep\" to generate curves", padLeft + plotW / 2, padTop + plotH / 2 - 9);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 10.5px Inter, sans-serif';
    ctx.fillText(isSpanish ? "La gráfica y los datos se vincularán exclusivamente a la pieza sobre la que pulses el botón" : "The chart and data will bind strictly to the body you run the sweep on", padLeft + plotW / 2, padTop + plotH / 2 + 11);
  }

  /**
   * Renderiza el gráfico científico en el Canvas con resolución dinámica 1:1 exacta a pantalla
   * @param {HTMLCanvasElement} canvas
   * @param {Object} results
   * @param {string} activeMode
   * @param {number|null} activeUpToIndex
   * @param {Object} options
   */
  function renderPolarChart(canvas, results, activeMode = 'cl_alpha', activeUpToIndex = null, options = {}) {
    if (!canvas) return;
    const isExport = Boolean(options && options.isExport);
    if ((!hasExecutedSweepAnimation && !isSweepingAnimation && !isExport) || (!lastSweptElement && !isExport) || !results || !results.data || results.data.length === 0) {
      renderEmptyChartPrompt(canvas);
      return;
    }

    // Dimensiones dinámicas reales basadas en el contenedor CSS para proporción 1:1 exacta (círculos perfectos)
    const dpr = (options && options.dpr) ? options.dpr : Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { width: 0, height: 0 };
    const displayW = (options && options.forceWidth) || Math.round(rect.width) || (canvas.width ? Math.round(canvas.width / dpr) : 500);
    const displayH = (options && options.forceHeight) || Math.round(rect.height) || (canvas.height ? Math.round(canvas.height / dpr) : 184);

    canvas.width = Math.round(displayW * dpr);
    canvas.height = Math.round(displayH * dpr);

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const width = displayW;
    const height = displayH;
    const isSpanish = isSpanishLang();

    // Fondo: si es exportación, dibujar fondo oscuro blueprint de ingeniería; de lo contrario transparente para glassmorphism
    if (options && options.background) {
      ctx.fillStyle = options.background;
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
    } else {
      ctx.clearRect(0, 0, width, height);
    }

    const padLeft = (options && options.padLeft) || (isExport ? 56 : 48);
    const padRight = (options && options.padRight) || (isExport ? 24 : 18);
    const padTop = (options && options.padTop) || (isExport ? 30 : 24);
    const padBottom = (options && options.padBottom) || (isExport ? 30 : 24);
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    // Determinar variables de los ejes X e Y según el modo activo
    let xKey = 'aoa';
    let yKey = 'cl';
    let xLabel = isSpanish ? 'Ángulo de Ataque α (°)' : 'Angle of Attack α (deg)';
    let yLabel = isSpanish ? 'Coeficiente Cl' : 'Lift Coeff. (Cl)';
    let curveColor = '#00ffcc';
    let title = isSpanish ? 'Curva de Sustentación: Cl vs α' : 'Lift Curve: Cl vs α';

    if (activeMode === 'drag_polar') {
      xKey = 'cd';
      yKey = 'cl';
      xLabel = isSpanish ? 'Coeficiente de Arrastre Cd' : 'Drag Coeff. (Cd)';
      yLabel = isSpanish ? 'Coeficiente Cl' : 'Lift Coeff. (Cl)';
      curveColor = '#38bdf8';
      title = isSpanish ? 'Polar de Arrastre (Lilienthal): Cl vs Cd' : 'Drag Polar (Lilienthal): Cl vs Cd';
    } else if (activeMode === 'cd_alpha') {
      xKey = 'aoa';
      yKey = 'cd';
      xLabel = isSpanish ? 'Ángulo de Ataque α (°)' : 'Angle of Attack α (deg)';
      yLabel = isSpanish ? 'Coeficiente Cd' : 'Drag Coeff. (Cd)';
      curveColor = '#fb923c';
      title = isSpanish ? 'Curva de Resistencia: Cd vs α' : 'Drag Curve: Cd vs α';
    } else if (activeMode === 'lod_alpha') {
      xKey = 'aoa';
      yKey = 'lod';
      xLabel = isSpanish ? 'Ángulo de Ataque α (°)' : 'Angle of Attack α (deg)';
      yLabel = isSpanish ? 'Eficiencia (L/D)' : 'Efficiency (L/D)';
      curveColor = '#a78bfa';
      title = isSpanish ? 'Rendimiento: L/D vs α' : 'Efficiency: L/D vs α';
    }

    // Calcular límites mínimos y máximos sobre TODOS los datos
    let dataMinX = Infinity, dataMaxX = -Infinity;
    let dataMinY = Infinity, dataMaxY = -Infinity;

    results.data.forEach(pt => {
      const vx = pt[xKey];
      const vy = pt[yKey];
      if (vx < dataMinX) dataMinX = vx;
      if (vx > dataMaxX) dataMaxX = vx;
      if (vy < dataMinY) dataMinY = vy;
      if (vy > dataMaxY) dataMaxY = vy;
    });

    if (!isFinite(dataMinX)) { dataMinX = 0; dataMaxX = 20; }
    if (!isFinite(dataMinY)) { dataMinY = 0; dataMaxY = 1.0; }

    if (xKey === 'cd') {
      dataMinX = 0;
    }
    if (dataMinY > 0 && dataMinY < 0.25) {
      dataMinY = 0;
    }

    // Generar escalas matemáticas limpias ("Nice Ticks") para evitar distorsiones o decimales caóticos
    const scaleX = computeNiceScale(dataMinX, dataMaxX, 6, xKey === 'aoa');
    const scaleY = computeNiceScale(dataMinY, dataMaxY, 5, false);

    const minX = scaleX.min;
    const maxX = scaleX.max;
    const minY = scaleY.min;
    const maxY = scaleY.max;

    const toScreenX = (x) => padLeft + ((x - minX) / (maxX - minX)) * plotW;
    const toScreenY = (y) => padTop + plotH - ((y - minY) / (maxY - minY)) * plotH;

    // Cuadrícula vertical (X)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 11px "Inter", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    scaleX.ticks.forEach(gx => {
      const sx = toScreenX(gx);
      if (sx >= padLeft - 1 && sx <= padLeft + plotW + 1) {
        ctx.beginPath();
        ctx.moveTo(sx, padTop);
        ctx.lineTo(sx, padTop + plotH);
        ctx.stroke();

        const label = scaleX.decimals > 0 ? gx.toFixed(scaleX.decimals) : Math.round(gx).toString();
        ctx.fillText(label, sx, padTop + plotH + 6);
      }
    });

    // Cuadrícula horizontal (Y)
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    scaleY.ticks.forEach(gy => {
      const sy = toScreenY(gy);
      if (sy >= padTop - 1 && sy <= padTop + plotH + 1) {
        ctx.beginPath();
        ctx.moveTo(padLeft, sy);
        ctx.lineTo(padLeft + plotW, sy);
        ctx.stroke();

        const label = scaleY.decimals > 0 ? gy.toFixed(scaleY.decimals) : Math.round(gy).toString();
        ctx.fillText(label, padLeft - 7, sy);
      }
    });

    // Ejes Cero destacados
    if (minX <= 0 && maxX >= 0) {
      const zeroX = toScreenX(0);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(zeroX, padTop);
      ctx.lineTo(zeroX, padTop + plotH);
      ctx.stroke();
    }
    if (minY <= 0 && maxY >= 0) {
      const zeroY = toScreenY(0);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(padLeft, zeroY);
      ctx.lineTo(padLeft + plotW, zeroY);
      ctx.stroke();
    }

    // Determinar subconjunto de datos para animación o dibujo completo
    const maxIdx = (typeof activeUpToIndex === 'number')
      ? Math.max(0, Math.min(results.data.length - 1, activeUpToIndex))
      : results.data.length - 1;

    const visiblePoints = results.data.slice(0, maxIdx + 1);

    if (visiblePoints.length > 0) {
      // Área sombreada bajo la curva
      ctx.save();
      ctx.beginPath();
      visiblePoints.forEach((pt, idx) => {
        const sx = toScreenX(pt[xKey]);
        const sy = toScreenY(pt[yKey]);
        if (idx === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      const lastPt = visiblePoints[visiblePoints.length - 1];
      const firstPt = visiblePoints[0];
      const baseZeroY = Math.min(padTop + plotH, Math.max(padTop, toScreenY(Math.max(0, minY))));
      ctx.lineTo(toScreenX(lastPt[xKey]), baseZeroY);
      ctx.lineTo(toScreenX(firstPt[xKey]), baseZeroY);
      ctx.closePath();
      const fillGrad = ctx.createLinearGradient(0, padTop, 0, padTop + plotH);
      fillGrad.addColorStop(0, curveColor + '30');
      fillGrad.addColorStop(1, curveColor + '00');
      ctx.fillStyle = fillGrad;
      ctx.fill();
      ctx.restore();

      // Línea de la curva con trazo neón enriquecido
      ctx.save();
      ctx.strokeStyle = curveColor;
      ctx.lineWidth = 3.2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowColor = curveColor;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      visiblePoints.forEach((pt, idx) => {
        const sx = toScreenX(pt[xKey]);
        const sy = toScreenY(pt[yKey]);
        if (idx === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.stroke();
      ctx.restore();

      // Determinar índice del punto de operación actual
      let operatingPointIdx = -1;
      if (!isExport) {
        if (typeof activeUpToIndex === 'number') {
          operatingPointIdx = maxIdx;
        } else if (lastSweptElement) {
          let curDeg = Math.round(lastSweptElement.currentRotationDeg || 0);
          if (curDeg > 180) curDeg -= 360;
          if (curDeg < -180) curDeg += 360;
          let minDiff = Infinity;
          visiblePoints.forEach((p, idx) => {
            const diff = Math.abs(p.aoa - curDeg);
            if (diff < minDiff) {
              minDiff = diff;
              operatingPointIdx = idx;
            }
          });
        }
      }

      // Puntos discretos perfectamente circulares
      visiblePoints.forEach((pt, pIdx) => {
        const sx = toScreenX(pt[xKey]);
        const sy = toScreenY(pt[yKey]);
        const isCurrent = (pIdx === operatingPointIdx);

        if (!isCurrent) {
          ctx.save();
          ctx.fillStyle = '#070c18';
          ctx.strokeStyle = curveColor;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(sx, sy, 3.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        } else {
          // Punto activo / operativo actual (con halo y etiqueta según captura del usuario)
          ctx.save();
          // 1. Núcleo blanco
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(sx, sy, 4.2, 0, Math.PI * 2);
          ctx.fill();

          // 2. Anillo interior oscuro
          ctx.strokeStyle = '#070c18';
          ctx.lineWidth = 2.0;
          ctx.stroke();

          // 3. Halo exterior dorado con resplandor
          ctx.save();
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(sx, sy, 8.8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // 4. Etiqueta flotante del punto de operación
          ctx.save();
          ctx.font = 'bold 11px "Inter", system-ui, sans-serif';
          const opValStr = (activeMode === 'drag_polar')
            ? `Cd: ${pt.cd} | Cl: ${pt.cl}`
            : (activeMode === 'lod_alpha' ? `α: ${pt.aoa}° | L/D: ${pt.lod}` : `α: ${pt.aoa}° | Cl: ${pt.cl}`);
          const textMetrics = ctx.measureText(opValStr);
          const tagW = textMetrics.width + 16;
          const tagH = 18;
          const tagX = Math.min(padLeft + plotW - tagW, Math.max(padLeft, sx - tagW / 2));
          const tagY = (sy - 26 < padTop) ? sy + 14 : sy - 26;

          ctx.fillStyle = 'rgba(7, 12, 24, 0.95)';
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.roundRect(tagX, tagY, tagW, tagH, 5);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#fbbf24';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(opValStr, tagX + tagW / 2, tagY + tagH / 2);
          ctx.restore();
          ctx.restore();
        }
      });
    }

    // Marcadores de valores clave destacados si están visibles
    if (activeMode === 'cl_alpha' || activeMode === 'drag_polar') {
      const maxPt = visiblePoints.find(p => Math.abs(p.cl - results.clMax) < 1e-4);
      if (maxPt) {
        const mx = toScreenX(maxPt[xKey]);
        const my = toScreenY(maxPt[yKey]);
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(mx, my, 4.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 10px "Inter", sans-serif';
        ctx.textAlign = mx > padLeft + plotW - 80 ? 'right' : 'left';
        ctx.fillText(`Cl max = ${results.clMax}`, mx > padLeft + plotW - 80 ? mx - 6 : mx + 6, my - 6);
      }
    } else if (activeMode === 'lod_alpha') {
      const maxPt = visiblePoints.find(p => Math.abs(p.lod - results.lodMax) < 1e-2);
      if (maxPt) {
        const mx = toScreenX(maxPt[xKey]);
        const my = toScreenY(maxPt[yKey]);
        ctx.fillStyle = '#c084fc';
        ctx.beginPath();
        ctx.arc(mx, my, 4.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#c084fc';
        ctx.font = 'bold 10px "Inter", sans-serif';
        ctx.textAlign = mx > padLeft + plotW - 80 ? 'right' : 'left';
        ctx.fillText(`(L/D) max = ${results.lodMax}`, mx > padLeft + plotW - 80 ? mx - 6 : mx + 6, my - 6);
      }
    } else if (activeMode === 'cd_alpha') {
      const minPt = visiblePoints.find(p => Math.abs(p.cd - results.cdMin) < 1e-4);
      if (minPt) {
        const mx = toScreenX(minPt[xKey]);
        const my = toScreenY(minPt[yKey]);
        ctx.fillStyle = '#fb923c';
        ctx.beginPath();
        ctx.arc(mx, my, 4.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fb923c';
        ctx.font = 'bold 10px "Inter", sans-serif';
        ctx.textAlign = mx > padLeft + plotW - 80 ? 'right' : 'left';
        ctx.fillText(`Cd min = ${results.cdMin}`, mx > padLeft + plotW - 80 ? mx - 6 : mx + 6, my - 6);
      }
    }

    // Título a la izquierda
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 12px "Inter", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, padLeft, 12);

    // Subtítulo con objeto evaluado traducido y alineado estrictamente a la DERECHA
    const chartObsName = getLocalizedObstacleName(results.obstacleName, isSpanish);
    if (results.hasUpstreamWake && results.wakeDeficit > 0.05) {
      ctx.fillStyle = '#fb923c';
      ctx.font = '600 10.5px "Inter", system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${chartObsName} • U_loc = ${results.uLocal.toFixed(1)} m/s (${isSpanish ? 'Estela' : 'Wake'}: -${Math.round(results.wakeDeficit * 100)}%)`, width - padRight, 12);
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 10.5px "Inter", system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${chartObsName} • U∞ = ${results.speed.toFixed(1)} m/s`, width - padRight, 12);
    }
    ctx.restore();

    // Etiqueta eje X
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 10.5px "Inter", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(xLabel, padLeft + plotW / 2, height - 5);

    // Etiqueta eje Y rotada
    ctx.save();
    ctx.translate(13, padTop + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 10.5px "Inter", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
  }

  let isOpen = false;
  let inputsInitialized = false;

  /**
   * Inicializa la sincronización bidireccional entre el input de AoA Mínimo y el slider de rotación
   */
  function initSweepInputs(sim) {
    if (inputsInitialized || !sim) return;
    inputsInitialized = true;

    const minInput = document.getElementById('sweep-min-aoa');
    const maxInput = document.getElementById('sweep-max-aoa');
    const stepInput = document.getElementById('sweep-step-aoa');
    const slider = document.getElementById('slider-rotation');
    const lblRot = document.getElementById('lbl-rot-value');

    if (minInput) {
      minInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (isNaN(val)) return;

        const deg = Math.round(val);
        lastSweptMinAoa = deg;

        // 1. Sincronizar slider y etiqueta solo si no hay pieza barrida previa o si la seleccionada es la barrida
        const target = (hasExecutedSweepAnimation && lastSweptElement)
          ? lastSweptElement
          : (sim.selectedElement || (sim.elements && sim.elements.find(el => el && !el.isProbe)));

        if (!hasExecutedSweepAnimation || sim.selectedElement === target) {
          const displaySliderVal = ((deg % 360) + 360) % 360;
          if (slider) slider.value = displaySliderVal;
          if (lblRot) lblRot.textContent = `${displaySliderVal}°`;
        }

        // 2. Rotar físicamente la pieza en el túnel aerodinámico
        if (target && target instanceof HydrodynamicObstacle) {
          target.setAbsoluteRotation(deg);
          if (sim.fluid) sim.fluid.rasterizeObstacles(sim.elements);
          if (sim.isLBMMode && sim.lbm) {
            sim.lbm.rasterizeObstacles(sim.elements, sim.fluid.domainWidth, sim.fluid.domainHeight);
          }
          if (typeof sim.render === 'function') sim.render();
        }

        // Mantener AoA Máximo coherentemente superior al mínimo
        if (maxInput && parseFloat(maxInput.value) <= deg) {
          maxInput.value = deg + 20;
          lastSweptMaxAoa = deg + 20;
        }

        // Actualizar previsualización de la curva si el panel está desplegado
        if (isOpen && hasExecutedSweepAnimation && lastSweptElement) {
          updateSweepPreview(sim, lastSweptElement);
        }
      });
    }

    if (maxInput) {
      maxInput.addEventListener('input', () => {
        const val = parseFloat(maxInput.value);
        if (!isNaN(val)) lastSweptMaxAoa = val;
        if (isOpen && hasExecutedSweepAnimation && lastSweptElement) updateSweepPreview(sim, lastSweptElement);
      });
    }

    if (stepInput) {
      stepInput.addEventListener('input', () => {
        const val = parseFloat(stepInput.value);
        if (!isNaN(val) && val > 0) lastSweptStep = val;
        if (isOpen && hasExecutedSweepAnimation && lastSweptElement) updateSweepPreview(sim, lastSweptElement);
      });
    }
  }

  let lastToggleTime = 0;
  /**
   * Alterna la visualización del panel de barrido en el menú lateral y la gráfica flotante
   */
  function toggleSweepView(sim) {
    const now = Date.now();
    if (now - lastToggleTime < 250) {
      return;
    }
    lastToggleTime = now;
    const activeSim = sim || window.sim;
    if (isOpen) {
      closeSweepView();
    } else {
      openSweepView(activeSim);
    }
  }

  /**
   * Despliega la sección de configuración bajo el botón en el panel izquierdo y la gráfica flotante en el canvas
   */
  function openSweepView(sim) {
    const activeSim = sim || window.sim;
    if (!activeSim) return;
    sim = activeSim;

    // Si ya se ha realizado un barrido sobre una pieza, vincular el panel estrictamente a esa pieza
    let targetElement = (hasExecutedSweepAnimation && lastSweptElement && sim.elements && sim.elements.includes(lastSweptElement))
      ? lastSweptElement
      : sim.selectedElement;

    if (!targetElement && sim.elements && sim.elements.length > 0) {
      targetElement = sim.elements.find(e => e && !e.isProbe) || sim.elements[0];
      if (targetElement && typeof sim.selectElement === 'function') {
        sim.selectElement(targetElement);
      }
    }

    const isSpanish = isSpanishLang();

    if (!targetElement || targetElement.isProbe) {
      if (typeof window.showToast === 'function') {
        window.showToast(
          isSpanish
            ? "Selecciona o coloca un perfil u obstáculo en el túnel para realizar el barrido α."
            : "Please select or place an airfoil or obstacle in the tunnel to run the α-sweep.",
          'info',
          4000
        );
      }
      return;
    }

    initSweepInputs(sim);

    const drawer = document.getElementById('sweep-panel-drawer');
    const overlay = document.getElementById('sweep-chart-floating-overlay');
    const btnSweep = document.getElementById('btn-alpha-sweep');

    if (drawer) {
      drawer.style.display = 'flex';
      setTimeout(() => {
        drawer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
    if (overlay) overlay.style.display = 'flex';
    if (btnSweep) btnSweep.classList.add('active');

    isOpen = true;

    // Actualizar nombre del objeto evaluado
    const nameEl = document.getElementById('sweep-target-name');
    if (nameEl) nameEl.textContent = targetElement.name || (isSpanish ? "Perfil Aerodinámico" : "Aerodynamic Body");

    if (!hasExecutedSweepAnimation) {
      // Sincronizar ángulo inicial entre el slider y el AoA inicial del barrido solo antes del primer barrido
      let currentAngle = Math.round(targetElement.currentRotationDeg || 0);
      if (currentAngle > 180) currentAngle -= 360;
      if (currentAngle < -180) currentAngle += 360;

      const slider = document.getElementById('slider-rotation');
      if (slider) slider.value = currentAngle;
      const lblRot = document.getElementById('lbl-rot-value');
      if (lblRot) lblRot.textContent = `${currentAngle}°`;

      const minInput = document.getElementById('sweep-min-aoa');
      if (minInput) minInput.value = currentAngle;

      const maxInput = document.getElementById('sweep-max-aoa');
      if (maxInput && parseFloat(maxInput.value) <= currentAngle) {
        maxInput.value = currentAngle + 20;
      }
    } else {
      const minInput = document.getElementById('sweep-min-aoa');
      if (minInput) minInput.value = lastSweptMinAoa;
      const maxInput = document.getElementById('sweep-max-aoa');
      if (maxInput) maxInput.value = lastSweptMaxAoa;
      const stepInput = document.getElementById('sweep-step-aoa');
      if (stepInput) stepInput.value = lastSweptStep;
    }

    // Generar vista inicial: si ya se hizo barrido, mostrar la pieza barrida; si no, mostrar aviso de presionar Iniciar Barrido
    if (!hasExecutedSweepAnimation || !lastSweptElement) {
      const canvas = document.getElementById('sweep-chart-canvas');
      if (canvas) renderEmptyChartPrompt(canvas);
    } else {
      updateSweepPreview(sim, lastSweptElement);
    }
  }

  /**
   * Cierra/pliega el panel desplegable de barrido y la gráfica flotante
   */
  function closeSweepView() {
    stopSweepAnimation();

    const drawer = document.getElementById('sweep-panel-drawer');
    const overlay = document.getElementById('sweep-chart-floating-overlay');
    const btnSweep = document.getElementById('btn-alpha-sweep');

    if (drawer) drawer.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
    if (btnSweep) btnSweep.classList.remove('active');

    isOpen = false;
  }

  // Compatibilidad hacia atrás
  function openSweepModal(sim) {
    openSweepView(sim);
  }

  function closeSweepModal() {
    closeSweepView();
  }

  function stopSweepAnimation() {
    if (sweepAnimationTimer) {
      clearInterval(sweepAnimationTimer);
      sweepAnimationTimer = null;
    }
    isSweepingAnimation = false;
    const runBtn = document.getElementById('btn-run-sweep');
    if (runBtn) {
      runBtn.classList.remove('is-sweeping');
      const isSpanish = isSpanishLang();
      runBtn.innerHTML = isSpanish ? "▶ Iniciar Barrido α" : "▶ Run α-Sweep";
      runBtn.disabled = false;
    }
  }

  /**
   * Actualiza el gráfico y las tarjetas sin animar la rotación del túnel
   */
  function updateSweepPreview(sim, element) {
    // Si aún no se ha ejecutado el barrido sobre una pieza, NO mostrar curvas ni datos
    if (!hasExecutedSweepAnimation || !lastSweptElement) {
      const canvas = document.getElementById('sweep-chart-canvas');
      if (canvas) renderEmptyChartPrompt(canvas);
      return;
    }

    // Si tiempo real está desactivado y no estamos en plena animación de barrido, mantener datos estáticos
    if (!isRealtimeActive && !isSweepingAnimation) {
      return;
    }

    // SIEMPRE computar y renderizar sobre lastSweptElement (la pieza sometida a "Iniciar barrido"),
    // manteniendo la persistencia independientemente de qué otra pieza tenga seleccionada el usuario
    const target = lastSweptElement;
    if (!target || (sim.elements && !sim.elements.includes(target))) {
      hasExecutedSweepAnimation = false;
      lastSweptElement = null;
      if (typeof window.updateModalSweepButtonsState === 'function') {
        window.updateModalSweepButtonsState();
      }
      const canvas = document.getElementById('sweep-chart-canvas');
      if (canvas) renderEmptyChartPrompt(canvas);
      return;
    }

    // Asegurar que el indicador de cuerpo evaluado muestre SIEMPRE la pieza que fue sometida al barrido
    const targetNameEl = document.getElementById('sweep-target-name');
    if (targetNameEl && target.name) {
      targetNameEl.textContent = target.name;
    }

    const minInput = document.getElementById('sweep-min-aoa');
    const maxInput = document.getElementById('sweep-max-aoa');
    const stepInput = document.getElementById('sweep-step-aoa');

    let minAoa = (minInput && !isNaN(parseFloat(minInput.value))) ? parseFloat(minInput.value) : lastSweptMinAoa;
    let maxAoa = (maxInput && !isNaN(parseFloat(maxInput.value))) ? parseFloat(maxInput.value) : lastSweptMaxAoa;
    let step = (stepInput && !isNaN(parseFloat(stepInput.value))) ? parseFloat(stepInput.value) : lastSweptStep;

    if (maxAoa <= minAoa) {
      maxAoa = minAoa + 15;
      if (maxInput) maxInput.value = maxAoa;
    }
    if (step <= 0) step = 1;

    const results = computeAerodynamicPolar(target, sim.fluid, minAoa, maxAoa, step, sim);
    currentSweepResults = results;
    sim.lastAlphaSweep = results;

    updateMetricsCards(results);

    const canvas = document.getElementById('sweep-chart-canvas');
    if (canvas) {
      renderPolarChart(canvas, results, currentActiveTab, null);
    }
  }

  function updateMetricsCards(results, currentIndex = null) {
    const cardClMax = document.getElementById('sweep-metric-clmax');
    const cardStall = document.getElementById('sweep-metric-stall');
    const cardLodMax = document.getElementById('sweep-metric-lodmax');
    const cardCdMin = document.getElementById('sweep-metric-cdmin');

    if (!results) return;

    if (currentIndex !== null && results.data && results.data[currentIndex]) {
      const pt = results.data[currentIndex];
      if (cardClMax) {
        cardClMax.textContent = `Cl: ${pt.cl} (α=${pt.aoa}°)`;
        cardClMax.title = `Cl: ${pt.cl} (α = ${pt.aoa}°)`;
      }
      if (cardStall) {
        cardStall.textContent = `${results.stallAngle}°`;
        cardStall.title = `α stall = ${results.stallAngle}°`;
      }
      if (cardLodMax) {
        cardLodMax.textContent = `L/D: ${pt.lod}`;
        cardLodMax.title = `L/D: ${pt.lod}`;
      }
      if (cardCdMin) {
        cardCdMin.textContent = `Cd: ${pt.cd}`;
        cardCdMin.title = `Cd: ${pt.cd}`;
      }
    } else {
      if (cardClMax) {
        cardClMax.textContent = `${results.clMax} (α = ${results.clMaxAngle}°)`;
        cardClMax.title = `Cl máx = ${results.clMax} (α = ${results.clMaxAngle}°)`;
      }
      if (cardStall) {
        cardStall.textContent = `${results.stallAngle}°`;
        cardStall.title = `α stall = ${results.stallAngle}°`;
      }
      if (cardLodMax) {
        cardLodMax.textContent = `${results.lodMax} (α = ${results.lodMaxAngle}°)`;
        cardLodMax.title = `(L/D)máx = ${results.lodMax} (α = ${results.lodMaxAngle}°)`;
      }
      if (cardCdMin) {
        cardCdMin.textContent = results.cdMin.toFixed(4);
        cardCdMin.title = `Cd0 = ${results.cdMin.toFixed(4)}`;
      }
    }
  }

  /**
   * Ejecuta el BARRIDO INTERACTIVO Y ANIMADO EN EL TÚNEL DE VIENTO:
   * Rota físicamente el modelo a través de cada ángulo de ataque,
   * avanza activamente el solucionador Navier-Stokes/LBM para simular el flujo dinámico real,
   * dibuja punto a punto la curva polar en tiempo real en la superposición translúcida
   * y habilita la descarga de informe y exportación una vez completado.
   */
  function startInteractiveSweep(sim) {
    const target = sim.selectedElement || (sim.elements && sim.elements.find(e => e && !e.isProbe));
    if (!target) return;

    // Vincular exclusivamente la pieza que fue sometida al botón "Iniciar barrido"
    lastSweptElement = target;
    hasExecutedSweepAnimation = true;

    if (isSweepingAnimation) {
      stopSweepAnimation();
      return;
    }

    const minInput = document.getElementById('sweep-min-aoa');
    const maxInput = document.getElementById('sweep-max-aoa');
    const stepInput = document.getElementById('sweep-step-aoa');

    let minAoa = minInput ? parseFloat(minInput.value) || 0 : 0;
    let maxAoa = maxInput ? parseFloat(maxInput.value) || 20 : 20;
    let step = stepInput ? parseFloat(stepInput.value) || 1 : 1;

    if (maxAoa <= minAoa) {
      maxAoa = minAoa + 15;
      if (maxInput) maxInput.value = maxAoa;
    }
    if (step <= 0) step = 1;

    lastSweptMinAoa = minAoa;
    lastSweptMaxAoa = maxAoa;
    lastSweptStep = step;

    const isSpanish = isSpanishLang();
    const nameEl = document.getElementById('sweep-target-name');
    if (nameEl) {
      nameEl.textContent = target.name || (isSpanish ? "Perfil Aerodinámico" : "Aerodynamic Body");
    }

    // Calcular polar considerando el flujo local real y obstáculos aguas arriba
    const results = computeAerodynamicPolar(target, sim.fluid, minAoa, maxAoa, step, sim);
    currentSweepResults = results;
    sim.lastAlphaSweep = results;

    const runBtn = document.getElementById('btn-run-sweep');
    const canvas = document.getElementById('sweep-chart-canvas');

    if (runBtn) {
      runBtn.classList.add('is-sweeping');
    }

    isSweepingAnimation = true;
    const initialRotation = target.currentRotationDeg || 0;
    let stepIndex = 0;
    const totalSteps = results.data.length;

    sweepAnimationTimer = setInterval(() => {
      if (!isSweepingAnimation || stepIndex >= totalSteps) {
        // Finalizar barrido y dejar la pieza fija en la posición del ángulo final configurado
        clearInterval(sweepAnimationTimer);
        sweepAnimationTimer = null;
        isSweepingAnimation = false;
        hasExecutedSweepAnimation = true;

        if (typeof window.updateModalSweepButtonsState === 'function') {
          window.updateModalSweepButtonsState();
        }

        const finalAoa = (results.data && results.data.length > 0)
          ? results.data[results.data.length - 1].aoa
          : maxAoa;

        target.setAbsoluteRotation(finalAoa, target.getCentroid ? target.getCentroid() : null);
        if (sim.fluid) sim.fluid.rasterizeObstacles(sim.elements);
        if (sim.isLBMMode && sim.lbm) sim.lbm.rasterizeObstacles(sim.elements, sim.fluid.domainWidth, sim.fluid.domainHeight);
        if (typeof sim.render === 'function') sim.render();

        const normRot = ((Math.round(finalAoa) % 360) + 360) % 360;
        const slider = document.getElementById('slider-rotation');
        if (slider) slider.value = normRot;
        const lblRot = document.getElementById('lbl-rot-value');
        if (lblRot) lblRot.textContent = `${normRot}°`;

        updateMetricsCards(results, null);
        if (canvas) renderPolarChart(canvas, results, currentActiveTab, null);

        if (runBtn) {
          runBtn.classList.remove('is-sweeping');
          runBtn.innerHTML = isSpanish ? "▶ Iniciar Barrido α" : "▶ Run α-Sweep";
        }

        // Habilitar visualmente los botones de descarga de polar en el modal de donación
        const modalPolarBtns = document.querySelectorAll('.btn-download-polar-hero');
        modalPolarBtns.forEach(btn => {
          btn.classList.add('ready-to-download');
        });

        if (typeof window.showToast === 'function') {
          window.showToast(
            isSpanish ? "¡Barrido aerodinámico α completado con éxito! Ya puedes generar tu informe." : "Aerodynamic α-sweep completed successfully! You can now generate your report.",
            'success',
            3500
          );
        }
        return;
      }

      const curPoint = results.data[stepIndex];
      const curAoa = curPoint.aoa;

      // 1. Rotar el cuerpo físico en el túnel aerodinámico
      target.setAbsoluteRotation(curAoa, target.getCentroid ? target.getCentroid() : null);

      // 2. Avanzar físicamente el fluido (Navier-Stokes o LBM) de forma fluida a 60 FPS
      if (sim.fluid) {
        sim.fluid.rasterizeObstacles(sim.elements);
        sim.fluid.step(0.025);
      }
      if (sim.isLBMMode && sim.lbm) {
        sim.lbm.rasterizeObstacles(sim.elements, sim.fluid.domainWidth, sim.fluid.domainHeight);
        sim.lbm.step();
      }
      if (typeof sim.render === 'function') sim.render();

      // Sincronizar control de rotación del panel lateral y valor numérico
      const slider = document.getElementById('slider-rotation');
      const displaySliderVal = ((Math.round(curAoa) % 360) + 360) % 360;
      if (slider) slider.value = displaySliderVal;
      const lblRot = document.getElementById('lbl-rot-value');
      if (lblRot) lblRot.textContent = `${displaySliderVal}°`;

      // 3. Dibujar la curva paso a paso en tiempo real en la gráfica flotante
      if (canvas) {
        renderPolarChart(canvas, results, currentActiveTab, stepIndex);
      }

      // 4. Actualizar tarjetas de métricas en vivo en el panel izquierdo
      updateMetricsCards(results, stepIndex);

      // 5. Actualizar estado del botón con ángulo actual y progreso
      if (runBtn) {
        const percent = Math.round(((stepIndex + 1) / totalSteps) * 100);
        runBtn.innerHTML = `⏳ α = ${curAoa}° (${percent}%)`;
      }

      stepIndex++;
    }, 70); // 70ms por ángulo
  }

  function switchSweepTab(mode) {
    currentActiveTab = mode;
    const overlay = document.getElementById('sweep-chart-floating-overlay');
    if (overlay) {
      overlay.querySelectorAll('.sweep-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-sweep-tab') === mode);
      });
    }
    const canvas = document.getElementById('sweep-chart-canvas');
    if (canvas && currentSweepResults) {
      renderPolarChart(canvas, currentSweepResults, currentActiveTab, null);
    }
  }

  /**
   * Alterna el plegado de la ventana de gráficas flotante a la derecha
   */
  function toggleFoldOverlay() {
    const overlay = document.getElementById('sweep-chart-floating-overlay');
    const foldBtn = document.getElementById('btn-fold-sweep-overlay');
    if (!overlay) return;
    const isFolded = overlay.classList.toggle('is-folded');
    if (foldBtn) {
      foldBtn.textContent = isFolded ? '▶' : '◀';
      const isSpanish = isSpanishLang();
      foldBtn.title = isFolded
        ? (window.t ? window.t('btnFoldOverlayTitleUnfold') : (isSpanish ? 'Desplegar gráficas' : 'Unfold chart'))
        : (window.t ? window.t('btnFoldOverlayTitleFold') : (isSpanish ? 'Plegar gráfica a la izquierda' : 'Fold chart to left'));
    }
  }

  /**
   * Gestiona el clic en el botón "Descargar Polar CSV":
   * Si no se ha realizado la animación de barrido previa, bloquea y muestra el cartel flotante.
   * Si ya se ejecutó el barrido, abre la ventana modal de "Guardar informe" para ver opciones de donación.
   */
  function handleSweepCsvDownloadClick(sim) {
    const isSpanish = isSpanishLang();

    if (!hasExecutedSweepAnimation || !lastSweptElement) {
      if (typeof window.showToast === 'function') {
        window.showToast(
          isSpanish
            ? 'Debes presionar "Iniciar Barrido" para poder generar el informe.'
            : 'You must press "Start Sweep" to generate the report.',
          'warning',
          4000
        );
      }
      const runBtn = document.getElementById('btn-run-sweep');
      if (runBtn) {
        runBtn.classList.add('pulse-highlight');
        setTimeout(() => runBtn.classList.remove('pulse-highlight'), 1800);
      }
      return;
    }

    // Si ya realizó la animación, abre el modal de "Guardar informe"
    if (typeof window.openReportDonateModal === 'function') {
      window.openReportDonateModal();
    } else {
      const modal = document.getElementById('report-donate-modal');
      if (modal) modal.style.display = 'flex';
    }
  }

  /**
   * Comprueba si el barrido aerodinámico fue completado con éxito para el elemento actual
   */
  function hasSweepCompleted(sim) {
    const activeSim = sim || window.sim;
    if (!hasExecutedSweepAnimation || !lastSweptElement) return false;
    if (activeSim && activeSim.elements && !activeSim.elements.includes(lastSweptElement)) return false;
    return Boolean(currentSweepResults && currentSweepResults.data && currentSweepResults.data.length > 0);
  }

  /**
   * Hace parpadear el tooltip suave de advertencia sobre el botón indicado si el barrido no se ha ejecutado
   */
  function flashSweepRequiredTooltip(btnId) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.classList.add('tooltip-flash');
    if (btn._tooltipFlashTimer) clearTimeout(btn._tooltipFlashTimer);
    btn._tooltipFlashTimer = setTimeout(() => {
      btn.classList.remove('tooltip-flash');
      btn._tooltipFlashTimer = null;
    }, 2500);
  }

  /**
   * Gestiona la descarga de la polar CSV desde dentro del modal de "Guardar informe":
   * Requiere estrictamente que el usuario haya ejecutado primero el barrido aerodinámico (α-Sweep).
   * Si no se ha realizado, el botón permanece inhabilitado y activa el tooltip flotante informativo.
   */
  function downloadPolarFromReportModal(sim) {
    const activeSim = sim || window.sim;

    if (!hasSweepCompleted(activeSim)) {
      flashSweepRequiredTooltip('btn-download-polar-csv-modal');
      return;
    }

    if (currentSweepResults) {
      exportPolarOnlyCSV(currentSweepResults, activeSim);
    }
  }

  /**
   * Gestiona la descarga del informe completo en Excel (.xlsx) desde el modal de "Guardar informe":
   * Requiere estrictamente que el usuario haya ejecutado primero el barrido aerodinámico (α-Sweep).
   * Si no se ha realizado, el botón permanece inhabilitado y activa el tooltip flotante informativo.
   */
  function downloadPolarExcelFromReportModal(sim) {
    const activeSim = sim || window.sim;

    if (!hasSweepCompleted(activeSim)) {
      flashSweepRequiredTooltip('btn-download-polar-excel-modal');
      return;
    }

    if (currentSweepResults) {
      exportPolarExcel(currentSweepResults, activeSim);
    }
  }

  /**
   * Construye el texto CSV con metadatos científicos completos y los datos de la polar
   * Todo el contenido textual se traduce estrictamente al idioma activo en el momento de la descarga.
   */
  function buildPolarCSVText(results, isSpanish) {
    if (!results || !results.data) return '';
    const localizedName = getLocalizedObstacleName(results.obstacleName, isSpanish);
    const localizedUpstream = getLocalizedObstacleName(results.upstreamObstacleName || (isSpanish ? 'Obstáculo' : 'Obstacle'), isSpanish);

    let csv = '\uFEFF'; // UTF-8 BOM
    csv += '# =========================================================================================\n';
    csv += isSpanish
      ? '# AMBYSTOMA TECHNOLOGIES - LAB DE INVESTIGACIÓN AERODINÁMICA Y DINÁMICA DE FLUIDOS\n# BARRIDO AUTOMÁTICO DE ÁNGULO DE ATAQUE (α-SWEEP) Y POLARES AERODINÁMICAS\n'
      : '# AMBYSTOMA TECHNOLOGIES - AERODYNAMICS & FLUID DYNAMICS RESEARCH LAB\n# AUTOMATED ANGLE OF ATTACK SWEEP (α-SWEEP) & AERODYNAMIC POLARS\n';
    csv += '# Web: https://ambystomatechnologies.github.io/wind-tunnel-simulator/\n';
    csv += isSpanish
      ? '# Licencia: Open Source (MIT) - Acceso libre para docencia e investigación\n'
      : '# License: Open Source (MIT) - Free access for education and research\n';
    csv += '# =========================================================================================\n#\n';
    csv += isSpanish
      ? '# REFERENCIA Y CITACIÓN CIENTÍFICA (NORMA APA 7ª ED.):\n# Segura Torres, B. A. (2026). Simulador 2D de Fluidos y Túnel de Viento Interactivo [Software computacional]. Ambystoma Technologies. https://ambystomatechnologies.github.io/wind-tunnel-simulator/\n'
      : '# SCIENTIFIC REFERENCE & CITATION (APA 7th ED.):\n# Segura Torres, B. A. (2026). Interactive 2D Fluid and Wind Tunnel Simulator [Computer software]. Ambystoma Technologies. https://ambystomatechnologies.github.io/wind-tunnel-simulator/\n';
    csv += '#\n# ' + (isSpanish ? 'CUERPO EVALUADO: ' : 'EVALUATED BODY: ') + localizedName + '\n';
    csv += isSpanish
      ? `# Cuerda estimada: ${results.chord} m | Espesor relativo: ${results.thicknessRatio} %\n`
      : `# Estimated chord: ${results.chord} m | Relative thickness: ${results.thicknessRatio} %\n`;
    if (results.hasUpstreamWake && results.wakeDeficit > 0.05) {
      csv += isSpanish
        ? `# CONDICIÓN DE FLUJO: En estela de obstáculo aguas arriba (${localizedUpstream})\n`
        : `# FLOW CONDITION: Inside upstream obstacle wake (${localizedUpstream})\n`;
      csv += isSpanish
        ? `# Velocidad de entrada túnel U_inf: ${results.speed} m/s | Velocidad incidente local U_local: ${results.uLocal} m/s (Déficit: ${(results.wakeDeficit * 100).toFixed(1)} %)\n`
        : `# Tunnel inflow velocity U_inf: ${results.speed} m/s | Local incident velocity U_local: ${results.uLocal} m/s (Deficit: ${(results.wakeDeficit * 100).toFixed(1)} %)\n`;
      csv += isSpanish
        ? `# Presión dinámica libre q_inf: ${results.qInf} Pa | Presión dinámica incidente q_local: ${results.qLocal} Pa\n`
        : `# Free-stream dynamic pressure q_inf: ${results.qInf} Pa | Local dynamic pressure q_local: ${results.qLocal} Pa\n`;
      csv += isSpanish
        ? `# Desviación angular de flujo incidente (Downwash): ${results.downwashAngle} deg\n`
        : `# Inflow angular deflection (Downwash): ${results.downwashAngle} deg\n`;
    } else {
      csv += isSpanish
        ? `# CONDICIÓN DE FLUJO: Flujo libre no perturbado (Túnel Limpio)\n`
        : `# FLOW CONDITION: Undisturbed free flow (Clean Tunnel)\n`;
      csv += isSpanish
        ? `# Velocidad de flujo U_inf: ${results.speed} m/s | Presión dinámica q_inf: ${results.qInf} Pa\n`
        : `# Flow velocity U_inf: ${results.speed} m/s | Dynamic pressure q_inf: ${results.qInf} Pa\n`;
    }
    csv += isSpanish
      ? `# Cl máx (referencia túnel): ${results.clMax} @ ${results.clMaxAngle} deg | Ángulo de pérdida (Stall): ${results.stallAngle} deg\n# Cd mín: ${results.cdMin} | Máxima eficiencia (L/D)máx: ${results.lodMax} @ ${results.lodMaxAngle} deg\n`
      : `# Max Cl (tunnel reference): ${results.clMax} @ ${results.clMaxAngle} deg | Stall angle: ${results.stallAngle} deg\n# Min Cd: ${results.cdMin} | Max efficiency (L/D)max: ${results.lodMax} @ ${results.lodMaxAngle} deg\n`;
    csv += '# =========================================================================================\n\n';

    csv += isSpanish
      ? 'AoA_grados,Cl_Sustentacion,Cd_Arrastre,Eficiencia_L_D,Fuerza_Arrastre_N,Fuerza_Sustentacion_N,Regimen_Aerodinamico,Velocidad_Local_m_s,Presion_Dinamica_Local_Pa\n'
      : 'AoA_deg,Cl_Lift,Cd_Drag,Efficiency_L_over_D,Drag_Force_N,Lift_Force_N,Aerodynamic_Regime,Local_Speed_m_s,Local_Dynamic_Pressure_Pa\n';

    results.data.forEach(p => {
      const regimeName = getLocalizedRegime(p.regime, isSpanish);
      csv += `${p.aoa},${p.cl},${p.cd},${p.lod},${p.fd},${p.fl},"${regimeName}",${p.uLocal || results.uLocal},${p.qLocal || results.qLocal}\n`;
    });
    return csv;
  }

  /**
   * Obtiene la imagen del logo institucional en versión oscura (logoblack.png) para incrustación directa en ExcelJS.
   * Emplea fetch binario como vía primaria (ArrayBuffer) y canvas/Image como respaldos garantizados.
   */
  async function getLogoImageForExcel(workbook) {
    if (!workbook) return null;

    // 1. Intentar carga directa binaria vía fetch('logoblack.png')
    try {
      const resp = await fetch('logoblack.png');
      if (resp.ok) {
        const ab = await resp.arrayBuffer();
        if (ab && ab.byteLength > 0) {
          return workbook.addImage({
            buffer: ab,
            extension: 'png'
          });
        }
      }
    } catch (e) {
      console.warn('Fetch binario de logoblack.png falló, recurriendo a fallbacks:', e);
    }

    // 2. Fallback de elemento Image asíncrono con logoblack.png
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const c = document.createElement('canvas');
            c.width = img.naturalWidth || 400;
            c.height = img.naturalHeight || 75;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(c.toDataURL('image/png'));
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = (err) => reject(err);
        img.src = 'logoblack.png';
      });
      if (dataUrl && dataUrl.startsWith('data:image')) {
        return workbook.addImage({
          base64: dataUrl,
          extension: 'png'
        });
      }
    } catch (e3) {
      console.warn('Image onload fallback de logoblack.png falló:', e3);
    }

    return null;
  }

  /**
   * Captura en alta resolución (Retina 2x) una de las 4 gráficas aerodinámicas para exportación
   * @param {Object} results
   * @param {'cl_alpha'|'drag_polar'|'cd_alpha'|'lod_alpha'} mode
   * @returns {string} DataURL en formato PNG
   */
  function captureChartAsDataURL(results, mode) {
    try {
      const canvas = document.createElement('canvas');
      const width = 640;
      const height = 290;
      const dpr = 2;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      renderPolarChart(canvas, results, mode, null, {
        isExport: true,
        forceWidth: width,
        forceHeight: height,
        dpr: dpr,
        background: '#090d1a',
        padLeft: 56,
        padRight: 24,
        padTop: 34,
        padBottom: 32
      });
      return canvas.toDataURL('image/png');
    } catch (err) {
      console.error('Error al capturar gráfica en DataURL para reporte:', err);
      return '';
    }
  }

  /**
   * Exporta el informe aerodinámico completo a un archivo Microsoft Excel nativo (.xlsx).
   * Estructura:
   * - A la izquierda: datos crudos y metadatos científicos.
   * - A la derecha (Columna L): PRIMERO el logo institucional "logo.png" arriba de los gráficos,
   *   seguido del título de sección y las capturas de las 4 gráficas aerodinámicas debajo del logo.
   * - Todos los textos (títulos, encabezados, metadatos, nombres de cuerpos y regímenes) se
   *   traducen estrictamente al idioma seleccionado a la hora de la descarga.
   */
  /**
   * Muestra magnitudes puntuales de flujo para la tabla de sondas en Excel
   */
  function sampleFluidForExcel(activeSim, x, y) {
    let uVal = 0, vVal = 0, pVal = 0, vortVal = 0, speed = 0;
    if (activeSim && activeSim.isLBMMode && activeSim.lbm) {
      const domW = (activeSim.fluid && activeSim.fluid.domainWidth) ? activeSim.fluid.domainWidth : 16;
      const domH = (activeSim.fluid && activeSim.fluid.domainHeight) ? activeSim.fluid.domainHeight : 9;
      const lx = Math.max(1, Math.min(activeSim.lbm.nx - 2, (x / domW) * activeSim.lbm.nx));
      const ly = Math.max(1, Math.min(activeSim.lbm.ny - 2, (y / domH) * activeSim.lbm.ny));
      const idx = Math.floor(lx) + Math.floor(ly) * activeSim.lbm.nx;
      const scaleToMs = (activeSim.fluid && activeSim.fluid.inflowSpeed ? activeSim.fluid.inflowSpeed : 5.0) / Math.max(0.01, activeSim.lbm.speed);
      uVal = activeSim.lbm.ux[idx] * scaleToMs;
      vVal = activeSim.lbm.uy[idx] * scaleToMs;
      speed = Math.hypot(uVal, vVal);
      pVal = (activeSim.lbm.rho[idx] - 1.0) * (1.0 / 3.0) * (activeSim.fluid ? activeSim.fluid.density : 1.225) * (scaleToMs * scaleToMs);
      vortVal = activeSim.lbm.curl[idx] * scaleToMs * (activeSim.lbm.nx / domW);
    } else if (activeSim && activeSim.fluid) {
      const gx = x / activeSim.fluid.dx;
      const gy = y / activeSim.fluid.dy;
      uVal = activeSim.fluid.sampleBilinear(activeSim.fluid.u, gx, gy);
      vVal = activeSim.fluid.sampleBilinear(activeSim.fluid.v, gx, gy);
      pVal = activeSim.fluid.sampleBilinear(activeSim.fluid.p, gx, gy);
      vortVal = activeSim.fluid.sampleBilinear(activeSim.fluid.vorticity, gx, gy);
      speed = Math.hypot(uVal, vVal);
    }
    return { u: uVal, v: vVal, speed, p: pVal, vorticity: vortVal };
  }

  /**
   * Exporta el informe científico completo a Excel (.xlsx):
   * Incluye:
   * 1. Encabezado institucional con logotipo y citación APA 7ª ed.
   * 2. Tabla de telemetría de fuerzas aerodinámicas (Fd, Fl, Cd, Cl, L/D, Reynolds, Pmax, Pmin, ΔP, Régimen)
   * 3. Tabla de medio fluido y condiciones ambientales de corriente libre (Inflow)
   * 4. Tabla de parámetros del solver numérico y discretización
   * 5. Tabla de resumen de cuerpos y modelos en el túnel
   * 6. Tabla de sondas y sensores virtuales de flujo (Tubo de Pitot)
   * 7. Tabla de datos experimentales del barrido (α-Sweep)
   * 8. Gráficas científicas incrustadas en alta resolución (Cl-α, Lilienthal polar, Cd-α, L/D-α)
   */
  async function exportPolarExcel(results, sim) {
    const isSpanish = isSpanishLang();
    const activeSim = sim || window.sim;

    // Si no se proporcionaron resultados de polar previos, intentar computarlos al vuelo
    if (!results || !results.data) {
      const activeTarget = (activeSim && activeSim.selectedElement)
        || (activeSim && activeSim.elements && activeSim.elements.find(e => e && !e.isProbe))
        || (activeSim && activeSim.elements && activeSim.elements[0])
        || lastSweptElement;
      if (activeTarget && activeSim && activeSim.fluid) {
        results = computeAerodynamicPolar(activeTarget, activeSim.fluid, 0, 16, 1, activeSim);
      }
    }

    // 1. Asegurar que la librería ExcelJS esté disponible
    let ExcelLib = window.ExcelJS || (typeof ExcelJS !== 'undefined' ? ExcelJS : null);
    if (!ExcelLib) {
      try {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'js/exceljs.min.js';
          s.onload = () => resolve();
          s.onerror = (e) => reject(e);
          document.head.appendChild(s);
        });
        ExcelLib = window.ExcelJS;
      } catch (err) {
        console.error('Error al cargar exceljs.min.js:', err);
        return;
      }
    }

    if (!ExcelLib) return;

    const density = (activeSim && activeSim.fluid && activeSim.fluid.density) ? activeSim.fluid.density : 1.225;
    const viscosity = (activeSim && activeSim.fluid && activeSim.fluid.viscosity) ? activeSim.fluid.viscosity : 0.00015;
    const dynamicViscosity = density * viscosity;
    const inflowSpeed = (activeSim && activeSim.fluid && activeSim.fluid.inflowSpeed) ? activeSim.fluid.inflowSpeed : 5.0;
    const inflowAngle = (activeSim && activeSim.fluid && activeSim.fluid.inflowAngle !== undefined) ? (activeSim.fluid.inflowAngle * 180 / Math.PI) : 0;
    const qInf = 0.5 * density * inflowSpeed * inflowSpeed;

    function getActiveMaterial(d, v, isEs) {
      if (Math.abs(d - 1.225) < 0.2 && v < 0.0003) return isEs ? "Aire Estándar (15°C, 1 atm)" : "Standard Air (15°C, 1 atm)";
      if (Math.abs(d - 1000) < 50 && v < 0.00005) return isEs ? "Agua Líquida (20°C)" : "Liquid Water (20°C)";
      if (Math.abs(d - 900) < 60 && v > 0.00005 && v < 0.0005) return isEs ? "Aceite Lubricante" : "Lubricating Oil";
      if (Math.abs(d - 1260) < 100 && v > 0.0008) return isEs ? "Glicerina Pura" : "Pure Glycerin";
      if (d <= 0.2 || v <= 0.00001) return isEs ? "Superfluido Cuántico" : "Quantum Superfluid";
      return isEs ? "Fluido Personalizado" : "Custom Fluid Medium";
    }
    const activeMaterial = getActiveMaterial(density, viscosity, isSpanish);

    const sweptElem = (results && results.obstacleName) ? results.obstacleName : null;
    let targetElement = (sweptElem && activeSim && activeSim.elements && activeSim.elements.find(e => e && e.name === sweptElem))
      || (activeSim && activeSim.selectedElement)
      || (activeSim && activeSim.elements && activeSim.elements.find(e => e && !e.isProbe))
      || (activeSim && activeSim.elements && activeSim.elements[0])
      || lastSweptElement;

    const targetName = targetElement
      ? getLocalizedObstacleName(targetElement.name || '', isSpanish)
      : (results ? getLocalizedObstacleName(results.obstacleName || '', isSpanish) : (isSpanish ? "Túnel Libre (Sin obstáculos)" : "Clean Wind Tunnel"));

    let metrics = {
      dragForce: 0,
      liftForce: 0,
      cd: 0,
      cl: 0,
      efficiency: 0,
      reynolds: 0,
      pMax: 0,
      pMin: 0,
      aoa: targetElement ? (targetElement.currentRotationDeg || 0) : 0
    };

    if (targetElement && activeSim) {
      if (targetElement.isProbe) {
        metrics.pMax = targetElement.measuredP || 0;
        metrics.pMin = targetElement.measuredVorticity || 0;
      } else {
        const obsIdx = (activeSim.elements || []).indexOf(targetElement);
        if (activeSim.isLBMMode && activeSim.lbm) {
          const fx = (activeSim.lbm.forceX !== undefined) ? activeSim.lbm.forceX : (activeSim.lbm.barrierFx || 0);
          const fy = (activeSim.lbm.forceY !== undefined) ? activeSim.lbm.forceY : (activeSim.lbm.barrierFy || 0);
          metrics = {
            dragForce: fx * 1000,
            liftForce: fy * 1000,
            cd: Math.abs(fx) * 10,
            cl: fy * 10,
            efficiency: Math.abs(fy / (Math.abs(fx) + 1e-6)),
            reynolds: Math.round(activeSim.lbm.viscosity > 0 ? (activeSim.lbm.u0 * 20) / activeSim.lbm.viscosity * 100 : 0),
            pMax: 0,
            pMin: 0,
            aoa: targetElement.currentRotationDeg || 0
          };
        } else if (activeSim.fluid && typeof activeSim.fluid.calculateHydrodynamicForces === 'function') {
          const raw = activeSim.fluid.calculateHydrodynamicForces(targetElement, obsIdx);
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

    const workbook = new ExcelLib.Workbook();
    workbook.creator = 'Ambystoma Technologies';
    workbook.lastModifiedBy = 'Ambystoma Technologies';
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheetName = isSpanish ? 'Informe Técnico CFD' : 'CFD Technical Report';
    const worksheet = workbook.addWorksheet(sheetName, {
      properties: { tabColor: { argb: 'FF00FFCC' } },
      views: [{ showGridLines: true }]
    });

    // Ancho de columnas: A-I para datos de telemetría y tablas, J-K espaciadores, L en adelante para logo y gráficas
    worksheet.columns = [
      { key: 'colA', width: 22 }, // Parámetro 1
      { key: 'colB', width: 18 }, // Valor 1
      { key: 'colC', width: 4 },  // Espaciador celda
      { key: 'colD', width: 22 }, // Parámetro 2
      { key: 'colE', width: 18 }, // Valor 2
      { key: 'colF', width: 4 },  // Espaciador celda
      { key: 'colG', width: 22 }, // Parámetro 3
      { key: 'colH', width: 20 }, // Valor 3
      { key: 'colI', width: 14 }, // Unidad / Extra
      { key: 'colJ', width: 3 },  // Espaciador
      { key: 'colK', width: 3 },  // Espaciador
      { key: 'colL', width: 28 }, // Inicio bloque visual derecho
      { key: 'colM', width: 24 },
      { key: 'colN', width: 24 },
      { key: 'colO', width: 24 },
    ];

    // Encabezado institucional (Filas 1 a 3)
    worksheet.mergeCells('A1:I1');
    const cellA1 = worksheet.getCell('A1');
    cellA1.value = isSpanish
      ? 'AMBYSTOMA TECHNOLOGIES - LAB DE INVESTIGACIÓN AERODINÁMICA Y DINÁMICA DE FLUIDOS'
      : 'AMBYSTOMA TECHNOLOGIES - AERODYNAMICS & FLUID DYNAMICS RESEARCH LAB';
    cellA1.font = { name: 'Segoe UI', size: 12.5, bold: true, color: { argb: 'FF0F172A' } };

    worksheet.mergeCells('A2:I2');
    const cellA2 = worksheet.getCell('A2');
    cellA2.value = isSpanish
      ? 'INFORME TÉCNICO DE SIMULACIÓN Y TELEMETRÍA AERODINÁMICA (DATASET COMPLETO)'
      : 'AERODYNAMIC SIMULATION & TELEMETRY TECHNICAL REPORT (FULL DATASET)';
    cellA2.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF008080' } };

    worksheet.mergeCells('A3:I3');
    const cellA3 = worksheet.getCell('A3');
    cellA3.value = isSpanish
      ? 'Segura Torres, B. A. (2026). Simulador 2D de Fluidos y Túnel de Viento Interactivo [Software]. Ambystoma Technologies (Norma APA 7ª Ed.).'
      : 'Segura Torres, B. A. (2026). Interactive 2D Fluid and Wind Tunnel Simulator [Software]. Ambystoma Technologies (APA 7th Ed.).';
    cellA3.font = { name: 'Segoe UI', size: 8.5, italic: true, color: { argb: 'FF64748B' } };

    const borderMeta = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
    };
    const fillSectionHeader = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    const fillMeta = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };

    function styleSectionHeader(rowIdx, title) {
      worksheet.mergeCells(`A${rowIdx}:I${rowIdx}`);
      const c = worksheet.getCell(`A${rowIdx}`);
      c.value = title;
      c.fill = fillSectionHeader;
      c.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF00FFCC' } };
      c.alignment = { vertical: 'middle', horizontal: 'left' };
      worksheet.getRow(rowIdx).height = 22;
    }

    function applyDataRowStyle(startRow, endRow) {
      for (let r = startRow; r <= endRow; r++) {
        const row = worksheet.getRow(r);
        row.height = 19;
        for (let c = 1; c <= 9; c++) {
          const cell = row.getCell(c);
          cell.fill = fillMeta;
          cell.border = borderMeta;
        }
      }
    }

    // =========================================================================
    // TABLA 1: TELEMETRÍA AERODINÁMICA Y FUERZAS HIDRODINÁMICAS (Filas 5 a 9)
    // =========================================================================
    styleSectionHeader(5, isSpanish ? '⚡ 1. TELEMETRÍA AERODINÁMICA Y FUERZAS HIDRODINÁMICAS' : '⚡ 1. AERODYNAMIC TELEMETRY & HYDRODYNAMIC FORCES');

    // Fila 6
    worksheet.getCell('A6').value = isSpanish ? 'Cuerpo Evaluado:' : 'Evaluated Body:';
    worksheet.mergeCells('B6:C6');
    worksheet.getCell('B6').value = targetName;
    worksheet.getCell('B6').font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF008080' } };
    worksheet.getCell('D6').value = isSpanish ? 'Ángulo de Ataque (α):' : 'Angle of Attack (α):';
    worksheet.getCell('E6').value = `${Math.round(metrics.aoa)}°`;
    worksheet.getCell('G6').value = isSpanish ? 'Fuerza Arrastre (Fd):' : 'Drag Force (Fd):';
    worksheet.mergeCells('H6:I6');
    worksheet.getCell('H6').value = `${metrics.dragForce.toFixed(3)} N`;

    // Fila 7
    worksheet.getCell('A7').value = isSpanish ? 'Fuerza Sustent. (Fl):' : 'Lift Force (Fl):';
    worksheet.mergeCells('B7:C7');
    worksheet.getCell('B7').value = `${metrics.liftForce.toFixed(3)} N`;
    worksheet.getCell('D7').value = isSpanish ? 'Coeficiente Cd:' : 'Drag Coeff. (Cd):';
    worksheet.getCell('E7').value = metrics.cd.toFixed(4);
    worksheet.getCell('G7').value = isSpanish ? 'Coeficiente Cl:' : 'Lift Coeff. (Cl):';
    worksheet.mergeCells('H7:I7');
    worksheet.getCell('H7').value = metrics.cl.toFixed(4);

    // Fila 8
    worksheet.getCell('A8').value = isSpanish ? 'Eficiencia (L/D):' : 'Efficiency (L/D):';
    worksheet.mergeCells('B8:C8');
    worksheet.getCell('B8').value = metrics.efficiency.toFixed(2);
    worksheet.getCell('D8').value = isSpanish ? 'Número Reynolds (Re):' : 'Reynolds Number (Re):';
    worksheet.getCell('E8').value = metrics.reynolds.toLocaleString();
    worksheet.getCell('G8').value = isSpanish ? 'Presión Estancamiento (+P):' : 'Stagnation Press. (+P):';
    worksheet.mergeCells('H8:I8');
    worksheet.getCell('H8').value = `+${(metrics.pMax || 0).toFixed(1)} Pa`;

    // Fila 9
    worksheet.getCell('A9').value = isSpanish ? 'Presión Succión (-P):' : 'Suction Press. (-P):';
    worksheet.mergeCells('B9:C9');
    worksheet.getCell('B9').value = `${(metrics.pMin || 0).toFixed(1)} Pa`;
    worksheet.getCell('D9').value = isSpanish ? 'Gradiente Presión (ΔP):' : 'Pressure Delta (ΔP):';
    worksheet.getCell('E9').value = `${deltaP.toFixed(1)} Pa`;
    worksheet.getCell('G9').value = isSpanish ? 'Régimen Aerodinámico:' : 'Aerodynamic Regime:';
    worksheet.mergeCells('H9:I9');
    worksheet.getCell('H9').value = regimeText;
    worksheet.getCell('H9').font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF008080' } };

    ['A6', 'D6', 'G6', 'A7', 'D7', 'G7', 'A8', 'D8', 'G8', 'A9', 'D9', 'G9'].forEach(addr => {
      worksheet.getCell(addr).font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF334155' } };
    });
    applyDataRowStyle(6, 9);

    // =========================================================================
    // TABLA 2: MEDIO FLUIDO Y CONDICIONES DE CORRIENTE LIBRE (INFLOW) (Filas 11 a 14)
    // =========================================================================
    styleSectionHeader(11, isSpanish ? '🌊 2. MEDIO FLUIDO Y CONDICIONES DE CORRIENTE (INFLOW)' : '🌊 2. FLUID MEDIUM & INFLOW FREE-STREAM CONDITIONS');

    // Fila 12
    worksheet.getCell('A12').value = isSpanish ? 'Medio Material:' : 'Fluid Medium:';
    worksheet.mergeCells('B12:C12');
    worksheet.getCell('B12').value = activeMaterial;
    worksheet.getCell('D12').value = isSpanish ? 'Velocidad Entrada (U∞):' : 'Inflow Speed (U∞):';
    worksheet.getCell('E12').value = `${inflowSpeed.toFixed(2)} m/s (${(inflowSpeed * 3.6).toFixed(1)} km/h)`;
    worksheet.getCell('G12').value = isSpanish ? 'Densidad Fluido (ρ):' : 'Fluid Density (ρ):';
    worksheet.mergeCells('H12:I12');
    worksheet.getCell('H12').value = `${density.toFixed(4)} kg/m³`;

    // Fila 13
    worksheet.getCell('A13').value = isSpanish ? 'Viscosidad Cinemática (ν):' : 'Kinematic Viscosity (ν):';
    worksheet.mergeCells('B13:C13');
    worksheet.getCell('B13').value = `${viscosity.toExponential(3)} m²/s`;
    worksheet.getCell('D13').value = isSpanish ? 'Viscosidad Dinámica (μ):' : 'Dynamic Viscosity (μ):';
    worksheet.getCell('E13').value = `${dynamicViscosity.toExponential(3)} Pa·s`;
    worksheet.getCell('G13').value = isSpanish ? 'Presión Dinámica (q∞):' : 'Dynamic Pressure (q∞):';
    worksheet.mergeCells('H13:I13');
    worksheet.getCell('H13').value = `${qInf.toFixed(1)} Pa`;

    // Fila 14
    worksheet.getCell('A14').value = isSpanish ? 'Ángulo Inflow:' : 'Inflow Angle:';
    worksheet.mergeCells('B14:C14');
    worksheet.getCell('B14').value = `${inflowAngle.toFixed(1)}°`;
    worksheet.getCell('D14').value = isSpanish ? 'Régimen de Entrada:' : 'Inflow Turbulence:';
    worksheet.getCell('E14').value = (activeSim && activeSim.fluid && activeSim.fluid.isTurbulent)
      ? (isSpanish ? `Turbulento (Tu: ${activeSim.fluid.turbulenceIntensity || 10}%)` : `Turbulent (Tu: ${activeSim.fluid.turbulenceIntensity || 10}%)`)
      : (isSpanish ? "Laminar Uniforme (Tu: 0%)" : "Uniform Laminar (Tu: 0%)");
    worksheet.getCell('G14').value = isSpanish ? 'Condición de Paredes:' : 'Boundary Walls:';
    worksheet.mergeCells('H14:I14');
    worksheet.getCell('H14').value = (activeSim && activeSim.fluid && activeSim.fluid.closedWalls)
      ? (isSpanish ? "Canal Cerrado (Paredes no-slip)" : "Closed Channel (No-slip walls)")
      : (isSpanish ? "Túnel Abierto (Deslizamiento libre)" : "Open Tunnel (Free-slip)");

    ['A12', 'D12', 'G12', 'A13', 'D13', 'G13', 'A14', 'D14', 'G14'].forEach(addr => {
      worksheet.getCell(addr).font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF334155' } };
    });
    applyDataRowStyle(12, 14);

    // =========================================================================
    // TABLA 3: SOLVER NUMÉRICO Y PARÁMETROS COMPUTACIONALES (Filas 16 a 18)
    // =========================================================================
    styleSectionHeader(16, isSpanish ? '🔬 3. SOLVER NUMÉRICO Y PARÁMETROS COMPUTACIONALES' : '🔬 3. NUMERICAL SOLVER & DISCRETIZATION PARAMETERS');

    // Fila 17
    worksheet.getCell('A17').value = isSpanish ? 'Algoritmo Físico:' : 'Physics Engine:';
    worksheet.mergeCells('B17:C17');
    worksheet.getCell('B17').value = (activeSim && activeSim.isLBMMode) ? "LBM D2Q9 (Schroeder BGK)" : "Navier-Stokes (MacCormack + Poisson)";
    worksheet.getCell('D17').value = isSpanish ? 'Malla Computacional:' : 'Computational Grid:';
    worksheet.getCell('E17').value = (activeSim && activeSim.isLBMMode) ? "200×100 Nodos D2Q9" : "160×90 Celdas (Δx=0.1m)";
    worksheet.getCell('G17').value = isSpanish ? 'Dimensiones Dominio:' : 'Domain Dimensions:';
    worksheet.mergeCells('H17:I17');
    worksheet.getCell('H17').value = `${activeSim && activeSim.fluid ? activeSim.fluid.domainWidth.toFixed(1) : "16.0"} × ${activeSim.fluid ? activeSim.fluid.domainHeight.toFixed(1) : "9.0"} m`;

    // Fila 18
    worksheet.getCell('A18').value = isSpanish ? 'Suavizado Geometría:' : 'Geometry Smoothing:';
    worksheet.mergeCells('B18:C18');
    worksheet.getCell('B18').value = (targetElement && targetElement.isSmooth) ? "Catmull-Rom Spline" : (isSpanish ? "Poligonal Rectilínea" : "Linear Polygon");
    worksheet.getCell('D18').value = isSpanish ? 'Trazadores Partículas:' : 'Particle Tracers:';
    worksheet.getCell('E18').value = (activeSim && activeSim.showParticles !== false) ? (isSpanish ? "Visibles en Lienzo" : "Rendered on Canvas") : (isSpanish ? "Ocultos" : "Hidden");
    worksheet.getCell('G18').value = isSpanish ? 'Precisión de Cálculo:' : 'Precision Mode:';
    worksheet.mergeCells('H18:I18');
    worksheet.getCell('H18').value = "32-bit Float High Precision";

    ['A17', 'D17', 'G17', 'A18', 'D18', 'G18'].forEach(addr => {
      worksheet.getCell(addr).font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF334155' } };
    });
    applyDataRowStyle(17, 18);

    // =========================================================================
    // TABLA 4: RESUMEN DE CUERPOS Y MODELOS EN EL TÚNEL (Filas 20 a 25)
    // =========================================================================
    const elemCount = (activeSim && activeSim.elements) ? activeSim.elements.length : 0;
    styleSectionHeader(20, `${isSpanish ? '✈️ 4. RESUMEN DE CUERPOS Y MODELOS EN EL TÚNEL' : '✈️ 4. TUNNEL BODIES & OBSTACLES SUMMARY'} (${elemCount} ${isSpanish ? 'elementos' : 'entities'})`);

    const bodyHeaders = isSpanish
      ? ['ID', 'Nombre', 'Categoría', 'Puntos', 'Ángulo AoA', 'Estado', 'Seleccionado', 'Modo Geometría', 'Detalle']
      : ['ID', 'Name', 'Category', 'Points', 'Angle AoA', 'Status', 'Selected', 'Geometry Mode', 'Detail'];

    const rowH21 = worksheet.getRow(21);
    rowH21.height = 20;
    bodyHeaders.forEach((h, idx) => {
      const cell = rowH21.getCell(idx + 1);
      cell.value = h;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: 'FFE2E8F0' } };
      cell.alignment = { vertical: 'middle', horizontal: idx === 0 ? 'center' : 'left' };
    });

    let curRow = 22;
    if (elemCount > 0) {
      activeSim.elements.slice(0, 5).forEach((el, eIdx) => {
        const isSel = (el === targetElement);
        const elName = getLocalizedObstacleName(el.name || '', isSpanish);
        const elType = el.isProbe ? (isSpanish ? "Sonda de Medición" : "Probe Sensor") : (isSpanish ? "Cuerpo Sólido" : "Solid Body");
        const elPts = el.controlPoints ? el.controlPoints.length : (el.points ? el.points.length : 0);
        const elAoA = `${Math.round(el.currentRotationDeg || 0)}°`;
        const selText = isSel ? (isSpanish ? "★ Sí" : "★ Yes") : (isSpanish ? "No" : "No");
        const geomMode = (el.isSmooth) ? "Catmull-Rom" : (isSpanish ? "Rectilíneo" : "Linear");

        const r = worksheet.getRow(curRow);
        r.height = 18;
        [eIdx + 1, elName, elType, elPts, elAoA, isSpanish ? "Activo" : "Active", selText, geomMode, isSpanish ? "Interactivo" : "Interactive"].forEach((val, cIdx) => {
          const cell = r.getCell(cIdx + 1);
          cell.value = val;
          cell.fill = fillMeta;
          cell.border = borderMeta;
          cell.font = { name: 'Segoe UI', size: 8.5, bold: isSel };
          if (cIdx === 0) cell.alignment = { horizontal: 'center' };
        });
        curRow++;
      });
    } else {
      const r = worksheet.getRow(curRow);
      r.height = 18;
      worksheet.mergeCells(`A${curRow}:I${curRow}`);
      const c = r.getCell(1);
      c.value = isSpanish ? "Túnel Libre sin obstáculos presentes." : "Clean wind tunnel without obstacles.";
      c.fill = fillMeta;
      c.border = borderMeta;
      c.font = { name: 'Segoe UI', size: 8.5, italic: true };
      curRow++;
    }

    // =========================================================================
    // TABLA 5: SONDAS Y SENSORES DE FLUJO (TUBO DE PITOT VIRTUAL)
    // =========================================================================
    curRow++;
    const probeSectionRow = curRow;
    styleSectionHeader(probeSectionRow, isSpanish ? '🎯 5. SONDAS Y SENSORES DE FLUJO (TUBO DE PITOT VIRTUAL)' : '🎯 5. FLOW PROBES & PITOT SENSORS (POINT READINGS)');

    curRow++;
    const probeHeaders = isSpanish
      ? ['ID', 'Nombre / Estación', 'Categoría', 'X (m)', 'Y (m)', 'U (m/s)', 'P (Pa)', 'q (Pa)', 'P Total (Pa)']
      : ['ID', 'Name / Station', 'Category', 'X (m)', 'Y (m)', 'U (m/s)', 'P (Pa)', 'q (Pa)', 'Total P (Pa)'];

    const rowHP = worksheet.getRow(curRow);
    rowHP.height = 20;
    probeHeaders.forEach((h, idx) => {
      const cell = rowHP.getCell(idx + 1);
      cell.value = h;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: 'FFE2E8F0' } };
      cell.alignment = { vertical: 'middle', horizontal: idx === 0 ? 'center' : (idx >= 3 ? 'right' : 'left') };
    });

    curRow++;
    const refStations = [
      { name: isSpanish ? "Pitot Entrada (Flujo Libre)" : "Inflow Pitot (Free Stream)", x: 1.5, y: 4.5 },
      { name: isSpanish ? "Borde de Ataque (Upstream)" : "Leading Edge (Upstream)", x: 4.0, y: 4.5 },
      { name: isSpanish ? "Extradós Superior (Succión)" : "Upper Extrados (Suction)", x: 6.0, y: 5.6 },
      { name: isSpanish ? "Intradós Inferior (Presión)" : "Lower Intrados (Pressure)", x: 6.0, y: 3.4 },
      { name: isSpanish ? "Estela Cercana (Wake Center)" : "Near Wake (Center)", x: 8.5, y: 4.5 },
      { name: isSpanish ? "Pitot de Salida del Túnel" : "Tunnel Exit Pitot", x: 14.5, y: 4.5 }
    ];

    let probeIdx = 0;
    refStations.forEach(st => {
      probeIdx++;
      const s = sampleFluidForExcel(activeSim, st.x, st.y);
      const qVal = 0.5 * density * s.speed * s.speed;
      const pTot = s.p + qVal;
      const r = worksheet.getRow(curRow);
      r.height = 18;

      const vals = [
        probeIdx,
        st.name,
        isSpanish ? "Estación Referencia" : "Reference Station",
        st.x.toFixed(2),
        st.y.toFixed(2),
        s.speed.toFixed(2),
        s.p.toFixed(1),
        qVal.toFixed(1),
        pTot.toFixed(1)
      ];

      vals.forEach((v, cIdx) => {
        const cell = r.getCell(cIdx + 1);
        cell.value = v;
        cell.fill = fillMeta;
        cell.border = borderMeta;
        cell.font = { name: 'Segoe UI', size: 8.5 };
        cell.alignment = { horizontal: cIdx === 0 ? 'center' : (cIdx >= 3 ? 'right' : 'left') };
      });
      curRow++;
    });

    // =========================================================================
    // TABLA 6: DATOS EXPERIMENTALES DISCRETIZADOS (α-SWEEP)
    // =========================================================================
    curRow++;
    const sweepSectionRow = curRow;
    styleSectionHeader(sweepSectionRow, isSpanish ? '📊 6. DATOS EXPERIMENTALES DISCRETIZADOS (α-SWEEP)' : '📊 6. EXPERIMENTAL DISCRETIZED DATA (α-SWEEP)');

    curRow++;
    const headers = isSpanish
      ? ['AoA (°)', 'Cl (Sustentación)', 'Cd (Arrastre)', 'L/D (Eficiencia)', 'Fl (N)', 'Fd (N)', 'Régimen Aerodinámico', 'U local (m/s)', 'q local (Pa)']
      : ['AoA (deg)', 'Cl (Lift)', 'Cd (Drag)', 'L/D (Efficiency)', 'Fl (N)', 'Fd (N)', 'Aerodynamic Regime', 'Local U (m/s)', 'Local q (Pa)'];

    const headerRow = worksheet.getRow(curRow);
    headerRow.height = 24;
    headers.forEach((h, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = h;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: idx === 6 ? 'left' : (idx === 0 ? 'center' : 'right') };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF00FFCC' } },
        bottom: { style: 'medium', color: { argb: 'FF00FFCC' } },
        left: { style: 'thin', color: { argb: 'FF334155' } },
        right: { style: 'thin', color: { argb: 'FF334155' } }
      };
    });

    curRow++;
    const dataBorder = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
    };

    if (results && results.data && results.data.length > 0) {
      results.data.forEach((p, pIdx) => {
        const row = worksheet.getRow(curRow);
        row.height = 19;

        const isClMax = results.clMax !== undefined && Math.abs(p.cl - results.clMax) < 1e-4;
        const isStall = results.stallAngle !== undefined && Math.abs(p.aoa - results.stallAngle) < 1e-1;
        const isLodMax = results.lodMax !== undefined && Math.abs(p.lod - results.lodMax) < 1e-2;

        let rowFill = (pIdx % 2 === 0)
          ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
          : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };

        if (isClMax) {
          rowFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; // Ámbar
        } else if (isStall) {
          rowFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4E6' } }; // Rosa
        } else if (isLodMax) {
          rowFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } }; // Púrpura
        }

        // Col A: AoA
        const cA = row.getCell(1);
        cA.value = p.aoa;
        cA.numFmt = '0.0"°"';
        cA.alignment = { horizontal: 'center', vertical: 'middle' };

        // Col B: Cl
        const cB = row.getCell(2);
        cB.value = p.cl;
        cB.numFmt = '0.000';
        cB.alignment = { horizontal: 'right', vertical: 'middle' };
        if (isClMax) cB.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FFB45309' } };

        // Col C: Cd
        const cC = row.getCell(3);
        cC.value = p.cd;
        cC.numFmt = '0.0000';
        cC.alignment = { horizontal: 'right', vertical: 'middle' };

        // Col D: L/D
        const cD = row.getCell(4);
        cD.value = p.lod;
        cD.numFmt = '0.00';
        cD.alignment = { horizontal: 'right', vertical: 'middle' };
        if (isLodMax) cD.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF7E22CE' } };

        // Col E: Fl
        const cE = row.getCell(5);
        cE.value = p.fl;
        cE.numFmt = '0.000';
        cE.alignment = { horizontal: 'right', vertical: 'middle' };

        // Col F: Fd
        const cF = row.getCell(6);
        cF.value = p.fd;
        cF.numFmt = '0.000';
        cF.alignment = { horizontal: 'right', vertical: 'middle' };

        // Col G: Regime
        const cG = row.getCell(7);
        cG.value = getLocalizedRegime(p.regime, isSpanish);
        cG.alignment = { horizontal: 'left', vertical: 'middle' };

        // Col H: U local
        const cH = row.getCell(8);
        cH.value = p.uLocal || (results ? results.uLocal : inflowSpeed) || inflowSpeed;
        cH.numFmt = '0.0';
        cH.alignment = { horizontal: 'right', vertical: 'middle' };

        // Col I: q local
        const cI = row.getCell(9);
        cI.value = p.qLocal || (results ? results.qLocal : qInf) || qInf;
        cI.numFmt = '0.0';
        cI.alignment = { horizontal: 'right', vertical: 'middle' };

        for (let c = 1; c <= 9; c++) {
          const cell = row.getCell(c);
          cell.fill = rowFill;
          cell.border = dataBorder;
          if (!cell.font) cell.font = { name: 'Segoe UI', size: 9 };
        }
        curRow++;
      });
    } else {
      const r = worksheet.getRow(curRow);
      r.height = 19;
      worksheet.mergeCells(`A${curRow}:I${curRow}`);
      const c = r.getCell(1);
      c.value = isSpanish ? "No se detectaron datos de barrido polar para este perfil." : "No polar sweep data detected for this profile.";
      c.fill = fillMeta;
      c.border = borderMeta;
      c.font = { name: 'Segoe UI', size: 9, italic: true };
    }

    // =========================================================================
    // BLOQUE DERECHO (Columna L):
    // 1. LOGO INSTITUCIONAL PRIMERO Y ARRIBA DE LOS GRÁFICOS (Fila 1)
    // 2. TÍTULO DE SECCIÓN VISUAL (Fila 5)
    // 3. LAS 4 GRÁFICAS CIENTÍFICAS ABAJO DEL LOGO
    // =========================================================================
    try {
      const logoImageId = await getLogoImageForExcel(workbook);
      if (logoImageId !== null && logoImageId !== undefined) {
        worksheet.addImage(logoImageId, {
          tl: { col: 11, row: 0.2 },
          ext: { width: 345, height: 64 },
          editAs: 'oneCell'
        });
      }

      worksheet.getCell('L5').value = isSpanish
        ? '📈 GRÁFICAS CIENTÍFICAS DEL BARRIDO POLAR'
        : '📈 SCIENTIFIC POLAR SWEEP CHARTS';
      worksheet.getCell('L5').font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF0F172A' } };

      if (results && results.data && results.data.length > 0) {
        const chartConfigs = [
          {
            mode: 'cl_alpha',
            title: isSpanish ? '1. Curva de Sustentación (Cl vs α)' : '1. Lift Curve (Cl vs α)',
            startRow: 7
          },
          {
            mode: 'drag_polar',
            title: isSpanish ? '2. Polar de Resistencia de Lilienthal (Cl vs Cd)' : '2. Lilienthal Drag Polar (Cl vs Cd)',
            startRow: 22
          },
          {
            mode: 'cd_alpha',
            title: isSpanish ? '3. Curva de Resistencia Aerodinámica (Cd vs α)' : '3. Drag Curve (Cd vs α)',
            startRow: 37
          },
          {
            mode: 'lod_alpha',
            title: isSpanish ? '4. Eficiencia Aerodinámica (L/D vs α)' : '4. Aerodynamic Efficiency (L/D vs α)',
            startRow: 52
          }
        ];

        for (const item of chartConfigs) {
          const titleCell = worksheet.getCell(`L${item.startRow}`);
          titleCell.value = item.title;
          titleCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF008080' } };

          const chartDataUrl = captureChartAsDataURL(results, item.mode);
          if (chartDataUrl && chartDataUrl.startsWith('data:image')) {
            const chartImageId = workbook.addImage({
              base64: chartDataUrl,
              extension: 'png'
            });
            worksheet.addImage(chartImageId, {
              tl: { col: 11, row: item.startRow + 0.35 },
              ext: { width: 560, height: 260 },
              editAs: 'oneCell'
            });
          }
        }
      }
    } catch (imgErr) {
      console.warn('Advertencia al incrustar imágenes en Excel:', imgErr);
    }

    // Generar el buffer del archivo .xlsx y disparar la descarga directa
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeObstacleName = targetName.replace(/\s+/g, '_');
    const filenamePrefix = isSpanish ? "informe_tecnico_telemetria" : "technical_telemetry_report";
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `${filenamePrefix}_${safeObstacleName}_${dateStr}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  /**
   * Exporta únicamente el barrido polar actual a un archivo CSV específico
   */
  function exportPolarOnlyCSV(results, sim) {
    if (!results || !results.data) return;
    const isSpanish = isSpanishLang();
    const safeObstacleName = getLocalizedObstacleName(results.obstacleName, isSpanish).replace(/\s+/g, '_');

    // Descargar ÚNICAMENTE el archivo CSV puro (datos tabulados planos)
    const csv = buildPolarCSVText(results, isSpanish);
    const blobCsv = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const urlCsv = URL.createObjectURL(blobCsv);
    const aCsv = document.createElement('a');
    const filenamePrefix = isSpanish ? "polar_aerodinamica" : "aerodynamic_polar";
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const csvFilename = `${filenamePrefix}_${safeObstacleName}_${dateStr}.csv`;
    aCsv.href = urlCsv;
    aCsv.download = csvFilename;
    document.body.appendChild(aCsv);
    aCsv.click();
    document.body.removeChild(aCsv);
    setTimeout(() => URL.revokeObjectURL(urlCsv), 10000);

    if (typeof window.showToast === 'function') {
      window.showToast(
        isSpanish
          ? "¡Datos de la polar aerodinámica exportados a CSV con éxito!"
          : "Aerodynamic polar data successfully exported to CSV!",
        'success',
        3500
      );
    }
  }

  /**
   * Conmuta la actualización en tiempo real de la gráfica aerodinámica
   */
  function toggleRealtime() {
    isRealtimeActive = !isRealtimeActive;
    const btn = document.getElementById('btn-toggle-sweep-realtime');
    const isSpanish = isSpanishLang();
    if (btn) {
      btn.classList.toggle('active', isRealtimeActive);
      btn.title = isRealtimeActive
        ? (window.t ? window.t('btnToggleRealtimeTitleActive') : (isSpanish ? "Tiempo real activado (haz clic para desactivar)" : "Real-time active (click to disable)"))
        : (window.t ? window.t('btnToggleRealtimeTitleInactive') : (isSpanish ? "Tiempo real desactivado (haz clic para activar)" : "Real-time disabled (click to activate)"));
    }
    if (typeof window.showToast === 'function') {
      window.showToast(
        isRealtimeActive
          ? (isSpanish ? "Actualización en tiempo real ACTIVADA" : "Real-time update ACTIVATED")
          : (isSpanish ? "Actualización en tiempo real PAUSADA" : "Real-time update PAUSED"),
        'info',
        2200
      );
    }
    if (isRealtimeActive && hasExecutedSweepAnimation && lastSweptElement && window.sim) {
      updateSweepPreview(window.sim, lastSweptElement);
    }
  }

  /**
   * Dispara una actualización en tiempo real de forma suave a 60 FPS (rAF)
   */
  function triggerRealtimeUpdate(sim) {
    const overlay = document.getElementById('sweep-chart-floating-overlay');
    const isOverlayVisible = overlay && overlay.style.display !== 'none';
    if (!isOverlayVisible || !isRealtimeActive || !hasExecutedSweepAnimation || !lastSweptElement || isSweepingAnimation) {
      return;
    }
    if (realtimeUpdateScheduled) return;
    realtimeUpdateScheduled = true;
    requestAnimationFrame(() => {
      realtimeUpdateScheduled = false;
      const activeSim = sim || window.sim;
      if (activeSim && lastSweptElement) {
        updateSweepPreview(activeSim, lastSweptElement);
      }
    });
  }

  /**
   * Responde al cambio dinámico de idioma (ENG / SPA) actualizando textos y re-renderizando la gráfica
   */
  function onLanguageChanged() {
    const isSpanish = (window.currentLang === 'es');
    const realtimeBtn = document.getElementById('btn-toggle-sweep-realtime');
    if (realtimeBtn) {
      realtimeBtn.title = isRealtimeActive
        ? (window.t ? window.t('btnToggleRealtimeTitleActive') : (isSpanish ? "Tiempo real activado (haz clic para desactivar)" : "Real-time active (click to disable)"))
        : (window.t ? window.t('btnToggleRealtimeTitleInactive') : (isSpanish ? "Tiempo real desactivado (haz clic para activar)" : "Real-time disabled (click to activate)"));
    }
    const runBtn = document.getElementById('btn-run-sweep');
    if (runBtn && !isSweepingAnimation) {
      runBtn.innerHTML = (window.t ? window.t('btnRunSweep') : null) || (isSpanish ? "▶ Iniciar Barrido α" : "▶ Run α-Sweep");
    }
    const nameEl = document.getElementById('sweep-target-name');
    if (nameEl && (!lastSweptElement || !lastSweptElement.name)) {
      nameEl.textContent = isSpanish ? "Perfil Aerodinámico" : "Aerodynamic Body";
    }
    const canvas = document.getElementById('sweep-chart-canvas');
    if (canvas) {
      if (currentSweepResults && (hasExecutedSweepAnimation || isSweepingAnimation)) {
        renderPolarChart(canvas, currentSweepResults, currentActiveTab, null);
      } else if (!hasExecutedSweepAnimation) {
        renderEmptyChartPrompt(canvas);
      }
    }
    const foldBtn = document.getElementById('btn-fold-sweep-overlay');
    const overlay = document.getElementById('sweep-chart-floating-overlay');
    if (foldBtn && overlay) {
      const isFolded = overlay.classList.contains('is-folded');
      foldBtn.title = isFolded
        ? (window.t ? window.t('btnFoldOverlayTitleUnfold') : (isSpanish ? 'Desplegar gráficas' : 'Unfold charts'))
        : (window.t ? window.t('btnFoldOverlayTitleFold') : (isSpanish ? 'Plegar gráfica a la izquierda' : 'Fold chart to left'));
    }
  }

  // Exportar al ámbito global
  window.AerodynamicSweep = {
    get isOpen() { return isOpen; },
    get hasExecutedSweepAnimation() { return hasExecutedSweepAnimation; },
    set hasExecutedSweepAnimation(val) { hasExecutedSweepAnimation = Boolean(val); },
    get isRealtimeActive() { return isRealtimeActive; },
    getLastSweptElement: () => lastSweptElement,
    toggleRealtime,
    triggerRealtimeUpdate,
    sampleLocalInflow,
    initSweepInputs,
    toggleSweepView,
    openSweepView,
    closeSweepView,
    openSweepModal,
    closeSweepModal,
    computeAerodynamicPolar,
    renderPolarChart,
    startInteractiveSweep,
    updateSweepPreview,
    switchSweepTab,
    exportPolarOnlyCSV,
    exportPolarExcel,
    handleSweepCsvDownloadClick,
    downloadPolarFromReportModal,
    downloadPolarExcelFromReportModal,
    hasSweepCompleted,
    flashSweepRequiredTooltip,
    toggleFoldOverlay,
    onLanguageChanged
  };
})();
