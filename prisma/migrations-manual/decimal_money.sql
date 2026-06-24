-- Migração P6: Float (DOUBLE) -> Decimal(10,2) nos campos monetários.
-- Aplicar uma única vez no banco MariaDB de produção.
--
-- Forma recomendada (sincroniza o schema automaticamente):
--   npx prisma db push
--
-- Alternativa manual (executar no MariaDB). A conversão DOUBLE -> DECIMAL(10,2)
-- arredonda os valores existentes para 2 casas decimais, sem perda relevante.

ALTER TABLE `BankAccount`      MODIFY `initialBalance` DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE `CreditCard`       MODIFY `limit`          DECIMAL(10,2) NOT NULL;
ALTER TABLE `TransactionGroup` MODIFY `totalAmount`    DECIMAL(10,2) NOT NULL;
ALTER TABLE `Transaction`      MODIFY `amount`         DECIMAL(10,2) NOT NULL;
ALTER TABLE `Transaction`      MODIFY `fee`            DECIMAL(10,2) NULL;
