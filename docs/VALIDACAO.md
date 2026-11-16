# Validação da implementação

## Versão de 16/11/2026 — resiliência de telecomunicações

- **45 testes xUnit aprovados** cobrem o catálogo de 26 topologias, a preservação dos sentidos direcionados, contratos HTTP, validação de extremos e IDs, falhas físicas, desconexão, ausência de mutação e igualdade entre fluxo e corte mínimo. A perda percentual com baseline zero é verificada com um algoritmo substituto de teste, sem atribuir esse resultado a um benchmark real.
- ESLint sem erros/avisos, compilação Angular de produção e checagens Prettier/dotnet format executadas.
- Conversor offline: `python scripts/import-sndlib.py --verify`, com contagens e checksums dos 26 XML.
- Fluxo de resiliência em Chromium: carregamento e seleção do catálogo completo, cálculo, falhas respeitando a direção de cada rede, cortes, caminhos destacados, residual, navegação com estado preservado, cópia editável sem mutação do catálogo, erro e recuperação, e telas de 390/768 px sem transbordamento. Evidência: `artifacts/resilience-validation.json`.
- Regressão das redes editáveis: `npm run test:e2e` em frontend. Evidência: `artifacts/interface-validation.json` quando executado com redirecionamento da saída.

Os testes de navegador utilizam uma API e banco SQLite temporários, separados do banco do usuário. Os scripts aceitam `FLOWCITY_URL`; a porta padrão da aplicação local é 4200 e o proxy aponta para a API na porta 5000. As capturas ficam em `artifacts/`. Os testes não comprovam desempenho multiusuário nem substituem o ensaio humano da apresentação. Docker não foi executado nesta revisão.

### Editor por tarefas

O roteiro `npm run test:editor` cria pontos com identificadores automáticos, rejeita capacidade fracionária, cria ida e volta, salva e abre a análise da própria rede sem reaproveitar um benchmark anterior. Confere edição pelo mapa, preservação da capacidade do sentido contrário, fluxo 100 → 60 após edição, busca, foco de edição em celular, temas claro/escuro e exclusão de um ponto com suas conexões. Evidência: `artifacts/editor-validation.json`. O teste utiliza uma rede temporária e a exclui ao terminar.

### Experimento reproduzido com os benchmarks

Resultados completos: [case-study-results.json](case-study-results.json). Fonte, período histórico e políticas de capacidade: [datasets](../datasets/case-studies/README.md).

| Estudo  | Par             | Falha física  | Original | Remanescente |  Perda |
| ------- | --------------- | ------------- | -------: | -----------: | -----: |
| Abilene | ATLAM5 → WASHng | ATLAM5_ATLAng |     9920 |            0 |   100% |
| Atlanta | N1 → N15        | L15           |     4000 |         1000 |    75% |
| TA2     | N1 → N65        | L1_N1_N31     |  1512000 |      1008000 | 33,33% |

Foram avaliados o cenário original e cada falha física individual (15, 22 e 108 possibilidades). Retém-se a maior perda absoluta, com desempate pela ordem do arquivo. Esse é um experimento offline; a interface continua permitindo seleção manual. Os cortes originais e dos cenários coincidem com os respectivos fluxos. TA2 utiliza um menor módulo positivo por enlace, configuração hipotética de projeto. As unidades não são convertidas, e os valores não representam velocidade medida ou disponibilidade atual.

Para reproduzir, com a API ativa: `node scripts/experiment-resilience.mjs`. A saída padrão fica em `artifacts/resilience-experiment.json`. Pode-se definir `FLOWCITY_API_URL` e `FLOWCITY_RESILIENCE_OUTPUT`.

## Registro histórico de 08/09/2026 — exemplos urbanos

Os valores abaixo pertencem à versão e ao equipamento indicados; não são medições das redes SNDlib nem da máquina atual.

Execução local em 08/09/2026: Windows 10 (10.0.19045), Intel Core i5-7500T 2,70 GHz, 4 processadores lógicos; SDK .NET 10.0.401, runtime .NET 10.0.12, Node.js 24.19.0. Build do backend em Release.

## Testes

- **20 testes xUnit aprovados**, incluindo testes do algoritmo, integração HTTP/SQLite e experimento das três instâncias.
- Compilação de produção Angular concluída.
- Demonstração exercitada em Chromium headless, nas larguras de 1500 e 390 pixels, sem erro JavaScript e sem transbordamento horizontal no layout móvel.

O teste no navegador carregou a rede pequena (fluxo 23), selecionou a via D→T, alterou sua capacidade de 4 para 1 (fluxo 20), restaurou a capacidade após salvar (fluxo 23), expandiu o histórico e verificou arcos residuais reversos. Em seguida carregou as redes média e grande (fluxo 32 em ambas), exportou a grande com 100 vértices/401 arestas e importou um JSON mínimo de dois vértices (fluxo 9). A rede temporária de importação foi excluída ao final.

Esse registro descreve o roteiro antigo. O script atual usa cópias temporárias e preserva os datasets originais; as evidências atuais são registradas separadamente.

## Experimento

Resultados brutos em [experimento.csv](experimento.csv). Cinco aquecimentos e 30 medições por instância, sem I/O no intervalo cronometrado. Esta amostra foi coletada junto da suíte de testes, portanto houve concorrência com testes HTTP; os valores não são um benchmark de máquina ociosa.

| Instância |   V |   E | Fluxo | Caminhos | Mediana (ms) | Mínimo (ms) | Máximo (ms) |
| --------- | --: | --: | ----: | -------: | -----------: | ----------: | ----------: |
| Pequena   |   6 |  10 |    23 |        3 |     0,015150 |    0,014600 |    0,026800 |
| Média     |  20 |  68 |    32 |        8 |     0,101700 |    0,092900 |   17,809600 |
| Grande    | 100 | 401 |    32 |       13 |     0,321950 |    0,312500 |    7,954400 |

Os tempos medianos aumentaram com essas entradas, mas a dispersão mostra que uma única medição seria pouco representativa. As duas malhas têm a mesma capacidade de saída da origem: 15 + 12 + 5 = 32. Ambas atingem esse limite, apesar de a grande explorar mais aumentos. O tamanho da malha, por si só, não determina o fluxo máximo. Os caminhos registrados dependem da ordem de exploração de arestas de mesma distância; o valor ótimo é invariável.

Para uma nova análise de desempenho, execute somente `ExperimentTests` conforme o README e registre novamente ambiente e CSV. Não trate estes números como capacidades reais de tráfego nem como garantia de tempo.

## Limites da validação

Dockerfiles e Compose foram preparados, mas **não executados**, pois Docker não está instalado nesta máquina. O navegador testado foi Chromium; os demais não foram validados. A suíte não é um teste de carga multiusuário. Integrantes e matrículas permanecem para preenchimento pelo grupo.
