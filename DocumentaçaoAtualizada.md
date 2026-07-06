# EstudaENEM — Documentação Completa do Projeto

**Última atualização:** 06/07/2026  
**Desenvolvido por:** Gustavo + Claude (Anthropic)  
**Status:** Em desenvolvimento ativo ✅

---

## 1. Visão Geral

Plataforma web **100% paga** de revisão para o ENEM e vestibulares com questões de provas reais, correção automática e explicação por IA. Sem versão gratuita.

**Modelo de negócio:** R$25 acesso único até o ENEM em novembro.

### URLs de Produção
| Serviço | URL |
|---|---|
| Site (Vercel) | https://estudaenem-sage.vercel.app |
| Repositório (GitHub) | https://github.com/gustavoruir4/estudaenem |
| Banco de dados (Supabase) | https://avtolxrbmvcqcvvfdcvv.supabase.co |
| Dashboard Supabase | https://supabase.com/dashboard/project/avtolxrbmvcqcvvfdcvv |
| Dashboard Vercel | https://vercel.com/gustavoruir4s-projects/estudaenem |

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Motivo |
|---|---|---|
| Frontend | React 18 + Vite | Rápido, moderno |
| Roteamento | React Router v6 | SPA sem reload |
| Banco de dados | Supabase (PostgreSQL) | Gratuito, auth inclusa, RLS |
| Autenticação | Supabase Auth | Login/cadastro com email |
| IA (explicações) | Anthropic API (claude-sonnet-4-6) | Explicações didáticas |
| Hospedagem | Vercel | Deploy automático via GitHub |
| Estilização | CSS Modules | Estilos isolados por componente |

---

## 3. Estrutura de Arquivos

```
estudaenem/
├── index.html
├── vite.config.js
├── package.json
├── vercel.json                   # Configuração SPA routing
├── .env.example
├── supabase_setup.sql            # SQL tabela respostas
├── supabase_explicacoes.sql      # SQL tabela explicacoes
├── gerar_explicacoes.mjs         # Script pré-geração de explicações
└── src/
    ├── main.jsx
    ├── App.jsx                   # Rotas
    ├── index.css
    ├── lib/
    │   ├── supabase.js
    │   ├── AuthContext.jsx
    │   └── questions.js          # 555 questões
    ├── components/
    │   ├── Layout.jsx
    │   └── Layout.module.css
    └── pages/
        ├── Login.jsx / .module.css
        ├── Questoes.jsx / .module.css
        ├── Perfil.jsx / .module.css
        ├── Historico.jsx / .module.css
        └── Admin.jsx / .module.css
```

---

## 4. Variáveis de Ambiente

Configuradas no Vercel em **Settings > Environment Variables**.  
Localmente, criar arquivo `.env` na raiz.

| Variável | Descrição |
|---|---|
| `VITE_SUPABASE_URL` | `https://avtolxrbmvcqcvvfdcvv.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Chave anon do Supabase (Settings > API Keys > Legacy) |
| `VITE_ANTHROPIC_API_KEY` | Chave da API Anthropic (console.anthropic.com) |

> ⚠️ **Segurança pendente:** a chave da Anthropic está exposta no frontend. Antes do lançamento, mover para uma Supabase Edge Function.

---

## 5. Banco de Dados

### Tabela: `respostas`
Armazena todas as respostas dos usuários.

```sql
CREATE TABLE respostas (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question_id   INT NOT NULL,
  area          TEXT NOT NULL,
  assunto       TEXT NOT NULL,
  prova         TEXT NOT NULL,
  ano           INT NOT NULL,
  correta       BOOLEAN NOT NULL,
  resposta_dada TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabela: `explicacoes`
Cache de explicações geradas pela IA. Evita chamadas repetidas à API.

```sql
CREATE TABLE explicacoes (
  question_id   INT PRIMARY KEY,
  explicacao    TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### Políticas RLS

**respostas:** cada usuário só acessa suas próprias respostas.

**explicacoes:** leitura e inserção liberadas para `anon` e `authenticated` — necessário para o script de pré-geração funcionar sem autenticação.

---

## 6. Banco de Questões

**Arquivo:** `src/lib/questions.js`  
**Total:** 555 questões  
**Fonte:** ENEM 2016, 2017, 2018 e 2019 (Dia 1 + Dia 2)  
**Filtro aplicado:** questões com imagem/gráfico essencial foram removidas  
**IDs:** 31 a 732 (IDs 1–30 eram questões de teste, não estão mais no banco)

| Área | Quantidade |
|---|---|
| Ciências da Natureza | ~140 |
| Ciências Humanas | ~140 |
| Matemática | ~140 |
| Linguagens | ~135 |

**Estrutura de cada questão:**
```javascript
{
  id: 31,
  ano: 2016,
  prova: "ENEM",
  area: "Ciências Humanas",
  assunto: "Filosofia - Ética e Felicidade",
  enunciado: "Texto da questão...",
  opcoes: [
    { letra: "A", texto: "..." },
    { letra: "B", texto: "..." },
    { letra: "C", texto: "..." },
    { letra: "D", texto: "..." },
    { letra: "E", texto: "..." },
  ],
  correta: "B",
}
```

**Próximas provas a adicionar:** FUVEST, UNICAMP, UNESP, ENEM 2020–2024.  
**IDs futuros:** começam em 733.

---

## 7. Explicações por IA — Sistema de Cache

**Objetivo:** cada questão tem uma explicação gerada pela IA salva no banco. Quando um aluno erra (ou acerta), a explicação vem do cache — sem custo de API.

**Script:** `gerar_explicacoes.mjs`  
**Como rodar:** `node gerar_explicacoes.mjs` (dentro da pasta do projeto com `.env` preenchido)  
**Inteligência:** o script pula questões que já têm explicação — pode ser interrompido e retomado.

**Status atual:** ~195/555 explicações geradas (em progresso).

**Modelo usado:** `claude-sonnet-4-6`  
**Custo estimado total (555 questões):** ~$4–6 USD

**Prompt padrão:**
```
Você é um professor especialista em ENEM. A questão é:
"[enunciado]"
A alternativa correta é [letra]: "[texto]".
Explique de forma didática e direta em 3 a 4 frases por que essa é a 
resposta certa, qual o conceito envolvido e por que as outras alternativas 
estão erradas. Responda em português brasileiro.
```

---

## 8. Autenticação

- **Cadastro:** `supabase.auth.signUp({ email, password, options: { data: { nome } } })`
- **Login:** `supabase.auth.signInWithPassword({ email, password })`
- **Logout:** `supabase.auth.signOut()`
- **Estado global:** `AuthContext.jsx`

**Configuração importante no Supabase:**  
`Authentication > URL Configuration > Site URL` deve ser:
```
https://estudaenem-sage.vercel.app
```

---

## 9. Funcionalidades Implementadas

- ✅ Cadastro e login de usuários
- ✅ Proteção de rotas (redireciona para /login se não autenticado)
- ✅ 555 questões reais ENEM 2016–2019
- ✅ Filtros por área e por prova
- ✅ Embaralhamento Fisher-Yates (questões e sessão)
- ✅ Correção automática com feedback visual
- ✅ Explicação por IA para acertos e erros (cache no Supabase)
- ✅ Deduplicação de sessão (não repete questão já respondida)
- ✅ Barra de progresso da sessão
- ✅ Tela de conclusão com estatísticas da rodada
- ✅ Dashboard de desempenho por área e assunto (Perfil)
- ✅ Histórico de respostas (últimas 50)
- ✅ Painel Admin restrito ao email gustavoruir4@gmail.com
- ✅ Admin: ver todos usuários, stats, limpar histórico, controle do cache
- ✅ Responsivo para celular
- ✅ Rotas SPA funcionando no celular (vercel.json)

---

## 10. Painel Admin

**URL:** `/admin`  
**Acesso:** restrito ao email `gustavoruir4@gmail.com`  
**Proteção:** verificação no frontend (AuthContext) — adicionar RLS no banco antes do lançamento.

**Funcionalidades:**
- Resumo geral: usuários ativos, total de respostas, taxa de acerto, cache
- Limpar próprio histórico
- Ver stats detalhadas de qualquer usuário
- Limpar histórico de qualquer usuário
- Limpar cache de explicações
- Atualizar dados

---

## 11. Deploy e CI/CD

Vercel conectado ao GitHub. Commits na branch `main` disparam deploy automático.

```
Commit no GitHub → Vercel detecta → Build (~1-2 min) → Site atualizado
```

---

## 12. Pendências Antes do Lançamento

- [ ] **SEGURANÇA:** mover chave Anthropic para Supabase Edge Function
- [ ] **SEGURANÇA:** adicionar verificação RLS para o painel admin no banco
- [ ] **PAGAMENTO:** integrar Stripe (R$25 acesso único até novembro)
- [ ] **DESIGN:** novo front-end com Lovable
- [ ] **LANDING PAGE:** página de vendas explicando o produto e preço
- [ ] **FUNCIONALIDADES:** modo simulado com timer
- [ ] **FUNCIONALIDADES:** modo revisão de erros
- [ ] **QUESTÕES:** completar cache de explicações (555/555)
- [ ] **QUESTÕES:** adicionar provas de outros vestibulares

---

## 13. Decisões Técnicas

| Decisão | Por quê |
|---|---|
| Produto 100% pago | Sem versão gratuita — R$25 acesso único até o ENEM |
| Questões em JS local | Estáticas, não precisam de banco, carregamento instantâneo |
| Cache de explicações no Supabase | Zero custo de IA após pré-geração, escala com qualquer volume |
| Chave Anthropic no frontend (temporário) | MVP rápido; migrar para Edge Function antes do lançamento |
| RLS nas tabelas | Segurança: cada usuário só acessa seus próprios dados |
| Fisher-Yates shuffle | Embaralhamento justo, sem repetição na sessão |

---

## 14. Como Retomar o Desenvolvimento

### Contexto para nova conversa comigo:
> "Tenho um projeto chamado EstudaENEM em produção em estudaenem-sage.vercel.app. É 100% pago (R$25 até o ENEM). Stack: React + Vite, Supabase (projeto avtolxrbmvcqcvvfdcvv), Vercel. GitHub: gustavoruir4/estudaenem. 555 questões ENEM 2016-2019. Cache de explicações na tabela 'explicacoes' do Supabase. Painel admin em /admin para gustavoruir4@gmail.com. Quero [descrever o que quer fazer]."

### Para rodar localmente:
```bash
git clone https://github.com/gustavoruir4/estudaenem.git
cd estudaenem
npm install
cp .env.example .env
# Preencher .env com as chaves
npm run dev
# Acessa http://localhost:5173
```

### Para adicionar questões:
Editar `src/lib/questions.js`, IDs começando em 733. Commit → Vercel republica.

### Para gerar explicações:
```bash
node gerar_explicacoes.mjs
# Pula as já geradas, continua de onde parou
```
