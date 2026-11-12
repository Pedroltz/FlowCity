# Preparação da entrega

## Documentos

- Relatório: `output/pdf/FlowCity-Relatorio-Tecnico.pdf`.
- Fonte editável: `docs/RELATORIO.html`; regenerar com `node scripts/build-report.mjs` após as alterações.
- Preencher instituição, professor, turma, nomes, matrículas e contribuições reais no relatório e no README.
- Conferir e completar a declaração de uso do Codex, incluindo eventual assistência anterior no código, nos dados e nos testes. Não declarar revisão humana sem realizá-la.
- Conferir data, versões e procedência dos resultados em `VALIDACAO.md`; substituir por resultados reproduzidos e manter a evidência da execução.

## Execução e validação antes da apresentação

Na raiz FlowCity:

```powershell
dotnet restore backend/FlowCity.sln
dotnet test backend/FlowCity.sln -c Release
dotnet run --project backend/FlowCity.Api --urls http://localhost:5080
```

Em outro terminal:

```powershell
cd frontend
npm ci
npm run build
npm start
```

Com ambos os servidores ativos, conferir `http://localhost:4200` e `http://localhost:5080/swagger`. Opcionalmente reproduzir o roteiro automatizado, a partir de frontend:

```powershell
npx playwright install chromium
npm run test:e2e
```

O roteiro altera e restaura uma capacidade e cria/exclui uma rede temporária. Usar um banco de demonstração com os exemplos originais. Preservar redes próprias por exportação antes de preparar o ambiente; não excluir o banco para corrigir problemas sem avaliar seus dados.

Nesta revisão, em 12/11/2026, o NuGet foi bloqueado por permissões de rede e o npm falhou. A execução atual permanece pendente. Não apresentar os registros históricos como testes repetidos nesta sessão.

## Demonstração de aproximadamente 10 minutos

1. Iniciar os servidores ao vivo e explicar o problema e a modelagem (0-2 min).
2. Selecionar a rede pequena, origem S e destino T; calcular 23 e explicar caminho, gargalo e resíduo (2-5 min).
3. Alterar D→T de 4 para 1; calcular 20; restaurar a capacidade 4 e salvar (5-7 min).
4. Selecionar as redes média e grande e calcular 32. Criar uma rede A→B com capacidade zero e mostrar fluxo zero (7-9 min).
5. Explicar limitações, contribuições e uso de IA (9-10 min).

Distribuir as falas entre todos os integrantes. Ensaiar perguntas sobre BFS, arcos reversos, conservação, corte mínimo, complexidade e dados sintéticos. Instalar as dependências com antecedência e testar nova inicialização sem downloads. Conferir carregador, adaptadores, navegador e acesso aos arquivos no computador da apresentação.
