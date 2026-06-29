// ─────────────────────────────────────────────────────────────
// src/lib/escalas.js
// Lógica PURA de cálculo de tramos de descuento para sindicatos (B2B).
// No depende de React ni de Supabase: se usa igual en el preview en vivo
// de la UI y en la capa de guardado. La verdad final la garantizan las
// restricciones de la base de datos (UNIQUE por mes, CHECK de umbrales).
// ─────────────────────────────────────────────────────────────

export const MESES_NOMBRE = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// Dada una cantidad de pasajeros y los tramos de una matriz, devuelve el
// tramo alcanzado y el % de descuento YA topeado por la política de margen.
// Si algo no cierra, devuelve { error } en vez de tirar excepción (mejor UX).
export function calcularTramo(pasajeros, tramos, topeGlobal, topeSindicato) {
  if (!Array.isArray(tramos) || tramos.length === 0) {
    return { error: "El sindicato no tiene una matriz de escalas asignada." };
  }
  const n = Number(pasajeros);
  if (!Number.isFinite(n) || n < 0) {
    return { error: "Ingresá una cantidad de pasajeros válida (0 o más)." };
  }

  const tramo = [...tramos]
    .sort((a, b) => a.umbralMin - b.umbralMin)
    .find((t) => n >= t.umbralMin && (t.umbralMax == null || n <= t.umbralMax));

  if (!tramo) {
    return { error: "La matriz no cubre esa cantidad de pasajeros. Revisá los umbrales." };
  }

  const tope = topeSindicato ?? topeGlobal ?? Infinity;
  const descuentoFinal = Math.min(tramo.descuento, tope);

  return {
    error: null,
    tramo: tramo.tramo,
    nombreTramo: tramo.nombreTramo || `Tramo ${tramo.tramo}`,
    descuentoSugerido: tramo.descuento,
    descuentoFinal,
    topeado: descuentoFinal < tramo.descuento, // para avisar "se topeó por margen"
  };
}

// El descuento calculado en el mes (anio, mes) rige el MES SIGUIENTE.
// Devuelve un Date al primer día de ese mes.
export function primerDiaMesSiguiente(anio, mes /* 1-12 */) {
  return mes >= 12 ? new Date(anio + 1, 0, 1) : new Date(anio, mes, 1);
}

// "YYYY-MM-DD" del primer día del mes siguiente (para guardar en la BD).
export function fechaAplicaDesde(anio, mes) {
  return primerDiaMesSiguiente(anio, mes).toISOString().slice(0, 10);
}

export function formatFecha(d) {
  if (!d) return "—";
  const f = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(f.getTime())) return "—";
  return f.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function periodoLabel(anio, mes) {
  return `${MESES_NOMBRE[mes - 1] || "?"} ${anio}`;
}

// Etiqueta corta para gráficos: "Jun 26".
export function periodoCorto(anio, mes) {
  return `${(MESES_NOMBRE[mes - 1] || "?").slice(0, 3)} ${String(anio).slice(2)}`;
}

// Orden cronológico.
export const ordenarCargasDesc = (a, b) => b.anio - a.anio || b.mes - a.mes;
export const ordenarCargasAsc = (a, b) => a.anio - b.anio || a.mes - b.mes;

// Promedio de pasajeros de las últimas N cargas.
export function promedioUltimos(cargas, n = 3) {
  const muestra = [...cargas].sort(ordenarCargasDesc).slice(0, n);
  if (muestra.length === 0) return null;
  return Math.round(muestra.reduce((s, c) => s + c.pasajeros, 0) / muestra.length);
}

// Máximo histórico de pasajeros.
export function maxHistorico(cargas) {
  return cargas.reduce((m, c) => Math.max(m, c.pasajeros), 0);
}

// Caída abrupta: pasajeros muy por debajo del promedio reciente (default -35%).
export function esCaidaAbrupta(pasajeros, promedio, umbral = 0.35) {
  if (promedio == null || promedio === 0) return false;
  return pasajeros < promedio * (1 - umbral);
}

// Posible error de tipeo: muy por encima del máximo histórico (default x3).
export function esSaltoSospechoso(pasajeros, maxHist, factor = 3) {
  if (!maxHist) return false;
  return pasajeros > maxHist * factor;
}
