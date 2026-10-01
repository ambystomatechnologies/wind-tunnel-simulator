# 🌊 Simulador de Mecánica de Fluidos y Túnel Aerodinámico 2D · Ambystoma Studio
**Interactive 2D Navier-Stokes Fluid & Wind Tunnel Simulator for the Web**

[![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20100%25%20In--Browser-blue?style=for-the-badge)](index.html)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

Desarrollado por **[Ambystoma Technologies](https://ambystomatechnologies.github.io/)** · 100% Gratuito y de Código Abierto.

---

## ✨ Características Principales

- 🌊 **Ecuaciones de Navier-Stokes en Tiempo Real:** Resolución bidimensional completa de fluidos incompresibles con advección Semi-Lagrangiana RK2, difusión viscosa y proyección de presión Poisson con aceleración SOR a 60 FPS.
- 💨 **Túnel Aerodinámico y Filamentos de Humo:** Inyección de líneas de corriente continuas (streaklines) y miles de partículas trazadoras Lagrangianas que muestran la recirculación, estela turbulenta y vórtices.
- ✈️ **Perfiles Alares NACA Auténticos:** Generador de perfiles aerodinámicos estándar NACA de 4 dígitos (NACA 0012 simétrico, NACA 2412 sustentador, etc.) calculados con ecuaciones analíticas de curvatura y espesor.
- 🎯 **Telemetría Hidrodinámica en Vivo (HUD):**
  - **Fuerza y Coeficiente de Arrastre ($F_D, C_D$)**
  - **Fuerza y Coeficiente de Sustentación ($F_L, C_L$)**
  - **Eficiencia Aerodinámica ($L/D$)**
  - **Número de Reynolds ($Re$)**
  - **Ángulo de Ataque ($\alpha$) en tiempo real**
  - **Puntos de estancamiento de máxima presión y succión de extradós**
- ✏️ **Cuerpos Deformables y Edición de Nodos a Mano:** Mueve, rota y arrastra los vértices de cualquier figura directamente en el lienzo para esculpir alas y cuerpos aerodinámicos orgánicos mediante splines suaves Catmull-Rom. El fluido se adapta instantáneamente a las nuevas formas.
- 📐 **Herramientas de Geometría:** Cilindros, gotas aerodinámicas de mínimo arrastre, placas planas con ángulo de ataque, cuerpos cuadrados romos, cuñas deflectoras, silueta de bólido de carreras y tobera Venturi.
- 📊 **6 Modos de Visualización CFD:**
  1. Humo aerodinámico y líneas de corriente
  2. Mapa de presión estática (Pa, escala Cool-Warm de sustentación y estancamiento)
  3. Magnitud de velocidad (m/s, mapa térmico Jet/Viridis de aceleración Bernoulli)
  4. Vorticidad y remolinos ($\omega = \partial v/\partial x - \partial u/\partial y$, desprendimiento de Calle de Vórtices de Von Kármán)
  5. Flota de partículas luminiscentes
  6. Rejilla de flechas vectoriales de velocidad
- 📚 **12 Demos de Física de Fluidos:**
  1. Perfil NACA 0012 (Sustentación y líneas de flujo)
  2. Calle de Vórtices de Von Kármán tras cilindro
  3. Gota aerodinámica vs. Placa plana (Comparativa de resistencia)
  4. Entrada en pérdida (Stall) a alto ángulo de ataque
  5. Efecto Venturi y Tubo de Bernoulli
  6. Aerodinámica de bólido de carreras y carga trasera
  7. Ala multielemento con flap ranurado
  8. Cuerpos romos: Cuadrado vs. Cilindro
  9. Rebufo aerodinámico (Drafting entre vehículos)
  10. Tobera convergente-divergente
  11. Hidroala con efecto suelo
  12. Figura orgánica esculpida a mano
- 💾 **Guardar y Cargar Escenas:** Exporta e importa montajes de túnel en archivos `.json`.
- 🌐 **Totalmente Bilingüe:** Español e Inglés seleccionable con cambio en tiempo real.
- ⚡ **100% en Navegador:** Renderizado acelerado por Canvas, sin servidores externos.

---

## 🚀 Cómo Ejecutar en Local

1. Ejecuta con Python:
   ```bash
   python -m http.server 8082
   ```
   *(En Windows puedes hacer doble clic en `start.bat`)*
2. Abre en tu navegador web:
   ```text
   http://localhost:8082/index.html
   ```

---

## ⚙️ Esquemas Numéricos y Modelado de Turbulencia

El simulador implementa dos motores computacionales de dinámica de fluidos (CFD) de alto rendimiento en tiempo real:

### 1. Solucionador Navier-Stokes Incompresible (Malla Euleriana)
- **Esquema de Advección:** Advección Semi-Lagrangiana combinada con integración Runge-Kutta de 2do orden (RK2) para el trazado hacia atrás e interpolación bilineal espacial.
- **Difusión Viscosa:** Formulación implícita resuelta iterativamente mediante relajación de Gauss-Seidel.
- **Acoplamiento Presión-Velocidad:** Método de proyección de Chorin (descomposición de Helmholtz-Hodge). La ecuación de Poisson para la presión se resuelve iterativamente mediante Gauss-Seidel / SOR con diferencias finitas centrales.
- **Modelado de Turbulencia y Submalla:**
  - **Confinamiento de Vorticidad (Fedkiw, Stam y Jensen):** Restituye el momento angular y remolinos disipados por la viscosidad numérica de la malla.
  - **Generador de Turbulencia Estocástica:** Inyección en la entrada (inflow) mediante cascada espectral de Kolmogorov y cizalladura angular dinámica.
  - **Inestabilidad de Capa Límite:** Excitación periódica calibrada por número de Strouhal ($St \approx 0.22$) en la estela de cuerpos romos para el desprendimiento de vórtices de Von Kármán.

### 2. Motor Lattice-Boltzmann (LBM D2Q9)
- **Cinética de Red:** Retícula bidimensional D2Q9 con operador de colisión BGK (*Bhatnagar-Gross-Krook*) de tiempo de relajación simple acoplado a la viscosidad cinemática ($\tau = 3\nu + 0.5$).
- **Streaming y Condiciones de Contorno:** Paso de propagación discreta libre de difusión numérica, rebote *bounce-back* no-slip en obstáculos y condiciones de equilibrio en entrada y salida.
- **Dinámica Turbulenta:** Captura directa a nivel mesoscópico de inestabilidades, capas de cizalladura y vórtices a números de Reynolds moderados sin requerir cierres empíricos de viscosidad turbulenta.

---

## 📚 Bibliografía y Referencias Científicas

Los modos de visor y simulación **Schroeder LBM (Vorticidad/Curl, Flowlines y Magnitud de Velocidad)** están basados en el trabajo científico, didáctico y computacional de:

- **[Daniel V. Schroeder (Dan Schroeder)](https://physics.weber.edu/schroeder/fluids/)** — *Department of Physics, Weber State University, Ogden, Utah*. Creador de la simulación de fluidos Lattice-Boltzmann D2Q9 interactiva en Canvas, algoritmos de renderizado cromático de vorticidad (curl), paleta Jet, contraste perceptual dinámico y estelas de líneas de flujo (flowlines).
- **Graham Pullan** — *Cambridge University (Many-Core Group)*. Condiciones de contorno de túnel de viento para retículas Lattice-Boltzmann.
- **Thomas Pohl** — *Lattice Boltzmann Applet (LBA)*.
- **Lukas Wagner** — *North Dakota State University (NDSU)*. Códigos y algoritmos base de Lattice-Boltzmann.
- **Norbert Gonsalves & Sauro Succi** — Modelos teóricos y numéricos de la ecuación de Boltzmann (*The Lattice Boltzmann Equation for Fluid Dynamics and Beyond*, Oxford University Press).

---

© 2026 **[Ambystoma Technologies](https://ambystomatechnologies.github.io/)** · Desarrollando herramientas de ciencia y tecnología accesibles para todos.
