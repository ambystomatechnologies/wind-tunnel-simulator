/**
 * Simulador de Mecánica de Fluidos y Túnel Aerodinámico 2D - Ambystoma Technologies
 * canvas.js - Controlador Interactivo de Lienzo HTML5 Canvas, Renderizado CFD a 60 FPS y Manipulación de Nodos
 */

const CanvasMode = {
  SELECT: 0,
  NODE_EDIT: 1,
  DRAW_FREEHAND: 2,
  DRAW_POLYGON: 3,
  PAN: 4,
  PROBE: 5
};

const VisMode = {
  SMOKE: 'smoke',
  PRESSURE: 'pressure',
  VELOCITY: 'velocity',
  VORTICITY: 'vorticity',
  PARTICLES: 'particles',
  VECTORS: 'vectors',
  SCHROEDER_CURL: 'schroeder_curl',
  SCHROEDER_SPEED: 'schroeder_speed',
  SCHROEDER_FLOWLINES: 'schroeder_flowlines'
};

class FluidCanvasController {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d', { alpha: false });

    // Instancia del Motor Navier-Stokes y del Motor Lattice-Boltzmann D2Q9 (Schroeder)
    this.domainWidth = 16.0; // Metros virtuales en el túnel
    this.fluid = new FluidField(160, 90, this.domainWidth);
    this.lbm = new LatticeBoltzmannEngine(200, 100);
    this.isLBMMode = false;
    this.showLBMFlowlines = false;
    this.showLBMTracers = false;
    this.showLBMForces = true;

    // Búfer offscreen para Lattice-Boltzmann
    this.lbmOffscreenCanvas = document.createElement('canvas');
    this.lbmOffscreenCanvas.width = this.lbm.nx;
    this.lbmOffscreenCanvas.height = this.lbm.ny;
    this.lbmOffscreenCtx = this.lbmOffscreenCanvas.getContext('2d');
    this.lbmPixelBuffer = this.lbmOffscreenCtx.createImageData(this.lbm.nx, this.lbm.ny);

    // Lista de elementos de la escena
    this.elements = [];
    this.selectedElement = null;
    this.selectedNodeIdx = -1;

    // Modo interactivo
    this.mode = CanvasMode.SELECT;
    this.visMode = VisMode.SMOKE;

    // Vista, Zoom y Pan
    this.zoomLevel = 1.0;
    this.panOffset = { x: 0, y: 0 };
    this.isPanning = false;
    this.lastMousePos = { x: 0, y: 0 };

    // Arrastre, rotación y redimensionamiento de figuras tirando de los bordes
    this.isDraggingElement = false;
    this.dragStartWorld = [0, 0];
    this.dragStartElemPos = null;
    this.isRotating = false;
    this.rotateStartAngle = 0;
    this.elemStartRotDeg = 0;
    this.isResizing = false;
    this.resizeHandle = null;
    this.resizeStartWorld = [0, 0];
    this.resizeInitialPoints = null;
    this.resizeInitialLoops = null;
    this.resizeInitialAABB = null;

    // Búferes de dibujo a mano alzada y polígonos
    this.drawPoints = [];
    this.isDrawing = false;

    // Configuración visual
    this.showGrid = true;
    this.showForces = true;
    this.showStreamlines = true;
    this.showTelemetry = true;
    this.showParticles = true; // Habilitado por default para Humo y Líneas de Corriente
    this.simSpeedMultiplier = 1.0;
    this.isPaused = false;

    // Búfer de píxeles para renderizado acelerado de fluidos
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.fluid.nx;
    this.offscreenCanvas.height = this.fluid.ny;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d');
    this.pixelBuffer = this.offscreenCtx.createImageData(this.fluid.nx, this.fluid.ny);
    this.pixelData = new Uint32Array(this.pixelBuffer.data.buffer);

    // Callbacks hacia la interfaz
    this.onElementSelected = null;
    this.onSceneChanged = null;
    this.onCoordsChanged = null;
    this.onModeChanged = null;
    this.onTelemetryUpdate = null;

    // Inicializar eventos, tamaño y bucle
    this.initEvents();
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.lastTime = performance.now();
    this.renderLoop();
  }

  resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width || this.canvas.clientWidth || 800;
    this.height = rect.height || this.canvas.clientHeight || 600;

    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.resetView();
  }

  getFitZoom() {
    const w = this.width || 800;
    const h = this.height || 600;
    const zw = w / this.fluid.domainWidth;
    const zh = h / this.fluid.domainHeight;
    return Math.min(zw, zh);
  }

  clampPanOffset() {
    const minZoom = this.getFitZoom();
    if (this.zoomLevel <= minZoom + 0.001) {
      this.zoomLevel = minZoom;
      this.panOffset.x = (this.width - this.fluid.domainWidth * this.zoomLevel) / 2.0;
      this.panOffset.y = (this.height - this.fluid.domainHeight * this.zoomLevel) / 2.0;
      return;
    }
    const domainW = this.fluid.domainWidth * this.zoomLevel;
    const domainH = this.fluid.domainHeight * this.zoomLevel;
    if (domainW >= this.width) {
      this.panOffset.x = Math.min(0, Math.max(this.width - domainW, this.panOffset.x));
    } else {
      this.panOffset.x = (this.width - domainW) / 2.0;
    }
    if (domainH >= this.height) {
      this.panOffset.y = Math.min(0, Math.max(this.height - domainH, this.panOffset.y));
    } else {
      this.panOffset.y = (this.height - domainH) / 2.0;
    }
  }

  resetView() {
    const w = this.width || 800;
    const h = this.height || 600;
    this.zoomLevel = this.getFitZoom();
    this.panOffset.x = (w - this.fluid.domainWidth * this.zoomLevel) / 2.0;
    this.panOffset.y = (h - this.fluid.domainHeight * this.zoomLevel) / 2.0;
  }

  stepOnce() {
    if (this.isLBMMode) {
      this.lbm.step(4);
    } else {
      const subDt = 0.015 * this.simSpeedMultiplier;
      this.fluid.step(subDt);
    }
  }

  // --- CONVERSIÓN DE COORDENADAS ---
  worldToScreen(wx, wy) {
    const sx = (wx * this.zoomLevel) + this.panOffset.x;
    const sy = (wy * this.zoomLevel) + this.panOffset.y;
    return { x: sx, y: sy };
  }

  screenToWorld(sx, sy) {
    const wx = (sx - this.panOffset.x) / this.zoomLevel;
    const wy = (sy - this.panOffset.y) / this.zoomLevel;
    return [wx, wy];
  }

  setGridResolution(nx, ny) {
    const oldObs = this.elements;
    this.fluid = new FluidField(nx, ny, this.domainWidth);
    this.offscreenCanvas.width = nx;
    this.offscreenCanvas.height = ny;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d');
    this.pixelBuffer = this.offscreenCtx.createImageData(nx, ny);
    this.pixelData = new Uint32Array(this.pixelBuffer.data.buffer);
    this.fluid.rasterizeObstacles(this.elements);
  }

  addElement(element) {
    this.elements.push(element);
    this.selectElement(element);
    this.fluid.rasterizeObstacles(this.elements);
    this.lbm.rasterizeObstacles(this.elements, this.fluid.domainWidth, this.fluid.domainHeight);
    if (this.onSceneChanged) this.onSceneChanged();
  }

  removeElement(element) {
    const idx = this.elements.indexOf(element);
    if (idx !== -1) {
      this.elements.splice(idx, 1);
      if (this.selectedElement === element) {
        this.selectElement(this.elements.length > 0 ? this.elements[0] : null);
      }
      this.fluid.rasterizeObstacles(this.elements);
      this.lbm.rasterizeObstacles(this.elements, this.fluid.domainWidth, this.fluid.domainHeight);
      if (this.onSceneChanged) this.onSceneChanged();
    }
  }

  clearScene() {
    this.elements = [];
    this.selectedElement = null;
    this.selectedNodeIdx = -1;
    this.fluid.rasterizeObstacles(this.elements);
    this.fluid.resetFlow();
    if (this.lbm) {
      this.lbm.barrier.fill(0);
      this.lbm.initFluid();
    }
    if (this.onSceneChanged) this.onSceneChanged();
  }

  selectElement(element) {
    this.elements.forEach(e => e.isSelected = false);
    this.selectedElement = element;
    if (element) {
      element.isSelected = true;
    }
    this.selectedNodeIdx = -1;
    if (this.onElementSelected) this.onElementSelected(element);
  }

  setMode(mode) {
    this.mode = mode;
    this.selectedNodeIdx = -1;
    this.drawPoints = [];
    this.isDrawing = false;
    if (this.onModeChanged) this.onModeChanged(mode);
  }

  setVisMode(visMode) {
    this.visMode = visMode;
    this.isLBMMode = (
      visMode === VisMode.SCHROEDER_CURL ||
      visMode === VisMode.SCHROEDER_SPEED ||
      visMode === VisMode.SCHROEDER_FLOWLINES
    );
    if (this.isLBMMode) {
      this.lbm.rasterizeObstacles(this.elements, this.fluid.domainWidth, this.fluid.domainHeight);
    }
  }

  findClosestNode(worldPos, maxDistPixels = 18.0) {
    const threshold = maxDistPixels / this.zoomLevel;
    let closestElem = null;
    let closestIdx = -1;
    let minD = Infinity;

    const list = this.selectedElement ? [this.selectedElement] : this.elements;
    for (let elem of list) {
      if (!(elem instanceof HydrodynamicObstacle)) continue;
      for (let i = 0; i < elem.controlPoints.length; i++) {
        const pt = elem.controlPoints[i];
        const d = Math.hypot(pt[0] - worldPos[0], pt[1] - worldPos[1]);
        if (d < threshold && d < minD) {
          minD = d;
          closestElem = elem;
          closestIdx = i;
        }
      }
    }
    return { element: closestElem, nodeIdx: closestIdx };
  }

  findObstacleAt(worldPos) {
    // Probar primero el seleccionado
    if (this.selectedElement && this.selectedElement.containsPoint(worldPos[0], worldPos[1])) {
      return this.selectedElement;
    }
    // Probar el resto en orden inverso de profundidad
    for (let i = this.elements.length - 1; i >= 0; i--) {
      if (this.elements[i].containsPoint(worldPos[0], worldPos[1])) {
        return this.elements[i];
      }
    }
    return null;
  }

  // --- VERIFICACIÓN DE DISPOSITIVO MÓVIL Y PERMISOS DE TRANSFORMACIÓN ---
  isMobileDevice() {
    const uaCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const touchScreenCheck = (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) && (window.innerWidth <= 1024 || window.innerHeight <= 1024);
    const coarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    return Boolean(uaCheck || touchScreenCheck || coarsePointer || window.innerHeight <= 620 || window.innerWidth <= 950);
  }

  canResizeElement(elem) {
    if (!elem || !(elem instanceof HydrodynamicObstacle)) return false;
    // En computadoras de escritorio, se mantiene el redimensionamiento completo para todas las figuras
    if (!this.isMobileDevice()) return true;
    // En la versión optimizada para celulares, el redimensionamiento SOLO se habilitará
    // para imágenes importadas (PNG o SVG). Las figuras por default solo se podrán girar y mover.
    return Boolean(elem.isImportedImage || (elem.loops && elem.loops.length > 0) || (elem.name && elem.name.startsWith('Figura:')));
  }

  isRotationHandleAt(screenX, screenY, worldPos = null) {
    if (this.mode !== CanvasMode.SELECT || !this.selectedElement || !(this.selectedElement instanceof HydrodynamicObstacle)) {
      return false;
    }
    const isMobile = this.isMobileDevice();
    const centroid = this.selectedElement.getCentroid();
    const sCentroid = this.worldToScreen(centroid[0], centroid[1]);
    const dToCentroid = Math.hypot(screenX - sCentroid.x, screenY - sCentroid.y);
    const ringRadius = (this.selectedElement.getReferenceLength() * 0.7 * this.zoomLevel) + 26;

    // 1. Tirador circular knob específico de rotación
    const angleRad = (this.selectedElement.currentRotationDeg * Math.PI) / 180.0;
    const hx = sCentroid.x + ringRadius * Math.cos(angleRad);
    const hy = sCentroid.y + ringRadius * Math.sin(angleRad);
    const knobHitDist = isMobile ? 36 : 16;
    if (Math.hypot(screenX - hx, screenY - hy) <= knobHitDist) {
      return true;
    }

    // 2. Anillo circular de rotación
    // Si el toque/clic cae directamente dentro del cuerpo físico del obstáculo, se prioriza mover/arrastrar,
    // a menos que se haya presionado el knob de rotación.
    const isInsideBody = worldPos && this.selectedElement.containsPoint(worldPos[0], worldPos[1]);
    if (!isInsideBody) {
      const ringTolerance = isMobile ? 26 : 14;
      if (Math.abs(dToCentroid - ringRadius) <= ringTolerance) {
        return true;
      }
    }

    return false;
  }

  // --- REDIMENSIONAMIENTO DE OBSTÁCULOS TIRANDO DE LOS BORDES ---
  getResizeHandleAt(screenX, screenY) {
    if (this.mode !== CanvasMode.SELECT || !this.selectedElement || !(this.selectedElement instanceof HydrodynamicObstacle)) {
      return null;
    }

    // En móviles, solo se redimensionan imágenes importadas (PNG o SVG).
    // Las figuras por default del simulador solo se rotan y mueven.
    if (!this.canResizeElement(this.selectedElement)) {
      return null;
    }

    const aabb = this.selectedElement.getAABB();
    if (!aabb) return null;

    const p0 = this.worldToScreen(aabb[0], aabb[1]);
    const p1 = this.worldToScreen(aabb[2], aabb[3]);

    const left = Math.min(p0.x, p1.x);
    const right = Math.max(p0.x, p1.x);
    const top = Math.min(p0.y, p1.y);
    const bottom = Math.max(p0.y, p1.y);

    const isMobile = this.isMobileDevice();
    const cornerHitR = isMobile ? 20 : 12; // Radio en px para esquinas
    const edgeHitR = isMobile ? 16 : 10;   // Radio para tiradores de borde
    const borderHitDist = isMobile ? 12 : 7; // Tolerancia para agarrar los bordes

    // 1. Esquinas (prioridad alta)
    if (Math.hypot(screenX - left, screenY - top) <= cornerHitR) return 'nw';
    if (Math.hypot(screenX - right, screenY - top) <= cornerHitR) return 'ne';
    if (Math.hypot(screenX - right, screenY - bottom) <= cornerHitR) return 'se';
    if (Math.hypot(screenX - left, screenY - bottom) <= cornerHitR) return 'sw';

    // 2. Tiradores centrales de cada borde
    const midX = (left + right) / 2.0;
    const midY = (top + bottom) / 2.0;
    if (Math.hypot(screenX - midX, screenY - top) <= edgeHitR) return 'n';
    if (Math.hypot(screenX - midX, screenY - bottom) <= edgeHitR) return 's';
    if (Math.hypot(screenX - left, screenY - midY) <= edgeHitR) return 'w';
    if (Math.hypot(screenX - right, screenY - midY) <= edgeHitR) return 'e';

    // 3. Agarre directo en las líneas de los bordes
    if (Math.abs(screenY - top) <= borderHitDist && screenX >= left && screenX <= right) return 'n';
    if (Math.abs(screenY - bottom) <= borderHitDist && screenX >= left && screenX <= right) return 's';
    if (Math.abs(screenX - left) <= borderHitDist && screenY >= top && screenY <= bottom) return 'w';
    if (Math.abs(screenX - right) <= borderHitDist && screenY >= top && screenY <= bottom) return 'e';

    return null;
  }

  getResizeCursor(handle) {
    switch (handle) {
      case 'nw':
      case 'se':
        return 'nwse-resize';
      case 'ne':
      case 'sw':
        return 'nesw-resize';
      case 'n':
      case 's':
        return 'ns-resize';
      case 'w':
      case 'e':
        return 'ew-resize';
      default:
        return 'default';
    }
  }

  applyResize(worldPos) {
    if (!this.selectedElement || !this.resizeInitialAABB) return;

    const aabb = this.resizeInitialAABB;
    const w0 = Math.max(0.1, aabb[2] - aabb[0]);
    const h0 = Math.max(0.1, aabb[3] - aabb[1]);
    const handle = this.resizeHandle;

    const transformPt = (op) => {
      let nx = op[0];
      let ny = op[1];

      if (handle === 'e') {
        const newW = Math.max(0.25, worldPos[0] - aabb[0]);
        nx = aabb[0] + (op[0] - aabb[0]) * (newW / w0);
      } else if (handle === 'w') {
        const newW = Math.max(0.25, aabb[2] - worldPos[0]);
        nx = aabb[2] - (aabb[2] - op[0]) * (newW / w0);
      } else if (handle === 's') {
        const newH = Math.max(0.25, worldPos[1] - aabb[1]);
        ny = aabb[1] + (op[1] - aabb[1]) * (newH / h0);
      } else if (handle === 'n') {
        const newH = Math.max(0.25, aabb[3] - worldPos[1]);
        ny = aabb[3] - (aabb[3] - op[1]) * (newH / h0);
      } else if (handle === 'se') {
        const s = Math.max(Math.max(0.25, worldPos[0] - aabb[0]) / w0, Math.max(0.25, worldPos[1] - aabb[1]) / h0);
        nx = aabb[0] + (op[0] - aabb[0]) * s;
        ny = aabb[1] + (op[1] - aabb[1]) * s;
      } else if (handle === 'sw') {
        const s = Math.max(Math.max(0.25, aabb[2] - worldPos[0]) / w0, Math.max(0.25, worldPos[1] - aabb[1]) / h0);
        nx = aabb[2] - (aabb[2] - op[0]) * s;
        ny = aabb[1] + (op[1] - aabb[1]) * s;
      } else if (handle === 'ne') {
        const s = Math.max(Math.max(0.25, worldPos[0] - aabb[0]) / w0, Math.max(0.25, worldPos[1] - aabb[1]) / h0);
        nx = aabb[0] + (op[0] - aabb[0]) * s;
        ny = aabb[3] - (aabb[3] - op[1]) * s;
      } else if (handle === 'nw') {
        const s = Math.max(Math.max(0.25, aabb[2] - worldPos[0]) / w0, Math.max(0.25, worldPos[1] - aabb[1]) / h0);
        nx = aabb[2] - (aabb[2] - op[0]) * s;
        ny = aabb[3] - (aabb[3] - op[1]) * s;
      }

      return [nx, ny];
    };

    if (this.selectedElement.loops && this.resizeInitialLoops) {
      for (let l = 0; l < this.resizeInitialLoops.length; l++) {
        const origLoop = this.resizeInitialLoops[l];
        const loop = this.selectedElement.loops[l];
        for (let i = 0; i < origLoop.length; i++) {
          const [nx, ny] = transformPt(origLoop[i]);
          loop[i][0] = nx;
          loop[i][1] = ny;
        }
      }
    }

    if (this.resizeInitialPoints) {
      const pts = this.selectedElement.controlPoints;
      for (let i = 0; i < this.resizeInitialPoints.length; i++) {
        const [nx, ny] = transformPt(this.resizeInitialPoints[i]);
        pts[i][0] = nx;
        pts[i][1] = ny;
      }
    }

    this.selectedElement.invalidateCache();
    this.fluid.rasterizeObstacles(this.elements);
    this.lbm.rasterizeObstacles(this.elements, this.fluid.domainWidth, this.fluid.domainHeight);
    if (this.onSceneChanged) this.onSceneChanged();
  }

  // --- EVENTOS DE INTERACCIÓN (MOUSE & TOUCH) ---
  initEvents() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    // MOUSE DOWN
    this.canvas.addEventListener('mousedown', (e) => {
      const pos = getPos(e);
      const worldPos = this.screenToWorld(pos.x, pos.y);
      this.lastMousePos = pos;

      // Botón central o barra espaciadora para mover lienzo
      if (e.button === 1 || this.mode === CanvasMode.PAN || (e.button === 0 && e.altKey)) {
        this.isPanning = true;
        this.canvas.style.cursor = 'grabbing';
        return;
      }

      if (e.button !== 0) return;

      if (this.mode === CanvasMode.SELECT) {
        // 1. Comprobar si hace clic en un tirador o borde de redimensionamiento
        const resizeHandle = this.getResizeHandleAt(pos.x, pos.y);
        if (resizeHandle && this.selectedElement) {
          this.isResizing = true;
          this.resizeHandle = resizeHandle;
          this.resizeStartWorld = [worldPos[0], worldPos[1]];
          this.resizeInitialPoints = this.selectedElement.controlPoints.map(p => [p[0], p[1]]);
          this.resizeInitialLoops = this.selectedElement.loops ? this.selectedElement.loops.map(l => l.map(p => [p[0], p[1]])) : null;
          this.resizeInitialAABB = [...this.selectedElement.getAABB()];
          return;
        }

        // 2. Comprobar si hace clic en el anillo o tirador de rotación del elemento seleccionado
        if (this.selectedElement && this.selectedElement instanceof HydrodynamicObstacle) {
          if (this.isRotationHandleAt(pos.x, pos.y, worldPos)) {
            const centroid = this.selectedElement.getCentroid();
            this.isRotating = true;
            this.rotateStartAngle = Math.atan2(worldPos[1] - centroid[1], worldPos[0] - centroid[0]);
            this.elemStartRotDeg = this.selectedElement.currentRotationDeg;
            return;
          }
        }

        const hit = this.findObstacleAt(worldPos);
        if (hit) {
          this.selectElement(hit);
          this.isDraggingElement = true;
          this.dragStartWorld = worldPos;
          this.dragStartElemPos = hit.getCentroid();
        } else {
          this.selectElement(null);
        }
      } else if (this.mode === CanvasMode.NODE_EDIT) {
        const found = this.findClosestNode(worldPos);
        if (found.element && found.nodeIdx !== -1) {
          this.selectElement(found.element);
          this.selectedNodeIdx = found.nodeIdx;
          this.isDraggingElement = true;
        } else {
          const hit = this.findObstacleAt(worldPos);
          if (hit) {
            this.selectElement(hit);
          }
        }
      } else if (this.mode === CanvasMode.DRAW_FREEHAND) {
        this.isDrawing = true;
        this.drawPoints = [worldPos];
      } else if (this.mode === CanvasMode.DRAW_POLYGON) {
        this.drawPoints.push(worldPos);
        if (this.onSceneChanged) this.onSceneChanged();
      } else if (this.mode === CanvasMode.PROBE) {
        const probe = new FlowProbe(worldPos[0], worldPos[1], `Sensor ${this.elements.length + 1}`);
        this.addElement(probe);
        this.setMode(CanvasMode.SELECT);
      }
    });

    // MOUSE MOVE
    window.addEventListener('mousemove', (e) => {
      const pos = getPos(e);
      const worldPos = this.screenToWorld(pos.x, pos.y);
      const dx = pos.x - this.lastMousePos.x;
      const dy = pos.y - this.lastMousePos.y;
      this.lastMousePos = pos;

      if (this.onCoordsChanged) {
        this.onCoordsChanged(worldPos[0], worldPos[1]);
      }

      if (this.isPanning) {
        this.panOffset.x += dx;
        this.panOffset.y += dy;
        return;
      }

      if (this.isResizing && this.selectedElement) {
        this.applyResize(worldPos);
        return;
      }

      if (this.isRotating && this.selectedElement) {
        const centroid = this.selectedElement.getCentroid();
        const currentAngle = Math.atan2(worldPos[1] - centroid[1], worldPos[0] - centroid[0]);
        const deltaAngle = currentAngle - this.rotateStartAngle;
        const newDeg = (this.elemStartRotDeg + (deltaAngle * 180.0 / Math.PI)) % 360.0;
        this.selectedElement.setAbsoluteRotation(newDeg < 0 ? newDeg + 360 : newDeg);
        this.fluid.rasterizeObstacles(this.elements);
        this.lbm.rasterizeObstacles(this.elements, this.fluid.domainWidth, this.fluid.domainHeight);
        if (this.onSceneChanged) this.onSceneChanged();
        return;
      }

      if (this.isDraggingElement && this.selectedElement) {
        if (this.mode === CanvasMode.SELECT) {
          const wdx = dx / this.zoomLevel;
          const wdy = dy / this.zoomLevel;
          this.selectedElement.translate(wdx, wdy);
          this.fluid.rasterizeObstacles(this.elements);
          this.lbm.rasterizeObstacles(this.elements, this.fluid.domainWidth, this.fluid.domainHeight);
          if (this.onSceneChanged) this.onSceneChanged();
        } else if (this.mode === CanvasMode.NODE_EDIT && this.selectedNodeIdx >= 0) {
          const pts = this.selectedElement.controlPoints;
          pts[this.selectedNodeIdx][0] = worldPos[0];
          pts[this.selectedNodeIdx][1] = worldPos[1];
          this.selectedElement.invalidateCache();
          this.fluid.rasterizeObstacles(this.elements);
          this.lbm.rasterizeObstacles(this.elements, this.fluid.domainWidth, this.fluid.domainHeight);
          if (this.onSceneChanged) this.onSceneChanged();
        }
        return;
      }

      if (this.mode === CanvasMode.DRAW_FREEHAND && this.isDrawing) {
        const last = this.drawPoints[this.drawPoints.length - 1];
        if (!last || Math.hypot(worldPos[0] - last[0], worldPos[1] - last[1]) > 0.15) {
          this.drawPoints.push(worldPos);
        }
      }

      // Cursor inteligente
      if (this.mode === CanvasMode.SELECT) {
        const resizeHandle = this.getResizeHandleAt(pos.x, pos.y);
        if (resizeHandle) {
          this.canvas.style.cursor = this.getResizeCursor(resizeHandle);
          return;
        }

        if (this.selectedElement && this.selectedElement instanceof HydrodynamicObstacle) {
          if (this.isRotationHandleAt(pos.x, pos.y, worldPos)) {
            this.canvas.style.cursor = 'grab';
            return;
          }
        }
        const hit = this.findObstacleAt(worldPos);
        this.canvas.style.cursor = hit ? 'move' : 'default';
      } else if (this.mode === CanvasMode.NODE_EDIT) {
        const found = this.findClosestNode(worldPos);
        this.canvas.style.cursor = (found.element && found.nodeIdx !== -1) ? 'crosshair' : 'default';
      } else {
        this.canvas.style.cursor = 'crosshair';
      }
    });

    // MOUSE UP
    window.addEventListener('mouseup', () => {
      this.isPanning = false;
      this.isDraggingElement = false;
      this.isRotating = false;
      this.isResizing = false;
      this.resizeHandle = null;
      this.resizeInitialPoints = null;
      this.resizeInitialAABB = null;

      if (this.mode === CanvasMode.DRAW_FREEHAND && this.isDrawing) {
        this.isDrawing = false;
        if (this.drawPoints.length >= 4) {
          // Simplificar y cerrar el dibujo a mano en un obstáculo suave
          const obs = new HydrodynamicObstacle(this.drawPoints, `Custom Sculpt ${this.elements.length + 1}`, true);
          this.addElement(obs);
          this.setMode(CanvasMode.SELECT);
        }
        this.drawPoints = [];
      }
    });

    // ZOOM CON RUEDA DEL RATÓN
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const pos = getPos(e);
      const worldPos = this.screenToWorld(pos.x, pos.y);

      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
      const minZoom = this.getFitZoom();
      const newZoom = Math.max(minZoom, Math.min(220.0, this.zoomLevel * zoomFactor));

      if (newZoom <= minZoom + 0.001) {
        this.resetView();
        return;
      }

      this.panOffset.x = pos.x - worldPos[0] * newZoom;
      this.panOffset.y = pos.y - worldPos[1] * newZoom;
      this.zoomLevel = newZoom;
      this.clampPanOffset();
    }, { passive: false });

    // TOUCH SUPPORT (Móviles y Tablets)
    let touchDist0 = null;
    let touchZoom0 = null;

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const pos = { x: t.clientX - rect.left, y: t.clientY - rect.top };
        this.lastMousePos = pos;
        const worldPos = this.screenToWorld(pos.x, pos.y);

        if (this.mode === CanvasMode.SELECT) {
          // 1. Comprobar si toca el tirador circular o anillo de rotación del elemento seleccionado
          if (this.selectedElement && this.selectedElement instanceof HydrodynamicObstacle) {
            if (this.isRotationHandleAt(pos.x, pos.y, worldPos)) {
              const centroid = this.selectedElement.getCentroid();
              this.isRotating = true;
              this.rotateStartAngle = Math.atan2(worldPos[1] - centroid[1], worldPos[0] - centroid[0]);
              this.elemStartRotDeg = this.selectedElement.currentRotationDeg;
              return;
            }
          }

          // 2. Comprobar si toca un tirador de redimensionamiento (solo si está habilitado para el elemento)
          const resizeHandle = this.getResizeHandleAt(pos.x, pos.y);
          if (resizeHandle && this.selectedElement) {
            this.isResizing = true;
            this.resizeHandle = resizeHandle;
            this.resizeStartWorld = [worldPos[0], worldPos[1]];
            this.resizeInitialPoints = this.selectedElement.controlPoints.map(p => [p[0], p[1]]);
            this.resizeInitialLoops = this.selectedElement.loops ? this.selectedElement.loops.map(l => l.map(p => [p[0], p[1]])) : null;
            this.resizeInitialAABB = [...this.selectedElement.getAABB()];
            return;
          }

          // 3. Comprobar si toca una figura para moverla
          const hit = this.findObstacleAt(worldPos);
          if (hit) {
            this.selectElement(hit);
            this.isDraggingElement = true;
            this.dragStartWorld = worldPos;
            this.dragStartElemPos = hit.getCentroid();
          } else {
            // Tocar espacio vacío deselecciona y activa paneo suave con 1 dedo
            this.selectElement(null);
            this.isPanning = true;
          }
        } else if (this.mode === CanvasMode.NODE_EDIT) {
          const found = this.findClosestNode(worldPos);
          if (found.element && found.nodeIdx !== -1) {
            this.selectElement(found.element);
            this.selectedNodeIdx = found.nodeIdx;
            this.isDraggingElement = true;
          } else {
            const hit = this.findObstacleAt(worldPos);
            if (hit) this.selectElement(hit);
          }
        } else if (this.mode === CanvasMode.DRAW_FREEHAND) {
          this.isDrawing = true;
          this.drawPoints = [worldPos];
        } else if (this.mode === CanvasMode.DRAW_POLYGON) {
          this.drawPoints.push(worldPos);
          if (this.onSceneChanged) this.onSceneChanged();
        } else if (this.mode === CanvasMode.PROBE) {
          const probe = new FlowProbe(worldPos[0], worldPos[1], `Sensor ${this.elements.length + 1}`);
          this.addElement(probe);
          this.setMode(CanvasMode.SELECT);
        }
      } else if (e.touches.length === 2) {
        this.isDraggingElement = false;
        this.isResizing = false;
        this.isRotating = false;
        this.isPanning = false;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        touchDist0 = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        touchZoom0 = this.zoomLevel;
      }
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const pos = { x: t.clientX - rect.left, y: t.clientY - rect.top };
        const worldPos = this.screenToWorld(pos.x, pos.y);
        const dx = pos.x - this.lastMousePos.x;
        const dy = pos.y - this.lastMousePos.y;
        this.lastMousePos = pos;

        if (this.onCoordsChanged) {
          this.onCoordsChanged(worldPos[0], worldPos[1]);
        }

        // Paneo con 1 dedo
        if (this.isPanning) {
          this.panOffset.x += dx;
          this.panOffset.y += dy;
          this.clampPanOffset();
          return;
        }

        // Redimensionamiento
        if (this.isResizing && this.selectedElement) {
          this.applyResize(worldPos);
          return;
        }

        // Rotación continua en tiempo real con 1 dedo
        if (this.isRotating && this.selectedElement) {
          const centroid = this.selectedElement.getCentroid();
          const currentAngle = Math.atan2(worldPos[1] - centroid[1], worldPos[0] - centroid[0]);
          const deltaAngle = currentAngle - this.rotateStartAngle;
          const newDeg = (this.elemStartRotDeg + (deltaAngle * 180.0 / Math.PI)) % 360.0;
          this.selectedElement.setAbsoluteRotation(newDeg < 0 ? newDeg + 360 : newDeg);
          this.fluid.rasterizeObstacles(this.elements);
          this.lbm.rasterizeObstacles(this.elements, this.fluid.domainWidth, this.fluid.domainHeight);
          if (this.onSceneChanged) this.onSceneChanged();
          return;
        }

        // Arrastre / Movimiento de la figura
        if (this.isDraggingElement && this.selectedElement) {
          if (this.mode === CanvasMode.SELECT) {
            const wdx = dx / this.zoomLevel;
            const wdy = dy / this.zoomLevel;
            this.selectedElement.translate(wdx, wdy);
            this.fluid.rasterizeObstacles(this.elements);
            this.lbm.rasterizeObstacles(this.elements, this.fluid.domainWidth, this.fluid.domainHeight);
            if (this.onSceneChanged) this.onSceneChanged();
          } else if (this.mode === CanvasMode.NODE_EDIT && this.selectedNodeIdx >= 0) {
            const pts = this.selectedElement.controlPoints;
            pts[this.selectedNodeIdx][0] = worldPos[0];
            pts[this.selectedNodeIdx][1] = worldPos[1];
            this.selectedElement.invalidateCache();
            this.fluid.rasterizeObstacles(this.elements);
            this.lbm.rasterizeObstacles(this.elements, this.fluid.domainWidth, this.fluid.domainHeight);
            if (this.onSceneChanged) this.onSceneChanged();
          }
          return;
        }

        if (this.mode === CanvasMode.DRAW_FREEHAND && this.isDrawing) {
          const last = this.drawPoints[this.drawPoints.length - 1];
          if (!last || Math.hypot(worldPos[0] - last[0], worldPos[1] - last[1]) > 0.15) {
            this.drawPoints.push(worldPos);
          }
        }
      } else if (e.touches.length === 2 && touchDist0) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const scale = dist / touchDist0;
        const minZoom = this.getFitZoom();
        const newZoom = Math.max(minZoom, Math.min(220.0, touchZoom0 * scale));
        if (newZoom <= minZoom + 0.001) {
          this.resetView();
        } else {
          this.zoomLevel = newZoom;
          this.clampPanOffset();
        }
      }
    }, { passive: true });

    const endTouch = () => {
      this.isPanning = false;
      this.isDraggingElement = false;
      this.isRotating = false;
      this.isResizing = false;
      this.resizeHandle = null;
      this.resizeInitialPoints = null;
      this.resizeInitialAABB = null;
      touchDist0 = null;

      if (this.mode === CanvasMode.DRAW_FREEHAND && this.isDrawing) {
        this.isDrawing = false;
        if (this.drawPoints.length >= 4) {
          const obs = new HydrodynamicObstacle(this.drawPoints, `Custom Sculpt ${this.elements.length + 1}`, true);
          this.addElement(obs);
          this.setMode(CanvasMode.SELECT);
        }
        this.drawPoints = [];
      }
    };

    this.canvas.addEventListener('touchend', endTouch);
    this.canvas.addEventListener('touchcancel', endTouch);
  }

  finishPolygon() {
    if (this.drawPoints.length >= 3) {
      const obs = new HydrodynamicObstacle(this.drawPoints, `Polygon ${this.elements.length + 1}`, false);
      this.addElement(obs);
      this.setMode(CanvasMode.SELECT);
    }
    this.drawPoints = [];
  }

  // --- BUCLE PRINCIPAL DE FÍSICA Y RENDERIZADO (60 FPS) ---
  renderLoop() {
    if (this.width <= 20 || this.height <= 20 || this.zoomLevel <= 5.0) {
      this.resizeCanvas();
    }

    const now = performance.now();
    let dt = (now - this.lastTime) / 1000.0;
    this.lastTime = now;
    if (dt > 0.05) dt = 0.03;

    if (!this.isPaused) {
      if (this.isLBMMode) {
        // En modo Lattice-Boltzmann D2Q9, corremos los pasos de colisión y streaming
        this.lbm.step();
      } else {
        // Sub-paso para estabilidad física y precisión aerodinámica en Navier-Stokes
        const steps = 2;
        const subDt = (dt * this.simSpeedMultiplier) / steps;
        for (let s = 0; s < steps; s++) {
          this.fluid.step(subDt);
        }
      }
    }

    this.render();

    // Actualizar telemetría hidrodinámica del elemento seleccionado o de la retícula LBM
    if (this.onTelemetryUpdate) {
      if (this.isLBMMode) {
        const uSpeed = Math.max(0.01, this.lbm.speed);
        const Re = Math.round((1.0 * uSpeed * 95) / Math.max(0.005, this.lbm.viscosity));
        const Fd = Math.abs(this.lbm.barrierFx);
        const Fl = this.lbm.barrierFy;
        const cd = Fd / (0.5 * uSpeed * uSpeed * 22.0 + 1e-5);
        const cl = Fl / (0.5 * uSpeed * uSpeed * 22.0 + 1e-5);
        const eff = Math.abs(cl) / (Math.abs(cd) + 1e-4);
        const name = this.selectedElement ? this.selectedElement.name : "Barrera LBM (Schroeder)";
        const aoa = this.selectedElement ? this.selectedElement.currentRotationDeg : 0;
        this.onTelemetryUpdate(this.selectedElement || { name, currentRotationDeg: aoa }, {
          dragForce: Fd,
          liftForce: Fl,
          cd: Math.min(9.9, cd),
          cl: Math.max(-9.9, Math.min(9.9, cl)),
          efficiency: Math.min(99.0, eff),
          reynolds: Re,
          pMax: Fd * 14.0,
          pMin: -Math.abs(Fl) * 14.0,
          isLBM: true,
          vortexPeriod: this.lbm.vortexPeriod
        });
      } else if (this.selectedElement) {
        const obsIdx = this.elements.indexOf(this.selectedElement);
        const metrics = this.fluid.calculateHydrodynamicForces(this.selectedElement, obsIdx);
        this.onTelemetryUpdate(this.selectedElement, metrics);
      }
    }

    requestAnimationFrame(() => this.renderLoop());
  }

  // --- RENDERIZADO VISUAL CFD / LBM ---
  render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Fondo oscuro profundo del túnel aerodinámico
    ctx.fillStyle = '#090b10';
    ctx.fillRect(0, 0, w, h);

    ctx.save();

    const origin = this.worldToScreen(0, 0);
    const domainPixelW = this.fluid.domainWidth * this.zoomLevel;
    const domainPixelH = this.fluid.domainHeight * this.zoomLevel;

    if (this.isLBMMode) {
      // 1. Renderizar campo Lattice-Boltzmann (Modelo y Modos de Visor por Dan Schroeder, Weber State University: https://physics.weber.edu/schroeder/fluids/)
      // Créditos adicionales: Graham Pullan (Cambridge), Thomas Pohl (LBA), Lukas Wagner (NDSU), Norbert Gonsalves & Sauro Succi.
      let plotType = 'curl';
      if (this.visMode === VisMode.SCHROEDER_SPEED) plotType = 'speed';
      else if (this.visMode === VisMode.SCHROEDER_FLOWLINES) plotType = 'curl';

      this.lbm.renderToImageData(this.lbmPixelBuffer, plotType);
      this.lbmOffscreenCtx.putImageData(this.lbmPixelBuffer, 0, 0);

      // Interpolación bilineal de alta calidad para eliminar pixelado y lograr gradientes HD suaves
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this.lbmOffscreenCanvas, origin.x, origin.y, domainPixelW, domainPixelH);

      // Líneas de flujo de Schroeder (sólo en modo específico de líneas o activación manual)
      if (this.visMode === VisMode.SCHROEDER_FLOWLINES || this.showLBMFlowlines) {
        const cellPixelW = domainPixelW / this.lbm.nx;
        const cellPixelH = domainPixelH / this.lbm.ny;
        this.lbm.drawFlowlines(ctx, origin, cellPixelW, cellPixelH);
      }

      // Trazadores de Schroeder (sólo si se activan explícitamente)
      if (this.showLBMTracers) {
        const cellPixelW = domainPixelW / this.lbm.nx;
        const cellPixelH = domainPixelH / this.lbm.ny;
        this.lbm.drawTracers(ctx, origin, cellPixelW, cellPixelH);
      }

      // Flecha de fuerza neta de Schroeder
      if (this.showLBMForces && this.showForces) {
        const cellPixelW = domainPixelW / this.lbm.nx;
        const cellPixelH = domainPixelH / this.lbm.ny;
        this.lbm.drawForceArrow(ctx, origin, cellPixelW, cellPixelH);
      }

      // Dibujar contornos de obstáculos si existen
      this.drawObstacles(ctx);
    } else {
      // 1. Renderizar campo Navier-Stokes habitual
      this.renderFluidField();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this.offscreenCanvas, origin.x, origin.y, domainPixelW, domainPixelH);

      // 2. Dibujar rejilla del túnel
      if (this.showGrid) {
        this.drawWindTunnelGrid(ctx);
      }

      // 3. Partículas trazadoras
      const shouldDrawParticles = (this.visMode === VisMode.PARTICLES) || (this.visMode === VisMode.SMOKE && this.showParticles);
      if (shouldDrawParticles) {
        this.drawParticles(ctx);
      }

      // 4. Vectores de velocidad
      if (this.visMode === VisMode.VECTORS) {
        this.drawVelocityVectors(ctx);
      }

      // 5. Dibujar obstáculos sólidos
      this.drawObstacles(ctx);
    }

    // 6. Dibujo en progreso
    this.drawInProgress(ctx);

    // 7. Dibujar bordes del túnel
    this.drawTunnelWalls(ctx, origin, domainPixelW, domainPixelH);

    ctx.restore();
  }

  renderFluidField() {
    const nx = this.fluid.nx;
    const ny = this.fluid.ny;
    const u = this.fluid.u;
    const v = this.fluid.v;
    const p = this.fluid.p;
    const smoke = this.fluid.smoke;
    const vort = this.fluid.vorticity;
    const solid = this.fluid.solid;
    const data = this.pixelBuffer.data;

    const mode = this.visMode;
    const refSpeed = Math.max(0.1, this.fluid.inflowSpeed);

    for (let j = 0; j < ny; j++) {
      const row = j * nx;

      for (let i = 0; i < nx; i++) {
        const id = row + i;
        const pIdx = id * 4;

        if (solid[id] !== 0) {
          data[pIdx] = 15;
          data[pIdx + 1] = 23;
          data[pIdx + 2] = 42;
          data[pIdx + 3] = 0; // Transparente para que el render del obstáculo destaque
          continue;
        }

        let r = 0, g = 0, b = 0;

        if (mode === VisMode.SMOKE) {
          // Modo Humo de Túnel Aerodinámico con fondo celeste aerodinámico y filamentos cian de alto contraste
          const sVal = Math.min(1.0, Math.max(0.0, smoke[id]));
          const speed = Math.hypot(u[id], v[id]);
          const speedNorm = Math.min(1.8, speed / refSpeed);

          // Fondo celeste aerodinámico exacto de la captura y filamentos cian-blancos
          r = Math.floor(10 + 20 * speedNorm + 225 * sVal);
          g = Math.floor(18 + 55 * speedNorm + 237 * sVal);
          b = Math.floor(36 + 115 * speedNorm + 255 * sVal);
        } else if (mode === VisMode.PRESSURE) {
          const pVal = p[id];
          const normP = Math.max(-1.0, Math.min(1.0, pVal * 4.0));
          if (normP < 0) {
            const t = -normP;
            r = Math.floor(30 * (1 - t) + 14 * t);
            g = Math.floor(80 * (1 - t) + 165 * t);
            b = Math.floor(180 * (1 - t) + 240 * t);
          } else {
            const t = normP;
            r = Math.floor(30 * (1 - t) + 245 * t);
            g = Math.floor(80 * (1 - t) + 60 * t);
            b = Math.floor(180 * (1 - t) + 40 * t);
          }
        } else if (mode === VisMode.VELOCITY) {
          const speed = Math.hypot(u[id], v[id]);
          const t = Math.min(1.0, speed / (refSpeed * 1.8));
          r = Math.floor(255 * Math.max(0, 1.5 * (t - 0.4)));
          g = Math.floor(255 * (t < 0.6 ? t * 1.6 : 1.0 - 0.5 * (t - 0.6)));
          b = Math.floor(255 * Math.max(0, 1.0 - 1.8 * t));
        } else if (mode === VisMode.VORTICITY) {
          const wVal = vort[id];
          const sign = Math.sign(wVal);
          // Curva perceptual gamma para revelar núcleos de vórtices y corrientes parásitas nítidas
          const t = Math.min(1.0, Math.pow(Math.abs(wVal) / 4.8, 0.65));

          if (sign < 0) {
            // Giro horario (rojo carmesí vibrante a naranja brillante)
            r = Math.floor(18 * (1 - t) + 252 * t);
            g = Math.floor(22 * (1 - t) + 50 * t);
            b = Math.floor(36 * (1 - t) + 40 * t);
          } else if (sign > 0) {
            // Giro antihorario (azul eléctrico a cian brillante)
            r = Math.floor(18 * (1 - t) + 25 * t);
            g = Math.floor(22 * (1 - t) + 175 * t);
            b = Math.floor(36 * (1 - t) + 255 * t);
          } else {
            r = 14; g = 18; b = 28;
          }
        } else {
          r = 10;
          g = 14;
          b = 20;
        }

        data[pIdx] = r;
        data[pIdx + 1] = g;
        data[pIdx + 2] = b;
        data[pIdx + 3] = 255;
      }
    }

    this.offscreenCtx.putImageData(this.pixelBuffer, 0, 0);
  }

  drawWindTunnelGrid(ctx) {
    const origin = this.worldToScreen(0, 0);
    const end = this.worldToScreen(this.fluid.domainWidth, this.fluid.domainHeight);

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    // Líneas verticales cada metro
    for (let x = 0; x <= this.fluid.domainWidth; x += 1.0) {
      const sx = origin.x + x * this.zoomLevel;
      ctx.beginPath();
      ctx.moveTo(sx, origin.y);
      ctx.lineTo(sx, end.y);
      ctx.stroke();
    }

    // Líneas horizontales cada metro
    for (let y = 0; y <= this.fluid.domainHeight; y += 1.0) {
      const sy = origin.y + y * this.zoomLevel;
      ctx.beginPath();
      ctx.moveTo(origin.x, sy);
      ctx.lineTo(end.x, sy);
      ctx.stroke();
    }

    // Flechas de flujo en el borde de entrada izquierdo (solo si el flujo está activo)
    if (this.fluid.isFlowActive) {
      const isTurb = (this.fluid.flowRegime === 'turbulent' || this.fluid.turbulenceIntensity > 0.005);
      ctx.strokeStyle = isTurb ? '#fbbf24' : '#00ffcc';
      ctx.fillStyle = isTurb ? '#fbbf24' : '#00ffcc';
      ctx.lineWidth = isTurb ? 1.8 : 1.4;

      for (let y = 0.8; y < this.fluid.domainHeight; y += 1.2) {
        const j = Math.min(this.fluid.ny - 1, Math.max(0, Math.round((y / this.fluid.domainHeight) * this.fluid.ny)));
        const uIn = (this.fluid.inletU && this.fluid.inletU[j] !== undefined) ? this.fluid.inletU[j] : this.fluid.inflowSpeed;
        const vIn = (this.fluid.inletV && this.fluid.inletV[j] !== undefined) ? this.fluid.inletV[j] : 0.0;
        const angle = Math.atan2(vIn, uIn);

        const pt = this.worldToScreen(0.45, y);
        const arrowLen = 22;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        const startX = pt.x - (arrowLen * 0.5) * cosA;
        const startY = pt.y - (arrowLen * 0.5) * sinA;
        const endX = pt.x + (arrowLen * 0.5) * cosA;
        const endY = pt.y + (arrowLen * 0.5) * sinA;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Cabeza de flecha orientada en la dirección instantánea
        const headLen = 6;
        const headAngle = 0.42;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - headLen * Math.cos(angle - headAngle), endY - headLen * Math.sin(angle - headAngle));
        ctx.lineTo(endX - headLen * Math.cos(angle + headAngle), endY - headLen * Math.sin(angle + headAngle));
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore();
  }

  drawParticles(ctx) {
    ctx.save();
    const particles = this.fluid.particles;

    // Todas las partículas tienen exactamente la misma intensidad y tono constante en toda la pantalla
    ctx.fillStyle = 'rgba(215, 240, 255, 0.85)';

    for (let p of particles) {
      if (p.x < 0.05 || p.x > this.fluid.domainWidth) continue;
      const sp = this.worldToScreen(p.x, p.y);

      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawVelocityVectors(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
    ctx.lineWidth = 1.2;

    const stepX = 1.0; // Cada metro
    const stepY = 1.0;
    const scale = 0.3 * this.zoomLevel;

    for (let y = 0.5; y < this.fluid.domainHeight; y += stepY) {
      for (let x = 0.5; x < this.fluid.domainWidth; x += stepX) {
        const gx = x / this.fluid.dx;
        const gy = y / this.fluid.dy;
        const uVal = this.fluid.sampleBilinear(this.fluid.u, gx, gy);
        const vVal = this.fluid.sampleBilinear(this.fluid.v, gx, gy);

        const sp = this.worldToScreen(x, y);
        const endX = sp.x + uVal * scale;
        const endY = sp.y + vVal * scale;

        ctx.beginPath();
        ctx.moveTo(sp.x, sp.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Punta de flecha
        const angle = Math.atan2(vVal, uVal);
        ctx.beginPath();
        ctx.arc(endX, endY, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  drawObstacles(ctx) {
    for (let obsIdx = 0; obsIdx < this.elements.length; obsIdx++) {
      const elem = this.elements[obsIdx];
      if (!elem.isActive) continue;

      if (elem instanceof HydrodynamicObstacle) {
        this.drawHydrodynamicBody(ctx, elem, obsIdx);
      } else if (elem instanceof FlowProbe) {
        this.drawFlowProbe(ctx, elem);
      }
    }
  }

  drawHydrodynamicBody(ctx, obs, obsIdx) {
    const pts = obs.boundaryPoints;
    if (pts.length < 3) return;

    ctx.save();

    // Ruta del polígono / spline o bucles compuestos de figuras
    ctx.beginPath();
    if (obs.loops && obs.loops.length > 0) {
      for (const loop of obs.loops) {
        if (loop.length < 2) continue;
        const p0 = this.worldToScreen(loop[0][0], loop[0][1]);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < loop.length; i++) {
          const sp = this.worldToScreen(loop[i][0], loop[i][1]);
          ctx.lineTo(sp.x, sp.y);
        }
        ctx.closePath();
      }
    } else {
      const p0 = this.worldToScreen(pts[0][0], pts[0][1]);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < pts.length; i++) {
        const sp = this.worldToScreen(pts[i][0], pts[i][1]);
        ctx.lineTo(sp.x, sp.y);
      }
      ctx.closePath();
    }

    // Relleno estilo fibra de carbono / aluminio aeronáutico con regla evenodd
    ctx.fillStyle = '#0f172a';
    ctx.fill('evenodd');

    // Contorno iluminado (verde cian si está seleccionado, azul si no)
    ctx.strokeStyle = obs.isSelected ? '#00ffcc' : '#38bdf8';
    ctx.lineWidth = obs.isSelected ? 2.5 : 1.8;
    ctx.shadowColor = obs.isSelected ? 'rgba(0, 255, 204, 0.6)' : 'rgba(56, 189, 248, 0.4)';
    ctx.shadowBlur = obs.isSelected ? 14 : 6;
    ctx.stroke();
    ctx.shadowBlur = 0;

    const centroid = obs.getCentroid();
    const sCentroid = this.worldToScreen(centroid[0], centroid[1]);

    // Vector de Fuerzas Aerodinámicas (Arrastre en Rojo, Sustentación en Verde)
    if (this.showForces && obs.isSelected) {
      const metrics = this.fluid.calculateHydrodynamicForces(obs, obsIdx);
      this.drawForceVectors(ctx, sCentroid, metrics);
    }

    // Modo Edición de Nodos: Dibujar manecillas de vértices
    if (this.mode === CanvasMode.NODE_EDIT && obs.isSelected) {
      for (let i = 0; i < obs.controlPoints.length; i++) {
        const cp = obs.controlPoints[i];
        const scp = this.worldToScreen(cp[0], cp[1]);
        const isSelectedNode = (i === this.selectedNodeIdx);

        ctx.fillStyle = isSelectedNode ? '#facc15' : '#ffffff';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(scp.x, scp.y, isSelectedNode ? 6.5 : 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Modo Selección: Dibujar Bounding Box y tiradores (solo si la figura admite redimensionamiento)
    if (this.mode === CanvasMode.SELECT && obs.isSelected) {
      const aabb = obs.getAABB();
      if (aabb) {
        const p0 = this.worldToScreen(aabb[0], aabb[1]);
        const p1 = this.worldToScreen(aabb[2], aabb[3]);
        const bx = Math.min(p0.x, p1.x);
        const by = Math.min(p0.y, p1.y);
        const bw = Math.abs(p1.x - p0.x);
        const bh = Math.abs(p1.y - p0.y);

        const allowResize = this.canResizeElement(obs);

        ctx.save();

        if (allowResize) {
          // 1. Marco delimitador punteado cyan
          ctx.strokeStyle = 'rgba(0, 255, 204, 0.7)';
          ctx.lineWidth = 1.3;
          ctx.setLineDash([5, 4]);
          ctx.strokeRect(bx, by, bw, bh);
          ctx.setLineDash([]);

          // 2. Tiradores en esquinas (cuadraditos con contorno oscuro)
          ctx.fillStyle = '#00ffcc';
          ctx.strokeStyle = '#021024';
          ctx.lineWidth = 1.5;
          const corners = [
            { x: bx, y: by },
            { x: bx + bw, y: by },
            { x: bx + bw, y: by + bh },
            { x: bx, y: by + bh }
          ];
          for (const c of corners) {
            ctx.fillRect(c.x - 4, c.y - 4, 8, 8);
            ctx.strokeRect(c.x - 4, c.y - 4, 8, 8);
          }

          // 3. Tiradores en el centro de los bordes
          ctx.fillStyle = '#38bdf8';
          // Borde Superior
          ctx.fillRect(bx + bw / 2 - 9, by - 3, 18, 6);
          ctx.strokeRect(bx + bw / 2 - 9, by - 3, 18, 6);
          // Borde Inferior
          ctx.fillRect(bx + bw / 2 - 9, by + bh - 3, 18, 6);
          ctx.strokeRect(bx + bw / 2 - 9, by + bh - 3, 18, 6);
          // Borde Izquierdo
          ctx.fillRect(bx - 3, by + bh / 2 - 9, 6, 18);
          ctx.strokeRect(bx - 3, by + bh / 2 - 9, 6, 18);
          // Borde Derecho
          ctx.fillRect(bx + bw - 3, by + bh / 2 - 9, 6, 18);
          ctx.strokeRect(bx + bw - 3, by + bh / 2 - 9, 6, 18);
        } else {
          // Para figuras por default en celular: marco sutil de selección limpio sin tiradores de borde
          ctx.strokeStyle = 'rgba(0, 255, 204, 0.4)';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(bx, by, bw, bh);
          ctx.setLineDash([]);
        }

        // 4. Etiqueta con dimensiones métricas (ej: 3.80m × 1.25m)
        const wMeters = Math.max(0.1, aabb[2] - aabb[0]).toFixed(2);
        const hMeters = Math.max(0.1, aabb[3] - aabb[1]).toFixed(2);
        ctx.font = '10px Inter, sans-serif';
        const dimStr = `${wMeters}m × ${hMeters}m`;
        const dimW = ctx.measureText(dimStr).width;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(bx + bw - dimW - 10, by + bh + 6, dimW + 10, 15);
        ctx.strokeStyle = 'rgba(0, 255, 204, 0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx + bw - dimW - 10, by + bh + 6, dimW + 10, 15);
        ctx.fillStyle = '#00ffcc';
        ctx.fillText(dimStr, bx + bw - dimW - 5, by + bh + 17);

        ctx.restore();
      }

      const refLen = obs.getReferenceLength() * this.zoomLevel;
      const ringRadius = refLen * 0.7 + 26;
      const isMobile = this.isMobileDevice();

      ctx.strokeStyle = isMobile ? 'rgba(0, 255, 204, 0.65)' : 'rgba(0, 255, 204, 0.35)';
      ctx.lineWidth = isMobile ? 2.0 : 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(sCentroid.x, sCentroid.y, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Tirador de rotación
      const angleRad = (obs.currentRotationDeg * Math.PI) / 180.0;
      const hx = sCentroid.x + ringRadius * Math.cos(angleRad);
      const hy = sCentroid.y + ringRadius * Math.sin(angleRad);

      // En pantallas táctiles móviles: halo resplandeciente para fácil ubicación táctil
      if (isMobile) {
        ctx.fillStyle = 'rgba(0, 255, 204, 0.25)';
        ctx.beginPath();
        ctx.arc(hx, hy, 15, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#00ffcc';
      ctx.strokeStyle = '#021024';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hx, hy, isMobile ? 9 : 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Etiqueta del ángulo
      ctx.fillStyle = '#e2e8f0';
      ctx.font = isMobile ? 'bold 11px Inter, sans-serif' : '10px Inter, sans-serif';
      ctx.fillText(`${Math.round(obs.currentRotationDeg)}°`, hx + (isMobile ? 14 : 10), hy - 4);
    }

    ctx.restore();
  }

  drawForceVectors(ctx, origin, metrics) {
    const scale = 2.4; // Escala visual de los vectores de fuerza en píxeles

    // Vector de Arrastre (Drag F_D - Hacia la derecha)
    const dragLen = metrics.dragForce * scale;
    ctx.strokeStyle = '#ef4444'; // Rojo Drag
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(origin.x + dragLen, origin.y);
    ctx.stroke();

    // Flecha de Drag
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(origin.x + dragLen, origin.y);
    ctx.lineTo(origin.x + dragLen - 6, origin.y - 4);
    ctx.lineTo(origin.x + dragLen - 6, origin.y + 4);
    ctx.fill();

    // Vector de Sustentación (Lift F_L - Hacia arriba)
    const liftLen = -metrics.liftForce * scale;
    ctx.strokeStyle = '#10b981'; // Verde Lift
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(origin.x, origin.y + liftLen);
    ctx.stroke();

    // Flecha de Lift
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y + liftLen);
    ctx.lineTo(origin.x - 4, origin.y + liftLen + 6);
    ctx.lineTo(origin.x + 4, origin.y + liftLen + 6);
    ctx.fill();

    // Texto de Fuerzas
    ctx.font = '11px Inter, monospace';
    ctx.fillStyle = '#ef4444';
    ctx.fillText(`Fd: ${metrics.dragForce.toFixed(2)} N (Cd: ${metrics.cd})`, origin.x + dragLen + 8, origin.y + 4);

    ctx.fillStyle = '#10b981';
    ctx.fillText(`Fl: ${metrics.liftForce.toFixed(2)} N (Cl: ${metrics.cl})`, origin.x + 6, origin.y + liftLen - 6);
  }

  drawFlowProbe(ctx, probe) {
    const sp = this.worldToScreen(probe.x, probe.y);
    let uVal = 0, vVal = 0, pVal = 0, vortVal = 0, speed = 0;

    if (this.isLBMMode) {
      const lx = Math.max(1, Math.min(this.lbm.nx - 2, (probe.x / this.fluid.domainWidth) * this.lbm.nx));
      const ly = Math.max(1, Math.min(this.lbm.ny - 2, (probe.y / this.fluid.domainHeight) * this.lbm.ny));
      const idx = Math.floor(lx) + Math.floor(ly) * this.lbm.nx;
      const scaleToMs = this.fluid.inflowVelocity / Math.max(0.01, this.lbm.speed);
      uVal = this.lbm.ux[idx] * scaleToMs;
      vVal = this.lbm.uy[idx] * scaleToMs;
      speed = Math.hypot(uVal, vVal);
      pVal = (this.lbm.rho[idx] - 1.0) * (1.0 / 3.0) * this.fluid.density * (scaleToMs * scaleToMs);
      vortVal = this.lbm.curl[idx] * scaleToMs * (this.lbm.nx / this.fluid.domainWidth);
    } else {
      const gx = probe.x / this.fluid.dx;
      const gy = probe.y / this.fluid.dy;

      uVal = this.fluid.sampleBilinear(this.fluid.u, gx, gy);
      vVal = this.fluid.sampleBilinear(this.fluid.v, gx, gy);
      pVal = this.fluid.sampleBilinear(this.fluid.p, gx, gy);
      vortVal = this.fluid.sampleBilinear(this.fluid.vorticity, gx, gy);
      speed = Math.hypot(uVal, vVal);
    }

    probe.measuredSpeed = speed;
    probe.measuredU = uVal;
    probe.measuredV = vVal;
    probe.measuredP = pVal;
    probe.measuredVorticity = vortVal;

    ctx.save();
    // Corona del sensor
    ctx.strokeStyle = probe.isSelected ? '#facc15' : '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, probe.radius * this.zoomLevel, 0, Math.PI * 2);
    ctx.stroke();

    // Punto central
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, 3, 0, Math.PI * 2);
    ctx.fill();

    // Aguja de velocidad
    const arrowLen = Math.min(40, speed * 8);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sp.x, sp.y);
    ctx.lineTo(sp.x + (uVal / (speed || 1)) * arrowLen, sp.y + (vVal / (speed || 1)) * arrowLen);
    ctx.stroke();

    // Mini HUD de lectura
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(sp.x + 12, sp.y - 28, 96, 44);
    ctx.strokeRect(sp.x + 12, sp.y - 28, 96, 44);

    ctx.font = '10px Inter, monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`v: ${speed.toFixed(2)} m/s`, sp.x + 16, sp.y - 14);
    ctx.fillStyle = '#facc15';
    ctx.fillText(`p: ${pVal.toFixed(1)} Pa`, sp.x + 16, sp.y);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`ω: ${vortVal.toFixed(1)} s⁻¹`, sp.x + 16, sp.y + 12);

    ctx.restore();
  }

  drawInProgress(ctx) {
    if (this.drawPoints.length === 0) return;

    ctx.save();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const p0 = this.worldToScreen(this.drawPoints[0][0], this.drawPoints[0][1]);
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < this.drawPoints.length; i++) {
      const sp = this.worldToScreen(this.drawPoints[i][0], this.drawPoints[i][1]);
      ctx.lineTo(sp.x, sp.y);
    }
    if (this.mode === CanvasMode.DRAW_POLYGON) {
      // Línea punteada hacia el cursor
      ctx.stroke();
      ctx.setLineDash([4, 4]);
      ctx.lineTo(this.lastMousePos.x, this.lastMousePos.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  drawTunnelWalls(ctx, origin, domainPixelW, domainPixelH) {
    ctx.save();
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;

    // Pared superior
    ctx.strokeRect(origin.x, origin.y - 6, domainPixelW, 6);
    // Pared inferior
    ctx.strokeRect(origin.x, origin.y + domainPixelH, domainPixelW, 6);

    // Si las paredes son sólidas (closed walls), dibujar textura de rayado
    if (this.fluid.closedWalls) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.fillRect(origin.x, origin.y - 6, domainPixelW, 6);
      ctx.fillRect(origin.x, origin.y + domainPixelH, domainPixelW, 6);
    }

    ctx.restore();
  }
}

window.CanvasMode = CanvasMode;
window.VisMode = VisMode;
window.FluidCanvasController = FluidCanvasController;
