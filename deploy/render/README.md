# Publicação gratuita no Render

O serviço Render usa uma única instância web gratuita para servir o Angular
com Nginx e executar a API .NET. A API não fica exposta em uma porta separada;
o Nginx encaminha `/api` para ela dentro do container. O Dockerfile de deploy
agrupa os processos com Supervisor, sem alterar os projetos ou o Compose local.

## Criar a imagem

O Render usa a imagem privada no GitHub Container Registry, com a credencial
`linkplan-ghcr` configurada no workspace. A partir da raiz do repositório:

```bash
podman build -f deploy/render/Dockerfile \
  -t ghcr.io/SEU_USUARIO/linkplan:latest .
gh auth token | podman login ghcr.io -u SEU_USUARIO --password-stdin
podman push ghcr.io/SEU_USUARIO/linkplan:latest
```

Use uma conta GitHub autorizada a publicar pacotes no GHCR. O Render baixa a
imagem usando a credencial configurada no workspace.

## Criar o serviço

No Render, crie um **Web Service** usando a imagem Docker
`ghcr.io/SEU_USUARIO/linkplan:latest`, selecione a credencial `linkplan-ghcr`,
o plano **Free** e a região mais próxima. O container escuta a porta `PORT`
(por padrão `10000`).

O serviço atual está em <https://linkplan.onrender.com>. O endpoint
`/api/graphs` retorna os grafos iniciais.

## CI/CD

O workflow [`.github/workflows/ci-cd.yml`](../../.github/workflows/ci-cd.yml)
roda lint, formatação, build Angular e testes .NET em pull requests para
`master`. Um push aprovado em `master` publica uma imagem com tag do commit no
GHCR e atualiza o serviço Render.

O repositório GitHub precisa ter os secrets `GHCR_TOKEN` (com permissão de
publicação de pacotes) e `RENDER_API_KEY` (chave de acesso ao Render). Eles são
usados somente pelo job de deploy; pull requests executam apenas as validações.

## Limitação do plano gratuito

O Render Free suspende serviços sem tráfego por 15 minutos e o sistema de
arquivos local é efêmero. O banco SQLite pode ser recriado ao acordar ou após
um reinício; os três grafos iniciais voltam a ser carregados. Redes criadas,
importadas ou editadas depois disso podem ser perdidas. Exporte redes próprias
em JSON antes de deixá-las sem uso.
