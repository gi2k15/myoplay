# 📺 MyoPlay

**MyoPlay** é um player de IPTV web moderno, elegante e de alto desempenho, desenvolvido com o ecossistema mais recente de **Vue 3**, **Vite** e **Vuetify 4**. Ele oferece uma experiência completa e integrada de entretenimento diretamente no seu navegador, combinando reprodução robusta de vídeo com uma interface de usuário premium, fluida e altamente responsiva.

---

## 🎨 Design Premium & Experiência Visual

O aplicativo foi projetado com excelência visual e estética refinada, apresentando:
- **Tema Escuro Otimizado (Dark Yellow)**: Uma paleta de cores sofisticada que combina pretos profundos (`#080808`) com detalhes em amarelo dourado (`#FFB300`), criando uma atmosfera cinematográfica premium.
- **Glassmorphism**: Efeitos translúcidos e de desfoque de fundo (`backdrop-filter: blur`) com bordas suaves que trazem profundidade e camadas tridimensionais à interface.
- **Micro-Animações Fluidas**: Transições suaves e elegantes ao navegar entre as telas, além de efeitos interativos de hover em botões, cartões de canais e itens de listas.
- **Tipografia Moderna**: Integração direta com Google Fonts (`Outfit`, `Inter` e `Roboto`) para máxima legibilidade e visual limpo.
- **Barras de Rolagem Customizadas**: Scrollbars personalizadas e estilizadas para combinar perfeitamente com a identidade visual preta e dourada do app.

---

## ✨ Funcionalidades Principais

### 📺 Engine de Vídeo Híbrida Inteligente
- **Suporte a HLS (.m3u8)**: Integração com a biblioteca `hls.js` para garantir transmissões ao vivo com baixa latência e alta estabilidade.
- **Suporte a MPEG-TS (.ts)**: Integração com `mpegts.js` para processar fluxos de vídeo MPEG-TS em alta fidelidade.
- **Player Flutuante (Picture-in-Picture - PiP)**: Player flutuante persistente no canto inferior que permite continuar assistindo ao canal ativo enquanto você navega pelas categorias, edita listas, consulta a grade de EPG ou altera configurações.
- **Modos de Buffer & Estabilidade**: Três modos de buffering ajustáveis (Baixa Latência, Balanceado ou Alta Estabilidade) para se adaptar a streams instáveis ou conexões lentas.
- **Ajustes de Proporção de Tela (Aspect Ratio)**: Opções para Ajustar à Tela (Fit), Esticar (Stretch), 16:9 widescreen e 4:3 clássico.
- **Reprodução Automática**: Opção configurável para reproduzir os canais imediatamente após o clique.

### 🗂️ Gerenciador de Playlists Multi-Cliente
- **Integração com API Xtream Codes**: Suporte nativo para conexão com servidores Xtream Codes através de Host (URL), Usuário e Senha.
- **Importação de M3U / M3U8**: Suporta carregamento de arquivos locais (`.m3u` / `.m3u8` / `.txt`) arrastando e soltando (Drag & Drop), ou importação direta via URL remota.
- **Parser de Alta Performance**: Processador de listas otimizado com exibição visual da porcentagem e status de importação em tempo real.

### 📅 Guia de Programação EPG Integrado (XMLTV)
- Suporte completo para arquivos de guia eletrônico de programação (XMLTV) importados localmente ou por URL.
- Detecção automática de EPG embutida em listas M3U ou servidores Xtream.
- Painel **"🔴 NO AR AGORA"** que exibe o programa atual, horário de início/fim, descrição e uma barra de progresso em tempo real.
- Visualização do **"PRÓXIMO PROGRAMA"** com horário e detalhes de início.
- **Deslocamento de Fuso Horário (Time Shift)**: Ajuste fino do horário do guia de -12h a +12h diretamente nas configurações para sincronizar perfeitamente a programação com o seu relógio local.
- Aba de **Grade EPG** dedicada para visualizar a programação consolidada do canal.

### 🎬 Metadados de Filmes e Séries (VOD)
- Busca automática de capas em alta resolução, sinopses, diretores, notas, gêneros e ano de lançamento para enriquecer o catálogo de Filmes e Séries (VOD).
- Integração nativa com a API do **TMDB (The Movie Database)** em múltiplos idiomas (Português-BR, Português-PT, Inglês e Espanhol) e suporte opcional para **OMDb API**.
- Permite o uso de chave de API própria ou pública.

### 🗄️ Banco de Dados Local (IndexedDB)
- Persistência de dados 100% cliente-side utilizando um wrapper personalizado do banco de dados `IndexedDB` nativo do navegador.
- Gravação de canais e programas em lotes inteligentes (de 5.000 itens) para evitar travamentos ou congelamento da interface visual (UI) durante a sincronização.
- Limpeza automática de registros de programação EPG expirados há mais de 24 horas para economizar espaço de armazenamento.
- Salvamento local seguro de preferências do usuário (volume do player, autoplay, modo flutuante, proporção de tela, última playlist ativa, canais favoritos e histórico).

### 🔄 Proxy CORS Local Inteligente
- Servidor proxy local em Node.js (`scripts/cors-proxy.js`) para contornar restrições rígidas de CORS de provedores de IPTV.
- Execução concorrente com o servidor de desenvolvimento na porta `8088`.
- Suporte a múltiplos redirecionamentos HTTP (até 5 redirecionamentos) e transmissão otimizada para evitar alto consumo de memória RAM.
- Detecção de fechamento de conexão para encerrar requisições abortadas pelo cliente, poupando largura de banda.
- Presets configuráveis de Proxy para Dados e Proxy para Transmissões de Vídeo (HLS/TS).

### 🕒 Histórico e Canais Favoritos
- **Favoritos**: Adicione canais à sua lista de favoritos para acesso instantâneo.
- **Histórico**: Acesso rápido aos últimos 10 canais sintonizados exibidos no menu lateral, com opção de remoção individual.

---

## 🛠️ Stack Tecnológica

- **Framework**: [Vue 3](https://vuejs.org/) (Composition API usando `<script setup>` com TypeScript)
- **Ferramenta de Build & Bundler**: [Vite](https://vite.dev/)
- **Biblioteca de Interface (UI)**: [Vuetify 4](https://vuetifyjs.com/) (configurada com Material Design Icons e fontes Google Fonts)
- **Reprodutores de Vídeo**: [Hls.js](https://github.com/video-dev/hls.js/) e [Mpegts.js](https://github.com/xqq/mpegts.js/)
- **Estilização**: Native CSS & SASS (com gradientes personalizados e estilos de glassmorphism)
- **Gerenciador de Pacotes**: `pnpm`

---

## 📂 Estrutura do Projeto

```
├── public/                # Ativos estáticos públicos
├── scripts/
│   └── cors-proxy.js      # Servidor de Proxy CORS local em Node.js
├── src/
│   ├── assets/            # Imagens, mídias e estilos globais do app
│   ├── components/        # Componentes Vue 3
│   │   ├── PlaylistManager.vue # Assistente de M3U, URLs, Xtream API e EPG
│   │   ├── Sidebar.vue         # Menu lateral, histórico e favoritos
│   │   ├── StreamBrowser.vue   # Navegador de categorias (Canais, Filmes, Séries, Favoritos)
│   │   ├── TVGuide.vue         # Grade EPG consolidada de programação
│   │   ├── VideoPlayer.vue     # Reprodutor de vídeo HTML5 (HLS/TS) + mini-player PiP
│   │   └── Settings.vue        # Configurações de proxy, reprodução, EPG, metadados e manutenção do DB
│   ├── plugins/           # Configurações de plugins do app (Vuetify, Fontes)
│   ├── services/          # Serviços do aplicativo
│   │   ├── db.ts               # Banco IndexedDB local e persistência de dados
│   │   ├── epgParser.ts        # Analisador de guias XMLTV
│   │   ├── m3uParser.ts        # Analisador de arquivos e links M3U/M3U8
│   │   ├── playlistUpdater.ts  # Gerenciador de sincronização automática de listas
│   │   └── xtreamClient.ts     # Cliente HTTP para APIs Xtream Codes
│   ├── styles/            # Variáveis SASS, temas e estilos globais do app
│   ├── App.vue            # Layout raiz do aplicativo Vue
│   └── main.ts            # Ponto de entrada TypeScript do aplicativo
├── eslint.config.js       # Configuração do ESLint
├── vite.config.mts        # Configuração do Vite e plugins associados
└── package.json           # Scripts, dependências e configurações do projeto
```

---

## 🚀 Instalação e Execução Local

### Pré-requisitos
Certifique-se de ter o [Node.js](https://nodejs.org/) instalado e o gerenciador de pacotes **pnpm** configurado globalmente.

### 1. Clonar o projeto e instalar as dependências
```bash
pnpm install
```

### 2. Iniciar o servidor de desenvolvimento
Este comando inicia concorrentemente o servidor de desenvolvimento Vite e o servidor de Proxy CORS local na porta `8088`:
```bash
pnpm dev
```

### 3. Compilar para produção
Para compilar um pacote otimizado e com verificação completa de tipos de TypeScript:
```bash
pnpm build
```

### 4. Visualizar o build de produção localmente
```bash
pnpm preview
```

---

## ⚙️ Comandos Disponíveis

| Comando | Descrição |
|---|---|
| `pnpm dev` | Inicia o servidor Vite e o Proxy CORS local simultaneamente |
| `pnpm build` | Valida os tipos TypeScript e compila o app para a pasta estática `dist` |
| `pnpm preview` | Inicia um servidor web local para testar a compilação de produção da pasta `dist` |
| `pnpm build-only` | Compila o aplicativo ignorando a verificação de tipos do TypeScript |
| `pnpm type-check` | Executa o compilador do TypeScript (`vue-tsc --build`) para validar tipagens do código |
| `pnpm proxy` | Inicia apenas o servidor de Proxy CORS local na porta `8088` |

---

## 🌐 Configuração do Proxy CORS Local

O player utiliza o proxy local para contornar bloqueios de CORS (Cross-Origin Resource Sharing) impostos por determinados servidores de IPTV que não permitem requisições diretas de navegadores.

Por padrão, as chamadas com `pnpm dev` passam por:
`http://localhost:8088/?url=`

Você pode alterar o comportamento do proxy a qualquer momento na tela de **Configurações** do aplicativo, incluindo presets públicos (AllOrigins, Corsproxy.io, etc.), definir se quer usá-lo de forma automática (apenas quando falhar), sempre ou nunca.

---

## 🔒 Segurança & Privacidade

Todas as suas listas de reprodução, credenciais da API Xtream Codes (usuário e senha), histórico e lista de canais favoritos são salvos **100% localmente no banco de dados IndexedDB do seu navegador**. Nenhuma informação privada é enviada para servidores de terceiros ou banco de dados remotos externos. O aplicativo opera de forma descentralizada e segura.

---

## 📄 Licença

Este projeto está licenciado sob a **GNU General Public License v3.0** (GPL-3.0-or-later). Consulte o arquivo [LICENSE](file:///d:/GitHub/iptv-player-gemini2/LICENSE) para obter os termos e condições completos da licença.
