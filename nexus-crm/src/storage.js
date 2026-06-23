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
