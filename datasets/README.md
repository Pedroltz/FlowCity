# Datasets FlowCity

Todos os dados são **sintéticos**, produzidos para este projeto pelo gerador determinístico `scripts/generate-datasets.mjs`. Não foram coletados de sensores, mapas ou órgãos públicos e não correspondem a uma cidade real. Os nomes descrevem situações plausíveis para ajudar a interpretar o grafo.

As capacidades são estimativas simuladas de **veículos por minuto**, em um único intervalo estacionário. Cada aresta é uma via direcionada; duas vias em sentidos contrários têm capacidades independentes. O modelo assume conservação de fluxo nos cruzamentos intermediários.

O modelo é um **grafo direcionado e ponderado por capacidades**. Esses pesos limitam o fluxo; não representam distância nem custo de deslocamento.

| Arquivo | Contexto | Vértices | Arestas | Origem → destino |
|---|---|---:|---:|---|
| `01-pequeno.json` | Dois corredores com conexões transversais | 6 | 10 | S → T |
| `02-medio.json` | Malha de bairros 4 × 5 com ligações diagonais | 20 | 68 | N001 → N020 |
| `03-grande.json` | Malha urbana 10 × 10, vias nos dois sentidos e diagonais | 100 | 401 | N001 → N100 |

A instância pequena usa uma topologia didática clássica de fluxo máximo, com nomes urbanos fictícios. Seu valor esperado é **23**. Um corte mínimo é `{S,A,C,D}` → `{B,T}`, com capacidades `A→B=12`, `D→B=7` e `D→T=4`, totalizando 23. Isso fornece um limite superior verificável manualmente; o algoritmo constrói um fluxo que o atinge.

Nas malhas, as capacidades são calculadas por fórmulas inteiras sobre linha e coluna (consulte o gerador). Há corredores horizontais e verticais, ciclos, diferentes gargalos e diagonais em posições alternadas. A geração não usa aleatoriedade. Execute `node scripts/generate-datasets.mjs` na raiz para reproduzir os arquivos. A rotina sobrescreve somente os três arquivos conhecidos e não altera as redes já salvas no banco.

## JSON

Campos obrigatórios: `name`, `nodes` e `edges`. Cada vértice contém `id` e `name`; cada aresta contém `source`, `target` e `capacity` (inteiro entre 0 e 2147483647). Campos opcionais: `description`, posições `x`/`y` dos vértices e `id`/`flow` das arestas. A API gera IDs de arestas ausentes e redefine o fluxo para zero ao salvar. IDs de vértices e arestas devem ser únicos dentro de suas respectivas listas; extremos devem existir. IDs são sensíveis a maiúsculas.

```json
{
  "name": "Corredor de demonstração",
  "description": "Simulação em veículos/minuto",
  "nodes": [{ "id": "A", "name": "Entrada" }, { "id": "B", "name": "Saída" }],
  "edges": [{ "source": "A", "target": "B", "capacity": 20 }]
}
```

## Limitações e análise

O modelo não inclui semáforos, tempo de viagem, filas, conversões proibidas, limites de armazenamento, demanda variável ou capacidade de vértices. Fluxo máximo é um limite da rede capacitada, **não uma previsão de trânsito nem uma simulação temporal**. Arestas residuais reversas representam cancelamento algorítmico de fluxo; não autorizam tráfego na contramão.

Os endpoints externos dessas malhas têm grau limitado. Por isso, aumentar vértices e arestas não implica aumentar proporcionalmente o fluxo máximo, nem obter tempos monotônicos em entradas tão rápidas. Compare número de aumentos e gargalos além do tamanho. Use a rotina experimental documentada no README e relate hardware, runtime e dispersão dos tempos. Não extrapole três instâncias para uma prova empírica da complexidade assintótica.
