# 🌊 2D Fluid Dynamics & Wind Tunnel Simulator · Ambystoma Studio
**Interactive 2D Navier-Stokes Fluid & Wind Tunnel Simulator for the Web**

[![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20100%25%20In--Browser-blue?style=for-the-badge)](index.html)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

Developed by **[Ambystoma Technologies](https://ambystomatechnologies.github.io/)** · 100% Free and Open Source.

---

## ✨ Key Features

- 🌊 **Real-Time Navier-Stokes Equations:** Full 2D incompressible fluid solver featuring RK2 Semi-Lagrangian advection, implicit viscous diffusion, and Poisson pressure projection with SOR acceleration running at 60 FPS.
- 💨 **Wind Tunnel & Smoke Streamlines:** Injection of continuous streaklines and thousands of Lagrangian tracer particles revealing flow recirculation, turbulent wakes, and vortex shedding.
- ✈️ **Authentic NACA Airfoils:** Standard 4-digit NACA airfoil generator (symmetric NACA 0012, cambered high-lift NACA 2412, etc.) computed from analytical thickness and mean camber line equations.
- 🎯 **Live Hydrodynamic Telemetry (HUD):**
  - **Drag Force & Coefficient ($F_D, C_D$)**
  - **Lift Force & Coefficient ($F_L, C_L$)**
  - **Aerodynamic Efficiency ($L/D$)**
  - **Reynolds Number ($Re$)**
  - **Real-Time Angle of Attack ($\alpha$)**
  - **Leading edge stagnation points and upper-surface suction peaks**
- ✏️ **Deformable Bodies & Hand Node Editing:** Move, rotate, and interactively drag vertices of any geometry directly on the canvas to sculpt wings and organic aerodynamic bodies using smooth Catmull-Rom splines. The fluid flow adapts instantaneously to deformed shapes.
- 📐 **Geometry Tools:** Circular cylinders, minimum-drag aerodynamic teardrops, flat plates with angle of attack, bluff square bodies, wedge deflectors, racing car silhouettes, and Venturi nozzles.
- 📊 **6 CFD Visualization Modes:**
  1. Aerodynamic smoke and streamlines
  2. Static pressure field (Pa, Cool-Warm scale showing stagnation and suction)
  3. Flow velocity magnitude (m/s, Jet/Viridis colormap showing Bernoulli acceleration)
  4. Vorticity and eddies ($\omega = \partial v/\partial x - \partial u/\partial y$, Von Kármán vortex street shedding)
  5. Fleet of glow tracer particles
  6. Vector velocity arrow grid
- 📚 **12 Fluid Physics Demos:**
  1. NACA 0012 Airfoil (Lift & streamlines)
  2. Von Kármán Vortex Street behind a cylinder
  3. Aerodynamic Teardrop vs. Flat Plate (Drag comparison)
  4. Aerodynamic Stall at high angle of attack
  5. Venturi Effect & Bernoulli Tube
  6. Race Car Aerodynamics & Downforce
  7. Multi-Element Wing with slotted flap
  8. Bluff Bodies: Square vs. Cylinder
  9. Aerodynamic Drafting between vehicles
  10. Convergent-Divergent Nozzle
  11. Hydrofoil in Ground Effect
  12. Hand-Sculpted Organic Body
- 💾 **Save & Load Scenes:** Export and import complete wind tunnel setups as `.json` files.
- 🌐 **Fully Bilingual:** English and Spanish toggleable with real-time live switching.
- ⚡ **100% In-Browser:** Canvas hardware-accelerated rendering with zero external server dependencies.

---

## 🚀 How to Run Locally

1. Run with Python:
   ```bash
   python -m http.server 8082
   ```
   *(On Windows, you can also double-click `start.bat`)*
2. Open in your web browser:
   ```text
   http://localhost:8082/index.html
   ```

---

## ⚙️ Numerical Schemes & Turbulence Modeling

The simulator implements two high-performance real-time computational fluid dynamics (CFD) engines:

### 1. Incompressible Navier-Stokes Solver (Eulerian Grid)
- **Advection Scheme:** Semi-Lagrangian advection integrated with 2nd-order Runge-Kutta (RK2) trajectory back-tracing and bilinear spatial interpolation.
- **Viscous Diffusion:** Implicit formulation solved iteratively via Gauss-Seidel relaxation.
- **Pressure-Velocity Coupling:** Chorin projection method (Helmholtz-Hodge decomposition). The Poisson equation for pressure is solved iteratively using Gauss-Seidel / SOR with central finite differences.
- **Turbulence Modeling & Subgrid Treatment:**
  - **Vorticity Confinement (Fedkiw, Stam, and Jensen):** Restores angular momentum and coherent eddies dissipated by numerical grid viscosity.
  - **Stochastic Turbulence Generator:** Inflow perturbation modeled after the Kolmogorov spectral cascade with dynamic angular shear.
  - **Boundary Layer Instability:** Periodic excitation calibrated with the Strouhal number ($St \approx 0.22$) in the wake of bluff bodies to trigger authentic Von Kármán vortex shedding.

### 2. Lattice Boltzmann Method Engine (LBM D2Q9)
- **Lattice Kinetics:** Two-dimensional D2Q9 lattice with single-relaxation-time BGK (*Bhatnagar-Gross-Krook*) collision operator coupled to kinematic viscosity ($\tau = 3\nu + 0.5$).
- **Streaming & Boundary Conditions:** Discrete streaming step free of numerical diffusion, half-way bounce-back scheme on no-slip solid obstacles, and equilibrium boundary conditions for tunnel inlet and outlet.
- **Turbulent Dynamics:** Mesoscopic resolution directly capturing shear layers, flow instabilities, and vortex shedding at moderate Reynolds numbers without requiring empirical turbulence closures.

---

## 📚 Scientific Bibliography & References

The **Schroeder LBM (Vorticity/Curl, Flowlines, and Speed Magnitude)** visualization and simulation modes are based on the scientific, educational, and computational work of:

- **[Daniel V. Schroeder (Dan Schroeder)](https://physics.weber.edu/schroeder/fluids/)** — *Department of Physics, Weber State University, Ogden, Utah*. Creator of the interactive Canvas Lattice-Boltzmann D2Q9 fluid simulation, chromatic vorticity (curl) rendering algorithms, Jet colormap, dynamic perceptual contrast, and flowline tracers.
- **Graham Pullan** — *Cambridge University (Many-Core Group)*. Wind tunnel boundary conditions for Lattice-Boltzmann grids.
- **Thomas Pohl** — *Lattice Boltzmann Applet (LBA)*.
- **Lukas Wagner** — *North Dakota State University (NDSU)*. Lattice-Boltzmann base algorithms and codes.
- **Norbert Gonsalves & Sauro Succi** — Theoretical and numerical foundations of the Boltzmann equation (*The Lattice Boltzmann Equation for Fluid Dynamics and Beyond*, Oxford University Press).

---

## 🖋️ Author & Academic Citation

This interactive 2D fluid dynamics and wind tunnel simulation suite was conceived, designed, and developed by **Brandon Antonio Segura Torres** CEO & Founder of **Ambystoma Technologies**.

If you use this tool in academic research, scientific papers, engineering theses, or educational presentations, please cite it as:

```text
Segura Torres, B. A. (2026). 2D Fluid Dynamics & Wind Tunnel Simulator [Software]. Ambystoma Technologies. https://ambystomatechnologies.github.io/
```

---

© 2026 **[Ambystoma Technologies](https://ambystomatechnologies.github.io/)** · Developing open science and technology accessible to everyone.
