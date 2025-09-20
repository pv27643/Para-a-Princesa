# Love Day Counter ❤️

Pequeno site estático para contar os dias juntos e mostrar memórias especiais (fotos, vídeos e datas importantes) para a Marta.

## Estrutura
```
index.html        # Página principal otimizada (meta tags, acessibilidade, favicon)
main.html         # Versão original (agora alinhada e acessível)
style.css         # Estilos
script.js         # Lógica do contador, carrossel e vídeos
favicon.svg       # Ícone do site
assets/images/    # Imagens
assets/videos/    # Vídeos (considera comprimir .mov -> .mp4)
```

## Como correr localmente
Basta abrir `index.html` ou `main.html` no navegador (duplo clique).

## Publicar no GitHub Pages
1. Cria um repositório novo no GitHub (nome qualquer, por ex. `love-day-counter`).
2. Faz commit e push dos ficheiros (ver comandos abaixo).
3. No GitHub: Settings > Pages > Source: escolhe `main` branch e a pasta `/root`.
4. Guarda. O link ficará: `https://<o-teu-username>.github.io/<nome-do-repo>/`.

## Comandos Git (primeira vez)
```bash
git init
git add .
git commit -m "Primeiro commit: Love Day Counter"
git branch -M main
git remote add origin https://github.com/<o-teu-username>/<nome-do-repo>.git
git push -u origin main
```
No Windows `cmd.exe` os comandos são iguais.

## Melhorias incluídas
- Meta tags Open Graph e Twitter para partilha
- Favicon SVG
- Estrutura acessível (roles, aria-labels, timer)
- Pré-conexão Google Fonts
- `noscript` fallback
- `defer` no script para carregamento mais rápido

## Actualizações futuras
Depois de alterar algo:
```bash
git add .
git commit -m "Actualização"
git push
```

## Sugestões futuras
- Converter vídeos para formatos mais leves (`ffmpeg` -> H.264 720p)
- Adicionar animação de fade entre números do contador
- Adicionar PWA (manifest + service worker) se quiser modo offline
- Adicionar mais datas especiais dinamicamente via JSON

## Licença
Uso pessoal / presente romântico. Não destinado a redistribuição comercial.
