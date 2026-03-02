# Performa Comercial Imobiliário — Beta

Versão beta que **junta preview visual moderno (tons de azul)** com **interface funcional** para operação comercial.

## Principais recursos beta

- Login de sessão por perfil (Gestor admin e Gerente)
- Gestão de equipes e corretores (admin)
- Ativar/desativar corretor e mover corretor de equipe mantendo histórico
- Lançamento de métricas por corretor (gerente):
  - Leads recebidos
  - Leads totais da base
  - Documentações
  - Vendas
- Indicadores:
  - Leads por documentação (base/docs)
  - Documentações por venda (docs/vendas)
- Filtros por período, equipe e status do corretor
- Persistência local via `localStorage`

## Executar

```bash
python3 -m http.server 8000
```

Acesse: `http://localhost:8000`
