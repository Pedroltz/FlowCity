# Redes de teste LinkPlan

Os três JSON são instâncias sintéticas e determinísticas, produzidas por `scripts/generate-datasets.mjs` para testar fluxo máximo e visualizar a rede residual durante a apresentação. Não representam infraestrutura real. As capacidades são unidades abstratas de fluxo.

| Arquivo           | Nome na aplicação              | Vértices | Arestas | Origem → destino |
| ----------------- | ------------------------------ | -------: | ------: | ---------------- |
| `01-pequeno.json` | Rede residual pequena · 6 nós  |        6 |      10 | s → t            |
| `02-medio.json`   | Rede residual média · 20 nós   |       20 |      68 | s → t            |
| `03-grande.json`  | Rede residual grande · 100 nós |      100 |     401 | s → t            |

Os vértices usam identificadores simples (`s`, `a`, `b`, …); a instância grande continua essa convenção com `v01`, `v02`, …, `t`. A rede pequena tem fluxo máximo conhecido **23**. Um corte mínimo é `{s,a,c,d}` → `{b,t}`, com capacidades `a→b=12`, `d→b=7` e `d→t=4`, totalizando 23. A rede média oferece rotas alternativas e ciclos; a grande tem dimensões que tornam a análise manual pouco prática. O algoritmo cria a rede residual em cada execução; ela não é um segundo grafo fixo de entrada.

Execute `node scripts/generate-datasets.mjs` na raiz para reproduzir os arquivos. A rotina sobrescreve somente os três JSON de demonstração; ela não altera redes já salvas no banco. Ao iniciar, a aplicação atualiza as três redes antigas com esses nomes, preservando seus IDs, capacidades, posições e arestas existentes, e troca os rótulos dos vértices para os identificadores simples.

## JSON

Campos obrigatórios: `name`, `nodes` e `edges`. Cada vértice contém `id` e `name`; cada aresta contém `source`, `target` e `capacity` (inteiro entre 0 e 2147483647). Campos opcionais: `description`, posições `x`/`y` dos vértices e `id`/`flow` das arestas. A API gera IDs de arestas ausentes e redefine o fluxo para zero ao salvar. IDs de vértices e arestas devem ser únicos dentro de suas respectivas listas; extremos devem existir. IDs são sensíveis a maiúsculas.

```json
{
  "name": "Rede de demonstração",
  "description": "Unidades abstratas de fluxo",
  "nodes": [
    { "id": "s", "name": "s" },
    { "id": "t", "name": "t" }
  ],
  "edges": [{ "source": "s", "target": "t", "capacity": 20 }]
}
```

## Limitações e análise

O modelo não inclui demanda concorrente, tempo ou capacidade de vértices. Fluxo máximo é um limite da rede capacitada, não uma previsão de tráfego. Arestas residuais reversas representam cancelamento algorítmico de fluxo; não são conexões adicionais na rede original.

Os endpoints das instâncias têm grau limitado. Por isso, aumentar vértices e arestas não implica aumentar proporcionalmente o fluxo máximo, nem obter tempos monotônicos em entradas tão rápidas. Compare número de aumentos e gargalos além do tamanho. Não extrapole três instâncias para uma prova empírica da complexidade assintótica.

## Estudos principais de telecomunicações

Os benchmarks históricos SNDlib ficam em [case-studies](case-studies/README.md), com arquivos originais, políticas de capacidade, revisão da fonte e checksums. Não são gerados pelo gerador dessas redes de teste.
