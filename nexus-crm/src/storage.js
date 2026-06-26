import { supabase, supabaseHabilitado } from "./supabaseClient";

// ─────────────────────────────────────────────────────────────
// Mapeo entre el formato del CRM (camelCase) y las columnas de
// Supabase (snake_case). Mantiene el resto de campos intactos.
// ─────────────────────────────────────────────────────────────
const agenciaToDB = (a) => ({
  id: a.id,
  nombre: a.nombre,
  contacto: a.contacto,
  email: a.email,
  telefono: a.telefono,
  ciudad: a.ciudad,
  direccion: a.direccion,
  zona: a.zona,
  lat: a.lat,
  lng: a.lng,
  estado: a.estado,
  ejecutivo: a.ejecutivo,
  desde: a.desde,
  condicion_pago: a.condicionPago || null,
  etapa_captacion: a.etapaCaptacion || null,
  precios: a.precios || {},
  reservas: a.reservas || [],
  visitas: a.visitas || [],
  pax_anual: a.paxAnual ?? null,
  meses_import: a.mesesImport || null,
});

const agenciaFromDB = (r) => ({
  id: r.id,
  nombre: r.nombre,
  contacto: r.contacto,
  email: r.email,
  telefono: r.telefono,
  ciudad: r.ciudad,
  direccion: r.direccion,
  zona: r.zona,
  lat: r.lat,
  lng: r.lng,
  estado: r.estado,
  ejecutivo: r.ejecutivo,
  desde: r.desde,
  condicionPago: r.condicion_pago || undefined,
  etapaCaptacion: r.etapa_captacion || undefined,
  precios: r.precios || {},
  reservas: r.reservas || [],
  visitas: r.visitas || [],
  paxAnual: r.pax_anual ?? undefined,
  mesesImport: r.meses_import || undefined,
});

const productoToDB = (p) => ({
  id: p.id,
  nombre: p.nombre,
  salida: p.salida,
  duracion: p.duracion,
  precio_base: p.precioBase,
  color: p.color,
  activo: p.activo,
});

const productoFromDB = (r) => ({
  id: r.id,
  nombre: r.nombre,
  salida: r.salida,
  duracion: r.duracion,
  precioBase: r.precio_base,
  color: r.color,
  activo: r.activo,
});

// ─────────────────────────────────────────────────────────────
// Cargar todo desde Supabase. Si las tablas están vacías,
// siembra con los datos de ejemplo recibidos.
// Devuelve { agencias, productos } o null si Supabase no está activo.
// ─────────────────────────────────────────────────────────────
export async function cargarDatos(semillaAgencias, semillaProductos) {
  if (!supabaseHabilitado) return null;

  const [agRes, prRes] = await Promise.all([
    supabase.from("agencias").select("*"),
    supabase.from("productos").select("*"),
  ]);

  if (agRes.error) throw agRes.error;
  if (prRes.error) throw prRes.error;

  let agencias = (agRes.data || []).map(agenciaFromDB);
  let productos = (prRes.data || []).map(productoFromDB);

  // Sembrar productos si está vacío
  if (productos.length === 0 && semillaProductos?.length) {
    await supabase.from("productos").upsert(semillaProductos.map(productoToDB));
    productos = semillaProductos;
  }

  // Sembrar agencias si está vacío
  if (agencias.length === 0 && semillaAgencias?.length) {
    await supabase.from("agencias").upsert(semillaAgencias.map(agenciaToDB));
    agencias = semillaAgencias;
  }

  return { agencias, productos };
}

// ─────────────────────────────────────────────────────────────
// Guardar (upsert) la lista completa de agencias / productos.
// Maneja además el borrado: elimina de la nube los que ya no están.
// ─────────────────────────────────────────────────────────────
export async function guardarAgencias(agencias) {
  if (!supabaseHabilitado) return;
  // IDs actuales
  const ids = agencias.map((a) => a.id);
  // Upsert de todos
  const { error } = await supabase.from("agencias").upsert(agencias.map(agenciaToDB));
  if (error) throw error;
  // Borrar los que ya no existen (si hay alguno en la nube fuera de esta lista)
  if (ids.length) {
    await supabase.from("agencias").delete().not("id", "in", `(${ids.join(",")})`);
  } else {
    await supabase.from("agencias").delete().neq("id", -1);
  }
}

export async function guardarProductos(productos) {
  if (!supabaseHabilitado) return;
  const ids = productos.map((p) => `"${p.id}"`);
  const { error } = await supabase.from("productos").upsert(productos.map(productoToDB));
  if (error) throw error;
  if (ids.length) {
    await supabase.from("productos").delete().not("id", "in", `(${ids.join(",")})`);
  }
}

// ─────────────────────────────────────────────────────────────
// AUTENTICACIÓN (login real con Supabase Auth)
// ─────────────────────────────────────────────────────────────
export async function signIn(email, password) {
  if (!supabaseHabilitado) throw new Error("Supabase no está configurado");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  if (!supabaseHabilitado) return;
  await supabase.auth.signOut();
}

export async function getSession() {
  if (!supabaseHabilitado) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthChange(callback) {
  if (!supabaseHabilitado) return { data: { subscription: { unsubscribe() {} } } };
  return supabase.auth.onAuthStateChange((_event, session) => callback(session));
}

// ─────────────────────────────────────────────────────────────
// EQUIPO (miembros: ejecutivos y líderes)
// ─────────────────────────────────────────────────────────────
const miembroToDB = (m) => ({
  id: m.id,
  nombre: m.nombre,
  rol: m.rol || "Ejecutivo",
  activo: m.activo !== false,
});
const miembroFromDB = (r) => ({
  id: r.id,
  nombre: r.nombre,
  rol: r.rol || "Ejecutivo",
  activo: r.activo !== false,
});

export async function fetchEquipo() {
  if (!supabaseHabilitado) return [];
  const { data, error } = await supabase.from("equipo").select("*").order("nombre");
  if (error) throw error;
  return (data || []).map(miembroFromDB);
}

export async function guardarEquipo(miembros) {
  if (!supabaseHabilitado) return;
  const ids = miembros.map((m) => m.id);
  const { error } = await supabase.from("equipo").upsert(miembros.map(miembroToDB));
  if (error) throw error;
  // Borrar los que ya no están
  if (ids.length) {
    await supabase.from("equipo").delete().not("id", "in", `(${ids.join(",")})`);
  } else {
    await supabase.from("equipo").delete().neq("id", -1);
  }
}

// ─────────────────────────────────────────────────────────────
// PRESUPUESTO DE MARKETING
// ─────────────────────────────────────────────────────────────
const presupuestoToDB = (p) => ({
  id: p.id,
  anio: p.anio || null,
  mes: p.mes || null,
  mes_nro: p.mesNro || null,
  categoria: p.categoria,
  canal: p.canal || null,
  proyectado: p.proyectado || 0,
  ejecutado: p.ejecutado || 0,
});
const presupuestoFromDB = (r) => ({
  id: r.id,
  anio: r.anio,
  mes: r.mes || "",
  mesNro: r.mes_nro,
  categoria: r.categoria,
  canal: r.canal || "",
  proyectado: Number(r.proyectado) || 0,
  ejecutado: Number(r.ejecutado) || 0,
});

export async function fetchPresupuesto() {
  if (!supabaseHabilitado) return [];
  const { data, error } = await supabase.from("presupuesto").select("*");
  if (error) throw error;
  return (data || []).map(presupuestoFromDB);
}

export async function guardarPresupuesto(items) {
  if (!supabaseHabilitado) return;
  const ids = items.map((i) => i.id);
  if (items.length) {
    const { error } = await supabase.from("presupuesto").upsert(items.map(presupuestoToDB));
    if (error) throw error;
    await supabase.from("presupuesto").delete().not("id", "in", `(${ids.map((x) => `"${x}"`).join(",")})`);
  } else {
    await supabase.from("presupuesto").delete().neq("id", "___nunca___");
  }
}

// ─────────────────────────────────────────────────────────────
// CONTENIDOS (calendario de contenidos)
// ─────────────────────────────────────────────────────────────
const contenidoToDB = (c) => ({
  id: c.id,
  titulo: c.titulo,
  descripcion: c.descripcion || null,
  fecha: c.fecha || null,
  canal: c.canal || null,
  tipo: c.tipo || null,
  estado: c.estado || "idea",
  responsable: c.responsable || null,
  url: c.url || null,
  actividad: c.actividad || "contenido",
  cuenta: c.cuenta || null,
});
const contenidoFromDB = (r) => ({
  id: r.id,
  titulo: r.titulo,
  descripcion: r.descripcion || "",
  fecha: r.fecha || "",
  canal: r.canal || "instagram",
  tipo: r.tipo || "Post",
  estado: r.estado || "idea",
  responsable: r.responsable || "",
  url: r.url || "",
  actividad: r.actividad || "contenido",
  cuenta: r.cuenta || "",
});

export async function fetchContenidos() {
  if (!supabaseHabilitado) return [];
  const { data, error } = await supabase.from("contenidos").select("*");
  if (error) throw error;
  return (data || []).map(contenidoFromDB);
}

export async function guardarContenidos(items) {
  if (!supabaseHabilitado) return;
  const ids = items.map((i) => i.id);
  if (items.length) {
    const { error } = await supabase.from("contenidos").upsert(items.map(contenidoToDB));
    if (error) throw error;
    await supabase.from("contenidos").delete().not("id", "in", `(${ids.map((x) => `"${x}"`).join(",")})`);
  } else {
    await supabase.from("contenidos").delete().neq("id", "___nunca___");
  }
}

// ─────────────────────────────────────────────────────────────
// EQUIPO DE MARKETING (separado del equipo comercial)
// ─────────────────────────────────────────────────────────────
export async function fetchEquipoMkt() {
  if (!supabaseHabilitado) return [];
  const { data, error } = await supabase.from("equipo_mkt").select("*").order("nombre");
  if (error) throw error;
  return (data || []).map((r) => ({ id: r.id, nombre: r.nombre, rol: r.rol || "Contenidos", activo: r.activo !== false }));
}

export async function guardarEquipoMkt(miembros) {
  if (!supabaseHabilitado) return;
  const ids = miembros.map((m) => m.id);
  const rows = miembros.map((m) => ({ id: m.id, nombre: m.nombre, rol: m.rol || "Contenidos", activo: m.activo !== false }));
  if (rows.length) {
    const { error } = await supabase.from("equipo_mkt").upsert(rows);
    if (error) throw error;
    await supabase.from("equipo_mkt").delete().not("id", "in", `(${ids.map((x) => `"${x}"`).join(",")})`);
  } else {
    await supabase.from("equipo_mkt").delete().neq("id", "___nunca___");
  }
}

// ─────────────────────────────────────────────────────────────
// KPIs DE MARKETING (importados de la hoja INPUT_KPIs)
// ─────────────────────────────────────────────────────────────
const kpiToDB = (k) => ({
  id: k.id,
  bloque: k.bloque || null,
  kpi: k.kpi,
  meta: k.meta || null,
  meses: k.meses || {},
  promedio: k.promedio ?? null,
});
const kpiFromDB = (r) => ({
  id: r.id,
  bloque: r.bloque || "General",
  kpi: r.kpi,
  meta: r.meta || "",
  meses: r.meses || {},
  promedio: r.promedio != null ? Number(r.promedio) : null,
});

export async function fetchKpis() {
  if (!supabaseHabilitado) return [];
  const { data, error } = await supabase.from("kpis_mkt").select("*");
  if (error) throw error;
  return (data || []).map(kpiFromDB);
}

export async function guardarKpis(items) {
  if (!supabaseHabilitado) return;
  const ids = items.map((i) => i.id);
  if (items.length) {
    const { error } = await supabase.from("kpis_mkt").upsert(items.map(kpiToDB));
    if (error) throw error;
    await supabase.from("kpis_mkt").delete().not("id", "in", `(${ids.map((x) => `"${x}"`).join(",")})`);
  } else {
    await supabase.from("kpis_mkt").delete().neq("id", "___nunca___");
  }
}
