-- Tipos de evento da timeline do animal para vacinação e agenda.
-- Valores de enum novos não podem ser usados nesta mesma migration: nenhum DEFAULT nem INSERT aqui.
-- `reacao_adversa` e `encerramento_observacao_antirrabica` entram na migration da situação antirrábica.
ALTER TYPE "TipoEventoAnimal" ADD VALUE IF NOT EXISTS 'aplicacao_vacina';
ALTER TYPE "TipoEventoAnimal" ADD VALUE IF NOT EXISTS 'edicao_aplicacao_vacina';
ALTER TYPE "TipoEventoAnimal" ADD VALUE IF NOT EXISTS 'anulacao_aplicacao_vacina';
ALTER TYPE "TipoEventoAnimal" ADD VALUE IF NOT EXISTS 'interrupcao_protocolo_vacinal';
ALTER TYPE "TipoEventoAnimal" ADD VALUE IF NOT EXISTS 'retomada_protocolo_vacinal';
ALTER TYPE "TipoEventoAnimal" ADD VALUE IF NOT EXISTS 'criacao_agendamento_vacina';
ALTER TYPE "TipoEventoAnimal" ADD VALUE IF NOT EXISTS 'remarcacao_agendamento_vacina';
ALTER TYPE "TipoEventoAnimal" ADD VALUE IF NOT EXISTS 'cancelamento_agendamento_vacina';
ALTER TYPE "TipoEventoAnimal" ADD VALUE IF NOT EXISTS 'falta_agendamento_vacina';
ALTER TYPE "TipoEventoAnimal" ADD VALUE IF NOT EXISTS 'reabertura_agendamento_vacina';
