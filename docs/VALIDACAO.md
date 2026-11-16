# Validação da implementação

Execução local em 08/09/2026: Windows 10 (10.0.19045), Intel Core i5-7500T 2,70 GHz, 4 processadores lógicos; SDK .NET 10.0.401, runtime .NET 10.0.12, Node.js 24.19.0. Build do backend em Release.

## Testes

- **20 testes xUnit aprovados**, incluindo testes do algoritmo, integração HTTP/SQLite e experimento das três instâncias.
- Compilação de produção Angular concluída.
- Demonstração exercitada em Chromium headless, nas larguras de 1500 e 390 pixels, sem erro JavaScript e sem transbordamento horizontal no layout móvel.

O teste no navegador carregou a rede pequena (fluxo 23), selecionou a via D→T, alterou sua capacidade de 4 para 1 (fluxo 20), restaurou a capacidade após salvar (fluxo 23), expandiu o histórico e verificou arcos residuais reversos. Em seguida carregou as redes média e grande (fluxo 32 em ambas), exportou a grande com 100 vértices/401 arestas e importou um JSON mínimo de dois vértices (fluxo 9). A rede temporária de importação foi excluída ao final.

O script `scripts/smoke.mjs` reproduz esse cenário com os servidores locais em execução. Ele altera temporariamente D→T no dataset pequeno, restaura a capacidade 4 e cria/exclui uma rede temporária. Utilize um banco de demonstração com os datasets originais. Capturas e exportação são gravadas em `artifacts/`.

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
