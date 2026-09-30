CREATE TABLE IF NOT EXISTS "tutores" (
  "id" SERIAL NOT NULL,
  "nome" TEXT NOT NULL,
  "cpf" TEXT NOT NULL,
  "telefone" TEXT NOT NULL,
  "email" TEXT,
  "cep" TEXT NOT NULL,
  "logradouro" TEXT NOT NULL,
  "numero" TEXT NOT NULL,
  "complemento" TEXT,
  "bairro" TEXT NOT NULL,
  "cidade" TEXT NOT NULL,
  "uf" CHAR(2) NOT NULL,
  "criadoPorId" INTEGER,
  "atualizadoPorId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tutores_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "fotos_tutores" (
  "id" SERIAL NOT NULL,
  "tutorId" INTEGER NOT NULL,
  "caminhoRelativo" TEXT NOT NULL,
  "nomeArquivo" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "tamanhoBytes" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fotos_tutores_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fotos_tutores_tamanho_check" CHECK ("tamanhoBytes" > 0)
);

CREATE TABLE IF NOT EXISTS "documentos_tutores" (
  "id" SERIAL NOT NULL,
  "tutorId" INTEGER NOT NULL,
  "caminhoRelativo" TEXT NOT NULL,
  "nomeArquivo" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "tamanhoBytes" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "documentos_tutores_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "documentos_tutores_tamanho_check" CHECK ("tamanhoBytes" > 0)
);

CREATE TABLE IF NOT EXISTS "liberacoes_adocao" (
  "id" SERIAL NOT NULL,
  "animalId" INTEGER NOT NULL,
  "justificativa" TEXT NOT NULL,
  "autorizadaPorId" INTEGER,
  "autorizadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "consumidaEm" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "liberacoes_adocao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "adocoes" (
  "id" SERIAL NOT NULL,
  "animalId" INTEGER NOT NULL,
  "tutorId" INTEGER NOT NULL,
  "liberacaoId" INTEGER,
  "consentiuTratamento" BOOLEAN NOT NULL,
  "consentiuAcompanhamento" BOOLEAN NOT NULL,
  "caminhoAssinatura" TEXT NOT NULL,
  "nomeArquivoAssinatura" TEXT NOT NULL,
  "mimeTypeAssinatura" TEXT NOT NULL,
  "tamanhoAssinatura" INTEGER NOT NULL,
  "adotadaPorId" INTEGER,
  "adotadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "encerradaEm" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "adocoes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "adocoes_tamanho_assinatura_check" CHECK ("tamanhoAssinatura" > 0)
);

CREATE TABLE IF NOT EXISTS "devolucoes" (
  "id" SERIAL NOT NULL,
  "adocaoId" INTEGER NOT NULL,
  "motivo" TEXT NOT NULL,
  "situacaoRetorno" "SituacaoAnimal" NOT NULL,
  "baiaId" INTEGER,
  "recebidaPorId" INTEGER,
  "recebidaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "devolucoes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "devolucoes_situacao_retorno_check" CHECK ("situacaoRetorno" IN ('em_tratamento', 'em_quarentena_observacao', 'saudavel'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "tutores_cpf_key" ON "tutores"("cpf");
CREATE INDEX IF NOT EXISTS "tutores_nome_idx" ON "tutores"("nome");
CREATE UNIQUE INDEX IF NOT EXISTS "fotos_tutores_tutorId_key" ON "fotos_tutores"("tutorId");
CREATE INDEX IF NOT EXISTS "documentos_tutores_tutorId_createdAt_idx" ON "documentos_tutores"("tutorId", "createdAt");
CREATE INDEX IF NOT EXISTS "liberacoes_adocao_animalId_autorizadaEm_idx" ON "liberacoes_adocao"("animalId", "autorizadaEm");
CREATE UNIQUE INDEX IF NOT EXISTS "adocoes_liberacaoId_key" ON "adocoes"("liberacaoId");
CREATE INDEX IF NOT EXISTS "adocoes_animalId_adotadaEm_idx" ON "adocoes"("animalId", "adotadaEm");
CREATE INDEX IF NOT EXISTS "adocoes_tutorId_adotadaEm_idx" ON "adocoes"("tutorId", "adotadaEm");
CREATE UNIQUE INDEX IF NOT EXISTS "adocoes_animal_ativa_idx" ON "adocoes"("animalId") WHERE "encerradaEm" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "devolucoes_adocaoId_key" ON "devolucoes"("adocaoId");
CREATE INDEX IF NOT EXISTS "devolucoes_baiaId_idx" ON "devolucoes"("baiaId");

ALTER TABLE "tutores" ADD CONSTRAINT "tutores_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tutores" ADD CONSTRAINT "tutores_atualizadoPorId_fkey" FOREIGN KEY ("atualizadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "fotos_tutores" ADD CONSTRAINT "fotos_tutores_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "documentos_tutores" ADD CONSTRAINT "documentos_tutores_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "liberacoes_adocao" ADD CONSTRAINT "liberacoes_adocao_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "liberacoes_adocao" ADD CONSTRAINT "liberacoes_adocao_autorizadaPorId_fkey" FOREIGN KEY ("autorizadaPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "adocoes" ADD CONSTRAINT "adocoes_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "adocoes" ADD CONSTRAINT "adocoes_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "adocoes" ADD CONSTRAINT "adocoes_liberacaoId_fkey" FOREIGN KEY ("liberacaoId") REFERENCES "liberacoes_adocao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "adocoes" ADD CONSTRAINT "adocoes_adotadaPorId_fkey" FOREIGN KEY ("adotadaPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "devolucoes" ADD CONSTRAINT "devolucoes_adocaoId_fkey" FOREIGN KEY ("adocaoId") REFERENCES "adocoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "devolucoes" ADD CONSTRAINT "devolucoes_baiaId_fkey" FOREIGN KEY ("baiaId") REFERENCES "baias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "devolucoes" ADD CONSTRAINT "devolucoes_recebidaPorId_fkey" FOREIGN KEY ("recebidaPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
