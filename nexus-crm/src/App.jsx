import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  LayoutDashboard, Building2, KanbanSquare, Users, Ship,
  TrendingUp, DollarSign, Users2, Anchor, Search, ArrowLeft,
  ArrowRight, X, Plus, LogOut, Lock, ChevronRight, Calendar,
  MapPin, Mail, Phone, CheckCircle2, Clock, XCircle, Filter, Zap,
  Map as MapIcon, NotebookPen, CalendarClock, Trash2, Tag,
  CreditCard, Upload, Package, Pencil, AlertTriangle, FileSpreadsheet,
  Cloud, CloudOff, Loader2,
} from "lucide-react";
import {
  BarChart, Bar, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  BRAND, USUARIOS, EJECUTIVOS, EXCURSIONES, ESTADOS_AGENCIA, ETAPAS,
  AGENCIAS, PIPELINE_INICIAL, DATOS_MENSUALES, ZONAS, fmt, totalPax,
  totalFacturado, geoDeCiudad, resumenPorZona, PRODUCTOS_INICIALES,
  CONDICIONES_PAGO, precioAgencia, parseRankingWorkbook,
} from "./data";
import * as XLSX from "xlsx";
import { supabaseHabilitado } from "./supabaseClient";
import { cargarDatos, guardarAgencias, guardarProductos, signIn, signOut, getSession, onAuthChange } from "./storage";

// ═════════════════════════════════════════════════════════════
// Logo de Sturla recreado en SVG (timón + texto)
// ═════════════════════════════════════════════════════════════
function Logo({ size = 36, light = false }) {
  const c = light ? "#ffffff" : BRAND.abismo;
  const acc = BRAND.turquesa;
  return (
    <div className="flex items-center gap-2.5">
      <div className="rounded-xl flex items-center justify-center shrink-0"
        style={{ width: size, height: size, background: light ? "rgba(255,255,255,0.12)" : BRAND.espuma }}>
        <Anchor size={size * 0.55} style={{ color: acc }} strokeWidth={2.2} />
      </div>
      <div className="leading-none">
        <p className="font-bold tracking-tight" style={{ color: c, fontSize: size * 0.42 }}>
          Sturla<span style={{ color: acc }}>CRM</span>
        </p>
        <p className="font-medium tracking-wide" style={{ color: light ? "rgba(255,255,255,0.6)" : "#94a3b8", fontSize: size * 0.26 }}>
          Canal de Agencias
        </p>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// Auxiliares
// ═════════════════════════════════════════════════════════════
function Avatar({ name, size = 28 }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const hue = (name.charCodeAt(0) * 11 + name.length * 7) % 360;
  return (
    <div className="rounded-full flex items-center justify-center font-semibold text-white shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38, background: `hsl(${hue}, 45%, 45%)` }}>
      {initials}
    </div>
  );
}

function EstadoBadge({ estado }) {
  const c = ESTADOS_AGENCIA[estado];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ color: c.color, background: c.bg }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
      {c.label}
    </span>
  );
}

const RESERVA_ESTADO = {
  Confirmada: { color: "#16a34a", bg: "#dcfce7", icon: CheckCircle2 },
  Pendiente:  { color: "#f59e0b", bg: "#fef3c7", icon: Clock },
  Cancelada:  { color: "#e11d48", bg: "#ffe4e6", icon: XCircle },
};

// ═════════════════════════════════════════════════════════════
// PANTALLA DE LOGIN
// ═════════════════════════════════════════════════════════════
function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const submit = async () => {
    if (!email.trim() || !pass) {
      setError("Completá tu email y contraseña.");
      return;
    }
    setError("");
    setCargando(true);
    try {
      const user = await signIn(email, pass);
      onLogin(user);
    } catch (e) {
      const msg = (e?.message || "").toLowerCase();
      if (msg.includes("invalid")) setError("Email o contraseña incorrectos.");
      else if (msg.includes("email not confirmed")) setError("Tu email todavía no fue confirmado.");
      else setError("No se pudo iniciar sesión. Revisá tu conexión e intentá de nuevo.");
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${BRAND.abismo} 0%, ${BRAND.marea} 60%, ${BRAND.turquesa} 140%)` }}>
      {/* Olas decorativas */}
      <svg className="absolute bottom-0 left-0 w-full opacity-20" viewBox="0 0 1440 320" preserveAspectRatio="none" style={{ height: 200 }}>
        <path fill="#ffffff" d="M0,160 C320,260 420,60 720,140 C1020,220 1200,80 1440,150 L1440,320 L0,320 Z" />
      </svg>
      <svg className="absolute bottom-0 left-0 w-full opacity-10" viewBox="0 0 1440 320" preserveAspectRatio="none" style={{ height: 260 }}>
        <path fill="#ffffff" d="M0,220 C360,120 540,280 900,200 C1180,140 1320,240 1440,200 L1440,320 L0,320 Z" />
      </svg>

      <div className="relative w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <Logo size={52} light />
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Acceso al equipo</h1>
          <p className="text-sm text-slate-500 mt-1 mb-6">
            Ingresá con tu email y contraseña para gestionar el canal de agencias.
          </p>

          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-slate-500 mb-1.5 block">Email</span>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={email} onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="tu@email.com" autoFocus type="email"
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ "--tw-ring-color": BRAND.turquesa }} />
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-500 mb-1.5 block">Contraseña</span>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={pass} onChange={(e) => setPass(e.target.value)} type="password"
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ "--tw-ring-color": BRAND.turquesa }} />
              </div>
            </label>

            {error && (
              <div className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</div>
            )}

            <button onClick={submit} disabled={cargando}
              className="w-full text-sm font-semibold text-white rounded-lg py-2.5 transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: BRAND.abismo }}>
              {cargando ? (<><Loader2 size={16} className="animate-spin" /> Ingresando...</>) : "Ingresar"}
            </button>
          </div>
        </div>
        <p className="text-center text-xs text-white/50 mt-5">
          Sturla Viajes · Canal de Agencias · Delta del Paraná
        </p>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// KPI Card
// ═════════════════════════════════════════════════════════════
function KpiCard({ icon: Icon, label, value, delta, accent }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all">
      <div className="flex items-start justify-between">
        <div className="p-2.5 rounded-lg" style={{ background: accent + "15" }}>
          <Icon size={20} style={{ color: accent }} />
        </div>
        {delta && (
          <span className="text-xs font-semibold px-2 py-1 rounded-full text-emerald-700 bg-emerald-50">
            {delta}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-800 mt-4 tracking-tight">{value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// VISTA: Dashboard
// ═════════════════════════════════════════════════════════════
function Dashboard({ agencias }) {
  const activas = agencias.filter((a) => a.estado === "Activa").length;
  const paxTotal = agencias.reduce((s, a) => s + totalPax(a), 0);
  const facturacion = agencias.reduce((s, a) => s + totalFacturado(a), 0);
  const reservasTotal = agencias.reduce((s, a) => s + a.reservas.length, 0);

  // Pasajeros por excursión
  const porExcursion = EXCURSIONES.map((exc) => {
    const pax = agencias.reduce((s, a) =>
      s + a.reservas.filter((x) => x.excId === exc.id && x.estado !== "Cancelada")
        .reduce((ss, x) => ss + x.pax, 0), 0);
    return { nombre: exc.nombre.replace("Navegación ", "").replace("Day Tour ", ""), pax, color: exc.color };
  }).filter((e) => e.pax > 0).sort((a, b) => b.pax - a.pax);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Building2} label="Agencias activas" value={activas} delta="+2" accent={BRAND.marea} />
        <KpiCard icon={Users2} label="Pasajeros reservados" value={paxTotal.toLocaleString("es-AR")} delta="+11%" accent={BRAND.turquesa} />
        <KpiCard icon={Ship} label="Reservas del período" value={reservasTotal} delta="+8%" accent="#0891b2" />
        <KpiCard icon={DollarSign} label="Facturación canal" value={fmt(facturacion)} delta="+18%" accent={BRAND.verdeOk} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pasajeros e ingresos mensuales */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-1">Pasajeros e ingresos mensuales</h3>
          <p className="text-sm text-slate-500 mb-5">Ingresos en miles de $ARS</p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={DATOS_MENSUALES} margin={{ left: -18, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Line type="monotone" dataKey="pax" stroke={BRAND.marea} strokeWidth={2.5} dot={{ r: 3 }} name="Pasajeros" />
              <Line type="monotone" dataKey="ingresos" stroke={BRAND.turquesa} strokeWidth={2.5} dot={{ r: 3 }} name="Ingresos (K)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pasajeros por excursión */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-1">Pasajeros por excursión</h3>
          <p className="text-sm text-slate-500 mb-5">Demanda del canal por producto</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={porExcursion} layout="vertical" margin={{ left: 20, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" fontSize={12} />
              <YAxis type="category" dataKey="nombre" stroke="#94a3b8" fontSize={11} width={110} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }} cursor={{ fill: "#f8fafc" }} />
              <Bar dataKey="pax" radius={[0, 6, 6, 0]} name="Pasajeros">
                {porExcursion.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ranking de agencias */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Top agencias del canal</h3>
          <p className="text-sm text-slate-500 mt-0.5">Ordenadas por pasajeros reservados</p>
        </div>
        <div className="divide-y divide-slate-100">
          {[...agencias].sort((a, b) => totalPax(b) - totalPax(a)).slice(0, 5).map((a, i) => {
            const pax = totalPax(a);
            const max = Math.max(...agencias.map(totalPax));
            return (
              <div key={a.id} className="flex items-center gap-4 px-6 py-3.5">
                <span className="text-sm font-bold text-slate-300 w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm truncate">{a.nombre}</p>
                  <p className="text-xs text-slate-400">{a.ciudad}</p>
                </div>
                <div className="w-40 h-2 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                  <div className="h-full rounded-full" style={{ width: (pax / max * 100) + "%", background: BRAND.turquesa }} />
                </div>
                <span className="text-sm font-semibold text-slate-700 w-20 text-right">{pax} pax</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// VISTA: Agencias (lista + detalle)
// ═════════════════════════════════════════════════════════════
function Agencias({ agencias, addAgencia, addVisita, deleteAgencia, productos, setPreciosAgencia, importarAgencias, addReserva }) {
  const [sel, setSel] = useState(null);
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState("Todas");
  const [showForm, setShowForm] = useState(false);
  const [importInfo, setImportInfo] = useState(null);
  const fileRef = React.useRef(null);

  if (sel) {
    const ag = agencias.find((a) => a.id === sel);
    if (ag) return (
      <AgenciaDetalle ag={ag} onBack={() => setSel(null)} addVisita={addVisita}
        deleteAgencia={(id) => { deleteAgencia(id); setSel(null); }}
        productos={productos} setPreciosAgencia={setPreciosAgencia} addReserva={addReserva} />
    );
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportInfo({ estado: "cargando" });
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const res = parseRankingWorkbook(wb, XLSX);
      if (res.error) { setImportInfo({ estado: "error", msg: res.error }); return; }
      const antes = agencias.length;
      importarAgencias(res.agencias);
      setImportInfo({ estado: "ok", anio: res.anio, total: res.total, hoja: res.hoja });
    } catch (err) {
      setImportInfo({ estado: "error", msg: "No pude leer el archivo. ¿Es el Excel del ranking anual?" });
    }
    e.target.value = "";
  };

  const filtradas = agencias.filter((a) =>
    a.nombre.toLowerCase().includes(search.toLowerCase()) &&
    (filtro === "Todas" || a.estado === filtro)
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar agencia..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500" />
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
          <button onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors">
            <Upload size={16} /> Importar ranking
          </button>
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 text-white text-sm font-medium px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
            style={{ background: BRAND.abismo }}>
            <Plus size={16} /> Nueva agencia
          </button>
        </div>
      </div>

      {/* Banner de importación */}
      {importInfo && (
        <div className={`rounded-lg px-4 py-3 text-sm flex items-start gap-2.5 ${
          importInfo.estado === "ok" ? "bg-emerald-50 text-emerald-800"
          : importInfo.estado === "error" ? "bg-rose-50 text-rose-700"
          : "bg-slate-100 text-slate-600"
        }`}>
          {importInfo.estado === "ok" && <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
          {importInfo.estado === "error" && <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
          {importInfo.estado === "cargando" && <Clock size={16} className="mt-0.5 shrink-0" />}
          <div className="flex-1">
            {importInfo.estado === "ok" && (
              <span>Leí la hoja <strong>{importInfo.hoja}</strong>: {importInfo.total} agencias del ranking {importInfo.anio}. Se agregaron las que no existían (las repetidas se omitieron).</span>
            )}
            {importInfo.estado === "error" && <span>{importInfo.msg}</span>}
            {importInfo.estado === "cargando" && <span>Leyendo el archivo…</span>}
          </div>
          <button onClick={() => setImportInfo(null)} className="text-current opacity-50 hover:opacity-100"><X size={15} /></button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <Filter size={15} className="text-slate-400" />
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
          {["Todas", "Activa", "Prospecto", "Inactiva"].map((o) => (
            <button key={o} onClick={() => setFiltro(o)}
              className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
                filtro === o ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}>
              {o}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de tarjetas de agencia */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtradas.map((a) => (
          <button key={a.id} onClick={() => setSel(a.id)}
            className="text-left bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-cyan-300 transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ background: BRAND.espuma }}>
                <Building2 size={22} style={{ color: BRAND.marea }} />
              </div>
              <EstadoBadge estado={a.estado} />
            </div>
            <h3 className="font-semibold text-slate-800 group-hover:text-cyan-700 transition-colors">{a.nombre}</h3>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
              <MapPin size={12} /> {a.ciudad}
            </p>
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
              <div>
                <p className="text-lg font-bold text-slate-800">{totalPax(a)}</p>
                <p className="text-xs text-slate-400">pasajeros</p>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-800">{a.reservas.length}</p>
                <p className="text-xs text-slate-400">reservas</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 text-xs text-slate-500">
              <Avatar name={a.ejecutivo} size={20} /> {a.ejecutivo}
              <ChevronRight size={14} className="ml-auto text-slate-300 group-hover:text-cyan-500 transition-colors" />
            </div>
          </button>
        ))}
        {filtradas.length === 0 && (
          <div className="col-span-full text-center text-slate-400 py-12 bg-white rounded-xl border border-dashed border-slate-200">
            No hay agencias que coincidan. Probá con otro filtro o agregá una nueva.
          </div>
        )}
      </div>

      {showForm && <AgenciaForm onClose={() => setShowForm(false)} onSave={addAgencia} />}
    </div>
  );
}

// Detalle de una agencia con histórico
function AgenciaDetalle({ ag, onBack, addVisita, deleteAgencia, productos, setPreciosAgencia, addReserva }) {
  const [showVisita, setShowVisita] = useState(false);
  const [showPrecios, setShowPrecios] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showReserva, setShowReserva] = useState(false);
  const pax = totalPax(ag);
  const fact = totalFacturado(ag);
  const confirmadas = ag.reservas.filter((r) => r.estado === "Confirmada").length;
  const visitas = ag.visitas || [];
  const ultimaVisita = visitas.length
    ? [...visitas].sort((a, b) => b.fecha.localeCompare(a.fecha))[0].fecha
    : null;

  return (
    <div className="space-y-6">
      <button onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft size={16} /> Volver a agencias
      </button>

      {/* Encabezado */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ background: BRAND.espuma }}>
              <Building2 size={28} style={{ color: BRAND.marea }} />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">{ag.nombre}</h2>
                <EstadoBadge estado={ag.estado} />
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-2.5 text-sm text-slate-500">
                <span className="flex items-center gap-1.5"><MapPin size={14} /> {ag.direccion || ag.ciudad}</span>
                <span className="flex items-center gap-1.5"><Mail size={14} /> {ag.email}</span>
                <span className="flex items-center gap-1.5"><Phone size={14} /> {ag.telefono}</span>
                <span className="flex items-center gap-1.5"><Calendar size={14} /> Desde {ag.desde}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3 shrink-0">
            <div className="flex items-center gap-2 text-sm bg-slate-50 rounded-lg px-3 py-2">
              <Avatar name={ag.ejecutivo} size={28} />
              <div className="leading-tight">
                <p className="text-xs text-slate-400">Ejecutivo a cargo</p>
                <p className="font-medium text-slate-700">{ag.ejecutivo}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <button onClick={() => setShowReserva(true)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-white px-3 py-2 rounded-lg transition-opacity hover:opacity-90"
                style={{ background: BRAND.abismo }}>
                <Plus size={14} /> Cargar reserva
              </button>
              <button onClick={() => setShowPrecios(true)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                <CreditCard size={14} /> Precios y pago
              </button>
              <button onClick={() => setShowDelete(true)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 border border-rose-200 px-3 py-2 rounded-lg hover:bg-rose-50 transition-colors">
                <AlertTriangle size={14} /> Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Métricas de la agencia */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Users2} label="Pasajeros totales" value={pax} accent={BRAND.turquesa} />
        <KpiCard icon={Ship} label="Reservas históricas" value={ag.reservas.length} accent={BRAND.marea} />
        <KpiCard icon={DollarSign} label="Facturación total" value={fmt(fact)} accent="#0891b2" />
        <KpiCard icon={CalendarClock} label="Última visita" value={ultimaVisita || "—"} accent={BRAND.sol} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Histórico de reservas */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Histórico de reservas</h3>
            <p className="text-sm text-slate-500 mt-0.5">Operaciones de pasajeros de esta agencia</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-slate-500">
                  <th className="px-5 py-3 font-medium">Fecha</th>
                  <th className="px-5 py-3 font-medium">Excursión</th>
                  <th className="px-5 py-3 font-medium text-center">Pax</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                  <th className="px-5 py-3 font-medium text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {ag.reservas.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                    Esta agencia todavía no tiene reservas cargadas.
                  </td></tr>
                )}
                {[...ag.reservas].sort((a, b) => b.fecha.localeCompare(a.fecha)).map((r) => {
                  const e = RESERVA_ESTADO[r.estado];
                  const Icon = e.icon;
                  return (
                    <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                      <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{r.fecha}</td>
                      <td className="px-5 py-3 font-medium text-slate-800">{r.excursion}</td>
                      <td className="px-5 py-3 text-center font-semibold text-slate-700">{r.pax}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                          style={{ color: e.color, background: e.bg }}>
                          <Icon size={12} /> {r.estado}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-slate-700 whitespace-nowrap">{fmt(r.monto)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bitácora de visitas */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold text-slate-800">Visitas comerciales</h3>
              <p className="text-sm text-slate-500 mt-0.5">Bitácora de contactos</p>
            </div>
            <button onClick={() => setShowVisita(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-white px-3 py-2 rounded-lg transition-opacity hover:opacity-90 shrink-0"
              style={{ background: BRAND.abismo }}>
              <Plus size={14} /> Registrar
            </button>
          </div>
          <div className="flex-1 p-5">
            {visitas.length === 0 && (
              <div className="text-center text-sm text-slate-400 py-8">
                <NotebookPen size={28} className="mx-auto mb-2 text-slate-300" />
                Todavía no registraste visitas a esta agencia.
              </div>
            )}
            <div className="space-y-4">
              {[...visitas].sort((a, b) => b.fecha.localeCompare(a.fecha)).map((vi, idx) => (
                <div key={vi.id} className="relative pl-6">
                  <span className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white"
                    style={{ background: BRAND.turquesa }} />
                  {idx < visitas.length - 1 && (
                    <span className="absolute left-[4.5px] top-5 bottom-[-16px] w-px bg-slate-200" />
                  )}
                  <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Calendar size={12} className="text-slate-400" /> {vi.fecha}
                  </p>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">{vi.nota}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showVisita && (
        <VisitaForm agNombre={ag.nombre}
          onClose={() => setShowVisita(false)}
          onSave={(visita) => { addVisita(ag.id, visita); setShowVisita(false); }} />
      )}

      {showReserva && (
        <ReservaForm ag={ag} productos={productos}
          onClose={() => setShowReserva(false)}
          onSave={(reserva) => { addReserva(ag.id, reserva); setShowReserva(false); }} />
      )}

      {showPrecios && (
        <PreciosForm ag={ag} productos={productos}
          onClose={() => setShowPrecios(false)}
          onSave={(precios, condicionPago) => { setPreciosAgencia(ag.id, precios, condicionPago); setShowPrecios(false); }} />
      )}

      {showDelete && (
        <ConfirmDelete nombre={ag.nombre}
          onClose={() => setShowDelete(false)}
          onConfirm={() => deleteAgencia(ag.id)} />
      )}
    </div>
  );
}

// Formulario de carga MANUAL de reservas de pasajeros (por mes)
const MESES_NOMBRE = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
function ReservaForm({ ag, productos, onClose, onSave }) {
  const activos = (productos || []).filter((p) => p.activo);
  const hoy = new Date();
  const [prodId, setProdId] = useState(activos[0]?.id || "");
  const [pax, setPax] = useState("");
  const [mes, setMes] = useState(hoy.getMonth());
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [estado, setEstado] = useState("Confirmada");

  const prod = activos.find((p) => p.id === prodId);
  const precioUnit = prod ? precioAgencia(ag, prod.id, productos) : 0;
  const paxNum = parseInt(pax) || 0;
  const montoTotal = precioUnit * paxNum;

  const submit = () => {
    if (!prod || paxNum <= 0) return;
    const fecha = `${anio}-${String(mes + 1).padStart(2, "0")}-15`;
    onSave({
      fecha,
      excursion: prod.nombre,
      excId: prod.id,
      pax: paxNum,
      ejecutivo: ag.ejecutivo,
      estado,
      monto: montoTotal,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-800">Cargar reserva de pasajeros</h3>
            <p className="text-xs text-slate-400 mt-0.5">{ag.nombre}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <Field label="Servicio / excursión">
            <select value={prodId} onChange={(e) => setProdId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30">
              {activos.length === 0 && <option>No hay productos activos</option>}
              {activos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Mes">
              <select value={mes} onChange={(e) => setMes(parseInt(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30">
                {MESES_NOMBRE.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </Field>
            <Field label="Año">
              <select value={anio} onChange={(e) => setAnio(parseInt(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30">
                {[2023, 2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
            <Field label="Pasajeros">
              <input value={pax} onChange={(e) => setPax(e.target.value)} type="number" min="1" autoFocus placeholder="0"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500" />
            </Field>
          </div>
          <Field label="Estado">
            <div className="flex gap-2">
              {["Confirmada", "Pendiente", "Cancelada"].map((s) => (
                <button key={s} onClick={() => setEstado(s)}
                  className="flex-1 text-xs font-medium py-2 rounded-lg border transition-colors"
                  style={estado === s
                    ? { background: RESERVA_ESTADO[s].bg, color: RESERVA_ESTADO[s].color, borderColor: RESERVA_ESTADO[s].color }
                    : { background: "#fff", color: "#64748b", borderColor: "#e2e8f0" }}>
                  {s}
                </button>
              ))}
            </div>
          </Field>
          {/* Resumen calculado */}
          <div className="bg-slate-50 rounded-lg px-4 py-3 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              {paxNum > 0 ? `${paxNum} pax × ${fmt(precioUnit)}` : "Precio para esta agencia"}
            </div>
            <div className="text-lg font-bold text-slate-800">{fmt(montoTotal)}</div>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg py-2 hover:bg-slate-50">
            Cancelar
          </button>
          <button onClick={submit} className="flex-1 text-sm font-medium text-white rounded-lg py-2 hover:opacity-90" style={{ background: BRAND.abismo }}>
            Guardar reserva
          </button>
        </div>
      </div>
    </div>
  );
}

// Formulario de precios por agencia + condición de pago
function PreciosForm({ ag, productos, onClose, onSave }) {
  const activos = (productos || []).filter((p) => p.activo);
  const [precios, setPrecios] = useState(() => {
    const init = {};
    activos.forEach((p) => { init[p.id] = (ag.precios && ag.precios[p.id] != null) ? ag.precios[p.id] : p.precioBase; });
    return init;
  });
  const [condicion, setCondicion] = useState(ag.condicionPago || CONDICIONES_PAGO[0]);

  const setPrecio = (id, val) => setPrecios({ ...precios, [id]: val === "" ? "" : Math.round(parseFloat(val)) || 0 });

  const submit = () => {
    // Guardar solo los que difieren del base (los demás quedan en base automáticamente)
    const limpio = {};
    activos.forEach((p) => { if (precios[p.id] !== "" && precios[p.id] != null) limpio[p.id] = precios[p.id]; });
    onSave(limpio, condicion);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-800">Precios y facilidades de pago</h3>
            <p className="text-xs text-slate-400 mt-0.5">{ag.nombre}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto">
          <Field label="Condición de pago">
            <select value={condicion} onChange={(e) => setCondicion(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30">
              {CONDICIONES_PAGO.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">Precio por excursión (para esta agencia)</p>
            <div className="space-y-2">
              {activos.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="flex-1 text-sm text-slate-700 truncate">{p.nombre}</span>
                  <span className="text-xs text-slate-400 whitespace-nowrap">base {fmt(p.precioBase)}</span>
                  <div className="relative w-32">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input value={precios[p.id]} onChange={(e) => setPrecio(p.id, e.target.value)} type="number"
                      className="w-full pl-6 pr-2 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg py-2 hover:bg-slate-50">
            Cancelar
          </button>
          <button onClick={submit} className="flex-1 text-sm font-medium text-white rounded-lg py-2 hover:opacity-90" style={{ background: BRAND.abismo }}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal de confirmación de borrado
function ConfirmDelete({ nombre, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mb-4">
            <AlertTriangle size={24} className="text-rose-600" />
          </div>
          <h3 className="font-semibold text-slate-800 text-lg">¿Eliminar esta agencia?</h3>
          <p className="text-sm text-slate-500 mt-2">
            Estás por eliminar <span className="font-medium text-slate-700">{nombre}</span> junto con todas sus reservas y visitas. Esta acción no se puede deshacer.
          </p>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg py-2 hover:bg-slate-50">
            Cancelar
          </button>
          <button onClick={onConfirm} className="flex-1 text-sm font-medium text-white rounded-lg py-2 hover:opacity-90 bg-rose-600">
            Sí, eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// Formulario para registrar una visita comercial
function VisitaForm({ agNombre, onClose, onSave }) {
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [nota, setNota] = useState("");

  const submit = () => {
    if (!nota.trim()) return;
    onSave({ fecha, nota: nota.trim() });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-800">Registrar visita</h3>
            <p className="text-xs text-slate-400 mt-0.5">{agNombre}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <Field label="Fecha de la visita">
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500" />
          </Field>
          <Field label="Nota / resumen">
            <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={4} autoFocus
              placeholder="¿Qué se habló? Acuerdos, pedidos, próximos pasos..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 resize-none" />
          </Field>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg py-2 hover:bg-slate-50">
            Cancelar
          </button>
          <button onClick={submit} className="flex-1 text-sm font-medium text-white rounded-lg py-2 hover:opacity-90" style={{ background: BRAND.abismo }}>
            Guardar visita
          </button>
        </div>
      </div>
    </div>
  );
}

// Formulario de nueva agencia
function AgenciaForm({ onClose, onSave }) {
  const [form, setForm] = useState({
    nombre: "", contacto: "", email: "", telefono: "", ciudad: "", direccion: "",
    estado: "Prospecto", ejecutivo: EJECUTIVOS[0],
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = () => {
    if (!form.nombre.trim()) return;
    onSave({ ...form, desde: new Date().toISOString().slice(0, 10) });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Nueva agencia</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <Field label="Nombre de la agencia">
            <input value={form.nombre} onChange={set("nombre")} autoFocus placeholder="Ej: Mundo Joven Travel"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Contacto">
              <input value={form.contacto} onChange={set("contacto")} placeholder="Nombre y apellido"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500" />
            </Field>
            <Field label="Ciudad">
              <select value={form.ciudad} onChange={set("ciudad")}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30">
                <option value="">Elegí una ciudad...</option>
                {["CABA", "Tigre", "Mar del Plata", "Rosario", "Mendoza", "Bariloche", "Salta"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Dirección de origen">
            <input value={form.direccion} onChange={set("direccion")} placeholder="Calle, número, localidad"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500" />
          </Field>
          <Field label="Email">
            <input value={form.email} onChange={set("email")} type="email" placeholder="reservas@agencia.com"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500" />
          </Field>
          <Field label="Teléfono">
            <input value={form.telefono} onChange={set("telefono")} placeholder="+54 11 ..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Estado">
              <select value={form.estado} onChange={set("estado")}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30">
                <option>Prospecto</option><option>Activa</option><option>Inactiva</option>
              </select>
            </Field>
            <Field label="Ejecutivo">
              <select value={form.ejecutivo} onChange={set("ejecutivo")}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30">
                {EJECUTIVOS.map((v) => <option key={v}>{v}</option>)}
              </select>
            </Field>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg py-2 hover:bg-slate-50">
            Cancelar
          </button>
          <button onClick={submit} className="flex-1 text-sm font-medium text-white rounded-lg py-2 hover:opacity-90" style={{ background: BRAND.abismo }}>
            Crear agencia
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-500 mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

// ═════════════════════════════════════════════════════════════
// VISTA: Mapa de zonas (mapa de calor del canal)
// ═════════════════════════════════════════════════════════════

// Proyección lineal simple lat/lng → coordenadas del viewBox del SVG.
// Caja geográfica que cubre Argentina continental.
const GEO = { latTop: -21.0, latBottom: -55.5, lngLeft: -74.5, lngRight: -52.5 };
const VIEW = { w: 360, h: 620 };
const proj = (lat, lng) => ({
  x: ((lng - GEO.lngLeft) / (GEO.lngRight - GEO.lngLeft)) * VIEW.w,
  y: ((lat - GEO.latTop) / (GEO.latBottom - GEO.latTop)) * VIEW.h,
});

// Contorno simplificado de Argentina (suficiente para ubicar zonas)
const AR_PATH =
  "M135.4,14.1 L129.0,21.6 L122.5,29.8 L99.1,64.7 L99.3,70.2 L98.7,74.7 L96.9,79.4 L100.2,93.1 L98.5,108.8 L92.5,111.6 L90.1,117.2 L85.6,126.0 L81.4,131.7 L79.0,136.3 L77.7,142.6 L73.5,149.3 L75.6,156.3 L75.0,162.1 L76.7,164.9 L73.8,168.6 L70.1,172.2 L68.3,178.5 L66.3,181.3 L64.7,187.6 L66.2,194.9 L67.5,198.1 L69.9,203.9 L71.6,211.3 L72.5,216.9 L75.7,220.6 L75.5,227.8 L76.1,234.6 L72.3,242.2 L69.6,248.0 L64.1,256.4 L67.2,260.8 L67.4,266.8 L66.2,272.6 L62.4,274.6 L59.4,276.7 L56.5,280.6 L54.5,285.0 L55.0,288.3 L54.1,294.0 L54.1,298.9 L56.4,305.3 L58.0,313.6 L54.9,319.8 L50.7,324.2 L50.9,329.3 L49.4,333.8 L45.8,334.8 L46.0,338.3 L46.4,343.2 L43.7,345.6 L45.8,348.9 L43.8,351.9 L43.2,358.4 L43.6,361.5 L42.9,364.8 L43.6,369.2 L43.8,371.4 L44.7,376.5 L44.1,380.0 L39.6,379.7 L38.7,384.3 L39.3,388.9 L39.0,393.8 L42.8,397.6 L44.8,400.8 L43.3,404.0 L47.2,407.5 L45.7,410.8 L43.4,416.2 L44.0,420.8 L50.0,420.4 L55.6,423.6 L53.9,426.2 L47.7,426.9 L42.1,427.7 L40.3,429.5 L43.9,429.9 L49.1,432.5 L51.9,436.8 L49.0,439.7 L45.9,440.9 L44.7,442.9 L44.7,446.3 L45.9,450.5 L43.1,452.8 L46.7,461.6 L42.1,466.8 L43.1,470.2 L40.0,473.4 L36.3,475.3 L35.3,478.7 L32.3,480.5 L33.9,484.6 L35.8,488.4 L35.2,492.2 L32.3,499.5 L24.9,503.6 L15.6,519.4 L18.5,526.6 L21.4,534.4 L30.4,533.0 L35.3,534.7 L36.7,544.1 L35.7,550.3 L40.3,556.4 L94.7,562.2 L91.1,550.3 L110.8,518.7 L121.9,497.4 L140.3,488.0 L144.5,475.6 L114.2,456.1 L131.4,433.4 L146.5,431.1 L151.0,416.8 L159.2,399.0 L167.1,389.0 L165.4,381.5 L154.9,377.2 L174.3,362.4 L201.7,347.6 L200.6,346.1 L204.3,331.7 L228.9,322.7 L289.5,274.7 L268.2,238.8 L263.4,220.1 L267.6,210.9 L268.8,194.3 L272.2,180.0 L275.7,165.0 L287.0,154.5 L296.2,144.0 L304.9,132.3 L313.1,126.4 L320.6,121.2 L328.2,116.3 L332.8,113.1 L338.3,110.5 L339.1,108.3 L340.4,106.5 L340.3,104.3 L339.9,102.3 L340.0,99.5 L340.4,96.5 L338.6,89.6 L337.9,87.8 L338.2,85.9 L337.9,84.3 L336.6,83.1 L333.8,83.0 L330.1,82.0 L325.7,82.9 L324.4,92.6 L321.4,101.7 L314.2,107.1 L309.4,112.8 L298.0,116.4 L291.1,116.8 L283.9,116.5 L272.1,112.8 L260.3,111.7 L262.3,107.9 L265.8,101.5 L267.5,95.9 L272.5,89.9 L274.4,83.5 L274.9,77.1 L267.8,72.0 L263.0,70.4 L255.6,67.0 L247.5,61.6 L231.0,53.9 L223.1,51.2 L216.4,44.7 L212.5,42.3 L206.0,37.1 L203.9,34.3 L202.1,31.7 L200.6,29.1 L197.9,26.0 L194.2,22.5 L191.3,18.6 L171.8,20.6 L168.8,26.5 L166.5,33.7 L164.8,28.5 L163.1,23.2 L145.4,19.8 L135.4,14.1 Z";

function MapaZonas({ agencias }) {
  const [metrica, setMetrica] = useState("facturacion"); // facturacion | pax
  const [hover, setHover] = useState(null);

  const zonas = useMemo(() => resumenPorZona(agencias), [agencias]);
  const maxVal = Math.max(...zonas.map((z) => z[metrica]), 1);

  const radio = (val) => 8 + (val / maxVal) * 30; // 8..38 px
  const totalFact = zonas.reduce((s, z) => s + z.facturacion, 0);
  const totalPaxC = zonas.reduce((s, z) => s + z.pax, 0);

  return (
    <div className="space-y-5">
      {/* Selector de métrica */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 w-fit">
          {[
            { k: "facturacion", lbl: "Facturación" },
            { k: "pax", lbl: "Pasajeros" },
          ].map((o) => (
            <button key={o.k} onClick={() => setMetrica(o.k)}
              className="text-sm font-medium px-4 py-1.5 rounded-md transition-colors"
              style={metrica === o.k
                ? { background: "#fff", color: BRAND.abismo, boxShadow: "0 1px 2px rgba(0,0,0,0.06)" }
                : { color: "#64748b", background: "transparent" }}>
              {o.lbl}
            </button>
          ))}
        </div>
        <div className="flex gap-3 text-sm">
          <span className="text-slate-500">Total canal:</span>
          <span className="font-semibold text-slate-800">{fmt(totalFact)}</span>
          <span className="text-slate-300">·</span>
          <span className="font-semibold text-slate-800">{totalPaxC.toLocaleString("es-AR")} pax</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Mapa */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-4 relative">
          <div className="relative">
            <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} className="w-full" style={{ maxHeight: 560 }}>
              {/* Fondo agua */}
              <rect x="0" y="0" width={VIEW.w} height={VIEW.h} fill={BRAND.espuma} rx="12" />
              {/* País */}
              <path d={AR_PATH} fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />

              {/* Burbujas por zona */}
              {zonas.map((z) => {
                const p = proj(z.lat, z.lng);
                const re = radio(z[metrica]);
                const active = hover === z.zona;
                return (
                  <g key={z.zona}
                    onMouseEnter={() => setHover(z.zona)}
                    onMouseLeave={() => setHover(null)}
                    style={{ cursor: "pointer" }}>
                    <circle cx={p.x} cy={p.y} r={re}
                      fill={BRAND.turquesa} fillOpacity={active ? 0.5 : 0.32}
                      stroke={BRAND.marea} strokeWidth={active ? 2 : 1.5} />
                    <circle cx={p.x} cy={p.y} r={3} fill={BRAND.marea} />
                  </g>
                );
              })}

              {/* Tooltip */}
              {hover && (() => {
                const z = zonas.find((x) => x.zona === hover);
                const p = proj(z.lat, z.lng);
                const boxW = 150, boxH = 64;
                let bx = p.x + 12, by = p.y - boxH - 8;
                if (bx + boxW > VIEW.w) bx = p.x - boxW - 12;
                if (by < 0) by = p.y + 12;
                return (
                  <g>
                    <rect x={bx} y={by} width={boxW} height={boxH} rx="8"
                      fill={BRAND.abismo} fillOpacity="0.96" />
                    <text x={bx + 12} y={by + 20} fill="#fff" fontSize="11" fontWeight="700">{z.label}</text>
                    <text x={bx + 12} y={by + 38} fill="#cbd5e1" fontSize="10">{fmt(z.facturacion)}</text>
                    <text x={bx + 12} y={by + 53} fill="#cbd5e1" fontSize="10">{z.pax} pax · {z.agencias} ag.</text>
                  </g>
                );
              })()}
            </svg>
            <p className="text-xs text-slate-400 text-center mt-2">
              El tamaño de cada burbuja representa {metrica === "facturacion" ? "la facturación" : "los pasajeros"} de la zona. Pasá el mouse para ver el detalle.
            </p>
          </div>
        </div>

        {/* Ranking de zonas */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Zonas por {metrica === "facturacion" ? "facturación" : "pasajeros"}</h3>
            <p className="text-sm text-slate-500 mt-0.5">Ordenadas de mayor a menor</p>
          </div>
          <div className="divide-y divide-slate-100">
            {[...zonas].sort((a, b) => b[metrica] - a[metrica]).map((z, i) => {
              const val = z[metrica];
              return (
                <div key={z.zona}
                  onMouseEnter={() => setHover(z.zona)}
                  onMouseLeave={() => setHover(null)}
                  className="px-5 py-3.5 transition-colors"
                  style={{ background: hover === z.zona ? BRAND.espuma : "transparent" }}>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-300 w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">{z.label}</p>
                      <p className="text-xs text-slate-400">{z.agencias} {z.agencias === 1 ? "agencia" : "agencias"} · {z.activas} activas</p>
                    </div>
                    <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                      {metrica === "facturacion" ? fmt(val) : `${val} pax`}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: (val / maxVal * 100) + "%", background: BRAND.turquesa }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}


// ═════════════════════════════════════════════════════════════
// VISTA: Productos (catálogo de excursiones y tarifas)
// ═════════════════════════════════════════════════════════════
function Productos({ productos, setProductos }) {
  const [editId, setEditId] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [showForm, setShowForm] = useState(false);

  const guardarPrecio = (id) => {
    const n = parseFloat(editVal);
    if (!isNaN(n) && n >= 0) {
      setProductos(productos.map((p) => (p.id === id ? { ...p, precioBase: Math.round(n) } : p)));
    }
    setEditId(null);
    setEditVal("");
  };

  const toggleActivo = (id) =>
    setProductos(productos.map((p) => (p.id === id ? { ...p, activo: !p.activo } : p)));

  const activos = productos.filter((p) => p.activo).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <p className="text-sm text-slate-500">
          {productos.length} productos en el catálogo · <span className="text-emerald-600 font-medium">{activos} activos</span>.
          El precio base es la tarifa de referencia; cada agencia puede tener su precio propio.
        </p>
        <button onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 text-white text-sm font-medium px-4 py-2 rounded-lg transition-opacity hover:opacity-90 shrink-0"
          style={{ background: BRAND.abismo }}>
          <Plus size={16} /> Nuevo producto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {productos.map((p) => (
          <div key={p.id}
            className="bg-white rounded-xl border border-slate-200 p-5 transition-all"
            style={{ opacity: p.activo ? 1 : 0.6 }}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-11 h-11 rounded-lg flex items-center justify-center"
                style={{ background: (p.color || BRAND.marea) + "18" }}>
                <Ship size={22} style={{ color: p.color || BRAND.marea }} />
              </div>
              <button onClick={() => toggleActivo(p.id)}
                className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                  p.activo ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}>
                {p.activo ? "Activo" : "Inactivo"}
              </button>
            </div>
            <h3 className="font-semibold text-slate-800 leading-tight">{p.nombre}</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-400">
              {p.salida && <span className="flex items-center gap-1"><MapPin size={11} /> {p.salida}</span>}
              {p.duracion && <span className="flex items-center gap-1"><Clock size={11} /> {p.duracion}</span>}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-1">Precio base (adulto)</p>
              {editId === p.id ? (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input value={editVal} onChange={(e) => setEditVal(e.target.value)} autoFocus type="number"
                      onKeyDown={(e) => { if (e.key === "Enter") guardarPrecio(p.id); if (e.key === "Escape") setEditId(null); }}
                      className="w-full pl-6 pr-2 py-1.5 text-sm rounded-lg border border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
                  </div>
                  <button onClick={() => guardarPrecio(p.id)}
                    className="text-xs font-medium text-white px-3 py-1.5 rounded-lg" style={{ background: BRAND.verdeOk }}>
                    OK
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-xl font-bold text-slate-800">{fmt(p.precioBase)}</p>
                  <button onClick={() => { setEditId(p.id); setEditVal(String(p.precioBase)); }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-cyan-700 hover:text-cyan-800">
                    <Pencil size={13} /> Editar
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showForm && <ProductoForm onClose={() => setShowForm(false)}
        onSave={(prod) => { setProductos([...productos, prod]); setShowForm(false); }} />}
    </div>
  );
}

// Formulario de nuevo producto
function ProductoForm({ onClose, onSave }) {
  const [form, setForm] = useState({ nombre: "", salida: "", duracion: "", precioBase: "" });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = () => {
    if (!form.nombre.trim() || form.precioBase === "") return;
    const COLORES = ["#0f3d63", "#16a3b8", "#0e7490", "#0891b2", "#155e75", "#0284c7", "#0d9488"];
    onSave({
      id: "prod-" + Date.now(),
      nombre: form.nombre.trim(),
      salida: form.salida.trim() || "Tigre",
      duracion: form.duracion.trim() || "—",
      precioBase: Math.round(parseFloat(form.precioBase)) || 0,
      color: COLORES[Math.floor(Math.random() * COLORES.length)],
      activo: true,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Nuevo producto</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <Field label="Nombre de la excursión">
            <input value={form.nombre} onChange={set("nombre")} autoFocus placeholder="Ej: Paseo nocturno por el Delta"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Punto de salida">
              <input value={form.salida} onChange={set("salida")} placeholder="Ej: Tigre"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500" />
            </Field>
            <Field label="Duración">
              <input value={form.duracion} onChange={set("duracion")} placeholder="Ej: 1:30 hs"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500" />
            </Field>
          </div>
          <Field label="Precio base (adulto)">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input value={form.precioBase} onChange={set("precioBase")} type="number" placeholder="0"
                className="w-full pl-7 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500" />
            </div>
          </Field>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg py-2 hover:bg-slate-50">
            Cancelar
          </button>
          <button onClick={submit} className="flex-1 text-sm font-medium text-white rounded-lg py-2 hover:opacity-90" style={{ background: BRAND.abismo }}>
            Crear producto
          </button>
        </div>
      </div>
    </div>
  );
}

function Pipeline({ pipeline, moverTarjeta }) {
  const [dragId, setDragId] = useState(null);
  const totalPorEtapa = (key) =>
    pipeline.filter((p) => p.etapa === key).reduce((s, p) => s + p.valorMes, 0);

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {ETAPAS.map((etapa) => {
          const cards = pipeline.filter((p) => p.etapa === etapa.key);
          return (
            <div key={etapa.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragId != null) { moverTarjeta(dragId, etapa.key); setDragId(null); } }}
              className="bg-slate-100/70 rounded-xl p-3 min-h-[200px]">
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: etapa.color }} />
                  <h4 className="text-sm font-semibold text-slate-700">{etapa.label}</h4>
                </div>
                <span className="text-xs font-medium text-slate-500 bg-white px-2 py-0.5 rounded-full">{cards.length}</span>
              </div>
              <p className="text-xs text-slate-500 mb-3 px-1 font-medium">{fmt(totalPorEtapa(etapa.key))}/mes</p>
              <div className="space-y-2.5">
                {cards.map((c) => {
                  const idx = ETAPAS.findIndex((e) => e.key === etapa.key);
                  return (
                    <div key={c.id} draggable onDragStart={() => setDragId(c.id)}
                      className="bg-white rounded-lg border border-slate-200 p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group"
                      style={{ borderLeft: `3px solid ${etapa.color}` }}>
                      <p className="font-medium text-slate-800 text-sm leading-tight">{c.agencia}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-1"><MapPin size={11} /> {c.ciudad}</p>
                      <p className="text-base font-bold text-slate-800 mt-2">{fmt(c.valorMes)}<span className="text-xs font-normal text-slate-400">/mes</span></p>
                      <div className="flex items-center gap-1.5 mt-2.5">
                        <Avatar name={c.ejecutivo} size={20} />
                        <span className="text-xs text-slate-500">{c.ejecutivo}</span>
                      </div>
                      <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        {idx > 0 && (
                          <button onClick={() => moverTarjeta(c.id, ETAPAS[idx - 1].key)}
                            className="text-xs flex-1 py-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50">← Atrás</button>
                        )}
                        {idx < ETAPAS.length - 1 && (
                          <button onClick={() => moverTarjeta(c.id, ETAPAS[idx + 1].key)}
                            className="text-xs flex-1 py-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 inline-flex items-center justify-center gap-1">
                            Avanzar <ArrowRight size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {cards.length === 0 && (
                  <div className="text-center text-xs text-slate-400 py-6 border-2 border-dashed border-slate-200 rounded-lg">
                    Arrastrá tarjetas aquí
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-400 mt-4 text-center">
        Arrastrá las tarjetas entre columnas o usá las flechas para mover una agencia de etapa.
      </p>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// VISTA: Distribución (equipo)
// ═════════════════════════════════════════════════════════════
function Distribucion({ agencias }) {
  const [activos, setActivos] = useState(Object.fromEntries(EJECUTIVOS.map((v) => [v, true])));
  const [roundRobin, setRoundRobin] = useState(false);

  const agenciasDe = (v) => agencias.filter((a) => a.ejecutivo === v);
  const paxDe = (v) => agenciasDe(v).reduce((s, a) => s + totalPax(a), 0);
  const maxPax = Math.max(...EJECUTIVOS.map(paxDe), 1);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg" style={{ background: BRAND.espuma }}>
              <Zap size={20} style={{ color: BRAND.turquesa }} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Asignación automática (Round Robin)</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md">
                Reparte las nuevas agencias de forma equitativa entre los ejecutivos activos, en orden rotativo.
              </p>
            </div>
          </div>
          <button onClick={() => setRoundRobin(!roundRobin)}
            className="relative w-12 h-7 rounded-full transition-colors shrink-0"
            style={{ background: roundRobin ? BRAND.verdeOk : "#cbd5e1" }}>
            <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform shadow ${roundRobin ? "translate-x-5" : ""}`} />
          </button>
        </div>
        {roundRobin && (
          <div className="mt-4 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-4 py-2.5 flex items-center gap-2">
            <Zap size={15} /> Round Robin activo — las nuevas agencias se reparten automáticamente.
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Equipo de cuentas</h3>
          <p className="text-sm text-slate-500 mt-0.5">Carga de agencias y pasajeros por ejecutivo</p>
        </div>
        <div className="divide-y divide-slate-100">
          {EJECUTIVOS.map((v) => {
            const nAg = agenciasDe(v).length;
            const pax = paxDe(v);
            return (
              <div key={v} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <Avatar name={v} size={40} />
                  <div>
                    <p className="font-medium text-slate-800">{v}</p>
                    <p className="text-xs text-slate-500">
                      {nAg} {nAg === 1 ? "agencia" : "agencias"} · {pax} pasajeros
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                    <div className="h-full rounded-full transition-all" style={{ width: (pax / maxPax * 100) + "%", background: BRAND.turquesa }} />
                  </div>
                  <button onClick={() => setActivos({ ...activos, [v]: !activos[v] })}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                      activos[v] ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}>
                    {activos[v] ? "Activo" : "Inactivo"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// APP PRINCIPAL
// ═════════════════════════════════════════════════════════════
const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "agencias", label: "Agencias", icon: Building2 },
  { key: "productos", label: "Productos", icon: Package },
  { key: "mapa", label: "Mapa de zonas", icon: MapIcon },
  { key: "pipeline", label: "Captación", icon: KanbanSquare },
  { key: "distribucion", label: "Equipo", icon: Users },
];

// Indicador de estado de sincronización con la nube
function SyncBadge({ habilitado, estado }) {
  if (!habilitado) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full bg-amber-50 text-amber-700"
        title="Los cambios solo se guardan en este navegador">
        <CloudOff size={14} /> Modo local
      </span>
    );
  }
  const cfg = {
    idle:      { icon: Cloud, txt: "En la nube", cls: "bg-emerald-50 text-emerald-700", spin: false },
    guardando: { icon: Loader2, txt: "Guardando…", cls: "bg-sky-50 text-sky-700", spin: true },
    guardado:  { icon: CheckCircle2, txt: "Guardado", cls: "bg-emerald-50 text-emerald-700", spin: false },
    error:     { icon: AlertTriangle, txt: "Error al guardar", cls: "bg-rose-50 text-rose-700", spin: false },
  }[estado] || { icon: Cloud, txt: "En la nube", cls: "bg-emerald-50 text-emerald-700", spin: false };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full ${cfg.cls}`}>
      <Icon size={14} className={cfg.spin ? "animate-spin" : ""} /> {cfg.txt}
    </span>
  );
}

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [verificandoSesion, setVerificandoSesion] = useState(supabaseHabilitado);

  // Recuperar sesión activa al iniciar (si ya inició sesión antes)
  useEffect(() => {
    if (!supabaseHabilitado) { setVerificandoSesion(false); return; }
    let activo = true;
    (async () => {
      try {
        const sesion = await getSession();
        if (activo && sesion?.user) setUsuario(sesion.user);
      } catch (e) {
        console.error("Error verificando sesión:", e);
      } finally {
        if (activo) setVerificandoSesion(false);
      }
    })();
    // Escuchar cambios de sesión (logout en otra pestaña, expiración, etc.)
    const { data } = onAuthChange((sesion) => {
      if (activo) setUsuario(sesion?.user || null);
    });
    return () => { activo = false; data?.subscription?.unsubscribe?.(); };
  }, []);
  const [vista, setVista] = useState("dashboard");
  const [agencias, setAgencias] = useState([]);
  const [pipeline, setPipeline] = useState(PIPELINE_INICIAL);
  const [productos, setProductos] = useState(PRODUCTOS_INICIALES);

  // Estado de sincronización con la nube
  const [cargando, setCargando] = useState(supabaseHabilitado);
  const [syncEstado, setSyncEstado] = useState("idle"); // idle | guardando | guardado | error
  const primeraCarga = useRef(true);

  // Cargar datos de Supabase al iniciar (una vez)
  useEffect(() => {
    if (!supabaseHabilitado) { setCargando(false); return; }
    let activo = true;
    (async () => {
      try {
        const datos = await cargarDatos([], PRODUCTOS_INICIALES);
        if (activo && datos) {
          setAgencias(datos.agencias);
          setProductos(datos.productos);
        }
      } catch (e) {
        console.error("Error cargando de Supabase:", e);
        if (activo) setSyncEstado("error");
      } finally {
        if (activo) { setCargando(false); }
      }
    })();
    return () => { activo = false; };
  }, []);

  // Guardar agencias automáticamente cuando cambian (con debounce)
  useEffect(() => {
    if (!supabaseHabilitado || cargando) return;
    setSyncEstado("guardando");
    const t = setTimeout(async () => {
      try {
        await guardarAgencias(agencias);
        setSyncEstado("guardado");
        setTimeout(() => setSyncEstado("idle"), 1500);
      } catch (e) {
        console.error("Error guardando agencias:", e);
        setSyncEstado("error");
      }
    }, 800);
    return () => clearTimeout(t);
  }, [agencias, cargando]);

  // Guardar productos automáticamente cuando cambian (con debounce)
  useEffect(() => {
    if (!supabaseHabilitado || cargando) return;
    const t = setTimeout(async () => {
      try {
        await guardarProductos(productos);
      } catch (e) {
        console.error("Error guardando productos:", e);
      }
    }, 800);
    return () => clearTimeout(t);
  }, [productos, cargando]);

  if (verificandoSesion) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: BRAND.abismo }}>
        <Loader2 size={40} className="text-white animate-spin mb-4" />
        <p className="text-white/80 text-sm">Verificando sesión...</p>
      </div>
    );
  }

  if (!usuario) return <Login onLogin={setUsuario} />;

  if (cargando) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: BRAND.abismo }}>
        <Loader2 size={40} className="text-white animate-spin mb-4" />
        <p className="text-white/80 text-sm">Cargando datos del canal...</p>
      </div>
    );
  }

  const addAgencia = (a) => {
    const geo = geoDeCiudad(a.ciudad, Date.now());
    setAgencias([{ ...a, id: Date.now(), reservas: [], visitas: [], precios: {}, ...geo }, ...agencias]);
  };

  const deleteAgencia = (agId) =>
    setAgencias(agencias.filter((a) => a.id !== agId));

  const addVisita = (agId, visita) =>
    setAgencias(agencias.map((a) =>
      a.id === agId
        ? { ...a, visitas: [{ ...visita, id: `vis-${Date.now()}` }, ...(a.visitas || [])] }
        : a
    ));

  const setPreciosAgencia = (agId, precios, condicionPago) =>
    setAgencias(agencias.map((a) =>
      a.id === agId ? { ...a, precios, condicionPago } : a
    ));

  const addReserva = (agId, reserva) =>
    setAgencias(agencias.map((a) =>
      a.id === agId
        ? { ...a, reservas: [{ ...reserva, id: `res-${Date.now()}` }, ...(a.reservas || [])] }
        : a
    ));

  // Importa agencias del Excel: agrega las que no existan (por nombre)
  const importarAgencias = (nuevas) => {
    setAgencias((prev) => {
      const existentes = new Set(prev.map((a) => a.nombre.toLowerCase()));
      const aAgregar = nuevas
        .filter((n) => !existentes.has(n.nombre.toLowerCase()))
        .map((n, i) => {
          const geo = geoDeCiudad("CABA", Date.now() + i);
          return {
            id: Date.now() + i,
            nombre: n.nombre,
            contacto: "—", email: "—", telefono: "—",
            ciudad: "CABA", direccion: "Importada del ranking anual",
            ...geo,
            estado: "Activa",
            ejecutivo: EJECUTIVOS[i % EJECUTIVOS.length],
            desde: new Date().toISOString().slice(0, 10),
            condicionPago: "Contado",
            precios: {},
            reservas: [],
            visitas: [],
            paxAnual: n.total,
            mesesImport: n.meses,
          };
        });
      return [...aAgregar, ...prev];
    });
  };

  const moverTarjeta = (id, etapa) =>
    setPipeline(pipeline.map((p) => (p.id === id ? { ...p, etapa } : p)));

  const titulos = {
    dashboard: { t: "Dashboard del canal", s: "Visión general de agencias y pasajeros" },
    agencias: { t: "Gestión de agencias", s: "Detalle, histórico, precios y reservas" },
    productos: { t: "Productos y tarifas", s: "Catálogo de excursiones del canal" },
    mapa: { t: "Mapa de zonas", s: "Valor económico y pasajeros por región" },
    pipeline: { t: "Captación de agencias", s: "Pipeline de alta de nuevos operadores" },
    distribucion: { t: "Equipo de cuentas", s: "Asignación y carga por ejecutivo" },
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-60 flex flex-col fixed h-full" style={{ background: BRAND.abismo }}>
        <div className="px-5 py-5 border-b border-white/10">
          <Logo size={34} light />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => {
            const active = vista === item.key;
            return (
              <button key={item.key} onClick={() => setVista(item.key)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={active
                  ? { background: BRAND.turquesa, color: "#fff" }
                  : { color: "rgba(255,255,255,0.6)" }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                <item.icon size={18} /> {item.label}
                {active && <ChevronRight size={16} className="ml-auto" />}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar name={usuario.email || "Usuario"} size={36} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{usuario.email || "Usuario"}</p>
              <p className="text-xs text-white/50 truncate">Sesión activa</p>
            </div>
          </div>
          <button onClick={async () => { await signOut(); setUsuario(null); }}
            className="w-full flex items-center gap-2 px-2 py-2 mt-1 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/6 transition-colors">
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-60">
        <header className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-10 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">{titulos[vista].t}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{titulos[vista].s}</p>
          </div>
          <SyncBadge habilitado={supabaseHabilitado} estado={syncEstado} />
        </header>

        <div className="p-8">
          {vista === "dashboard" && <Dashboard agencias={agencias} />}
          {vista === "agencias" && <Agencias agencias={agencias} addAgencia={addAgencia} addVisita={addVisita} deleteAgencia={deleteAgencia} productos={productos} setPreciosAgencia={setPreciosAgencia} importarAgencias={importarAgencias} addReserva={addReserva} />}
          {vista === "productos" && <Productos productos={productos} setProductos={setProductos} />}
          {vista === "mapa" && <MapaZonas agencias={agencias} />}
          {vista === "pipeline" && <Pipeline pipeline={pipeline} moverTarjeta={moverTarjeta} />}
          {vista === "distribucion" && <Distribucion agencias={agencias} />}
        </div>
      </main>
    </div>
  );
}
