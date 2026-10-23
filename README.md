#  Proyecto Final: Métodos Numéricos en Telecomunicaciones - UNMSM

Este repositorio contiene el modelado matemático, la resolución numérica y la simulación interactiva de fenómenos de atenuación de señales aplicados a la Ingeniería de Telecomunicaciones.

##  Sobre el Simulador Web (Dashboard)
El proyecto incluye un **Dashboard Analítico** (Single Page Application) que permite visualizar y experimentar con los modelos en tiempo real.

**[ABRIR EL SIMULADOR INTERACTIVO](https://ismaelsvm.github.io/PROYECTO-FINAL-METODOS-NUMERICOS/)**

Versión publicada y mantenida en el GitHub de **Ismael** (`ismaelsvm`), como base para nuevas mejoras. Proyecto original: [ItaloUNMSM/PROYECTO-FINAL-METODOS-NUMERICOS](https://github.com/ItaloUNMSM/PROYECTO-FINAL-METODOS-NUMERICOS).

##  Laboratorios Incluidos
1. **Óptica LDR (Escala Laboratorio):** Simulación de atenuación geométrica de luz en espacio libre.
2. **Despliegue RF (Drive-Test Urbano):** Modelado de pérdida de trayectoria (Path Loss) afectada por densidad urbanística.
3. **Turbidímetro Industrial:** Aplicación de absorción en fluidos (Ley de Beer-Lambert) para sistemas de monitoreo continuo.

##  Métodos Numéricos Aplicados
El simulador ejecuta en tiempo real los siguientes algoritmos sobre los datos recolectados:
* **Interpolación (Lagrange Local):** Para estimar valores ciegos eludiendo el Fenómeno de Runge.
* **Ecuaciones Diferenciales Ordinarias (Runge-Kutta 4to Orden):** Para resolver la envolvente teórica de la señal (EDO Logística y Absorción Lineal).
* **Integración Numérica (Simpson 1/3):** Para calcular densidades espectrales y áreas bajo la curva.
* **Raíces de Ecuaciones (Newton-Raphson):** Para localizar límites exactos de cobertura (Sensibilidad RX) y umbrales de alarmas industriales.

##  Tecnologías
* HTML5, CSS3 (Glassmorphism UI)
* JavaScript (Vanilla JS para algoritmos numéricos)
* Chart.js (Renderizado de gráficas dinámicas)
* MathJax (Renderizado tipográfico de ecuaciones LaTeX)

---
*Universidad Nacional Mayor de San Marcos (UNMSM) - Ingeniería de Telecomunicaciones*
