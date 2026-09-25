"use client";

import { FormEvent, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Shell } from "../../../components/shell";
import { canAccess, perfilLabel } from "../../../lib/access";
import {
  aceitarSolicitacao,
  atualizarPerfilUsuario,
  getCurrentUser,
  listarSolicitacoes,
  listarUsuarios,
  recusarSolicitacao,
  ApiError,
  type PerfilAcesso,
  type PublicUser,
  type SolicitacaoPendente,
} from "../../../lib/api";

const papeis: PerfilAcesso[] = ["coordenacao", "veterinario", "agente", "recepcao"];

export default function Page() {
  return (
    <Shell section="acessos" title="Acessos">
      <Acessos />
    </Shell>
  );
}

function Acessos() {
  const eu = getCurrentUser();
  const [fila, setFila] = useState<SolicitacaoPendente[] | null>(null);
  const [usuarios, setUsuarios] = useState<PublicUser[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const perfil = getCurrentUser()?.perfilAcesso;
    if (!perfil || !canAccess(perfil, "acessos")) return;
    let cancelled = false;
    Promise.all([listarSolicitacoes(), listarUsuarios()])
      .then(([pedidos, ativos]) => {
        if (cancelled) return;
        setFila(pedidos);
        setUsuarios(ativos);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 403) {
          window.location.replace("/painel");
          return;
        }
        setErro(error instanceof ApiError ? error.message : "Não foi possível carregar os acessos.");
        setFila([]);
        setUsuarios([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <div>
        <h1>Acessos</h1>
        <p className="[color:var(--muted)] [max-width:62ch]">Pedidos aguardando aceite e funções das contas ativas.</p>
      </div>
      {erro ? (
        <Alert variant="destructive">
          <AlertDescription className="text-inherit">{erro}</AlertDescription>
        </Alert>
      ) : null}
      <section className="[display:flex] [flex-direction:column] [gap:12px]" aria-label="Pedidos pendentes">
        <h2>Pedidos pendentes</h2>
        {fila === null ? <Skeleton className="h-24 w-full" /> : null}
        {fila?.length === 0 ? <p className="[font-size:13px] [color:var(--muted)] [overflow-wrap:anywhere]">Nenhum pedido aguardando aceite.</p> : null}
        {fila?.map((pedido) => (
          <PedidoCard
            key={pedido.id}
            pedido={pedido}
            onAceito={(usuario) => {
              setFila((atual) => atual?.filter((item) => item.id !== pedido.id) ?? []);
              setUsuarios((atual) => [...(atual ?? []), usuario].sort(porNome));
            }}
            onRecusado={() => {
              setFila((atual) => atual?.filter((item) => item.id !== pedido.id) ?? []);
            }}
          />
        ))}
      </section>
      <section className="[display:flex] [flex-direction:column] [gap:12px]" aria-label="Usuários ativos">
        <h2>Usuários ativos</h2>
        {usuarios === null ? <Skeleton className="h-24 w-full" /> : null}
        {usuarios?.map((usuario) => (
          <UsuarioCard
            key={usuario.id}
            usuario={usuario}
            proprio={usuario.id === eu?.id}
            unicaCoordenacao={
              usuario.perfilAcesso === "coordenacao" &&
              (usuarios?.filter((item) => item.perfilAcesso === "coordenacao").length ?? 0) === 1
            }
            onTrocado={(atualizado) => {
              setUsuarios((atual) =>
                (atual ?? []).map((item) => (item.id === atualizado.id ? atualizado : item)),
              );
            }}
          />
        ))}
      </section>
    </>
  );
}

function PedidoCard({
  pedido,
  onAceito,
  onRecusado,
}: {
  pedido: SolicitacaoPendente;
  onAceito: (usuario: PublicUser) => void;
  onRecusado: () => void;
}) {
  const [funcao, setFuncao] = useState<PerfilAcesso>(pedido.funcaoPretendida);
  const [crmv, setCrmv] = useState("");
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, setPending] = useState<"aceitar" | "recusar" | null>(null);
  const precisaCrmv = funcao === "veterinario" && digits(pedido.crmv).length < 4;

  async function aceitar(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    if (precisaCrmv && digits(crmv).length < 4) {
      setErro("CRMV deve ter pelo menos 4 dígitos.");
      return;
    }
    setPending("aceitar");
    try {
      const usuario = await aceitarSolicitacao(pedido.id, {
        perfilAcesso: funcao,
        ...(funcao === "veterinario" && digits(crmv).length >= 4 ? { crmv: digits(crmv) } : {}),
      });
      onAceito(usuario);
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível aceitar o pedido.");
      setPending(null);
    }
  }

  async function recusar() {
    setErro(null);
    setPending("recusar");
    try {
      await recusarSolicitacao(pedido.id, {
        ...(motivo.trim() ? { motivo: motivo.trim() } : {}),
      });
      onRecusado();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível recusar o pedido.");
      setPending(null);
    }
  }

  return (
    <form className="[background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] [gap:16px] [box-shadow:var(--shadow)]" onSubmit={aceitar}>
      <div>
        <h3>{pedido.nome}</h3>
        <p className="[font-size:13px] [color:var(--muted)] [overflow-wrap:anywhere]">Pedido em {formatarData(pedido.createdAt)}</p>
      </div>
      <dl className="[display:grid] [grid-template-columns:repeat(2,_minmax(0,_1fr))] [gap:12px_16px] [margin:0] [&_div]:[display:flex] [&_div]:[flex-direction:column] [&_div]:[gap:2px] [&_dt]:[font-size:12px] [&_dt]:[font-weight:600] [&_dt]:[color:var(--muted)] [&_dd]:[margin:0] [&_dd]:[font-size:15px] max-[760px]:[grid-template-columns:1fr]">
        <div>
          <dt>CPF</dt>
          <dd>{pedido.cpfMascarado}</dd>
        </div>
        <div>
          <dt>Matrícula</dt>
          <dd>{pedido.matricula}</dd>
        </div>
        <div>
          <dt>E-mail</dt>
          <dd>{pedido.email}</dd>
        </div>
        <div>
          <dt>Função pretendida</dt>
          <dd>{perfilLabel[pedido.funcaoPretendida]}</dd>
        </div>
        {pedido.crmv ? (
          <div>
            <dt>CRMV do pedido</dt>
            <dd>{pedido.crmv}</dd>
          </div>
        ) : null}
      </dl>
      <fieldset className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="[font-size:13px] [font-weight:600]">Função que vale no aceite</legend>
        <PapelRadio name={`aceite-${pedido.id}`} value={funcao} onChange={setFuncao} />
      </fieldset>
      {precisaCrmv ? (
        <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
          <Label htmlFor={`crmv-${pedido.id}`}>CRMV</Label>
          <Input
            id={`crmv-${pedido.id}`}
            className="[font-family:var(--mono)] [font-variant-numeric:tabular-nums] [font-size:14px]"
            inputMode="numeric"
            value={crmv}
            aria-invalid={erro?.includes("CRMV") ? true : undefined}
            onChange={(event) => setCrmv(event.target.value)}
          />
        </div>
      ) : null}
      {erro ? <p className="[font-size:13px] [color:var(--crit)]">{erro}</p> : null}
      <div className="[display:flex] [justify-content:space-between] [gap:12px] max-[760px]:[grid-template-columns:1fr] max-[760px]:[flex-direction:column] max-[760px]:[align-items:stretch]">
        <Button type="submit" disabled={pending !== null}>
          Aceitar
        </Button>
      </div>
      <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
        <Label htmlFor={`motivo-${pedido.id}`}>Motivo da recusa (opcional)</Label>
        <Input
          id={`motivo-${pedido.id}`}
          maxLength={280}
          value={motivo}
          onChange={(event) => setMotivo(event.target.value)}
        />
      </div>
      <div className="[display:flex] [justify-content:space-between] [gap:12px] max-[760px]:[grid-template-columns:1fr] max-[760px]:[flex-direction:column] max-[760px]:[align-items:stretch]">
        <Button type="button" variant="outline" disabled={pending !== null} onClick={recusar}>
          Recusar
        </Button>
      </div>
    </form>
  );
}

function UsuarioCard({
  usuario,
  proprio,
  unicaCoordenacao,
  onTrocado,
}: {
  usuario: PublicUser;
  proprio: boolean;
  unicaCoordenacao: boolean;
  onTrocado: (usuario: PublicUser) => void;
}) {
  const [funcao, setFuncao] = useState<PerfilAcesso>(usuario.perfilAcesso);
  const [crmv, setCrmv] = useState(usuario.crmv ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function trocar(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setOk(null);
    if (funcao === usuario.perfilAcesso && funcao !== "veterinario") {
      setErro("Escolha outra função.");
      return;
    }
    if (funcao === "veterinario" && digits(crmv).length < 4) {
      setErro("CRMV deve ter pelo menos 4 dígitos.");
      return;
    }
    setPending(true);
    try {
      const atualizado = await atualizarPerfilUsuario(usuario.id, {
        perfilAcesso: funcao,
        ...(funcao === "veterinario" ? { crmv: digits(crmv) } : {}),
      });
      onTrocado(atualizado);
      setOk(`Função atualizada para ${perfilLabel[atualizado.perfilAcesso]}.`);
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível trocar a função.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="[background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] [gap:16px] [box-shadow:var(--shadow)]" onSubmit={trocar}>
      <div>
        <h3>{usuario.nome}</h3>
      </div>
      <dl className="[display:grid] [grid-template-columns:repeat(2,_minmax(0,_1fr))] [gap:12px_16px] [margin:0] [&_div]:[display:flex] [&_div]:[flex-direction:column] [&_div]:[gap:2px] [&_dt]:[font-size:12px] [&_dt]:[font-weight:600] [&_dt]:[color:var(--muted)] [&_dd]:[margin:0] [&_dd]:[font-size:15px] max-[760px]:[grid-template-columns:1fr]">
        <div>
          <dt>Matrícula</dt>
          <dd>{usuario.matricula ?? "—"}</dd>
        </div>
        <div>
          <dt>Função atual</dt>
          <dd>{perfilLabel[usuario.perfilAcesso]}</dd>
        </div>
        {usuario.crmv ? (
          <div>
            <dt>CRMV</dt>
            <dd>{usuario.crmv}</dd>
          </div>
        ) : null}
      </dl>
      {proprio ? (
        <p className="[font-size:13px] [color:var(--muted)] [overflow-wrap:anywhere]">
          {unicaCoordenacao
            ? "É preciso existir outra coordenação antes de rebaixar esta conta."
            : "A coordenação não troca o próprio tipo."}
        </p>
      ) : (
        <>
          <fieldset className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="[font-size:13px] [font-weight:600]">Nova função</legend>
            <PapelRadio name={`troca-${usuario.id}`} value={funcao} onChange={setFuncao} />
          </fieldset>
          {funcao === "veterinario" ? (
            <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
              <Label htmlFor={`crmv-user-${usuario.id}`}>CRMV</Label>
              <Input
                id={`crmv-user-${usuario.id}`}
                className="[font-family:var(--mono)] [font-variant-numeric:tabular-nums] [font-size:14px]"
                inputMode="numeric"
                value={crmv}
                onChange={(event) => setCrmv(event.target.value)}
              />
            </div>
          ) : null}
          {erro ? <p className="[font-size:13px] [color:var(--crit)]">{erro}</p> : null}
          {ok ? (
            <Alert variant="success" role="status">
              <AlertDescription className="text-inherit">{ok}</AlertDescription>
            </Alert>
          ) : null}
          <div className="[display:flex] [justify-content:space-between] [gap:12px] max-[760px]:[grid-template-columns:1fr] max-[760px]:[flex-direction:column] max-[760px]:[align-items:stretch]">
            <Button type="submit" disabled={pending}>
              Confirmar troca
            </Button>
          </div>
        </>
      )}
    </form>
  );
}

function PapelRadio({
  name,
  value,
  onChange,
}: {
  name: string;
  value: PerfilAcesso;
  onChange: (value: PerfilAcesso) => void;
}) {
  return (
    <RadioGroup className="[display:grid] [grid-template-columns:1fr_1fr] [gap:8px] max-[760px]:[grid-template-columns:1fr]" value={value} aria-label={name} onValueChange={(next) => onChange(next as PerfilAcesso)}>
      {papeis.map((papel) => (
        <Label key={papel} htmlFor={`${name}-${papel}`} className="[min-height:64px] [text-align:left] [border:1px_solid_var(--line)] [background:var(--surface)] [border-radius:8px] [padding:10px_12px] [cursor:pointer] [color:var(--ink)] [font:600_14px/1.3_var(--body)] [&_small]:[display:block] [&_small]:[font-weight:500] [&_small]:[color:var(--muted)] aria-checked:[border-color:var(--primary)] aria-checked:[background:var(--primary-50)] aria-checked:[box-shadow:var(--focus)] data-[checked=true]:[border-color:var(--primary)] data-[checked=true]:[background:var(--primary-50)] data-[checked=true]:[box-shadow:var(--focus)]" data-checked={value === papel ? "true" : undefined}>
          <RadioGroupItem id={`${name}-${papel}`} value={papel} className="[position:absolute] [width:1px] [height:1px] [padding:0] [margin:-1px] [overflow:hidden] [clip:rect(0,_0,_0,_0)] [white-space:nowrap] [border:0]" />
          {perfilLabel[papel]}
        </Label>
      ))}
    </RadioGroup>
  );
}

function digits(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

function formatarData(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function porNome(a: PublicUser, b: PublicUser) {
  return a.nome.localeCompare(b.nome, "pt-BR");
}
