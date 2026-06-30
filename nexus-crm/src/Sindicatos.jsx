// ─────────────────────────────────────────────────────────────
// src/Sindicatos.jsx
// Módulo "Control y Escalas de Cupones para Sindicatos (B2B)".
// Autónomo: carga sus propios datos (igual que la vista Usuarios).
// Se monta desde App.jsx como  <Sindicatos usuario={usuario} puedeEditar={...} />
// ─────────────────────────────────────────────────────────────
import React, { useState, useEffect, useMemo } from "react";
import {
  BadgePercent, Ticket, Plus, X, Search, TrendingUp, TrendingDown, Minus,
  ArrowLeft, Loader2, AlertTriangle, CheckCircle2, Users2, Layers, Copy,
  Save, Trash2, Clock, ChevronRight,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { BRAND, geoDeCiudad } from "./data";
import {
  MESES_NOMBRE, calcularTramo, formatFecha, periodoLabel, periodoCorto,
  ordenarCargasAsc, ordenarCargasDesc, promedioUltimos, maxHistorico,
  esCaidaAbrupta, esSaltoSospechoso,
} from "./lib/escalas";
import {
  fetchMatrices, guardarMatriz, fetchSindicatos, crearSindicato, actualizarConvenio,
  fetchTodasLasCargas, existeCarga, guardarCarga, eliminarCarga,
  promoverDescuentoPendiente, fetchHistorialDescuentos,
} from "./storageSindicatos";

// ── Helpers visuales (locales, mismo lenguaje que App.jsx) ─────
const inputCls =
  "w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-500 mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function Card({ children, className = "" }) {
  return <div className={`bg-white rounded-xl border border-slate-200 ${className}`}>{children}</div>;
}

function KpiCard({ icon: Icon, label, value, accent }) {
  return (
    <Card className="p-5">
      <div className="p-2.5 rounded-lg inline-flex" style={{ background: accent + "15" }}>
        <Icon size={20} style={{ color: accent }} />
      </div>
      <p className="text-2xl font-bold text-slate-800 mt-4 tracking-tight">{value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
    </Card>
  );
}

const ESTADO_CONVENIO = {
  activo: { label: "Activo", color: "#16a34a", bg: "#dcfce7" },
  suspendido: { label: "Suspendido", color: "#64748b", bg: "#f1f5f9" },
  en_revision: { label: "En revisión", color: "#f59e0b", bg: "#fef3c7" },
};
function EstadoConvenioBadge({ estado }) {
  const e = ESTADO_CONVENIO[estado] || ESTADO_CONVENIO.activo;
  return (
    <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ color: e.color, background: e.bg }}>
      {e.label}
    </span>
  );
}

function TramoBadge({ tramo, nombre }) {
  if (tramo == null) return <span className="text-sm text-slate-400">—</span>;
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ color: BRAND.marea, background: BRAND.espuma }}>
      {nombre || `Tramo ${tramo}`}
    </span>
  );
}

// Flecha de tendencia comparando dos últimas cargas
function Tendencia({ ultima, penultima }) {
  if (!ultima) return <span className="text-xs text-slate-400">sin datos</span>;
  if (!penultima) return <span className="text-xs text-slate-400">primer mes</span>;
  const diff = ultima.pasajeros - penultima.pasajeros;
  const pct = penultima.pasajeros ? Math.round((diff / penultima.pasajeros) * 100) : 0;
  if (diff === 0) return <span className="inline-flex items-center gap-1 text-xs text-slate-400"><Minus size={13} /> 0%</span>;
  const sube = diff > 0;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: sube ? BRAND.verdeOk : BRAND.alerta }}>
      {sube ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
      {sube ? "+" : ""}{pct}%
    </span>
  );
}

function Pct({ v }) {
  return <>{v == null ? "—" : `${Number(v) % 1 === 0 ? Number(v) : Number(v).toFixed(1)}%`}</>;
}

// Banner de feedback (reemplaza alerts; voz de la interfaz)
function Banner({ msg }) {
  if (!msg) return null;
  const ok = msg.tipo === "ok";
  return (
    <div className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg mb-4"
      style={{ background: ok ? "#dcfce7" : "#fef2f2", color: ok ? "#166534" : "#b91c1c" }}>
      {ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
      {msg.texto}
    </div>
  );
}

// Overlay de modal reutilizable (mismo patrón que VisitaForm/AgenciaForm)
function Modal({ title, subtitle, onClose, children, footer, maxW = "max-w-md" }) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className={`bg-white rounded-2xl w-full ${maxW} shadow-2xl max-h-[90vh] flex flex-col`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-800">{title}</h3>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto">{children}</div>
        {footer && <div className="flex gap-3 px-6 py-4 border-t border-slate-100">{footer}</div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Modal: Cargar pasajeros del mes
// ═══════════════════════════════════════════════════════════════
function CargaPasajerosModal({ sindicato, matriz, cargas, usuario, onClose, onSaved, onSyncReserva }) {
  const hoy = new Date();
  const mesAnterior = hoy.getMonth() === 0 ? 12 : hoy.getMonth(); // 1-12, mes pasado
  const anioAnterior = hoy.getMonth() === 0 ? hoy.getFullYear() - 1 : hoy.getFullYear();

  const [anio, setAnio] = useState(anioAnterior);
  const [mes, setMes] = useState(mesAnterior);
  const [pax, setPax] = useState("");
  const [obs, setObs] = useState("");
  const [existente, setExistente] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const tramos = matriz?.tramos || [];
  const promedio = useMemo(() => promedioUltimos(cargas, 3), [cargas]);
  const maxHist = useMemo(() => maxHistorico(cargas), [cargas]);

  // Chequear duplicado al cambiar mes/año
  useEffect(() => {
    let activo = true;
    (async () => {
      const ex = await existeCarga(sindicato.convenioId, anio, mes);
      if (activo) setExistente(ex);
    })();
    return () => { activo = false; };
  }, [anio, mes, sindicato.convenioId]);

  const n = pax === "" ? null : Number(pax);
  const resultado = n == null ? null : calcularTramo(n, tramos, matriz?.topeDescuentoGlobal, sindicato.topeDescuento);
  const caida = n != null && esCaidaAbrupta(n, promedio);
  const salto = n != null && esSaltoSospechoso(n, maxHist);

  const guardar = async (reemplazar = false) => {
    if (resultado?.error) { setError(resultado.error); return; }
    if (n == null) { setError("Ingresá la cantidad de pasajeros."); return; }
    setGuardando(true); setError("");
    try {
      if (reemplazar && existente) await eliminarCarga(existente.id);
      const r = await guardarCarga({ convenio: sindicato, anio, mes, pasajeros: n, resultado, usuario, observaciones: obs });
      onSyncReserva?.(sindicato.agenciaId, anio, mes, n);
      onSaved(r);
    } catch (e) {
      setError(e.message || "No se pudo guardar la carga.");
      setGuardando(false);
    }
  };

  const footer = (
    <>
      <button onClick={onClose} className="flex-1 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg py-2 hover:bg-slate-50">
        Cancelar
      </button>
      {existente ? (
        <button onClick={() => guardar(true)} disabled={guardando}
          className="flex-1 text-sm font-medium text-white rounded-lg py-2 hover:opacity-90 disabled:opacity-50" style={{ background: BRAND.sol }}>
          {guardando ? "Guardando..." : "Reemplazar carga"}
        </button>
      ) : (
        <button onClick={() => guardar(false)} disabled={guardando || !!resultado?.error}
          className="flex-1 text-sm font-medium text-white rounded-lg py-2 hover:opacity-90 disabled:opacity-50" style={{ background: BRAND.abismo }}>
          {guardando ? "Guardando..." : "Guardar carga"}
        </button>
      )}
    </>
  );

  return (
    <Modal title="Cargar pasajeros del mes" subtitle={sindicato.nombre} onClose={onClose} footer={footer}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Mes">
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className={inputCls + " bg-white"}>
            {MESES_NOMBRE.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </Field>
        <Field label="Año">
          <select value={anio} onChange={(e) => setAnio(Number(e.target.value))} className={inputCls + " bg-white"}>
            {[anioAnterior - 1, anioAnterior, anioAnterior + 1, hoy.getFullYear() + 1]
              .filter((v, i, a) => a.indexOf(v) === i)
              .map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Cantidad de pasajeros del mes">
        <input type="number" min="0" value={pax} onChange={(e) => setPax(e.target.value)} autoFocus
          placeholder="Ej: 145" className={inputCls} />
      </Field>

      {/* Preview en vivo del tramo */}
      {n != null && resultado && !resultado.error && (
        <div className="rounded-xl p-4 border" style={{ borderColor: BRAND.espuma, background: "#f8fdfe" }}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Tramo alcanzado</span>
            <TramoBadge tramo={resultado.tramo} nombre={resultado.nombreTramo} />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold" style={{ color: BRAND.marea }}><Pct v={resultado.descuentoFinal} /></span>
            <span className="text-xs text-slate-500">de descuento</span>
          </div>
          {resultado.topeado && (
            <p className="text-xs mt-1.5" style={{ color: BRAND.sol }}>
              El tramo sugiere <Pct v={resultado.descuentoSugerido} /> pero se topea a <Pct v={resultado.descuentoFinal} /> por política de margen.
            </p>
          )}
          <p className="text-xs text-slate-400 mt-2">
            Regirá en la web desde el <span className="font-medium text-slate-600">
              {formatFecha(new Date(mes >= 12 ? anio + 1 : anio, mes >= 12 ? 0 : mes, 1))}</span> (mes siguiente al cargado).
          </p>
        </div>
      )}

      {n != null && resultado?.error && (
        <div className="text-xs px-3 py-2 rounded-lg" style={{ background: "#fef2f2", color: "#b91c1c" }}>{resultado.error}</div>
      )}

      {/* Alertas blandas */}
      {existente && (
        <div className="flex items-start gap-2 text-xs px-3 py-2.5 rounded-lg" style={{ background: "#fef3c7", color: "#92400e" }}>
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>Ya cargaste {periodoLabel(anio, mes)} para este sindicato ({existente.pasajeros} pax). Si seguís, vas a <b>reemplazar</b> esa carga.</span>
        </div>
      )}
      {!existente && caida && (
        <div className="flex items-start gap-2 text-xs px-3 py-2.5 rounded-lg" style={{ background: "#fef2f2", color: "#b91c1c" }}>
          <TrendingDown size={15} className="mt-0.5 shrink-0" />
          <span>Caída fuerte: {n} pax está muy por debajo del promedio reciente ({promedio} pax). Verificá el dato.</span>
        </div>
      )}
      {!existente && salto && (
        <div className="flex items-start gap-2 text-xs px-3 py-2.5 rounded-lg" style={{ background: "#fef3c7", color: "#92400e" }}>
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>¿{n} pax es correcto? Supera por mucho el máximo histórico ({maxHist} pax). Puede ser un error de tipeo.</span>
        </div>
      )}

      <Field label="Observaciones (opcional)">
        <input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Nota interna sobre esta carga" className={inputCls} />
      </Field>

      {error && <p className="text-xs text-rose-600">{error}</p>}
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
// Modal: Nuevo sindicato (crea agencia tipo='sindicato' + convenio)
// ═══════════════════════════════════════════════════════════════
function NuevoSindicatoForm({ matrices, onClose, onSaved, onCreado }) {
  const [form, setForm] = useState({
    nombre: "", contacto: "", email: "", telefono: "", ciudad: "CABA",
    codigoCupon: "", matrizId: matrices[0]?.id || "", descuentoInicial: "0",
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!form.nombre.trim()) { setError("Poné el nombre del sindicato."); return; }
    if (!form.codigoCupon.trim()) { setError("Falta el código de cupón."); return; }
    if (!form.matrizId) { setError("Elegí una matriz de escalas."); return; }
    setGuardando(true); setError("");
    try {
      const geo = geoDeCiudad(form.ciudad || "CABA", Date.now());
      const res = await crearSindicato({ ...form, descuentoInicial: Number(form.descuentoInicial) || 0 }, geo);
      onCreado?.(res.agencia);
      onSaved();
    } catch (e) {
      setError(e.message || "No se pudo crear el sindicato.");
      setGuardando(false);
    }
  };

  const footer = (
    <>
      <button onClick={onClose} className="flex-1 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg py-2 hover:bg-slate-50">Cancelar</button>
      <button onClick={submit} disabled={guardando} className="flex-1 text-sm font-medium text-white rounded-lg py-2 hover:opacity-90 disabled:opacity-50" style={{ background: BRAND.abismo }}>
        {guardando ? "Creando..." : "Crear sindicato"}
      </button>
    </>
  );

  return (
    <Modal title="Nuevo sindicato" subtitle="Se crea como agencia (tipo sindicato) + su convenio" onClose={onClose} footer={footer}>
      <Field label="Nombre del sindicato">
        <input value={form.nombre} onChange={set("nombre")} autoFocus placeholder="Ej: UTA — Unión Tranviarios" className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Contacto">
          <input value={form.contacto} onChange={set("contacto")} placeholder="Nombre y apellido" className={inputCls} />
        </Field>
        <Field label="Ciudad">
          <select value={form.ciudad} onChange={set("ciudad")} className={inputCls + " bg-white"}>
            {["CABA", "Tigre", "Mar del Plata", "Rosario", "Mendoza", "Bariloche", "Salta"].map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Email"><input value={form.email} onChange={set("email")} type="email" placeholder="convenios@sindicato.org" className={inputCls} /></Field>
        <Field label="Teléfono"><input value={form.telefono} onChange={set("telefono")} placeholder="+54 11 ..." className={inputCls} /></Field>
      </div>
      <Field label="Código de cupón web">
        <input value={form.codigoCupon} onChange={set("codigoCupon")} placeholder="Ej: SIND-UTA-2026" className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Matriz de escalas">
          <select value={form.matrizId} onChange={set("matrizId")} className={inputCls + " bg-white"}>
            {matrices.length === 0 && <option value="">No hay matrices</option>}
            {matrices.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </Field>
        <Field label="Descuento inicial (%)">
          <input type="number" min="0" step="0.5" value={form.descuentoInicial} onChange={set("descuentoInicial")} className={inputCls} />
        </Field>
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
// Modal: Editor de la matriz de escalas
// ═══════════════════════════════════════════════════════════════
function MatrizEscalasEditor({ matriz, onClose, onSaved }) {
  const [nombre, setNombre] = useState(matriz.nombre);
  const [tope, setTope] = useState(String(matriz.topeDescuentoGlobal ?? 15));
  const [tramos, setTramos] = useState(
    [...(matriz.tramos || [])].sort((a, b) => a.umbralMin - b.umbralMin)
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const setTramo = (i, k, v) =>
    setTramos(tramos.map((t, j) => (j === i ? { ...t, [k]: v } : t)));
  const addTramo = () => {
    const ultimo = tramos[tramos.length - 1];
    setTramos([...tramos, {
      id: crypto.randomUUID(),
      tramo: (ultimo?.tramo || 0) + 1,
      nombreTramo: "",
      umbralMin: ultimo?.umbralMax != null ? ultimo.umbralMax + 1 : 0,
      umbralMax: null,
      descuento: 0,
    }]);
  };
  const delTramo = (i) => setTramos(tramos.filter((_, j) => j !== i));

  // Validación de continuidad / solapamiento
  const aviso = useMemo(() => {
    const ord = [...tramos].sort((a, b) => a.umbralMin - b.umbralMin);
    for (let i = 0; i < ord.length; i++) {
      const t = ord[i];
      if (t.umbralMax != null && Number(t.umbralMin) > Number(t.umbralMax)) return `El ${t.nombreTramo || "tramo " + t.tramo}: el mínimo no puede ser mayor al máximo.`;
      if (i > 0) {
        const prev = ord[i - 1];
        if (prev.umbralMax == null) return "Solo el último tramo puede quedar abierto (sin máximo).";
        if (Number(t.umbralMin) !== Number(prev.umbralMax) + 1) return "Los tramos deben ser contiguos (sin huecos ni solapes).";
      }
    }
    return null;
  }, [tramos]);

  const guardar = async () => {
    if (aviso) { setError(aviso); return; }
    setGuardando(true); setError("");
    try {
      await guardarMatriz({
        id: matriz.id, nombre: nombre.trim(), activa: true,
        topeDescuentoGlobal: Number(tope) || 0,
        tramos: tramos.map((t, i) => ({
          ...t, tramo: i + 1,
          umbralMin: Number(t.umbralMin),
          umbralMax: t.umbralMax === "" || t.umbralMax == null ? null : Number(t.umbralMax),
          descuento: Number(t.descuento),
        })),
      });
      onSaved();
    } catch (e) {
      setError(e.message || "No se pudo guardar la matriz.");
      setGuardando(false);
    }
  };

  const footer = (
    <>
      <button onClick={onClose} className="flex-1 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg py-2 hover:bg-slate-50">Cancelar</button>
      <button onClick={guardar} disabled={guardando || !!aviso} className="flex-1 text-sm font-medium text-white rounded-lg py-2 hover:opacity-90 disabled:opacity-50" style={{ background: BRAND.abismo }}>
        {guardando ? "Guardando..." : "Guardar matriz"}
      </button>
    </>
  );

  return (
    <Modal title="Matriz de escalas" subtitle="Tramos de pasajeros y % de descuento sugerido" onClose={onClose} footer={footer} maxW="max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nombre de la matriz"><input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} /></Field>
        <Field label="Tope global de descuento (%)"><input type="number" min="0" step="0.5" value={tope} onChange={(e) => setTope(e.target.value)} className={inputCls} /></Field>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-50 text-xs font-medium text-slate-500">
          <span className="col-span-3">Nombre</span>
          <span className="col-span-3">Pax desde</span>
          <span className="col-span-3">Pax hasta</span>
          <span className="col-span-2">Dto %</span>
          <span className="col-span-1"></span>
        </div>
        {tramos.map((t, i) => (
          <div key={t.id} className="grid grid-cols-12 gap-2 px-3 py-2 border-t border-slate-100 items-center">
            <input value={t.nombreTramo || ""} onChange={(e) => setTramo(i, "nombreTramo", e.target.value)} placeholder={`Tramo ${i + 1}`} className="col-span-3 px-2 py-1.5 text-sm rounded border border-slate-200" />
            <input type="number" value={t.umbralMin} onChange={(e) => setTramo(i, "umbralMin", e.target.value)} className="col-span-3 px-2 py-1.5 text-sm rounded border border-slate-200" />
            <input type="number" value={t.umbralMax ?? ""} onChange={(e) => setTramo(i, "umbralMax", e.target.value)} placeholder="∞ (abierto)" className="col-span-3 px-2 py-1.5 text-sm rounded border border-slate-200" />
            <input type="number" step="0.5" value={t.descuento} onChange={(e) => setTramo(i, "descuento", e.target.value)} className="col-span-2 px-2 py-1.5 text-sm rounded border border-slate-200" />
            <button onClick={() => delTramo(i)} className="col-span-1 text-slate-300 hover:text-rose-500 flex justify-center"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>

      <button onClick={addTramo} className="text-sm font-medium inline-flex items-center gap-1.5" style={{ color: BRAND.turquesa }}>
        <Plus size={16} /> Agregar tramo
      </button>

      {aviso && <div className="text-xs px-3 py-2 rounded-lg" style={{ background: "#fef3c7", color: "#92400e" }}>{aviso}</div>}
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
// Ficha de detalle del sindicato
// ═══════════════════════════════════════════════════════════════
function SindicatoDetalle({ sindicato, cargas, matriz, puedeEditar, onBack, onChanged, onCopiar, onSyncReserva }) {
  const [historial, setHistorial] = useState([]);
  const [trabajando, setTrabajando] = useState(false);

  useEffect(() => {
    let activo = true;
    (async () => {
      try { const h = await fetchHistorialDescuentos(sindicato.convenioId); if (activo) setHistorial(h); }
      catch (e) { console.error(e); }
    })();
    return () => { activo = false; };
  }, [sindicato.convenioId]);

  const dataChart = useMemo(
    () => [...cargas].sort(ordenarCargasAsc).map((c) => ({ periodo: periodoCorto(c.anio, c.mes), pax: c.pasajeros })),
    [cargas]
  );
  const tramos = matriz?.tramos || [];

  const activarPendiente = async () => {
    setTrabajando(true);
    try { await promoverDescuentoPendiente(sindicato); onChanged(); }
    catch (e) { console.error(e); setTrabajando(false); }
  };
  const borrarCarga = async (c) => {
    setTrabajando(true);
    try { await eliminarCarga(c.id); onSyncReserva?.(sindicato.agenciaId, c.anio, c.mes, null); onChanged(); }
    catch (e) { console.error(e); setTrabajando(false); }
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} /> Volver a sindicatos
      </button>

      {/* Cabecera */}
      <Card className="p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-slate-800">{sindicato.nombre}</h2>
              <EstadoConvenioBadge estado={sindicato.estado} />
            </div>
            <button onClick={() => onCopiar(sindicato.codigoCupon)} className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
              <Ticket size={14} /> {sindicato.codigoCupon} <Copy size={13} />
            </button>
          </div>
          <div className="flex gap-6">
            <div className="text-right">
              <p className="text-xs text-slate-400">Descuento vigente</p>
              <p className="text-2xl font-bold" style={{ color: BRAND.marea }}><Pct v={sindicato.descuentoActivo} /></p>
              <p className="text-xs text-slate-400">desde {formatFecha(sindicato.descuentoVigenteDesde)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Tramo actual</p>
              <div className="mt-1"><TramoBadge tramo={sindicato.tramoActual} nombre={tramos.find((t) => t.tramo === sindicato.tramoActual)?.nombreTramo} /></div>
            </div>
          </div>
        </div>

        {/* Descuento pendiente */}
        {sindicato.descuentoPendiente != null && (
          <div className="mt-4 flex items-center justify-between flex-wrap gap-3 rounded-xl px-4 py-3" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
            <div className="flex items-center gap-2 text-sm" style={{ color: "#92400e" }}>
              <Clock size={16} />
              Próximo descuento: <b><Pct v={sindicato.descuentoPendiente} /></b> desde el {formatFecha(sindicato.pendienteAplicaDesde)}
            </div>
            {puedeEditar && (
              <button onClick={activarPendiente} disabled={trabajando} className="text-xs font-medium text-white rounded-lg px-3 py-1.5 hover:opacity-90 disabled:opacity-50" style={{ background: BRAND.sol }}>
                Activar ahora
              </button>
            )}
          </div>
        )}
      </Card>

      {/* Gráfico de evolución */}
      <Card className="p-6">
        <h3 className="font-semibold text-slate-800 mb-1">Evolución de pasajeros</h3>
        <p className="text-sm text-slate-500 mb-5">Las líneas punteadas marcan el inicio de cada tramo</p>
        {dataChart.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">Todavía no hay cargas. Usá "Cargar pasajeros del mes" para empezar.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={dataChart} margin={{ left: -10, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="periodo" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }} />
              {tramos.filter((t) => t.umbralMin > 0).map((t) => (
                <ReferenceLine key={t.id} y={t.umbralMin} stroke={BRAND.turquesa} strokeDasharray="4 4"
                  label={{ value: t.nombreTramo || `T${t.tramo}`, position: "right", fontSize: 10, fill: BRAND.turquesa }} />
              ))}
              <Line type="monotone" dataKey="pax" stroke={BRAND.marea} strokeWidth={2.5} dot={{ r: 3 }} name="Pasajeros" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Historial de cargas */}
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100"><h3 className="font-semibold text-slate-800">Historial de cargas</h3></div>
          {cargas.length === 0 ? (
            <p className="text-sm text-slate-400 px-6 py-6">Sin cargas registradas.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {[...cargas].sort(ordenarCargasDesc).map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-6 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{periodoLabel(c.anio, c.mes)}</p>
                    <p className="text-xs text-slate-400">{c.usuarioEmail || "—"} · {formatFecha(c.fechaRegistro)}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{c.pasajeros} pax</span>
                  <TramoBadge tramo={c.tramoResultante} nombre={tramos.find((t) => t.tramo === c.tramoResultante)?.nombreTramo} />
                  <span className="text-sm w-12 text-right" style={{ color: BRAND.marea }}><Pct v={c.descuentoResultante} /></span>
                  {puedeEditar && (
                    <button onClick={() => borrarCarga(c)} disabled={trabajando} className="text-slate-300 hover:text-rose-500"><Trash2 size={15} /></button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Línea de tiempo de descuentos */}
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100"><h3 className="font-semibold text-slate-800">Cambios de descuento</h3></div>
          {historial.length === 0 ? (
            <p className="text-sm text-slate-400 px-6 py-6">Sin cambios de descuento todavía.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {historial.map((h) => (
                <div key={h.id} className="px-6 py-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-400"><Pct v={h.descuentoAnterior} /></span>
                    <ChevronRight size={14} className="text-slate-300" />
                    <span className="font-semibold" style={{ color: BRAND.marea }}><Pct v={h.descuentoNuevo} /></span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{h.motivo} · {formatFecha(h.creadoEn)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <p className="text-xs text-slate-400">
        El contacto, las reservas y las visitas de este sindicato se gestionan desde la solapa <b>Agencias</b> (aparece como cuenta del canal).
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// VISTA PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export default function Sindicatos({ usuario, puedeEditar = false, onSindicatoCreado, onSyncReservaSindicato }) {
  const [matrices, setMatrices] = useState([]);
  const [sindicatos, setSindicatos] = useState([]);
  const [cargas, setCargas] = useState([]); // todas
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  const [q, setQ] = useState("");
  const [sel, setSel] = useState(null); // convenioId seleccionado para detalle
  const [modalCarga, setModalCarga] = useState(null); // sindicato
  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalMatriz, setModalMatriz] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const [m, s, c] = await Promise.all([fetchMatrices(), fetchSindicatos(), fetchTodasLasCargas()]);
      setMatrices(m); setSindicatos(s); setCargas(c);
    } catch (e) {
      console.error(e);
      setMsg({ tipo: "error", texto: "No se pudieron cargar los datos del módulo." });
    } finally { setLoading(false); }
  };
  useEffect(() => { cargar(); }, []);

  const aviso = (tipo, texto) => { setMsg({ tipo, texto }); setTimeout(() => setMsg(null), 4000); };
  const copiar = (txt) => { navigator.clipboard?.writeText(txt); aviso("ok", "Código de cupón copiado."); };

  // Cargas agrupadas por convenio (desc)
  const porConvenio = useMemo(() => {
    const map = {};
    for (const c of cargas) (map[c.convenioId] ||= []).push(c);
    for (const k in map) map[k].sort(ordenarCargasDesc);
    return map;
  }, [cargas]);

  const matrizDe = (s) => matrices.find((m) => m.id === s.matrizId);

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return sindicatos
      .filter((s) => !t || s.nombre.toLowerCase().includes(t) || (s.codigoCupon || "").toLowerCase().includes(t))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [sindicatos, q]);

  // KPIs
  const kpis = useMemo(() => {
    let activos = 0, paxMes = 0, suben = 0, bajan = 0, sumaDto = 0;
    for (const s of sindicatos) {
      if (s.estado === "activo") activos++;
      sumaDto += s.descuentoActivo || 0;
      const cs = porConvenio[s.convenioId] || [];
      const ult = cs[0], pen = cs[1];
      if (ult) paxMes += ult.pasajeros;
      if (ult && pen) { if (ult.tramoResultante > pen.tramoResultante) suben++; else if (ult.tramoResultante < pen.tramoResultante) bajan++; }
    }
    const prom = sindicatos.length ? (sumaDto / sindicatos.length) : 0;
    return { activos, paxMes, suben, bajan, prom: Math.round(prom * 10) / 10 };
  }, [sindicatos, porConvenio]);

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-slate-400"><Loader2 size={28} className="animate-spin mr-3" /> Cargando sindicatos...</div>;
  }

  // Detalle
  if (sel) {
    const s = sindicatos.find((x) => x.convenioId === sel);
    if (!s) { setSel(null); return null; }
    return (
      <SindicatoDetalle
        sindicato={s}
        cargas={porConvenio[sel] || []}
        matriz={matrizDe(s)}
        puedeEditar={puedeEditar}
        onBack={() => setSel(null)}
        onCopiar={copiar}
        onChanged={async () => { await cargar(); }}
        onSyncReserva={onSyncReservaSindicato}
      />
    );
  }

  const matrizActiva = matrices.find((m) => m.activa) || matrices[0];

  return (
    <div className="space-y-6">
      <Banner msg={msg} />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Users2} label="Sindicatos activos" value={kpis.activos} accent={BRAND.marea} />
        <KpiCard icon={Users2} label="Pasajeros último mes" value={kpis.paxMes.toLocaleString("es-AR")} accent={BRAND.turquesa} />
        <KpiCard icon={TrendingUp} label="Subieron / bajaron de tramo" value={`${kpis.suben} / ${kpis.bajan}`} accent={BRAND.verdeOk} />
        <KpiCard icon={BadgePercent} label="Descuento promedio" value={`${kpis.prom}%`} accent={BRAND.sol} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o cupón..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
        </div>
        {puedeEditar && matrizActiva && (
          <button onClick={() => setModalMatriz(true)} className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg px-4 py-2 hover:bg-slate-50">
            <Layers size={16} /> Matriz de escalas
          </button>
        )}
        {puedeEditar && (
          <button onClick={() => setModalNuevo(true)} className="inline-flex items-center gap-2 text-sm font-medium text-white rounded-lg px-4 py-2 hover:opacity-90" style={{ background: BRAND.abismo }}>
            <Plus size={16} /> Nuevo sindicato
          </button>
        )}
      </div>

      {/* Tabla */}
      <Card className="overflow-hidden">
        {lista.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: BRAND.espuma }}>
              <Ticket size={26} style={{ color: BRAND.turquesa }} />
            </div>
            <h3 className="font-semibold text-slate-700">Todavía no hay sindicatos</h3>
            <p className="text-sm text-slate-500 mt-1">{puedeEditar ? 'Creá el primero con "Nuevo sindicato".' : "Pedile a un administrador que cargue los convenios."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-slate-500 border-b border-slate-100">
                  <th className="px-6 py-3">Sindicato</th>
                  <th className="px-4 py-3">Cupón</th>
                  <th className="px-4 py-3">Dto. vigente</th>
                  <th className="px-4 py-3">Tramo</th>
                  <th className="px-4 py-3">Último mes</th>
                  <th className="px-4 py-3">Tendencia</th>
                  <th className="px-4 py-3">Próximo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lista.map((s) => {
                  const cs = porConvenio[s.convenioId] || [];
                  const ult = cs[0], pen = cs[1];
                  const tramos = matrizDe(s)?.tramos || [];
                  return (
                    <tr key={s.convenioId} className="hover:bg-slate-50/60">
                      <td className="px-6 py-3">
                        <p className="font-medium text-slate-800">{s.nombre}</p>
                        <p className="text-xs text-slate-400">{s.ejecutivo}</p>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => copiar(s.codigoCupon)} className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-xs">
                          {s.codigoCupon} <Copy size={12} />
                        </button>
                      </td>
                      <td className="px-4 py-3 font-semibold" style={{ color: BRAND.marea }}><Pct v={s.descuentoActivo} /></td>
                      <td className="px-4 py-3"><TramoBadge tramo={s.tramoActual} nombre={tramos.find((t) => t.tramo === s.tramoActual)?.nombreTramo} /></td>
                      <td className="px-4 py-3 text-slate-700">{ult ? `${ult.pasajeros} pax` : <span className="text-slate-400">—</span>}</td>
                      <td className="px-4 py-3"><Tendencia ultima={ult} penultima={pen} /></td>
                      <td className="px-4 py-3">
                        {s.descuentoPendiente != null
                          ? <span className="text-xs" style={{ color: BRAND.sol }}><Pct v={s.descuentoPendiente} /> ›</span>
                          : <span className="text-xs text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3"><EstadoConvenioBadge estado={s.estado} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          {puedeEditar && (
                            <button onClick={() => setModalCarga(s)} className="text-xs font-medium text-white rounded-lg px-2.5 py-1.5 hover:opacity-90" style={{ background: BRAND.turquesa }}>
                              Cargar
                            </button>
                          )}
                          <button onClick={() => setSel(s.convenioId)} className="text-slate-400 hover:text-slate-700"><ChevronRight size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modales */}
      {modalCarga && (
        <CargaPasajerosModal
          sindicato={modalCarga}
          matriz={matrizDe(modalCarga)}
          cargas={porConvenio[modalCarga.convenioId] || []}
          usuario={usuario}
          onSyncReserva={onSyncReservaSindicato}
          onClose={() => setModalCarga(null)}
          onSaved={async (r) => {
            setModalCarga(null);
            await cargar();
            aviso("ok", r?.cambia ? `Carga guardada. El descuento cambia a partir del ${formatFecha(r.aplicaDesde)}.` : "Carga guardada.");
          }}
        />
      )}
      {modalNuevo && (
        <NuevoSindicatoForm matrices={matrices} onClose={() => setModalNuevo(false)} onCreado={onSindicatoCreado}
          onSaved={async () => { setModalNuevo(false); await cargar(); aviso("ok", "Sindicato creado."); }} />
      )}
      {modalMatriz && matrizActiva && (
        <MatrizEscalasEditor matriz={matrizActiva} onClose={() => setModalMatriz(false)}
          onSaved={async () => { setModalMatriz(false); await cargar(); aviso("ok", "Matriz actualizada."); }} />
      )}
    </div>
  );
}
