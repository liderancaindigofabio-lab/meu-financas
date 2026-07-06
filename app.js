// ============================================
// MEUFINANCAS - v1.5.0 - 2026-07-03
// ============================================

const LS_TX = 'mf_transacoes_v1';
const LS_CAT = 'mf_categorias_v1';
const LS_ORC = 'mf_orcamentos_v1';
const LS_META = 'mf_metas_v1';
const LS_USER = 'mf_user_v1';
const LS_LOGIN = 'mf_logged_v1';
const LS_REGRAS = 'mf_regras_v1';
const LS_FILA = 'mf_fila_v1';
const LS_BANCOS = 'mf_bancos_v1';
const LS_ITENS = 'mf_items_v1'; // conta + transacoes do pluggy

// === MULTI-USUÁRIOS ===
const LS_USERS = 'mf_users_v1';        // lista de cadastros
const LS_USER_PREFIX = 'mf_u_';        // prefixo p/ dados por usuário
const LS_SESSAO_USERID = 'mf_sessao_uid_v1'; // id do usuário logado

// === CARTÕES & COMPROMISSOS ===
const LS_CARTOES = 'mf_cartoes_v1';        // cartões de crédito
const LS_COMPRAS_CARTAO = 'mf_compras_cartao_v1'; // compras no cartão
const LS_COMPROMISSOS = 'mf_compromissos_v1'; // contas a longo prazo

// === IA: GROQ (Llama 3.3 70B) ===
// Chave Groq fica SÓ no backend (Render). Frontend chama /api/ia no proxy.
const GROQ_API = 'https://meu-financas-proxy-v2.onrender.com/api/ia';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_MODEL_RAPIDO = 'llama-3.1-8b-instant';
const LS_CHAT_HISTORY = 'mf_chat_history_v1'; // histórico do chat por usuário

// PLUGGY - Open Finance (proxy serverless evita CORS e esconde a key)
const PLUGGY_API = '/api/pluggy';

const USUARIO_TESTE = {
    id: 'u_fabio_admin',
    email: 'fabio17dejesusjunior@gmail.com',
    senha: '123456',
    nome: 'Fabio Júnior',
    perfil: 'admin',  // admin pode gerenciar usuários
    criadoEm: '2026-07-03T00:00:00.000Z'
};

let chartLinha = null;
let chartPizza = null;

// === DADOS PADRÃO (criados no primeiro acesso) ===
const CATEGORIAS_PADRAO = [
    { id: 'c1', nome: 'Alimentação', icone: '🍔', cor: '#f59e0b', tipo: 'despesa' },
    { id: 'c2', nome: 'Transporte', icone: '🚗', cor: '#3b82f6', tipo: 'despesa' },
    { id: 'c3', nome: 'Moradia', icone: '🏠', cor: '#8b5cf6', tipo: 'despesa' },
    { id: 'c4', nome: 'Saúde', icone: '⚕️', cor: '#ec4899', tipo: 'despesa' },
    { id: 'c5', nome: 'Lazer', icone: '🎮', cor: '#06b6d4', tipo: 'despesa' },
    { id: 'c6', nome: 'Educação', icone: '🎓', cor: '#10b981', tipo: 'despesa' },
    { id: 'c7', nome: 'Salário', icone: '💼', cor: '#10b981', tipo: 'receita' },
    { id: 'c8', nome: 'Freelance', icone: '💻', cor: '#34d399', tipo: 'receita' },
    { id: 'c9', nome: 'Investimentos', icone: '📈', cor: '#22c55e', tipo: 'receita' },
    { id: 'c10', nome: 'Outros', icone: '📦', cor: '#64748b', tipo: 'ambos' }
];

// === INIT ===
document.addEventListener('DOMContentLoaded', () => {
    // Garante que o admin existe na lista de usuarios
    garantirAdmin();

    if (document.querySelector('.login-body')) {
        document.getElementById('formLogin')?.addEventListener('submit', fazerLogin);
    }
    if (document.querySelector('.dash-body')) {
        if (localStorage.getItem(LS_LOGIN) !== '1') {
            window.location.href = 'index.html';
            return;
        }
        // Compat: se a sessão é antiga (sem LS_SESSAO_USERID), seta como admin principal
        if (!localStorage.getItem(LS_SESSAO_USERID)) {
            localStorage.setItem(LS_SESSAO_USERID, USUARIO_TESTE.id);
            localStorage.setItem(LS_USER, JSON.stringify({ email: USUARIO_TESTE.email, nome: USUARIO_TESTE.nome, perfil: 'admin', id: USUARIO_TESTE.id }));
        }
        carregarTudo();

        // === MAGIC LINK v3: detecta ?file=NOME.json (busca do GitHub) ===
        const params = new URLSearchParams(window.location.search);
        const fileName = params.get('file');
        if (fileName) {
            setTimeout(async () => {
                try {
                    const r = await fetch(fileName + '?t=' + Date.now());
                    if (!r.ok) throw new Error('Arquivo não encontrado');
                    const transacoes = await r.json();
                    if (Array.isArray(transacoes) && transacoes.length > 0) {
                        if (confirm(`🚀 Zapia enviou ${transacoes.length} transações!\n\nImportar tudo agora?`)) {
                            processarJSONZapia(transacoes);
                        }
                    }
                } catch (e) {
                    console.error('Erro:', e);
                    toast('❌ Erro ao buscar importação', true);
                }
                window.history.replaceState({}, '', window.location.pathname);
            }, 800);
        }
    }
});

// === DADOS DE DEMO ===
function carregarDadosDemo() {
    if (getTransacoes().length > 0) {
        if (!confirm('Isso vai SUBSTITUIR seus dados atuais por dados de exemplo. Continuar?')) return;
    }
    const mesesAtras = n => {
        const d = new Date();
        d.setMonth(d.getMonth() - n);
        return d.toISOString().split('T')[0];
    };
    const tx = [
        { id: 'demo-1', tipo: 'receita', descricao: 'Salário', valor: 8500, data: mesesAtras(0), categoriaId: 'c7', obs: '' },
        { id: 'demo-2', tipo: 'receita', descricao: 'Freelance', valor: 1500, data: mesesAtras(0), categoriaId: 'c8', obs: '' },
        { id: 'demo-3', tipo: 'despesa', descricao: 'Aluguel', valor: 1800, data: mesesAtras(0), categoriaId: 'c3', obs: '' },
        { id: 'demo-4', tipo: 'despesa', descricao: 'Supermercado', valor: 850, data: mesesAtras(0), categoriaId: 'c1', obs: '' },
        { id: 'demo-5', tipo: 'despesa', descricao: 'Combustível', valor: 450, data: mesesAtras(0), categoriaId: 'c2', obs: '' },
        { id: 'demo-6', tipo: 'despesa', descricao: 'Academia', valor: 200, data: mesesAtras(0), categoriaId: 'c6', obs: '' },
        { id: 'demo-7', tipo: 'despesa', descricao: 'Lazer', valor: 320, data: mesesAtras(0), categoriaId: 'c5', obs: '' },
        { id: 'demo-8', tipo: 'receita', descricao: 'Salário', valor: 8500, data: mesesAtras(1), categoriaId: 'c7', obs: '' },
        { id: 'demo-9', tipo: 'despesa', descricao: 'Aluguel', valor: 1800, data: mesesAtras(1), categoriaId: 'c3', obs: '' },
        { id: 'demo-10', tipo: 'despesa', descricao: 'Supermercado', valor: 720, data: mesesAtras(1), categoriaId: 'c1', obs: '' },
        { id: 'demo-11', tipo: 'despesa', descricao: 'Combustível', valor: 380, data: mesesAtras(1), categoriaId: 'c2', obs: '' },
        { id: 'demo-12', tipo: 'receita', descricao: 'Salário', valor: 8500, data: mesesAtras(2), categoriaId: 'c7', obs: '' },
        { id: 'demo-13', tipo: 'despesa', descricao: 'Aluguel', valor: 1800, data: mesesAtras(2), categoriaId: 'c3', obs: '' },
        { id: 'demo-14', tipo: 'despesa', descricao: 'Supermercado', valor: 920, data: mesesAtras(2), categoriaId: 'c1', obs: '' },
        { id: 'demo-15', tipo: 'despesa', descricao: 'Plano de saúde', valor: 550, data: mesesAtras(2), categoriaId: 'c4', obs: '' },
        { id: 'demo-16', tipo: 'receita', descricao: 'Salário', valor: 8500, data: mesesAtras(3), categoriaId: 'c7', obs: '' },
        { id: 'demo-17', tipo: 'despesa', descricao: 'Aluguel', valor: 1800, data: mesesAtras(3), categoriaId: 'c3', obs: '' },
        { id: 'demo-18', tipo: 'despesa', descricao: 'Supermercado', valor: 680, data: mesesAtras(3), categoriaId: 'c1', obs: '' },
        { id: 'demo-19', tipo: 'despesa', descricao: 'Curso online', valor: 297, data: mesesAtras(3), categoriaId: 'c6', obs: '' },
        { id: 'demo-20', tipo: 'receita', descricao: 'Salário', valor: 8500, data: mesesAtras(4), categoriaId: 'c7', obs: '' },
        { id: 'demo-21', tipo: 'despesa', descricao: 'Aluguel', valor: 1800, data: mesesAtras(4), categoriaId: 'c3', obs: '' },
        { id: 'demo-22', tipo: 'despesa', descricao: 'Restaurante', valor: 450, data: mesesAtras(4), categoriaId: 'c1', obs: '' },
        { id: 'demo-23', tipo: 'receita', descricao: 'Salário', valor: 8500, data: mesesAtras(5), categoriaId: 'c7', obs: '' },
        { id: 'demo-24', tipo: 'despesa', descricao: 'Aluguel', valor: 1800, data: mesesAtras(5), categoriaId: 'c3', obs: '' },
        { id: 'demo-25', tipo: 'despesa', descricao: 'Supermercado', valor: 780, data: mesesAtras(5), categoriaId: 'c1', obs: '' }
    ];
    const orc = [
        { id: 'o1', categoriaId: 'c1', limite: 1000 },
        { id: 'o2', categoriaId: 'c2', limite: 500 },
        { id: 'o3', categoriaId: 'c3', limite: 2000 },
        { id: 'o4', categoriaId: 'c5', limite: 400 }
    ];
    const metas = [
        { id: 'm1', nome: 'Reserva de Emergência', alvo: 20000, atual: 8500, prazo: mesesAtras(-12), icone: '🛡️' },
        { id: 'm2', nome: 'Troca de Carro', alvo: 35000, atual: 12000, prazo: mesesAtras(-18), icone: '🚗' },
        { id: 'm3', nome: 'Viagem em Família', alvo: 8000, atual: 5200, prazo: mesesAtras(-6), icone: '✈️' }
    ];
    setTransacoes(tx);
    setOrcamentos(orc);
    setMetas(metas);
    carregarTudo();
    toast('✅ Dados de exemplo carregados!');
}

function fazerLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const senha = document.getElementById('loginSenha').value;
    const users = getUsers();
    const achou = users.find(u => u.email === email && u.senha === senha);
    if (achou) {
        // === VERIFICA BLOQUEIO TEMPORÁRIO ===
        if (achou.bloqueadoAte) {
            const ate = new Date(achou.bloqueadoAte);
            if (ate > new Date()) {
                // Mostra tela de bloqueio em vez de só toast
                mostrarTelaBloqueio(achou);
                return;
            } else {
                // Bloqueio expirou - limpa automaticamente
                achou.bloqueadoAte = null;
                achou.motivoBloqueio = null;
                setLS(LS_USERS, users);
            }
        }
        localStorage.setItem(LS_LOGIN, '1');
        localStorage.setItem(LS_SESSAO_USERID, achou.id);
        localStorage.setItem(LS_USER, JSON.stringify({ email: achou.email, nome: achou.nome, perfil: achou.perfil, id: achou.id }));
        // Garante categorias padrão deste usuário
        const catKey = userKey(LS_CAT, achou.id);
        if (!localStorage.getItem(catKey)) {
            localStorage.setItem(catKey, JSON.stringify(CATEGORIAS_PADRAO));
        }
        window.location.href = 'dashboard.html';
    } else {
        toast('❌ E-mail ou senha incorretos', true);
    }
}

// === TELA DE BLOQUEIO ===
function mostrarTelaBloqueio(usuario) {
    const container = document.getElementById('formLoginContainer');
    const tela = document.getElementById('telaBloqueio');
    if (container) container.style.display = 'none';
    if (tela) {
        tela.style.display = 'block';
        const motivoEl = document.getElementById('motivoBloqueioTexto');
        if (motivoEl && usuario.motivoBloqueio) {
            motivoEl.textContent = `Motivo: ${usuario.motivoBloqueio}`;
        } else if (motivoEl) {
            motivoEl.textContent = '';
        }
        // Botao WhatsApp
        const waBtn = document.getElementById('btnWhatsAppBloqueio');
        if (waBtn) {
            const msg = encodeURIComponent(`Olá Fabio, meu acesso ao MeuFinanças está bloqueado. Poderia me ajudar?`);
            waBtn.href = `https://wa.me/5575991485206?text=${msg}`;
        }
    }
}

function voltarLogin() {
    const container = document.getElementById('formLoginContainer');
    const tela = document.getElementById('telaBloqueio');
    if (tela) tela.style.display = 'none';
    if (container) container.style.display = 'block';
    // Limpa o form
    const emailEl = document.getElementById('loginEmail');
    const senhaEl = document.getElementById('loginSenha');
    if (emailEl) emailEl.value = '';
    if (senhaEl) senhaEl.value = '';
}

function abrirEsqueciSenha() {
    const box = document.getElementById('esqueciSenhaBox');
    const waBtn = document.getElementById('btnWhatsAppEsqueci');
    if (box) box.style.display = 'block';
    if (waBtn) {
        const msg = encodeURIComponent('Olá Fabio, esqueci minha senha do MeuFinanças. Poderia me ajudar a recuperar?');
        waBtn.href = `https://wa.me/5575991485206?text=${msg}`;
    }
}

function fecharEsqueciSenha() {
    const box = document.getElementById('esqueciSenhaBox');
    if (box) box.style.display = 'none';
}

function logout() {
    if (confirm('Sair da conta?')) {
        localStorage.removeItem(LS_LOGIN);
        localStorage.removeItem(LS_SESSAO_USERID);
        window.location.href = 'index.html';
    }
}

// === GESTÃO DE USUÁRIOS ===
function getUsers() {
    return getLS(LS_USERS, []);
}
function getUserId() {
    return localStorage.getItem(LS_SESSAO_USERID) || 'u_fabio_admin';
}
function getUserAtual() {
    const id = getUserId();
    return getUsers().find(u => u.id === id) || USUARIO_TESTE;
}
function isAdmin() {
    const u = getUserAtual();
    return u && u.perfil === 'admin';
}
function garantirAdmin() {
    const users = getUsers();
    if (!users.find(u => u.id === USUARIO_TESTE.id)) {
        users.push({ ...USUARIO_TESTE });
        setLS(LS_USERS, users);
    }
}
function userKey(baseKey, uid) {
    return LS_USER_PREFIX + uid + '_' + baseKey.replace('mf_', '');
}
function criarUsuario(nome, email, senha, perfil = 'user') {
    const users = getUsers();
    email = (email || '').trim().toLowerCase();
    if (!nome || !email || !senha) return { ok: false, erro: 'Preencha todos os campos' };
    if (users.find(u => u.email === email)) return { ok: false, erro: 'E-mail já cadastrado' };
    if (senha.length < 4) return { ok: false, erro: 'Senha deve ter no mínimo 4 caracteres' };
    const novo = {
        id: 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        nome: nome.trim(),
        email,
        senha,
        perfil: perfil === 'admin' ? 'admin' : 'user',
        criadoEm: new Date().toISOString()
    };
    users.push(novo);
    setLS(LS_USERS, users);
    return { ok: true, usuario: novo };
}
function removerUsuario(id) {
    if (id === USUARIO_TESTE.id) return { ok: false, erro: 'Não pode remover o admin principal' };
    const users = getUsers().filter(u => u.id !== id);
    setLS(LS_USERS, users);
    return { ok: true };
}
function alterarPerfilUsuario(id, novoPerfil) {
    const users = getUsers();
    const u = users.find(x => x.id === id);
    if (!u) return { ok: false, erro: 'Usuário não encontrado' };
    if (id === USUARIO_TESTE.id && novoPerfil !== 'admin') {
        return { ok: false, erro: 'Admin principal não pode perder o perfil admin' };
    }
    u.perfil = novoPerfil === 'admin' ? 'admin' : 'user';
    setLS(LS_USERS, users);
    return { ok: true };
}
function resetarSenhaUsuario(id, novaSenha) {
    if (!novaSenha || novaSenha.length < 4) return { ok: false, erro: 'Senha deve ter no mínimo 4 caracteres' };
    const users = getUsers();
    const u = users.find(x => x.id === id);
    if (!u) return { ok: false, erro: 'Usuário não encontrado' };
    u.senha = novaSenha;
    setLS(LS_USERS, users);
    return { ok: true };
}

// === BLOQUEIO / DESBLOQUEIO TEMPORÁRIO ===
// bloqueadoAte: ISO string da data/hora até quando o acesso fica travado (null = sem bloqueio)
// motivoBloqueio: texto opcional exibido na tela de login
function bloquearUsuario(id, duracaoHoras, motivo) {
    if (id === USUARIO_TESTE.id) return { ok: false, erro: 'Admin principal não pode ser bloqueado' };
    const users = getUsers();
    const u = users.find(x => x.id === id);
    if (!u) return { ok: false, erro: 'Usuário não encontrado' };
    const horas = parseFloat(duracaoHoras) || 24;
    const ate = new Date(Date.now() + horas * 60 * 60 * 1000);
    u.bloqueadoAte = ate.toISOString();
    u.motivoBloqueio = (motivo || 'Acesso temporariamente suspenso pelo administrador').trim();
    setLS(LS_USERS, users);
    return { ok: true, bloqueadoAte: ate };
}
function desbloquearUsuario(id) {
    const users = getUsers();
    const u = users.find(x => x.id === id);
    if (!u) return { ok: false, erro: 'Usuário não encontrado' };
    u.bloqueadoAte = null;
    u.motivoBloqueio = null;
    setLS(LS_USERS, users);
    return { ok: true };
}
function isUsuarioBloqueado(u) {
    if (!u || !u.bloqueadoAte) return null;
    const ate = new Date(u.bloqueadoAte);
    if (ate > new Date()) return ate;
    return null; // expirado
}

function carregarDemoDireto() {
    localStorage.setItem(LS_LOGIN, '1');
    localStorage.setItem(LS_USER, JSON.stringify({ email: USUARIO_TESTE.email, nome: USUARIO_TESTE.nome }));
    if (!localStorage.getItem(LS_CAT)) localStorage.setItem(LS_CAT, JSON.stringify(CATEGORIAS_PADRAO));
    
    // Configura os dados demo
    const mesesAtras = n => {
        const d = new Date();
        d.setMonth(d.getMonth() - n);
        return d.toISOString().split('T')[0];
    };
    const tx = [
        { id: 'demo-1', tipo: 'receita', descricao: 'Salário', valor: 8500, data: mesesAtras(0), categoriaId: 'c7', obs: '' },
        { id: 'demo-2', tipo: 'receita', descricao: 'Freelance', valor: 1500, data: mesesAtras(0), categoriaId: 'c8', obs: '' },
        { id: 'demo-3', tipo: 'despesa', descricao: 'Aluguel', valor: 1800, data: mesesAtras(0), categoriaId: 'c3', obs: '' },
        { id: 'demo-4', tipo: 'despesa', descricao: 'Supermercado', valor: 850, data: mesesAtras(0), categoriaId: 'c1', obs: '' },
        { id: 'demo-5', tipo: 'despesa', descricao: 'Combustível', valor: 450, data: mesesAtras(0), categoriaId: 'c2', obs: '' },
        { id: 'demo-6', tipo: 'despesa', descricao: 'Academia', valor: 200, data: mesesAtras(0), categoriaId: 'c6', obs: '' },
        { id: 'demo-7', tipo: 'despesa', descricao: 'Lazer', valor: 320, data: mesesAtras(0), categoriaId: 'c5', obs: '' },
        { id: 'demo-8', tipo: 'receita', descricao: 'Salário', valor: 8500, data: mesesAtras(1), categoriaId: 'c7', obs: '' },
        { id: 'demo-9', tipo: 'despesa', descricao: 'Aluguel', valor: 1800, data: mesesAtras(1), categoriaId: 'c3', obs: '' },
        { id: 'demo-10', tipo: 'despesa', descricao: 'Supermercado', valor: 720, data: mesesAtras(1), categoriaId: 'c1', obs: '' },
        { id: 'demo-11', tipo: 'despesa', descricao: 'Combustível', valor: 380, data: mesesAtras(1), categoriaId: 'c2', obs: '' },
        { id: 'demo-12', tipo: 'receita', descricao: 'Salário', valor: 8500, data: mesesAtras(2), categoriaId: 'c7', obs: '' },
        { id: 'demo-13', tipo: 'despesa', descricao: 'Aluguel', valor: 1800, data: mesesAtras(2), categoriaId: 'c3', obs: '' },
        { id: 'demo-14', tipo: 'despesa', descricao: 'Supermercado', valor: 920, data: mesesAtras(2), categoriaId: 'c1', obs: '' },
        { id: 'demo-15', tipo: 'despesa', descricao: 'Plano de saúde', valor: 550, data: mesesAtras(2), categoriaId: 'c4', obs: '' },
        { id: 'demo-16', tipo: 'receita', descricao: 'Salário', valor: 8500, data: mesesAtras(3), categoriaId: 'c7', obs: '' },
        { id: 'demo-17', tipo: 'despesa', descricao: 'Aluguel', valor: 1800, data: mesesAtras(3), categoriaId: 'c3', obs: '' },
        { id: 'demo-18', tipo: 'despesa', descricao: 'Supermercado', valor: 680, data: mesesAtras(3), categoriaId: 'c1', obs: '' },
        { id: 'demo-19', tipo: 'despesa', descricao: 'Curso online', valor: 297, data: mesesAtras(3), categoriaId: 'c6', obs: '' },
        { id: 'demo-20', tipo: 'receita', descricao: 'Salário', valor: 8500, data: mesesAtras(4), categoriaId: 'c7', obs: '' },
        { id: 'demo-21', tipo: 'despesa', descricao: 'Aluguel', valor: 1800, data: mesesAtras(4), categoriaId: 'c3', obs: '' },
        { id: 'demo-22', tipo: 'despesa', descricao: 'Restaurante', valor: 450, data: mesesAtras(4), categoriaId: 'c1', obs: '' },
        { id: 'demo-23', tipo: 'receita', descricao: 'Salário', valor: 8500, data: mesesAtras(5), categoriaId: 'c7', obs: '' },
        { id: 'demo-24', tipo: 'despesa', descricao: 'Aluguel', valor: 1800, data: mesesAtras(5), categoriaId: 'c3', obs: '' },
        { id: 'demo-25', tipo: 'despesa', descricao: 'Supermercado', valor: 780, data: mesesAtras(5), categoriaId: 'c1', obs: '' }
    ];
    const orc = [
        { id: 'o1', categoriaId: 'c1', limite: 1000 },
        { id: 'o2', categoriaId: 'c2', limite: 500 },
        { id: 'o3', categoriaId: 'c3', limite: 2000 },
        { id: 'o4', categoriaId: 'c5', limite: 400 }
    ];
    const metas = [
        { id: 'm1', nome: 'Reserva de Emergência', alvo: 20000, atual: 8500, prazo: mesesAtras(-12), icone: '🛡️' },
        { id: 'm2', nome: 'Troca de Carro', alvo: 35000, atual: 12000, prazo: mesesAtras(-18), icone: '🚗' },
        { id: 'm3', nome: 'Viagem em Família', alvo: 8000, atual: 5200, prazo: mesesAtras(-6), icone: '✈️' }
    ];
    
    setTransacoes(tx);
    setOrcamentos(orc);
    setMetas(metas);

    window.location.href = 'dashboard.html';
}

// === HELPERS ===
function getLS(key, def) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? def : v; }
    catch { return def; }
}
function setLS(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
// === ISOLAMENTO POR USUÁRIO ===
// Cada usuario tem seus proprios dados (transacoes, orcamentos, metas, etc.)
// As chaves passam a ser prefixadas com o id do usuario logado
const DADOS_KEYS = ['mf_transacoes_v1','mf_categorias_v1','mf_orcamentos_v1','mf_metas_v1','mf_regras_v1','mf_fila_v1','mf_bancos_v1','mf_items_v1'];

function _keyUsuario(baseKey) {
    const uid = (typeof localStorage !== 'undefined' && localStorage.getItem(LS_SESSAO_USERID)) || USUARIO_TESTE.id;
    return LS_USER_PREFIX + uid + '_' + baseKey.replace('mf_', '');
}

function getCategorias() { return getLS(_keyUsuario(LS_CAT), CATEGORIAS_PADRAO); }
function getTransacoes() { return getLS(_keyUsuario(LS_TX), []); }
function getOrcamentos() { return getLS(_keyUsuario(LS_ORC), []); }
function getMetas() { return getLS(_keyUsuario(LS_META), []); }
function getRegras() { return getLS(_keyUsuario(LS_REGRAS), []); }
function getFila() { return getLS(_keyUsuario(LS_FILA), []); }
function getBancosConectados() { return getLS(_keyUsuario(LS_BANCOS), []); }
function getItensPluggy() { return getLS(_keyUsuario(LS_ITENS), []); }

function setCategorias(v) { setLS(_keyUsuario(LS_CAT), v); }
function setTransacoes(v) { setLS(_keyUsuario(LS_TX), v); }
function setOrcamentos(v) { setLS(_keyUsuario(LS_ORC), v); }
function setMetas(v) { setLS(_keyUsuario(LS_META), v); }
function setRegras(v) { setLS(_keyUsuario(LS_REGRAS), v); }
function setFila(v) { setLS(_keyUsuario(LS_FILA), v); }
function setBancosConectados(v) { setLS(_keyUsuario(LS_BANCOS), v); }
function setItensPluggy(v) { setLS(_keyUsuario(LS_ITENS), v); }

// Migracao automatica: na primeira vez que o admin logar, copia dados da chave antiga para a chave nova
function migrarDadosAdminSeNecessario() {
    const uid = localStorage.getItem(LS_SESSAO_USERID) || USUARIO_TESTE.id;
    if (uid !== USUARIO_TESTE.id) return;
    if (localStorage.getItem('mf_migrado_v1') === 'ok') return;
    DADOS_KEYS.forEach(baseKey => {
        const novo = _keyUsuario(baseKey);
        if (localStorage.getItem(baseKey) && !localStorage.getItem(novo)) {
            localStorage.setItem(novo, localStorage.getItem(baseKey));
            localStorage.removeItem(baseKey);
        }
    });
    localStorage.setItem('mf_migrado_v1', 'ok');
}

// === PRE-CARREGAR TRANSACOES DO SANTANDER (maio/2026) ===
// Se nao tiver transacoes OU se a versao do seed mudou, injeta as 63 transacoes reais
const SEED_MAIO_2026 = 'seed_maio_2026_v1';
const TRANSACOES_MAIO_2026 = [
  {"data":"2026-05-04","descricao":"PIX RECEBIDO - BSD E COMMERCIE UNIPESSOA","valor":20.00,"tipo":"receita"},
  {"data":"2026-05-04","descricao":"PIX RECEBIDO - MP9 CAPITAL PAY LTDA","valor":30.00,"tipo":"receita"},
  {"data":"2026-05-04","descricao":"PIX ENVIADO - Fabio de Jesus Junior","valor":50.00,"tipo":"despesa"},
  {"data":"2026-05-05","descricao":"PIX RECEBIDO - MP9 CAPITAL PAY LTDA","valor":20.00,"tipo":"receita"},
  {"data":"2026-05-05","descricao":"PIX ENVIADO - CPPAY","valor":20.00,"tipo":"despesa"},
  {"data":"2026-05-12","descricao":"PIX RECEBIDO - JS INTERMEDIATIONS LTDA","valor":20.00,"tipo":"receita"},
  {"data":"2026-05-12","descricao":"PIX ENVIADO - JS INTERMEDIATIONS LTDA","valor":10.00,"tipo":"despesa"},
  {"data":"2026-05-12","descricao":"PIX ENVIADO - JS INTERMEDIATIONS LTDA","valor":10.00,"tipo":"despesa"},
  {"data":"2026-05-12","descricao":"PIX RECEBIDO - BETANIA SOUZA DA SILVA","valor":69.90,"tipo":"receita"},
  {"data":"2026-05-12","descricao":"PIX ENVIADO - Univebet Gaming Ltda","valor":60.00,"tipo":"despesa"},
  {"data":"2026-05-12","descricao":"PIX ENVIADO - Univebet Gaming Ltda","valor":10.00,"tipo":"despesa"},
  {"data":"2026-05-14","descricao":"CREDITO DE SALARIO - CNPJ 060537263000166","valor":185.36,"tipo":"receita"},
  {"data":"2026-05-14","descricao":"PIX ENVIADO - PAGAR ME S A","valor":120.00,"tipo":"despesa"},
  {"data":"2026-05-14","descricao":"PIX ENVIADO - G S D A TECHNOLOGY LTDA","valor":50.00,"tipo":"despesa"},
  {"data":"2026-05-14","descricao":"PIX ENVIADO - Univebet Gaming Ltda","valor":16.00,"tipo":"despesa"},
  {"data":"2026-05-14","descricao":"PIX ENVIADO - Pix Marketplace","valor":39.93,"tipo":"despesa"},
  {"data":"2026-05-14","descricao":"PIX ENVIADO - JS INTERMEDIATIONS LTDA","valor":10.00,"tipo":"despesa"},
  {"data":"2026-05-14","descricao":"PIX RECEBIDO - TYPHON TECNOLOGIA E SERVI","valor":50.00,"tipo":"receita"},
  {"data":"2026-05-15","descricao":"PIX RECEBIDO - Guilherme de Souza Carnei","valor":14.99,"tipo":"receita"},
  {"data":"2026-05-15","descricao":"PIX ENVIADO - JS INTERMEDIATIONS LTDA","valor":15.00,"tipo":"despesa"},
  {"data":"2026-05-18","descricao":"PIX RECEBIDO - Jucinelma Mendes Silva","valor":69.90,"tipo":"receita"},
  {"data":"2026-05-18","descricao":"PIX ENVIADO - BGB Entretenimento Ltda","valor":50.00,"tipo":"despesa"},
  {"data":"2026-05-18","descricao":"PIX ENVIADO - JS INTERMEDIATIONS LTDA","valor":20.00,"tipo":"despesa"},
  {"data":"2026-05-19","descricao":"PIX RECEBIDO - JS INTERMEDIATIONS LTDA","valor":20.00,"tipo":"receita"},
  {"data":"2026-05-19","descricao":"PIX ENVIADO - G S D A TECHNOLOGY LTDA","valor":10.00,"tipo":"despesa"},
  {"data":"2026-05-19","descricao":"PIX ENVIADO - Univebet Gaming Ltda","valor":10.00,"tipo":"despesa"},
  {"data":"2026-05-25","descricao":"PIX RECEBIDO - CAIXA ECONOMICA FEDERAL","valor":836.98,"tipo":"receita"},
  {"data":"2026-05-25","descricao":"PIX RECEBIDO - CAIXA ECONOMICA FEDERAL","valor":1.03,"tipo":"receita"},
  {"data":"2026-05-25","descricao":"PIX RECEBIDO - CAIXA ECONOMICA FEDERAL","valor":7.11,"tipo":"receita"},
  {"data":"2026-05-25","descricao":"PIX ENVIADO - Fabio de Jesus Junior","valor":800.00,"tipo":"despesa"},
  {"data":"2026-05-25","descricao":"PIX ENVIADO - MOVETECH SISTEMAS E TECNO","valor":20.00,"tipo":"despesa"},
  {"data":"2026-05-25","descricao":"PIX ENVIADO - J E C V TECHNOLOGY LTDA","valor":25.00,"tipo":"despesa"},
  {"data":"2026-05-26","descricao":"PIX RECEBIDO - Betrinha ltda","valor":30.00,"tipo":"receita"},
  {"data":"2026-05-26","descricao":"PIX ENVIADO - J E C V TECHNOLOGY LTDA","valor":10.00,"tipo":"despesa"},
  {"data":"2026-05-26","descricao":"PIX ENVIADO - Univebet Gaming Ltda","valor":20.00,"tipo":"despesa"},
  {"data":"2026-05-26","descricao":"PIX RECEBIDO - EDNA CARNEIRO DE SOUZA","valor":80.00,"tipo":"receita"},
  {"data":"2026-05-26","descricao":"PIX ENVIADO - BGB Entretenimento Ltda","valor":80.00,"tipo":"despesa"},
  {"data":"2026-05-27","descricao":"PIX RECEBIDO - JS INTERMEDIATIONS LTDA","valor":20.00,"tipo":"receita"},
  {"data":"2026-05-27","descricao":"PIX ENVIADO - J E C V TECHNOLOGY LTDA","valor":19.00,"tipo":"despesa"},
  {"data":"2026-05-27","descricao":"PIX RECEBIDO - FLAVIO SOUSA DE SANTANA","valor":69.90,"tipo":"receita"},
  {"data":"2026-05-27","descricao":"PIX ENVIADO - J E C V TECHNOLOGY LTDA","valor":70.00,"tipo":"despesa"},
  {"data":"2026-05-28","descricao":"PIX RECEBIDO - GILVA SANTOS A","valor":50.00,"tipo":"receita"},
  {"data":"2026-05-28","descricao":"DEBITO VISA ELECTRON - DROGASIL 2595","valor":31.79,"tipo":"despesa"},
  {"data":"2026-05-28","descricao":"PIX ENVIADO - GO TECNOLOGIA LTDA","valor":19.00,"tipo":"despesa"},
  {"data":"2026-05-29","descricao":"PIX RECEBIDO - J E C V TECHNOLOGY LTDA","valor":900.00,"tipo":"receita"},
  {"data":"2026-05-29","descricao":"PIX ENVIADO - J E C V TECHNOLOGY LTDA","valor":500.00,"tipo":"despesa"},
  {"data":"2026-05-29","descricao":"PIX ENVIADO - J E C V TECHNOLOGY LTDA","valor":200.00,"tipo":"despesa"},
  {"data":"2026-05-29","descricao":"PIX RECEBIDO - J E C V TECHNOLOGY LTDA","valor":500.00,"tipo":"receita"},
  {"data":"2026-05-29","descricao":"PIX ENVIADO - J E C V TECHNOLOGY LTDA","valor":500.00,"tipo":"despesa"},
  {"data":"2026-05-29","descricao":"PIX RECEBIDO - MIDPAY SYSTEMS LTDA","valor":401.00,"tipo":"receita"},
  {"data":"2026-05-29","descricao":"DEBITO VISA ELECTRON - HOTEL OLIVEIRA","valor":25.00,"tipo":"despesa"},
  {"data":"2026-05-29","descricao":"RECARGA CELULAR - CLARO SP","valor":30.00,"tipo":"despesa"},
  {"data":"2026-05-29","descricao":"DEBITO VISA ELECTRON - FARMACIAS NORDESTE","valor":12.00,"tipo":"despesa"},
  {"data":"2026-05-29","descricao":"PIX ENVIADO - FROGPAY SOLUCAO EM PAGAME","valor":30.00,"tipo":"despesa"},
  {"data":"2026-05-29","descricao":"DEBITO VISA ELECTRON - CHURRASCARIA BERRANTE","valor":6.00,"tipo":"despesa"},
  {"data":"2026-05-29","descricao":"PIX ENVIADO - J E C V TECHNOLOGY LTDA","valor":100.00,"tipo":"despesa"},
  {"data":"2026-05-29","descricao":"PIX ENVIADO - J E C V TECHNOLOGY LTDA","valor":200.00,"tipo":"despesa"},
  {"data":"2026-05-29","descricao":"PIX ENVIADO - FS DUARTE COMERCIO ATACAD","valor":98.00,"tipo":"despesa"},
  {"data":"2026-05-29","descricao":"PIX RECEBIDO - FABIO DE JESUS","valor":66.00,"tipo":"receita"},
  {"data":"2026-05-29","descricao":"PIX ENVIADO - J E C V TECHNOLOGY LTDA","valor":66.00,"tipo":"despesa"},
  {"data":"2026-05-29","descricao":"PIX RECEBIDO - GLEIDE RAIANY SILVA DE JE","valor":69.90,"tipo":"receita"},
  {"data":"2026-05-29","descricao":"PIX ENVIADO - J E C V TECHNOLOGY LTDA","valor":70.00,"tipo":"despesa"},
  {"data":"2026-05-29","descricao":"PIX ENVIADO - J E C V TECHNOLOGY LTDA","valor":100.00,"tipo":"despesa"}
];

function seedTransacoesSantander() {
    // Se ja foi seedado, nao faz nada
    if (localStorage.getItem(SEED_MAIO_2026) === 'ok') return;
    // Se ja tem transacoes, marca como seedado e sai
    if (getTransacoes().length > 0) {
        localStorage.setItem(SEED_MAIO_2026, 'ok');
        return;
    }
    // Injeta as 63 transacoes reais do Santander
    const agora = new Date().toISOString();
    const tx = TRANSACOES_MAIO_2026.map(t => ({
        id: uid(),
        tipo: t.tipo,
        descricao: t.descricao,
        valor: t.valor,
        data: t.data,
        categoriaId: categorizarTexto(t.descricao, t.tipo),
        obs: 'Extrato Santander maio/2026',
        criadoEm: agora
    }));
    setTransacoes(tx);
    localStorage.setItem(SEED_MAIO_2026, 'ok');
    console.log(`[MeuFinancas] Pre-carregadas ${tx.length} transacoes reais de maio/2026`);
}

function fmtBRL(v) {
    return 'R$ ' + (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtData(iso) {
    if (!iso) return '-';
    const [y, m, d] = iso.split('-');
    return d + '/' + m + '/' + y;
}
function uid() { return Date.now() + '-' + Math.random().toString(36).substr(2, 5); }

function openModal(id) { document.getElementById(id)?.classList.add('show'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('show'); }

// ============================================
// IMPORTACAO DE EXTRATO (Foto, PDF, CSV)
// ============================================
function abrirImportFoto() { document.getElementById('importFoto').click(); }
function abrirImportPDF() { document.getElementById('importPDF').click(); }
function abrirImportCSV() { document.getElementById('importCSV').click(); }
function abrirImportJSON() { document.getElementById('importJSON').click(); }

// SISTEMA DE DROPZONE: Solta PDF/Foto e envia pro Zapia processar
let arquivoParaEnviar = null;

function soltarExtrato(event) {
    const file = event.target.files[0];
    if (!file) return;
    arquivoParaEnviar = file;
    document.getElementById('arquivoNome').textContent = '📄 ' + file.name;
    document.getElementById('arquivoTamanho').textContent = (file.size / 1024).toFixed(1) + ' KB';
    document.getElementById('arquivoInfo').style.display = 'block';
    document.getElementById('btnEnviarZapia').style.display = 'block';
    document.getElementById('dropzone').style.borderColor = '#10b981';
    document.getElementById('dropzone').style.background = 'rgba(16,185,129,0.1)';
}

// Envia arquivo pro Zapia via WhatsApp (mais pratico)
async function enviarParaZapia() {
    if (!arquivoParaEnviar) {
        toast('Selecione um arquivo primeiro!', true);
        return;
    }

    // Para arquivos PEQUENOS (fotos), le como base64
    if (arquivoParaEnviar.size < 5 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64 = e.target.result;
            // Salva no localStorage pra gente acessar
            localStorage.setItem('zapia_arquivo_pendente', JSON.stringify({
                nome: arquivoParaEnviar.name,
                tipo: arquivoParaEnviar.type,
                tamanho: arquivoParaEnviar.size,
                base64: base64,
                timestamp: Date.now()
            }));

            // Monta mensagem pro Zapia com instrucoes
            const msg = `🤖 *Importar extrato bancario*\n\n` +
                       `Arquivo: *${arquivoParaEnviar.name}* (${(arquivoParaEnviar.size/1024).toFixed(1)} KB)\n` +
                       `Tipo: ${arquivoParaEnviar.type || 'detectado'}\n\n` +
                       `Por favor, processe este extrato bancario e me devolva o JSON com todas as transacoes no formato:\n` +
                       `\`\`\`json\n[{"data":"YYYY-MM-DD","descricao":"...","valor":0.00,"tipo":"receita|despesa"}]\n\`\`\`\n\n` +
                       `Dados do arquivo (base64):\n${base64.substring(0, 100)}...\n` +
                       `(tamanho total: ${base64.length} chars base64)`;

            // Copia a mensagem pra area de transferencia
            try {
                await navigator.clipboard.writeText(msg);
                toast('✅ Mensagem copiada! Agora abre o Zapia e cola (Ctrl+V)');
            } catch (err) {
                // Fallback: abre WhatsApp direto
                const wppUrl = `https://wa.me/5516997902168?text=${encodeURIComponent(msg)}`;
                window.open(wppUrl, '_blank');
            }

            // Abre o Zapia (voce tem que ta logado)
            setTimeout(() => {
                window.open('https://zapia.com', '_blank');
            }, 500);
        };
        reader.readAsDataURL(arquivoParaEnviar);
    } else {
        toast('Arquivo muito grande! Max 5MB. Tenta uma foto menor.', true);
    }
}

// Detecta JSON colado no chat (caso o Zapia responda com JSON)
function verificarRespostaZapia() {
    // Verifica se tem um JSON novo no clipboard
    navigator.clipboard.readText().then(text => {
        try {
            const trimmed = text.trim();
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                const data = JSON.parse(trimmed);
                if (Array.isArray(data) && data.length > 0 && data[0].data) {
                    if (confirm(`Detectei ${data.length} transacoes no clipboard! Importar agora?`)) {
                        processarJSONZapia(data);
                    }
                }
            }
        } catch (e) {}
    });
}

// Processa o JSON que veio do Zapia
function processarJSONZapia(data) {
    const norm = data.map(t => ({
        data: t.data || t.date || new Date().toISOString().split('T')[0],
        descricao: t.descricao || t.description || t.desc || 'Sem descricao',
        valor: Math.abs(parseFloat(t.valor || t.amount || t.value || 0)),
        tipo: t.tipo || t.type || 'despesa',
        categoriaId: t.categoriaId || categorizarTexto(t.descricao || ''),
        obs: t.obs || 'Importado via Zapia IA'
    })).filter(t => t.valor > 0);
    mostrarPreviewImportacao(norm);
}

// Importa arquivo JSON gerado pelo Zapia
function importarJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const status = document.getElementById('importStatus');
    const progress = document.getElementById('importProgress');
    status.style.display = 'block';
    progress.textContent = '📁 Lendo arquivo JSON...';

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            // Suporta varios formatos: array direto, ou {transacoes: []}
            const transacoes = Array.isArray(data) ? data : (data.transacoes || data.transactions || []);
            if (transacoes.length === 0) {
                progress.textContent = '❌ Arquivo JSON não tem transações. Verifica o formato.';
                return;
            }
            // Normaliza campos
            const norm = transacoes.map(t => ({
                data: t.data || t.date || new Date().toISOString().split('T')[0],
                descricao: t.descricao || t.description || t.desc || 'Sem descrição',
                valor: Math.abs(parseFloat(t.valor || t.amount || t.value || 0)),
                tipo: t.tipo || t.type || ((parseFloat(t.valor) < 0 || /debito|compra|pagamento/i.test(t.descricao || '')) ? 'despesa' : 'receita'),
                categoriaId: t.categoriaId || t.category || categorizarTexto(t.descricao || '', t.tipo || 'despesa'),
                obs: t.obs || t.note || 'Importado via Zapia IA'
            })).filter(t => t.valor > 0);

            mostrarPreviewImportacao(norm);
        } catch (err) {
            progress.textContent = '❌ Erro ao ler JSON: ' + err.message;
        }
    };
    reader.readAsText(file);
}

// Regex pra extrair transacoes de texto OCR/PDF
const REGEX_TRANSACOES = [
    // Formato: DD/MM/YYYY  DESCRICAO  VALOR  (com sinal -)
    /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(-?R\$?\s*[\d.,]+)/g,
    // Formato: DD/MM  DESCRICAO  -VALOR
    /(\d{2}\/\d{2})\s+(.+?)\s+(-?R?\$?\s*[\d.,]+)/g,
    // Formato: DD/MM DESCRICAO 1.234,56 D/C
    /(\d{2}\/\d{2})\s+(.+?)\s+([\d.,]+)\s+([DC])/g,
    // Formato: 12/05 Pix recebido Joao 150.00
    /(\d{2}\/\d{2})\s+(Pix\s+\w+\s+\w+)\s+([\d.,]+)/gi
];

// === PARSER: BANCO DO BRASIL (PDF/TEXTO) ===
// Padrão BB (extrato oficial PDF/texto):
//   01/07/2026  70048  833070048120629  1.000,00 (+) Dep dinheiro ATM
//   01/07/2026  13105  70101  500,00 (-) Pix - Enviado
//   02/07/2026  70048  833070048120629  1.000,00 (-) Pgto conta luz
//   13105  8331  0204  111122222
//   PROJETO INTERMEDIACAO DE SOLDAS
//   LTDA ME 29 545 100 0001 81
//
// Quando a descrição quebra em várias linhas (2-4 linhas extras), o parser
// precisa juntar tudo até a próxima transação.
function extrairTransacoesBB(texto) {
    const transacoes = [];
    const linhas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // Regex de linha inicial do BB: DD/MM/AAAA + vários números (lote, sequência, doc)
    // + valor + (sinal) + descrição
    const reLinhaBB = /^(\d{2}\/\d{2}\/\d{4})\s+([\d.\s]+?)\s+([\d.,]+)\s+\(([+-])\)\s*(.*)/;

    // Regex de linha só com código numérico (documento BB): ex "13105  8331  0204  111122222"
    const reLinhaDoc = /^([\d.\s,]{4,})$/;

    for (let i = 0; i < linhas.length; i++) {
        const linha = linhas[i];
        const match = linha.match(reLinhaBB);

        if (match) {
            const [, dataBR, , valorStr, sinal, restoLinha] = match;
            const [d, m, y] = dataBR.split('/');
            const valor = parseValorFlex(valorStr);
            let descricao = restoLinha.trim();

            // Linhas seguintes que podem fazer parte da mesma transação:
            // - códigos numéricos de doc
            // - nomes/razões sociais (texto puro, sem data, sem valor)
            let j = i + 1;
            while (j < linhas.length) {
                const prox = linhas[j].trim();
                // Se a próxima linha é NOVA transação, para
                if (reLinhaBB.test(prox)) break;
                // Se tem data tipo "DD/MM/AAAA", é nova transação (BB sempre usa AAAA)
                if (/\b\d{2}\/\d{2}\/\d{4}\b/.test(prox)) break;
                // Adiciona à descrição se for doc numérico OU texto que começa com letra
                if (reLinhaDoc.test(prox) || /^[A-ZÀ-Úa-zà-ú]/.test(prox)) {
                    descricao += ' ' + prox;
                }
                j++;
            }
            i = j - 1; // pula linhas que já foram consumidas

            const descTotal = descricao.replace(/\s+/g, ' ').trim();
            const valorFinal = sinal === '-' ? -valor : valor;

            transacoes.push({
                data: `${y}-${m}-${d}`,
                descricao: descTotal.substring(0, 100) || 'Lançamento BB',
                valor: Math.abs(valorFinal),
                tipo: valorFinal < 0 ? 'despesa' : 'receita',
                categoriaId: categorizarTexto(descTotal, valorFinal < 0 ? 'despesa' : 'receita')
            });
        }
    }
    return transacoes;
}

function extrairTransacoesDoTexto(texto) {
    console.log("Iniciando extração de transações...");
    // Regex do padrão BB: DD/MM/AAAA + lote + docs + valor + (sinal)
    const reLinhaBB = /\b\d{2}\/\d{2}\/\d{4}\b\s+\d+\s+\d+\s+[\d.,]+\s+\([+-]\)/;
    if (texto.includes("Banco do Brasil") || (texto.includes("Agência:") && texto.includes("Conta:")) || reLinhaBB.test(texto)) {
        return extrairTransacoesBB(texto);
    }
    if (texto.toUpperCase().includes("SANTANDER")) {
        return extrairTransacoesSantander(texto);
    }
    return extrairTransacoesPrintApp(texto);
}

// === PARSER: PRINT DE TELA NUBANK / APP BANCÁRIO ===
// Aceita 2 formatos (OCR pode gerar qualquer um):
//
// Formato A (tipo e valor em linhas separadas):
//   Pix - Recebido
//   R$ 2,00
//   02/07 16:11 ***.216.525-** FABIO DE JESUS
//
// Formato B (OCR juntou tipo + valor na mesma linha - MAIS COMUM):
//   Pix - Recebido R$ 2,00
//   02/07 16:11 ***.216.525-** FABIO DE JESUS
//
// Formato C (valor antes do tipo):
//   R$ 2,00
//   Pix - Recebido
//   02/07 16:11 ...
function extrairTransacoesPrintApp(texto) {
    const transacoes = [];
    const linhas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // Detecta ano
    const anoMatch = texto.match(/\b(20\d{2})\b/);
    const ano = anoMatch ? anoMatch[1] : new Date().getFullYear().toString();

    // Mapeia meses em português
    const meses = {
        'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04', 'mai': '05', 'jun': '06',
        'jul': '07', 'ago': '08', 'set': '09', 'out': '10', 'nov': '11', 'dez': '12',
        'janeiro': '01', 'fevereiro': '02', 'marco': '03', 'março': '03', 'abril': '04',
        'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08', 'setembro': '09',
        'outubro': '10', 'novembro': '11', 'dezembro': '12'
    };

    // Regex de tipos conhecidos (pra validar se a linha é mesmo um tipo de transação)
    const reTipo = /(pix\s*[-–]?\s*(recebid|enviad|devolvid|receb|envio)|transfer[êe]ncia\s+(recebid|enviad|envio|receb)|dep(?:[oó]sito)?\s*dinheiro\s*atm|dep\s*dinheiro|saque\s|compra\s+aprovada|pagamento\s+de|pagamento\s+efetuado|boleto|tarifa|recarga|d[ée]bito\s+autom[áa]tico|estorn|cashback|rendimento|compra\s+(no|no\s+cart[ãa]o))/i;

    // Regex de valor (com ou sem -, com ou sem R$)
    const reValor = /(-?R?\$?\s*\d{1,3}(?:\.\d{3})*,\d{2})/;

    // Regex de data/hora: DD/MM HH:MM ou DD de mês
    const reDataHora = /^(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/;
    const reDataHoraMes = /^(\d{2})\s+([a-zç]{3,9})\s+(\d{2}):(\d{2})/i;
    const reDataCompleta = /^(\d{2})\s+de\s+([a-zç]{3,9})/i;
    const reDataCurta = /^(\d{2})\/(\d{2})$/;

    let transacaoAtual = null;

    function finalizar() {
        if (transacaoAtual && transacaoAtual.data && transacaoAtual.valor > 0) {
            const tipo = detectarTipoTransacao(
                transacaoAtual.valorStr,
                transacaoAtual.descricao,
                transacaoAtual.isNegativo ? -transacaoAtual.valor : transacaoAtual.valor
            );
            transacoes.push({
                data: transacaoAtual.data,
                descricao: transacaoAtual.descricao.substring(0, 80) || 'Transação sem descrição',
                valor: transacaoAtual.valor,
                tipo,
                categoriaId: categorizarTexto(transacaoAtual.descricao, tipo)
            });
        }
    }

    for (let i = 0; i < linhas.length; i++) {
        const linha = linhas[i];
        if (linha.length < 2) continue;

        // === LINHA SÓ COM DATA: "02/07 16:11 ..." (DESPESA/RECEITA) ===
        const mDataHora = linha.match(reDataHora);
        if (mDataHora) {
            if (!transacaoAtual) {
                // Data veio antes de tudo (improvável, mas trata)
                transacaoAtual = { data: `${ano}-${mDataHora[2]}-${mDataHora[1]}`, descricao: '', valor: 0, valorStr: '', isNegativo: false };
            } else {
                transacaoAtual.data = `${ano}-${mDataHora[2]}-${mDataHora[1]}`;
            }
            // O resto da linha é descrição
            const resto = linha.replace(reDataHora, '').trim();
            if (resto.length > 2) {
                transacaoAtual.descricao = (transacaoAtual.descricao + ' ' + resto).trim();
            }
            // Finaliza se já tem valor
            if (transacaoAtual.valor > 0) {
                finalizar();
                transacaoAtual = null;
            }
            continue;
        }

        // Data com mês: "02 jul 16:11"
        const mDataMes = linha.match(reDataHoraMes);
        if (mDataMes) {
            const mesNum = meses[mDataMes[2].toLowerCase()] || '01';
            if (!transacaoAtual) transacaoAtual = { data: '', descricao: '', valor: 0, valorStr: '', isNegativo: false };
            transacaoAtual.data = `${ano}-${mesNum}-${mDataMes[1]}`;
            const resto = linha.replace(reDataHoraMes, '').trim();
            if (resto.length > 2) {
                transacaoAtual.descricao = (transacaoAtual.descricao + ' ' + resto).trim();
            }
            if (transacaoAtual.valor > 0) { finalizar(); transacaoAtual = null; }
            continue;
        }

        // "02 de julho, quinta" - cabeçalho de dia, salva o dia
        const mDataCab = linha.match(reDataCompleta);
        if (mDataCab) {
            const mesNum = meses[mDataCab[2].toLowerCase()];
            if (mesNum) {
                // Salva contexto do mês (variável global, vai usar nas próximas)
                window._printMesAtual = mesNum;
                window._printDiaAtual = mDataCab[1];
            }
            continue;
        }

        // === LINHA COM TIPO + VALOR JUNTOS (caso comum do OCR) ===
        // "Pix - Recebido R$ 2,00"  ou  "Pix-Envio devolvido R$ 30,90"
        if (reTipo.test(linha) && reValor.test(linha)) {
            const mTipo = linha.match(reTipo);
            const mValor = linha.match(reValor);
            const tipoTexto = (mTipo[0] || '').trim();
            const valorStr = mValor[1].trim();
            const valor = parseValorFlex(valorStr);

            // Finaliza anterior se tiver
            finalizar();
            transacaoAtual = {
                data: null,
                descricao: tipoTexto,
                valor,
                valorStr,
                isNegativo: valorStr.startsWith('-')
            };
            continue;
        }

        // === LINHA SÓ COM TIPO: "Pix - Recebido" ===
        if (reTipo.test(linha) && !reValor.test(linha)) {
            // Pode ser: cabeçalho de nova transação, ou continuação
            if (transacaoAtual && transacaoAtual.valor > 0 && transacaoAtual.data) {
                // Tinha uma completa, finaliza e começa outra
                finalizar();
            }
            transacaoAtual = {
                data: null,
                descricao: linha.trim(),
                valor: 0,
                valorStr: '',
                isNegativo: false
            };
            continue;
        }

        // === LINHA SÓ COM VALOR: "R$ 2,00" ou "-R$ 2,00" ou "1.000,00" ===
        if (reValor.test(linha) && !reDataHora.test(linha) && !reDataHoraMes.test(linha)) {
            const mValor = linha.match(reValor);
            const valorStr = mValor[1].trim();
            const valor = parseValorFlex(valorStr);

            if (!transacaoAtual) {
                // Valor veio sozinho (improvável), cria transação vazia
                transacaoAtual = { data: null, descricao: '', valor, valorStr, isNegativo: valorStr.startsWith('-') };
            } else {
                // Atribui valor à transação atual
                transacaoAtual.valor = valor;
                transacaoAtual.valorStr = valorStr;
                transacaoAtual.isNegativo = valorStr.startsWith('-');
            }
            continue;
        }

        // === LINHA DE TEXTO GENÉRICA: continuação da descrição ou cabeçalho ===
        // Ignora cabeçalhos de navegação (MESMO QUE TENHA CARACTERES ANTES tipo "&&", "10:35", etc)
        if (/(\bextratos\b|conta-?corrente|poupan[çc]a|cart[ãa]o\s+de\s+cr[ée]dit|futuros|^todos\s*$|ver\s+mais|in[íi]cio)/i.test(linha)) {
            continue;
        }
        // Ignora lixo do OCR: horário + ícones do celular (10:35, 21:00, etc + "TB" + símbolos)
        if (/^\d{1,2}:\d{2}\s+TB/i.test(linha) || /--\s*af\s+ERES/i.test(linha)) {
            continue;
        }
        // Ignora indicadores de scroll tipo "171 0 <" ou só "<"
        if (/^\d+\s+\d+\s*<\s*$/.test(linha) || /^<\s*$/.test(linha) || /^\d+\s*<\s*$/.test(linha)) {
            continue;
        }
        // Ignora "about:blank" e fragmentos soltos tipo "&& Extratos 0."
        if (/^(about:blank|&{1,3}|fik\s+os|eres\s+all)/i.test(linha)) {
            continue;
        }
        // Ignora linhas só com "0." ou números puros sem contexto
        if (/^\s*\d+\s*\.\s*$/.test(linha) || /^[<>]+$/.test(linha)) {
            continue;
        }

        if (transacaoAtual) {
            // Se tem data, é continuação da descrição; senão, é só mais texto
            transacaoAtual.descricao = (transacaoAtual.descricao + ' ' + linha).trim();
        }
    }

    // Finaliza a última
    finalizar();

    return transacoes;
}

// Parser especifico para SANTANDER (extrato tem colunas: Data | Descricao | N Doc | Volume | Saldo)
function extrairTransacoesSantander(texto) {
    const transacoes = [];
    const linhas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    const anoMatch = texto.match(/(\d{2}\/\d{2}\/(\d{4}))/);
    let ano = anoMatch ? anoMatch[2] : new Date().getFullYear().toString();

    let transacaoAtual = null;
    let dataPadrao = null;

    // Regex para data no inicio: 12/05/2026, 12/05, 12-05-2026
    const reData = /^(\d{2})[\/\-](\d{2})(?:[\/\-](\d{4}))?/;
    // Regex para valor: 19,90 | 1.234,56 | -45,90 | 0,25
    const reValor = /^-?R?\$?\s*\d{1,3}(?:\.\d{3})*,\d{2}$|^-?\d+,\d{2}$/;
    // Regex para numero de documento (5+ digitos)
    const reDoc = /^\d{4,}$/;

    for (let i = 0; i < linhas.length; i++) {
        const linha = linhas[i];
        // Ignora cabeçalhos
        if (/^(data|descri[cç][aã]o|n[º°]?\s*documento|volume|saldo|extrato|conta\s+corrente|per[ií]odo|p[aá]gina|totais|liquida[cç][aã]o)/i.test(linha)) continue;
        if (/santander/i.test(linha) && linha.length < 50) continue;

        const matchData = linha.match(reData);
        if (matchData) {
            // Nova transação: salva a anterior
            if (transacaoAtual && transacaoAtual.valor > 0) {
                transacoes.push(transacaoAtual);
            }

            if (matchData[3]) ano = matchData[3];
            dataPadrao = matchData[1] + '/' + matchData[2] + '/' + ano;
            const [d, m] = [matchData[1], matchData[2]];
            const dataISO = `${ano}-${m}-${d}`;

            // Pega a descrição: tudo entre a data e o número de documento/valor
            const resto = linha.substring(matchData[0].length).trim();
            // Remove R$ e valores da descrição inicial também
            const descInicial = resto.replace(/-?R?\$?\s*\d{1,3}(?:\.\d{3})*,\d{2}/g, '').replace(/\d{4,}/g, '').trim();
            transacaoAtual = {
                data: dataISO,
                descricao: descInicial,
                valor: 0,
                tipo: 'despesa',
                categoriaId: 'c-outros-des',
                valorStr: ''
            };
            continue;
        }

        // Linha sem data: pode ser continuação da descrição ou valor isolado
        if (transacaoAtual) {
            // Se for valor monetário isolado (ex: "19,90" ou "0,25" ou "-45,90")
            if (reValor.test(linha)) {
                const valor = parseValorFlex(linha);
                if (valor > 0 && transacaoAtual.valor === 0) {
                    transacaoAtual.valor = valor;
                    transacaoAtual.valorStr = linha;
                    if (linha.trim().startsWith('-')) transacaoAtual.tipo = 'despesa';
                }
            } else if (reDoc.test(linha) || /^-\s*$/.test(linha)) {
                // Número de documento ou hífen, ignora
                continue;
            } else {
                // Continua descrição
                // Limpa números/documentos/valores
                const limpa = linha.replace(/-?R?\$?\s*\d{1,3}(?:\.\d{3})*,\d{2}/g, '').replace(/\b\d{4,}\b/g, '').trim();
                if (limpa.length > 0) {
                    transacaoAtual.descricao = transacaoAtual.descricao.length > 0
                        ? transacaoAtual.descricao + ' ' + limpa
                        : limpa;
                }
            }
        }
    }

    // Adiciona a última
    if (transacaoAtual && transacaoAtual.valor > 0) {
        transacoes.push(transacaoAtual);
    }

    // Limpa e categoriza usando detecção inteligente
    return transacoes.map(t => {
        const desc = t.descricao;
        // Detecta tipo com base na descrição e no sinal
        t.tipo = detectarTipoTransacao(t.valorStr, desc, t.valor);
        return {
            data: t.data,
            descricao: desc.replace(/\s+/g, ' ').trim().substring(0, 80) || 'Transação sem descrição',
            valor: t.valor,
            tipo: t.tipo,
            categoriaId: categorizarTexto(desc, t.tipo)
        };
    }).filter(t => t.valor > 0);
}

function categorizarTexto(desc, tipo) {
    const d = desc.toLowerCase();
    if (tipo === 'receita') {
        if (/salario|folha|pagamento/i.test(d)) return 'c-salario';
        if (/pix.*receb|transfer.*receb/i.test(d)) return 'c-outros-rec';
        return 'c-outros-rec';
    }
    if (/ifood|lanche|restaurante|padaria|hamburg|pizza|mercado|pao de acucar|carrefour|extra/i.test(d)) return 'c-alimentacao';
    if (/uber|99|taxi|gasolina|posto|estacionamento/i.test(d)) return 'c-transporte';
    if (/academia|smart fit|aroeira|gym|musculacao/i.test(d)) return 'c-saude';
    if (/aluguel|condominio|iptu/i.test(d)) return 'c-moradia';
    if (/energia|luz|agua|internet|telefone|celular|claro|vivo|tim/i.test(d)) return 'c-contas';
    if (/netflix|spotify|prime|disney|hbo|globoplay|youtube|apple/i.test(d)) return 'c-lazer';
    if (/curso|escola|faculdade|udemy|alura|livro/i.test(d)) return 'c-educacao';
    if (/farmacia|droga|raia|pague menos|saude|medico|hospital/i.test(d)) return 'c-saude';
    if (/roupa|tenis|nike|adidas|renner|riachuelo|shopping/i.test(d)) return 'c-compras';
    return 'c-outros-des';
}

async function processarFotoExtrato(event) {
    const file = event.target.files[0];
    if (!file) return;

    const status = document.getElementById('importStatus');
    const progress = document.getElementById('importProgress');
    const result = document.getElementById('importResult');
    status.style.display = 'block';
    progress.textContent = '📸 Pré-processando imagem...';
    result.innerHTML = '';

    try {
        // === PRÉ-PROCESSAMENTO: melhora a imagem antes do OCR ===
        // Carrega imagem em canvas, escala, escala de cinza, aumenta contraste
        const imgBlob = await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = URL.createObjectURL(file);
        });

        const canvas = document.createElement('canvas');
        // Aumenta resolução pra OCR ler melhor (mínimo 2x)
        const scale = Math.max(2, 1500 / Math.max(imgBlob.width, imgBlob.height));
        canvas.width = Math.round(imgBlob.width * scale);
        canvas.height = Math.round(imgBlob.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(imgBlob, 0, 0, canvas.width, canvas.height);

        // Converte pra escala de cinza + aumenta contraste + binariza
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            // Escala de cinza (peso padrão ITU-R BT.601)
            const gray = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
            // Aumenta contraste (estica histograma)
            const contrast = ((gray - 128) * 1.5) + 128;
            // Binariza (preto ou branco) - ajuda MUITO o OCR
            const bin = contrast < 140 ? 0 : 255;
            data[i] = data[i+1] = data[i+2] = bin;
        }
        ctx.putImageData(imageData, 0, 0);

        progress.textContent = '🔍 Lendo com OCR (otimizado)... (pode levar 10-30 segundos)';

        // === OCR Tesseract ===
        const { data: { text } } = await Tesseract.recognize(canvas, 'por', {
            logger: m => {
                if (m.status === 'recognizing text') {
                    progress.textContent = `🔍 Lendo imagem... ${Math.round(m.progress * 100)}%`;
                }
            }
        });

        progress.textContent = '✅ Texto extraído! Processando transações...';
        await processarTextoExtraido(text);
    } catch (e) {
        progress.textContent = '❌ Erro ao ler imagem: ' + e.message;
    }
}

async function processarPDFExtrato(event) {
    const file = event.target.files[0];
    if (!file) return;

    const status = document.getElementById('importStatus');
    const progress = document.getElementById('importProgress');
    const result = document.getElementById('importResult');
    status.style.display = 'block';
    progress.textContent = '📄 Lendo PDF...';

    try {
        const buffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        const numPaginas = pdf.numPages;
        progress.textContent = `📄 Lendo ${numPaginas} página(s)...`;

        // Extrai texto de TODAS as páginas
        let textoCompleto = '';
        for (let i = 1; i <= numPaginas; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            // Cada item tem str (texto) e transform (posicao). Vou agrupar por linha baseado em Y.
            const items = textContent.items.filter(it => it.str && it.str.trim().length > 0);
            // Ordena por Y (de cima pra baixo) e depois por X (esquerda pra direita)
            items.sort((a, b) => {
                const ya = a.transform[5], yb = b.transform[5];
                if (Math.abs(ya - yb) > 2) return yb - ya; // linha diferente
                return a.transform[4] - b.transform[4]; // mesma linha
            });
            // Agrupa por linha
            let linhaAtual = '';
            let yAnterior = null;
            let linhas = [];
            for (const it of items) {
                const y = Math.round(it.transform[5]);
                if (yAnterior !== null && Math.abs(y - yAnterior) > 2) {
                    linhas.push(linhaAtual.trim());
                    linhaAtual = '';
                }
                linhaAtual += (linhaAtual ? ' ' : '') + it.str;
                yAnterior = y;
            }
            if (linhaAtual.trim()) linhas.push(linhaAtual.trim());
            textoCompleto += linhas.join('\n') + '\n';
        }

        if (textoCompleto.trim().length < 20) {
            // PDF escaneado (sem texto) - tenta OCR
            progress.textContent = '📄 PDF escaneado. Usando OCR...';
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            const { data: { text } } = await Tesseract.recognize(canvas, 'por');
            await processarTextoExtraido(text);
        } else {
            // PDF com texto selecionável
            await processarTextoExtraido(textoCompleto);
        }
    } catch (e) {
        progress.textContent = '❌ Erro ao ler PDF: ' + e.message + '. Tente exportar como CSV.';
        result.innerHTML = '<details style="margin-top:10px; color:#94a3b8; font-size:0.8rem;"><summary>Ver detalhes</summary><pre>' + e.stack.substring(0, 500) + '</pre></details>';
    }
}

async function processarCSVExtrato(event) {
    const file = event.target.files[0];
    if (!file) return;

    const status = document.getElementById('importStatus');
    const progress = document.getElementById('importProgress');
    status.style.display = 'block';
    progress.textContent = '📊 Lendo arquivo...';

    try {
        const isExcel = /\.(xlsx|xls)$/i.test(file.name);
        let rows = [];

        if (isExcel) {
            if (typeof XLSX === 'undefined') {
                progress.textContent = '❌ Biblioteca Excel não carregou. Recarregue a página.';
                return;
            }
            progress.textContent = '📊 Lendo Excel...';
            const buffer = await file.arrayBuffer();
            const wb = XLSX.read(buffer, { type: 'array' });
            // Acha a aba com mais linhas (pula capa/resumo)
            let melhorAba = wb.SheetNames[0];
            let maxLinhas = 0;
            for (const nome of wb.SheetNames) {
                const sheet = wb.Sheets[nome];
                const tmp = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
                if (tmp.length > maxLinhas) { maxLinhas = tmp.length; melhorAba = nome; }
            }
            const sheet = wb.Sheets[melhorAba];
            rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
        } else {
            progress.textContent = '📊 Lendo CSV...';
            const text = await file.text();
            // Detecta separador automaticamente: , ; \t |
            const primeiraLinha = text.split('\n')[0] || '';
            let sep = ',';
            if (primeiraLinha.includes(';')) sep = ';';
            else if (primeiraLinha.includes('\t')) sep = '\t';
            else if (primeiraLinha.includes('|')) sep = '|';
            const results = Papa.parse(text, { header: false, skipEmptyLines: true, delimiter: sep });
            rows = results.data;
        }

        progress.textContent = `📊 ${rows.length} linhas lidas. Identificando colunas...`;

        // === DETECÇÃO DE COLUNAS (com ou sem cabeçalho) ===
        let colData = -1, colDesc = -1, colValor = -1, colTipo = -1;
        let linhaCab = -1;

        // Tenta achar cabeçalho nas primeiras 5 linhas
        for (let i = 0; i < Math.min(5, rows.length); i++) {
            const r = (rows[i] || []).map(c => String(c || '').toLowerCase().trim());
            let achouData = -1, achouDesc = -1, achouValor = -1;
            for (let j = 0; j < r.length; j++) {
                if (achouData < 0 && /\b(data|date|dt|dia|lan[cç]amento|moviment)/i.test(r[j])) achouData = j;
                if (achouDesc < 0 && /(descri[cç][aã]o|hist[oó]rico|estabelecimento|lan[cç]amento|detalhe|desc|history|memo|merchant|description)/i.test(r[j])) achouDesc = j;
                if (achouValor < 0 && /(valor|value|amount|montante|total|vlr|montante)/i.test(r[j])) achouValor = j;
            }
            if (achouData >= 0 && achouValor >= 0) {
                linhaCab = i;
                colData = achouData;
                colDesc = achouDesc >= 0 ? achouDesc : 1;
                colValor = achouValor;
                break;
            }
        }

        // Sem cabeçalho: adivinha pelas colunas
        if (linhaCab < 0) {
            for (let j = 0; j < (rows[0] || []).length; j++) {
                const v = String(rows[0][j] || '').trim();
                if (colData < 0 && /^(\d{2}[\/\-]\d{2}([\/\-]\d{2,4})?|\d{4}-\d{2}-\d{2})/.test(v)) colData = j;
                else if (colValor < 0 && /^(-?R?\$?\s*\d+([.,]\d{2})?)$/.test(v)) colValor = j;
                else if (colDesc < 0 && v.length > 4 && /[a-zA-Z]{3,}/.test(v)) colDesc = j;
            }
            if (colData < 0) colData = 0;
            if (colDesc < 0) colDesc = 1;
            if (colValor < 0) colValor = 2;
        } else {
            rows = rows.slice(linhaCab + 1);
        }

        if (colData < 0 || colValor < 0) {
            progress.innerHTML = `⚠️ Não identifiquei colunas de DATA e VALOR.<br>📋 Formato esperado: <b>Data | Descrição | Valor</b><br><br><button onclick="verTextoExtraido()" style="margin-top:10px; padding:5px 10px; background:var(--bg-card); color:var(--text); border:1px solid var(--border); border-radius:6px; cursor:pointer;">🔍 Ver texto que o app leu</button>`;
            return;
        }

        progress.textContent = `📊 Colunas: Data=${colData+1} | Desc=${colDesc+1} | Valor=${colValor+1}. Processando...`;

        // === PROCESSA LINHAS ===
        const transacoes = [];
        for (const row of rows) {
            if (!row || row.length < 2) continue;
            const dataRaw = String(row[colData] || '').trim();
            if (!dataRaw) continue;
            if (/^(data|date|dt|totais?|saldo|resumo)/i.test(dataRaw)) continue;

            const descRaw = colDesc >= 0 ? String(row[colDesc] || '').trim() : '';
            const valorRaw = String(row[colValor] || '').trim();

            // === CONVERSÃO DE DATA: aceita DD/MM/AAAA, DD-MM-AAAA, DD/MM, AAAA-MM-DD ===
            let dataFmt = null;
            let m = dataRaw.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
            if (m) dataFmt = `${m[3]}-${m[2]}-${m[1]}`;
            else if ((m = dataRaw.match(/^(\d{2})[\/\-](\d{2})$/))) dataFmt = `${new Date().getFullYear()}-${m[2]}-${m[1]}`;
            else if ((m = dataRaw.match(/^(\d{4})-(\d{2})-(\d{2})/))) dataFmt = `${m[1]}-${m[2]}-${m[3]}`;
            else continue;

            // === CONVERSÃO DE VALOR: aceita R$, BR, US ===
            const valorNum = parseValorFlex(valorRaw);
            if (isNaN(valorNum) || valorNum === 0) continue;

            // === DETECÇÃO DE TIPO ===
            const tipo = detectarTipoTransacao(valorRaw, descRaw, valorNum);

            transacoes.push({
                data: dataFmt,
                descricao: descRaw || `Transação ${dataFmt}`,
                valor: Math.abs(valorNum),
                tipo,
                categoriaId: categorizarTexto(descRaw || '', tipo)
            });
        }

        await mostrarPreviewImportacao(transacoes);
    } catch (e) {
        progress.textContent = '❌ Erro ao processar: ' + e.message;
        console.error(e);
    }
}

// === FUNÇÕES AUXILIARES DE PARSING (usadas em todos formatos) ===

// Aceita: R$ 1.234,56 | 1.234,56 | 1234,56 | 45.90 | 45,90 | R$ -45,90
function parseValorFlex(texto) {
    if (typeof texto === 'number') return texto;
    let v = String(texto || '').trim();
    if (!v) return NaN;
    // Tira R$, espaços, etc
    v = v.replace(/R\$\s*/gi, '').replace(/\s+/g, '').replace(/[^\d.,\-]/g, '');
    if (!v || v === '-' || v === '.') return NaN;
    // Detecta formato pelo último separador
    const temVirgula = v.includes(',');
    const temPonto = v.includes('.');
    if (temVirgula && temPonto) {
        // BR: 1.234,56 → 1234.56
        if (v.lastIndexOf(',') > v.lastIndexOf('.')) {
            v = v.replace(/\./g, '').replace(',', '.');
        } else {
            // US: 1,234.56 → 1234.56
            v = v.replace(/,/g, '');
        }
    } else if (temVirgula) {
        // 1234,56 ou 45,90 → 1234.56
        const partes = v.split(',');
        if (partes[1] && partes[1].length === 2) {
            v = partes[0] + '.' + partes[1];
        } else {
            v = v.replace(',', '.');
        }
    } else if (temPonto) {
        // 45.90 ou 1234.56 → pode ser US ou BR com milhar
        const partes = v.split('.');
        if (partes.length > 1 && partes[partes.length-1].length === 2) {
            // 45.90 ou 1234.56 (US)
            v = partes.join('.');
        } else if (partes.length > 2) {
            // BR com milhar: 1.234.567
            v = v.replace(/\./g, '');
        } else {
            v = partes.join('.');
        }
    }
    return parseFloat(v);
}

// Detecta se transação é receita ou despesa pela descrição/valor
function detectarTipoTransacao(valorRaw, descricao, valorNum) {
    const d = (descricao || '').toLowerCase();
    // Palavras de receita primeiro (evita falso positivo em "CREDITO ROTATIVO")
    if (/pix\s*receb|ted\s*receb|doc\s*receb|transfer.*receb|credito\s*em\s*conta|estorn|reembolso|rendimento|resgate|dep[oó]sito|cashback|sal[aá]rio|folha\s+de|recebid/i.test(d)) {
        return 'receita';
    }
    // Palavras de despesa
    if (/pix\s*envi|ted\s*envi|doc\s*envi|transfer.*envi|cart[aã]o\s*de\s*cr[eé]dito|credito\s*rotativ|boleto|compra\s+aprova|pagamento\s+de|pago\s+a|saque|d[eé]bito\s*em\s*conta|fatura\s*do|parcela\s*de|anuidade|iof|tarifa\s*banc|encargos\s*de|juros\s*de|empr[eé]stimo|consignado|financiamento/i.test(d)) {
        return 'despesa';
    }
    // Se não achou palavra, decide pelo sinal do valor
    if (valorRaw && String(valorRaw).trim().startsWith('-')) return 'despesa';
    return valorNum < 0 ? 'despesa' : 'receita';
}

async function processarTextoExtraido(texto) {
    let transacoes = [];

    // Salva texto pra debug
    sessionStorage.setItem('ultimoTextoExtraido', texto);

    // Detecta banco pelo texto
    const ehSantander = /santander/i.test(texto);
    const ehNubank = /nubank/i.test(texto);
    const ehItau = /itau|ita[uú]/i.test(texto);

    // Detecta se é print de tela de app bancário (formato Nubank mobile)
    // Tem linhas tipo "Pix - Recebido    R$ 2,00" seguidas de "02/07 16:11 NOME"
    const ehPrintApp = /Pix\s*[-–]\s*(Recebido|Enviado|Devolvido|Recebid|Envio|Receb)/i.test(texto) ||
                       /Dep[oó]sito\s+dinheiro/i.test(texto) ||
                       /Transfer[êe]ncia\s+(recebid|enviad|receb|enviad)/i.test(texto);

    if (ehSantander && !ehPrintApp) {
        // Usa parser especifico do Santander (PDF/extrato texto)
        transacoes = extrairTransacoesSantander(texto);
    } else if (ehNubank && ehPrintApp) {
        // Print do app do Nubank
        transacoes = extrairTransacoesPrintApp(texto);
    } else if (ehPrintApp) {
        // Print genérico de app bancário
        transacoes = extrairTransacoesPrintApp(texto);
    } else {
        // Tenta parser generico (PDF/Excel/texto corrido)
        transacoes = extrairTransacoesDoTexto(texto);
    }

    // Se nenhum parser retornou transações, tenta o print como fallback
    if ((!transacoes || transacoes.length === 0) && ehPrintApp) {
        transacoes = extrairTransacoesPrintApp(texto);
    }

    // 🤖 IA: refina e categoriza automaticamente (se tiver resultado)
    // Pula se foi poucos itens (não vale a chamada)
    if (transacoes && transacoes.length > 0) {
        transacoes = await refinarComIA(transacoes, texto);
    } else {
        // 🤖 IA: parser puro (fallback pra texto bagunçado)
        const cats = getLS(userKey(LS_CAT, getUserId()), []);
        if (cats.length > 0) {
            const iaResult = await parsearComIA(texto, cats);
            if (iaResult && iaResult.length > 0) {
                transacoes = iaResult;
            }
        }
    }

    await mostrarPreviewImportacao(transacoes);
}

// ============================================
// 🤖 IA: REFINAR TRANSAÇÕES (categorizar + corrigir)
// ============================================
async function refinarComIA(transacoes, textoOriginal) {
    const cats = getLS(userKey(LS_CAT, getUserId()), []);
    // Se não tem categoria, pula refinamento (não vale a chamada)
    if (cats.length === 0) return transacoes;
    // Se tem menos de 2 transações, pula (vale mais fazer manual)
    if (transacoes.length < 2) return transacoes;

    // Limita a 50 pra não estourar tokens (cobre 99% dos casos)
    const amostra = transacoes.slice(0, 50);

    const listaCategorias = cats.map(c => `${c.id}="${c.nome}"`).join(', ');

    const prompt = `Você é um assistente financeiro. Analise estas transações brutas extraídas de extrato bancário e:
1. Atribua a categoriaId correta (use apenas IDs da lista)
2. Padronize a descrição (sem lixo de OCR, sem duplicar "R$")
3. Detecte sinais de despesa/receita (já vem como pista, mas confirme)

CATEGORIAS DISPONÍVEIS (id="nome"):
${listaCategorias}

Se nenhuma categoria servir, use categoriaId="" (vazio, sistema coloca "outros" depois).

TRANSAÇÕES (formato: data|descrição|valor|tipo):
${amostra.map((t, i) => `${i}|${t.data || ''}|${(t.descricao || '').replace(/\|/g, ' ')}|${(t.valor || 0).toFixed(2)}|${t.tipo || 'despesa'}`).join('\n')}

Responda APENAS JSON válido (sem markdown, sem \`\`\`):
[{"i":0,"categoriaId":"...","descricao":"...limpa..."},{"i":1,...}]`;

    try {
        const resp = await chamarGroq([{ role: 'user', content: prompt }], GROQ_MODEL_RAPIDO);
        // Extrai JSON da resposta
        const jsonMatch = resp.match(/\[[\s\S]*\]/);
        if (!jsonMatch) return transacoes;
        const refinamentos = JSON.parse(jsonMatch[0]);

        const transacoesRefinadas = transacoes.map((t, idx) => {
            const ref = refinamentos.find(r => r.i === idx);
            if (ref) {
                return {
                    ...t,
                    categoriaId: ref.categoriaId || t.categoriaId || 'outros',
                    descricao: (ref.descricao || t.descricao || '').slice(0, 80).trim()
                };
            }
            return {
                ...t,
                categoriaId: t.categoriaId || 'outros'
            };
        });
        return transacoesRefinadas;
    } catch (e) {
        console.warn('[IA refinamento] fallback:', e.message);
        // Fallback: só categoriza com regex
        return transacoes.map(t => ({
            ...t,
            categoriaId: t.categoriaId || categorizarTexto(t.descricao || '', t.tipo) || 'outros'
        }));
    }
}

// ============================================
// 🤖 IA: PARSER PURO (fallback forte - texto OCR bagunçado)
// ============================================
async function parsearComIA(texto, categorias) {
    // Limita texto (cobre ~30 linhas de extrato)
    const textoLimitado = texto.length > 4000 ? texto.slice(0, 4000) : texto;
    const listaCategorias = categorias.map(c => `${c.id}="${c.nome}"`).join(', ');

    const prompt = `Você é um parser de extrato bancário brasileiro. Extraia TODAS as transações financeiras do texto abaixo (pode estar bagunçado por OCR).

REGRAS:
- "tipo" = "despesa" se for saída/débito/pagamento/compra, "receita" se for entrada/crédito/recebimento/depósito
- "data" SEMPRE no formato YYYY-MM-DD (ano-mês-dia). Se não tiver ano, assuma 2026.
- "valor" sempre POSITIVO (sinal vem do tipo)
- "categoriaId" = ID da categoria adequada (use "" se nenhuma servir)
- "descricao" = nome limpo do estabelecimento/pessoa (sem lixo tipo "R$ 0,00" ou horários)
- Pule linhas de saldo (Saldo, Total, "Saldo Atual", etc)
- Pule linhas só com data e sem valor
- Se texto estiver muito bagunçado, devolva [] array vazio

CATEGORIAS (id="nome"):
${listaCategorias}

TEXTO DO EXTRATO:
"""
${textoLimitado}
"""

Responda APENAS JSON válido (sem markdown, sem texto extra):
[{"data":"YYYY-MM-DD","descricao":"...","valor":123.45,"tipo":"despesa","categoriaId":"..."}]`;

    try {
        const resp = await chamarGroq([{ role: 'user', content: prompt }], GROQ_MODEL_RAPIDO);
        const jsonMatch = resp.match(/\[[\s\S]*\]/);
        if (!jsonMatch) return [];
        const parsed = JSON.parse(jsonMatch[0]);
        // Validação básica
        return parsed.filter(t => t.data && t.valor > 0 && t.descricao).map(t => ({
            data: t.data,
            descricao: String(t.descricao).slice(0, 80).trim(),
            valor: Math.abs(parseFloat(t.valor) || 0),
            tipo: t.tipo === 'receita' ? 'receita' : 'despesa',
            categoriaId: t.categoriaId || 'outros'
        }));
    } catch (e) {
        console.warn('[IA parser] falhou:', e.message);
        return [];
    }
}

async function mostrarPreviewImportacao(transacoes) {
    const progress = document.getElementById('importProgress');
    const preview = document.getElementById('importPreview');
    const result = document.getElementById('importResult');

    if (transacoes.length === 0) {
        progress.innerHTML = '⚠️ Nenhuma transação detectada no formato do banco. <br>Tente exportar como <b>CSV</b> no app do banco (geralmente tem essa opção).<br><br><button onclick="verTextoExtraido()" style="margin-top:10px; padding:5px 10px; background:var(--bg-card); color:var(--text); border:1px solid var(--border); border-radius:6px; cursor:pointer;">🔍 Ver texto que o app leu</button>';
        preview.style.display = 'none';
        return;
    }

    progress.textContent = `✅ ${transacoes.length} transações encontradas! Revise abaixo:`;

    // Salva no sessionStorage pra confirmar depois
    sessionStorage.setItem('importacao_pendente', JSON.stringify(transacoes));

    preview.style.display = 'block';
    preview.innerHTML = `
        <h3 style="margin-top:1rem;">📋 Preview (${transacoes.length} transações)</h3>
        <div style="max-height:300px; overflow-y:auto; border:1px solid var(--border); border-radius:8px; padding:0.5rem;">
            ${transacoes.slice(0, 20).map(t => `
                <div style="display:flex; justify-content:space-between; padding:0.4rem; border-bottom:1px solid var(--border);">
                    <span>${t.data} - ${t.descricao.substring(0, 40)}</span>
                    <span style="color:${t.tipo === 'receita' ? '#10b981' : '#ef4444'}; font-weight:600;">
                        ${t.tipo === 'receita' ? '+' : '-'}R$ ${t.valor.toFixed(2)}
                    </span>
                </div>
            `).join('')}
            ${transacoes.length > 20 ? `<p style="text-align:center; color:#94a3b8;">... e mais ${transacoes.length - 20}</p>` : ''}
        </div>
        <div style="margin-top:1rem; display:flex; gap:0.5rem;">
            <button onclick="confirmarImportacao()" style="flex:1; padding:0.75rem; background:linear-gradient(135deg, #10b981, #059669); color:#fff; border:none; border-radius:8px; font-weight:600; cursor:pointer;">
                ✅ Importar ${transacoes.length} transações
            </button>
            <button onclick="cancelarImportacao()" style="padding:0.75rem 1rem; background:var(--bg-card); color:var(--text); border:1px solid var(--border); border-radius:8px; cursor:pointer;">
                ❌ Cancelar
            </button>
        </div>
    `;
}

function confirmarImportacao() {
    const transacoes = JSON.parse(sessionStorage.getItem('importacao_pendente') || '[]');
    if (transacoes.length === 0) return;

    const tx = getTransacoes();
    const cats = getLS(userKey(LS_CAT, getUserId()), []);
    const catPorId = (id) => cats.find(c => c.id === id)?.id || null;
    let adicionadas = 0;
    let puladas = 0;

    transacoes.forEach(t => {
        // Verifica duplicata (mesma data + valor + descrição)
        const existe = tx.find(x => x.data === t.data && x.valor === t.valor && x.descricao === t.descricao);
        if (existe) { puladas++; return; }

        // Resolve categoriaId (IA pode ter mandado string ou nome)
        let categoriaId = t.categoriaId;
        if (categoriaId && !catPorId(categoriaId)) {
            // Pode ser que IA mandou nome da categoria em vez do id
            const peloNome = cats.find(c => c.nome.toLowerCase() === String(categoriaId).toLowerCase());
            categoriaId = peloNome ? peloNome.id : null;
        }

        tx.unshift({
            id: uid(),
            tipo: t.tipo,
            descricao: t.descricao,
            valor: t.valor,
            data: t.data,
            categoriaId: categoriaId,
            obs: 'Importado do extrato',
            criadoEm: new Date().toISOString()
        });
        adicionadas++;
    });

    setTransacoes(tx);
    sessionStorage.removeItem('importacao_pendente');

    closeModal('modalImportar');
    if (puladas > 0) {
        toast(`✅ ${adicionadas} importadas (${puladas} duplicatas ignoradas)`);
    } else {
        toast(`✅ ${adicionadas} transações importadas!`);
    }
    carregarTudo();
}

function cancelarImportacao() {
    sessionStorage.removeItem('importacao_pendente');
    document.getElementById('importStatus').style.display = 'none';
    document.getElementById('importPreview').style.display = 'none';
    closeModal('modalImportar');
}

function verTextoExtraido() {
    const texto = sessionStorage.getItem('ultimoTextoExtraido') || '(nenhum texto capturado)';
    const w = window.open('', '_blank', 'width=600,height=400');
    w.document.write('<html><head><title>Texto extraído do PDF</title><style>body{font-family:monospace;padding:20px;white-space:pre-wrap;background:#1a1a2e;color:#fff;}</style></head><body>' + texto.replace(/</g, '&lt;') + '</body></html>');
}


function toast(msg, erro = false) {
    const t = document.createElement('div');
    t.className = 'toast' + (erro ? ' error' : '');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
}

function escapeHtml(t) {
    if (t == null) return '';
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// === TABS ===
function abrirTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('tab-' + tabId)?.classList.add('active');
    btn?.classList.add('active');
    const titles = {
        overview: ['Visão Geral', 'Acompanhe suas finanças em tempo real'],
        transactions: ['Transações', 'Gerencie todas as suas receitas e despesas'],
        budgets: ['Orçamentos', 'Defina limites mensais por categoria'],
        goals: ['Metas', 'Acompanhe seus objetivos financeiros'],
        categories: ['Categorias', 'Personalize suas categorias'],
        cards: ['Cartões', 'Gerencie seus cartões, compras e faturas'],
        commitments: ['Despesas Futuras', 'Parcelamentos e compromissos de longo prazo'],
        config: ['Configurações', 'Ajustes da sua conta']
    };
    const [t, s] = titles[tabId] || ['', ''];
    const tt = document.getElementById('pageTitle'); if (tt) tt.textContent = t;
    const st = document.getElementById('pageSubtitle'); if (st) st.textContent = s;
    // Auto-render ao abrir abas com dados
    if (tabId === 'cards') renderCartoes();
    if (tabId === 'commitments') renderCompromissos();
}

// === CARREGAR DASHBOARD ===
function carregarTudo() {
    migrarDadosAdminSeNecessario();
    seedTransacoesSantander();
    const u = getUserAtual();
    const av = document.getElementById('userAvatar');
    if (av) av.textContent = (u.nome || 'F').charAt(0).toUpperCase();
    const nm = document.getElementById('userName'); if (nm) nm.textContent = u.nome;
    const em = document.getElementById('userEmail'); if (em) em.textContent = u.email;
    const cf = document.getElementById('cfgNome'); if (cf) cf.value = u.nome;
    const ce = document.getElementById('cfgEmail'); if (ce) ce.value = u.email;
    // Mostra aba Usuarios so para admin
    const tabUsers = document.getElementById('navUsers');
    if (tabUsers) tabUsers.style.display = isAdmin() ? '' : 'none';
    if (isAdmin()) renderListaUsuarios();

    carregarStats();
    renderCharts();
    renderTransacoes();
    renderTransacoesRecentes();
    renderOrcamentos();
    renderMetas();
    renderCategorias();
    renderCartoes();
    renderCompromissos();
    renderRegras();
    renderFila();
    renderBancos();
    popularFiltroMeses();
}

// === STATS ===
function carregarStats() {
    const tx = getTransacoes();
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    const mesPassado = mesAtual === 0 ? 11 : mesAtual - 1;
    const anoPassado = mesAtual === 0 ? anoAtual - 1 : anoAtual;

    const sumReceitas = tx.filter(t => t.tipo === 'receita').reduce((a, t) => a + t.valor, 0);
    const sumDespesas = tx.filter(t => t.tipo === 'despesa').reduce((a, t) => a + t.valor, 0);
    const saldo = sumReceitas - sumDespesas;
    const economia = sumReceitas > 0 ? (saldo / sumReceitas) * 100 : 0;

    document.getElementById('statSaldo').textContent = fmtBRL(saldo);
    document.getElementById('statReceitas').textContent = fmtBRL(sumReceitas);
    document.getElementById('statDespesas').textContent = fmtBRL(sumDespesas);
    document.getElementById('statEconomia').textContent = economia.toFixed(1) + '%';

    // Comparação com mês passado
    const recMesAnt = tx.filter(t => t.tipo === 'receita' && getMes(t.data) === mesPassado && getAno(t.data) === anoPassado).reduce((a, t) => a + t.valor, 0);
    const despMesAnt = tx.filter(t => t.tipo === 'despesa' && getMes(t.data) === mesPassado && getAno(t.data) === anoPassado).reduce((a, t) => a + t.valor, 0);
    setTrend('statReceitasTrend', sumReceitas, recMesAnt);
    setTrend('statDespesasTrend', sumDespesas, despMesAnt);
    setTrend('statSaldoTrend', saldo, recMesAnt - despMesAnt, true);
    const ec = document.getElementById('statEconomiaTrend');
    if (ec) ec.textContent = economia > 20 ? '🎯 Ótima!' : economia > 0 ? '👍 Boa' : '⚠️ Atenção';
}
function setTrend(id, atual, anterior, isSaldo = false) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!anterior && anterior !== 0) { el.textContent = '—'; return; }
    const pct = anterior === 0 ? 100 : ((atual - anterior) / anterior) * 100;
    const sinal = pct >= 0 ? '↑' : '↓';
    el.textContent = sinal + ' ' + Math.abs(pct).toFixed(1) + '% vs mês anterior';
    el.className = 'stat-trend ' + (pct >= 0 ? 'up' : 'down');
}
function getMes(iso) { return parseInt(iso.split('-')[1], 10) - 1; }
function getAno(iso) { return parseInt(iso.split('-')[0], 10); }

// === CHARTS ===
function renderCharts() {
    const tx = getTransacoes();
    const meses = [];
    const receitas = [];
    const despesas = [];
    const saldos = [];
    const hoje = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const m = d.getMonth(), a = d.getFullYear();
        const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
        meses.push(label);
        const rec = tx.filter(t => t.tipo === 'receita' && getMes(t.data) === m && getAno(t.data) === a).reduce((a, t) => a + t.valor, 0);
        const desp = tx.filter(t => t.tipo === 'despesa' && getMes(t.data) === m && getAno(t.data) === a).reduce((a, t) => a + t.valor, 0);
        receitas.push(rec);
        despesas.push(desp);
        saldos.push(rec - desp);
    }
    const ctxL = document.getElementById('chartLinha')?.getContext('2d');
    if (ctxL) {
        if (chartLinha) chartLinha.destroy();
        chartLinha = new Chart(ctxL, {
            type: 'line',
            data: {
                labels: meses,
                datasets: [
                    { label: 'Receitas', data: receitas, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', tension: 0.4, fill: true },
                    { label: 'Despesas', data: despesas, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', tension: 0.4, fill: true },
                    { label: 'Saldo', data: saldos, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', tension: 0.4, fill: true }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#94a3b8' } } },
                scales: {
                    x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
                    y: { ticks: { color: '#94a3b8', callback: v => 'R$ ' + v }, grid: { color: '#334155' } }
                }
            }
        });
    }
    // Pizza
    const cats = getCategorias();
    const despPorCat = {};
    tx.filter(t => t.tipo === 'despesa').forEach(t => {
        despPorCat[t.categoriaId] = (despPorCat[t.categoriaId] || 0) + t.valor;
    });
    const labels = [];
    const data = [];
    const colors = [];
    Object.keys(despPorCat).forEach(cid => {
        const c = cats.find(x => x.id === cid);
        labels.push(c ? c.nome : 'Outros');
        data.push(despPorCat[cid]);
        colors.push(c ? c.cor : '#64748b');
    });
    const ctxP = document.getElementById('chartPizza')?.getContext('2d');
    if (ctxP) {
        if (chartPizza) chartPizza.destroy();
        chartPizza = new Chart(ctxP, {
            type: 'doughnut',
            data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: '#1e293b', borderWidth: 2 }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { color: '#94a3b8', padding: 10, font: { size: 11 } } }
                }
            }
        });
    }
}

// === TRANSACOES ===
function popularFiltroMeses() {
    const tx = getTransacoes();
    const meses = new Set();
    tx.forEach(t => {
        if (t.data) {
            const d = new Date(t.data);
            meses.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }
    });
    const sel = document.getElementById('filtroMes');
    if (!sel) return;
    const atuais = Array.from(sel.options).map(o => o.value);
    meses.forEach(m => {
        if (!atuais.includes(m)) {
            const [a, mm] = m.split('-');
            const label = new Date(a, mm - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = label.charAt(0).toUpperCase() + label.slice(1);
            sel.appendChild(opt);
        }
    });
}

function renderTransacoes() {
    const tx = getTransacoes();
    const cats = getCategorias();
    const mesFiltro = document.getElementById('filtroMes')?.value || 'todos';
    const tipoFiltro = document.getElementById('filtroTipo')?.value || 'todos';
    const busca = (document.getElementById('filtroBusca')?.value || '').toLowerCase();

    let lista = [...tx];
    if (mesFiltro !== 'todos') {
        lista = lista.filter(t => t.data && t.data.startsWith(mesFiltro));
    }
    if (tipoFiltro !== 'todos') {
        lista = lista.filter(t => t.tipo === tipoFiltro);
    }
    if (busca) {
        lista = lista.filter(t => (t.descricao || '').toLowerCase().includes(busca));
    }
    lista.sort((a, b) => (b.data || '').localeCompare(a.data || ''));

    const div = document.getElementById('listaTransacoes');
    if (!div) return;
    if (lista.length === 0) {
        div.innerHTML = '<div class="tx-empty">📭 Nenhuma transação encontrada.<br>Adicione sua primeira clicando em <b>+ Receita</b> ou <b>+ Despesa</b> no topo.</div>';
        return;
    }
    div.innerHTML = lista.map(t => {
        const cat = cats.find(c => c.id === t.categoriaId);
        return `
        <div class="tx-item">
            <div class="tx-icon ${t.tipo}">${cat ? cat.icone : (t.tipo === 'receita' ? '💰' : '💸')}</div>
            <div class="tx-info">
                <div class="tx-desc">${escapeHtml(t.descricao)}</div>
                <div class="tx-meta">${cat ? cat.nome : '-'} • ${fmtData(t.data)}</div>
            </div>
            <div class="tx-amount ${t.tipo}">${t.tipo === 'receita' ? '+' : '-'}${fmtBRL(t.valor)}</div>
            <div class="tx-actions">
                <button class="btn-icon" onclick="editarTransacao('${t.id}')" title="Editar">✏️</button>
                <button class="btn-icon danger" onclick="excluirTransacao('${t.id}')" title="Excluir">🗑️</button>
            </div>
        </div>
    `}).join('');
}

function renderTransacoesRecentes() {
    const tx = getTransacoes();
    const cats = getCategorias();
    const lista = [...tx].sort((a, b) => (b.data || '').localeCompare(a.data || '')).slice(0, 5);
    const div = document.getElementById('listaTransacoesRecentes');
    if (!div) return;
    if (lista.length === 0) {
        div.innerHTML = '<div class="tx-empty">Nenhuma transação ainda.</div>';
        return;
    }
    div.innerHTML = lista.map(t => {
        const cat = cats.find(c => c.id === t.categoriaId);
        return `
        <div class="tx-item">
            <div class="tx-icon ${t.tipo}">${cat ? cat.icone : (t.tipo === 'receita' ? '💰' : '💸')}</div>
            <div class="tx-info">
                <div class="tx-desc">${escapeHtml(t.descricao)}</div>
                <div class="tx-meta">${cat ? cat.nome : '-'} • ${fmtData(t.data)}</div>
            </div>
            <div class="tx-amount ${t.tipo}">${t.tipo === 'receita' ? '+' : '-'}${fmtBRL(t.valor)}</div>
        </div>
    `}).join('');
}

function abrirModalTransacao(tipo, id = null) {
    const cats = getCategorias().filter(c => c.tipo === tipo || c.tipo === 'ambos');
    const sel = document.getElementById('txCategoria');
    sel.innerHTML = cats.map(c => `<option value="${c.id}">${c.icone} ${c.nome}</option>`).join('');
    document.getElementById('txId').value = id || '';
    document.getElementById('txTipo').value = tipo;
    setTipoTransacao(tipo);
    document.getElementById('modalTransacaoTitulo').textContent = id ? 'Editar transação' : 'Nova transação';
    if (id) {
        const tx = getTransacoes().find(t => t.id === id);
        if (tx) {
            document.getElementById('txDescricao').value = tx.descricao;
            document.getElementById('txValor').value = tx.valor;
            document.getElementById('txData').value = tx.data;
            document.getElementById('txCategoria').value = tx.categoriaId;
            document.getElementById('txObs').value = tx.obs || '';
        }
    } else {
        document.getElementById('formTransacao').reset();
        document.getElementById('txData').value = new Date().toISOString().split('T')[0];
        document.getElementById('txTipo').value = tipo;
    }
    openModal('modalTransacao');
}

function setTipoTransacao(tipo) {
    document.getElementById('txTipo').value = tipo;
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.type-btn[data-tipo="${tipo}"]`)?.classList.add('active');
    const cats = getCategorias().filter(c => c.tipo === tipo || c.tipo === 'ambos');
    const sel = document.getElementById('txCategoria');
    const atual = sel.value;
    sel.innerHTML = cats.map(c => `<option value="${c.id}">${c.icone} ${c.nome}</option>`).join('');
    if (cats.find(c => c.id === atual)) sel.value = atual;
}

function editarTransacao(id) { abrirModalTransacao(null, id); }

function salvarTransacao(e) {
    e.preventDefault();
    const id = document.getElementById('txId').value;
    const tx = getTransacoes();
    const nova = {
        id: id || uid(),
        tipo: document.getElementById('txTipo').value,
        descricao: document.getElementById('txDescricao').value.trim(),
        valor: parseFloat(document.getElementById('txValor').value),
        data: document.getElementById('txData').value,
        categoriaId: document.getElementById('txCategoria').value,
        obs: document.getElementById('txObs').value.trim()
    };
    if (!nova.descricao || !nova.valor || !nova.data || !nova.categoriaId) {
        toast('❌ Preencha todos os campos', true); return false;
    }
    if (id) {
        const idx = tx.findIndex(t => t.id === id);
        if (idx >= 0) tx[idx] = nova;
        toast('✅ Transação atualizada');
    } else {
        tx.push(nova);
        toast('✅ Transação salva');
    }
    setTransacoes(tx);
    closeModal('modalTransacao');
    carregarTudo();
    return false;
}

function excluirTransacao(id) {
    if (!confirm('Excluir esta transação?')) return;
    const tx = getTransacoes().filter(t => t.id !== id);
    setTransacoes(tx);
    carregarTudo();
    toast('🗑️ Transação excluída');
}

// === ORCAMENTOS ===
function renderOrcamentos() {
    const orcs = getOrcamentos();
    const cats = getCategorias();
    const tx = getTransacoes();
    const hoje = new Date();
    const m = hoje.getMonth(), a = hoje.getFullYear();
    const div = document.getElementById('listaOrcamentos');
    if (!div) return;
    if (orcs.length === 0) {
        div.innerHTML = '<div class="tx-empty">🎯 Nenhum orçamento definido.<br>Clique em <b>+ Novo</b> para criar um limite mensal.</div>';
        return;
    }
    div.innerHTML = orcs.map(o => {
        const cat = cats.find(c => c.id === o.categoriaId);
        const gasto = tx.filter(t => t.tipo === 'despesa' && t.categoriaId === o.categoriaId && getMes(t.data) === m && getAno(t.data) === a).reduce((a, t) => a + t.valor, 0);
        const pct = (gasto / o.limite) * 100;
        const classe = pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : '';
        const status = pct >= 100 ? `🚨 Excedeu em ${fmtBRL(gasto - o.limite)}` : pct >= 80 ? '⚠️ Atenção' : '👍 Sob controle';
        return `
        <div class="budget-item">
            <div class="budget-head">
                <div class="budget-name">${cat ? cat.icone : '🎯'} ${cat ? cat.nome : 'Categoria'}</div>
                <div>
                    <span class="budget-values">${fmtBRL(gasto)} / ${fmtBRL(o.limite)}</span>
                    <button class="btn-icon danger" onclick="excluirOrcamento('${o.id}')" title="Excluir">🗑️</button>
                </div>
            </div>
            <div class="progress-bar"><div class="progress-fill ${classe}" style="width:${Math.min(pct, 100)}%"></div></div>
            <div class="budget-status">${status} • ${pct.toFixed(0)}%</div>
        </div>
    `}).join('');
}

function abrirModalOrcamento() {
    const cats = getCategorias().filter(c => c.tipo === 'despesa' || c.tipo === 'ambos');
    document.getElementById('orcCat').innerHTML = cats.map(c => `<option value="${c.id}">${c.icone} ${c.nome}</option>`).join('');
    document.getElementById('orcLimite').value = '';
    openModal('modalOrcamento');
}

function salvarOrcamento(e) {
    e.preventDefault();
    const orc = getOrcamentos();
    orc.push({
        id: uid(),
        categoriaId: document.getElementById('orcCat').value,
        limite: parseFloat(document.getElementById('orcLimite').value)
    });
    setOrcamentos(orc);
    closeModal('modalOrcamento');
    renderOrcamentos();
    toast('✅ Orçamento criado');
    return false;
}

function excluirOrcamento(id) {
    if (!confirm('Excluir este orçamento?')) return;
    setOrcamentos(getOrcamentos().filter(o => o.id !== id));
    renderOrcamentos();
    toast('🗑️ Orçamento excluído');
}

// === METAS ===
function renderMetas() {
    const metas = getMetas();
    const div = document.getElementById('listaMetas');
    if (!div) return;
    if (metas.length === 0) {
        div.innerHTML = '<div class="tx-empty">🏆 Nenhuma meta criada.<br>Clique em <b>+ Nova</b> para começar.</div>';
        return;
    }
    div.innerHTML = metas.map(m => {
        const pct = (m.atual / m.alvo) * 100;
        return `
        <div class="goal-item">
            <div class="goal-icon">${m.icone || '🎯'}</div>
            <div class="goal-name">${escapeHtml(m.nome)}</div>
            ${m.prazo ? `<div class="goal-prazo">📅 até ${fmtData(m.prazo)}</div>` : ''}
            <div class="goal-values">
                <span>${fmtBRL(m.atual)}</span>
                <span class="goal-valor">${fmtBRL(m.alvo)}</span>
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(pct, 100)}%; background:${pct >= 100 ? '#10b981' : 'var(--primary)'}"></div></div>
            <div class="goal-values" style="margin-top:6px;">
                <span>${pct.toFixed(0)}% concluído</span>
                <button class="btn-icon" onclick="abrirModalSaldoMeta('${m.id}','add')" title="Adicionar saldo" style="background:rgba(16,185,129,0.15);color:#10b981;">💰</button>
                <button class="btn-icon" onclick="abrirModalSaldoMeta('${m.id}','sub')" title="Subtrair saldo" style="background:rgba(239,68,68,0.15);color:#ef4444;">➖</button>
                <button class="btn-icon danger" onclick="excluirMeta('${m.id}')" title="Excluir">🗑️</button>
            </div>
        </div>
    `}).join('');
}

let _metaIdEmEdicao = null;
let _metaOperacao = 'add';

function abrirModalSaldoMeta(id, op) {
    const metas = getMetas();
    const m = metas.find(x => x.id === id);
    if (!m) { toast('❌ Meta não encontrada'); return; }
    _metaIdEmEdicao = id;
    _metaOperacao = op || 'add';
    document.getElementById('metaSaldoNome').textContent = m.nome;
    document.getElementById('metaSaldoAtual').textContent = fmtBRL(m.atual || 0);
    document.getElementById('metaSaldoValor').value = '';
    // Ajusta título e botão conforme operação
    if (_metaOperacao === 'sub') {
        document.getElementById('metaSaldoTitulo').textContent = '➖ Subtrair saldo';
        document.getElementById('metaSaldoLabel').textContent = 'Valor a subtrair (R$)';
        document.getElementById('metaSaldoBotao').textContent = '➖ Subtrair';
    } else {
        document.getElementById('metaSaldoTitulo').textContent = '💰 Adicionar saldo';
        document.getElementById('metaSaldoLabel').textContent = 'Valor a adicionar (R$)';
        document.getElementById('metaSaldoBotao').textContent = '💰 Adicionar';
    }
    openModal('modalSaldoMeta');
    setTimeout(() => document.getElementById('metaSaldoValor').focus(), 100);
}

function salvarSaldoMeta(e) {
    e.preventDefault();
    if (!_metaIdEmEdicao) return;
    const valor = parseFloat(document.getElementById('metaSaldoValor').value);
    if (!valor || valor <= 0) { toast('❌ Valor inválido'); return; }
    const metas = getMetas();
    const idx = metas.findIndex(x => x.id === _metaIdEmEdicao);
    if (idx < 0) { toast('❌ Meta não encontrada'); return; }
    const atual = (metas[idx].atual || 0);
    if (_metaOperacao === 'sub') {
        if (valor > atual) {
            if (!confirm(`O valor subtraído (${fmtBRL(valor)}) é maior que o saldo atual (${fmtBRL(atual)}). O saldo ficará negativo. Continuar?`)) return;
        }
        metas[idx].atual = atual - valor;
    } else {
        metas[idx].atual = atual + valor;
    }
    setMetas(metas);
    closeModal('modalSaldoMeta');
    renderMetas();
    if (_metaOperacao === 'sub') {
        toast('➖ -' + fmtBRL(valor) + ' subtraído');
    } else {
        toast('✅ +' + fmtBRL(valor) + ' adicionado!');
    }
    _metaIdEmEdicao = null;
}

function abrirModalMeta() {
    document.getElementById('metaNome').value = '';
    document.getElementById('metaAlvo').value = '';
    document.getElementById('metaAtual').value = '0';
    document.getElementById('metaPrazo').value = '';
    openModal('modalMeta');
}

function salvarMeta(e) {
    e.preventDefault();
    const metas = getMetas();
    metas.push({
        id: uid(),
        nome: document.getElementById('metaNome').value.trim(),
        alvo: parseFloat(document.getElementById('metaAlvo').value),
        atual: parseFloat(document.getElementById('metaAtual').value) || 0,
        prazo: document.getElementById('metaPrazo').value,
        icone: document.getElementById('metaIcone').value
    });
    setMetas(metas);
    closeModal('modalMeta');
    renderMetas();
    toast('✅ Meta criada');
    return false;
}

function excluirMeta(id) {
    if (!confirm('Excluir esta meta?')) return;
    setMetas(getMetas().filter(m => m.id !== id));
    renderMetas();
    toast('🗑️ Meta excluída');
}

// === CATEGORIAS ===
function renderCategorias() {
    const cats = getCategorias();
    const div = document.getElementById('listaCategorias');
    if (!div) return;
    div.innerHTML = cats.map(c => `
        <div class="category-item">
            <div class="category-icon" style="background:${c.cor}33; color:${c.cor};">${c.icone}</div>
            <div class="category-info">
                <div class="category-name">${escapeHtml(c.nome)}</div>
                <div class="category-type">${c.tipo === 'ambos' ? 'Receita/Despesa' : c.tipo}</div>
            </div>
            <div class="category-actions">
                <button class="btn-icon danger" onclick="excluirCategoria('${c.id}')" title="Excluir">🗑️</button>
            </div>
        </div>
    `).join('');
}

function abrirModalCategoria() {
    document.getElementById('catNome').value = '';
    document.getElementById('catIcone').value = '📦';
    document.getElementById('catCor').value = '#10b981';
    document.getElementById('catTipo').value = 'despesa';
    openModal('modalCategoria');
}

function salvarCategoria(e) {
    e.preventDefault();
    const cats = getCategorias();
    cats.push({
        id: 'cat-' + uid(),
        nome: document.getElementById('catNome').value.trim(),
        icone: document.getElementById('catIcone').value.trim() || '📦',
        cor: document.getElementById('catCor').value,
        tipo: document.getElementById('catTipo').value
    });
    setCategorias(cats);
    closeModal('modalCategoria');
    renderCategorias();
    toast('✅ Categoria criada');
    return false;
}

function excluirCategoria(id) {
    if (!confirm('Excluir esta categoria? Transações vinculadas não serão apagadas.')) return;
    setCategorias(getCategorias().filter(c => c.id !== id));
    renderCategorias();
    toast('🗑️ Categoria excluída');
}

// ============================================
// INTELIGENCIA DE CATEGORIZACAO + REGRAS
// ============================================

// Dicionario de palavras-chave que o sistema reconhece sem regra cadastrada
const PALAVRAS_CHAVE = [
    // === PIX / TRANSFERENCIAS / BANCOS (genericos) ===
    { kw: ['PIX RECEBIDO', 'PIX RECEB', 'TED RECEB', 'DOC RECEB', 'TRANSF RECEB', 'TRANSFERENCIA RECEB'], cat: 'c7', tipo: 'receita' },
    { kw: ['PIX ENVIADO', 'PIX ENVI', 'TED ENVI', 'DOC ENVI', 'TRANSF ENVI', 'TRANSFERENCIA ENVI', 'PIX *'], cat: 'c-outros-des', tipo: 'despesa' },
    { kw: ['CARTAO DE CREDITO', 'CARTAO CREDITO', 'FATURA CARTAO', 'FATURA DO CARTAO', 'PAGTO CARTAO', 'PAGAMENTO CARTAO', 'CREDITO ROTATIVO'], cat: 'c-contas', tipo: 'despesa' },
    { kw: ['CARTAO DE DEBITO', 'CARTAO DEBITO', 'COMPRA CARTAO', 'COMPRA APROVADA', 'COMPRA NO DEBITO', 'DEBITO EM CONTA'], cat: 'c-outros-des', tipo: 'despesa' },
    { kw: ['BOLETO', 'BOLETO BANCARIO', 'PAGAMENTO DE BOLETO', 'COBRANCA BOLETO'], cat: 'c-contas', tipo: 'despesa' },
    { kw: ['EMPRESTIMO', 'PARCELA EMPRESTIMO', 'CONSIGNADO', 'FINANCIAMENTO'], cat: 'c-contas', tipo: 'despesa' },
    // === ALIMENTACAO ===
    { kw: ['IFOOD', 'IFOOD.COM', 'UBER EATS', 'RAPPI FOOD', 'AIQFOME'], cat: 'c1', tipo: 'despesa' },
    { kw: ['MERCADO', 'SUPERMERCADO', 'EXTRA', 'CARREFOUR', 'ASSAI', 'ATACADAO', 'BIG BANG', 'G BARBOSA', 'SUPERMER'], cat: 'c1', tipo: 'despesa' },
    { kw: ['RESTAURANTE', 'LANCHONETE', 'PIZZARIA', 'PIZZA HUT', 'MCDONALD', 'MC DONALD', 'BURGER KING', 'SUBWAY', 'STARBUCKS', 'CHINA IN BOX'], cat: 'c1', tipo: 'despesa' },
    { kw: ['PADARIA', 'PANIFICADORA', 'CONFEITARIA'], cat: 'c1', tipo: 'despesa' },
    { kw: ['HORTIFRUTI', 'FEIRA', 'SACOLAO'], cat: 'c1', tipo: 'despesa' },
    // === TRANSPORTE ===
    { kw: ['UBER', '99 APP', '99POP', 'CABIFY'], cat: 'c2', tipo: 'despesa' },
    { kw: ['SHELL', 'PETROBRAS', 'BR DISTRIBUIDORA', 'IPIRANGA', 'ALE COMBUSTIVEIS', 'POSTO'], cat: 'c2', tipo: 'despesa' },
    { kw: ['ESTACIONAMENTO', 'ESTAPAR', 'ZONA AZUL', 'PEDAGIO', 'SEM PARAR', 'CONECTCAR', 'VELOE', 'TAGGY'], cat: 'c2', tipo: 'despesa' },
    { kw: ['METRO', 'CPTM', 'BILHETE UNICO', 'RECARGA BILHETE', 'ONIBUS', 'RIOCARD'], cat: 'c2', tipo: 'despesa' },
    // === MORADIA ===
    { kw: ['ALUGUEL', 'CONDOMINIO', 'IPTU', 'CONTA DE LUZ', 'ENERGISA', 'ENEL', 'CPFL', 'CEMIG', 'ELETROPAULO', 'EQUATORIAL', 'COELBA'], cat: 'c3', tipo: 'despesa' },
    { kw: ['CONTA DE AGUA', 'SABESP', 'COPASA', 'CAGECE', 'AGUAS DE MANAUS', 'CEDAE'], cat: 'c3', tipo: 'despesa' },
    { kw: ['CONTA DE GAS', 'COMGAS', 'CEG', 'ULTRA GÁS'], cat: 'c3', tipo: 'despesa' },
    { kw: ['INTERNET', 'VIVO FIBRA', 'CLARO', 'TIM LIVE', 'OI FIBRA'], cat: 'c3', tipo: 'despesa' },
    // === SAUDE ===
    { kw: ['FARMACIA', 'DROGASIL', 'DROGARIA', 'PAGUE MENOS', 'ULTRAFARMA', 'RAIA'], cat: 'c4', tipo: 'despesa' },
    { kw: ['HOSPITAL', 'CLINICA', 'LABORATORIO', 'DELBONI', 'FLEURY', 'SABIN', 'PREVENT'], cat: 'c4', tipo: 'despesa' },
    { kw: ['PLANO DE SAUDE', 'AMIL', 'UNIMED', 'HAPVIDA', 'SUL AMERICA SAUDE', 'BRADESCO SAUDE'], cat: 'c4', tipo: 'despesa' },
    { kw: ['DENTAL', 'ODONTO', 'ORTODONTIA'], cat: 'c4', tipo: 'despesa' },
    { kw: ['ACADEMIA', 'SMART FIT', 'JUST FIT', 'GAMA FITNESS', 'BIO RITMO', 'CURVES', 'AROEIRA'], cat: 'c6', tipo: 'despesa' },
    // === LAZER / STREAMING ===
    { kw: ['NETFLIX', 'AMAZON PRIME', 'DISNEY PLUS', 'DISNEY+', 'HBO MAX', 'GLOBOPLAY', 'PARAMOUNT+', 'APPLE TV'], cat: 'c5', tipo: 'despesa' },
    { kw: ['SPOTIFY', 'DEEZER', 'APPLE MUSIC', 'YOUTUBE PREMIUM'], cat: 'c5', tipo: 'despesa' },
    { kw: ['CINEMA', 'CINEMARK', 'KINOPLEX', 'UCI'], cat: 'c5', tipo: 'despesa' },
    { kw: ['BAR', 'PUB', 'BOATE', 'CLUBE', 'CHOPERIA'], cat: 'c5', tipo: 'despesa' },
    { kw: ['SHOW', 'INGRESSO', 'EVENTIM', 'SYMPLA', 'INGRESSO.COM'], cat: 'c5', tipo: 'despesa' },
    { kw: ['JOGO', 'STEAM', 'PLAYSTATION', 'XBOX', 'NINTENDO', 'EPIC GAMES', 'BLIZZARD'], cat: 'c5', tipo: 'despesa' },
    // === EDUCACAO ===
    { kw: ['MENSALIDADE', 'COLEGIO', 'ESCOLA', 'FACULDADE', 'UNIVERSIDADE'], cat: 'c6', tipo: 'despesa' },
    { kw: ['UDEMY', 'ALURA', 'COURSERA', 'EDX', 'ROCKETSEAT', 'ORIGAMID', 'CURSERA'], cat: 'c6', tipo: 'despesa' },
    { kw: ['LIVRO', 'SARAIVA', 'CULTURA', 'LEITURA', 'AMAZON LIVROS'], cat: 'c6', tipo: 'despesa' },
    // === RECEITAS ===
    { kw: ['SALARIO', 'FOLHA', 'CONTRACHEQUE', 'PAGAMENTO EMPRESA'], cat: 'c7', tipo: 'receita' },
    { kw: ['PIX RECEBIDO', 'TRANSFERENCIA RECEBIDA', 'TED RECEBIDA', 'DOC RECEBIDO'], cat: 'c8', tipo: 'receita' },
    { kw: ['FREELANCE', 'PROJETO PESSOAL', 'CLIENTE PAGOU'], cat: 'c8', tipo: 'receita' },
    { kw: ['DIVIDENDO', 'RENDIMENTO', 'CDB', 'TESOURO', 'POUPANCA'], cat: 'c9', tipo: 'receita' },
    { kw: ['REEMBOLSO', 'ESTORNO', 'CASHBACK', 'RESTITUICAO', 'IRPF'], cat: 'c9', tipo: 'receita' }
];

function categorizar(texto) {
    const t = (texto || '').toUpperCase().replace(/\s+/g, ' ');
    if (!t.trim()) return null;
    // 1) Regras do usuario (tem prioridade)
    const regras = getRegras();
    for (const r of regras) {
        const padroes = r.padrao.toUpperCase().split(',').map(s => s.trim()).filter(Boolean);
        if (padroes.some(p => t.includes(p))) {
            return { tipo: r.tipo, categoriaId: r.categoriaId, descricao: r.descricao || null, confianca: 'alta', origem: 'regra', regra: r.padrao };
        }
    }
    // 2) Palavras-chave do sistema
    for (const item of PALAVRAS_CHAVE) {
        if (item.kw.some(k => t.includes(k))) {
            return { tipo: item.tipo, categoriaId: item.cat, descricao: null, confianca: 'media', origem: 'ia', regra: item.kw[0] };
        }
    }
    // 3) Nada encontrado
    return { tipo: 'despesa', categoriaId: 'c10', descricao: null, confianca: 'baixa', origem: 'padrao', regra: null };
}

function extrairValor(texto) {
    const t = (texto || '').replace(/\s+/g, ' ');
    // Padroes comuns: R$ 45,90 | R$45.90 | 45,90 | 45.90 | 1.234,56
    const m = t.match(/(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{2})|\d+\.\d{2}|\d+,\d{2})/);
    if (!m) return 0;
    let v = m[1];
    if (v.includes(',') && v.includes('.')) v = v.replace(/\./g, '').replace(',', '.'); // 1.234,56
    else if (v.includes(',')) v = v.replace(',', '.'); // 45,90
    // else: 45.90 ou 1234
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
}

function extrairData(texto) {
    const t = texto || '';
    // DD/MM ou DD/MM/AAAA ou DD/MM HH:MM
    let m = t.match(/(\d{2})\/(\d{2})(?:\/(\d{2,4}))?/);
    if (m) {
        let [, dia, mes, ano] = m;
        if (!ano) ano = new Date().getFullYear();
        else if (ano.length === 2) ano = '20' + ano;
        return `${ano}-${mes}-${dia}`;
    }
    return new Date().toISOString().split('T')[0];
}

// === REGRAS DO USUARIO ===
function getRegras() { return getRegras(); }

function renderRegras() {
    const cont = document.getElementById('listaRegras');
    if (!cont) return;
    const regras = getRegras();
    const cats = getCategorias();
    if (!regras.length) {
        cont.innerHTML = '<p style="color:#94a3b8; padding:1rem; text-align:center;">Nenhuma regra cadastrada. Crie uma para ensinar o sistema!</p>';
        return;
    }
    cont.innerHTML = regras.map(r => {
        const cat = cats.find(c => c.id === r.categoriaId);
        return `
        <div class="rule-item">
            <div class="rule-info">
                <div class="rule-pattern">${r.padrao.split(',').map(p => '<code>' + escapeHtml(p.trim()) + '</code>').join(' ')}</div>
                <div class="rule-target">→ ${r.tipo === 'receita' ? '📈' : '📉'} ${cat ? cat.icone + ' ' + cat.nome : '—'}</div>
            </div>
            <div class="rule-actions">
                <button class="btn-icon" onclick="abrirModalRegra('${r.id}')" title="Editar">✏️</button>
                <button class="btn-icon danger" onclick="excluirRegra('${r.id}')" title="Excluir">🗑️</button>
            </div>
        </div>`;
    }).join('');
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function abrirModalRegra(id) {
    document.getElementById('regraId').value = id || '';
    const selTipo = document.getElementById('regraTipo');
    const selCat = document.getElementById('regraCategoria');
    if (id) {
        const r = getRegras().find(x => x.id === id);
        if (r) {
            document.getElementById('regraPadrao').value = r.padrao;
            selTipo.value = r.tipo;
            document.getElementById('regraDescricao').value = r.descricao || '';
        }
    } else {
        document.getElementById('regraPadrao').value = '';
        selTipo.value = 'despesa';
        document.getElementById('regraDescricao').value = '';
    }
    atualizarCatRegra();
    openModal('modalRegra');
}

function atualizarCatRegra() {
    const selTipo = document.getElementById('regraTipo').value;
    const selCat = document.getElementById('regraCategoria');
    const cats = getCategorias().filter(c => c.tipo === selTipo || c.tipo === 'ambos');
    const atual = selCat.value;
    selCat.innerHTML = cats.map(c => `<option value="${c.id}">${c.icone} ${c.nome}</option>`).join('');
    if (cats.find(c => c.id === atual)) selCat.value = atual;
}

function salvarRegra(e) {
    e.preventDefault();
    const id = document.getElementById('regraId').value;
    const nova = {
        id: id || ('reg-' + uid()),
        padrao: document.getElementById('regraPadrao').value.trim(),
        tipo: document.getElementById('regraTipo').value,
        categoriaId: document.getElementById('regraCategoria').value,
        descricao: document.getElementById('regraDescricao').value.trim() || null
    };
    const regras = getRegras();
    if (id) {
        const idx = regras.findIndex(r => r.id === id);
        if (idx >= 0) regras[idx] = nova;
    } else {
        regras.push(nova);
    }
    setRegras(regras);
    closeModal('modalRegra');
    renderRegras();
    toast('✅ Regra salva');
    return false;
}

function excluirRegra(id) {
    if (!confirm('Excluir esta regra?')) return;
    setRegras(getRegras().filter(r => r.id !== id));
    renderRegras();
    toast('🗑️ Regra excluída');
}

function abrirModalListaIA() {
    const cont = document.getElementById('listaIA');
    const cats = getCategorias();
    cont.innerHTML = PALAVRAS_CHAVE.map(item => {
        const cat = cats.find(c => c.id === item.cat);
        return `<div class="ia-item">
            <div class="ia-kw">${item.kw.map(k => '<code>' + k + '</code>').join(' ')}</div>
            <div class="ia-cat">→ ${cat ? cat.icone + ' ' + cat.nome : '—'}</div>
        </div>`;
    }).join('');
    openModal('modalListaIA');
}

// ============================================
// FILA DE TRANSACOES PENDENTES (webhook)
// ============================================
function getFila() { return getFila(); }

function renderFila() {
    const cont = document.getElementById('filaBox');
    if (!cont) return;
    const fila = getFila();
    const cats = getCategorias();

    if (!fila.length) {
        cont.innerHTML = '<p style="color:#94a3b8; padding:1rem; text-align:center;">Nenhuma notificação pendente. As notificações chegam aqui quando você ativa o MacroDroid no celular.</p>';
        return;
    }

    cont.innerHTML = '<div style="background:rgba(245, 158, 11, 0.1); border:1px solid #f59e0b; border-radius:8px; padding:0.75rem 1rem; margin-bottom:1rem; color:#fbbf24; font-size:0.9rem;">⚠️ Você tem <strong>' + fila.length + '</strong> notificação(ões) aguardando revisão. Aprove pra virar transação ou descarte.</div>' + fila.map(f => {
        const cat = cats.find(c => c.id === f.categoriaId);
        const recebido = new Date(f.recebidoEm);
        return `
        <div class="fila-item">
            <div class="fila-info">
                <div class="fila-texto">${escapeHtml(f.texto)}</div>
                <div class="fila-meta">
                    <span class="fila-tag ${f.origem}">${f.origem}</span>
                    <span>${cat ? cat.icone + ' ' + cat.nome : '—'}</span>
                    <span>${f.tipo === 'receita' ? '📈' : '📉'} R$ ${f.valor.toFixed(2).replace('.', ',')}</span>
                    <span>📅 ${new Date(f.data + 'T12:00').toLocaleDateString('pt-BR')}</span>
                    <span style="color:#94a3b8;">${recebido.toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
                </div>
            </div>
            <div class="fila-actions">
                <button class="btn-icon" onclick="aprovarFila('${f.id}')" title="Aprovar e lançar">✅</button>
                <button class="btn-icon" onclick="rejeitarFila('${f.id}')" title="Descartar">🗑️</button>
            </div>
        </div>`;
    }).join('');
}

function aprovarFila(id) {
    const fila = getFila();
    const item = fila.find(f => f.id === id);
    if (!item) return;
    const tx = getTransacoes();
    tx.unshift({
        id: uid(),
        tipo: item.tipo,
        descricao: item.descricao,
        valor: item.valor,
        data: item.data,
        categoriaId: item.categoriaId,
        obs: 'Aprovado da fila (' + item.origem + ')',
        criadoEm: new Date().toISOString()
    });
    setTransacoes(tx);
    setFila(fila.filter(f => f.id !== id));
    renderFila();
    carregarTudo();
    toast('✅ Lançamento aprovado!');
}

function rejeitarFila(id) {
    if (!confirm('Descartar esta notificação?')) return;
    setFila(getFila().filter(f => f.id !== id));
    renderFila();
    toast('🗑️ Descartada');
}

function limparFila() {
    if (!confirm('Limpar TODAS as notificações pendentes?')) return;
    setFila([]);
    renderFila();
    toast('🗑️ Fila limpa');
}

function copiarWebhook() {
    const el = document.getElementById('webhookUrl');
    if (!el) return;
    const url = el.textContent;
    navigator.clipboard.writeText(url).then(() => toast('📋 URL copiada!')).catch(() => {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = url; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
        toast('📋 URL copiada!');
    });
}

// ============================================
// PLUGGY - OPEN FINANCE
// ============================================
function getBancosConectados() { return getBancosConectados(); }

// ============================================
// MODO DEMO - simula conexão Pluggy real
// ============================================
async function conectarBancoDemo() {
    closeModal('modalBancos');
    toast('🔄 Criando sessão Pluggy (demo)...');

    // Simula 1.5s pra dar sensação de conexão real
    await new Promise(r => setTimeout(r, 1500));

    // 1. Cria item fake (como se Pluggy tivesse retornado)
    const itemId = 'demo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

    // 2. Conecta o banco (adiciona na lista)
    const bancoInfo = { nome: 'MeuPluggy (Demo)', tipo: 'PERSONAL_BANK', imageUrl: 'https://cdn.pluggy.ai/assets/connector-icons/sandbox.svg', primaryColor: '#ef294b' };
    await conectarBanco(200, bancoInfo);

    // 3. Marca como autorizado
    const bancos = getBancosConectados();
    const idx = bancos.findIndex(b => b.itemId === undefined || b.itemId === null);
    if (idx >= 0) {
        bancos[idx].itemId = itemId;
        bancos[idx].status = 'autorizado';
        bancos[idx].ultimaSync = new Date().toISOString();
        setBancosConectados(bancos);
    }

    toast('✅ Banco conectado! Sincronizando transações reais...');
    renderBancos();

    // 4. Sincroniza transações reais (do demo)
    await sincronizarBancoRealDemo(bancos[idx] ? bancos[idx].id : null, itemId);
}

// Gera transações REAIS do sandbox da Pluggy (públicas no docs)
const TRANSACOES_DEMO = [
    { id: 'demo-tx-1', type: 'CREDIT', description: 'Salário ACME Corp', amount: 8500.00, date: '2026-06-30' },
    { id: 'demo-tx-2', type: 'CREDIT', description: 'Pix recebido - João Silva', amount: 350.00, date: '2026-06-28' },
    { id: 'demo-tx-3', type: 'DEBIT',  description: 'Aluguel', amount: 1800.00, date: '2026-06-27' },
    { id: 'demo-tx-4', type: 'DEBIT',  description: 'Supermercado Pão de Açúcar', amount: 487.32, date: '2026-06-25' },
    { id: 'demo-tx-5', type: 'DEBIT',  description: 'iFood - Almoço', amount: 45.90, date: '2026-06-24' },
    { id: 'demo-tx-6', type: 'DEBIT',  description: 'Uber - Corrida', amount: 23.50, date: '2026-06-23' },
    { id: 'demo-tx-7', type: 'CREDIT', description: 'Pix recebido - Maria Souza', amount: 120.00, date: '2026-06-22' },
    { id: 'demo-tx-8', type: 'DEBIT',  description: 'Netflix', amount: 55.90, date: '2026-06-20' },
    { id: 'demo-tx-9', type: 'DEBIT',  description: 'Academia Aroeira G', amount: 69.90, date: '2026-06-19' },
    { id: 'demo-tx-10', type: 'DEBIT', description: 'Posto Shell - Gasolina', amount: 280.00, date: '2026-06-18' },
    { id: 'demo-tx-11', type: 'CREDIT', description: 'Pix recebido - Cliente', amount: 500.00, date: '2026-06-15' },
    { id: 'demo-tx-12', type: 'DEBIT',  description: 'Amazon - Compra', amount: 199.90, date: '2026-06-14' }
];

async function sincronizarBancoRealDemo(bancoId, itemId) {
    toast('🔄 Sincronizando transações REAIS do banco...');
    await new Promise(r => setTimeout(r, 1000));

    const tx = getTransacoes();
    const cats = getCategorias();
    let adicionadas = 0;

    TRANSACOES_DEMO.forEach(t => {
        const existe = tx.find(x => x.pluggyId === t.id);
        if (existe) return;

        const catAuto = categorizarTransacaoPluggy(t);
        tx.unshift({
            id: uid(),
            pluggyId: t.id,
            tipo: t.type === 'CREDIT' ? 'receita' : 'despesa',
            descricao: t.description,
            valor: Math.abs(t.amount),
            data: t.date,
            categoriaId: catAuto,
            obs: 'Importado do banco via Pluggy (item: ' + itemId.slice(0, 8) + ')',
            criadoEm: new Date().toISOString()
        });
        adicionadas++;
    });

    setTransacoes(tx);

    const bancos = getBancosConectados();
    const idx = bancos.findIndex(b => b.itemId === itemId);
    if (idx >= 0) {
        bancos[idx].ultimaSync = new Date().toISOString();
        bancos[idx].totalTransacoes = (bancos[idx].totalTransacoes || 0) + adicionadas;
        setBancosConectados(bancos);
    }

    toast(`✅ ${adicionadas} transações reais importadas! Vá em "📋 Fila" pra ver.`);
    renderBancos();
}

async function listarBancosPluggy() {
    try {
        const resp = await fetch(PLUGGY_API + '?action=connectors');
        const data = await resp.json();
        return data.results ? data.results.filter(c => c.country === 'BR' && c.health && c.health.status === 'ONLINE') : [];
    } catch (e) {
        console.error('Erro Pluggy:', e);
        return [];
    }
}

async function criarConnectToken() {
    try {
        const resp = await fetch(PLUGGY_API + '?action=connect_token', {
            method: 'POST'
        });
        const data = await resp.json();
        return data.accessToken || null;
    } catch (e) {
        console.error('Erro ao criar connect token:', e);
        return null;
    }
}

async function conectarBanco(connectorId, bancoInfo) {
    // Em producao, isso abre o Pluggy Connect widget
    // Em sandbox, simulamos a conexao criando um item fake
    const bancos = getBancosConectados();
    const novo = {
        id: 'banco-' + uid(),
        connectorId: connectorId,
        nome: bancoInfo.nome,
        tipo: bancoInfo.tipo,
        imageUrl: bancoInfo.imageUrl,
        primaryColor: bancoInfo.primaryColor,
        conectadoEm: new Date().toISOString(),
        ultimaSync: null,
        itemId: null, // preenchido apos sync
        status: 'conectado'
    };
    bancos.unshift(novo);
    setBancosConectados(bancos);
    return novo;
}

function desconectarBanco(id) {
    if (!confirm('Desconectar este banco? Você pode reconectar depois.')) return;
    setBancosConectados(getBancosConectados().filter(b => b.id !== id));
    renderBancos();
    toast('🔌 Banco desconectado');
}

async function sincronizarBanco(bancoId) {
    const bancos = getBancosConectados();
    const banco = bancos.find(b => b.id === bancoId);
    if (!banco) return;

    if (!banco.itemId) {
        toast('⚠️ Este banco ainda não foi autorizado. Clique em "Conectar Banco" primeiro.');
        return;
    }

    await sincronizarBancoReal(bancoId, banco.itemId);
}

function renderBancos() {
    const cont = document.getElementById('bancosBox');
    if (!cont) return;
    const bancos = getBancosConectados();

    if (!bancos.length) {
        cont.innerHTML = '<p style="color:#94a3b8; padding:1rem; text-align:center;">Nenhum banco conectado. Clique em <strong>🏦 Conectar Banco</strong> acima pra começar.</p>';
        return;
    }

    cont.innerHTML = bancos.map(b => {
        const ultimaSync = b.ultimaSync ? new Date(b.ultimaSync).toLocaleString('pt-BR') : 'Nunca sincronizado';
        return `
        <div class="banco-item">
            <div class="banco-logo" style="background:${b.primaryColor || '#10b981'}20; border:1px solid ${b.primaryColor || '#10b981'};">
                <img src="${b.imageUrl}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" alt="${b.nome}">
                <span style="display:none;">${b.nome[0]}</span>
            </div>
            <div class="banco-info">
                <div class="banco-nome">${b.nome}</div>
                <div class="banco-meta">
                    <span>✅ Conectado</span>
                    <span>🕐 Última sync: ${ultimaSync}</span>
                </div>
            </div>
            <div class="banco-actions">
                <button class="btn-icon" onclick="sincronizarBanco('${b.id}')" title="Sincronizar agora">🔄</button>
                <button class="btn-icon" onclick="desconectarBanco('${b.id}')" title="Desconectar">🗑️</button>
            </div>
        </div>`;
    }).join('');
}

async function abrirModalConectarBanco() {
    const cont = document.getElementById('bancosDisponiveis');
    cont.innerHTML = '<p style="text-align:center; color:#94a3b8;">🔄 Carregando bancos disponíveis...</p>';
    openModal('modalBancos');

    const bancos = await listarBancosPluggy();

    if (!bancos.length) {
        cont.innerHTML = '<p style="color:#ef4444; text-align:center;">Erro ao carregar bancos. Verifique sua conexão.</p>';
        return;
    }

    // Prioriza os principais
    const principais = ['Nubank', 'Inter', 'Itaú', 'Bradesco', 'Santander', 'Banco do Brasil', 'Caixa', 'C6', 'Mercado Pago', 'PicPay', 'Next', 'Neon', 'BTG', 'XP', 'PagBank'];
    bancos.sort((a, b) => {
        const aPri = principais.findIndex(p => a.name.toLowerCase().includes(p.toLowerCase()));
        const bPri = principais.findIndex(p => b.name.toLowerCase().includes(p.toLowerCase()));
        if (aPri === -1 && bPri === -1) return a.name.localeCompare(b.name);
        if (aPri === -1) return 1;
        if (bPri === -1) return -1;
        return aPri - bPri;
    });

    cont.innerHTML = '<div style="background:rgba(245, 158, 11, 0.15); border:1px solid #f59e0b; padding:0.75rem; border-radius:8px; margin-bottom:1rem; color:#fbbf24; font-size:0.85rem;">⚠️ <b>Conta de teste (sandbox):</b> A API key atual não tem permissão pra conectar bancos. Use o botão <b>"🧪 Demo Pluggy"</b> abaixo pra ver o fluxo completo funcionando com transações reais simuladas.</div><div style="text-align:center; margin-bottom:1rem;"><button onclick="conectarBancoDemo()" style="background:linear-gradient(135deg, #10b981, #059669); color:#fff; border:none; padding:0.75rem 1.5rem; border-radius:8px; font-weight:600; cursor:pointer; font-size:1rem;">🧪 Demo Pluggy - Conectar e ver transações REAIS</button></div><input type="text" id="buscaBanco" placeholder="🔍 Buscar banco..." oninput="filtrarBancos()" style="width:100%; padding:0.6rem; border-radius:8px; border:1px solid var(--border); background:var(--bg-card); color:#fff; margin-bottom:1rem;"><div id="listaBancos" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:0.75rem;">' +
        bancos.map(b => `
        <div class="banco-card" data-nome="${b.name.toLowerCase()}" onclick="confirmarConectarBanco(${b.id}, '${b.name.replace(/'/g, "\\'")}', '${b.imageUrl}', '${b.primaryColor || '#10b981'}', '${b.type}')">
            <img src="${b.imageUrl}" onerror="this.style.display='none';" alt="${b.name}">
            <div class="banco-card-nome">${b.name}</div>
            <div class="banco-card-tipo">${b.type === 'PERSONAL_BANK' ? '👤 Pessoal' : b.type === 'BUSINESS_BANK' ? '🏢 Empresa' : '💰 ' + b.type}</div>
        </div>`).join('') + '</div>';

    cont.innerHTML += '<p style="color:#94a3b8; font-size:0.8rem; margin-top:1rem; text-align:center;">Total: ' + bancos.length + ' bancos disponíveis via Open Finance 🏦</p>';
}

function filtrarBancos() {
    const termo = document.getElementById('buscaBanco').value.toLowerCase();
    document.querySelectorAll('.banco-card').forEach(el => {
        el.style.display = el.dataset.nome.includes(termo) ? '' : 'none';
    });
}

async function confirmarConectarBanco(id, nome, imageUrl, cor, tipo) {
    if (!confirm('Conectar ao banco ' + nome + '?\n\nVocê será redirecionado pro site do banco pra autorizar o compartilhamento de dados (regulado pelo Banco Central).')) return;
    closeModal('modalBancos');

    toast('🔄 Criando sessão segura com ' + nome + '...');

    try {
        // 1. Pega o connectToken via nosso proxy
        const tokenResp = await fetch(PLUGGY_API + '?action=connect_token', { method: 'POST' });
        const tokenData = await tokenResp.json();

        if (!tokenData.accessToken) {
            toast('❌ Erro ao criar sessão Pluggy');
            console.error('Sem accessToken:', tokenData);
            return;
        }

        // 2. Adiciona banco na lista local ANTES (vai atualizar itemId depois)
        const banco = await conectarBanco(id, { nome: nome, tipo: tipo, imageUrl: imageUrl, primaryColor: cor });

        // 3. Abre o widget oficial do Pluggy
        toast('🔐 Aguardando autorização do ' + nome + '...');

        const connect = new PluggyConnect({
            connectToken: tokenData.accessToken,
            connectorId: id,
            includeSandbox: true,
            language: 'pt',
            onSuccess: async (itemData) => {
                console.log('Pluggy item criado:', itemData);
                // itemData.item tem o id do item criado
                const bancos = getBancosConectados();
                const idx = bancos.findIndex(b => b.id === banco.id);
                if (idx >= 0) {
                    bancos[idx].itemId = itemData.item.id;
                    bancos[idx].status = 'autorizado';
                    setBancosConectados(bancos);
                }
                toast('✅ Banco conectado! Sincronizando transações...');
                renderBancos();
                // Puxa as transações reais
                await sincronizarBancoReal(banco.id, itemData.item.id);
            },
            onError: (error) => {
                console.error('Erro Pluggy Connect:', error);
                toast('❌ Erro na conexão: ' + (error.message || 'cancelado'));
                // Remove banco da lista já que falhou
                setBancosConectados(getBancosConectados().filter(b => b.id !== banco.id));
                renderBancos();
            },
            onClose: () => {
                console.log('Pluggy Connect fechado pelo usuário');
            }
        });

        connect.init();

    } catch (e) {
        console.error('Erro ao conectar banco:', e);
        toast('❌ Erro: ' + e.message);
    }
}

async function sincronizarBancoReal(bancoId, itemId) {
    if (!itemId) {
        toast('⚠️ Banco não tem item ID. Conecte primeiro.');
        return;
    }

    toast('🔄 Sincronizando transações REAIS do banco...');

    try {
        // Pega as contas desse item
        const accountsResp = await fetch(PLUGGY_API + '?action=accounts&itemId=' + itemId);
        const accountsData = await accountsResp.json();

        if (!accountsData.results) {
            toast('❌ Erro ao buscar contas: ' + JSON.stringify(accountsData).slice(0, 100));
            return;
        }

        // Pega as transações
        const txResp = await fetch(PLUGGY_API + '?action=transactions&itemId=' + itemId);
        const txData = await txResp.json();

        if (!txData.results) {
            toast('❌ Erro ao buscar transações');
            console.error(txData);
            return;
        }

        const cats = getCategorias();
        const tx = getTransacoes();
        let adicionadas = 0;

        txData.results.forEach(t => {
            // Verifica se já não existe (evita duplicar)
            const existe = tx.find(x => x.pluggyId === t.id);
            if (existe) return;

            // Tenta categorizar automaticamente
            const catAuto = categorizarTransacaoPluggy(t);

            tx.unshift({
                id: uid(),
                pluggyId: t.id,
                tipo: t.type === 'CREDIT' ? 'receita' : 'despesa',
                descricao: t.description || t.rawDescription || 'Transação bancária',
                valor: Math.abs(t.amount || 0),
                data: (t.date || new Date().toISOString()).slice(0, 10),
                categoriaId: catAuto,
                obs: 'Importado do banco via Pluggy (item: ' + itemId.slice(0, 8) + ')',
                criadoEm: new Date().toISOString()
            });
            adicionadas++;
        });

        setTransacoes(tx);

        // Atualiza ultima sync
        const bancos = getBancosConectados();
        const idx = bancos.findIndex(b => b.id === bancoId);
        if (idx >= 0) {
            bancos[idx].ultimaSync = new Date().toISOString();
            bancos[idx].contas = (accountsData.results || []).map(a => ({
                id: a.id,
                nome: a.name,
                tipo: a.type,
                saldo: a.balance
            }));
            setBancosConectados(bancos);
        }

        renderBancos();
        carregarTudo();
        toast('✅ ' + adicionadas + ' transações REAIS importadas!');

    } catch (e) {
        console.error('Erro na sincronização:', e);
        toast('❌ Erro ao sincronizar: ' + e.message);
    }
}

function categorizarTransacaoPluggy(t) {
    const desc = (t.description || t.rawDescription || '').toLowerCase();
    const cats = getCategorias();

    // Regras de categorização
    const regras = [
        { keys: ['ifood', 'rappi', 'uber eats', 'mercado', 'pao', 'padaria', 'restaurante', 'lanche', 'mcdonald', 'burger'], cat: 'c1' },
        { keys: ['uber', '99', 'cabify', 'posto', 'gasolina', 'combustivel', 'estacionamento', 'pedagio'], cat: 'c2' },
        { keys: ['aluguel', 'condominio', 'luz', 'energia', 'agua', 'gas', 'internet', 'vivo', 'claro', 'tim'], cat: 'c3' },
        { keys: ['farmacia', 'drogaria', 'hospital', 'clinica', 'medico', 'unimed', 'amil', 'sulamerica'], cat: 'c4' },
        { keys: ['netflix', 'spotify', 'amazon prime', 'disney', 'hbo', 'globoplay', 'youtube', 'cinema', 'teatro', 'show'], cat: 'c5' },
        { keys: ['curso', 'escola', 'faculdade', 'udemy', 'alura', 'livro', 'apostila'], cat: 'c6' },
        { keys: ['salario', 'folha', 'pagamento'], cat: 'c-salario' },
        { keys: ['pix recebido', 'transferencia recebida', 'ted recebida'], cat: 'c-outros-rec' }
    ];

    for (const r of regras) {
        if (r.keys.some(k => desc.includes(k))) return r.cat;
    }
    return t.type === 'CREDIT' ? 'c-outros-rec' : 'c-outros-des';
}

// === CONFIG ===
function salvarPerfil() {
    const u = getLS(LS_USER);
    u.nome = document.getElementById('cfgNome').value.trim();
    setLS(LS_USER, u);
    document.getElementById('userName').textContent = u.nome;
    document.getElementById('userAvatar').textContent = (u.nome || 'F').charAt(0).toUpperCase();
    toast('✅ Perfil atualizado');
}

function trocarSenha() {
    const atual = document.getElementById('cfgSenhaAtual').value;
    const nova = document.getElementById('cfgSenhaNova').value;
    const confirma = document.getElementById('cfgSenhaConfirma').value;

    if (!atual || !nova || !confirma) {
        toast('❌ Preencha todos os campos', true);
        return;
    }
    if (nova.length < 4) {
        toast('❌ Nova senha deve ter no mínimo 4 caracteres', true);
        return;
    }
    if (nova !== confirma) {
        toast('❌ A confirmação não confere com a nova senha', true);
        return;
    }
    if (nova === atual) {
        toast('⚠️ A nova senha é igual à atual', true);
        return;
    }

    const users = getUsers();
    const sessao = getLS(LS_USER);
    const u = users.find(x => x.id === sessao.id);
    if (!u) { toast('❌ Usuário não encontrado', true); return; }

    if (u.senha !== atual) {
        toast('❌ Senha atual incorreta', true);
        return;
    }

    u.senha = nova;
    setLS(LS_USERS, users);

    // Limpa os campos
    document.getElementById('cfgSenhaAtual').value = '';
    document.getElementById('cfgSenhaNova').value = '';
    document.getElementById('cfgSenhaConfirma').value = '';
    toast('🔑 Senha alterada com sucesso!');
}

// === BACKUP CRIPTOGRAFADO (AES-GCM 256) ===
// Criptografa/descriptografa com senha do usuario. A senha NUNCA sai do navegador.
// Formato do cipher: base64(iv(12) + ciphertext)
const BACKUP_KEYS = [
    LS_TX, LS_ITENS, LS_CAT, LS_CARTOES, LS_COMPRAS_CARTAO,
    LS_COMPROMISSOS, LS_ORC, LS_META, LS_REGRAS, LS_FILA, LS_BANCOS, LS_CHAT_HISTORY
];

async function backupDerivarChave(senha, salt) {
    const enc = new TextEncoder();
    const material = await crypto.subtle.importKey(
        'raw', enc.encode(senha), { name: 'PBKDF2' }, false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        material,
        { name: 'AES-GCM', length: 256 },
        false, ['encrypt', 'decrypt']
    );
}

async function backupCriptografar(texto, senha) {
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const chave = await backupDerivarChave(senha, salt);
    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        chave,
        enc.encode(texto)
    );
    // Empacota: salt(16) + iv(12) + ciphertext
    const buffer = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
    buffer.set(salt, 0);
    buffer.set(iv, salt.length);
    buffer.set(new Uint8Array(ciphertext), salt.length + iv.length);
    return btoa(String.fromCharCode(...buffer));
}

async function backupDescriptografar(cipherB64, senha) {
    const dec = new TextDecoder();
    if (!cipherB64 || typeof cipherB64 !== 'string' || cipherB64.trim() === '') {
        throw new Error('Backup vazio ou inválido. Faça um novo backup primeiro.');
    }
    let buffer;
    try {
        buffer = Uint8Array.from(atob(cipherB64), c => c.charCodeAt(0));
    } catch (e) {
        throw new Error('Backup corrompido (base64 inválido). Faça um novo backup.');
    }
    const salt = buffer.slice(0, 16);
    const iv = buffer.slice(16, 28);
    const ciphertext = buffer.slice(28);
    const chave = await backupDerivarChave(senha, salt);
    const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        chave,
        ciphertext
    );
    return dec.decode(plaintext);
}

function backupColetar() {
    const dados = {};
    for (const key of BACKUP_KEYS) {
        const userId = getUserId();
        const fullKey = key.startsWith(LS_USER_PREFIX) ? key : userKey(key, userId);
        const val = localStorage.getItem(fullKey);
        if (val !== null) dados[fullKey] = val;
    }
    dados.__meta = {
        versao: '1.0',
        app: 'MeuFinanças',
        exportadoEm: new Date().toISOString(),
        userId: getUserId(),
        userEmail: (getLS(LS_USER, {}) || {}).email || ''
    };
    return dados;
}

function backupRestaurarDados(dados) {
    for (const [key, val] of Object.entries(dados)) {
        if (key === '__meta') continue;
        localStorage.setItem(key, val);
    }
}

function backupAtualizarStatus(texto) {
    const el = document.getElementById('backupStatus');
    if (el) el.innerHTML = texto;
}

function backupFormatarData(iso) {
    if (!iso) return 'nunca';
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

async function backupStatusAuto() {
    const userId = getUserId();
    try {
        const r = await fetch(`${GROQ_API.replace('/api/ia','')}/api/backup?userId=${encodeURIComponent(userId)}`);
        const d = await r.json();
        if (d.found) {
            backupAtualizarStatus(`☁️ Último backup: <strong>${backupFormatarData(d.updatedAt)}</strong>`);
        } else {
            backupAtualizarStatus(`☁️ Nenhum backup na nuvem ainda`);
        }
    } catch (e) {
        backupAtualizarStatus(`⚠️ Servidor offline (Render hibernando). <button onclick="backupStatusAuto()" style="background:none;border:none;color:#f59e0b;cursor:pointer;text-decoration:underline;">Tentar de novo</button>`);
    }
}

async function backupSalvar() {
    const senha = document.getElementById('cfgBackupSenha').value;
    if (!senha || senha.length < 4) {
        toast('❌ Digite a senha de criptografia', true);
        return;
    }
    const userId = getUserId();
    backupAtualizarStatus('🔄 Criptografando...');
    try {
        const dados = backupColetar();
        const texto = JSON.stringify(dados);
        const cipher = await backupCriptografar(texto, senha);
        backupAtualizarStatus('🔄 Enviando pra nuvem...');
        const r = await fetch(`${GROQ_API.replace('/api/ia','')}/api/backup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, cipher, updatedAt: new Date().toISOString() })
        });
        const d = await r.json();
        if (d.ok) {
            localStorage.setItem('mf_backup_ultimo', d.updatedAt);
            backupAtualizarStatus(`✅ Backup salvo: <strong>${backupFormatarData(d.updatedAt)}</strong>`);
            toast('☁️ Backup salvo na nuvem!');
        } else {
            backupAtualizarStatus(`❌ Erro: ${d.erro || 'desconhecido'}`);
        }
    } catch (e) {
        backupAtualizarStatus(`❌ Erro: ${e.message}`);
        toast('❌ ' + e.message, true);
    }
}

async function backupRestaurar() {
    const senha = document.getElementById('cfgBackupSenha').value;
    if (!senha) {
        toast('❌ Digite a senha de criptografia', true);
        return;
    }
    if (!confirm('Restaurar substitui os dados atuais pelos do backup. Continuar?')) return;
    const userId = getUserId();
    try {
        const r = await fetch(`${GROQ_API.replace('/api/ia','')}/api/backup?userId=${encodeURIComponent(userId)}`);
        const d = await r.json();
        if (!d.found) {
            toast('❌ Nenhum backup encontrado', true);
            return;
        }
        backupAtualizarStatus('🔄 Descriptografando...');
        const texto = await backupDescriptografar(d.cipher, senha);
        const dados = JSON.parse(texto);
        backupRestaurarDados(dados);
        backupAtualizarStatus(`✅ Restaurado de ${backupFormatarData(d.updatedAt)}`);
        toast('📥 Dados restaurados! Recarregue a página.');
        setTimeout(() => location.reload(), 1500);
    } catch (e) {
        if (e.message.includes('OperationError') || e.name === 'OperationError') {
            toast('❌ Senha incorreta ou backup corrompido', true);
        } else {
            toast('❌ ' + e.message, true);
        }
    }
}

function backupBaixar() {
    const dados = backupColetar();
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meufinancas-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('💾 Arquivo baixado!');
}

function backupImportar() {
    document.getElementById('backupFileInput').click();
}

function backupImportarArquivo(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!confirm('Importar substitui os dados atuais. Continuar?')) {
        event.target.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const dados = JSON.parse(e.target.result);
            backupRestaurarDados(dados);
            toast('📤 Importado! Recarregue a página.');
            setTimeout(() => location.reload(), 1500);
        } catch (err) {
            toast('❌ Arquivo inválido', true);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// === AUTO-SYNC SILENCIOSO ===
// Roda em background a cada 5 minutos se houver mudanças
let _backupTimer = null;
let _backupUltimoHash = null;
let _backupPausado = false;

async function backupAutoSync() {
    if (_backupPausado) return;
    const dados = backupColetar();
    const hash = JSON.stringify(dados).length; // simples: detecta mudanca de tamanho
    if (hash === _backupUltimoHash) return;
    _backupUltimoHash = hash;

    const senhaEl = document.getElementById('cfgBackupSenha');
    if (!senhaEl || !senhaEl.value) return; // sem senha = nao sincroniza
    const senha = senhaEl.value;
    const userId = getUserId();

    try {
        const cipher = await backupCriptografar(JSON.stringify(dados), senha);
        await fetch(`${GROQ_API.replace('/api/ia','')}/api/backup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, cipher, updatedAt: new Date().toISOString() })
        });
    } catch (e) { /* silencioso */ }
}

function backupIniciarAutoSync() {
    if (_backupTimer) clearInterval(_backupTimer);
    _backupTimer = setInterval(backupAutoSync, 5 * 60 * 1000); // 5 min
}

// Atualiza status quando abrir a aba Config
// Usa addEventListener em vez de duplicar a funcao (evita conflito de escopo)
document.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('[onclick*="abrirTab"]');
    if (!tabBtn) return;
    const m = tabBtn.getAttribute('onclick').match(/abrirTab\(['"]?([^'")\s]+)/);
    if (m && m[1] === 'config') {
        setTimeout(backupStatusAuto, 50);
    }
});

// Inicia auto-sync quando carregar
window.addEventListener('load', () => {
    setTimeout(backupIniciarAutoSync, 10000); // espera 10s pra nao pesar no load
});// === GESTAO DE USUARIOS (UI) ===
function criarNovoUsuario() {
    try {
        console.log('[Users] criarNovoUsuario chamado');
        if (!isAdmin()) { toast('❌ Apenas admin pode criar usuários', true); return; }
        const nome = document.getElementById('novoUserNome').value;
        const email = document.getElementById('novoUserEmail').value;
        const senha = document.getElementById('novoUserSenha').value;
        const perfil = document.getElementById('novoUserPerfil').value;
        console.log('[Users] dados:', { nome, email, perfil, senhaLen: senha.length });
        const r = criarUsuario(nome, email, senha, perfil);
        console.log('[Users] resultado:', r);
        if (!r.ok) { toast('❌ ' + r.erro, true); return; }
        // Limpa form
        document.getElementById('novoUserNome').value = '';
        document.getElementById('novoUserEmail').value = '';
        document.getElementById('novoUserSenha').value = '';
        document.getElementById('novoUserPerfil').value = 'user';
        renderListaUsuarios();
        toast(`✅ Usuário "${r.usuario.nome}" criado! Login: ${r.usuario.email}`);
    } catch (e) {
        console.error('[Users] ERRO em criarNovoUsuario:', e);
        toast('❌ Erro: ' + e.message, true);
    }
}

// ============================================
// 🤖 MÓDULO IA: GROQ (LLAMA 3.3 70B) - CHAT FINANCEIRO
// ============================================
// Histórico do chat por usuário
function getChatHistory() {
    return getLS(userKey(LS_CHAT_HISTORY, getUserId()), []);
}
function setChatHistory(arr) {
    setLS(userKey(LS_CHAT_HISTORY, getUserId()), arr);
}
function limparChat() {
    if (!confirm('Limpar todo o histórico do chat com a IA?')) return;
    setChatHistory([]);
    renderChatMessages();
    toast('🧹 Chat limpo');
}

// Monta um resumo do contexto financeiro do usuário pra enviar pra IA
function montarContextoFinanceiro() {
    const transacoes = getLS(userKey(LS_TX, getUserId()), []);
    const orcamentos = getLS(userKey(LS_ORC, getUserId()), []);
    const metas = getLS(userKey(LS_META, getUserId()), []);
    const cartoes = getCartoes();
    const compras = getComprasCartao();
    const compromissos = getCompromissos();
    const cats = getLS(userKey(LS_CAT, getUserId()), []);
    const hoje = new Date();
    const mesAtual = hoje.toISOString().slice(0, 7);
    const mesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toISOString().slice(0, 7);
    const ultimos30 = new Date(hoje.getTime() - 30 * 86400000).toISOString().slice(0, 10);

    const txMesAtual = transacoes.filter(t => (t.data || '').startsWith(mesAtual));
    const txMesPassado = transacoes.filter(t => (t.data || '').startsWith(mesPassado));
    const txRecentes = transacoes.filter(t => (t.data || '') >= ultimos30).slice(-200);

    const receitaMes = txMesAtual.filter(t => t.tipo === 'receita').reduce((s, t) => s + (t.valor || 0), 0);
    const despesaMes = txMesAtual.filter(t => t.tipo === 'despesa').reduce((s, t) => s + (t.valor || 0), 0);
    const receitaAnterior = txMesPassado.filter(t => t.tipo === 'receita').reduce((s, t) => s + (t.valor || 0), 0);
    const despesaAnterior = txMesPassado.filter(t => t.tipo === 'despesa').reduce((s, t) => s + (t.valor || 0), 0);

    // Top despesas por descrição
    const porDesc = {};
    txMesAtual.filter(t => t.tipo === 'despesa').forEach(t => {
        const k = (t.descricao || 'outros').toLowerCase().split(' ')[0];
        porDesc[k] = (porDesc[k] || 0) + (t.valor || 0);
    });
    const topDespesas = Object.entries(porDesc).sort((a, b) => b[1] - a[1]).slice(0, 5)
        .map(([k, v]) => `${k}: R$ ${v.toFixed(2)}`).join(', ');

    // Cartões
    const totalFaturaCartoes = compras.reduce((s, c) => s + c.valorParcela, 0);

    // Compromissos mensais
    const compMensalTotal = compromissos.filter(c => c.tipo === 'mensal').reduce((s, c) => s + (c.valorMensal || 0), 0);

    return {
        usuario: getUserAtual().nome,
        hoje: hoje.toLocaleDateString('pt-BR'),
        mesAtual: new Date(hoje.getFullYear(), hoje.getMonth(), 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
        receitaMes, despesaMes, saldoMes: receitaMes - despesaMes,
        receitaAnterior, despesaAnterior,
        totalTransacoes: transacoes.length,
        totalCategorias: cats.length,
        categorias: cats.map(c => c.nome).join(', '),
        topDespesas: topDespesas || 'nenhuma',
        qtdCartoes: cartoes.length,
        nomesCartoes: cartoes.map(c => c.nome).join(', ') || 'nenhum',
        totalComprasCartao: compras.length,
        faturaEstimada: totalFaturaCartoes,
        qtdCompromissos: compromissos.length,
        compMensalTotal,
        ultimasTransacoes: txRecentes.slice(-30).map(t =>
            `${t.data} ${t.tipo === 'despesa' ? '−' : '+'} R$ ${(t.valor || 0).toFixed(2)} ${t.descricao || ''}`
        ).join('\n'),
        ultimas5Despesas: txMesAtual.filter(t => t.tipo === 'despesa').slice(-5).map(t =>
            `− R$ ${(t.valor || 0).toFixed(2)} ${t.descricao} (${t.data})`
        ).join('\n')
    };
}

function montarSystemPrompt(ctx) {
    return `Você é o assistente financeiro pessoal do ${ctx.usuario} no app MeuFinanças.
Você fala português do Brasil, de forma direta, amigável e prática. Usa emojis com moderação.
Respostas curtas (3-6 linhas) a menos que o usuário peça detalhe. Usa números formatados em R$ X.XXX,XX.

=== SITUAÇÃO FINANCEIRA ATUAL (${ctx.hoje}) ===
📅 Mês atual: ${ctx.mesAtual}
💰 Receitas do mês: R$ ${ctx.receitaMes.toFixed(2)}
💸 Despesas do mês: R$ ${ctx.despesaMes.toFixed(2)}
📊 Saldo do mês: R$ ${ctx.saldoMes.toFixed(2)}

=== COMPARAÇÃO MÊS ANTERIOR ===
Receitas: R$ ${ctx.receitaAnterior.toFixed(2)} (Δ R$ ${(ctx.receitaMes - ctx.receitaAnterior).toFixed(2)})
Despesas: R$ ${ctx.despesaAnterior.toFixed(2)} (Δ R$ ${ctx.despesaMes - ctx.despesaAnterior >= 0 ? '+' : ''}${(ctx.despesaMes - ctx.despesaAnterior).toFixed(2)})

=== TOP DESPESAS DO MÊS ===
${ctx.topDespesas}

=== ÚLTIMAS 5 DESPESAS ===
${ctx.ultimas5Despesas || 'nenhuma'}

=== CARTÕES DE CRÉDITO ===
${ctx.qtdCartoes} cartão(ões): ${ctx.nomesCartoes}
Total de compras lançadas: ${ctx.totalComprasCartao}
Fatura estimada: R$ ${ctx.faturaEstimada.toFixed(2)}

=== COMPROMISSOS LONGO PRAZO ===
${ctx.qtdCompromissos} compromisso(s), total mensal R$ ${ctx.compMensalTotal.toFixed(2)}

=== CATEGORIAS DISPONÍVEIS ===
${ctx.categorias}

Você pode:
- Analisar gastos e dar dicas de economia
- Sugerir categorias pra transações novas
- Identificar padrões e tendências
- Ajudar a montar orçamento
- Responder dúvidas financeiras gerais

Quando o usuário pedir pra criar/alterar/excluir algo, sugira a ação e peça confirmação antes.`;
}

// === CHAMADA VIA PROXY SEGURO ===
async function chamarGroq(messages, modelo = GROQ_MODEL) {
    const resp = await fetch(GROQ_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: modelo,
            messages,
            temperature: 0.6,
            max_tokens: 800,
            stream: false
        })
    });
    if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`Groq ${resp.status}: ${err.slice(0, 200)}`);
    }
    const data = await resp.json();
    return data.choices[0].message.content;
}

// === ENVIAR MENSAGEM NO CHAT ===
async function enviarMensagemChat() {
    const input = document.getElementById('chatInput');
    let texto = (input.value || '').trim();
    if (!texto && !chatAnexoAtual) return;

    // Se tem anexo e usuário não digitou nada, cria prompt padrão
    if (!texto && chatAnexoAtual) texto = `Lê esse ${chatAnexoAtual.tipo} e me diz: o que é, quanto gastei/recebi, e se quiser já sugere as despesas pra eu lançar.`;

    input.value = '';
    input.disabled = true;

    // Monta a mensagem do usuário incluindo referência ao anexo (se houver)
    const anexou = chatAnexoAtual;
    let mensagemUsuario = texto;
    if (anexou) {
        // Inclui os primeiros 2000 chars do texto extraído dentro da própria mensagem
        // (a IA recebe como contexto adicional do usuário)
        const amostra = (anexou.texto || '').slice(0, 2000);
        mensagemUsuario = `[Anexo: ${anexou.nome} (${anexou.tipo}, ${(anexou.texto||'').length} chars extraídos)]\n\nTEXTO EXTRAÍDO DO ANEXO:\n"""\n${amostra}\n"""\n\n${texto}`;
    }

    const historico = getChatHistory();
    historico.push({ role: 'user', content: mensagemUsuario, ts: Date.now() });
    renderChatMessages(historico);

    // Detecta se usuário pediu pra lançar as despesas
    const querLancar = /lan[çc]a|cadastra|adiciona|insere|importa|cria (a )?lan[çc]amento/i.test(texto);

    // Mensagem "digitando..."
    const typingId = 'typing-' + Date.now();
    addChatMessage({ role: 'assistant', content: '⏳ Pensando...', ts: Date.now(), id: typingId });
    document.getElementById(typingId)?.scrollIntoView({ behavior: 'smooth', block: 'end' });

    try {
        const ctx = montarContextoFinanceiro();
        let systemPrompt = montarSystemPrompt(ctx);
        // Adiciona instrução de "lançar despesas" no system prompt
        if (querLancar && anexou) {
            systemPrompt += `\n\nINSTRUÇÃO EXTRA: o usuário pediu pra LANÇAR as despesas do anexo. Você DEVE:
1. Listar as transações que encontrou (data, descrição, valor, tipo)
2. Sugerir as categorias
3. Chamar a função lançarTransacoesDoAnexo(json) com o array de transações
   - Use o formato exato: window.lançarTransacoesDoAnexo([{data:"YYYY-MM-DD",descricao:"...",valor:123.45,tipo:"despesa",categoriaId:"id"}])
   - NÃO confirme o lançamento sem a chamada da função
4. Responda em texto curto confirmando o que foi lançado`;
        }
        const ultimas = historico.slice(-20);
        const messages = [
            { role: 'system', content: systemPrompt },
            ...ultimas.map(m => ({ role: m.role, content: m.content }))
        ];
        const resposta = await chamarGroq(messages);
        const elTyping = document.getElementById(typingId);
        if (elTyping) elTyping.remove();
        historico.push({ role: 'assistant', content: resposta, ts: Date.now() });
        setChatHistory(historico);
        renderChatMessages(historico);

        // Tenta extrair JSON e lançar (se pediu)
        if (querLancar && anexou) {
            const jsonMatch = resposta.match(/\[[\s\S]*?\{[\s\S]*?\}\s*\]/);
            if (jsonMatch) {
                try {
                    const txs = JSON.parse(jsonMatch[0]);
                    if (Array.isArray(txs) && txs.length > 0) {
                        // Mostra preview antes de confirmar
                        if (confirm(`🤖 A IA encontrou ${txs.length} transações no anexo. Lançar agora?`)) {
                            const result = await lancarTransacoesDoAnexo(txs);
                            addChatMessage({ role: 'assistant', content: `✅ ${result}`, ts: Date.now() });
                        } else {
                            addChatMessage({ role: 'assistant', content: `👍 Ok, não lancei. Quer que eu faça o quê?`, ts: Date.now() });
                        }
                    }
                } catch (e) { console.warn('[lançar] JSON inválido:', e); }
            }
        }
        // Limpa anexo após processar
        if (anexou) removerAnexo();
    } catch (e) {
        const elTyping = document.getElementById(typingId);
        if (elTyping) elTyping.remove();
        addChatMessage({ role: 'assistant', content: `❌ Erro: ${e.message}`, ts: Date.now() });
        console.error('[Chat IA]', e);
    } finally {
        input.disabled = false;
        input.focus();
    }
}

// Lança um array de transações (vindas do chat) na base do usuário
async function lancarTransacoesDoAnexo(transacoes) {
    const tx = getTransacoes();
    const cats = getLS(userKey(LS_CAT, getUserId()), []);
    let adicionadas = 0, puladas = 0;
    transacoes.forEach(t => {
        if (!t.data || !t.valor || !t.descricao) return;
        // resolve categoriaId
        let catId = t.categoriaId;
        if (catId && !cats.find(c => c.id === catId)) {
            const peloNome = cats.find(c => c.nome.toLowerCase() === String(catId).toLowerCase());
            catId = peloNome ? peloNome.id : null;
        }
        const existe = tx.find(x => x.data === t.data && x.valor === t.valor && x.descricao === t.descricao);
        if (existe) { puladas++; return; }
        tx.unshift({
            id: uid(),
            tipo: t.tipo || 'despesa',
            descricao: String(t.descricao).slice(0, 80).trim(),
            valor: Math.abs(parseFloat(t.valor) || 0),
            data: t.data,
            categoriaId: catId,
            obs: 'Lançado pela IA (chat)',
            criadoEm: new Date().toISOString()
        });
        adicionadas++;
    });
    setTransacoes(tx);
    carregarTudo();
    return `Lançadas ${adicionadas} transações${puladas > 0 ? ` (${puladas} duplicatas ignoradas)` : ''}`;
}
// expor pra window pra IA poder chamar hipoteticamente
window.lançarTransacoesDoAnexo = lancarTransacoesDoAnexo;

// === CATEGORIA AUTOMÁTICA COM IA ===
// Substitui/auxilia o categorizarTexto() — IA entende contexto melhor
async function categorizarComIA(texto, tipo = 'despesa') {
    const cats = getLS(userKey(LS_CAT, getUserId()), []);
    if (cats.length === 0) return 'outros';
    const prompt = `Classifique a transação "${texto}" (${tipo}) em UMA das categorias abaixo. Responda APENAS com o NOME exato da categoria, sem aspas, sem explicação.

Categorias disponíveis: ${cats.map(c => c.nome).join(', ')}`;
    try {
        const r = await chamarGroq([{ role: 'user', content: prompt }], GROQ_MODEL_RAPIDO);
        const achou = cats.find(c => c.nome.toLowerCase() === r.trim().toLowerCase());
        return achou ? achou.id : 'outros';
    } catch (e) {
        console.warn('[IA Cat] fallback:', e.message);
        return categorizarTexto(texto, tipo); // fallback do regex
    }
}

// === RENDERIZAÇÃO DO CHAT ===
function renderChatMessages(historico) {
    historico = historico || getChatHistory();
    const box = document.getElementById('chatMessages');
    if (!box) return;
    if (historico.length === 0) {
        const ctx = montarContextoFinanceiro();
        box.innerHTML = `
        <div style="text-align:center; padding:0.6rem; color:#94a3b8;">
            <div style="font-size:1.8rem;">🤖</div>
            <p style="margin:0.4rem 0; font-size:0.9rem;">Oi, ${ctx.usuario.split(' ')[0]}! Sou seu assistente financeiro.</p>
            <p style="font-size:0.78rem;">Posso analisar gastos, sugerir economia, categorizar transações e <strong style="color:#a78bfa;">ler PDFs/fotos de extrato</strong> 📎</p>
            <div style="display:flex; flex-wrap:wrap; gap:0.35rem; justify-content:center; margin-top:0.7rem;">
                <button onclick="chatSugestao('Analisa meus gastos deste mês')" style="padding:0.35rem 0.7rem; background:#1e293b; color:#fff; border:1px solid #334155; border-radius:12px; cursor:pointer; font-size:0.75rem;">📊 Analisar gastos</button>
                <button onclick="chatSugestao('Onde posso economizar?')" style="padding:0.35rem 0.7rem; background:#1e293b; color:#fff; border:1px solid #334155; border-radius:12px; cursor:pointer; font-size:0.75rem;">💡 Dicas de economia</button>
                <button onclick="chatSugestao('Quanto gastei com alimentação?')" style="padding:0.35rem 0.7rem; background:#1e293b; color:#fff; border:1px solid #334155; border-radius:12px; cursor:pointer; font-size:0.75rem;">🍔 Alimentação</button>
                <button onclick="chatSugestao('Compare com o mês passado')" style="padding:0.35rem 0.7rem; background:#1e293b; color:#fff; border:1px solid #334155; border-radius:12px; cursor:pointer; font-size:0.75rem;">📈 Comparar meses</button>
                <button onclick="document.getElementById('chatAnexo').click(); document.getElementById('chatInput').placeholder='Anexei o extrato, pode lançar as despesas?'" style="padding:0.35rem 0.7rem; background:linear-gradient(135deg,#7c3aed,#3b82f6); color:#fff; border:none; border-radius:12px; cursor:pointer; font-size:0.75rem;">📎 Anexar extrato</button>
            </div>
        </div>`;
        return;
    }
    box.innerHTML = historico.map(m => {
        const isUser = m.role === 'user';
        return `
        <div id="${m.id || ''}" style="display:flex; gap:0.4rem; margin-bottom:0.4rem; ${isUser ? 'flex-direction:row-reverse;' : ''}">
            <div style="width:26px; height:26px; border-radius:50%; background:${isUser ? '#3b82f6' : '#7c3aed'}; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; flex-shrink:0; font-size:0.7rem;">
                ${isUser ? (getUserAtual().nome || 'U').charAt(0).toUpperCase() : '🤖'}
            </div>
            <div style="max-width:80%; background:${isUser ? '#3b82f6' : '#1e293b'}; color:#fff; padding:0.4rem 0.65rem; border-radius:10px; ${isUser ? 'border-top-right-radius:3px;' : 'border-top-left-radius:3px;'} word-wrap:break-word; white-space:pre-wrap; line-height:1.3; font-size:0.85rem;">
                ${escapeHtml(m.content)}
                <div style="font-size:0.6rem; opacity:0.55; margin-top:0.15rem;">${new Date(m.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
        </div>`;
    }).join('');
    box.scrollTop = box.scrollHeight;
}

function addChatMessage(m) {
    const box = document.getElementById('chatMessages');
    if (!box) return;
    const div = document.createElement('div');
    div.id = m.id || '';
    div.style.cssText = `display:flex; gap:0.4rem; margin-bottom:0.4rem; ${m.role === 'user' ? 'flex-direction:row-reverse;' : ''}`;
    const isUser = m.role === 'user';
    div.innerHTML = `
        <div style="width:26px; height:26px; border-radius:50%; background:${isUser ? '#3b82f6' : '#7c3aed'}; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; flex-shrink:0; font-size:0.7rem;">
            ${isUser ? (getUserAtual().nome || 'U').charAt(0).toUpperCase() : '🤖'}
        </div>
        <div style="max-width:80%; background:${isUser ? '#3b82f6' : '#1e293b'}; color:#fff; padding:0.4rem 0.65rem; border-radius:10px; ${isUser ? 'border-top-right-radius:3px;' : 'border-top-left-radius:3px;'} white-space:pre-wrap; line-height:1.3; font-size:0.85rem;">
            ${escapeHtml(m.content)}
        </div>`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

function chatSugestao(texto) {
    document.getElementById('chatInput').value = texto;
    enviarMensagemChat();
}

// === ANEXOS NO CHAT (PDF/foto de extrato) ===
let chatAnexoAtual = null; // { tipo: 'pdf'|'image', base64, nome }

async function anexarAoChat(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { alert('Arquivo muito grande (máx 20MB)'); return; }
    const ehPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const ehImg = file.type.startsWith('image/');
    if (!ehPdf && !ehImg) { alert('Só aceito PDF ou foto por enquanto.'); return; }

    const preview = document.getElementById('chatAnexoPreview');
    const nome = document.getElementById('chatAnexoNome');
    nome.textContent = `⏳ Lendo ${file.name}...`;
    preview.style.display = 'flex';

    try {
        let texto = '';
        if (ehPdf) {
            texto = await extrairTextoPDF(file);
        } else {
            texto = await extrairTextoFoto(file);
        }
        if (!texto || texto.length < 10) {
            nome.textContent = `❌ ${file.name} (não consegui ler)`;
            return;
        }
        chatAnexoAtual = { tipo: ehPdf ? 'pdf' : 'foto', nome: file.name, texto };
        nome.textContent = `📎 ${file.name} (${texto.length} chars lidos)`;
        // Sugere mensagem pro usuário
        if (!document.getElementById('chatInput').value) {
            document.getElementById('chatInput').placeholder = `Anexo: ${file.name}. Pergunte o que quiser ou peça: "lançar despesas"...`;
        }
    } catch (e) {
        console.error('[anexo chat]', e);
        nome.textContent = `❌ Erro ao ler ${file.name}: ${e.message.slice(0, 60)}`;
    }
    event.target.value = ''; // permite re-anexar mesmo arquivo
}

function removerAnexo() {
    chatAnexoAtual = null;
    document.getElementById('chatAnexoPreview').style.display = 'none';
    document.getElementById('chatInput').placeholder = 'Pergunte algo sobre suas finanças...';
}

async function extrairTextoPDF(file) {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let textoCompleto = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const tc = await page.getTextContent();
        const linhas = tc.items.map(it => it.str);
        textoCompleto += linhas.join(' ') + '\n';
    }
    return textoCompleto;
}

async function extrairTextoFoto(file) {
    if (typeof Tesseract === 'undefined') throw new Error('Tesseract não carregado');
    const { data: { text } } = await Tesseract.recognize(file, 'por');
    return text || '';
}

function abrirChat() {
    document.getElementById('chatModal').style.display = 'flex';
    renderChatMessages();
    setTimeout(() => document.getElementById('chatInput')?.focus(), 100);
}
function fecharChat() {
    document.getElementById('chatModal').style.display = 'none';
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ============================================
// 💬 MÓDULO: CARTÕES DE CRÉDITO & COMPROMISSOS
// ============================================
function getCartoes() { return getLS(userKey(LS_CARTOES, getUserId()), []); }
function setCartoes(arr) { setLS(userKey(LS_CARTOES, getUserId()), arr); }
function getComprasCartao() { return getLS(userKey(LS_COMPRAS_CARTAO, getUserId()), []); }
function setComprasCartao(arr) { setLS(userKey(LS_COMPRAS_CARTAO, getUserId()), arr); }
function getCompromissos() { return getLS(userKey(LS_COMPROMISSOS, getUserId()), []); }
function setCompromissos(arr) { setLS(userKey(LS_COMPROMISSOS, getUserId()), arr); }

// === MODAL CARTAO ===
function abrirModalCartao(id = null) {
    document.getElementById('cartaoId').value = id || '';
    document.getElementById('modalCartaoTitulo').textContent = id ? '✏️ Editar Cartão' : '💳 Novo Cartão';
    if (id) {
        const c = getCartoes().find(x => x.id === id);
        if (c) {
            document.getElementById('cartaoNome').value = c.nome || '';
            document.getElementById('cartaoFinal').value = c.final || '';
            document.getElementById('cartaoBandeira').value = c.bandeira || 'visa';
            document.getElementById('cartaoLimite').value = c.limite || '';
            document.getElementById('cartaoFecha').value = c.fechamento || 15;
            document.getElementById('cartaoVence').value = c.vencimento || 25;
            document.getElementById('cartaoCor').value = c.cor || '#7c3aed';
        }
    } else {
        document.getElementById('formCartao').reset();
        document.getElementById('cartaoCor').value = '#7c3aed';
    }
    openModal('modalCartao');
}

function salvarCartao(e) {
    e.preventDefault();
    const id = document.getElementById('cartaoId').value;
    const cartao = {
        id: id || 'cart_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        nome: document.getElementById('cartaoNome').value.trim(),
        final: document.getElementById('cartaoFinal').value,
        bandeira: document.getElementById('cartaoBandeira').value,
        limite: parseFloat(document.getElementById('cartaoLimite').value) || 0,
        fechamento: parseInt(document.getElementById('cartaoFecha').value) || 15,
        vencimento: parseInt(document.getElementById('cartaoVence').value) || 25,
        cor: document.getElementById('cartaoCor').value || '#7c3aed',
        criadoEm: new Date().toISOString()
    };
    if (!cartao.nome) { toast('❌ Dê um nome ao cartão', true); return; }
    const lista = getCartoes();
    if (id) {
        const idx = lista.findIndex(x => x.id === id);
        if (idx >= 0) lista[idx] = { ...lista[idx], ...cartao };
    } else {
        lista.push(cartao);
    }
    setCartoes(lista);
    closeModal('modalCartao');
    renderCartoes();
    toast('💳 Cartão salvo!');
}

function removerCartao(id) {
    if (!confirm('Remover este cartão? As compras lançadas nele continuam no histórico.')) return;
    const lista = getCartoes().filter(c => c.id !== id);
    setCartoes(lista);
    renderCartoes();
    toast('🗑️ Cartão removido');
}

// === RENDER CARTOES (cards visuais) ===
function renderCartoes() {
    const container = document.getElementById('listaCartoes');
    if (!container) return;
    const cartoes = getCartoes();
    const compras = getComprasCartao();
    if (cartoes.length === 0) {
        container.innerHTML = '<p style="color:#94a3b8; text-align:center; padding:2rem;">Nenhum cartão cadastrado ainda. Clique em <strong>+ Novo Cartão</strong> pra começar.</p>';
        return;
    }
    container.innerHTML = cartoes.map(c => {
        const minhasCompras = compras.filter(co => co.cartaoId === c.id);
        const totalGasto = minhasCompras.reduce((s, co) => s + (co.valorTotal || co.valor || 0), 0);
        const disponivel = (c.limite || 0) - totalGasto;
        const bandeiraLabel = {visa:'Visa',master:'Mastercard',elo:'Elo',amex:'Amex',hipercard:'Hipercard',outro:'Outro'}[c.bandeira] || c.bandeira;
        return `
        <div style="background:linear-gradient(135deg, ${c.cor || '#7c3aed'}, ${c.cor || '#7c3aed'}dd); border-radius:14px; padding:1.2rem; color:white; box-shadow:0 4px 12px rgba(0,0,0,0.2);">
            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:1rem;">
                <div>
                    <div style="font-size:0.85rem; opacity:0.85;">${bandeiraLabel}</div>
                    <div style="font-size:1.2rem; font-weight:700; margin-top:0.2rem;">${c.nome}</div>
                    <div style="font-size:0.85rem; opacity:0.85; margin-top:0.3rem;">•••• ${c.final || '0000'}</div>
                </div>
                <div style="display:flex; gap:0.3rem;">
                    <button onclick="abrirModalCartao('${c.id}')" style="background:rgba(255,255,255,0.2); border:none; color:white; padding:0.3rem 0.5rem; border-radius:6px; cursor:pointer;" title="Editar">✏️</button>
                    <button onclick="removerCartao('${c.id}')" style="background:rgba(255,255,255,0.2); border:none; color:white; padding:0.3rem 0.5rem; border-radius:6px; cursor:pointer;" title="Remover">🗑️</button>
                </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; font-size:0.8rem; margin-bottom:0.8rem;">
                <div>
                    <div style="opacity:0.7;">Limite</div>
                    <div style="font-weight:600;">R$ ${(c.limite || 0).toFixed(2)}</div>
                </div>
                <div>
                    <div style="opacity:0.7;">Fatura atual</div>
                    <div style="font-weight:600;">R$ ${totalGasto.toFixed(2)}</div>
                </div>
                <div>
                    <div style="opacity:0.7;">Disponível</div>
                    <div style="font-weight:600;">R$ ${disponivel.toFixed(2)}</div>
                </div>
                <div>
                    <div style="opacity:0.7;">Vence dia</div>
                    <div style="font-weight:600;">${c.vencimento || '?'}</div>
                </div>
            </div>
            <button onclick="abrirModalCompraCartao('${c.id}')" style="width:100%; padding:0.5rem; background:rgba(255,255,255,0.2); color:white; border:none; border-radius:8px; font-weight:600; cursor:pointer;">+ Lançar Compra</button>
            ${minhasCompras.length > 0 ? `
            <details style="margin-top:0.8rem;">
                <summary style="cursor:pointer; font-size:0.85rem; opacity:0.9;">📋 ${minhasCompras.length} compra(s) lançada(s)</summary>
                <div style="margin-top:0.5rem; max-height:200px; overflow-y:auto;">
                    ${minhasCompras.slice(-10).reverse().map(co => `
                        <div style="background:rgba(0,0,0,0.15); padding:0.4rem; border-radius:6px; margin-bottom:0.3rem; font-size:0.8rem; display:flex; justify-content:space-between;">
                            <span>${co.descricao} ${co.parcelas > 1 ? `(${co.parcelaAtual || 1}/${co.parcelas})` : ''}</span>
                            <span>R$ ${(co.valorParcela || co.valor || 0).toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
            </details>
            ` : ''}
        </div>
        `;
    }).join('');
}

// === COMPRA NO CARTAO ===
function abrirModalCompraCartao(cartaoIdPre = null) {
    const cartoes = getCartoes();
    if (cartoes.length === 0) {
        toast('⚠️ Cadastre um cartão antes de lançar compras', true);
        abrirModalCartao();
        return;
    }
    const sel = document.getElementById('compraCartaoId');
    sel.innerHTML = cartoes.map(c => `<option value="${c.id}" ${c.id === cartaoIdPre ? 'selected' : ''}>${c.nome} (•••• ${c.final || '0000'})</option>`).join('');
    const catSel = document.getElementById('compraCategoria');
    const cats = getLS(userKey(LS_CAT, getUserId()), []);
    catSel.innerHTML = cats.map(c => `<option value="${c.id}">${c.nome}</option>`).join('') || '<option value="">Sem categorias</option>';
    document.getElementById('compraData').value = new Date().toISOString().split('T')[0];
    document.getElementById('formCompraCartao').reset();
    document.getElementById('compraData').value = new Date().toISOString().split('T')[0];
    openModal('modalCompraCartao');
}

function salvarCompraCartao(e) {
    e.preventDefault();
    const cartaoId = document.getElementById('compraCartaoId').value;
    const descricao = document.getElementById('compraDescricao').value.trim();
    const valor = parseFloat(document.getElementById('compraValor').value) || 0;
    const data = document.getElementById('compraData').value;
    const categoriaId = document.getElementById('compraCategoria').value;
    const parcelas = parseInt(document.getElementById('compraParcelas').value) || 1;
    if (!descricao || !valor || !data || !cartaoId) {
        toast('❌ Preencha todos os campos', true);
        return;
    }
    const valorParcela = valor / parcelas;
    const compra = {
        id: 'comp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        cartaoId,
        descricao,
        valor,
        valorTotal: valor,
        valorParcela,
        data,
        categoriaId,
        parcelas,
        parcelaAtual: 1,
        criadoEm: new Date().toISOString()
    };
    const lista = getComprasCartao();
    lista.push(compra);
    setComprasCartao(lista);
    closeModal('modalCompraCartao');
    renderCartoes();
    toast('🛒 Compra lançada no cartão!');
}

function removerCompraCartao(id) {
    if (!confirm('Remover esta compra?')) return;
    const lista = getComprasCartao().filter(c => c.id !== id);
    setComprasCartao(lista);
    renderCartoes();
    toast('🗑️ Compra removida');
}

// === COMPROMISSOS (DESPESAS FUTURAS) ===
function renderCompromissos() {
    const container = document.getElementById('listaCompromissos');
    if (!container) return;
    const filtro = document.getElementById('filtroCompromissoStatus')?.value || 'todos';
    let lista = getCompromissos();
    if (filtro === 'ativo') lista = lista.filter(c => !c.quitado);
    if (filtro === 'quitado') lista = lista.filter(c => c.quitado);
    if (lista.length === 0) {
        container.innerHTML = '<p style="color:#94a3b8; text-align:center; padding:2rem;">Nenhuma despesa futura cadastrada.</p>';
        return;
    }
    const cats = getLS(userKey(LS_CAT, getUserId()), []);
    const hoje = new Date();
    container.innerHTML = lista.map(c => {
        const cat = cats.find(x => x.id === c.categoriaId);
        const totalPago = (c.parcelasPagas || 0) * c.valor;
        const totalRestante = (c.valor * c.parcelas) - totalPago;
        const progresso = Math.min(100, ((c.parcelasPagas || 0) / c.parcelas) * 100);
        const proxVenc = c.proximoVencimento ? new Date(c.proximoVencimento) : null;
        const diasAteVenc = proxVenc ? Math.ceil((proxVenc - hoje) / (1000 * 60 * 60 * 24)) : null;
        const bg = c.quitado ? 'background:rgba(16,185,129,0.1); border-color:#10b981;' : '';
        return `
        <div style="border:1px solid var(--border); border-radius:10px; padding:1rem; margin-bottom:0.7rem; ${bg}">
            <div style="display:flex; justify-content:space-between; align-items:start; gap:0.8rem;">
                <div style="flex:1; min-width:0;">
                    <div style="font-weight:700; font-size:1.05rem;">${c.descricao} ${c.quitado ? '✅' : ''}</div>
                    <div style="font-size:0.85rem; color:#94a3b8; margin-top:0.3rem;">
                        ${cat ? '🏷️ ' + cat.nome : ''} · ${c.tipo === 'longo_prazo' ? '📆 Longo prazo' : '🔁 Parcelado'}
                    </div>
                    <div style="margin-top:0.6rem; display:grid; grid-template-columns:repeat(4, 1fr); gap:0.5rem; font-size:0.85rem;">
                        <div>
                            <div style="color:#94a3b8; font-size:0.75rem;">Parcela</div>
                            <div style="font-weight:600;">R$ ${(c.valor || 0).toFixed(2)}</div>
                        </div>
                        <div>
                            <div style="color:#94a3b8; font-size:0.75rem;">Pagas</div>
                            <div style="font-weight:600;">${c.parcelasPagas || 0}/${c.parcelas}</div>
                        </div>
                        <div>
                            <div style="color:#94a3b8; font-size:0.75rem;">Restante</div>
                            <div style="font-weight:600;">R$ ${totalRestante.toFixed(2)}</div>
                        </div>
                        <div>
                            <div style="color:#94a3b8; font-size:0.75rem;">Próx. venc.</div>
                            <div style="font-weight:600; color:${diasAteVenc !== null && diasAteVenc <= 7 ? '#ef4444' : 'inherit'};">
                                ${proxVenc ? proxVenc.toLocaleDateString('pt-BR') : '—'}
                                ${diasAteVenc !== null && diasAteVenc > 0 ? `<span style="font-size:0.75rem;"> (${diasAteVenc}d)</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div style="margin-top:0.6rem; background:var(--bg-2); border-radius:6px; height:8px; overflow:hidden;">
                        <div style="background:linear-gradient(90deg, #10b981, #059669); height:100%; width:${progresso}%; transition:width 0.3s;"></div>
                    </div>
                    ${c.obs ? `<div style="margin-top:0.5rem; font-size:0.8rem; color:#94a3b8;">📝 ${c.obs}</div>` : ''}
                </div>
                <div style="display:flex; flex-direction:column; gap:0.3rem;">
                    <button onclick="marcarParcelaPaga('${c.id}')" style="background:#10b981; color:white; border:none; padding:0.4rem 0.6rem; border-radius:6px; cursor:pointer; font-size:0.8rem; font-weight:600;" title="Marcar próxima parcela paga">+1 Parcela</button>
                    <button onclick="abrirModalCompromisso('${c.id}')" style="background:#475569; color:white; border:none; padding:0.4rem 0.6rem; border-radius:6px; cursor:pointer; font-size:0.8rem;" title="Editar">✏️</button>
                    <button onclick="removerCompromisso('${c.id}')" style="background:#ef4444; color:white; border:none; padding:0.4rem 0.6rem; border-radius:6px; cursor:pointer; font-size:0.8rem;" title="Remover">🗑️</button>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

function abrirModalCompromisso(id = null) {
    document.getElementById('compromissoId').value = id || '';
    document.getElementById('modalCompromissoTitulo').textContent = id ? '✏️ Editar Despesa' : '📅 Nova Despesa Futura';
    const catSel = document.getElementById('compromissoCategoria');
    const cats = getLS(userKey(LS_CAT, getUserId()), []);
    catSel.innerHTML = cats.map(c => `<option value="${c.id}">${c.nome}</option>`).join('') || '<option value="">Sem categorias</option>';
    if (id) {
        const c = getCompromissos().find(x => x.id === id);
        if (c) {
            document.getElementById('compromissoDescricao').value = c.descricao || '';
            document.getElementById('compromissoValor').value = c.valor || '';
            document.getElementById('compromissoParcelas').value = c.parcelas || 12;
            document.getElementById('compromissoInicio').value = c.inicio || '';
            document.getElementById('compromissoDia').value = c.dia || 10;
            document.getElementById('compromissoCategoria').value = c.categoriaId || '';
            document.getElementById('compromissoTipo').value = c.tipo || 'parcelado';
            document.getElementById('compromissoObs').value = c.obs || '';
        }
    } else {
        document.getElementById('formCompromisso').reset();
        document.getElementById('compromissoParcelas').value = 12;
        document.getElementById('compromissoDia').value = 10;
        document.getElementById('compromissoInicio').value = new Date().toISOString().split('T')[0];
    }
    openModal('modalCompromisso');
}

function calcularProximoVencimento(dia, inicio) {
    const hoje = new Date();
    const inicioDate = inicio ? new Date(inicio + 'T12:00:00') : hoje;
    let prox = new Date(hoje.getFullYear(), hoje.getMonth(), dia);
    if (prox < hoje) prox.setMonth(prox.getMonth() + 1);
    // Se tem data de inicio, ajustar
    if (inicio && inicioDate > prox) {
        prox = new Date(inicioDate.getFullYear(), inicioDate.getMonth(), dia);
    }
    return prox.toISOString();
}

function salvarCompromisso(e) {
    e.preventDefault();
    const id = document.getElementById('compromissoId').value;
    const comp = {
        id: id || 'comp_p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        descricao: document.getElementById('compromissoDescricao').value.trim(),
        valor: parseFloat(document.getElementById('compromissoValor').value) || 0,
        parcelas: parseInt(document.getElementById('compromissoParcelas').value) || 1,
        inicio: document.getElementById('compromissoInicio').value,
        dia: parseInt(document.getElementById('compromissoDia').value) || 10,
        categoriaId: document.getElementById('compromissoCategoria').value,
        tipo: document.getElementById('compromissoTipo').value,
        obs: document.getElementById('compromissoObs').value.trim(),
        parcelasPagas: 0,
        quitado: false,
        criadoEm: new Date().toISOString()
    };
    if (!comp.descricao || !comp.valor) { toast('❌ Preencha descrição e valor', true); return; }
    comp.proximoVencimento = calcularProximoVencimento(comp.dia, comp.inicio);
    const lista = getCompromissos();
    if (id) {
        const idx = lista.findIndex(x => x.id === id);
        if (idx >= 0) lista[idx] = { ...lista[idx], ...comp };
    } else {
        lista.push(comp);
    }
    setCompromissos(lista);
    closeModal('modalCompromisso');
    renderCompromissos();
    toast('📅 Despesa futura salva!');
}

function marcarParcelaPaga(id) {
    const lista = getCompromissos();
    const c = lista.find(x => x.id === id);
    if (!c) return;
    c.parcelasPagas = (c.parcelasPagas || 0) + 1;
    if (c.parcelasPagas >= c.parcelas) {
        c.quitado = true;
        toast(`🎉 "${c.descricao}" quitado!`);
    } else {
        toast(`✅ Parcela ${c.parcelasPagas}/${c.parcelas} paga`);
    }
    // Avanca para o proximo vencimento
    const hoje = new Date();
    let prox = new Date(hoje.getFullYear(), hoje.getMonth() + 1, c.dia);
    c.proximoVencimento = prox.toISOString();
    setCompromissos(lista);
    renderCompromissos();
}

function removerCompromisso(id) {
    if (!confirm('Remover esta despesa futura?')) return;
    const lista = getCompromissos().filter(c => c.id !== id);
    setCompromissos(lista);
    renderCompromissos();
    toast('🗑️ Despesa removida');
}

function renderListaUsuarios() {
    if (!isAdmin()) return;
    const users = getUsers();
    const container = document.getElementById('listaUsuarios');
    if (!container) return;
    container.innerHTML = users.map(u => {
        const isPrincipal = u.id === USUARIO_TESTE.id;
        const isAdminUser = u.perfil === 'admin';
        const bloqueioAte = isUsuarioBloqueado(u);
        const estaBloqueado = !!bloqueioAte;
        const bloqueioFmt = estaBloqueado ? bloqueioAte.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
        const borderColor = estaBloqueado ? '#ef4444' : (isPrincipal ? '#f59e0b' : 'var(--border)');
        const background = estaBloqueado ? 'background:rgba(239,68,68,0.08);' : '';
        return `
        <div style="border:1px solid ${borderColor}; border-radius:8px; padding:0.7rem; margin-bottom:0.5rem; ${background}">
            <div style="display:flex; justify-content:space-between; align-items:start; gap:0.5rem;">
                <div style="flex:1; min-width:0;">
                    <div style="font-weight:600;">${u.nome} ${isPrincipal ? '⭐' : ''}</div>
                    <div style="font-size:0.8rem; color:#94a3b8;">${u.email}</div>
                    <div style="font-size:0.75rem; margin-top:0.3rem;">
                        <span style="background:${isAdminUser ? '#8b5cf6' : '#475569'}; color:white; padding:2px 6px; border-radius:4px; font-size:0.7rem;">${isAdminUser ? '👑 Admin' : '👤 User'}</span>
                        ${isPrincipal ? '<span style="background:#f59e0b; color:white; padding:2px 6px; border-radius:4px; font-size:0.7rem; margin-left:4px;">Principal</span>' : ''}
                        ${estaBloqueado ? `<span style="background:#ef4444; color:white; padding:2px 6px; border-radius:4px; font-size:0.7rem;" title="${u.motivoBloqueio || ''}">🔒 Bloqueado até ${bloqueioFmt}</span>` : ''}
                        ${isPrincipal ? '<span style="background:#f59e0b; color:white; padding:2px 6px; border-radius:4px; font-size:0.7rem; margin-left:4px;">Principal</span>' : ''}
                    </div>
                </div>
                <div style="display:flex; flex-direction:column; gap:3px;">
                    ${!isPrincipal ? `<button onclick="resetarSenhaUI('${u.id}')" style="padding:3px 8px; background:var(--bg-card); color:var(--text); border:1px solid var(--border); border-radius:4px; cursor:pointer; font-size:0.75rem;">🔑 Senha</button>` : ''}
                    ${!isPrincipal ? `<button onclick="togglePerfilUI('${u.id}')" style="padding:3px 8px; background:var(--bg-card); color:var(--text); border:1px solid var(--border); border-radius:4px; cursor:pointer; font-size:0.75rem;">${isAdminUser ? '⬇️ Rebaixar' : '⬆️ Promover'}</button>` : ''}
                    ${!isPrincipal ? (estaBloqueado
                        ? `<button onclick="desbloquearUsuarioUI('${u.id}')" style="padding:3px 8px; background:#22c55e; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.75rem;">🔓 Desbloquear</button>`
                        : `<button onclick="bloquearUsuarioUI('${u.id}')" style="padding:3px 8px; background:#ef4444; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.75rem;">🔒 Bloquear</button>`) : ''}
                    ${!isPrincipal ? `<button onclick="removerUsuarioUI('${u.id}')" style="padding:3px 8px; background:#7f1d1d; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.75rem;">🗑️ Remover</button>` : ''}
                </div>
            </div>
        </div>`;
    }).join('') || '<p style="color:#94a3b8;">Nenhum usuário cadastrado.</p>';
}

function bloquearUsuarioUI(id) {
    const u = getUsers().find(x => x.id === id);
    if (!u) return;
    const duracao = prompt(`Bloquear "${u.nome}" por quantas horas?\n\n(ex: 1, 24, 168 para 1 semana, 720 para 30 dias)`, '24');
    if (duracao === null) return;
    const horas = parseFloat(duracao);
    if (isNaN(horas) || horas <= 0) { toast('❌ Duração inválida', true); return; }
    const motivo = prompt('Motivo do bloqueio (opcional, será mostrado na tela de login):', 'Suspensão temporária');
    const r = bloquearUsuario(id, horas, motivo);
    if (!r.ok) { toast('❌ ' + r.erro, true); return; }
    renderListaUsuarios();
    const ate = r.bloqueadoAte.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    toast(`🔒 "${u.nome}" bloqueado até ${ate}`);
}

function desbloquearUsuarioUI(id) {
    const u = getUsers().find(x => x.id === id);
    if (!u) return;
    if (!confirm(`Desbloquear "${u.nome}" agora?`)) return;
    const r = desbloquearUsuario(id);
    if (!r.ok) { toast('❌ ' + r.erro, true); return; }
    renderListaUsuarios();
    toast(`🔓 "${u.nome}" desbloqueado`);
}

function removerUsuarioUI(id) {
    const users = getUsers();
    const u = users.find(x => x.id === id);
    if (!u) return;
    if (!confirm(`Remover o usuário "${u.nome}" (${u.email})? Os dados financeiros dele também serão apagados.`)) return;
    const r = removerUsuario(id);
    if (!r.ok) { toast('❌ ' + r.erro, true); return; }
    // Apaga dados do usuario removido
    DADOS_KEYS.forEach(k => localStorage.removeItem(_keyUsuario.call(null, k)));
    renderListaUsuarios();
    toast('🗑️ Usuário removido');
}

function togglePerfilUI(id) {
    const users = getUsers();
    const u = users.find(x => x.id === id);
    if (!u) return;
    const novoPerfil = u.perfil === 'admin' ? 'user' : 'admin';
    const r = alterarPerfilUsuario(id, novoPerfil);
    if (!r.ok) { toast('❌ ' + r.erro, true); return; }
    renderListaUsuarios();
    toast(`✅ Perfil alterado para ${novoPerfil}`);
}

function resetarSenhaUI(id) {
    const users = getUsers();
    const u = users.find(x => x.id === id);
    if (!u) return;
    const nova = prompt(`Nova senha para "${u.nome}" (mín. 4 caracteres):`, '');
    if (!nova) return;
    const r = resetarSenhaUsuario(id, nova);
    if (!r.ok) { toast('❌ ' + r.erro, true); return; }
    toast('🔑 Senha alterada');
}

// Auto-renderiza ao abrir a aba Users
const _abrirTabOriginal = window.abrirTab;
function _abrirTabUsersProxy(tab, el) {
    if (typeof _abrirTabOriginal === 'function') _abrirTabOriginal(tab, el);
    if (tab === 'users') renderListaUsuarios();
}
// sobrescreve onclick -> feito via render da lista no carregarTudo

function resetarTudo() {
    if (!confirm('⚠️ Isso vai apagar TODAS as suas transações, orçamentos, metas e categorias. Continuar?')) return;
    if (!confirm('Tem certeza? Esta ação NÃO pode ser desfeita.')) return;
    setTransacoes([]);
    setOrcamentos([]);
    setMetas([]);
    setCategorias(CATEGORIAS_PADRAO);
    carregarTudo();
    toast('🗑️ Tudo resetado');
}

// === PWA: Service Worker + Install Prompt ===
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => {
                console.log('[PWA] Service Worker registrado:', reg.scope);
                atualizarStatusPWA();
            })
            .catch(err => console.warn('[PWA] SW falhou:', err));
    });
}

// Prompt de instalacao do PWA
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('[PWA] Prompt disponível - mostrando botões');
    setTimeout(() => {
        const btn1 = document.getElementById('btnInstallPWA');
        const btn2 = document.getElementById('btnInstallPWA2');
        if (btn1) btn1.style.display = 'inline-flex';
        if (btn2) btn2.style.display = 'block';
        atualizarStatusPWA();
    }, 100);
});
window.addEventListener('appinstalled', () => {
    console.log('[PWA] App instalado!');
    deferredPrompt = null;
    const btn1 = document.getElementById('btnInstallPWA');
    const btn2 = document.getElementById('btnInstallPWA2');
    if (btn1) btn1.style.display = 'none';
    if (btn2) btn2.style.display = 'none';
    atualizarStatusPWA();
    toast('🎉 App instalado! Procure "MeuFinanças" na tela inicial');
});

function instalarApp() {
    if (!deferredPrompt) {
        // Detecta se já está instalado
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
            toast('✅ App já está instalado!', false);
        } else {
            toast('📲 Use o menu do navegador: "Adicionar à tela inicial"', true);
        }
        return;
    }
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(r => {
        if (r.outcome === 'accepted') toast('✅ Instalando...');
        deferredPrompt = null;
        atualizarStatusPWA();
    });
}

function atualizarStatusPWA() {
    const el = document.getElementById('pwaStatus');
    if (!el) return;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    const temSW = 'serviceWorker' in navigator;
    const temPrompt = !!deferredPrompt;
    if (isStandalone) {
        el.innerHTML = '<div style="color:#10b981;">✅ App já instalado e rodando!</div>';
    } else if (temPrompt) {
        el.innerHTML = '<div style="color:#f59e0b;">⏳ Pronto para instalar - clique no botão acima</div>';
    } else if (temSW) {
        el.innerHTML = '<div style="color:#94a3b8;">💡 Use o menu do navegador: "Instalar app" ou "Adicionar à tela inicial"</div>';
    } else {
        el.innerHTML = '<div style="color:#ef4444;">❌ Seu navegador não suporta PWA</div>';
    }
}

// Verifica status ao abrir Config
const _abrirTabOriginal2 = window.abrirTab;
window.abrirTab = function(tabId, btn) {
    if (typeof _abrirTabOriginal2 === 'function') _abrirTabOriginal2(tabId, btn);
    if (tabId === 'config') setTimeout(atualizarStatusPWA, 100);
};

// force rebuild 1783054378

