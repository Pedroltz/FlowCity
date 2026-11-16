# Proposta — LinkPlan: resiliência de redes de telecomunicações

**Tema 7 — Fluxo em Grafos. Status: proposta preparada para submissão; aprovação do professor não foi presumida.**

Problema: avaliar a perda da capacidade de transporte entre dois pontos de uma rede quando enlaces físicos ficam indisponíveis. A análise apoia a identificação de vulnerabilidades e o planejamento de contingência; cada conclusão é específica do par e da configuração analisados.

Modelagem: vértices representam pontos da rede; enlaces físicos originam pares de arestas direcionadas com capacidades. Uma falha remove a capacidade de ambas as direções. Não há criação de tráfego nem acesso a equipamentos reais. O modelo considera um único fluxo fracionável, sem concorrência, latência ou restrições dos protocolos.

Algoritmo essencial: implementação própria de Ford-Fulkerson com BFS (Edmonds-Karp). Calcular cenário original e cenário com falhas; apresentar fluxos, caminhos aumentantes, residual e corte mínimo. Nenhuma biblioteca substitui o cálculo.

Dados: seletor com 26 topologias da coleção SNDlib em uma revisão pública fixada, acompanhadas do XML original e checksum. Abilene (12 nós/15 enlaces) e Atlanta (15/22) usam capacidade pré-instalada, com ausências em zero. Nas outras redes, a aplicação usa um módulo positivo de menor capacidade por enlace como configuração hipotética de projeto; não se afirma que esteja instalado na rede real. Unidades explícitas são preservadas e os dados sem unidade não recebem conversões presumidas. Três instâncias têm resultados detalhados reproduzíveis no relatório de validação.

Funcionalidades: catálogo imutável, seleção de origem/destino e falhas manuais, comparação de capacidades/perdas, identificação do corte mínimo, visualização dos caminhos/residual e cópias editáveis. Exemplos urbanos permanecem como apoio didático secundário.

Validação: pelo menos três dimensões de rede, resultados verificáveis por corte mínimo, casos sem caminho, extremos inválidos, falhas em topologias direcionadas e bidirecionais, repetição sem mutação do original, testes HTTP e demonstração ao vivo em aproximadamente dez minutos.

Fontes e hipóteses detalhadas: `datasets/case-studies/README.md`. Integrantes: Bruno Bomfim Lima, Pedro Luiz Tunin, Raphael Camurri Michelassi, Bruno Martins, Lucas Galli, Christian Decloedt. Matrículas e contribuições devem ser preenchidas pelo grupo com informações reais.
