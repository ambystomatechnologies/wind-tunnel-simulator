/**
 * Simulador de Mecánica de Fluidos y Túnel Aerodinámico 2D - Ambystoma Technologies
 * physics.js - Motor Físico Navier-Stokes Incompresible, Vorticidad, Presión y Fuerzas Hidrodinámicas
 */

class FluidField {
  constructor(nx = 160, ny = 90, domainWidth = 16.0) {
    this.nx = nx;
    this.ny = ny;
    this.domainWidth = domainWidth;
    this.domainHeight = (domainWidth * ny) / nx;
    this.dx = this.domainWidth / this.nx;
    this.dy = this.domainHeight / this.ny;

    this.size = nx * ny;

    // Campos de velocidad (u: horizontal, v: vertical)
    this.u = new Float32Array(this.size);
    this.v = new Float32Array(this.size);
    this.u0 = new Float32Array(this.size);
    this.v0 = new Float32Array(this.size);

    // Campo de presión (Pa)
    this.p = new Float32Array(this.size);
    this.div = new Float32Array(this.size);

    // Campo de humo / trazador de flujo (0.0 a 1.0)
    this.smoke = new Float32Array(this.size);
    this.smoke0 = new Float32Array(this.size);

    // Campo de vorticidad: ω = ∂v/∂x - ∂u/∂y (s^-1)
    this.vorticity = new Float32Array(this.size);

    // Máscara de sólidos y contornos: 0 = fluido, 1 = obstáculo sólido
    this.solid = new Uint8Array(this.size);
    this.solidU = new Float32Array(this.size);
    this.solidV = new Float32Array(this.size);
    this.obstacleIndex = new Int16Array(this.size);

    // Propiedades del Fluido y del Túnel
    this.inflowSpeed = 5.0; // m/s
    this.inflowAngle = 0.0; // Radianes
    this.viscosity = 0.00015; // m²/s
    this.density = 1.225; // kg/m³
    this.closedWalls = false;
    this.isFlowActive = true; // Control de flujo / animación activa
    this.simTime = 0.0; // Tiempo físico acumulado (s)
    this.flowRegime = 'laminar'; // 'laminar' o 'turbulent'
    this.turbulenceIntensity = 0.0; // Intensidad de turbulencia (0.0 a 0.30)
    this.activeObstacles = [];
    this.lastObstacleAABB = null;

    // Perfil dinámico de entrada (inflow) preservado en condiciones de frontera
    this.inletU = new Float32Array(this.ny);
    this.inletV = new Float32Array(this.ny);

    // Generador estocástico de ráfagas angulares turbulentas (Túnel atmosférico turbulento)
    this.turbGustAngle = 0.0;     // Ángulo instantáneo de ráfaga (radianes)
    this.targetGustAngle = 0.0;   // Ángulo objetivo aleatorio (radianes)
    this.gustTimer = 0.0;         // Temporizador de nueva ráfaga (s)
    this.gustInterval = 0.25;     // Intervalo dinámico de cambio de ángulo

    // Ajustes del solver
    this.pressureIterations = 24;

    // Configuración de humo
    this.smokeSpacing = 4;
    this.smokeRegime = 'smoke_lines'; // 'smoke_lines', 'uniform_smoke'

    // Flota de partículas trazadoras
    this.particles = [];
    this.maxParticles = 2200;
    this.initParticles();

    this.resetFlow();
  }

  resetFlow() {
    this.isFlowActive = true;
    this.turbGustAngle = 0.0;
    this.targetGustAngle = 0.0;
    this.gustTimer = 0.0;
    const uIn = this.inflowSpeed * Math.cos(this.inflowAngle);
    const vIn = this.inflowSpeed * Math.sin(this.inflowAngle);

    for (let j = 0; j < this.ny; j++) {
      this.inletU[j] = uIn;
      this.inletV[j] = vIn;
    }

    for (let i = 0; i < this.size; i++) {
      if (this.solid[i] === 0) {
        this.u[i] = uIn;
        this.v[i] = vIn;
        this.u0[i] = uIn;
        this.v0[i] = vIn;
      } else {
        this.u[i] = 0.0;
        this.v[i] = 0.0;
        this.u0[i] = 0.0;
        this.v0[i] = 0.0;
      }
      this.p[i] = 0.0;
      this.div[i] = 0.0;
      this.smoke[i] = 0.0;
      this.smoke0[i] = 0.0;
      this.vorticity[i] = 0.0;
    }

    this.initParticles();
  }

  initParticles(fromInlet = false) {
    this.particles = [];
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        x: fromInlet ? (Math.random() * 0.8 + 0.05) : (Math.random() * this.domainWidth),
        y: Math.random() * (this.domainHeight - 0.2) + 0.1,
        speed: this.inflowSpeed,
        stuckCounter: 0
      });
    }
  }

  setFlowActive(active) {
    this.isFlowActive = active;
    if (active) {
      // Repoblar las partículas desde la entrada hacia adelante como al inicio del programa
      this.initParticles(true);
    }
  }

  setFlowRegime(regime, intensity = null) {
    this.flowRegime = (regime === 'turbulent') ? 'turbulent' : 'laminar';
    if (intensity !== null) {
      this.turbulenceIntensity = Math.max(0.0, Math.min(0.35, intensity));
    } else {
      this.turbulenceIntensity = (this.flowRegime === 'turbulent') ? 0.18 : 0.0;
    }

    if (this.flowRegime === 'turbulent') {
      this.pickNewGustTarget(true);
    } else {
      this.targetGustAngle = 0.0;
    }
  }

  pickNewGustTarget(immediate = false) {
    if (this.flowRegime !== 'turbulent' && this.turbulenceIntensity <= 0.005) {
      this.targetGustAngle = 0.0;
      return;
    }
    // Rango angular estocástico: con intensidad nominal (~18%) abarca hasta ±32°, escalando hasta ±45°
    const intensityFactor = Math.max(0.2, this.turbulenceIntensity / 0.15);
    const maxDeg = Math.min(45.0, 26.0 * intensityFactor);
    const maxRad = (maxDeg * Math.PI) / 180.0;

    // Selección de ángulo aleatorio con componente caótica
    const sign = (Math.random() < 0.5) ? -1.0 : 1.0;
    const mag = (0.20 + 0.80 * Math.random()) * maxRad;
    this.targetGustAngle = sign * mag;

    // Cambios frecuentes y continuos de ángulo (cada 0.15s - 0.35s)
    this.gustInterval = 0.15 + Math.random() * 0.20;
    this.gustTimer = this.gustInterval;

    if (immediate) {
      this.turbGustAngle = this.targetGustAngle * 0.75;
    }
  }

  updateTurbulentAngle(dt) {
    const isTurb = (this.flowRegime === 'turbulent' || this.turbulenceIntensity > 0.005);
    if (!isTurb) {
      // Retorno progresivo al ángulo base laminar puro
      this.targetGustAngle = 0.0;
      this.turbGustAngle += (0.0 - this.turbGustAngle) * Math.min(1.0, 12.0 * dt);
      if (Math.abs(this.turbGustAngle) < 1e-4) this.turbGustAngle = 0.0;
      return;
    }

    // Decrementar temporizador de ráfaga
    this.gustTimer -= dt;
    if (this.gustTimer <= 0) {
      this.pickNewGustTarget(false);
    }

    // Transición continua y realista hacia el nuevo ángulo objetivo
    const slewSpeed = 9.0 + 7.0 * (this.turbulenceIntensity / 0.15);
    this.turbGustAngle += (this.targetGustAngle - this.turbGustAngle) * Math.min(1.0, slewSpeed * dt);
  }

  idx(i, j) {
    return j * this.nx + i;
  }

  // --- PASO TEMPORAL DE NAVIER-STOKES (Jos Stam + Confinamiento de Vorticidad Fedkiw) ---
  step(dt) {
    if (dt <= 0 || dt > 0.05) dt = 0.02;
    this.simTime += dt;

    this.applyInflow(dt);
    this.advectVelocity(dt);

    // Confinamiento de Vorticidad para contrarrestar la viscosidad numérica de la interpolación
    this.computeVorticity();
    this.applyVorticityConfinement(dt);

    if (this.viscosity > 1e-5) {
      this.diffuseVelocity(dt);
    }
    this.projectPressure();
    this.advectSmoke(dt);
    this.diffuseSmoke(dt);
    this.computeVorticity();
    this.updateParticles(dt);
  }

  // Desprendimiento físico de capa límite por frecuencia de Strouhal (St ≈ 0.22)
  applyWakeInstability() {
    if (!this.activeObstacles || this.activeObstacles.length === 0 || !this.isFlowActive) return;

    const nx = this.nx;
    const ny = this.ny;
    const dx = this.dx;
    const dy = this.dy;
    const U = Math.max(0.5, this.inflowSpeed);
    const St = 0.22; // Número de Strouhal universal para cuerpos romos
    const isTurb = (this.flowRegime === 'turbulent' || this.turbulenceIntensity > 0.005);

    // En fluidos muy viscosos (como miel o glicerina con Re < 47), la física no produce desprendimiento oscilante
    const refVisc = Math.max(1e-7, this.viscosity);
    const estRe = (U * 1.0) / refVisc;
    if (estRe < 47) return; // Límite crítico de desprendimiento de vórtices de Von Kármán

    for (let obs of this.activeObstacles) {
      if (!obs.isActive) continue;
      const aabb = obs.getAABB();
      const D = Math.max(0.4, aabb[3] - aabb[1]);
      const fShed = (St * U) / D;
      const omega = 2.0 * Math.PI * fShed;

      // Amplitud de cizalladura en desprendimiento
      const amp = isTurb ? (0.35 * U) : (0.22 * U);
      const vOsc = amp * Math.sin(omega * this.simTime);

      const rearI = Math.min(nx - 2, Math.round(aabb[2] / dx) + 1);
      const minJ = Math.max(1, Math.floor(aabb[1] / dy));
      const maxJ = Math.min(ny - 2, Math.ceil(aabb[3] / dy));
      const midY = (aabb[1] + aabb[3]) * 0.5;

      for (let j = minJ; j <= maxJ; j++) {
        const id = j * nx + rearI;
        if (this.solid[id] === 0) {
          const yDist = Math.abs((j * dy) - midY) / (D * 0.5);
          const weight = Math.max(0, 1.0 - yDist);
          this.v[id] += vOsc * weight;
        }
      }
    }
  }

  applyInflow(dt = 0.02) {
    const nx = this.nx;
    const ny = this.ny;
    const isTurb = (this.flowRegime === 'turbulent' || this.turbulenceIntensity > 0.005);
    const I = this.turbulenceIntensity;
    const t = this.simTime || 0;
    const U = this.inflowSpeed;

    // Actualizar dinámicamente las ráfagas caóticas en ángulos aleatorios
    this.updateTurbulentAngle(dt);

    // Ángulo instantáneo de entrada: ángulo base manual + ráfaga aleatoria
    const liveAngle = this.inflowAngle + this.turbGustAngle;

    for (let j = 0; j < ny; j++) {
      const id = j * nx;
      if (this.solid[id] === 0) {
        let uVal = 0.0;
        let vVal = 0.0;

        if (this.isFlowActive) {
          if (isTurb) {
            const y = (j / ny) * this.domainHeight;

            // Variación angular vertical (cizalladura angular turbulenta que genera vórtices continuos):
            const angleShear = (
              Math.sin(3.5 * y - 7.0 * t) * 0.28 +
              Math.cos(7.5 * y + 11.5 * t + 1.2) * 0.18 +
              Math.sin(15.0 * y - 22.0 * t + 2.6) * 0.10
            ) * (I / 0.12);

            const cellAngle = liveAngle + angleShear;

            // Rachas de velocidad (fluctuaciones turbulentas de magnitud)
            const speedFluct = 1.0 + (
              Math.sin(4.0 * t + y * 4.5) * 0.25 +
              Math.cos(9.5 * t - y * 8.0) * 0.15
            ) * (I / 0.12);

            const cellSpeed = Math.max(0.2, U * speedFluct);

            // Vector de velocidad dirigido por el ángulo aleatorio instantáneo
            uVal = cellSpeed * Math.cos(cellAngle);
            vVal = cellSpeed * Math.sin(cellAngle);

            // Cascada de energía de Kolmogorov para perturbaciones transversales
            const m1 = Math.sin(2.2 * y - 4.5 * t) * 0.35;
            const m2 = Math.sin(5.1 * y - 10.2 * t + 1.2) * 0.22;
            const m3 = Math.sin(11.0 * y - 19.5 * t + 2.5) * 0.12;

            const n1 = Math.cos(2.5 * y - 4.2 * t + 0.8) * 0.35;
            const n2 = Math.cos(5.8 * y - 9.8 * t + 2.1) * 0.22;
            const n3 = Math.cos(11.8 * y - 18.2 * t + 3.4) * 0.12;

            uVal += (m1 + m2 + m3) * I * U;
            vVal += (n1 + n2 + n3) * I * U;
          } else {
            // Régimen laminar puro: flujo estrictamente paralelo al ángulo base
            uVal = U * Math.cos(liveAngle);
            vVal = U * Math.sin(liveAngle);

            // Micro-perturbación infinitesimal (0.15%) para disparar Von Kármán
            vVal += 0.0015 * U * Math.sin(3.5 * t) * Math.sin(j * 0.4);
          }
        }

        // Almacenar en el perfil de contorno para que las condiciones de frontera lo respeten
        this.inletU[j] = uVal;
        this.inletV[j] = vVal;

        this.u[id] = uVal;
        this.v[id] = vVal;

        // Inyección constante de humo en líneas de corriente si el flujo está activo
        if (this.isFlowActive) {
          if (this.smokeRegime === 'smoke_lines') {
            let mod;
            if (isTurb) {
              const shift = Math.round(Math.sin(t * 3.5 + j * 0.25) * 1.5);
              mod = ((j + shift) % this.smokeSpacing + this.smokeSpacing) % this.smokeSpacing;
            } else {
              mod = (j % this.smokeSpacing);
            }
            this.smoke[id] = (mod <= 1) ? 1.0 : 0.0;
          } else {
            this.smoke[id] = 0.8;
          }
        } else {
          this.smoke[id] = 0.0;
        }
      }
    }
  }

  advectVelocity(dt) {
    const nx = this.nx;
    const ny = this.ny;
    const dx = this.dx;
    const dy = this.dy;

    this.u0.set(this.u);
    this.v0.set(this.v);

    for (let j = 1; j < ny - 1; j++) {
      const row = j * nx;
      for (let i = 1; i < nx - 1; i++) {
        const id = row + i;
        if (this.solid[id] !== 0) {
          this.u[id] = this.solidU[id];
          this.v[id] = this.solidV[id];
          continue;
        }

        const uCurr = this.u0[id];
        const vCurr = this.v0[id];

        // Posición anterior mediante RK2
        const xMid = i - 0.5 * (uCurr * dt / dx);
        const yMid = j - 0.5 * (vCurr * dt / dy);

        const uMid = this.sampleBilinear(this.u0, xMid, yMid);
        const vMid = this.sampleBilinear(this.v0, xMid, yMid);

        const xBack = i - (uMid * dt / dx);
        const yBack = j - (vMid * dt / dy);

        this.u[id] = this.sampleBilinear(this.u0, xBack, yBack);
        this.v[id] = this.sampleBilinear(this.v0, xBack, yBack);
      }
    }

    this.enforceBoundaryConditions(this.u, this.v);
  }

  diffuseVelocity(dt) {
    const nx = this.nx;
    const ny = this.ny;
    const alpha = (this.viscosity * dt) / (this.dx * this.dy);
    if (alpha <= 1e-6) return;

    const beta = 1.0 / (1.0 + 4.0 * alpha);
    this.u0.set(this.u);
    this.v0.set(this.v);

    // Más iteraciones para fluidos hiperviscosos aseguran una difusión suave y estable
    const itCount = this.viscosity > 0.001 ? 12 : 4;
    for (let it = 0; it < itCount; it++) {
      for (let j = 1; j < ny - 1; j++) {
        const row = j * nx;
        for (let i = 1; i < nx - 1; i++) {
          const id = row + i;
          if (this.solid[id] !== 0) continue;

          this.u[id] = (this.u0[id] + alpha * (this.u[id - 1] + this.u[id + 1] + this.u[id - nx] + this.u[id + nx])) * beta;
          this.v[id] = (this.v0[id] + alpha * (this.v[id - 1] + this.v[id + 1] + this.v[id - nx] + this.v[id + nx])) * beta;
        }
      }
    }
    this.enforceBoundaryConditions(this.u, this.v);
  }

  projectPressure() {
    const nx = this.nx;
    const ny = this.ny;
    const div = this.div;
    const p = this.p;

    // 1. Calcular divergencia
    for (let j = 1; j < ny - 1; j++) {
      const row = j * nx;
      for (let i = 1; i < nx - 1; i++) {
        const id = row + i;
        if (this.solid[id] !== 0) {
          div[id] = 0.0;
          continue;
        }

        const uR = (this.solid[id + 1] === 0) ? this.u[id + 1] : this.solidU[id + 1];
        const uL = (this.solid[id - 1] === 0) ? this.u[id - 1] : this.solidU[id - 1];
        const vT = (this.solid[id + nx] === 0) ? this.v[id + nx] : this.solidV[id + nx];
        const vB = (this.solid[id - nx] === 0) ? this.v[id - nx] : this.solidV[id - nx];

        div[id] = -0.5 * (uR - uL + vT - vB);
        p[id] = 0.0;
      }
    }

    // 2. Resolver Poisson de Presión por Gauss-Seidel
    for (let iter = 0; iter < this.pressureIterations; iter++) {
      for (let j = 1; j < ny - 1; j++) {
        const row = j * nx;
        for (let i = 1; i < nx - 1; i++) {
          const id = row + i;
          if (this.solid[id] !== 0) continue;

          const pL = (this.solid[id - 1] === 0) ? p[id - 1] : p[id];
          const pR = (this.solid[id + 1] === 0) ? p[id + 1] : p[id];
          const pB = (this.solid[id - nx] === 0) ? p[id - nx] : p[id];
          const pT = (this.solid[id + nx] === 0) ? p[id + nx] : p[id];

          p[id] = 0.25 * (pL + pR + pB + pT + div[id]);
        }
      }
    }

    // 3. Restar gradiente de presión a la velocidad para hacerla incompresible
    for (let j = 1; j < ny - 1; j++) {
      const row = j * nx;
      for (let i = 1; i < nx - 1; i++) {
        const id = row + i;
        if (this.solid[id] !== 0) {
          this.u[id] = this.solidU[id];
          this.v[id] = this.solidV[id];
          continue;
        }

        const pL = (this.solid[id - 1] === 0) ? p[id - 1] : p[id];
        const pR = (this.solid[id + 1] === 0) ? p[id + 1] : p[id];
        const pB = (this.solid[id - nx] === 0) ? p[id - nx] : p[id];
        const pT = (this.solid[id + nx] === 0) ? p[id + nx] : p[id];

        this.u[id] -= 0.5 * (pR - pL);
        this.v[id] -= 0.5 * (pT - pB);
      }
    }

    this.enforceBoundaryConditions(this.u, this.v);
  }

  advectSmoke(dt) {
    const nx = this.nx;
    const ny = this.ny;
    const dx = this.dx;
    const dy = this.dy;

    this.smoke0.set(this.smoke);

    for (let j = 1; j < ny - 1; j++) {
      const row = j * nx;
      for (let i = 1; i < nx - 1; i++) {
        const id = row + i;
        if (this.solid[id] !== 0) {
          this.smoke[id] = 0.0;
          continue;
        }

        const uCurr = this.u[id];
        const vCurr = this.v[id];

        const xBack = i - (uCurr * dt / dx);
        const yBack = j - (vCurr * dt / dy);

        // Desvanecimiento suave y natural del humo (más rápido cuando se detiene el flujo)
        const decay = this.isFlowActive ? 0.999 : 0.992;
        this.smoke[id] = this.sampleBilinear(this.smoke0, xBack, yBack) * decay;
      }
    }
  }

  computeVorticity() {
    const nx = this.nx;
    const ny = this.ny;
    const inv2dx = 0.5 / this.dx;
    const inv2dy = 0.5 / this.dy;

    for (let j = 1; j < ny - 1; j++) {
      const row = j * nx;
      for (let i = 1; i < nx - 1; i++) {
        const id = row + i;
        if (this.solid[id] !== 0) {
          this.vorticity[id] = 0.0;
          continue;
        }

        const dvdx = (this.v[id + 1] - this.v[id - 1]) * inv2dx;
        const dudy = (this.u[id + nx] - this.u[id - nx]) * inv2dy;
        this.vorticity[id] = dvdx - dudy;
      }
    }
  }

  // --- CONFINAMIENTO DE VORTICIDAD (Fedkiw, Stam, Jensen 2001 - SIGGRAPH) ---
  // Restituye físicamente el momento angular y la cizalladura disipados por la interpolación de la malla
  applyVorticityConfinement(dt) {
    const nx = this.nx;
    const ny = this.ny;
    const dx = this.dx;
    const dy = this.dy;
    const vort = this.vorticity;
    const inv2dx = 0.5 / dx;
    const inv2dy = 0.5 / dy;

    // Dependencia física del régimen y viscosidad:
    const isTurb = (this.flowRegime === 'turbulent' || this.turbulenceIntensity > 0.005);
    const viscRatio = 0.00015 / Math.max(1e-6, this.viscosity);
    if (viscRatio < 0.15) return; // En fluidos hiperviscosos como miel, la cizalladura disipa naturalmente los vórtices
    const baseEps = isTurb ? 3.6 : 2.4;
    const eps = baseEps * Math.min(1.5, Math.max(0.2, Math.sqrt(viscRatio)));

    for (let j = 2; j < ny - 2; j++) {
      const row = j * nx;
      for (let i = 2; i < nx - 2; i++) {
        const id = row + i;
        if (this.solid[id] !== 0) continue;

        // Gradiente de la magnitud de la vorticidad: η = ∇|ω|
        const dw_dx = (Math.abs(vort[id + 1]) - Math.abs(vort[id - 1])) * inv2dx;
        const dw_dy = (Math.abs(vort[id + nx]) - Math.abs(vort[id - nx])) * inv2dy;

        const len = Math.hypot(dw_dx, dw_dy);
        if (len < 1e-4) continue;

        const Nx = dw_dx / len;
        const Ny = dw_dy / len;
        const w = vort[id];

        // f_conf = ε * dx * (N × ω) -> en 2D: fx = Ny * ω, fy = -Nx * ω
        const fx = Ny * w * eps * dx;
        const fy = -Nx * w * eps * dy;

        this.u[id] += fx * dt;
        this.v[id] += fy * dt;
      }
    }
    this.enforceBoundaryConditions(this.u, this.v);
  }

  // --- DIFUSIÓN FÍSICA Y ARRASTRE DE SCHMIDT PARA HUMO ---
  // En flujo turbulento, la difusividad turbulenta de Schmidt aumenta la dispersión del humo
  diffuseSmoke(dt) {
    const nx = this.nx;
    const ny = this.ny;
    const isTurb = (this.flowRegime === 'turbulent' || this.turbulenceIntensity > 0.005);
    const diff = isTurb ? (0.00025 + 0.0008 * this.turbulenceIntensity) : 0.00008;
    const alpha = (diff * dt) / (this.dx * this.dy);
    if (alpha <= 1e-6) return;
    const beta = 1.0 / (1.0 + 4.0 * alpha);

    this.smoke0.set(this.smoke);

    for (let j = 1; j < ny - 1; j++) {
      const row = j * nx;
      for (let i = 1; i < nx - 1; i++) {
        const id = row + i;
        if (this.solid[id] !== 0) continue;

        this.smoke[id] = (this.smoke0[id] + alpha * (this.smoke[id - 1] + this.smoke[id + 1] + this.smoke[id - nx] + this.smoke[id + nx])) * beta;
      }
    }
  }

  enforceBoundaryConditions(uField, vField) {
    const nx = this.nx;
    const ny = this.ny;

    // Entrada (x = 0): Preservar el perfil dinámico de entrada calculado en applyInflow
    for (let j = 0; j < ny; j++) {
      const id = j * nx;
      uField[id] = this.inletU[j];
      vField[id] = this.inletV[j];
    }

    // Salida (x = nx - 1): Outflow libre
    for (let j = 0; j < ny; j++) {
      const id = j * nx + (nx - 1);
      const prev = id - 1;
      uField[id] = uField[prev];
      vField[id] = vField[prev];
    }

    // Paredes superior e inferior
    for (let i = 0; i < nx; i++) {
      const idBot = i;
      const idTop = (ny - 1) * nx + i;

      if (this.closedWalls) {
        // Paredes de túnel sólidas
        uField[idBot] = 0.0;
        vField[idBot] = 0.0;
        uField[idTop] = 0.0;
        vField[idTop] = 0.0;
      } else {
        // Flujo libre
        uField[idBot] = uField[nx + i];
        vField[idBot] = 0.0;
        uField[idTop] = uField[(ny - 2) * nx + i];
        vField[idTop] = 0.0;
      }
    }
  }

  sampleBilinear(field, x, y) {
    const nx = this.nx;
    const ny = this.ny;

    if (x < 0.5) x = 0.5;
    if (x > nx - 1.5) x = nx - 1.5;
    if (y < 0.5) y = 0.5;
    if (y > ny - 1.5) y = ny - 1.5;

    const i0 = Math.floor(x);
    const j0 = Math.floor(y);
    const i1 = i0 + 1;
    const j1 = j0 + 1;

    const s1 = x - i0;
    const s0 = 1.0 - s1;
    const t1 = y - j0;
    const t0 = 1.0 - t1;

    const row0 = j0 * nx;
    const row1 = j1 * nx;

    return s0 * (t0 * field[row0 + i0] + t1 * field[row1 + i0]) +
           s1 * (t0 * field[row0 + i1] + t1 * field[row1 + i1]);
  }

  // --- TRAZADORES DE PARTÍCULAS ---
  updateParticles(dt) {
    const nx = this.nx;
    const ny = this.ny;
    const dx = this.dx;
    const dy = this.dy;
    const domainW = this.domainWidth;
    const domainH = this.domainHeight;

    for (let p of this.particles) {
      // Las partículas viajan el trayecto completo de extremo a extremo del túnel:
      // Solo renacen cuando llegan al final del túnel a la derecha (o salen por los bordes)
      const hasExited = (p.x >= domainW - 0.05 || p.x < 0.02 || p.y <= 0.04 || p.y >= domainH - 0.04 || p.stuckCounter > 400);

      if (hasExited) {
        if (!this.isFlowActive) {
          p.x = -999;
          continue;
        }

        // Renacen únicamente al inicio en la tobera de entrada para recorrer la pantalla completa
        p.x = 0.04 + Math.random() * 0.25;
        p.y = Math.random() * (domainH - 0.2) + 0.1;
        p.stuckCounter = 0;

        const gx = p.x / dx;
        const gy = p.y / dy;
        const uPart = this.sampleBilinear(this.u, gx, gy);
        const vPart = this.sampleBilinear(this.v, gx, gy);
        p.speed = Math.hypot(uPart, vPart);
        continue;
      }

      const gx = p.x / dx;
      const gy = p.y / dy;

      const uPart = this.sampleBilinear(this.u, gx, gy);
      const vPart = this.sampleBilinear(this.v, gx, gy);
      p.speed = Math.hypot(uPart, vPart);

      // Si queda atrapada en un punto de estancamiento sólido, incrementar contador de atasco
      if (p.speed < 0.04) {
        p.stuckCounter = (p.stuckCounter || 0) + 1;
      } else {
        p.stuckCounter = 0;
      }

      const nextX = p.x + uPart * dt;
      const nextY = p.y + vPart * dt;

      const gNextX = Math.round(nextX / dx);
      const gNextY = Math.round(nextY / dy);

      if (gNextX >= 0 && gNextX < nx && gNextY >= 0 && gNextY < ny) {
        const id = gNextY * nx + gNextX;
        if (this.solid[id] !== 0) {
          // Desviar suavemente alrededor del obstáculo sólido
          p.x += 0.05;
          p.y += (p.y > domainH / 2.0 ? 0.07 : -0.07);
          p.stuckCounter = (p.stuckCounter || 0) + 3;
          continue;
        }
      }

      p.x = nextX;
      p.y = nextY;
    }
  }

  // --- RASTERIZACIÓN DE OBSTÁCULOS ---
  rasterizeObstacles(obstacles) {
    const nx = this.nx;
    const ny = this.ny;
    const dx = this.dx;
    const dy = this.dy;

    this.solid.fill(0);
    this.solidU.fill(0);
    this.solidV.fill(0);
    this.obstacleIndex.fill(-1);

    this.activeObstacles = obstacles || [];
    const solidObstacles = (obstacles || []).filter(o => o && o.isActive && !o.isProbe && o.isSolid !== false);
    this.lastObstacleAABB = (solidObstacles.length > 0) ? solidObstacles[0].getAABB() : null;

    if (!obstacles || obstacles.length === 0) return;

    for (let obsIdx = 0; obsIdx < obstacles.length; obsIdx++) {
      const obs = obstacles[obsIdx];
      if (!obs.isActive || obs.isProbe || obs.isSolid === false) continue;

      const aabb = obs.getAABB();
      const minI = Math.max(1, Math.floor(aabb[0] / dx));
      const maxI = Math.min(nx - 2, Math.ceil(aabb[2] / dx));
      const minJ = Math.max(1, Math.floor(aabb[1] / dy));
      const maxJ = Math.min(ny - 2, Math.ceil(aabb[3] / dy));

      const centroid = obs.getCentroid();
      const omega = obs.angularVelocity || 0.0;
      const vx = obs.vx || 0.0;
      const vy = obs.vy || 0.0;

      for (let j = minJ; j <= maxJ; j++) {
        const wy = (j + 0.5) * dy;
        const row = j * nx;
        for (let i = minI; i <= maxI; i++) {
          const wx = (i + 0.5) * dx;

          if (obs.containsPoint(wx, wy)) {
            const id = row + i;
            this.solid[id] = 1;
            this.obstacleIndex[id] = obsIdx;

            const rx = wx - centroid[0];
            const ry = wy - centroid[1];
            this.solidU[id] = vx - omega * ry;
            this.solidV[id] = vy + omega * rx;

            this.u[id] = this.solidU[id];
            this.v[id] = this.solidV[id];
          }
        }
      }
    }
  }

  // --- CÁLCULO DE FUERZAS HIDRODINÁMICAS (DRAG & LIFT) ---
  calculateHydrodynamicForces(obstacle, obsIdx) {
    if (!obstacle || !obstacle.isActive || obstacle.isProbe || obstacle.isSolid === false) {
      return {
        dragForce: 0,
        liftForce: 0,
        cd: 0,
        cl: 0,
        efficiency: 0,
        reynolds: 0,
        pMax: 0,
        pMin: 0
      };
    }

    const nx = this.nx;
    const dx = this.dx;
    const dy = this.dy;

    let fPressureX = 0.0;
    let fPressureY = 0.0;
    let fFrictionX = 0.0;
    let fFrictionY = 0.0;

    let pMax = -Infinity;
    let pMin = Infinity;

    const mu = this.density * this.viscosity;

    const aabb = obstacle.getAABB();
    const minI = Math.max(1, Math.floor(aabb[0] / dx) - 2);
    const maxI = Math.min(nx - 2, Math.ceil(aabb[2] / dx) + 2);
    const minJ = Math.max(1, Math.floor(aabb[1] / dy) - 2);
    const maxJ = Math.min(this.ny - 2, Math.ceil(aabb[3] / dy) + 2);

    for (let j = minJ; j <= maxJ; j++) {
      const row = j * nx;
      for (let i = minI; i <= maxI; i++) {
        const id = row + i;
        if (this.solid[id] === 1 && this.obstacleIndex[id] === obsIdx) {
          if (this.solid[id + 1] === 0) {
            const pVal = this.p[id + 1];
            fPressureX -= pVal * dy;
            if (pVal > pMax) pMax = pVal;
            if (pVal < pMin) pMin = pVal;
            fFrictionY += mu * (this.v[id + 1] - this.solidV[id]);
          }
          if (this.solid[id - 1] === 0) {
            const pVal = this.p[id - 1];
            fPressureX += pVal * dy;
            if (pVal > pMax) pMax = pVal;
            if (pVal < pMin) pMin = pVal;
            fFrictionY -= mu * (this.v[id - 1] - this.solidV[id]);
          }
          if (this.solid[id + nx] === 0) {
            const pVal = this.p[id + nx];
            fPressureY -= pVal * dx;
            if (pVal > pMax) pMax = pVal;
            if (pVal < pMin) pMin = pVal;
            fFrictionX += mu * (this.u[id + nx] - this.solidU[id]);
          }
          if (this.solid[id - nx] === 0) {
            const pVal = this.p[id - nx];
            fPressureY += pVal * dx;
            if (pVal > pMax) pMax = pVal;
            if (pVal < pMin) pMin = pVal;
            fFrictionX -= mu * (this.u[id - nx] - this.solidU[id]);
          }
        }
      }
    }

    const totalFx = fPressureX + fFrictionX;
    const totalFy = fPressureY + fFrictionY;

    const flowAngle = this.inflowAngle;
    const cosA = Math.cos(flowAngle);
    const sinA = Math.sin(flowAngle);

    const dragForce = totalFx * cosA + totalFy * sinA;
    const liftForce = -totalFx * sinA + totalFy * cosA;

    const refLength = obstacle.getReferenceLength ? obstacle.getReferenceLength() : Math.max(aabb[2] - aabb[0], aabb[3] - aabb[1]);
    const refArea = Math.max(refLength, 0.2);

    const qInf = 0.5 * this.density * Math.max(this.inflowSpeed * this.inflowSpeed, 0.01);
    const cd = dragForce / (qInf * refArea);
    const cl = liftForce / (qInf * refArea);

    const efficiency = Math.abs(cd) > 1e-4 ? (liftForce / Math.abs(dragForce)) : 0;
    const reynolds = (this.inflowSpeed * refLength) / Math.max(this.viscosity, 1e-7);

    return {
      dragForce: dragForce,
      liftForce: liftForce,
      totalFx: totalFx,
      totalFy: totalFy,
      cd: parseFloat(cd.toFixed(3)),
      cl: parseFloat(cl.toFixed(3)),
      efficiency: parseFloat(efficiency.toFixed(2)),
      reynolds: Math.round(reynolds),
      pMax: pMax === -Infinity ? 0 : parseFloat((pMax * 10).toFixed(1)),
      pMin: pMin === Infinity ? 0 : parseFloat((pMin * 10).toFixed(1))
    };
  }
}

window.FluidField = FluidField;
