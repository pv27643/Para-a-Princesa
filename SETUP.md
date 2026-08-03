# Estado da ligação Supabase + Vercel

Já está tudo ligado — não precisas de repetir nenhum destes passos. Este
ficheiro fica só como referência para o que fazer a seguir.

## O que já está feito

- Projeto Supabase criado (`amo-te-maria`), schema aplicado (tabelas do
  quadro, pintainhos, reservar dia, fotos + bucket de storage).
- `supabase-config.js` já tem o URL e a chave pública (`anon key`) do
  projeto — o site já fala com a base de dados real.
- PINs de login definidos diretamente na base de dados (não estão
  guardados em lado nenhum do código, porque este repositório é
  público — ver nota de segurança abaixo).
- Site publicado no Vercel.

## Mudar os PINs

Os PINs da Maria e do Ivan não estão em nenhum ficheiro — foram
definidos diretamente na tabela `app_users` do Supabase. Para os mudar:

1. Painel do Supabase → **Table Editor** → tabela `app_users`.
2. Edita a coluna `pin` da linha `maria` ou `ivan` e guarda.

(Ou, no **SQL Editor**, corre por exemplo:
`update app_users set pin = 'novo-pin' where name = 'maria';`)

## Se precisares de recriar o schema do zero

O ficheiro [supabase/schema.sql](supabase/schema.sql) tem a estrutura
completa (tabelas, permissões, função de login). Os PINs lá dentro são
só placeholders (`CHANGE_ME_MARIA` / `CHANGE_ME_IVAN`) — substitui-os
antes de correr o ficheiro, ou define os PINs à parte como acima.

> **Nota de segurança:** este repositório é público no GitHub. O URL e
> a chave `anon` do Supabase em `supabase-config.js` são seguros de
> ficarem públicos por design (a proteção real das tabelas está nas
> regras RLS do `schema.sql`) — mas os PINs nunca devem ir parar a um
> ficheiro deste repositório.

## Confirmar o Storage (fotos)

Painel do Supabase → **Storage** → deve existir um bucket `photos`
marcado como **Public**. Já está criado; só é preciso verificar se
algum dia parecer que as fotos não carregam.

## Deploy contínuo

Sempre que fizeres `git push` para o `main`, o Vercel publica
automaticamente a versão nova (o token de deploy usado para a ligação
inicial pode ser revogado a qualquer momento em
https://vercel.com/account/tokens sem afetar isto).

## Problemas comuns

- **PIN sempre errado**: confirma o valor atual na tabela `app_users` (Table Editor).
- **Fotos não aparecem depois de enviadas**: confirma que o bucket `photos` existe e está público.
- **Nada sincroniza entre os dois telemóveis**: confirma que `supabase-config.js` tem o URL/chave certos e que o deploy no Vercel já apanhou essa versão.
