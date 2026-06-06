<div align="center">
  <h1>Soluteg Finanças</h1>
  <p><b>Gestão financeira pessoal segura e moderna</b></p>
  <p>
    <a href="https://soluteg.com.br">soluteg.com.br</a> •
    <a href="https://fin.soluteg.com.br">fin.soluteg.com.br</a>
  </p>
  
  ![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white)
  ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
  ![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
  ![MariaDB](https://img.shields.io/badge/MariaDB-003545?style=for-the-badge&logo=mariadb&logoColor=white)
  ![NextAuth](https://img.shields.io/badge/NextAuth-121212?style=for-the-badge&logo=nextauth&logoColor=white)
</div>

## Sobre o Projeto

O **Soluteg Finanças** é um aplicativo moderno de gestão financeira pessoal desenvolvido para oferecer segurança e praticidade. A plataforma permite login facilitado via Google, além de fornecer um controle intuitivo de receitas e despesas. Os usuários contam com um dashboard dinâmico repleto de gráficos e um histórico completo de transações para acompanhar a saúde financeira em tempo real.

## Funcionalidades

- [x] Autenticação via Google OAuth
- [x] Dashboard com saldo, receitas e despesas
- [x] Gráfico de evolução do saldo
- [x] Cadastro de transações (receita/despesa)
- [x] Histórico de transações
- [x] Categorização automática
- [x] Design responsivo com tema dark

## Tech Stack

| Tecnologia | Descrição |
| --- | --- |
| **Next.js 15+** | Framework React com App Router para SSR e rotas de API |
| **TypeScript** | Superset JavaScript para tipagem estática e segurança |
| **NextAuth v5** | Autenticação segura e gerenciamento de sessões |
| **Prisma ORM** | Ferramenta moderna de mapeamento de banco de dados |
| **MariaDB** | Banco de dados relacional robusto e de alta performance |
| **Recharts** | Biblioteca para geração de gráficos dinâmicos e interativos |
| **Zod** | Validação de dados rigorosa no lado do servidor |

## Pré-requisitos

Para rodar este projeto localmente, você precisará de:
- **Node.js** 18+
- Conta **Google** (para configuração do OAuth)
- Banco de dados **MariaDB** ou **MySQL**

## Como rodar localmente

1. Clone o repositório:
   ```bash
   git clone <url-do-repositorio>
   cd secure-fin
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Copie o arquivo de configuração e preencha as variáveis:
   ```bash
   cp .env.example .env
   ```

4. Rode as migrações para preparar o banco de dados:
   ```bash
   npx prisma migrate dev
   ```

5. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

## Variáveis de Ambiente

O arquivo `.env` deve conter as seguintes variáveis de ambiente configuradas para o funcionamento correto:

| Variável | Descrição |
| --- | --- |
| `DATABASE_URL` | String de conexão com o banco (ex: mysql://user:pass@host:port/db) |
| `AUTH_SECRET` | Segredo criptográfico para o NextAuth gerenciar as sessões |
| `AUTH_GOOGLE_ID` | Client ID gerado no painel do Google OAuth |
| `AUTH_GOOGLE_SECRET` | Client Secret gerado no painel do Google OAuth |
| `NEXTAUTH_URL` | URL base da aplicação em execução |
| `DB_HOST` | Host ou IP do servidor MariaDB/MySQL |
| `DB_USER` | Usuário do banco de dados |
| `DB_PASS` | Senha do banco de dados |
| `DB_NAME` | Nome da database/schema principal |
| `DB_PORT` | Porta de acesso ao banco (geralmente 3306) |

## Estrutura do Projeto

Uma visão simplificada da arquitetura da aplicação:

```text
├── src/app/          # Páginas, rotas e endpoints da API usando Next.js App Router
├── src/components/   # Componentes de UI isolados, reutilizáveis e layouts base
├── src/lib/          # Configurações globais, conexão do banco e validações Zod
└── prisma/           # Definição do Schema do banco e arquivos de migração
```

## Roadmap

A plataforma está em evolução constante. Abaixo as funcionalidades planejadas para as próximas atualizações:

- [ ] Edição e exclusão de transações
- [ ] Gerenciamento de categorias
- [ ] Relatórios com gráficos por categoria
- [ ] Filtros e busca no histórico
- [ ] Exportação em PDF
- [ ] Alertas e notificações por e-mail

---
<div align="center">
  <p>Desenvolvido por Soluteg — <a href="https://soluteg.com.br">soluteg.com.br</a></p>
</div>
