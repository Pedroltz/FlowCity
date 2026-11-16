# FlowCity

Aplicação acadêmica de Teoria dos Grafos para calcular a quantidade máxima de veículos por minuto entre dois pontos de uma rede urbana. O núcleo é uma implementação explícita de **Ford-Fulkerson com busca em largura (Edmonds-Karp)** em C#, acompanhada de histórico completo e visualização da rede residual.

## Tecnologias e organização

- Backend: .NET 10, ASP.NET Core Web API, C#, Entity Framework Core e SQLite; Swagger/OpenAPI em `/swagger`.
- Mapster 7.4.0 para conversão dos contratos da API, projeção dos resumos e atualização de campos. Configuração em `backend/FlowCity.Api/Mappings/GraphMappingConfig.cs`; coleções rastreadas pelo EF são sincronizadas por ID para preservar suas identidades.
- Fluxo da API: `GraphsController` → `IGraphService` / `GraphService` → `IGraphRepository` / `GraphRepository` → SQLite. O controller trata contratos HTTP; o service valida e coordena as operações; o repository concentra consultas EF e persistência. Os mapeamentos de domínio estão em `FlowCity.Application/Mappings/GraphMappingRegister.cs` e os contratos HTTP permanecem na API.
- Injeção de dependência centralizada em `FlowCity.Api/Configuration/DependencyInjectionConfig.cs`, ativada por `AddFlowCity`. Services, repositories, validator, `IMaxFlowAlgorithm`, `IMapper` e inicializador do banco usam escopo por requisição; os perfis e a configuração compilada do Mapster são compartilhados como singletons. A carga inicial recebe suas dependências pelo construtor e é executada em um escopo na inicialização.
- FluentValidation 12.1.1 para regras do grafo em `GraphValidator : AbstractValidator<Graph>`, compartilhadas pela API, carga inicial e algoritmo através de `IValidator<Graph>`. Falhas de validação retornam HTTP 400.
- Frontend: Angular 21, TypeScript, Angular Material e Cytoscape.js.
- Testes: xUnit, com testes numéricos, invariantes e integração HTTP usando SQLite temporário.

```text
backend/
  FlowCity.Domain/          Entidades e resultados do algoritmo
  FlowCity.Application/     Validação e Ford-Fulkerson com BFS
  FlowCity.Infrastructure/  Mapeamento e persistência EF Core/SQLite
  FlowCity.Api/             Controllers, DTOs, DI, OpenAPI e carga inicial
  FlowCity.Tests/           Testes unitários, integração e experimento
frontend/src/app/          Rotas, estado compartilhado, serviço HTTP e páginas Angular
datasets/                  Três redes JSON e documentação
scripts/                   Gerador reproduzível dos datasets
```

Não há bibliotecas de cálculo de grafos, CQRS, MediatR ou serviços intermediários que apenas encaminham chamadas. Cytoscape é usado exclusivamente para visualização e interação.

## Executar com Docker

Pré-requisito: Docker com Compose.

```sh
docker compose up --build
```

Abra **http://localhost:4200**. API e Swagger: **http://localhost:5080/swagger**. O frontend encaminha `/api` ao backend por Nginx, sem configuração de CORS. O volume `flowcity-data` preserva as redes entre reinicializações. `docker compose down` para os serviços sem excluir os dados. Aguarde a inicialização da API antes de abrir a aplicação.

## Executar localmente

Pré-requisitos: SDK .NET 10, Node.js 24 e npm. Angular 21 é compatível com Node 24 e TypeScript 5.9, conforme a [tabela oficial](https://angular.dev/reference/versions). A configuração da API segue as APIs documentadas de [ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/tutorials/first-web-api?view=aspnetcore-10.0).

Na raiz, em um terminal:

```sh
dotnet restore backend/FlowCity.sln
dotnet run --project backend/FlowCity.Api --urls http://localhost:5000
```

Em outro terminal:

```sh
cd frontend
npm ci
npm start
```

Abra **http://localhost:4200**. O proxy de desenvolvimento envia `/api` e `/swagger` para a porta 5000. Para validar a compilação de produção: `npm run build` na pasta `frontend`.

Neste workspace, se o SDK não estiver no PATH, foi disponibilizada uma instalação local em `.tools/dotnet`. Em PowerShell, substitua `dotnet` por `& ./.tools/dotnet/dotnet.exe` a partir da raiz. Essa pasta não faz parte do projeto versionado.

## Banco de dados

O SQLite é criado automaticamente no primeiro início com `EnsureCreatedAsync`; nenhuma ferramenta externa nem comando de migração é necessário. Por padrão, o arquivo `flowcity.db` é relativo ao diretório de execução da API. Para escolher uma localização, defina `ConnectionStrings__FlowCity`, por exemplo `Data Source=C:/dados/flowcity.db` (o diretório deve existir). No Docker, o arquivo fica em `/data/flowcity.db`.

As três redes são inseridas **somente quando o banco é criado**. Excluir todas as redes não as recria automaticamente. Para recuperá-las, importe os JSON pela interface. O banco usa tabelas relacionadas para redes, vértices e arestas, com chaves compostas por rede e ID. Exclusões de redes removem suas entidades dependentes. Uma edição é persistida em uma única operação transacional do EF Core.

Não há migrações de esquema nesta versão de demonstração. Ao alterar o modelo de persistência, exporte suas redes e use um novo arquivo SQLite, ou implemente uma migração antes de reutilizar o banco antigo.

## Interface e navegação

O frontend possui cinco páginas carregadas sob demanda pelo Angular Router:

- `/dashboard`: totais reais das redes salvas, redes disponíveis e ações rápidas.
- `/redes`: busca, seleção, criação, exclusão e importação/exportação JSON. A exportação e a exclusão usam a rede atual indicada na página.
- `/editor`: canvas Cytoscape, metadados, vértices, arestas e capacidades. Uma lista permite selecionar elementos também pelo teclado.
- `/simulacoes`: origem/destino, execução, caminhos aumentantes destacados e visualizações original, fluxo e residual.
- `/resultados`: fluxo máximo, tempo, iterações, gargalos dos caminhos e utilização de cada aresta.

O `GraphApi` concentra os contratos HTTP existentes. O `WorkspaceState` mantém a rede em edição, a seleção e o resultado ao navegar entre páginas. O canvas é recriado a partir desse estado. Recarregar a aplicação não restaura resultados da sessão. Não há datas nem histórico persistente nos contratos atuais; por isso a interface não inventa redes recentes ou métricas históricas. Arestas saturadas são identificadas separadamente de um corte mínimo.

Inter é servida localmente por `@fontsource/inter`. Os ícones Lucide são importados individualmente de `@lucide/angular`. O layout inclui menu móvel, foco visível, link para pular ao conteúdo, mensagens de estado e suporte a movimento reduzido.

## Roteiro da demonstração

1. Em **Minhas redes**, abra **Centro · 6 cruzamentos** no editor.
2. Selecione uma via, altere a capacidade em **Propriedades da seleção** e clique em **Aplicar alteração**.
3. Escolha origem **S** e destino **T**, depois **Calcular fluxo máximo**. A aplicação salva alterações antes do cálculo.
4. Em **Simulações**, observe as arestas violetas e os rótulos `fluxo / capacidade`; selecione um caminho para destacá-lo em laranja. Em **Resultados**, examine o fluxo máximo e a utilização por aresta.
5. Expanda as iterações em **Caminhos aumentantes** para examinar resíduos, gargalo e fluxo adicionado.
6. Alterne para **Rede residual**. As arestas tracejadas representam possibilidades de cancelar fluxo. Resíduos zero ficam ocultos no desenho, mas estão na resposta da API.
7. Abra **Bairros** ou **Malha urbana** e execute novamente com os extremos pré-selecionados.
8. Para criar sua própria rede, use **Nova rede**, adicione vértices e vias, mova os vértices e salve. Use JSON para compartilhar ou restaurar uma rede.

Alterar capacidades, estrutura ou extremos invalida o resultado anterior. Arrastar vértices altera apenas o posicionamento. Trocar de rede avisa sobre alterações não salvas. Importar JSON cria e salva uma nova rede e aceita o formato mínimo mostrado em `datasets/README.md`.

## Modelagem e algoritmo

Vértices são cruzamentos ou regiões. Arestas direcionadas representam vias, com capacidade inteira não negativa em veículos/minuto. O fluxo é conservado em todos os vértices intermediários. Vias paralelas e em sentidos opostos são independentes e possuem IDs próprios. Laços são aceitos, mas não ajudam a transportar fluxo entre extremos diferentes.

`FordFulkerson.Calculate` começa com fluxo zero em cada execução, independentemente de valores importados. Para cada via cria dois objetos residuais emparelhados: direto, com capacidade original, e reverso, inicialmente zero. A BFS encontra o caminho aumentante com menor número de arestas; o gargalo é o menor resíduo desse caminho. Subtrair o gargalo dos arcos percorridos e adicioná-lo aos pares permite também desfazer atribuições anteriores. A busca termina quando o destino deixa de ser alcançável.

O resultado inclui valor total, fluxo e capacidade original de cada via, resíduo direto, todos os arcos residuais diretos/reversos, cada caminho com resíduos **anteriores** ao aumento, gargalo, fluxo adicionado, número de iterações e tempo. Uma reversa nunca é confundida com uma via original no sentido contrário. O grafo de entrada não é modificado; resultados são transitórios e o fluxo persistido permanece zero.

Edmonds-Karp tem complexidade temporal **O(V E²)** e estrutura de trabalho **O(V + E)**. O histórico solicitado acrescenta memória proporcional à soma dos comprimentos dos caminhos encontrados, podendo chegar a **O(V² E)**. Capacidades individuais usam `int`; fluxos e totais usam `long` para evitar estouro na soma. O tempo medido inclui construção da rede residual, BFS, atualizações e construção do resultado; exclui validação, banco, HTTP e desenho.

## API

| Método | Endpoint                    | Função                                   |
| ------ | --------------------------- | ---------------------------------------- |
| GET    | `/api/graphs`               | Resumos das redes                        |
| GET    | `/api/graphs/{id}`          | Rede completa                            |
| POST   | `/api/graphs`               | Criar/importar rede                      |
| PUT    | `/api/graphs/{id}`          | Atualizar rede completa                  |
| DELETE | `/api/graphs/{id}`          | Excluir rede                             |
| POST   | `/api/graphs/{id}/max-flow` | Calcular com `{"source":"S","sink":"T"}` |

POST e PUT recebem `name`, `description` opcional, `nodes` e `edges`. Consulte os esquemas no Swagger. Dados inválidos retornam HTTP 400; redes inexistentes, 404; criação, 201; exclusão, 204. Origem igual ao destino é rejeitada. Sem caminho positivo, o resultado válido é zero com zero iterações.

## Testes e análise experimental

```sh
dotnet test backend/FlowCity.sln -c Release
```

Testes numéricos cobrem grafo simples, fluxo conhecido 23, múltiplos caminhos, gargalo, ausência de caminho, capacidade zero, desconexão, ciclos, isolamento, laços, vias paralelas/antiparalelas, cancelamento residual e soma acima de `int.MaxValue`. Verificam limites de capacidade, conservação, resíduos reversos, ausência de mutação e igualdade entre fluxo e capacidade do corte mínimo extraído do residual. Testes HTTP verificam criação, edição, leitura persistida em novo contexto, remoção, importação mínima, validação, datasets e OpenAPI.

Para reproduzir o teste de demonstração no Chromium, com backend e frontend já em execução e os datasets originais disponíveis, execute na pasta `frontend`:

```sh
npx playwright install chromium
npm run test:e2e
```

O teste usa cópias temporárias das redes e as exclui ao terminar, preservando os datasets originais. Verifica edição repetida, navegação com estado compartilhado, cálculo, caminhos, rede residual, importação/exportação, busca, recuperação de erro e as cinco páginas em tela móvel. Grava capturas em `artifacts/`. A URL padrão é `http://localhost:4200`; pode ser substituída pela variável `FLOWCITY_URL`. Veja o [registro de validação e resultados experimentais](docs/VALIDACAO.md).

Para gerar o CSV experimental, em PowerShell na raiz:

```powershell
$env:FLOWCITY_EXPERIMENT_OUTPUT = "$PWD/artifacts/experimento.csv"
dotnet test backend/FlowCity.Tests -c Release --filter FullyQualifiedName~ExperimentTests --logger "console;verbosity=detailed"
```

Em Linux/macOS:

```sh
FLOWCITY_EXPERIMENT_OUTPUT="$PWD/artifacts/experimento.csv" dotnet test backend/FlowCity.Tests -c Release --filter FullyQualifiedName~ExperimentTests --logger 'console;verbosity=detailed'
```

A rotina usa cinco aquecimentos e 30 execuções por instância. Registra vértices, arestas, fluxo máximo, caminhos aumentantes e tempo mediano/mínimo/máximo em milissegundos. Os arquivos são processados em ordem e o tempo exclui leitura do JSON. Reporte CPU, sistema operacional e versão do .NET junto aos valores. Resultados de desempenho variam com JIT, coleta de lixo, carga e hardware; três entradas não demonstram experimentalmente o limite assintótico. A [documentação dos datasets](datasets/README.md) explica origem, fórmulas e limitações.

## Integrantes

Preencher antes da entrega acadêmica, sem atribuições fictícias:

| Nome                   | Matrícula   | Contribuição |
| ---------------------- | ----------- | ------------ |
| A preencher pelo grupo | A preencher | A preencher  |

## Relatório técnico e uso de IA

O [relatório técnico em PDF](output/pdf/FlowCity-Relatorio-Tecnico.pdf) contém problema, modelagem, algoritmo, arquitetura, metodologia, resultados históricos, limitações, roteiro de demonstração, referências e declaração de uso do **Codex, da OpenAI**. O [original editável em HTML](docs/RELATORIO.html) permite preencher identificação e contribuições individuais antes de regenerar o PDF.

O Codex auxiliou nesta revisão na inspeção dos arquivos, comparação com os requisitos, tentativa de execução e elaboração do relatório e da documentação. O grupo deve complementar o histórico de uso de IA, revisar os conteúdos e registrar sua validação efetiva. Não se atribuem contribuições ou revisões humanas sem confirmação.

Para regenerar o PDF após editar o HTML, com as dependências do frontend instaladas e Microsoft Edge disponível: `node scripts/build-report.mjs`. O script também produz prévias em `tmp/pdfs/`.

Consulte o [roteiro de entrega e apresentação](docs/ENTREGA.md). A revisão de 12/11/2026 não conseguiu iniciar a aplicação devido a falhas na instalação de dependências; os resultados em `docs/VALIDACAO.md` são registros anteriores e precisam ser reproduzidos pelo grupo.

## Limitações conhecidas

- Capacidades simuladas, sem previsão de trânsito, semáforos ou evolução temporal.
- Até 500 vértices e 5000 arestas por rede; histórico completo pode consumir memória em casos difíceis. Interface prioriza as instâncias de demonstração, sem prometer legibilidade de milhares de arestas simultâneas.
- Resultados não são armazenados no banco; exportação JSON guarda a rede e posições, não o histórico de uma execução.
- Edição colaborativa e controle de concorrência não estão previstos: a última gravação prevalece.
- Não há autenticação: ambiente destinado a demonstração local.
- A navegação interna preserva a rede em edição. Recarregar ou sair da aplicação pode descartar alterações não salvas; o navegador é avisado quando há alterações pendentes. Use **Salvar rede**.
- Docker precisa ser validado em um ambiente com Docker instalado; esta máquina não dispõe desse executável.
