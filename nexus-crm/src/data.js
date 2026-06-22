// ─────────────────────────────────────────────────────────────
// DATOS — Sturla Viajes CRM (canal de Agencias)
// Datos ficticios pero realistas, basados en las excursiones reales
// publicadas en sturlaviajes.tur.ar
// ─────────────────────────────────────────────────────────────

// Paleta náutica de Sturla (Delta del Paraná)
export const BRAND = {
  abismo: "#0a2540",
  marea: "#0f3d63",
  turquesa: "#16a3b8",
  espuma: "#e6f4f7",
  arena: "#f5f3ee",
  verdeOk: "#16a34a",
  alerta: "#e11d48",
  sol: "#f59e0b",
};

// Usuarios internos del equipo (prototipo — NO usar contraseñas reales)
export const USUARIOS = [
  { user: "admin",   pass: "sturla2026", nombre: "Dirección Comercial", rol: "Administrador", inicial: "DC" },
  { user: "lucia",   pass: "delta",      nombre: "Lucía Fernández",     rol: "Ejecutiva de Agencias", inicial: "LF" },
  { user: "martin",  pass: "delta",      nombre: "Martín Gómez",        rol: "Ejecutivo de Agencias", inicial: "MG" },
  { user: "sofia",   pass: "delta",      nombre: "Sofía Ruiz",          rol: "Ejecutiva de Agencias", inicial: "SR" },
];

export const EJECUTIVOS = ["Lucía Fernández", "Martín Gómez", "Sofía Ruiz", "Diego Torres"];

// Excursiones reales de Sturla Viajes con tarifa de adulto vigente
export const EXCURSIONES = [
  { id: "delta-premium",   nombre: "Navegación Delta Premium",     salida: "Tigre / Puerto Madero", duracion: "1:50 hs", tarifa: 55000,  color: "#0f3d63" },
  { id: "paseo-5-rios",    nombre: "Paseo 5 Ríos",                 salida: "Tigre",                 duracion: "1:00 hs", tarifa: 22500,  color: "#16a3b8" },
  { id: "paseo-3-rios",    nombre: "Paseo 3 Ríos",                 salida: "Tigre",                 duracion: "1:15 hs", tarifa: 22500,  color: "#0e7490" },
  { id: "paseo-6-rios",    nombre: "Paseo 6 Ríos",                 salida: "Tigre",                 duracion: "2:00 hs", tarifa: 29500,  color: "#0891b2" },
  { id: "martin-garcia",   nombre: "Day Tour Isla Martín García",  salida: "Tigre",                 duracion: "8:00 hs", tarifa: 112000, color: "#155e75" },
  { id: "postales-bsas",   nombre: "Postales de Buenos Aires",     salida: "Puerto Madero / La Boca", duracion: "0:40 hs", tarifa: 22500, color: "#0284c7" },
  { id: "temaiken",        nombre: "Entrada a Temaikén",           salida: "Bus turístico",         duracion: "Día completo", tarifa: 52800, color: "#0d9488" },
];

// Estados de una agencia dentro del canal
export const ESTADOS_AGENCIA = {
  Activa:     { color: "#16a34a", bg: "#dcfce7", label: "Activa" },
  Prospecto:  { color: "#f59e0b", bg: "#fef3c7", label: "Prospecto" },
  Inactiva:   { color: "#64748b", bg: "#f1f5f9", label: "Inactiva" },
};

// Etapas del pipeline comercial (alta de nuevas agencias al canal)
export const ETAPAS = [
  { key: "contacto",    label: "Contacto inicial",      color: "#0891b2" },
  { key: "negociacion", label: "Negociación de tarifas", color: "#f59e0b" },
  { key: "activa",      label: "Agencia activada",       color: "#16a34a" },
  { key: "perdida",     label: "No prosperó",            color: "#e11d48" },
];

// ─────────────────────────────────────────────────────────────
// ZONAS geográficas para el mapa de calor del canal.
// ─────────────────────────────────────────────────────────────
export const ZONAS = {
  "CABA":            { label: "Ciudad de Buenos Aires", lat: -34.6037, lng: -58.3816 },
  "GBA Norte":       { label: "GBA Norte (Tigre / Z. Norte)", lat: -34.4264, lng: -58.5796 },
  "Costa Atlántica": { label: "Costa Atlántica", lat: -38.0055, lng: -57.5426 },
  "Litoral":         { label: "Litoral (Rosario / Santa Fe)", lat: -32.9442, lng: -60.6505 },
  "Cuyo":            { label: "Cuyo (Mendoza / San Juan)", lat: -32.8895, lng: -68.8458 },
  "Patagonia":       { label: "Patagonia (Bariloche / Sur)", lat: -41.1335, lng: -71.3103 },
  "NOA":             { label: "Noroeste (Salta / Jujuy)", lat: -24.7821, lng: -65.4232 },
};

// Mapea cada ciudad a su zona y coordenadas exactas
const CIUDADES = {
  "CABA":          { zona: "CABA",            lat: -34.6037, lng: -58.3816 },
  "Tigre":         { zona: "GBA Norte",       lat: -34.4264, lng: -58.5796 },
  "Mar del Plata": { zona: "Costa Atlántica", lat: -38.0055, lng: -57.5426 },
  "Rosario":       { zona: "Litoral",         lat: -32.9442, lng: -60.6505 },
  "Mendoza":       { zona: "Cuyo",            lat: -32.8895, lng: -68.8458 },
  "Bariloche":     { zona: "Patagonia",       lat: -41.1335, lng: -71.3103 },
  "Salta":         { zona: "NOA",             lat: -24.7821, lng: -65.4232 },
};

// Resuelve zona + coordenadas a partir de la ciudad (con jitter leve)
export const geoDeCiudad = (ciudad, seed = 0) => {
  const base = CIUDADES[ciudad] || { zona: "CABA", lat: -34.6037, lng: -58.3816 };
  const jitter = ((seed * 37) % 100) / 100 - 0.5;
  return { zona: base.zona, lat: base.lat + jitter * 0.12, lng: base.lng + jitter * 0.12 };
};

// Helper de reservas
const r = (fecha, excId, pax, ejecutivo, estado = "Confirmada") => {
  const exc = EXCURSIONES.find((e) => e.id === excId);
  return {
    id: `${excId}-${fecha}-${Math.random().toString(36).slice(2, 7)}`,
    fecha, excursion: exc.nombre, excId, pax, ejecutivo, estado,
    monto: exc.tarifa * pax,
  };
};

// Helper de visitas comerciales
const v = (fecha, nota) => ({ id: `vis-${fecha}-${Math.random().toString(36).slice(2, 6)}`, fecha, nota });

// AGENCIAS del canal
export const AGENCIAS = [
  {
    id: 1, nombre: "Travel Sur Operadora", contacto: "Marcela Ríos",
    email: "reservas@travelsur.com.ar", telefono: "+54 11 4555-1200",
    ciudad: "CABA", direccion: "Av. Corrientes 1234, CABA",
    zona: "CABA", lat: -34.6037, lng: -58.3816,
    estado: "Activa", ejecutivo: "Lucía Fernández", desde: "2024-03-12",
    reservas: [
      r("2026-06-19", "delta-premium", 14, "Lucía Fernández"),
      r("2026-06-15", "martin-garcia", 8, "Lucía Fernández"),
      r("2026-06-10", "paseo-5-rios", 22, "Lucía Fernández"),
      r("2026-05-28", "delta-premium", 18, "Lucía Fernández"),
      r("2026-05-14", "temaiken", 30, "Lucía Fernández"),
      r("2026-04-30", "paseo-6-rios", 12, "Lucía Fernández"),
    ],
    visitas: [
      v("2026-06-05", "Reunión por tarifas de temporada alta. Interesados en sumar Temaikén a sus paquetes."),
      v("2026-04-18", "Presentación de nuevas excursiones. Buena recepción del Day Tour."),
    ],
  },
  {
    id: 2, nombre: "Receptivo Buenos Aires", contacto: "Gonzalo Pérez",
    email: "ops@receptivoba.com", telefono: "+54 11 4777-8800",
    ciudad: "CABA", direccion: "Florida 537, CABA",
    zona: "CABA", lat: -34.5998, lng: -58.3742,
    estado: "Activa", ejecutivo: "Martín Gómez", desde: "2023-11-05",
    reservas: [
      r("2026-06-20", "postales-bsas", 35, "Martín Gómez"),
      r("2026-06-18", "delta-premium", 20, "Martín Gómez"),
      r("2026-06-08", "martin-garcia", 16, "Martín Gómez", "Pendiente"),
      r("2026-05-22", "postales-bsas", 40, "Martín Gómez"),
      r("2026-05-03", "paseo-3-rios", 25, "Martín Gómez"),
    ],
    visitas: [
      v("2026-06-12", "Cierre de acuerdo para grupos de cruceristas. Volumen alto en Postales BA."),
    ],
  },
  {
    id: 3, nombre: "Delta Tours Mayorista", contacto: "Verónica Alsina",
    email: "comercial@deltatours.tur.ar", telefono: "+54 11 4322-6655",
    ciudad: "Tigre", direccion: "Av. Cazón 1450, Tigre",
    zona: "GBA Norte", lat: -34.4264, lng: -58.5796,
    estado: "Activa", ejecutivo: "Sofía Ruiz", desde: "2024-07-21",
    reservas: [
      r("2026-06-21", "paseo-5-rios", 28, "Sofía Ruiz"),
      r("2026-06-17", "paseo-6-rios", 19, "Sofía Ruiz"),
      r("2026-06-02", "delta-premium", 24, "Sofía Ruiz"),
      r("2026-05-19", "paseo-5-rios", 31, "Sofía Ruiz"),
    ],
    visitas: [
      v("2026-06-09", "Visita a oficina en Tigre. Coordinamos disponibilidad de lanchas para fines de semana."),
      v("2026-05-10", "Renovación de convenio anual."),
    ],
  },
  {
    id: 4, nombre: "Patagonia Incoming", contacto: "Hernán Costa",
    email: "grupos@patagoniaincoming.com", telefono: "+54 294 442-1100",
    ciudad: "Bariloche", direccion: "Mitre 320, San Carlos de Bariloche",
    zona: "Patagonia", lat: -41.1335, lng: -71.3103,
    estado: "Prospecto", ejecutivo: "Diego Torres", desde: "2026-06-01",
    reservas: [
      r("2026-06-12", "martin-garcia", 6, "Diego Torres", "Pendiente"),
    ],
    visitas: [
      v("2026-06-01", "Primer contacto en feria de turismo. Envío de tarifario mayorista pendiente."),
    ],
  },
  {
    id: 5, nombre: "City Travel Agency", contacto: "Paula Méndez",
    email: "info@citytravel.com.ar", telefono: "+54 11 4890-3344",
    ciudad: "CABA", direccion: "Av. de Mayo 760, CABA",
    zona: "CABA", lat: -34.6086, lng: -58.3776,
    estado: "Activa", ejecutivo: "Lucía Fernández", desde: "2025-01-18",
    reservas: [
      r("2026-06-16", "temaiken", 22, "Lucía Fernández"),
      r("2026-06-05", "postales-bsas", 30, "Lucía Fernández"),
      r("2026-05-25", "delta-premium", 15, "Lucía Fernández", "Cancelada"),
    ],
    visitas: [
      v("2026-05-30", "Reclamo por cancelación de grupo. Resuelto con reprogramación."),
    ],
  },
  {
    id: 6, nombre: "Norte Viajes Operador", contacto: "Esteban Vidal",
    email: "reservas@norteviajes.tur.ar", telefono: "+54 387 421-9988",
    ciudad: "Salta", direccion: "España 650, Salta Capital",
    zona: "NOA", lat: -24.7821, lng: -65.4232,
    estado: "Inactiva", ejecutivo: "Martín Gómez", desde: "2024-02-09",
    reservas: [
      r("2026-03-14", "paseo-5-rios", 18, "Martín Gómez"),
      r("2026-02-28", "paseo-3-rios", 12, "Martín Gómez"),
    ],
    visitas: [
      v("2026-03-01", "Sin operaciones recientes. Evaluar reactivación para temporada de invierno."),
    ],
  },
];

// Pipeline de captación de nuevas agencias
export const PIPELINE_INICIAL = [
  { id: 201, agencia: "Mundo Joven Travel",    ciudad: "CABA",          valorMes: 180000, ejecutivo: "Lucía Fernández", etapa: "contacto" },
  { id: 202, agencia: "Andes Receptivo",       ciudad: "Mendoza",       valorMes: 240000, ejecutivo: "Sofía Ruiz",      etapa: "contacto" },
  { id: 203, agencia: "Litoral Tour Operator", ciudad: "Rosario",       valorMes: 320000, ejecutivo: "Martín Gómez",    etapa: "negociacion" },
  { id: 204, agencia: "Sol y Río Viajes",      ciudad: "Tigre",         valorMes: 150000, ejecutivo: "Diego Torres",    etapa: "negociacion" },
  { id: 205, agencia: "Travel Sur Operadora",  ciudad: "CABA",          valorMes: 450000, ejecutivo: "Lucía Fernández", etapa: "activa" },
  { id: 206, agencia: "Costa Azul Tours",      ciudad: "Mar del Plata", valorMes: 90000,  ejecutivo: "Martín Gómez",    etapa: "perdida" },
];

// Serie mensual de pasajeros e ingresos del canal de agencias
export const DATOS_MENSUALES = [
  { mes: "Ene", pax: 320, ingresos: 9800 },
  { mes: "Feb", pax: 410, ingresos: 12400 },
  { mes: "Mar", pax: 380, ingresos: 11600 },
  { mes: "Abr", pax: 520, ingresos: 15800 },
  { mes: "May", pax: 610, ingresos: 18900 },
  { mes: "Jun", pax: 680, ingresos: 21300 },
];

export const fmt = (n) => "$" + Math.round(n).toLocaleString("es-AR");
export const fmtK = (n) => "$" + n.toLocaleString("es-AR") + "K";

export const totalPax = (ag) =>
  ag.reservas.filter((x) => x.estado !== "Cancelada").reduce((s, x) => s + x.pax, 0);

export const totalFacturado = (ag) =>
  ag.reservas.filter((x) => x.estado === "Confirmada").reduce((s, x) => s + x.monto, 0);

// Agregación por zona para el mapa de calor
export const resumenPorZona = (agencias) => {
  const acc = {};
  for (const ag of agencias) {
    const zonaKey = ag.zona || "CABA";
    if (!acc[zonaKey]) {
      acc[zonaKey] = {
        zona: zonaKey,
        label: ZONAS[zonaKey]?.label || zonaKey,
        lat: ZONAS[zonaKey]?.lat ?? -34.6,
        lng: ZONAS[zonaKey]?.lng ?? -58.4,
        pax: 0, facturacion: 0, agencias: 0, activas: 0,
      };
    }
    acc[zonaKey].pax += totalPax(ag);
    acc[zonaKey].facturacion += totalFacturado(ag);
    acc[zonaKey].agencias += 1;
    if (ag.estado === "Activa") acc[zonaKey].activas += 1;
  }
  return Object.values(acc).sort((a, b) => b.facturacion - a.facturacion);
};
