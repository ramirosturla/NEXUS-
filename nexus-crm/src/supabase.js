import { createClient } from "@supabase/supabase-js";

// Credenciales del proyecto Supabase de Sturla.
// La "publishable key" es pública por diseño (puede ir en el frontend sin riesgo).
// La seguridad real la dan las contraseñas de los usuarios y las políticas RLS.
// Se pueden sobreescribir con variables de entorno (.env / Vercel) si hiciera falta.
const url =
  import.meta.env.VITE_SUPABASE_URL || "https://fuhbyfteactyihnqtdpm.supabase.co";
const key =
  import.meta.env.VITE_SUPABASE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_g-12UKgSmZEtyztoMvivyg_QNHBUkQz";

export const supabaseHabilitado = Boolean(url && key);

export const supabase = supabaseHabilitado ? createClient(url, key) : null;
