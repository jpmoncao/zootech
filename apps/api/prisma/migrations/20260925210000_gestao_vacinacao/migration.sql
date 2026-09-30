-- CreateEnum
CREATE TYPE "StatusProtocoloVacinal" AS ENUM ('em_andamento', 'concluido', 'interrompido');

-- CreateEnum
CREATE TYPE "StatusAgendamentoVacinacao" AS ENUM ('agendado', 'aplicado', 'faltou', 'cancelado');

-- CreateTable
CREATE TABLE "vacinas" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "nomeNormalizado" TEXT NOT NULL,
    "especies" "EspecieAnimal"[] NOT NULL,
    "totalDoses" INTEGER NOT NULL,
    "intervaloDosesDias" INTEGER,
    "revacinacaoDias" INTEGER,
    "diasAvisoProximaDose" INTEGER NOT NULL DEFAULT 7,
    "idadeMinimaSemanas" INTEGER,
    "fabricante" TEXT,
    "viaAplicacaoSugerida" TEXT,
    "obrigatoria" BOOLEAN NOT NULL DEFAULT false,
    "observacoes" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vacinas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "protocolos_vacinais" (
    "id" SERIAL NOT NULL,
    "animalId" INTEGER NOT NULL,
    "vacinaId" INTEGER NOT NULL,
    "dosesPrevistas" INTEGER NOT NULL,
    "intervaloDosesDias" INTEGER,
    "revacinacaoDias" INTEGER,
    "status" "StatusProtocoloVacinal" NOT NULL DEFAULT 'em_andamento',
    "motivoInterrupcao" TEXT,
    "interrompidoPorId" INTEGER,
    "interrompidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "protocolos_vacinais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aplicacoes_vacinas" (
    "id" SERIAL NOT NULL,
    "animalId" INTEGER NOT NULL,
    "vacinaId" INTEGER NOT NULL,
    "protocoloId" INTEGER NOT NULL,
    "numeroDose" INTEGER NOT NULL,
    "dataAplicacao" DATE NOT NULL,
    "lote" TEXT NOT NULL,
    "loteNormalizado" TEXT NOT NULL,
    "validadeLote" DATE,
    "viaAplicacao" TEXT,
    "observacao" TEXT,
    "registradoPorId" INTEGER,
    "aplicadoPor" TEXT,
    "registroRetroativo" BOOLEAN NOT NULL DEFAULT false,
    "aplicadaAdiantada" BOOLEAN NOT NULL DEFAULT false,
    "motivoAdiantada" TEXT,
    "diasAntecipacao" INTEGER,
    "dataProximaDose" DATE,
    "dataProximaDoseCalculada" DATE,
    "prontuarioId" INTEGER,
    "anuladaEm" TIMESTAMP(3),
    "anuladaPorId" INTEGER,
    "motivoAnulacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aplicacoes_vacinas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agendamentos_vacinacao" (
    "id" SERIAL NOT NULL,
    "animalId" INTEGER NOT NULL,
    "vacinaId" INTEGER NOT NULL,
    "protocoloId" INTEGER NOT NULL,
    "numeroDosePrevista" INTEGER NOT NULL,
    "dataHoraPrevista" TIMESTAMP(3) NOT NULL,
    "responsavelId" INTEGER,
    "observacao" TEXT,
    "status" "StatusAgendamentoVacinacao" NOT NULL DEFAULT 'agendado',
    "motivoCancelamento" TEXT,
    "aplicacaoId" INTEGER,
    "criadoPorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agendamentos_vacinacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vacinas_nomeNormalizado_key" ON "vacinas"("nomeNormalizado");

-- CreateIndex
CREATE INDEX "vacinas_ativa_idx" ON "vacinas"("ativa");

-- CreateIndex
CREATE INDEX "protocolos_vacinais_vacinaId_status_idx" ON "protocolos_vacinais"("vacinaId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "protocolos_vacinais_animalId_vacinaId_key" ON "protocolos_vacinais"("animalId", "vacinaId");

-- CreateIndex
CREATE INDEX "aplicacoes_vacinas_animalId_dataAplicacao_idx" ON "aplicacoes_vacinas"("animalId", "dataAplicacao");

-- CreateIndex
CREATE INDEX "aplicacoes_vacinas_protocoloId_idx" ON "aplicacoes_vacinas"("protocoloId");

-- CreateIndex
CREATE INDEX "aplicacoes_vacinas_loteNormalizado_idx" ON "aplicacoes_vacinas"("loteNormalizado");

-- CreateIndex
CREATE UNIQUE INDEX "agendamentos_vacinacao_aplicacaoId_key" ON "agendamentos_vacinacao"("aplicacaoId");

-- CreateIndex
CREATE INDEX "agendamentos_vacinacao_status_dataHoraPrevista_idx" ON "agendamentos_vacinacao"("status", "dataHoraPrevista");

-- CreateIndex
CREATE INDEX "agendamentos_vacinacao_animalId_idx" ON "agendamentos_vacinacao"("animalId");

-- AddForeignKey
ALTER TABLE "protocolos_vacinais" ADD CONSTRAINT "protocolos_vacinais_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocolos_vacinais" ADD CONSTRAINT "protocolos_vacinais_vacinaId_fkey" FOREIGN KEY ("vacinaId") REFERENCES "vacinas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocolos_vacinais" ADD CONSTRAINT "protocolos_vacinais_interrompidoPorId_fkey" FOREIGN KEY ("interrompidoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aplicacoes_vacinas" ADD CONSTRAINT "aplicacoes_vacinas_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aplicacoes_vacinas" ADD CONSTRAINT "aplicacoes_vacinas_vacinaId_fkey" FOREIGN KEY ("vacinaId") REFERENCES "vacinas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aplicacoes_vacinas" ADD CONSTRAINT "aplicacoes_vacinas_protocoloId_fkey" FOREIGN KEY ("protocoloId") REFERENCES "protocolos_vacinais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aplicacoes_vacinas" ADD CONSTRAINT "aplicacoes_vacinas_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aplicacoes_vacinas" ADD CONSTRAINT "aplicacoes_vacinas_anuladaPorId_fkey" FOREIGN KEY ("anuladaPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos_vacinacao" ADD CONSTRAINT "agendamentos_vacinacao_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos_vacinacao" ADD CONSTRAINT "agendamentos_vacinacao_vacinaId_fkey" FOREIGN KEY ("vacinaId") REFERENCES "vacinas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos_vacinacao" ADD CONSTRAINT "agendamentos_vacinacao_protocoloId_fkey" FOREIGN KEY ("protocoloId") REFERENCES "protocolos_vacinais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos_vacinacao" ADD CONSTRAINT "agendamentos_vacinacao_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos_vacinacao" ADD CONSTRAINT "agendamentos_vacinacao_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos_vacinacao" ADD CONSTRAINT "agendamentos_vacinacao_aplicacaoId_fkey" FOREIGN KEY ("aplicacaoId") REFERENCES "aplicacoes_vacinas"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Integridade que o Prisma não declara no schema. Mantida à mão, como
-- "animais_peso_atual_check" e "fotos_animais_identificacao_unica_idx" em gestao_animais.
-- Uma regeneração desta migration a perde; o teste de concorrência de aplicações a cobre.

ALTER TABLE "vacinas" ADD CONSTRAINT "vacinas_total_doses_check" CHECK ("totalDoses" >= 1);
ALTER TABLE "vacinas" ADD CONSTRAINT "vacinas_dias_aviso_check" CHECK ("diasAvisoProximaDose" BETWEEN 0 AND 365);
ALTER TABLE "vacinas" ADD CONSTRAINT "vacinas_especies_check" CHECK (cardinality("especies") >= 1);
ALTER TABLE "vacinas" ADD CONSTRAINT "vacinas_intervalo_check" CHECK (
  ("intervaloDosesDias" IS NULL OR "intervaloDosesDias" >= 0)
  AND ("totalDoses" = 1 OR "intervaloDosesDias" IS NOT NULL)
);
ALTER TABLE "vacinas" ADD CONSTRAINT "vacinas_revacinacao_check" CHECK ("revacinacaoDias" IS NULL OR "revacinacaoDias" > 0);
ALTER TABLE "vacinas" ADD CONSTRAINT "vacinas_idade_minima_check" CHECK ("idadeMinimaSemanas" IS NULL OR "idadeMinimaSemanas" >= 0);

ALTER TABLE "protocolos_vacinais" ADD CONSTRAINT "protocolos_vacinais_doses_check" CHECK ("dosesPrevistas" >= 1);
ALTER TABLE "protocolos_vacinais" ADD CONSTRAINT "protocolos_vacinais_interrupcao_check" CHECK ("status" <> 'interrompido' OR "motivoInterrupcao" IS NOT NULL);

ALTER TABLE "aplicacoes_vacinas" ADD CONSTRAINT "aplicacoes_vacinas_numero_dose_check" CHECK ("numeroDose" >= 1);
ALTER TABLE "aplicacoes_vacinas" ADD CONSTRAINT "aplicacoes_vacinas_lote_check" CHECK (btrim("lote") <> '' AND btrim("loteNormalizado") <> '');
ALTER TABLE "aplicacoes_vacinas" ADD CONSTRAINT "aplicacoes_vacinas_adiantada_check" CHECK (
  NOT "aplicadaAdiantada" OR ("motivoAdiantada" IS NOT NULL AND "diasAntecipacao" > 0)
);
ALTER TABLE "aplicacoes_vacinas" ADD CONSTRAINT "aplicacoes_vacinas_anulacao_check" CHECK (
  ("anuladaEm" IS NULL) = ("motivoAnulacao" IS NULL)
);

ALTER TABLE "agendamentos_vacinacao" ADD CONSTRAINT "agendamentos_vacinacao_dose_check" CHECK ("numeroDosePrevista" >= 1);
ALTER TABLE "agendamentos_vacinacao" ADD CONSTRAINT "agendamentos_vacinacao_cancelamento_check" CHECK ("status" <> 'cancelado' OR "motivoCancelamento" IS NOT NULL);
ALTER TABLE "agendamentos_vacinacao" ADD CONSTRAINT "agendamentos_vacinacao_baixa_check" CHECK ("status" <> 'aplicado' OR "aplicacaoId" IS NOT NULL);

-- Uma dose por protocolo enquanto não anulada. Aplicação anulada libera o número para novo registro.
CREATE UNIQUE INDEX "aplicacoes_vacinas_dose_ativa_unica_idx"
  ON "aplicacoes_vacinas"("protocoloId", "numeroDose")
  WHERE "anuladaEm" IS NULL;

-- No máximo um agendamento em aberto por animal e vacina.
CREATE UNIQUE INDEX "agendamentos_vacinacao_aberto_unico_idx"
  ON "agendamentos_vacinacao"("animalId", "vacinaId")
  WHERE "status" = 'agendado';
