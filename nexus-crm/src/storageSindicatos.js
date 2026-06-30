// ─────────────────────────────────────────────────────────────
// src/storageSindicatos.js
// Acceso a datos del módulo Sindicatos (B2B). Mismo estilo que storage.js:
// mappers snake_case (DB) ↔ camelCase (app) + funciones de fetch/guardar.
//
// Nota: la orquestación de la carga (insertar carga + dejar el descuento
// pendiente + escribir historial) se hace acá del lado cliente, igual que
// el resto del CRM. Para hacerlo atómico el día de mañana, se puede mover a
// una función RPC de Postgres. El cálculo del tramo vive en lib/escalas.js.
// ─────────────────────────────────────────────────────────────
import { supabase, supabaseHabilitado } from "./supabaseClient";
import { fechaAplicaDesde, periodoLabel } from "./lib/escalas";

// ── Mappers ───────────────────────────────────────────────────
const tramoFromDB = (r) => ({
  id: r.id,
  matrizId: r.matriz_id,
  tramo: r.tramo,
  nombreTramo: r.nombre_tramo || "",
  umbralMin: r.umbral_min,
  umbralMax: r.umbral_max,
  descuento: Number(r.descuento),
});
const tramoToDB = (t, matrizId) => ({
  id: t.id,
  matriz_id: matrizId,
  tramo: t.tramo,
  nombre_tramo: t.nombreTramo || null,
  umbral_min: t.umbralMin,
  umbral_max: t.umbralMax ?? null,
  descuento: t.descuento,
});

const convenioFromDB = (r) => ({
  convenioId: r.id,
  agenciaId: r.agencia_id,
  codigoCupon: r.codigo_cupon,
  descuentoActivo: Number(r.descuento_activo) || 0,
  descuentoVigenteDesde: r.descuento_vigente_desde,
  tramoActual: r.tramo_actual,
  descuentoPendiente: r.descuento_pendiente != null ? Number(r.descuento_pendiente) : null,
  pendienteAplicaDesde: r.pendiente_aplica_desde,
  tramoPendiente: r.tramo_pendiente,
  matrizId: r.matriz_id,
  topeDescuento: r.tope_descuento != null ? Number(r.tope_descuento) : null,
  estado: r.estado || "activo",
  syncEstado: r.sync_estado || "ok",
  syncUltimo: r.sync_ultimo,
  notas: r.notas || "",
});

const cargaFromDB = (r) => ({
  id: r.id,
  convenioId: r.convenio_id,
  anio: r.anio,
  mes: r.mes,
  pasajeros: r.pasajeros,
  tramoResultante: r.tramo_resultante,
  descuentoResultante: Number(r.descuento_resultante),
  descuentoAplicaDesde: r.descuento_aplica_desde,
  usuarioId: r.usuario_id,
  usuarioEmail: r.usuario_email,
  fechaRegistro: r.fecha_registro,
  observaciones: r.observaciones || "",
});

// ── MATRICES ──────────────────────────────────────────────────
export async function fetchMatrices() {
  if (!supabaseHabilitado) return [];
  const [cab, tr] = await Promise.all([
    supabase.from("matriz_escalas_cabecera").select("*"),
    supabase.from("matriz_escalas_tramos").select("*"),
  ]);
  if (cab.error) throw cab.error;
  if (tr.error) throw tr.error;
  const tramos = (tr.data || []).map(tramoFromDB);
  return (cab.data || []).map((r) => ({
    id: r.id,
    nombre: r.nombre,
    activa: r.activa !== false,
    topeDescuentoGlobal: Number(r.tope_descuento_global) || 0,
    tramos: tramos
      .filter((t) => t.matrizId === r.id)
      .sort((a, b) => a.umbralMin - b.umbralMin),
  }));
}

// Guarda cabecera + reemplaza los tramos de esa matriz.
export async function guardarMatriz(matriz) {
  if (!supabaseHabilitado) return;
  const { error: e1 } = await supabase.from("matriz_escalas_cabecera").upsert({
    id: matriz.id,
    nombre: matriz.nombre,
    activa: matriz.activa !== false,
    tope_descuento_global: matriz.topeDescuentoGlobal || 0,
  });
  if (e1) throw e1;

  const filas = (matriz.tramos || []).map((t) => tramoToDB(t, matriz.id));
  if (filas.length) {
    const { error: e2 } = await supabase.from("matriz_escalas_tramos").upsert(filas);
    if (e2) throw e2;
    const ids = filas.map((f) => `"${f.id}"`).join(",");
    await supabase
      .from("matriz_escalas_tramos")
      .delete()
      .eq("matriz_id", matriz.id)
      .not("id", "in", `(${ids})`);
  }
}

// ── SINDICATOS (agencia tipo='sindicato' + su convenio) ───────
// Devuelve objetos "planos" combinando la agencia y el convenio (1:1).
export async function fetchSindicatos() {
  if (!supabaseHabilitado) return [];
  const [agRes, coRes] = await Promise.all([
    supabase.from("agencias").select("*").eq("tipo", "sindicato"),
    supabase.from("convenios_sindicato").select("*"),
  ]);
  if (agRes.error) throw agRes.error;
  if (coRes.error) throw coRes.error;

  const convenios = (coRes.data || []).map(convenioFromDB);
  return (agRes.data || []).map((a) => {
    const c = convenios.find((x) => x.agenciaId === a.id) || {};
    return {
      agenciaId: a.id,
      nombre: a.nombre,
      contacto: a.contacto,
      email: a.email,
      telefono: a.telefono,
      ciudad: a.ciudad,
      ejecutivo: a.ejecutivo,
      estadoAgencia: a.estado, // estado comercial (Activa/Prospecto/Inactiva)
      ...c, // convenioId, codigoCupon, descuentoActivo, tramoActual, estado, etc.
    };
  });
}

// Crea el sindicato: inserta la agencia (tipo='sindicato') + su convenio.
// `geo` opcional: { zona, lat, lng } (calculado con geoDeCiudad en la UI).
export async function crearSindicato(datos, geo = {}) {
  if (!supabaseHabilitado) throw new Error("Supabase no está configurado");

  const agenciaId = Date.now(); // mismo criterio de IDs que el resto del CRM
  const desde = new Date().toISOString().slice(0, 10);

  const ag = {
    id: agenciaId,
    nombre: datos.nombre.trim(),
    tipo: "sindicato",
    contacto: datos.contacto?.trim() || "—",
    email: datos.email?.trim() || "—",
    telefono: datos.telefono?.trim() || "—",
    ciudad: datos.ciudad || "CABA",
    direccion: datos.direccion?.trim() || "Convenio sindical",
    estado: "Activa",
    ejecutivo: datos.ejecutivo || "Sin asignar",
    desde,
    precios: {},
    reservas: [],
    visitas: [],
    zona: geo.zona ?? null,
    lat: geo.lat ?? null,
    lng: geo.lng ?? null,
  };
  const { error: eAg } = await supabase.from("agencias").insert(ag);
  if (eAg) throw eAg;

  const convenioId = crypto.randomUUID();
  const convenio = {
    id: convenioId,
    agencia_id: agenciaId,
    codigo_cupon: datos.codigoCupon.trim(),
    descuento_activo: Number(datos.descuentoInicial) || 0,
    descuento_vigente_desde: desde,
    matriz_id: datos.matrizId,
    tope_descuento: datos.topeDescuento ?? null,
    estado: "activo",
    sync_estado: "ok",
  };
  const { error: eCo } = await supabase.from("convenios_sindicato").insert(convenio);
  if (eCo) {
    // rollback simple de la agencia si falla el convenio
    await supabase.from("agencias").delete().eq("id", agenciaId);
    if (eCo.code === "23505") throw new Error("Ese código de cupón ya está en uso.");
    throw eCo;
  }
  return {
    agenciaId,
    convenioId,
    // Agencia en formato de la app, para que App la sume a su estado y el
    // autosave no la borre (y para poder registrarle reservas).
    agencia: {
      id: agenciaId,
      nombre: ag.nombre,
      contacto: ag.contacto,
      email: ag.email,
      telefono: ag.telefono,
      ciudad: ag.ciudad,
      direccion: ag.direccion,
      zona: ag.zona,
      lat: ag.lat,
      lng: ag.lng,
      estado: ag.estado,
      ejecutivo: ag.ejecutivo,
      desde: ag.desde,
      precios: {},
      reservas: [],
      visitas: [],
    },
  };
}

// Actualiza campos del convenio (parcial).
export async function actualizarConvenio(convenioId, cambios) {
  if (!supabaseHabilitado) return;
  const row = {};
  const map = {
    codigoCupon: "codigo_cupon",
    matrizId: "matriz_id",
    topeDescuento: "tope_descuento",
    estado: "estado",
    notas: "notas",
    descuentoActivo: "descuento_activo",
    descuentoVigenteDesde: "descuento_vigente_desde",
    tramoActual: "tramo_actual",
    descuentoPendiente: "descuento_pendiente",
    pendienteAplicaDesde: "pendiente_aplica_desde",
    tramoPendiente: "tramo_pendiente",
    syncEstado: "sync_estado",
  };
  for (const k in cambios) if (map[k]) row[map[k]] = cambios[k];
  if (Object.keys(row).length === 0) return;
  const { error } = await supabase.from("convenios_sindicato").update(row).eq("id", convenioId);
  if (error) throw error;
}

// ── CARGAS MENSUALES ──────────────────────────────────────────
export async function fetchTodasLasCargas() {
  if (!supabaseHabilitado) return [];
  const { data, error } = await supabase.from("cargas_mensuales_sindicato").select("*");
  if (error) throw error;
  return (data || []).map(cargaFromDB);
}

export async function fetchCargas(convenioId) {
  if (!supabaseHabilitado) return [];
  const { data, error } = await supabase
    .from("cargas_mensuales_sindicato")
    .select("*")
    .eq("convenio_id", convenioId);
  if (error) throw error;
  return (data || []).map(cargaFromDB);
}

// ¿Ya existe carga para ese mes? (respaldo del UNIQUE en BD, para avisar antes)
export async function existeCarga(convenioId, anio, mes) {
  if (!supabaseHabilitado) return null;
  const { data } = await supabase
    .from("cargas_mensuales_sindicato")
    .select("*")
    .eq("convenio_id", convenioId)
    .eq("anio", anio)
    .eq("mes", mes)
    .maybeSingle();
  return data ? cargaFromDB(data) : null;
}

// Guarda la carga del mes. Si el % resultante cambia respecto del vigente,
// lo deja PENDIENTE para el mes siguiente y registra el cambio en el historial.
// `resultado` viene de calcularTramo() (lo calcula la UI para el preview).
export async function guardarCarga({ convenio, anio, mes, pasajeros, resultado, usuario, observaciones }) {
  if (!supabaseHabilitado) throw new Error("Supabase no está configurado");
  if (resultado?.error) throw new Error(resultado.error);

  const aplicaDesde = fechaAplicaDesde(anio, mes);
  const cargaId = crypto.randomUUID();

  // 1) Insertar la carga (el UNIQUE(convenio,anio,mes) bloquea duplicados)
  const { error: eCarga } = await supabase.from("cargas_mensuales_sindicato").insert({
    id: cargaId,
    convenio_id: convenio.convenioId,
    anio,
    mes,
    pasajeros: Math.trunc(pasajeros),
    tramo_resultante: resultado.tramo,
    descuento_resultante: resultado.descuentoFinal,
    descuento_aplica_desde: aplicaDesde,
    usuario_id: usuario?.id || null,
    usuario_email: usuario?.email || null,
    observaciones: observaciones || null,
  });
  if (eCarga) {
    if (eCarga.code === "23505")
      throw new Error("Ya cargaste ese mes para este sindicato. Editalo desde la ficha.");
    throw eCarga;
  }

  // 2) ¿Cambia el descuento? → dejarlo pendiente para el mes siguiente + historial
  const cambia =
    resultado.descuentoFinal !== convenio.descuentoActivo ||
    resultado.tramo !== convenio.tramoActual;

  if (cambia) {
    await actualizarConvenio(convenio.convenioId, {
      descuentoPendiente: resultado.descuentoFinal,
      pendienteAplicaDesde: aplicaDesde,
      tramoPendiente: resultado.tramo,
    });
    await supabase.from("historial_descuentos_sindicato").insert({
      id: crypto.randomUUID(),
      convenio_id: convenio.convenioId,
      descuento_anterior: convenio.descuentoActivo,
      descuento_nuevo: resultado.descuentoFinal,
      tramo_anterior: convenio.tramoActual ?? null,
      tramo_nuevo: resultado.tramo,
      motivo: `Carga ${periodoLabel(anio, mes)}: ${pasajeros} pax → ${resultado.nombreTramo} (${resultado.descuentoFinal}%)`,
      carga_id: cargaId,
      usuario_id: usuario?.id || null,
    });
  }

  return { cargaId, cambia, aplicaDesde };
}

export async function eliminarCarga(cargaId) {
  if (!supabaseHabilitado) return;
  const { error } = await supabase.from("cargas_mensuales_sindicato").delete().eq("id", cargaId);
  if (error) throw error;
}

// Promueve manualmente el descuento pendiente a vigente (lo mismo que hace el
// cron del SQL, pero a pedido del admin desde la ficha).
export async function promoverDescuentoPendiente(convenio) {
  if (!supabaseHabilitado) return;
  if (convenio.descuentoPendiente == null) return;
  await actualizarConvenio(convenio.convenioId, {
    descuentoActivo: convenio.descuentoPendiente,
    descuentoVigenteDesde: convenio.pendienteAplicaDesde || new Date().toISOString().slice(0, 10),
    tramoActual: convenio.tramoPendiente,
    descuentoPendiente: null,
    pendienteAplicaDesde: null,
    tramoPendiente: null,
    syncEstado: "pendiente",
  });
}

export async function fetchHistorialDescuentos(convenioId) {
  if (!supabaseHabilitado) return [];
  const { data, error } = await supabase
    .from("historial_descuentos_sindicato")
    .select("*")
    .eq("convenio_id", convenioId)
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return (data || []).map((r) => ({
    id: r.id,
    descuentoAnterior: r.descuento_anterior != null ? Number(r.descuento_anterior) : null,
    descuentoNuevo: r.descuento_nuevo != null ? Number(r.descuento_nuevo) : null,
    tramoAnterior: r.tramo_anterior,
    tramoNuevo: r.tramo_nuevo,
    motivo: r.motivo || "",
    creadoEn: r.creado_en,
  }));
}
