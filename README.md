# Sistema comercial imobiliário (com perfis gerente/admin)

Aplicação web estática para controle dos números de equipes comerciais do setor imobiliário, com gestão de corretores e times.

## O que este sistema entrega

- **Dois níveis de acesso**:
  - **Gestor Admin**: cria equipe, cria corretor, ativa/desativa corretor e move corretor entre equipes mantendo histórico.
  - **Gerente**: visualiza apenas sua(s) equipe(s) e lança números de corretores.
- **Visão por corretor com nome + foto**.
- **Métricas solicitadas**:
  - Leads recebidos
  - Leads totais da base
  - Documentações recebidas
  - Leads necessários por documentação (**base total / docs**)
  - Vendas realizadas
  - Documentações necessárias por venda (**docs / vendas**)
- **Consolidação individual, por equipe e geral** (admin enxerga empresa inteira).
- **Filtros para todos os perfis**:
  - Dia
  - Semana
  - Mês (padrão)
  - Ano
  - Histórico geral
- **Filtro de status de corretores**:
  - Todos
  - Apenas ativados
  - Apenas desativados
- **Projeção de necessidade futura** para meta de vendas (estimativa de docs e leads da base).
- Persistência local em `localStorage`.

## Como executar

Abra `index.html` no navegador, ou rode um servidor local:

```bash
python3 -m http.server 8000
```

Depois acesse `http://localhost:8000`.
