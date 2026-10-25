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
  PROBE: 5,
  CLEAN: 6
};

const VisMode = {
  SMOKE: 'smoke',
  VORTICITY: 'vorticity',
  CFD_DES_LES: 'cfd_des_les',
  PRESSURE: 'pressure',
  CFD_COMBUSTION: 'cfd_combustion',
  VELOCITY: 'velocity',
  SCHROEDER_CURL: 'schroeder_curl',
  SCHROEDER_SPEED: 'schroeder_speed',
  PARTICLES: 'particles',
  VECTORS: 'vectors',
  SCHROEDER_FLOWLINES: 'schroeder_flowlines'
};

// =========================================================================
// CONFIGURACIÓN DE GUÍA VISUAL DE ROTACIÓN DE OBSTÁCULOS:
// - mode: 'arc' -> Muestra un arco sutil y elegante centrado en el tirador para no sobrecargar el visor.
// - mode: 'full' -> Muestra el círculo punteado completo de 360° (configuración anterior guardada por si se desea volver).
// =========================================================================
const RotationGuideConfig = {
  mode: 'arc',             // 'arc' (nuevo arco sutil) | 'full' (círculo 360° previo)
  arcSpanDeg: 35,          // Amplitud del arco en grados centrado en el tirador (±17.5° - mitad del anterior)
  showArrowheads: true     // Flechas sutiles en los extremos del arco que clarifican que es para rotar
};
window.RotationGuideConfig = RotationGuideConfig;

class FluidCanvasController {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d', { alpha: false });

    // Instancia del Motor Navier-Stokes y del Motor Lattice-Boltzmann D2Q9 (Schroeder)
    this.domainWidth = 20.0; // Metros virtuales en el túnel (extendido para aprovechar pantallas panorámicas)
    this.fluid = new FluidField(200, 90, this.domainWidth);
    this.lbm = new LatticeBoltzmannEngine(220, 100);
    this.isLBMMode = false;
    this.showFlowlines = false; // Opción global de líneas de flujo para todos los modos de vista
    this.showLBMFlowlines = false;
    this.showLBMTracers = false;
    this.showLBMForces = true;

    // Búfer offscreen para Lattice-Boltzmann en HD (2x de resolución para gradientes sedosos sin pixelado)
    this.lbmScale = 2;
    this.lbmW = this.lbm.nx * this.lbmScale;
    this.lbmH = this.lbm.ny * this.lbmScale;
    this.lbmOffscreenCanvas = document.createElement('canvas');
    this.lbmOffscreenCanvas.width = this.lbmW;
    this.lbmOffscreenCanvas.height = this.lbmH;
    this.lbmOffscreenCtx = this.lbmOffscreenCanvas.getContext('2d');
    this.lbmPixelBuffer = this.lbmOffscreenCtx.createImageData(this.lbmW, this.lbmH);

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

    // Herramienta Escoba / Limpieza de vórtices y corrientes (Borrador Mágico / Balde de Pintura)


    // Arrastre, rotación y redimensionamiento de figuras tirando de los bordes
    this.isDraggingElement = false;
    this.hasDraggedElement = false;
    this.dragStartWorld = [0, 0];
    this.dragStartElemPos = null;
    this.isRotating = false;
    this.rotateStartAngle = 0;
    this.elemStartRotDeg = 0;
    this.isResizing = false;
    this.resizeHandle = null;
    this.resizeStartWorld = [0, 0];
    this.resizeInitialPoints = null;
    this._lastSweepRealtimeUpdate = 0;
    this.resizeInitialLoops = null;
    this.resizeInitialAABB = null;

    // Búferes de dibujo a mano alzada y polígonos
    this.drawPoints = [];
    this.isDrawing = false;

    // Sistema de Historial y Deshacer (Undo / Redo - Ctrl+Z)
    this.undoStack = [];
    this.redoStack = [];
    this.currentActionBeforeSnapshot = null;
    this.onHistoryChanged = null;

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

    // Búfer de píxeles HD para el modo CFD: Aerodinámica DES / LES (resolución 2x con interpolación bilineal de vorticidad)
    this.hdScale = 2;
    this.hdW = this.fluid.nx * this.hdScale;
    this.hdH = this.fluid.ny * this.hdScale;
    this.hdOffscreenCanvas = document.createElement('canvas');
    this.hdOffscreenCanvas.width = this.hdW;
    this.hdOffscreenCanvas.height = this.hdH;
    this.hdOffscreenCtx = this.hdOffscreenCanvas.getContext('2d');
    this.hdPixelBuffer = this.hdOffscreenCtx.createImageData(this.hdW, this.hdH);
    this.hdPixelData = new Uint32Array(this.hdPixelBuffer.data.buffer);
    this.extrapolatedVorticity = new Float32Array(this.fluid.size);
    this.extrapolatedSignedVort = new Float32Array(this.fluid.size);
    this.initDesLesLut();
    this.initVorticityLut();
    this.initCombustionLut();

    // Callbacks hacia la interfaz
    this.onElementSelected = null;
    this.onSceneChanged = null;
    this.onCoordsChanged = null;
    this.onModeChanged = null;
    this.onTelemetryUpdate = null;
    this.onElementRotationUpdate = null;

    // Inicializar eventos, tamaño y bucle
    this.initEvents();
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const cr = entry.contentRect;
          if (cr && (Math.abs(cr.width - this.width) > 1 || Math.abs(cr.height - this.height) > 1)) {
            this.resizeCanvas();
          }
        }
      });
      this.resizeObserver.observe(this.canvas);
      if (this.canvas.parentElement) {
        this.resizeObserver.observe(this.canvas.parentElement);
      }
    }

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
    // Contener todo el túnel dentro de la pantalla sin dejar ningún fragmento por fuera
    return Math.min(zw, zh);
  }

  clampPanOffset() {
    const minZoom = this.getFitZoom();
    if (this.zoomLevel < minZoom) {
      this.zoomLevel = minZoom;
    }
    const domainW = this.fluid.domainWidth * this.zoomLevel;
    const domainH = this.fluid.domainHeight * this.zoomLevel;
    if (domainW >= this.width + 1.0) {
      this.panOffset.x = Math.min(0, Math.max(this.width - domainW, this.panOffset.x));
    } else {
      this.panOffset.x = (this.width - domainW) / 2.0;
    }
    if (domainH >= this.height + 1.0) {
      this.panOffset.y = Math.min(0, Math.max(this.height - domainH, this.panOffset.y));
    } else {
      this.panOffset.y = (this.height - domainH) / 2.0;
    }
  }

  resetView() {
    const w = this.width || 800;
    const h = this.height || 600;
    this.zoomLevel = this.getFitZoom();
    const domainW = this.fluid.domainWidth * this.zoomLevel;
    const domainH = this.fluid.domainHeight * this.zoomLevel;
    // Centrar simétricamente y con precisión matemática en ambos ejes (espacio superior = espacio inferior)
    this.panOffset.x = (w - domainW) / 2.0;
    this.panOffset.y = (h - domainH) / 2.0;
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

    this.hdW = nx * this.hdScale;
    this.hdH = ny * this.hdScale;
    this.hdOffscreenCanvas.width = this.hdW;
    this.hdOffscreenCanvas.height = this.hdH;
    this.hdOffscreenCtx = this.hdOffscreenCanvas.getContext('2d');
    this.hdPixelBuffer = this.hdOffscreenCtx.createImageData(this.hdW, this.hdH);
    this.hdPixelData = new Uint32Array(this.hdPixelBuffer.data.buffer);
    this.extrapolatedVorticity = new Float32Array(this.fluid.size);
    this.extrapolatedSignedVort = new Float32Array(this.fluid.size);

    this.fluid.rasterizeObstacles(this.elements);
  }

  addElement(element, recordHistory = true) {
    this.elements.push(element);
    this.selectElement(element);
    this.fluid.rasterizeObstacles(this.elements);
    this.lbm.rasterizeObstacles(this.elements, this.fluid.domainWidth, this.fluid.domainHeight);
    if (recordHistory) {
      this.pushHistory({ type: 'add', element: element });
    }
    if (this.onSceneChanged) this.onSceneChanged();
  }

  removeElement(element, recordHistory = true) {
    const idx = this.elements.indexOf(element);
    if (idx !== -1) {
      this.elements.splice(idx, 1);
      if (this.selectedElement === element) {
        this.selectElement(this.elements.length > 0 ? this.elements[this.elements.length - 1] : null);
      }
      this.fluid.rasterizeObstacles(this.elements);
      this.lbm.rasterizeObstacles(this.elements, this.fluid.domainWidth, this.fluid.domainHeight);
      if (recordHistory) {
        this.pushHistory({ type: 'remove', element: element, index: idx });
      }
      if (this.onSceneChanged) this.onSceneChanged();
    }
  }

  clearScene() {
    this.elements = [];
    this.selectedElement = null;
    this.selectedNodeIdx = -1;
    this.undoStack = [];
    this.redoStack = [];
    this.currentActionBeforeSnapshot = null;
    if (this.onHistoryChanged) this.onHistoryChanged(0, 0);
    this.fluid.rasterizeObstacles(this.elements);
    this.fluid.resetFlow();
    if (this.lbm) {
      this.lbm.barrier.fill(0);
      this.lbm.initFluid();
    }
    if (this.onSceneChanged) this.onSceneChanged();
  }

  // --- SISTEMA DE HISTORIAL Y DESHACER (UNDO / REDO EXCLUSIVO PARA DEFORMACIÓN DE FIGURA) ---
  snapshotElement(elem) {
    if (!elem || !(elem instanceof HydrodynamicObstacle)) return null;
    return {
      element: elem,
      controlPoints: elem.controlPoints ? elem.controlPoints.map(p => [p[0], p[1]]) : [],
      loops: elem.loops ? elem.loops.map(l => l.map(p => [p[0], p[1]])) : null,
      imageWorldWidth: elem.imageWorldWidth,
      imageWorldHeight: elem.imageWorldHeight,
      imageCenter: elem.imageCenter ? [...elem.imageCenter] : null,
      currentRotationDeg: elem.currentRotationDeg
    };
  }

  restoreElementSnapshot(elem, snapshot) {
    if (!elem || !snapshot) return;
    if (snapshot.controlPoints && Array.isArray(snapshot.controlPoints)) {
      elem.controlPoints = snapshot.controlPoints.map(p => [p[0], p[1]]);
    }
    if (snapshot.loops && Array.isArray(snapshot.loops)) {
      elem.loops = snapshot.loops.map(l => l.map(p => [p[0], p[1]]));
    }
    if (snapshot.imageWorldWidth !== undefined) elem.imageWorldWidth = snapshot.imageWorldWidth;
    if (snapshot.imageWorldHeight !== undefined) elem.imageWorldHeight = snapshot.imageWorldHeight;
    if (snapshot.imageCenter) elem.imageCenter = [...snapshot.imageCenter];
    if (snapshot.currentRotationDeg !== undefined) elem.currentRotationDeg = snapshot.currentRotationDeg;
    elem.invalidateCache();
  }

  hasShapeDeformed(s1, s2) {
    if (!s1 || !s2) return false;
    if (s1.controlPoints && s2.controlPoints) {
      if (s1.controlPoints.length !== s2.controlPoints.length) return true;
      for (let i = 0; i < s1.controlPoints.length; i++) {
        if (Math.abs(s1.controlPoints[i][0] - s2.controlPoints[i][0]) > 1e-4 ||
            Math.abs(s1.controlPoints[i][1] - s2.controlPoints[i][1]) > 1e-4) {
          return true;
        }
      }
    } else if (Boolean(s1.controlPoints) !== Boolean(s2.controlPoints)) {
      return true;
    }

    if (s1.loops && s2.loops) {
      if (s1.loops.length !== s2.loops.length) return true;
      for (let l = 0; l < s1.loops.length; l++) {
        const l1 = s1.loops[l];
        const l2 = s2.loops[l];
        if (l1.length !== l2.length) return true;
        for (let i = 0; i < l1.length; i++) {
          if (Math.abs(l1[i][0] - l2[i][0]) > 1e-4 ||
              Math.abs(l1[i][1] - l2[i][1]) > 1e-4) {
            return true;
          }
        }
      }
    } else if (Boolean(s1.loops) !== Boolean(s2.loops)) {
      return true;
    }

    return false;
  }

  pushHistory(action) {
    if (!action) return;
    this.undoStack.push(action);
    if (this.undoStack.length > 50) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    if (this.onHistoryChanged) {
      this.onHistoryChanged(this.undoStack.length, this.redoStack.length);
    }
  }

  undo() {
    if (!this.undoStack || this.undoStack.length === 0) return false;
    const action = this.undoStack.pop();

    if (action.type === 'add') {
      const idx = this.elements.indexOf(action.element);
      if (idx !== -1) this.elements.splice(idx, 1);
      this.selectedElement = this.elements.length > 0 ? this.elements[this.elements.length - 1] : null;
      this.redoStack.push(action);
    } else if (action.type === 'remove') {
      if (typeof action.index === 'number' && action.index <= this.elements.length) {
        this.elements.splice(action.index, 0, action.element);
      } else {
        this.elements.push(action.element);
      }
      this.selectElement(action.element);
      this.redoStack.push(action);
    } else if (action && action.element && action.before) {
      this.restoreElementSnapshot(action.element, action.before);
      this.redoStack.push(action);
      this.selectElement(action.element);
    }

    this.fluid.rasterizeObstacles(this.elements);
    if (this.isLBMMode && this.lbm) {
      this.lbm.rasterizeObstacles(this.elements, this.fluid.domainWidth, this.fluid.domainHeight);
    }
    if (this.onSceneChanged) this.onSceneChanged();
    if (this.onElementSelected) this.onElementSelected(this.selectedElement);
    if (this.onHistoryChanged) this.onHistoryChanged(this.undoStack.length, this.redoStack.length);
    if (typeof this.render === 'function') this.render();
    return true;
  }

  redo() {
    if (!this.redoStack || this.redoStack.length === 0) return false;
    const action = this.redoStack.pop();

    if (action.type === 'add') {
      this.elements.push(action.element);
      this.selectElement(action.element);
      this.undoStack.push(action);
    } else if (action.type === 'remove') {
      const idx = this.elements.indexOf(action.element);
      if (idx !== -1) this.elements.splice(idx, 1);
      this.selectedElement = this.elements.length > 0 ? this.elements[this.elements.length - 1] : null;
      this.undoStack.push(action);
    } else if (action && action.element && action.after) {
      this.restoreElementSnapshot(action.element, action.after);
      this.undoStack.push(action);
      this.selectElement(action.element);
    }

    this.fluid.rasterizeObstacles(this.elements);
    if (this.isLBMMode && this.lbm) {
      this.lbm.rasterizeObstacles(this.elements, this.fluid.domainWidth, this.fluid.domainHeight);
    }
    if (this.onSceneChanged) this.onSceneChanged();
    if (this.onElementSelected) this.onElementSelected(this.selectedElement);
    if (this.onHistoryChanged) this.onHistoryChanged(this.undoStack.length, this.redoStack.length);
    if (typeof this.render === 'function') this.render();
    return true;
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
    if (this.isLBMMode && this.lbm) {
      this.lbm.rasterizeObstacles(this.elements, this.fluid.domainWidth, this.fluid.domainHeight);
      this.lbm.setFlowActive(this.isFlowActive, !this.isFlowActive);
    }
  }

  setFlowActive(active) {
    const val = Boolean(active);
    if (this.fluid) {
      this.fluid.setFlowActive(val);
    }
    if (this.lbm) {
      this.lbm.setFlowActive(val);
    }
  }

  get isFlowActive() {
    return this.isLBMMode ? (this.lbm ? this.lbm.isFlowActive : true) : (this.fluid ? this.fluid.isFlowActive : true);
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

    // 2. Anillo / arco circular de rotación
    // Si el toque/clic cae directamente dentro del cuerpo físico del obstáculo, se prioriza mover/arrastrar,
    // a menos que se haya presionado el knob de rotación.
    const isInsideBody = worldPos && this.selectedElement.containsPoint(worldPos[0], worldPos[1]);
    if (!isInsideBody) {
      const ringTolerance = isMobile ? 26 : 14;
      if (Math.abs(dToCentroid - ringRadius) <= ringTolerance) {
        // En modo 'arc', solo responde si el toque está dentro del arco visible con margen de tolerancia
        if (RotationGuideConfig.mode === 'arc') {
          const clickAngle = Math.atan2(screenY - sCentroid.y, screenX - sCentroid.x);
          let angleDiff = Math.abs(clickAngle - angleRad);
          while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - 2 * Math.PI);
          const halfSpanRad = ((RotationGuideConfig.arcSpanDeg / 2) + 12) * (Math.PI / 180.0);
          if (angleDiff <= halfSpanRad) {
            return true;
          }
        } else {
          // En modo 'full' previo, responde en cualquier punto del círculo completo 360°
          return true;
        }
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

    const [p0x, p0y] = transformPt([aabb[0], aabb[1]]);
    const [p1x, p1y] = transformPt([aabb[2], aabb[3]]);
    const newMinX = Math.min(p0x, p1x);
    const newMaxX = Math.max(p0x, p1x);
    const newMinY = Math.min(p0y, p1y);
    const newMaxY = Math.max(p0y, p1y);
    const curW = Math.max(0.15, newMaxX - newMinX);
    const curH = Math.max(0.15, newMaxY - newMinY);
    const scaleX = curW / w0;
    const scaleY = curH / h0;

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

    if (this.selectedElement.isImportedImage) {
      this.selectedElement.imageWorldWidth = (this.resizeInitialImageW || 1.0) * scaleX;
      this.selectedElement.imageWorldHeight = (this.resizeInitialImageH || 1.0) * scaleY;
      if (this.selectedElement.imageCenter) {
        this.selectedElement.imageCenter[0] = (newMinX + newMaxX) / 2.0;
        this.selectedElement.imageCenter[1] = (newMinY + newMaxY) / 2.0;
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
          this.resizeInitialImageW = this.selectedElement.imageWorldWidth || 1.0;
          this.resizeInitialImageH = this.selectedElement.imageWorldHeight || 1.0;
          this.currentActionBeforeSnapshot = this.snapshotElement(this.selectedElement);
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
          this.hasDraggedElement = false;
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
          this.currentActionBeforeSnapshot = this.snapshotElement(found.element);
        } else {
          const hit = this.findObstacleAt(worldPos);
          if (hit) {
            this.selectElement(hit);
          } else {
            // Clic fuera de figura y de nodos: deseleccionar y volver al estado normal
            this.selectElement(null);
            this.setMode(CanvasMode.SELECT);
          }
        }
      } else if (this.mode === CanvasMode.DRAW_FREEHAND) {
        this.isDrawing = true;
        this.drawPoints = [worldPos];
      } else if (this.mode === CanvasMode.DRAW_POLYGON) {
        // Si el usuario hace clic cerca del nodo inicial (>= 3 puntos), cerrar y completar el polígono
        if (this.drawPoints.length >= 3) {
          const d0 = Math.hypot(worldPos[0] - this.drawPoints[0][0], worldPos[1] - this.drawPoints[0][1]);
          if (d0 < 22.0 / this.zoomLevel) {
            this.finishPolygon();
            return;
          }
        }
        this.drawPoints.push(worldPos);
        if (this.onSceneChanged) this.onSceneChanged();
      } else if (this.mode === CanvasMode.PROBE) {
        const probe = new FlowProbe(worldPos[0], worldPos[1], `Sensor ${this.elements.length + 1}`);
        this.addElement(probe);
        this.setMode(CanvasMode.SELECT);
      } else if (this.mode === CanvasMode.CLEAN) {
        this.cleanFloodFillAt(worldPos[0], worldPos[1]);
        this.setMode(CanvasMode.SELECT);
      }
    });

    // DOBLE CLIC PARA CERRAR Y COMPLETAR POLÍGONO AUTOMÁTICAMENTE
    this.canvas.addEventListener('dblclick', () => {
      if (this.mode === CanvasMode.DRAW_POLYGON) {
        // En doble clic, descartar punto duplicado que mousedown previo pudo haber agregado
        while (this.drawPoints.length > 3) {
          const last = this.drawPoints[this.drawPoints.length - 1];
          const prev = this.drawPoints[this.drawPoints.length - 2];
          if (Math.hypot(last[0] - prev[0], last[1] - prev[1]) < 0.25) {
            this.drawPoints.pop();
          } else {
            break;
          }
        }
        if (this.drawPoints.length >= 3) {
          this.finishPolygon();
        }
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
        this.hasDraggedElement = true;
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
          if (this.selectedElement.loops && this.selectedElement.loops.length > 0) {
            if (this.selectedElement.loops[0] && this.selectedElement.loops[0][this.selectedNodeIdx]) {
              this.selectedElement.loops[0][this.selectedNodeIdx][0] = worldPos[0];
              this.selectedElement.loops[0][this.selectedNodeIdx][1] = worldPos[1];
            }
          }
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
      } else if (this.mode === CanvasMode.CLEAN) {
        this.canvas.style.cursor = 'crosshair';
      } else {
        this.canvas.style.cursor = 'crosshair';
      }
    });

    // MOUSE UP
    window.addEventListener('mouseup', () => {
      this.isPanning = false;
      const wasDragging = this.isDraggingElement;
      const draggedElem = this.selectedElement;
      const didMove = this.hasDraggedElement;

      // Desplazamiento de exactamente 1 píxel al soltar la pieza para actualizar automáticamente al flujo remanente
      if (wasDragging && didMove && draggedElem) {
        if (this.mode === CanvasMode.SELECT && typeof draggedElem.translate === 'function') {
          const onePixelWorld = 1.0 / Math.max(0.001, this.zoomLevel);
          draggedElem.translate(onePixelWorld, 0.0);
        }
        this.fluid.rasterizeObstacles(this.elements);
        if (this.isLBMMode && this.lbm) {
          this.lbm.rasterizeObstacles(this.elements, this.fluid.domainWidth, this.fluid.domainHeight);
        }
        if (this.onSceneChanged) this.onSceneChanged();
        if (window.AerodynamicSweep && typeof window.AerodynamicSweep.triggerRealtimeUpdate === 'function') {
          window.AerodynamicSweep.triggerRealtimeUpdate(this);
        }
      }

      if (wasDragging && draggedElem && draggedElem.isBuoy) {
        const flow = this.getSurroundingFlow(draggedElem);
        draggedElem.vx = flow.u;
        draggedElem.vy = flow.v;
      }

      // Registro de Historial Undo exclusivamente si hubo deformación de la figura
      if (this.currentActionBeforeSnapshot && this.currentActionBeforeSnapshot.element) {
        const el = this.currentActionBeforeSnapshot.element;
        const after = this.snapshotElement(el);
        if (this.hasShapeDeformed(this.currentActionBeforeSnapshot, after)) {
          this.pushHistory({
            type: 'deform',
            element: el,
            before: this.currentActionBeforeSnapshot,
            after: after
          });
        }
      }
      this.currentActionBeforeSnapshot = null;

      this.isDraggingElement = false;
      this.hasDraggedElement = false;
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
          this.addElement(obs, true);
          this.setMode(CanvasMode.SELECT);
        }
        this.drawPoints = [];
      }
    });

    // ZOOM CON RUEDA DEL RATÓN (o cambiar tamaño de escoba con Shift)
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
            this.resizeInitialImageW = this.selectedElement.imageWorldWidth || 1.0;
            this.resizeInitialImageH = this.selectedElement.imageWorldHeight || 1.0;
            this.currentActionBeforeSnapshot = this.snapshotElement(this.selectedElement);
            return;
          }

          // 3. Comprobar si toca una figura para moverla
          const hit = this.findObstacleAt(worldPos);
          if (hit) {
            this.selectElement(hit);
            this.isDraggingElement = true;
            this.hasDraggedElement = false;
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
            this.currentActionBeforeSnapshot = this.snapshotElement(found.element);
          } else {
            const hit = this.findObstacleAt(worldPos);
            if (hit) {
              this.selectElement(hit);
            } else {
              this.selectElement(null);
              this.setMode(CanvasMode.SELECT);
            }
          }
        } else if (this.mode === CanvasMode.DRAW_FREEHAND) {
          this.isDrawing = true;
          this.drawPoints = [worldPos];
        } else if (this.mode === CanvasMode.DRAW_POLYGON) {
          if (this.drawPoints.length >= 3) {
            const d0 = Math.hypot(worldPos[0] - this.drawPoints[0][0], worldPos[1] - this.drawPoints[0][1]);
            if (d0 < 25.0 / this.zoomLevel) {
              this.finishPolygon();
              return;
            }
          }
          this.drawPoints.push(worldPos);
          if (this.onSceneChanged) this.onSceneChanged();
        } else if (this.mode === CanvasMode.PROBE) {
          const probe = new FlowProbe(worldPos[0], worldPos[1], `Sensor ${this.elements.length + 1}`);
          this.addElement(probe);
          this.setMode(CanvasMode.SELECT);
        } else if (this.mode === CanvasMode.CLEAN) {
          this.cleanFloodFillAt(worldPos[0], worldPos[1]);
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
          this.hasDraggedElement = true;
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
      const wasDragging = this.isDraggingElement;
      const draggedElem = this.selectedElement;
      const didMove = this.hasDraggedElement;

      // Desplazamiento de exactamente 1 píxel al soltar la pieza en pantalla táctil
      if (wasDragging && didMove && draggedElem) {
        if (this.mode === CanvasMode.SELECT && typeof draggedElem.translate === 'function') {
          const onePixelWorld = 1.0 / Math.max(0.001, this.zoomLevel);
          draggedElem.translate(onePixelWorld, 0.0);
        }
        this.fluid.rasterizeObstacles(this.elements);
        if (this.isLBMMode && this.lbm) {
          this.lbm.rasterizeObstacles(this.elements, this.fluid.domainWidth, this.fluid.domainHeight);
        }
        if (this.onSceneChanged) this.onSceneChanged();
        if (window.AerodynamicSweep && typeof window.AerodynamicSweep.triggerRealtimeUpdate === 'function') {
          window.AerodynamicSweep.triggerRealtimeUpdate(this);
        }
      }

      if (wasDragging && draggedElem && draggedElem.isBuoy) {
        const flow = this.getSurroundingFlow(draggedElem);
        draggedElem.vx = flow.u;
        draggedElem.vy = flow.v;
      }

      // Registro de Historial Undo para toques móviles (exclusivo para deformación de figura)
      if (this.currentActionBeforeSnapshot && this.currentActionBeforeSnapshot.element) {
        const el = this.currentActionBeforeSnapshot.element;
        const after = this.snapshotElement(el);
        if (this.hasShapeDeformed(this.currentActionBeforeSnapshot, after)) {
          this.pushHistory({
            type: 'deform',
            element: el,
            before: this.currentActionBeforeSnapshot,
            after: after
          });
        }
      }
      this.currentActionBeforeSnapshot = null;

      this.isDraggingElement = false;
      this.hasDraggedElement = false;
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
          this.addElement(obs, true);
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
      this.addElement(obs, true);
      this.setMode(CanvasMode.SELECT);
    }
    this.drawPoints = [];
  }

  cleanFloodFillAt(worldX, worldY) {
    if (this.fluid && typeof this.fluid.cleanFloodFill === 'function') {
      this.fluid.cleanFloodFill(worldX, worldY);
    }
    if (this.lbm && typeof this.lbm.cleanFloodFill === 'function') {
      const dw = this.fluid ? this.fluid.domainWidth : (this.domainWidth || 20.0);
      const dh = this.fluid ? this.fluid.domainHeight : ((this.domainWidth || 20.0) * (this.canvas.height / this.canvas.width));
      this.lbm.cleanFloodFill(worldX, worldY, dw, dh);
    }
  }

  cleanAt(worldX, worldY) {
    this.cleanFloodFillAt(worldX, worldY);
  }

  /**
   * Obtiene la velocidad promedio del flujo circundante a un obstáculo (fuera de sus celdas sólidas)
   */
  getSurroundingFlow(elem) {
    if (!elem) return { u: 0.0, v: 0.0 };

    const aabb = elem.getAABB();
    const centroid = elem.getCentroid();
    const dw = this.fluid.domainWidth;
    const dh = this.fluid.domainHeight;
    const dx = this.fluid.dx;
    const dy = this.fluid.dy;

    const width = Math.max(0.2, aabb[2] - aabb[0]);
    const height = Math.max(0.2, aabb[3] - aabb[1]);

    let sumU = 0.0;
    let sumV = 0.0;
    let totalWeight = 0.0;

    // Generar puntos de muestreo en el fluido inmediatamente exterior al obstáculo
    const samplePoints = [];

    // 1. Frente de choque aguas arriba (upstream): corriente incidente directa
    const frontX = aabb[0] - Math.max(0.12, dx * 1.5);
    for (let s = 0; s <= 4; s++) {
      const sy = aabb[1] + (s / 4.0) * height;
      samplePoints.push({ x: frontX, y: sy, weight: 3.0 });
    }

    // 2. Flancos superior e inferior
    const topY = aabb[1] - Math.max(0.12, dy * 1.5);
    const botY = aabb[3] + Math.max(0.12, dy * 1.5);
    for (let s = 0; s <= 4; s++) {
      const sx = aabb[0] + (s / 4.0) * width;
      samplePoints.push({ x: sx, y: topY, weight: 1.5 });
      samplePoints.push({ x: sx, y: botY, weight: 1.5 });
    }

    // 3. Estela aguas abajo (wake)
    const backX = aabb[2] + Math.max(0.12, dx * 1.5);
    for (let s = 0; s <= 4; s++) {
      const sy = aabb[1] + (s / 4.0) * height;
      samplePoints.push({ x: backX, y: sy, weight: 1.0 });
    }

    // 4. Anillo perimétrico elíptico exterior adicional
    const numAngles = 12;
    const rx = width * 0.65 + 0.18;
    const ry = height * 0.65 + 0.18;
    for (let k = 0; k < numAngles; k++) {
      const angle = (k / numAngles) * Math.PI * 2.0;
      const sx = centroid[0] + Math.cos(angle) * rx;
      const sy = centroid[1] + Math.sin(angle) * ry;
      const w = Math.cos(angle) < 0 ? 2.0 : 1.0;
      samplePoints.push({ x: sx, y: sy, weight: w });
    }

    // Muestreo según motor activo (LBM o Navier-Stokes CFD)
    if (this.isLBMMode && this.lbm) {
      const scaleToMs = (this.fluid && this.fluid.inflowSpeed ? this.fluid.inflowSpeed : 5.0) / Math.max(0.01, this.lbm.speed);
      for (let p of samplePoints) {
        if (p.x <= 0.05 || p.x >= dw - 0.05 || p.y <= 0.05 || p.y >= dh - 0.05) continue;
        const lx = Math.floor((p.x / dw) * this.lbm.nx);
        const ly = Math.floor((p.y / dh) * this.lbm.ny);
        if (lx < 1 || lx >= this.lbm.nx - 1 || ly < 1 || ly >= this.lbm.ny - 1) continue;
        const idx = lx + ly * this.lbm.nx;
        if (this.lbm.barrier[idx] !== 0) continue; // Descartar celdas sólidas

        const uVal = this.lbm.ux[idx] * scaleToMs;
        const vVal = this.lbm.uy[idx] * scaleToMs;
        sumU += uVal * p.weight;
        sumV += vVal * p.weight;
        totalWeight += p.weight;
      }
    } else if (this.fluid) {
      for (let p of samplePoints) {
        if (p.x <= 0.05 || p.x >= dw - 0.05 || p.y <= 0.05 || p.y >= dh - 0.05) continue;
        const gx = p.x / dx;
        const gy = p.y / dy;
        const igx = Math.round(gx);
        const igy = Math.round(gy);
        if (igx < 1 || igx >= this.fluid.nx - 1 || igy < 1 || igy >= this.fluid.ny - 1) continue;
        const id = igy * this.fluid.nx + igx;
        if (this.fluid.solid[id] !== 0) continue; // Descartar celdas sólidas

        const uVal = this.fluid.sampleBilinear(this.fluid.u, gx, gy);
        const vVal = this.fluid.sampleBilinear(this.fluid.v, gx, gy);
        sumU += uVal * p.weight;
        sumV += vVal * p.weight;
        totalWeight += p.weight;
      }
    }

    if (totalWeight > 0.0) {
      return { u: sumU / totalWeight, v: sumV / totalWeight };
    }

    // Respaldo físico si no hubo puntos fluidos válidos
    if (this.fluid && this.fluid.isFlowActive) {
      return {
        u: this.fluid.inflowSpeed * Math.cos(this.fluid.inflowAngle || 0.0),
        v: this.fluid.inflowSpeed * Math.sin(this.fluid.inflowAngle || 0.0)
      };
    }
    return { u: 0.0, v: 0.0 };
  }

  /**
   * Actualiza la física de objetos con giro autónomo y boyas que flotan con las corrientes.
   */
  updateDynamicObstacles(dt) {
    let obstaclesChanged = false;

    for (let i = 0; i < this.elements.length; i++) {
      const elem = this.elements[i];
      if (!elem || !elem.isActive || elem.isProbe) continue;

      // 1. Giro Autónomo sobre su propio eje (dirección derecha/horario o izquierda/antihorario)
      if (elem.isAutoRotating) {
        const dirSign = (elem.autoRotateDirection === 'ccw') ? -1.0 : 1.0;
        const rpm = Math.max(1, elem.autoRotateRPM || 5);
        const omega = dirSign * ((rpm * 2.0 * Math.PI) / 60.0); // rad/s
        const dTheta = omega * dt;
        elem.rotate(dTheta);
        elem.angularVelocity = omega;
        obstaclesChanged = true;

        if (this.selectedElement === elem && this.onElementRotationUpdate) {
          this.onElementRotationUpdate(elem);
        }
      } else if (elem.isBuoy && Math.abs(elem.angularVelocity || 0) > 1e-4) {
        // En flujo libre, amortiguar suavemente la rotación por viscosidad
        elem.angularVelocity *= Math.max(0.0, 1.0 - 3.5 * dt);
        if (Math.abs(elem.angularVelocity) < 1e-4) elem.angularVelocity = 0.0;
      } else {
        elem.angularVelocity = 0.0;
      }

      // 2. Boya flotante: Dinámica de cuerpo rígido con fuerzas hidrodinámicas e impulsos de pared
      if (elem.isBuoy && (!this.isDraggingElement || this.selectedElement !== elem)) {
        const flow = this.getSurroundingFlow(elem);
        const mass = elem.getMass();
        const inertia = elem.getInertia();
        const dw = this.fluid.domainWidth;
        const dh = this.fluid.domainHeight;
        const pad = 0.08;
        const x_right = dw - pad;
        const x_left = pad;
        const y_top = pad;
        const y_bottom = dh - pad;

        // Si el elemento no tenía velocidad aún y el flujo está activo, inicializar
        if (Math.abs(elem.vx || 0) < 1e-4 && Math.abs(elem.vy || 0) < 1e-4 && (Math.abs(flow.u) > 0.05 || Math.abs(flow.v) > 0.05)) {
          elem.vx = flow.u;
          elem.vy = flow.v;
        }

        // 2a. Relajación por arrastre hidrodinámico (acelera hacia la corriente local)
        const dragK = 5.0;
        elem.vx = (elem.vx || 0.0) + (flow.u - (elem.vx || 0.0)) * Math.min(1.0, dragK * dt);
        elem.vy = (elem.vy || 0.0) + (flow.v - (elem.vy || 0.0)) * Math.min(1.0, dragK * dt);

        // Disipación angular por viscosidad del fluido
        elem.angularVelocity = (elem.angularVelocity || 0.0) * Math.max(0.0, 1.0 - 3.5 * dt);

        // Movimiento tentativo en este paso temporal
        const dx = elem.vx * dt;
        const dy = elem.vy * dt;
        elem.translate(dx, dy);

        if (!elem.isAutoRotating && Math.abs(elem.angularVelocity || 0) > 1e-5) {
          const dTheta = elem.angularVelocity * dt;
          elem.rotate(dTheta, elem.getCentroid());
          if (this.selectedElement === elem && this.onElementRotationUpdate) {
            this.onElementRotationUpdate(elem);
          }
        }

        // 2b. Resolución de contactos físicos con las 4 paredes del túnel
        const pts = elem.boundaryPoints;
        const c = elem.getCentroid();

        // --- PARED DERECHA (Salida x = x_right) ---
        const penRight = [];
        for (let i = 0; i < pts.length; i++) {
          if (pts[i][0] > x_right) penRight.push(pts[i]);
        }
        if (penRight.length > 0) {
          // Torque inducido por la corriente incidente para cuerpos alargados apoyados en la pared:
          // La corriente incidente empuja el extremo aguas arriba hacia la pared ("recostarse")
          if (!elem.isAutoRotating) {
            const curAngleRad = ((elem.currentRotationDeg || 0.0) * Math.PI) / 180.0;
            let aNorm = curAngleRad % (2.0 * Math.PI);
            if (aNorm > Math.PI) aNorm -= 2.0 * Math.PI;
            if (aNorm < -Math.PI) aNorm += 2.0 * Math.PI;

            let alignSign = (aNorm >= 0.0) ? 1.0 : -1.0;
            if (Math.abs(aNorm) < 0.03) {
              if (flow.v > 0.02) alignSign = -1.0;
              else if (flow.v < -0.02) alignSign = 1.0;
              else alignSign = (c[1] >= dh * 0.5) ? 1.0 : -1.0;
            }
            const alignTorque = 3.5 * Math.max(0.2, flow.u) * Math.cos(aNorm) * alignSign;
            elem.angularVelocity = (elem.angularVelocity || 0.0) + (alignTorque / inertia) * dt;
          }

          // Contact manifold de 1 o 2 puntos extremos (arriba y abajo)
          let pTop = penRight[0], pBot = penRight[0];
          for (let i = 1; i < penRight.length; i++) {
            if (penRight[i][1] < pTop[1]) pTop = penRight[i];
            if (penRight[i][1] > pBot[1]) pBot = penRight[i];
          }
          const contacts = (pTop !== pBot && (pBot[1] - pTop[1]) > 0.04) ? [pTop, pBot] : [pTop];

          for (let k = 0; k < contacts.length; k++) {
            const cp = contacts[k];
            const depth = cp[0] - x_right;
            const rx = cp[0] - c[0];
            let ry = cp[1] - c[1];
            if (Math.abs(ry) < 0.01) {
              ry += (c[1] >= dh * 0.5) ? 0.015 : -0.015;
            }
            const vp_x = elem.vx - (elem.angularVelocity || 0.0) * ry;
            const inv_m = (1.0 / (mass * contacts.length)) + (ry * ry / inertia);
            const m_eff = 1.0 / Math.max(1e-4, inv_m);
            const Jn = m_eff * (Math.max(0.0, vp_x) + (0.6 * depth / dt));
            elem.vx -= Jn / mass;
            if (!elem.isAutoRotating) {
              elem.angularVelocity = (elem.angularVelocity || 0.0) + (ry * Jn) / inertia;
            }
          }
        }

        // --- PARED SUPERIOR (Techo y = y_top) ---
        const penTop = [];
        for (let i = 0; i < pts.length; i++) {
          if (pts[i][1] < y_top) penTop.push(pts[i]);
        }
        if (penTop.length > 0) {
          let pMinX = penTop[0], pMaxX = penTop[0];
          for (let i = 1; i < penTop.length; i++) {
            if (penTop[i][0] < pMinX[0]) pMinX = penTop[i];
            if (penTop[i][0] > pMaxX[0]) pMaxX = penTop[i];
          }
          const contacts = (pMinX !== pMaxX && (pMaxX[0] - pMinX[0]) > 0.04) ? [pMinX, pMaxX] : [pMinX];
          for (let k = 0; k < contacts.length; k++) {
            const cp = contacts[k];
            const depth = y_top - cp[1];
            const rx = cp[0] - c[0];
            const vp_y = -elem.vy - (elem.angularVelocity || 0.0) * rx;
            const inv_m = (1.0 / (mass * contacts.length)) + (rx * rx / inertia);
            const m_eff = 1.0 / Math.max(1e-4, inv_m);
            const Jn = m_eff * (Math.max(0.0, vp_y) + (0.6 * depth / dt));
            elem.vy += Jn / mass;
            if (!elem.isAutoRotating) {
              elem.angularVelocity = (elem.angularVelocity || 0.0) + (rx * Jn) / inertia;
            }
          }
        }

        // --- PARED INFERIOR (Suelo y = y_bottom) ---
        const penBot = [];
        for (let i = 0; i < pts.length; i++) {
          if (pts[i][1] > y_bottom) penBot.push(pts[i]);
        }
        if (penBot.length > 0) {
          let pMinX = penBot[0], pMaxX = penBot[0];
          for (let i = 1; i < penBot.length; i++) {
            if (penBot[i][0] < pMinX[0]) pMinX = penBot[i];
            if (penBot[i][0] > pMaxX[0]) pMaxX = penBot[i];
          }
          const contacts = (pMinX !== pMaxX && (pMaxX[0] - pMinX[0]) > 0.04) ? [pMinX, pMaxX] : [pMinX];
          for (let k = 0; k < contacts.length; k++) {
            const cp = contacts[k];
            const depth = cp[1] - y_bottom;
            const rx = cp[0] - c[0];
            const vp_y = elem.vy + (elem.angularVelocity || 0.0) * rx;
            const inv_m = (1.0 / (mass * contacts.length)) + (rx * rx / inertia);
            const m_eff = 1.0 / Math.max(1e-4, inv_m);
            const Jn = m_eff * (Math.max(0.0, vp_y) + (0.6 * depth / dt));
            elem.vy -= Jn / mass;
            if (!elem.isAutoRotating) {
              elem.angularVelocity = (elem.angularVelocity || 0.0) - (rx * Jn) / inertia;
            }
          }
        }

        // --- PARED IZQUIERDA (Entrada x = x_left) ---
        for (let i = 0; i < pts.length; i++) {
          if (pts[i][0] < x_left && elem.vx < 0) {
            elem.vx = Math.abs(elem.vx) * 0.5;
            break;
          }
        }

        // 2c. Corrección estricta de posición para evitar penetración visual
        const curPts = elem.boundaryPoints;
        let maxBoundX = -Infinity, minBoundX = Infinity;
        let maxBoundY = -Infinity, minBoundY = Infinity;
        for (let i = 0; i < curPts.length; i++) {
          const p = curPts[i];
          if (p[0] > maxBoundX) maxBoundX = p[0];
          if (p[0] < minBoundX) minBoundX = p[0];
          if (p[1] > maxBoundY) maxBoundY = p[1];
          if (p[1] < minBoundY) minBoundY = p[1];
        }

        let shiftX = 0.0, shiftY = 0.0;
        if (maxBoundX > x_right) shiftX = x_right - maxBoundX;
        else if (minBoundX < x_left) shiftX = x_left - minBoundX;

        if (maxBoundY > y_bottom) shiftY = y_bottom - maxBoundY;
        else if (minBoundY < y_top) shiftY = y_top - minBoundY;

        if (Math.abs(shiftX) > 1e-5 || Math.abs(shiftY) > 1e-5) {
          elem.translate(shiftX, shiftY);
        }

        // Estabilización en reposo sobre la pared
        if (penRight.length > 1 && Math.abs(elem.angularVelocity || 0) < 1.0) {
          elem.angularVelocity *= 0.85;
        }
        elem.angularVelocity = Math.max(-10.0, Math.min(10.0, elem.angularVelocity || 0.0));

        obstaclesChanged = true;
      }
    }

    // 2. Colisiones físicas entre objetos (boya contra otros obstáculos o entre boyas)
    const anyBuoy = this.elements.some(e => e && e.isActive && e.isBuoy);
    if (anyBuoy && this.elements.length > 1) {
      if (this.resolveAllObstacleCollisions(dt)) {
        obstaclesChanged = true;
      }
    }

    if (obstaclesChanged) {
      this.fluid.rasterizeObstacles(this.elements);
      if (this.isLBMMode) {
        this.lbm.rasterizeObstacles(this.elements, this.fluid.domainWidth, this.fluid.domainHeight);
      }
    }
  }

  /**
   * Detecta colisión geométrica precisa entre dos obstáculos mediante SAT (Separating Axis Theorem).
   * Devuelve { normal: [nx, ny], depth: number, contactPoint: [cx, cy] } o null si no colisionan.
   */
  detectObstacleCollision(elemA, elemB) {
    if (!elemA || !elemB || !elemA.isActive || !elemB.isActive) return null;
    if (elemA.isProbe || elemB.isProbe) return null;

    const aabbA = elemA.getAABB();
    const aabbB = elemB.getAABB();

    // 1. Fase Amplia (Broadphase AABB)
    if (aabbA[2] < aabbB[0] || aabbA[0] > aabbB[2] || aabbA[3] < aabbB[1] || aabbA[1] > aabbB[3]) {
      return null;
    }

    const cA = elemA.getCentroid();
    const cB = elemB.getCentroid();
    const dx = cB[0] - cA[0];
    const dy = cB[1] - cA[1];
    const dist = Math.hypot(dx, dy);
    const rA = elemA.getBoundingRadius();
    const rB = elemB.getBoundingRadius();

    // 2. Fase de Esferas Envolventes
    if (dist > rA + rB) {
      return null;
    }

    const ptsA = elemA.boundaryPoints;
    const ptsB = elemB.boundaryPoints;
    if (!ptsA || ptsA.length < 3 || !ptsB || ptsB.length < 3) {
      return null;
    }

    // 3. Fase Estricta (Narrowphase SAT)
    let minOverlap = Infinity;
    let bestAxisX = 0.0;
    let bestAxisY = 0.0;

    const testAxis = (nx, ny) => {
      let minA = Infinity, maxA = -Infinity;
      for (let i = 0; i < ptsA.length; i++) {
        const p = ptsA[i][0] * nx + ptsA[i][1] * ny;
        if (p < minA) minA = p;
        if (p > maxA) maxA = p;
      }

      let minB = Infinity, maxB = -Infinity;
      for (let i = 0; i < ptsB.length; i++) {
        const p = ptsB[i][0] * nx + ptsB[i][1] * ny;
        if (p < minB) minB = p;
        if (p > maxB) maxB = p;
      }

      if (maxA < minB || maxB < minA) {
        return false; // Eje de separación encontrado: los cuerpos no se tocan
      }

      const overlap = Math.min(maxA - minB, maxB - minA);
      if (overlap < minOverlap) {
        minOverlap = overlap;
        bestAxisX = nx;
        bestAxisY = ny;
      }
      return true;
    };

    // Muestreo de ejes perpendiculares a los segmentos de borde
    const collectAxes = (pts) => {
      const n = pts.length;
      const step = Math.max(1, Math.floor(n / 16));
      for (let i = 0; i < n; i += step) {
        const p1 = pts[i];
        const p2 = pts[(i + 1) % n];
        const edx = p2[0] - p1[0];
        const edy = p2[1] - p1[1];
        const el = Math.hypot(edx, edy);
        if (el < 1e-7) continue;
        const nx = -edy / el;
        const ny = edx / el;
        if (!testAxis(nx, ny)) return false;
      }
      return true;
    };

    if (!collectAxes(ptsA)) return null;
    if (!collectAxes(ptsB)) return null;

    // Eje entre centroides para máxima estabilidad en perfiles aerodinámicos curvados
    if (dist > 1e-6) {
      if (!testAxis(dx / dist, dy / dist)) return null;
    }

    if (minOverlap <= 1e-5 || !isFinite(minOverlap)) {
      return null;
    }

    // Alinear la normal para que apunte estrictamente desde A hacia B
    if (dx * bestAxisX + dy * bestAxisY < 0) {
      bestAxisX = -bestAxisX;
      bestAxisY = -bestAxisY;
    }

    // Estimar el punto medio de contacto en la zona de penetración
    let deepestA = ptsA[0], maxProjA = -Infinity;
    for (let i = 0; i < ptsA.length; i++) {
      const proj = ptsA[i][0] * bestAxisX + ptsA[i][1] * bestAxisY;
      if (proj > maxProjA) { maxProjA = proj; deepestA = ptsA[i]; }
    }

    let deepestB = ptsB[0], minProjB = Infinity;
    for (let i = 0; i < ptsB.length; i++) {
      const proj = ptsB[i][0] * bestAxisX + ptsB[i][1] * bestAxisY;
      if (proj < minProjB) { minProjB = proj; deepestB = ptsB[i]; }
    }

    const contactX = (deepestA[0] + deepestB[0]) * 0.5;
    const contactY = (deepestA[1] + deepestB[1]) * 0.5;

    return {
      normal: [bestAxisX, bestAxisY],
      depth: minOverlap,
      contactPoint: [contactX, contactY]
    };
  }

  /**
   * Resuelve el choque físico respetando la conservación de cantidad de movimiento lineal y angular.
   */
  resolveObstacleCollision(elemA, elemB, col) {
    const isA_Dynamic = Boolean(elemA.isBuoy && (!this.isDraggingElement || this.selectedElement !== elemA));
    const isB_Dynamic = Boolean(elemB.isBuoy && (!this.isDraggingElement || this.selectedElement !== elemB));

    if (!isA_Dynamic && !isB_Dynamic) return false;

    const nx = col.normal[0];
    const ny = col.normal[1];
    const depth = col.depth;
    const [cpx, cpy] = col.contactPoint;

    const cA = elemA.getCentroid();
    const cB = elemB.getCentroid();

    // 1. Masas e inercias (cuerpo estático = masa infinita, invMass = 0)
    const mA = isA_Dynamic ? elemA.getMass() : Infinity;
    const mB = isB_Dynamic ? elemB.getMass() : Infinity;
    const invMassA = isA_Dynamic ? 1.0 / mA : 0.0;
    const invMassB = isB_Dynamic ? 1.0 / mB : 0.0;
    const invMassSum = invMassA + invMassB;
    if (invMassSum <= 0.0) return false;

    const IA = isA_Dynamic ? elemA.getInertia() : Infinity;
    const IB = isB_Dynamic ? elemB.getInertia() : Infinity;
    const invIA = isA_Dynamic ? 1.0 / IA : 0.0;
    const invIB = isB_Dynamic ? 1.0 / IB : 0.0;

    // Brazos de palanca desde centro de masa al punto de contacto
    const rAx = cpx - cA[0];
    const rAy = cpy - cA[1];
    const rBx = cpx - cB[0];
    const rBy = cpy - cB[1];

    // Velocidades en el punto de contacto (v_lineal + omega x r)
    const omegaA = elemA.angularVelocity || 0.0;
    const omegaB = elemB.angularVelocity || 0.0;
    const uAx = (elemA.vx || 0.0) - omegaA * rAy;
    const uAy = (elemA.vy || 0.0) + omegaA * rAx;
    const uBx = (elemB.vx || 0.0) - omegaB * rBy;
    const uBy = (elemB.vy || 0.0) + omegaB * rBx;

    // Velocidad relativa (A respecto a B)
    const relVx = uAx - uBx;
    const relVy = uAy - uBy;

    // Proyección sobre la normal (positivo si se están aproximando)
    const relVn = relVx * nx + relVy * ny;

    // Coeficiente de restitución (amortiguado por agua/aire circundante)
    const restitution = 0.65;
    // Coeficiente de fricción tangencial
    const friction = 0.15;

    // Si los cuerpos están aproximándose, aplicar impulsos elásticos
    if (relVn > 0.0) {
      const rAn = rAx * ny - rAy * nx;
      const rBn = rBx * ny - rBy * nx;
      const Kn = invMassSum + invIA * rAn * rAn + invIB * rBn * rBn;

      // Magnitud del impulso normal de choque
      const Jn = -(1.0 + restitution) * relVn / Math.max(Kn, 1e-6);

      // Tangente perpendicular al choque
      const tx = -ny;
      const ty = nx;
      const relVt = relVx * tx + relVy * ty;
      const rAt = rAx * ty - rAy * tx;
      const rBt = rBx * ty - rBy * tx;
      const Kt = invMassSum + invIA * rAt * rAt + invIB * rBt * rBt;

      let Jt = -relVt / Math.max(Kt, 1e-6);
      const maxFriction = friction * Math.abs(Jn);
      if (Math.abs(Jt) > maxFriction) {
        Jt = Math.sign(Jt) * maxFriction;
      }

      // Vector de impulso total J sobre A (y -J sobre B por tercera ley de Newton)
      const Jx = Jn * nx + Jt * tx;
      const Jy = Jn * ny + Jt * ty;

      if (isA_Dynamic) {
        elemA.vx = (elemA.vx || 0.0) + Jx * invMassA;
        elemA.vy = (elemA.vy || 0.0) + Jy * invMassA;
        if (!elemA.isAutoRotating) {
          elemA.angularVelocity = (elemA.angularVelocity || 0.0) + (rAx * Jy - rAy * Jx) * invIA;
        }
      }

      if (isB_Dynamic) {
        elemB.vx = (elemB.vx || 0.0) - Jx * invMassB;
        elemB.vy = (elemB.vy || 0.0) - Jy * invMassB;
        if (!elemB.isAutoRotating) {
          elemB.angularVelocity = (elemB.angularVelocity || 0.0) - (rBx * Jy - rBy * Jx) * invIB;
        }
      }
    }

    // 2. Separación cinemática de posiciones para impedir interpenetración
    const slop = 0.003;
    const separation = Math.max(0.0, depth + slop);
    if (separation > 0.0) {
      const sepA = (invMassA / invMassSum) * separation;
      const sepB = (invMassB / invMassSum) * separation;

      if (isA_Dynamic) {
        elemA.translate(-sepA * nx, -sepA * ny);
      }
      if (isB_Dynamic) {
        elemB.translate(sepB * nx, sepB * ny);
      }
    }

    // 3. Asegurar contención dentro de los límites físicos del túnel
    const dw = this.fluid.domainWidth;
    const dh = this.fluid.domainHeight;
    const pad = 0.08;

    const clampElement = (elem) => {
      const aabb = elem.getAABB();
      let shiftX = 0.0, shiftY = 0.0;
      if (aabb[1] < pad) { shiftY = pad - aabb[1]; elem.vy = Math.abs(elem.vy || 0) * 0.5; }
      else if (aabb[3] > dh - pad) { shiftY = (dh - pad) - aabb[3]; elem.vy = -Math.abs(elem.vy || 0) * 0.5; }
      if (aabb[0] < pad) { shiftX = pad - aabb[0]; elem.vx = Math.abs(elem.vx || 0) * 0.5; }
      else if (aabb[2] > dw - pad) { shiftX = (dw - pad) - aabb[2]; elem.vx = 0.0; }
      if (Math.abs(shiftX) > 1e-6 || Math.abs(shiftY) > 1e-6) {
        elem.translate(shiftX, shiftY);
      }
    };

    if (isA_Dynamic) clampElement(elemA);
    if (isB_Dynamic) clampElement(elemB);

    return true;
  }

  /**
   * Ejecuta la resolución de colisiones entre todas las parejas de obstáculos en la escena.
   */
  resolveAllObstacleCollisions(dt) {
    let anyCollision = false;
    const maxPasses = 2;

    for (let pass = 0; pass < maxPasses; pass++) {
      let passCollided = false;
      const n = this.elements.length;

      for (let i = 0; i < n; i++) {
        const elemA = this.elements[i];
        if (!elemA || !elemA.isActive || elemA.isProbe) continue;

        for (let j = i + 1; j < n; j++) {
          const elemB = this.elements[j];
          if (!elemB || !elemB.isActive || elemB.isProbe) continue;
          if (!elemA.isBuoy && !elemB.isBuoy) continue; // Al menos uno debe ser dinámico

          const col = this.detectObstacleCollision(elemA, elemB);
          if (col) {
            if (this.resolveObstacleCollision(elemA, elemB, col)) {
              passCollided = true;
              anyCollision = true;
            }
          }
        }
      }

      if (!passCollided) break; // Sin colisiones en este pase, salir
    }

    return anyCollision;
  }

  // --- BUCLE PRINCIPAL DE FÍSICA Y RENDERIZADO (60 FPS) ---
  renderLoop() {
    if (this.isRendering) {
      // Mientras se procesa el video acelerado con barra de carga, la simulación de fondo se queda pausada
      // para liberar el 100% de los recursos del procesador para la codificación del video.
      requestAnimationFrame(() => this.renderLoop());
      return;
    }

    if (this.width <= 20 || this.height <= 20 || this.zoomLevel <= 5.0) {
      this.resizeCanvas();
    }

    const now = performance.now();
    let dt = (now - this.lastTime) / 1000.0;
    this.lastTime = now;
    if (dt > 0.05) dt = 0.03;

    if (!this.isPaused) {
      const effectiveDt = dt * this.simSpeedMultiplier;
      this.updateDynamicObstacles(effectiveDt);

      if (this.isLBMMode) {
        // En modo Lattice-Boltzmann D2Q9, corremos los pasos de colisión y streaming
        this.lbm.step();
      } else {
        // Sub-paso para estabilidad física y precisión aerodinámica en Navier-Stokes
        const steps = 2;
        const subDt = effectiveDt / steps;
        for (let s = 0; s < steps; s++) {
          this.fluid.step(subDt);
        }
      }
    }

    this.render();
    this.updateThrusterFloatingUI();

    // Actualizar telemetría hidrodinámica del elemento seleccionado o de la retícula LBM
    if (this.onTelemetryUpdate) {
      if (this.isLBMMode) {
        const fade = (this.lbm && typeof this.lbm.flowFadeFactor === 'number') ? this.lbm.flowFadeFactor : 1.0;
        const uSpeed = Math.max(0.0, this.lbm.speed * fade);
        const Re = Math.round((1.0 * uSpeed * 95) / Math.max(0.005, this.lbm.viscosity));
        const Fd = Math.abs(this.lbm.barrierFx);
        const Fl = this.lbm.barrierFy;
        const cd = (uSpeed > 0.005) ? Fd / (0.5 * uSpeed * uSpeed * 22.0 + 1e-5) : 0.0;
        const cl = (uSpeed > 0.005) ? Fl / (0.5 * uSpeed * uSpeed * 22.0 + 1e-5) : 0.0;
        const eff = (Math.abs(cd) > 1e-4) ? Math.abs(cl) / (Math.abs(cd) + 1e-4) : 0.0;
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

    // Actualización continua en tiempo real de la gráfica aerodinámica ante cualquier cambio en el túnel
    if (window.AerodynamicSweep && typeof window.AerodynamicSweep.triggerRealtimeUpdate === 'function') {
      const nowSweep = performance.now();
      if (!this._lastSweepRealtimeUpdate || (nowSweep - this._lastSweepRealtimeUpdate) >= 120) {
        this._lastSweepRealtimeUpdate = nowSweep;
        window.AerodynamicSweep.triggerRealtimeUpdate(this);
      }
    }

    requestAnimationFrame(() => this.renderLoop());
  }

  // --- RENDERIZADO VISUAL CFD / LBM ---
  render(targetCtx = null) {
    // Si no es un renderizado a canvas offscreen, verificación dinámica de dimensiones del lienzo principal
    if (!targetCtx) {
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && (Math.abs(rect.width - this.width) > 1.5 || Math.abs(rect.height - this.height) > 1.5)) {
        this.resizeCanvas();
      }
    }

    const ctx = targetCtx || this.ctx;
    const dpr = window.devicePixelRatio || 1;
    if (targetCtx) {
      targetCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const w = this.width;
    const h = this.height;

    // Fondo general del canvas siempre oscuro y elegante
    ctx.fillStyle = '#090b10';
    ctx.fillRect(0, 0, w, h);

    ctx.save();

    const origin = this.worldToScreen(0, 0);
    const domainPixelW = this.fluid.domainWidth * this.zoomLevel;
    const domainPixelH = this.fluid.domainHeight * this.zoomLevel;

    // En CFD Aerodinámica DES/LES, solo el rectángulo del dominio de simulación es claro
    if (this.visMode === VisMode.CFD_DES_LES) {
      ctx.fillStyle = '#eef0f3';
      ctx.fillRect(origin.x, origin.y, domainPixelW, domainPixelH);
    } else if (this.visMode === VisMode.CFD_COMBUSTION) {
      ctx.fillStyle = '#030733';
      ctx.fillRect(origin.x, origin.y, domainPixelW, domainPixelH);
    }

    if (this.isLBMMode) {
      // 1. Renderizar campo Lattice-Boltzmann (Modelo y Modos de Visor por Dan Schroeder, Weber State University: https://physics.weber.edu/schroeder/fluids/)
      const hasActiveThrusters = (this.elements || []).some(o => o && o.isActive && o.isThruster && (o.thrustSpeed || 0) > 0.05);
      const fade = (this.lbm && typeof this.lbm.flowFadeFactor === 'number')
        ? (hasActiveThrusters ? 1.0 : this.lbm.flowFadeFactor)
        : 1.0;

      if (fade > 0.001) {
        let plotType = 'curl';
        if (this.visMode === VisMode.SCHROEDER_SPEED) plotType = 'speed';
        else if (this.visMode === VisMode.SCHROEDER_FLOWLINES) plotType = 'curl';

        this.lbm.renderToImageData(this.lbmPixelBuffer, plotType);
        this.lbmOffscreenCtx.putImageData(this.lbmPixelBuffer, 0, 0);

        // Interpolación bilineal de alta calidad para eliminar pixelado y lograr gradientes HD suaves
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(this.lbmOffscreenCanvas, origin.x, origin.y, domainPixelW, domainPixelH);
        ctx.restore();

        // Rejilla del túnel sutil en visualizaciones Schroeder LBM
        if (this.showGrid) {
          this.drawWindTunnelGrid(ctx);
        }

        // Líneas de flujo de Schroeder (sólo en modo específico de líneas o activación manual)
        if (this.showFlowlines || this.showLBMFlowlines || this.visMode === VisMode.SCHROEDER_FLOWLINES) {
          const cellPixelW = domainPixelW / this.lbm.nx;
          const cellPixelH = domainPixelH / this.lbm.ny;
          ctx.save();
          ctx.globalAlpha = fade;
          this.lbm.drawFlowlines(ctx, origin, cellPixelW, cellPixelH);
          ctx.restore();
        }

        // Trazadores de Schroeder (sólo si se activan explícitamente)
        if (this.showLBMTracers) {
          const cellPixelW = domainPixelW / this.lbm.nx;
          const cellPixelH = domainPixelH / this.lbm.ny;
          ctx.save();
          ctx.globalAlpha = fade;
          this.lbm.drawTracers(ctx, origin, cellPixelW, cellPixelH);
          ctx.restore();
        }
      }

      // Dibujar contornos de obstáculos si existen
      this.drawObstacles(ctx);
    } else {
      // 1. Renderizar campo Navier-Stokes (HD bilineal continuo en CFD DES/LES, Combustión y Vorticidad, estándar en los demás)
      if (this.visMode === VisMode.CFD_DES_LES) {
        this.renderFluidFieldDesLes();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(this.hdOffscreenCanvas, origin.x, origin.y, domainPixelW, domainPixelH);
      } else if (this.visMode === VisMode.CFD_COMBUSTION) {
        this.renderFluidFieldCombustionHD();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(this.hdOffscreenCanvas, origin.x, origin.y, domainPixelW, domainPixelH);
      } else if (this.visMode === VisMode.VORTICITY) {
        this.renderFluidFieldVorticityHD();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(this.hdOffscreenCanvas, origin.x, origin.y, domainPixelW, domainPixelH);
      } else {
        this.renderFluidField();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(this.offscreenCanvas, origin.x, origin.y, domainPixelW, domainPixelH);
      }

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

      // 4b. Líneas de flujo vectoriales instantáneas (opción global para todos los modos)
      if (this.showFlowlines) {
        this.drawNavierStokesFlowlines(ctx, origin, domainPixelW, domainPixelH);
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

  initDesLesLut() {
    this.desLesLut = new Uint32Array(512);
    for (let i = 0; i < 512; i++) {
      const s = i / 511.0;
      let r, g, b;
      if (s < 0.025) {
        // Fondo limpio idéntico al freestream del vídeo de referencia (vorticidad cero / flujo libre)
        r = 238; g = 240; b = 243;
      } else if (s < 0.28) {
        // Niebla gris suave a carbón oscuro (estela suave y contorno exterior de los vórtices)
        const k = (s - 0.025) / 0.255;
        r = Math.floor(238 * (1 - k) + 24 * k);
        g = Math.floor(240 * (1 - k) + 26 * k);
        b = Math.floor(243 * (1 - k) + 32 * k);
      } else if (s < 0.44) {
        // Carbón profundo / obsidiana hacia azul petróleo profundo (anillo oscuro perimetral del vórtice)
        const k = (s - 0.28) / 0.16;
        r = Math.floor(24 * (1 - k) + 2 * k);
        g = Math.floor(26 * (1 - k) + 34 * k);
        b = Math.floor(32 * (1 - k) + 68 * k);
      } else if (s < 0.70) {
        // Azul petróleo a cian eléctrico brillante
        const k = (s - 0.44) / 0.26;
        r = Math.floor(2 * (1 - k) + 38 * k);
        g = Math.floor(34 * (1 - k) + 175 * k);
        b = Math.floor(68 * (1 - k) + 196 * k);
      } else if (s < 0.88) {
        // Cian eléctrico a cian hielo / turquesa luminoso
        const k = (s - 0.70) / 0.18;
        r = Math.floor(38 * (1 - k) + 120 * k);
        g = Math.floor(175 * (1 - k) + 235 * k);
        b = Math.floor(196 * (1 - k) + 225 * k);
      } else {
        // Cian hielo a núcleo brillante blanco-turquesa de máxima cizalladura
        const k = (s - 0.88) / 0.12;
        r = Math.floor(120 * (1 - k) + 225 * k);
        g = Math.floor(235 * (1 - k) + 255 * k);
        b = Math.floor(225 * (1 - k) + 252 * k);
      }
      // Formato little-endian Uint32 (ABGR: 0xAABBGGRR)
      this.desLesLut[i] = (255 << 24) | (b << 16) | (g << 8) | r;
    }
  }

  renderFluidFieldDesLes() {
    const nx = this.fluid.nx;
    const ny = this.fluid.ny;
    const size = nx * ny;
    const vort = this.fluid.vorticity;
    const solid = this.fluid.solid;
    const hdW = this.hdW;
    const hdH = this.hdH;
    const lut = this.desLesLut;
    const pixelData = this.hdPixelData;

    // 1. Preparar campo de magnitud de vorticidad con extrapolación en la frontera de sólidos
    if (!this.extrapolatedVorticity || this.extrapolatedVorticity.length !== size) {
      this.extrapolatedVorticity = new Float32Array(size);
    }
    const extVort = this.extrapolatedVorticity;

    let hasSolids = false;
    for (let k = 0; k < size; k++) {
      extVort[k] = Math.abs(vort[k]);
      if (solid[k] !== 0) hasSolids = true;
    }

    if (hasSolids) {
      // Extrapolar 2 capas hacia el interior de las figuras sólidas para que la capa límite
      // de alta cizalladura (cian brillante) corte perfectamente contra el borde del perfil
      for (let pass = 0; pass < 2; pass++) {
        for (let j = 1; j < ny - 1; j++) {
          const row = j * nx;
          for (let i = 1; i < nx - 1; i++) {
            const id = row + i;
            if (solid[id] !== 0) {
              let sum = 0, count = 0;
              const n1 = id - 1; if (solid[n1] === 0 || extVort[n1] > 0) { sum += extVort[n1]; count++; }
              const n2 = id + 1; if (solid[n2] === 0 || extVort[n2] > 0) { sum += extVort[n2]; count++; }
              const n3 = id - nx; if (solid[n3] === 0 || extVort[n3] > 0) { sum += extVort[n3]; count++; }
              const n4 = id + nx; if (solid[n4] === 0 || extVort[n4] > 0) { sum += extVort[n4]; count++; }
              if (count > 0) {
                extVort[id] = sum / count;
              }
            }
          }
        }
      }
    }

    // 2. Escala de vorticidad normalizada basada en la velocidad de referencia del flujo
    const refSpeed = Math.max(1.0, this.fluid.inflowSpeed || 5.0);
    const maxVort = Math.max(12.0, refSpeed * 3.8);

    // 3. Muestreo bilineal HD y mapeo continuo a la LUT
    const scaleX = (nx - 1) / (hdW - 1);
    const scaleY = (ny - 1) / (hdH - 1);
    let pIdx = 0;

    for (let py = 0; py < hdH; py++) {
      const gy = py * scaleY;
      const j0 = gy | 0;
      const j1 = (j0 < ny - 1) ? j0 + 1 : j0;
      const fy = gy - j0;
      const row0 = j0 * nx;
      const row1 = j1 * nx;

      for (let px = 0; px < hdW; px++) {
        const gx = px * scaleX;
        const i0 = gx | 0;
        const i1 = (i0 < nx - 1) ? i0 + 1 : i0;
        const fx = gx - i0;

        const val0 = extVort[row0 + i0] * (1.0 - fx) + extVort[row0 + i1] * fx;
        const val1 = extVort[row1 + i0] * (1.0 - fx) + extVort[row1 + i1] * fx;
        const wVal = val0 * (1.0 - fy) + val1 * fy;

        const norm = Math.min(1.0, Math.pow(wVal / maxVort, 0.85));
        const lutIdx = (norm * 511.0) | 0;

        pixelData[pIdx++] = lut[lutIdx];
      }
    }

    this.hdOffscreenCtx.putImageData(this.hdPixelBuffer, 0, 0);
  }

  initVorticityLut() {
    this.vorticityLut = new Uint32Array(512);
    // 0..255: negativo (giro horario, rojo carmesí vivo a naranja)
    // 256: neutral (14, 18, 28)
    // 257..511: positivo (giro antihorario, azul eléctrico a cian brillante)
    for (let i = 0; i < 512; i++) {
      let r, g, b;
      if (i < 256) {
        const t = Math.pow((255 - i) / 255.0, 0.65);
        r = Math.floor(14 * (1 - t) + 252 * t);
        g = Math.floor(18 * (1 - t) + 50 * t);
        b = Math.floor(28 * (1 - t) + 40 * t);
      } else {
        const t = Math.pow((i - 256) / 255.0, 0.65);
        r = Math.floor(14 * (1 - t) + 25 * t);
        g = Math.floor(18 * (1 - t) + 175 * t);
        b = Math.floor(28 * (1 - t) + 255 * t);
      }
      this.vorticityLut[i] = (255 << 24) | (b << 16) | (g << 8) | r;
    }
  }

  renderFluidFieldVorticityHD() {
    const nx = this.fluid.nx;
    const ny = this.fluid.ny;
    const size = nx * ny;
    const vort = this.fluid.vorticity;
    const solid = this.fluid.solid;
    const hdW = this.hdW;
    const hdH = this.hdH;
    const lut = this.vorticityLut;
    const pixelData = this.hdPixelData;

    if (!this.extrapolatedSignedVort || this.extrapolatedSignedVort.length !== size) {
      this.extrapolatedSignedVort = new Float32Array(size);
    }
    const extVort = this.extrapolatedSignedVort;

    let hasSolids = false;
    for (let k = 0; k < size; k++) {
      extVort[k] = vort[k];
      if (solid[k] !== 0) hasSolids = true;
    }

    if (hasSolids) {
      for (let pass = 0; pass < 3; pass++) {
        for (let j = 1; j < ny - 1; j++) {
          const row = j * nx;
          for (let i = 1; i < nx - 1; i++) {
            const id = row + i;
            if (solid[id] !== 0) {
              let sum = 0, count = 0;
              const n1 = id - 1; if (solid[n1] === 0 || extVort[n1] !== 0) { sum += extVort[n1]; count++; }
              const n2 = id + 1; if (solid[n2] === 0 || extVort[n2] !== 0) { sum += extVort[n2]; count++; }
              const n3 = id - nx; if (solid[n3] === 0 || extVort[n3] !== 0) { sum += extVort[n3]; count++; }
              const n4 = id + nx; if (solid[n4] === 0 || extVort[n4] !== 0) { sum += extVort[n4]; count++; }
              if (count > 0) {
                extVort[id] = sum / count;
              }
            }
          }
        }
      }
    }

    const maxVort = 4.8;
    const scaleX = (nx - 1) / (hdW - 1);
    const scaleY = (ny - 1) / (hdH - 1);
    let pIdx = 0;

    for (let py = 0; py < hdH; py++) {
      const gy = py * scaleY;
      const j0 = gy | 0;
      const j1 = (j0 < ny - 1) ? j0 + 1 : j0;
      const fy = gy - j0;
      const row0 = j0 * nx;
      const row1 = j1 * nx;

      for (let px = 0; px < hdW; px++) {
        const gx = px * scaleX;
        const i0 = gx | 0;
        const i1 = (i0 < nx - 1) ? i0 + 1 : i0;
        const fx = gx - i0;

        const val0 = extVort[row0 + i0] * (1.0 - fx) + extVort[row0 + i1] * fx;
        const val1 = extVort[row1 + i0] * (1.0 - fx) + extVort[row1 + i1] * fx;
        const wVal = val0 * (1.0 - fy) + val1 * fy;

        const norm = Math.max(-1.0, Math.min(1.0, wVal / maxVort));
        const lutIdx = Math.max(0, Math.min(511, Math.round((norm * 0.5 + 0.5) * 511.0)));

        pixelData[pIdx++] = lut[lutIdx];
      }
    }

    this.hdOffscreenCtx.putImageData(this.hdPixelBuffer, 0, 0);
  }

  initCombustionLut() {
    this.combustionLut = new Uint32Array(512);
    for (let i = 0; i < 512; i++) {
      const s = i / 511.0;
      let r, g, b;
      if (s < 0.04) {
        // Fondo azul noche profundo idéntico al vídeo y captura: #030733
        r = 3; g = 7; b = 51;
      } else if (s < 0.18) {
        // Azul noche a azul cobalto / eléctrico profundo (capa externa)
        const k = (s - 0.04) / 0.14;
        r = Math.floor(3 * (1 - k) + 0 * k);
        g = Math.floor(7 * (1 - k) + 120 * k);
        b = Math.floor(51 * (1 - k) + 240 * k);
      } else if (s < 0.35) {
        // Azul a cian brillante / turquesa luminosa (cizalladura criogénica)
        const k = (s - 0.18) / 0.17;
        r = Math.floor(0 * (1 - k) + 0 * k);
        g = Math.floor(120 * (1 - k) + 225 * k);
        b = Math.floor(240 * (1 - k) + 255 * k);
      } else if (s < 0.48) {
        // Cian a verde lima vivo
        const k = (s - 0.35) / 0.13;
        r = Math.floor(0 * (1 - k) + 35 * k);
        g = Math.floor(225 * (1 - k) + 235 * k);
        b = Math.floor(255 * (1 - k) + 15 * k);
      } else if (s < 0.60) {
        // Verde lima a amarillo oro resplandeciente
        const k = (s - 0.48) / 0.12;
        r = Math.floor(35 * (1 - k) + 255 * k);
        g = Math.floor(235 * (1 - k) + 220 * k);
        b = Math.floor(15 * (1 - k) + 0 * k);
      } else if (s < 0.78) {
        // TONALIDADES NARANJAS FUERTES (Pluma de reacción y turbulencia reactiva activa)
        const k = (s - 0.60) / 0.18;
        r = 255;
        g = Math.floor(220 * (1 - k) + 80 * k); // 220 -> 80 da el naranja fuego intenso #ff5000 / #ff7700
        b = 0;
      } else if (s < 0.92) {
        // Naranja fuerte a rojo escarlata / carmesí vivo
        const k = (s - 0.78) / 0.14;
        r = Math.floor(255 * (1 - k) + 220 * k);
        g = Math.floor(80 * (1 - k) + 15 * k);
        b = Math.floor(0 * (1 - k) + 10 * k);
      } else {
        // Rojo escarlata a núcleo de máxima temperatura rojo borgoña profundo
        const k = (s - 0.92) / 0.08;
        r = Math.floor(220 * (1 - k) + 90 * k);
        g = Math.floor(15 * (1 - k) + 5 * k);
        b = Math.floor(10 * (1 - k) + 5 * k);
      }
      this.combustionLut[i] = (255 << 24) | (b << 16) | (g << 8) | r;
    }
  }

  renderFluidFieldCombustionHD() {
    const nx = this.fluid.nx;
    const ny = this.fluid.ny;
    const size = nx * ny;
    const comb = this.fluid.combustion;
    const vort = this.fluid.vorticity;
    const solid = this.fluid.solid;
    const hdW = this.hdW;
    const hdH = this.hdH;
    const lut = this.combustionLut;
    const pixelData = this.hdPixelData;

    if (!this.extrapolatedCombustion || this.extrapolatedCombustion.length !== size) {
      this.extrapolatedCombustion = new Float32Array(size);
    }
    const extComb = this.extrapolatedCombustion;

    const refSpeed = Math.max(1.0, this.fluid.inflowSpeed || 5.0);
    const maxVort = Math.max(10.0, refSpeed * 3.5);

    let hasSolids = false;
    for (let k = 0; k < size; k++) {
      // Vorticidad / Cizalladura normalizada (revela los remolinos de mezcla con tonos cian, verde, amarillo y naranja)
      const shearMixing = Math.min(1.0, Math.pow(Math.abs(vort[k]) / maxVort, 0.65));
      // Frente térmico de combustión (si hay propulsor activo u onda térmica): escala hacia naranja fuerte y rojo (0.65 - 1.0)
      const combVal = comb ? comb[k] : 0.0;
      // Combinación: cizalladura produce la mezcla turbulenta (0.0 a 0.75), y la inyección térmica de combustión alcanza 1.0
      extComb[k] = Math.max(combVal, shearMixing * 0.72);
      if (solid[k] !== 0) hasSolids = true;
    }

    if (hasSolids) {
      for (let pass = 0; pass < 2; pass++) {
        for (let j = 1; j < ny - 1; j++) {
          const row = j * nx;
          for (let i = 1; i < nx - 1; i++) {
            const id = row + i;
            if (solid[id] !== 0) {
              let sum = 0, count = 0;
              const n1 = id - 1; if (solid[n1] === 0 || extComb[n1] > 0) { sum += extComb[n1]; count++; }
              const n2 = id + 1; if (solid[n2] === 0 || extComb[n2] > 0) { sum += extComb[n2]; count++; }
              const n3 = id - nx; if (solid[n3] === 0 || extComb[n3] > 0) { sum += extComb[n3]; count++; }
              const n4 = id + nx; if (solid[n4] === 0 || extComb[n4] > 0) { sum += extComb[n4]; count++; }
              if (count > 0) {
                extComb[id] = sum / count;
              }
            }
          }
        }
      }
    }

    const scaleX = (nx - 1) / (hdW - 1);
    const scaleY = (ny - 1) / (hdH - 1);
    let pIdx = 0;

    for (let py = 0; py < hdH; py++) {
      const gy = py * scaleY;
      const j0 = gy | 0;
      const j1 = (j0 < ny - 1) ? j0 + 1 : j0;
      const fy = gy - j0;
      const row0 = j0 * nx;
      const row1 = j1 * nx;

      for (let px = 0; px < hdW; px++) {
        const gx = px * scaleX;
        const i0 = gx | 0;
        const i1 = (i0 < nx - 1) ? i0 + 1 : i0;
        const fx = gx - i0;

        const val0 = extComb[row0 + i0] * (1.0 - fx) + extComb[row0 + i1] * fx;
        const val1 = extComb[row1 + i0] * (1.0 - fx) + extComb[row1 + i1] * fx;
        const cVal = val0 * (1.0 - fy) + val1 * fy;

        const norm = Math.min(1.0, Math.max(0.0, cVal));
        const lutIdx = (norm * 511.0) | 0;

        pixelData[pIdx++] = lut[lutIdx];
      }
    }

    this.hdOffscreenCtx.putImageData(this.hdPixelBuffer, 0, 0);
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

    let hasSolids = false;

    for (let j = 0; j < ny; j++) {
      const row = j * nx;

      for (let i = 0; i < nx; i++) {
        const id = row + i;
        const pIdx = id * 4;

        if (solid[id] !== 0) {
          hasSolids = true;
          // Marcado temporal como celda sólida pendiente de propagación (alpha = 0)
          data[pIdx] = 15;
          data[pIdx + 1] = 23;
          data[pIdx + 2] = 42;
          data[pIdx + 3] = 0;
          continue;
        }

        let r = 0, g = 0, b = 0;

        if (mode === VisMode.SMOKE) {
          // Modo Humo de Túnel Aerodinámico con fondo celeste aerodinámico y filamentos cian de alto contraste
          const sVal = Math.min(1.0, Math.max(0.0, smoke[id]));
          const speed = Math.hypot(u[id], v[id]);
          const speedNorm = Math.min(1.8, speed / refSpeed);
          // Fijar piso continuo para el fondo celeste aerodinámico para que las zonas de baja velocidad y borde de perfil
          // no generen sombras oscuras artificiales alrededor del contorno
          const bgNorm = Math.max(0.65, Math.min(1.8, speedNorm));

          // Fondo celeste aerodinámico exacto de la captura y filamentos cian-blancos
          r = Math.floor(10 + 20 * bgNorm + 225 * sVal);
          g = Math.floor(18 + 55 * bgNorm + 237 * sVal);
          b = Math.floor(36 + 115 * bgNorm + 255 * sVal);
        } else if (mode === VisMode.CFD_DES_LES) {
          const absW = Math.abs(vort[id]);
          const maxVort = Math.max(12.0, refSpeed * 3.8);
          const norm = Math.min(1.0, Math.pow(absW / maxVort, 0.85));
          const lutIdx = (norm * 511.0) | 0;
          const col = this.desLesLut ? this.desLesLut[lutIdx] : 0xFFEEF0F3;
          r = col & 0xFF;
          g = (col >> 8) & 0xFF;
          b = (col >> 16) & 0xFF;
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

    if (hasSolids) {
      // Propagar el campo visual del fluido 8 capas hacia el interior de las figuras sólidas.
      // Esto erradica por completo las sombras rectangulares/dientes de sierra de la cuadrícula,
      // permitiendo que el contorno vectorial continuo corte el fluido con nitidez absoluta.
      for (let pass = 0; pass < 8; pass++) {
        for (let j = 1; j < ny - 1; j++) {
          const row = j * nx;
          for (let i = 1; i < nx - 1; i++) {
            const id = row + i;
            const pIdx = id * 4;
            if (data[pIdx + 3] !== 0) continue;

            let sumR = 0, sumG = 0, sumB = 0, count = 0;
            const leftIdx = (id - 1) * 4;
            if (data[leftIdx + 3] === 255) {
              sumR += data[leftIdx]; sumG += data[leftIdx + 1]; sumB += data[leftIdx + 2]; count++;
            }
            const rightIdx = (id + 1) * 4;
            if (data[rightIdx + 3] === 255) {
              sumR += data[rightIdx]; sumG += data[rightIdx + 1]; sumB += data[rightIdx + 2]; count++;
            }
            const downIdx = (id - nx) * 4;
            if (data[downIdx + 3] === 255) {
              sumR += data[downIdx]; sumG += data[downIdx + 1]; sumB += data[downIdx + 2]; count++;
            }
            const upIdx = (id + nx) * 4;
            if (data[upIdx + 3] === 255) {
              sumR += data[upIdx]; sumG += data[upIdx + 1]; sumB += data[upIdx + 2]; count++;
            }

            if (count > 0) {
              data[pIdx] = (sumR / count) | 0;
              data[pIdx + 1] = (sumG / count) | 0;
              data[pIdx + 2] = (sumB / count) | 0;
              data[pIdx + 3] = 254; // Marcador temporal de celda extrapolada en esta pasada
            }
          }
        }

        for (let k = 3; k < data.length; k += 4) {
          if (data[k] === 254) data[k] = 255;
        }
      }

      // Rellenar celdas internas profundas de manera 100% opaca con el tono del cuerpo (#0f172a),
      // asegurando que nunca se transparente el fondo oscuro del canvas.
      for (let k = 0; k < data.length; k += 4) {
        if (data[k + 3] === 0) {
          data[k] = 15;
          data[k + 1] = 23;
          data[k + 2] = 42;
          data[k + 3] = 255;
        }
      }
    }

    this.offscreenCtx.putImageData(this.pixelBuffer, 0, 0);
  }

  drawWindTunnelGrid(ctx) {
    const origin = this.worldToScreen(0, 0);
    const end = this.worldToScreen(this.fluid.domainWidth, this.fluid.domainHeight);

    ctx.save();
    // Rejilla sutil adaptativa: oscura y sutil en fondos claros (Aerodinámica DES/LES), clara y sutil en fondos oscuros
    const isLightBg = (this.visMode === VisMode.CFD_DES_LES);
    ctx.strokeStyle = isLightBg ? 'rgba(0, 0, 0, 0.06)' : (this.visMode === VisMode.CFD_COMBUSTION ? 'rgba(255, 255, 255, 0.085)' : 'rgba(255, 255, 255, 0.06)');
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
    if (this.isFlowActive) {
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

  drawNavierStokesFlowlines(ctx, origin, domainPixelW, domainPixelH) {
    const nx = this.fluid.nx;
    const ny = this.fluid.ny;
    const u = this.fluid.u;
    const v = this.fluid.v;
    const solid = this.fluid.solid;
    const cellW = domainPixelW / nx;
    const cellH = domainPixelH / ny;
    const step = 6; // Muestreo en cuadrícula de celdas

    ctx.save();
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';

    for (let j = 3; j < ny - 3; j += step) {
      const row = j * nx;
      for (let i = 3; i < nx - 3; i += step) {
        const id = row + i;
        if (solid[id] !== 0) continue;

        const uVal = u[id];
        const vVal = v[id];
        const speed = Math.hypot(uVal, vVal);
        if (speed < 0.04) continue;

        const px = origin.x + (i + 0.5) * cellW;
        const py = origin.y + (j + 0.5) * cellH;
        const lineLen = 14;
        const scale = (lineLen * 0.5) / speed;

        ctx.beginPath();
        ctx.moveTo(px - uVal * scale, py - vVal * scale);
        ctx.lineTo(px + uVal * scale, py + vVal * scale);

        // Estilo visual adaptado al modo actual
        if (this.visMode === VisMode.CFD_DES_LES) {
          ctx.strokeStyle = `rgba(15, 23, 42, 0.45)`;
        } else {
          const alpha = Math.min(0.7, Math.max(0.2, speed / 5.0));
          ctx.strokeStyle = `rgba(224, 242, 254, ${alpha.toFixed(2)})`;
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  updateThrusterFloatingUI() {
    const card = document.getElementById('thruster-floating-card');
    if (!card) return;

    // El cartel flotante SOLO aparece si el propulsor está explícitamente seleccionado
    if (!this.selectedElement || !this.selectedElement.isThruster || !this.selectedElement.isActive) {
      if (card.style.display !== 'none') {
        card.style.display = 'none';
      }
      return;
    }
    const thruster = this.selectedElement;

    const aabb = thruster.getAABB();
    const centerX = (aabb[0] + aabb[2]) * 0.5;
    const topY = aabb[1]; // borde superior visual en el túnel
    const bottomY = aabb[3];
    const screenTopPos = this.worldToScreen(centerX, topY);
    const screenBottomPos = this.worldToScreen(centerX, bottomY);

    const centroid = thruster.getCentroid();
    const sCentroid = this.worldToScreen(centroid[0], centroid[1]);
    const ringRadius = (thruster.getReferenceLength() * 0.7 * this.zoomLevel) + 26;
    const angleRad = (thruster.currentRotationDeg * Math.PI) / 180.0;
    const knobScreenY = sCentroid.y + ringRadius * Math.sin(angleRad);

    // Si el propulsor apunta hacia arriba o el pomo de rotación está arriba, anclar la tarjeta hacia abajo
    // para que la flecha y pomo de giro queden 100% libres y visibles
    const isPointingUp = (Math.sin(angleRad) < -0.25) || (knobScreenY < screenTopPos.y + 15);

    if (card.style.display !== 'block') {
      card.style.display = 'block';
    }

    if (isPointingUp) {
      card.classList.add('anchor-bottom');
      card.style.left = `${Math.round(screenBottomPos.x)}px`;
      card.style.top = `${Math.round(screenBottomPos.y + 16)}px`;
    } else {
      card.classList.remove('anchor-bottom');
      card.style.left = `${Math.round(screenTopPos.x)}px`;
      card.style.top = `${Math.round(screenTopPos.y - 14)}px`;
    }

    const slider = document.getElementById('thruster-slider-speed');
    const valLabel = document.getElementById('thruster-speed-val');
    if (slider && !slider.matches(':active')) {
      slider.value = thruster.thrustSpeed !== undefined ? thruster.thrustSpeed : 5.0;
    }
    if (valLabel) {
      valLabel.textContent = `${(thruster.thrustSpeed !== undefined ? thruster.thrustSpeed : 5.0).toFixed(1)} m/s`;
    }

    const btnVapor = document.getElementById('btn-thruster-vapor');
    const btnClean = document.getElementById('btn-thruster-clean');
    const mode = thruster.smokeMode || 'vapor';
    if (btnVapor && btnClean) {
      if (mode === 'clean') {
        btnClean.classList.add('active');
        btnVapor.classList.remove('active');
      } else {
        btnVapor.classList.add('active');
        btnClean.classList.remove('active');
      }
    }
  }

  drawThrusterInternalCore(ctx, obs) {
    const centroid = obs.getCentroid();
    const aabb = obs.getAABB();
    const angleRad = (obs.currentRotationDeg * Math.PI) / 180.0;
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);
    const normX = -sinA;
    const normY = cosA;

    const halfL = Math.max(0.4, (aabb[2] - aabb[0]) * 0.5);
    const halfW = Math.max(0.15, (aabb[3] - aabb[1]) * 0.5);

    // Cono central aerodinámico dentro de la tobera (forma de flecha propulsora del ícono)
    const tipX = centroid[0] - cosA * (halfL * 0.45);
    const tipY = centroid[1] - sinA * (halfL * 0.45);

    const baseTopX = centroid[0] + cosA * (halfL * 0.35) - normX * (halfW * 0.22);
    const baseTopY = centroid[1] + sinA * (halfL * 0.35) - normY * (halfW * 0.22);

    const baseBotX = centroid[0] + cosA * (halfL * 0.35) + normX * (halfW * 0.22);
    const baseBotY = centroid[1] + sinA * (halfL * 0.35) + normY * (halfW * 0.22);

    const sTip = this.worldToScreen(tipX, tipY);
    const sTop = this.worldToScreen(baseTopX, baseTopY);
    const sBot = this.worldToScreen(baseBotX, baseBotY);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(sTip.x, sTip.y);
    ctx.lineTo(sTop.x, sTop.y);
    ctx.lineTo(sBot.x, sBot.y);
    ctx.closePath();
    ctx.fillStyle = obs.isSelected ? '#00e5ff' : '#00ffcc';
    ctx.shadowColor = 'rgba(0, 255, 204, 0.6)';
    ctx.shadowBlur = 6;
    ctx.fill();
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
    if (!pts || pts.length < 2) return;

    if (pts.length === 2) {
      ctx.save();
      const p0 = this.worldToScreen(pts[0][0], pts[0][1]);
      const p1 = this.worldToScreen(pts[1][0], pts[1][1]);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.strokeStyle = obs.isSelected ? '#00ffcc' : '#38bdf8';
      ctx.lineWidth = obs.isSelected ? 5 : 4;
      ctx.lineCap = 'round';
      ctx.shadowColor = obs.isSelected ? 'rgba(0, 255, 204, 0.6)' : 'rgba(56, 189, 248, 0.4)';
      ctx.shadowBlur = obs.isSelected ? 14 : 6;
      ctx.stroke();
      ctx.restore();
      return;
    }

    ctx.save();

    if (obs.isImportedImage && obs.imageThemedCanvases) {
      const isDesLes = (this.visMode === VisMode.CFD_DES_LES);
      const isSel = obs.isSelected;
      const themeKey = isDesLes ? (isSel ? 'des_les_selected' : 'des_les') : (isSel ? 'cfd_selected' : 'cfd');
      const imgCanvas = obs.imageThemedCanvases[themeKey] || obs.imageThemedCanvases['cfd'] || obs.imageCroppedCanvas;

      if (imgCanvas) {
        ctx.save();
        const c = obs.imageCenter || obs.getCentroid();
        const sc = this.worldToScreen(c[0], c[1]);
        const sW = (obs.imageWorldWidth || 3.8) * this.zoomLevel;
        const sH = (obs.imageWorldHeight || 1.35) * this.zoomLevel;
        const rotRad = ((obs.currentRotationDeg || 0.0) * Math.PI) / 180.0;

        ctx.translate(sc.x, sc.y);
        ctx.rotate(rotRad);

        if (isSel) {
          ctx.shadowColor = 'rgba(0, 229, 255, 0.65)';
          ctx.shadowBlur = 12;
        }

        ctx.drawImage(imgCanvas, -sW / 2.0, -sH / 2.0, sW, sH);
        ctx.restore();

        // Para imágenes importadas no dibujamos el contorno poligonal aproximado sobre el coche;
        // la imagen original en alta definición ya contiene sus trazos y el cuadro de selección proporciona los tiradores.
      }
    } else {
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

      if (obs.isThruster) {
        // Carcasa translúcida para apreciar el fluido, humo y vórtices generados en el interior
        ctx.fillStyle = 'rgba(15, 23, 42, 0.40)';
        ctx.fill();
        ctx.strokeStyle = obs.isSelected ? '#00e5ff' : '#00ffcc';
        ctx.lineWidth = obs.isSelected ? 2.5 : 1.8;
        ctx.shadowColor = obs.isSelected ? 'rgba(0, 229, 255, 0.7)' : 'rgba(0, 255, 204, 0.45)';
        ctx.shadowBlur = obs.isSelected ? 10 : 4;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Cono central aerodinámico idéntico al ícono SVG
        this.drawThrusterInternalCore(ctx, obs);
      } else {
        // Relleno estilo fibra de carbono / aluminio aeronáutico con regla evenodd
        // En modo DES / LES el cuerpo sólido es negro profundo idéntico al perfil del vídeo
        const isDesLes = (this.visMode === VisMode.CFD_DES_LES);
        ctx.fillStyle = isDesLes ? '#000000' : '#0f172a';
        ctx.fill('evenodd');

        // Contorno iluminado (cian si está seleccionado, negro puro en DES/LES si no)
        ctx.strokeStyle = obs.isSelected ? '#00e5ff' : (isDesLes ? '#000000' : '#38bdf8');
        ctx.lineWidth = obs.isSelected ? 2.5 : 1.5;
        ctx.shadowColor = obs.isSelected ? 'rgba(0, 229, 255, 0.7)' : 'transparent';
        ctx.shadowBlur = obs.isSelected ? 10 : 0;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    const centroid = obs.getCentroid();
    const sCentroid = this.worldToScreen(centroid[0], centroid[1]);

    // Vector de Fuerzas Aerodinámicas (Arrastre en Rojo, Sustentación en Verde) - Ignorado para propulsores
    if (this.showForces && obs.isSelected && !obs.isThruster) {
      const metrics = this.fluid.calculateHydrodynamicForces(obs, obsIdx);
      this.drawForceVectors(ctx, sCentroid, metrics);
    }

    // Modo Edición de Nodos: Dibujar manecillas de vértices
    if (this.mode === CanvasMode.NODE_EDIT && obs.isSelected && !obs.isImportedImage) {
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

      const useBlackRing = (
        this.visMode === VisMode.SMOKE ||
        this.visMode === VisMode.CFD_DES_LES ||
        this.visMode === VisMode.PRESSURE ||
        this.visMode === VisMode.VELOCITY ||
        this.visMode === VisMode.SCHROEDER_CURL ||
        this.visMode === VisMode.SCHROEDER_SPEED ||
        this.visMode === VisMode.SCHROEDER_FLOWLINES
      );

      const ringStroke = useBlackRing
        ? (isMobile ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.70)')
        : (isMobile ? 'rgba(0, 255, 204, 0.65)' : 'rgba(0, 255, 204, 0.35)');

      ctx.strokeStyle = ringStroke;
      ctx.lineWidth = isMobile ? 2.0 : 1.5;

      const angleRad = (obs.currentRotationDeg * Math.PI) / 180.0;
      const isArcMode = (RotationGuideConfig.mode === 'arc');

      if (isArcMode) {
        // --- NUEVA GUÍA: ARCO PARCIAL CENTRADO EN EL TIRADOR ---
        const arcSpanRad = (RotationGuideConfig.arcSpanDeg * Math.PI) / 180.0;
        const startAngle = angleRad - arcSpanRad / 2;
        const endAngle = angleRad + arcSpanRad / 2;

        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.arc(sCentroid.x, sCentroid.y, ringRadius, startAngle, endAngle);
        ctx.stroke();
        ctx.setLineDash([]);

        // Flechas sutiles en los extremos del arco que clarifican que es para girar
        if (RotationGuideConfig.showArrowheads) {
          const arrowColor = useBlackRing
            ? (isMobile ? 'rgba(0, 0, 0, 0.90)' : 'rgba(0, 0, 0, 0.75)')
            : (isMobile ? 'rgba(0, 255, 204, 0.85)' : 'rgba(0, 255, 204, 0.60)');

          const arrowLen = isMobile ? 8 : 6.5;
          const wingAngle = 0.52; // ~30 grados

          // Flecha en extremo de ángulo positivo (endAngle)
          const pEnd = {
            x: sCentroid.x + ringRadius * Math.cos(endAngle),
            y: sCentroid.y + ringRadius * Math.sin(endAngle)
          };
          const tangEnd = endAngle + Math.PI / 2;
          ctx.save();
          ctx.fillStyle = arrowColor;
          ctx.strokeStyle = arrowColor;
          ctx.lineWidth = 1;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(pEnd.x, pEnd.y);
          ctx.lineTo(
            pEnd.x - arrowLen * Math.cos(tangEnd - wingAngle),
            pEnd.y - arrowLen * Math.sin(tangEnd - wingAngle)
          );
          ctx.lineTo(
            pEnd.x - (arrowLen * 0.65) * Math.cos(tangEnd),
            pEnd.y - (arrowLen * 0.65) * Math.sin(tangEnd)
          );
          ctx.lineTo(
            pEnd.x - arrowLen * Math.cos(tangEnd + wingAngle),
            pEnd.y - arrowLen * Math.sin(tangEnd + wingAngle)
          );
          ctx.closePath();
          ctx.fill();

          // Flecha en extremo de ángulo opuesto (startAngle)
          const pStart = {
            x: sCentroid.x + ringRadius * Math.cos(startAngle),
            y: sCentroid.y + ringRadius * Math.sin(startAngle)
          };
          const tangStart = startAngle - Math.PI / 2;
          ctx.beginPath();
          ctx.moveTo(pStart.x, pStart.y);
          ctx.lineTo(
            pStart.x - arrowLen * Math.cos(tangStart - wingAngle),
            pStart.y - arrowLen * Math.sin(tangStart - wingAngle)
          );
          ctx.lineTo(
            pStart.x - (arrowLen * 0.65) * Math.cos(tangStart),
            pStart.y - (arrowLen * 0.65) * Math.sin(tangStart)
          );
          ctx.lineTo(
            pStart.x - arrowLen * Math.cos(tangStart + wingAngle),
            pStart.y - arrowLen * Math.sin(tangStart + wingAngle)
          );
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      } else {
        // --- CONFIGURACIÓN ANTERIOR GUARDADA: CÍRCULO COMPLETO DE 360° ---
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.arc(sCentroid.x, sCentroid.y, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Tirador de rotación
      const hx = sCentroid.x + ringRadius * Math.cos(angleRad);
      const hy = sCentroid.y + ringRadius * Math.sin(angleRad);

      // En pantallas táctiles móviles: halo resplandeciente para fácil ubicación táctil
      if (isMobile) {
        ctx.fillStyle = useBlackRing ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 255, 204, 0.25)';
        ctx.beginPath();
        ctx.arc(hx, hy, 15, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = useBlackRing ? '#000000' : '#00ffcc';
      ctx.strokeStyle = useBlackRing ? '#ffffff' : '#021024';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hx, hy, isMobile ? 9 : 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Etiqueta del ángulo
      ctx.save();
      if (useBlackRing) {
        ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
        ctx.shadowBlur = 3;
        ctx.fillStyle = '#000000';
      } else {
        ctx.fillStyle = '#e2e8f0';
      }
      ctx.font = isMobile ? 'bold 11px Inter, sans-serif' : 'bold 10px Inter, sans-serif';
      ctx.fillText(`${Math.round(obs.currentRotationDeg)}°`, hx + (isMobile ? 14 : 10), hy - 4);
      ctx.restore();
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
      const scaleToMs = (this.fluid && this.fluid.inflowSpeed ? this.fluid.inflowSpeed : 5.0) / Math.max(0.01, this.lbm.speed);
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
      ctx.stroke();
      ctx.setLineDash([4, 4]);

      // Comprobar si el cursor está cerca del punto inicial para cerrar
      const isNearStart = (this.drawPoints.length >= 3 && Math.hypot(this.lastMousePos.x - p0.x, this.lastMousePos.y - p0.y) < 22);
      ctx.beginPath();
      const lastP = this.worldToScreen(this.drawPoints[this.drawPoints.length - 1][0], this.drawPoints[this.drawPoints.length - 1][1]);
      ctx.moveTo(lastP.x, lastP.y);
      if (isNearStart) {
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 2.5;
        ctx.lineTo(p0.x, p0.y);
      } else {
        ctx.strokeStyle = '#facc15';
        ctx.lineTo(this.lastMousePos.x, this.lastMousePos.y);
      }
      ctx.stroke();

      // Dibujar puntos de los vértices
      ctx.setLineDash([]);
      for (let i = 0; i < this.drawPoints.length; i++) {
        const sp = this.worldToScreen(this.drawPoints[i][0], this.drawPoints[i][1]);
        ctx.beginPath();
        if (i === 0) {
          ctx.arc(sp.x, sp.y, isNearStart ? 7 : 5, 0, Math.PI * 2);
          ctx.fillStyle = isNearStart ? '#00ffcc' : '#38bdf8';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else {
          ctx.arc(sp.x, sp.y, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = '#facc15';
          ctx.fill();
        }
      }
    } else {
      ctx.stroke();
    }
    ctx.restore();
  }

  drawTunnelWalls(ctx, origin, domainPixelW, domainPixelH) {
    ctx.save();
    const isLightMode = (this.visMode === VisMode.CFD_DES_LES);
    ctx.fillStyle = isLightMode ? '#e2e8f0' : '#1e293b';
    ctx.strokeStyle = isLightMode ? '#94a3b8' : '#475569';
    ctx.lineWidth = 2;

    // Pared superior
    ctx.strokeRect(origin.x, origin.y - 6, domainPixelW, 6);
    // Pared inferior
    ctx.strokeRect(origin.x, origin.y + domainPixelH, domainPixelW, 6);

    // Si las paredes son sólidas (closed walls), dibujar textura de rayado
    if (this.fluid.closedWalls) {
      ctx.fillStyle = isLightMode ? 'rgba(239, 68, 68, 0.6)' : 'rgba(239, 68, 68, 0.4)';
      ctx.fillRect(origin.x, origin.y - 6, domainPixelW, 6);
      ctx.fillRect(origin.x, origin.y + domainPixelH, domainPixelW, 6);
    }

    ctx.restore();
  }
}

window.CanvasMode = CanvasMode;
window.VisMode = VisMode;
window.FluidCanvasController = FluidCanvasController;
