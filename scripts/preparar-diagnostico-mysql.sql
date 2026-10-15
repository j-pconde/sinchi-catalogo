-- Preparação manual do banco exclusivo de teste do Catálogo Sinchi.
-- Execute este script no hPanel / phpMyAdmin somente no banco desta aplicação.
-- Não execute na ERP nem em qualquer banco de outro projeto.
-- A aplicação não cria tabelas na inicialização.

CREATE TABLE IF NOT EXISTS diagnostico_infra (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  marcador CHAR(36) NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_diagnostico_infra_marcador (marcador)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
