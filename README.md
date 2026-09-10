# Doca Livre — Mapa da Logística

Portal local para mapear transportadoras, operadores logísticos e fornecedores do setor.

## Como rodar

```bash
npm install
npm run dev
```

Abre em `http://localhost:5174`.

## Abas

- **Painel** — totais e gráficos do cadastro que está no mapa.
- **Mapa** — ícones por categoria, pesquisa (nome, função, categoria) e página da empresa.

## Pesquisa

- `empilhadeira` → empresas que vendem, alugam ou prestam serviço no equipamento.
- `peça empilhadeira` → só quem trabalha com peças.

## Publicação

1. Cole `supabase/schema.sql` no [SQL Editor](https://supabase.com/dashboard/project/zbjhaupxhriedfsgtlbj/sql/new) e rode.
2. `npm run db:apply` envia as ~500 empresas e os acessos Diego/Elder.
3. Repositório: `https://github.com/eldertenorio-max/Doca-Livre-Mapa-da-Log-stica.git`
4. No Render, abra o [Blueprint deste repositório](https://dashboard.render.com/blueprint/new?repo=https%3A%2F%2Fgithub.com%2Feldertenorio-max%2FDoca-Livre-Mapa-da-Log-stica) e aplique. O `render.yaml` já define build, start e as variáveis públicas do Supabase.

Endereço do site: `https://mapadalogistica.com.br` (o `doca-livre-mapa-da-log-stica.onrender.com` continua respondendo).

DNS no Registro.br: `A` em `@` para `216.24.57.1` e `CNAME` em `www` para `doca-livre-mapa-da-log-stica.onrender.com`, sem registro `AAAA`. O Render emite o certificado sozinho.

Login super: **Diego / diego123** e **Elder / Elder123**.
