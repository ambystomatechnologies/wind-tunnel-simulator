/**
 * Simulador de Mecánica de Fluidos y Túnel Aerodinámico 2D - Ambystoma Technologies
 * i18n.js - Diccionario Bilingüe Internacional (Inglés por defecto, Español seleccionable)
 */

const FLUID_I18N = {
  en: {
    // Meta & Header
    pageTitle: "2D Fluid & Wind Tunnel Simulator · Ambystoma Studio · Real-Time Physics",
    pageDesc: "Interactive 2D fluid mechanics and wind tunnel simulator with Navier-Stokes solver, deformable NACA airfoils, real-time drag & lift, vorticity, and streamline smoke. 100% free by Ambystoma Technologies.",
    brandTitle: "2D Fluid & Wind Tunnel Simulator <span>Ambystoma Studio</span>",
    brandDesc: "Real-Time Navier-Stokes, Hydrodynamic Drag, Lift & Deformable Shapes",
    btnAbout: "About",
    btnAboutTitle: "About this fluid simulator and physics engine",
    securityBadgeText: "100% In-Browser",
    securityBadgeTitle: "Runs completely in your browser with hardware-accelerated Canvas",

    // Toolbar Tools
    btnSelect: "🔍 Move / Rotate",
    btnSelectTitle: "Select, move, or rotate obstacles and change angle of attack in real time",
    btnNodeEdit: "✏️ Deform Nodes",
    btnNodeEditTitle: "Click and drag any vertex to reshape or hand-sculpt custom aerodynamic bodies",
    btnDrawFreehand: "✍️ Freehand",
    btnDrawFreehandTitle: "Draw any organic aerodynamic shape directly and smooth it into a fluid obstacle",
    btnDrawPoly: "📐 Polygon",
    btnDrawPolyTitle: "Click points to define a custom polygon, wedge, or aerodynamic deflector",
    btnFinishDraw: "✅ Finish Polygon",
    btnFinishDrawTitle: "Close current polygon and convert it into a hydrodynamic obstacle",
    btnProbe: "🎯 Sensor Probe",
    btnProbeTitle: "Place a flow velocity, pressure, and vorticity sensor probe anywhere in the fluid",

    // Dedicated Action Buttons
    btnAddAirfoil: "✈️ Add NACA Airfoil",
    btnAddAirfoilTitle: "Spawn a standard aerodynamic NACA wing profile in the tunnel",
    btnStopFlow: "⏹️ Stop Animation",
    btnStartFlow: "💨 Start Animation",
    btnStopFlowTitle: "Cut off air inflow and let fluid fade out naturally",
    btnStartFlowTitle: "Restart air inflow and wave propagation from the tunnel entrance",

    // Quick Add Dropdowns
    optAddShapes: "-- Add Hydrodynamic Shape --",
    optNaca0012: "Airfoil NACA 0012 (Symmetric)",
    optNaca2412: "Airfoil NACA 2412 (Cambered)",
    optCylinder: "Circular Cylinder (Vortex Street)",
    optTeardrop: "Aerodynamic Teardrop (Low Drag)",
    optFlatPlate: "Flat Plate (Angle of Attack)",
    optSquare: "Bluff Square Body (Separation)",
    optWedge: "Aerodynamic Wedge Deflector",
    optCar: "Race Car Silhouette & Downforce",
    optVenturi: "Venturi Nozzle / Constriction",

    optDemos: "Physics Demos...",
    optDemo1: "1. NACA 0012 Airfoil (Lift & Streamlines)",
    optDemo2: "2. Von Kármán Vortex Street (Cylinder Wake)",
    optDemo3: "3. Teardrop vs. Flat Plate (Drag Comparison)",
    optDemo4: "4. Airfoil Stall (Flow Separation at High AoA)",
    optDemo5: "5. Venturi Effect & Bernoulli Pressure Drop",
    optDemo6: "6. Race Car Aerodynamics & Wake",
    optDemo7: "7. High-Lift Slotted Multi-Element Wing",
    optDemo8: "8. Bluff Bodies: Square vs. Cylinder",
    optDemo9: "9. Aerodynamic Drafting (Two Bodies in Slipstream)",
    optDemo10: "10. Convergent-Divergent Nozzle",
    optDemo11: "11. Ground Effect Hydrofoil",
    optDemo12: "12. Hand-Sculpted Custom Organic Body",
    optDemo13: "13. [LBM] Schroeder Barrier Line (Physical Vortices)",
    optDemo14: "14. [LBM] Aerodynamic Wedge (Real Turbulence)",
    optSchroederLine: "Schroeder Barrier Line (Von Kármán Wake)",

    // Left Panel: Scene Elements & Telemetry
    tabScene: "Obstacles & HUD",
    tabTools: "Tools & Shapes",
    groupSimControl: "Simulation Control",
    groupEditTools: "Tools & Nodes",
    groupShapes: "Add Bodies",
    groupVisDemos: "CFD View & Demos",
    lblDemos: "Educational Demos:",
    panelSceneTitle: "Tunnel Obstacles",
    panelTelemetryTitle: "Aerodynamic Telemetry (HUD)",
    lblDragForce: "Drag Force (Fd):",
    lblLiftForce: "Lift Force (Fl):",
    lblDragCoeff: "Drag Coeff (Cd):",
    lblLiftCoeff: "Lift Coeff (Cl):",
    lblEfficiency: "Efficiency (L/D):",
    lblReynolds: "Reynolds Number (Re):",
    lblAoA: "Angle of Attack (α):",
    lblStagnationP: "Stagnation Press (pMax):",
    lblWakeP: "Suction Wake (pMin):",
    lblFlowRegime: "Flow Regime:",
    regimeLaminar: "Laminar Flow",
    regimeSeparated: "Flow Separation (Stall)",
    regimeVortices: "Vortex Shedding (Turbulent)",
    btnDeleteElement: "Delete Obstacle",
    btnSaveScene: "💾 Save Scene",
    btnSaveSceneTitle: "Save current tunnel obstacle configuration to a JSON file",
    btnOpenScene: "📂 Open Scene",
    btnOpenSceneTitle: "Load a previously saved tunnel layout",
    btnImportImage: "🖼️ Open SVG / PNG Shape",
    btnImportImageTitle: "Import an SVG or PNG image and convert its contour into an interactive obstacle",

    // Right Panel: Fluid Properties
    panelPropertiesTitle: "Fluid & Tunnel Properties",
    gbFluidTitle: "Fluid Medium & Inflow",
    lblInflowSpeed: "Inflow Velocity (U∞):",
    lblViscosity: "Kinematic Viscosity (ν):",
    lblDensity: "Fluid Density (ρ):",
    lblInflowAngle: "Flow Direction Angle:",
    lblFlowRegimeSelect: "Inflow Regime:",
    btnRegimeLaminar: "🌊 Laminar Flow",
    btnRegimeTurbulent: "🌪️ Turbulent Flow",
    lblTurbulenceIntensity: "Turbulence Intensity (Tu):",
    btnPresetAir: "Air",
    btnPresetWater: "Water",
    btnPresetOil: "Oil",
    btnPresetHoney: "Glycerin",
    btnPresetSuper: "Superfluid",
    chkShowParticles: "Particles",

    gbTransformTitle: "Transformation & Angle of Attack",
    gbVisTitle: "Visualization & Rendering",
    lblVisMode: "CFD / Physics Display Mode:",
    visSchroederCurl: "🌪️ Schroeder LBM: Curl & Physical Vortices",
    visSchroederFlowlines: "〰️ Schroeder LBM: Flowlines",
    visSchroederSpeed: "⚡ Schroeder LBM: Velocity Magnitude",
    lblLbmContrast: "Vorticity Contrast (LBM):",
    visSmoke: "💨 Smoke & Streamlines",
    visPressure: "📊 Static Pressure Map (Pa)",
    visVelocity: "⚡ Velocity Magnitude (m/s)",
    visVorticity: "🌀 Vorticity & Eddies (s⁻¹)",
    visParticles: "✨ Particle Fleet Tracers",
    visVectors: "🏹 Velocity Vectors",
    chkSmoothCurve: "Smooth Curve (Catmull-Rom)",
    chkShowForces: "Show Aerodynamic Force Vectors (Fd, Fl)",
    chkShowGrid: "Show Wind Tunnel Grid",
    chkClosedWalls: "Closed Wind Tunnel (Solid Top/Bottom Walls)",
    chkPause: "Pause Simulation (Spacebar)",

    gbSolverTitle: "Simulation Engine & Mesh",
    lblGridRes: "Grid Resolution:",
    resFast: "Fast (120 × 70)",
    resBalanced: "Balanced (160 × 90)",
    resHigh: "High-Fidelity (220 × 124)",
    lblSimSpeed: "Sim Speed:",

    // Bottom Toolbar
    btnClear: "🗑️ Clear Tunnel",
    btnClearTitle: "Remove all obstacles and reset fluid flow",
    statusReady: "Ready. Select, deform, or spawn shapes in the wind tunnel.",
    statusNodeEdit: "Deform Nodes: Drag any vertex to reshape the obstacle live.",
    statusDrawFreehand: "Draw Freehand: Click and drag on canvas to sculpt custom shapes.",
    statusDrawPoly: "Custom Polygon: Click points to place vertices, then click Finish.",
    statusCoords: "X: {x} m, Y: {y} m",

    // Modal About
    aboutModalTitle: "About 2D Fluid & Wind Tunnel Simulator",
    aboutDevBadge: "Computational Fluid Dynamics · Ambystoma Technologies",
    aboutDevDesc: "Interactive real-time fluid mechanics and wind tunnel simulation suite.",
    aboutAuthorCitationTitle: "🖋️ Author & Tool Citation",
    aboutAuthorRoleBadge: "Author & Developer",
    aboutAuthorText: "This interactive fluid mechanics and wind tunnel simulation suite was conceived, designed, and developed by <strong>Brandon Antonio Segura Torres</strong> CEO & Founder of <strong>Ambystoma Technologies</strong>.",
    aboutCitationPrompt: "If you use this simulator in scientific research, academic publications, engineering theses, or educational demos, please cite the tool as follows:",
    aboutCitationText: "Segura Torres, B. A. (2025). 2D Fluid Dynamics & Wind Tunnel Simulator [Computational software]. Ambystoma Technologies. https://ambystomatechnologies.github.io/",
    aboutBtnCopyCitation: "Copy Citation",
    aboutPhysicsTitle: "🔬 Physics Engine Highlights",
    aboutPhysics1: "Full 2D Incompressible Navier-Stokes solver with Chorin-Helmholtz pressure projection.",
    aboutPhysics2: "Real-time surface integration of pressure and viscous shear forces (Drag Cd, Lift Cl, L/D).",
    aboutPhysics3: "Catmull-Rom deformable splines with interactive vertex manipulation and live flow deflection.",
    aboutPhysics4: "Streamline smoke rakes, particle fleet tracers, and vorticity eddie visualization.",
    aboutNumericsTitle: "⚙️ Numerical Schemes & Turbulence Modeling",
    aboutNumericsNSHeader: "1. Incompressible Navier-Stokes Solver (Eulerian Grid)",
    aboutNumericsNS1: "<b>Advection Scheme:</b> Semi-Lagrangian advection integrated with 2nd-order Runge-Kutta (RK2) trajectory back-tracing and bilinear spatial interpolation.",
    aboutNumericsNS2: "<b>Viscous Diffusion:</b> Implicit solver resolved iteratively using Gauss-Seidel relaxation.",
    aboutNumericsNS3: "<b>Pressure-Velocity Coupling:</b> Chorin projection method (Helmholtz-Hodge decomposition). The Poisson equation for pressure is solved via an iterative Gauss-Seidel / SOR scheme with central finite differences.",
    aboutNumericsNS4: "<b>Turbulence Modeling & Subgrid Treatment:</b> Vorticity Confinement (Fedkiw, Stam, Jensen) to preserve rotational structures against numerical dissipation, synthetic stochastic inflow turbulence (Kolmogorov spectrum cascade), and Strouhal wake instability triggering (St ≈ 0.22).",
    aboutNumericsLBMHeader: "2. Lattice Boltzmann Method Engine (LBM D2Q9)",
    aboutNumericsLBM1: "<b>Lattice Kinetics & Collision:</b> D2Q9 discrete velocity lattice with single-relaxation-time BGK (Bhatnagar-Gross-Krook) approximation (τ = 3ν + 0.5).",
    aboutNumericsLBM2: "<b>Streaming & Boundary Conditions:</b> Exact discrete streaming step free of numerical diffusion, half-way bounce-back scheme for no-slip solid walls, and equilibrium boundary conditions for tunnel inlet and outlet.",
    aboutNumericsLBM3: "<b>Turbulence Behavior:</b> Mesoscopic resolution of shear layers, instability growth, and Von Kármán vortex shedding at moderate Reynolds numbers without empirical turbulence closures.",
    aboutFreeTitle: "✨ 100% Free & Open Source Project",
    aboutFreeDesc: "Open source software distributed under the MIT license. The entire source code is publicly accessible for research, education, and contributions.",
    aboutGithubLink: "GitHub Repository",
    aboutBiblioTitle: "📚 Scientific Bibliography & Credits (LBM Viewer Modes)",
    aboutBiblioDesc: "The Schroeder Replica (LBM Vorticity/Curl, Flowlines & Speed) visualization modes are based on the algorithm and research by:",
    biblioSchroeder: "Department of Physics, Weber State University. Creator of the Lattice-Boltzmann D2Q9 fluid simulation and curl/flowline visualization techniques (physics.weber.edu/schroeder/fluids/).",
    biblioPullan: "Cambridge University (Wind tunnel entry/exit boundary conditions for LBM).",
    biblioPohl: "Interactive Lattice Boltzmann Applet (LBA).",
    biblioWagner: "North Dakota State University (Lattice-Boltzmann codes & algorithms).",
    biblioSucci: "Succi, S. (2001), The Lattice Boltzmann Equation for Fluid Dynamics and Beyond, Oxford University Press.",
    btnAcceptAbout: "Got it, Explore Tunnel!",

    // Mobile Overlay
    mobileWarningTitle: "Desktop Experience Recommended",
    mobileWarningMsg: "For an optimal aerodynamic modeling and shape deformation experience, we recommend using a computer.",
    mobileWarningSub: "Touch controls have been enabled to move shapes, adjust angle of attack, and zoom.",
    mobileTipDrag: "1 Finger: Move obstacles, deform nodes, or pan view",
    mobileTipPinch: "2 Fingers: Pinch for smooth zoom",
    mobileWarningBtn: "Continue on Mobile",
    landscapeTitle: "Rotate your device horizontally",
    landscapeDesc: "Fluid tunnels require a panoramic canvas to properly visualize streamlines.",
    landscapeDesktopNotice: "💡 Recommended on PC for precise modeling.",
    btnRotateRequest: "🔄 Enable Landscape View",
    btnMobileScene: "Tunnel",
    btnMobileProps: "Fluid",
    btnCloseDrawer: "✕ Close",
    adLabel: "ADVERTISEMENT",
    btnDonate: "Donate",
    donateModalBadge: "COMMUNITY & OPEN SOURCE",
    donateModalTitle: "Support Ambystoma Technologies",
    donateModalSubtitle: "Empowering open science, free tools, and tailored deep-tech solutions",
    donateModalIntro: "At <strong>Ambystoma Technologies</strong>, alongside developing custom hardware and software solutions, we believe in democratizing access to science and computing. That is why we actively build and maintain <strong>100% free and Open Source tools</strong> for researchers, students, and lab professionals worldwide.<br><br>Donations directly fund infrastructure, ensure continuous maintenance, and empower us to keep creating public tools for everyone. Every contribution drives open science forward!",
    donateGlobalRegion: "Anywhere in the world",
    donateGlobalTitle: "PayPal International",
    donateGlobalLabel: "PayPal Account / Email:",
    donateCopyEmail: "Copy Email",
    donateCopied: "Copied! ✓",
    donateOpenPaypal: "Open PayPal ↗",
    donateArgRegion: "From Argentina",
    donateArgTitle: "Mercado Pago",
    donateArgAliasLabel: "Alias MP:",
    donateArgOwnerLabel: "Account Holder:",
    donateCopyAlias: "Copy Alias",
    donateFooterNote: "💡 Thank you for empowering Latin American deep tech and open scientific research.",
    donateCryptoRegion: "Decentralized / Web3",
    donateCryptoTitle: "Cryptocurrency",
    donateCryptoTabBtc: "Bitcoin (BTC)",
    donateCryptoTabEth: "Ethereum (ETH)",
    donateCryptoBtcLabel: "BTC Address (Native SegWit · BIP-84):",
    donateCryptoEthLabel: "ETH Address (Ethereum Network · ERC-20):",
    donateCopyBtc: "Copy BTC Address",
    donateCopyEth: "Copy ETH Address",
    donateCryptoBtcWarn: "<strong>SECURITY WARNING:</strong> Send only Bitcoin (BTC) to this address (Native SegWit BIP-84 format). Sending any other assets will result in permanent loss of your funds.",
    donateCryptoEthWarn: "<strong>SECURITY WARNING:</strong> Send only Ethereum (ETH) to this address (Ethereum ERC-20 network). Sending any other assets will result in permanent loss of your funds."
  },

  es: {
    // Meta & Encabezado
    pageTitle: "Simulador de Fluidos y Túnel de Viento 2D · Ambystoma Studio · Física en Tiempo Real",
    pageDesc: "Simulador interactivo 2D de mecánica de fluidos y túnel aerodinámico con solver Navier-Stokes, perfiles NACA deformables, cálculo en tiempo real de sustentación, arrastre y vórtices. 100% gratuito por Ambystoma Technologies.",
    brandTitle: "Simulador de Fluidos y Túnel 2D <span>Ambystoma Studio</span>",
    brandDesc: "Navier-Stokes en Tiempo Real, Resistencia Hidrodinámica, Sustentación y Formas Deformables",
    btnAbout: "Acerca de",
    btnAboutTitle: "Acerca de este simulador de fluidos y motor físico",
    securityBadgeText: "100% en Navegador",
    securityBadgeTitle: "Ejecución local en tu navegador con aceleración por Canvas",

    // Herramientas de la Barra Inferior
    btnSelect: "🔍 Mover / Rotar",
    btnSelectTitle: "Selecciona, traslada o rota figuras y varía el ángulo de ataque en tiempo real",
    btnNodeEdit: "✏️ Deformar Nodos",
    btnNodeEditTitle: "Haz clic y arrastra cualquier vértice para rediseñar o inventar figuras a mano",
    btnDrawFreehand: "✍️ Mano Alzada",
    btnDrawFreehandTitle: "Dibuja cualquier forma aerodinámica directamente y conviértela en un obstáculo suave",
    btnDrawPoly: "📐 Polígono",
    btnDrawPolyTitle: "Haz clic para definir vértices de alerones, cuñas o deflectores a medida",
    btnFinishDraw: "✅ Finalizar Polígono",
    btnFinishDrawTitle: "Cierra el polígono actual y conviértelo en un obstáculo en el túnel",
    btnProbe: "🎯 Sensor / Sonda",
    btnProbeTitle: "Coloca un sensor virtual tipo Pitot para medir velocidad, presión y vorticidad",

    // Botones Rápidos Dedicados
    btnAddAirfoil: "✈️ Agregar Perfil NACA",
    btnAddAirfoilTitle: "Inserta un perfil alar estándar NACA en el túnel",
    btnStopFlow: "⏹️ Detener Animación",
    btnStartFlow: "💨 Iniciar Animación",
    btnStopFlowTitle: "Corta el flujo de aire y permite que el fluido se desvanezca naturalmente",
    btnStartFlowTitle: "Reinicia el flujo de aire y el frente de onda desde la entrada del túnel",

    // Menú Desplegable de Figuras
    optAddShapes: "-- Agregar Figura Hidrodinámica --",
    optNaca0012: "Perfil Alar NACA 0012 (Simétrico)",
    optNaca2412: "Perfil Alar NACA 2412 (Asimétrico)",
    optCylinder: "Cilindro Circular (Calle de Vórtices)",
    optTeardrop: "Gota Aerodinámica (Mínimo Arrastre)",
    optFlatPlate: "Placa Plana (Ángulo de Ataque)",
    optSquare: "Cuerpo Cuadrado Romo (Desprendimiento)",
    optWedge: "Cuña Aerodinámica / Deflector",
    optCar: "Silueta de Bólido / Downforce",
    optVenturi: "Tobera Venturi / Estrangulamiento",

    optDemos: "Demos de Física...",
    optDemo1: "1. Perfil NACA 0012 (Sustentación y Líneas de Flujo)",
    optDemo2: "2. Calle de Vórtices de Von Kármán (Cilindro)",
    optDemo3: "3. Gota vs. Placa Plana (Comparación de Arrastre)",
    optDemo4: "4. Entrada en Pérdida / Stall (Alto Ángulo de Ataque)",
    optDemo5: "5. Efecto Venturi y Caída de Presión de Bernoulli",
    optDemo6: "6. Aerodinámica de Vehículo de Carreras y Estela",
    optDemo7: "7. Ala Multielemento con Ranura (Flap y Slat)",
    optDemo8: "8. Cuerpos Romos: Cuadrado vs. Cilindro",
    optDemo9: "9. Rebufo Aerodinámico (Drafting entre dos cuerpos)",
    optDemo10: "10. Tobera Convergente-Divergente",
    optDemo11: "11. Hidroala con Efecto Suelo",
    optDemo12: "12. Figura Orgánica Esculpida a Mano",
    optDemo13: "13. [LBM] Placa / Línea de Schroeder (Vórtices Físicos)",
    optDemo14: "14. [LBM] Cuña Aerodinámica con Turbulencia Real",
    optSchroederLine: "Línea / Placa de Schroeder (Calle de Vórtices)",

    // Panel Izquierdo: Elementos y Telemetría
    tabScene: "Escena / HUD",
    tabTools: "Herramientas",
    groupSimControl: "Control de Simulación",
    groupEditTools: "Herramientas y Nodos",
    groupShapes: "Agregar Cuerpos",
    groupVisDemos: "Visualización y Demos",
    lblDemos: "Demos Didácticas:",
    panelSceneTitle: "Obstáculos en el Túnel",
    panelTelemetryTitle: "Telemetría Aerodinámica (HUD)",
    lblDragForce: "Fuerza de Arrastre (Fd):",
    lblLiftForce: "Fuerza de Sustentación (Fl):",
    lblDragCoeff: "Coef. de Arrastre (Cd):",
    lblLiftCoeff: "Coef. de Sustentación (Cl):",
    lblEfficiency: "Eficiencia (L/D):",
    lblReynolds: "Número de Reynolds (Re):",
    lblAoA: "Ángulo de Ataque (α):",
    lblStagnationP: "Presión de Estancamiento (pMax):",
    lblWakeP: "Succión de Estela (pMin):",
    lblFlowRegime: "Régimen de Flujo:",
    regimeLaminar: "Flujo Laminar",
    regimeSeparated: "Pérdida / Desprendimiento (Stall)",
    regimeVortices: "Desprendimiento de Vórtices (Turbulento)",
    btnDeleteElement: "Eliminar Obstáculo",
    btnSaveScene: "💾 Guardar Escena",
    btnSaveSceneTitle: "Guarda la configuración del túnel en un archivo JSON",
    btnOpenScene: "📂 Abrir Escena",
    btnOpenSceneTitle: "Carga un túnel guardado previamente",
    btnImportImage: "🖼️ Abrir figura SVG / PNG",
    btnImportImageTitle: "Importa una figura SVG o PNG y convierte su contorno en un obstáculo interactivo",

    // Panel Derecho: Propiedades del Fluido
    panelPropertiesTitle: "Propiedades del Fluido y Túnel",
    gbFluidTitle: "Medio Fluido y Flujo de Entrada",
    lblInflowSpeed: "Velocidad del Flujo (U∞):",
    lblViscosity: "Viscosidad Cinemática (ν):",
    lblDensity: "Densidad del Fluido (ρ):",
    lblInflowAngle: "Ángulo de Dirección del Flujo:",
    lblFlowRegimeSelect: "Régimen de Flujo:",
    btnRegimeLaminar: "🌊 Flujo Laminar",
    btnRegimeTurbulent: "🌪️ Flujo Turbulento",
    lblTurbulenceIntensity: "Intensidad de Turbulencia (Tu):",
    btnPresetAir: "Aire",
    btnPresetWater: "Agua",
    btnPresetOil: "Aceite",
    btnPresetHoney: "Glicerina",
    btnPresetSuper: "Superfluido",
    chkShowParticles: "Partículas",

    gbTransformTitle: "Transformación y Ángulo de Ataque",
    gbVisTitle: "Visualización y Renderizado CFD / Físico",
    lblVisMode: "Modo de Vista CFD / Físico:",
    visSchroederCurl: "🌪️ Réplica Schroeder (LBM · Vorticidad y Turbulencia Física)",
    visSchroederFlowlines: "〰️ Schroeder LBM: Líneas de Flujo (Flowlines)",
    visSchroederSpeed: "⚡ Schroeder LBM: Magnitud de Velocidad",
    lblLbmContrast: "Contraste de Vorticidad (LBM):",
    visSmoke: "💨 Humo y Líneas de Corriente",
    visPressure: "📊 Mapa de Presión Estática (Pa)",
    visVelocity: "⚡ Magnitud de Velocidad (m/s)",
    visVorticity: "🌀 Vorticidad y Remolinos (s⁻¹)",
    visParticles: "✨ Trazadores de Partículas",
    visVectors: "🏹 Flechas de Vectores de Velocidad",
    chkSmoothCurve: "Curva Suave (Catmull-Rom)",
    chkShowForces: "Mostrar Vectores de Fuerza (Fd, Fl)",
    chkShowGrid: "Mostrar Rejilla del Túnel",
    chkClosedWalls: "Túnel Cerrado (Paredes Sólidas Arriba/Abajo)",
    chkPause: "Pausar Simulación (Barra espaciadora)",

    gbSolverTitle: "Motor Físico y Malla",
    lblGridRes: "Resolución de la Malla:",
    resFast: "Rápido (120 × 70)",
    resBalanced: "Equilibrado (160 × 90)",
    resHigh: "Alta Fidelidad (220 × 124)",
    lblSimSpeed: "Velocidad de Simulación:",

    // Barra Inferior
    btnClear: "🗑️ Limpiar Túnel",
    btnClearTitle: "Eliminar todos los obstáculos y reiniciar el flujo",
    statusReady: "Listo. Selecciona, deforma o añade figuras geométricas en el túnel.",
    statusNodeEdit: "Deformar Nodos: Arrastra cualquier vértice para cambiar la forma en vivo.",
    statusDrawFreehand: "Mano Alzada: Haz clic y arrastra en el lienzo para esculpir tu figura.",
    statusDrawPoly: "Polígono: Haz clic para añadir vértices y pulsa Finalizar al terminar.",
    statusCoords: "X: {x} m, Y: {y} m",

    // Modal Acerca de
    aboutModalTitle: "Acerca del Simulador de Fluidos 2D",
    aboutDevBadge: "Dinámica de Fluidos Computacional · Ambystoma Technologies",
    aboutDevDesc: "Suite interactiva de mecánica de fluidos y túnel de viento en tiempo real.",
    aboutAuthorCitationTitle: "🖋️ Autoría y Citación de la Herramienta",
    aboutAuthorRoleBadge: "Autor y Desarrollador",
    aboutAuthorText: "Esta herramienta interactiva de dinámica de fluidos y túnel de viento ha sido concebida, desarrollada y mantenida por <strong>Brandon Antonio Segura Torres</strong> CEO & Fundador de <strong>Ambystoma Technologies</strong>.",
    aboutCitationPrompt: "Si utilizas este simulador para investigaciones académicas, publicaciones científicas, proyectos de ingeniería o divulgación técnica, por favor cita la herramienta de la siguiente manera:",
    aboutCitationText: "Segura Torres, B. A. (2025). Simulador 2D de Fluidos y Túnel de Viento Interactivo [Software computacional]. Ambystoma Technologies. https://ambystomatechnologies.github.io/",
    aboutBtnCopyCitation: "Copiar Cita",
    aboutPhysicsTitle: "🔬 Aspectos Técnicos del Motor Físico",
    aboutPhysics1: "Resolución bidimensional completa de Navier-Stokes incompresible con proyección de presión.",
    aboutPhysics2: "Integración en superficie de presión y tensiones viscosas para cálculo de Drag Cd y Lift Cl.",
    aboutPhysics3: "Splines cerradas Catmull-Rom deformables interactivamente en tiempo real.",
    aboutPhysics4: "Filamentos de humo aerodinámico, partículas fluidas y visualización de vórtices de Von Kármán.",
    aboutNumericsTitle: "⚙️ Esquemas Numéricos y Modelado de Turbulencia",
    aboutNumericsNSHeader: "1. Solucionador Navier-Stokes Incompresible (Malla Euleriana)",
    aboutNumericsNS1: "<b>Esquema de Advección:</b> Advección Semi-Lagrangiana con integración Runge-Kutta de 2do orden (RK2) para el trazado hacia atrás e interpolación bilineal.",
    aboutNumericsNS2: "<b>Difusión Viscosa:</b> Formulación implícita resuelta iterativamente con relajación de Gauss-Seidel.",
    aboutNumericsNS3: "<b>Acoplamiento Presión-Velocidad:</b> Método de proyección de Chorin (descomposición Helmholtz-Hodge). Ecuación de Poisson resuelta iterativamente mediante Gauss-Seidel / SOR con diferencias finitas centrales.",
    aboutNumericsNS4: "<b>Turbulencia y Submalla:</b> Confinamiento de Vorticidad (Fedkiw, Stam, Jensen) para contrarrestar la disipación numérica, generador de turbulencia estocástica en la entrada (cascada de Kolmogorov) y perturbación calibrada con el número de Strouhal (St ≈ 0.22) en la estela de cuerpos romos.",
    aboutNumericsLBMHeader: "2. Motor Lattice-Boltzmann (LBM D2Q9)",
    aboutNumericsLBM1: "<b>Cinética y Colisión:</b> Retícula bidimensional D2Q9 con aproximación BGK de tiempo de relajación simple acoplado a la viscosidad cinemática (τ = 3ν + 0.5).",
    aboutNumericsLBM2: "<b>Streaming y Fronteras:</b> Propagación discreta libre de difusión numérica, rebote bounce-back en sólidos no-slip y condiciones de equilibrio en entrada/salida de túnel.",
    aboutNumericsLBM3: "<b>Dinámica Turbulenta:</b> Captura de forma natural inestabilidades, capas de cizalladura y desprendimiento de vórtices de Von Kármán a nivel mesoscópico sin requerir modelos empíricos de viscosidad turbulenta.",
    aboutFreeTitle: "✨ Proyecto 100% Open Source y Gratuito",
    aboutFreeDesc: "Software libre distribuido bajo la licencia MIT. Todo el código fuente está abierto a la comunidad para investigación, educación o contribuciones.",
    aboutGithubLink: "Repositorio en GitHub",
    aboutBiblioTitle: "📚 Bibliografía y Créditos Científicos (Visores Schroeder LBM)",
    aboutBiblioDesc: "Los modos de visualización Réplica Schroeder (LBM · Vorticidad/Curl, Líneas de Flujo y Rapidez) están basados en el algoritmo y trabajo de investigación de:",
    biblioSchroeder: "Department of Physics, Weber State University. Creador de la simulación de fluidos Lattice-Boltzmann (LBM D2Q9) y técnicas de visualización de curl/vorticidad y líneas de flujo (physics.weber.edu/schroeder/fluids/).",
    biblioPullan: "Cambridge University (código y condiciones de contorno de túnel de viento para simulación LBM).",
    biblioPohl: "Applet interactivo LBA (Lattice Boltzmann Applet).",
    biblioWagner: "North Dakota State University (algoritmos y códigos base de Lattice-Boltzmann).",
    biblioSucci: "Sauro Succi (2001), The Lattice Boltzmann Equation for Fluid Dynamics and Beyond, Oxford University Press.",
    btnAcceptAbout: "Entendido, ¡Comenzar!",

    // Cartel Móvil
    mobileWarningTitle: "Experiencia en Escritorio Recomendada",
    mobileWarningMsg: "Para una experiencia óptima de modelado aerodinámico y deformación de figuras, recomendamos usar computadora.",
    mobileWarningSub: "Se han habilitado controles táctiles para mover figuras, ajustar el ángulo de ataque y hacer zoom.",
    mobileTipDrag: "1 Dedo: Mueve obstáculos, deforma nodos o desplaza la vista",
    mobileTipPinch: "2 Dedos: Pellizca para zoom suave",
    mobileWarningBtn: "Continuar en Celular",
    landscapeTitle: "Gira tu teléfono horizontalmente",
    landscapeDesc: "Los túneles de fluidos requieren un lienzo panorámico para visualizar correctamente las líneas de corriente.",
    landscapeDesktopNotice: "💡 Recomendado en PC para un modelado preciso.",
    btnRotateRequest: "🔄 Activar Pantalla Horizontal",
    btnMobileScene: "Túnel",
    btnMobileProps: "Fluido",
    btnCloseDrawer: "✕ Cerrar",
    adLabel: "PUBLICIDAD",
    btnDonate: "Donar",
    donateModalBadge: "COMUNIDAD Y OPEN SOURCE",
    donateModalTitle: "Apoyar a Ambystoma Technologies",
    donateModalSubtitle: "Impulsando la ciencia abierta, herramientas gratuitas y tecnología de vanguardia",
    donateModalIntro: "En <strong>Ambystoma Technologies</strong>, además de desarrollar soluciones tecnológicas y científicas a medida, creemos firmemente en democratizar el acceso al conocimiento y la computación. Por ello, dedicamos gran parte de nuestro esfuerzo a crear y mantener <strong>herramientas 100% gratuitas y de código abierto (Open Source)</strong> para estudiantes, investigadores y laboratorios de todo el mundo.<br><br>Las donaciones nos permiten costear servidores, acelerar nuevas utilidades públicas y mantener vivas y actualizadas las herramientas disponibles. ¡Tu aporte voluntario hace una gran diferencia en la comunidad!",
    donateGlobalRegion: "De cualquier parte del mundo",
    donateGlobalTitle: "PayPal Internacional",
    donateGlobalLabel: "Cuenta / Correo de PayPal:",
    donateCopyEmail: "Copiar Correo",
    donateCopied: "¡Copiado! ✓",
    donateOpenPaypal: "Ir a PayPal ↗",
    donateArgRegion: "Desde Argentina",
    donateArgTitle: "Mercado Pago",
    donateArgAliasLabel: "Alias MP:",
    donateArgOwnerLabel: "Titular de la cuenta:",
    donateCopyAlias: "Copiar Alias",
    donateFooterNote: "💡 Muchas gracias por apoyar la investigación científica independiente y el desarrollo tecnológico latinoamericano.",
    donateCryptoRegion: "Descentralizado / Web3",
    donateCryptoTitle: "Criptomonedas",
    donateCryptoTabBtc: "Bitcoin (BTC)",
    donateCryptoTabEth: "Ethereum (ETH)",
    donateCryptoBtcLabel: "Dirección BTC (Native SegWit · BIP-84):",
    donateCryptoEthLabel: "Dirección ETH (Red Ethereum · ERC-20):",
    donateCopyBtc: "Copiar Dirección BTC",
    donateCopyEth: "Copiar Dirección ETH",
    donateCryptoBtcWarn: "<strong>AVISO DE SEGURIDAD:</strong> Envía únicamente Bitcoin (BTC) a esta dirección (formato Native SegWit BIP-84). Enviar otros activos resultará en la pérdida definitiva de tus fondos.",
    donateCryptoEthWarn: "<strong>AVISO DE SEGURIDAD:</strong> Envía únicamente Ethereum (ETH) a esta dirección (red Ethereum ERC-20). Enviar otros activos resultará en la pérdida definitiva de tus fondos."
  }
};

let currentLang = 'en'; // Por defecto inglés

function t(key, params = {}) {
  const dict = FLUID_I18N[currentLang] || FLUID_I18N['es'];
  let text = dict?.[key] || FLUID_I18N['en']?.[key] || FLUID_I18N['es']?.[key] || null;
  if (!text) {
    if (key === 'btnMobileScene') return (currentLang === 'en' ? 'Tunnel' : 'Túnel');
    if (key === 'btnMobileProps') return (currentLang === 'en' ? 'Fluid' : 'Fluido');
    return null;
  }
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(`{${k}}`, v);
  }
  return text;
}

function setLanguage(lang) {
  if (!FLUID_I18N[lang]) return;
  currentLang = lang;
  localStorage.setItem('fluid_sim_lang', lang);

  // Actualizar clases de botones de idioma
  const btnEn = document.getElementById('btn-lang-en');
  const btnEs = document.getElementById('btn-lang-es');
  if (btnEn) btnEn.classList.toggle('active', lang === 'en');
  if (btnEs) btnEs.classList.toggle('active', lang === 'es');

  // Traducir todos los elementos con atributos data-i18n (solo si existe traducción)
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (val) {
      el.innerHTML = val;
    }
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    const val = t(key);
    if (val) {
      el.title = val;
    }
  });

  // Traducir título del documento
  const pageTitle = t('pageTitle');
  if (pageTitle) document.title = pageTitle;
}

window.FLUID_I18N = FLUID_I18N;
window.t = t;
window.setLanguage = setLanguage;
window.currentLang = currentLang;
