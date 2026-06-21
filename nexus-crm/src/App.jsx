import React, { useState, useMemo } from "react";
import {
  LayoutDashboard, Megaphone, KanbanSquare, Settings, Users,
  TrendingUp, DollarSign, Target, Percent, Plus, Search,
  X, Flame, Snowflake, Thermometer, ArrowRight, Trophy,
  XCircle, Zap, Circle, Filter, MoreVertical, ChevronRight,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ─────────────────────────────────────────────────────────────
// Datos ficticios iniciales
// ─────────────────────────────────────────────────────────────
const VENDEDORES = ["Lucía Fernández", "Martín Gómez", "Sofía Ruiz", "Diego Torres"];

const ORIGENES = {
  "Meta Ads": "#2563eb",
  "Google": "#dc2626",
  "Orgánico": "#16a34a",
  "WhatsApp": "#059669",
};

const LEADS_INICIALES = [
  { id: 1, nombre: "Comercial San Telmo", origen: "Meta Ads", fecha: "2026-06-18", estado: "Caliente", vendedor: "Lucía Fernández", valor: 45000 },
  { id: 2, nombre: "Estudio Belgrano", origen: "Google", fecha: "2026-06-18", estado: "Tibio", vendedor: "Martín Gómez", valor: 28000 },
  { id: 3, nombre: "Distribuidora Norte", origen: "WhatsApp", fecha: "2026-06-17", estado: "Caliente", vendedor: "Sofía Ruiz", valor: 92000 },
  { id: 4, nombre: "Café del Puerto", origen: "Orgánico", fecha: "2026-06-17", estado: "Frío", vendedor: "Diego Torres", valor: 15000 },
  { id: 5, nombre: "Logística Tigre", origen: "Meta Ads", fecha: "2026-06-16", estado: "Tibio", vendedor: "Lucía Fernández", valor: 61000 },
  { id: 6, nombre: "Inmobiliaria Centro", origen: "Google", fecha: "2026-06-16", estado: "Caliente", vendedor: "Martín Gómez", valor: 38000 },
  { id: 7, nombre: "Taller Mecánico Sur", origen: "WhatsApp", fecha: "2026-06-15", estado: "Frío", vendedor: "Sofía Ruiz", valor: 22000 },
  { id: 8, nombre: "Boutique Palermo", origen: "Meta Ads", fecha: "2026-06-15", estado: "Tibio", vendedor: "Diego Torres", valor: 34000 },
];

const PIPELINE_INICIAL = [
  { id: 101, cliente: "Comercial San Telmo", valor: 45000, vendedor: "Lucía Fernández", etapa: "calificacion" },
  { id: 102, cliente: "Distribuidora Norte", valor: 92000, vendedor: "Sofía Ruiz", etapa: "calificacion" },
  { id: 103, cliente: "Logística Tigre", valor: 61000, vendedor: "Lucía Fernández", etapa: "negociacion" },
  { id: 104, cliente: "Inmobiliaria Centro", valor: 38000, vendedor: "Martín Gómez", etapa: "negociacion" },
  { id: 105, cliente: "Mayorista Once", valor: 120000, vendedor: "Sofía Ruiz", etapa: "ganado" },
  { id: 106, cliente: "Kiosco Express", valor: 18000, vendedor: "Diego Torres", etapa: "ganado" },
  { id: 107, cliente: "Restó Costanera", valor: 27000, vendedor: "Martín Gómez", etapa: "perdido" },
];

const DATOS_MENSUALES = [
  { mes: "Ene", leads: 145, ingresos: 320 },
  { mes: "Feb", leads: 168, ingresos: 385 },
  { mes: "Mar", leads: 192, ingresos: 410 },
  { mes: "Abr", leads: 210, ingresos: 478 },
  { mes: "May", leads: 235, ingresos: 540 },
  { mes: "Jun", leads: 258, ingresos: 612 },
];

const ETAPAS = [
  { key: "calificacion", label: "Contactado / Calificación", color: "#3b82f6", icon: Circle },
  { key: "negociacion", label: "Negociación / Presupuesto", color: "#f59e0b", icon: Thermometer },
  { key: "ganado", label: "Ganado", color: "#16a34a", icon: Trophy },
  { key: "perdido", label: "Perdido", color: "#ef4444", icon: XCircle },
];

const ESTADO_CONFIG = {
  Frío: { color: "#3b82f6", bg: "#eff6ff", icon: Snowflake },
  Tibio: { color: "#f59e0b", bg: "#fffbeb", icon: Thermometer },
  Caliente: { color: "#ef4444", bg: "#fef2f2", icon: Flame },
};

const fmt = (n) => "$" + n.toLocaleString("es-AR");

// ─────────────────────────────────────────────────────────────
// Componentes auxiliares
// ─────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, delta, accent }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all">
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

function Badge({ estado }) {
  const c = ESTADO_CONFIG[estado];
  const Icon = c.icon;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
      style={{ color: c.color, background: c.bg }}>
      <Icon size={12} /> {estado}
    </span>
  );
}

function Avatar({ name, size = 28 }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2);
  const hue = name.charCodeAt(0) * 7 % 360;
  return (
    <div className="rounded-full flex items-center justify-center font-semibold text-white shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38, background: `hsl(${hue}, 55%, 50%)` }}>
      {initials}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Vista: Dashboard
// ─────────────────────────────────────────────────────────────
function Dashboard({ leads, pipeline }) {
  const totalLeads = leads.length;
  const ganados = pipeline.filter((p) => p.etapa === "ganado");
  const facturacion = ganados.reduce((s, p) => s + p.valor, 0);
  const conversion = ((ganados.length / pipeline.length) * 100).toFixed(1);

  const embudo = [
    { etapa: "Leads Marketing", cantidad: 258, color: "#1e3a8a" },
    { etapa: "Calificación", cantidad: 148, color: "#2563eb" },
    { etapa: "Negociación", cantidad: 86, color: "#0891b2" },
    { etapa: "Venta Cerrada", cantidad: 52, color: "#16a34a" },
  ];
  const maxEmbudo = embudo[0].cantidad;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard icon={Users} label="Leads Totales" value="258" delta="+12%" accent="#2563eb" />
        <KpiCard icon={Percent} label="Tasa de Conversión" value={conversion + "%"} delta="+3.2%" accent="#16a34a" />
        <KpiCard icon={Target} label="Costo por Lead (CPL)" value="$1.240" delta="-8%" accent="#7c3aed" />
        <KpiCard icon={TrendingUp} label="ROI" value="340%" delta="+24%" accent="#0891b2" />
        <KpiCard icon={DollarSign} label="Facturación Total" value={fmt(facturacion)} delta="+18%" accent="#059669" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Embudo */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-1">Embudo de Conversión</h3>
          <p className="text-sm text-slate-500 mb-5">Marketing → Comercial → Venta</p>
          <div className="space-y-3">
            {embudo.map((e, i) => {
              const pct = (e.cantidad / maxEmbudo) * 100;
              const conv = i > 0 ? ((e.cantidad / embudo[i - 1].cantidad) * 100).toFixed(0) : null;
              return (
                <div key={e.etapa}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-slate-600 font-medium">{e.etapa}</span>
                    <span className="text-slate-800 font-semibold">
                      {e.cantidad}
                      {conv && <span className="text-slate-400 font-normal ml-2">({conv}%)</span>}
                    </span>
                  </div>
                  <div className="h-9 bg-slate-100 rounded-lg overflow-hidden">
                    <div className="h-full rounded-lg flex items-center justify-end pr-3 transition-all duration-700"
                      style={{ width: pct + "%", background: e.color }}>
                      <span className="text-white text-xs font-semibold">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Líneas */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-1">Leads e Ingresos Mensuales</h3>
          <p className="text-sm text-slate-500 mb-5">Ingresos en miles de $ARS</p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={DATOS_MENSUALES} margin={{ left: -20, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Line type="monotone" dataKey="leads" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} name="Leads" />
              <Line type="monotone" dataKey="ingresos" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 3 }} name="Ingresos" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Barras */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-800 mb-5">Volumen de Leads por Mes</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={DATOS_MENSUALES} margin={{ left: -20, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="mes" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }} cursor={{ fill: "#f8fafc" }} />
            <Bar dataKey="leads" fill="#2563eb" radius={[6, 6, 0, 0]} name="Leads" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Vista: Marketing (Leads)
// ─────────────────────────────────────────────────────────────
function Marketing({ leads, addLead, updateEstado }) {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filtroOrigen, setFiltroOrigen] = useState("Todos");
  const [filtroEstado, setFiltroEstado] = useState("Todos");

  const filtrados = useMemo(() => leads.filter((l) =>
    l.nombre.toLowerCase().includes(search.toLowerCase()) &&
    (filtroOrigen === "Todos" || l.origen === filtroOrigen) &&
    (filtroEstado === "Todos" || l.estado === filtroEstado)
  ), [leads, search, filtroOrigen, filtroEstado]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar lead..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
        </div>
        <button onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus size={16} /> Nuevo lead
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter size={15} className="text-slate-400" />
        <FilterGroup label="Origen" value={filtroOrigen} setValue={setFiltroOrigen}
          options={["Todos", ...Object.keys(ORIGENES)]} />
        <FilterGroup label="Estado" value={filtroEstado} setValue={setFiltroEstado}
          options={["Todos", "Frío", "Tibio", "Caliente"]} />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-slate-500">
                <th className="px-5 py-3 font-medium">Nombre</th>
                <th className="px-5 py-3 font-medium">Origen</th>
                <th className="px-5 py-3 font-medium">Fecha</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3 font-medium">Asignado a</th>
                <th className="px-5 py-3 font-medium text-right">Valor est.</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((l) => (
                <tr key={l.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-medium text-slate-800">{l.nombre}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1.5 text-slate-600">
                      <span className="w-2 h-2 rounded-full" style={{ background: ORIGENES[l.origen] }} />
                      {l.origen}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{l.fecha}</td>
                  <td className="px-5 py-3">
                    <select value={l.estado} onChange={(e) => updateEstado(l.id, e.target.value)}
                      className="text-xs font-medium border-0 rounded-full px-2 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      style={{ color: ESTADO_CONFIG[l.estado].color, background: ESTADO_CONFIG[l.estado].bg }}>
                      <option>Frío</option><option>Tibio</option><option>Caliente</option>
                    </select>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Avatar name={l.vendedor} size={24} /> {l.vendedor}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-700">{fmt(l.valor)}</td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                  No hay leads que coincidan. Ajustá los filtros o agregá uno nuevo.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && <LeadForm onClose={() => setShowForm(false)} onSave={addLead} />}
    </div>
  );
}

function FilterGroup({ label, value, setValue, options }) {
  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
      {options.map((o) => (
        <button key={o} onClick={() => setValue(o)}
          className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
            value === o ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}>
          {o}
        </button>
      ))}
    </div>
  );
}

function LeadForm({ onClose, onSave }) {
  const [form, setForm] = useState({
    nombre: "", origen: "Meta Ads", estado: "Frío", vendedor: VENDEDORES[0], valor: "",
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = () => {
    if (!form.nombre.trim()) return;
    onSave({
      ...form,
      valor: Number(form.valor) || 0,
      fecha: new Date().toISOString().slice(0, 10),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Nuevo lead</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <Field label="Nombre del cliente">
            <input value={form.nombre} onChange={set("nombre")} autoFocus
              placeholder="Ej: Comercial Las Lomas"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Origen">
              <select value={form.origen} onChange={set("origen")}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white">
                {Object.keys(ORIGENES).map((o) => <option key={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Estado">
              <select value={form.estado} onChange={set("estado")}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white">
                <option>Frío</option><option>Tibio</option><option>Caliente</option>
              </select>
            </Field>
          </div>
          <Field label="Asignar a vendedor">
            <select value={form.vendedor} onChange={set("vendedor")}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white">
              {VENDEDORES.map((v) => <option key={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="Valor estimado ($ARS)">
            <input value={form.valor} onChange={set("valor")} type="number" placeholder="0"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
          </Field>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose}
            className="flex-1 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg py-2 hover:bg-slate-50">
            Cancelar
          </button>
          <button onClick={submit}
            className="flex-1 text-sm font-medium text-white bg-blue-600 rounded-lg py-2 hover:bg-blue-700">
            Guardar lead
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

// ─────────────────────────────────────────────────────────────
// Vista: Pipeline (Kanban)
// ─────────────────────────────────────────────────────────────
function Pipeline({ pipeline, moverTarjeta }) {
  const [dragId, setDragId] = useState(null);

  const totalPorEtapa = (key) =>
    pipeline.filter((p) => p.etapa === key).reduce((s, p) => s + p.valor, 0);

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
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: etapa.color }} />
                  <h4 className="text-sm font-semibold text-slate-700">{etapa.label}</h4>
                </div>
                <span className="text-xs font-medium text-slate-500 bg-white px-2 py-0.5 rounded-full">
                  {cards.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3 px-1 font-medium">{fmt(totalPorEtapa(etapa.key))}</p>

              <div className="space-y-2.5">
                {cards.map((c) => (
                  <KanbanCard key={c.id} card={c} etapa={etapa}
                    onDragStart={() => setDragId(c.id)} mover={moverTarjeta} />
                ))}
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
        Arrastrá las tarjetas entre columnas o usá las flechas para cambiar de etapa.
      </p>
    </div>
  );
}

function KanbanCard({ card, etapa, onDragStart, mover }) {
  const idx = ETAPAS.findIndex((e) => e.key === etapa.key);
  return (
    <div draggable onDragStart={onDragStart}
      className="bg-white rounded-lg border border-slate-200 p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group"
      style={{ borderLeft: `3px solid ${etapa.color}` }}>
      <div className="flex items-start justify-between">
        <p className="font-medium text-slate-800 text-sm leading-tight">{card.cliente}</p>
      </div>
      <p className="text-lg font-bold text-slate-800 mt-2">{fmt(card.valor)}</p>
      <div className="flex items-center gap-1.5 mt-2.5">
        <Avatar name={card.vendedor} size={20} />
        <span className="text-xs text-slate-500">{card.vendedor}</span>
      </div>
      <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
        {idx > 0 && (
          <button onClick={() => mover(card.id, ETAPAS[idx - 1].key)}
            className="text-xs flex-1 py-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50">
            ← Atrás
          </button>
        )}
        {idx < ETAPAS.length - 1 && (
          <button onClick={() => mover(card.id, ETAPAS[idx + 1].key)}
            className="text-xs flex-1 py-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 inline-flex items-center justify-center gap-1">
            Avanzar <ArrowRight size={11} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Vista: Configuración / Distribución
// ─────────────────────────────────────────────────────────────
function Configuracion({ leads, roundRobin, setRoundRobin }) {
  const [activos, setActivos] = useState(
    Object.fromEntries(VENDEDORES.map((v) => [v, true]))
  );

  const leadsPorVendedor = (v) =>
    leads.filter((l) => l.vendedor === v).length;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Round Robin */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-50">
              <Zap size={20} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Asignación automática (Round Robin)</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md">
                Distribuye los leads entrantes de forma equitativa entre los vendedores activos, en orden rotativo.
              </p>
            </div>
          </div>
          <button onClick={() => setRoundRobin(!roundRobin)}
            className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
              roundRobin ? "bg-emerald-500" : "bg-slate-300"
            }`}>
            <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform shadow ${
              roundRobin ? "translate-x-5" : ""
            }`} />
          </button>
        </div>
        {roundRobin && (
          <div className="mt-4 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-4 py-2.5 flex items-center gap-2">
            <Zap size={15} /> Round Robin activo — los nuevos leads se reparten automáticamente.
          </div>
        )}
      </div>

      {/* Equipo */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Equipo comercial</h3>
          <p className="text-sm text-slate-500 mt-0.5">Carga de leads activos por vendedor</p>
        </div>
        <div className="divide-y divide-slate-100">
          {VENDEDORES.map((v) => {
            const carga = leadsPorVendedor(v);
            return (
              <div key={v} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <Avatar name={v} size={40} />
                  <div>
                    <p className="font-medium text-slate-800">{v}</p>
                    <p className="text-xs text-slate-500">
                      {carga} {carga === 1 ? "lead activo" : "leads activos"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                    <div className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: Math.min(carga / 4 * 100, 100) + "%" }} />
                  </div>
                  <button onClick={() => setActivos({ ...activos, [v]: !activos[v] })}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                      activos[v]
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
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

// ─────────────────────────────────────────────────────────────
// App principal
// ─────────────────────────────────────────────────────────────
const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "marketing", label: "Marketing", icon: Megaphone },
  { key: "pipeline", label: "Pipeline", icon: KanbanSquare },
  { key: "config", label: "Distribución", icon: Settings },
];

export default function App() {
  const [vista, setVista] = useState("dashboard");
  const [leads, setLeads] = useState(LEADS_INICIALES);
  const [pipeline, setPipeline] = useState(PIPELINE_INICIAL);
  const [roundRobin, setRoundRobin] = useState(false);
  const [rrIndex, setRrIndex] = useState(0);

  const addLead = (lead) => {
    let vendedor = lead.vendedor;
    if (roundRobin) {
      vendedor = VENDEDORES[rrIndex % VENDEDORES.length];
      setRrIndex(rrIndex + 1);
    }
    const nuevo = { ...lead, vendedor, id: Date.now() };
    setLeads([nuevo, ...leads]);
    setPipeline([
      { id: Date.now() + 1, cliente: lead.nombre, valor: lead.valor, vendedor, etapa: "calificacion" },
      ...pipeline,
    ]);
  };

  const updateEstado = (id, estado) =>
    setLeads(leads.map((l) => (l.id === id ? { ...l, estado } : l)));

  const moverTarjeta = (id, etapa) =>
    setPipeline(pipeline.map((p) => (p.id === id ? { ...p, etapa } : p)));

  const titulos = {
    dashboard: { t: "Dashboard General", s: "Visión unificada de Marketing y Ventas" },
    marketing: { t: "Gestión de Leads", s: "Captación y seguimiento de prospectos" },
    pipeline: { t: "Pipeline Comercial", s: "Embudo de conversión de ventas" },
    config: { t: "Distribución de Leads", s: "Equipo comercial y asignación" },
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 flex flex-col fixed h-full">
        <div className="px-6 py-6 flex items-center gap-2.5 border-b border-slate-800">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-lg flex items-center justify-center">
            <TrendingUp size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white tracking-tight">NexusCRM</p>
            <p className="text-[11px] text-slate-400">Marketing & Ventas</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => {
            const active = vista === item.key;
            return (
              <button key={item.key} onClick={() => setVista(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}>
                <item.icon size={18} /> {item.label}
                {active && <ChevronRight size={16} className="ml-auto" />}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar name="Admin Tigre" size={36} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">Admin Tigre</p>
              <p className="text-xs text-slate-400 truncate">Gerente Comercial</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-60">
        <header className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-10">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">{titulos[vista].t}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{titulos[vista].s}</p>
        </header>

        <div className="p-8">
          {vista === "dashboard" && <Dashboard leads={leads} pipeline={pipeline} />}
          {vista === "marketing" && <Marketing leads={leads} addLead={addLead} updateEstado={updateEstado} />}
          {vista === "pipeline" && <Pipeline pipeline={pipeline} moverTarjeta={moverTarjeta} />}
          {vista === "config" && <Configuracion leads={leads} roundRobin={roundRobin} setRoundRobin={setRoundRobin} />}
        </div>
      </main>
    </div>
  );
}
