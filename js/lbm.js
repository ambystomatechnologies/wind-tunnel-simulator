/**
 * Simulador de Mecánica de Fluidos y Túnel Aerodinámico 2D - Ambystoma Technologies
 * lbm.js - Motor Físico y Modos de Visor Lattice-Boltzmann D2Q9 (Modelo de Dan Schroeder)
 * 
 * =========================================================================================
 * 📚 BIBLIOGRAFÍA Y CRÉDITOS CIENTÍFICOS:
 * =========================================================================================
 * Los algoritmos mesoscópicos y las técnicas de visualización de este motor (Vorticidad/Curl,
 * Flowlines y Rapidez) se basan en el trabajo y publicaciones de:
 * 
 * 1. Daniel V. Schroeder (Dan Schroeder) - Department of Physics, Weber State University
 *    - "Fluid Dynamics Simulation in JavaScript / HTML5 Canvas"
 *    - URL Oficial: https://physics.weber.edu/schroeder/fluids/
 *    - Formulación D2Q9, mapeo de vorticidad por diferencias centrales, paleta cromática Jet,
 *      contraste dinámico y cálculo de estelas de líneas de flujo (flowlines).
 * 
 * 2. Graham Pullan - Cambridge University, Many-Core Group
 *    - Condiciones de frontera de entrada/salida para simulación en túnel de viento
 *    - Referencia: http://www.many-core.group.cam.ac.uk/projects/LBdemo.shtml
 * 
 * 3. Thomas Pohl
 *    - Applet interactivo de Lattice Boltzmann (LBA)
 *    - Referencia: http://thomas-pohl.info/work/lba.html
 * 
 * 4. Lukas Wagner - North Dakota State University (NDSU)
 *    - Códigos y algoritmos base de Lattice-Boltzmann
 *    - Referencia: http://www.ndsu.edu/physics/people/faculty/wagner/lattice_boltzmann_codes/
 * 
 * 5. Norbert Gonsalves & Sauro Succi
 *    - Adaptación computacional de la ecuación de Lattice Boltzmann
 *    - Succi, S. (2001). "The Lattice Boltzmann Equation for Fluid Dynamics and Beyond". Oxford University Press.
 *    - Referencia: http://global.oup.com/academic/product/the-lattice-boltzmann-equation-9780199679249
 * =========================================================================================
 * 
 * Implementa dinámica mesoscópica de partículas en red bidimensional con 9 vectores discretos (D2Q9),
 * colisión con relajación BGK exacta, propagación (streaming) sin difusión numérica y rebote
 * no-slip en obstáculos ("bounce-back"), reproduciendo fielmente el desprendimiento de vórtices de
 * Von Kármán, estelas turbulentas tras placas/cuñas y conservación estricta de momento.
 */

class LatticeBoltzmannEngine {
  constructor(nx = 288, ny = 162) {
    this.nx = nx;
    this.ny = ny;
    this.size = nx * ny;

    // Factores de ponderación D2Q9
    this.four9ths = 4.0 / 9.0;
    this.one9th = 1.0 / 9.0;
    this.one36th = 1.0 / 36.0;

    // Parámetros físicos en unidades naturales de retícula (lattice units)
    this.speed = 0.090;            // Velocidad de entrada u0
    this.inflowAngle = 0.0;        // Ángulo de entrada (radianes)
    this.viscosity = 0.022;        // Viscosidad cinemática ν (0.005 - 0.08)
    this.contrast = 1.0;           // Factor de contraste perceptual para vorticidad
    this.stepsPerFrame = 11;       // Pasos de colisión/streaming por fotograma a 60 FPS
    this.closedWalls = false;      // Paredes superior e inferior sólidas o abiertas

    // Arreglos de densidades de partículas discretas D2Q9 (Typed Arrays de alto rendimiento)
    this.n0 = new Float32Array(this.size);
    this.nN = new Float32Array(this.size);
    this.nS = new Float32Array(this.size);
    this.nE = new Float32Array(this.size);
    this.nW = new Float32Array(this.size);
    this.nNE = new Float32Array(this.size);
    this.nSE = new Float32Array(this.size);
    this.nNW = new Float32Array(this.size);
    this.nSW = new Float32Array(this.size);

    // Campos macroscópicos
    this.rho = new Float32Array(this.size);
    this.ux = new Float32Array(this.size);
    this.uy = new Float32Array(this.size);
    this.curl = new Float32Array(this.size);

    // Máscara de barreras/obstáculos (1 = sólido, 0 = fluido)
    this.barrier = new Uint8Array(this.size);

    // Medición directa de fuerzas aerodinámicas (Transferencia de momento en rebote)
    this.barrierCount = 0;
    this.barrierxSum = 0;
    this.barrierySum = 0;
    this.barrierFx = 0.0; // Fuerza de arrastre neta (Drag)
    this.barrierFy = 0.0; // Fuerza de sustentación neta (Lift)
    this.lastBarrierFy = 0.0;
    this.vortexPeriod = 0.0;
    this.timeStepCount = 0;
    this.lastPeriodStep = 0;

    // Trazadores lagrangianos (partículas de humo que viajan con el flujo LBM)
    this.nTracers = 180;
    this.tracerX = new Float32Array(this.nTracers);
    this.tracerY = new Float32Array(this.nTracers);

    // Paleta de colores Jet de 400 niveles (Replicando exactamente el simulador de Schroeder)
    this.nColors = 400;
    this.redList = new Uint8Array(this.nColors + 2);
    this.greenList = new Uint8Array(this.nColors + 2);
    this.blueList = new Uint8Array(this.nColors + 2);
    this.initColorMap();

    // Tabla de transparencias para líneas de flujo
    this.transBlackArraySize = 50;
    this.transBlackArray = new Array(this.transBlackArraySize);
    for (let i = 0; i < this.transBlackArraySize; i++) {
      this.transBlackArray[i] = `rgba(0, 0, 0, ${(i / this.transBlackArraySize).toFixed(2)})`;
    }

    // Inicializar estado base
    this.initFluid();
    this.initTracers();
  }

  /**
   * Genera el mapa de color perceptual Jet (azul -> cian -> verde -> amarillo -> rojo)
   * Donde el verde indica rotación nula (curl = 0), rojo vorticidad antihoraria y azul horaria.
   */
  initColorMap() {
    const n = this.nColors;
    for (let c = 0; c <= n; c++) {
      let r, g, b;
      if (c < n / 8) {
        r = 0;
        g = 0;
        b = Math.round(255 * (c + n / 8) / (n / 4));
      } else if (c < 3 * n / 8) {
        r = 0;
        g = Math.round(255 * (c - n / 8) / (n / 4));
        b = 255;
      } else if (c < 5 * n / 8) {
        r = Math.round(255 * (c - 3 * n / 8) / (n / 4));
        g = 255;
        b = 255 - r;
      } else if (c < 7 * n / 8) {
        r = 255;
        g = Math.round(255 * (7 * n / 8 - c) / (n / 4));
        b = 0;
      } else {
        r = Math.round(255 * (9 * n / 8 - c) / (n / 4));
        g = 0;
        b = 0;
      }
      this.redList[c] = Math.max(0, Math.min(255, r));
      this.greenList[c] = Math.max(0, Math.min(255, g));
      this.blueList[c] = Math.max(0, Math.min(255, b));
    }
    // Color de barreras sólidas: negro profundo absoluto
    this.redList[n + 1] = 0;
    this.greenList[n + 1] = 0;
    this.blueList[n + 1] = 0;
  }

  /**
   * Inicializa la retícula con flujo laminar uniforme hacia la derecha
   * con una perturbación microscópica para inducir el desprendimiento físico natural de vórtices
   */
  initFluid() {
    const u0 = this.speed * Math.cos(this.inflowAngle);
    const v0 = this.speed * Math.sin(this.inflowAngle);
    for (let y = 0; y < this.ny; y++) {
      // Micro-perturbación transversal para romper simetría aritmética perfecta
      const perturb = 0.00035 * Math.sin((y / this.ny) * 2.0 * Math.PI);
      for (let x = 0; x < this.nx; x++) {
        this.setEquilibrium(x, y, u0, v0 + perturb, 1.0);
      }
    }
    this.barrierFx = 0;
    this.barrierFy = 0;
    this.timeStepCount = 0;
  }

  /**
   * Inicializa partículas trazadoras distribuidas uniformemente en la retícula
   */
  initTracers() {
    const nRows = Math.ceil(Math.sqrt(this.nTracers));
    const dx = this.nx / nRows;
    const dy = this.ny / nRows;
    let nextX = dx * 0.5;
    let nextY = dy * 0.5;
    for (let t = 0; t < this.nTracers; t++) {
      this.tracerX[t] = nextX;
      this.tracerY[t] = nextY;
      nextX += dx;
      if (nextX > this.nx) {
        nextX = dx * 0.5;
        nextY += dy;
      }
    }
  }

  /**
   * Establece las distribuciones de equilibrio Maxwell-Boltzmann en un nodo (x, y)
   */
  setEquilibrium(x, y, newux, newuy, newrho = 1.0) {
    const i = x + y * this.nx;
    const ux3 = 3.0 * newux;
    const uy3 = 3.0 * newuy;
    const ux2 = newux * newux;
    const uy2 = newuy * newuy;
    const uxuy2 = 2.0 * newux * newuy;
    const u2 = ux2 + uy2;
    const u215 = 1.5 * u2;

    this.n0[i]  = this.four9ths * newrho * (1.0 - u215);
    this.nE[i]  = this.one9th   * newrho * (1.0 + ux3 + 4.5 * ux2 - u215);
    this.nW[i]  = this.one9th   * newrho * (1.0 - ux3 + 4.5 * ux2 - u215);
    this.nN[i]  = this.one9th   * newrho * (1.0 + uy3 + 4.5 * uy2 - u215);
    this.nS[i]  = this.one9th   * newrho * (1.0 - uy3 + 4.5 * uy2 - u215);
    this.nNE[i] = this.one36th  * newrho * (1.0 + ux3 + uy3 + 4.5 * (u2 + uxuy2) - u215);
    this.nSE[i] = this.one36th  * newrho * (1.0 + ux3 - uy3 + 4.5 * (u2 - uxuy2) - u215);
    this.nNW[i] = this.one36th  * newrho * (1.0 - ux3 + uy3 + 4.5 * (u2 - uxuy2) - u215);
    this.nSW[i] = this.one36th  * newrho * (1.0 - ux3 - uy3 + 4.5 * (u2 + uxuy2) - u215);

    this.rho[i] = newrho;
    this.ux[i] = newux;
    this.uy[i] = newuy;
  }

  /**
   * Condiciones de frontera en bordes del túnel
   */
  setBoundaries() {
    const u0 = this.speed * Math.cos(this.inflowAngle);
    const v0 = this.speed * Math.sin(this.inflowAngle);
    const nx = this.nx;
    const ny = this.ny;

    // Paredes superior e inferior
    for (let x = 0; x < nx; x++) {
      if (this.closedWalls) {
        // Paredes no-slip tratadas por rebote directo
        this.barrier[x] = 1;
        this.barrier[x + (ny - 1) * nx] = 1;
      } else {
        this.setEquilibrium(x, 0, u0, 0.0, 1.0);
        this.setEquilibrium(x, ny - 1, u0, 0.0, 1.0);
      }
    }

    // Entrada izquierda y salida derecha
    for (let y = 1; y < ny - 1; y++) {
      this.setEquilibrium(0, y, u0, v0, 1.0);
      this.setEquilibrium(nx - 1, y, u0, v0, 1.0);
    }
  }

  /**
   * Paso de Colisión BGK (Bhatnagar-Gross-Krook) ultra-optimizado para 60 FPS
   */
  collide() {
    const nx = this.nx;
    const ny = this.ny;
    const safeNu = Math.max(0.015, this.viscosity);
    const omega = 1.0 / (3.0 * safeNu + 0.5);

    const n0 = this.n0;
    const nN = this.nN;
    const nS = this.nS;
    const nE = this.nE;
    const nW = this.nW;
    const nNW = this.nNW;
    const nNE = this.nNE;
    const nSW = this.nSW;
    const nSE = this.nSE;
    const rho = this.rho;
    const ux = this.ux;
    const uy = this.uy;
    const barrier = this.barrier;

    const four9ths = this.four9ths;
    const one9th = this.one9th;
    const one36th = this.one36th;

    for (let y = 1; y < ny - 1; y++) {
      const row = y * nx;
      for (let x = 1; x < nx - 1; x++) {
        const i = x + row;
        if (barrier[i]) continue;

        let thisrho = n0[i] + nN[i] + nS[i] + nE[i] + nW[i] +
                      nNW[i] + nNE[i] + nSW[i] + nSE[i];
        if (thisrho < 0.1) thisrho = 1.0;
        rho[i] = thisrho;

        const invRho = 1.0 / thisrho;
        let thisux = (nE[i] + nNE[i] + nSE[i] - nW[i] - nNW[i] - nSW[i]) * invRho;
        let thisuy = (nN[i] + nNE[i] + nNW[i] - nS[i] - nSE[i] - nSW[i]) * invRho;

        // Limitar velocidad local para mantener estabilidad incondicional subsónica
        const spd2 = thisux * thisux + thisuy * thisuy;
        if (spd2 > 0.0256) { // 0.16^2
          const factor = 0.16 / Math.sqrt(spd2);
          thisux *= factor;
          thisuy *= factor;
        }
        ux[i] = thisux;
        uy[i] = thisuy;

        const one9thrho = one9th * thisrho;
        const one36thrho = one36th * thisrho;
        const ux3 = 3.0 * thisux;
        const uy3 = 3.0 * thisuy;
        const ux2 = thisux * thisux;
        const uy2 = thisuy * thisuy;
        const uxuy2 = 2.0 * thisux * thisuy;
        const u2 = ux2 + uy2;
        const u215 = 1.5 * u2;

        n0[i]  += omega * (four9ths * thisrho * (1.0 - u215) - n0[i]);
        nE[i]  += omega * (one9thrho  * (1.0 + ux3 + 4.5 * ux2 - u215) - nE[i]);
        nW[i]  += omega * (one9thrho  * (1.0 - ux3 + 4.5 * ux2 - u215) - nW[i]);
        nN[i]  += omega * (one9thrho  * (1.0 + uy3 + 4.5 * uy2 - u215) - nN[i]);
        nS[i]  += omega * (one9thrho  * (1.0 - uy3 + 4.5 * uy2 - u215) - nS[i]);
        nNE[i] += omega * (one36thrho * (1.0 + ux3 + uy3 + 4.5 * (u2 + uxuy2) - u215) - nNE[i]);
        nSE[i] += omega * (one36thrho * (1.0 + ux3 - uy3 + 4.5 * (u2 - uxuy2) - u215) - nSE[i]);
        nNW[i] += omega * (one36thrho * (1.0 - ux3 + uy3 + 4.5 * (u2 - uxuy2) - u215) - nNW[i]);
        nSW[i] += omega * (one36thrho * (1.0 - ux3 - uy3 + 4.5 * (u2 + uxuy2) - u215) - nSW[i]);
      }
    }

    // Salida libre en el extremo derecho (gradiente nulo)
    for (let y = 1; y < ny - 2; y++) {
      const right = (nx - 1) + y * nx;
      const rightPrev = (nx - 2) + y * nx;
      nW[right] = nW[rightPrev];
      nNW[right] = nNW[rightPrev];
      nSW[right] = nSW[rightPrev];
    }
  }

  /**
   * Paso de Propagación (Streaming) y Rebote en Barreras ultra-optimizado
   */
  stream() {
    const nx = this.nx;
    const ny = this.ny;

    const nN = this.nN;
    const nNW = this.nNW;
    const nE = this.nE;
    const nNE = this.nNE;
    const nS = this.nS;
    const nSE = this.nSE;
    const nW = this.nW;
    const nSW = this.nSW;
    const barrier = this.barrier;

    this.barrierCount = 0;
    this.barrierxSum = 0;
    this.barrierySum = 0;
    let bFx = 0.0;
    let bFy = 0.0;

    // 1. Mover hacia el Norte y Noroeste
    for (let y = ny - 2; y > 0; y--) {
      const row = y * nx;
      const rowMinus = (y - 1) * nx;
      for (let x = 1; x < nx - 1; x++) {
        nN[x + row] = nN[x + rowMinus];
        nNW[x + row] = nNW[x + 1 + rowMinus];
      }
    }

    // 2. Mover hacia el Este y Noreste
    for (let y = ny - 2; y > 0; y--) {
      const row = y * nx;
      const rowMinus = (y - 1) * nx;
      for (let x = nx - 2; x > 0; x--) {
        nE[x + row] = nE[x - 1 + row];
        nNE[x + row] = nNE[x - 1 + rowMinus];
      }
    }

    // 3. Mover hacia el Sur y Sureste
    for (let y = 1; y < ny - 1; y++) {
      const row = y * nx;
      const rowPlus = (y + 1) * nx;
      for (let x = nx - 2; x > 0; x--) {
        nS[x + row] = nS[x + rowPlus];
        nSE[x + row] = nSE[x - 1 + rowPlus];
      }
    }

    // 4. Mover hacia el Oeste y Suroeste
    for (let y = 1; y < ny - 1; y++) {
      const row = y * nx;
      const rowPlus = (y + 1) * nx;
      for (let x = 1; x < nx - 1; x++) {
        nW[x + row] = nW[x + 1 + row];
        nSW[x + row] = nSW[x + 1 + rowPlus];
      }
    }

    // 5. Rebote Físico en Barreras (Half-Way Bounce-Back)
    for (let y = 1; y < ny - 1; y++) {
      const row = y * nx;
      const rowPlus = (y + 1) * nx;
      const rowMinus = (y - 1) * nx;

      for (let x = 1; x < nx - 1; x++) {
        const index = x + row;
        if (barrier[index]) {
          nE[x + 1 + row]      = nW[index];
          nW[x - 1 + row]      = nE[index];
          nN[x + rowPlus]      = nS[index];
          nS[x + rowMinus]     = nN[index];
          nNE[x + 1 + rowPlus]  = nSW[index];
          nNW[x - 1 + rowPlus]  = nSE[index];
          nSE[x + 1 + rowMinus] = nNW[index];
          nSW[x - 1 + rowMinus] = nNE[index];

          this.barrierCount++;
          this.barrierxSum += x;
          this.barrierySum += y;
          bFx += (nE[index] + nNE[index] + nSE[index] - nW[index] - nNW[index] - nSW[index]);
          bFy += (nN[index] + nNE[index] + nNW[index] - nS[index] - nSE[index] - nSW[index]);
        }
      }
    }

    this.barrierFx = bFx;
    this.barrierFy = bFy;
  }

  /**
   * Mueve las partículas trazadoras a lo largo del campo de velocidad
   */
  moveTracers() {
    const nx = this.nx;
    const ny = this.ny;
    for (let t = 0; t < this.nTracers; t++) {
      const rx = Math.max(0, Math.min(nx - 1, Math.round(this.tracerX[t])));
      const ry = Math.max(0, Math.min(ny - 1, Math.round(this.tracerY[t])));
      const idx = rx + ry * nx;

      this.tracerX[t] += this.ux[idx];
      this.tracerY[t] += this.uy[idx];

      if (this.tracerX[t] >= nx - 1 || this.tracerX[t] < 0 || this.tracerY[t] >= ny - 1 || this.tracerY[t] < 0) {
        this.tracerX[t] = 0;
        this.tracerY[t] = Math.random() * (ny - 2) + 1;
      }
    }
  }

  /**
   * Calcula el rotor 2D (curl / vorticidad: ω = ∂vy/∂x - ∂vx/∂y)
   */
  computeCurl() {
    const nx = this.nx;
    const ny = this.ny;
    const curl = this.curl;
    const ux = this.ux;
    const uy = this.uy;
    const barrier = this.barrier;

    for (let y = 1; y < ny - 1; y++) {
      const row = y * nx;
      const rowPlus = (y + 1) * nx;
      const rowMinus = (y - 1) * nx;
      for (let x = 1; x < nx - 1; x++) {
        const id = x + row;
        if (barrier[id]) {
          curl[id] = 0.0;
          continue;
        }

        // Derivada horizontal: ∂v/∂x
        let duydx;
        const eastBarrier = barrier[x + 1 + row];
        const westBarrier = barrier[x - 1 + row];
        if (eastBarrier && !westBarrier) {
          duydx = uy[id] - uy[x - 1 + row];
        } else if (westBarrier && !eastBarrier) {
          duydx = uy[x + 1 + row] - uy[id];
        } else if (!eastBarrier && !westBarrier) {
          duydx = (uy[x + 1 + row] - uy[x - 1 + row]) * 0.5;
        } else {
          duydx = 0.0;
        }

        // Derivada vertical: ∂u/∂y
        let duxdy;
        const northBarrier = barrier[x + rowPlus];
        const southBarrier = barrier[x + rowMinus];
        if (northBarrier && !southBarrier) {
          duxdy = ux[id] - ux[x + rowMinus];
        } else if (southBarrier && !northBarrier) {
          duxdy = ux[x + rowPlus] - ux[id];
        } else if (!northBarrier && !southBarrier) {
          duxdy = (ux[x + rowPlus] - ux[x + rowMinus]) * 0.5;
        } else {
          duxdy = 0.0;
        }

        // Factor de escala 2.0 idéntico a la definición de Schroeder en campo libre
        curl[id] = (duydx - duxdy) * 2.0;
      }
    }
  }

  /**
   * Ejecuta un paso temporal completo compuesto de múltiples sub-pasos
   */
  step(steps = null) {
    const nSteps = steps || this.stepsPerFrame;
    this.setBoundaries();

    for (let s = 0; s < nSteps; s++) {
      this.collide();
      this.stream();
      this.timeStepCount++;

      // Detección del período de oscilación de vórtices (Frecuencia de Strouhal)
      if (this.barrierFy > 0 && this.lastBarrierFy <= 0) {
        const dStep = this.timeStepCount - this.lastPeriodStep;
        if (dStep > 15) {
          this.vortexPeriod = dStep;
          this.lastPeriodStep = this.timeStepCount;
        }
      }
      this.lastBarrierFy = this.barrierFy;
    }

    // Verificación de estabilidad una sola vez por cuadro para rendimiento puro a 60 FPS
    const checkIdx = (this.nx * 0.4 | 0) + (this.ny * 0.5 | 0) * this.nx;
    if (this.rho[checkIdx] < 0.1 || !Number.isFinite(this.rho[checkIdx])) {
      this.initFluid();
    }
  }

  /**
   * Rasteriza obstáculos geométricos de la aplicación en la retícula LBM
   */
  rasterizeObstacles(elements, domainWidth = 16.0, domainHeight = 9.0) {
    this.barrier.fill(0);
    const nx = this.nx;
    const ny = this.ny;

    if (!elements || elements.length === 0) return;

    for (let elem of elements) {
      if (!elem.isActive || elem.isProbe || elem.isSolid === false) continue;

      if (elem.loops && elem.loops.length > 0) {
        const aabb = elem.getAABB();
        const startX = Math.max(1, Math.floor((aabb[0] / domainWidth) * nx));
        const endX = Math.min(nx - 2, Math.ceil((aabb[2] / domainWidth) * nx));
        const startY = Math.max(1, Math.floor((aabb[1] / domainHeight) * ny));
        const endY = Math.min(ny - 2, Math.ceil((aabb[3] / domainHeight) * ny));
        for (let y = startY; y <= endY; y++) {
          const row = y * nx;
          const wy = (y + 0.5) / ny * domainHeight;
          for (let x = startX; x <= endX; x++) {
            const wx = (x + 0.5) / nx * domainWidth;
            if (elem.containsPoint(wx, wy)) {
              this.barrier[x + row] = 1;
            }
          }
        }
        continue;
      }

      if (!elem.boundaryPoints || elem.boundaryPoints.length < 2) continue;

      const pts = elem.boundaryPoints;
      // Convertir coordenadas mundiales a coordenadas de retícula LBM
      const latticePts = pts.map(p => [
        (p[0] / domainWidth) * nx,
        (p[1] / domainHeight) * ny
      ]);

      // Si es un segmento simple de 2 puntos
      if (pts.length === 2) {
        this.rasterizeLine(latticePts[0][0], latticePts[0][1], latticePts[1][0], latticePts[1][1], 2);
        continue;
      }

      // Cálculo del AABB en retícula
      let minX = nx, maxX = 0, minY = ny, maxY = 0;
      for (let p of latticePts) {
        if (p[0] < minX) minX = p[0];
        if (p[0] > maxX) maxX = p[0];
        if (p[1] < minY) minY = p[1];
        if (p[1] > maxY) maxY = p[1];
      }

      const startX = Math.max(1, Math.floor(minX) - 1);
      const endX = Math.min(nx - 2, Math.ceil(maxX) + 1);
      const startY = Math.max(1, Math.floor(minY) - 1);
      const endY = Math.min(ny - 2, Math.ceil(maxY) + 1);

      // 3. Algoritmo Ray-Casting interno para llenar el cuerpo sólido
      for (let y = startY; y <= endY; y++) {
        const row = y * nx;
        for (let x = startX; x <= endX; x++) {
          if (this._pointInLatticePoly(x + 0.5, y + 0.5, latticePts)) {
            this.barrier[x + row] = 1;
          }
        }
      }
    }
  }

  _pointInLatticePoly(x, y, polygon) {
    let inside = false;
    const n = polygon.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi + 1e-9) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /**
   * Crea una barrera lineal vertical pura (como en el vídeo de Schroeder)
   */
  setLinearBarrier(barrierHeight = 16, xPos = null) {
    this.barrier.fill(0);
    const midX = xPos !== null ? Math.round(xPos) : Math.round(this.nx * 0.28);
    const midY = Math.round(this.ny * 0.5);
    const halfH = Math.round(barrierHeight * 0.5);

    for (let y = midY - halfH; y <= midY + halfH; y++) {
      if (y >= 1 && y < this.ny - 1) {
        this.barrier[midX + y * this.nx] = 1;
        this.barrier[midX + 1 + y * this.nx] = 1; // Grosor de 2 píxeles para firmeza
      }
    }
  }

  /**
   * Crea una cuña aerodinámica pura en la retícula LBM
   */
  setWedgeBarrier(baseLen = 22, height = 24, xPos = null) {
    this.barrier.fill(0);
    const startX = xPos !== null ? Math.round(xPos) : Math.round(this.nx * 0.26);
    const midY = Math.round(this.ny * 0.5);
    const halfH = Math.round(height * 0.5);

    for (let y = midY - halfH; y <= midY + halfH; y++) {
      const yRel = Math.abs(y - midY) / halfH; // 0 en el centro, 1 en los extremos
      const wAtY = Math.round(baseLen * (1.0 - yRel)); // Cuña afilada hacia la derecha
      for (let x = startX; x <= startX + wAtY; x++) {
        if (x >= 1 && x < this.nx - 1 && y >= 1 && y < this.ny - 1) {
          this.barrier[x + y * this.nx] = 1;
        }
      }
    }
  }

  /**
   * Traza una línea de barrera con grosor mediante algoritmo DDA acotado (100% libre de bucles infinitos)
   */
  rasterizeLine(x0, y0, x1, y1, thickness = 1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const steps = Math.min(600, Math.max(Math.abs(dx), Math.abs(dy), 1.0));
    const stepX = dx / steps;
    const stepY = dy / steps;
    const nSteps = Math.ceil(steps);
    const rad = Math.floor(thickness / 2);

    let curX = x0;
    let curY = y0;

    for (let s = 0; s <= nSteps; s++) {
      const cx = Math.round(curX);
      const cy = Math.round(curY);

      for (let ox = -rad; ox <= rad; ox++) {
        for (let oy = -rad; oy <= rad; oy++) {
          const bx = cx + ox;
          const by = cy + oy;
          if (bx >= 1 && bx < this.nx - 1 && by >= 1 && by < this.ny - 1) {
            this.barrier[bx + by * this.nx] = 1;
          }
        }
      }

      curX += stepX;
      curY += stepY;
    }
  }

  /**
   * Extrapola suavemente los valores del fluido dentro de las celdas de barrera adyacentes.
   * Esto elimina por completo el pixelado en el borde del obstáculo, permitiendo que el contorno
   * vectorial continuo y el filtro bilineal HD se fusionen con total nitidez sin alterar la física.
   */
  _extrapolateBoundary(srcField, outField) {
    const nx = this.nx;
    const ny = this.ny;
    const total = nx * ny;
    const barrier = this.barrier;

    if (!this._extrapVisited || this._extrapVisited.length !== total) {
      this._extrapVisited = new Uint8Array(total);
    }
    const visited = this._extrapVisited;

    for (let i = 0; i < total; i++) {
      if (!barrier[i]) {
        outField[i] = srcField[i];
        visited[i] = 1;
      } else {
        outField[i] = 0.0;
        visited[i] = 0;
      }
    }

    // Propagar 3 capas hacia el interior del obstáculo sólido
    for (let pass = 0; pass < 3; pass++) {
      for (let y = 1; y < ny - 1; y++) {
        const row = y * nx;
        for (let x = 1; x < nx - 1; x++) {
          const id = x + row;
          if (visited[id]) continue;

          let sum = 0.0;
          let count = 0;
          if (visited[id - 1])  { sum += outField[id - 1]; count++; }
          if (visited[id + 1])  { sum += outField[id + 1]; count++; }
          if (visited[id - nx]) { sum += outField[id - nx]; count++; }
          if (visited[id + nx]) { sum += outField[id + nx]; count++; }

          if (count > 0) {
            outField[id] = sum / count;
            visited[id] = 1;
          }
        }
      }
    }
  }

  /**
   * Renderiza el campo LBM al ImageData del canvas con la paleta Jet exacta de Schroeder
   * @param {ImageData} imageData 
   * @param {string} plotType 'curl', 'speed', 'density', 'ux', 'uy'
   */
  renderToImageData(imageData, plotType = 'curl') {
    const data = imageData.data;
    const nx = this.nx;
    const ny = this.ny;
    const total = nx * ny;
    const nColors = this.nColors;
    const contrast = this.contrast;
    const barrier = this.barrier;
    const redList = this.redList;
    const greenList = this.greenList;
    const blueList = this.blueList;

    if (!this._visField || this._visField.length !== total) {
      this._visField = new Float32Array(total);
    }
    const visField = this._visField;

    if (plotType === 'curl') {
      this.computeCurl();
      this._extrapolateBoundary(this.curl, visField);
      const factor = 7.5 * contrast * nColors;
      const halfN = (nColors * 0.5) | 0;

      for (let i = 0; i < total; i++) {
        const pIdx = i * 4;
        let cIndex = ((visField[i] * factor) | 0) + halfN;
        if (cIndex < 0) cIndex = 0;
        else if (cIndex > nColors) cIndex = nColors;

        data[pIdx]     = redList[cIndex];
        data[pIdx + 1] = greenList[cIndex];
        data[pIdx + 2] = blueList[cIndex];
        data[pIdx + 3] = 255;
      }
      return;
    }

    if (plotType === 'speed') {
      const ux = this.ux;
      const uy = this.uy;
      if (!this._spdField || this._spdField.length !== total) {
        this._spdField = new Float32Array(total);
      }
      const spdField = this._spdField;
      for (let i = 0; i < total; i++) {
        spdField[i] = Math.hypot(ux[i], uy[i]);
      }
      this._extrapolateBoundary(spdField, visField);
      const factor = 4.5 * contrast * nColors;

      for (let i = 0; i < total; i++) {
        const pIdx = i * 4;
        let cIndex = (visField[i] * factor) | 0;
        if (cIndex < 0) cIndex = 0;
        else if (cIndex > nColors) cIndex = nColors;

        data[pIdx]     = redList[cIndex];
        data[pIdx + 1] = greenList[cIndex];
        data[pIdx + 2] = blueList[cIndex];
        data[pIdx + 3] = 255;
      }
      return;
    }

    if (plotType === 'density') {
      const rho = this.rho;
      this._extrapolateBoundary(rho, visField);
      const factor = 6.0 * contrast * nColors;
      const halfN = (nColors * 0.5) | 0;

      for (let i = 0; i < total; i++) {
        const pIdx = i * 4;
        let cIndex = (((visField[i] - 1.0) * factor) | 0) + halfN;
        if (cIndex < 0) cIndex = 0;
        else if (cIndex > nColors) cIndex = nColors;

        data[pIdx]     = redList[cIndex];
        data[pIdx + 1] = greenList[cIndex];
        data[pIdx + 2] = blueList[cIndex];
        data[pIdx + 3] = 255;
      }
      return;
    }
  }

  /**
   * Dibuja los segmentos tangentes de líneas de corriente (Flowlines de Schroeder)
   */
  drawFlowlines(ctx, screenOrigin, cellPixelW, cellPixelH) {
    ctx.save();
    const nx = this.nx;
    const ny = this.ny;
    const spacing = 8; // Muestreo de rejilla en celdas

    for (let y = 3; y < ny - 3; y += spacing) {
      const row = y * nx;
      for (let x = 3; x < nx - 3; x += spacing) {
        const id = x + row;
        if (this.barrier[id]) continue;

        const thisUx = this.ux[id];
        const thisUy = this.uy[id];
        const speed = Math.hypot(thisUx, thisUy);
        if (speed < 0.001) continue;

        const px = screenOrigin.x + (x + 0.5) * cellPixelW;
        const py = screenOrigin.y + (y + 0.5) * cellPixelH;
        const lineLen = 14;
        const scale = (lineLen * 0.5) / speed;

        ctx.beginPath();
        ctx.moveTo(px - thisUx * scale, py - thisUy * scale);
        ctx.lineTo(px + thisUx * scale, py + thisUy * scale);

        let cIndex = Math.round(speed * this.transBlackArraySize / 0.25);
        if (cIndex >= this.transBlackArraySize) cIndex = this.transBlackArraySize - 1;
        ctx.strokeStyle = this.transBlackArray[Math.max(0, cIndex)];
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /**
   * Dibuja las partículas trazadoras del simulador de Schroeder
   */
  drawTracers(ctx, screenOrigin, cellPixelW, cellPixelH) {
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.8;

    for (let t = 0; t < this.nTracers; t++) {
      const px = screenOrigin.x + this.tracerX[t] * cellPixelW;
      const py = screenOrigin.y + this.tracerY[t] * cellPixelH;

      ctx.beginPath();
      ctx.arc(px, py, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Dibuja la flecha de fuerza neta aerodinámica sobre la barrera
   */
  drawForceArrow(ctx, screenOrigin, cellPixelW, cellPixelH) {
    if (this.barrierCount === 0) return;

    const avgX = this.barrierxSum / this.barrierCount;
    const avgY = this.barrierySum / this.barrierCount;
    const px = screenOrigin.x + avgX * cellPixelW;
    const py = screenOrigin.y + avgY * cellPixelH;

    const Fx = this.barrierFx;
    const Fy = this.barrierFy;
    const magF = Math.hypot(Fx, Fy);
    if (magF < 1e-4) return;

    ctx.save();
    ctx.translate(px, py);
    const angle = Math.atan2(Fy, Fx);
    ctx.rotate(angle);

    const arrowLen = Math.min(85, Math.max(16, magF * 22.0));
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    ctx.moveTo(0, -3);
    ctx.lineTo(arrowLen - 8, -3);
    ctx.lineTo(arrowLen - 8, -8);
    ctx.lineTo(arrowLen, 0);
    ctx.lineTo(arrowLen - 8, 8);
    ctx.lineTo(arrowLen - 8, 3);
    ctx.lineTo(0, 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}

window.LatticeBoltzmannEngine = LatticeBoltzmannEngine;
