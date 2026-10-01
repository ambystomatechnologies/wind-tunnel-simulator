/**
 * Simulador de Mecánica de Fluidos y Túnel Aerodinámico 2D - Ambystoma Technologies
 * app.js - Lógica Principal de la Aplicación, Controles, Demos y Enlace de Eventos
 */

document.addEventListener('DOMContentLoaded', () => {
  const canvasElement = document.getElementById('fluid-canvas');
  if (!canvasElement) return;

  const sim = new FluidCanvasController(canvasElement);
  window.sim = sim;

  // Idioma inicial guardado o detección
  const savedLang = localStorage.getItem('fluid_sim_lang') || 'es';
  window.setLanguage(savedLang);

  // --- ELEMENTOS DE LA INTERFAZ ---

  // Botones de Modo / Herramientas
  const btnSelect = document.getElementById('btn-tool-select');
  const btnNodeEdit = document.getElementById('btn-tool-node-edit');
  const btnDrawFreehand = document.getElementById('btn-tool-draw-freehand');
  const btnDrawPoly = document.getElementById('btn-tool-draw-poly');
  const btnFinishDraw = document.getElementById('btn-tool-finish-draw');
  const btnProbe = document.getElementById('btn-tool-probe');
  const btnAddAirfoil = document.getElementById('btn-add-airfoil');

  const cbAddShapes = document.getElementById('cb-add-shapes');
  const cbDemos = document.getElementById('cb-demos');
  const btnClearScene = document.getElementById('btn-clear-scene');

  // Controles de Vista
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnResetView = document.getElementById('btn-reset-view');

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
  const btnDeleteElement = document.getElementById('btn-delete-element');
  const btnSaveScene = document.getElementById('btn-save-scene');
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
    if (btnPlayIcon) btnPlayIcon.textContent = isPaused ? '▶️' : '⏸️';
    if (btnPlayText) btnPlayText.textContent = isPaused ? 'Reanudar' : 'Pausar';
    if (btnPlayPause) {
      btnPlayPause.classList.toggle('paused', isPaused);
      btnPlayPause.title = isPaused ? 'Reanudar Simulación (Espacio)' : 'Pausar Simulación (Espacio)';
    }
    if (chkPause) chkPause.checked = isPaused;
  }

  function updateFlowUI(isFlowActive) {
    if (btnFlowIcon) btnFlowIcon.textContent = isFlowActive ? '⏹️' : '💨';
    if (btnFlowText) btnFlowText.textContent = isFlowActive ? 'Detener Animación' : 'Iniciar Animación';
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
      const newState = !sim.fluid.isFlowActive;
      sim.fluid.setFlowActive(newState);
      updateFlowUI(newState);
      if (newState) {
        if (sim.isPaused) {
          sim.isPaused = false;
          updatePlayPauseUI(false);
        }
        showToast("Flujo iniciado: el aire entra desde el inicio del túnel.", "success", 1800);
      } else {
        showToast("Flujo detenido: el fluido se desvanece de manera natural.", "info", 1800);
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

  // Notificaciones Toast
  function showToast(message, type = 'info', duration = 3200) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let icon = 'ℹ️';
    if (type === 'success') icon = '✓';
    else if (type === 'warning') icon = '⚠️';
    else if (type === 'error') icon = '✕';
    toast.innerHTML = `<span class="toast-badge">${icon}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }
  window.showToast = showToast;

  // --- BOTONES DE HERRAMIENTAS Y MODOS ---
  const modeButtons = [btnSelect, btnNodeEdit, btnDrawFreehand, btnDrawPoly, btnProbe];

  function setActiveToolButton(btn) {
    modeButtons.forEach(b => { if (b) b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
  }

  if (btnSelect) {
    btnSelect.addEventListener('click', () => {
      sim.setMode(CanvasMode.SELECT);
      setActiveToolButton(btnSelect);
      if (lblStatusMsg) lblStatusMsg.textContent = window.t('statusReady');
      if (btnFinishDraw) btnFinishDraw.disabled = true;
    });
  }

  if (btnNodeEdit) {
    btnNodeEdit.addEventListener('click', () => {
      sim.setMode(CanvasMode.NODE_EDIT);
      setActiveToolButton(btnNodeEdit);
      if (lblStatusMsg) lblStatusMsg.textContent = window.t('statusNodeEdit');
      if (btnFinishDraw) btnFinishDraw.disabled = true;
    });
  }

  if (btnDrawFreehand) {
    btnDrawFreehand.addEventListener('click', () => {
      sim.setMode(CanvasMode.DRAW_FREEHAND);
      setActiveToolButton(btnDrawFreehand);
      if (lblStatusMsg) lblStatusMsg.textContent = window.t('statusDrawFreehand');
      if (btnFinishDraw) btnFinishDraw.disabled = true;
    });
  }

  if (btnDrawPoly) {
    btnDrawPoly.addEventListener('click', () => {
      sim.setMode(CanvasMode.DRAW_POLYGON);
      setActiveToolButton(btnDrawPoly);
      if (lblStatusMsg) lblStatusMsg.textContent = window.t('statusDrawPoly');
      if (btnFinishDraw) btnFinishDraw.disabled = false;
    });
  }

  if (btnFinishDraw) {
    btnFinishDraw.addEventListener('click', () => {
      sim.finishPolygon();
      setActiveToolButton(btnSelect);
      btnFinishDraw.disabled = true;
      if (lblStatusMsg) lblStatusMsg.textContent = window.t('statusReady');
    });
  }

  if (btnProbe) {
    btnProbe.addEventListener('click', () => {
      sim.setMode(CanvasMode.PROBE);
      setActiveToolButton(btnProbe);
      if (lblStatusMsg) lblStatusMsg.textContent = "Haz clic en el túnel para colocar la sonda de flujo.";
      if (btnFinishDraw) btnFinishDraw.disabled = true;
    });
  }

  // BOTÓN DIRECTO: AGREGAR PERFIL ALAR NACA
  if (btnAddAirfoil) {
    btnAddAirfoil.addEventListener('click', () => {
      const airfoil = HydrodynamicObstacle.createNACA("0012", 3.8, [6.0, sim.fluid.domainHeight / 2.0]);
      sim.addElement(airfoil);
      showToast("Perfil alar NACA 0012 agregado al túnel.", "success");
    });
  }

  // MENÚ DESPLEGABLE DE FIGURAS
  if (cbAddShapes) {
    cbAddShapes.addEventListener('change', (e) => {
      const val = e.target.value;
      if (!val) return;
      const cy = sim.fluid.domainHeight / 2.0;

      switch (val) {
        case 'naca0012':
          sim.addElement(HydrodynamicObstacle.createNACA("0012", 3.8, [6.0, cy]));
          showToast("Perfil simétrico NACA 0012 insertado.", "info");
          break;
        case 'naca2412':
          sim.addElement(HydrodynamicObstacle.createNACA("2412", 3.8, [6.0, cy]));
          showToast("Perfil asimétrico sustentador NACA 2412 insertado.", "info");
          break;
        case 'cylinder':
          sim.addElement(HydrodynamicObstacle.createCylinder(1.2, [5.5, cy]));
          showToast("Cilindro circular insertado.", "info");
          break;
        case 'teardrop':
          sim.addElement(HydrodynamicObstacle.createTeardrop(4.2, 1.8, [6.0, cy]));
          showToast("Gota aerodinámica de bajo arrastre insertada.", "info");
          break;
        case 'flat_plate':
          const plate = HydrodynamicObstacle.createFlatPlate(3.5, 0.2, [6.0, cy]);
          plate.rotate(15 * Math.PI / 180.0);
          sim.addElement(plate);
          showToast("Placa plana a 15° de ataque insertada.", "info");
          break;
        case 'square':
          sim.addElement(HydrodynamicObstacle.createSquare(1.8, [5.5, cy]));
          showToast("Cuerpo cuadrado romo insertado.", "info");
          break;
        case 'wedge':
          sim.addElement(HydrodynamicObstacle.createWedge(2.6, 2.2, [5.5, cy]));
          showToast("Cuña aerodinámica insertada.", "info");
          break;
        case 'schroeder_line':
          sim.addElement(HydrodynamicObstacle.createLinearBarrier(3.6, [5.5, cy]));
          showToast("Barrera lineal de Schroeder insertada (Generador de vórtices).", "success");
          break;
        case 'car':
          sim.addElement(HydrodynamicObstacle.createCarProfile(4.6, 1.6, [6.0, cy + 0.8]));
          showToast("Silueta de vehículo de competición insertada.", "info");
          break;
        case 'venturi':
          const nozzles = HydrodynamicObstacle.createVenturiNozzles(sim.fluid.domainWidth, sim.fluid.domainHeight, 3.2);
          nozzles.forEach(n => sim.addElement(n));
          showToast("Tobera Venturi insertada.", "info");
          break;
        case 'probe':
          sim.addElement(new FlowProbe(8.0, cy, `Sensor ${sim.elements.length + 1}`));
          showToast("Sonda de velocidad y presión insertada.", "info");
          break;
      }
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

  // 4. Viscosidad del fluido (con escala logarítmica para abarcar aire, agua, aceite)
  if (sliderViscosity) {
    sliderViscosity.min = 1;
    sliderViscosity.max = 100;
    sliderViscosity.value = 15;
    if (lblViscosityValue) lblViscosityValue.textContent = "0.00015 m²/s (Aire)";

    sliderViscosity.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      // Rango de 0.00001 a 0.005 m²/s
      const nu = (val * val) * 0.0000008;
      sim.fluid.viscosity = nu;
      if (sim.lbm) sim.lbm.viscosity = 0.018 + (val / 100.0) * 0.042;
      if (lblViscosityValue) lblViscosityValue.textContent = `${nu.toFixed(5)} m²/s`;
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
        sim.fluid.density = 1.225;
        if (sliderViscosity) sliderViscosity.value = 15;
        if (lblViscosityValue) lblViscosityValue.textContent = "0.00015 m²/s";
        if (spinDensity) spinDensity.value = 1.225;
        if (sim.lbm) sim.lbm.viscosity = 0.018 + (15 / 100.0) * 0.042;
        showToast("Medio configurado: Aire (ρ = 1.225 kg/m³, ν = 1.5e-4)", "info");
      } else if (mat === 'water' || mat === 'btnPresetWater') {
        sim.fluid.viscosity = 0.00005;
        sim.fluid.density = 1000.0;
        if (sliderViscosity) sliderViscosity.value = 8;
        if (lblViscosityValue) lblViscosityValue.textContent = "0.00005 m²/s";
        if (spinDensity) spinDensity.value = 1000.0;
        if (sim.lbm) sim.lbm.viscosity = 0.018 + (8 / 100.0) * 0.042;
        showToast("Medio configurado: Agua líquida (ρ = 1000 kg/m³, ν = 5.0e-5)", "info");
      } else if (mat === 'oil' || mat === 'btnPresetOil') {
        sim.fluid.viscosity = 0.0012;
        sim.fluid.density = 880.0;
        if (sliderViscosity) sliderViscosity.value = 40;
        if (lblViscosityValue) lblViscosityValue.textContent = "0.00120 m²/s";
        if (spinDensity) spinDensity.value = 880.0;
        if (sim.lbm) sim.lbm.viscosity = 0.018 + (40 / 100.0) * 0.042;
        showToast("Medio configurado: Aceite lubricante (ρ = 880 kg/m³, ν = 1.2e-3)", "info");
      } else if (mat === 'glycerin' || mat === 'btnPresetHoney') {
        sim.fluid.viscosity = 0.0045;
        sim.fluid.density = 1260.0;
        if (sliderViscosity) sliderViscosity.value = 75;
        if (lblViscosityValue) lblViscosityValue.textContent = "0.00450 m²/s";
        if (spinDensity) spinDensity.value = 1260.0;
        if (sim.lbm) sim.lbm.viscosity = 0.018 + (75 / 100.0) * 0.042;
        showToast("Medio configurado: Glicerina viscosa (ρ = 1260 kg/m³, ν = 4.5e-3)", "info");
      } else if (mat === 'superfluid' || mat === 'btnPresetSuper') {
        sim.fluid.viscosity = 0.000005;
        sim.fluid.density = 1.0;
        if (sliderViscosity) sliderViscosity.value = 2;
        if (lblViscosityValue) lblViscosityValue.textContent = "0.000005 m²/s";
        if (spinDensity) spinDensity.value = 1.0;
        if (sim.lbm) sim.lbm.viscosity = 0.018 + (2 / 100.0) * 0.042;
        showToast("Medio configurado: Superfluido cuasi-ideal (ν ≈ 0)", "info");
      }
    });
  });

  // 4. Densidad del Fluido ρ
  if (spinDensity) {
    spinDensity.min = 0.1;
    spinDensity.max = 2000.0;
    spinDensity.step = 0.1;
    spinDensity.value = sim.fluid.density;
    spinDensity.addEventListener('change', (e) => {
      sim.fluid.density = Math.max(0.01, parseFloat(e.target.value) || 1.225);
    });
  }

  // 5. Rotación del Elemento Seleccionado
  if (sliderRotation) {
    sliderRotation.addEventListener('input', (e) => {
      if (sim.selectedElement && sim.selectedElement instanceof HydrodynamicObstacle) {
        const deg = parseFloat(e.target.value);
        sim.selectedElement.setAbsoluteRotation(deg);
        sim.fluid.rasterizeObstacles(sim.elements);
        sim.lbm.rasterizeObstacles(sim.elements, sim.fluid.domainWidth, sim.fluid.domainHeight);
        if (lblRotValue) lblRotValue.textContent = `${Math.round(deg)}°`;
      }
    });
  }

  // 6. Checkboxes de Configuración
  if (chkSmooth) {
    chkSmooth.addEventListener('change', (e) => {
      if (sim.selectedElement && sim.selectedElement instanceof HydrodynamicObstacle) {
        sim.selectedElement.isSmooth = e.target.checked;
        sim.fluid.rasterizeObstacles(sim.elements);
        sim.lbm.rasterizeObstacles(sim.elements, sim.fluid.domainWidth, sim.fluid.domainHeight);
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
      showToast(e.target.checked ? "Túnel cerrado con paredes sólidas." : "Túnel abierto con flujo libre.", "info");
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

  // 7. Modos de Visualización CFD / LBM (Desplegables en Barra, Panel Izquierdo y Panel Derecho)
  const cbVisMode = document.getElementById('cb-vis-mode');
  const cbVisModeToolbar = document.getElementById('cb-vis-mode-toolbar');
  const cbVisModeLeft = document.getElementById('cb-vis-mode-left');

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
      else if (val === 'pressure') sim.setVisMode(VisMode.PRESSURE);
      else if (val === 'velocity') sim.setVisMode(VisMode.VELOCITY);
      else if (val === 'vorticity') sim.setVisMode(VisMode.VORTICITY);
      else if (val === 'particles') sim.setVisMode(VisMode.PARTICLES);
    }
  }

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

    if (sliderRotation && !sim.isRotating) {
      sliderRotation.value = element.currentRotationDeg;
      if (lblRotValue) lblRotValue.textContent = `${Math.round(element.currentRotationDeg)}°`;
    }
    if (chkSmooth) chkSmooth.checked = element.isSmooth;
  };

  // --- GESTIÓN DE ELEMENTOS DE LA ESCENA (LISTA IZQUIERDA) ---
  sim.onSceneChanged = updateSceneList;
  sim.onElementSelected = (elem) => {
    updateSceneList();
    if (elem && elem instanceof HydrodynamicObstacle) {
      if (sliderRotation) sliderRotation.value = elem.currentRotationDeg;
      if (lblRotValue) lblRotValue.textContent = `${Math.round(elem.currentRotationDeg)}°`;
      if (chkSmooth) chkSmooth.checked = elem.isSmooth;
    }
  };

  function updateSceneList() {
    if (!listSceneElements) return;
    listSceneElements.innerHTML = '';

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

      li.innerHTML = `
        <span class="scene-item-icon">${icon}</span>
        <span class="scene-item-name" style="flex:1;">${elem.name}</span>
        <button type="button" class="btn-item-toggle" title="Activar/Desactivar" style="background:none; border:none; color:${elem.isActive ? '#00ffcc' : '#64748b'}; cursor:pointer;">
          ${elem.isActive ? '👁️' : '👁️‍🗨️'}
        </button>
      `;

      li.addEventListener('click', (e) => {
        if (e.target.closest('.btn-item-toggle')) {
          elem.isActive = !elem.isActive;
          sim.fluid.rasterizeObstacles(sim.elements);
          updateSceneList();
          return;
        }
        sim.selectElement(elem);
      });

      listSceneElements.appendChild(li);
    });
  }

  if (btnDeleteElement) {
    btnDeleteElement.addEventListener('click', () => {
      if (sim.selectedElement) {
        sim.removeElement(sim.selectedElement);
        showToast("Obstáculo eliminado.", "info");
      }
    });
  }

  // --- GUARDAR Y ABRIR ESCENA JSON ---
  if (btnSaveScene) {
    btnSaveScene.addEventListener('click', () => {
      const data = {
        inflowSpeed: sim.fluid.inflowSpeed,
        viscosity: sim.fluid.viscosity,
        density: sim.fluid.density,
        closedWalls: sim.fluid.closedWalls,
        elements: sim.elements.map(e => {
          if (e instanceof HydrodynamicObstacle) {
            return {
              type: 'HydrodynamicObstacle',
              name: e.name,
              controlPoints: e.controlPoints,
              isSmooth: e.isSmooth,
              rotationDeg: e.currentRotationDeg,
              loops: e.loops || null,
              isImportedImage: Boolean(e.isImportedImage)
            };
          } else if (e instanceof FlowProbe) {
            return {
              type: 'FlowProbe',
              name: e.name,
              x: e.x,
              y: e.y
            };
          }
          return null;
        }).filter(Boolean)
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tunel_fluidos_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Configuración del túnel guardada en archivo.", "success");
    });
  }

  if (btnOpenScene && fileInputScene) {
    btnOpenScene.addEventListener('click', () => fileInputScene.click());
    fileInputScene.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          sim.clearScene();
          if (data.inflowSpeed) sim.fluid.inflowSpeed = data.inflowSpeed;
          if (data.viscosity) sim.fluid.viscosity = data.viscosity;
          if (data.density) sim.fluid.density = data.density;
          if (data.closedWalls !== undefined) sim.fluid.closedWalls = data.closedWalls;

          if (data.elements && Array.isArray(data.elements)) {
            data.elements.forEach(item => {
              if (item.type === 'HydrodynamicObstacle') {
                const obs = new HydrodynamicObstacle(item.controlPoints, item.name, item.isSmooth, item.loops || null, Boolean(item.isImportedImage));
                obs.currentRotationDeg = item.rotationDeg || 0;
                sim.addElement(obs);
              } else if (item.type === 'FlowProbe') {
                sim.addElement(new FlowProbe(item.x, item.y, item.name));
              }
            });
          }
          showToast("Túnel cargado correctamente.", "success");
        } catch (err) {
          showToast("Error al parsear archivo JSON.", "error");
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
  if (cbDemos) {
    cbDemos.addEventListener('change', (e) => {
      const demoId = e.target.value;
      if (!demoId) return;
      loadPhysicsDemo(demoId);
      cbDemos.value = '';
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
        showToast("Demo 13: Réplica Schroeder HD · Desprendimiento continuo de vórtices de Von Kármán.", "success", 3000);
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

    let currentModeKey = 'schroeder_curl';
    if (sim.visMode === VisMode.SCHROEDER_CURL) currentModeKey = 'schroeder_curl';
    else if (sim.visMode === VisMode.SCHROEDER_FLOWLINES) currentModeKey = 'schroeder_flowlines';
    else if (sim.visMode === VisMode.SCHROEDER_SPEED) currentModeKey = 'schroeder_speed';
    else if (sim.visMode === VisMode.SMOKE) currentModeKey = 'smoke';
    else if (sim.visMode === VisMode.PRESSURE) currentModeKey = 'pressure';
    else if (sim.visMode === VisMode.VELOCITY) currentModeKey = 'velocity';
    else if (sim.visMode === VisMode.VORTICITY) currentModeKey = 'vorticity';
    else if (sim.visMode === VisMode.PARTICLES) currentModeKey = 'particles';
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

    if (e.key === 'Escape') {
      if (aboutModal) aboutModal.style.display = 'none';
      if (donateModal) donateModal.style.display = 'none';
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
      applyVisModeSelection('schroeder_curl');
    } else if (e.key === '2') {
      applyVisModeSelection('schroeder_flowlines');
    } else if (e.key === '3') {
      applyVisModeSelection('smoke');
    } else if (e.key === '4') {
      applyVisModeSelection('pressure');
    } else if (e.key === '5') {
      applyVisModeSelection('velocity');
    } else if (e.key === '6') {
      applyVisModeSelection('vorticity');
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

  // Modal Donaciones y Apoyo Open Source
  if (btnOpenDonate && donateModal) btnOpenDonate.addEventListener('click', () => donateModal.style.display = 'flex');
  if (btnCloseDonate && donateModal) btnCloseDonate.addEventListener('click', () => donateModal.style.display = 'none');

  if (donateModal) {
    donateModal.addEventListener('click', (e) => {
      if (e.target === donateModal) donateModal.style.display = 'none';
    });
  }

  function copyDonateToClipboard(text, btnElement, successMsg, originalMsg) {
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
      if (textSpan) textSpan.textContent = successMsg;
      setTimeout(() => {
        btnElement.classList.remove('copied');
        if (textSpan) textSpan.textContent = originalMsg;
      }, 2200);
    }
  }
  window.copyDonateToClipboard = copyDonateToClipboard;

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

  // --- CONTROLES DE PANELES EN MÓVILES Y PESTAÑAS LATERALES DESPLEGABLES ---
  const btnToggleScene = document.getElementById('btn-toggle-scene');
  const btnToggleProps = document.getElementById('btn-toggle-props');
  const sideTabLeft = document.getElementById('side-tab-left');
  const sideTabRight = document.getElementById('side-tab-right');
  const arrowTabLeft = document.getElementById('arrow-tab-left');
  const arrowTabRight = document.getElementById('arrow-tab-right');
  const btnCloseSceneDrawer = document.getElementById('btn-close-scene-drawer');
  const btnClosePropsDrawer = document.getElementById('btn-close-props-drawer');
  const panelLeft = document.getElementById('panel-left');
  const panelRight = document.getElementById('panel-right');

  function updateSideTabStates() {
    const isLeftOpen = panelLeft && panelLeft.classList.contains('mobile-open');
    const isRightOpen = panelRight && panelRight.classList.contains('mobile-open');

    if (sideTabLeft) {
      sideTabLeft.classList.toggle('is-open', Boolean(isLeftOpen));
      if (arrowTabLeft) arrowTabLeft.textContent = isLeftOpen ? '◀' : '▶';
    }

    if (sideTabRight) {
      sideTabRight.classList.toggle('is-open', Boolean(isRightOpen));
      if (arrowTabRight) arrowTabRight.textContent = isRightOpen ? '▶' : '◀';
    }

    if (btnToggleScene) btnToggleScene.classList.toggle('active', Boolean(isLeftOpen));
    if (btnToggleProps) btnToggleProps.classList.toggle('active', Boolean(isRightOpen));

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
    // Si se va a abrir el panel izquierdo, cerramos el derecho para no invadir el canvas
    if (willOpen && panelRight && panelRight.classList.contains('mobile-open')) {
      panelRight.classList.remove('mobile-open');
    }
    panelLeft.classList.toggle('mobile-open', willOpen);
    updateSideTabStates();
  }

  function toggleRightPanel() {
    if (!panelRight) return;
    const willOpen = !panelRight.classList.contains('mobile-open');
    // Si se va a abrir el panel derecho, cerramos el izquierdo para mantener despejada la vista
    if (willOpen && panelLeft && panelLeft.classList.contains('mobile-open')) {
      panelLeft.classList.remove('mobile-open');
    }
    panelRight.classList.toggle('mobile-open', willOpen);
    updateSideTabStates();
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

  if (btnToggleProps) btnToggleProps.addEventListener('click', (e) => handleSideTabToggle(e, toggleRightPanel));
  if (sideTabRight) {
    sideTabRight.addEventListener('click', (e) => handleSideTabToggle(e, toggleRightPanel));
    sideTabRight.addEventListener('touchend', (e) => handleSideTabToggle(e, toggleRightPanel), { passive: false });
  }

  if (btnCloseSceneDrawer) btnCloseSceneDrawer.addEventListener('click', () => {
    if (panelLeft) panelLeft.classList.remove('mobile-open');
    updateSideTabStates();
  });
  if (btnClosePropsDrawer) btnClosePropsDrawer.addEventListener('click', () => {
    if (panelRight) panelRight.classList.remove('mobile-open');
    updateSideTabStates();
  });

  window.addEventListener('resize', updateSideTabStates);
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
  })();
});
