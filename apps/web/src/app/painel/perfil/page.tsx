"use client";

import { FormEvent, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Shell } from "../../../components/shell";
import { perfilLabel } from "../../../lib/access";
import {
  alterarSenha,
  atualizarMe,
  carregarMe,
  ApiError,
  type PublicUser,
} from "../../../lib/api";

export default function Page() {
  return (
    <Shell section="perfil" title="Perfil">
      <Perfil />
    </Shell>
  );
}

function Perfil() {
  const [usuario, setUsuario] = useState<PublicUser | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    carregarMe()
      .then((me) => {
        if (!cancelled) setUsuario(me);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setErro(error instanceof ApiError ? error.message : "Não foi possível carregar o perfil.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <div>
        <h1>Perfil</h1>
        <p className="[color:var(--muted)] [max-width:62ch]">Telefone, e-mail e senha. A função é definida pela coordenação.</p>
      </div>
      {erro ? (
        <Alert variant="destructive">
          <AlertDescription className="text-inherit">{erro}</AlertDescription>
        </Alert>
      ) : null}
      {usuario ? (
        <>
          <section className="[background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] [gap:16px] [box-shadow:var(--shadow)]" aria-label="Dados da conta">
            <dl className="[display:grid] [grid-template-columns:repeat(2,_minmax(0,_1fr))] [gap:12px_16px] [margin:0] [&_div]:[display:flex] [&_div]:[flex-direction:column] [&_div]:[gap:2px] [&_dt]:[font-size:12px] [&_dt]:[font-weight:600] [&_dt]:[color:var(--muted)] [&_dd]:[margin:0] [&_dd]:[font-size:15px] max-[760px]:[grid-template-columns:1fr]">
              <div>
                <dt>Nome</dt>
                <dd>{usuario.nome}</dd>
              </div>
              <div>
                <dt>CPF</dt>
                <dd>{usuario.cpfMascarado}</dd>
              </div>
              <div>
                <dt>Matrícula</dt>
                <dd>{usuario.matricula ?? "—"}</dd>
              </div>
              <div>
                <dt>Função</dt>
                <dd>{perfilLabel[usuario.perfilAcesso]}</dd>
              </div>
              {usuario.crmv ? (
                <div>
                  <dt>CRMV</dt>
                  <dd>{usuario.crmv}</dd>
                </div>
              ) : null}
            </dl>
          </section>
          <TelefoneForm
            inicial={usuario.telefone ?? ""}
            onSaved={(telefone) => setUsuario({ ...usuario, telefone })}
          />
          <EmailForm
            inicial={usuario.email}
            onSaved={(email) => setUsuario({ ...usuario, email })}
          />
          <SenhaForm />
        </>
      ) : erro ? null : (
        <div className="[display:flex] [flex-direction:column] [gap:12px]" aria-hidden="true">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}
    </>
  );
}

function TelefoneForm({
  inicial,
  onSaved,
}: {
  inicial: string;
  onSaved: (telefone: string | null) => void;
}) {
  const [telefone, setTelefone] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const digits = telefone.replace(/\D/g, "");
    setOk(false);
    if (digits.length !== 0 && (digits.length < 10 || digits.length > 11)) {
      setErro("Telefone deve ter 10 ou 11 dígitos, ou ficar vazio.");
      return;
    }
    setErro(null);
    setPending(true);
    try {
      const user = await atualizarMe({ telefone: digits });
      onSaved(user.telefone);
      setTelefone(user.telefone ?? "");
      setOk(true);
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível salvar o telefone.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="[background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] [gap:16px] [box-shadow:var(--shadow)]" onSubmit={submit}>
      <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
        <Label htmlFor="telefone">Telefone</Label>
        <Input
          id="telefone"
          className="[font-family:var(--mono)] [font-variant-numeric:tabular-nums] [font-size:14px]"
          inputMode="numeric"
          autoComplete="tel"
          value={telefone}
          aria-invalid={erro ? true : undefined}
          onChange={(event) => {
            setTelefone(event.target.value);
            setErro(null);
            setOk(false);
          }}
        />
        <p className="[font-size:13px] [color:var(--muted)] [overflow-wrap:anywhere]">Vazio ou 10 a 11 dígitos.</p>
      </div>
      {erro ? <p className="[font-size:13px] [color:var(--crit)]">{erro}</p> : null}
      {ok ? (
        <Alert variant="success" role="status">
          <AlertDescription className="text-inherit">Telefone atualizado.</AlertDescription>
        </Alert>
      ) : null}
      <div className="[display:flex] [justify-content:space-between] [gap:12px] max-[760px]:[grid-template-columns:1fr] max-[760px]:[flex-direction:column] max-[760px]:[align-items:stretch]">
        <Button type="submit" disabled={pending}>
          Salvar telefone
        </Button>
      </div>
    </form>
  );
}

function EmailForm({
  inicial,
  onSaved,
}: {
  inicial: string;
  onSaved: (email: string) => void;
}) {
  const [email, setEmail] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setOk(false);
    const value = email.trim().toLowerCase();
    if (!value.endsWith(".gov.br")) {
      setErro("E-mail institucional deve terminar em .gov.br.");
      return;
    }
    setErro(null);
    setPending(true);
    try {
      const user = await atualizarMe({ email: value });
      onSaved(user.email);
      setEmail(user.email);
      setOk(true);
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível salvar o e-mail.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="[background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] [gap:16px] [box-shadow:var(--shadow)]" onSubmit={submit}>
      <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
        <Label htmlFor="email">E-mail institucional</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          aria-invalid={erro ? true : undefined}
          onChange={(event) => {
            setEmail(event.target.value);
            setErro(null);
            setOk(false);
          }}
        />
      </div>
      {erro ? <p className="[font-size:13px] [color:var(--crit)]">{erro}</p> : null}
      {ok ? (
        <Alert variant="success" role="status">
          <AlertDescription className="text-inherit">E-mail atualizado.</AlertDescription>
        </Alert>
      ) : null}
      <div className="[display:flex] [justify-content:space-between] [gap:12px] max-[760px]:[grid-template-columns:1fr] max-[760px]:[flex-direction:column] max-[760px]:[align-items:stretch]">
        <Button type="submit" disabled={pending}>
          Salvar e-mail
        </Button>
      </div>
    </form>
  );
}

function SenhaForm() {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setOk(false);
    if (nova.length < 8) {
      setErro("A nova senha precisa de pelo menos 8 caracteres.");
      return;
    }
    if (nova !== confirma) {
      setErro("A confirmação não confere com a nova senha.");
      return;
    }
    setErro(null);
    setPending(true);
    try {
      await alterarSenha({ senhaAtual: atual, senhaNova: nova });
      setAtual("");
      setNova("");
      setConfirma("");
      setOk(true);
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível alterar a senha.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="[background:var(--surface)] [border:1px_solid_var(--line)] [border-radius:10px] [padding:20px] [display:flex] [flex-direction:column] [gap:16px] [box-shadow:var(--shadow)]" onSubmit={submit}>
      <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
        <Label htmlFor="senha-atual">Senha atual</Label>
        <Input
          id="senha-atual"
          type="password"
          autoComplete="current-password"
          value={atual}
          onChange={(event) => setAtual(event.target.value)}
        />
      </div>
      <div className="[display:grid] [grid-template-columns:1fr_1fr] [gap:12px] max-[760px]:[grid-template-columns:1fr]">
        <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
          <Label htmlFor="senha-nova">Nova senha</Label>
          <Input
            id="senha-nova"
            type="password"
            autoComplete="new-password"
            value={nova}
            onChange={(event) => setNova(event.target.value)}
          />
        </div>
        <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
          <Label htmlFor="senha-confirma">Confirmar nova senha</Label>
          <Input
            id="senha-confirma"
            type="password"
            autoComplete="new-password"
            value={confirma}
            onChange={(event) => setConfirma(event.target.value)}
          />
        </div>
      </div>
      {erro ? <p className="[font-size:13px] [color:var(--crit)]">{erro}</p> : null}
      {ok ? (
        <Alert variant="success" role="status">
          <AlertDescription className="text-inherit">Senha atualizada.</AlertDescription>
        </Alert>
      ) : null}
      <div className="[display:flex] [justify-content:space-between] [gap:12px] max-[760px]:[grid-template-columns:1fr] max-[760px]:[flex-direction:column] max-[760px]:[align-items:stretch]">
        <Button type="submit" disabled={pending}>
          Salvar senha
        </Button>
      </div>
    </form>
  );
}
