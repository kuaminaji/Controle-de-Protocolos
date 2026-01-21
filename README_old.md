# Sistema de Protocolos

## Pré-requisitos
- [Node.js](https://nodejs.org/) >= 18.x
- [MongoDB](https://www.mongodb.com/try/download/community) (local ou Atlas)
- WhatsApp Web ativo no navegador (para integração com WPPConnect)
- Git

## Instalação Backend

1. Clone o projeto e entre na pasta `backend`:
   ```bash
   git clone https://github.com/.......
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure as variáveis de ambiente:
   - Copie `.env.example` para `.env` e preencha os dados do seu MongoDB.

4. Inicie o servidor:
   ```bash
   npm start
   ```
   - O backend sobe em `http://localhost:5000`.

## Instalação Frontend

1. Em outra aba do terminal, vá para a pasta `frontend`:
   ```bash
   cd ../frontend
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o frontend:
   ```bash
   npm start
   ```
   - O painel sobe em `http://localhost:3000`.


---
