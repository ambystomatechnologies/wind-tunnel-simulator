/**
 * Simulador de Mecánica de Fluidos y Túnel Aerodinámico 2D - Ambystoma Technologies
 * recorder.js - Grabador y Renderizador de Video HD (Renderizado Extrapolado + Grabación En Vivo)
 * Genera videos técnicos en formato oficial idéntico al informe aerodinámico.
 */

(function () {
  'use strict';

  // Asegurar disponibilidad de bibliotecas muxer en el ámbito global
  const Mp4MuxerLib = window.Mp4Muxer || (typeof Mp4Muxer !== 'undefined' ? Mp4Muxer : null);
  const WebMMuxerLib = window.WebMMuxer || window.WebmMuxer || (typeof WebMMuxer !== 'undefined' ? WebMMuxer : null);
  if (Mp4MuxerLib && !window.Mp4Muxer) window.Mp4Muxer = Mp4MuxerLib;
  if (WebMMuxerLib && !window.WebMMuxer) window.WebMMuxer = WebMMuxerLib;
  if (WebMMuxerLib && !window.WebmMuxer) window.WebmMuxer = WebMMuxerLib;

  let isRecording = false;
  let isRendering = false;
  let recordingMode = 'render'; // 'render' o 'live'
  let recordingDuration = 15; // Segundos (5s a 120s)
  let videoLayout = 'no_meta'; // 'no_meta' (por defecto) o 'with_meta'
  let lastVideoBlob = null;
  let lastVideoExt = 'mp4';
  let cancelRequested = false;
  let activeRecorder = null;
  let activeVideoEncoder = null;
  let activeLiveAnimFrame = null;
  let activeLiveFinalizer = null;

  // --- ELEMENTOS DEL DOM ---
  let recordModal = null;
  let durationSlider = null;
  let durationValLabel = null;
  let btnModeRender = null;
  let btnModeLive = null;
  let btnLayoutWithMeta = null;
  let btnLayoutNoMeta = null;
  let btnStartRecord = null;
  let btnCancelRecord = null;
  let viewConfig = null;
  let viewProgress = null;
  let progressFill = null;
  let progressPctText = null;
  let progressFramesText = null;
  let btnCancelProgress = null;
  let floatingIndicator = null;
  let floatingTimer = null;
  let btnStopLive = null;

  function initDOMElements() {
    recordModal = document.getElementById('record-modal');
    durationSlider = document.getElementById('record-duration-slider');
    durationValLabel = document.getElementById('record-duration-val');
    btnModeRender = document.getElementById('btn-record-mode-render');
    btnModeLive = document.getElementById('btn-record-mode-live');
    btnLayoutWithMeta = document.getElementById('btn-record-layout-with-meta');
    btnLayoutNoMeta = document.getElementById('btn-record-layout-no-meta');
    btnStartRecord = document.getElementById('btn-start-record');
    btnCancelRecord = document.getElementById('btn-cancel-record');
    viewConfig = document.getElementById('record-modal-config-view');
    viewProgress = document.getElementById('record-modal-progress-view');
    progressFill = document.getElementById('record-progress-fill');
    progressPctText = document.getElementById('record-progress-pct');
    progressFramesText = document.getElementById('record-progress-frames');
    btnCancelProgress = document.getElementById('btn-cancel-render-progress');
    floatingIndicator = document.getElementById('floating-record-indicator');
    floatingTimer = document.getElementById('floating-record-timer');
    btnStopLive = document.getElementById('btn-stop-live-record');

    if (durationSlider) {
      durationSlider.addEventListener('input', (e) => {
        setDuration(parseInt(e.target.value, 10));
      });
    }

    if (btnModeRender) {
      btnModeRender.addEventListener('click', () => setMode('render'));
    }
    if (btnModeLive) {
      btnModeLive.addEventListener('click', () => setMode('live'));
    }

    if (btnLayoutWithMeta) {
      btnLayoutWithMeta.addEventListener('click', () => setLayout('with_meta'));
    }
    if (btnLayoutNoMeta) {
      btnLayoutNoMeta.addEventListener('click', () => setLayout('no_meta'));
    }

    if (btnStartRecord) {
      btnStartRecord.addEventListener('click', () => {
        startRecording(window.sim);
      });
    }

    if (btnCancelRecord) {
      btnCancelRecord.addEventListener('click', closeRecordModal);
    }

    if (btnCancelProgress) {
      btnCancelProgress.addEventListener('click', cancelRecording);
    }

    if (btnStopLive) {
      btnStopLive.addEventListener('click', stopLiveRecording);
    }

    // Clics en botones de presets rápidos (5s, 10s, 15s, 30s, 60s, 120s)
    const presetBtns = document.querySelectorAll('.record-preset-pill');
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const sec = parseInt(btn.getAttribute('data-sec'), 10);
        if (!isNaN(sec)) setDuration(sec);
      });
    });
  }

  function setDuration(sec) {
    recordingDuration = Math.max(5, Math.min(120, sec));
    if (durationSlider) durationSlider.value = recordingDuration;
    if (durationValLabel) {
      const min = Math.floor(recordingDuration / 60);
      const s = recordingDuration % 60;
      durationValLabel.textContent = min > 0
        ? `${min}m ${s < 10 ? '0' : ''}${s}s (${recordingDuration}s)`
        : `${recordingDuration} s`;
    }

    // Actualizar clase activa en los presets
    const presetBtns = document.querySelectorAll('.record-preset-pill');
    presetBtns.forEach(btn => {
      const btnSec = parseInt(btn.getAttribute('data-sec'), 10);
      btn.classList.toggle('active', btnSec === recordingDuration);
    });
  }

  function setMode(mode) {
    recordingMode = (mode === 'live') ? 'live' : 'render';
    if (!btnModeRender) btnModeRender = document.getElementById('btn-record-mode-render');
    if (!btnModeLive) btnModeLive = document.getElementById('btn-record-mode-live');
    if (btnModeRender) btnModeRender.classList.toggle('active', recordingMode === 'render');
    if (btnModeLive) btnModeLive.classList.toggle('active', recordingMode === 'live');

    if (!btnStartRecord) btnStartRecord = document.getElementById('btn-start-record');
    if (btnStartRecord) {
      const activeLang = window.currentLang || (typeof localStorage !== 'undefined' ? localStorage.getItem('fluid_sim_lang') : null) || 'es';
      const isEs = activeLang === 'es';
      if (recordingMode === 'render') {
        const txt = (typeof window.t === 'function' ? window.t('btnStartRendering') : null) || (isEs ? "⚡ Iniciar Renderizado" : "⚡ Start Rendering");
        btnStartRecord.innerHTML = `<span>⚡</span> <span>${txt.replace('⚡', '').trim()}</span>`;
      } else {
        const txt = (typeof window.t === 'function' ? window.t('btnStartLiveRecording') : null) || (isEs ? "Iniciar Grabación En Vivo" : "Start Live Recording");
        btnStartRecord.innerHTML = `<span style="color:#ef4444;">●</span> <span>${txt.replace('●', '').trim()}</span>`;
      }
    }
  }

  function setLayout(layout) {
    videoLayout = (layout === 'no_meta') ? 'no_meta' : 'with_meta';
    if (!btnLayoutWithMeta) btnLayoutWithMeta = document.getElementById('btn-record-layout-with-meta');
    if (!btnLayoutNoMeta) btnLayoutNoMeta = document.getElementById('btn-record-layout-no-meta');
    if (btnLayoutWithMeta) btnLayoutWithMeta.classList.toggle('active', videoLayout === 'with_meta');
    if (btnLayoutNoMeta) btnLayoutNoMeta.classList.toggle('active', videoLayout === 'no_meta');
  }

  function openRecordModal() {
    if (!recordModal) initDOMElements();
    if (!recordModal) return;

    // Sincronizar idioma actual en toda la ventana modal
    const activeLang = window.currentLang || (typeof localStorage !== 'undefined' ? localStorage.getItem('fluid_sim_lang') : null) || 'es';
    if (typeof window.setLanguage === 'function') {
      window.setLanguage(activeLang);
    }

    cancelRequested = false;
    setDuration(recordingDuration);
    setMode(recordingMode);
    setLayout(videoLayout);

    if (viewConfig) viewConfig.style.display = 'block';
    if (viewProgress) viewProgress.style.display = 'none';
    if (btnStartRecord) btnStartRecord.style.display = 'inline-flex';
    if (btnCancelRecord) btnCancelRecord.style.display = 'inline-flex';
    if (btnCancelProgress) btnCancelProgress.style.display = 'none';

    recordModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeRecordModal() {
    if (recordModal) {
      recordModal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  let isStarting = false;
  function startRecording(sim) {
    if (isRecording || isRendering || isStarting) {
      console.warn("[Recorder] Ya hay una grabación o renderizado en curso.");
      return;
    }
    if (!sim || !sim.canvas) {
      console.error("[Recorder] Simulación no inicializada.");
      return;
    }

    isStarting = true;
    setTimeout(() => { isStarting = false; }, 800);

    if (recordingMode === 'render') {
      runOfflineRender(sim, recordingDuration);
    } else {
      runLiveRecording(sim, recordingDuration);
    }
  }

  function cancelRecording() {
    cancelRequested = true;
    isRendering = false;
    isRecording = false;

    if (activeLiveAnimFrame) {
      cancelAnimationFrame(activeLiveAnimFrame);
      activeLiveAnimFrame = null;
    }

    if (activeRecorder && activeRecorder.state !== 'inactive') {
      try { activeRecorder.stop(); } catch (e) {}
    }
    if (activeVideoEncoder && activeVideoEncoder.state !== 'closed') {
      try { activeVideoEncoder.close(); } catch (e) {}
    }

    if (btnStartRecord) btnStartRecord.style.display = 'inline-flex';
    if (btnCancelRecord) btnCancelRecord.style.display = 'inline-flex';
    if (btnCancelProgress) btnCancelProgress.style.display = 'none';

    closeRecordModal();
    hideFloatingLiveIndicator();
    if (window.sim) {
      window.sim.isRendering = false;
      window.sim.isPaused = false; // Entra en play de nuevo
      if (typeof window.updatePlayPauseUI === 'function') {
        window.updatePlayPauseUI(false);
      }
    }
  }

  /**
   * Determina el mejor códec y muxer soportado por el navegador para Full HD (1920x1080)
   */
  async function chooseSupportedVideoEncoder(width = 1920, height = 1080, fps = 30) {
    if (!window.VideoEncoder) return null;

    const mp4Mux = window.Mp4Muxer || (typeof Mp4Muxer !== 'undefined' ? Mp4Muxer : null);
    const webmMux = window.WebMMuxer || window.WebmMuxer || (typeof WebMMuxer !== 'undefined' ? WebMMuxer : null);

    // 1. Prioridad: Códecs H.264 (AVC) compatibles con 1080p (Profile Main, Baseline o High, Level 4.0 a 4.2)
    // Universalmente reproducibles en Media Player Classic (MPC-HC), Windows Media Player, QuickTime, VLC y navegadores
    if (mp4Mux) {
      const avcCandidates = [
        'avc1.4d002a', // Main Profile Level 4.2 (Soporte universal en Windows MPC-HC y hardware H.264)
        'avc1.420028', // Baseline Profile Level 4.0 (1080p30 estándar)
        'avc1.64002a', // High Profile Level 4.2
        'avc1.42002a', // Baseline Profile Level 4.2
        'avc1.4d0028'  // Main Profile Level 4.0
      ];

      for (const codec of avcCandidates) {
        try {
          const res = await VideoEncoder.isConfigSupported({
            codec,
            width,
            height,
            bitrate: 6_000_000,
            framerate: fps
          });
          if (res && res.supported) {
            return {
              type: 'mp4',
              codecStr: codec,
              muxCodec: 'avc',
              muxerClass: mp4Mux,
              mimeType: 'video/mp4',
              ext: 'mp4'
            };
          }
        } catch (e) {}
      }
    }

    // 2. Si AVC no está disponible, intentar WebM VP8 / VP9 con WebMMuxer
    if (webmMux) {
      const webmCandidates = [
        { codec: 'vp8', mux: 'V_VP8' },
        { codec: 'vp09.00.10.08', mux: 'V_VP9' }
      ];

      for (const item of webmCandidates) {
        try {
          const res = await VideoEncoder.isConfigSupported({
            codec: item.codec,
            width,
            height,
            bitrate: 6_000_000,
            framerate: fps
          });
          if (res && res.supported) {
            return {
              type: 'webm',
              codecStr: item.codec,
              muxCodec: item.mux,
              muxerClass: webmMux,
              mimeType: 'video/webm',
              ext: 'webm'
            };
          }
        } catch (e) {}
      }
    }

    return null;
  }

  // =========================================================================
  // --- MODO 1: RENDERIZADO EXTRAPOLADO EN SEGUNDO PLANO (RÁPIDO) ---
  // =========================================================================
  async function runOfflineRender(sim, durationSec) {
    cancelRequested = false;
    isRendering = true;
    sim.isRendering = true;
    sim.isPaused = true;
    if (typeof window.updatePlayPauseUI === 'function') {
      window.updatePlayPauseUI(true);
    }

    // Sincronizar sim.visMode con la vista seleccionada en la barra de herramientas si difiere
    const selVis = document.getElementById('cb-vis-mode-toolbar') || document.getElementById('cb-vis-mode') || document.getElementById('cb-vis-mode-left');
    if (selVis && selVis.value && selVis.value !== sim.visMode && typeof sim.setVisMode === 'function') {
      sim.setVisMode(selVis.value);
    }

    // Mostrar vista de progreso dentro del modal
    if (viewConfig) viewConfig.style.display = 'none';
    if (viewProgress) viewProgress.style.display = 'block';
    if (btnStartRecord) btnStartRecord.style.display = 'none';
    if (btnCancelRecord) btnCancelRecord.style.display = 'none';
    if (btnCancelProgress) btnCancelProgress.style.display = 'inline-flex';

    if (progressFill) progressFill.style.width = '0%';
    if (progressPctText) progressPctText.textContent = '0%';

    const isEs = (window.currentLang || (typeof localStorage !== 'undefined' ? localStorage.getItem('fluid_sim_lang') : null)) === 'es';
    if (progressFramesText) {
      progressFramesText.textContent = isEs
        ? "Inicializando aceleración de video técnica..."
        : "Initializing technical video acceleration...";
    }

    const fps = 30;
    const totalFrames = Math.max(150, Math.round(durationSec * fps));
    const frameDt = 1.0 / fps;

    // Canvas offscreen para procesar y renderizar los fotogramas físicos sin alterar el lienzo visible
    // Aplicar devicePixelRatio para que el renderizado coincida exactamente con la resolución física del lienzo
    const dpr = window.devicePixelRatio || 1;
    const offlineSimCanvas = document.createElement('canvas');
    offlineSimCanvas.width = Math.round((sim.width || 800) * dpr);
    offlineSimCanvas.height = Math.round((sim.height || 600) * dpr);
    const offlineSimCtx = offlineSimCanvas.getContext('2d');
    offlineSimCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const recW = 1920;
    let recH = 1080;
    if (videoLayout === 'no_meta') {
      const crop = (typeof window.getFluidDomainCrop === 'function')
        ? window.getFluidDomainCrop(sim, offlineSimCanvas)
        : null;
      const domainAspect = (crop && crop.aspect) ? crop.aspect : ((sim.width && sim.height) ? (sim.width / sim.height) : (16 / 9));
      const headerH = 90;
      let animH = Math.round(recW / domainAspect);
      recH = headerH + animH;
      if (recH % 2 !== 0) recH++;
    }

    // Canvas del informe Full HD (o ajustado sin franja inferior)
    const recCanvas = document.createElement('canvas');
    recCanvas.width = recW;
    recCanvas.height = recH;
    const recCtx = recCanvas.getContext('2d');

    let encoderConfig = await chooseSupportedVideoEncoder(recW, recH, fps);
    if (!encoderConfig && recH !== 1080) {
      recH = 1080;
      recCanvas.height = recH;
      encoderConfig = await chooseSupportedVideoEncoder(recW, recH, fps);
    }

    if (!encoderConfig) {
      isRendering = false;
      sim.isRendering = false;
      sim.isPaused = false;
      if (typeof window.updatePlayPauseUI === 'function') {
        window.updatePlayPauseUI(false);
      }
      if (progressFramesText) {
        progressFramesText.innerHTML = `<span style="color:#ef4444; font-weight:700;">⚠️ ${isEs ? "El codificador de video en hardware (WebCodecs) no está disponible en este navegador." : "Hardware WebCodecs video encoder is not supported in this browser."}</span><br>${isEs ? "Por favor usa el modo 'En Vivo' para grabar la simulación." : "Please use 'Live' recording mode instead."}`;
      }
      if (btnCancelProgress) {
        btnCancelProgress.textContent = isEs ? "Volver" : "Back";
      }
      return;
    }

    let muxer = null;
    let videoEncoder = null;

    try {
      if (encoderConfig.type === 'mp4') {
        muxer = new encoderConfig.muxerClass.Muxer({
          target: new encoderConfig.muxerClass.ArrayBufferTarget(),
          video: {
            codec: encoderConfig.muxCodec, // 'avc'
            width: recW,
            height: recH
          },
          fastStart: 'in-memory' // Moov atom at beginning: 100% compatible with MPC-HC, WMP, VLC, QuickTime
        });
      } else {
        muxer = new encoderConfig.muxerClass.Muxer({
          target: new encoderConfig.muxerClass.ArrayBufferTarget(),
          video: {
            codec: encoderConfig.muxCodec,
            width: recW,
            height: recH,
            frameRate: fps
          }
        });
      }

      videoEncoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (e) => console.error("[VideoEncoder] Error:", e)
      });

      videoEncoder.configure({
        codec: encoderConfig.codecStr,
        width: recW,
        height: recH,
        bitrate: 6_000_000,
        framerate: fps
      });
    } catch (initErr) {
      console.error("[Recorder] Error al configurar codificador:", initErr);
      isRendering = false;
      sim.isRendering = false;
      sim.isPaused = false;
      if (typeof window.updatePlayPauseUI === 'function') {
        window.updatePlayPauseUI(false);
      }
      if (progressFramesText) {
        progressFramesText.innerHTML = `<span style="color:#ef4444; font-weight:700;">⚠️ ${isEs ? "Error al inicializar el codificador de video: " : "Error initializing video encoder: "} ${initErr.message}</span>`;
      }
      return;
    }

    activeVideoEncoder = videoEncoder;
    const BATCH_SIZE = 5;
    let frameIdx = 0;

    function processBatch() {
      if (cancelRequested) {
        isRendering = false;
        sim.isRendering = false;
        sim.isPaused = false;
        if (typeof window.updatePlayPauseUI === 'function') {
          window.updatePlayPauseUI(false);
        }
        try { videoEncoder.close(); } catch (e) {}
        closeRecordModal();
        return;
      }

      const batchEnd = Math.min(totalFrames, frameIdx + BATCH_SIZE);
      for (; frameIdx < batchEnd; frameIdx++) {
        // Avanzar la simulación física exactamente frameDt (extrapolando movimiento fluido en segundo plano)
        if (sim.isLBMMode && sim.lbm) {
          sim.lbm.step();
        } else if (sim.fluid) {
          const steps = 2;
          const subDt = frameDt / steps;
          for (let s = 0; s < steps; s++) {
            sim.fluid.step(subDt);
          }
          if (typeof sim.updateDynamicObstacles === 'function') {
            sim.updateDynamicObstacles(frameDt);
          }
        }

        // Renderizar EXCLUSIVAMENTE en el canvas offscreen (la pantalla principal se queda completamente pausada y estática)
        sim.render(offlineSimCtx);

        // Resetear transformación y limpiar canvas de grabación por completo antes de componer el frame
        recCtx.setTransform(1, 0, 0, 1, 0, 0);
        recCtx.clearRect(0, 0, recW, recH);

        // Componer según la opción elegida por el usuario: con metadatos completos o diseño limpio sin metadatos
        const renderOpts = {
          badgeTag: isEs ? "SIMULACIÓN RENDERIZADA (30 FPS)" : "RENDERED CFD (30 FPS)",
          timestamp: new Date(),
          customSimCanvas: offlineSimCanvas,
          visMode: sim.visMode,
          isVideo: true
        };

        if (videoLayout === 'no_meta') {
          if (typeof window.drawCleanVideoLayout === 'function') {
            window.drawCleanVideoLayout(recCtx, sim, recW, recH, renderOpts);
          } else if (typeof window.drawCleanReportLayout === 'function') {
            window.drawCleanReportLayout(recCtx, sim, recW, recH, renderOpts);
          }
        } else {
          if (typeof window.drawReportLayout === 'function') {
            window.drawReportLayout(recCtx, sim, recW, recH, renderOpts);
          }
        }

        // Pasar el fotograma al codificador con marca de tiempo precisa en microsegundos
        const timestampMicros = frameIdx * (1_000_000 / fps);
        const videoFrame = new VideoFrame(recCanvas, { timestamp: timestampMicros });
        videoEncoder.encode(videoFrame, { keyFrame: frameIdx % fps === 0 });
        videoFrame.close();
      }

      // Actualizar barra de progreso e info de render
      const progressPct = Math.min(100, Math.round((frameIdx / totalFrames) * 100));
      updateRenderProgressUI(progressPct, frameIdx, totalFrames);

      if (frameIdx < totalFrames) {
        setTimeout(processBatch, 0);
      } else {
        finishRender();
      }
    }

    let renderFinalized = false;
    async function finishRender() {
      if (renderFinalized) return;
      renderFinalized = true;

      try {
        await videoEncoder.flush();
        muxer.finalize();
        const buffer = muxer.target.buffer;
        const blob = new Blob([buffer], { type: encoderConfig.mimeType });

        if (btnStartRecord) btnStartRecord.style.display = 'inline-flex';
        if (btnCancelRecord) btnCancelRecord.style.display = 'inline-flex';
        if (btnCancelProgress) btnCancelProgress.style.display = 'none';

        onRecordingSuccess(blob, encoderConfig.ext);
      } catch (err) {
        console.error("[Recorder] Error al finalizar el video:", err);
      } finally {
        isRendering = false;
        sim.isRendering = false;
        sim.isPaused = false; // Entra en play de nuevo tras finalizar el renderizado
        if (typeof window.updatePlayPauseUI === 'function') {
          window.updatePlayPauseUI(false);
        }
        // Refrescar el lienzo visible al estado final alcanzado
        sim.render();
      }
    }

    processBatch();
  }

  function updateRenderProgressUI(pct, curFrame, totalFrames) {
    if (progressFill) progressFill.style.width = `${pct}%`;
    if (progressPctText) progressPctText.textContent = `${pct}%`;
    if (progressFramesText) {
      const isEs = (window.currentLang || (typeof localStorage !== 'undefined' ? localStorage.getItem('fluid_sim_lang') : null)) === 'es';
      progressFramesText.textContent = isEs
        ? `Procesando fotograma ${curFrame} / ${totalFrames} • Extrapolando en segundo plano`
        : `Processing frame ${curFrame} / ${totalFrames} • Extrapolating in background`;
    }
  }

  // =========================================================================
  // --- MODO 2: GRABACIÓN EN VIVO EN TIEMPO REAL (INTERACTIVA) ---
  // =========================================================================
  async function runLiveRecording(sim, durationSec) {
    cancelRequested = false;
    isRecording = true;

    closeRecordModal();

    const fps = 30;
    const frameIntervalMs = 1000 / fps;

    const recW = 1920;
    let recH = 1080;
    if (videoLayout === 'no_meta') {
      const sourceCanvas = sim.canvas;
      const crop = (typeof window.getFluidDomainCrop === 'function')
        ? window.getFluidDomainCrop(sim, sourceCanvas)
        : null;
      const domainAspect = (crop && crop.aspect)
        ? crop.aspect
        : (sourceCanvas && sourceCanvas.width && sourceCanvas.height ? (sourceCanvas.width / sourceCanvas.height) : (16 / 9));
      const headerH = 90;
      let animH = Math.round(recW / domainAspect);
      recH = headerH + animH;
      if (recH % 2 !== 0) recH++;
    }

    const recCanvas = document.createElement('canvas');
    recCanvas.width = recW;
    recCanvas.height = recH;
    const recCtx = recCanvas.getContext('2d');

    let encoderConfig = await chooseSupportedVideoEncoder(recW, recH, fps);
    if (!encoderConfig && recH !== 1080) {
      recH = 1080;
      recCanvas.height = recH;
      encoderConfig = await chooseSupportedVideoEncoder(recW, recH, fps);
    }
    const isEs = (window.currentLang || (typeof localStorage !== 'undefined' ? localStorage.getItem('fluid_sim_lang') : null)) === 'es';

    // CASO A: Codificación WebCodecs + Muxer en tiempo real (Salida MP4 estándar de máxima compatibilidad)
    if (encoderConfig) {
      let muxer = null;
      let videoEncoder = null;

      try {
        if (encoderConfig.type === 'mp4') {
          muxer = new encoderConfig.muxerClass.Muxer({
            target: new encoderConfig.muxerClass.ArrayBufferTarget(),
            video: {
              codec: encoderConfig.muxCodec,
              width: recW,
              height: recH
            },
            fastStart: 'in-memory'
          });
        } else {
          muxer = new encoderConfig.muxerClass.Muxer({
            target: new encoderConfig.muxerClass.ArrayBufferTarget(),
            video: {
              codec: encoderConfig.muxCodec,
              width: recW,
              height: recH,
              frameRate: fps
            }
          });
        }

        videoEncoder = new VideoEncoder({
          output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
          error: (e) => console.error("[VideoEncoder Live] Error:", e)
        });

        videoEncoder.configure({
          codec: encoderConfig.codecStr,
          width: recW,
          height: recH,
          bitrate: 6_000_000,
          framerate: fps
        });
        activeVideoEncoder = videoEncoder;
      } catch (err) {
        console.warn("[Recorder] Fallback de codificador en vivo:", err);
      }

      if (videoEncoder && muxer) {
        showFloatingLiveIndicator(durationSec);

        const startTime = performance.now();
        const totalMs = durationSec * 1000;
        let lastFrameTime = 0;
        let frameCount = 0;

        let liveFinalized = false;
        async function finishLiveEncoder() {
          if (liveFinalized) return;
          liveFinalized = true;

          activeLiveFinalizer = null;
          isRecording = false;
          if (activeLiveAnimFrame) {
            cancelAnimationFrame(activeLiveAnimFrame);
            activeLiveAnimFrame = null;
          }
          hideFloatingLiveIndicator();
          if (cancelRequested) return;

          try {
            if (videoEncoder && videoEncoder.state !== 'closed') {
              await videoEncoder.flush();
            }
            muxer.finalize();
            const buffer = muxer.target.buffer;
            const blob = new Blob([buffer], { type: encoderConfig.mimeType });
            onRecordingSuccess(blob, encoderConfig.ext);
          } catch (err) {
            console.error("[Recorder] Error al finalizar video en vivo:", err);
          }
        }
        activeLiveFinalizer = finishLiveEncoder;

        function liveCaptureLoop(timestamp) {
          if (!isRecording || cancelRequested) return;

          const elapsedMs = performance.now() - startTime;
          if (elapsedMs >= totalMs) {
            finishLiveEncoder();
            return;
          }

          if (timestamp - lastFrameTime >= frameIntervalMs - 2) {
            lastFrameTime = timestamp;

            // Resetear transformación y limpiar canvas de grabación
            recCtx.setTransform(1, 0, 0, 1, 0, 0);
            recCtx.clearRect(0, 0, recW, recH);

            const liveOpts = {
              badgeTag: isEs ? "GRABACIÓN EN VIVO (30 FPS)" : "LIVE RECORDING (30 FPS)",
              timestamp: new Date(),
              visMode: sim.visMode,
              isLive: true,
              isVideo: true
            };

            // Dibuja la maqueta según la opción elegida por el usuario: con metadatos completos o diseño limpio sin metadatos
            if (videoLayout === 'no_meta') {
              if (typeof window.drawCleanVideoLayout === 'function') {
                window.drawCleanVideoLayout(recCtx, sim, recW, recH, liveOpts);
              } else if (typeof window.drawCleanReportLayout === 'function') {
                window.drawCleanReportLayout(recCtx, sim, recW, recH, liveOpts);
              }
            } else {
              if (typeof window.drawReportLayout === 'function') {
                window.drawReportLayout(recCtx, sim, recW, recH, liveOpts);
              }
            }

            const frameTimestampMicros = Math.round(frameCount * (1_000_000 / fps));
            const videoFrame = new VideoFrame(recCanvas, { timestamp: frameTimestampMicros });
            videoEncoder.encode(videoFrame, { keyFrame: frameCount % fps === 0 });
            videoFrame.close();
            frameCount++;
          }

          updateFloatingLiveIndicator(elapsedMs, totalMs);
          activeLiveAnimFrame = requestAnimationFrame(liveCaptureLoop);
        }

        activeLiveAnimFrame = requestAnimationFrame(liveCaptureLoop);
        return;
      }
    }

    // CASO B: Fallback tradicional con MediaRecorder
    const stream = recCanvas.captureStream(fps);
    let mimeType = 'video/webm;codecs=vp9';
    let ext = 'webm';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp8';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';

    let recorder = null;
    try {
      recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 });
    } catch (e) {
      recorder = new MediaRecorder(stream);
      ext = 'webm';
    }
    activeRecorder = recorder;
    const chunks = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      isRecording = false;
      hideFloatingLiveIndicator();
      if (cancelRequested) return;
      const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
      onRecordingSuccess(blob, ext);
    };

    activeLiveFinalizer = () => {
      if (recorder && recorder.state !== 'inactive') {
        try { recorder.stop(); } catch (e) {}
      }
    };

    showFloatingLiveIndicator(durationSec);
    recorder.start(100);

    const startTime = performance.now();
    const totalMs = durationSec * 1000;

    function captureLiveFrame() {
      if (!isRecording || cancelRequested) return;
      const elapsedMs = performance.now() - startTime;
      if (elapsedMs >= totalMs) {
        stopLiveRecording();
        return;
      }

      // Resetear transformación y limpiar canvas de grabación
      recCtx.setTransform(1, 0, 0, 1, 0, 0);
      recCtx.clearRect(0, 0, recW, recH);

      const liveOpts = {
        badgeTag: isEs ? "GRABACIÓN EN VIVO (30 FPS)" : "LIVE RECORDING (30 FPS)",
        timestamp: new Date(),
        visMode: sim.visMode,
        isLive: true,
        isVideo: true
      };

      // Dibuja la maqueta según la opción elegida por el usuario: con metadatos completos o diseño limpio sin metadatos
      if (videoLayout === 'no_meta') {
        if (typeof window.drawCleanVideoLayout === 'function') {
          window.drawCleanVideoLayout(recCtx, sim, recW, recH, liveOpts);
        } else if (typeof window.drawCleanReportLayout === 'function') {
          window.drawCleanReportLayout(recCtx, sim, recW, recH, liveOpts);
        }
      } else {
        if (typeof window.drawReportLayout === 'function') {
          window.drawReportLayout(recCtx, sim, recW, recH, liveOpts);
        }
      }

      updateFloatingLiveIndicator(elapsedMs, totalMs);
      activeLiveAnimFrame = requestAnimationFrame(captureLiveFrame);
    }

    activeLiveAnimFrame = requestAnimationFrame(captureLiveFrame);
  }

  function stopLiveRecording() {
    if (activeLiveFinalizer) {
      const finalizeFn = activeLiveFinalizer;
      activeLiveFinalizer = null;
      finalizeFn();
      return;
    }
    if (activeLiveAnimFrame) {
      cancelAnimationFrame(activeLiveAnimFrame);
      activeLiveAnimFrame = null;
    }
    if (activeRecorder && activeRecorder.state !== 'inactive') {
      try { activeRecorder.stop(); } catch (e) {}
    }
    isRecording = false;
    hideFloatingLiveIndicator();
  }

  function showFloatingLiveIndicator(durationSec) {
    if (!floatingIndicator) initDOMElements();
    if (!floatingIndicator) return;
    floatingIndicator.style.display = 'flex';
    updateFloatingLiveIndicator(0, durationSec * 1000);
  }

  function hideFloatingLiveIndicator() {
    if (floatingIndicator) {
      floatingIndicator.style.display = 'none';
    }
  }

  function updateFloatingLiveIndicator(elapsedMs, totalMs) {
    if (!floatingTimer) return;
    const curSec = Math.floor(elapsedMs / 1000);
    const totSec = Math.ceil(totalMs / 1000);
    const pad = (n) => String(n).padStart(2, '0');
    floatingTimer.textContent = `${pad(Math.floor(curSec / 60))}:${pad(curSec % 60)} / ${pad(Math.floor(totSec / 60))}:${pad(totSec % 60)}`;
  }

  let lastSuccessTime = 0;
  function onRecordingSuccess(blob, ext) {
    const now = Date.now();
    if (now - lastSuccessTime < 1000) return;
    lastSuccessTime = now;

    lastVideoBlob = blob;
    lastVideoExt = ext;
    closeRecordModal();
    hideFloatingLiveIndicator();

    // Abrir la ventana con la misma información de donaciones de Guardar Informe,
    // configurada con el botón "Descargar video procesado"
    if (typeof window.openReportDonateModal === 'function') {
      window.openReportDonateModal(true); // true = modo video
    }
  }

  let isDownloading = false;
  function downloadLastVideo() {
    if (isDownloading) return;
    if (!lastVideoBlob) {
      console.warn("[Recorder] No hay video disponible para descargar.");
      return;
    }
    isDownloading = true;
    setTimeout(() => { isDownloading = false; }, 2500);

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const isEs = (window.currentLang || (typeof localStorage !== 'undefined' ? localStorage.getItem('fluid_sim_lang') : null)) === 'es';
    const isClean = videoLayout === 'no_meta';
    let prefix = '';
    if (isEs) {
      prefix = isClean ? "video_simulacion_sin_metadatos" : "video_simulacion_con_metadatos";
    } else {
      prefix = isClean ? "simulation_video_clean_no_meta" : "simulation_video_with_metadata";
    }
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const filename = `${prefix}_${dateStr}.${lastVideoExt || 'mp4'}`;

    const url = URL.createObjectURL(lastVideoBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 15000);

    closeRecordModal();
  }

  // Inicialización al cargar el DOM
  document.addEventListener('DOMContentLoaded', () => {
    initDOMElements();
  });

  window.FluidVideoRecorder = {
    openRecordModal,
    closeRecordModal,
    setDuration,
    setMode,
    setLayout,
    getVideoLayout: () => videoLayout,
    startRecording,
    cancelRecording,
    stopLiveRecording,
    downloadLastVideo,
    getLastVideoBlob: () => lastVideoBlob,
    isRecording: () => isRecording || isRendering
  };

})();
