// Puente a Lightweight Charts: re-exporta SOLO lo que usa el panel. Con una
// re-exportación estática Rollup recorta el resto de la librería (velas,
// histogramas, plugins, series personalizadas); un import('lightweight-charts')
// directo se llevaba el paquete entero (63 KB gz). El panel importa este
// archivo de forma dinámica al entrar en viewport.
//
// `createSeriesMarkers` es la marca del máximo y del mínimo del periodo: en la
// v5 los marcadores dejaron de ser un método de la serie y son un plugin
// aparte, así que hay que traerlo por su nombre para que entre en el recorte.
// LineSeries lo usa el comparador (/market/compare): varias series en el mismo
// lienzo, sin área rellena — con dos o tres rellenos encimados no se ve nada.
export { createChart, createSeriesMarkers, AreaSeries, LineSeries, ColorType, LineStyle, LineType, CrosshairMode, TrackingModeExitMode } from 'lightweight-charts';
