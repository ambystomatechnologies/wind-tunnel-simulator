/**
 * Simulador de Mecánica de Fluidos y Túnel Aerodinámico 2D - Ambystoma Technologies
 * elements.js - Obstáculos Hidrodinámicos Deformables, Perfiles Alares (NACA), Cuerpos Róbicos y Sondas de Flujo
 */

/**
 * Genera puntos de una spline cúbica cerrada Catmull-Rom suave pasando por una lista de puntos de control.
 */
function catmullRomSpline(points, samplesPerSegment = 8) {
  const n = points.length;
  if (n < 3) return points;

  const result = [];
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];

    for (let s = 0; s < samplesPerSegment; s++) {
      const t = s / samplesPerSegment;
      const t2 = t * t;
      const t3 = t2 * t;

      // Coeficientes estándar de Catmull-Rom
      const c0 = -0.5 * t3 + t2 - 0.5 * t;
      const c1 =  1.5 * t3 - 2.5 * t2 + 1.0;
      const c2 = -1.5 * t3 + 2.0 * t2 + 0.5 * t;
      const c3 =  0.5 * t3 - 0.5 * t2;

      const x = c0 * p0[0] + c1 * p1[0] + c2 * p2[0] + c3 * p3[0];
      const y = c0 * p0[1] + c1 * p1[1] + c2 * p2[1] + c3 * p3[1];
      result.push([x, y]);
    }
  }
  return result;
}

/**
 * Algoritmo Ray-Casting (Even-Odd) para verificar si un punto (x, y) está dentro de un polígono cerrado.
 */
function pointInPolygon(x, y, polygon) {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Clase Base para Obstáculos y Elementos en el Túnel de Fluidos
 */
class FluidElement {
  constructor(name = "Obstacle") {
    this.id = 'elem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    this.name = name;
    this.isActive = true;
    this.isSelected = false;
  }

  getAABB() {
    return [0, 0, 0, 0];
  }

  containsPoint(x, y) {
    return false;
  }
}

/**
 * Obstáculo Hidrodinámico Deformable.
 * Admite traslación, rotación continua en tiempo real, manipulación interactiva de nodos y curvado suave Catmull-Rom.
 */
class HydrodynamicObstacle extends FluidElement {
  constructor(controlPoints, name = "Aerodynamic Body", isSmooth = false, loops = null) {
    super(name);
    this.loops = loops ? loops.map(l => l.map(p => [parseFloat(p[0]), parseFloat(p[1])])) : null;
    if (this.loops && this.loops.length > 0 && (!controlPoints || controlPoints.length === 0)) {
      this.controlPoints = this.loops[0].map(p => [parseFloat(p[0]), parseFloat(p[1])]);
    } else {
      this.controlPoints = (controlPoints || []).map(p => [parseFloat(p[0]), parseFloat(p[1])]);
    }
    this._isSmooth = isSmooth;
    this.currentRotationDeg = 0.0;
    this.color = '#38bdf8'; // Azul aerodinámico
    this.fillColor = 'rgba(23, 37, 84, 0.85)';

    // Cache para acelerar comprobaciones espaciales en la simulación a 60 FPS
    this._cachedBoundaryPts = null;
    this._cachedAABB = null;

    // Velocidades instantáneas del sólido (para no-slip dinámico)
    this.vx = 0.0;
    this.vy = 0.0;
    this.angularVelocity = 0.0;
  }

  get isSmooth() {
    return this._isSmooth;
  }

  set isSmooth(val) {
    this._isSmooth = Boolean(val);
    this.invalidateCache();
  }

  invalidateCache() {
    this._cachedBoundaryPts = null;
    this._cachedAABB = null;
  }

  get boundaryPoints() {
    if (!this._cachedBoundaryPts) {
      if (this.loops && this.loops.length > 0) {
        this._cachedBoundaryPts = this.loops[0];
      } else if (this.controlPoints.length < 3) {
        this._cachedBoundaryPts = this.controlPoints;
      } else if (this._isSmooth) {
        this._cachedBoundaryPts = catmullRomSpline(this.controlPoints, 8);
      } else {
        this._cachedBoundaryPts = this.controlPoints;
      }
    }
    return this._cachedBoundaryPts;
  }

  getAABB() {
    if (!this._cachedAABB) {
      let xmin = Infinity, ymin = Infinity, xmax = -Infinity, ymax = -Infinity;
      if (this.loops && this.loops.length > 0) {
        for (let l = 0; l < this.loops.length; l++) {
          const loop = this.loops[l];
          for (let i = 0; i < loop.length; i++) {
            const pt = loop[i];
            if (pt[0] < xmin) xmin = pt[0];
            if (pt[1] < ymin) ymin = pt[1];
            if (pt[0] > xmax) xmax = pt[0];
            if (pt[1] > ymax) ymax = pt[1];
          }
        }
      } else {
        const pts = this.boundaryPoints;
        for (let i = 0; i < pts.length; i++) {
          const pt = pts[i];
          if (pt[0] < xmin) xmin = pt[0];
          if (pt[1] < ymin) ymin = pt[1];
          if (pt[0] > xmax) xmax = pt[0];
          if (pt[1] > ymax) ymax = pt[1];
        }
      }
      this._cachedAABB = [xmin - 0.05, ymin - 0.05, xmax + 0.05, ymax + 0.05];
    }
    return this._cachedAABB;
  }

  getCentroid() {
    const aabb = this.getAABB();
    return [(aabb[0] + aabb[2]) / 2.0, (aabb[1] + aabb[3]) / 2.0];
  }

  getReferenceLength() {
    const aabb = this.getAABB();
    return Math.max(0.2, Math.max(aabb[2] - aabb[0], aabb[3] - aabb[1]));
  }

  containsPoint(wx, wy) {
    const aabb = this.getAABB();
    if (wx < aabb[0] || wx > aabb[2] || wy < aabb[1] || wy > aabb[3]) {
      return false;
    }
    if (this.loops && this.loops.length > 0) {
      let inside = false;
      for (let l = 0; l < this.loops.length; l++) {
        if (pointInPolygon(wx, wy, this.loops[l])) {
          inside = !inside;
        }
      }
      return inside;
    }
    return pointInPolygon(wx, wy, this.boundaryPoints);
  }

  translate(dx, dy) {
    if (this.loops && this.loops.length > 0) {
      for (let l = 0; l < this.loops.length; l++) {
        const loop = this.loops[l];
        for (let i = 0; i < loop.length; i++) {
          loop[i][0] += dx;
          loop[i][1] += dy;
        }
      }
    }
    for (let i = 0; i < this.controlPoints.length; i++) {
      this.controlPoints[i][0] += dx;
      this.controlPoints[i][1] += dy;
    }
    this.invalidateCache();
  }

  rotate(angleRad, center = null) {
    if (!center) center = this.getCentroid();
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);
    if (this.loops && this.loops.length > 0) {
      for (let l = 0; l < this.loops.length; l++) {
        const loop = this.loops[l];
        for (let i = 0; i < loop.length; i++) {
          const rx = loop[i][0] - center[0];
          const ry = loop[i][1] - center[1];
          loop[i][0] = center[0] + (rx * cosA - ry * sinA);
          loop[i][1] = center[1] + (rx * sinA + ry * cosA);
        }
      }
    }
    for (let i = 0; i < this.controlPoints.length; i++) {
      const rx = this.controlPoints[i][0] - center[0];
      const ry = this.controlPoints[i][1] - center[1];
      this.controlPoints[i][0] = center[0] + (rx * cosA - ry * sinA);
      this.controlPoints[i][1] = center[1] + (rx * sinA + ry * cosA);
    }
    this.currentRotationDeg = (this.currentRotationDeg + (angleRad * 180.0 / Math.PI)) % 360.0;
    if (this.currentRotationDeg < 0) this.currentRotationDeg += 360.0;
    this.invalidateCache();
  }

  setAbsoluteRotation(targetDeg, center = null) {
    const deltaDeg = targetDeg - this.currentRotationDeg;
    this.rotate(deltaDeg * Math.PI / 180.0, center);
    this.currentRotationDeg = targetDeg;
  }

  scale(scaleX, scaleY, origin = null) {
    if (!origin) origin = this.getCentroid();
    if (this.loops && this.loops.length > 0) {
      for (let l = 0; l < this.loops.length; l++) {
        const loop = this.loops[l];
        for (let i = 0; i < loop.length; i++) {
          loop[i][0] = origin[0] + (loop[i][0] - origin[0]) * scaleX;
          loop[i][1] = origin[1] + (loop[i][1] - origin[1]) * scaleY;
        }
      }
    }
    for (let i = 0; i < this.controlPoints.length; i++) {
      this.controlPoints[i][0] = origin[0] + (this.controlPoints[i][0] - origin[0]) * scaleX;
      this.controlPoints[i][1] = origin[1] + (this.controlPoints[i][1] - origin[1]) * scaleY;
    }
    this.invalidateCache();
  }

  // --- FÁBRICAS ESTÁTICAS DE PERFILES Y FORMAS AERODINÁMICAS CLÁSICAS ---

  /**
   * Crea un perfil alar NACA de 4 dígitos auténtico (ej: NACA 0012, NACA 2412, NACA 4415).
   * Utiliza las ecuaciones aeroespaciales de línea de curvatura y distribución de espesor NACA.
   */
  static createNACA(digits = "0012", chord = 3.6, center = [6.0, 4.5], numPoints = 28) {
    const m = parseInt(digits.charAt(0)) / 100.0; // Máxima curvatura (camber)
    const p = parseInt(digits.charAt(1)) / 10.0;  // Posición de la máxima curvatura
    const t = parseInt(digits.substring(2)) / 100.0; // Espesor relativo máximo

    const ptsUpper = [];
    const ptsLower = [];

    const halfN = Math.floor(numPoints / 2);

    for (let i = 0; i <= halfN; i++) {
      // Distribución de nodos basada en espaciado coseno (más densa en el borde de ataque)
      const beta = (i / halfN) * Math.PI;
      const x = 0.5 * (1.0 - Math.cos(beta)); // 0 a 1

      // Ecuación de espesor estándar NACA 4-digit
      const yt = 5.0 * t * (
        0.2969 * Math.sqrt(Math.max(0, x)) -
        0.1260 * x -
        0.3516 * Math.pow(x, 2) +
        0.2843 * Math.pow(x, 3) -
        0.1015 * Math.pow(x, 4)
      );

      // Línea media de curvatura (camber line) yc y su pendiente dyc/dx
      let yc = 0.0;
      let dyc_dx = 0.0;

      if (p > 0) {
        if (x <= p) {
          yc = (m / (p * p)) * (2.0 * p * x - x * x);
          dyc_dx = (2.0 * m / (p * p)) * (p - x);
        } else {
          yc = (m / Math.pow(1.0 - p, 2)) * ((1.0 - 2.0 * p) + 2.0 * p * x - x * x);
          dyc_dx = (2.0 * m / Math.pow(1.0 - p, 2)) * (p - x);
        }
      }

      const theta = Math.atan(dyc_dx);
      const xu = x - yt * Math.sin(theta);
      const yu = yc + yt * Math.cos(theta);
      const xl = x + yt * Math.sin(theta);
      const yl = yc - yt * Math.cos(theta);

      ptsUpper.push([xu * chord, -yu * chord]);
      if (i > 0 && i < halfN) {
        ptsLower.push([xl * chord, -yl * chord]);
      }
    }

    // Unir borde de ataque a borde de fuga en sentido horario
    ptsLower.reverse();
    const allPts = ptsUpper.concat(ptsLower);

    // Centrar en la posición deseada (al 35% de la cuerda como centro aerodinámico)
    const offsetX = center[0] - 0.35 * chord;
    const offsetY = center[1];

    const shifted = allPts.map(pt => [pt[0] + offsetX, pt[1] + offsetY]);
    const obs = new HydrodynamicObstacle(shifted, `Airfoil NACA ${digits}`, true);
    return obs;
  }

  /**
   * Crea un cilindro circular (ideal para observar la Calle de Vórtices de Von Kármán).
   */
  static createCylinder(radius = 1.1, center = [5.5, 4.5], numPoints = 20) {
    const pts = [];
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * 2 * Math.PI;
      pts.push([
        center[0] + radius * Math.cos(angle),
        center[1] + radius * Math.sin(angle)
      ]);
    }
    return new HydrodynamicObstacle(pts, "Cylinder Obstacle", true);
  }

  /**
   * Crea una gota aerodinámica (mínima resistencia de forma / drag ultra bajo).
   */
  static createTeardrop(length = 3.8, width = 1.6, center = [6.0, 4.5], numPoints = 24) {
    const pts = [];
    for (let i = 0; i < numPoints; i++) {
      const t = (i / numPoints) * 2 * Math.PI;
      // Curva matemática de gota
      const x = -0.5 * Math.cos(t) + 0.5; // 0 a 1
      const y = 0.5 * Math.sin(t) * Math.pow(Math.sin(t / 2.0), 1.2);
      pts.push([
        center[0] + (x - 0.3) * length,
        center[1] + y * width
      ]);
    }
    return new HydrodynamicObstacle(pts, "Aerodynamic Teardrop", true);
  }

  /**
   * Crea una barrera lineal vertical pura (como en el simulador de Schroeder y el video de ejemplo).
   * Desencadena el desprendimiento físico continuo de vórtices alternos de Von Kármán en LBM.
   */
  static createLinearBarrier(height = 3.6, center = [5.5, 4.5]) {
    const halfH = height / 2.0;
    const thick = 0.22;
    const pts = [
      [center[0] - thick, center[1] - halfH],
      [center[0] + thick, center[1] - halfH],
      [center[0] + thick, center[1] + halfH],
      [center[0] - thick, center[1] + halfH]
    ];
    return new HydrodynamicObstacle(pts, "Barrera Lineal (Schroeder)", false);
  }

  /**
   * Crea una placa plana (estudio de sustentación, pérdida de sustentación y estela).
   */
  static createFlatPlate(length = 3.2, thickness = 0.18, center = [6.0, 4.5]) {
    const hL = length / 2.0;
    const hT = thickness / 2.0;
    const pts = [
      [center[0] - hL, center[1] - hT],
      [center[0] + hL, center[1] - hT],
      [center[0] + hL, center[1] + hT],
      [center[0] - hL, center[1] + hT]
    ];
    return new HydrodynamicObstacle(pts, "Flat Plate", false);
  }

  /**
   * Crea un cuerpo cuadrado / romo (desprendimiento violento de capa límite).
   */
  static createSquare(size = 1.8, center = [5.5, 4.5]) {
    const hs = size / 2.0;
    const pts = [
      [center[0] - hs, center[1] - hs],
      [center[0] + hs, center[1] - hs],
      [center[0] + hs, center[1] + hs],
      [center[0] - hs, center[1] + hs]
    ];
    return new HydrodynamicObstacle(pts, "Bluff Square Body", false);
  }

  /**
   * Crea una cuña aerodinámica / deflector.
   */
  static createWedge(base = 2.4, height = 2.0, center = [5.5, 4.5]) {
    const pts = [
      [center[0] - base * 0.4, center[1] - height / 2.0],
      [center[0] + base * 0.6, center[1]],
      [center[0] - base * 0.4, center[1] + height / 2.0]
    ];
    return new HydrodynamicObstacle(pts, "Aerodynamic Wedge", false);
  }

  /**
   * Crea un perfil de vehículo deportivo (downforce y estela difusora).
   */
  static createCarProfile(length = 4.4, height = 1.6, center = [6.0, 4.5]) {
    const x0 = center[0] - length / 2.0;
    const y0 = center[1] + height / 2.0; // Parte inferior del coche
    // Silueta aerodinámica de bólido con spoiler
    const raw = [
      [0.0, 0.0],
      [0.15, -0.2],
      [0.45, -0.3],
      [1.1, -0.5],
      [1.8, -0.95],
      [2.7, -1.0],
      [3.4, -0.6],
      [3.9, -0.55],
      [4.1, -0.85], // Alerón
      [4.35, -0.85],
      [4.3, -0.2],
      [4.4, 0.0],
      [3.6, 0.0],
      [3.4, -0.25], // Paso de rueda trasera
      [2.9, 0.0],
      [1.6, 0.0],
      [1.3, -0.25], // Paso de rueda delantera
      [0.8, 0.0]
    ];
    const pts = raw.map(p => [x0 + (p[0] / 4.4) * length, y0 + (p[1] / 1.0) * height]);
    return new HydrodynamicObstacle(pts, "Race Car Silhouette", true);
  }

  /**
   * Crea un tubo Venturi / tobera convergente-divergente.
   */
  static createVenturiNozzles(domainWidth = 16.0, domainHeight = 9.0, throatH = 3.0) {
    const wallThick = (domainHeight - throatH) / 2.0;
    const midX = domainWidth / 2.0;

    // Pared superior con estrangulamiento suave
    const topPts = [
      [1.0, 0.2],
      [midX - 2.5, 0.2],
      [midX, wallThick],
      [midX + 2.5, 0.2],
      [domainWidth - 1.0, 0.2],
      [domainWidth - 1.0, 0.0],
      [1.0, 0.0]
    ];

    // Pared inferior con estrangulamiento suave
    const botPts = [
      [1.0, domainHeight - 0.2],
      [midX - 2.5, domainHeight - 0.2],
      [midX, domainHeight - wallThick],
      [midX + 2.5, domainHeight - 0.2],
      [domainWidth - 1.0, domainHeight - 0.2],
      [domainWidth - 1.0, domainHeight],
      [1.0, domainHeight]
    ];

    return [
      new HydrodynamicObstacle(topPts, "Venturi Upper Throat", true),
      new HydrodynamicObstacle(botPts, "Venturi Lower Throat", true)
    ];
  }
}

/**
 * Sonda de Flujo / Sensor de Presión y Velocidad interactivo (Tubo de Pitot virtual)
 */
class FlowProbe extends FluidElement {
  constructor(x = 8.0, y = 4.5, name = "Flow Probe") {
    super(name);
    this.x = parseFloat(x);
    this.y = parseFloat(y);
    this.radius = 0.35; // Radio visual en metros
    this.measuredSpeed = 0.0;
    this.measuredU = 0.0;
    this.measuredV = 0.0;
    this.measuredP = 0.0;
    this.measuredVorticity = 0.0;
  }

  getAABB() {
    return [this.x - this.radius, this.y - this.radius, this.x + this.radius, this.y + this.radius];
  }

  containsPoint(wx, wy) {
    const dx = wx - this.x;
    const dy = wy - this.y;
    return (dx * dx + dy * dy) <= (this.radius * this.radius * 2.0);
  }

  translate(dx, dy) {
    this.x += dx;
    this.y += dy;
  }

  rotate(angleRad, center = null) {
    if (!center) return;
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);
    const rx = this.x - center[0];
    const ry = this.y - center[1];
    this.x = center[0] + (rx * cosA - ry * sinA);
    this.y = center[1] + (rx * sinA + ry * cosA);
  }

  getCentroid() {
    return [this.x, this.y];
  }
}

/**
 * ImageContourTracer
 * Analiza archivos SVG y PNG (o JPG), detecta la silueta física del contorno
 * y la convierte en un obstáculo hidrodinámico escalado coherentemente con el túnel.
 */
class ImageContourTracer {
  static async traceFile(file, targetWidth = 3.8, targetCenter = [6.0, 4.5]) {
    return new Promise((resolve, reject) => {
      const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
      const reader = new FileReader();

      reader.onload = (e) => {
        let src = e.target.result;

        // Si es SVG, asegurar que tenga atributos width/height válidos para el decodificador
        if (isSvg && typeof src === 'string') {
          try {
            let svgText = src;
            if (src.startsWith('data:')) {
              const base64Part = src.split(',')[1];
              svgText = atob(base64Part);
            }
            if (svgText && svgText.includes('<svg')) {
              const parser = new DOMParser();
              const doc = parser.parseFromString(svgText, 'image/svg+xml');
              const svgEl = doc.querySelector('svg');
              if (svgEl) {
                if (!svgEl.getAttribute('width') || !svgEl.getAttribute('height')) {
                  const vb = svgEl.getAttribute('viewBox');
                  if (vb) {
                    const parts = vb.trim().split(/[\s,]+/).map(Number);
                    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
                      svgEl.setAttribute('width', parts[2]);
                      svgEl.setAttribute('height', parts[3]);
                    } else {
                      svgEl.setAttribute('width', '500');
                      svgEl.setAttribute('height', '500');
                    }
                  } else {
                    svgEl.setAttribute('width', '500');
                    svgEl.setAttribute('height', '500');
                  }
                  const serializer = new XMLSerializer();
                  const newSvgStr = serializer.serializeToString(svgEl);
                  src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(newSvgStr);
                }
              }
            }
          } catch (errSvg) {
            // Continúa con src original si el parseo falla
          }
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const result = ImageContourTracer.traceImage(img, file.name, targetWidth, targetCenter);
            resolve(result);
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = () => reject(new Error('No se pudo decodificar el formato de la imagen.'));
        img.src = src;
      };

      reader.onerror = () => reject(new Error('Error al leer el archivo.'));
      if (isSvg) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    });
  }

  static traceImage(img, filename = 'Figura', targetWidth = 3.8, targetCenter = [6.0, 4.5]) {
    const maxDim = 240;
    let w = img.naturalWidth || img.width || 200;
    let h = img.naturalHeight || img.height || 200;
    if (w <= 0 || h <= 0) { w = 200; h = 200; }

    if (w > maxDim || h > maxDim) {
      if (w >= h) {
        h = Math.max(20, Math.round(h * maxDim / w));
        w = maxDim;
      } else {
        w = Math.max(20, Math.round(w * maxDim / h));
        h = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // Detectar canal alfa transparente
    let hasAlpha = false;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 220) {
        hasAlpha = true;
        break;
      }
    }

    const pw = w + 2;
    const ph = h + 2;
    const padMask = new Uint8Array(pw * ph);

    if (hasAlpha) {
      for (let y = 0; y < h; y++) {
        const rowSrc = y * w * 4;
        const rowDst = (y + 1) * pw;
        for (let x = 0; x < w; x++) {
          if (data[rowSrc + x * 4 + 3] > 70) {
            padMask[rowDst + (x + 1)] = 1;
          }
        }
      }
    } else {
      const corners = [0, (w - 1) * 4, ((h - 1) * w) * 4, ((h - 1) * w + w - 1) * 4];
      let bgLum = 0;
      for (let c of corners) {
        bgLum += 0.299 * data[c] + 0.587 * data[c + 1] + 0.114 * data[c + 2];
      }
      bgLum /= 4.0;
      const isLightBg = bgLum > 128;
      const threshold = isLightBg ? Math.min(220, bgLum - 35) : Math.max(35, bgLum + 35);
      for (let y = 0; y < h; y++) {
        const rowSrc = y * w * 4;
        const rowDst = (y + 1) * pw;
        for (let x = 0; x < w; x++) {
          const idx = rowSrc + x * 4;
          const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          const isFg = isLightBg ? (lum < threshold) : (lum > threshold);
          if (isFg) {
            padMask[rowDst + (x + 1)] = 1;
          }
        }
      }
    }

    // Extraer todos los contornos cerrados (partes separadas y agujeros) con Marching Squares
    const rawLoops = ImageContourTracer.extractAllMarchingLoops(padMask, pw, ph);
    if (!rawLoops || rawLoops.length === 0) {
      throw new Error('No se detectó una figura o contorno sólido contrastante en la imagen.');
    }

    // Simplificar cada contorno con Ramer-Douglas-Peucker
    const simplifiedLoops = rawLoops.map(loop => {
      const closed = ImageContourTracer.simplifyDouglasPeucker(loop.concat([loop[0]]), 1.25);
      return closed.slice(0, -1);
    }).filter(loop => loop.length >= 3);

    if (simplifiedLoops.length === 0) {
      throw new Error('Los contornos detectados son demasiado pequeños.');
    }

    // Calcular límites de la figura completa sobre todos los contornos
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let l = 0; l < simplifiedLoops.length; l++) {
      const loop = simplifiedLoops[l];
      for (let i = 0; i < loop.length; i++) {
        const pt = loop[i];
        if (pt[0] < minX) minX = pt[0];
        if (pt[1] < minY) minY = pt[1];
        if (pt[0] > maxX) maxX = pt[0];
        if (pt[1] > maxY) maxY = pt[1];
      }
    }

    const bboxW = Math.max(1, maxX - minX);
    const bboxH = Math.max(1, maxY - minY);
    const aspect = bboxW / bboxH;

    let worldW, worldH;
    if (aspect >= 1.0) {
      worldW = targetWidth; // ej: ~3.8 metros
      worldH = Math.min(5.2, worldW / aspect);
    } else {
      worldH = Math.min(4.2, targetWidth / aspect);
      worldW = worldH * aspect;
    }

    const scaleX = worldW / bboxW;
    const scaleY = worldH / bboxH;
    const cx = (minX + maxX) / 2.0;
    const cy = (minY + maxY) / 2.0;

    // Normalizar coordenadas al espacio virtual del fluido
    const worldLoops = simplifiedLoops.map(loop => {
      return loop.map(pt => [
        targetCenter[0] + (pt[0] - cx) * scaleX,
        targetCenter[1] + (pt[1] - cy) * scaleY
      ]);
    });

    const baseName = filename.replace(/\.[^/.]+$/, '').substring(0, 24);
    return {
      name: `Figura: ${baseName}`,
      loops: worldLoops,
      points: worldLoops[0]
    };
  }

  static extractAllMarchingLoops(pad, pw, ph) {
    const lut = {
      1: [['L', 'B']],
      2: [['B', 'R']],
      3: [['L', 'R']],
      4: [['R', 'T']],
      5: [['L', 'T'], ['R', 'B']],
      6: [['B', 'T']],
      7: [['L', 'T']],
      8: [['T', 'L']],
      9: [['T', 'B']],
      10: [['T', 'R'], ['B', 'L']],
      11: [['T', 'R']],
      12: [['R', 'L']],
      13: [['R', 'B']],
      14: [['B', 'L']]
    };

    const nextMap = new Map();

    for (let y = 0; y < ph - 1; y++) {
      const row0 = y * pw;
      const row1 = (y + 1) * pw;
      for (let x = 0; x < pw - 1; x++) {
        const tl = pad[row0 + x];
        const tr = pad[row0 + x + 1];
        const br = pad[row1 + x + 1];
        const bl = pad[row1 + x];
        const caseIdx = (tl << 3) | (tr << 2) | (br << 1) | bl;
        if (!lut[caseIdx]) continue;

        const edges = {
          'T': `${2 * x + 1},${2 * y}`,
          'R': `${2 * x + 2},${2 * y + 1}`,
          'B': `${2 * x + 1},${2 * y + 2}`,
          'L': `${2 * x},${2 * y + 1}`
        };

        const pairs = lut[caseIdx];
        for (let i = 0; i < pairs.length; i++) {
          nextMap.set(edges[pairs[i][0]], edges[pairs[i][1]]);
        }
      }
    }

    const visited = new Set();
    const loops = [];

    for (const start of nextMap.keys()) {
      if (visited.has(start)) continue;

      const chain = [];
      let curr = start;
      while (curr && !visited.has(curr)) {
        visited.add(curr);
        const parts = curr.split(',');
        chain.push([parseFloat(parts[0]) / 2.0, parseFloat(parts[1]) / 2.0]);
        curr = nextMap.get(curr);
        if (curr === start) {
          if (chain.length >= 6) {
            loops.push(chain);
          }
          break;
        }
      }
    }

    return loops;
  }

  static simplifyDouglasPeucker(points, epsilon) {
    if (points.length <= 2) return points;

    function getSqSegDist(p, p1, p2) {
      let x = p1[0], y = p1[1];
      let dx = p2[0] - x, dy = p2[1] - y;
      if (dx !== 0 || dy !== 0) {
        const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
        if (t > 1) {
          x = p2[0];
          y = p2[1];
        } else if (t > 0) {
          x += dx * t;
          y += dy * t;
        }
      }
      dx = p[0] - x;
      dy = p[1] - y;
      return dx * dx + dy * dy;
    }

    const sqEpsilon = epsilon * epsilon;

    function rdp(pts) {
      if (pts.length <= 2) return pts;
      let maxDist = 0;
      let index = 0;
      const end = pts.length - 1;
      for (let i = 1; i < end; i++) {
        const d = getSqSegDist(pts[i], pts[0], pts[end]);
        if (d > maxDist) {
          index = i;
          maxDist = d;
        }
      }
      if (maxDist > sqEpsilon) {
        const left = rdp(pts.slice(0, index + 1));
        const right = rdp(pts.slice(index));
        return left.slice(0, left.length - 1).concat(right);
      } else {
        return [pts[0], pts[end]];
      }
    }

    return rdp(points);
  }
}

window.HydrodynamicObstacle = HydrodynamicObstacle;
window.FlowProbe = FlowProbe;
window.catmullRomSpline = catmullRomSpline;
window.pointInPolygon = pointInPolygon;
window.ImageContourTracer = ImageContourTracer;
