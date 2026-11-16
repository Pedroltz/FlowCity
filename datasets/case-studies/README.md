# Estudos de resiliência de telecomunicações

O seletor da aplicação carrega as **26 topologias SNDlib presentes no diretório de benchmarks** da revisão fixada do repositório público [sands-lab/nika](https://github.com/sands-lab/nika/tree/d945c0484678f35a93483ca1ff0b8ebc999e9d03/src/nika/net_env/isp/sndlib). Isso descreve exatamente a coleção incluída no projeto; não afirma que ela seja uma versão oficial ou completa de todas as redes já publicadas pela SNDlib. A referência acadêmica da biblioteca está em [SNDlib 1.0](https://optimization-online.org/2007/08/1746/).

Cada JSON registra o nome e a revisão da origem, o SHA-256 do XML e a política de capacidade aplicada. Os XML originais permitem reconstruir o catálogo sem internet. Consulte as condições das fontes antes de redistribuir os dados fora do contexto acadêmico.

| Rede          | Vértices | Enlaces SNDlib | Topologia no aplicativo | Unidade exibida       |
| ------------- | -------: | -------------: | ----------------------- | --------------------- |
| Abilene       |       12 |             15 | Bidirecional            | Mbit/s                |
| Atlanta       |       15 |             22 | Bidirecional            | Unidades do benchmark |
| BRAIN         |      161 |            332 | Bidirecional            | bit/s                 |
| COST266       |       37 |             57 | Bidirecional            | Unidades do benchmark |
| DFN-BWIN      |       10 |             45 | Bidirecional            | Unidades do benchmark |
| DFN-GWIN      |       11 |             47 | Bidirecional            | Unidades do benchmark |
| DI-YUAN       |       11 |             42 | Bidirecional            | Unidades do benchmark |
| France        |       25 |             45 | Bidirecional            | Unidades do benchmark |
| GEANT         |       22 |             36 | Bidirecional            | Mbit/s                |
| Germany50     |       50 |             88 | Bidirecional            | Unidades do benchmark |
| GIUL39        |       39 |            172 | Direcionada             | Unidades do benchmark |
| India35       |       35 |             80 | Bidirecional            | Unidades do benchmark |
| JANOS-US      |       26 |             84 | Direcionada             | Unidades do benchmark |
| JANOS-US-CA   |       39 |            122 | Direcionada             | Unidades do benchmark |
| New York      |       16 |             49 | Bidirecional            | Unidades do benchmark |
| Nobel-EU      |       28 |             41 | Bidirecional            | Unidades do benchmark |
| Nobel-Germany |       17 |             26 | Bidirecional            | Unidades do benchmark |
| Nobel-US      |       14 |             21 | Bidirecional            | Unidades do benchmark |
| Norway        |       27 |             51 | Bidirecional            | Unidades do benchmark |
| PDH           |       11 |             34 | Bidirecional            | Unidades do benchmark |
| Pioro40       |       40 |             89 | Bidirecional            | Unidades do benchmark |
| Polska        |       12 |             18 | Bidirecional            | Unidades do benchmark |
| SUN           |       27 |            102 | Direcionada             | Unidades do benchmark |
| TA1           |       24 |             55 | Bidirecional            | Unidades do benchmark |
| TA2           |       65 |            108 | Bidirecional            | Unidades do benchmark |
| ZIB54         |       54 |             81 | Direcionada             | Unidades do benchmark |

## Modelo e capacidades

O problema é determinar o fluxo máximo entre um par de vértices antes e durante a indisponibilidade de enlaces. O aplicativo não usa as matrizes de demanda da SNDlib como capacidades e não estima tráfego concorrente, roteamento, latência, disponibilidade ou condição atual de uma operadora.

Abilene e Atlanta usam a capacidade pré-instalada do XML; enlaces sem capacidade pré-instalada em Atlanta ficam com zero. Nas outras redes, cada enlace recebe um módulo positivo de menor capacidade disponível no arquivo. Isso forma uma **configuração hipotética de projeto**, não uma medição nem uma afirmação de que esse módulo esteja instalado. As unidades explícitas do XML são mostradas quando disponíveis; quando não há unidade, os valores permanecem como unidades do benchmark, sem conversão presumida.

As redes GIUL39, JANOS-US, JANOS-US-CA, SUN e ZIB54 são direcionadas: cada enlace XML continua sendo uma aresta no sentido indicado. Nas demais redes, cada enlace XML é tratado como conexão bidirecional e convertido em duas arestas direcionadas de mesma capacidade. A manutenção desativa o enlace no sentido indicado; portanto, em uma rede bidirecional, desativa as duas arestas, enquanto em uma rede direcionada desativa somente aquela aresta.

Para o par escolhido, Ford–Fulkerson com busca em largura (BFS) compara a rede original com a rede em manutenção. A rede residual final permite extrair o corte mínimo. Uma manutenção pode não reduzir o fluxo máximo se houver rotas alternativas. Fluxo original zero torna o percentual de perda indefinido; a seleção manual de falhas mede o impacto no par escolhido, não uma criticidade universal do enlace.

## Arquivos e reprodução

- `*.json`: catálogo usado pela API e pela interface.
- `originals/*.xml`: arquivos de origem da revisão fixada, incluindo demandas e demais metadados SNDlib que não são usados no cálculo.
- `python scripts/import-sndlib.py`: reconstrói os JSON localmente.
- `python scripts/import-sndlib.py --verify`: confere os checksums e o conteúdo gerado sem gravar arquivos.
- `python scripts/import-sndlib.py --download`: busca a revisão fixada e confere o checksum após a importação inicial.

As coordenadas são normalizadas para exibição e não são interpretadas como distâncias, custos ou capacidades.
