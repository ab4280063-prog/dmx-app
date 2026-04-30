
(function () {

    // =========================
    // SISTEMA DE ATUALIZAÇÃO
    // =========================

    const APP_VERSION = "1.0.9";
    async function checkUpdate() {
        try {
            const res = await fetch(
                "https://ab4280063-prog.github.io/dmx-app/version.json?t=" + Date.now()
            );

            const data = await res.json();
            const lastAlert = localStorage.getItem("last_update_alert");

            if (data.version !== APP_VERSION && lastAlert !== data.version) {

                localStorage.setItem("last_update_alert", data.version);

                f7.dialog.confirm(
                    `Nova versão (${data.version}) disponível 🚀\nDeseja atualizar agora?`,
                    "Atualização",
                    () => {
                        downloadAndInstall(data.apk);
                    }
                );
            }

        } catch (e) {
            console.log("Erro atualização:", e);
        }
    }

    function downloadAndInstall(url) {

        const fileTransfer = new FileTransfer();
        const fileURL = cordova.file.externalDataDirectory + "update.apk";

        let progressDialog = f7.dialog.progress("Baixando atualização...", 0);

        fileTransfer.onprogress = function (progressEvent) {
            if (progressEvent.lengthComputable) {
                let percent = Math.floor((progressEvent.loaded / progressEvent.total) * 100);
                progressDialog.setProgress(percent);
            }
        };

        fileTransfer.download(
            url,
            fileURL,
            function (entry) {

                progressDialog.close();

                f7.dialog.confirm(
                    "Download concluído. Instalar agora?",
                    "Instalação",
                    () => {
                        cordova.plugins.fileOpener2.open(
                            entry.toURL(),
                            "application/vnd.android.package-archive",
                            {
                                error: (e) => alert("Erro ao abrir APK: " + JSON.stringify(e)),
                                success: () => console.log("Instalador aberto")
                            }
                        );
                    }
                );

            },
            function (error) {
                progressDialog.close();
                alert("Erro no download: " + JSON.stringify(error));
            }
        );
    }

    // State Management
    let state = {
        address: 1,
        universe: 1,
        fixtureChannels: 0,
        fixtureName: '',
        fixturePower: 0,
        unitNumber: 1,
        channelsPerUniverse: 512,
        patchedUnits: [],
        fixtureParameters: {},
        voltage: 220,
        projectName: '',
        currentView: 'dashboard', // dashboard, params, material, report
        paramsFixtureName: '',
        paramsFixtureChannels: 0
    };

    // Framework7 Initialization
    const f7 = new Framework7({
        el: '#app',
        name: 'DMX MASTER PRO',
        theme: 'auto',
        darkMode: true,
    });

    let mainView;

    // UI Icons (SVG Strings)
    const icons = {
        consoleMA2: `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="15" width="18" height="6" rx="1"></rect><path d="M4 15l2-10h12l2 10"></path><rect x="8" y="7" width="8" height="5" rx="0.5"></rect><line x1="6" y1="18" x2="10" y2="18"></line><line x1="14" y1="18" x2="18" y2="18"></line></svg>`,
        movingHead: `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18h10a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-1a2 2 0 0 1 2-2z"></path><path d="M12 18v-2"></path><path d="M9 10a3 3 0 0 1 6 0v4a3 3 0 0 1-6 0v-4z"></path><path d="M12 7V5"></path><circle cx="12" cy="10" r="1"></circle></svg>`,
        faders: `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><rect x="2" y="10" width="4" height="4" rx="1"></rect><rect x="10" y="8" width="4" height="4" rx="1"></rect><rect x="18" y="12" width="4" height="4" rx="1"></rect></svg>`,
        power: `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
        download: `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
        share: `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`,
        dashboard: `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,
        sliders: `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="2" y1="14" x2="6" y2="14"></line><line x1="10" y1="12" x2="14" y2="12"></line><line x1="18" y1="16" x2="22" y2="16"></line></svg>`,
        clipboard: `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>`,
        fileText: `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
        arrowRight: `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`,
        arrowLeft: `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>`,
        rotateCcw: `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>`,
        hash: `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></svg>`,
        tag: `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>`,
        layers: `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`,
        whatsapp: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.435 5.63 1.435h.008c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`,
        package: `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`,
        packageOpen: `<svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m7.5 4.27 9 5.15"></path><polyline points="3.29 7 12 12 20.71 7"></polyline><line x1="12" y1="22" x2="12" y2="12"></line><path d="m16.5 4.27-9 5.15"></path></svg>`,
        trash: `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`,
        youtube: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M23.5 6.2a2.9 2.9 0 0 0-2-2C19.6 3.5 12 3.5 12 3.5s-7.6 0-9.5.7a2.9 2.9 0 0 0-2 2A30 30 0 0 0 0 12a30 30 0 0 0 .5 5.8 2.9 2.9 0 0 0 2 2c1.9.7 9.5.7 9.5.7s7.6 0 9.5-.7a2.9 2.9 0 0 0 2-2A30 30 0 0 0 24 12a30 30 0 0 0-.5-5.8zM9.6 15.5v-7l6.4 3.5-6.4 3.5z"/>
</svg>`,
    };

    // Initialize
    function init() {
        mainView = f7.views.create('.view-main');
        const saved = localStorage.getItem('dmx_master_pro_state');

        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                state = { ...state, ...parsed };
            } catch (e) {
                console.warn("Erro ao carregar estado:", e);
            }
        }
        state.currentView = 'dashboard';
        render();
        checkUpdate();
    }

    function saveState() {
        localStorage.setItem('dmx_master_pro_state', JSON.stringify(state));
    }

    // Logic Functions
    function checkCollision(universe, address, channels) {
        for (const batch of state.patchedUnits) {
            let bAddr = batch.address;
            let bUni = batch.universe;

            for (let i = 0; i < batch.units; i++) {
                if (bAddr + batch.channels - 1 > state.channelsPerUniverse) {
                    bAddr = 1;
                    bUni++;
                }

                if (bUni === universe) {
                    const bEnd = bAddr + batch.channels - 1;
                    const nEnd = address + channels - 1;

                    if (address <= bEnd && nEnd >= bAddr) {
                        return { collision: true, name: batch.name, addr: bAddr };
                    }
                }

                bAddr += batch.channels;
                if (bAddr > state.channelsPerUniverse) {
                    bAddr -= state.channelsPerUniverse;
                    bUni++;
                }
            }
        }
        return { collision: false };
    }

    function calculateForward() {
        let currentAddr = state.address;
        let currentUni = state.universe;
        const unitsToPatch = state.unitNumber;
        const chPerFixture = state.fixtureChannels;
        const fixtureName = state.fixtureName || 'Aparelho';
        const fixturePower = state.fixturePower || 0;

        if (chPerFixture <= 0) {
            f7.dialog.alert("Por favor, informe a quantidade de canais do aparelho.", "Aviso");
            return;
        }

        const proceedWithPatch = (startAddr, startUni, startIndex = 0) => {
            let tempAddr = startAddr;
            let tempUni = startUni;

            for (let i = startIndex; i < unitsToPatch; i++) {
                if (tempAddr + chPerFixture - 1 > state.channelsPerUniverse) {
                    f7.dialog.confirm(
                        `${fixtureName} ultrapassa o limite do universo ${tempUni}. Deseja continuar a partir do canal 1 do universo ${tempUni + 1}?`,
                        "Aviso",
                        () => {
                            if (i > startIndex) {
                                const unit = {
                                    id: Date.now() + i,
                                    name: fixtureName,
                                    universe: startUni,
                                    address: startAddr,
                                    channels: chPerFixture,
                                    units: i - startIndex,
                                    power: fixturePower,
                                    timestamp: new Date().toLocaleTimeString()
                                };
                                state.patchedUnits = [unit, ...state.patchedUnits];
                            }
                            proceedWithPatch(1, tempUni + 1, i);
                        }
                    );
                    return;
                }

                const collision = checkCollision(tempUni, tempAddr, chPerFixture);
                if (collision.collision) {
                    f7.dialog.alert(`CONFLITO DE ENDEREÇO!\n\nO canal ${tempAddr} no Universo ${tempUni} já está ocupado pelo aparelho: "${collision.name}" (Iniciado em ${collision.addr}).`, "Erro");
                    return;
                }

                tempAddr += chPerFixture;
                if (tempAddr > state.channelsPerUniverse) {
                    tempAddr -= state.channelsPerUniverse;
                    tempUni++;
                }
            }

            const unitsInThisBatch = unitsToPatch - startIndex;
            if (unitsInThisBatch > 0) {
                const unit = {
                    id: Date.now() + Math.random(),
                    name: fixtureName,
                    universe: startUni,
                    address: startAddr,
                    channels: chPerFixture,
                    units: unitsInThisBatch,
                    power: fixturePower,
                    timestamp: new Date().toLocaleTimeString()
                };
                state.patchedUnits = [unit, ...state.patchedUnits];
            }

            state.address = tempAddr;
            state.universe = tempUni;
            saveState();
            render();
        };

        proceedWithPatch(currentAddr, currentUni);
    }

    function calculateBackward() {
        if (state.patchedUnits.length === 0) return;
        const lastUnit = state.patchedUnits.shift();
        state.address = lastUnit.address;
        state.universe = lastUnit.universe;
        saveState();
        render();
    }

    function performReset() {
        state.address = 1;
        state.universe = 1;
        state.fixtureChannels = 0;
        state.fixtureName = '';
        state.fixturePower = 0;
        state.unitNumber = 1;
        state.patchedUnits = [];
        state.voltage = 220;
        state.currentView = 'dashboard';
        state.projectName = '';
        saveState();
        render();
    }

    // Rendering Functions
    function render() {
        const container = document.getElementById('main-container');
        if (!container) return;

        container.innerHTML = `
            ${renderHeader()}
            <main style="padding: 0px 0px 0px 0px;">
                ${renderCurrentView()}
            </main>
            ${renderNavBar()}
        `;
        attachEventListeners();
        const youtubeTop = document.getElementById('openYoutubeTop');
        if (youtubeTop) {
            youtubeTop.onclick = () => {
                window.open('https://youtube.com/@antoniobatista-w7i', '_blank');
            };
        }
    }

    function renderHeader() {
        const showLibraryButtons = state.currentView === "params";
        return `
            <header class="header">
                <div class="flex items-center gap-3">
                    <div class="logo-container">
                        ${icons.faders}
                    </div>
                    <div class="flex flex-col">
                        <h1 class="app-title">DMX MASTER PRO</h1>
                        <span class="app-subtitle">
                            ${state.currentView === 'report' ? 'Relatório Final' :
                state.currentView === 'params' ? 'Parâmetros do Aparelho' :
                    state.currentView === 'material' ? 'Lista de Material' : 'Console Assistant'}
                        </span>
                    </div>
                </div>
                <div class="flex gap-2">
                    ${showLibraryButtons ? `
                        <button id="exportParamsPdf" class="btn-icon" title="Baixar PDF">
                            ${icons.download}
                        </button>
                        <button id="shareParamsWa" class="btn-icon" style="color: #25D366;" title="WhatsApp">
                            ${icons.whatsapp}
                        </button>
                    ` : ``}
                     <!-- 🔥 BOTÃO YOUTUBE -->
                     <button id="openYoutubeTop" class="btn-icon" style="color: #FF0000;" title="YouTube">
                     ${icons.youtube}
                    </button>
                    </div>
                </div>
            </header>
        `;
    }

    function renderCurrentView() {
        switch (state.currentView) {
            case 'dashboard': return renderDashboard();
            case 'params': return renderParams();
            case 'material': return renderMaterial();
            case 'report': return renderReport();
            default: return renderDashboard();
        }
    }

    function renderDashboard() {
        return `
            <div class="card">
                <div class="mb-4">
                    <label class="label">Nome do Projeto / Show</label>
                    <div class="input-wrapper">
                        <div class="w-6 flex justify-center opacity-50">${icons.fileText}</div>
                        <input type="text" id="projectName" class="input-field" placeholder="Ex: Show Sertanejo 2024..." value="${state.projectName}">
                    </div>
                </div>

                <div class="mb-4">
                    <label class="label">Aparelho a ser Patcheado</label>
                    <div class="input-wrapper">
                        <div class="w-6 flex justify-center opacity-50">${icons.tag}</div>
                        <input type="text" id="fixtureName" class="input-field" placeholder="Aparelho a desejar..." value="${state.fixtureName}">
                    </div>
                </div>
                
                <div class="grid-2 mb-4">
                    <div>
                        <label class="label">Endereço Inicial</label>
                        <div class="input-wrapper">
                            <div class="w-6 flex justify-center opacity-50">${icons.hash}</div>
                            <input type="number" id="address" class="input-field" value="${state.address}">
                        </div>
                    </div>
                    <div>
                        <label class="label">Universo</label>
                        <div class="input-wrapper">
                            <div class="w-6 flex justify-center opacity-50">${icons.layers}</div>
                            <input type="number" id="universe" class="input-field" value="${state.universe}">
                        </div>
                    </div>
                </div>

                <div class="grid-2 mb-4">
                    <div>
                        <label class="label">Canal do<br>Aparelho</label>
                        <div class="input-wrapper">
                            <div class="w-6 flex justify-center opacity-50">${icons.faders}</div>
                            <input type="number" id="fixtureChannels" class="input-field" value="${state.fixtureChannels}">
                        </div>
                    </div>
                    <div>
                        <label class="label">Quantidade de<br>Unidades</label>
                        <div class="input-wrapper">
                            <div class="w-6 flex justify-center opacity-50">${icons.clipboard}</div>
                            <input type="number" id="unitNumber" class="input-field" value="${state.unitNumber}">
                        </div>
                    </div>
                </div>

                <div class="mb-4">
                    <label class="label">Potência por Aparelho (Watts)</label>
                    <div class="input-wrapper">
                        <div class="w-6 flex justify-center opacity-50">${icons.power}</div>
                        <input type="number" id="fixturePower" class="input-field" placeholder="Ex: 300" value="${state.fixturePower || ''}">
                    </div>
                </div>

                <div class="flex flex-col gap-3 mt-4">
                    <div class="grid-2">
                        <button id="calcWatts" class="btn btn-secondary" style="background: rgba(255, 193, 7, 0.1); color: #FFC107; border-color: rgba(255, 193, 7, 0.2);">
                            <div class="w-6 flex justify-center">${icons.power}</div> Calc. Watts
                        </button>
                        <button id="calcBreaker" class="btn btn-secondary" style="background: rgba(33, 150, 243, 0.1); color: #2196F3; border-color: rgba(33, 150, 243, 0.2);">
                            <div class="w-6 flex justify-center">${icons.layers}</div> Limite 20A
                        </button>
                    </div>
                    <div class="grid-2">
                        <button id="calcBack" class="btn btn-secondary">
                            <div class="w-6 flex justify-center">${icons.arrowLeft}</div> Voltar
                        </button>
                        <button id="calcForward" class="btn btn-primary">
                            Avançar <div class="w-6 flex justify-center">${icons.arrowRight}</div>
                        </button>
                    </div>
                    <button id="resetBtn" class="btn btn-secondary" style="color: #FF4444; background: rgba(255, 68, 68, 0.1);">
                        <div class="w-6 flex justify-center">${icons.rotateCcw}</div> Resetar Calculadora
                    </button>
                </div>
            </div>
        `;
    }

    function renderParams() {
        return `
            <div class="flex flex-col gap-3 px-4">
                <div class="card mb-2" style="padding: 12px 8px;">
                    <label class="label" style="margin-bottom: 0.5rem; display: block;">Nome do Aparelho:</label>
                    <div class="input-wrapper">
                        <div class="w-6 flex justify-center opacity-50">${icons.tag}</div>
                        <input type="text" id="paramsFixtureName" class="input-field" placeholder="Ex: Moving Beam 230..." value="${state.paramsFixtureName}">
                    </div>
                </div>

                <div class="flex justify-between items-center mb-4 px-3 py-3 bg-[#002142] rounded-xl border border-white/5 shadow-sm">
                    <h2 style="font-size: 0.9rem; font-weight: 900; color: white; letter-spacing: 0.05em;">CANAIS / PARÂMETROS</h2>
                    <div class="flex gap-2">
                        <button id="addParamBtn" class="btn btn-primary" style="width: auto; padding: 0 1rem; font-size: 0.7rem; height: 2.2rem; border-radius: 8px;">+ ADICIONAR</button>
                    </div>
                </div>
                
                <div class="flex flex-col gap-2">
                    ${Array.from({ length: state.paramsFixtureChannels }).map((_, i) => {
            const id = i + 1;
            const paramName = state.fixtureParameters[id] || '';
            return `
                            <div style="background: #001529; border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 10px 16px; display: flex; align-items: center; gap: 12px; margin-bottom: 4px;">
                                <span style="color: white; font-size: 0.95rem; font-weight: 700; min-width: 45px; font-family: inherit; text-shadow: 0 0 10px rgba(255,255,255,0.1);">Ch ${id}</span>
                                <input type="text" 
                                       class="param-input" 
                                       data-id="${id}" 
                                       value="${paramName}" 
                                       placeholder=""
                                       style="flex: 1; background: #002142; border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 10px 14px; color: white; font-size: 0.9rem; outline: none;">
                                <button class="remove-param-btn" data-id="${id}" style="background: none; border: none; color: #ff4444; cursor: pointer; font-size: 1.4rem; opacity: 0.5; padding: 0 4px; display: flex; align-items: center; justify-content: center; line-height: 1;">
                                    &times;
                                </button>
                            </div>
                        `;
        }).join('')}
                    
                    ${state.paramsFixtureChannels === 0 ? `
                        <div class="text-center p-12 opacity-50 border-2 border-dashed border-white/5 rounded-xl">
                            <p>Nenhum canal adicionado.</p>
                            <p style="font-size: 0.7rem">Clique no botão acima para começar.</p>
                        </div>
                    ` : `
                        <button id="clearParams" style="margin-top: 1.5rem; background: none; border: none; color: #666; font-size: 0.75rem; text-transform: uppercase; cursor: pointer; align-self: center; font-weight: bold; letter-spacing: 0.05em;">REMOVER TODOS OS CANAIS</button>
                    `}
                </div>
            </div>
        `;
    }

    function renderMaterial() {
        const totalUnits = state.patchedUnits.reduce((acc, curr) => acc + curr.units, 0);
        if (totalUnits === 0) {
            return `
                <div class="flex flex-col items-center justify-center p-12 text-center opacity-50">
                    <div style="margin-bottom: 1rem; opacity: 0.2;">${icons.packageOpen}</div>
                    <p>Nenhum aparelho patcheado ainda.</p>
                    <p style="font-size: 0.7rem">Adicione aparelhos para gerar a lista de material.</p>
                </div>
            `;
        }

        const volt = state.voltage || 220;
        const totalWatts = state.patchedUnits.reduce((acc, curr) => acc + (curr.power || 0) * curr.units, 0);
        const totalAmps = totalWatts / volt;

        let ext10m = 0;
        state.patchedUnits.forEach(u => {
            const p = u.power || 0;
            if (p <= 100) ext10m += Math.ceil(u.units / 10);
            else if (p < 400) ext10m += Math.ceil(u.units / 5);
            else ext10m += Math.ceil(u.units / 4);
        });

        const ext5m = Math.ceil(totalUnits / 5);
        const ext2m = Math.max(0, totalUnits - ext10m);

        let sin10m = 0;
        let sin5m = 0;
        state.patchedUnits.forEach(u => {
            const qty10m = Math.ceil(u.units / 8);
            sin10m += qty10m;
            sin5m += (u.units - qty10m);
        });
        const sin2m = Math.floor(sin5m / 5) * 2;

        const maxUniverse = Math.max(...state.patchedUnits.map(u => u.universe), 1);
        const artNetQty = Math.ceil(maxUniverse / 8);
        const redeQty = artNetQty;
        const paraleloQty = state.patchedUnits.reduce((acc, curr) => acc + Math.max(0, curr.units - 1), 0);

        const materialData = `--- RELAÇÃO EQUIPAMENTOS---
            ELÉTRICA
${state.patchedUnits.map(u => `${u.name}: ${u.units}x ${u.power || 0}W = ${(u.units * (u.power || 0)).toFixed(0)}W`).join('\n')}
---------------------------
Voltagem: ${volt}V
Potência Total: ${totalWatts.toFixed(0)}W (${totalAmps.toFixed(1)}A)
Alimentações (10M) Necessárias: ${ext10m}

                AC
Extensão 2M / Uni: ${ext2m}
Extensão 5M / Uni: ${ext5m}
Extensão 10M / Uni: ${ext10m}

            SINAL
Sinal 2M / Uni: ${sin2m}
Sinal 5M / Uni: ${sin5m}
Sinal 10M / Uni: ${sin10m}

           PARALELO
Paralelo / Uni: ${paraleloQty}

ART-NET 8 UNIVERSOS
Art-net / Quantidade: ${artNetQty}

          CABO DE REDE
Rede / Quantidade: ${redeQty}
------------------------`;

        return `
            <div class="card">
                <div class="flex justify-between items-center mb-6">
                    <h2 style="font-size: 1.2rem; font-weight: 900;">RELAÇÃO EQUIPAMENTOS</h2>
                    <div class="flex gap-2">
                       <button id="exportMaterialPdf" class="btn-icon" title="PDF">${icons.download}</button>
                       <button id="shareMaterialWa" class="btn-icon" style="color: #25D366;" title="WhatsApp">${icons.whatsapp}</button> 
                    </div>
                </div>

                <div class="mb-4">
                    <label class="label">Voltagem da Rede (V)</label>
                    <div class="input-wrapper">
                        <div class="w-6 flex justify-center opacity-50">${icons.power}</div>
                        <input type="number" id="matVolts" class="input-field" value="${volt}">
                    </div>
                </div>
                
                <div id="materialContent" class="overflow-y-auto no-scrollbar" style="max-height: 50vh; font-family: monospace; white-space: pre-wrap; font-size: 0.85rem; line-height: 1.5; color: var(--text-secondary);">
${materialData}
                </div>
            </div>
        `;
    }

    function renderReport() {
        let reportHtml = "";

        if (state.projectName) {
            reportHtml += `<div style="margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">`;
            reportHtml += `<div style="color: #007aff; font-weight: 900; font-size: 1.1rem; text-transform: uppercase;">${state.projectName}</div>`;
            reportHtml += `<div style="color: var(--text-secondary); font-size: 0.7rem; margin-top: 4px;">Gerado em: ${new Date().toLocaleDateString()}</div>`;
            reportHtml += `</div>`;
        }

        const batches = [...state.patchedUnits].reverse();

        if (batches.length === 0) {
            return `
                <div class="card">
                    <div class="flex justify-between items-center mb-6">
                        <h2 style="font-size: 1.2rem; font-weight: 900;">DMX PATCH REPORT</h2>
                    </div>
                    <div id="reportContent" class="overflow-y-auto no-scrollbar" style="max-height: 70vh;">
                        <p class="text-secondary text-center p-8">Nenhum patch realizado.</p>
                    </div>
                </div>
            `;
        }

        batches.forEach((batch, bIdx) => {
            reportHtml += `<div style="margin-bottom: 10px;">`;
            reportHtml += `<div style="color: white; font-weight: bold; font-family: monospace; font-size: 0.9rem;">FIXTURE: ${batch.name.toUpperCase()}</div>`;
            reportHtml += `<div style="color: var(--text-secondary); font-family: monospace; font-size: 0.85rem;">${batch.power || 0}W / uni</div>`;

            let currentAddr = batch.address;
            let currentUni = batch.universe;

            for (let i = 0; i < batch.units; i++) {
                if (currentAddr + batch.channels - 1 > state.channelsPerUniverse) {
                    currentAddr = 1;
                    currentUni++;
                }

                const line = `${batch.name.toUpperCase()} | Uni: ${currentUni} | Addr: ${currentAddr}`;
                reportHtml += `<div style="color: var(--text-secondary); font-family: monospace; font-size: 0.85rem;">${line}</div>`;

                currentAddr += batch.channels;
                if (currentAddr > state.channelsPerUniverse) {
                    currentAddr -= state.channelsPerUniverse;
                    currentUni++;
                }
            }

            if (bIdx < batches.length - 1) {
                reportHtml += `<div><br></div>`;
            }

            reportHtml += `</div>`;
        });

        return `
            <div class="card">
                <div class="flex justify-between items-center mb-6">
                    <h2 style="font-size: 1.2rem; font-weight: 900;">DMX PATCH REPORT</h2>
                    <div class="flex gap-2">
                        <button id="clearReportHistory" class="btn-icon" style="color: #FF4444;" title="Limpar Histórico">${icons.trash}</button>
                        <button id="exportPdf" class="btn-icon" title="PDF">${icons.download}</button>
                        <button id="shareWa" class="btn-icon" style="color: #25D366;" title="WhatsApp">${icons.whatsapp}</button>
                    </div>
                </div>
                <div id="reportContent" class="overflow-y-auto no-scrollbar" style="max-height: 70vh;">
                    ${reportHtml}
                </div>
            </div>
        `;
    }

    function renderNavBar() {
        const items = [
            { id: 'dashboard', label: 'Patch', icon: icons.dashboard },
            { id: 'params', label: 'Params', icon: icons.faders },
            { id: 'material', label: 'Material', icon: icons.package },
            { id: 'report', label: 'Report', icon: icons.fileText }
        ];
        return `
            <nav class="nav-bar">
                ${items.map(item => `
                    <a href="#" class="nav-item ${state.currentView === item.id ? 'active' : ''}" data-view="${item.id}">
                        ${item.icon}
                        <span>${item.label}</span>
                    </a>
                `).join('')}
            </nav>
        `;
    }

    function attachEventListeners() {
        document.querySelectorAll('.nav-item').forEach(el => {
            el.onclick = (e) => {
                e.preventDefault();
                state.currentView = el.dataset.view;
                render();
            };
        });

        const fixtureNameInput = document.getElementById('fixtureName');
        if (fixtureNameInput) fixtureNameInput.oninput = (e) => { state.fixtureName = e.target.value; saveState(); };

        const projectNameInput = document.getElementById('projectName');
        if (projectNameInput) projectNameInput.oninput = (e) => { state.projectName = e.target.value; saveState(); };

        const paramsFixtureNameInput = document.getElementById('paramsFixtureName');
        if (paramsFixtureNameInput) paramsFixtureNameInput.oninput = (e) => { state.paramsFixtureName = e.target.value; saveState(); };

        const addressInput = document.getElementById('address');
        if (addressInput) addressInput.oninput = (e) => { state.address = parseInt(e.target.value) || 1; saveState(); };

        const universeInput = document.getElementById('universe');
        if (universeInput) universeInput.oninput = (e) => { state.universe = parseInt(e.target.value) || 1; saveState(); };

        const fixtureChannelsInput = document.getElementById('fixtureChannels');
        if (fixtureChannelsInput) fixtureChannelsInput.oninput = (e) => { state.fixtureChannels = parseInt(e.target.value) || 0; saveState(); };

        const fixturePowerInput = document.getElementById('fixturePower');
        if (fixturePowerInput) fixturePowerInput.oninput = (e) => { state.fixturePower = parseFloat(e.target.value) || 0; saveState(); };

        const unitNumberInput = document.getElementById('unitNumber');
        if (unitNumberInput) unitNumberInput.oninput = (e) => { state.unitNumber = parseInt(e.target.value) || 1; saveState(); };

        const matVoltsInput = document.getElementById('matVolts');
        if (matVoltsInput) matVoltsInput.onchange = (e) => { state.voltage = parseFloat(e.target.value) || 220; saveState(); render(); };

        document.querySelectorAll('.param-input').forEach(input => {
            input.oninput = (e) => {
                const id = parseInt(e.target.dataset.id);
                state.fixtureParameters[id] = e.target.value;
                saveState();
            };
        });

        const addParamBtn = document.getElementById('addParamBtn');
        if (addParamBtn) addParamBtn.onclick = () => { state.paramsFixtureChannels++; saveState(); render(); };

        document.querySelectorAll('.remove-param-btn').forEach(btn => {
            btn.onclick = () => {
                const idToRemove = parseInt(btn.dataset.id);
                const newParams = {};
                let newCount = 0;
                for (let i = 1; i <= state.paramsFixtureChannels; i++) {
                    if (i === idToRemove) continue;
                    newCount++;
                    if (state.fixtureParameters[i]) newParams[newCount] = state.fixtureParameters[i];
                }
                state.fixtureParameters = newParams;
                state.paramsFixtureChannels = newCount;
                saveState();
                render();
            };
        });

        document.getElementById('calcForward')?.addEventListener('click', calculateForward);
        document.getElementById('calcBack')?.addEventListener('click', calculateBackward);
        document.getElementById('resetBtn')?.addEventListener('click', () => {
            f7.dialog.confirm("Deseja resetar toda a calculadora?", "Confirmação", performReset);
        });

        document.getElementById('calcWatts')?.addEventListener('click', () => {
            const volts = prompt("Informe a Voltagem (V):", "220");
            const amps = prompt("Informe a Amperagem de CADA aparelho (A):");
            if (volts && amps) {
                const v = parseFloat(volts);
                const a = parseFloat(amps);
                if (!isNaN(v) && !isNaN(a)) {
                    state.voltage = v;
                    state.fixturePower = v * a;
                    saveState();
                    render();
                }
            }
        });

        document.getElementById('calcBreaker')?.addEventListener('click', () => {
            const watts = prompt("Informe a potência de CADA aparelho (Watts):");
            if (watts) {
                const w = parseFloat(watts);
                if (!isNaN(w)) {
                    const volt = state.voltage || 220;
                    const maxWatts = 20 * volt;
                    const qty = Math.floor(maxWatts / w);
                    f7.dialog.alert(`Em um disjuntor de 20A (${maxWatts}W em ${volt}V), você pode ligar até ${qty} aparelhos de ${w}W cada.`, "Limite de Carga");
                }
            }
        });

        document.getElementById('clearParams')?.addEventListener('click', () => {
            f7.dialog.confirm("Remover todos os canais?", "Aviso", () => {
                state.fixtureParameters = {};
                state.paramsFixtureChannels = 0;
                saveState();
                render();
            });
        });

        document.getElementById('clearReportHistory')?.addEventListener('click', () => {
            f7.dialog.confirm("Limpar todo o histórico de patch?", "Aviso", () => {
                state.patchedUnits = [];
                saveState();
                render();
            });
        });

        // PDF Export Logic
        const exportPdfBtn = document.getElementById('exportPdf');
        if (exportPdfBtn) exportPdfBtn.onclick = () => exportReportPdf();

        const exportMaterialPdfBtn = document.getElementById('exportMaterialPdf');
        if (exportMaterialPdfBtn) exportMaterialPdfBtn.onclick = () => exportMaterialPdf();

        const exportParamsPdfBtn = document.getElementById('exportParamsPdf');
        if (exportParamsPdfBtn) exportParamsPdfBtn.onclick = () => exportParamsPdf();

        // WhatsApp Share Logic
        const shareWaBtn = document.getElementById('shareWa');
        if (shareWaBtn) shareWaBtn.onclick = () => shareViaWhatsApp(getReportText());

        const shareMaterialWaBtn = document.getElementById('shareMaterialWa');
        if (shareMaterialWaBtn) shareMaterialWaBtn.onclick = () => shareViaWhatsApp(document.getElementById('materialContent').innerText);

        const shareParamsWaBtn = document.getElementById('shareParamsWa');
        if (shareParamsWaBtn) shareParamsWaBtn.onclick = () => shareViaWhatsApp(getParamsText());
    }

    function getReportText() {
        let text = `*DMX MASTER PRO - REPORT*\n`;
        if (state.projectName) text += `Projeto: ${state.projectName}\n`;
        text += `Data: ${new Date().toLocaleDateString()}\n\n`;

        const batches = [...state.patchedUnits].reverse();
        batches.forEach(batch => {
            text += `*FIXTURE: ${batch.name.toUpperCase()}*\n`;
            let currentAddr = batch.address;
            let currentUni = batch.universe;
            for (let i = 0; i < batch.units; i++) {
                if (currentAddr + batch.channels - 1 > state.channelsPerUniverse) { currentAddr = 1; currentUni++; }
                text += `${batch.name.toUpperCase()} | Uni: ${currentUni} | Addr: ${currentAddr}\n`;
                currentAddr += batch.channels;
                if (currentAddr > state.channelsPerUniverse) { currentAddr -= state.channelsPerUniverse; currentUni++; }
            }
            text += `\n`;
        });
        return text;
    }

    function getParamsText() {
        let text = `*DMX MASTER PRO - PARÂMETROS*\n`;
        text += `Aparelho: ${state.paramsFixtureName || 'Aparelho'}\n\n`;
        for (let i = 1; i <= state.paramsFixtureChannels; i++) {
            text += `CH ${i.toString().padStart(2, '0')} | ${(state.fixtureParameters[i] || '---').toUpperCase()}\n`;
        }
        return text;
    }

    function shareViaWhatsApp(text) {
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    }

    function savePdf(doc, filename) {
        if (window.cordova) {
            const pdfBlob = doc.output('blob');
            const storageLocation = window.cordova.file.externalRootDirectory + "Download/";

            window.resolveLocalFileSystemURL(storageLocation, (dir) => {
                dir.getFile(filename, { create: true }, (fileEntry) => {
                    fileEntry.createWriter((fileWriter) => {
                        fileWriter.onwriteend = () => {
                            f7.dialog.alert('PDF salvo com sucesso em: ' + fileEntry.nativeURL, 'DMX Master Pro');
                            if (window.cordova.plugins && window.cordova.plugins.fileOpener2) {
                                window.cordova.plugins.fileOpener2.open(fileEntry.nativeURL, 'application/pdf', {
                                    error: (e) => console.error('Error opening file', e),
                                    success: () => console.log('File opened successfully')
                                });
                            }
                        };
                        fileWriter.onerror = (e) => {
                            f7.dialog.alert('Erro ao salvar PDF: ' + e.toString());
                        };
                        fileWriter.write(pdfBlob);
                    });
                });
            });
        } else {
            doc.save(filename);
        }
    }

    function exportReportPdf() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // 🔷 TÍTULO
        doc.setFontSize(18);
        doc.text("REPORT PARAMS", 14, 20);

        let rows = [];
        let globalId = 1;

        const batches = [...state.patchedUnits].reverse();

        batches.forEach(batch => {

            // 🔹 CABEÇALHO DO GRUPO (EX: BEM, WASH...)
            rows.push([{
                content: `${batch.name.toUpperCase()} (${batch.units}x)`,
                colSpan: 6,
                styles: {
                    fillColor: [220, 220, 220],
                    textColor: [0, 0, 0],
                    fontStyle: 'bold',
                    halign: 'center'
                }
            }]);

            let currentAddr = batch.address;
            let currentUni = batch.universe;

            for (let i = 0; i < batch.units; i++) {

                if (currentAddr + batch.channels - 1 > state.channelsPerUniverse) {
                    currentAddr = 1;
                    currentUni++;
                }

                rows.push([
                    currentUni,
                    globalId.toString().padStart(2, '0'),
                    batch.name.toUpperCase(),
                    `${currentUni}.${currentAddr.toString().padStart(3, '0')}`,
                    batch.channels,
                    `${batch.power || 0}W`
                ]);

                currentAddr += batch.channels;

                if (currentAddr > state.channelsPerUniverse) {
                    currentAddr -= state.channelsPerUniverse;
                    currentUni++;
                }

                globalId++;
            }
        });

        // 🔷 TABELA
        doc.autoTable({
            startY: 30,
            head: [['Uni', 'ID', 'Aparelho', 'Patch DMX', 'CH', 'Watts']],
            body: rows,
            theme: 'grid',

            headStyles: {
                fillColor: [41, 128, 185],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center'
            },
            styles: {
                fontSize: 9,
                cellPadding: 3,
                halign: 'center',
                textColor: [0, 0, 0], // 🔥 preto forte
            },


            columnStyles: {
                2: {
                    halign: 'left',
                    textColor: [0, 0, 0],
                    fontStyle: 'bold' // 🔥 BEAM mais destacado
                },
                5: { halign: 'right' }
            }

        });

        savePdf(doc, `report_${state.projectName || 'dmx'}.pdf`);
    }

    function exportMaterialPdf() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(0, 21, 41); // Dark blue
        doc.text("DMX MASTER PRO - RELATÓRIO", 14, 22);

        // --- SECTION 1: RELAÇÃO DE EQUIPAMENTOS ---
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("RELAÇÃO DE EQUIPAMENTOS", 14, 35);

        const equipRows = state.patchedUnits.map(u => [
            u.name.toUpperCase(),
            `${u.units}x ${u.power || 0}W`,
            `${(u.units * (u.power || 0))}W`
        ]);

        const volt = state.voltage || 220;
        const totalWatts = state.patchedUnits.reduce((acc, curr) => acc + (curr.power || 0) * curr.units, 0);
        const totalAmps = totalWatts / volt;

        let ext10m = 0;
        state.patchedUnits.forEach(u => {
            const p = u.power || 0;
            if (p <= 100) ext10m += Math.ceil(u.units / 10);
            else if (p < 400) ext10m += Math.ceil(u.units / 5);
            else ext10m += Math.ceil(u.units / 4);
        });

        doc.autoTable({
            startY: 40,
            head: [['Equipamento', 'Qtd x Pot', 'Total']],
            body: equipRows,
            theme: 'grid',
            headStyles: { fillColor: [239, 68, 68], fontSize: 11, fontStyle: 'bold', halign: 'center' }, // Red
            styles: { fontSize: 10, cellPadding: 3, textColor: [0, 0, 0] },
            columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' } },
            margin: { left: 14, right: 14 }
        });

        let finalY = doc.lastAutoTable.finalY;

        // Summary Table
        doc.autoTable({
            startY: finalY + 2,
            body: [
                ['Voltagem', `${volt}V`],
                ['Potência Total', `${totalWatts.toFixed(0)}W (${totalAmps.toFixed(1)}A)`],
                ['Alimentações (10M) Necessárias', `${ext10m}`]
            ],
            theme: 'grid',
            styles: { fontSize: 10, fontStyle: 'bold', cellPadding: 4 },
            columnStyles: { 0: { cellWidth: 120, fillColor: [245, 245, 245] }, 1: { halign: 'right' } },
            margin: { left: 14, right: 14 }
        });

        finalY = doc.lastAutoTable.finalY + 15;

        // --- SECTION 2: MATERIAL ---
        doc.setFontSize(14);
        doc.text("LISTA DE MATERIAL", 14, finalY);

        const totalUnits = state.patchedUnits.reduce((acc, curr) => acc + curr.units, 0);
        const ext5m = Math.ceil(totalUnits / 5);
        const ext2m = Math.max(0, totalUnits - ext10m);

        let sin10m = 0;
        let sin5m = 0;
        state.patchedUnits.forEach(u => {
            const qty10m = Math.ceil(u.units / 8);
            sin10m += qty10m;
            sin5m += (u.units - qty10m);
        });
        const sin2m = Math.floor(sin5m / 5) * 2;
        const maxUniverse = Math.max(...state.patchedUnits.map(u => u.universe), 1);
        const artNetQty = Math.ceil(maxUniverse / 8);
        const redeQty = artNetQty;
        const paraleloQty = state.patchedUnits.reduce((acc, curr) => acc + Math.max(0, curr.units - 1), 0);

        const materialRows = [
            ['Extensão 2M / Uni', ext2m],
            ['Extensão 5M / Uni', ext5m],
            ['Extensão 10M / Uni', ext10m],
            ['Sinal 2M / Uni', sin2m],
            ['Sinal 5M / Uni', sin5m],
            ['Sinal 10M / Uni', sin10m],
            ['Paralela / Uni', paraleloQty],
            ['Art-net (8 Uni)', artNetQty],
            ['Cabo de Rede', redeQty]
        ];

        doc.autoTable({
            startY: finalY + 5,
            head: [['Material', 'Quantidade']],
            body: materialRows,
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246], fontSize: 11, fontStyle: 'bold', halign: 'center' }, // Blue
            styles: { fontSize: 10, cellPadding: 3, textColor: [0, 0, 0] },
            columnStyles: { 1: { halign: 'center', cellWidth: 40 } },
            margin: { left: 14, right: 14 }
        });

        finalY = doc.lastAutoTable.finalY + 15;

        // --- SECTION 4: DETALHAMENTO DO PATCH ---
        doc.addPage();
        doc.setFontSize(18);
        doc.setTextColor(0, 21, 41);
        doc.text("DETALHAMENTO DO PATCH", 14, 22);

        const patchRows = [];
        const batches = [...state.patchedUnits].reverse();
        let globalId = 1;

        batches.forEach(batch => {
            // Group Header Row
            patchRows.push([{
                content: `${batch.name.toUpperCase()} (${batch.units}x)`,
                colSpan: 6,
                styles: { fontStyle: 'bold', fillColor: [230, 235, 245], textColor: [0, 0, 0], fontSize: 10 }
            }]);

            let currentAddr = batch.address;
            let currentUni = batch.universe;
            for (let i = 0; i < batch.units; i++) {
                if (currentAddr + batch.channels - 1 > state.channelsPerUniverse) { currentAddr = 1; currentUni++; }

                patchRows.push([
                    currentUni.toString(),
                    globalId.toString().padStart(2, '0'),
                    batch.name.toUpperCase(),
                    `${currentUni}.${currentAddr.toString().padStart(3, '0')}`,
                    batch.channels.toString(),
                    `${batch.power || 0}W`
                ]);

                currentAddr += batch.channels;
                if (currentAddr > state.channelsPerUniverse) { currentAddr -= state.channelsPerUniverse; currentUni++; }
                globalId++;
            }
        });

        doc.autoTable({
            startY: 30,
            head: [['Uni', 'ID', 'Aparelho', 'Patch DMX', 'CH', 'Watts']],
            body: patchRows,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185], fontSize: 10, fontStyle: 'bold', halign: 'center' }, // Blueish
            styles: { fontSize: 9, cellPadding: 2.5, textColor: [0, 0, 0] },
            columnStyles: {
                0: { halign: 'center' },
                1: { halign: 'center' },
                3: { halign: 'center', fontStyle: 'bold' },
                4: { halign: 'center' },
                5: { halign: 'right' }
            },
            margin: { left: 14, right: 14 }
        });

        savePdf(doc, `relatorio_${state.projectName || 'dmx'}.pdf`);
    }

    function exportParamsPdf() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text(`LIBRARY: ${state.paramsFixtureName || 'FIXTURE'}`, 14, 22);
        const rows = [];
        for (let i = 1; i <= state.paramsFixtureChannels; i++) {
            rows.push([`CH ${i}`, (state.fixtureParameters[i] || '---').toUpperCase()]);
        }
        doc.autoTable({
            startY: 30,
            head: [['Canal', 'Parâmetro']],
            body: rows,
            theme: 'striped',
            headStyles: { fillColor: [0, 122, 255] }
        });
        savePdf(doc, `library_${state.paramsFixtureName || 'fixture'}.pdf`);
    }

    // Start App
    document.addEventListener('deviceready', () => {
        init();
        checkUpdate();


        // Handle Android Back Button
        document.addEventListener('backbutton', (e) => {
            const openModal = document.querySelector('.modal-in');
            if (openModal) {
                f7.dialog.close();
                f7.popover.close();
                f7.sheet.close();
                f7.popup.close();
                e.preventDefault();
                return;
            }

            if (state.currentView !== 'dashboard') {
                state.currentView = 'dashboard';
                render();
                e.preventDefault();
            } else {
                f7.dialog.confirm('Deseja sair do aplicativo?', 'Sair', () => {
                    if (navigator.app) {
                        navigator.app.exitApp();
                    }
                });
                e.preventDefault();
            }
        }, false);
    }, false);

    requestAnimationFrame(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) splash.style.display = 'none';
    });
    // Fallback for browser testing if deviceready doesn't fire
    document.addEventListener('DOMContentLoaded', () => {
        if (!mainView) init();

    });

})();
