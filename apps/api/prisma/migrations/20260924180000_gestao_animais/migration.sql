CREATE TYPE "EspecieAnimal" AS ENUM ('cao', 'gato');
CREATE TYPE "TipoRacaAnimal" AS ENUM ('catalogo', 'srd', 'outra', 'nao_informada', 'personalizada');
CREATE TYPE "SexoAnimal" AS ENUM ('macho', 'femea', 'nao_informado');
CREATE TYPE "PorteAnimal" AS ENUM ('pequeno', 'medio', 'grande', 'nao_informado');
CREATE TYPE "SituacaoAnimal" AS ENUM ('em_tratamento', 'em_quarentena_observacao', 'saudavel', 'adotado', 'obito');
CREATE TYPE "StatusCastracaoAnimal" AS ENUM ('sim', 'nao', 'nao_informado');
CREATE TYPE "UnidadeIdadeAnimal" AS ENUM ('dias', 'meses', 'anos');
CREATE TYPE "TipoEventoAnimal" AS ENUM (
  'criacao',
  'edicao',
  'acolhimento',
  'mudanca_situacao',
  'mudanca_baia',
  'pesagem',
  'observacao',
  'foto',
  'exame',
  'diagnostico',
  'revogacao_situacao_terminal'
);

CREATE TABLE "racas_animais" (
  "id" SERIAL NOT NULL,
  "especie" "EspecieAnimal" NOT NULL,
  "nome" TEXT NOT NULL,
  "nomeNormalizado" TEXT NOT NULL,
  "tipo" "TipoRacaAnimal" NOT NULL DEFAULT 'personalizada',
  "catalogoPadrao" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "racas_animais_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "animais" (
  "id" SERIAL NOT NULL,
  "nome" TEXT NOT NULL,
  "numeroRegistro" TEXT NOT NULL,
  "numeroRegistroNormalizado" TEXT NOT NULL,
  "especie" "EspecieAnimal" NOT NULL,
  "racaId" INTEGER,
  "sexo" "SexoAnimal" NOT NULL DEFAULT 'nao_informado',
  "porte" "PorteAnimal" NOT NULL DEFAULT 'nao_informado',
  "corPelagem" TEXT,
  "situacao" "SituacaoAnimal" NOT NULL DEFAULT 'em_tratamento',
  "emIsolamento" BOOLEAN NOT NULL DEFAULT false,
  "castrado" "StatusCastracaoAnimal" NOT NULL DEFAULT 'nao_informado',
  "pesoAtualKg" DECIMAL(7,3),
  "dataAcolhimento" TIMESTAMP(3),
  "dataNascimento" TIMESTAMP(3),
  "idadeEstimadaQuantidade" INTEGER,
  "idadeEstimadaUnidade" "UnidadeIdadeAnimal",
  "idadeAproximada" BOOLEAN NOT NULL DEFAULT false,
  "nasceuNoCcz" BOOLEAN NOT NULL DEFAULT false,
  "baiaId" INTEGER,
  "criadoPorId" INTEGER,
  "acolhidoPor" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "animais_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "animais_peso_atual_check" CHECK ("pesoAtualKg" IS NULL OR "pesoAtualKg" > 0),
  CONSTRAINT "animais_idade_estimada_check" CHECK ("idadeEstimadaQuantidade" IS NULL OR "idadeEstimadaQuantidade" >= 0),
  CONSTRAINT "animais_idade_estimada_unidade_check" CHECK (
    ("idadeEstimadaQuantidade" IS NULL AND "idadeEstimadaUnidade" IS NULL)
    OR ("idadeEstimadaQuantidade" IS NOT NULL AND "idadeEstimadaUnidade" IS NOT NULL)
  )
);

CREATE TABLE "fotos_animais" (
  "id" SERIAL NOT NULL,
  "animalId" INTEGER NOT NULL,
  "caminhoAbsoluto" TEXT NOT NULL,
  "nomeArquivo" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "tamanhoBytes" INTEGER NOT NULL,
  "largura" INTEGER NOT NULL,
  "altura" INTEGER NOT NULL,
  "identificacao" BOOLEAN NOT NULL DEFAULT false,
  "ordem" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fotos_animais_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fotos_animais_tamanho_check" CHECK ("tamanhoBytes" > 0),
  CONSTRAINT "fotos_animais_dimensoes_check" CHECK ("largura" > 0 AND "altura" > 0)
);

CREATE TABLE "pesagens_animais" (
  "id" SERIAL NOT NULL,
  "animalId" INTEGER NOT NULL,
  "valorKg" DECIMAL(7,3) NOT NULL,
  "observacao" TEXT,
  "usuarioId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pesagens_animais_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pesagens_animais_valor_check" CHECK ("valorKg" > 0)
);

CREATE TABLE "observacoes_animais" (
  "id" SERIAL NOT NULL,
  "animalId" INTEGER NOT NULL,
  "texto" TEXT NOT NULL,
  "usuarioId" INTEGER,
  "observacaoOrigemId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "observacoes_animais_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "eventos_animais" (
  "id" SERIAL NOT NULL,
  "animalId" INTEGER NOT NULL,
  "tipo" "TipoEventoAnimal" NOT NULL,
  "resumo" TEXT NOT NULL,
  "dados" JSONB,
  "usuarioId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "eventos_animais_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "racas_animais_especie_nomeNormalizado_key" ON "racas_animais"("especie", "nomeNormalizado");
CREATE INDEX "racas_animais_especie_tipo_idx" ON "racas_animais"("especie", "tipo");

CREATE UNIQUE INDEX "animais_numeroRegistroNormalizado_key" ON "animais"("numeroRegistroNormalizado");
CREATE INDEX "animais_especie_situacao_idx" ON "animais"("especie", "situacao");
CREATE INDEX "animais_baiaId_idx" ON "animais"("baiaId");
CREATE INDEX "animais_racaId_idx" ON "animais"("racaId");

CREATE INDEX "fotos_animais_animalId_ordem_idx" ON "fotos_animais"("animalId", "ordem");
CREATE UNIQUE INDEX "fotos_animais_identificacao_unica_idx" ON "fotos_animais"("animalId") WHERE "identificacao" = true;

CREATE INDEX "pesagens_animais_animalId_createdAt_idx" ON "pesagens_animais"("animalId", "createdAt");
CREATE INDEX "observacoes_animais_animalId_createdAt_idx" ON "observacoes_animais"("animalId", "createdAt");
CREATE INDEX "eventos_animais_animalId_createdAt_idx" ON "eventos_animais"("animalId", "createdAt");
CREATE INDEX "eventos_animais_tipo_createdAt_idx" ON "eventos_animais"("tipo", "createdAt");
CREATE INDEX "auditoria_eventos_animal_idx" ON "auditoria_eventos" (("dados"->>'entidade'), ("dados"->>'entidadeId'), "createdAt" DESC);

ALTER TABLE "animais" ADD CONSTRAINT "animais_racaId_fkey" FOREIGN KEY ("racaId") REFERENCES "racas_animais"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "animais" ADD CONSTRAINT "animais_baiaId_fkey" FOREIGN KEY ("baiaId") REFERENCES "baias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "animais" ADD CONSTRAINT "animais_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "fotos_animais" ADD CONSTRAINT "fotos_animais_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pesagens_animais" ADD CONSTRAINT "pesagens_animais_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animais"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pesagens_animais" ADD CONSTRAINT "pesagens_animais_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "observacoes_animais" ADD CONSTRAINT "observacoes_animais_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animais"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "observacoes_animais" ADD CONSTRAINT "observacoes_animais_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "observacoes_animais" ADD CONSTRAINT "observacoes_animais_observacaoOrigemId_fkey" FOREIGN KEY ("observacaoOrigemId") REFERENCES "observacoes_animais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "eventos_animais" ADD CONSTRAINT "eventos_animais_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animais"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "eventos_animais" ADD CONSTRAINT "eventos_animais_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
