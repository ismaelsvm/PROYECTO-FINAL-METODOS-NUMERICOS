# SimuMath Wi-Fi — Métodos Numéricos en Telecomunicaciones

**Proyecto académico · Universidad Nacional Mayor de San Marcos (UNMSM)**  
Plataforma web desarrollada y mantenida por el equipo de Ismael.

### [Abrir el laboratorio interactivo](https://ismaelsvm.github.io/PROYECTO-FINAL-METODOS-NUMERICOS/)

## ¿Qué hace?

SimuMath tiene como eje central un **experimento real de propagación Wi-Fi**:

1. **Simular:** configurar una red de 2.4/5 GHz, RSSI de referencia, distancia, exponente de pérdidas y obstáculos. Un receptor se aleja de un router y la curva teórica se construye automáticamente.
2. **Medir:** fijar un router y tomar entre 3 y 5 lecturas de RSSI (dBm) a distintas distancias (m) con una herramienta de medición Wi-Fi en un dispositivo.
3. **Importar:** descargar la plantilla **.xlsx** o **.csv**, registrar una fila por lectura y abrir ese archivo desde el navegador. También se puede pegar una tabla directamente.
4. **Analizar:** calcular promedios, desviación estándar muestral, regresión por mínimos cuadrados, interpolación de Lagrange, derivadas numéricas y un umbral mediante Newton-Raphson.
5. **Comparar:** confrontar el modelo inicial con las lecturas y exportar una tabla de resultados.

**Las lecturas cargadas no se envían a servidores:** los cálculos se ejecutan localmente en el navegador. La opción **“Probar con datos de demostración”** usa datos sintéticos claramente identificados; **no cuenta como experimento real**.

## Modelo físico

Se emplea un modelo logarítmico simplificado de pérdida con la distancia:

\[
RSSI(d)=RSSI(d_0)-10n\log_{10}\!\left(\frac{d}{d_0}\right)-L_{\mathrm{obst}}
\]

- **d**: distancia en metros, **d₀**: distancia de referencia.
- **n**: exponente de pérdida de propagación, ajustable.
- **L_obst**: pérdida adicional estimada por obstáculos, expresada en dB.
- **Banda de frecuencia**: se registra como característica del experimento; no se atribuye una penalización fija no justificada a 5 GHz.

El modelo es una aproximación educativa. La señal recibida varía por interferencias, multitrayecto, orientación, obstáculos y características del dispositivo. La distancia determinada a partir de un umbral **no garantiza** velocidad, disponibilidad ni cobertura.

## Formato de entrada

La plantilla incluye cuatro columnas:

| distancia_m | rssi_dbm | repeticion | observacion |
|---:|---:|---:|---|
| 1 | -40 | 1 | Sin pared |
| 1 | -42 | 2 | Sin pared |
| 2 | -47 | 1 | Sin pared |

Solo las dos primeras columnas son obligatorias. Se aceptan archivos \`.xlsx\`, \`.xls\`, \`.csv\`, además de texto tabulado. Deben existir valores de **distancia > 0** y RSSI en **dBm**.

El archivo descargable es una **plantilla vacía**: hay que registrar las lecturas obtenidas. Al importar, cada distancia se agrupa y se calcula promedio y desviación estándar. La regresión utiliza todas las lecturas y se realiza frente a \(\log_{10}(d/d_0)\).

## Métodos numéricos y resultados

| Método | Propósito |
|---|---|
| Mínimos cuadrados | Estimar un nuevo exponente de propagación \`n\` a partir de mediciones. |
| Interpolación local de Lagrange | Obtener el RSSI aproximado en una distancia dentro del intervalo medido. |
| Diferencias progresiva, central y regresiva | Estimar la pendiente en dBm/m, incluidas distancias desigualmente espaciadas. |
| Newton-Raphson | Encontrar la distancia en que el modelo cruza un umbral de RSSI. |
| MAE / RMSE | Cuantificar las diferencias entre mediciones y modelo en dB. |

**No se calcula error porcentual sobre valores negativos de dBm**; se utilizan errores absolutos y RMSE medidos en dB.

## Tecnologías

- HTML, CSS, JavaScript sin framework.
- [Chart.js](https://www.chartjs.org/) para curvas y puntos.
- [SheetJS](https://docs.sheetjs.com/) para importar y exportar hojas de cálculo.

## Laboratorios anteriores

Se conserva la [versión previa del dashboard](https://ismaelsvm.github.io/PROYECTO-FINAL-METODOS-NUMERICOS/laboratorios-originales.html) con los módulos originales de **Óptica LDR**, **RF / Drive-Test urbano** y **Turbidimetría**, además de sus implementaciones de Lagrange, RK4, Simpson y Newton-Raphson.

---

*UNMSM · Ingeniería de Telecomunicaciones · Proyecto de curso de Métodos Numéricos.*
