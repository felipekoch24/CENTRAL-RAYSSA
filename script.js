// --- REGISTRO DO SERVICE WORKER PARA PWA ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => console.log('SW erro:', err));
    });
}

// --- CONTROLE DE ABAS ---
function trocarAba(evt, abaId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(abaId).classList.add('active');
    evt.currentTarget.classList.add('active');
}

// --- UTILITÁRIOS DE MOEDA ESTILO BANCO ---
function moeda(v) { 
    return v.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' }); 
}

function extrairNumero(t) { 
    let n = String(t).replace(/\D/g, ""); 
    return n ? parseFloat(n) / 100 : 0; 
}

function formatarMoedaInput(el) {
    let v = el.value.replace(/\D/g, "");
    if (v === "") v = "0";
    el.value = moeda(parseFloat(v) / 100);
}

// --- ABA 1: EXTRAS ---
let diasFerias = 20;

function setFerias(d) {
    diasFerias = d;
    document.querySelectorAll('.ferias-opt').forEach(el => el.classList.remove('active'));
    document.getElementById('f' + d).classList.add('active');
    calcularExtras();
}

function calcularExtras() {
    const bruto = extrairNumero(document.getElementById('bruto').value);
    const bp1 = bruto * 0.50;
    const bp2 = (bruto * 0.50) - (bruto * 0.10);
    const bferias = ((bruto + (bruto / 3)) * (diasFerias / 30)) * 0.91;
    
    document.getElementById('p1').innerText = moeda(bp1);
    document.getElementById('p2').innerText = moeda(bp2);
    document.getElementById('fer').innerText = moeda(bferias);
    document.getElementById('total-extras').innerText = moeda(bp1 + bp2 + bferias);
}

// --- ABA 2: RADAR 5º DIA ÚTIL ---
const frasesGeral = [
    "O FELIPE ESTÁ DE OLHO NO NOSSO FUTURO! SEGURA ESSE GASTO.",
    "CADA REAL GUARDADO É UM TIJOLO NA NOSSA CASA PRÓPRIA.",
    "QUEM TEM DINHEIRO NÃO É REFÉM DE NINGUÉM. FOCO NA META!",
    "VOCÊ É A PEÇA CHAVE DO NOSSO PLANO. MANTENHA A GUARDA ALTA!"
];

function getProximoQuintoDiaUtil() {
    let hoje = new Date(), mes = hoje.getMonth(), ano = hoje.getFullYear();
    function calc(m, a) {
        let u = 0, d = 1;
        while (u < 5) {
            let dt = new Date(a, m, d);
            if (dt.getDay() !== 0 && dt.getDay() !== 6) u++;
            if (u < 5) d++;
        }
        return new Date(a, m, d);
    }
    let alvo = calc(mes, ano);
    if (alvo < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) {
        mes++; if (mes > 11) { mes = 0; ano++; }
        alvo = calc(mes, ano);
    }
    return alvo;
}

function atualizarRadar() {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const alvo = getProximoQuintoDiaUtil();
    const dias = Math.ceil((alvo - hoje) / (1000 * 60 * 60 * 24));
    const card = document.getElementById('radar-card-main');
    const display = document.getElementById('radar-dias');
    const status = document.getElementById('radar-status');
    const motivacao = document.getElementById('radar-frase');

    if (dias === 0) {
        card.className = "radar-card radar-chegou";
        display.innerText = "VITÓRIA";
        status.innerText = "⭐ DIA DE PAGAMENTO! ⭐";
        motivacao.innerHTML = "FELIPE ESTÁ ORGULHOSO, CONTINUE FIRME, ELE TE AMA MUITO! ❤️";
    } else {
        display.innerText = dias + (dias === 1 ? " DIA" : " DIAS");
        motivacao.innerText = `"${frasesGeral[Math.floor(Math.random() * frasesGeral.length)]}"`;
        if (dias <= 3) {
            card.className = "radar-card radar-alerta";
            status.innerText = "⏳ QUASE LÁ! SEGURA O ÚLTIMO SUSPIRO!";
        } else {
            card.className = "radar-card radar-normal";
            status.innerText = "🛡️ MODO BLINDADO ATIVO";
        }
    }
}

function alertaGasto() {
    alert("MENSAGEM DO FELIPE:\n\nISSO É REALMENTE NECESSÁRIO? PENSA NA NOSSA CASA PRÓPRIA!");
}

// --- ABA 3: CONTROLE DE DÍVIDAS ---
let dadosDividas = JSON.parse(localStorage.getItem('central_dividas')) || { renda: 0, gastos: [] };
let idSelDivida = -1;

function formatarSalarioDivida(el) {
    formatarMoedaInput(el);
    dadosDividas.renda = extrairNumero(el.value);
    salvarDividas();
}

function addGastoDivida() {
    const nome = document.getElementById('gasto-nome').value;
    const v = extrairNumero(document.getElementById('gasto-valor').value);
    const dia = document.getElementById('gasto-dia').value;
    const f = document.getElementById('gasto-faltam').value || 1;
    if (!nome || v <= 0 || !dia) return;
    dadosDividas.gastos.push({ n: nome, v, d: parseInt(dia), f: parseInt(f), id: Date.now() });
    ["gasto-nome", "gasto-valor", "gasto-dia", "gasto-faltam"].forEach(id => document.getElementById(id).value = "");
    salvarDividas();
}

function pagarParcelaDivida(id) {
    const conta = dadosDividas.gastos.find(g => g.id === id);
    if (conta) {
        conta.f -= 1;
        if (conta.f <= 0) dadosDividas.gastos = dadosDividas.gastos.filter(g => g.id !== id);
        salvarDividas();
    }
}

function delGastoSelecionado() {
    if (idSelDivida === -1) return;
    dadosDividas.gastos = dadosDividas.gastos.filter(g => g.id !== idSelDivida);
    idSelDivida = -1;
    salvarDividas();
}

function salvarDividas() {
    localStorage.setItem('central_dividas', JSON.stringify(dadosDividas));
    renderDividas();
}

function renderDividas() {
    if(dadosDividas.renda > 0) document.getElementById('salario-divida').value = moeda(dadosDividas.renda);
    const tbody = document.querySelector("#tabelaDividas tbody");
    tbody.innerHTML = "";
    let totalMes = 0, dividaTotal = 0, maiorFalta = 0;

    dadosDividas.gastos.forEach(g => {
        totalMes += g.v;
        dividaTotal += (g.v * g.f);
        if (g.f > maiorFalta) maiorFalta = g.f;

        const tr = document.createElement("tr");
        tr.onclick = () => {
            document.querySelectorAll("#tabelaDividas tr").forEach(t => t.classList.remove("selected"));
            tr.classList.add("selected");
            idSelDivida = g.id;
        };
        tr.innerHTML = `<td>${String(g.d).padStart(2,'0')}</td><td>${g.n}</td><td>${g.f}x</td><td>${moeda(g.v)}</td><td><button class="btn-acao" onclick="pagarParcelaDivida(${g.id})">PAGO</button></td>`;
        tbody.appendChild(tr);
    });

    const sobra = dadosDividas.renda - totalMes;
    document.getElementById("resumo-divida").innerHTML = `Gasto: ${moeda(totalMes)} | Sobra: <span style="color:${sobra>=0?'#50fa7b':'#ff5252'}">${moeda(sobra)}</span>`;
    document.getElementById("total-divida").innerText = moeda(dividaTotal);
    
    if (maiorFalta > 0) {
        let dv = new Date(); dv.setMonth(dv.getMonth() + (maiorFalta - 1));
        document.getElementById("data-vitoria").innerText = dv.toLocaleString('pt-br', {month:'long', year:'numeric'}).toUpperCase();
    } else {
        document.getElementById("data-vitoria").innerText = "ESTE MÊS!";
    }
}

// --- ABA 4: LISTAS DA LINDA ---
let listasData = JSON.parse(localStorage.getItem('central_listas')) || [];

function addCat() {
    const val = document.getElementById('nova-cat').value.trim();
    if (val) { listasData.push({ name: val, items: [] }); document.getElementById('nova-cat').value = ''; salvarListas(); }
}

function addItemLista(cIdx) {
    const n = document.getElementById(`ln-${cIdx}`).value.trim();
    const p = extrairNumero(document.getElementById(`lp-${cIdx}`).value);
    if (n) { listasData[cIdx].items.push({ name: n, price: p, done: false }); salvarListas(); }
}

function toggleLista(cIdx, iIdx) {
    listasData[cIdx].items[iIdx].done = !listasData[cIdx].items[iIdx].done;
    salvarListas();
}

function delItemLista(cIdx, iIdx) { listasData[cIdx].items.splice(iIdx, 1); salvarListas(); }
function delCat(cIdx) { if(confirm("Apagar lista?")) { listasData.splice(cIdx, 1); salvarListas(); } }
function salvarListas() { localStorage.setItem('central_listas', JSON.stringify(listasData)); renderListas(); }

function renderListas() {
    const container = document.getElementById('container-listas');
    container.innerHTML = '';
    listasData.forEach((cat, cIdx) => {
        let total = 0;
        let itemsHtml = cat.items.map((it, iIdx) => {
            total += it.price;
            return `<div class="lista-row">
                <input type="checkbox" ${it.done?'checked':''} onchange="toggleLista(${cIdx},${iIdx})" style="width:auto;">
                <span class="${it.done?'checked':''}" style="flex:1; font-size:13px; text-align:left;">${it.name}</span>
                <span style="color:#ff79c6; font-size:12px;">${moeda(it.price)}</span>
                <button style="width:25px; background:none; color:red;" onclick="delItemLista(${cIdx},${iIdx})">×</button>
            </div>`;
        }).join('');

        container.innerHTML += `<div class="lista-box">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #333; padding-bottom:5px;">
                <b style="color:var(--primary); font-size:13px;">${cat.name}</b>
                <button style="width:auto; background:none; color:#ff5252; font-size:9px;" onclick="delCat(${cIdx})">APAGAR</button>
            </div>
            ${itemsHtml}
            <div style="text-align:right; font-size:12px; margin:8px 0; color:var(--primary);">Total: ${moeda(total)}</div>
            <div style="display:flex; gap:5px;">
                <input type="text" id="ln-${cIdx}" placeholder="Item" style="font-size:12px; padding:8px;">
                <input type="text" id="lp-${cIdx}" placeholder="R$ 0,00" oninput="formatarMoedaInput(this)" style="width:90px; font-size:12px; padding:8px;">
                <button style="width:40px; background:var(--primary);" onclick="addItemLista(${cIdx})">+</button>
            </div>
        </div>`;
    });
}

// --- ABA 5: FLUXO FINANCEIRO ---
let fluxoData = JSON.parse(localStorage.getItem('central_fluxo')) || [];

function addFluxoItem() {
    const desc = document.getElementById('fluxo-desc').value;
    const vParc = extrairNumero(document.getElementById('fluxo-vparc').value);
    const qtd = parseInt(document.getElementById('fluxo-qtd').value) || 1;
    const dia = document.getElementById('fluxo-dia').value || 1;
    const tipo = document.getElementById('fluxo-tipo').value;
    if (!desc || vParc <= 0) return;
    fluxoData.push({ id: Date.now(), desc, v: vParc, q: qtd, d: dia, tipo });
    ["fluxo-desc", "fluxo-vparc", "fluxo-qtd", "fluxo-dia"].forEach(id => document.getElementById(id).value = "");
    salvarFluxo();
}

function delFluxo(id) { fluxoData = fluxoData.filter(i => i.id !== id); salvarFluxo(); }
function salvarFluxo() { localStorage.setItem('central_fluxo', JSON.stringify(fluxoData)); renderFluxo(); }

function renderFluxo() {
    const tbody = document.querySelector("#tabelaFluxo tbody");
    tbody.innerHTML = "";
    let sDevo = 0, sReceber = 0;
    fluxoData.forEach(item => {
        if(item.tipo === 'devo') sDevo += (item.v * item.q); else sReceber += (item.v * item.q);
        tbody.innerHTML += `<tr>
            <td>${item.desc}</td><td>Dia ${item.d}</td>
            <td style="color:${item.tipo==='devo'?'#ff5252':'#50fa7b'}">${moeda(item.v)}</td>
            <td><button style="background:none; color:#ff5252; width:auto;" onclick="delFluxo(${item.id})">🗑️</button></td>
        </tr>`;
    });
    document.getElementById('fluxo-devo').innerText = moeda(sDevo);
    document.getElementById('fluxo-receber').innerText = moeda(sReceber);
}

// Inicialização
calcularExtras();
atualizarRadar();
renderDividas();
renderListas();
renderFluxo();
                               
