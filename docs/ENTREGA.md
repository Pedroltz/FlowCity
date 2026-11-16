# Preparação da entrega — LinkPlan

## Documentos

- Proposta resumida: `docs/PROPOSTA.md`. Submeter ao professor; não presumir aprovação.
- Relatório final: `output/pdf/LinkPlan-Relatorio-Tecnico.pdf`; fonte editável: `docs/RELATORIO.html`.
- Os seis integrantes estão identificados. Disciplina: Teoria dos Grafos. Professor: Patrcik Pedreira. Preencher instituição, curso, turma, matrículas e contribuições reais. Complementar a declaração de IA após revisão humana.
- Fontes, XML originais e hipóteses: `datasets/case-studies/README.md`.
- Resultados reproduzidos: `docs/case-study-results.json`; testes: `docs/VALIDACAO.md`.

## Preparação e execução

Na raiz, antes da apresentação:

```sh
dotnet restore backend/FlowCity.sln
dotnet test backend/FlowCity.sln -c Release
cd frontend
npm ci
npx playwright install chromium
npm run lint
npm run format:check
npm run build
```

Durante a demonstração, em dois terminais na raiz:

```sh
dotnet run --project backend/FlowCity.Api --urls http://localhost:5000
```

```sh
cd frontend
npm start
```

Acessar `http://localhost:4200`; Swagger: `http://localhost:5000/swagger`. O proxy local usa a porta 5000. No Docker, a porta externa 5080 continua sendo a configuração do Compose; não confundir os dois modos. Docker ainda exige validação no equipamento de apresentação.

As 26 topologias SNDlib são locais e não exigem conexão com a fonte durante a demonstração. O teste `npm run test:resilience`, em frontend, verifica a seleção do catálogo e o fluxo de análise. `npm run test:e2e` verifica as redes editáveis e os exemplos urbanos. Ambos criam cópias temporárias e as excluem ao terminar, sem modificar as redes originais. Não excluir o banco para preparar a apresentação; exportar redes próprias quando necessário.

O conversor opcional requer Python 3: `python scripts/import-sndlib.py --verify`. A geração do PDF usa o Chromium instalado pelo Playwright: `node scripts/build-report.mjs`.

## Roteiro de aproximadamente dez minutos

1. **0–2 min:** iniciar a aplicação; explicar que a pergunta é o impacto de falhas na capacidade entre dois pontos, com um único fluxo.
2. **2–4 min:** em Planejamento, escolher Abilene, ATLAM5 → WASHng; executar sem falhas e mostrar capacidade 9920. Explicar unidade e procedência.
3. **4–6 min:** desabilitar ATLAM5_ATLAng e comparar: capacidade zero. Mostrar enlace físico nas duas direções, residual e corte mínimo. Resultados preserva a comparação.
4. **6–8 min:** Atlanta, N1 → N15, falha L15: 4000 → 1000 (75% de perda). TA2, N1 → N65, falha L1_N1_N31: 1512000 → 1008000 (33,33%). Declarar que TA2 usa um menor módulo positivo por enlace, configuração hipotética.
5. **8–10 min:** mostrar cópia editável, limites do modelo, contribuições e uso de IA. Distinguir corte mínimo de arestas saturadas.

Distribuir as falas entre todos os integrantes. Ensaiar perguntas sobre BFS, cancelamento residual, conservação, corte mínimo, capacidades instaladas versus módulos disponíveis e diferença entre capacidade teórica e tráfego observado. Providenciar adaptadores, carregador e dependências já instaladas. Os testes automatizados não substituem esse ensaio humano.
