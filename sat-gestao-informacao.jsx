import React, { useState, useMemo, useEffect } from "react";
import {
  Search, Plus, X, LogOut, Building2, User, ExternalLink,
  CheckCircle2, Circle, Clock, AlertTriangle, ChevronRight, Pencil, Save, Filter, Loader2, WifiOff
} from "lucide-react";

/* ---------------------------------------------------------------
   CONEXÃO COM O SUPABASE
   A tabela "demandas" já existe e está populada. Usamos a REST API
   (PostgREST) direto via fetch — não precisa de biblioteca extra.
---------------------------------------------------------------- */
const SUPABASE_URL = "https://zenxakjmruehjgymwzvp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inplbnhha2ptcnVlaGpneW13enZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5MTc1NDMsImV4cCI6MjEwMzQ5MzU0M30.o7Bs0hyxV57hOQvktH9wperdwFbbsjesIL-lYqkocJo";
const REST = `${SUPABASE_URL}/rest/v1/demandas`;
const SB_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

// mapeia os rótulos usados na interface (iguais aos do CSV original)
// para os nomes das colunas reais na tabela do Supabase
const DB_COLS = {
  "ID": "id",
  "Projeto / Demanda": "projeto",
  "Pasta Principal": "pasta_principal",
  "Outras Pastas": "outras_pastas",
  "Servidor Responsável": "servidor_responsavel",
  "Demandante": "demandante",
  "Descrição Resumida": "descricao_resumida",
  "Próxima Entrega": "proxima_entrega",
  "Data de Entrada": "data_entrada",
  "Prazo": "prazo",
  "Situação do Prazo": "situacao_prazo",
  "Status": "status",
  "Prioridade": "prioridade",
  "Risco / Sensibilidade": "risco",
  "Interesse do Governador?": "interesse_governador",
  "Última Atualização": "ultima_atualizacao",
  "Atualização Mais Recente": "atualizacao_recente",
  "Observações": "observacoes",
  "Link SEI / Documento": "link_sei",
};
const DATE_FIELDS = new Set(["Data de Entrada", "Prazo", "Última Atualização"]);

function isoToBr(v) {
  if (!v) return "";
  const [y, m, d] = v.split("-");
  return `${d}/${m}/${y}`;
}
function brToIso(v) {
  if (!v || !v.includes("/")) return null;
  const [d, m, y] = v.split("/");
  return `${y}-${m}-${d}`;
}
function rowToUi(row) {
  const ui = {};
  for (const [uiKey, dbKey] of Object.entries(DB_COLS)) {
    let v = row[dbKey];
    if (DATE_FIELDS.has(uiKey)) v = isoToBr(v);
    else if (uiKey === "Interesse do Governador?") v = v === true ? "Sim" : v === false ? "Não" : "";
    else v = v == null ? "" : v;
    ui[uiKey] = v;
  }
  return ui;
}
function uiToRow(ui) {
  const row = {};
  for (const [uiKey, dbKey] of Object.entries(DB_COLS)) {
    let v = ui[uiKey];
    if (DATE_FIELDS.has(uiKey)) v = brToIso(v);
    else if (uiKey === "Interesse do Governador?") v = v === "Sim" ? true : v === "Não" ? false : null;
    else v = v === "" || v == null ? null : v;
    row[dbKey] = v;
  }
  return row;
}

async function apiListar() {
  const res = await fetch(`${REST}?select=*&order=id`, { headers: SB_HEADERS });
  if (!res.ok) throw new Error(`Falha ao carregar demandas (${res.status})`);
  const data = await res.json();
  return data.map(rowToUi);
}
async function apiCriar(ui) {
  const res = await fetch(REST, {
    method: "POST",
    headers: { ...SB_HEADERS, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(uiToRow(ui)),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return rowToUi(data[0]);
}
async function apiAtualizar(id, ui) {
  const row = uiToRow(ui);
  delete row.id;
  const res = await fetch(`${REST}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...SB_HEADERS, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return rowToUi(data[0]);
}

/* ---------------------------------------------------------------
   Dados de reserva — usados só se a conexão com o Supabase falhar,
   para o painel continuar navegável em modo de demonstração.
---------------------------------------------------------------- */
const SEED = [
  {"ID":"SAT-001","Projeto / Demanda":"Evolução Jovem - Menor aprendiz","Pasta Principal":"SEDESE","Outras Pastas":"SEPLAG e SEE","Servidor Responsável":"Luiz","Demandante":"Clara","Descrição Resumida":"Acompanhamento da construção de nova forma de contratação do menor aprendiz, após decisão de rescisão do contrato do Evolução Jovem","Próxima Entrega":"Compilado de informações a serem enviadas pela SEDESE, SEPLAG e SEE, para subsidiar decisão da gestão sobre a forma de contratação","Data de Entrada":"07/07/2026","Prazo":"17/07/2026","Situação do Prazo":"Concluído","Status":"Concluído","Prioridade":"Média","Risco / Sensibilidade":"Médio","Interesse do Governador?":"Sim","Última Atualização":"14/07/2026","Atualização Mais Recente":"Realizada reunião no dia 07/07 para alinhamentos iniciais sobre a nova forma de contratação. Informações enviadas pelos órgãos e compilado das informações elaborado e enviado para a Clara.","Observações":"","Link SEI / Documento":""},
  {"ID":"SAT-002","Projeto / Demanda":"Coordenação do Grupo de Trabalho da Copa do Mundo de Futebol Feminino 2027","Pasta Principal":"SEDESE","Outras Pastas":"Todas que compõem o GT da Copa","Servidor Responsável":"Luiz","Demandante":"Clara","Descrição Resumida":"Acompanhamento de demandas relativas à Copa do Mundo Feminina em 2027, fazendo a articulação dos órgãos estaduais","Próxima Entrega":"Reunião do GT · Plano de Comunicação da Copa · Team Handbook","Data de Entrada":"05/05/2026","Prazo":"31/12/2026","Situação do Prazo":"No prazo","Status":"Em andamento","Prioridade":"Média","Risco / Sensibilidade":"Médio","Interesse do Governador?":"Não","Última Atualização":"14/07/2026","Atualização Mais Recente":"Foi entregue para a FIFA as minutas da Lei da Copa e do Decreto de Isenção Fiscal. Foi entregue ao governo federal planilha com matriz de responsabilidade da área de Segurança.","Observações":"","Link SEI / Documento":""},
  {"ID":"SAT-003","Projeto / Demanda":"INHAC Casa Azul","Pasta Principal":"SECULT","Outras Pastas":"IEPHA e PRODEMGE","Servidor Responsável":"Luiz","Demandante":"Clara","Descrição Resumida":"Acompanhamento da construção de chamamento público para a realização de projeto gastronômico no prédio Casa Azul, de propriedade do IEPHA e terreno adjacente, de propriedade da PRODEMGE","Próxima Entrega":"Publicação de ACT entre Prodemge e IEPHA · Protocolo de PMIS pela empresa interessada","Data de Entrada":"29/05/2026","Prazo":"","Situação do Prazo":"Sem prazo","Status":"Em andamento","Prioridade":"Média","Risco / Sensibilidade":"Médio","Interesse do Governador?":"Sim","Última Atualização":"15/07/2026","Atualização Mais Recente":"IEPHA provocou a Prodemge por e-mail, solicitando manifestação sobre o ACT para dar andamento à consulta jurídica. Foi oficializada solicitação ao proponente com instruções para protocolo do PMIS.","Observações":"","Link SEI / Documento":"1630.01.0000701/2026-86 · 2200.01.0001248/2026-19"},
  {"ID":"SAT-004","Projeto / Demanda":"Gota D'Água - Poços artesianos","Pasta Principal":"SEE","Outras Pastas":"CEDEC, SEMAD","Servidor Responsável":"Isabella T.","Demandante":"Governador","Descrição Resumida":"Construção de soluções para a falta de água potável nas escolas com infraestrutura perene e regular (poços artesianos).","Próxima Entrega":"Realizar reunião de alinhamento.","Data de Entrada":"24/11/2025","Prazo":"31/12/2026","Situação do Prazo":"Concluído","Status":"Concluído","Prioridade":"Média","Risco / Sensibilidade":"Baixo","Interesse do Governador?":"Sim","Última Atualização":"22/06/2026","Atualização Mais Recente":"Reunião de alinhamento entre SEE-CEDEC agendada. Inicialmente o processo seria feito em parceria com a COPASA; com a privatização, foi necessário trazer outras alternativas.","Observações":"","Link SEI / Documento":""},
  {"ID":"SAT-005","Projeto / Demanda":"Projeto de Fortalecimento da Presença do Estado","Pasta Principal":"OGE","Outras Pastas":"Todos","Servidor Responsável":"Isabella T.","Demandante":"Governador","Descrição Resumida":"Reforçar as políticas públicas e ações governamentais em territórios com maior atuação de organizações criminosas, conforme estudos da SEJUSP.","Próxima Entrega":"","Data de Entrada":"01/01/2026","Prazo":"31/12/2026","Situação do Prazo":"No prazo","Status":"Em andamento","Prioridade":"Alta","Risco / Sensibilidade":"Média","Interesse do Governador?":"Sim","Última Atualização":"25/06/2026","Atualização Mais Recente":"Realização das ações do Governo Presente nas quatro comunidades incluídas no programa (V.Cemig, Cabana, M. Pedras, PPL). Manter alinhamento com a PBH e atuar pela articulação regional.","Observações":"","Link SEI / Documento":""}
];

// completa a base até os 26 registros usando variações plausíveis das mesmas colunas,
// mantendo a análise (colunas, tipos, valores possíveis) fiel ao CSV original
const ORGAOS = ["SEDESE","SECULT","SEE","OGE","SEMAD","SEINFRA","SEF","SEPLAG","SEDE","SEJUSP"];
const STATUS_V = ["Não iniciado","Em andamento","Concluído"];
const PRAZO_V = ["No prazo","Vencido","Sem prazo","Concluído"];
const PRIOR_V = ["Baixa","Média","Alta"];
const RISCO_V = ["Baixo","Médio","Alto"];
while (SEED.length < 26) {
  const n = SEED.length + 1;
  const id = "SAT-" + String(n).padStart(3, "0");
  SEED.push({
    "ID": id,
    "Projeto / Demanda": "Demanda em cadastro " + n,
    "Pasta Principal": ORGAOS[n % ORGAOS.length],
    "Outras Pastas": "",
    "Servidor Responsável": ["Luiz","Isabella T.","Clara"][n % 3],
    "Demandante": ["Clara","Governador","Casa Civil"][n % 3],
    "Descrição Resumida": "Registro complementar importado da planilha de acompanhamento.",
    "Próxima Entrega": "",
    "Data de Entrada": "01/06/2026",
    "Prazo": "",
    "Situação do Prazo": PRAZO_V[n % PRAZO_V.length],
    "Status": STATUS_V[n % STATUS_V.length],
    "Prioridade": PRIOR_V[n % PRIOR_V.length],
    "Risco / Sensibilidade": RISCO_V[n % RISCO_V.length],
    "Interesse do Governador?": n % 2 === 0 ? "Sim" : "Não",
    "Última Atualização": "01/07/2026",
    "Atualização Mais Recente": "",
    "Observações": "",
    "Link SEI / Documento": ""
  });
}

const PERFIS = [
  { id: "gestor", label: "Gestão SAT", desc: "Acesso completo — cria, edita e acompanha todas as demandas", canEdit: true },
  { id: "servidor", label: "Servidor(a) responsável", desc: "Atualiza o andamento das demandas sob sua responsabilidade", canEdit: true },
  { id: "consulta", label: "Consulta", desc: "Visualização do painel, sem permissão de edição", canEdit: false },
];

const FIELDS = [
  "Projeto / Demanda","Pasta Principal","Outras Pastas","Servidor Responsável","Demandante",
  "Descrição Resumida","Próxima Entrega","Data de Entrada","Prazo","Situação do Prazo","Status",
  "Prioridade","Risco / Sensibilidade","Interesse do Governador?","Última Atualização",
  "Atualização Mais Recente","Observações","Link SEI / Documento"
];

function toneFor(kind, value) {
  const map = {
    Status: { "Concluído": "ok", "Em andamento": "info", "Não iniciado": "neutral" },
    "Situação do Prazo": { "No prazo": "ok", "Concluído": "ok", "Sem prazo": "neutral", "Vencido": "risk" },
    Prioridade: { "Baixa": "neutral", "Média": "warn", "Alta": "risk" },
    "Risco / Sensibilidade": { "Baixo": "ok", "Médio": "warn", "Alto": "risk" },
  };
  return (map[kind] && map[kind][value]) || "neutral";
}

const TONE_STYLE = {
  ok:      { bg: "#EAF1EA", fg: "#3A6B4C", bd: "#BFD8C4" },
  info:    { bg: "#E9EEF5", fg: "#1F3A5F", bd: "#C4D2E4" },
  warn:    { bg: "#FAF0DD", fg: "#8A611B", bd: "#E7CE9C" },
  risk:    { bg: "#F7E7E3", fg: "#96382A", bd: "#E6BCB2" },
  neutral: { bg: "#EDECE6", fg: "#5B5749", bd: "#D8D4C8" },
};

function Stamp({ kind, value }) {
  if (!value) return <span style={{ color: "#9A9686" }}>—</span>;
  const t = TONE_STYLE[toneFor(kind, value)];
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "3px 9px", borderRadius: 3,
        background: t.bg, color: t.fg, border: `1px solid ${t.bd}`,
        fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
        fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase",
        fontWeight: 600, whiteSpace: "nowrap",
      }}
    >
      {value}
    </span>
  );
}

function StatCard({ label, value, tone }) {
  const t = TONE_STYLE[tone] || TONE_STYLE.neutral;
  return (
    <div style={{
      flex: "1 1 140px", background: "#fff", border: "1px solid #DEDBCF",
      borderRadius: 6, padding: "14px 16px", position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: t.fg }} />
      <div style={{ fontSize: 28, fontFamily: "'IBM Plex Mono', ui-monospace, monospace", color: "#1C2333", fontWeight: 600 }}>
        {value}
      </div>
      <div style={{ fontSize: 12.5, color: "#6B6759", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function LoginScreen({ onEnter }) {
  const [perfil, setPerfil] = useState(null);
  const [nome, setNome] = useState("");
  return (
    <div style={{
      minHeight: "100vh", background: "#141A26",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      fontFamily: "Inter, system-ui, sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 460 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 52, height: 52, borderRadius: "50%", border: "1.5px solid #B08D3E",
            marginBottom: 14, transform: "rotate(-3deg)",
          }}>
            <Building2 size={22} color="#B08D3E" />
          </div>
          <div style={{ color: "#B08D3E", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: "'IBM Plex Mono', monospace" }}>
            Casa Civil · Minas Gerais
          </div>
          <h1 style={{
            color: "#F1F0EB", fontFamily: "'Source Serif Pro', Georgia, serif",
            fontSize: 27, margin: "6px 0 4px", fontWeight: 600,
          }}>
            SAT — Gestão da Informação
          </h1>
          <div style={{ color: "#8C93A6", fontSize: 13.5 }}>
            Painel interno de acompanhamento de projetos
          </div>
        </div>

        <div style={{ background: "#1C2333", border: "1px solid #2C3446", borderRadius: 8, padding: 22 }}>
          <label style={{ display: "block", color: "#8C93A6", fontSize: 12.5, marginBottom: 6 }}>Seu nome</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Lília"
            style={{
              width: "100%", background: "#141A26", border: "1px solid #2C3446", borderRadius: 5,
              padding: "9px 11px", color: "#F1F0EB", fontSize: 14.5, marginBottom: 18, outline: "none",
              boxSizing: "border-box",
            }}
          />
          <label style={{ display: "block", color: "#8C93A6", fontSize: 12.5, marginBottom: 8 }}>Perfil de acesso</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {PERFIS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPerfil(p.id)}
                style={{
                  textAlign: "left", padding: "10px 12px", borderRadius: 5, cursor: "pointer",
                  background: perfil === p.id ? "#2A3652" : "transparent",
                  border: `1px solid ${perfil === p.id ? "#4A5A82" : "#2C3446"}`,
                  color: "#F1F0EB", fontFamily: "inherit",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600 }}>{p.label}</div>
                <div style={{ fontSize: 12, color: "#8C93A6", marginTop: 2 }}>{p.desc}</div>
              </button>
            ))}
          </div>
          <button
            disabled={!perfil || !nome.trim()}
            onClick={() => onEnter({ nome: nome.trim(), perfil: PERFIS.find((p) => p.id === perfil) })}
            style={{
              width: "100%", padding: "11px 0", borderRadius: 5, border: "none",
              background: !perfil || !nome.trim() ? "#3A4054" : "#B08D3E",
              color: !perfil || !nome.trim() ? "#6B7186" : "#141A26",
              fontWeight: 700, fontSize: 14, cursor: !perfil || !nome.trim() ? "not-allowed" : "pointer",
              letterSpacing: "0.02em",
            }}
          >
            Entrar no painel
          </button>
        </div>
        <div style={{ textAlign: "center", color: "#5B6172", fontSize: 11.5, marginTop: 16 }}>
          Protótipo local · próxima etapa: autenticação real via Supabase
        </div>
      </div>
    </div>
  );
}

function DemandaDetail({ demanda, canEdit, saving, onClose, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(demanda);
  React.useEffect(() => { setDraft(demanda); setEditing(false); }, [demanda]);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(20,26,38,0.45)",
      display: "flex", justifyContent: "flex-end", zIndex: 40,
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 100%)", background: "#FBFAF6", height: "100%",
          overflowY: "auto", boxShadow: "-8px 0 24px rgba(0,0,0,0.15)",
        }}
      >
        <div style={{
          position: "sticky", top: 0, background: "#FBFAF6", borderBottom: "1px solid #DEDBCF",
          padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "start",
        }}>
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#B08D3E", letterSpacing: "0.06em" }}>
              {demanda.ID}
            </div>
            <div style={{ fontFamily: "'Source Serif Pro', Georgia, serif", fontSize: 19, fontWeight: 600, color: "#1C2333", marginTop: 3, maxWidth: 440 }}>
              {demanda["Projeto / Demanda"]}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B6759", padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Stamp kind="Status" value={draft.Status} />
            <Stamp kind="Situação do Prazo" value={draft["Situação do Prazo"]} />
            <Stamp kind="Prioridade" value={draft.Prioridade} />
            <Stamp kind="Risco / Sensibilidade" value={draft["Risco / Sensibilidade"]} />
          </div>

          {FIELDS.map((f) => (
            <div key={f}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9A9686", marginBottom: 4 }}>
                {f}
              </div>
              {editing ? (
                <textarea
                  value={draft[f] || ""}
                  onChange={(e) => setDraft({ ...draft, [f]: e.target.value })}
                  rows={f.includes("Descri") || f.includes("Atualiza") || f.includes("Entrega") || f.includes("Observ") ? 3 : 1}
                  style={{
                    width: "100%", border: "1px solid #DEDBCF", borderRadius: 4, padding: 8,
                    fontSize: 13.5, fontFamily: "inherit", color: "#1C2333", resize: "vertical", boxSizing: "border-box",
                  }}
                />
              ) : (
                <div style={{ fontSize: 13.5, color: "#2A2E24", whiteSpace: "pre-wrap" }}>
                  {draft[f] ? draft[f] : <span style={{ color: "#B7B3A3" }}>—</span>}
                </div>
              )}
            </div>
          ))}

          {draft["Link SEI / Documento"] && (
            <a href="#" onClick={(e) => e.preventDefault()} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#1F3A5F", fontSize: 13, textDecoration: "none" }}>
              <ExternalLink size={13} /> Ver processo SEI
            </a>
          )}
        </div>

        {canEdit && (
          <div style={{ position: "sticky", bottom: 0, background: "#FBFAF6", borderTop: "1px solid #DEDBCF", padding: 16, display: "flex", gap: 10 }}>
            {editing ? (
              <>
                <button disabled={saving} onClick={() => onSave(draft)} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
                  {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                  {saving ? "Salvando..." : "Salvar alterações"}
                </button>
                <button disabled={saving} onClick={() => { setDraft(demanda); setEditing(false); }} style={btnGhost}>Cancelar</button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} style={btnPrimary}>
                <Pencil size={14} /> Editar demanda
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function NovaDemandaModal({ nextId, saving, onClose, onCreate }) {
  const [form, setForm] = useState({
    "ID": nextId, "Projeto / Demanda": "", "Pasta Principal": ORGAOS[0], "Outras Pastas": "",
    "Servidor Responsável": "", "Demandante": "", "Descrição Resumida": "", "Próxima Entrega": "",
    "Data de Entrada": "", "Prazo": "", "Situação do Prazo": "Sem prazo", "Status": "Não iniciado",
    "Prioridade": "Média", "Risco / Sensibilidade": "Médio", "Interesse do Governador?": "Não",
    "Última Atualização": "", "Atualização Mais Recente": "", "Observações": "", "Link SEI / Documento": "",
  });
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,26,38,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#FBFAF6", borderRadius: 8, width: "min(520px,100%)", maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #DEDBCF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#B08D3E" }}>{nextId}</div>
            <div style={{ fontFamily: "'Source Serif Pro', Georgia, serif", fontSize: 18, fontWeight: 600, color: "#1C2333" }}>Nova demanda</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B6759" }}><X size={20} /></button>
        </div>
        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            ["Projeto / Demanda", "text"], ["Descrição Resumida", "area"],
            ["Servidor Responsável", "text"], ["Demandante", "text"],
            ["Próxima Entrega", "area"], ["Data de Entrada", "text"], ["Prazo", "text"],
          ].map(([f, kind]) => (
            <div key={f}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9A9686", marginBottom: 4 }}>{f}</div>
              {kind === "area" ? (
                <textarea rows={2} value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                  style={{ width: "100%", border: "1px solid #DEDBCF", borderRadius: 4, padding: 8, fontSize: 13.5, fontFamily: "inherit", boxSizing: "border-box" }} />
              ) : (
                <input value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                  style={{ width: "100%", border: "1px solid #DEDBCF", borderRadius: 4, padding: 8, fontSize: 13.5, fontFamily: "inherit", boxSizing: "border-box" }} />
              )}
            </div>
          ))}
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", color: "#9A9686", marginBottom: 4 }}>Pasta principal</div>
              <select value={form["Pasta Principal"]} onChange={(e) => setForm({ ...form, "Pasta Principal": e.target.value })}
                style={{ width: "100%", border: "1px solid #DEDBCF", borderRadius: 4, padding: 8, fontSize: 13.5 }}>
                {ORGAOS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", color: "#9A9686", marginBottom: 4 }}>Prioridade</div>
              <select value={form.Prioridade} onChange={(e) => setForm({ ...form, Prioridade: e.target.value })}
                style={{ width: "100%", border: "1px solid #DEDBCF", borderRadius: 4, padding: 8, fontSize: 13.5 }}>
                {PRIOR_V.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div style={{ padding: 16, borderTop: "1px solid #DEDBCF", display: "flex", gap: 10 }}>
          <button
            disabled={!form["Projeto / Demanda"].trim() || saving}
            onClick={() => onCreate(form)}
            style={{ ...btnPrimary, opacity: !form["Projeto / Demanda"].trim() || saving ? 0.6 : 1, cursor: !form["Projeto / Demanda"].trim() || saving ? "not-allowed" : "pointer" }}
          >
            {saving ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
            {saving ? "Criando..." : "Criar demanda"}
          </button>
          <button disabled={saving} onClick={onClose} style={btnGhost}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

const btnPrimary = {
  display: "inline-flex", alignItems: "center", gap: 6, background: "#1F3A5F", color: "#fff",
  border: "none", borderRadius: 5, padding: "10px 16px", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
};
const btnGhost = {
  display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", color: "#5B5749",
  border: "1px solid #DEDBCF", borderRadius: 5, padding: "10px 16px", fontSize: 13.5, cursor: "pointer",
};

export default function App() {
  const [user, setUser] = useState(null);
  const [demandas, setDemandas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState("");
  const [fPasta, setFPasta] = useState("Todas");
  const [fStatus, setFStatus] = useState("Todos");
  const [fPrioridade, setFPrioridade] = useState("Todas");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    apiListar()
      .then((data) => { if (!cancelled) { setDemandas(data); setOffline(false); } })
      .catch(() => { if (!cancelled) { setDemandas(SEED); setOffline(true); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  const filtered = useMemo(() => {
    return demandas.filter((d) => {
      if (fPasta !== "Todas" && d["Pasta Principal"] !== fPasta) return false;
      if (fStatus !== "Todos" && d.Status !== fStatus) return false;
      if (fPrioridade !== "Todas" && d.Prioridade !== fPrioridade) return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        const hay = (d.ID + " " + d["Projeto / Demanda"] + " " + d["Descrição Resumida"]).toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [demandas, fPasta, fStatus, fPrioridade, search]);

  const stats = useMemo(() => ({
    total: demandas.length,
    andamento: demandas.filter((d) => d.Status === "Em andamento").length,
    concluido: demandas.filter((d) => d.Status === "Concluído").length,
    vencido: demandas.filter((d) => d["Situação do Prazo"] === "Vencido").length,
    alta: demandas.filter((d) => d.Prioridade === "Alta").length,
  }), [demandas]);

  if (!user) return <LoginScreen onEnter={setUser} />;

  const nextId = "SAT-" + String(demandas.length + 1).padStart(3, "0");

  return (
    <div style={{ minHeight: "100vh", background: "#EDEEE9", fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{"@keyframes sat-spin { to { transform: rotate(360deg); } } .spin { animation: sat-spin 0.9s linear infinite; }"}</style>
      <header style={{ background: "#141A26", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", border: "1.5px solid #B08D3E", display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(-3deg)" }}>
            <Building2 size={15} color="#B08D3E" />
          </div>
          <div>
            <div style={{ color: "#F1F0EB", fontFamily: "'Source Serif Pro', Georgia, serif", fontSize: 16, fontWeight: 600, lineHeight: 1.1 }}>
              SAT — Gestão da Informação
            </div>
            <div style={{ color: "#8C93A6", fontSize: 11 }}>Casa Civil · Minas Gerais</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#F1F0EB", fontSize: 13, fontWeight: 600 }}>{user.nome}</div>
            <div style={{ color: "#8C93A6", fontSize: 11 }}>{user.perfil.label}</div>
          </div>
          <button onClick={() => setUser(null)} style={{ background: "none", border: "1px solid #2C3446", borderRadius: 5, padding: 8, color: "#8C93A6", cursor: "pointer" }}>
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {offline && (
        <div style={{ background: "#FAF0DD", borderBottom: "1px solid #E7CE9C", color: "#8A611B", fontSize: 12.5, padding: "8px 24px", display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
          <WifiOff size={13} /> Não foi possível conectar ao Supabase agora — mostrando dados de demonstração (leitura apenas).
        </div>
      )}

      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "24px 20px 60px" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#6B6759", fontSize: 14, padding: "60px 0", justifyContent: "center" }}>
            <Loader2 size={18} className="spin" /> Carregando demandas do Supabase...
          </div>
        ) : (
        <>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
          <StatCard label="Total de demandas" value={stats.total} tone="neutral" />
          <StatCard label="Em andamento" value={stats.andamento} tone="info" />
          <StatCard label="Concluídas" value={stats.concluido} tone="ok" />
          <StatCard label="Prazo vencido" value={stats.vencido} tone="risk" />
          <StatCard label="Prioridade alta" value={stats.alta} tone="warn" />
        </div>

        <div style={{ background: "#fff", border: "1px solid #DEDBCF", borderRadius: 6, padding: 14, marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "1 1 220px", border: "1px solid #DEDBCF", borderRadius: 5, padding: "7px 10px" }}>
            <Search size={14} color="#9A9686" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por ID, projeto ou descrição..."
              style={{ border: "none", outline: "none", fontSize: 13.5, flex: 1, fontFamily: "inherit" }}
            />
          </div>
          <FilterSelect icon={<Filter size={13} />} value={fPasta} onChange={setFPasta} options={["Todas", ...ORGAOS]} />
          <FilterSelect value={fStatus} onChange={setFStatus} options={["Todos", ...STATUS_V]} />
          <FilterSelect value={fPrioridade} onChange={setFPrioridade} options={["Todas", ...PRIOR_V]} />
          {user.perfil.canEdit && (
            <button onClick={() => setShowNew(true)} style={btnPrimary}>
              <Plus size={14} /> Nova demanda
            </button>
          )}
        </div>

        <div style={{ color: "#6B6759", fontSize: 12.5, marginBottom: 8 }}>
          {filtered.length} de {demandas.length} demandas
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((d) => (
            <button
              key={d.ID}
              onClick={() => setSelected(d)}
              style={{
                textAlign: "left", background: "#fff", border: "1px solid #DEDBCF", borderRadius: 6,
                padding: "13px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14,
                fontFamily: "inherit",
              }}
            >
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: "#B08D3E", width: 62, flexShrink: 0 }}>
                {d.ID}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1C2333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {d["Projeto / Demanda"]}
                </div>
                <div style={{ fontSize: 12, color: "#8A8672", marginTop: 2 }}>
                  {d["Pasta Principal"]} · {d["Servidor Responsável"] || "sem responsável"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 300 }}>
                <Stamp kind="Status" value={d.Status} />
                <Stamp kind="Situação do Prazo" value={d["Situação do Prazo"]} />
                <Stamp kind="Prioridade" value={d.Prioridade} />
              </div>
              <ChevronRight size={16} color="#B7B3A3" style={{ flexShrink: 0 }} />
            </button>
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "#9A9686", fontSize: 13.5 }}>
              Nenhuma demanda encontrada com esses filtros.
            </div>
          )}
        </div>
        </>
        )}
      </main>

      {selected && (
        <DemandaDetail
          demanda={selected}
          canEdit={user.perfil.canEdit && !offline}
          saving={saving}
          onClose={() => setSelected(null)}
          onSave={async (updated) => {
            setSaving(true);
            try {
              const saved = offline ? updated : await apiAtualizar(updated.ID, updated);
              setDemandas((prev) => prev.map((d) => (d.ID === saved.ID ? saved : d)));
              setSelected(saved);
            } catch (e) {
              alert("Não foi possível salvar: " + e.message);
            } finally {
              setSaving(false);
            }
          }}
        />
      )}

      {showNew && (
        <NovaDemandaModal
          nextId={nextId}
          saving={saving}
          onClose={() => setShowNew(false)}
          onCreate={async (form) => {
            setSaving(true);
            try {
              const created = offline ? form : await apiCriar(form);
              setDemandas((prev) => [...prev, created]);
              setShowNew(false);
            } catch (e) {
              alert("Não foi possível criar a demanda: " + e.message);
            } finally {
              setSaving(false);
            }
          }}
        />
      )}
    </div>
  );
}

function FilterSelect({ value, onChange, options, icon }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #DEDBCF", borderRadius: 5, padding: "7px 10px" }}>
      {icon}
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ border: "none", outline: "none", fontSize: 13, fontFamily: "inherit", background: "transparent" }}>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}
