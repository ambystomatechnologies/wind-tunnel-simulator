/**
 * Simulador de Mecánica de Fluidos y Túnel Aerodinámico 2D - Ambystoma Technologies
 * app.js - Lógica Principal de la Aplicación, Controles, Demos y Enlace de Eventos
 */

document.addEventListener('DOMContentLoaded', () => {
  const canvasElement = document.getElementById('fluid-canvas');
  if (!canvasElement) return;

  const sim = new FluidCanvasController(canvasElement);
  window.sim = sim;

  // Idioma inicial guardado o detección (por defecto inglés 'en')
  const savedLang = localStorage.getItem('fluid_sim_lang') || 'en';
  window.setLanguage(savedLang);

  // --- ELEMENTOS DE LA INTERFAZ ---

  // Botones de Modo / Herramientas
  const btnSelect = document.getElementById('btn-tool-select');
  const btnNodeEdit = document.getElementById('btn-tool-node-edit');
  const btnDrawFreehand = document.getElementById('btn-tool-draw-freehand');
  const btnDrawPoly = document.getElementById('btn-tool-draw-poly');
  const btnProbe = document.getElementById('btn-tool-probe');
  const btnClean = document.getElementById('btn-tool-clean');
  const btnAddAirfoil = document.getElementById('btn-add-airfoil');

  const cbAddShapes = document.getElementById('cb-add-shapes');
  const cbDemos = document.getElementById('cb-demos');
  const btnClearScene = document.getElementById('btn-clear-scene');

  // Controles de Vista
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnResetView = document.getElementById('btn-reset-view');
  const btnCanvasUndo = document.getElementById('btn-canvas-undo');
  const btnToolUndo = document.getElementById('btn-tool-undo');
  const btnToolRedo = document.getElementById('btn-tool-redo');

  // Panel Izquierdo (Pestañas: Escena / HUD y Herramientas)
  const tabBtnScene = document.getElementById('tab-btn-scene');
  const tabBtnTools = document.getElementById('tab-btn-tools');
  const tabPaneScene = document.getElementById('tab-pane-scene');
  const tabPaneTools = document.getElementById('tab-pane-tools');

  function setLeftTab(tab) {
    const isTools = (tab === 'tools');
    if (tabBtnTools) tabBtnTools.classList.toggle('active', isTools);
    if (tabBtnScene) tabBtnScene.classList.toggle('active', !isTools);
    if (tabPaneTools) tabPaneTools.style.display = isTools ? 'flex' : 'none';
    if (tabPaneScene) tabPaneScene.style.display = isTools ? 'none' : 'flex';
  }

  if (tabBtnScene) tabBtnScene.addEventListener('click', () => setLeftTab('scene'));
  if (tabBtnTools) tabBtnTools.addEventListener('click', () => setLeftTab('tools'));

  const listSceneElements = document.getElementById('list-scene-elements');
  const btnCopyElement = document.getElementById('btn-copy-element');
  const btnPasteElement = document.getElementById('btn-paste-element');
  const btnDeleteElement = document.getElementById('btn-delete-element');
  const btnSaveScene = document.getElementById('btn-save-scene');
  const btnSaveReport = document.getElementById('btn-save-report');
  const btnOpenScene = document.getElementById('btn-open-scene');
  const fileInputScene = document.getElementById('file-input-scene');
  const btnImportVectorImage = document.getElementById('btn-import-vector-image');
  const fileInputVectorImage = document.getElementById('file-input-vector-image');
  const lblTelemetryInfo = document.getElementById('lbl-telemetry-info');

  // Panel Derecho (Propiedades del Fluido y del Túnel)
  const sliderSpeed = document.getElementById('slider-speed');
  const lblSpeedValue = document.getElementById('lbl-speed-value');
  const sliderAngle = document.getElementById('slider-angle');
  const lblAngleValue = document.getElementById('lbl-angle-value');
  const sliderViscosity = document.getElementById('slider-viscosity');
  const lblViscosityValue = document.getElementById('lbl-viscosity-value');
  const sliderRotation = document.getElementById('slider-rotation');
  const lblRotValue = document.getElementById('lbl-rot-value');
  const spinDensity = document.getElementById('spin-density');
  const btnRegimeLaminar = document.getElementById('btn-regime-laminar');
  const btnRegimeTurbulent = document.getElementById('btn-regime-turbulent');
  const lblRegimeStatus = document.getElementById('lbl-regime-status');
  const sliderTurbulence = document.getElementById('slider-turbulence');
  const lblTurbIntensityVal = document.getElementById('lbl-turb-intensity-val');
  const sliderContrast = document.getElementById('slider-contrast');
  const lblContrastValue = document.getElementById('lbl-contrast-value');
  const rowLbmContrast = document.getElementById('row-lbm-contrast');

  const chkSmooth = document.getElementById('chk-smooth');
  const chkShowForces = document.getElementById('chk-show-forces');
  const chkGrid = document.getElementById('chk-grid');
  const chkClosedWalls = document.getElementById('chk-closed-walls');
  const chkPause = document.getElementById('chk-pause');
  const chkShowParticles = document.getElementById('chk-show-particles');
  // Control de Simulación Play / Pausa / Flujo / Paso
  const btnPlayPause = document.getElementById('btn-play-pause');
  const btnPlayIcon = document.getElementById('btn-play-icon');
  const btnPlayText = document.getElementById('btn-play-text');
  const btnToggleFlow = document.getElementById('btn-toggle-flow');
  const btnFlowIcon = document.getElementById('btn-flow-icon');
  const btnFlowText = document.getElementById('btn-flow-text');
  const btnStepSim = document.getElementById('btn-step-sim');

  function updatePlayPauseUI(isPaused) {
    const isEs = (window.currentLang || (typeof localStorage !== 'undefined' ? localStorage.getItem('fluid_sim_lang') : null)) === 'es';
    if (btnPlayIcon) btnPlayIcon.textContent = isPaused ? '▶️' : '⏸️';
    if (btnPlayText) btnPlayText.textContent = isPaused ? (isEs ? 'Reanudar' : 'Resume') : (isEs ? 'Pausar' : 'Pause');
    if (btnPlayPause) {
      btnPlayPause.classList.toggle('paused', isPaused);
      btnPlayPause.title = isPaused
        ? (isEs ? 'Reanudar Simulación (Espacio)' : 'Resume Simulation (Space)')
        : (isEs ? 'Pausar Simulación (Espacio)' : 'Pause Simulation (Space)');
    }
    if (chkPause) chkPause.checked = isPaused;
  }
  window.updatePlayPauseUI = updatePlayPauseUI;

  function updateFlowUI(isFlowActive) {
    if (btnFlowIcon) btnFlowIcon.textContent = isFlowActive ? '⏹️' : '💨';
    if (btnFlowText) btnFlowText.textContent = isFlowActive ? (window.currentLang === 'es' ? 'Detener Flujo' : 'Stop Flow') : (window.currentLang === 'es' ? 'Iniciar Flujo' : 'Start Flow');
    if (btnToggleFlow) {
      btnToggleFlow.classList.toggle('is-stopped', !isFlowActive);
      btnToggleFlow.title = isFlowActive
        ? 'Detener el flujo de aire (el fluido se desvanece de manera natural)'
        : 'Iniciar animación y reanudar flujo de aire desde la entrada';
    }
  }

  if (btnPlayPause) {
    btnPlayPause.addEventListener('click', () => {
      sim.isPaused = !sim.isPaused;
      updatePlayPauseUI(sim.isPaused);
      showToast(sim.isPaused ? "Simulación pausada." : "Simulación reanudada.", "info", 1200);
    });
  }

  if (btnToggleFlow) {
    btnToggleFlow.addEventListener('click', () => {
      const newState = !sim.isFlowActive;
      sim.setFlowActive(newState);
      updateFlowUI(newState);
      if (newState) {
        if (sim.isPaused) {
          sim.isPaused = false;
          updatePlayPauseUI(false);
        }
        showToast(window.currentLang === 'es' ? "Flujo iniciado: el aire entra desde el inicio del túnel." : "Flow started: fluid enters from the inlet.", "success", 1800);
      } else {
        showToast(window.currentLang === 'es' ? "Flujo detenido: el fluido se desvanece de manera natural." : "Flow stopped: fluid naturally decays.", "info", 1800);
      }
    });
  }

  if (btnStepSim) {
    btnStepSim.addEventListener('click', () => {
      sim.isPaused = true;
      updatePlayPauseUI(true);
      sim.stepOnce();
      showToast("Avanzado 1 fotograma.", "info", 800);
    });
  }

  // Barra de Estado
  const lblStatusMsg = document.getElementById('status-msg');
  const lblCoords = document.getElementById('lbl-coords');

  // Modales
  const aboutModal = document.getElementById('about-modal');
  const btnOpenAbout = document.getElementById('btn-open-about');
  const btnCloseAbout = document.getElementById('btn-close-about');
  const btnAcceptAbout = document.getElementById('btn-accept-about');

  const donateModal = document.getElementById('donate-modal');
  const btnOpenDonate = document.getElementById('btn-open-donate');
  const btnCloseDonate = document.getElementById('btn-close-donate');

  // Notificaciones Toast - Silenciadas permanentemente según directiva estricta del usuario
  function showToast(message, type = 'info', duration = 3200) {
    // No-op absoluto: no se crea ningún elemento ni se muestra nada en pantalla
    return;
  }
  window.showToast = showToast;

  // --- BOTONES DE HERRAMIENTAS Y MODOS ---
  const modeButtons = [btnSelect, btnNodeEdit, btnDrawFreehand, btnDrawPoly, btnProbe, btnClean].filter(Boolean);

  function updateModeButtonsUI(mode) {
    modeButtons.forEach(b => b.classList.remove('active'));
    if (mode === CanvasMode.NODE_EDIT && btnNodeEdit) {
      btnNodeEdit.classList.add('active');
    } else if (mode === CanvasMode.DRAW_FREEHAND && btnDrawFreehand) {
      btnDrawFreehand.classList.add('active');
    } else if (mode === CanvasMode.DRAW_POLYGON && btnDrawPoly) {
      btnDrawPoly.classList.add('active');
    } else if (mode === CanvasMode.PROBE && btnProbe) {
      btnProbe.classList.add('active');
    } else if (mode === CanvasMode.CLEAN && btnClean) {
      btnClean.classList.add('active');
    }
  }

  sim.onModeChanged = (mode) => {
    updateModeButtonsUI(mode);
    if (mode === CanvasMode.SELECT) {
      if (lblStatusMsg) lblStatusMsg.textContent = window.t('statusReady');
    } else if (mode === CanvasMode.CLEAN) {
      if (lblStatusMsg) lblStatusMsg.textContent = window.t('statusClean');
    }
  };

  if (btnSelect) {
    btnSelect.addEventListener('click', () => {
      sim.setMode(CanvasMode.SELECT);
      if (lblStatusMsg) lblStatusMsg.textContent = window.t('statusReady');
    });
  }

  if (btnNodeEdit) {
    btnNodeEdit.addEventListener('click', () => {
      if (sim.mode === CanvasMode.NODE_EDIT) {
        sim.setMode(CanvasMode.SELECT);
      } else {
        sim.setMode(CanvasMode.NODE_EDIT);
        if (lblStatusMsg) lblStatusMsg.textContent = window.t('statusNodeEdit');
      }
    });
  }

  if (btnDrawFreehand) {
    btnDrawFreehand.addEventListener('click', () => {
      if (sim.mode === CanvasMode.DRAW_FREEHAND) {
        sim.setMode(CanvasMode.SELECT);
      } else {
        sim.setMode(CanvasMode.DRAW_FREEHAND);
        if (lblStatusMsg) lblStatusMsg.textContent = window.t('statusDrawFreehand');
      }
    });
  }

  if (btnDrawPoly) {
    btnDrawPoly.addEventListener('click', () => {
      if (sim.mode === CanvasMode.DRAW_POLYGON) {
        sim.setMode(CanvasMode.SELECT);
      } else {
        sim.setMode(CanvasMode.DRAW_POLYGON);
        if (lblStatusMsg) lblStatusMsg.textContent = window.t('statusDrawPoly');
      }
    });
  }

  if (btnProbe) {
    btnProbe.addEventListener('click', () => {
      if (sim.mode === CanvasMode.PROBE) {
        sim.setMode(CanvasMode.SELECT);
      } else {
        sim.setMode(CanvasMode.PROBE);
        if (lblStatusMsg) lblStatusMsg.textContent = (window.currentLang === 'es' ? "Haz clic en el túnel para colocar la sonda de flujo." : "Click in the tunnel to place the flow sensor probe.");
      }
    });
  }

  if (btnClean) {
    btnClean.addEventListener('click', () => {
      if (sim.mode === CanvasMode.CLEAN) {
        sim.setMode(CanvasMode.SELECT);
      } else {
        sim.setMode(CanvasMode.CLEAN);
        if (lblStatusMsg) lblStatusMsg.textContent = window.t('statusClean');
      }
    });
  }

  // --- CONTROLADORES DE HISTORIAL (UNDO / REDO) ---
  function handleUndo() {
    if (sim && typeof sim.undo === 'function') {
      sim.undo();
    }
  }

  function handleRedo() {
    if (sim && typeof sim.redo === 'function') {
      sim.redo();
    }
  }

  if (btnToolUndo) btnToolUndo.addEventListener('click', handleUndo);
  if (btnToolRedo) btnToolRedo.addEventListener('click', handleRedo);
  if (btnCanvasUndo) btnCanvasUndo.addEventListener('click', handleUndo);

  // --- INSERCIÓN DIRECTA DE FIGURAS (CUADRÍCULA 2 POR FILA) ---
  function addShapeToScene(shapeKey) {
    if (!shapeKey) return;
    const cy = sim.fluid.domainHeight / 2.0;

    switch (shapeKey) {
      case 'naca0012':
        sim.addElement(HydrodynamicObstacle.createNACA("0012", 3.8, [6.0, cy]));
        showToast(window.currentLang === 'es' ? "Perfil alar NACA 0012 agregado al túnel." : "NACA 0012 airfoil inserted.", "success");
        break;
      case 'naca2412':
        sim.addElement(HydrodynamicObstacle.createNACA("2412", 3.8, [6.0, cy]));
        showToast(window.currentLang === 'es' ? "Perfil asimétrico sustentador NACA 2412 insertado." : "NACA 2412 cambered airfoil inserted.", "success");
        break;
      case 'cylinder':
        sim.addElement(HydrodynamicObstacle.createCylinder(1.2, [5.5, cy]));
        showToast(window.currentLang === 'es' ? "Cilindro circular insertado." : "Circular cylinder inserted.", "info");
        break;
      case 'thruster':
        sim.addElement(HydrodynamicObstacle.createThruster(1.9, 0.85, [5.5, cy]));
        break;
      case 'teardrop':
        sim.addElement(HydrodynamicObstacle.createTeardrop(4.2, 1.8, [6.0, cy]));
        showToast(window.currentLang === 'es' ? "Gota aerodinámica de bajo arrastre insertada." : "Low-drag teardrop body inserted.", "info");
        break;
      case 'wedge':
        sim.addElement(HydrodynamicObstacle.createWedge(2.6, 2.2, [5.5, cy]));
        showToast(window.currentLang === 'es' ? "Cuña aerodinámica insertada." : "Aerodynamic wedge inserted.", "info");
        break;
      case 'flat_plate':
        const plate = HydrodynamicObstacle.createFlatPlate(3.5, 0.2, [6.0, cy]);
        plate.rotate(15 * Math.PI / 180.0);
        sim.addElement(plate);
        showToast(window.currentLang === 'es' ? "Placa plana a 15° de ataque insertada." : "Flat plate at 15° AoA inserted.", "info");
        break;
      case 'square':
        sim.addElement(HydrodynamicObstacle.createSquare(1.8, [5.5, cy]));
        showToast(window.currentLang === 'es' ? "Cuerpo cuadrado romo insertado." : "Bluff square body inserted.", "info");
        break;
      case 'swiss_cross':
        sim.addElement(HydrodynamicObstacle.createSwissCross(2.4, [5.5, cy]));
        showToast(window.currentLang === 'es' ? "Cruz insertada." : "Cross inserted.", "info");
        break;
      case 'car':
        sim.addElement(HydrodynamicObstacle.createCarProfile(4.6, null, [6.0, cy + 0.5]));
        showToast(window.currentLang === 'es' ? "Bólido insertado." : "Race car inserted.", "info");
        break;
      case 'venturi':
        const nozzles = HydrodynamicObstacle.createVenturiNozzles(sim.fluid.domainWidth, sim.fluid.domainHeight, 3.2);
        nozzles.forEach(n => sim.addElement(n));
        showToast(window.currentLang === 'es' ? "Tobera Venturi insertada." : "Venturi nozzle inserted.", "info");
        break;
      case 'schroeder_line':
        sim.addElement(HydrodynamicObstacle.createLinearBarrier(3.6, [5.5, cy]));
        showToast(window.currentLang === 'es' ? "Barrera lineal de Schroeder insertada (Generador de vórtices)." : "Schroeder barrier line inserted.", "success");
        break;
      case 'probe':
        sim.addElement(new FlowProbe(8.0, cy, `Sensor ${sim.elements.length + 1}`));
        showToast(window.currentLang === 'es' ? "Sonda de velocidad y presión insertada." : "Flow probe inserted.", "info");
        break;
    }
  }

  // Enlace de clics sobre las tarjetas de figuras visuales
  const shapeCards = document.querySelectorAll('.btn-shape-card');
  shapeCards.forEach(btn => {
    btn.addEventListener('click', () => {
      const shapeKey = btn.getAttribute('data-shape');
      addShapeToScene(shapeKey);
    });
  });

  // Control de ventana plegable de figuras (Agregar Figuras)
  const btnToggleShapesExpand = document.getElementById('btn-toggle-shapes-expand');
  const shapesHeaderToggle = document.getElementById('shapes-header-toggle');
  const shapesCollapsibleContent = document.getElementById('shapes-collapsible-content');
  const lblShapesToggleText = document.getElementById('lbl-shapes-toggle-text');
  const iconShapesToggleArrow = document.getElementById('icon-shapes-toggle-arrow');

  function toggleShapesCollapsible() {
    if (!shapesCollapsibleContent) return;
    const isClosed = (shapesCollapsibleContent.style.display === 'none' || getComputedStyle(shapesCollapsibleContent).display === 'none');
    shapesCollapsibleContent.style.display = isClosed ? 'block' : 'none';
    if (lblShapesToggleText) {
      lblShapesToggleText.textContent = isClosed 
        ? (window.currentLang === 'en' ? 'Fewer shapes' : 'Menos figuras') 
        : (window.currentLang === 'en' ? 'More shapes' : 'Más figuras');
    }
    if (iconShapesToggleArrow) {
      iconShapesToggleArrow.textContent = isClosed ? '▲' : '▼';
    }
    if (btnToggleShapesExpand) {
      btnToggleShapesExpand.classList.toggle('active', isClosed);
      btnToggleShapesExpand.title = isClosed ? 'Plegar figuras' : 'Desplegar más figuras';
    }
  }

  if (btnToggleShapesExpand) {
    btnToggleShapesExpand.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleShapesCollapsible();
    });
  }
  if (shapesHeaderToggle) {
    shapesHeaderToggle.addEventListener('click', () => {
      toggleShapesCollapsible();
    });
  }

  if (btnAddAirfoil) {
    btnAddAirfoil.addEventListener('click', () => addShapeToScene('naca0012'));
  }

  if (cbAddShapes) {
    cbAddShapes.addEventListener('change', (e) => {
      addShapeToScene(e.target.value);
      cbAddShapes.value = "";
    });
  }

  // --- BOTÓN LIMPIAR TÚNEL ---
  if (btnClearScene) {
    btnClearScene.addEventListener('click', () => {
      sim.clearScene();
      updateFlowUI(true);
      showToast("Túnel de viento reiniciado.", "warning");
    });
  }

  // --- CONTROLES DE ZOOM Y VISTA ---
  if (btnZoomIn) {
    btnZoomIn.addEventListener('click', () => {
      const worldPos = sim.screenToWorld(sim.width / 2.0, sim.height / 2.0);
      sim.zoomLevel = Math.min(220.0, sim.zoomLevel * 1.2);
      sim.panOffset.x = sim.width / 2.0 - worldPos[0] * sim.zoomLevel;
      sim.panOffset.y = sim.height / 2.0 - worldPos[1] * sim.zoomLevel;
      sim.clampPanOffset();
    });
  }

  if (btnZoomOut) {
    btnZoomOut.addEventListener('click', () => {
      const minZoom = sim.getFitZoom ? sim.getFitZoom() : 10.0;
      const newZoom = Math.max(minZoom, sim.zoomLevel / 1.2);
      if (newZoom <= minZoom + 0.001) {
        sim.resetView();
      } else {
        const worldPos = sim.screenToWorld(sim.width / 2.0, sim.height / 2.0);
        sim.zoomLevel = newZoom;
        sim.panOffset.x = sim.width / 2.0 - worldPos[0] * sim.zoomLevel;
        sim.panOffset.y = sim.height / 2.0 - worldPos[1] * sim.zoomLevel;
        sim.clampPanOffset();
      }
    });
  }

  if (btnResetView) {
    btnResetView.addEventListener('click', () => sim.resetView());
  }

  // --- CONTROLES DE FLUIDO (PANEL DERECHO) ---

  // 1. Velocidad de entrada
  if (sliderSpeed) {
    sliderSpeed.min = 0.5;
    sliderSpeed.max = 12.0;
    sliderSpeed.step = 0.1;
    sliderSpeed.value = 5.0;
    if (lblSpeedValue) lblSpeedValue.textContent = "5.0 m/s";

    sliderSpeed.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      sim.fluid.inflowSpeed = val;
      if (sim.lbm) {
        // Velocidad ultra-fluida a 60 FPS idéntica al video de Schroeder
        // A 0.5 m/s: fluido pausado (8 pasos/frame, speed = 0.060)
        // A 4.5 m/s: velocidad nominal idéntica al video (20 pasos/frame, speed = 0.100)
        // A 12.0 m/s: flujo muy rápido (28 pasos/frame, speed = 0.115)
        const norm = Math.min(1.0, Math.max(0.0, (val - 0.5) / 11.5));
        sim.lbm.speed = 0.060 + norm * 0.055;
        sim.lbm.stepsPerFrame = Math.round(8 + norm * 20);
      }
      if (lblSpeedValue) lblSpeedValue.textContent = `${val.toFixed(1)} m/s`;
    });
  }

  // 2. Ángulo de entrada del flujo
  if (sliderAngle) {
    sliderAngle.min = -45;
    sliderAngle.max = 45;
    sliderAngle.step = 1;
    sliderAngle.value = 0;
    if (lblAngleValue) lblAngleValue.textContent = "0°";

    sliderAngle.addEventListener('input', (e) => {
      const deg = parseFloat(e.target.value);
      sim.fluid.inflowAngle = (deg * Math.PI) / 180.0;
      if (sim.lbm) sim.lbm.inflowAngle = sim.fluid.inflowAngle;
      if (lblAngleValue) lblAngleValue.textContent = `${deg}°`;
    });
  }

  // 3. Control de Régimen de Flujo (Laminar vs Turbulento)
  function updateRegimeUI(regime, intensity) {
    const isTurb = (regime === 'turbulent' || intensity > 0.005);
    if (btnRegimeLaminar) btnRegimeLaminar.classList.toggle('active', !isTurb);
    if (btnRegimeTurbulent) btnRegimeTurbulent.classList.toggle('active', isTurb);
    if (lblRegimeStatus) {
      lblRegimeStatus.textContent = isTurb ? "Turbulento" : "Laminar";
      lblRegimeStatus.style.color = isTurb ? "#fbbf24" : "#00ffcc";
    }
    const percent = Math.round(intensity * 100);
    if (sliderTurbulence) sliderTurbulence.value = percent;
    if (lblTurbIntensityVal) {
      if (percent === 0) {
        lblTurbIntensityVal.textContent = "0% (Laminar)";
      } else if (percent < 8) {
        lblTurbIntensityVal.textContent = `${percent}% (Transicional)`;
      } else {
        lblTurbIntensityVal.textContent = `${percent}% (Turbulento)`;
      }
    }
  }

  if (btnRegimeLaminar) {
    btnRegimeLaminar.addEventListener('click', () => {
      sim.fluid.setFlowRegime('laminar', 0.0);
      updateRegimeUI('laminar', 0.0);
      showToast("Régimen configurado: Flujo Laminar puro (Tu = 0%)", "info");
    });
  }

  if (btnRegimeTurbulent) {
    btnRegimeTurbulent.addEventListener('click', () => {
      sim.fluid.setFlowRegime('turbulent', 0.18);
      updateRegimeUI('turbulent', 0.18);
      showToast("Régimen configurado: Flujo Turbulento dinámico con ángulos aleatorios constantes (Tu = 18%)", "warning");
    });
  }

  if (sliderTurbulence) {
    sliderTurbulence.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      const intensity = val / 100.0;
      const regime = (intensity > 0.005) ? 'turbulent' : 'laminar';
      sim.fluid.setFlowRegime(regime, intensity);
      updateRegimeUI(regime, intensity);
    });
  }

  // 4. Viscosidad y Densidad del fluido (con escala continua desde superfluido hasta miel espesa)
  const sliderDensity = document.getElementById('slider-density');
  const lblDensityValue = document.getElementById('lbl-density-value');

  function updateViscosityDisplay() {
    const nu = sim.fluid.viscosity;
    const rho = sim.fluid.density;
    const mu = rho * nu; // Viscosidad dinámica en Pa·s
    let muStr = '';
    if (mu < 0.001) {
      muStr = `μ: ${(mu * 1000).toFixed(2)} mPa·s`;
    } else if (mu < 0.1) {
      muStr = `μ: ${(mu * 1000).toFixed(1)} mPa·s`;
    } else {
      muStr = `μ: ${mu.toFixed(2)} Pa·s`;
    }

    let matTag = '';
    if (nu >= 0.003) matTag = ' (Miel / Melaza)';
    else if (nu >= 0.0007) matTag = ' (Glicerina)';
    else if (nu >= 0.00018) matTag = ' (Aceite)';
    else if (nu >= 0.00008) matTag = ' (Aire)';
    else if (nu >= 0.00002) matTag = ' (Agua)';
    else matTag = ' (Superfluido)';

    if (lblViscosityValue) {
      lblViscosityValue.textContent = `${nu.toFixed(5)} m²/s · ${muStr}${matTag}`;
    }
  }

  function setFluidDensity(val) {
    const clamped = Math.max(0.1, Math.min(2000.0, parseFloat(val) || 1.225));
    sim.fluid.density = clamped;
    if (sliderDensity && Math.abs(parseFloat(sliderDensity.value) - clamped) > 0.01) {
      sliderDensity.value = clamped;
    }
    if (spinDensity && Math.abs(parseFloat(spinDensity.value) - clamped) > 0.01) {
      spinDensity.value = clamped.toFixed(clamped < 10 ? 2 : 1);
    }
    if (lblDensityValue) {
      lblDensityValue.textContent = `${clamped.toFixed(clamped < 10 ? 2 : 1)} kg/m³`;
    }
    updateViscosityDisplay();
  }

  if (sliderViscosity) {
    sliderViscosity.min = 1;
    sliderViscosity.max = 100;
    sliderViscosity.value = 46;

    sliderViscosity.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      // Rango logarítmico desde 0.000005 m²/s (superfluido) hasta 0.0080 m²/s (miel espesa)
      const nu = 0.000005 * Math.pow(1600, (val - 1) / 99.0);
      sim.fluid.viscosity = nu;
      if (sim.lbm) {
        sim.lbm.viscosity = 0.018 + (val / 100.0) * 0.052;
        sim.lbm.contrast = val > 75 ? 0.6 : 1.0;
      }
      updateViscosityDisplay();
    });
  }

  // Densidad del Fluido ρ (Slider + Input numérico sincronizados con tope físico de 2000 kg/m³)
  if (sliderDensity) {
    sliderDensity.min = 0.1;
    sliderDensity.max = 2000.0;
    sliderDensity.step = 0.5;
    sliderDensity.value = sim.fluid.density;
    sliderDensity.addEventListener('input', (e) => {
      setFluidDensity(e.target.value);
    });
  }

  if (spinDensity) {
    spinDensity.min = 0.1;
    spinDensity.max = 2000.0;
    spinDensity.step = 0.1;
    spinDensity.value = sim.fluid.density;
    spinDensity.addEventListener('input', (e) => {
      setFluidDensity(e.target.value);
    });
    spinDensity.addEventListener('change', (e) => {
      setFluidDensity(e.target.value);
    });
  }

  // Presets de Medios Fluidos
  const presetButtons = document.querySelectorAll('.btn-mat-preset');
  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const mat = btn.getAttribute('data-mat') || btn.getAttribute('data-i18n');
      presetButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (mat === 'air' || mat === 'btnPresetAir') {
        sim.fluid.viscosity = 0.00015;
        setFluidDensity(1.225);
        if (sliderViscosity) sliderViscosity.value = 46;
        if (sim.lbm) sim.lbm.viscosity = 0.018 + (46 / 100.0) * 0.052;
        updateViscosityDisplay();
        showToast("Medio configurado: Aire (ρ = 1.225 kg/m³, ν = 1.5e-4 m²/s)", "info");
      } else if (mat === 'water' || mat === 'btnPresetWater') {
        sim.fluid.viscosity = 0.00005;
        setFluidDensity(1000.0);
        if (sliderViscosity) sliderViscosity.value = 26;
        if (sim.lbm) sim.lbm.viscosity = 0.018 + (26 / 100.0) * 0.052;
        updateViscosityDisplay();
        showToast("Medio configurado: Agua líquida (ρ = 1000 kg/m³, ν = 5.0e-5 m²/s)", "info");
      } else if (mat === 'oil' || mat === 'btnPresetOil') {
        sim.fluid.viscosity = 0.00030;
        setFluidDensity(880.0);
        if (sliderViscosity) sliderViscosity.value = 56;
        if (sim.lbm) sim.lbm.viscosity = 0.018 + (56 / 100.0) * 0.052;
        updateViscosityDisplay();
        showToast("Medio configurado: Aceite lubricante (ρ = 880 kg/m³, ν = 3.0e-4 m²/s, μ = 0.26 Pa·s)", "info");
      } else if (mat === 'glycerin' || mat === 'btnPresetGlycerin' || mat === 'honey' || mat === 'btnPresetHoney') {
        sim.fluid.viscosity = 0.00118;
        setFluidDensity(1260.0);
        if (sliderViscosity) sliderViscosity.value = 74;
        if (sim.lbm) {
          sim.lbm.viscosity = 0.055;
          sim.lbm.contrast = 0.8;
        }
        updateViscosityDisplay();
        showToast("Medio configurado: Glicerina líquida (ρ = 1260 kg/m³, ν = 1.18e-3 m²/s, μ = 1.49 Pa·s)", "info");
      } else if (mat === 'superfluid' || mat === 'btnPresetSuper') {
        sim.fluid.viscosity = 0.000005;
        setFluidDensity(1.0);
        if (sliderViscosity) sliderViscosity.value = 1;
        if (sim.lbm) sim.lbm.viscosity = 0.018;
        updateViscosityDisplay();
        showToast("Medio configurado: Superfluido cuasi-ideal (ν ≈ 0)", "info");
      }
    });
  });

  // Inicialización de etiquetas de viscosidad y densidad
  updateViscosityDisplay();
  setFluidDensity(sim.fluid.density);

  // 5. Rotación del Elemento Seleccionado
  if (sliderRotation) {
    sliderRotation.addEventListener('input', (e) => {
      if (sim.selectedElement && sim.selectedElement instanceof HydrodynamicObstacle) {
        if (sim.selectedElement.isAutoRotating) {
          return;
        }
        const deg = parseFloat(e.target.value);
        sim.selectedElement.setAbsoluteRotation(deg);
        sim.fluid.rasterizeObstacles(sim.elements);
        if (sim.isLBMMode && sim.lbm) {
          sim.lbm.rasterizeObstacles(sim.elements, sim.fluid.domainWidth, sim.fluid.domainHeight);
        }
        const displayDeg = ((Math.round(deg) % 360) + 360) % 360;
        if (lblRotValue) lblRotValue.textContent = `${displayDeg}°`;

        // Sincronización bidireccional estricta con el ángulo inicial del barrido solo si no hay pieza barrida o si es la pieza sometida al barrido
        const isSweptPiece = window.AerodynamicSweep && window.AerodynamicSweep.hasExecutedSweepAnimation && window.AerodynamicSweep.getLastSweptElement();
        if (!isSweptPiece || window.AerodynamicSweep.getLastSweptElement() === sim.selectedElement) {
          const sweepMinInput = document.getElementById('sweep-min-aoa');
          if (sweepMinInput) {
            sweepMinInput.value = displayDeg;
            const sweepMaxInput = document.getElementById('sweep-max-aoa');
            if (sweepMaxInput && parseFloat(sweepMaxInput.value) <= displayDeg) {
              sweepMaxInput.value = displayDeg + 20;
            }
          }
        }
        if (window.AerodynamicSweep) {
          if (window.AerodynamicSweep.isOpen) {
            window.AerodynamicSweep.triggerRealtimeUpdate(sim);
          }
        }
      }
    });
  }

  // 6. Checkboxes de Configuración
  if (chkSmooth) {
    chkSmooth.addEventListener('change', (e) => {
      if (sim.selectedElement && sim.selectedElement instanceof HydrodynamicObstacle) {
        sim.selectedElement.isSmooth = e.target.checked;
        sim.fluid.rasterizeObstacles(sim.elements);
        if (sim.isLBMMode && sim.lbm) {
          sim.lbm.rasterizeObstacles(sim.elements, sim.fluid.domainWidth, sim.fluid.domainHeight);
        }
      }
    });
  }

  if (chkShowForces) {
    chkShowForces.checked = true;
    chkShowForces.addEventListener('change', (e) => {
      sim.showForces = e.target.checked;
    });
  }

  if (chkGrid) {
    chkGrid.checked = true;
    chkGrid.addEventListener('change', (e) => {
      sim.showGrid = e.target.checked;
    });
  }

  if (chkClosedWalls) {
    chkClosedWalls.checked = false;
    chkClosedWalls.addEventListener('change', (e) => {
      sim.fluid.closedWalls = e.target.checked;
    });
  }

  if (chkPause) {
    chkPause.checked = false;
    chkPause.addEventListener('change', (e) => {
      sim.isPaused = e.target.checked;
      updatePlayPauseUI(sim.isPaused);
    });
  }

  if (chkShowParticles) {
    chkShowParticles.checked = (sim.showParticles !== false);
    chkShowParticles.addEventListener('change', (e) => {
      sim.showParticles = e.target.checked;
      showToast(e.target.checked ? "Partículas trazadoras visibles." : "Partículas trazadoras ocultas.", "info", 1200);
    });
  }

  const chkShowFlowlines = document.getElementById('chk-show-flowlines');
  if (chkShowFlowlines) {
    chkShowFlowlines.checked = (sim.showFlowlines === true);
    chkShowFlowlines.addEventListener('change', (e) => {
      sim.showFlowlines = e.target.checked;
      sim.showLBMFlowlines = e.target.checked;
      showToast(e.target.checked ? (window.currentLang === 'es' ? "Líneas de flujo activadas." : "Flowlines enabled.") : (window.currentLang === 'es' ? "Líneas de flujo desactivadas." : "Flowlines disabled."), "info", 1200);
    });
  }

  // Controles flotantes interactivos del propulsor de fluido
  const thrusterCard = document.getElementById('thruster-floating-card');
  const thrusterSlider = document.getElementById('thruster-slider-speed');
  const thrusterValLabel = document.getElementById('thruster-speed-val');
  const btnThrusterVapor = document.getElementById('btn-thruster-vapor');
  const btnThrusterClean = document.getElementById('btn-thruster-clean');

  if (thrusterCard) {
    thrusterCard.addEventListener('pointerdown', (e) => e.stopPropagation());
    thrusterCard.addEventListener('mousedown', (e) => e.stopPropagation());
    thrusterCard.addEventListener('touchstart', (e) => e.stopPropagation());
  }

  function getActiveThruster() {
    if (sim.selectedElement && sim.selectedElement.isThruster && sim.selectedElement.isActive) {
      return sim.selectedElement;
    }
    return null;
  }

  if (thrusterSlider) {
    thrusterSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (thrusterValLabel) thrusterValLabel.textContent = `${val.toFixed(1)} m/s`;
      const t = getActiveThruster();
      if (t) {
        t.thrustSpeed = val;
      }
    });
  }

  if (btnThrusterVapor && btnThrusterClean) {
    btnThrusterVapor.addEventListener('click', () => {
      const t = getActiveThruster();
      if (t) t.smokeMode = 'vapor';
      btnThrusterVapor.classList.add('active');
      btnThrusterClean.classList.remove('active');
    });
    btnThrusterClean.addEventListener('click', () => {
      const t = getActiveThruster();
      if (t) t.smokeMode = 'clean';
      btnThrusterClean.classList.add('active');
      btnThrusterVapor.classList.remove('active');
    });
  }

  // 7. Modos de Visualización CFD / LBM (Desplegables en Barra, Panel Izquierdo y Panel Derecho)
  const cbVisMode = document.getElementById('cb-vis-mode');
  const cbVisModeToolbar = document.getElementById('cb-vis-mode-toolbar');
  const cbVisModeLeft = document.getElementById('cb-vis-mode-left');
  const btnVisModeToolbarPrev = document.getElementById('btn-vis-mode-toolbar-prev');
  const btnVisModeToolbarNext = document.getElementById('btn-vis-mode-toolbar-next');
  const btnVisModeLeftPrev = document.getElementById('btn-vis-mode-left-prev');
  const btnVisModeLeftNext = document.getElementById('btn-vis-mode-left-next');

  function applyVisModeSelection(val, notify = true) {
    if (!val) return;
    if (cbVisMode) cbVisMode.value = val;
    if (cbVisModeToolbar) cbVisModeToolbar.value = val;
    if (cbVisModeLeft) cbVisModeLeft.value = val;

    if (val === 'schroeder_curl') {
      sim.setVisMode(VisMode.SCHROEDER_CURL);
      if (rowLbmContrast) rowLbmContrast.style.display = 'block';
      if (notify) showToast("Modo Schroeder LBM: Vorticidad física y remolinos activos.", "success", 2000);
    } else if (val === 'schroeder_flowlines') {
      sim.setVisMode(VisMode.SCHROEDER_FLOWLINES);
      if (rowLbmContrast) rowLbmContrast.style.display = 'block';
      if (notify) showToast("Modo Schroeder LBM: Líneas de flujo y estelas vectoriales.", "info", 1800);
    } else if (val === 'schroeder_speed') {
      sim.setVisMode(VisMode.SCHROEDER_SPEED);
      if (rowLbmContrast) rowLbmContrast.style.display = 'block';
      if (notify) showToast("Modo Schroeder LBM: Magnitud de velocidad.", "info", 1800);
    } else {
      if (rowLbmContrast) rowLbmContrast.style.display = 'none';
      if (val === 'smoke') sim.setVisMode(VisMode.SMOKE);
      else if (val === 'vorticity') sim.setVisMode(VisMode.VORTICITY);
      else if (val === 'cfd_des_les') sim.setVisMode(VisMode.CFD_DES_LES);
      else if (val === 'pressure') sim.setVisMode(VisMode.PRESSURE);
      else if (val === 'cfd_combustion') sim.setVisMode(VisMode.CFD_COMBUSTION);
      else if (val === 'velocity') sim.setVisMode(VisMode.VELOCITY);
      else if (val === 'particles') sim.setVisMode(VisMode.PARTICLES);
    }
  }

  function cycleVisMode(delta) {
    const select = cbVisModeToolbar || cbVisModeLeft || cbVisMode;
    if (!select) return;
    const opts = Array.from(select.options).filter(o => o.value);
    if (opts.length === 0) return;
    const curVal = select.value;
    let idx = opts.findIndex(o => o.value === curVal);
    if (idx === -1) idx = 0;
    let nextIdx = (idx + delta + opts.length) % opts.length;
    applyVisModeSelection(opts[nextIdx].value);
  }

  if (btnVisModeToolbarPrev) btnVisModeToolbarPrev.addEventListener('click', () => cycleVisMode(-1));
  if (btnVisModeToolbarNext) btnVisModeToolbarNext.addEventListener('click', () => cycleVisMode(1));
  if (btnVisModeLeftPrev) btnVisModeLeftPrev.addEventListener('click', () => cycleVisMode(-1));
  if (btnVisModeLeftNext) btnVisModeLeftNext.addEventListener('click', () => cycleVisMode(1));

  if (cbVisMode) {
    cbVisMode.addEventListener('change', (e) => applyVisModeSelection(e.target.value));
  }
  if (cbVisModeToolbar) {
    cbVisModeToolbar.addEventListener('change', (e) => applyVisModeSelection(e.target.value));
  }
  if (cbVisModeLeft) {
    cbVisModeLeft.addEventListener('change', (e) => applyVisModeSelection(e.target.value));
  }

  // 8. Control de Contraste para Schroeder LBM
  if (sliderContrast) {
    sliderContrast.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      const factor = Math.pow(1.2, val);
      if (sim.lbm) sim.lbm.contrast = factor;
      if (lblContrastValue) lblContrastValue.textContent = `${factor.toFixed(1)}x`;
    });
  }

  // --- TELEMETRÍA Y HUD EN EL PANEL IZQUIERDO ---
  const hudElemName = document.getElementById('hud-elem-name');
  const hudDragVal = document.getElementById('hud-drag-val');
  const hudLiftVal = document.getElementById('hud-lift-val');
  const hudCdVal = document.getElementById('hud-cd-val');
  const hudClVal = document.getElementById('hud-cl-val');
  const hudEffVal = document.getElementById('hud-eff-val');
  const hudAoaVal = document.getElementById('hud-aoa-val');
  const hudReVal = document.getElementById('hud-re-val');
  const hudRegimeVal = document.getElementById('hud-regime-val');
  const hudPmaxVal = document.getElementById('hud-pmax-val');
  const hudPminVal = document.getElementById('hud-pmin-val');

  let lastHudUpdate = 0;
  sim.onTelemetryUpdate = (element, metrics) => {
    const now = performance.now();
    if (now - lastHudUpdate < 60) return; // 16 FPS para evitar parpadeos y jitter
    lastHudUpdate = now;

    if (element instanceof FlowProbe) {
      if (hudElemName) hudElemName.textContent = element.name;
      if (hudDragVal) hudDragVal.textContent = "---";
      if (hudLiftVal) hudLiftVal.textContent = "---";
      if (hudCdVal) hudCdVal.textContent = "---";
      if (hudClVal) hudClVal.textContent = "---";
      if (hudEffVal) hudEffVal.textContent = "---";
      if (hudAoaVal) hudAoaVal.textContent = "---";
      if (hudReVal) hudReVal.textContent = "---";
      if (hudRegimeVal) {
        hudRegimeVal.textContent = `${element.measuredSpeed.toFixed(2)} m/s`;
        hudRegimeVal.className = "hud-val hud-regime-badge regime-laminar";
      }
      if (hudPmaxVal) hudPmaxVal.textContent = `${element.measuredP.toFixed(1)} Pa`;
      if (hudPminVal) hudPminVal.textContent = `ω: ${element.measuredVorticity.toFixed(1)} s⁻¹`;
      return;
    }

    if (!element || !(element instanceof HydrodynamicObstacle)) {
      if (hudElemName) hudElemName.textContent = "Sin selección";
      if (hudDragVal) hudDragVal.textContent = "---";
      if (hudLiftVal) hudLiftVal.textContent = "---";
      if (hudCdVal) hudCdVal.textContent = "---";
      if (hudClVal) hudClVal.textContent = "---";
      if (hudEffVal) hudEffVal.textContent = "---";
      if (hudAoaVal) hudAoaVal.textContent = "---";
      if (hudReVal) hudReVal.textContent = "---";
      if (hudRegimeVal) {
        hudRegimeVal.textContent = "---";
        hudRegimeVal.className = "hud-val hud-regime-badge";
      }
      if (hudPmaxVal) hudPmaxVal.textContent = "---";
      if (hudPminVal) hudPminVal.textContent = "---";
      return;
    }

    if (hudElemName) hudElemName.textContent = element.name;
    if (hudDragVal) hudDragVal.textContent = `${metrics.dragForce.toFixed(2)} N`;
    if (hudLiftVal) hudLiftVal.textContent = `${metrics.liftForce.toFixed(2)} N`;
    if (hudCdVal) hudCdVal.textContent = metrics.cd.toFixed(3);
    if (hudClVal) hudClVal.textContent = metrics.cl.toFixed(3);
    if (hudEffVal) hudEffVal.textContent = metrics.efficiency.toFixed(2);
    if (hudAoaVal) hudAoaVal.textContent = `${Math.round(element.currentRotationDeg)}°`;
    if (hudReVal) hudReVal.textContent = metrics.reynolds.toLocaleString();

    if (hudRegimeVal) {
      if (Math.abs(metrics.cl) < 0.15 && metrics.cd > 0.8) {
        hudRegimeVal.textContent = "Pérdida";
        hudRegimeVal.className = "hud-val hud-regime-badge regime-stall";
      } else if (metrics.reynolds > 8000) {
        hudRegimeVal.textContent = "Vórtices";
        hudRegimeVal.className = "hud-val hud-regime-badge regime-vortex";
      } else {
        hudRegimeVal.textContent = "Laminar";
        hudRegimeVal.className = "hud-val hud-regime-badge regime-laminar";
      }
    }

    if (hudPmaxVal) hudPmaxVal.textContent = `+${metrics.pMax} Pa`;
    if (hudPminVal) hudPminVal.textContent = `${metrics.pMin} Pa`;

    if (sliderRotation && !sim.isRotating && !element.isAutoRotating) {
      const curRot = ((Math.round(element.currentRotationDeg || 0) % 360) + 360) % 360;
      sliderRotation.value = curRot;
      if (lblRotValue) lblRotValue.textContent = `${curRot}°`;
    }
    if (chkSmooth) chkSmooth.checked = element.isSmooth;
  };

  // --- GESTIÓN DE ELEMENTOS DE LA ESCENA (LISTA IZQUIERDA Y PROPIEDADES DERECHA) ---
  const boxSelectedElementProps = document.getElementById('box-selected-element-props');
  const lblSelectedObjName = document.getElementById('lbl-selected-obj-name');
  const btnAlphaSweep = document.getElementById('btn-alpha-sweep');
  const chkBuoy = document.getElementById('chk-buoy');
  const chkAutoRotate = document.getElementById('chk-auto-rotate');
  const btnRotateCW = document.getElementById('btn-rotate-cw');
  const btnRotateCCW = document.getElementById('btn-rotate-ccw');
  const sliderAutoRotateSpeed = document.getElementById('slider-auto-rotate-speed');
  const lblAutoRotateSpeedVal = document.getElementById('lbl-auto-rotate-speed-val');
  const sliderAutoRotateHigh = document.getElementById('slider-auto-rotate-high');
  const lblAutoRotateHighVal = document.getElementById('lbl-auto-rotate-high-val');

  function syncAutoRotateControls(elem) {
    const isRotating = Boolean(elem && elem.isAutoRotating);

    if (btnRotateCW) btnRotateCW.disabled = !isRotating;
    if (btnRotateCCW) btnRotateCCW.disabled = !isRotating;
    if (sliderAutoRotateSpeed) sliderAutoRotateSpeed.disabled = !isRotating;

    if (!elem || !(elem instanceof HydrodynamicObstacle) || !isRotating) {
      if (sliderAutoRotateSpeed) {
        sliderAutoRotateSpeed.value = elem ? (elem.autoRotateRPM || 5) : 5;
      }
      if (sliderAutoRotateHigh) {
        sliderAutoRotateHigh.value = 200;
        sliderAutoRotateHigh.disabled = true;
      }
      const displayRPM = elem ? (elem.autoRotateRPM || 5) : 5;
      if (lblAutoRotateSpeedVal) lblAutoRotateSpeedVal.textContent = `${displayRPM} RPM`;
      if (lblAutoRotateHighVal) {
        lblAutoRotateHighVal.textContent = '200 RPM';
        lblAutoRotateHighVal.style.color = '#64748b';
      }
      return;
    }

    const currentRPM = elem.autoRotateRPM || 5;
    if (currentRPM < 200) {
      if (sliderAutoRotateSpeed) sliderAutoRotateSpeed.value = currentRPM;
      if (sliderAutoRotateHigh) {
        sliderAutoRotateHigh.disabled = true;
      }
      if (lblAutoRotateSpeedVal) lblAutoRotateSpeedVal.textContent = `${currentRPM} RPM`;
      if (lblAutoRotateHighVal) lblAutoRotateHighVal.style.color = '#64748b';
    } else {
      if (sliderAutoRotateSpeed) sliderAutoRotateSpeed.value = 200;
      if (sliderAutoRotateHigh) {
        sliderAutoRotateHigh.value = currentRPM;
        sliderAutoRotateHigh.disabled = false;
      }
      if (lblAutoRotateSpeedVal) lblAutoRotateSpeedVal.textContent = `${currentRPM} RPM`;
      if (lblAutoRotateHighVal) {
        lblAutoRotateHighVal.textContent = `${currentRPM} RPM`;
        lblAutoRotateHighVal.style.color = 'var(--accent)';
      }
    }
  }

  // --- PORTAPAPELES DE FIGURAS (COPIAR, PEGAR Y DUPLICAR FIGURAS EXACTAS Y DEFORMADAS) ---
  let elementClipboard = null;
  let pasteCascadeCount = 0;

  function copySelectedElement() {
    if (!sim.selectedElement) return;
    // Clonamos una copia exacta con todas sus deformaciones y propiedades actuales
    elementClipboard = (typeof sim.selectedElement.clone === 'function')
      ? sim.selectedElement.clone(0, 0)
      : sim.selectedElement;
    pasteCascadeCount = 0;
    if (btnPasteElement) {
      btnPasteElement.disabled = false;
    }
  }

  function pasteElement() {
    if (!elementClipboard) return;
    pasteCascadeCount++;
    // Desplazamiento progresivo en cascada para no encimar exactamente sobre el original
    const step = 0.35;
    const maxStepsX = 6;
    const maxStepsY = 5;
    const offsetX = step * (((pasteCascadeCount - 1) % maxStepsX) + 1);
    const offsetY = step * (((pasteCascadeCount - 1) % maxStepsY) + 1);

    let cloned = null;
    if (typeof elementClipboard.clone === 'function') {
      cloned = elementClipboard.clone(offsetX, offsetY);
    }
    if (cloned) {
      sim.addElement(cloned, true); // true registra la acción en el historial undo/redo
      updateSelectedElementPropsUI(cloned);
    }
  }

  function duplicateSelectedElement() {
    if (!sim.selectedElement) return;
    copySelectedElement();
    pasteElement();
  }

  function updateSelectedElementPropsUI(elem) {
    const hasElem = Boolean(elem && elem instanceof HydrodynamicObstacle);
    const hasAnyElem = Boolean(elem);

    if (boxSelectedElementProps) {
      boxSelectedElementProps.classList.toggle('is-disabled-panel', !hasAnyElem);
    }
    if (btnCopyElement) {
      btnCopyElement.disabled = !hasAnyElem;
    }
    if (btnPasteElement) {
      btnPasteElement.disabled = !elementClipboard;
    }
    if (btnDeleteElement) {
      btnDeleteElement.disabled = !hasAnyElem;
    }

    if (btnAlphaSweep) btnAlphaSweep.disabled = false;
    if (sliderRotation) sliderRotation.disabled = !hasElem;
    if (chkSmooth) chkSmooth.disabled = !hasElem;
    if (chkShowForces) chkShowForces.disabled = !hasElem;
    if (chkBuoy) chkBuoy.disabled = !hasElem;
    if (chkAutoRotate) chkAutoRotate.disabled = !hasElem;

    if (!hasAnyElem) {
      if (lblSelectedObjName) {
        lblSelectedObjName.textContent = window.t('lblNoObjSelected') || "(Ninguno)";
      }
      if (lblRotValue) lblRotValue.textContent = '0°';
      if (sliderRotation) sliderRotation.value = 0;
      if (chkSmooth) chkSmooth.checked = true;
      if (chkBuoy) chkBuoy.checked = false;
      if (chkAutoRotate) chkAutoRotate.checked = false;
      syncAutoRotateControls(null);
      return;
    }

    if (lblSelectedObjName) {
      lblSelectedObjName.textContent = elem.name;
    }

    if (hasElem) {
      const curRot = ((Math.round(elem.currentRotationDeg || 0) % 360) + 360) % 360;
      if (sliderRotation) sliderRotation.value = curRot;
      if (lblRotValue) lblRotValue.textContent = `${curRot}°`;

      // Vincular estrictamente sweep-target-name y sweep-min-aoa a la pieza sometida a "Iniciar barrido"
      const hasSweptElem = window.AerodynamicSweep && window.AerodynamicSweep.hasExecutedSweepAnimation && window.AerodynamicSweep.getLastSweptElement();
      if (!hasSweptElem) {
        const sweepMinInput = document.getElementById('sweep-min-aoa');
        if (sweepMinInput && !elem.isAutoRotating) sweepMinInput.value = curRot;
        const sweepTargetName = document.getElementById('sweep-target-name');
        if (sweepTargetName) sweepTargetName.textContent = elem.name;
      } else {
        const swept = window.AerodynamicSweep.getLastSweptElement();
        const sweepTargetName = document.getElementById('sweep-target-name');
        if (sweepTargetName && swept) sweepTargetName.textContent = swept.name;
      }
      if (window.AerodynamicSweep && typeof window.AerodynamicSweep.triggerRealtimeUpdate === 'function') {
        window.AerodynamicSweep.triggerRealtimeUpdate(sim);
      }
      if (chkSmooth) chkSmooth.checked = elem.isSmooth;
      if (chkBuoy) chkBuoy.checked = Boolean(elem.isBuoy);
      if (chkAutoRotate) chkAutoRotate.checked = Boolean(elem.isAutoRotating);

      const isCW = (elem.autoRotateDirection !== 'ccw');
      if (btnRotateCW) btnRotateCW.classList.toggle('active', isCW);
      if (btnRotateCCW) btnRotateCCW.classList.toggle('active', !isCW);

      syncAutoRotateControls(elem);
    } else {
      if (lblRotValue) lblRotValue.textContent = '0°';
      if (sliderRotation) sliderRotation.value = 0;
      if (chkSmooth) chkSmooth.checked = false;
      if (chkBuoy) chkBuoy.checked = false;
      if (chkAutoRotate) chkAutoRotate.checked = false;
      syncAutoRotateControls(null);
    }
  }

  sim.onSceneChanged = () => {
    updateSceneList();
    if (window.AerodynamicSweep && typeof window.AerodynamicSweep.triggerRealtimeUpdate === 'function') {
      window.AerodynamicSweep.triggerRealtimeUpdate(sim);
    }
  };
  sim.onElementSelected = (elem) => {
    updateSceneList();
    updateSelectedElementPropsUI(elem);
  };

  sim.onElementRotationUpdate = (elem) => {
    if (elem) {
      const curRot = ((Math.round(elem.currentRotationDeg || 0) % 360) + 360) % 360;
      if (sliderRotation) sliderRotation.value = curRot;
      if (lblRotValue) lblRotValue.textContent = `${curRot}°`;

      if (!elem.isAutoRotating) {
        const hasSweptElem = window.AerodynamicSweep && window.AerodynamicSweep.hasExecutedSweepAnimation && window.AerodynamicSweep.getLastSweptElement();
        if (!hasSweptElem || window.AerodynamicSweep.getLastSweptElement() === elem) {
          const sweepMinInput = document.getElementById('sweep-min-aoa');
          if (sweepMinInput) sweepMinInput.value = curRot;
        }
        if (window.AerodynamicSweep && window.AerodynamicSweep.isOpen) {
          window.AerodynamicSweep.triggerRealtimeUpdate(sim);
        }
      }
    }
  };

  if (btnAlphaSweep) {
    btnAlphaSweep.addEventListener('click', () => {
      if (window.AerodynamicSweep && typeof window.AerodynamicSweep.toggleSweepView === 'function') {
        window.AerodynamicSweep.toggleSweepView(sim);
      }
    });
  }

  if (btnRotateCW) {
    btnRotateCW.addEventListener('click', () => {
      const elem = sim.selectedElement;
      if (elem && elem instanceof HydrodynamicObstacle) {
        elem.autoRotateDirection = 'cw';
        btnRotateCW.classList.add('active');
        if (btnRotateCCW) btnRotateCCW.classList.remove('active');
      }
    });
  }

  if (btnRotateCCW) {
    btnRotateCCW.addEventListener('click', () => {
      const elem = sim.selectedElement;
      if (elem && elem instanceof HydrodynamicObstacle) {
        elem.autoRotateDirection = 'ccw';
        btnRotateCCW.classList.add('active');
        if (btnRotateCW) btnRotateCW.classList.remove('active');
      }
    });
  }

  if (chkBuoy) {
    chkBuoy.addEventListener('change', (e) => {
      if (sim.selectedElement && sim.selectedElement instanceof HydrodynamicObstacle) {
        sim.selectedElement.isBuoy = e.target.checked;
        if (e.target.checked) {
          const flow = (sim.getSurroundingFlow && typeof sim.getSurroundingFlow === 'function')
            ? sim.getSurroundingFlow(sim.selectedElement)
            : null;
          if (flow && (Math.abs(flow.u) > 0.01 || Math.abs(flow.v) > 0.01)) {
            sim.selectedElement.vx = flow.u;
            sim.selectedElement.vy = flow.v;
          } else {
            sim.selectedElement.vx = (sim.isFlowActive) ? ((sim.fluid && sim.fluid.inflowSpeed) || 5.0) : 0.0;
            sim.selectedElement.vy = 0.0;
          }
        } else {
          sim.selectedElement.vx = 0.0;
          sim.selectedElement.vy = 0.0;
        }
      }
    });
  }

  if (chkAutoRotate) {
    chkAutoRotate.addEventListener('change', (e) => {
      const elem = sim.selectedElement;
      if (elem && elem instanceof HydrodynamicObstacle) {
        elem.isAutoRotating = e.target.checked;
        if (e.target.checked) {
          if (!elem.autoRotateRPM) {
            elem.autoRotateRPM = 5;
          }
          if (!elem.autoRotateDirection) {
            elem.autoRotateDirection = 'cw';
          }
          syncAutoRotateControls(elem);
        } else {
          // Desactivación del giro autónomo:
          elem.angularVelocity = 0.0;

          // Mover exactamente un píxel a la derecha para eliminar residuos de giro
          const onePixelWorld = 1.0 / Math.max(sim.zoomLevel, 1.0);
          elem.translate(onePixelWorld, 0.0);

          // Re-rasterizar de inmediato en los motores físicos para limpiar el campo de velocidades sólidas
          sim.fluid.rasterizeObstacles(sim.elements);
          if (sim.isLBMMode) {
            sim.lbm.rasterizeObstacles(sim.elements, sim.fluid.domainWidth, sim.fluid.domainHeight);
          }

          syncAutoRotateControls(elem);
        }
      }
    });
  }

  if (sliderAutoRotateSpeed) {
    sliderAutoRotateSpeed.addEventListener('input', (e) => {
      const val1 = parseInt(e.target.value, 10);
      const val2 = sliderAutoRotateHigh ? parseInt(sliderAutoRotateHigh.value, 10) : 200;
      const elem = sim.selectedElement;

      if (val1 < 200) {
        if (sliderAutoRotateHigh) {
          sliderAutoRotateHigh.disabled = true;
        }
        if (lblAutoRotateHighVal) {
          lblAutoRotateHighVal.style.color = '#64748b';
        }
        if (lblAutoRotateSpeedVal) lblAutoRotateSpeedVal.textContent = `${val1} RPM`;
        if (elem && elem instanceof HydrodynamicObstacle) {
          elem.autoRotateRPM = val1;
        }
      } else {
        // val1 === 200: habilitar slider de alta velocidad
        if (sliderAutoRotateHigh) {
          sliderAutoRotateHigh.disabled = false;
        }
        if (lblAutoRotateHighVal) {
          lblAutoRotateHighVal.style.color = 'var(--accent)';
          lblAutoRotateHighVal.textContent = `${val2} RPM`;
        }
        const activeRPM = val2;
        if (lblAutoRotateSpeedVal) lblAutoRotateSpeedVal.textContent = `${activeRPM} RPM`;
        if (elem && elem instanceof HydrodynamicObstacle) {
          elem.autoRotateRPM = activeRPM;
        }
      }
    });
  }

  if (sliderAutoRotateHigh) {
    sliderAutoRotateHigh.addEventListener('input', (e) => {
      const val2 = parseInt(e.target.value, 10);
      if (lblAutoRotateHighVal) lblAutoRotateHighVal.textContent = `${val2} RPM`;
      const val1 = sliderAutoRotateSpeed ? parseInt(sliderAutoRotateSpeed.value, 10) : 5;
      if (val1 === 200) {
        if (lblAutoRotateSpeedVal) lblAutoRotateSpeedVal.textContent = `${val2} RPM`;
        if (sim.selectedElement && sim.selectedElement instanceof HydrodynamicObstacle) {
          sim.selectedElement.autoRotateRPM = val2;
        }
      }
    });
  }

  function updateSceneList() {
    if (!listSceneElements) return;
    listSceneElements.innerHTML = '';

    if (!sim.elements || sim.elements.length === 0) {
      const li = document.createElement('li');
      li.className = 'scene-list-empty';
      li.textContent = (window.currentLang === 'es') ? 'Sin obstáculos en la escena' : 'No obstacles in scene';
      listSceneElements.appendChild(li);
      return;
    }

    sim.elements.forEach((elem) => {
      const li = document.createElement('li');
      li.className = `scene-item ${elem.isSelected ? 'selected' : ''}`;
      li.style.cursor = 'pointer';

      let icon = '🔹';
      if (elem instanceof HydrodynamicObstacle) {
        if (elem.name.includes('Airfoil') || elem.name.includes('NACA')) icon = '✈️';
        else if (elem.name.includes('Cylinder')) icon = '⚪';
        else if (elem.name.includes('Car')) icon = '🏎️';
        else if (elem.name.includes('Teardrop')) icon = '💧';
        else icon = '🔷';
      } else if (elem instanceof FlowProbe) {
        icon = '🎯';
      }

      const toggleTitle = (window.currentLang === 'es') ? 'Activar / Ocultar obstáculo' : 'Toggle visibility';
      const deleteTitle = (window.currentLang === 'es') ? 'Eliminar obstáculo' : 'Delete obstacle';

      li.innerHTML = `
        <span class="scene-item-icon">${icon}</span>
        <span class="scene-item-name" style="flex:1;">${elem.name}</span>
        <div class="scene-item-actions">
          <button type="button" class="btn-item-toggle" title="${toggleTitle}" style="color:${elem.isActive ? '#00ffcc' : '#64748b'};">
            ${elem.isActive ? '👁️' : '👁️‍🗨️'}
          </button>
          <button type="button" class="btn-item-delete" title="${deleteTitle}">
            🗑️
          </button>
        </div>
      `;

      li.addEventListener('click', (e) => {
        if (e.target.closest('.btn-item-toggle')) {
          e.stopPropagation();
          elem.isActive = !elem.isActive;
          sim.fluid.rasterizeObstacles(sim.elements);
          if (sim.isLBMMode && sim.lbm) {
            sim.lbm.rasterizeObstacles(sim.elements, sim.fluid.domainWidth, sim.fluid.domainHeight);
          }
          updateSceneList();
          return;
        }
        if (e.target.closest('.btn-item-delete')) {
          e.stopPropagation();
          sim.removeElement(elem);
          if (sim.selectedElement === elem) {
            sim.selectElement(null);
          }
          updateSceneList();
          showToast(window.currentLang === 'es' ? "Obstáculo eliminado." : "Obstacle deleted.", "info");
          return;
        }
        sim.selectElement(elem);
      });

      listSceneElements.appendChild(li);
    });
  }

  if (btnCopyElement) {
    btnCopyElement.addEventListener('click', () => {
      copySelectedElement();
    });
  }

  if (btnPasteElement) {
    btnPasteElement.addEventListener('click', () => {
      pasteElement();
    });
  }

  if (btnDeleteElement) {
    btnDeleteElement.addEventListener('click', () => {
      if (sim.selectedElement) {
        sim.removeElement(sim.selectedElement);
        sim.selectElement(null);
        showToast("Obstáculo eliminado.", "info");
      }
    });
  }

  // --- GUARDAR INFORME AERODINÁMICO HD ---
  if (btnSaveReport) {
    btnSaveReport.addEventListener('click', () => {
      openReportDonateModal();
    });
  }

  // --- GUARDAR Y ABRIR ESCENA JSON ---
  // --- GUARDAR Y ABRIR ESCENA JSON (FIDELIDAD 100% DE PARÁMETROS, FIGURAS E IMÁGENES) ---
  if (btnSaveScene) {
    btnSaveScene.addEventListener('click', () => {
      const data = {
        version: "2026.2",
        timestamp: new Date().toISOString(),
        solver: sim.isLBMMode ? 'lbm' : 'ns',
        visMode: sim.visMode,
        inflowSpeed: sim.fluid ? sim.fluid.inflowSpeed : 5.0,
        inflowAngle: sim.fluid ? (sim.fluid.inflowAngle || 0.0) : 0.0,
        viscosity: sim.fluid ? sim.fluid.viscosity : 0.0001,
        density: sim.fluid ? sim.fluid.density : 1.225,
        closedWalls: sim.fluid ? Boolean(sim.fluid.closedWalls) : false,
        flowRegime: sim.fluid ? (sim.fluid.flowRegime || 'laminar') : 'laminar',
        turbulenceIntensity: sim.fluid ? (sim.fluid.turbulenceIntensity || 0.0) : 0.0,
        isFlowActive: sim.fluid ? Boolean(sim.fluid.isFlowActive) : true,
        isPaused: Boolean(sim.isPaused),
        showParticles: sim.showParticles !== false,
        showForces: Boolean(sim.showForces),
        showGrid: Boolean(sim.showGrid),
        zoomLevel: sim.zoomLevel || 40.0,
        panOffset: sim.panOffset ? { x: sim.panOffset.x, y: sim.panOffset.y } : { x: 0, y: 0 },
        elements: sim.elements.map(e => {
          if (e instanceof HydrodynamicObstacle) {
            let croppedDataUrl = null;
            if (e.imageCroppedCanvas) {
              try {
                croppedDataUrl = e.imageCroppedCanvas.toDataURL('image/png');
              } catch (cropErr) {
                console.warn("[SaveScene] No se pudo exportar lienzo recortado:", cropErr);
              }
            } else if (e.name && (e.name === 'Bólido' || e.name.startsWith('Bólido')) && window.BOLIDO_IMAGE_SRC) {
              croppedDataUrl = window.BOLIDO_IMAGE_SRC;
            }

            return {
              type: 'HydrodynamicObstacle',
              name: e.name,
              controlPoints: e.controlPoints ? e.controlPoints.map(p => [parseFloat(p[0]), parseFloat(p[1])]) : [],
              loops: e.loops ? e.loops.map(loop => loop.map(p => [parseFloat(p[0]), parseFloat(p[1])])) : null,
              isSmooth: Boolean(e.isSmooth),
              rotationDeg: e.currentRotationDeg || 0.0,
              color: e.color || '#38bdf8',
              fillColor: e.fillColor || 'rgba(23, 37, 84, 0.85)',
              isSolid: (e.isSolid !== undefined) ? Boolean(e.isSolid) : true,
              isBuoy: Boolean(e.isBuoy),
              isAutoRotating: Boolean(e.isAutoRotating),
              autoRotateRPM: e.autoRotateRPM || 5,
              autoRotateDirection: e.autoRotateDirection || 'cw',
              isThruster: Boolean(e.isThruster),
              thrustSpeed: (e.thrustSpeed !== undefined) ? parseFloat(e.thrustSpeed) : 5.0,
              smokeMode: e.smokeMode || 'vapor',
              isImportedImage: Boolean(e.isImportedImage),
              imageWorldWidth: e.imageWorldWidth || null,
              imageWorldHeight: e.imageWorldHeight || null,
              imageCenter: e.imageCenter ? [parseFloat(e.imageCenter[0]), parseFloat(e.imageCenter[1])] : null,
              imageMaskW: e.imageMaskW || null,
              imageMaskH: e.imageMaskH || null,
              imageCroppedDataUrl: croppedDataUrl
            };
          } else if (e instanceof FlowProbe) {
            return {
              type: 'FlowProbe',
              name: e.name,
              x: parseFloat(e.x),
              y: parseFloat(e.y),
              radius: parseFloat(e.radius || 0.35)
            };
          }
          return null;
        }).filter(Boolean)
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `escena_tunel_fluidos_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Configuración completa del túnel y figuras guardada en archivo JSON.", "success");
    });
  }

  if (btnOpenScene && fileInputScene) {
    btnOpenScene.addEventListener('click', () => fileInputScene.click());
    fileInputScene.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = JSON.parse(event.target.result);
          sim.clearScene();

          // 1. Restaurar propiedades globales del túnel, fluido y simulación
          if (data.inflowSpeed !== undefined) {
            const spd = parseFloat(data.inflowSpeed);
            if (sim.fluid) sim.fluid.inflowSpeed = spd;
            if (sliderSpeed) sliderSpeed.value = spd;
            if (lblSpeedValue) lblSpeedValue.textContent = `${spd.toFixed(1)} m/s`;
            if (sim.lbm) {
              const norm = Math.min(1.0, Math.max(0.0, (spd - 0.5) / 11.5));
              sim.lbm.speed = 0.060 + norm * 0.055;
              sim.lbm.stepsPerFrame = Math.round(8 + norm * 20);
            }
          }

          if (data.inflowAngle !== undefined || data.flowAngle !== undefined) {
            const angRad = parseFloat(data.inflowAngle !== undefined ? data.inflowAngle : data.flowAngle);
            if (sim.fluid) sim.fluid.inflowAngle = angRad;
            if (sim.lbm) sim.lbm.inflowAngle = angRad;
            const deg = Math.round((angRad * 180.0) / Math.PI);
            if (sliderAngle) sliderAngle.value = deg;
            if (lblAngleValue) lblAngleValue.textContent = `${deg}°`;
          }

          if (data.viscosity !== undefined) {
            const nu = parseFloat(data.viscosity);
            if (sim.fluid) sim.fluid.viscosity = nu;
            const logVal = 1 + 99.0 * (Math.log(Math.max(1e-7, nu) / 0.000005) / Math.log(1600));
            const clampedSlider = Math.max(1, Math.min(100, Math.round(logVal)));
            if (sliderViscosity) sliderViscosity.value = clampedSlider;
            if (sim.lbm) {
              sim.lbm.viscosity = 0.018 + (clampedSlider / 100.0) * 0.052;
              sim.lbm.contrast = clampedSlider > 75 ? 0.6 : 1.0;
            }
            updateViscosityDisplay();
          }

          if (data.density !== undefined) {
            setFluidDensity(data.density);
          }

          if (data.closedWalls !== undefined) {
            if (sim.fluid) sim.fluid.closedWalls = Boolean(data.closedWalls);
            if (chkClosedWalls) chkClosedWalls.checked = Boolean(data.closedWalls);
          }

          if (data.flowRegime || data.turbulenceIntensity !== undefined) {
            const reg = data.flowRegime || 'laminar';
            const intens = (data.turbulenceIntensity !== undefined) ? parseFloat(data.turbulenceIntensity) : 0.0;
            if (sim.fluid) sim.fluid.setFlowRegime(reg, intens);
            updateRegimeUI(reg, intens);
          }

          if (data.isFlowActive !== undefined) {
            const active = Boolean(data.isFlowActive);
            sim.setFlowActive(active);
            updateFlowUI(active);
          }

          if (data.isPaused !== undefined) {
            sim.isPaused = Boolean(data.isPaused);
            updatePlayPauseUI(sim.isPaused);
          }

          if (data.showParticles !== undefined) {
            sim.showParticles = Boolean(data.showParticles);
            if (chkShowParticles) chkShowParticles.checked = Boolean(data.showParticles);
          }

          if (data.showForces !== undefined) {
            sim.showForces = Boolean(data.showForces);
            if (chkShowForces) chkShowForces.checked = Boolean(data.showForces);
          }

          if (data.showGrid !== undefined) {
            sim.showGrid = Boolean(data.showGrid);
            if (chkGrid) chkGrid.checked = Boolean(data.showGrid);
          }

          if (data.visMode) {
            applyVisModeSelection(data.visMode, false);
          }

          if (data.zoomLevel !== undefined) {
            sim.zoomLevel = parseFloat(data.zoomLevel);
          }
          if (data.panOffset && typeof data.panOffset.x === 'number') {
            sim.panOffset.x = data.panOffset.x;
            sim.panOffset.y = data.panOffset.y;
            if (sim.clampPanOffset) sim.clampPanOffset();
          }

          // 2. Restaurar Elementos y Figuras (con soporte asíncrono para imágenes exactas)
          if (data.elements && Array.isArray(data.elements)) {
            for (const item of data.elements) {
              if (item.type === 'HydrodynamicObstacle') {
                const cPoints = item.controlPoints ? item.controlPoints.map(p => [parseFloat(p[0]), parseFloat(p[1])]) : [];
                const loops = item.loops ? item.loops.map(l => l.map(p => [parseFloat(p[0]), parseFloat(p[1])])) : null;
                const isImported = Boolean(item.isImportedImage);

                const obs = new HydrodynamicObstacle(cPoints, item.name || "Figura", Boolean(item.isSmooth), loops, isImported);
                obs.currentRotationDeg = item.rotationDeg || 0.0;
                obs.color = item.color || '#38bdf8';
                obs.fillColor = item.fillColor || 'rgba(23, 37, 84, 0.85)';
                obs.isSolid = (item.isSolid !== undefined) ? Boolean(item.isSolid) : true;
                obs.isBuoy = Boolean(item.isBuoy);
                obs.isAutoRotating = Boolean(item.isAutoRotating);
                obs.autoRotateRPM = item.autoRotateRPM || 5;
                obs.autoRotateDirection = item.autoRotateDirection || 'cw';
                obs.isThruster = Boolean(item.isThruster);
                obs.thrustSpeed = (item.thrustSpeed !== undefined) ? parseFloat(item.thrustSpeed) : 5.0;
                obs.smokeMode = item.smokeMode || 'vapor';

                if (isImported) {
                  obs.imageWorldWidth = item.imageWorldWidth || (loops && loops[0] ? 3.8 : 4.0);
                  obs.imageWorldHeight = item.imageWorldHeight || 1.35;
                  obs.imageCenter = item.imageCenter ? [parseFloat(item.imageCenter[0]), parseFloat(item.imageCenter[1])] : obs.getCentroid();

                  if (item.imageCroppedDataUrl) {
                    await new Promise((resolve) => {
                      const img = new Image();
                      img.onload = () => {
                        try {
                          const traced = ImageContourTracer.traceImage(
                            img,
                            item.name || 'Figura',
                            obs.imageWorldWidth,
                            obs.imageCenter
                          );
                          obs.imageThemedCanvases = traced.imageThemedCanvases;
                          obs.imageCroppedCanvas = traced.imageCroppedCanvas;
                          obs.imageMask = traced.imageMask;
                          obs.imageMaskW = traced.imageMaskW;
                          obs.imageMaskH = traced.imageMaskH;

                          // PRESERVAR LOS LOOPS Y CONTROLPOINTS EXACTOS DEL JSON (si el usuario los deformó o escaló)
                          if (loops && loops.length > 0) {
                            obs.loops = loops;
                            obs.controlPoints = cPoints.length > 0 ? cPoints : loops[0];
                          }
                        } catch (errTrace) {
                          console.warn("[OpenScene] Error retracing restored image:", errTrace);
                        }
                        resolve();
                      };
                      img.onerror = () => {
                        console.warn("[OpenScene] No se pudo cargar imagen desde imageCroppedDataUrl");
                        resolve();
                      };
                      img.src = item.imageCroppedDataUrl;
                    });
                  } else if (item.name && (item.name === 'Bólido' || item.name.startsWith('Bólido')) && HydrodynamicObstacle._bolidoTemplate) {
                    const tmpl = HydrodynamicObstacle._bolidoTemplate;
                    obs.imageThemedCanvases = tmpl.imageThemedCanvases;
                    obs.imageCroppedCanvas = tmpl.imageCroppedCanvas;
                    obs.imageMask = tmpl.imageMask;
                    obs.imageMaskW = tmpl.imageMaskW;
                    obs.imageMaskH = tmpl.imageMaskH;
                  }
                }

                obs.invalidateCache();
                sim.addElement(obs, false);
              } else if (item.type === 'FlowProbe') {
                const probe = new FlowProbe(item.x, item.y, item.name || "Sensor");
                if (item.radius !== undefined) probe.radius = parseFloat(item.radius);
                sim.addElement(probe, false);
              }
            }
          }

          sim.selectElement(sim.elements.length > 0 ? sim.elements[0] : null);
          if (sim.fluid) sim.fluid.rasterizeObstacles(sim.elements);
          if (sim.isLBMMode && sim.lbm) {
            sim.lbm.rasterizeObstacles(sim.elements, sim.fluid.domainWidth, sim.fluid.domainHeight);
          }
          updateSceneList();
          if (sim.selectedElement) {
            updateSelectedElementPropsUI(sim.selectedElement);
          } else {
            updateSelectedElementPropsUI(null);
          }
          sim.render();
          showToast("Túnel cargado correctamente con todos sus parámetros e imágenes exactas.", "success");
        } catch (err) {
          console.error("[OpenScene] Error loading scene:", err);
          showToast("Error al parsear archivo JSON: " + err.message, "error");
        }
      };
      reader.readAsText(file);
      fileInputScene.value = '';
    });
  }

  // --- ABRIR FIGURA SVG / PNG COMO OBSTÁCULO HIDRODINÁMICO ---
  if (btnImportVectorImage && fileInputVectorImage) {
    btnImportVectorImage.addEventListener('click', () => fileInputVectorImage.click());

    fileInputVectorImage.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const isEs = (typeof currentLang !== 'undefined' ? currentLang : 'es') === 'es';
        showToast(isEs ? "Analizando contorno de la figura..." : "Analyzing shape contour...", "info", 1800);

        const domainH = sim.fluid.domainHeight || 9.0;
        const targetCenter = [6.0, domainH / 2.0];
        const result = await ImageContourTracer.traceFile(file, 3.8, targetCenter);

        const obs = new HydrodynamicObstacle(result.points, result.name, false, result.loops, true);
        obs.isImportedImage = true;
        obs.imageThemedCanvases = result.imageThemedCanvases;
        obs.imageCroppedCanvas = result.imageCroppedCanvas;
        obs.imageWorldWidth = result.imageWorldWidth;
        obs.imageWorldHeight = result.imageWorldHeight;
        obs.imageCenter = [result.imageCenter[0], result.imageCenter[1]];
        obs.imageMask = result.imageMask;
        obs.imageMaskW = result.imageMaskW;
        obs.imageMaskH = result.imageMaskH;
        obs.color = '#38bdf8';
        sim.addElement(obs);
        sim.selectElement(obs);
        sim.setMode(CanvasMode.SELECT);

        showToast(
          isEs
            ? `Figura agregada al túnel. Puedes arrastrar sus bordes para cambiar el tamaño.`
            : `Shape added to tunnel. Drag its borders to resize.`,
          "success",
          3500
        );
      } catch (err) {
        console.error(err);
        const isEs = (typeof currentLang !== 'undefined' ? currentLang : 'es') === 'es';
        showToast(
          (isEs ? "Error al abrir figura: " : "Error importing shape: ") + (err.message || err),
          "error",
          4000
        );
      } finally {
        fileInputVectorImage.value = '';
      }
    });
  }

  // --- DEMOS FÍSICAS DE FLUIDOS ---
  const btnDemosPrev = document.getElementById('btn-demos-prev');
  const btnDemosNext = document.getElementById('btn-demos-next');
  let currentDemoId = '1';

  function cycleDemo(delta) {
    if (!cbDemos) return;
    const valid = Array.from(cbDemos.options).filter(o => o.value);
    if (valid.length === 0) return;
    let idx = valid.findIndex(o => o.value === (cbDemos.value || currentDemoId));
    if (idx === -1) idx = 0;
    let nextIdx = (idx + delta + valid.length) % valid.length;
    const demoId = valid[nextIdx].value;
    currentDemoId = demoId;
    cbDemos.value = demoId;
    loadPhysicsDemo(demoId);
  }

  if (btnDemosPrev) btnDemosPrev.addEventListener('click', () => cycleDemo(-1));
  if (btnDemosNext) btnDemosNext.addEventListener('click', () => cycleDemo(1));

  if (cbDemos) {
    cbDemos.addEventListener('change', (e) => {
      const demoId = e.target.value;
      if (!demoId) return;
      currentDemoId = demoId;
      loadPhysicsDemo(demoId);
    });
  }

  function loadPhysicsDemo(id) {
    sim.clearScene();
    const w = sim.fluid.domainWidth;
    const h = sim.fluid.domainHeight;
    const cy = h / 2.0;

    switch (id) {
      case '1': {
        // Demo 1: Perfil NACA 0012 y Sustentación
        const airfoil = HydrodynamicObstacle.createNACA("0012", 4.0, [5.5, cy]);
        airfoil.rotate(8 * Math.PI / 180.0); // 8 grados de ángulo de ataque
        sim.addElement(airfoil);
        sim.fluid.inflowSpeed = 5.0;
        if (sim.lbm) {
          const norm = Math.min(1.0, Math.max(0.0, (5.0 - 0.5) / 11.5));
          sim.lbm.speed = 0.060 + norm * 0.055;
          sim.lbm.stepsPerFrame = Math.round(8 + norm * 20);
        }
        sim.setVisMode(VisMode.SMOKE);
        if (sliderSpeed) sliderSpeed.value = 5.0;
        if (lblSpeedValue) lblSpeedValue.textContent = "5.0 m/s";
        if (rowLbmContrast) rowLbmContrast.style.display = 'none';
        showToast("Demo 1: Perfil NACA 0012 a 8° de ataque generando sustentación.", "success");
        break;
      }
      case '2': {
        // Demo 2: Calle de Vórtices de Von Kármán
        const cyl = HydrodynamicObstacle.createCylinder(1.15, [4.8, cy]);
        sim.addElement(cyl);
        sim.fluid.inflowSpeed = 2.4;
        sim.fluid.viscosity = 0.00012;
        sim.setVisMode(VisMode.VORTICITY);
        showToast("Demo 2: Calle de vórtices alternos de Von Kármán tras cilindro.", "success");
        break;
      }
      case '3': {
        // Demo 3: Gota Aerodinámica vs. Placa Plana (Comparación de Arrastre)
        const teardrop = HydrodynamicObstacle.createTeardrop(3.6, 1.5, [5.0, cy - 2.0]);
        const plate = HydrodynamicObstacle.createFlatPlate(2.8, 0.22, [5.0, cy + 2.0]);
        plate.rotate(90 * Math.PI / 180.0); // Perpendicular al flujo
        sim.addElement(teardrop);
        sim.addElement(plate);
        sim.setVisMode(VisMode.PRESSURE);
        showToast("Demo 3: Gota de bajo arrastre vs. Placa plana con enorme estela.", "success");
        break;
      }
      case '4': {
        // Demo 4: Entrada en Pérdida (Stall) a Alto Ángulo de Ataque
        const wing = HydrodynamicObstacle.createNACA("2412", 4.2, [6.0, cy]);
        wing.rotate(24 * Math.PI / 180.0); // 24° provoca separación total de capa límite
        sim.addElement(wing);
        sim.setVisMode(VisMode.SMOKE);
        showToast("Demo 4: Pérdida de sustentación (Stall) por desprendimiento en el extradós.", "warning");
        break;
      }
      case '5': {
        // Demo 5: Efecto Venturi y Tubo de Bernoulli
        const nozzles = HydrodynamicObstacle.createVenturiNozzles(w, h, 2.6);
        nozzles.forEach(n => sim.addElement(n));
        sim.addElement(new FlowProbe(w / 2.0, cy, "Sensor Garganta"));
        sim.setVisMode(VisMode.VELOCITY);
        showToast("Demo 5: Venturi - Aceleración de velocidad y caída de presión estática.", "success");
        break;
      }
      case '6': {
        // Demo 6: Bólido de Carreras y Carga Aerodinámica (Downforce)
        const car = HydrodynamicObstacle.createCarProfile(5.2, 1.8, [6.2, cy + 1.2]);
        sim.addElement(car);
        sim.fluid.closedWalls = true;
        sim.setVisMode(VisMode.SMOKE);
        showToast("Demo 6: Aerodinámica de bólido con alerón y estela trasera.", "success");
        break;
      }
      case '7': {
        // Demo 7: Ala Multielemento con Ranura (Main + Flap)
        const mainWing = HydrodynamicObstacle.createNACA("2412", 3.2, [5.0, cy]);
        mainWing.rotate(6 * Math.PI / 180.0);
        const flap = HydrodynamicObstacle.createNACA("0012", 1.6, [7.2, cy + 0.35]);
        flap.rotate(28 * Math.PI / 180.0);
        sim.addElement(mainWing);
        sim.addElement(flap);
        sim.setVisMode(VisMode.PRESSURE);
        showToast("Demo 7: Ala con Flap ranurado para alta sustentación.", "success");
        break;
      }
      case '8': {
        // Demo 8: Cuerpos Romos (Cuadrado vs. Cilindro)
        const sq = HydrodynamicObstacle.createSquare(1.6, [4.5, cy - 2.0]);
        const cyld = HydrodynamicObstacle.createCylinder(0.9, [4.5, cy + 2.0]);
        sim.addElement(sq);
        sim.addElement(cyld);
        sim.setVisMode(VisMode.VORTICITY);
        showToast("Demo 8: Separación en esquinas afiladas (cuadrado) vs. cuerpo circular.", "info");
        break;
      }
      case '9': {
        // Demo 9: Rebufo Aerodinámico (Drafting / Slipstream)
        const lead = HydrodynamicObstacle.createTeardrop(2.8, 1.4, [4.2, cy]);
        const chase = HydrodynamicObstacle.createTeardrop(2.8, 1.4, [8.2, cy]);
        sim.addElement(lead);
        sim.addElement(chase);
        sim.setVisMode(VisMode.VELOCITY);
        showToast("Demo 9: Rebufo (Slipstream) - El vehículo trasero experimenta menos drag.", "success");
        break;
      }
      case '10': {
        // Demo 10: Tobera Convergente-Divergente
        const diff = HydrodynamicObstacle.createVenturiNozzles(w, h, 2.0);
        diff.forEach(n => sim.addElement(n));
        sim.setVisMode(VisMode.PRESSURE);
        showToast("Demo 10: Tobera convergente-divergente.", "info");
        break;
      }
      case '11': {
        // Demo 11: Efecto Suelo (Ala próxima a pared inferior)
        const hydrofoil = HydrodynamicObstacle.createNACA("4412", 3.8, [6.0, h - 1.2]);
        hydrofoil.rotate(5 * Math.PI / 180.0);
        sim.addElement(hydrofoil);
        sim.fluid.closedWalls = true;
        sim.setVisMode(VisMode.PRESSURE);
        showToast("Demo 11: Efecto Suelo - Sobrepresión bajo el intradós que dispara la sustentación.", "success");
        break;
      }
      case '12': {
        // Demo 12: Figura Orgánica Esculpida
        const organicPts = [
          [4.0, cy - 0.8],
          [5.5, cy - 1.4],
          [7.0, cy - 0.5],
          [8.0, cy],
          [7.2, cy + 0.8],
          [5.2, cy + 0.9],
          [4.2, cy + 0.2]
        ];
        const sculpted = new HydrodynamicObstacle(organicPts, "Figura Esculpida a Mano", true);
        sim.addElement(sculpted);
        sim.setMode(CanvasMode.NODE_EDIT);
        setActiveToolButton(btnNodeEdit);
        sim.setVisMode(VisMode.SMOKE);
        showToast("Demo 12: ¡Arrastra los nodos para esculpir tu propio cuerpo aerodinámico!", "success");
        break;
      }
      case '13': {
        // Demo 13: Placa / Línea de Schroeder (Calle de Vórtices de Von Kármán en LBM HD)
        sim.clearScene();
        const line = HydrodynamicObstacle.createLinearBarrier(2.4, [4.8, cy]);
        sim.addElement(line);
        sim.lbm.speed = 0.100;
        sim.lbm.stepsPerFrame = 20; // 20 pasos por frame (exactamente como en el video de Schroeder)
        sim.lbm.viscosity = 0.020;
        sim.lbm.contrast = 1.0;
        sim.lbm.initFluid();
        sim.setVisMode(VisMode.SCHROEDER_CURL);
        if (sliderSpeed) sliderSpeed.value = 4.5;
        if (lblSpeedValue) lblSpeedValue.textContent = "4.5 m/s";
        if (sliderViscosity) sliderViscosity.value = 15;
        if (lblViscosityValue) lblViscosityValue.textContent = "0.00015 m²/s";
        if (sliderContrast) sliderContrast.value = 0;
        if (lblContrastValue) lblContrastValue.textContent = "1.0x";
        if (rowLbmContrast) rowLbmContrast.style.display = 'block';
        showToast("Demo 13: Schroeder LBM HD · Desprendimiento continuo de vórtices de Von Kármán.", "success", 3000);
        break;
      }
      case '14': {
        // Demo 14: Cuña Aerodinámica con Turbulencia Real en LBM HD
        sim.clearScene();
        const wedge = HydrodynamicObstacle.createWedge(2.6, 2.2, [4.8, cy]);
        sim.addElement(wedge);
        sim.lbm.speed = 0.100;
        sim.lbm.stepsPerFrame = 20;
        sim.lbm.viscosity = 0.020;
        sim.lbm.contrast = 1.1;
        sim.lbm.initFluid();
        sim.setVisMode(VisMode.SCHROEDER_CURL);
        if (sliderSpeed) sliderSpeed.value = 4.5;
        if (lblSpeedValue) lblSpeedValue.textContent = "4.5 m/s";
        if (sliderContrast) sliderContrast.value = 1;
        if (lblContrastValue) lblContrastValue.textContent = "1.2x";
        if (rowLbmContrast) rowLbmContrast.style.display = 'block';
        showToast("Demo 14: Cuña deflector en LBM HD · Vórtices libres y estela turbulenta real.", "success", 3000);
        break;
      }
    }

    let currentModeKey = 'smoke';
    if (sim.visMode === VisMode.SMOKE) currentModeKey = 'smoke';
    else if (sim.visMode === VisMode.VORTICITY) currentModeKey = 'vorticity';
    else if (sim.visMode === VisMode.CFD_DES_LES) currentModeKey = 'cfd_des_les';
    else if (sim.visMode === VisMode.PRESSURE) currentModeKey = 'pressure';
    else if (sim.visMode === VisMode.CFD_COMBUSTION) currentModeKey = 'cfd_combustion';
    else if (sim.visMode === VisMode.VELOCITY) currentModeKey = 'velocity';
    else if (sim.visMode === VisMode.SCHROEDER_CURL) currentModeKey = 'schroeder_curl';
    else if (sim.visMode === VisMode.SCHROEDER_SPEED) currentModeKey = 'schroeder_speed';
    else if (sim.visMode === VisMode.PARTICLES) currentModeKey = 'particles';
    else if (sim.visMode === VisMode.SCHROEDER_FLOWLINES) currentModeKey = 'schroeder_flowlines';
    applyVisModeSelection(currentModeKey, false);
  }

  // Coordenadas del cursor
  sim.onCoordsChanged = (wx, wy) => {
    if (lblCoords) {
      lblCoords.textContent = `X: ${wx.toFixed(2)} m, Y: ${wy.toFixed(2)} m`;
    }
  };

  // Atajos de teclado
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // Undo: Ctrl + Z / Cmd + Z (y Redo con Shift)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      if (e.shiftKey) {
        handleRedo();
      } else {
        handleUndo();
      }
      return;
    }

    // Redo: Ctrl + Y / Cmd + Y
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
      e.preventDefault();
      handleRedo();
      return;
    }

    // Copiar: Ctrl + C / Cmd + C
    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
      if (sim.selectedElement) {
        e.preventDefault();
        copySelectedElement();
      }
      return;
    }

    // Pegar: Ctrl + V / Cmd + V
    if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
      if (elementClipboard) {
        e.preventDefault();
        pasteElement();
      }
      return;
    }

    // Duplicar directo: Ctrl + D / Cmd + D
    if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
      if (sim.selectedElement) {
        e.preventDefault();
        duplicateSelectedElement();
      }
      return;
    }

    if (e.key === 'Escape') {
      if (aboutModal) aboutModal.style.display = 'none';
      closeDonateModal();
      closeReportDonateModal();
      if (sim.mode === CanvasMode.DRAW_POLYGON) {
        if (sim.drawPoints.length >= 3) {
          sim.finishPolygon();
        } else {
          sim.drawPoints = [];
          sim.setMode(CanvasMode.SELECT);
        }
      } else if (sim.mode === CanvasMode.NODE_EDIT || sim.mode === CanvasMode.PROBE || sim.mode === CanvasMode.DRAW_FREEHAND || sim.mode === CanvasMode.CLEAN) {
        sim.setMode(CanvasMode.SELECT);
      }
    }

    if (e.code === 'Space') {
      e.preventDefault();
      sim.isPaused = !sim.isPaused;
      updatePlayPauseUI(sim.isPaused);
      showToast(sim.isPaused ? "Simulación pausada." : "Simulación reanudada.", "info", 1200);
    } else if (e.code === 'Delete' || e.code === 'Backspace') {
      if (sim.selectedElement) {
        sim.removeElement(sim.selectedElement);
        showToast("Obstáculo eliminado.", "info");
      }
    } else if (e.key === '1') {
      applyVisModeSelection('smoke');
    } else if (e.key === '2') {
      applyVisModeSelection('vorticity');
    } else if (e.key === '3') {
      applyVisModeSelection('cfd_des_les');
    } else if (e.key === '4') {
      applyVisModeSelection('pressure');
    } else if (e.key === '5') {
      applyVisModeSelection('cfd_combustion');
    } else if (e.key === '6') {
      applyVisModeSelection('velocity');
    } else if (e.key === '7') {
      applyVisModeSelection('schroeder_curl');
    } else if (e.key === '8') {
      applyVisModeSelection('schroeder_speed');
    } else if (e.key === '9') {
      applyVisModeSelection('particles');
    }
  });

  // Modal Acerca de
  if (btnOpenAbout && aboutModal) btnOpenAbout.addEventListener('click', () => aboutModal.style.display = 'flex');
  if (btnCloseAbout && aboutModal) btnCloseAbout.addEventListener('click', () => aboutModal.style.display = 'none');
  if (btnAcceptAbout && aboutModal) btnAcceptAbout.addEventListener('click', () => aboutModal.style.display = 'none');

  if (aboutModal) {
    aboutModal.addEventListener('click', (e) => {
      if (e.target === aboutModal) aboutModal.style.display = 'none';
    });
  }

  // Control del Modal de Donaciones (Idéntico a Portal Ambystoma)
  function openDonateModal() {
    const modal = document.getElementById('donate-modal');
    if (modal) {
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  }

  function closeDonateModal() {
    const modal = document.getElementById('donate-modal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  function closeDonateModalOnBackdrop(event) {
    if (event.target.id === 'donate-modal') {
      closeDonateModal();
    }
  }

  window.openDonateModal = openDonateModal;
  window.closeDonateModal = closeDonateModal;
  window.closeDonateModalOnBackdrop = closeDonateModalOnBackdrop;

  if (btnOpenDonate) btnOpenDonate.addEventListener('click', openDonateModal);
  if (btnCloseDonate) btnCloseDonate.addEventListener('click', closeDonateModal);

  let isDownloadingReport = false;
  let isDownloadingVideo = false;

  // Control del Modal de Invitación a Donar al Generar Informe o Grabar Video
  function openReportDonateModal(isVideo = false) {
    const modal = document.getElementById('report-donate-modal');
    if (modal) {
      const activeLang = window.currentLang || localStorage.getItem('fluid_sim_lang') || 'es';
      const isEs = activeLang === 'es';
      if (typeof setLanguage === 'function') {
        setLanguage(activeLang);
      }

      const btnVideo = document.getElementById('btn-download-report-video');
      const btnJpg = document.getElementById('btn-download-report-jpg');
      const btnJpgNoMeta = document.getElementById('btn-download-report-jpg-no-meta');
      const btnCsvModal = document.getElementById('btn-download-polar-csv-modal');
      const btnExcelModal = document.getElementById('btn-download-polar-excel-modal');
      const readyTag = document.getElementById('lbl-report-ready-tag');
      const downloadDesc = document.getElementById('lbl-report-download-desc');
      const modalBadge = document.querySelector('#report-donate-modal .badge-license');

      if (isVideo) {
        if (btnVideo) btnVideo.style.display = 'inline-flex';
        if (btnJpg) btnJpg.style.display = 'none';
        if (btnJpgNoMeta) btnJpgNoMeta.style.display = 'none';
        if (btnCsvModal) btnCsvModal.style.display = 'none';
        if (btnExcelModal) btnExcelModal.style.display = 'none';

        const videoLayout = (window.FluidVideoRecorder && typeof window.FluidVideoRecorder.getVideoLayout === 'function')
          ? window.FluidVideoRecorder.getVideoLayout()
          : 'with_meta';
        const isCleanVideo = (videoLayout === 'no_meta');

        const lblVideo = document.getElementById('lbl-download-report-video');
        if (lblVideo) {
          if (isCleanVideo) {
            lblVideo.textContent = isEs ? "Descargar video sin metadatos" : "Download Video without Metadata";
          } else {
            lblVideo.textContent = isEs ? "Descargar video con metadatos" : "Download Video with Metadata";
          }
        }
        if (readyTag) {
          readyTag.textContent = isEs
            ? (isCleanVideo ? "Video Limpio Ultra HD (1920×1080) Listo" : "Video Técnico Ultra HD (1920×1080) Listo")
            : (isCleanVideo ? "Clean Ultra HD Video (1920×1080) Ready" : "Technical Ultra HD Video (1920×1080) Ready");
        }
        if (downloadDesc) {
          downloadDesc.textContent = isEs
            ? (isCleanVideo ? "Descarga tu video en alta definición con encuadre limpio (simulación, logo, escala y referencia) o apoya el proyecto" : "Descarga tu video técnico en alta definición con telemetría animada o apoya el proyecto")
            : (isCleanVideo ? "Download your clean high-resolution video (simulation, logo, scale, reference) or support the project" : "Download your animated technical video in high resolution or support the project");
        }
        if (modalBadge) modalBadge.textContent = isEs ? "VIDEO LISTO • APOYO OPCIONAL" : "VIDEO READY • OPTIONAL SUPPORT";
      } else {
        if (btnVideo) btnVideo.style.display = 'none';
        if (btnJpg) btnJpg.style.display = 'inline-flex';
        if (btnJpgNoMeta) btnJpgNoMeta.style.display = 'inline-flex';
        if (btnCsvModal) btnCsvModal.style.display = 'inline-flex';
        if (btnExcelModal) btnExcelModal.style.display = 'inline-flex';
        if (readyTag) readyTag.textContent = isEs ? "Captura Ultra HD (2560×1440) Lista" : "Ultra HD Capture (2560×1440) Ready";
        if (downloadDesc) downloadDesc.textContent = isEs ? "Obtén el informe en JPG (con o sin metadatos) o exporta el dataset científico completo" : "Get the JPG report (with or without metadata) or export the scientific dataset";
        if (modalBadge) modalBadge.textContent = isEs ? "INFORME LISTO • APOYO OPCIONAL" : "REPORT READY • OPTIONAL SUPPORT";
        updateModalSweepButtonsState();
      }

      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  }

  function updateModalSweepButtonsState() {
    const activeLang = window.currentLang || localStorage.getItem('fluid_sim_lang') || 'es';
    const isEs = activeLang === 'es';
    const btnCsvModal = document.getElementById('btn-download-polar-csv-modal');
    const btnExcelModal = document.getElementById('btn-download-polar-excel-modal');
    if (!btnCsvModal && !btnExcelModal) return;

    const hasSweep = Boolean(
      window.AerodynamicSweep &&
      (typeof window.AerodynamicSweep.hasSweepCompleted === 'function'
        ? window.AerodynamicSweep.hasSweepCompleted(sim)
        : (window.AerodynamicSweep.hasExecutedSweepAnimation && window.AerodynamicSweep.getLastSweptElement()))
    );

    const tooltipMsg = (typeof window.t === 'function' && window.t('sweepRequiredTooltip'))
      ? window.t('sweepRequiredTooltip')
      : (isEs
          ? '⚠️ Primero debes realizar el barrido aerodinámico (α-Sweep) para generar estos datos.'
          : '⚠️ You must perform the aerodynamic sweep (α-Sweep) first to generate this data.');

    [btnCsvModal, btnExcelModal].forEach(btn => {
      if (!btn) return;
      if (!hasSweep) {
        btn.classList.add('has-sweep-disabled-tooltip');
        btn.setAttribute('data-sweep-tooltip', tooltipMsg);
        btn.setAttribute('aria-disabled', 'true');
      } else {
        btn.classList.remove('has-sweep-disabled-tooltip');
        btn.classList.remove('tooltip-flash');
        btn.removeAttribute('data-sweep-tooltip');
        btn.removeAttribute('aria-disabled');
      }
    });
  }
  window.updateModalSweepButtonsState = updateModalSweepButtonsState;

  function closeReportDonateModal() {
    const modal = document.getElementById('report-donate-modal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  function closeReportDonateModalOnBackdrop(event) {
    if (event.target.id === 'report-donate-modal') {
      closeReportDonateModal();
    }
  }

  function downloadReportFromModal() {
    closeReportDonateModal();
    if (typeof window.generateAerodynamicReport === 'function') {
      window.generateAerodynamicReport(sim, 'jpeg');
    }
  }

  function downloadReportJpgFromModal() {
    if (isDownloadingReport) return;
    isDownloadingReport = true;
    setTimeout(() => { isDownloadingReport = false; }, 1500);

    closeReportDonateModal();
    const activeSim = sim || window.sim;
    if (typeof window.generateAerodynamicReport === 'function') {
      window.generateAerodynamicReport(activeSim, 'jpeg');
    }
  }

  function downloadReportJpgNoMetaFromModal() {
    if (isDownloadingReport) return;
    isDownloadingReport = true;
    setTimeout(() => { isDownloadingReport = false; }, 1500);

    closeReportDonateModal();
    const activeSim = sim || window.sim;
    if (typeof window.generateAerodynamicReport === 'function') {
      window.generateAerodynamicReport(activeSim, 'jpeg', { layout: 'no_meta' });
    }
  }

  function downloadReportVideoFromModal() {
    if (isDownloadingVideo) return;
    isDownloadingVideo = true;
    setTimeout(() => { isDownloadingVideo = false; }, 1500);

    closeReportDonateModal();
    if (window.FluidVideoRecorder && typeof window.FluidVideoRecorder.downloadLastVideo === 'function') {
      window.FluidVideoRecorder.downloadLastVideo();
    }
  }

  function downloadCsvFromModal() {
    closeReportDonateModal();
    const activeSim = sim || window.sim;
    if (typeof window.generateSimulationCSV === 'function') {
      window.generateSimulationCSV(activeSim);
    }
  }

  const btnDownloadReportJpgElem = document.getElementById('btn-download-report-jpg');
  if (btnDownloadReportJpgElem) {
    btnDownloadReportJpgElem.addEventListener('click', downloadReportJpgFromModal);
  }

  const btnDownloadReportJpgNoMetaElem = document.getElementById('btn-download-report-jpg-no-meta');
  if (btnDownloadReportJpgNoMetaElem) {
    btnDownloadReportJpgNoMetaElem.addEventListener('click', downloadReportJpgNoMetaFromModal);
  }

  const btnDownloadReportVideoElem = document.getElementById('btn-download-report-video');
  if (btnDownloadReportVideoElem) {
    btnDownloadReportVideoElem.addEventListener('click', downloadReportVideoFromModal);
  }

  // Botón "Grabar" en el encabezado superior
  const btnOpenRecord = document.getElementById('btn-open-record');
  if (btnOpenRecord) {
    btnOpenRecord.addEventListener('click', () => {
      if (window.FluidVideoRecorder && typeof window.FluidVideoRecorder.openRecordModal === 'function') {
        window.FluidVideoRecorder.openRecordModal();
      }
    });
  }

  window.openReportDonateModal = openReportDonateModal;
  window.closeReportDonateModal = closeReportDonateModal;
  window.closeReportDonateModalOnBackdrop = closeReportDonateModalOnBackdrop;
  window.downloadReportFromModal = downloadReportFromModal;
  window.downloadReportJpgFromModal = downloadReportJpgFromModal;
  window.downloadReportJpgNoMetaFromModal = downloadReportJpgNoMetaFromModal;
  window.downloadCsvFromModal = downloadCsvFromModal;

  function switchCryptoTab(crypto, modalId) {
    let modal = null;
    if (modalId) {
      modal = document.getElementById(modalId);
    } else {
      const reportModal = document.getElementById('report-donate-modal');
      if (reportModal && reportModal.style.display !== 'none') {
        modal = reportModal;
      } else {
        modal = document.getElementById('donate-modal');
      }
    }
    if (!modal) return;
    modal.querySelectorAll('.donate-crypto-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-crypto') === crypto);
    });
    modal.querySelectorAll('.donate-crypto-panel').forEach(panel => {
      panel.classList.toggle('active', panel.getAttribute('data-crypto-panel') === crypto);
    });
  }
  window.switchCryptoTab = switchCryptoTab;

  function copyToClipboard(text, btnElement, successMsg, originalMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(showSuccess).catch(fallback);
    } else {
      fallback();
    }

    function fallback() {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        showSuccess();
      } catch (err) {
        alert('Error: ' + text);
      }
      document.body.removeChild(textarea);
    }

    function showSuccess() {
      btnElement.classList.add('copied');
      const textSpan = btnElement.querySelector('span');
      const lang = localStorage.getItem('fluid_sim_lang') || 'es';
      const okMsg = (typeof t === 'function' ? t('donateCopied') : null) || (lang === 'en' ? 'Copied! ✓' : '¡Copiado! ✓');
      if (textSpan) textSpan.textContent = successMsg || okMsg;
      setTimeout(() => {
        btnElement.classList.remove('copied');
        if (textSpan) {
          const key = textSpan.getAttribute('data-i18n');
          if (key && typeof t === 'function' && t(key)) {
            textSpan.innerHTML = t(key);
          } else {
            textSpan.textContent = originalMsg;
          }
        }
      }, 2200);
    }
  }
  window.copyToClipboard = copyToClipboard;
  window.copyDonateToClipboard = copyToClipboard;

  function copyCitationToClipboard(btn) {
    const textEl = document.getElementById('citation-box-text');
    const text = textEl ? textEl.innerText.trim() : 'Segura Torres, B. A. (2026). 2D Fluid Dynamics & Wind Tunnel Simulator [Software]. Ambystoma Technologies. https://ambystomatechnologies.github.io/';
    const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    const successMsg = isEn ? 'Citation copied! ✓' : '¡Cita copiada! ✓';
    const origMsg = isEn ? 'Copy Citation' : 'Copiar Cita';
    copyToClipboard(text, btn, successMsg, origMsg);
  }
  window.copyCitationToClipboard = copyCitationToClipboard;

  // --- DETECCIÓN DE DISPOSITIVO MÓVIL ---
  function isMobileOrTabletDevice() {
    const uaCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const touchScreenCheck = (('ontouchstart' in window) || navigator.maxTouchPoints > 0) && (window.innerWidth <= 1024 || window.innerHeight <= 1024);
    const coarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    return Boolean(uaCheck || touchScreenCheck || coarsePointer || window.innerHeight <= 620 || window.innerWidth <= 950);
  }

  // --- PANTALLA COMPLETA AUTOMÁTICA EN MÓVILES ---
  async function triggerFullscreen() {
    if (document.fullscreenElement) return;
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      } else if (el.mozRequestFullScreen) {
        await el.mozRequestFullScreen();
      } else if (el.msRequestFullscreen) {
        await el.msRequestFullscreen();
      }
      if (screen.orientation && screen.orientation.lock) {
        try { await screen.orientation.lock('landscape'); } catch (e) {}
      }
    } catch (e) {}
  }

  // --- CARTEL INICIAL PARA TELÉFONOS CELULARES ---
  const mobileModal = document.getElementById('mobile-warning-modal');
  const btnCloseMobileWarning = document.getElementById('btn-close-mobile-warning');

  if (mobileModal && isMobileOrTabletDevice()) {
    mobileModal.style.display = 'flex';

    if (btnCloseMobileWarning) {
      btnCloseMobileWarning.addEventListener('click', () => {
        mobileModal.style.display = 'none';
        triggerFullscreen();
      });
    }

    mobileModal.addEventListener('click', (e) => {
      if (e.target === mobileModal) {
        mobileModal.style.display = 'none';
        triggerFullscreen();
      }
    });
  }

  // Gesto inicial para entrar automáticamente en pantalla completa en el primer toque móvil
  const onFirstMobileGesture = () => {
    if (isMobileOrTabletDevice() && !document.fullscreenElement) {
      triggerFullscreen();
    }
    window.removeEventListener('touchstart', onFirstMobileGesture);
    window.removeEventListener('click', onFirstMobileGesture);
  };
  window.addEventListener('touchstart', onFirstMobileGesture, { passive: true });
  window.addEventListener('click', onFirstMobileGesture, { passive: true });

  // Si el navegador móvil permite entrar en pantalla completa al cargar
  if (isMobileOrTabletDevice()) {
    setTimeout(triggerFullscreen, 300);
  }

  // --- CONTROL DE VISTA HORIZONTAL OBLIGATORIA EN MÓVILES ---
  const landscapeOverlay = document.getElementById('landscape-lock-overlay');
  const btnRequestLandscape = document.getElementById('btn-request-landscape');

  function checkOrientationLock() {
    if (!landscapeOverlay) return;
    const isMobile = isMobileOrTabletDevice();
    const isPortrait = window.innerHeight > window.innerWidth;
    if (isMobile && isPortrait) {
      landscapeOverlay.style.setProperty('display', 'flex', 'important');
    } else {
      landscapeOverlay.style.setProperty('display', 'none', 'important');
      if (sim && typeof sim.resizeCanvas === 'function') {
        sim.resizeCanvas();
      }
    }
  }

  if (btnRequestLandscape) {
    btnRequestLandscape.addEventListener('click', async () => {
      await triggerFullscreen();
      try {
        if (screen.orientation && screen.orientation.lock) {
          await screen.orientation.lock('landscape');
        }
      } catch (err) {}
    });
  }

  window.addEventListener('resize', checkOrientationLock);
  window.addEventListener('orientationchange', () => {
    setTimeout(checkOrientationLock, 150);
  });
  document.addEventListener('fullscreenchange', () => {
    setTimeout(() => {
      checkOrientationLock();
      if (sim && typeof sim.resizeCanvas === 'function') {
        sim.resizeCanvas();
      }
    }, 150);
  });
  checkOrientationLock();

  // --- CONTROLES DE PANEL EN MÓVILES Y PESTAÑA LATERAL DESPLEGABLE ---
  const btnToggleScene = document.getElementById('btn-toggle-scene');
  const sideTabLeft = document.getElementById('side-tab-left');
  const arrowTabLeft = document.getElementById('arrow-tab-left');
  const btnCloseSceneDrawer = document.getElementById('btn-close-scene-drawer');
  const panelLeft = document.getElementById('panel-left');

  function updateSideTabStates() {
    const isLeftOpen = panelLeft && panelLeft.classList.contains('mobile-open');

    if (sideTabLeft) {
      sideTabLeft.classList.toggle('is-open', Boolean(isLeftOpen));
      if (arrowTabLeft) arrowTabLeft.textContent = isLeftOpen ? '◀' : '▶';
    }

    if (btnToggleScene) btnToggleScene.classList.toggle('active', Boolean(isLeftOpen));

    // Ocultar controles de zoom (+, -, 1:1) en dispositivos móviles
    const isMobile = isMobileOrTabletDevice() || window.innerHeight <= 620 || window.innerWidth <= 950;
    const zoomControls = document.querySelector('.canvas-view-controls');
    if (zoomControls) {
      zoomControls.style.display = isMobile ? 'none' : '';
    }
  }

  function toggleLeftPanel() {
    if (!panelLeft) return;
    const willOpen = !panelLeft.classList.contains('mobile-open');
    panelLeft.classList.toggle('mobile-open', willOpen);
    updateSideTabStates();
    setTimeout(() => {
      if (sim && typeof sim.resizeCanvas === 'function') {
        sim.resizeCanvas();
      }
    }, 280);
  }

  let lastToggleTime = 0;
  function handleSideTabToggle(e, toggleFn) {
    const now = Date.now();
    if (now - lastToggleTime < 280) return;
    lastToggleTime = now;
    if (e) {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
    }
    toggleFn();
  }

  if (btnToggleScene) btnToggleScene.addEventListener('click', (e) => handleSideTabToggle(e, toggleLeftPanel));
  if (sideTabLeft) {
    sideTabLeft.addEventListener('click', (e) => handleSideTabToggle(e, toggleLeftPanel));
    sideTabLeft.addEventListener('touchend', (e) => handleSideTabToggle(e, toggleLeftPanel), { passive: false });
  }

  if (btnCloseSceneDrawer) btnCloseSceneDrawer.addEventListener('click', () => {
    if (panelLeft) panelLeft.classList.remove('mobile-open');
    updateSideTabStates();
    setTimeout(() => {
      if (sim && typeof sim.resizeCanvas === 'function') {
        sim.resizeCanvas();
      }
    }, 280);
  });

  window.addEventListener('resize', () => {
    updateSideTabStates();
    if (sim && typeof sim.resizeCanvas === 'function') {
      sim.resizeCanvas();
    }
  });
  updateSideTabStates();

  // Escena inicial: Perfil NACA 0012 · Humo y Líneas de Corriente · Velocidad 10 m/s
  (() => {
    sim.clearScene();
    const w = sim.fluid.domainWidth;
    const h = sim.fluid.domainHeight;
    const cy = h / 2.0;

    const airfoil = HydrodynamicObstacle.createNACA("0012", 4.0, [5.5, cy]);
    airfoil.rotate(8 * Math.PI / 180.0); // 8 grados de ángulo de ataque
    sim.addElement(airfoil);

    // Velocidad: 5.0 m/s
    const initSpeed = 5.0;
    sim.fluid.inflowSpeed = initSpeed;
    if (sim.lbm) {
      const norm = Math.min(1.0, Math.max(0.0, (initSpeed - 0.5) / 11.5));
      sim.lbm.speed = 0.060 + norm * 0.055;
      sim.lbm.stepsPerFrame = Math.round(8 + norm * 20);
    }

    // Visor: Humo y Líneas de Corriente
    sim.setVisMode(VisMode.SMOKE);
    applyVisModeSelection('smoke', false);

    // Actualizar controles UI
    if (sliderSpeed) sliderSpeed.value = initSpeed;
    if (lblSpeedValue) lblSpeedValue.textContent = `${initSpeed.toFixed(1)} m/s`;
    if (rowLbmContrast) rowLbmContrast.style.display = 'none';

    // Iniciar con las opciones de objeto seleccionado habilitadas si la pieza inicial ya está seleccionada
    if (sim.selectedElement) {
      updateSelectedElementPropsUI(sim.selectedElement);
    } else {
      updateSelectedElementPropsUI(null);
    }

    // Garantizar que la simulación se encuadre con simetría vertical perfecta al cargar la página
    const alignSimulationView = () => {
      if (sim && typeof sim.resizeCanvas === 'function') {
        sim.resizeCanvas();
      }
    };
    requestAnimationFrame(alignSimulationView);
    setTimeout(alignSimulationView, 60);
    setTimeout(alignSimulationView, 250);
    window.addEventListener('load', alignSimulationView);
  })();
});
