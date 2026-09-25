"use client";

import { FormEvent, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { ApiError, criarSolicitacao, login } from "../lib/api";
import { Mark } from "./mark";
import { maskIdentifier, readPosto, writePosto } from "../lib/session";

type Mode = "enter" | "request";
type Step = 1 | 2 | 3 | "done";
type Role = "veterinario" | "agente" | "recepcao" | "coordenacao";

const roles: { id: Role; label: string; note: string }[] = [
  { id: "veterinario", label: "Médico(a)-veterinário(a)", note: "Exige CRMV" },
  { id: "agente", label: "Agente de zoonoses", note: "Manejo e recolhimento" },
  { id: "recepcao", label: "Recepção", note: "Balcão de atendimento" },
  { id: "coordenacao", label: "Coordenação", note: "Acessos e indicadores" },
];

export function LoginScreen() {
  const [mode, setMode] = useState<Mode>("enter");
  return (
    <main className="[&_input]:[height:52px] [min-height:100vh] [display:grid] [grid-template-columns:1fr_1fr] [background:var(--surface)] max-[760px]:[grid-template-columns:1fr]">
      <section className="[view-transition-name:zoot-wall] [background:var(--primary-700)] [color:var(--on-dark)] [padding:40px] [display:flex] [flex-direction:column] [justify-content:space-between] [gap:32px] [position:relative] [overflow:hidden] max-[760px]:[min-height:0] max-[760px]:[padding:20px_20px_16px] max-[760px]:[gap:16px]" aria-label="ZooTech">
        <div className="[display:flex] [gap:12px] [align-items:center] [color:#fff] [position:relative] [z-index:1] [&_b]:[display:block] [&_b]:[font-family:var(--display)] [&_b]:[font-weight:700] [&_b]:[font-size:17px] [&_b]:[letter-spacing:-0.02em] [&_b]:[line-height:1.1] [&_small]:[display:block] [&_small]:[margin-top:3px] [&_small]:[color:var(--on-dark-soft)] [&_small]:[font-size:12px]">
          <Mark size={36} />
          <span>
            <b>ZooTech</b>
            <small>Centro de Controle de Zoonoses</small>
          </span>
        </div>
        <div className="[position:relative] [z-index:1] [display:flex] [flex-direction:column] [gap:16px] [&_h1]:[margin:0] [&_h1]:[max-width:14ch] [&_h1]:[color:#fff] [&_h1]:[font-size:38px] [&_h1]:[font-weight:700] [&_p]:[max-width:38ch] [&_p]:[color:var(--on-dark-soft)] [&_p]:[font-size:16px] max-[760px]:[&_h1]:[font-size:28px]">
          <h1>Cuidar dos animais é cuidar da cidade.</h1>
          <p>
            Gestão do plantel, das baias e da vacinação para quem trabalha no
            Centro de Controle de Zoonoses.
          </p>
        </div>
        <p className="[position:relative] [z-index:1] [font:12px/1.4_var(--mono)] [color:#8fb8b3]">Acesso restrito a servidores</p>
      </section>
      {mode === "enter" ? (
        <EnterForm onRequest={() => setMode("request")} />
      ) : (
        <RequestAccess onBack={() => setMode("enter")} />
      )}
    </main>
  );
}

function EnterForm({ onRequest }: { onRequest: () => void }) {
  const router = useRouter();
  const idError = useId();
  const passError = useId();
  const formError = useId();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [persist, setPersist] = useState(false);
  const [idMessage, setIdMessage] = useState<string | null>(null);
  const [passMessage, setPassMessage] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const masked = maskIdentifier(identifier);
    const passMissing = password.trim().length === 0;
    setIdMessage(masked.ok ? null : masked.message);
    setPassMessage(passMissing ? "Informe a senha." : null);
    setFormMessage(null);
    if (!masked.ok || passMissing) return;

    setPending(true);
    try {
      await login({
        identificador: masked.identifier,
        senha: password,
        manterConectado: persist,
      });
      writePosto(readPosto());
      router.push("/painel");
    } catch (error) {
      setFormMessage(
        error instanceof ApiError
          ? error.message
          : "Não foi possível falar com o servidor.",
      );
      setPending(false);
    }
  }

  return (
    <form className="[padding:48px_64px] [display:flex] [flex-direction:column] [justify-content:center] [gap:18px] [max-width:560px] [min-width:0] [&_h2]:[margin:0] [&_h2]:[font-size:28px] [&_h2]:[font-family:var(--display)] [&_h2]:[font-weight:700] [&_h2]:[letter-spacing:-0.02em] [&_h2]:[line-height:1.1] max-[760px]:[padding:20px_20px_28px] max-[760px]:[gap:14px]" onSubmit={submit} noValidate>
      <div>
        <h2>Entrar</h2>
        <p className="[font-size:13px] [color:var(--muted)] [overflow-wrap:anywhere]">Use seu CPF ou matrícula de servidor.</p>
      </div>
      <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
        <Label htmlFor="identifier">CPF ou matrícula</Label>
        <Input
          id="identifier"
          className="[font-family:var(--mono)] [font-variant-numeric:tabular-nums] [font-size:14px]"
          name="username"
          autoComplete="username"
          inputMode="numeric"
          value={identifier}
          aria-invalid={idMessage ? true : undefined}
          aria-describedby={idMessage ? idError : undefined}
          onChange={(event) => {
            setIdentifier(event.target.value);
            setIdMessage(null);
          }}
        />
        {idMessage ? (
          <p className="[font-size:13px] [color:var(--crit)]" id={idError}>
            {idMessage}
          </p>
        ) : null}
      </div>
      <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
        <div className="[display:flex] [justify-content:space-between] [align-items:center] [gap:8px]">
          <Label htmlFor="password">Senha</Label>
          <Button
            type="button"
            variant="ghost"
            className="h-8 px-2 text-[13px]"
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? "Ocultar" : "Mostrar"}
          </Button>
        </div>
        <Input
          id="password"
          name="password"
          autoComplete="current-password"
          type={showPassword ? "text" : "password"}
          value={password}
          aria-invalid={passMessage ? true : undefined}
          aria-describedby={passMessage ? passError : undefined}
          onChange={(event) => {
            setPassword(event.target.value);
            setPassMessage(null);
          }}
        />
        {passMessage ? (
          <p className="[font-size:13px] [color:var(--crit)]" id={passError}>
            {passMessage}
          </p>
        ) : null}
      </div>
      <div className="[display:flex] [align-items:center] [gap:10px] [min-height:40px] [font-size:14px] [&_input]:[width:18px] [&_input]:[height:18px] [&_input]:[accent-color:var(--primary)]">
        <Checkbox
          id="persist"
          checked={persist}
          onCheckedChange={(value) => setPersist(value === true)}
        />
        <Label htmlFor="persist">Manter conectado neste computador</Label>
      </div>
      {formMessage ? (
        <p className="[font-size:13px] [color:var(--crit)]" id={formError} role="alert">
          {formMessage}
        </p>
      ) : null}
      <Button className="w-full" type="submit" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </Button>
      <div className="[display:flex] [align-items:center] [gap:12px] [color:var(--muted)] [font-size:13px] [&>*]:[flex:1]">
        <Separator />
        <span>primeiro acesso</span>
        <Separator />
      </div>
      <Button className="w-full" variant="outline" type="button" onClick={onRequest}>
        Solicitar acesso
      </Button>
    </form>
  );
}

function RequestAccess({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [matricula, setMatricula] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [crmv, setCrmv] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function nextFromIdentity(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length < 5) {
      setError("Informe o nome completo.");
      return;
    }
    const cpfMask = maskIdentifier(cpf);
    if (!cpfMask.ok || cpfMask.identifier.length !== 11) {
      setError("Informe um CPF com 11 dígitos.");
      return;
    }
    const matriculaMask = maskIdentifier(matricula);
    if (!matriculaMask.ok || matriculaMask.identifier.length === 11) {
      setError("Informe a matrícula, separada do CPF.");
      return;
    }
    if (!email.includes("@") || !email.trim().endsWith(".gov.br")) {
      setError("Use o e-mail institucional, terminado em .gov.br.");
      return;
    }
    setError(null);
    setStep(2);
  }

  function nextFromRole(event: FormEvent) {
    event.preventDefault();
    if (!role) {
      setError("Escolha a função no CCZ.");
      return;
    }
    if (role === "veterinario" && crmv.replace(/\D/g, "").length < 4) {
      setError("Informe o CRMV para a função de veterinário.");
      return;
    }
    setError(null);
    setStep(3);
  }

  async function finish(event: FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("A confirmação não é igual à senha.");
      return;
    }
    if (!role) {
      setError("Escolha a função no CCZ.");
      return;
    }

    const cpfMask = maskIdentifier(cpf);
    const matriculaMask = maskIdentifier(matricula);
    if (!cpfMask.ok || !matriculaMask.ok) {
      setError("Revise CPF e matrícula.");
      return;
    }

    setError(null);
    setPending(true);
    try {
      await criarSolicitacao({
        nome: name.trim(),
        cpf: cpfMask.identifier,
        matricula: matriculaMask.identifier,
        email: email.trim(),
        funcaoPretendida: role,
        ...(role === "veterinario" ? { crmv: crmv.replace(/\D/g, "") } : {}),
        senha: password,
      });
      setStep("done");
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Não foi possível falar com o servidor.",
      );
      setPending(false);
    }
  }

  return (
    <div className="[padding:48px_64px] [display:flex] [flex-direction:column] [justify-content:center] [gap:18px] [max-width:560px] [min-width:0] [&_h2]:[margin:0] [&_h2]:[font-size:28px] [&_h2]:[font-family:var(--display)] [&_h2]:[font-weight:700] [&_h2]:[letter-spacing:-0.02em] [&_h2]:[line-height:1.1] max-[760px]:[padding:20px_20px_28px] max-[760px]:[gap:14px]">
      <ol className="[display:flex] [gap:8px] [margin:0] [padding:0] [list-style:none] [&_li]:[flex:1] [&_li]:[border-top:3px_solid_var(--line)] [&_li]:[padding-top:8px] [&_li]:[color:var(--muted)] [&_li]:[font-size:13px] [&_li]:[border-color:var(--primary)] [&_li]:[color:var(--ink)] [&_li]:[font-weight:600]">
        <li aria-current={step === 1 ? "step" : undefined}>Seus dados</li>
        <li aria-current={step === 2 ? "step" : undefined}>Função</li>
        <li aria-current={step === 3 || step === "done" ? "step" : undefined}>Senha</li>
      </ol>
      {step === "done" ? (
        <>
          <h2>Pedido enviado</h2>
          <Alert variant="info">
            <AlertDescription className="text-inherit">
              A coordenação do CCZ vai analisar este pedido. Esta tela não entra
              no painel.
            </AlertDescription>
          </Alert>
          <Button type="button" onClick={onBack}>
            Voltar para entrar
          </Button>
        </>
      ) : null}
      {step === 1 ? (
        <form onSubmit={nextFromIdentity} noValidate>
          <h2>Solicitar acesso</h2>
          <div className="[display:grid] [grid-template-columns:1fr_1fr] [gap:12px] max-[760px]:[grid-template-columns:1fr]" style={{ marginTop: 16 }}>
            <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
              <Label htmlFor="nome">
                Nome completo <i className="[color:var(--crit)] [font-style:normal]">*</i>
              </Label>
              <Input id="nome" value={name} autoComplete="name" onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
              <Label htmlFor="cpf">
                CPF <i className="[color:var(--crit)] [font-style:normal]">*</i>
              </Label>
              <Input id="cpf" className="[font-family:var(--mono)] [font-variant-numeric:tabular-nums] [font-size:14px]" inputMode="numeric" value={cpf} onChange={(event) => setCpf(event.target.value)} />
            </div>
          </div>
          <div className="[display:grid] [grid-template-columns:1fr_1fr] [gap:12px] max-[760px]:[grid-template-columns:1fr]" style={{ marginTop: 12 }}>
            <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
              <Label htmlFor="matricula">
                Matrícula <i className="[color:var(--crit)] [font-style:normal]">*</i>
              </Label>
              <Input id="matricula" className="[font-family:var(--mono)] [font-variant-numeric:tabular-nums] [font-size:14px]" value={matricula} onChange={(event) => setMatricula(event.target.value)} />
            </div>
            <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]">
              <Label htmlFor="email">
                E-mail institucional <i className="[color:var(--crit)] [font-style:normal]">*</i>
              </Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
          </div>
          {error ? <p className="[font-size:13px] [color:var(--crit)]">{error}</p> : null}
          <div className="[display:flex] [justify-content:space-between] [gap:12px] max-[760px]:[grid-template-columns:1fr] max-[760px]:[flex-direction:column] max-[760px]:[align-items:stretch]" style={{ marginTop: 16 }}>
            <Button variant="outline" type="button" onClick={onBack}>
              Voltar
            </Button>
            <Button type="submit">Continuar</Button>
          </div>
        </form>
      ) : null}
      {step === 2 ? (
        <form onSubmit={nextFromRole}>
          <h2>Qual é a sua função?</h2>
          <RadioGroup
            className="[display:grid] [grid-template-columns:1fr_1fr] [gap:8px] max-[760px]:[grid-template-columns:1fr]"
            style={{ marginTop: 16 }}
            value={role ?? ""}
            onValueChange={(value) => setRole(value as Role)}
            aria-label="Função no CCZ"
          >
            {roles.map((item) => (
              <Label
                key={item.id}
                htmlFor={`role-${item.id}`}
                className="[min-height:64px] [text-align:left] [border:1px_solid_var(--line)] [background:var(--surface)] [border-radius:8px] [padding:10px_12px] [cursor:pointer] [color:var(--ink)] [font:600_14px/1.3_var(--body)] [&_small]:[display:block] [&_small]:[font-weight:500] [&_small]:[color:var(--muted)] aria-checked:[border-color:var(--primary)] aria-checked:[background:var(--primary-50)] aria-checked:[box-shadow:var(--focus)] data-[checked=true]:[border-color:var(--primary)] data-[checked=true]:[background:var(--primary-50)] data-[checked=true]:[box-shadow:var(--focus)]"
                data-checked={role === item.id ? "true" : undefined}
              >
                <RadioGroupItem id={`role-${item.id}`} value={item.id} className="[position:absolute] [width:1px] [height:1px] [padding:0] [margin:-1px] [overflow:hidden] [clip:rect(0,_0,_0,_0)] [white-space:nowrap] [border:0]" />
                <span>
                  {item.label}
                  <small>{item.note}</small>
                </span>
              </Label>
            ))}
          </RadioGroup>
          {role === "veterinario" ? (
            <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]" style={{ marginTop: 12 }}>
              <Label htmlFor="crmv">
                CRMV <i className="[color:var(--crit)] [font-style:normal]">*</i>
              </Label>
              <Input id="crmv" className="[font-family:var(--mono)] [font-variant-numeric:tabular-nums] [font-size:14px]" value={crmv} onChange={(event) => setCrmv(event.target.value)} />
            </div>
          ) : null}
          {error ? <p className="[font-size:13px] [color:var(--crit)]">{error}</p> : null}
          <div className="[display:flex] [justify-content:space-between] [gap:12px] max-[760px]:[grid-template-columns:1fr] max-[760px]:[flex-direction:column] max-[760px]:[align-items:stretch]" style={{ marginTop: 16 }}>
            <Button variant="outline" type="button" onClick={() => { setError(null); setStep(1); }}>
              Voltar
            </Button>
            <Button type="submit">Continuar</Button>
          </div>
        </form>
      ) : null}
      {step === 3 ? (
        <form onSubmit={finish}>
          <h2>Crie uma senha</h2>
          <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]" style={{ marginTop: 16 }}>
            <Label htmlFor="nova-senha">Senha</Label>
            <Input id="nova-senha" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          <div className="[display:flex] [flex-direction:column] [gap:6px] [&_label]:[font-size:13px] [&_label]:[font-weight:600]" style={{ marginTop: 12 }}>
            <Label htmlFor="confirma-senha">Confirmar senha</Label>
            <Input id="confirma-senha" type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
          </div>
          {error ? <p className="[font-size:13px] [color:var(--crit)]">{error}</p> : null}
          <div className="[display:flex] [justify-content:space-between] [gap:12px] max-[760px]:[grid-template-columns:1fr] max-[760px]:[flex-direction:column] max-[760px]:[align-items:stretch]" style={{ marginTop: 16 }}>
            <Button variant="outline" type="button" onClick={() => { setError(null); setStep(2); }}>
              Voltar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Enviando…" : "Enviar pedido"}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
