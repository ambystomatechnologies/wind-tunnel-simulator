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
    this.isSolid = true;
    this.isProbe = false;
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
  constructor(controlPoints, name = "Aerodynamic Body", isSmooth = false, loops = null, isImportedImage = false) {
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
    this.isImportedImage = Boolean(isImportedImage || (name && name.startsWith('Figura:')));

    // Propiedades de imagen importada (pre-renderizado temático y máscara exacta de colisión)
    this.imageThemedCanvases = null;
    this.imageCroppedCanvas = null;
    this.imageWorldWidth = 0.0;
    this.imageWorldHeight = 0.0;
    this.imageCenter = null;
    this.imageMask = null;
    this.imageMaskW = 0;
    this.imageMaskH = 0;

    // Cache para acelerar comprobaciones espaciales en la simulación a 60 FPS
    this._cachedBoundaryPts = null;
    this._cachedAABB = null;

    // Velocidades instantáneas del sólido (para no-slip dinámico)
    this.vx = 0.0;
    this.vy = 0.0;
    this.angularVelocity = 0.0;

    // Propiedades de boya flotante y rotación autónoma
    this.isBuoy = false;
    this.isAutoRotating = false;
    this.autoRotateRPM = 5;
    this.autoRotateDirection = 'cw'; // 'cw' = derecha / horario, 'ccw' = izquierda / antihorario

    // Propiedades de propulsor / eyector de fluido activo
    this.isThruster = false;
    this.thrustSpeed = 5.0; // Rango 0.0 a 12.0 m/s
    this.smokeMode = 'vapor'; // 'vapor' (vapor visible por default) o 'clean' (viento limpio)
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
      if (this.isImportedImage && this.imageWorldWidth && this.imageWorldHeight) {
        const c = this.imageCenter || [(this.controlPoints[0] ? this.controlPoints[0][0] : 6.0), (this.controlPoints[0] ? this.controlPoints[0][1] : 4.5)];
        const hw = this.imageWorldWidth * 0.5;
        const hh = this.imageWorldHeight * 0.5;
        const rad = ((this.currentRotationDeg || 0.0) * Math.PI) / 180.0;
        const cosR = Math.abs(Math.cos(rad));
        const sinR = Math.abs(Math.sin(rad));
        const aabbHalfW = hw * cosR + hh * sinR;
        const aabbHalfH = hw * sinR + hh * cosR;
        this._cachedAABB = [
          c[0] - aabbHalfW - 0.05,
          c[1] - aabbHalfH - 0.05,
          c[0] + aabbHalfW + 0.05,
          c[1] + aabbHalfH + 0.05
        ];
      } else {
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
    }
    return this._cachedAABB;
  }

  getCentroid() {
    if (this.isImportedImage && this.imageCenter) {
      return [this.imageCenter[0], this.imageCenter[1]];
    }
    const aabb = this.getAABB();
    return [(aabb[0] + aabb[2]) / 2.0, (aabb[1] + aabb[3]) / 2.0];
  }

  getReferenceLength() {
    const aabb = this.getAABB();
    return Math.max(0.2, Math.max(aabb[2] - aabb[0], aabb[3] - aabb[1]));
  }

  getThrusterExhaust() {
    if (!this.isThruster) return null;
    const centroid = this.getCentroid();
    const aabb = this.getAABB();
    const angleRad = (this.currentRotationDeg * Math.PI) / 180.0;
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);
    const normX = -sinA;
    const normY = cosA;

    // Dimensiones actuales basadas en AABB
    const halfL = Math.max(0.4, (aabb[2] - aabb[0]) * 0.5);
    const halfW = Math.max(0.15, (aabb[3] - aabb[1]) * 0.5);

    // Centro del orificio de salida en la tobera trasera
    const exitCenterX = centroid[0] + cosA * (halfL * 0.96);
    const exitCenterY = centroid[1] + sinA * (halfL * 0.96);
    const nozzleHalfW = halfW * 0.60;

    // Extremos de la apertura de salida (perpendicular a la dirección de avance)
    const p0 = [exitCenterX - normX * nozzleHalfW, exitCenterY - normY * nozzleHalfW];
    const p1 = [exitCenterX + normX * nozzleHalfW, exitCenterY + normY * nozzleHalfW];

    return {
      center: [exitCenterX, exitCenterY],
      p0,
      p1,
      dir: [cosA, sinA],
      aperture: nozzleHalfW * 2.0,
      halfL,
      halfW
    };
  }

  getBoundingRadius() {
    const aabb = this.getAABB();
    return Math.hypot((aabb[2] - aabb[0]) * 0.5, (aabb[3] - aabb[1]) * 0.5);
  }

  getArea() {
    const pts = this.boundaryPoints;
    if (!pts || pts.length < 3) return 0.5;
    let sum = 0.0;
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      sum += (p1[0] * p2[1] - p2[0] * p1[1]);
    }
    return Math.max(0.05, Math.abs(sum) * 0.5);
  }

  getMass() {
    // Masa proporcional al área bidimensional del cuerpo sólido
    return Math.max(0.1, this.getArea() * 2.0);
  }

  getInertia() {
    // Momento de inercia rotacional en 2D respecto a su centroide: I ≈ 0.5 * m * R²
    const m = this.getMass();
    const r = this.getBoundingRadius();
    return Math.max(0.01, 0.5 * m * r * r);
  }

  containsPoint(wx, wy) {
    const aabb = this.getAABB();
    if (wx < aabb[0] || wx > aabb[2] || wy < aabb[1] || wy > aabb[3]) {
      return false;
    }
    if (this.isImportedImage && this.imageMask) {
      const c = this.imageCenter || this.getCentroid();
      const hw = this.imageWorldWidth * 0.5;
      const hh = this.imageWorldHeight * 0.5;
      const dx = wx - c[0];
      const dy = wy - c[1];
      const rad = -((this.currentRotationDeg || 0.0) * Math.PI) / 180.0;
      const cosR = Math.cos(rad);
      const sinR = Math.sin(rad);
      const lx = dx * cosR - dy * sinR;
      const ly = dx * sinR + dy * cosR;
      const u = (lx + hw) / Math.max(0.01, this.imageWorldWidth);
      const v = (ly + hh) / Math.max(0.01, this.imageWorldHeight);
      if (u < 0.0 || u >= 1.0 || v < 0.0 || v >= 1.0) return false;
      const px = Math.min(this.imageMaskW - 1, Math.max(0, Math.floor(u * this.imageMaskW)));
      const py = Math.min(this.imageMaskH - 1, Math.max(0, Math.floor(v * this.imageMaskH)));
      return this.imageMask[py * this.imageMaskW + px] > 0;
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
    if (this.imageCenter) {
      this.imageCenter[0] += dx;
      this.imageCenter[1] += dy;
    }
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

    if (this.imageCenter && center && (center[0] !== this.imageCenter[0] || center[1] !== this.imageCenter[1])) {
      const rx = this.imageCenter[0] - center[0];
      const ry = this.imageCenter[1] - center[1];
      this.imageCenter[0] = center[0] + (rx * cosA - ry * sinA);
      this.imageCenter[1] = center[1] + (rx * sinA + ry * cosA);
    }

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
    let norm = ((targetDeg % 360.0) + 360.0) % 360.0;
    const deltaDeg = norm - this.currentRotationDeg;
    this.rotate(deltaDeg * Math.PI / 180.0, center);
    this.currentRotationDeg = norm;
  }

  scale(scaleX, scaleY, origin = null) {
    if (!origin) origin = this.getCentroid();
    if (this.imageCenter && origin && (origin[0] !== this.imageCenter[0] || origin[1] !== this.imageCenter[1])) {
      this.imageCenter[0] = origin[0] + (this.imageCenter[0] - origin[0]) * scaleX;
      this.imageCenter[1] = origin[1] + (this.imageCenter[1] - origin[1]) * scaleY;
    }
    if (this.imageWorldWidth) this.imageWorldWidth *= Math.abs(scaleX);
    if (this.imageWorldHeight) this.imageWorldHeight *= Math.abs(scaleY);

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

  /**
   * Clona exactamente este obstáculo hidrodinámico con todas sus deformaciones de nodos,
   * escala, rotación, loops, imagen importada o propiedades de propulsor / boya.
   */
  clone(offsetX = 0.35, offsetY = 0.35) {
    const clonedControlPoints = this.controlPoints ? this.controlPoints.map(p => [p[0] + offsetX, p[1] + offsetY]) : [];
    const clonedLoops = this.loops ? this.loops.map(loop => loop.map(p => [p[0] + offsetX, p[1] + offsetY])) : null;

    let copyName = this.name || "Figura";
    const copyMatch = copyName.match(/^(.*?)(?: \(Copia(?: (\d+))?\))?$/);
    if (copyMatch) {
      const base = copyMatch[1];
      const num = copyMatch[2] ? parseInt(copyMatch[2], 10) + 1 : (copyName.includes('(Copia)') ? 2 : null);
      copyName = num ? `${base} (Copia ${num})` : `${base} (Copia)`;
    } else {
      copyName = `${copyName} (Copia)`;
    }

    const copy = new HydrodynamicObstacle(clonedControlPoints, copyName, this._isSmooth, clonedLoops, this.isImportedImage);
    copy.currentRotationDeg = this.currentRotationDeg || 0.0;
    copy.color = this.color;
    copy.fillColor = this.fillColor;
    copy.isSolid = (this.isSolid !== undefined) ? this.isSolid : true;

    // Propiedades de imagen importada
    if (this.isImportedImage) {
      copy.imageThemedCanvases = this.imageThemedCanvases;
      copy.imageCroppedCanvas = this.imageCroppedCanvas;
      copy.imageWorldWidth = this.imageWorldWidth;
      copy.imageWorldHeight = this.imageWorldHeight;
      copy.imageCenter = this.imageCenter ? [this.imageCenter[0] + offsetX, this.imageCenter[1] + offsetY] : null;
      copy.imageMask = this.imageMask;
      copy.imageMaskW = this.imageMaskW;
      copy.imageMaskH = this.imageMaskH;
    }

    // Propiedades de boya y rotación autónoma
    copy.isBuoy = Boolean(this.isBuoy);
    copy.isAutoRotating = Boolean(this.isAutoRotating);
    copy.autoRotateRPM = this.autoRotateRPM || 5;
    copy.autoRotateDirection = this.autoRotateDirection || 'cw';

    // Propiedades de propulsor de fluido
    copy.isThruster = Boolean(this.isThruster);
    copy.thrustSpeed = (this.thrustSpeed !== undefined) ? this.thrustSpeed : 5.0;
    copy.smokeMode = this.smokeMode || 'vapor';

    copy.invalidateCache();
    return copy;
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
   * Crea un propulsor / eyector de fluido activo (forma estilizada idéntica al ícono de la herramienta).
   * La figura es transparente al viento del túnel (no interactúa como barrera sólida) y genera su propio chorro y vórtices interiores.
   */
  static createThruster(length = 1.9, width = 0.85, center = [5.5, 4.5]) {
    const hl = length / 2.0;
    const hw = width / 2.0;
    const cx = center[0];
    const cy = center[1];
    // Geometría idéntica a la silueta del ícono SVG:
    // Nariz redondeada frontal (izq), cuerpo aerodinámico y tobera cilíndrica de escape (der)
    const pts = [
      [cx + hl, cy - hw * 0.60],         // Labio superior de la tobera
      [cx + hl * 0.41, cy - hw * 0.60],  // Transición tobera-cuerpo superior
      [cx - hl * 0.78, cy - hw],         // Hombro superior
      [cx - hl * 0.92, cy - hw * 0.70],  // Curva de proa
      [cx - hl, cy],                     // Vértice de la proa redondeada
      [cx - hl * 0.92, cy + hw * 0.70],  // Curva de proa inferior
      [cx - hl * 0.78, cy + hw],         // Hombro inferior
      [cx + hl * 0.41, cy + hw * 0.60],  // Transición tobera-cuerpo inferior
      [cx + hl, cy + hw * 0.60]          // Labio inferior de la tobera
    ];
    const obs = new HydrodynamicObstacle(pts, "Propulsor de Fluido", false);
    obs.isThruster = true;
    obs.isSolid = false; // Transparente al túnel: las líneas de flujo del túnel lo atraviesan sin chocar
    obs.thrustSpeed = 5.0; // Rango 0.0 a 12.0 m/s (default 5.0 m/s)
    obs.smokeMode = 'vapor'; // 'vapor' (vapor visible por default) o 'clean'
    return obs;
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
   * Crea una cruz simétrica delgada proporcional exacta a resources/cruz.png.
   */
  static createSwissCross(size = 2.4, center = [5.5, 4.5]) {
    const a = size / 2.0;       // Longitud exterior de cada brazo
    const b = a * (114.0 / 1041.0); // Semiespesor del brazo (~11% del ancho total según resources/cruz.png)
    const cx = center[0];
    const cy = center[1];
    const pts = [
      [cx - b, cy - a],
      [cx + b, cy - a],
      [cx + b, cy - b],
      [cx + a, cy - b],
      [cx + a, cy + b],
      [cx + b, cy + b],
      [cx + b, cy + a],
      [cx - b, cy + a],
      [cx - b, cy + b],
      [cx - a, cy + b],
      [cx - a, cy - b],
      [cx - b, cy - b]
    ];
    return new HydrodynamicObstacle(pts, "Cruz", false);
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
   * Crea el perfil de vehículo de competición (Bólido F1) basado exactamente en resources/bolido.png.
   * Genera el obstáculo con alta fidelidad gráfica, líneas celestes y máscara de colisión exacta.
   */
  static createCarProfile(length = 4.6, height = null, center = [6.0, 4.5]) {
    const targetH = (height !== null && height !== undefined) ? height : (length / 3.8223);
    const cx = center[0];
    const cy = center[1];

    if (HydrodynamicObstacle._bolidoTemplate) {
      const tmpl = HydrodynamicObstacle._bolidoTemplate;
      const tmplW = tmpl.imageWorldWidth || 4.6;
      const tmplH = tmpl.imageWorldHeight || (4.6 / 3.8223);
      const scaleX = length / tmplW;
      const scaleY = targetH / tmplH;
      const tc = tmpl.imageCenter || [6.0, 4.5];

      const scaledLoops = (tmpl.loops || []).map(loop =>
        loop.map(p => [cx + (p[0] - tc[0]) * scaleX, cy + (p[1] - tc[1]) * scaleY])
      );
      const scaledPts = (tmpl.points || (scaledLoops[0] || [])).map(p => [
        cx + (p[0] - tc[0]) * scaleX,
        cy + (p[1] - tc[1]) * scaleY
      ]);

      const obs = new HydrodynamicObstacle(scaledPts, "Bólido", false, scaledLoops, true);
      obs.isImportedImage = true;
      obs.imageThemedCanvases = tmpl.imageThemedCanvases;
      obs.imageCroppedCanvas = tmpl.imageCroppedCanvas;
      obs.imageWorldWidth = length;
      obs.imageWorldHeight = targetH;
      obs.imageCenter = [cx, cy];
      obs.imageMask = tmpl.imageMask;
      obs.imageMaskW = tmpl.imageMaskW;
      obs.imageMaskH = tmpl.imageMaskH;
      obs.color = '#38bdf8';
      obs.invalidateCache();
      return obs;
    }

    // Geometría vectorial idéntica trazada de resources/bolido.png como respaldo
    const normLoops = [
      [[0.9978, 0.4545], [0.8054, 0.3512], [0.6032, 0.0868], [0.6141, 0.0248], [0.5751, 0.0], [0.5589, 0.1198], [0.5622, 0.281], [0.5049, 0.2355], [0.4714, 0.4091], [0.4357, 0.4256], [0.4335, 0.343], [0.4141, 0.3636], [0.4162, 0.4256], [0.2357, 0.376], [0.1697, 0.4174], [0.0097, 0.6653], [0.0, 0.8843], [0.1146, 0.8843], [0.1168, 0.7727], [0.1395, 0.9174], [0.1849, 0.9959], [0.2519, 0.8926], [0.8065, 0.8884], [0.8854, 0.9959], [0.9654, 0.8636], [0.9578, 0.6694], [0.9978, 0.624]],
      [[0.8541, 0.2025], [0.8541, 0.2893], [0.8649, 0.3264], [0.9654, 0.3719], [0.9978, 0.376], [0.9978, 0.2355], [0.9676, 0.2314], [0.9611, 0.2066], [0.9589, 0.1736], [0.8605, 0.1736]]
    ];

    const x0 = cx - length / 2.0;
    const y0 = cy - targetH / 2.0;
    const loops = normLoops.map(loop => loop.map(p => [x0 + p[0] * length, y0 + p[1] * targetH]));
    const pts = loops[0];
    const obs = new HydrodynamicObstacle(pts, "Bólido", false, loops, false);
    obs.color = '#38bdf8';
    return obs;
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
    this.isSolid = false;
    this.isProbe = true;
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

  clone(offsetX = 0.35, offsetY = 0.35) {
    let copyName = this.name || "Sensor";
    const copyMatch = copyName.match(/^(.*?)(?: \(Copia(?: (\d+))?\))?$/);
    if (copyMatch) {
      const base = copyMatch[1];
      const num = copyMatch[2] ? parseInt(copyMatch[2], 10) + 1 : (copyName.includes('(Copia)') ? 2 : null);
      copyName = num ? `${base} (Copia ${num})` : `${base} (Copia)`;
    } else {
      copyName = `${copyName} (Copia)`;
    }
    const copy = new FlowProbe(this.x + offsetX, this.y + offsetY, copyName);
    copy.radius = this.radius;
    return copy;
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
    let origW = img.naturalWidth || img.width || 200;
    let origH = img.naturalHeight || img.height || 200;
    if (origW <= 0 || origH <= 0) { origW = 200; origH = 200; }

    // 1. Dibujar imagen en un lienzo de trabajo de alta resolución (máx 1600px para máxima nitidez y rendimiento óptimo)
    const maxWorkDim = 1600;
    let workW = origW;
    let workH = origH;
    if (workW > maxWorkDim || workH > maxWorkDim) {
      if (workW >= workH) {
        workH = Math.max(40, Math.round((workH * maxWorkDim) / workW));
        workW = maxWorkDim;
      } else {
        workW = Math.max(40, Math.round((workW * maxWorkDim) / workH));
        workH = maxWorkDim;
      }
    }

    const workCanvas = document.createElement('canvas');
    workCanvas.width = workW;
    workCanvas.height = workH;
    const workCtx = workCanvas.getContext('2d');
    workCtx.drawImage(img, 0, 0, workW, workH);

    const workImgData = workCtx.getImageData(0, 0, workW, workH);
    const workData = workImgData.data;

    // Detectar si el archivo posee canal alfa transparente genuino
    let hasAlpha = false;
    for (let i = 3; i < workData.length; i += 4) {
      if (workData[i] < 220) {
        hasAlpha = true;
        break;
      }
    }

    // Auto-recorte inteligente: calcular el cuadro delimitador del objeto sólido sin márgenes vacíos
    let minPxX = workW, minPxY = workH, maxPxX = -1, maxPxY = -1;

    if (hasAlpha) {
      for (let y = 0; y < workH; y++) {
        const row = y * workW * 4;
        for (let x = 0; x < workW; x++) {
          if (workData[row + x * 4 + 3] > 60) {
            if (x < minPxX) minPxX = x;
            if (x > maxPxX) maxPxX = x;
            if (y < minPxY) minPxY = y;
            if (y > maxPxY) maxPxY = y;
          }
        }
      }
    } else {
      // Imagen sin canal alfa: estimar fondo a partir de las esquinas
      const corners = [0, (workW - 1) * 4, ((workH - 1) * workW) * 4, ((workH - 1) * workW + workW - 1) * 4];
      let bgLum = 0;
      for (let c of corners) {
        bgLum += 0.299 * workData[c] + 0.587 * workData[c + 1] + 0.114 * workData[c + 2];
      }
      bgLum /= 4.0;
      const isLightBg = bgLum > 128;
      const threshold = isLightBg ? Math.min(230, bgLum - 30) : Math.max(25, bgLum + 30);

      for (let y = 0; y < workH; y++) {
        const row = y * workW * 4;
        for (let x = 0; x < workW; x++) {
          const idx = row + x * 4;
          const lum = 0.299 * workData[idx] + 0.587 * workData[idx + 1] + 0.114 * workData[idx + 2];
          const isFg = isLightBg ? (lum < threshold) : (lum > threshold);
          if (isFg) {
            if (x < minPxX) minPxX = x;
            if (x > maxPxX) maxPxX = x;
            if (y < minPxY) minPxY = y;
            if (y > maxPxY) maxPxY = y;
          }
        }
      }
    }

    if (maxPxX < minPxX || maxPxY < minPxY) {
      throw new Error('No se detectó una figura o contenido sólido contrastante en la imagen.');
    }

    // Margen de seguridad de 2px
    minPxX = Math.max(0, minPxX - 2);
    minPxY = Math.max(0, minPxY - 2);
    maxPxX = Math.min(workW - 1, maxPxX + 2);
    maxPxY = Math.min(workH - 1, maxPxY + 2);

    const cropW = maxPxX - minPxX + 1;
    const cropH = maxPxY - minPxY + 1;

    // Crear lienzo con la figura perfectamente ajustada y recortada
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropW;
    croppedCanvas.height = cropH;
    const croppedCtx = croppedCanvas.getContext('2d');
    croppedCtx.drawImage(workCanvas, minPxX, minPxY, cropW, cropH, 0, 0, cropW, cropH);

    const croppedImgData = croppedCtx.getImageData(0, 0, cropW, cropH);
    const cropData = croppedImgData.data;

    // 2. Análisis estético del contenido (para preservar líneas de planos técnicos y adaptar fondos sin ruido visual)
    let opaqueCount = 0;
    let sumLum = 0;
    let darkPixelCount = 0;
    let maxSaturation = 0;

    for (let i = 0; i < cropData.length; i += 4) {
      const a = cropData[i + 3];
      if (a > 60) {
        opaqueCount++;
        const r = cropData[i];
        const g = cropData[i + 1];
        const b = cropData[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        sumLum += lum;
        if (lum < 110) darkPixelCount++;
        const sat = Math.max(r, g, b) - Math.min(r, g, b);
        if (sat > maxSaturation) maxSaturation = sat;
      }
    }

    const avgLum = opaqueCount > 0 ? (sumLum / opaqueCount) : 128;
    const isGrayscaleLineDrawing = (maxSaturation < 45);
    const hasLightBodyWithLines = isGrayscaleLineDrawing && (avgLum > 100) && (darkPixelCount > 0);

    // 3. Generación de lienzos temáticos pre-renderizados
    // Las zonas sólidas no interactivas se tiñen acordes a la vista (#0f172a en CFD, #000000 en DES/LES)
    // Las líneas originales del dibujo PNG se mantienen con máximo contraste y fidelidad visual.
    function createThemedCanvas(bodyRGB, lineRGB) {
      const c = document.createElement('canvas');
      c.width = cropW;
      c.height = cropH;
      const ctx = c.getContext('2d');
      const outImgData = ctx.createImageData(cropW, cropH);
      const out = outImgData.data;

      for (let i = 0; i < cropData.length; i += 4) {
        const a = cropData[i + 3];
        if (a <= 40) {
          out[i + 3] = 0;
          continue;
        }

        const r = cropData[i];
        const g = cropData[i + 1];
        const b = cropData[i + 2];
        const lumNorm = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;

        if (hasLightBodyWithLines) {
          // Separación de cuerpo y líneas técnicas originales
          const lineWeight = Math.pow(Math.max(0.0, Math.min(1.0, 1.0 - lumNorm)), 0.85);
          const bodyWeight = 1.0 - lineWeight;

          out[i] = Math.round(bodyRGB[0] * bodyWeight + lineRGB[0] * lineWeight);
          out[i + 1] = Math.round(bodyRGB[1] * bodyWeight + lineRGB[1] * lineWeight);
          out[i + 2] = Math.round(bodyRGB[2] * bodyWeight + lineRGB[2] * lineWeight);
          out[i + 3] = a;
        } else if (isGrayscaleLineDrawing && avgLum <= 100) {
          // Líneas claras sobre fondo oscuro
          const lineWeight = Math.pow(Math.max(0.0, Math.min(1.0, lumNorm)), 0.85);
          const bodyWeight = 1.0 - lineWeight;

          out[i] = Math.round(bodyRGB[0] * bodyWeight + lineRGB[0] * lineWeight);
          out[i + 1] = Math.round(bodyRGB[1] * bodyWeight + lineRGB[1] * lineWeight);
          out[i + 2] = Math.round(bodyRGB[2] * bodyWeight + lineRGB[2] * lineWeight);
          out[i + 3] = a;
        } else {
          // Imagen con colores propios: conservar los colores originales
          out[i] = r;
          out[i + 1] = g;
          out[i + 2] = b;
          out[i + 3] = a;
        }
      }

      ctx.putImageData(outImgData, 0, 0);
      return c;
    }

    const themedCanvases = {
      cfd: createThemedCanvas([15, 23, 42], [0, 229, 255]),
      cfd_selected: createThemedCanvas([15, 23, 42], [0, 229, 255]),
      des_les: createThemedCanvas([0, 0, 0], [0, 229, 255]),
      des_les_selected: createThemedCanvas([0, 0, 0], [0, 229, 255])
    };

    // 4. Crear máscara binaria de colisión de alta resolución para fluidos y containsPoint
    const maskTargetW = Math.min(cropW, 800);
    const maskTargetH = Math.max(10, Math.round((cropH * maskTargetW) / cropW));
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = maskTargetW;
    maskCanvas.height = maskTargetH;
    const maskCtx = maskCanvas.getContext('2d');
    maskCtx.drawImage(croppedCanvas, 0, 0, maskTargetW, maskTargetH);
    const maskImgData = maskCtx.getImageData(0, 0, maskTargetW, maskTargetH);
    const mData = maskImgData.data;

    const collisionMask = new Uint8Array(maskTargetW * maskTargetH);
    for (let y = 0; y < maskTargetH; y++) {
      const rowSrc = y * maskTargetW * 4;
      const rowDst = y * maskTargetW;
      for (let x = 0; x < maskTargetW; x++) {
        if (mData[rowSrc + x * 4 + 3] > 70) {
          collisionMask[rowDst + x] = 1;
        }
      }
    }

    // 5. Extraer contornos simplificados para límites físicos y tiradores
    const marchW = Math.min(240, maskTargetW);
    const marchH = Math.max(10, Math.round((maskTargetH * marchW) / maskTargetW));
    const marchCanvas = document.createElement('canvas');
    marchCanvas.width = marchW;
    marchCanvas.height = marchH;
    const marchCtx = marchCanvas.getContext('2d');
    marchCtx.drawImage(croppedCanvas, 0, 0, marchW, marchH);
    const marchImgData = marchCtx.getImageData(0, 0, marchW, marchH);
    const marchData = marchImgData.data;

    const pw = marchW + 2;
    const ph = marchH + 2;
    const padMask = new Uint8Array(pw * ph);
    for (let y = 0; y < marchH; y++) {
      const rSrc = y * marchW * 4;
      const rDst = (y + 1) * pw;
      for (let x = 0; x < marchW; x++) {
        if (marchData[rSrc + x * 4 + 3] > 70) {
          padMask[rDst + (x + 1)] = 1;
        }
      }
    }

    const rawLoops = ImageContourTracer.extractAllMarchingLoops(padMask, pw, ph);
    let simplifiedLoops = [];
    if (rawLoops && rawLoops.length > 0) {
      simplifiedLoops = rawLoops.map(loop => {
        const closed = ImageContourTracer.simplifyDouglasPeucker(loop.concat([loop[0]]), 1.25);
        return closed.slice(0, -1);
      }).filter(loop => loop.length >= 3);
    }

    // Dimensiones en el espacio mundial virtual
    const aspect = cropW / cropH;
    let worldW, worldH;
    if (aspect >= 1.0) {
      worldW = targetWidth; // ej: ~3.8 metros
      worldH = Math.min(5.2, worldW / aspect);
    } else {
      worldH = Math.min(4.2, targetWidth / aspect);
      worldW = worldH * aspect;
    }

    let worldLoops = [];
    if (simplifiedLoops.length > 0) {
      let minLX = Infinity, minLY = Infinity, maxLX = -Infinity, maxLY = -Infinity;
      for (let l = 0; l < simplifiedLoops.length; l++) {
        const loop = simplifiedLoops[l];
        for (let i = 0; i < loop.length; i++) {
          const pt = loop[i];
          if (pt[0] < minLX) minLX = pt[0];
          if (pt[1] < minLY) minLY = pt[1];
          if (pt[0] > maxLX) maxLX = pt[0];
          if (pt[1] > maxLY) maxLY = pt[1];
        }
      }
      const scaleX = worldW / Math.max(1, maxLX - minLX);
      const scaleY = worldH / Math.max(1, maxLY - minLY);
      const clx = (minLX + maxLX) / 2.0;
      const cly = (minLY + maxLY) / 2.0;

      worldLoops = simplifiedLoops.map(loop => {
        return loop.map(pt => [
          targetCenter[0] + (pt[0] - clx) * scaleX,
          targetCenter[1] + (pt[1] - cly) * scaleY
        ]);
      });
    } else {
      const hw = worldW / 2.0;
      const hh = worldH / 2.0;
      worldLoops = [[
        [targetCenter[0] - hw, targetCenter[1] - hh],
        [targetCenter[0] + hw, targetCenter[1] - hh],
        [targetCenter[0] + hw, targetCenter[1] + hh],
        [targetCenter[0] - hw, targetCenter[1] + hh]
      ]];
    }

    const baseName = filename.replace(/\.[^/.]+$/, '').substring(0, 24);
    return {
      name: `Figura: ${baseName}`,
      loops: worldLoops,
      points: worldLoops[0],
      imageThemedCanvases: themedCanvases,
      imageCroppedCanvas: croppedCanvas,
      imageWorldWidth: worldW,
      imageWorldHeight: worldH,
      imageCenter: [targetCenter[0], targetCenter[1]],
      imageMask: collisionMask,
      imageMaskW: maskTargetW,
      imageMaskH: maskTargetH
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

// Pre-cargar e indexar la plantilla de alta resolución para la figura del bólido (resources/bolido.png)
HydrodynamicObstacle._bolidoTemplate = null;
HydrodynamicObstacle._initBolidoTemplate = function() {
  if (typeof Image === 'undefined') return;
  const bolidoImg = new Image();
  bolidoImg.onload = () => {
    try {
      HydrodynamicObstacle._bolidoTemplate = ImageContourTracer.traceImage(bolidoImg, 'Bólido', 4.6, [6.0, 4.5]);
    } catch (err) {
      console.warn('Error indexando plantilla de bólido:', err);
    }
  };
  const src = (typeof window !== 'undefined' && window.BOLIDO_IMAGE_SRC) ? window.BOLIDO_IMAGE_SRC : 'resources/bolido.png';
  bolidoImg.src = src;
};

HydrodynamicObstacle._initBolidoTemplate();
