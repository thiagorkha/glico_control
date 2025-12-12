import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../src/App.jsx'; // O App.jsx está na pasta raiz ou deve ser ajustado o caminho

// Nota: Em um projeto real com react-scripts, o App.jsx estaria em src/App.jsx.
// Considerando que o App.jsx já foi gerado na raiz da estrutura do Canvas,
// estou ajustando o caminho de importação.
// Se você for usar este setup em uma máquina local, mova o App.jsx para a pasta 'src'
// e use 'import App from './App.jsx';'

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
