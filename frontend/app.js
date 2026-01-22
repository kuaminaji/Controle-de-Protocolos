/* ====================== [BLOCO 1: GESTÃO DE SESSÃO E LOADER] ====================== */

// Constants
const MESSAGE_STYLES = {
  erro: { bg: "#f8d7da", color: "#721c24", border: "1px solid #f5c6cb" },
  sucesso: { bg: "#d1edff", color: "#155724", border: "1px solid #b8daff" },
  info: { bg: "#fff3cd", color: "#856404", border: "1px solid #ffeaa7" }
};

const STATUS_BADGE_CONFIG = {
  "pendente": { class: "status-pendente", color: "#ffe58f" },
  "em andamento": { class: "status-andamento", color: "#a9d6f8" },
  "concluído": { class: "status-concluido", color: "#b2f2a7" },
  "exigência": { class: "status-exigencia", color: "#ffd6d6" },
  "excluido": { class: "status-excluido", color: "#bbb" }
};

const API_ENDPOINTS = {
  LOGIN: '/api/login',
  USUARIOS: '/api/usuarios',
  USUARIOS_NOMES: '/api/usuarios/nomes',  // Public endpoint for login page
  NOTIFICACOES: '/api/notificacoes',
  PROTOCOLO: {
    BASE: '/api/protocolo',
    STATS: '/api/protocolo/estatisticas',
    ATENCAO: '/api/protocolo/atencao',
    EXIGENCIAS: '/api/protocolo/exigencias-pendentes'
  },
  ADMIN: {
    VERIFICAR_ATRASOS: '/api/admin/verificar-atrasos',
    ZERAR_APP: '/api/admin/zerar-app',
    MIGRAR_DATAS: '/api/admin/migrar-datas'
  },
  BACKUP: {
    BACKUP: '/api/backup',
    FULL: '/api/backup/full',
    UPLOAD: '/api/backup/upload'
  },
  CATEGORIA: '/api/categoria',
  CATEGORIAS: '/api/categorias',
  FILTROS: '/api/filtros',
  USUARIO: '/api/usuario'
};

const TIMEOUTS = {
  MESSAGE_DISPLAY: 5000,
  NOTIFICATION_REFRESH: 120000,
  ANIMATION_DELAY: 40,
  CHART_RENDER_DELAY: 120
};

// DOM Cache
const DOM_CACHE = {};
function getEl(id) {
  if (!DOM_CACHE[id]) DOM_CACHE[id] = document.getElementById(id);
  return DOM_CACHE[id];
}

// ====================== JWT TOKEN MANAGEMENT ======================
function salvarSessao(usuario, tipo, accessToken, refreshToken, csrfToken) {
  // Store user info in sessionStorage
  sessionStorage.setItem("sessao", JSON.stringify({ usuario, tipo }));
  
  // For backward compatibility with simple auth (no JWT)
  // Only store tokens if they exist
  if (accessToken) localStorage.setItem("access_token", accessToken);
  if (refreshToken) localStorage.setItem("refresh_token", refreshToken);
  if (csrfToken) localStorage.setItem("csrf_token", csrfToken);
}

function getSessao() {
  try {
    const s = sessionStorage.getItem("sessao");
    return s ? JSON.parse(s) : null;
  } catch (e) {
    try { sessionStorage.removeItem("sessao"); } catch {}
    return null;
  }
}

function getAccessToken() {
  return localStorage.getItem("access_token");
}

function getRefreshToken() {
  return localStorage.getItem("refresh_token");
}

function getCsrfToken() {
  return localStorage.getItem("csrf_token");
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    // No refresh token available - this is expected when using session-based 
    // authentication instead of JWT tokens
    return null;
  }
  
  try {
    const response = await fetch('/api/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("csrf_token", data.csrf_token);
      return data.access_token;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
}

async function fetchWithAuth(url, options = {}) {
  // Check if user is logged in
  const sessao = getSessao();
  if (!sessao) {
    throw new Error('Not authenticated');
  }
  
  let token = getAccessToken();
  
  // Set default headers
  options.headers = options.headers || {};
  
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Add CSRF token for state-changing requests
  if (options.method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method.toUpperCase())) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      options.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  
  let response = await fetch(url, options);
  
  // If unauthorized and we have a refresh token, try to refresh
  if (response.status === 401 && token) {
    const newToken = await refreshAccessToken();
    
    if (newToken) {
      // Retry with new token
      options.headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, options);
    }
  }
  
  // If still unauthorized, user needs to login again
  // But don't logout automatically - just return the response
  // This allows simple session-based auth to work
  
  return response;
}

async function logout() {
  const token = getAccessToken();
  
  // Try to call logout endpoint if token exists (for JWT mode)
  // But don't fail if it doesn't work (for simple auth mode)
  if (token) {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      // Ignore errors - endpoint may not exist in simple auth mode
      console.debug("Logout endpoint not available:", error);
    }
  }
  
  // Clear all storage
  try { sessionStorage.removeItem("sessao"); } catch {}
  try { localStorage.removeItem("access_token"); } catch {}
  try { localStorage.removeItem("refresh_token"); } catch {}
  try { localStorage.removeItem("csrf_token"); } catch {}
  try { localStorage.setItem("logout-signal", String(Date.now())); } catch {}
  
  exibirLogin();
  
  // Clear topbar short user if present
  try { document.getElementById('usuario-logado-short').textContent = ""; } catch (e) {}
}

window.addEventListener("storage", function (e) {
  if (e.key === "logout-signal") {
    try { sessionStorage.removeItem("sessao"); } catch {}
    try { localStorage.removeItem("access_token"); } catch {}
    try { localStorage.removeItem("refresh_token"); } catch {}
    try { localStorage.removeItem("csrf_token"); } catch {}
    exibirLogin();
  }
});

function esc(v) {
  const s = v == null ? "" : String(v);
  const span = document.createElement("span");
  span.innerText = s;
  return span.innerHTML;
}

function escMultiline(v) {
  const normalized = brToNewline(v);
  return esc(normalized).replace(/\n/g, "<br>");
}

function brToNewline(str) {
  return (str || "").replace(/<br\s*\/?>/gi, '\n');
}

/* ====================== [BLOCO 2: SISTEMA DE NOTIFICAÇÕES] ====================== */
let notificacoes = [];

async function carregarNotificacoes() {
  try {
    const sessao = getSessao();
    if (!sessao) return;
    
    const resp = await fetchWithAuth(`${API_ENDPOINTS.NOTIFICACOES}?usuario=${encodeURIComponent(sessao.usuario)}`);
    if (resp.ok) {
      notificacoes = await resp.json();
      atualizarBadgeNotificacoes();
    }
  } catch (err) {
    console.error("Erro ao carregar notificações:", err);
  }
}

function atualizarBadgeNotificacoes() {
  const badge = document.getElementById('badge-notificacoes');
  const naoLidas = notificacoes.filter(n => !n.lida).length;
  
  if (badge) {
    if (naoLidas > 0) {
      badge.textContent = naoLidas;
      badge.style.display = 'inline';
    } else {
      badge.style.display = 'none';
    }
  }
}

function toggleNotificacoes() {
  const container = document.getElementById('notificacoes-container');
  const panel = document.getElementById('notificacoes-panel');
  
  if (container.style.display === 'none' || container.style.display === '') {
    container.style.display = 'block';
    renderizarNotificacoes();
  } else {
    container.style.display = 'none';
  }
}

function fecharNotificacoes() {
  document.getElementById('notificacoes-container').style.display = 'none';
}

function renderizarNotificacoes() {
  const lista = document.getElementById('notificacoes-lista');
  if (!lista) return;
  
  if (notificacoes.length === 0) {
    lista.innerHTML = '<div style="padding:20px;text-align:center;color:#666;">Nenhuma notificação</div>';
    return;
  }
  
  let html = '';
  notificacoes.forEach(notif => {
    const data = formatUtcToLocal(notif.data_criacao, { hour: '2-digit', minute: '2-digit' });
    const classeLida = notif.lida ? 'notificacao-lida' : 'notificacao-nao-lida';
    
    html += `
      <div class="notificacao-item ${classeLida}" style="padding:10px;border-bottom:1px solid #f0f0f0;cursor:pointer;" 
           onclick="marcarNotificacaoComoLida('${notif.id}')">
        <div style="font-weight:${notif.lida ? 'normal' : 'bold'};">${esc(notif.mensagem)}</div>
        <div style="font-size:0.8em;color:#666;margin-top:4px;">
          ${esc(notif.tipo)} • ${data}
        </div>
      </div>
    `;
  });
  
  lista.innerHTML = html;
}

async function marcarNotificacaoComoLida(id) {
  try {
    const resp = await fetchWithAuth(`/api/notificacao/${id}/ler`, { method: 'PUT' });
    if (resp.ok) {
      // Atualizar localmente
      const notifIndex = notificacoes.findIndex(n => n.id === id);
      if (notifIndex !== -1) {
        notificacoes[notifIndex].lida = true;
        atualizarBadgeNotificacoes();
        renderizarNotificacoes();
      }
    }
  } catch (err) {
    console.error("Erro ao marcar notificação como lida:", err);
  }
}

async function mostrarNotificacoesAtrasos() {
  try {
    mostrarLoader("Carregando protocolos em atraso...");
    
    // Fetch protocols grouped by sector
    const resp = await fetchWithAuth('/api/protocolo/atencao-por-setor');
    esconderLoader();
    
    if (!resp.ok) {
      mostrarMensagem("Erro ao carregar dados de atrasos", "erro");
      return;
    }
    
    const data = await resp.json();
    
    // Create beautiful modal
    const modalHtml = `
      <div id="modal-atrasos-overlay" style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: fadeIn 0.3s ease-out;
      ">
        <div id="modal-atrasos-content" style="
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 20px;
          max-width: 900px;
          width: 100%;
          max-height: 90vh;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.4s ease-out;
        ">
          <!-- Header -->
          <div style="
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            padding: 25px 30px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            display: flex;
            justify-content: space-between;
            align-items: center;
          ">
            <div>
              <h2 style="
                margin: 0;
                color: white;
                font-size: 28px;
                font-weight: 700;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
              ">
                ⚠️ Protocolos em Atraso
              </h2>
              <p style="
                margin: 5px 0 0 0;
                color: rgba(255, 255, 255, 0.9);
                font-size: 14px;
              ">
                Mais de 30 dias úteis em aberto
              </p>
            </div>
            <button onclick="fecharModalAtrasos()" style="
              background: rgba(255, 255, 255, 0.2);
              border: none;
              color: white;
              width: 40px;
              height: 40px;
              border-radius: 50%;
              font-size: 24px;
              cursor: pointer;
              transition: all 0.3s;
              display: flex;
              align-items: center;
              justify-content: center;
            " onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'">
              ×
            </button>
          </div>
          
          <!-- Total Badge -->
          <div style="
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            padding: 20px 30px;
            text-align: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          ">
            <div style="
              display: inline-block;
              background: rgba(255, 255, 255, 0.2);
              backdrop-filter: blur(5px);
              padding: 15px 40px;
              border-radius: 50px;
              box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            ">
              <div style="color: rgba(255, 255, 255, 0.9); font-size: 14px; font-weight: 600; margin-bottom: 5px;">
                TOTAL GERAL
              </div>
              <div style="color: white; font-size: 48px; font-weight: 900; line-height: 1;">
                ${data.total_geral}
              </div>
              <div style="color: rgba(255, 255, 255, 0.8); font-size: 12px; margin-top: 5px;">
                ${data.total_geral === 1 ? 'protocolo' : 'protocolos'}
              </div>
            </div>
          </div>
          
          <!-- Sectors List -->
          <div style="
            background: white;
            padding: 20px;
            max-height: 50vh;
            overflow-y: auto;
            border-radius: 0 0 20px 20px;
          ">
            ${data.setores.length === 0 ? `
              <div style="text-align: center; padding: 40px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 15px;">🎉</div>
                <div style="font-size: 18px; font-weight: 600;">Nenhum protocolo em atraso!</div>
                <div style="font-size: 14px; color: #999; margin-top: 8px;">Todos os protocolos estão em dia.</div>
              </div>
            ` : data.setores.map((setor, idx) => `
              <div style="
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                border-radius: 15px;
                padding: 20px;
                margin-bottom: 15px;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                transition: transform 0.3s, box-shadow 0.3s;
                animation: slideInRight 0.5s ease-out ${idx * 0.1}s backwards;
              " onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 8px 25px rgba(0, 0, 0, 0.15)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0, 0, 0, 0.1)'">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                  <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="
                      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      color: white;
                      width: 50px;
                      height: 50px;
                      border-radius: 12px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-size: 24px;
                      font-weight: 900;
                      box-shadow: 0 4px 10px rgba(102, 126, 234, 0.4);
                    ">
                      ${setor.total}
                    </div>
                    <div>
                      <div style="
                        font-size: 20px;
                        font-weight: 700;
                        color: #2d3748;
                        margin-bottom: 3px;
                      ">
                        ${esc(setor.setor)}
                      </div>
                      <div style="
                        font-size: 13px;
                        color: #718096;
                      ">
                        ${setor.total} ${setor.total === 1 ? 'protocolo em atraso' : 'protocolos em atraso'}
                      </div>
                    </div>
                  </div>
                  <button onclick="verDetalhesSetor('${esc(setor.setor)}')" style="
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
                  " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    Ver Detalhes →
                  </button>
                </div>
                
                <!-- Protocol preview -->
                ${setor.protocolos.slice(0, 3).map(p => `
                  <div style="
                    background: rgba(255, 255, 255, 0.7);
                    border-left: 4px solid #667eea;
                    padding: 10px 15px;
                    margin-top: 10px;
                    border-radius: 8px;
                    font-size: 13px;
                  ">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <div>
                        <strong style="color: #2d3748;">Protocolo ${esc(p.numero)}</strong>
                        <span style="color: #718096; margin-left: 10px;">${esc(p.nome_requerente)}</span>
                      </div>
                      <span style="
                        background: #fed7d7;
                        color: #c53030;
                        padding: 4px 12px;
                        border-radius: 12px;
                        font-size: 11px;
                        font-weight: 600;
                      ">
                        ${esc(p.data_criacao)}
                      </span>
                    </div>
                  </div>
                `).join('')}
                
                ${setor.protocolos.length > 3 ? `
                  <div style="
                    text-align: center;
                    margin-top: 10px;
                    color: #718096;
                    font-size: 12px;
                    font-style: italic;
                  ">
                    + ${setor.protocolos.length - 3} protocolos adicionais
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      
      <style>
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      </style>
    `;
    
    // Add modal to page
    const existingModal = document.getElementById('modal-atrasos-overlay');
    if (existingModal) {
      existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Mark all delay notifications as read
    await marcarNotificacoesAtrasosComoLidas();
    
  } catch (err) {
    esconderLoader();
    console.error("Erro ao mostrar notificações de atrasos:", err);
    mostrarMensagem("Erro ao carregar dados", "erro");
  }
}

function fecharModalAtrasos() {
  const modal = document.getElementById('modal-atrasos-overlay');
  if (modal) {
    modal.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => modal.remove(), 300);
  }
}

function verDetalhesSetor(setor) {
  // Navigate to the attention page filtered by this sector
  fecharModalAtrasos();
  // Use the existing navigation system
  navegar('atencao');
  // TODO: Filter by sector after navigation
}

async function marcarNotificacoesAtrasosComoLidas() {
  // Mark all unread "alerta_atrasos" notifications as read
  try {
    const notificacoesAtrasos = notificacoes.filter(n => !n.lida && n.tipo === 'alerta_atrasos');
    for (const notif of notificacoesAtrasos) {
      await fetchWithAuth(`/api/notificacao/${notif.id}/ler`, { method: 'PUT' });
      notif.lida = true;
    }
    atualizarBadgeNotificacoes();
  } catch (err) {
    console.error("Erro ao marcar notificações como lidas:", err);
  }
}

/* ====================== [BLOCO 3: FAVICON] ====================== */
function ensureFavicon(url = '/static/favicon.svg') {
  try {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.onerror = () => { link.href = '/static/logo.png'; };
    link.href = url;
  } catch {}
}

/* ====================== [BLOCO 4: FORMATAÇÃO DE DATAS - PADRÃO BRASIL] ====================== */
function formatUtcToLocal(utcStr, opts) {
  if (!utcStr) return "";
  try {
    let s = String(utcStr).trim();
    if (/\s*UTC$/i.test(s)) {
      s = s.replace(/\s*UTC$/i, 'Z');
    }
    if (!/T/.test(s) && /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/.test(s)) {
      s = s.replace(' ', 'T');
      if (!/Z$/.test(s)) s = s + 'Z';
    }
    const d = new Date(s);
    if (isNaN(d.getTime())) return utcStr;
    return d.toLocaleString('pt-BR', Object.assign({
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }, opts || {}));
  } catch (e) {
    return utcStr;
  }
}

function formatDateYMDToBR(dateStr) {
  if (!dateStr) return "";
  const s = String(dateStr).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return dateStr;
}

/* ====================== [BLOCO 5: LOADER E FEEDBACK] ====================== */
function mostrarLoader(msg) {
  const loader = getEl("loader");
  const loaderMsg = getEl("loader-msg");
  if (loaderMsg) loaderMsg.textContent = msg || "Carregando...";
  if (loader) loader.style.display = "";
}

function esconderLoader() {
  const loader = getEl("loader");
  if (loader) loader.style.display = "none";
}

function mostrarMensagem(mensagem, tipo = "info", tempo = TIMEOUTS.MESSAGE_DISPLAY) {
  const box = getEl("message-box");
  if (!box) return;
  
  const styles = MESSAGE_STYLES[tipo] || MESSAGE_STYLES.info;
  box.textContent = mensagem;
  box.style.display = "block";
  box.style.background = styles.bg;
  box.style.color = styles.color;
  box.style.border = styles.border;
  
  setTimeout(() => {
    box.style.display = "none";
  }, tempo);
}

/* ====================== [BLOCO 6: CPF - MÁSCARA E VALIDAÇÃO] ====================== */
function somenteDigitos(s) {
  return (s || "").replace(/\D+/g, "");
}

function formatCpf(cpf) {
  const d = somenteDigitos(cpf).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9,11)}`;
}

function isCpfValido(cpf) {
  cpf = somenteDigitos(cpf);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf[i], 10) * (10 - i);
  let d1 = (soma % 11) < 2 ? 0 : 11 - (soma % 11);
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf[i], 10) * (11 - i);
  let d2 = (soma % 11) < 2 ? 0 : 11 - (soma % 11);
  return cpf.slice(-2) === `${d1}${d2}`;
}

function setupCpfInput(inputEl, feedbackEl, submitBtn) {
  if (!inputEl) return;
  
  const onInput = () => {
    inputEl.value = formatCpf(inputEl.value);
    const d = somenteDigitos(inputEl.value);
    if (d.length === 11) {
      const ok = isCpfValido(d);
      if (feedbackEl) {
        feedbackEl.textContent = ok ? "CPF válido" : "CPF inválido";
        feedbackEl.className = ok ? "campo-feedback ok" : "campo-feedback erro";
      }
      if (submitBtn) submitBtn.disabled = !ok;
    } else {
      if (feedbackEl) {
        feedbackEl.textContent = "Informe 11 dígitos";
        feedbackEl.className = "campo-feedback hint";
      }
      if (submitBtn) submitBtn.disabled = true;
    }
  };
  
  const onBlur = () => {
    const d = somenteDigitos(inputEl.value);
    const ok = d.length === 11 && isCpfValido(d);
    if (feedbackEl) {
      feedbackEl.textContent = ok ? "CPF válido" : "CPF inválido";
      feedbackEl.className = ok ? "campo-feedback ok" : "campo-feedback erro";
    }
    if (submitBtn) submitBtn.disabled = !ok;
  };
  
  inputEl.addEventListener("input", onInput);
  inputEl.addEventListener("blur", onBlur);
  onInput();
}

function attachCpfMask(elOrId) {
  const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
  if (!el) return;
  el.addEventListener("input", () => el.value = formatCpf(el.value));
}

/* ====================== [BLOCO 7: VALIDAÇÃO GENÉRICA E FEEDBACK] ====================== */
function validarCamposObrigatorios(campos) {
  return campos.every(id => {
    const el = document.getElementById(id);
    return el && el.value.trim() !== "";
  });
}

function mostrarErroCampo(id, msg) {
  let el = document.getElementById(id + "-feedback");
  if (!el) {
    el = document.createElement("div");
    el.id = id + "-feedback";
    el.className = "campo-feedback erro";
    const campo = document.getElementById(id);
    if (campo && campo.parentNode) campo.parentNode.appendChild(el);
  }
  el.style.display = "block";
  el.textContent = msg;
}

function limparErrosCampos(campos) {
  campos.forEach(id => {
    const el = document.getElementById(id + "-feedback");
    if (el) el.style.display = "none";
  });
}

/* ====================== [BLOCO 8: CONSTANTES E HELPERS UI] ====================== */
const DEFAULT_CATEGORIA_OPTIONS = ["RGI", "RCPN", "RCPJ", "RTD", "PROTESTO", "NOTAS"];
let CATEGORIA_OPTIONS = [...DEFAULT_CATEGORIA_OPTIONS];
const STATUS_OPTIONS = ["Pendente", "Em andamento", "Concluído", "Exigência", "EXCLUIDO"];

async function fetchCategorias() {
  try {
    const resp = await fetch(API_ENDPOINTS.CATEGORIAS);
    if (!resp.ok) throw new Error("resp not ok");
    const data = await resp.json();
    const nomes = Array.from(new Set((data || []).map(c => c.nome).filter(Boolean)));
    if (nomes.length) {
      CATEGORIA_OPTIONS = nomes;
    } else {
      CATEGORIA_OPTIONS = [...DEFAULT_CATEGORIA_OPTIONS];
    }
  } catch (e) {
    CATEGORIA_OPTIONS = [...DEFAULT_CATEGORIA_OPTIONS];
  }
}

function renderMultiCheckboxOptions(options, namePrefix) {
  return options.map((o, i) => {
    const id = `${namePrefix}-${i}`;
    return `<label style="display:block;padding:4px 8px;"><input type="checkbox" data-value="${esc(o)}" id="${id}" /> ${esc(o)}</label>`;
  }).join("");
}

function getCheckedValues(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  return Array.from(container.querySelectorAll('input[type=checkbox]:checked')).map(ch => ch.getAttribute('data-value'));
}

function setCheckedValues(containerId, values = []) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const checks = Array.from(container.querySelectorAll('input[type=checkbox]'));
  checks.forEach(ch => {
    const v = ch.getAttribute('data-value');
    ch.checked = values.includes(v);
  });
}

function togglePanel(panelId, toggleBtnId) {
  const panel = document.getElementById(panelId);
  const btn = document.getElementById(toggleBtnId);
  if (!panel || !btn) return;
  
  if (panel.style.display === 'none' || panel.style.display === '') {
    panel.style.display = 'block';
    btn.querySelector('.chev').textContent = '▴';
  } else {
    panel.style.display = 'none';
    btn.querySelector('.chev').textContent = '▾';
  }
}

function closeAllPanels() {
  document.querySelectorAll('.multi-panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.toggle-btn .chev').forEach(c => c.textContent = '▾');
}

function updatePanelSummary(summaryId, panelId, defaultLabel) {
  const summary = document.getElementById(summaryId);
  const vals = getCheckedValues(panelId) || [];
  if (summary) summary.textContent = vals.length ? vals.join(', ') : defaultLabel;
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.multi-container')) {
    closeAllPanels();
  }
});

/* ====================== [BLOCO 9: RENDER STATUS BADGE] ====================== */
function renderStatusBadge(status) {
  const statusLower = (status || "").toLowerCase();
  const config = STATUS_BADGE_CONFIG[statusLower] || { class: "", color: "#eee" };
  const cls = `status-badge ${config.class}`;
  const icon = `<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="8" fill="${config.color}"/></svg>`;
  
  return `<span class="${cls}" style="display:inline-flex;align-items:center;gap:6px;">${icon}<span>${esc(status)}</span></span>`;
}

/* ====================== [BLOCO 10: LOGIN / EXIBIÇÃO DE LOGIN] ====================== */
function exibirLogin() {
  document.getElementById("menu-lateral").style.display = "none";
  document.getElementById("conteudo").style.display = "none";
  document.getElementById("notificacoes-container").style.display = "none";
  esconderLoader();
  
  // clear topbar short user if exists
  try { document.getElementById('usuario-logado-short').textContent = ""; } catch (e) {}

  let div = document.getElementById("login-container");
  div.style.display = "";
  div.innerHTML = `
    <div class="login-header" style="text-align: center; margin-bottom: 30px;">
      <img src="/static/logo.png" alt="Logo" style="display: block; margin: 0 auto 20px auto; max-width: 180px; height: auto; border-radius: 8px;"/>
      <h2 style="margin: 0; color: #2c3e50; font-size: 1.8em;">Gestão de Protocolos</h2>
    </div>
    <div id="login-loading" style="text-align: center; color: #666;">Carregando usuários...</div>
  `;

  // After initial insert, trigger animation (defensive)
  setTimeout(() => {
    try { window.__appEnh && window.__appEnh.animateLogin && window.__appEnh.animateLogin(); } catch (e) {}
  }, 40);
  
  fetch(API_ENDPOINTS.USUARIOS_NOMES)
    .then(resp => resp.json())
    .then(usuarios => {
      usuarios.sort((a, b) => a.localeCompare(b));
      let options = usuarios.map(u =>
        `<option value="${esc(u)}">${esc(u)}</option>`
      ).join('');
      
      div.innerHTML = `
        <div class="login-header" style="text-align: center; margin-bottom: 30px;">
          <img src="/static/logo.png" alt="Logo" style="display: block; margin: 0 auto 20px auto; max-width: 180px; height: auto; border-radius: 8px;"/>
          <h2 style="margin: 0; color: #2c3e50; font-size: 1.8em;">Gestão de Protocolos</h2>
        </div>
        <form id="form-login" autocomplete="off" style="max-width: 320px; margin: 0 auto;">
          <div class="campo" style="margin-bottom: 20px;">
            <label for="login-usuario" style="display: block; margin-bottom: 8px; font-weight: 500; color: #34495e;">Usuário</label>
            <select id="login-usuario" name="usuario" required autocomplete="username" 
                    style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; background: #f9f9f9;">
              <option value="" disabled selected>Selecione o usuário</option>
              ${options}
            </select>
          </div>
          <div class="campo" style="margin-bottom: 25px;">
            <label for="login-senha" style="display: block; margin-bottom: 8px; font-weight: 500; color: #34495e;">Senha</label>
            <input type="password" id="login-senha" name="senha" required autocomplete="current-password" 
                   style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; background: #f9f9f9;">
          </div>
          <button type="submit" id="btn-login" 
                  style="width: 100%; background: #2077b3; color: white; border: none; padding: 12px; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer; transition: background 0.2s;">
            Entrar
          </button>
        </form>
        <div id="login-erro" style="display: none; text-align: center; margin-top: 15px; padding: 10px; background: #f8d7da; color: #721c24; border-radius: 4px; border: 1px solid #f5c6cb;"></div>
      `;
      
      // After full form insert, trigger animation again
      setTimeout(() => {
        try { window.__appEnh && window.__appEnh.animateLogin && window.__appEnh.animateLogin(); } catch (e) {}
      }, 40);

      document.getElementById("form-login").onsubmit = async function(e) {
        e.preventDefault();
        let dados = Object.fromEntries(new FormData(e.target).entries());
        mostrarLoader("Autenticando...");
        
        try {
          const resp = await fetch(API_ENDPOINTS.LOGIN, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario: dados.usuario, senha: dados.senha })
          });
          
          esconderLoader();
          if (resp.ok) {
            let res = await resp.json();
            // Save session (tokens are optional for backward compatibility)
            salvarSessao(
              res.usuario, 
              res.tipo, 
              res.access_token,  // May be undefined in simple auth mode
              res.refresh_token, // May be undefined in simple auth mode
              res.csrf_token     // May be undefined in simple auth mode
            );
            carregarSistema();
          } else {
            const erro = await resp.json().catch(()=>({}));
            let el = document.getElementById("login-erro");
            el.textContent = erro.detail || "Usuário ou senha inválidos!";
            el.style.display = "block";
          }
        } catch (err) {
          esconderLoader();
          let el = document.getElementById("login-erro");
          el.textContent = "Falha ao conectar ao servidor.";
          el.style.display = "block";
        }
      }

      // Adicionar efeitos de hover e focus
      const btnLogin = document.getElementById("btn-login");
      const usuarioSelect = document.getElementById("login-usuario");
      const senhaInput = document.getElementById("login-senha");

      if (btnLogin) {
        btnLogin.addEventListener('mouseenter', () => {
          btnLogin.style.background = '#3e6dc6';
        });
        btnLogin.addEventListener('mouseleave', () => {
          btnLogin.style.background = '#2077b3';
        });
      }

      if (usuarioSelect) {
        usuarioSelect.addEventListener('focus', () => {
          usuarioSelect.style.borderColor = '#2077b3';
          usuarioSelect.style.background = '#fff';
        });
        usuarioSelect.addEventListener('blur', () => {
          usuarioSelect.style.borderColor = '#ddd';
          usuarioSelect.style.background = '#f9f9f9';
        });
      }

      if (senhaInput) {
        senhaInput.addEventListener('focus', () => {
          senhaInput.style.borderColor = '#2077b3';
          senhaInput.style.background = '#fff';
        });
        senhaInput.addEventListener('blur', () => {
          senhaInput.style.borderColor = '#ddd';
          senhaInput.style.background = '#f9f9f9';
        });
      }
    })
    .catch(() => {
      esconderLoader();
      div.innerHTML = `
        <div class="login-header" style="text-align: center; margin-bottom: 30px;">
          <img src="/static/logo.png" alt="Logo" style="display: block; margin: 0 auto 20px auto; max-width: 180px; height: auto; border-radius: 8px;"/>
          <h2 style="margin: 0; color: #2c3e50; font-size: 1.8em;">Gestão de Protocolos</h2>
        </div>
        <div style="color: #dc3545; text-align: center; padding: 20px; background: #f8d7da; border-radius: 6px; border: 1px solid #f5c6cb;">
          Erro ao carregar usuários!
        </div>
      `;
      setTimeout(() => {
        try { window.__appEnh && window.__appEnh.animateLogin && window.__appEnh.animateLogin(); } catch (e) {}
      }, 40);
    });
}

/* ====================== [BLOCO 11: INICIALIZAÇÃO] ====================== */
window.addEventListener('DOMContentLoaded', function () {
  ensureFavicon('/static/favicon.svg');
  try { localStorage.removeItem("sessao"); } catch {}
  
  if (!sessionStorage.getItem('cacheBusted')) {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('v')) {
      sessionStorage.setItem('cacheBusted', '1');
      url.searchParams.set('v', Date.now().toString());
      window.location.replace(url.toString());
      return;
    } else {
      sessionStorage.setItem('cacheBusted', '1');
    }
  }
  
  const sessao = getSessao();
  if (sessao) {
    carregarSistema();
  } else {
    exibirLogin();
  }
});

window.addEventListener("focus", () => {
  if (!getSessao()) {
    exibirLogin();
  } else {
    // Recarregar notificações quando a janela ganha foco
    carregarNotificacoes();
  }
});


// ====================== [BLOCO 12: SISTEMA E NAVEGAÇÃO] ====================== //
async function carregarSistema() {
  let sessao = getSessao();
  if (!sessao) {
    exibirLogin();
    return;
  }

  // carregar categorias dinâmicas antes de montar UI
  await fetchCategorias();
  
  document.getElementById("login-container").style.display = "none";
  document.getElementById("menu-lateral").style.display = "";
  document.getElementById("conteudo").style.display = "";
  document.getElementById("usuario-logado").innerText = sessao.usuario;
  document.getElementById("usuario-tipo").innerText = sessao.tipo;
  document.getElementById("btn-cadastrar-usuario").style.display = sessao.tipo === "admin" ? "" : "none";
  document.getElementById("btn-categorias").style.display = sessao.tipo === "admin" ? "" : "none";
  document.getElementById("btn-backup").style.display = sessao.tipo === "admin" ? "" : "none";
  
  // update topbar short user if present
  try { document.getElementById('usuario-logado-short').textContent = sessao.usuario; } catch (e) {}
  
  // Show welcome modal after login
  mostrarBoasVindas();
  
  // Carregar notificações
  carregarNotificacoes();
  
  menuInicial();
}

// ====================== [WELCOME MODAL WITH CAPYBARA] ======================
function mostrarBoasVindas() {
  const sessao = getSessao();
  if (!sessao) return;
  
  const hoje = new Date();
  const dataFormatada = hoje.toLocaleDateString('pt-BR');
  
  const modalHTML = `
    <div class="welcome-modal-overlay" id="welcome-modal">
      <div class="welcome-modal-card">
        <div class="emoji-container">
          <div class="emoji-animation">
            <span class="emoji-cool">😎</span>
          </div>
        </div>
        <h1 class="welcome-title">Bem Vindo!</h1>
        <h2 class="welcome-user">${sessao.usuario}</h2>
        <p class="welcome-date">Hoje é dia <strong>${dataFormatada}</strong></p>
        <p class="welcome-msg">Não esqueça de verificar seus protocolos!</p>
        <p class="trabalho-msg">Ótimo trabalho!</p>
        <button class="welcome-btn" onclick="fecharBoasVindas()">Continuar →</button>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function fecharBoasVindas() {
  const modal = document.getElementById('welcome-modal');
  if (modal) {
    modal.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => modal.remove(), 300);
  }
}
// ====================== [BLOCO 13: DASHBOARD E ESTATÍSTICAS] ======================

async function verificarAtrasos() {
  const sessao = getSessao();
  if (!sessao || sessao.tipo !== "admin") {
    mostrarMensagem("Apenas administradores podem verificar atrasos.", "erro");
    return;
  }

  const senha = prompt("Confirme sua senha de admin para verificar atrasos e notificar admins:");
  if (!senha) {
    mostrarMensagem("Operação cancelada.", "info");
    return;
  }

  mostrarLoader("Verificando atrasos e gerando notificações...");
  try {
    const resp = await fetchWithAuth("/api/admin/verificar-atrasos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario: sessao.usuario, senha })
    });

    esconderLoader();

    if (resp.ok) {
      const data = await resp.json().catch(() => ({}));
      mostrarMensagem(
        `Verificação concluída. Atrasados: ${data.atrasados || 0}. ` +
        `Notificações criadas: ${data.notificacoes_criadas || 0}. ` +
        `Ignoradas (já havia alerta hoje): ${data.skipped_por_ja_existir || 0}.`,
        "sucesso",
        7000
      );
      carregarNotificacoes();
    } else {
      const erro = await resp.json().catch(() => ({}));
      mostrarMensagem(erro.detail || "Erro ao verificar atrasos.", "erro", 7000);
    }
  } catch (e) {
    esconderLoader();
    mostrarMensagem("Falha ao conectar ao servidor.", "erro");
  }
}



function menuInicial() {
  let conteudo = document.getElementById("conteudo");
  conteudo.innerHTML = `
    <div class="form-destacado">
      <h2>Dashboard - Gestão de Protocolos</h2>
      <p style="color:#0000ff; margin-bottom: 20px;">Escolha uma opção no menu ao lado.</p>
      <div id="dashboard-stats">
        <div style="text-align: center; padding: 40px;">
          <div class="loader"></div>
          <p>Carregando estatísticas...</p>
        </div>
      </div>
      <div id="dashboard-actions" style="display: flex; gap: 15px; margin-top: 20px;">
        <button onclick="carregarEstatisticas(true)" id="btn-refresh-dashboard">🔄 Atualizar Dashboard</button>
        <button onclick="openBuscarWithFilters({ statuses: ['Exigência', 'Pendente'] })" 
                style="background:#ff9800;color:white;border:none;padding:10px 16px;border-radius:6px;cursor:pointer;">
          📋 Ver Exigências e Pendentes
        </button>
      </div>
    </div>
  `;
  
  carregarEstatisticas();
  
  // Mostrar botão de verificar atrasos apenas para admin
  const sessao = getSessao();
  if (sessao && sessao.tipo === 'admin') {
    const btn = document.createElement('button');
    btn.textContent = '⚡ Verificar Atrasos';
    btn.onclick = verificarAtrasos;
    btn.style.marginLeft = 'auto';
    btn.style.background = '#dc3545';
    btn.style.color = 'white';
    btn.style.border = 'none';
    btn.style.padding = '10px 16px';
    btn.style.borderRadius = '6px';
    btn.style.cursor = 'pointer';
    // anexar ao container de ações (existente)
    const actionsContainer = document.getElementById('dashboard-actions') || document.querySelector('.form-destacado > div:last-child');
    if (actionsContainer) actionsContainer.appendChild(btn);
  }
}

async function carregarEstatisticas(forcarAtualizacao = false) {
  try {
    const url = forcarAtualizacao ? '/api/protocolo/estatisticas?forcar_atualizacao=true' : '/api/protocolo/estatisticas';
    const resp = await fetchWithAuth(url);
    
    if (!resp.ok) {
      document.getElementById('dashboard-stats').innerHTML = `
        <div style="color: red; text-align: center; padding: 20px;">
          Erro ao carregar estatísticas.
        </div>
      `;
      return;
    }
    
    const data = await resp.json();

    // Buscar também os protocolos em atenção (>30 dias) para complemento (não obrigatório)
    let attentionItems = [];
    try {
      const attResp = await fetchWithAuth('/api/protocolo/atencao');
      if (attResp.ok) {
        attentionItems = await attResp.json();
      }
    } catch (e) {
      console.debug('Não foi possível carregar /api/protocolo/atencao para estatísticas avançadas', e);
    }

    renderizarDashboard(data, attentionItems);
    
  } catch (err) {
    console.error('Erro ao carregar estatísticas:', err);
    document.getElementById('dashboard-stats').innerHTML = `
      <div style="color: red; text-align: center; padding: 20px;">
        Falha ao conectar ao servidor.
      </div>
    `;
  }
}

function renderizarDashboard(data, attentionItems = []) {
  const total = data.total || {};
  const por_cat = data.por_categoria || {};
  // Garantir números
  const geradosNum = Number(total.gerados || 0);
  const finalizadosNum = Number(total.finalizados || 0);
  const abertosNum = Number(total.abertos || 0);
  const atrasadosNum = Number(total.atrasados || 0);
  const exigenciasNum = Number(total.exigencias || 0);
  const pendentesNum = Number(total.pendentes || 0);
  const exigenciasPendentesNum = Number(total.exigencias_pendentes || 0);

  const taxaConclusao = geradosNum > 0 ? ((finalizadosNum / geradosNum) * 100) : 0;
  const taxaAtraso = abertosNum > 0 ? ((atrasadosNum / abertosNum) * 100) : 0;

  // Normalizar valores para exibição
  const taxaConclusaoDisplay = isFinite(taxaConclusao) ? taxaConclusao.toFixed(1) : "0.0";
  const taxaAtrasoDisplay = isFinite(taxaAtraso) ? taxaAtraso.toFixed(1) : "0.0";

  // Consistency checks
  const finalizadosPlusAbertos = finalizadosNum + abertosNum;
  const exigenciasPlusPendentes = exigenciasNum + pendentesNum;
  const consistencyGerados = finalizadosPlusAbertos === geradosNum;
  const consistencyExig = exigenciasPlusPendentes === exigenciasPendentesNum;

  let html = `
    <!-- PRIMEIRA LINHA: CARDS PRINCIPAIS -->
    <div class="estatisticas-resumo" style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 10px; margin-bottom: 25px;">
      <!-- Total Gerados -->
      <div class="card" style="padding: 15px; border: 2px solid #e0e0e0; border-radius: 10px; text-align: center; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="font-size: 11px; color: #6c757d; margin-bottom: 6px; font-weight: 600;">TOTAL GERADOS</div>
        <div style="font-size: 22px; font-weight: bold; color: #495057;">${esc(geradosNum)}</div>
        <div style="font-size: 9px; color: #868e96; margin-top: 4px;">Protocolos</div>
      </div>
      
      <!-- Total Finalizados -->
      <div class="card" style="padding: 15px; border: 2px solid #28a745; border-radius: 10px; text-align: center; background: linear-gradient(135deg, #f8fff9 0%, #e8f5e8 100%); box-shadow: 0 2px 4px rgba(40,167,69,0.15);">
        <div style="font-size: 11px; color: #155724; margin-bottom: 6px; font-weight: 600;">TOTAL FINALIZADOS</div>
        <div style="font-size: 22px; font-weight: bold; color: #28a745;">${esc(finalizadosNum)}</div>
        <div style="font-size: 9px; color: #1e7e34; margin-top: 4px;">Concluídos</div>
      </div>
      
      <!-- Em Aberto -->
      <div class="card clickable" onclick="openBuscarWithFilters({ statuses: ['Pendente','Em andamento','Exigência'] })" 
           style="padding: 15px; border: 2px solid #ffc107; border-radius: 10px; text-align: center; background: linear-gradient(135deg, #fffef0 0%, #fff3cd 100%); box-shadow: 0 2px 4px rgba(255,193,7,0.15); cursor: pointer; transition: transform 0.2s;"
           onmouseover="this.style.transform='translateY(-2px)'" 
           onmouseout="this.style.transform='translateY(0)'">
        <div style="font-size: 11px; color: #856404; margin-bottom: 6px; font-weight: 600;">EM ABERTO</div>
        <div style="font-size: 22px; font-weight: bold; color: #ffc107;">${esc(abertosNum)}</div>
        <div style="font-size: 9px; color: #b38f00; margin-top: 4px;">Pendentes</div>
      </div>
      
      <!-- Em Atraso -->
      <div class="card clickable" onclick="openBuscarWithFilters({ statuses: ['Pendente','Em andamento','Exigência'], periodos: ['ultimo_mes'] })" 
           style="padding: 15px; border: 2px solid #dc3545; border-radius: 10px; text-align: center; background: linear-gradient(135deg, #fff5f5 0%, #ffe6e6 100%); box-shadow: 0 2px 4px rgba(220,53,69,0.15); cursor: pointer; transition: transform 0.2s;"
           onmouseover="this.style.transform='translateY(-2px)'" 
           onmouseout="this.style.transform='translateY(0)'">
        <div style="font-size: 11px; color: #721c24; margin-bottom: 6px; font-weight: 600;">EM ATRASO</div>
        <div style="font-size: 22px; font-weight: bold; color: #dc3545;">${esc(atrasadosNum)}</div>
        <div style="font-size: 9px; color: #a71e2a; margin-top: 4px;">+30 dias</div>
      </div>
      
      <!-- Exigências -->
      <div class="card clickable" onclick="openBuscarWithFilters({ statuses: ['Exigência'] })" 
           style="padding: 15px; border: 2px solid #fd7e14; border-radius: 10px; text-align: center; background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%); box-shadow: 0 2px 4px rgba(253,126,20,0.15); cursor: pointer; transition: transform 0.2s;"
           onmouseover="this.style.transform='translateY(-2px)'" 
           onmouseout="this.style.transform='translateY(0)'">
        <div style="font-size: 11px; color: #e65100; margin-bottom: 6px; font-weight: 600;">EXIGÊNCIAS</div>
        <div style="font-size: 22px; font-weight: bold; color: #fd7e14;">${esc(exigenciasNum)}</div>
        <div style="font-size: 9px; color: #e65100; margin-top: 4px;">Aguardando</div>
      </div>
      
      <!-- Pendentes -->
      <div class="card clickable" onclick="openBuscarWithFilters({ statuses: ['Pendente'] })" 
           style="padding: 15px; border: 2px solid #20c997; border-radius: 10px; text-align: center; background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%); box-shadow: 0 2px 4px rgba(32,201,151,0.15); cursor: pointer; transition: transform 0.2s;"
           onmouseover="this.style.transform='translateY(-2px)'" 
           onmouseout="this.style.transform='translateY(0)'">
        <div style="font-size: 11px; color: #0f5132; margin-bottom: 6px; font-weight: 600;">PENDENTES</div>
        <div style="font-size: 22px; font-weight: bold; color: #20c997;">${esc(pendentesNum)}</div>
        <div style="font-size: 9px; color: #0f5132; margin-top: 4px;">Em análise</div>
      </div>
      
      <!-- Exigências + Pendentes -->
      <div class="card clickable" onclick="openBuscarWithFilters({ statuses: ['Exigência', 'Pendente'] })" 
           style="padding: 15px; border: 2px solid #6f42c1; border-radius: 10px; text-align: center; background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%); box-shadow: 0 2px 4px rgba(111,66,193,0.15); cursor: pointer; transition: transform 0.2s;"
           onmouseover="this.style.transform='translateY(-2px)'" 
           onmouseout="this.style.transform='translateY(0)'">
        <div style="font-size: 11px; color: #4a235a; margin-bottom: 6px; font-weight: 600;">EXIG + PEND</div>
        <div style="font-size: 22px; font-weight: bold; color: #6f42c1;">${esc(exigenciasPendentesNum)}</div>
        <div style="font-size: 9px; color: #4a235a; margin-top: 4px;">Total combinado</div>
      </div>
      
      <!-- Taxa de Conclusão -->
      <div class="card" style="padding: 15px; border: 2px solid #17a2b8; border-radius: 10px; text-align: center; background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); box-shadow: 0 2px 4px rgba(23,162,184,0.15);">
        <div style="font-size: 11px; color: #0c5460; margin-bottom: 6px; font-weight: 600;">TAXA CONCLUSÃO</div>
        <div style="font-size: 22px; font-weight: bold; color: ${Number(taxaConclusaoDisplay) >= 70 ? '#28a745' : Number(taxaConclusaoDisplay) >= 50 ? '#ffc107' : '#dc3545'};">${esc(taxaConclusaoDisplay)}%</div>
        <div style="font-size: 9px; color: #0c5460; margin-top: 4px;">Eficiência</div>
      </div>
    </div>

    <!-- SEGUNDA LINHA: GRÁFICO E TABELA LADO A LADO -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
      <!-- Gráfico de Distribuição por Categoria -->
      <div style="background: white; padding: 20px; border-radius: 10px; border: 1px solid #e0e0e0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h4 style="margin: 0 0 15px 0; color: #495057; font-size: 16px; text-align: center;">📊 Distribuição por Categoria</h4>
        <canvas id="grafico-categorias" width="400" height="250"></canvas>
      </div>
      
      <!-- Tabela de Detalhes por Categoria -->
      <div style="background: white; padding: 20px; border-radius: 10px; border: 1px solid #e0e0e0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
        <h4 style="margin: 0 0 15px 0; color: #495057; font-size: 16px; text-align: center;">📋 Detalhes por Categoria</h4>
        <div style="overflow-x: auto; max-height: 400px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background: #f8f9fa;">
                <th style="text-align: left; padding: 10px; border-bottom: 2px solid #dee2e6; font-weight: 600; color: #495057;">Categoria</th>
                <th style="text-align: right; padding: 10px; border-bottom: 2px solid #dee2e6; font-weight: 600; color: #495057;">Gerados</th>
                <th style="text-align: right; padding: 10px; border-bottom: 2px solid #dee2e6; font-weight: 600; color: #495057;">Finalizados</th>
                <th style="text-align: right; padding: 10px; border-bottom: 2px solid #dee2e6; font-weight: 600; color: #495057;">Aberto</th>
                <th style="text-align: right; padding: 10px; border-bottom: 2px solid #dee2e6; font-weight: 600; color: #495057;">Exigências</th>
                <th style="text-align: right; padding: 10px; border-bottom: 2px solid #dee2e6; font-weight: 600; color: #495057;">Pendentes</th>
                <th style="text-align: right; padding: 10px; border-bottom: 2px solid #dee2e6; font-weight: 600; color: #495057;">Exig+Pend</th>
                <th style="text-align: right; padding: 10px; border-bottom: 2px solid #dee2e6; font-weight: 600; color: #495057;">Atraso</th>
              </tr>
            </thead>
            <tbody>
  `;

  const cats = Object.keys(por_cat).sort();
  const catColors = {
    "RGI": {bg:"#fff7e6", hover:"#fff2d1", color:"#d46b08"},
    "RCPN": {bg:"#e6f7ff", hover:"#ccf0ff", color:"#1890ff"},
    "RCPJ": {bg:"#fff0f6", hover:"#ffd6ed", color:"#eb2f96"},
    "RTD": {bg:"#e6fff0", hover:"#ccffd9", color:"#52c41a"},
    "PROTESTO": {bg:"#fff9e6", hover:"#fff3cc", color:"#faad14"},
    "NOTAS": {bg:"#f0f7ff", hover:"#dcecff", color:"#2f54eb"}
  };
  
  if (cats.length === 0) {
    html += `<tr><td colspan="8" style="padding:16px;text-align:center;color:#6c757d;">Sem dados de categorias.</td></tr>`;
  } else {
    cats.forEach(cat => {
      const v = por_cat[cat] || {};
      const colors = catColors[cat] || {bg: 'transparent', hover: '#f7f7f7', color: '#000'};
      
      html += `
        <tr class="cat-row" data-cat="${esc(cat)}" 
            style="cursor:pointer;background:${colors.bg};transition:background 0.2s;"
            onmouseover="this.style.background='${colors.hover}';"
            onmouseout="this.style.background='${colors.bg}';"
            onclick="openBuscarWithFilters({ categories: ['${esc(cat)}'] })">
          <td style="padding: 8px 10px; border-bottom: 1px solid #f1f1f1; font-weight: 600; color: ${colors.color};">${esc(cat)}</td>
          <td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #f1f1f1;">${esc(Number(v.gerados || 0))}</td>
          <td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #f1f1f1; color: #28a745; font-weight: 600;">${esc(Number(v.finalizados || 0))}</td>
          <td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #f1f1f1; color: #ffc107; font-weight: 600;">${esc(Number(v.abertos || 0))}</td>
          <td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #f1f1f1; color: #fd7e14; font-weight: 600;">${esc(Number(v.exigencias || 0))}</td>
          <td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #f1f1f1; color: #20c997; font-weight: 600;">${esc(Number(v.pendentes || 0))}</td>
          <td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #f1f1f1; color: #6f42c1; font-weight: 600;">${esc(Number(v.exigencias_pendentes || (Number(v.exigencias||0) + Number(v.pendentes||0))))}</td>
          <td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #f1f1f1; color: #dc3545; font-weight: 600;">${esc(Number(v.atrasados || 0))}</td>
        </tr>
      `;
    });
  }
  
  html += `</tbody></table></div></div></div>`;
  
  document.getElementById('dashboard-stats').innerHTML = html;
  
  setTimeout(() => renderizarGraficoCategorias(por_cat), TIMEOUTS.CHART_RENDER_DELAY);
}

function renderizarGraficoCategorias(por_cat) {
  const ctx = document.getElementById('grafico-categorias');
  if (!ctx) return;

  const cats = Object.keys(por_cat).sort();
  const dadosAbertos = cats.map(cat => Number((por_cat[cat] && por_cat[cat].abertos) || 0));
  const dadosAtrasados = cats.map(cat => Number((por_cat[cat] && por_cat[cat].atrasados) || 0));
  const dadosExigPend = cats.map(cat => Number((por_cat[cat] && por_cat[cat].exigencias_pendentes) || ( (por_cat[cat] ? Number(por_cat[cat].exigencias||0) + Number(por_cat[cat].pendentes||0) : 0) )));

  // Destruir chart anterior se existir (evitar sobreposição)
  try {
    if (ctx._chartInstance && typeof ctx._chartInstance.destroy === 'function') {
      ctx._chartInstance.destroy();
      ctx._chartInstance = null;
    }
  } catch (e) {
    console.debug('Erro ao destruir chart anterior:', e);
  }

  // Proteção: se Chart não estiver disponível, não tentar criar
  if (typeof Chart === 'undefined') {
    console.debug('Chart.js não encontrado; omitindo gráfico.');
    return;
  }

  const cfg = {
    type: 'bar',
    data: {
      labels: cats,
      datasets: [
        {
          label: 'Em Aberto',
          data: dadosAbertos,
          backgroundColor: '#ffc107',
          borderColor: '#e0a800',
          borderWidth: 1
        },
        {
          label: 'Em Atraso',
          data: dadosAtrasados,
          backgroundColor: '#dc3545',
          borderColor: '#c82333',
          borderWidth: 1
        },
        {
          label: 'Exigências + Pendentes',
          data: dadosExigPend,
          backgroundColor: '#6f42c1',
          borderColor: '#5a2da8',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        title: { display: true, text: 'Protocolos por Categoria' },
        tooltip: {
          callbacks: {
            // Chart.js v3 callback signature: param is context (single or array depending)
            label: function(context) {
              const label = context.dataset.label || '';
              const value = context.parsed.y !== undefined ? context.parsed.y : context.parsed;
              return `${label}: ${value}`;
            },
            afterBody: function(context) {
              // context is array of tooltip items
              if (!context || !context.length) return [];
              const cat = context[0].label;
              const data = por_cat[cat] || {};
              return [
                `Total: ${data.gerados || 0}`,
                `Finalizados: ${data.finalizados || 0}`,
                `Exigências: ${data.exigencias || 0}`,
                `Pendentes: ${data.pendentes || 0}`,
                `Exig+Pend: ${data.exigencias_pendentes || ( (data.exigencias||0) + (data.pendentes||0) )}`
              ];
            }
          }
        }
      },
      scales: {
        x: { stacked: false, title: { display: true, text: 'Categoria' } },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Quantidade' },
          ticks: { precision: 0 }
        }
      },
      onClick: function(evt, activeEls) {
        // Se clicar numa barra, aplicar filtro na UI (abrir busca)
        try {
          if (!activeEls || !activeEls.length) return;
          const chart = ctx._chartInstance;
          const idx = activeEls[0].index;
          const cat = chart.data.labels[idx];
          openBuscarWithFilters({ categories: [cat], page: 1 });
        } catch (e) {
          console.debug('Falha ao abrir busca por categoria a partir do gráfico', e);
        }
      }
    }
  };

  try {
    const chart = new Chart(ctx, cfg);
    ctx._chartInstance = chart;
  } catch (e) {
    console.debug('Erro ao renderizar gráfico (Chart.js pode não estar disponível):', e);
  }
}



// ====================== [BLOCO 14: NAVEGAÇÃO E MONTAGEM DE TELAS] ====================== //
function navegar(pagina) {
  let conteudo = document.getElementById("conteudo");
  let sessao = getSessao();
  if (!sessao) {
    exibirLogin();
    return;
  }

  // Fechar notificações ao navegar
  fecharNotificacoes();

  if (pagina === 'menu') {
    menuInicial();
    return;
  }

  if (pagina === 'usuario') {
    if (sessao.tipo !== "admin") {
      mostrarMensagem("Apenas admin pode cadastrar usuários.", "erro");
      return;
    }
    listarUsuariosAdmin();
    return;
  }
  
  if (pagina === 'backup') {
  const isAdmin = sessao.tipo === "admin";
  conteudo.innerHTML = `
    <div class="form-destacado">
      <h2>Backup e Restauração</h2>
      <div style="margin-bottom:24px;">
        <button id="btn-baixar-backup" style="background:#228be6;color:white;">⬇️ Baixar Backup (BD)</button>
        <button id="btn-baixar-backup-full" style="background:#0aaa65;color:white;margin-left:12px;">⬇️ Backup Completo (Sistema+BD)</button>
      </div>
      <div style="margin-bottom:24px;">
        <input type="file" id="sel-arquivo-backup" style="display:none;">
        <button id="btn-restaurar-backup" style="background:#21a179;color:white;">⬆️ Restaurar de Backup</button>
        <span id="backup-restore-status" style="margin-left:12px;"></span>
      </div>
      ${isAdmin ? `
      <div style="margin:18px 0;padding:14px;border:1px solid #ffeaa7;background:#fff8e1;border-radius:8px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <strong>🧨 Zerar aplicação</strong>
          <span style="color:#d35400;">(Apenas admin)</span>
        </div>
        <p style="margin:0 0 10px 0;color:#6b7280;">Remove todos os dados (protocolos, usuários, filtros, notificações, categorias) e recria o admin com a mesma senha informada.</p>
        <button id="btn-zerar-app" style="background:#dc3545;color:white;">⚠️ Zerar Aplicação</button>
      </div>
      ` : ''}
      <button type="button" id="voltar-menu-backup">← Voltar ao Menu</button>
      <div style="margin-top:12px;font-size:0.97em;color:#637381;">
        <ul style="margin:12px 0 0 25px;padding:0;color:#637381;">
          <li>O backup do BD exporta apenas os dados do banco (protocolos e usuários).</li>
          <li>O backup completo exporta <b>toda a aplicação</b> (<code>.zip</code> com código + banco).</li>
          <li>Para restaurar o sistema completo, extraia o ZIP manualmente na pasta original e reinicie o serviço.</li>
        </ul>
      </div>
    </div>
  `;

  // Botão: backup apenas do banco (dados)
  document.getElementById("btn-baixar-backup").onclick = async function() {
    mostrarLoader("Gerando backup...");
    fetchWithAuth('/api/backup', {method: 'POST'})
      .then(resp => resp.blob())
      .then(blob => {
        esconderLoader();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "backup_protocolos.json";
        a.click();
        window.URL.revokeObjectURL(url);
      });
  };

  // Botão: backup TOTAL do sistema + banco (.zip)
  document.getElementById("btn-baixar-backup-full").onclick = async function() {
    mostrarLoader("Gerando backup completo...");
    fetchWithAuth('/api/backup/full', {method: 'POST'})
      .then(resp => resp.blob())
      .then(blob => {
        esconderLoader();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "backup_completo.zip";
        a.click();
        window.URL.revokeObjectURL(url);
      });
  };

  // Botão: restaurar backup do BD
  document.getElementById("btn-restaurar-backup").onclick = function() {
    document.getElementById("sel-arquivo-backup").click();
  };
  document.getElementById("sel-arquivo-backup").onchange = async function(evt) {
    const file = evt.target.files[0];
    if (!file) return;
    
    const sessao = getSessao();
    if (!sessao || !sessao.usuario) {
      mostrarMensagem("Você precisa estar logado para restaurar backup.", "erro");
      return;
    }
    
    // Prompt for password for security (backup restore is critical operation)
    const senha = prompt("Digite sua senha de administrador para confirmar a restauração do backup:");
    if (!senha) {
      mostrarMensagem("Restauração cancelada.", "info");
      return;
    }
    
    mostrarLoader("Restaurando backup...");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("usuario", sessao.usuario);
    formData.append("senha", senha);
    
    fetchWithAuth("/api/backup/upload", { method: "POST", body: formData })
      .then(r => r.json())
      .then(d => {
        esconderLoader();
        document.getElementById("backup-restore-status").textContent = d.ok ? "Backup restaurado!" : `Erro: ${d.detail||d.msg}`;
        if (d.ok) mostrarMensagem("Backup restaurado com sucesso.","sucesso");
        else mostrarMensagem(d.detail || d.msg,"erro");
      })
      .catch(() => {
        esconderLoader();
        document.getElementById("backup-restore-status").textContent = "Erro ao restaurar!";
        mostrarMensagem("Falha ao restaurar backup!","erro");
      });
  };

  if (isAdmin) {
    const btnZerar = document.getElementById("btn-zerar-app");
    if (btnZerar) {
      btnZerar.onclick = async function() {
        if (!confirm("⚠️ Esta ação irá remover todos os dados e recriar o admin. Deseja continuar?")) return;
        const senha = prompt("Confirme a senha do usuário admin para prosseguir:");
        if (!senha) {
          mostrarMensagem("Operação cancelada.", "info");
          return;
        }
        mostrarLoader("Zerando aplicação...");
        try {
          const resp = await fetchWithAuth("/api/admin/zerar-app", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuario: sessao.usuario, senha })
          });
          esconderLoader();
          if (resp.ok) {
            mostrarMensagem("Aplicação zerada com sucesso. Faça login novamente.", "sucesso", 6000);
            logout();
          } else {
            const erro = await resp.json().catch(() => ({}));
            mostrarMensagem(erro.detail || "Erro ao zerar aplicação.", "erro", 6000);
          }
        } catch (e) {
          esconderLoader();
          mostrarMensagem("Falha ao conectar ao servidor.", "erro");
        }
      };
    }
  }

  document.getElementById("voltar-menu-backup").onclick = menuInicial;
  return;
}
  

  // BLOCO 14.1: TELA DE INCLUIR PROTOCOLO
  if (pagina === 'incluir') {
    const hoje = new Date().toISOString().slice(0, 10);
    conteudo.innerHTML = `
      <div class="form-destacado">
        <h2>Incluir Protocolo</h2>
        <form id="form-protocolo" autocomplete="off" style="max-width:1000px;">
          <div style="display:flex;gap:12px;flex-wrap:wrap;">
            <div style="flex:1;min-width:180px;">
              <label>Número do Protocolo *</label>
              <input type="text" id="numero-protocolo" name="numero" maxlength="5" minlength="5" required 
                     inputmode="numeric" pattern="^\\d{5}$" style="width:100%;" 
                     placeholder="00000">
              <div id="protocolo-feedback" class="campo-feedback hint"></div>
            </div>
            <div style="width:180px;">
              <label>Data de Criação *</label>
              <input type="date" id="data-criacao" name="data_criacao" value="${hoje}" required style="width:100%;">
            </div>
            <div style="flex:1;min-width:200px;">
              <label>Responsável Pelo Pt. *</label>
              <input type="text" id="responsavel" name="responsavel" value="${esc(sessao.usuario)}" readonly style="width:100%;">
            </div>
          </div>
          
          <div style="display:flex;gap:12px;margin-top:8px;flex-wrap:wrap;">
            <div style="flex:1;min-width:220px;">
              <label>Nome do Requerente *</label>
              <input type="text" id="nome-requerente" name="nome_requerente" maxlength="60" required style="width:100%;">
            </div>
            <div style="width:180px;">
              <label>CPF *</label>
              <input type="text" id="cpf-incluir" name="cpf" maxlength="14" required 
                     inputmode="numeric" placeholder="000.000.000-00" style="width:100%;">
              <div id="cpf-incluir-feedback" class="campo-feedback hint">Informe 11 dígitos</div>
            </div>
            <div style="width:180px;">
              <label>WhatsApp</label>
              <input type="text" id="whatsapp-incluir" name="whatsapp" maxlength="15" 
                     inputmode="numeric" placeholder="(00) 00000-0000" style="width:100%;">
            </div>
            <div style="width:180px;">
              <label>Categoria *</label>
              <select id="categoria" name="categoria" required style="width:100%;">
                <option value="">Selecione</option>
                ${CATEGORIA_OPTIONS.map(c => `<option>${esc(c)}</option>`).join('')}
              </select>
            </div>
            <div style="width:180px;">
              <label>Status *</label>
              <select id="status" name="status" required style="width:100%;">
                <option value="">Selecione</option>
                ${STATUS_OPTIONS.map(s => `<option>${esc(s)}</option>`).join('')}
              </select>
            </div>
          </div>
          
          <div style="display:flex;gap:12px;margin-top:8px;flex-wrap:wrap;">
            <div style="flex:1;min-width:200px;">
              <label>Nome da parte no ato</label>
              <input type="text" id="nome-parte-ato" name="nome_parte_ato" maxlength="120" style="width:100%;">
            </div>
            <div style="flex:1;min-width:250px;">
              <label>Título/Assunto *</label>
              <input type="text" id="titulo" name="titulo" maxlength="120" required style="width:100%;">
            </div>
            <div style="flex:1;min-width:250px;">
              <label>Outras Informações / Cartorio do Ato Original</label>
              <input type="text" name="outras_infos" maxlength="120" style="width:100%;">
            </div>
          </div>
          
          <div style="margin-top:8px;">
            <label>Observações/Exigências</label>
            <textarea id="observacoes-incluir" name="observacoes" rows="5" maxlength="8240" 
                      placeholder="Digite as observações aqui..." style="width:100%;"></textarea>
          </div>
          
          <div style="margin-top:12px;display:flex;gap:12px;flex-wrap:wrap;">
            <button type="submit" id="btn-salvar-incluir">💾 Salvar Protocolo</button>
            <button type="button" id="voltar-menu-incluir">← Voltar ao Menu</button>
            <button type="button" onclick="this.form.reset(); document.getElementById('data-criacao').value='${hoje}'; document.getElementById('responsavel').value='${esc(sessao.usuario)}';">🔄 Limpar</button>
          </div>
        </form>
      </div>
    `;

    // Validação do número do protocolo
    const numeroInput = document.getElementById("numero-protocolo");
    const numeroFeedback = document.getElementById("protocolo-feedback");
    const btnSalvarIncluir = document.getElementById("btn-salvar-incluir");
    
    // State to manage async checks and avoid race conditions
    let _lastCheckId = 0;

    // helper: verifica no backend se o número já existe
    async function checkNumeroExistsBackend(numero, checkId) {
      try {
        const resp = await fetchWithAuth(`/api/protocolo?numero=${encodeURIComponent(numero)}&per_page=1`);
        if (!resp.ok) {
          // Não bloquear o usuário por falha temporária do servidor
          console.debug("checkNumeroExistsBackend: resposta não OK", resp.status);
          return { exists: false, info: null, checkId };
        }
        const data = await resp.json().catch(() => ({}));
        const items = data.items || [];
        if (items.length > 0) {
          return { exists: true, info: items[0], checkId };
        }
        return { exists: false, info: null, checkId };
      } catch (err) {
        console.debug("checkNumeroExistsBackend erro:", err);
        return { exists: false, info: null, checkId };
      }
    }

    // Debounced wrapper to avoid many calls while typing
    const debouncedCheckNumero = debounce(async (val, cid) => {
      const res = await checkNumeroExistsBackend(val, cid);
      // Only apply if this is the latest check
      if (res.checkId !== _lastCheckId) return;
      if (res.exists) {
        const info = res.info || {};
        const nome = info.nome_requerente || '';
        const status = info.status || '';
        numeroFeedback.textContent = `Número já cadastrado${nome ? ` — ${nome}` : ''}${status ? ` (Status: ${status})` : ''}`;
        numeroFeedback.className = "campo-feedback erro";
        btnSalvarIncluir.disabled = true;
      } else {
        numeroFeedback.textContent = "Número válido.";
        numeroFeedback.className = "campo-feedback ok";
        btnSalvarIncluir.disabled = false;
      }
    }, 300);

    numeroInput.addEventListener("input", () => {
      const val = numeroInput.value.trim();
      if (/^\d{5}$/.test(val)) {
        numeroFeedback.textContent = "Verificando disponibilidade...";
        numeroFeedback.className = "campo-feedback hint";
        // trigger async check
        _lastCheckId++;
        debouncedCheckNumero(val, _lastCheckId);
      } else {
        numeroFeedback.textContent = "O número do protocolo deve conter exatamente 5 dígitos.";
        numeroFeedback.className = "campo-feedback erro";
        btnSalvarIncluir.disabled = true;
      }
    });
    numeroInput.dispatchEvent(new Event("input"));

    // Configuração do CPF
    const cpfInput = document.getElementById("cpf-incluir");
    const cpfFeedback = document.getElementById("cpf-incluir-feedback");
    setupCpfInput(cpfInput, cpfFeedback, btnSalvarIncluir);
    
    // Auto-preenchimento do nome do requerente
    cpfInput.addEventListener("blur", async () => {
      const cpf = somenteDigitos(cpfInput.value);
      const nomeInput = document.getElementById("nome-requerente");
      if (cpf.length === 11 && isCpfValido(cpf) && !nomeInput.value.trim()) {
        try {
          const resp = await fetchWithAuth("/api/protocolo/nome_requerente_por_cpf?cpf=" + cpf);
          if (resp.ok) {
            const data = await resp.json();
            if (data.nome_requerente) {
              nomeInput.value = data.nome_requerente;
              mostrarMensagem("Nome do requerente preenchido automaticamente", "sucesso", 3000);
            }
          }
        } catch {}
      }
    });

    document.getElementById("form-protocolo").onsubmit = async function(e) {
      e.preventDefault();
      const dados = Object.fromEntries(new FormData(e.target).entries());
      
      // Validações finais
      const numeroValue = numeroInput.value.trim();
      if (!/^\d{5}$/.test(numeroValue)) {
        mostrarMensagem("Número do protocolo deve conter exatamente 5 dígitos.", "erro");
        return;
      }
      
      dados.cpf = somenteDigitos(dados.cpf || "");
      if (!/^\d{11}$/.test(dados.cpf) || !isCpfValido(dados.cpf)) {
        mostrarMensagem("CPF inválido.", "erro");
        return;
      }
      
      dados.ultima_alteracao_nome = sessao.usuario;
      mostrarLoader("Salvando protocolo...");
      
      try {
        const resp = await fetchWithAuth("/api/protocolo", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify(dados)
        });
        
        esconderLoader();
        if (resp.ok) {
          const resultado = await resp.json();
          mostrarMensagem(`Protocolo ${numeroValue} incluído com sucesso! ID: ${resultado.id}`, "sucesso");
          // Limpar formulário
          e.target.reset();
          document.getElementById('data-criacao').value = hoje;
          document.getElementById('responsavel').value = sessao.usuario;
          numeroInput.dispatchEvent(new Event("input"));
        } else {
          const erro = await resp.json().catch(()=>({}));
          mostrarMensagem(erro.detail || "Erro ao salvar protocolo.", "erro");
        }
      } catch {
        esconderLoader();
        mostrarMensagem("Falha ao conectar ao servidor.", "erro");
      }
    };
    
    document.getElementById("voltar-menu-incluir").onclick = menuInicial;
    return;
  }
 // BLOCO 14.2: BUSCAR PROTOCOLO (com filtros salvos)
  if (pagina === 'buscar') {
    conteudo.innerHTML = `
      <div class="form-destacado">
        <h2>Buscar Protocolo</h2>
        
        <!-- Filtros Salvos -->
        <div id="filtros-salvos-section" style="margin-bottom:20px;padding:15px;background:#f8f9fa;border-radius:8px;border:1px solid #e9ecef;">
          <h4 style="margin:0 0 10px 0;">Filtros Salvos</h4>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
            <select id="select-filtros-salvos" style="min-width:200px;padding:8px;">
              <option value="">Selecione um filtro salvo...</option>
            </select>
            <button type="button" onclick="carregarFiltroSalvo()" style="padding:8px 12px;">Aplicar Filtro</button>
            <button type="button" onclick="salvarFiltroAtual()" style="padding:8px 12px;background:#28a745;color:white;">💾 Salvar Filtro</button>
            <div style="margin-left:auto;">
              <input type="text" id="nome-filtro" placeholder="Nome do filtro" style="padding:8px;border:1px solid #ddd;border-radius:4px;">
            </div>
          </div>
        </div>
        
        <form id="form-busca" autocomplete="off" style="max-width:1100px;">
          <div style="display:flex;gap:12px;margin-bottom:8px;flex-wrap:wrap;">
            <div style="flex:1;min-width:250px;">
              <label>Busca global</label>
              <input type="text" id="buscar-palavra" maxlength="50" 
                     placeholder="Qualquer termo, número, nome, título..." style="width:100;">
            </div>
            <div style="width:220px;">
              <label>Número do Protocolo</label>
              <input type="text" id="buscar-numero" maxlength="10" autocomplete="off" 
                     inputmode="numeric" pattern="^[0-9]{1,10}$" placeholder="Ex: 12345" style="width:100%;">
            </div>
            <div style="width:200px;">
              <label>CPF do Requerente</label>
              <input type="text" id="buscar-cpf" maxlength="14" autocomplete="off" 
                     inputmode="numeric" placeholder="000.000.000-00" style="width:100%;">
            </div>
          </div>
          
          <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:8px;flex-wrap:wrap;">
            <div style="min-width:220px;position:relative;">
              <label>Status</label>
              <div class="multi-container" style="position:relative;">
                <button type="button" id="toggle-status" class="toggle-btn" style="width:100%;text-align:left;padding:8px;border:1px solid #ccc;background:#fff;border-radius:4px;">
                  <span id="status-panel-summary">Status</span> <span class="chev" style="float:right;">▾</span>
                </button>
                <div id="status-panel" class="multi-panel" style="display:none;position:absolute;z-index:40;background:#fff;border:1px solid #ddd;padding:8px;border-radius:4px;max-height:200px;overflow:auto;width:100%;">
                  ${renderMultiCheckboxOptions(STATUS_OPTIONS, 'status')}
                </div>
              </div>
            </div>
            
            <div style="min-width:220px;position:relative;">
              <label>Categoria</label>
              <div class="multi-container" style="position:relative;">
                <button type="button" id="toggle-categoria" class="toggle-btn" style="width:100%;text-align:left;padding:8px;border:1px solid #ccc;background:#fff;border-radius:4px;">
                  <span id="categoria-panel-summary">Categoria</span> <span class="chev" style="float:right;">▾</span>
                </button>
                <div id="categoria-panel" class="multi-panel" style="display:none;position:absolute;z-index:40;background:#fff;border:1px solid #ddd;padding:8px;border-radius:4px;max-height:200px;overflow:auto;width:100%;">
                  ${renderMultiCheckboxOptions(CATEGORIA_OPTIONS, 'categoria')}
                </div>
              </div>
            </div>
            
            <div style="width:180px;">
              <label>Período Relativo</label>
              <select id="periodo-relativo" style="width:100%;">
                <option value="">Qualquer período</option>
                <option value="ultima_semana">Última semana</option>
                <option value="ultimo_mes">Último mês</option>
                <option value="ultimos_3_meses">Últimos 3 meses</option>
                <option value="ultimo_ano">Último ano</option>
              </select>
            </div>
            
            <div style="width:180px;">
              <label>Data de criação (de)</label>
              <input type="date" id="buscar-data-inicio" style="width:100%;">
            </div>
            <div style="width:180px;">
              <label>Data de criação (até)</label>
              <input type="date" id="buscar-data-fim" style="width:100%;">
            </div>
          </div>
          
          <div style="display:flex;gap:12px;align-items:center;margin-bottom:8px;flex-wrap:wrap;">
            <div style="width:220px;">
              <label>Ordenar por</label>
              <select id="sort-by" style="width:100%;">
                <option value="data_criacao">Data de criação</option>
                <option value="numero">Número</option>
                <option value="nome_requerente">Nome do requerente</option>
                <option value="cpf">CPF</option>
                <option value="nome_parte_ato">Nome da parte no ato</option>
                <option value="status">Status</option>
                <option value="categoria">Categoria</option>
                <option value="data_retirada">Data de retirada</option>
              </select>
            </div>
            <div style="width:120px;">
              <label>Direção</label>
              <select id="sort-dir" style="width:100%;">
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </div>
            <div style="width:120px;">
              <label>Por página</label>
              <select id="per-page" style="width:100%;">
                <option>10</option>
                <option>25</option>
                <option selected>50</option>
                <option>100</option>
              </select>
            </div>
          </div>

          <!-- Botões centralizados -->
          <div style="display:flex; justify-content: center; gap: 8px; margin-top: 18px; flex-wrap: wrap;">
            <button type="submit" id="btn-buscar">🔍 Buscar</button>
            <button type="button" id="mostrar-todos">📋 Mostrar Todos</button>
            <button type="button" id="limpar-filtros">🗑️ Limpar Filtros</button>
            <button type="button" id="voltar-menu-buscar">← Voltar ao Menu</button>
          </div>
        </form>
        
        <div id="resultados" style="margin-top:20px;"></div>
        <div class="paginacao" id="paginacao-controls" style="display:none;margin-top:12px;">
          <button id="btn-prev">← Anterior</button>
          <span id="paginacao-info" style="margin:0 12px;"></span>
          <button id="btn-next">Próxima →</button>
        </div>
      </div>
    `;
 

    // Carregar filtros salvos
    carregarFiltrosSalvos();

    // Configurar eventos
    document.getElementById('toggle-status').onclick = () => togglePanel('status-panel', 'toggle-status');
    document.getElementById('toggle-categoria').onclick = () => togglePanel('categoria-panel', 'toggle-categoria');
    
    document.getElementById('status-panel').querySelectorAll('input[type=checkbox]').forEach(ch => {
      ch.onchange = () => updatePanelSummary('status-panel-summary', 'status-panel', 'Status');
    });
    
    document.getElementById('categoria-panel').querySelectorAll('input[type=checkbox]').forEach(ch => {
      ch.onchange = () => updatePanelSummary('categoria-panel-summary', 'categoria-panel', 'Categoria');
    });

    document.getElementById("form-busca").onsubmit = function(e) {
      e.preventDefault();
      buscarProtocolo();
    };

    document.getElementById("voltar-menu-buscar").onclick = menuInicial;
    
    document.getElementById("mostrar-todos").onclick = function() {
      document.getElementById('buscar-palavra').value = "";
      document.getElementById('buscar-numero').value = "";
      document.getElementById('buscar-cpf').value = "";
      setCheckedValues('status-panel', []);
      setCheckedValues('categoria-panel', []);
      updatePanelSummary('status-panel-summary', 'status-panel', 'Status');
      updatePanelSummary('categoria-panel-summary', 'categoria-panel', 'Categoria');
      document.getElementById('periodo-relativo').value = "";
      document.getElementById('buscar-data-inicio').value = "";
      document.getElementById('buscar-data-fim').value = "";
      document.getElementById('sort-by').value = "data_criacao";
      document.getElementById('sort-dir').value = "desc";
      document.getElementById('per-page').value = "50";
      buscarProtocolo(1);
    };

    document.getElementById("limpar-filtros").onclick = function() {
      document.getElementById('buscar-palavra').value = "";
      document.getElementById('buscar-numero').value = "";
      document.getElementById('buscar-cpf').value = "";
      setCheckedValues('status-panel', []);
      setCheckedValues('categoria-panel', []);
      updatePanelSummary('status-panel-summary', 'status-panel', 'Status');
      updatePanelSummary('categoria-panel-summary', 'categoria-panel', 'Categoria');
      document.getElementById('periodo-relativo').value = "";
      document.getElementById('buscar-data-inicio').value = "";
      document.getElementById('buscar-data-fim').value = "";
      document.getElementById('sort-by').value = "data_criacao";
      document.getElementById('sort-dir').value = "desc";
      document.getElementById('per-page').value = "50";
    };

    const buscarCpf = document.getElementById("buscar-cpf");
    attachCpfMask(buscarCpf);

    const palavraInput = document.getElementById('buscar-palavra');
    if (palavraInput) palavraInput.addEventListener('input', debounce(() => buscarProtocolo(1), 450));
    
    closeAllPanels();
    return;
  }

  // BLOCO 14.3: EDITAR PROTOCOLO
  if (pagina === 'editar') {
    conteudo.innerHTML = `
      <div class="form-destacado">
        <h2>Editar Protocolo</h2>
        <form id="form-editar-busca" autocomplete="off" style="max-width:900px;">
          <div style="display:flex;gap:12px;flex-wrap:wrap;">
            <div style="width:260px;">
              <label>Número do Protocolo</label>
              <input type="text" id="editar-numero" maxlength="10" inputmode="numeric" pattern="^[0-9]{1,10}$" style="width:100%;">
            </div>
            <div style="width:260px;">
              <label>CPF do Requerente</label>
              <input type="text" id="editar-cpf" maxlength="14" inputmode="numeric" placeholder="000.000.000-00" style="width:100%;">
            </div>
            <div style="margin-left:auto;align-self:flex-end;">
              <button type="submit">🔍 Carregar</button>
              <button type="button" id="voltar-menu-editar">← Voltar ao Menu</button>
              <button type="button" id="btn-whatsapp-mensagem" style="display:none;">💬 Enviar Mensagem WhatsApp</button>
            </div>
          </div>
          <div style="margin-top:8px;color:#666;font-size:0.9em;">
            ⓘ Informe o número do protocolo OU o CPF para buscar
          </div>
        </form>
        <div id="form-editar" style="margin-top:12px;"></div>
      </div>
    `;
    
    attachCpfMask("editar-cpf");
    document.getElementById("form-editar-busca").onsubmit = function(e) {
      e.preventDefault();
      carregarParaEditar();
    };
    document.getElementById("voltar-menu-editar").onclick = menuInicial;
    return;
  }

  // BLOCO 14.4: EXCLUIR PROTOCOLO
  if (pagina === 'excluir') {
    conteudo.innerHTML = `
      <div class="form-destacado">
        <h2>Excluir Protocolo</h2>
        <form id="form-excluir-busca" autocomplete="off" style="max-width:600px;">
          <div style="display:flex;gap:12px;flex-wrap:wrap;">
            <div style="width:260px;">
              <label>Número do Protocolo</label>
              <input type="text" id="excluir-numero" maxlength="10" inputmode="numeric" style="width:100%;">
            </div>
            <div style="width:260px;">
              <label>CPF do Requerente</label>
              <input type="text" id="excluir-cpf" maxlength="14" inputmode="numeric" placeholder="000.000.000-00" style="width:100%;">
            </div>
            <div style="margin-left:auto;align-self:flex-end;">
              <button type="submit">🔍 Carregar</button>
            </div>
            <div style="align-self:flex-end;">
              <button type="button" id="voltar-menu-excluir">← Voltar ao Menu</button>
            </div>
          </div>
        </form>
        <div id="form-excluir" style="margin-top:12px;"></div>
      </div>
    `;
    
    attachCpfMask("excluir-cpf");
    document.getElementById("form-excluir-busca").onsubmit = function(e) {
      e.preventDefault();
      carregarParaExcluir();
    };
    document.getElementById("voltar-menu-excluir").onclick = menuInicial;
    return;
  }

  // BLOCO 14.5: TELA DE ATENÇÃO
  if (pagina === 'atencao') {
    conteudo.innerHTML = `
      <div class="form-destacado">
        <h2>⚠️ Atenção! Protocolos não finalizados há mais de 30 dias</h2>
        <div style="margin-bottom:20px;padding:15px;background:#fff3cd;border:1px solid #ffeaa7;border-radius:6px;">
          <strong>📋 Total de protocolos em atenção:</strong> <span id="total-atencao">Carregando...</span>
        </div>
        <div style="margin-bottom:10px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
          <div>
            <label>Filtrar por categoria:</label>
            <select id="filtro-categoria-atencao" style="width:200px;">
              <option value="">Todas as categorias</option>
              ${CATEGORIA_OPTIONS.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
          </select>
        </div>
        <button onclick="carregarAtencao(1)" style="background:#ffc107;color:#000;">🔄 Atualizar Lista</button>
        <button type="button" id="voltar-menu-atencao">← Voltar ao Menu</button>
      </div>
      <div id="lista-atencao" style="margin-top:12px;"></div>
      <div id="paginacao-atencao" style="margin-top:20px;text-align:center;"></div>
    </div>
  `;
  
  document.getElementById("voltar-menu-atencao").onclick = menuInicial;
  document.getElementById("filtro-categoria-atencao").onchange = function() { 
    carregarAtencao(1); 
  }
  carregarAtencao(1);
  return;
}

// ====================== [BLOCO 14.6: TELA DE EXIGÊNCIAS E PENDENTES] ======================
if (pagina === 'exigencias-pendentes') {
  conteudo.innerHTML = `
    <div class="form-destacado">
      <h2>⚠️ Exigências e Pendentes - Protocolos com Status Pendente ou Exigência</h2>
      <div style="margin-bottom:20px;padding:15px;background:#fff3cd;border:1px solid #ffeaa7;border-radius:6px;">
        <strong>📋 Total de protocolos com exigências/pendências:</strong> <span id="total-exigencias-pendentes">Carregando...</span>
      </div>
      <div style="margin-bottom:10px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
        <div>
          <label>Filtrar por categoria:</label>
          <select id="filtro-categoria-exigencias" style="width:200px;">
            <option value="">Todas as categorias</option>
            ${CATEGORIA_OPTIONS.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label>Filtrar por status:</label>
          <select id="filtro-status-exigencias" style="width:200px;">
            <option value="">Todos os status</option>
            <option value="Pendente">Pendente</option>
            <option value="Exigência">Exigência</option>
          </select>
        </div>
        <button onclick="carregarExigenciasPendentes(1)" style="background:#ff9800;color:white;">🔄 Atualizar Lista</button>
        <button type="button" id="voltar-menu-exigencias">← Voltar ao Menu</button>
      </div>
      <div id="lista-exigencias-pendentes" style="margin-top:12px;"></div>
      <div id="paginacao-exigencias" style="margin-top:20px;text-align:center;"></div>
    </div>
  `;
  
  document.getElementById("voltar-menu-exigencias").onclick = menuInicial;
  document.getElementById("filtro-categoria-exigencias").onchange = function() { 
    carregarExigenciasPendentes(1); 
  }
  document.getElementById("filtro-status-exigencias").onchange = function() { 
    carregarExigenciasPendentes(1); 
  }
  carregarExigenciasPendentes(1);
  return;
}

// ====================== [BLOCO 14.7: CATEGORIAS (SETOR) - APENAS ADMIN] ======================
if (pagina === 'categorias') {
  if (sessao.tipo !== 'admin') {
    mostrarMensagem("Apenas administradores podem acessar categorias.", "erro");
    return;
  }
  gerenciarCategoriasAdmin();
  return;
}
}

// ====================== [BLOCO 15: FILTROS SALVOS] ====================== //
async function carregarFiltrosSalvos() {
  try {
    const sessao = getSessao();
    if (!sessao) return;
    
    const resp = await fetch(`/api/filtros?usuario=${encodeURIComponent(sessao.usuario)}`);
    if (resp.ok) {
      const filtros = await resp.json();
      const select = document.getElementById('select-filtros-salvos');
      
      // Limpar options existentes (exceto a primeira)
      while (select.options.length > 1) {
        select.remove(1);
      }
      
      // Adicionar novos filtros
      filtros.forEach(filtro => {
        const option = document.createElement('option');
        option.value = filtro.id;
        option.textContent = `${filtro.nome} (${new Date(filtro.data_atualizacao).toLocaleDateString('pt-BR')})`;
        select.appendChild(option);
      });
    }
  } catch (err) {
    console.error('Erro ao carregar filtros salvos:', err);
  }
}

async function salvarFiltroAtual() {
  const nome = document.getElementById('nome-filtro').value.trim();
  if (!nome) {
    mostrarMensagem('Digite um nome para o filtro', 'erro');
    return;
  }
  
  const filtros = {
    palavra: document.getElementById('buscar-palavra').value,
    numero: document.getElementById('buscar-numero').value,
    cpf: document.getElementById('buscar-cpf').value,
    status: getCheckedValues('status-panel'),
    categoria: getCheckedValues('categoria-panel'),
    periodo_relativo: document.getElementById('periodo-relativo').value,
    data_inicio: document.getElementById('buscar-data-inicio').value,
    data_fim: document.getElementById('buscar-data-fim').value,
    sort_by: document.getElementById('sort-by').value,
    sort_dir: document.getElementById('sort-dir').value,
    per_page: document.getElementById('per-page').value
  };
  
  try {
    const sessao = getSessao();
    const resp = await fetchWithAuth('/api/filtros/salvar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: nome,
        filtros: filtros,
        usuario: sessao.usuario
      })
    });
    
    if (resp.ok) {
      mostrarMensagem(`Filtro "${nome}" salvo com sucesso!`, 'sucesso');
      document.getElementById('nome-filtro').value = '';
      carregarFiltrosSalvos();
    } else {
      mostrarMensagem('Erro ao salvar filtro', 'erro');
    }
  } catch (err) {
    mostrarMensagem('Falha ao salvar filtro', 'erro');
  }
}

async function carregarFiltroSalvo() {
  const select = document.getElementById('select-filtros-salvos');
  const filtroId = select.value;
  if (!filtroId) return;
  
  try {
    const sessao = getSessao();
    const resp = await fetchWithAuth(`/api/filtros?usuario=${encodeURIComponent(sessao.usuario)}`);
    if (resp.ok) {
      const filtros = await resp.json();
      const filtro = filtros.find(f => f.id === filtroId);
      
      if (filtro) {
        // Aplicar filtros
        document.getElementById('buscar-palavra').value = filtro.filtros.palavra || '';
        document.getElementById('buscar-numero').value = filtro.filtros.numero || '';
        document.getElementById('buscar-cpf').value = filtro.filtros.cpf || '';
        
        setCheckedValues('status-panel', filtro.filtros.status || []);
        setCheckedValues('categoria-panel', filtro.filtros.categoria || []);
        updatePanelSummary('status-panel-summary', 'status-panel', 'Status');
        updatePanelSummary('categoria-panel-summary', 'categoria-panel', 'Categoria');
        
        document.getElementById('periodo-relativo').value = filtro.filtros.periodo_relativo || '';
        document.getElementById('buscar-data-inicio').value = filtro.filtros.data_inicio || '';
        document.getElementById('buscar-data-fim').value = filtro.filtros.data_fim || '';
        document.getElementById('sort-by').value = filtro.filtros.sort_by || 'data_criacao';
        document.getElementById('sort-dir').value = filtro.filtros.sort_dir || 'desc';
        document.getElementById('per-page').value = filtro.filtros.per_page || '50';
        
        mostrarMensagem(`Filtro "${filtro.nome}" aplicado!`, 'sucesso');
        buscarProtocolo(1);
      }
    }
  } catch (err) {
    mostrarMensagem('Erro ao carregar filtro', 'erro');
  }
}

// ====================== [BLOCO 16: HELPERS PARA ABRIR BUSCA COM FILTROS] ====================== //
function openBuscarWithFilters({ statuses = [], categories = [], periodos = [], page = 1, perPage = 50, sortBy = "data_criacao", sortDir = "desc" } = {}) {
  navegar('buscar');
  setTimeout(() => {
    setCheckedValues('status-panel', statuses || []);
    setCheckedValues('categoria-panel', categories || []);
    updatePanelSummary('status-panel-summary', 'status-panel', 'Status');
    updatePanelSummary('categoria-panel-summary', 'categoria-panel', 'Categoria');
    
    const perPageEl = document.getElementById('per-page');
    const sortByEl = document.getElementById('sort-by');
    const sortDirEl = document.getElementById('sort-dir');
    const periodoEl = document.getElementById('periodo-relativo');
    
    if (perPageEl) perPageEl.value = String(perPage || 50);
    if (sortByEl) sortByEl.value = sortBy || 'data_criacao';
    if (sortDirEl) sortDirEl.value = sortDir || 'desc';
    if (periodoEl && periodos.length > 0) periodoEl.value = periodos[0] || '';
    
    buscarProtocolo(page);
    closeAllPanels();
  }, 150);
}

function editarFromBusca(numero) {
  // garantir que preview seja escondido antes de navegar
  try { hidePreview(); } catch (e) {}
  if (!numero) return;
  navegar('editar');
  setTimeout(() => {
    const el = document.getElementById('editar-numero');
    if (el) {
      el.value = String(numero || "");
      carregarParaEditar();
    }
  }, 200);
}

// ====================== [BLOCO 17: FUNÇÃO PRINCIPAL DE BUSCA] ====================== //
async function buscarProtocolo(pageOverride) {
  const palavraEl = document.getElementById('buscar-palavra');
  const numeroEl = document.getElementById('buscar-numero');
  const cpfEl = document.getElementById('buscar-cpf');
  const dataInicioEl = document.getElementById('buscar-data-inicio');
  const dataFimEl = document.getElementById('buscar-data-fim');
  const periodoRelativoEl = document.getElementById('periodo-relativo');
  const sortByEl = document.getElementById('sort-by');
  const sortDirEl = document.getElementById('sort-dir');
  const perPageEl = document.getElementById('per-page');
  
  const palavra = palavraEl ? palavraEl.value.trim() : '';
  const numero = numeroEl ? numeroEl.value.trim() : '';
  const cpf = cpfEl ? cpfEl.value.trim() : '';
  const dataInicio = dataInicioEl ? dataInicioEl.value : '';
  const dataFim = dataFimEl ? dataFimEl.value : '';
  const periodoRelativo = periodoRelativoEl ? periodoRelativoEl.value : '';
  const sortBy = sortByEl ? sortByEl.value : 'data_criacao';
  const sortDir = sortDirEl ? sortDirEl.value : 'desc';
  const perPage = perPageEl ? parseInt(perPageEl.value, 10) : 50;
  
  const statusOptions = getCheckedValues('status-panel');
  const categoriaOptions = getCheckedValues('categoria-panel');
  
  const params = new URLSearchParams();
  if (palavra) params.append('q', palavra);
  if (numero) params.append('numero', numero);
  if (cpf) params.append('cpf', somenteDigitos(cpf));
  if (statusOptions && statusOptions.length) statusOptions.forEach(s => params.append('status', s));
  if (categoriaOptions && categoriaOptions.length) categoriaOptions.forEach(c => params.append('categoria', c));
  if (dataInicio) params.append('data_inicio', dataInicio);
  if (dataFim) params.append('data_fim', dataFim);
  if (periodoRelativo) params.append('periodo_relativo', periodoRelativo);
  
  params.append('page', String(pageOverride || 1));
  params.append('per_page', String(perPage));
  params.append('sort_by', sortBy);
  params.append('sort_dir', sortDir);
  
  // Usar aggregation para melhor performance quando há muitos filtros
  if (statusOptions.length > 0 || categoriaOptions.length > 0 || palavra || periodoRelativo) {
    params.append('use_aggregation', 'true');
  }
  
  const url = '/api/protocolo?' + params.toString();
  
  try {
    mostrarLoader("Buscando protocolos...");
    const resp = await fetchWithAuth(url);
    esconderLoader();
    
    if (!resp.ok) {
      document.getElementById('resultados').innerHTML = '<div class="erro-busca">Erro na busca. Tente novamente.</div>';
      return;
    }
    
    const dados = await resp.json();
    const items = dados.items || [];
    const resultadosEl = document.getElementById('resultados');
    
    if (!items.length) {
      resultadosEl.innerHTML = `
        <div style="text-align:center;padding:40px;color:#666;">
          <div style="font-size:48px;margin-bottom:16px;">🔍</div>
          <h3>Nenhum protocolo encontrado</h3>
          <p>Tente ajustar os filtros de busca.</p>
        </div>
      `;
    } else {
      let html = '';
      items.forEach(p => {
        html += `
          <div class="protocolo-card" style="border:1px solid #e0e0e0;border-radius:8px;margin-bottom:16px;background:white;overflow:hidden;">
            <div style="background:#f8f9fa;padding:12px;border-bottom:1px solid #e0e0e0;">
              <div style="display:flex;justify-content:between;align-items:center;flex-wrap:wrap;gap:8px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <strong style="font-size:1.1em;">Protocolo: ${esc(p.numero)}</strong>
                  ${renderStatusBadge(p.status)}
                </div>
                <div style="margin-left:auto;display:flex;gap:8px;">
                  <button type="button" class="result-action-btn" onclick="verHistoricoBusca('${p.id}', this)">📋 Histórico</button>
                  <button type="button" class="result-action-btn" onclick="try{hidePreview();}catch(e){}; editarFromBusca('${esc(p.numero)}')">✏️ Editar</button>
                </div>
              </div>
            </div>
            
            <div style="padding:16px;">
              <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:16px;">
                <div>
                  <div style="margin-bottom:12px;">
                    <strong>👤 Requerente:</strong> ${esc(p.nome_requerente)}<br>
                    <strong>🔢 CPF:</strong> ${esc(formatCpf(p.cpf))}<br>
                    <strong>📝 Título:</strong> ${esc(p.titulo)}
                  </div>
                  <div>
                    <strong>🏷️ Categoria:</strong> ${esc(p.categoria)}<br>
                    <strong>👥 Responsável:</strong> ${esc(p.responsavel)}<br>
                    <strong>📅 Data Criação:</strong> ${esc(formatDateYMDToBR(p.data_criacao || ""))}
                  </div>
                </div>
                
                <div>
                  <div style="margin-bottom:12px;">
                    <strong>👤 Nome da Parte:</strong> ${esc(p.nome_parte_ato || "—")}<br>
                    <strong>🏛️ Cartório/Info:</strong> ${esc(p.outras_infos || "—")}
                  </div>
                  <div>
                    <strong>📤 Retirado por:</strong> ${esc(p.retirado_por || "—")}<br>
                    <strong>📅 Data Retirada:</strong> ${esc(formatDateYMDToBR(p.data_retirada || ""))}<br>
                    <strong>🕒 Última Alteração:</strong> ${esc(p.ultima_alteracao_data ? formatUtcToLocal(p.ultima_alteracao_data) : "—")} por ${esc(p.ultima_alteracao_nome || "—")}
                  </div>
                </div>
              </div>
              
              ${p.observacoes ? `
                <div style="margin-top:12px;padding:12px;background:#f8f9fa;border-radius:4px;">
                  <strong>📋 Observações:</strong><br>
                  <div style="margin-top:4px;">${escMultiline(p.observacoes)}</div>
                </div>
              ` : ''}
              
              <div id="historico-row-${p.id}" style="display:none;margin-top:12px;">
                <div id="historico-busca-${p.id}" style="padding:12px;background:#f8f9fa;border-radius:4px;"></div>
              </div>
            </div>
          </div>
        `;
      });
      resultadosEl.innerHTML = html;
    }
    
    const controls = document.getElementById("paginacao-controls");
    const info = document.getElementById("paginacao-info");
    
    if (dados.total > 0) {
      controls.style.display = "flex";
      controls.style.justifyContent = "center";
      controls.style.alignItems = "center";
      controls.style.gap = "12px";
      
      info.textContent = `Página ${dados.page} de ${dados.pages} — ${dados.total} registro${dados.total !== 1 ? 's' : ''}`;
      
      const btnPrev = document.getElementById("btn-prev");
      const btnNext = document.getElementById("btn-next");
      
      btnPrev.disabled = dados.page <= 1;
      btnNext.disabled = dados.page >= dados.pages;
      
      btnPrev.onclick = () => buscarProtocolo(dados.page - 1);
      btnNext.onclick = () => buscarProtocolo(dados.page + 1);
    } else {
      controls.style.display = "none";
    }
  } catch (err) {
    esconderLoader();
    document.getElementById('resultados').innerHTML = `
      <div class="erro-busca">
        <div style="text-align:center;padding:40px;color:#dc3545;">
          <div style="font-size:48px;margin-bottom:16px;">❌</div>
          <h3>Falha na conexão</h3>
          <p>Não foi possível conectar ao servidor.</p>
        </div>
      </div>
    `;
  }
}

// ====================== [BLOCO 18: HISTÓRICO INLINE] ====================== //
async function verHistoricoBusca(id, botaoRef) {
  const row = document.getElementById(`historico-row-${id}`);
  const box = document.getElementById(`historico-busca-${id}`);
  
  if (!row || !box) return;
  
  // Toggle visibilidade
  if (row.style.display === "none") {
    row.style.display = "block";
    botaoRef.textContent = "📋 Ocultar Histórico";
    box.innerHTML = "<div style='text-align:center;padding:20px;color:#666;'><div class='loader' style='width:20px;height:20px;margin:0 auto 8px;'></div>Carregando histórico...</div>";
    
    try {
      const resp = await fetchWithAuth(`/api/protocolo/${encodeURIComponent(id)}/historico`);
      if (!resp.ok) {
        box.innerHTML = "<div style='color:#dc3545;text-align:center;'>Erro ao carregar histórico.</div>";
        return;
      }
      
      const hist = await resp.json();
      if (!hist.length) {
        box.innerHTML = "<div style='text-align:center;color:#666;font-style:italic;'>Sem histórico de alterações.</div>";
        return;
      }
      
      let html = `<div class="timeline" style="margin:0;">`;
      hist.forEach((h, index) => {
        const isFirst = index === 0;
        html += `
          <div class="timeline-event" style="margin-bottom: ${isFirst ? '16px' : '12px'};">
            <div class="timeline-circle"></div>
            <div>
              <span class="timeline-label ${h.acao}">${esc(h.acao)}</span>
              <span class="timeline-user">por ${esc(h.usuario)}</span>
              <span class="timeline-date">${esc(formatUtcToLocal(h.timestamp))}</span>
              
              ${Array.isArray(h.changes) && h.changes.length ? `
                <div style="margin-top:8px;background:white;padding:8px;border-radius:4px;">
                  <strong>Alterações:</strong>
                  <ul style="margin:4px 0 0 0;padding-left:16px;">
                    ${h.changes.map(ch => `
                      <li style="margin-bottom:4px;">
                        <code style="background:#f1f3f4;padding:2px 4px;border-radius:2px;font-size:0.9em;">${esc(ch.campo)}</code>: 
                        "<span style="color:#d32f2f;">${esc(ch.de || '—')}</span>" → 
                        "<span style="color:#388e3c;">${esc(ch.para || '—')}</span>"
                      </li>
                    `).join('')}
                  </ul>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      });
      html += `</div>`;
      box.innerHTML = html;
    } catch {
      box.innerHTML = "<div style='color:#dc3545;text-align:center;'>Falha ao carregar histórico.</div>";
    }
  } else {
    row.style.display = "none";
    botaoRef.textContent = "📋 Ver Histórico";
  }
}

// ====================== [BLOCO 19: BUSCA ÚNICA DE PROTOCOLO - HELPER] ====================== //
async function findOneProtocolo({ numero = '', cpf = '' } = {}) {
  let url = '/api/protocolo';

  const params = new URLSearchParams();
  if (numero) params.append('numero', String(numero).trim());
  if (cpf) params.append('cpf', somenteDigitos(cpf));

  const qs = params.toString();
  if (qs) url += '?' + qs;

  const resp = await fetchWithAuth(url);
  if (!resp.ok) return null;

  const dados = await resp.json().catch(() => ({}));
  const items = (dados && dados.items) || [];
  return items.length ? items[0] : null;
}

// ====================== [BLOCO 20: CARREGAR PARA EDITAR / MONTAR FORMULÁRIO] ====================== //
async function carregarParaEditar() {
  const numero = document.getElementById('editar-numero') ? document.getElementById('editar-numero').value.trim() : '';
  const cpf = document.getElementById('editar-cpf') ? document.getElementById('editar-cpf').value.trim() : '';
  
  if (!numero && !cpf) {
    mostrarMensagem('Informe o número do protocolo OU o CPF!', 'erro');
    return;
  }
  
  mostrarLoader("Carregando protocolo...");
  try {
    const p = await findOneProtocolo({ numero, cpf });
    esconderLoader();
    
    if (!p) {
      mostrarMensagem('Protocolo não encontrado!', 'erro');
      return;
    }
    
    montarFormularioEditar(p);
  } catch {
    esconderLoader();
    mostrarMensagem('Erro ao carregar protocolo.', 'erro');
  }
}

function montarFormularioEditar(p) {
  let sessao = getSessao();
  const isAdmin = (sessao && sessao.tipo === 'admin');
  
  // Show WhatsApp button in the top section
  const whatsappBtn = document.getElementById('btn-whatsapp-mensagem');
  if (whatsappBtn) {
    whatsappBtn.style.display = 'inline-block';
    
    // Set up WhatsApp button handler
    whatsappBtn.onclick = function() {
      // Validate required fields before sending
      if (!p.numero || !p.nome_requerente) {
        mostrarMensagem('Protocolo ou nome do requerente não está disponível.', 'erro');
        return;
      }
      
      const numero = p.numero;
      const nomeRequerente = p.nome_requerente;
      const titulo = p.titulo || 'Não informado';
      const status = p.status || 'Não informado';
      const whatsappNumber = p.whatsapp || '';
      
      // Format the message
      const mensagem = encodeURIComponent(
        `📋 *Protocolo ${numero}*\n\n` +
        `👤 Requerente: ${nomeRequerente}\n` +
        `📄 Assunto: ${titulo}\n` +
        `📊 Status: ${status}\n\n` +
        `Para mais informações, entre em contato com nosso atendimento.`
      );
      
      // Open WhatsApp Web with the message
      // If phone number is provided, send directly to that number
      const whatsappUrl = whatsappNumber 
        ? `https://web.whatsapp.com/send?phone=${encodeURIComponent(whatsappNumber.replace(/\D/g, ''))}&text=${mensagem}`
        : `https://web.whatsapp.com/send?text=${mensagem}`;
      
      window.open(whatsappUrl, '_blank');
    };
  }
  
  // Verificar se há exigências preenchidas
  const hasExigData = (i) => {
    const rp = (p[`exig${i}_retirada_por`] || "").trim();
    const dr = (p[`exig${i}_data_retirada`] || "").trim();
    const repp = (p[`exig${i}_reapresentada_por`] || "").trim();
    const dra = (p[`exig${i}_data_reapresentacao`] || "").trim();
    return !!(rp || dr || repp || dra);
  };

  const temExigenciaPreenchida = hasExigData(1) || hasExigData(2) || hasExigData(3);

  document.getElementById('form-editar').innerHTML = `
    <form id="form-editar-protocolo" autocomplete="off" style="max-width:1000px;">
      <div style="background:#e8f5e8;padding:12px;border-radius:6px;margin-bottom:16px;border:1px solid #c8e6c9;">
        <strong>📋 Editando Protocolo:</strong> ${esc(p.numero)} | <strong>👤 Requerente:</strong> ${esc(p.nome_requerente)} | <strong>🔢 CPF:</strong> ${esc(formatCpf(p.cpf))}
      </div>
      
      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        <div style="flex:1;min-width:180px;">
          <label>Número do Protocolo *</label>
          <input type="text" id="editar-numero-protocolo" name="numero" value="${esc(p.numero)}" 
                 maxlength="5" minlength="5" pattern="^\\d{5}$" required 
                 ${isAdmin ? '' : 'readonly'} style="width:100%;">
          <div id="editar-numero-protocolo-feedback" class="campo-feedback"></div>
        </div>
        <div style="width:180px;">
          <label>Data de Criação *</label>
          <input type="date" id="editar-data-criacao" name="data_criacao" value="${esc(p.data_criacao)}" required style="width:100%;">
        </div>
        <div style="flex:1;min-width:200px;">
          <label>Responsável Pelo Pt. *</label>
          <input type="text" id="editar-responsavel" name="responsavel" value="${esc(p.responsavel)}" readonly style="width:100%;">
        </div>
      </div>
      
      <div style="display:flex;gap:12px;margin-top:8px;flex-wrap:wrap;">
        <div style="flex:1;min-width:220px;">
          <label>Nome do Requerente *</label>
          <input type="text" id="editar-nome-requerente" name="nome_requerente" value="${esc(p.nome_requerente)}" maxlength="60" required style="width:100%;">
        </div>
        <div style="width:180px;">
          <label>CPF *</label>
          <input type="text" id="cpf-editar" name="cpf" value="${esc(formatCpf(p.cpf))}" maxlength="14" required style="width:100%;">
          <div id="cpf-editar-feedback" class="campo-feedback hint">Informe 11 dígitos</div>
        </div>
        <div style="width:180px;">
          <label>WhatsApp</label>
          <input type="text" id="whatsapp-editar" name="whatsapp" value="${esc(p.whatsapp || '')}" maxlength="15" 
                 inputmode="numeric" placeholder="(00) 00000-0000" style="width:100%;">
        </div>
        <div style="width:180px;">
          <label>Categoria *</label>
          <select id="editar-categoria" name="categoria" required style="width:100%;">
            ${CATEGORIA_OPTIONS.map(c => `<option${p.categoria === c ? ' selected' : ''}>${esc(c)}</option>`).join('')}
          </select>
        </div>
        <div style="width:180px;">
          <label>Status *</label>
          <select id="editar-status" name="status" required style="width:100%;">
            ${STATUS_OPTIONS.map(s => `<option${p.status === s ? ' selected' : ''}>${esc(s)}</option>`).join('')}
          </select>
        </div>
      </div>
      
      <div style="display:flex;gap:12px;margin-top:8px;flex-wrap:wrap;">
        <div style="flex:1;min-width:200px;">
          <label>Nome da parte no ato</label>
          <input type="text" id="editar-nome-parte-ato" name="nome_parte_ato" value="${esc(p.nome_parte_ato || '')}" maxlength="120" style="width:100%;">
        </div>
        <div style="flex:1;min-width:250px;">
          <label>Título/Assunto *</label>
          <input type="text" id="editar-titulo" name="titulo" value="${esc(p.titulo)}" maxlength="120" required style="width:100%;">
        </div>
        <div style="flex:1;min-width:250px;">
          <label>Outras Informações / Cartorio do Ato Original</label>
          <input type="text" id="editar-outras-infos" name="outras_infos" value="${esc(p.outras_infos || '')}" maxlength="120" style="width:100%;">
        </div>
      </div>
      
      <div style="margin-top:8px;">
        <label>Observações/Exigências</label>
        <textarea id="editar-observacoes" name="observacoes" maxlength="8240" style="width:100%;height:120px;">${esc(brToNewline(p.observacoes || ""))}</textarea>
      </div>
      
      <!-- BOTÃO PARA INCLUIR EXIGÊNCIA -->
      <div style="margin-top:16px;text-align:center;">
        <button type="button" id="btn-incluir-exigencia" 
                style="background:#ff9800;color:white;border:none;padding:12px 24px;border-radius:8px;font-weight:600;cursor:pointer;font-size:1.1em;">
          📝 Incluir Exigência
        </button>
        <div style="color:#666;font-size:0.9em;margin-top:8px;">
          Clique para adicionar informações sobre exigências do protocolo
        </div>
      </div>
      
      <!-- EXIGÊNCIAS (inicialmente oculto) -->
      <div id="container-exigencias" style="display:${temExigenciaPreenchida ? 'block' : 'none'};margin-top:16px;padding:16px;border:2px solid #e3e8ee;border-radius:8px;background:#fafbfd;">
        <div style="font-weight:600;color:#d32f2f;margin-bottom:12px;font-size:1.1em;">
          ⚠️ Exigências (após salvar, somente administradores poderão alterar estes campos)
        </div>
        
        ${[1, 2, 3].map(i => {
          const bloqueado = hasExigData(i) && !isAdmin;
          return `
            <div style="margin-bottom:20px;padding:12px;background:white;border-radius:6px;border:1px solid #e0e0e0;">
              <div style="font-weight:600;margin-bottom:8px;color:#1976d2;">${i}ª Exigência</div>
              <div style="display:flex;gap:12px;margin-top:8px;flex-wrap:wrap;">
                <div style="flex:1;min-width:200px;">
                  <label>Exigência retirada por</label>
                  <input type="text" id="exig${i}-retirada-por" name="exig${i}_retirada_por" 
                         maxlength="60" value="${esc(p[`exig${i}_retirada_por`] || '')}" 
                         ${bloqueado ? 'disabled' : ''} style="width:100%;">
                </div>
                <div style="width:220px;">
                  <label>Data da Retirada</label>
                  <input type="date" id="exig${i}-data-retirada" name="exig${i}_data_retirada" 
                         value="${esc(p[`exig${i}_data_retirada`] || '')}" 
                         ${bloqueado ? 'disabled' : ''} style="width:100%;">
                </div>
              </div>
              <div style="display:flex;gap:12px;margin-top:8px;flex-wrap:wrap;">
                <div style="flex:1;min-width:200px;">
                  <label>Reapresentada por</label>
                  <input type="text" id="exig${i}-reapresentada-por" name="exig${i}_reapresentada_por" 
                         maxlength="60" value="${esc(p[`exig${i}_reapresentada_por`] || '')}" 
                         ${bloqueado ? 'disabled' : ''} style="width:100%;">
                </div>
                <div style="width:220px;">
                  <label>Data da Reapresentação</label>
                  <input type="date" id="exig${i}-data-reapresentacao" name="exig${i}_data_reapresentacao" 
                         value="${esc(p[`exig${i}_data_reapresentacao`] || '')}" 
                         ${bloqueado ? 'disabled' : ''} style="width:100%;">
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      
      <div style="margin-top:12px;">
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <div style="flex:1;min-width:250px;">
            <label style="color:#006400;">Finalizado e Retirado por:</label>
            <input type="text" id="editar-retirado-por" name="retirado_por" value="${esc(p.retirado_por || '')}" maxlength="60" style="width:100%;">
          </div>
          <div style="width:220px;">
            <label style="color:#006400;">Data de retirada</label>
            <input type="date" id="editar-data-retirada" name="data_retirada" value="${esc(p.data_retirada || '')}" style="width:100%;">
          </div>
          <div style="width:240px;">
            <label style="color:#006400;">Última alteração por</label>
            <input type="text" id="editar-ultima-alteracao-nome" name="ultima_alteracao_nome" value="${esc(sessao.usuario)}" readonly style="width:100%;">
          </div>
        </div>
      </div>
      
      <div style="margin-top:20px;display:flex;gap:12px;flex-wrap:wrap;">
        <button type="submit" id="btn-salvar-editar">💾 Salvar Alterações</button>
        <button type="button" id="voltar-menu-editar-form">← Voltar ao Menu</button>
        <button type="button" onclick="this.form.reset();">🔄 Limpar</button>
        <button type="button" id="btn-ver-historico">📋 Ver histórico</button>
      </div>
    </form>
    <div id="historico-lista" style="margin-top:20px;"></div>
  `;

  // Configurar validações
  const obsEl = document.getElementById('editar-observacoes');
  if (obsEl) {
    obsEl.value = brToNewline(p.observacoes || "");
  }

  // Validação do número do protocolo
  const editarNumeroInput = document.getElementById("editar-numero-protocolo");
  const editarNumeroFeedback = document.getElementById("editar-numero-protocolo-feedback");
  const btnSalvarEditar = document.getElementById("btn-salvar-editar");
  
  if (editarNumeroInput && isAdmin) {
    editarNumeroInput.addEventListener("input", () => {
      const val = editarNumeroInput.value.trim();
      if (/^\d{5}$/.test(val)) {
        editarNumeroFeedback.textContent = "Número válido.";
        editarNumeroFeedback.className = "campo-feedback ok";
        btnSalvarEditar.disabled = false;
      } else {
        editarNumeroFeedback.textContent = "O número do protocolo deve conter exatamente 5 dígitos.";
        editarNumeroFeedback.className = "campo-feedback erro";
        btnSalvarEditar.disabled = true;
      }
    });
    editarNumeroInput.dispatchEvent(new Event("input"));
  }

  // Configurar CPF
  const cpfInput = document.getElementById("cpf-editar");
  const feedback = document.getElementById("cpf-editar-feedback");
  setupCpfInput(cpfInput, feedback);

  // ADICIONAR EVENTO PARA O BOTÃO DE INCLUIR EXIGÊNCIA
  document.getElementById("btn-incluir-exigencia").onclick = function() {
    // esconder preview caso esteja aberto
    try { hidePreview(); } catch (e) {}
    const container = document.getElementById("container-exigencias");
    container.style.display = "block";
    this.style.display = "none"; // Oculta o botão após clicar
  };

  // Se já tem exigência preenchida, oculta o botão
  if (temExigenciaPreenchida) {
    document.getElementById("btn-incluir-exigencia").style.display = "none";
  }

  document.getElementById("form-editar-protocolo").onsubmit = async function(e) {
    e.preventDefault();
    
    // Validação do número do protocolo
    const numeroEl = document.getElementById("editar-numero-protocolo");
    const numeroValue = numeroEl.value.trim();
    if (!/^\d{5}$/.test(numeroValue)) {
      mostrarMensagem("O número do protocolo deve conter exatamente 5 dígitos.", "erro");
      return;
    }
    
    const camposObrigatorios = ["editar-data-criacao","editar-nome-requerente","cpf-editar","editar-titulo","editar-status","editar-categoria"];
    if (!validarCamposObrigatorios(camposObrigatorios)) {
      mostrarMensagem("Preencha todos os campos obrigatórios.", "erro");
      return;
    }
    
    // Validar exigências (apenas se o container estiver visível)
    const containerExigencias = document.getElementById("container-exigencias");
    if (containerExigencias.style.display !== "none") {
      for (let i = 1; i <= 3; i++) {
        const rpEl = document.getElementById(`exig${i}-retirada-por`);
        const drEl = document.getElementById(`exig${i}-data-retirada`);
        
        if (rpEl && !rpEl.disabled) {
          const rp = (rpEl.value || "").trim();
          const dr = (drEl.value || "").trim();
          
          if ((rp && !dr) || (!rp && dr)) {
            mostrarMensagem(`Para a ${i}ª Exigência: preencha "Exigência retirada por" e "Data da Retirada".`, "erro");
            return;
          }
          
          const reppEl = document.getElementById(`exig${i}-reapresentada-por`);
          const draEl = document.getElementById(`exig${i}-data-reapresentacao`);
          const repp = (reppEl.value || "").trim();
          const dra = (draEl.value || "").trim();
          
          if ((repp && !dra) || (!repp && dra)) {
            mostrarMensagem(`Para a ${i}ª Exigência: preencha "Reapresentada por" e "Data da Reapresentação".`, "erro");
            return;
          }
        }
      }
    }
    
    let dados = Object.fromEntries(new FormData(e.target).entries());
    delete dados.responsavel;
    dados.cpf = somenteDigitos(dados.cpf);
    
    // Validar retirada
    const rp = (dados.retirado_por || "").trim();
    const dr = (dados.data_retirada || "").trim();
    if ((rp && !dr) || (!rp && dr)) {
      mostrarMensagem("Para registrar retirada, preencha o nome de quem retirou e a data da retirada.", "erro");
      return;
    }
    
    dados["ultima_alteracao_nome"] = sessao.usuario;
    mostrarLoader("Salvando alterações...");
    
    try {
      const resp = await fetchWithAuth('/api/protocolo/' + p.id, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(dados)
      });
      
      esconderLoader();
      if (resp.ok) {
        mostrarMensagem('Alterações salvas com sucesso!', 'sucesso');
        navegar('editar');
      } else {
        const erro = await resp.json().catch(() => ({}));
        mostrarMensagem(erro.detail || 'Erro ao salvar alterações!', 'erro');
      }
    } catch {
      esconderLoader();
      mostrarMensagem('Falha ao conectar ao servidor.', 'erro');
    }
  };
  
  document.getElementById("btn-ver-historico").onclick = () => verHistorico(p.id);
  document.getElementById("voltar-menu-editar-form").onclick = menuInicial;
}

// ====================== [BLOCO 21: HISTÓRICO DETALHADO] ====================== //
async function verHistorico(id) {
  const historicoLista = document.getElementById('historico-lista');
  if (!historicoLista) return;

  historicoLista.innerHTML = '<div style="text-align:center;padding:20px;"><div class="loader"></div><p>Carregando histórico...</p></div>';

  try {
    const resp = await fetchWithAuth(`/api/protocolo/${encodeURIComponent(id)}/historico`);
    if (!resp.ok) {
      historicoLista.innerHTML = '<div style="color:#dc3545;text-align:center;">Erro ao carregar histórico.</div>';
      return;
    }

    const hist = await resp.json();
    if (!hist.length) {
      historicoLista.innerHTML = '<div style="text-align:center;color:#666;font-style:italic;">Sem histórico de alterações.</div>';
      return;
    }

    let html = `
      <div style="background:white;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
        <div style="background:#f8f9fa;padding:12px;border-bottom:1px solid #e0e0e0;">
          <h3 style="margin:0;">📋 Histórico de Alterações</h3>
        </div>
        <div style="padding:16px;">
    `;

    hist.forEach((h, index) => {
      const isFirst = index === 0;
      html += `
        <div class="timeline-event" style="margin-bottom: ${isFirst ? '20px' : '16px'};padding-bottom:16px;border-bottom:${index < hist.length - 1 ? '1px solid #f0f0f0' : 'none'};">
          <div class="timeline-circle"></div>
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <span class="timeline-label ${h.acao}" style="font-weight:600;font-size:1.1em;">${esc(h.acao)}</span>
              <span class="timeline-user" style="color:#666;">por ${esc(h.usuario)}</span>
              <span class="timeline-date" style="color:#999;font-size:0.9em;">${esc(formatUtcToLocal(h.timestamp))}</span>
            </div>
            
            ${Array.isArray(h.changes) && h.changes.length ? `
              <div style="background:#f8f9fa;padding:12px;border-radius:6px;">
                <strong style="display:block;margin-bottom:8px;">Alterações realizadas:</strong>
                <div style="display:grid;gap:6px;">
                  ${h.changes.map(ch => `
                    <div style="display:flex;align-items:flex-start;gap:8px;padding:6px;background:white;border-radius:4px;">
                      <div style="flex-shrink:0;">
                        <code style="background:#e9ecef;padding:4px 8px;border-radius:4px;font-size:0.85em;font-weight:600;">${esc(ch.campo)}</code>
                      </div>
                      <div style="flex:1;min-width:0;">
                        <div style="color:#dc3545;font-size:0.9em;word-break:break-word;">
                          <strong>De:</strong> ${esc(ch.de || '—')}
                        </div>
                        <div style="color:#28a745;font-size:0.9em;word-break:break-word;">
                          <strong>Para:</strong> ${esc(ch.para || '—')}
                        </div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : `
              <div style="color:#666;font-style:italic;">
                ${h.acao === 'criar' ? 'Protocolo criado' : 'Nenhuma alteração de campo detectada'}
              </div>
            `}
          </div>
        </div>
      `;
    });

    html += `</div></div>`;
    historicoLista.innerHTML = html;
  } catch {
    historicoLista.innerHTML = '<div style="color:#dc3545;text-align:center;">Falha ao carregar histórico.</div>';
  }
}

// ====================== [BLOCO 22: CARREGAR PARA EXCLUIR] ====================== //
async function carregarParaExcluir() {
  const numero = document.getElementById('excluir-numero') ? document.getElementById('excluir-numero').value.trim() : '';
  const cpf = document.getElementById('excluir-cpf') ? document.getElementById('excluir-cpf').value.trim() : '';
  
  if (!numero && !cpf) {
    mostrarMensagem('Informe o número do protocolo OU o CPF!', 'erro');
    return;
  }

  mostrarLoader("Buscando protocolo...");
  try {
    const p = await findOneProtocolo({ numero, cpf });
    esconderLoader();
    
    if (!p) {
      mostrarMensagem('Protocolo não encontrado!', 'erro');
      return;
    }

    let sessao = getSessao();
    const podeExcluir = sessao.tipo === "admin";

    document.getElementById('form-excluir').innerHTML = `
      <div style="background:white;border:1px solid #e0e0e0;border-radius:8px;padding:20px;">
        <div style="background:#fff3cd;padding:12px;border-radius:6px;border:1px solid #ffeaa7;margin-bottom:16px;">
          <strong>⚠️ Atenção:</strong> Esta ação marcará o protocolo como excluído. A operação é reversível apenas por administradores.
        </div>
        
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(250px, 1fr));gap:16px;margin-bottom:20px;">
          <div>
            <strong>🔢 Número:</strong> ${esc(p.numero)}<br>
            <strong>👤 Requerente:</strong> ${esc(p.nome_requerente)}<br>
            <strong>📝 Título:</strong> ${esc(p.titulo)}
          </div>
          <div>
            <strong>🏷️ Categoria:</strong> ${esc(p.categoria)}<br>
            <strong>📊 Status:</strong> ${renderStatusBadge(p.status)}<br>
            <strong>📅 Data Criação:</strong> ${esc(formatDateYMDToBR(p.data_criacao))}
          </div>
        </div>
        
        ${p.observacoes ? `
          <div style="padding:12px;background:#f8f9fa;border-radius:4px;margin-bottom:16px;">
            <strong>📋 Observações:</strong><br>
            <div style="margin-top:4px;">${escMultiline(p.observacoes)}</div>
          </div>
        ` : ''}
        
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <button id="btn-excluir-confirma" ${!podeExcluir ? 'disabled' : ''} 
                  style="background:#dc3545;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:${podeExcluir ? 'pointer' : 'not-allowed'};">
            🗑️ ${podeExcluir ? 'Confirmar Exclusão' : 'Apenas Admin Pode Excluir'}
          </button>
          <button id="voltar-menu-excluir-form" style="padding:10px 20px;">← Voltar</button>
        </div>
        
        ${!podeExcluir ? `
          <div style="margin-top:12px;color:#dc3545;font-size:0.9em;">
            ⚠️ Apenas usuários administradores podem excluir protocolos.
          </div>
        ` : ''}
      </div>
    `;

    if (podeExcluir) {
      document.getElementById("btn-excluir-confirma").onclick = async function() {
        if (!confirm('Tem certeza que deseja excluir este protocolo?\n\nEsta ação marcará o protocolo como "EXCLUIDO" e não poderá ser editado.')) {
          return;
        }

        mostrarLoader("Excluindo protocolo...");
        try {
          const resp = await fetchWithAuth('/api/protocolo/' + p.id + `?usuario=${encodeURIComponent(sessao.usuario)}`, { 
            method: 'DELETE' 
          });
          
          esconderLoader();
          if (resp.ok) {
            mostrarMensagem('Protocolo excluído com sucesso!', 'sucesso');
            menuInicial();
          } else {
            const erro = await resp.json().catch(() => ({}));
            mostrarMensagem(erro.detail || 'Erro ao excluir protocolo!', 'erro');
          }
        } catch {
          esconderLoader();
          mostrarMensagem('Falha ao conectar ao servidor.', 'erro');
        }
      }
    }

    document.getElementById("voltar-menu-excluir-form").onclick = menuInicial;
  } catch {
    esconderLoader();
    mostrarMensagem('Falha ao conectar ao servidor.', 'erro');
  }
}

// ====================== [BLOCO 23: ATENÇÃO - PREVIEW IMPLEMENTATION] ====================== //
// Global lock to avoid flicker after clicks

let _previewLockUntil = 0;

function ensurePreviewContainer() {
  let preview = document.getElementById('protocolo-preview');
  if (!preview) {
    preview = document.createElement('div');
    preview.id = 'protocolo-preview';
    preview.style.position = 'fixed';
    preview.style.zIndex = 99999;
    preview.style.minWidth = '340px';
    preview.style.maxWidth = '520px';
    preview.style.boxShadow = '0 12px 36px rgba(0,0,0,0.28)';
    preview.style.background = '#ffffff';
    preview.style.border = '1px solid rgba(0,0,0,0.06)';
    preview.style.padding = '14px';
    preview.style.borderRadius = '10px';
    preview.style.display = 'none';
    preview.style.pointerEvents = 'none';
    preview.style.fontSize = '13px';
    preview.style.transition = 'opacity 160ms ease, transform 160ms ease';
    preview.style.opacity = '0';
    document.body.appendChild(preview);
  }
  return preview;
}

// Helper: prettify field names (camel_case or snake_case -> human)
function prettyLabel(key) {
  const map = {
    numero: 'Número',
    nome_requerente: 'Requerente',
    cpf: 'CPF',
    titulo: 'Título/Assunto',
    categoria: 'Categoria',
    status: 'Status',
    responsavel: 'Responsável',
    data_criacao: 'Data de Criação',
    nome_parte_ato: 'Nome da Parte',
    outras_infos: 'Outras Informações',
    retirado_por: 'Retirado por',
    data_retirada: 'Data de Retirada',
    ultima_alteracao_nome: 'Última alteração por',
    ultima_alteracao_data: 'Data da última alteração',
    observacoes: 'Observações'
  };
  if (map[key]) return map[key];
  // fallback: replace underscores/camelCase with spaces and capitalize
  return key.replace(/([A-Z])/g, ' $1').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Helper: render a single value, with formatting for dates, cpf, multiline, arrays/objects
function renderValue(key, val) {
  if (val == null || val === '') return null;
  // Dates in ISO YYYY-MM-DD
  if (/^(\d{4})-(\d{2})-(\d{2})$/.test(String(val))) {
    return esc(formatDateYMDToBR(String(val)));
  }
  // UTC datetime
  if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(String(val))) {
    return esc(formatUtcToLocal(String(val)));
  }
  if (key === 'cpf') return esc(formatCpf(String(val)));
  if (key === 'observacoes' || typeof val === 'string' && val.includes('\n')) return escMultiline(String(val));
  if (Array.isArray(val)) return esc(val.join(', '));
  if (typeof val === 'object') {
    // show JSON pretty
    try { return esc(JSON.stringify(val, null, 2)).replace(/\n/g, '<br>'); } catch (e) { return esc(String(val)); }
  }
  return esc(String(val));
}

function showPreview(evt, rowEl) {
  try {
    if (Date.now() < _previewLockUntil) return; // locked after click
    const j = rowEl.getAttribute('data-proto');
    if (!j) return;
    let p;
    try { p = JSON.parse(decodeURIComponent(j)); } catch (e) { console.debug('showPreview parse error', e); return; }

    const preview = ensurePreviewContainer();

    // Build ordered list of fields to show (prioritize common fields)
    const priority = [
      'numero','status','nome_requerente','cpf','titulo','categoria','responsavel',
      'data_criacao','nome_parte_ato','outras_infos','observacoes',
      'retirado_por','data_retirada','ultima_alteracao_nome','ultima_alteracao_data'
    ];

    // collect keys present in p
    const keys = Object.keys(p || {}).sort();

    // start html
    let header = `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
      <div style="flex:1;">
        <div style="font-weight:700;font-size:14px;margin-bottom:6px;">Protocolo ${esc(p.numero || '')}</div>
        <div style="color:#444;font-size:13px;">${esc(p.titulo || '')}</div>
      </div>
      <div style="flex-shrink:0;margin-left:8px;">${renderStatusBadge(p.status || '')}</div>
    </div>`;

    // Build HTML for details (two-column like dl)
    let detailRows = [];

    // Add priority keys first (if present and non-empty)
    priority.forEach(k => {
      if (k in p) {
        const rv = renderValue(k, p[k]);
        if (rv != null) detailRows.push({k, v: rv});
      }
    });

    // then add remaining keys (excluding those already shown and internal empty fields)
    keys.forEach(k => {
      if (priority.includes(k)) return;
      // skip internal/empty fields that start with underscore or have empty values
      const val = p[k];
      if (val == null || val === '') return;
      // Skip exig fields (we'll render grouped below)
      if (/^exig\d+_/.test(k)) return;
      const rv = renderValue(k, val);
      if (rv != null) detailRows.push({k, v: rv});
    });

    // Build HTML for details
    let detailsHtml = '';
    if (detailRows.length) {
      detailsHtml += `<div style="margin-top:10px;"><table style="width:100%;border-collapse:collapse;font-size:13px;">`;
      detailRows.forEach(row => {
        detailsHtml += `
          <tr>
            <td style="vertical-align:top;padding:6px 8px 6px 0;width:42%;color:#666;font-weight:600;">${prettyLabel(row.k)}</td>
            <td style="vertical-align:top;padding:6px 0 6px 8px;color:#222;">${row.v}</td>
          </tr>
        `;
      });
      detailsHtml += `</table></div>`;
    }

    // Render exigências (1..3) if any
    let exigHtml = '';
    for (let i = 1; i <= 3; i++) {
      const rp = p[`exig${i}_retirada_por`] || "";
      const dr = p[`exig${i}_data_retirada`] || "";
      const rep = p[`exig${i}_reapresentada_por`] || "";
      const dra = p[`exig${i}_data_reapresentacao`] || "";
      if (rp || dr || rep || dra) {
        exigHtml += `
          <div style="margin-top:8px;padding:8px;background:#fff8f0;border-radius:6px;border:1px solid #ffe6cf;font-size:12px;">
            <div style="font-weight:700;color:#d35400;">${i}ª Exigência</div>
            <div style="margin-top:6px;color:#333;">
              <div><strong>Retirada por:</strong> ${esc(rp || '—')}</div>
              <div><strong>Data retirada:</strong> ${esc(formatDateYMDToBR(dr || ""))}</div>
              <div><strong>Reapresentada por:</strong> ${esc(rep || '—')}</div>
              <div><strong>Data reapresentação:</strong> ${esc(formatDateYMDToBR(dra || ""))}</div>
            </div>
          </div>
        `;
      }
    }

    preview.innerHTML = `
      ${header}
      ${detailsHtml}
      ${p.observacoes ? `<div style="margin-top:10px;padding:8px;background:#f6f8fb;border-radius:6px;font-size:13px;">${escMultiline(p.observacoes)}</div>` : ''}
      ${exigHtml}
    `;

    // position near mouse and ensure inside viewport
    const margin = 12;
    let x = evt.clientX + 18;
    let y = evt.clientY + 14;
    preview.style.display = 'block';
    preview.style.opacity = '0';
    preview.style.transform = 'translateY(-6px)';
    requestAnimationFrame(() => {
      const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
      const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
      const w = preview.offsetWidth;
      const h = preview.offsetHeight;
      if (x + w + margin > vw) x = Math.max(margin, evt.clientX - w - 18);
      if (y + h + margin > vh) y = Math.max(margin, evt.clientY - h - 18);
      preview.style.left = x + 'px';
      preview.style.top = y + 'px';
      preview.style.opacity = '1';
      preview.style.transform = 'translateY(0)';
    });
  } catch (e) {
    console.debug('showPreview error', e);
  }
}

function hidePreview() {
  try {
    const preview = document.getElementById('protocolo-preview');
    if (preview) {
      preview.style.opacity = '0';
      preview.style.transform = 'translateY(-6px)';
      // esconder após transição curta
      setTimeout(() => {
        const p = document.getElementById('protocolo-preview');
        if (p) p.style.display = 'none';
      }, 180);
    }
  } catch (e) {}
  _previewLockUntil = Date.now() + 250;
}

async function carregarAtencao(pageAtencao) {
  const catSel = document.getElementById("filtro-categoria-atencao")?.value || "";
  let page = parseInt(pageAtencao) || 1;
  const perPage = 15;

  console.debug('carregarAtencao: starting, categoria=', catSel, 'page=', page);
  mostrarLoader("Carregando protocolos em atenção...");
  try {
    let url = '/api/protocolo/atencao';
    if (catSel) url += `?categoria=${encodeURIComponent(catSel)}`;

    console.debug('carregarAtencao: fetch ->', url);
    const resp = await fetchWithAuth(url);
    if (!resp.ok) {
      esconderLoader();
      console.error('carregarAtencao: servidor retornou', resp.status);
      document.getElementById('lista-atencao').innerHTML = `
        <div style="color:#dc3545;text-align:center;padding:40px;">
          <div style="font-size:36px;margin-bottom:10px;">❌</div>
          <h3>Falha ao carregar</h3>
          <p>Servidor retornou status ${resp.status}. Verifique o servidor ou consulte o console.</p>
        </div>
      `;
      document.getElementById('paginacao-atencao').innerHTML = "";
      return;
    }

    const dados = await resp.json().catch(e => { console.debug('JSON parse error', e); return []; });
    esconderLoader();

    if (!Array.isArray(dados)) {
      console.warn('carregarAtencao: dados recebidos não são array:', dados);
    }

    // Filtrar apenas protocolos com status "Em andamento" (em aberto >30 dias)
    let all = Array.isArray(dados) ? dados : [];
    let filtrados = all.filter(p => (p.status || "").toString().toLowerCase() === "em andamento");

    // Aplicar filtro por categoria, se selecionado
    if (catSel) {
      filtrados = filtrados.filter(p => p.categoria === catSel);
    }

    const total = filtrados.length;
    const pages = Math.max(1, Math.ceil(total / perPage));
    if (page > pages) page = pages;
    const ini = (page - 1) * perPage;
    const pageItems = filtrados.slice(ini, ini + perPage);

    document.getElementById('total-atencao').textContent = `${total} protocolo${total !== 1 ? 's' : ''} ${catSel ? `na categoria ${catSel}` : ''}`;

    if (!pageItems.length) {
      document.getElementById('lista-atencao').innerHTML = `
        <div style="text-align:center;padding:40px;color:#666;">
          <div style="font-size:48px;margin-bottom:16px;">🎉</div>
          <h3>Nenhum protocolo em atenção</h3>
          <p>Todos os protocolos estão dentro do prazo!</p>
        </div>
      `;
      document.getElementById('paginacao-atencao').innerHTML = "";
      console.debug('carregarAtencao: nenhum item na página (após filtro por "Em andamento")');
      return;
    }

    
    // montar as linhas e inserir data-proto
    let rowsHtml = pageItems.map(p => {
      const diasAtraso = Math.floor((new Date() - new Date(p.data_criacao)) / (1000 * 60 * 60 * 24));
      const protoData = encodeURIComponent(JSON.stringify(p));
      return `
        <tr class="result-row-clickable" style="cursor:pointer;transition:background 0.12s;" data-proto="${protoData}" data-numero="${esc(p.numero)}">
          <td style="padding:12px;border-bottom:1px solid #f1f1f1;"><strong>${esc(p.numero)}</strong></td>
          <td style="padding:12px;border-bottom:1px solid #f1f1f1;">${esc(p.nome_requerente)}</td>
          <td style="padding:12px;border-bottom:1px solid #f1f1f1;">${esc(p.nome_parte_ato || '—')}</td>
          <td style="padding:12px;border-bottom:1px solid #f1f1f1;"><span style="background:#e9ecef;padding:4px 8px;border-radius:4px;font-size:0.85em;">${esc(p.categoria || '')}</span></td>
          <td style="padding:12px;border-bottom:1px solid #f1f1f1;">${renderStatusBadge(p.status)}</td>
          <td style="padding:12px;border-bottom:1px solid #f1f1f1;">
            ${esc(formatDateYMDToBR(p.data_criacao || ""))}
            <div style="color:#dc3545;font-size:0.8em;margin-top:2px;">⚠️ ${diasAtraso} dias</div>
          </td>
          <td style="padding:12px;border-bottom:1px solid #f1f1f1;text-align:center;">
            <button class="editar-btn" data-numero="${esc(p.numero)}" style="background:#007bff;color:white;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:0.85em;">✏️ Editar</button>
          </td>
        </tr>
      `;
    }).join('');

    document.getElementById('lista-atencao').innerHTML = `
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;background:white;border:1px solid #e0e0e0;border-radius:8px;">
          <thead>
            <tr style="background:#f8f9fa;">
              <th style="padding:12px;text-align:left;border-bottom:2px solid #dee2e6;">Número</th>
              <th style="padding:12px;text-align:left;border-bottom:2px solid #dee2e6;">Requerente</th>
              <th style="padding:12px;text-align:left;border-bottom:2px solid #dee2e6;">Nome da Parte</th>
              <th style="padding:12px;text-align:left;border-bottom:2px solid #dee2e6;">Categoria</th>
              <th style="padding:12px;text-align:left;border-bottom:2px solid #dee2e6;">Status</th>
              <th style="padding:12px;text-align:left;border-bottom:2px solid #dee2e6;">Data Criação</th>
              <th style="padding:12px;text-align:center;border-bottom:2px solid #dee2e6;">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;

    // anexar eventos programaticamente (mouse enter/move/leave/click)
    const tableRows = Array.from(document.querySelectorAll('#lista-atencao table tbody tr.result-row-clickable'));
    tableRows.forEach(row => {
      row.addEventListener('mouseenter', (e) => {
        row.style.background = '#f8f9fa';
        try { showPreview(e, row); } catch (ex) { console.debug('mouseenter showPreview error', ex); }
      });
      row.addEventListener('mousemove', (e) => {
        try { showPreview(e, row); } catch (ex) {}
      });
      row.addEventListener('mouseleave', () => {
        row.style.background = 'white';
        try { hidePreview(); } catch (ex) {}
      });
      row.addEventListener('click', (e) => {
        try { hidePreview(); } catch (ex) {}
        const numero = row.getAttribute('data-numero');
        editarFromBusca(numero);
      });
      const btn = row.querySelector('.editar-btn');
      if (btn) {
        btn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          try { hidePreview(); } catch (ex) {}
          const numero = btn.getAttribute('data-numero');
          editarFromBusca(numero);
        });
      }
    });

    // Paginação UI
    let pagHtml = `
      <div style="display:flex;justify-content:center;align-items:center;gap:12px;margin-top:20px;">
        <button ${page === 1 ? "disabled" : ""} onclick="carregarAtencao(${page - 1})" style="padding:8px 16px;border:1px solid #ddd;background:${page === 1 ? '#f8f9fa' : 'white'};color:${page === 1 ? '#6c757d' : '#007bff'};border-radius:4px;cursor:${page === 1 ? 'not-allowed' : 'pointer'};">← Anterior</button>
        <span style="margin:0 12px;color:#666;">Página ${page} de ${pages} • ${total} protocolo${total !== 1 ? 's' : ''}</span>
        <button ${page === pages ? "disabled" : ""} onclick="carregarAtencao(${page + 1})" style="padding:8px 16px;border:1px solid #ddd;background:${page === pages ? '#f8f9fa' : 'white'};color:${page === pages ? '#6c757d' : '#007bff'};border-radius:4px;cursor:${page === pages ? 'not-allowed' : 'pointer'};">Próxima →</button>
      </div>
    `;
    document.getElementById('paginacao-atencao').innerHTML = pagHtml;

    console.debug('carregarAtencao: carregados', pageItems.length, 'itens (total=', total, ')');
  } catch (err) {
    esconderLoader();
    console.error('carregarAtencao: erro', err);
    document.getElementById('lista-atencao').innerHTML = `
      <div style="color:#dc3545;text-align:center;padding:40px;">
        <div style="font-size:48px;margin-bottom:16px;">❌</div>
        <h3>Falha ao carregar</h3>
        <p>Verifique o console para mais detalhes.</p>
      </div>
    `;
    document.getElementById('paginacao-atencao').innerHTML = "";
  }
}




// ====================== [BLOCO 23.1: CARREGAR EXIGÊNCIAS E PENDENTES] ====================== //
async function carregarExigenciasPendentes(pageExigencias) {
  const catSel = document.getElementById("filtro-categoria-exigencias")?.value || "";
  const statusSel = document.getElementById("filtro-status-exigencias")?.value || "";
  let page = parseInt(pageExigencias) || 1;
  const perPage = 15;

  console.debug('carregarExigenciasPendentes: starting, categoria=', catSel, 'status=', statusSel, 'page=', page);
  mostrarLoader("Carregando protocolos com exigências e pendências...");
  try {
    // ✅ CORREÇÃO: Usar POST em vez de GET para compatibilidade com o backend
    const url = '/api/protocolo/exigencias-pendentes';
    const requestBody = {};
    
    if (catSel) requestBody.categoria = catSel;
    if (statusSel) requestBody.status = statusSel;

    console.debug('carregarExigenciasPendentes: fetch POST ->', url, requestBody);
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!resp.ok) {
      esconderLoader();
      console.error('carregarExigenciasPendentes: servidor retornou', resp.status, resp.statusText);
      
      // Tentar fallback para GET se POST falhar
      console.debug('Tentando fallback para GET...');
      const getUrl = '/api/protocolo/exigencias-pendentes' + 
        (catSel || statusSel ? '?' + new URLSearchParams({
          ...(catSel && { categoria: catSel }),
          ...(statusSel && { status: statusSel })
        }).toString() : '');
      
      const getResp = await fetch(getUrl);
      if (!getResp.ok) {
        throw new Error(`POST: ${resp.status}, GET: ${getResp.status}`);
      }
      
      // Se GET funcionar, usar os dados do GET
      const dados = await getResp.json().catch(e => { console.debug('JSON parse error no GET', e); return []; });
      processarDadosExigencias(dados, page, perPage, catSel, statusSel);
      return;
    }

    const dados = await resp.json().catch(e => { 
      console.debug('JSON parse error no POST', e); 
      return []; 
    });
    esconderLoader();

    processarDadosExigencias(dados, page, perPage, catSel, statusSel);

  } catch (err) {
    esconderLoader();
    console.error('carregarExigenciasPendentes: erro', err);
    document.getElementById('lista-exigencias-pendentes').innerHTML = `
      <div style="color:#dc3545;text-align:center;padding:40px;">
        <div style="font-size:48px;margin-bottom:16px;">❌</div>
        <h3>Falha ao carregar</h3>
        <p>Erro: ${err.message || 'Verifique o console para mais detalhes.'}</p>
        <button onclick="carregarExigenciasPendentes(1)" style="margin-top:12px;padding:8px 16px;background:#dc3545;color:white;border:none;border-radius:4px;cursor:pointer;">
          🔄 Tentar Novamente
        </button>
      </div>
    `;
    document.getElementById('paginacao-exigencias').innerHTML = "";
  }
}

// ✅ FUNÇÃO AUXILIAR PARA PROCESSAR OS DADOS
function processarDadosExigencias(dados, page, perPage, catSel, statusSel) {
  if (!Array.isArray(dados)) {
    console.warn('processarDadosExigencias: dados recebidos não são array:', dados);
    dados = [];
  }

  let all = dados;
  const total = all.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (page > pages) page = pages;
  const ini = (page - 1) * perPage;
  const pageItems = all.slice(ini, ini + perPage);

  let statusText = statusSel ? `com status ${statusSel}` : 'com status Pendente ou Exigência';
  let catText = catSel ? ` na categoria ${catSel}` : '';
  document.getElementById('total-exigencias-pendentes').textContent = `${total} protocolo${total !== 1 ? 's' : ''} ${statusText}${catText}`;

  if (!pageItems.length) {
    document.getElementById('lista-exigencias-pendentes').innerHTML = `
      <div style="text-align:center;padding:40px;color:#666;">
        <div style="font-size:48px;margin-bottom:16px;">🎉</div>
        <h3>Nenhum protocolo encontrado</h3>
        <p>Todos os protocolos estão com status diferente de Pendente ou Exigência!</p>
        <div style="margin-top:16px;color:#999;">
          Filtros aplicados: ${statusText}${catText}
        </div>
      </div>
    `;
    document.getElementById('paginacao-exigencias').innerHTML = "";
    console.debug('carregarExigenciasPendentes: nenhum item na página');
    return;
  }

  // ✅ MONTAR AS LINHAS COM DATA-PROTO PARA PREVIEW
  let rowsHtml = pageItems.map(p => {
    const dataCriacao = p.data_criacao ? new Date(p.data_criacao) : new Date();
    const diasAtraso = Math.floor((new Date() - dataCriacao) / (1000 * 60 * 60 * 24));
    const protoData = encodeURIComponent(JSON.stringify(p));
    
    return `
      <tr class="result-row-clickable" style="cursor:pointer;transition:background 0.12s;" 
          data-proto="${protoData}" data-numero="${esc(p.numero)}">
        <td style="padding:12px;border-bottom:1px solid #f1f1f1;">
          <strong style="font-size:1.1em;">${esc(p.numero)}</strong>
        </td>
        <td style="padding:12px;border-bottom:1px solid #f1f1f1;">
          <div style="font-weight:600;">${esc(p.nome_requerente)}</div>
          <div style="font-size:0.85em;color:#666;margin-top:2px;">${esc(formatCpf(p.cpf || ''))}</div>
        </td>
        <td style="padding:12px;border-bottom:1px solid #f1f1f1;">
          ${esc(p.nome_parte_ato || '—')}
        </td>
        <td style="padding:12px;border-bottom:1px solid #f1f1f1;">
          <span style="background:#e9ecef;padding:4px 8px;border-radius:4px;font-size:0.85em;font-weight:600;">
            ${esc(p.categoria || '')}
          </span>
        </td>
        <td style="padding:12px;border-bottom:1px solid #f1f1f1;">
          ${renderStatusBadge(p.status)}
        </td>
        <td style="padding:12px;border-bottom:1px solid #f1f1f1;">
          <div>${esc(formatDateYMDToBR(p.data_criacao || ""))}</div>
          <div style="color:${diasAtraso > 30 ? '#dc3545' : '#28a745'};font-size:0.8em;margin-top:2px;">
            ⏱️ ${diasAtraso} dias
          </div>
        </td>
        <td style="padding:12px;border-bottom:1px solid #f1f1f1;text-align:center;">
          <button class="editar-btn" data-numero="${esc(p.numero)}" 
                  style="background:#007bff;color:white;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:0.85em;transition:background 0.2s;"
                  onmouseover="this.style.background='#0056b3'" 
                  onmouseout="this.style.background='#007bff'">
            ✏️ Editar
          </button>
        </td>
      </tr>
    `;
  }).join('');

  document.getElementById('lista-exigencias-pendentes').innerHTML = `
    <div style="overflow-x:auto; border:1px solid #e0e0e0; border-radius:8px; background:white;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f8f9fa;">
            <th style="padding:12px;text-align:left;border-bottom:2px solid #dee2e6;font-weight:600;">Número</th>
            <th style="padding:12px;text-align:left;border-bottom:2px solid #dee2e6;font-weight:600;">Requerente</th>
            <th style="padding:12px;text-align:left;border-bottom:2px solid #dee2e6;font-weight:600;">Nome da Parte</th>
            <th style="padding:12px;text-align:left;border-bottom:2px solid #dee2e6;font-weight:600;">Categoria</th>
            <th style="padding:12px;text-align:left;border-bottom:2px solid #dee2e6;font-weight:600;">Status</th>
            <th style="padding:12px;text-align:left;border-bottom:2px solid #dee2e6;font-weight:600;">Data Criação</th>
            <th style="padding:12px;text-align:center;border-bottom:2px solid #dee2e6;font-weight:600;">Ações</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;

  // ✅ ANEXAR EVENTOS PROGRAMATICAMENTE
  const tableRows = Array.from(document.querySelectorAll('#lista-exigencias-pendentes table tbody tr.result-row-clickable'));
  tableRows.forEach(row => {
    // Eventos para preview hover
    row.addEventListener('mouseenter', (e) => {
      row.style.background = '#f8f9fa';
      try { showPreview(e, row); } catch (ex) { console.debug('mouseenter showPreview error', ex); }
    });
    
    row.addEventListener('mousemove', (e) => {
      try { showPreview(e, row); } catch (ex) {}
    });
    
    row.addEventListener('mouseleave', () => {
      row.style.background = 'white';
      try { hidePreview(); } catch (ex) {}
    });
    
    // Click na linha para editar
    row.addEventListener('click', (e) => {
      try { hidePreview(); } catch (ex) {}
      const numero = row.getAttribute('data-numero');
      if (numero) {
        editarFromBusca(numero);
      }
    });
    
    // Click no botão editar (evita propagação)
    const btn = row.querySelector('.editar-btn');
    if (btn) {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        try { hidePreview(); } catch (ex) {}
        const numero = btn.getAttribute('data-numero');
        if (numero) {
          editarFromBusca(numero);
        }
      });
    }
  });

  // ✅ PAGINAÇÃO UI
  let pagHtml = '';
  if (pages > 1) {
    pagHtml = `
      <div style="display:flex;justify-content:center;align-items:center;gap:12px;margin-top:20px;">
        <button ${page === 1 ? "disabled" : ""} onclick="carregarExigenciasPendentes(${page - 1})" 
                style="padding:8px 16px;border:1px solid #ddd;background:${page === 1 ? '#f8f9fa' : 'white'};color:${page === 1 ? '#6c757d' : '#007bff'};border-radius:4px;cursor:${page === 1 ? 'not-allowed' : 'pointer'};">
          ← Anterior
        </button>
        
        <span style="margin:0 12px;color:#666;font-weight:500;">
          Página ${page} de ${pages} • ${total} protocolo${total !== 1 ? 's' : ''}
        </span>
        
        <button ${page === pages ? "disabled" : ""} onclick="carregarExigenciasPendentes(${page + 1})" 
                style="padding:8px 16px;border:1px solid #ddd;background:${page === pages ? '#f8f9fa' : 'white'};color:${page === pages ? '#6c757d' : '#007bff'};border-radius:4px;cursor:${page === pages ? 'not-allowed' : 'pointer'};">
          Próxima →
        </button>
      </div>
      
      ${pages > 5 ? `
        <div style="text-align:center;margin-top:8px;">
          <small style="color:#666;">
            Use os filtros acima para refinar sua busca
          </small>
        </div>
      ` : ''}
    `;
  } else {
    pagHtml = `
      <div style="text-align:center;margin-top:16px;color:#666;">
        <small>Mostrando todos os ${total} protocolo${total !== 1 ? 's' : ''}</small>
      </div>
    `;
  }
  
  document.getElementById('paginacao-exigencias').innerHTML = pagHtml;

  console.debug('carregarExigenciasPendentes: carregados', pageItems.length, 'itens (total=', total, 'páginas=', pages, ')');
}

// ✅ FUNÇÃO DE FALLBACK CASO PRECISE USAR GET (PARA BACKENDS QUE SÓ TEM GET)
async function carregarExigenciasPendentesGET(pageExigencias) {
  const catSel = document.getElementById("filtro-categoria-exigencias")?.value || "";
  const statusSel = document.getElementById("filtro-status-exigencias")?.value || "";
  let page = parseInt(pageExigencias) || 1;
  const perPage = 15;

  try {
    let url = '/api/protocolo/exigencias-pendentes';
    const params = new URLSearchParams();
    if (catSel) params.append('categoria', catSel);
    if (statusSel) params.append('status', statusSel);
    
    if (params.toString()) {
      url += '?' + params.toString();
    }

    console.debug('carregarExigenciasPendentesGET: fetch ->', url);
    const resp = await fetch(url);
    
    if (!resp.ok) throw new Error(`GET failed: ${resp.status}`);
    
    const dados = await resp.json();
    processarDadosExigencias(dados, page, perPage, catSel, statusSel);
    
  } catch (err) {
    console.error('carregarExigenciasPendentesGET: erro', err);
    mostrarMensagem('Erro ao carregar via GET. Tentando POST...', 'erro');
    // Fallback para POST
    carregarExigenciasPendentes(pageExigencias);
  }
}




// ====================== [BLOCO 24: ADMIN - LISTAR / CADASTRAR USUÁRIOS] ====================== //
async function listarUsuariosAdmin() {
  let conteudo = document.getElementById("conteudo");
  let sessao = getSessao();
  
  mostrarLoader("Carregando usuários...");
  try {
    let resp = await fetchWithAuth('/api/usuarios');
    let usuarios = await resp.json();
    esconderLoader();

    let linhas = usuarios.map(u => `
      <tr style="border-bottom:1px solid #e0e0e0;">
        <td style="padding:12px;">
          <input type="text" value="${esc(u.usuario)}" name="usuario" id="input-usuario-${u.usuario}" 
                 ${u.usuario === sessao.usuario ? "readonly" : ""} required
                 style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
        </td>
        <td style="padding:12px;">
          <input type="password" placeholder="Nova senha (deixe em branco para manter)" 
                 name="senha" id="input-senha-${u.usuario}"
                 style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
        </td>
        <td style="padding:12px;">
          <select name="tipo" id="input-tipo-${u.usuario}" 
                  ${u.usuario === sessao.usuario ? "disabled" : ""}
                  style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
            <option value="escrevente" ${u.tipo === "escrevente" ? "selected" : ""}>Escrevente</option>
            <option value="admin" ${u.tipo === "admin" ? "selected" : ""}>Administrador</option>
          </select>
          ${u.usuario === sessao.usuario ? '<div style="color:#666;font-size:0.8em;margin-top:4px;">Não é possível alterar seu próprio tipo</div>' : ''}
        </td>
        <td style="padding:12px;text-align:center;">
          ${u.bloqueado ? '<span style="color:#dc3545;font-weight:bold;display:block;margin-bottom:8px;">🚫 BLOQUEADO</span>' : ''}
          <button type="button" onclick="salvarEditUsuarioInterface('${u.usuario}')" 
                  style="background:#28a745;color:white;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;margin-right:8px;">
            ✓ Alterar
          </button>
          ${u.usuario !== sessao.usuario ? `
            <button type="button" onclick="bloquearDesbloquearUsuario('${u.usuario}', ${u.bloqueado || false})" 
                    style="background:${u.bloqueado ? '#ffc107' : '#ff9800'};color:white;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;margin-right:8px;">
              ${u.bloqueado ? '🔓 Desbloquear' : '🔒 Bloquear'}
            </button>
            <button type="button" onclick="excluirUsuario('${u.usuario}')" 
                    style="background:#dc3545;color:white;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;">
              🗑️ Excluir
            </button>
          ` : ""}
        </td>
      </tr>
    `).join('');

    conteudo.innerHTML = `
      <div class="form-destacado">
        <h2>👥 Gerenciamento de Usuários</h2>
        
        <div style="background:#e7f3ff;padding:16px;border-radius:8px;border:1px solid #b3d9ff;margin-bottom:20px;">
          <h4 style="margin:0 0 8px 0;">Cadastrar Novo Usuário</h4>
          <form id="form-usuario" autocomplete="off" style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:12px;align-items:end;">
            <div>
              <label>Usuário *</label>
              <input type="text" name="usuario" required autocomplete="off" 
                     style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
            </div>
            <div>
              <label>Senha *</label>
              <input type="password" name="senha" required autocomplete="new-password"
                     style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
            </div>
            <div>
              <label>Tipo *</label>
              <select name="tipo" required style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
                <option value="escrevente">Escrevente</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div>
              <button type="submit" style="background:#007bff;color:white;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;white-space:nowrap;">
                ➕ Cadastrar
              </button>
            </div>
          </form>
        </div>

        <h3>Usuários Cadastrados</h3>
        <div style="overflow-x:auto;">
          <table class="user-list-admin" style="width:100%;border-collapse:collapse;background:white;border:1px solid #e0e0e0;border-radius:8px;">
            <thead>
              <tr style="background:#f8f9fa;">
                <th style="padding:12px;text-align:left;border-bottom:2px solid #dee2e6;">Nome</th>
                <th style="padding:12px;text-align:left;border-bottom:2px solid #dee2e6;">Senha</th>
                <th style="padding:12px;text-align:left;border-bottom:2px solid #dee2e6;">Tipo</th>
                <th style="padding:12px;text-align:center;border-bottom:2px solid #dee2e6;">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${linhas}
            </tbody>
          </table>
        </div>
        
        <div style="margin-top:20px;">
          <button type="button" id="voltar-menu-usuario" style="padding:10px 20px;">← Voltar ao Menu</button>
        </div>
      </div>
    `;

    document.getElementById("form-usuario").onsubmit = async function(e) {
      e.preventDefault();
      let dados = Object.fromEntries(new FormData(e.target).entries());
      
      mostrarLoader("Cadastrando usuário...");
      try {
        const resp = await fetchWithAuth('/api/usuario', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            usuario: dados.usuario,
            senha: dados.senha,
            tipo: dados.tipo,
            bloqueado: false
          })
        });
        
        esconderLoader();
        if (resp.ok) {
          mostrarMensagem(`Usuário "${dados.usuario}" cadastrado com sucesso!`, 'sucesso');
          listarUsuariosAdmin();
        } else {
          const erro = await resp.json().catch(() => ({}));
          mostrarMensagem(erro.detail || "Erro ao cadastrar usuário!", 'erro');
        }
      } catch {
        esconderLoader();
        mostrarMensagem("Falha ao conectar ao servidor.", 'erro');
      }
    }

    document.getElementById("voltar-menu-usuario").onclick = menuInicial;
  } catch {
    esconderLoader();
    mostrarMensagem("Falha ao carregar usuários.", 'erro');
  }
}

async function salvarEditUsuarioInterface(antigoNome) {
  let novoNome = document.getElementById("input-usuario-" + antigoNome).value.trim();
  let novaSenha = document.getElementById("input-senha-" + antigoNome).value.trim();
  let novoTipo = document.getElementById("input-tipo-" + antigoNome) ? document.getElementById("input-tipo-" + antigoNome).value : undefined;
  
  if (!novoNome) {
    mostrarMensagem("Nome de usuário obrigatório", "erro");
    return;
  }

  mostrarLoader("Salvando alterações...");
  try {
    const resp = await fetchWithAuth(`/api/usuario/${encodeURIComponent(antigoNome)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario: novoNome,
        senha: novaSenha,
        tipo: novoTipo
      })
    });
    
    esconderLoader();
    if (resp.ok) {
      mostrarMensagem(novaSenha ? "Senha alterada com sucesso!" : "Usuário atualizado!", "sucesso");
      listarUsuariosAdmin();
    } else {
      const erro = await resp.json().catch(() => ({}));
      mostrarMensagem(erro.detail || "Erro ao atualizar usuário!", "erro");
    }
  } catch {
    esconderLoader();
    mostrarMensagem("Falha ao conectar ao servidor.", "erro");
  }
}

async function excluirUsuario(nome) {
  let sessao = getSessao();
  
  if (!confirm(`Tem certeza que deseja excluir o usuário "${nome}"?\n\nEsta ação não pode ser desfeita.`)) {
    return;
  }

  mostrarLoader("Excluindo usuário...");
  try {
    const resp = await fetchWithAuth(`/api/usuario/${encodeURIComponent(nome)}?logado=${encodeURIComponent(sessao.usuario)}`, {
      method: 'DELETE'
    });
    
    esconderLoader();
    if (resp.ok) {
      mostrarMensagem("Usuário excluído com sucesso!", "sucesso");
      listarUsuariosAdmin();
    } else {
      const erro = await resp.json().catch(() => ({}));
      mostrarMensagem(erro.detail || "Erro ao excluir usuário!", "erro");
    }
  } catch {
    esconderLoader();
    mostrarMensagem("Falha ao conectar ao servidor.", "erro");
  }
}

async function bloquearDesbloquearUsuario(nome, estaBloqueado) {
  const sessao = getSessao();
  if (!sessao || sessao.tipo !== "admin") {
    mostrarMensagem("Apenas administradores podem bloquear/desbloquear usuários.", "erro");
    return;
  }
  
  const acao = estaBloqueado ? "desbloquear" : "bloquear";
  if (!confirm(`Deseja realmente ${acao} o usuário "${nome}"?`)) {
    return;
  }
  
  mostrarLoader(`${acao.charAt(0).toUpperCase() + acao.slice(1)}ando usuário...`);
  try {
    const resp = await fetchWithAuth(`/api/usuario/${encodeURIComponent(nome)}/bloquear`, {
      method: 'PATCH'
    });
    
    esconderLoader();
    if (resp.ok) {
      const data = await resp.json();
      const mensagem = data.bloqueado ? "Usuário bloqueado com sucesso!" : "Usuário desbloqueado com sucesso!";
      mostrarMensagem(mensagem, "sucesso");
      listarUsuariosAdmin();
    } else {
      const erro = await resp.json().catch(() => ({}));
      mostrarMensagem(erro.detail || `Erro ao ${acao} usuário!`, "erro");
    }
  } catch {
    esconderLoader();
    mostrarMensagem("Falha ao conectar ao servidor.", "erro");
  }
}

// ====================== [BLOCO 24.1: ADMIN - GERENCIAR CATEGORIAS/SETORES] ====================== //
async function gerenciarCategoriasAdmin() {
  const conteudo = document.getElementById("conteudo");
  const sessao = getSessao();
  if (!sessao || sessao.tipo !== "admin") {
    mostrarMensagem("Apenas administradores podem acessar categorias.", "erro");
    return;
  }

  conteudo.innerHTML = `
    <div class="form-destacado">
      <h2>🏷️ Cadastro de Categorias (Setores)</h2>
      <div style="background:#e7f3ff;padding:16px;border-radius:8px;border:1px solid #b3d9ff;margin-bottom:20px;">
        <h4 style="margin:0 0 8px 0;">Nova Categoria</h4>
        <form id="form-categoria" autocomplete="off" style="display:grid;grid-template-columns:260px 1fr auto;gap:12px;align-items:end;">
          <div>
            <label>Nome *</label>
            <input type="text" name="nome" required maxlength="60" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;">
          </div>
          <div>
            <label>Descrição</label>
            <input type="text" name="descricao" maxlength="240" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;">
          </div>
          <div>
            <button type="submit" style="background:#007bff;color:white;border:none;padding:10px 16px;border-radius:6px;cursor:pointer;">➕ Cadastrar</button>
          </div>
        </form>
      </div>

      <h3 style="margin-top:0;">Categorias Cadastradas</h3>
      <div id="lista-categorias" style="overflow-x:auto;"></div>

      <div style="margin-top:20px;">
        <button type="button" id="voltar-menu-categorias" style="padding:10px 20px;">← Voltar ao Menu</button>
      </div>
    </div>
  `;

// dentro de gerenciarCategoriasAdmin -> onsubmit do form-categoria

document.getElementById("form-categoria").onsubmit = async function(e) {
  e.preventDefault();
  const dados = Object.fromEntries(new FormData(e.target).entries());
  mostrarLoader("Salvando categoria...");
  try {
    const resp = await fetch(`/api/categoria?usuario=${encodeURIComponent(sessao.usuario)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados)
    });
    esconderLoader();
    if (resp.ok) {
      mostrarMensagem("Categoria criada com sucesso!", "sucesso");
      e.target.reset();
      carregarListaCategorias();
    } else {
      const erro = await resp.json().catch(()=>({}));
      const msg = erro.detail || `Erro ao criar categoria (HTTP ${resp.status}). Verifique se o backend foi atualizado.`;
      mostrarMensagem(msg, "erro");
    }
  } catch (err) {
    esconderLoader();
    mostrarMensagem("Falha ao conectar ao servidor.", "erro");
  }
};

  document.getElementById("voltar-menu-categorias").onclick = menuInicial;

  carregarListaCategorias();
}

async function carregarListaCategorias() {
  const sessao = getSessao();
  const listaEl = document.getElementById("lista-categorias");
  if (!listaEl) return;
  try {
    listaEl.innerHTML = `<div style="padding:20px;text-align:center;color:#666;"><div class="loader"></div>Carregando...</div>`;
    const resp = await fetch("/api/categorias");
    if (!resp.ok) {
      listaEl.innerHTML = `<div style="color:#dc3545;text-align:center;padding:20px;">Erro ao carregar categorias.</div>`;
      return;
    }
    const cats = await resp.json();
    if (!cats.length) {
      listaEl.innerHTML = `<div style="padding:20px;text-align:center;color:#666;">Nenhuma categoria cadastrada.</div>`;
      return;
    }
    const rows = cats.map(c => `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #eee;">
          <input type="text" id="cat-nome-${c.id}" value="${esc(c.nome)}" maxlength="60" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
        </td>
        <td style="padding:10px;border-bottom:1px solid #eee;">
          <input type="text" id="cat-desc-${c.id}" value="${esc(c.descricao || '')}" maxlength="240" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
        </td>
        <td style="padding:10px;border-bottom:1px solid #eee;text-align:center;">
          <button onclick="atualizarCategoria('${c.id}')" style="background:#28a745;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;margin-right:6px;">💾 Salvar</button>
          <button onclick="excluirCategoria('${c.id}')" style="background:#dc3545;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;">🗑️ Excluir</button>
        </td>
      </tr>
    `).join('');
    listaEl.innerHTML = `
      <table style="width:100%;border-collapse:collapse;background:white;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#f8f9fa;">
            <th style="padding:12px;text-align:left;border-bottom:2px solid #dee2e6;">Nome</th>
            <th style="padding:12px;text-align:left;border-bottom:2px solid #dee2e6;">Descrição</th>
            <th style="padding:12px;text-align:center;border-bottom:2px solid #dee2e6;">Ações</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  } catch (e) {
    listaEl.innerHTML = `<div style="color:#dc3545;text-align:center;padding:20px;">Erro ao carregar categorias.</div>`;
  }
}

async function atualizarCategoria(id) {
  const sessao = getSessao();
  if (!sessao || sessao.tipo !== "admin") {
    mostrarMensagem("Apenas administradores podem atualizar categorias.", "erro");
    return;
  }
  const nome = document.getElementById(`cat-nome-${id}`)?.value.trim() || "";
  const descricao = document.getElementById(`cat-desc-${id}`)?.value.trim() || "";
  if (!nome) {
    mostrarMensagem("Nome da categoria é obrigatório.", "erro");
    return;
  }
  mostrarLoader("Atualizando categoria...");
  try {
    const resp = await fetch(`/api/categoria/${id}?usuario=${encodeURIComponent(sessao.usuario)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, descricao })
    });
    esconderLoader();
    if (resp.ok) {
      mostrarMensagem("Categoria atualizada!", "sucesso");
      carregarListaCategorias();
    } else {
      const erro = await resp.json().catch(()=>({}));
      mostrarMensagem(erro.detail || "Erro ao atualizar categoria.", "erro");
    }
  } catch (err) {
    esconderLoader();
    mostrarMensagem("Falha ao conectar ao servidor.", "erro");
  }
}

async function excluirCategoria(id) {
  const sessao = getSessao();
  if (!sessao || sessao.tipo !== "admin") {
    mostrarMensagem("Apenas administradores podem excluir categorias.", "erro");
    return;
  }
  if (!confirm("Deseja excluir esta categoria?")) return;
  mostrarLoader("Excluindo categoria...");
  try {
    const resp = await fetch(`/api/categoria/${id}?usuario=${encodeURIComponent(sessao.usuario)}`, {
      method: "DELETE"
    });
    esconderLoader();
    if (resp.ok) {
      mostrarMensagem("Categoria excluída.", "sucesso");
      carregarListaCategorias();
    } else {
      const erro = await resp.json().catch(()=>({}));
      mostrarMensagem(erro.detail || "Erro ao excluir categoria.", "erro");
    }
  } catch (err) {
    esconderLoader();
    mostrarMensagem("Falha ao conectar ao servidor.", "erro");
  }
}

// ====================== [BLOCO 25: UTIL - DEBOUNCE] ====================== //
function debounce(fn, wait) {
  let t;
  return function(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

// ====================== [BLOCO 26: INICIALIZAÇÃO DE COMPONENTES] ====================== //
document.addEventListener('DOMContentLoaded', function() {
  // Click handler for notification button
  const btnNotificacoes = document.getElementById('btn-notificacoes');
  if (btnNotificacoes) {
    btnNotificacoes.addEventListener('click', function(e) {
      e.stopPropagation();
      mostrarNotificacoesAtrasos();
    });
  }
  
  // Click handler for close notification button
  const btnFecharNotificacoes = document.getElementById('btn-fechar-notificacoes');
  if (btnFecharNotificacoes) {
    btnFecharNotificacoes.addEventListener('click', fecharNotificacoes);
  }
  
  // Fechar notificações ao clicar fora
  document.addEventListener('click', function(e) {
    const notificacoesContainer = document.getElementById('notificacoes-container');
    const btnNotif = document.getElementById('btn-notificacoes');
    
    if (notificacoesContainer && notificacoesContainer.style.display === 'block' &&
        !notificacoesContainer.contains(e.target) && 
        !btnNotif.contains(e.target)) {
      fecharNotificacoes();
    }
  });

  // Recarregar notificações a cada 2 minutos
  setInterval(() => {
    if (getSessao()) {
      carregarNotificacoes();
    }
  }, 120000);
});

// ====================== [BLOCO 27: UTILITÁRIOS, MODAL E OBSERVER DE FORMULÁRIOS (injeta estilos mínimos e cria createConfirmModal, initFormObserver) ====================== //

(function () {
  // Namespace para evitar poluição global
  window.__appEnh = window.__appEnh || {};

  // Injeta CSS necessário para o modal e pequenas classes (se ainda não existir)
  function injectEnhStyles() {
    if (document.getElementById('app-enh-styles')) return;
    const css = `
/* Modal overlay e card (injetado) */
#confirm-modal-root { z-index: 120000 !important; font-family: inherit; }
.confirm-modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(10, 12, 20, 0.45);
  opacity: 0;
  transform: scale(0.99);
  transition: opacity 160ms ease, transform 160ms ease;
  pointer-events: none;
}
.confirm-modal-overlay.open {
  opacity: 1;
  transform: scale(1);
  pointer-events: auto;
}
.confirm-modal-card {
  width: 460px;
  max-width: calc(100% - 40px);
  background: linear-gradient(180deg, #ffffff, #fbfdff);
  border-radius: 12px;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.18);
  padding: 18px;
  border: 1px solid rgba(20,30,50,0.05);
  transform: translateY(-8px);
  transition: transform 180ms ease;
}
.confirm-modal-content {
  display: flex;
  gap: 12px;
  align-items: center;
  padding-bottom: 8px;
}
.confirm-modal-icon {
  min-width: 56px;
  min-height: 56px;
  border-radius: 10px;
  background: linear-gradient(180deg,#ffecd2,#ffd59a);
  color: #8a4b00;
  font-weight: 700;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:20px;
  box-shadow: 0 6px 18px rgba(255,160,30,0.06) inset;
}
.confirm-modal-text h3 { margin:0 0 4px 0; font-size:1.05em; color:#12263a; }
.confirm-modal-text p { margin:0; font-size:0.95em; color:#4a5968; }

/* Actions */
.confirm-modal-actions {
  display:flex;
  gap:10px;
  justify-content:flex-end;
  margin-top:12px;
}
.btn-confirm {
  padding:8px 12px;
  border-radius:8px;
  border: none;
  font-weight:600;
  cursor:pointer;
  transition: transform 120ms ease, box-shadow 120ms;
}
.btn-confirm.yes { background:#28a745; color:white; box-shadow: 0 6px 18px rgba(40,167,69,0.12); }
.btn-confirm.no  { background:#ffc107; color:#222; }
.btn-confirm.cancel { background:#f0f3f6; color:#223; }

/* small visual for auto-filled input */
input.auto-filled, textarea.auto-filled { box-shadow: 0 0 0 3px rgba(32,119,179,0.08) inset; transition: box-shadow 180ms; }

/* Fill button style */
.btn-fill-parte {
  display:inline-block;
  font-size:0.95em;
  background:#fff;
  border:1px solid #e6eef8;
  color:#0f172a;
  padding:8px 10px;
  border-radius:8px;
  margin-left:6px;
  cursor:pointer;
}
.btn-fill-parte:hover { transform: translateY(-2px); box-shadow: 0 8px 18px rgba(12,65,130,0.06); }

/* btn-highlight used to draw attention momentarily */
.btn-highlight { box-shadow: 0 8px 20px rgba(15, 112, 255, 0.12); transform: translateY(-2px); transition: all 260ms ease; }

/* Login animation (classes used in part3) */
.login-anim-hidden { opacity: 0; transform: translateY(12px) scale(0.995); }
.login-anim-show {
  animation: loginEntrance 560ms cubic-bezier(.18,.9,.22,1) both;
}
@keyframes loginEntrance {
  from { opacity: 0; transform: translateY(12px) scale(0.995); }
  60% { opacity: 1; transform: translateY(-6px) scale(1.02); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
`;
    const st = document.createElement('style');
    st.id = 'app-enh-styles';
    st.type = 'text/css';
    st.appendChild(document.createTextNode(css));
    document.head.appendChild(st);
  }

  // Cria (ou reutiliza) um modal de confirmação com API .show(opts) => Promise(true|false|null)
  function createConfirmModal() {
    injectEnhStyles();

    const existing = document.getElementById('confirm-modal-root');
    if (existing && existing._confirmApi) return existing._confirmApi;

    const root = document.createElement('div');
    root.id = 'confirm-modal-root';
    root.style.display = 'none';
    root.innerHTML = `
      <div class="confirm-modal-overlay" id="confirm-overlay" role="presentation">
        <div class="confirm-modal-card" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title" aria-describedby="confirm-modal-desc">
          <div class="confirm-modal-content">
            <div class="confirm-modal-icon" aria-hidden="true">?</div>
            <div class="confirm-modal-text">
              <h3 id="confirm-modal-title">Confirmar</h3>
              <p id="confirm-modal-desc">Deseja confirmar?</p>
            </div>
          </div>
          <div class="confirm-modal-actions" role="toolbar" aria-label="Ações">
            <button id="confirm-btn-yes" class="btn-confirm yes" type="button">Sim</button>
            <button id="confirm-btn-no" class="btn-confirm no" type="button">Não</button>
            <button id="confirm-btn-cancel" class="btn-confirm cancel" type="button">Cancelar</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    const overlay = root.querySelector('#confirm-overlay');
    const btnYes = root.querySelector('#confirm-btn-yes');
    const btnNo = root.querySelector('#confirm-btn-no');
    const btnCancel = root.querySelector('#confirm-btn-cancel');
    const titleEl = root.querySelector('#confirm-modal-title');
    const descEl = root.querySelector('#confirm-modal-desc');

    function openAnimation() { overlay.classList.add('open'); }
    function closeAnimation(cb) { overlay.classList.remove('open'); setTimeout(cb, 160); }

    const api = {
      show({ title, description, yesText = 'Sim', noText = 'Não', cancelText = 'Cancelar' } = {}) {
        return new Promise((resolve) => {
          if (title) titleEl.textContent = title;
          if (description) descEl.textContent = description;
          btnYes.textContent = yesText;
          btnNo.textContent = noText;
          btnCancel.textContent = cancelText;

          root.style.display = 'block';
          // Allow layout then animate
          requestAnimationFrame(openAnimation);

          function cleanup(value) {
            closeAnimation(() => {
              btnYes.removeEventListener('click', onYes);
              btnNo.removeEventListener('click', onNo);
              btnCancel.removeEventListener('click', onCancel);
              root.style.display = 'none';
              resolve(value);
            });
          }
          function onYes() { cleanup(true); }
          function onNo() { cleanup(false); }
          function onCancel() { cleanup(null); }

          btnYes.addEventListener('click', onYes);
          btnNo.addEventListener('click', onNo);
          btnCancel.addEventListener('click', onCancel);

          // focus management
          setTimeout(() => {
            try { btnYes.focus(); } catch (e) {}
          }, 50);

          // ESC key support while modal shown
          function onKey(e) {
            if (e.key === 'Escape') {
              onCancel();
              document.removeEventListener('keydown', onKey);
            }
          }
          document.addEventListener('keydown', onKey);
        });
      }
    };

    root._confirmApi = api;
    return api;
  }

  /**
   * initFormObserver
   * Observa o DOM e aplica enhancement nos formulários #form-protocolo e #form-editar-protocolo
   */
  function initFormObserver() {
    // small set to avoid double enhancing
    const enhanced = new WeakSet();

    function enhanceIf(formEl) {
      if (!formEl || enhanced.has(formEl)) return;
      try {
        if (typeof window.__appEnh.enhanceIncluirForm === 'function') {
          window.__appEnh.enhanceIncluirForm(formEl);
        }
        if (typeof window.__appEnh.enhanceEditarForm === 'function') {
          window.__appEnh.enhanceEditarForm(formEl);
        }
      } catch (e) {
        console.debug('enhanceIf error', e);
      }
      enhanced.add(formEl);
    }

    // Observe dynamic insertion
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const n of Array.from(m.addedNodes)) {
          if (!(n instanceof HTMLElement)) continue;
          // if the added subtree contains our forms, enhance them
          const inc = n.querySelector ? n.querySelector('#form-protocolo') : null;
          const ed = n.querySelector ? n.querySelector('#form-editar-protocolo') : null;
          if (inc) enhanceIf(inc);
          if (ed) enhanceIf(ed);
          // direct node being the form itself
          if (n.id === 'form-protocolo') enhanceIf(n);
          if (n.id === 'form-editar-protocolo') enhanceIf(n);
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Also try to enhance already present forms
    document.querySelectorAll('#form-protocolo, #form-editar-protocolo').forEach(f => {
      try { enhanceIf(f); } catch (e) {}
    });
  }

  // Expor utilitários
  window.__appEnh.createConfirmModal = createConfirmModal;
  window.__appEnh.injectEnhStyles = injectEnhStyles;
  window.__appEnh.initFormObserver = initFormObserver;

  // Auto-initialize after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      try { window.__appEnh.initFormObserver(); } catch (e) { console.debug(e); }
    });
  } else {
    try { window.__appEnh.initFormObserver(); } catch (e) { console.debug(e); }
  }

})();


// ====================== [BLOCO 28: IMPLEMENTAÇÃO DE enhanceIncluirForm / enhanceEditarForm   (createFillButton reforçado) ====================== //


(function () {
  // cria ou retorna um botão "Preencher Nome da Parte" inserido após o input alvo
  function createFillButton(nextToEl, idSuffix) {
    if (!nextToEl || !nextToEl.parentNode) return null;
    const parent = nextToEl.parentNode;
    const btnId = `btn-fill-parte-${idSuffix}`;

    // Se já existe um botão com esse id, retorna ele
    let btn = document.getElementById(btnId);
    if (btn) return btn;

    // Evitar criar duplicado ligado ao mesmo input (procura por data-for no mesmo parent)
    const dataFor = nextToEl.id || '';
    const existingInParent = parent.querySelector(`button.btn-fill-parte[data-for="${dataFor}"]`);
    if (existingInParent) return existingInParent;

    btn = document.createElement('button');
    btn.type = 'button';
    btn.id = btnId;
    btn.className = 'btn-fill-parte';
    btn.textContent = 'Preencher Nome da Parte';
    btn.setAttribute('aria-label', 'Preencher Nome da Parte');

    // vincula o botão ao input (para evitar duplicates)
    if (dataFor) btn.setAttribute('data-for', dataFor);
    else btn.setAttribute('data-for', `no-id-${idSuffix}`);

    // ensure small spacing
    btn.style.marginTop = '6px';
    // inserir logo após o elemento alvo
    parent.insertBefore(btn, nextToEl.nextSibling);
    return btn;
  }

  // fallback para mostrar mensagens caso mostrarMensagem não exista
  function safeShowMessage(msg, tipo = 'info', tempo = 4000) {
    if (typeof window.mostrarMensagem === 'function') {
      try { window.mostrarMensagem(msg, tipo, tempo); return; } catch (e) { /* fallback below */ }
    }
    // minimal toast
    try {
      const el = document.createElement('div');
      el.textContent = msg;
      el.style.position = 'fixed';
      el.style.left = '50%';
      el.style.top = '20px';
      el.style.transform = 'translateX(-50%)';
      el.style.padding = '10px 14px';
      el.style.borderRadius = '8px';
      el.style.zIndex = 130000;
      el.style.background = tipo === 'erro' ? '#f8d7da' : tipo === 'sucesso' ? '#d1edff' : '#fff3cd';
      el.style.color = tipo === 'erro' ? '#721c24' : '#155724';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), tempo);
    } catch (e) { /* ignore */ }
  }

  function flashAutoFilled(inputEl) {
    try {
      inputEl.classList.add('auto-filled');
      setTimeout(() => inputEl.classList.remove('auto-filled'), 1400);
    } catch (e) {}
  }

  // Função que aplica enhancement no form de inclusão (#form-protocolo)
  function enhanceIncluirForm(formEl) {
    try {
      if (!formEl) return;
      const nomeReq = formEl.querySelector('#nome-requerente');
      const nomeParte = formEl.querySelector('#nome-parte-ato') || formEl.querySelector('[name="nome_parte_ato"]');

      if (!nomeReq || !nomeParte) return;

      const btn = createFillButton(nomeReq, 'incluir');
      if (!btn) return;

      // evitar múltiplos listeners
      btn.onclick = async function () {
        const nome = (nomeReq.value || '').trim();
        if (!nome) {
          safeShowMessage('Preencha o Nome do Requerente antes.', 'erro');
          try { nomeReq.focus(); } catch (e) {}
          return;
        }
        const modal = window.__appEnh.createConfirmModal();
        const ans = await modal.show({
          title: 'Usar mesmo nome?',
          description: `Deseja usar "${nome}" como Nome da parte no ato?`
        });
        if (ans === true) {
          if ('value' in nomeParte) {
            nomeParte.value = nome;
            // dispatch input event in case app listens
            try { nomeParte.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}
            flashAutoFilled(nomeParte);
            safeShowMessage('Nome da parte preenchido automaticamente.', 'sucesso', 2200);
          }
        } else if (ans === false) {
          // permitir edição manual: limpar seleção e focar
          try { nomeParte.focus(); } catch (e) {}
        } else {
          // cancelou: nada
        }
      };
    } catch (e) {
      console.debug('enhanceIncluirForm error', e);
    }
  }

  // Função que aplica enhancement no form de edição (#form-editar-protocolo)
  function enhanceEditarForm(formEl) {
    try {
      if (!formEl) return;
      // suportar diferentes ids/names dependendo da versão
      const nomeReq = formEl.querySelector('#editar-nome-requerente') || formEl.querySelector('#nome-requerente') || formEl.querySelector('[name="nome_requerente"]');
      const nomeParte = formEl.querySelector('#editar-nome-parte-ato') || formEl.querySelector('#nome-parte-ato') || formEl.querySelector('[name="nome_parte_ato"]');

      if (!nomeReq || !nomeParte) return;

      const btn = createFillButton(nomeReq, 'editar');
      if (!btn) return;

      btn.onclick = async function () {
        const nome = (nomeReq.value || '').trim();
        if (!nome) {
          safeShowMessage('Preencha o Nome do Requerente antes.', 'erro');
          try { nomeReq.focus(); } catch (e) {}
          return;
        }
        const modal = window.__appEnh.createConfirmModal();
        const ans = await modal.show({
          title: 'Usar mesmo nome?',
          description: `Deseja usar "${nome}" como Nome da parte no ato?`
        });
        if (ans === true) {
          if ('value' in nomeParte) {
            nomeParte.value = nome;
            try { nomeParte.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}
            flashAutoFilled(nomeParte);
            safeShowMessage('Nome da parte preenchido automaticamente.', 'sucesso', 2200);
          }
        } else if (ans === false) {
          try { nomeParte.focus(); } catch (e) {}
        } else {
          // cancel
        }
      };
    } catch (e) {
      console.debug('enhanceEditarForm error', e);
    }
  }

  // Expor as funções para que part1 observer chame
  window.__appEnh.enhanceIncluirForm = enhanceIncluirForm;
  window.__appEnh.enhanceEditarForm = enhanceEditarForm;

  //Se os forms já estiverem carregados, aplicar imediatamente
  try {
    const inc = document.getElementById('form-protocolo');
    if (inc) enhanceIncluirForm(inc);
    const ed = document.getElementById('form-editar-protocolo');
    if (ed) enhanceEditarForm(ed);
  } catch (e) { /* ignore */ }

})();


// ====================== [BLOCO 29: ANIMAÇÃO DE LOGIN E POLISH FINAL ====================== //


(function () {
  // Animação da tela de login - adiciona classes que ativam as keyframes injetadas no part1/style.css
  function animateLogin() {
    try {
      const loginRoot = document.getElementById('login-container');
      if (!loginRoot) return;

      // ensure styles injected (part1 provides inject)
      try { window.__appEnh && window.__appEnh.injectEnhStyles && window.__appEnh.injectEnhStyles(); } catch (e) {}

      // adicionar classe que controla a animação visual (aurora/halo)
      loginRoot.classList.add('login-has-anim');

      // Apply initial hidden state then trigger show state (entrada)
      loginRoot.classList.add('login-anim-hidden');
      // Allow repaint then animate
      requestAnimationFrame(() => {
        setTimeout(() => {
          loginRoot.classList.remove('login-anim-hidden');
          loginRoot.classList.add('login-anim-show');
        }, 30);
      });

      // Subtle logo animation if there's an img
      const imgs = loginRoot.querySelectorAll('img');
      imgs.forEach((img, idx) => {
        img.style.opacity = '0';
        img.style.transform = 'translateY(8px) scale(0.99)';
        img.style.transition = 'transform 700ms cubic-bezier(.2,.9,.3,1), opacity 560ms';
        setTimeout(() => {
          img.style.opacity = '1';
          img.style.transform = 'translateY(0) scale(1)';
        }, 150 + idx * 60);
      });

      // card pulse
      try {
        loginRoot.style.transition = 'box-shadow 700ms, transform 700ms';
        loginRoot.style.boxShadow = '0 12px 48px rgba(32,119,179,0.06)';
        setTimeout(() => {
          loginRoot.style.boxShadow = '0 20px 80px rgba(32,119,179,0.09)';
          setTimeout(() => {
            loginRoot.style.boxShadow = '0 8px 28px rgba(0,0,0,0.08)';
          }, 700);
        }, 150);
      } catch (e) { /* ignore */ }

    } catch (e) {
      console.debug('animateLogin error', e);
    }
  }

  // Small polish: when focusing the Nome do Requerente, highlight the fill button
  document.addEventListener('focusin', (e) => {
    try {
      const tgt = e.target;
      if (!tgt) return;
      if (tgt.id === 'nome-requerente' || tgt.id === 'editar-nome-requerente') {
        const btn = document.getElementById(tgt.id === 'nome-requerente' ? 'btn-fill-parte-incluir' : 'btn-fill-parte-editar');
        if (btn) {
          btn.classList.add('btn-highlight');
          setTimeout(() => btn.classList.remove('btn-highlight'), 1200);
        }
      }
    } catch (e) { /* ignore */ }
  });

  // Close modal with ESC if present (extra safety)
  document.addEventListener('keydown', (e) => {
    try {
      if (e.key === 'Escape') {
        const root = document.getElementById('confirm-modal-root');
        if (root && root.style.display === 'block') {
          const cancel = root.querySelector('#confirm-btn-cancel');
          if (cancel) cancel.click();
        }
      }
    } catch (err) { /* ignore */ }
  });

  // Run animation on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      try { animateLogin(); } catch (e) { console.debug(e); }
    });
  } else {
    try { animateLogin(); } catch (e) { console.debug(e); }
  }

  // Expor para uso externo (ex.: exibirLogin)
  window.__appEnh = window.__appEnh || {};
  window.__appEnh.animateLogin = animateLogin;

})();

/* =========================
   Helper: observa #login-container e garante que a animação seja disparada
   (equivalente ao app.login-fix.js — integrado aqui)
   ========================= */
(function () {
  function ensureFixedPosition() {
    const lc = document.getElementById('login-container');
    if (!lc) return;
    lc.style.position = 'fixed';
    lc.style.left = '50%';
    lc.style.top = '50%';
    lc.style.transform = 'translate(-50%, -50%)';
    lc.style.zIndex = lc.style.zIndex || '2000';
    lc.style.overflow = 'visible';
  }

  function onLoginInserted() {
    try {
      try { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); } catch (e) { window.scrollTo(0,0); }
      const lc = document.getElementById('login-container');
      if (!lc) return;
      ensureFixedPosition();
      lc.classList.add('login-has-anim');
      if (window.__appEnh && typeof window.__appEnh.animateLogin === 'function') {
        try { window.__appEnh.animateLogin(); } catch (e) { console.debug('animateLogin error', e); }
      } else if (typeof animateLogin === 'function') {
        try { animateLogin(); } catch (e) {}
      }
    } catch (err) { console.debug('onLoginInserted err', err); }
  }

  function listenForLoginMarkup() {
    const lc = document.getElementById('login-container');
    if (!lc) return;
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'childList' && m.addedNodes && m.addedNodes.length) {
          setTimeout(onLoginInserted, 30);
          return;
        }
      }
    });
    mo.observe(lc, { childList: true, subtree: false });
    setTimeout(() => {
      if (lc && lc.innerHTML && lc.innerHTML.trim().length) onLoginInserted();
    }, 60);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', listenForLoginMarkup);
  } else {
    listenForLoginMarkup();
  }
})();

/* =========================
   FIM DO ARQUIVO
   ========================= */