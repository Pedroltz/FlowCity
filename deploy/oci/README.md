# Publicar no Oracle Cloud Always Free

Esta configuração executa a API e o frontend em uma VM, preservando o SQLite
em um volume Docker nomeado. O frontend é o único serviço exposto à internet;
a API continua acessível pela rede interna do Compose.

## Criar a VM

1. Crie uma conta [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/).
   A Oracle pode solicitar um cartão para verificar a identidade. Os recursos
   Always Free não geram cobrança enquanto a conta não for atualizada para um
   plano pago.
2. Crie uma instância **VM.Standard.A1.Flex** com Ubuntu 24.04 Arm e marque a
   opção elegível ao Always Free. Use 1 OCPU e 6 GB de memória.
3. Atribua um endereço IPv4 público e adicione a chave pública SSH gerada para
   este projeto. O usuário padrão da imagem Ubuntu é `ubuntu`.
4. No Security List ou Network Security Group da VNIC, permita entrada TCP na
   porta 80. Mantenha SSH (porta 22) restrito ao seu endereço IP quando possível.
5. Em **Advanced options → Initialization script**, cole o conteúdo de
   [`cloud-init.yaml`](./cloud-init.yaml). Aguarde a inicialização da VM.

O Always Free tem limite de capacidade por região. Se a criação informar falta
de capacidade, tente outra Availability Domain da região principal ou aguarde.
Instâncias Always Free também podem ser recuperadas pela Oracle quando
consideradas ociosas por sete dias; isso pode interromper a publicação.

## Enviar e iniciar a versão local

Na máquina que contém o código atual, substitua `IP_PUBLICO` pelo IPv4 da VM:

```bash
tar --exclude=.git --exclude=node_modules --exclude=bin --exclude=obj \
  --exclude=dist --exclude=.angular --exclude=tmp --exclude=artifacts \
  --exclude=.env --exclude='.env.*' \
  -czf /tmp/linkplan-deploy.tar.gz -C /home/brunobomfimlima/Projetos/FlowCity .
scp -i ~/.ssh/linkplan-oci /tmp/linkplan-deploy.tar.gz ubuntu@IP_PUBLICO:/tmp/
ssh -i ~/.ssh/linkplan-oci ubuntu@IP_PUBLICO
```

Na VM:

```bash
mkdir -p ~/linkplan
tar -xzf /tmp/linkplan-deploy.tar.gz -C ~/linkplan
cd ~/linkplan
docker compose -f deploy/oci/compose.yaml up -d --build
```

Depois que o build terminar, abra `http://IP_PUBLICO`. Para acompanhar a
inicialização:

```bash
docker compose -f deploy/oci/compose.yaml logs -f
```

O volume `linkplan-data` mantém as redes salvas entre reinicializações e novos
deploys. Ele fica armazenado no disco da VM; excluir a VM também pode excluir
esse volume.
