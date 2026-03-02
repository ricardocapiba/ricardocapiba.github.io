# Performa Comercial Imobiliário — Beta

Versão beta com layout clean (fundo branco), foco em informações e navegação por menu hambúrguer.

## Navegação

- **Resultados**: página principal com KPIs e tabela estilo planilha dos corretores.
- **Incluir equipe** (admin): página exclusiva para cadastro de equipes.
- **Incluir corretor** (admin): página exclusiva para cadastro de corretores e gestão de status/movimentação.
- **Lançamentos** (gerente): página exclusiva para lançamento de métricas.

## Recursos

- Login por perfil (Gestor admin e Gerente).
- Filtros por período, data, equipe e status.
- Indicadores consolidados e lista principal tabular.
- Persistência local via `localStorage`.

## Executar

```bash
python3 -m http.server 8000
```

Acesse: `http://localhost:8000`
