// --- ФИНАЛЬНЫЙ РАБОЧИЙ КОД (v7.4 - Исправлено двойное закрытие окна) ---

const MODULE_ID = "pf2e-ts-adv-aoa";
const JOURNAL_NAME = "Исследование Муанги";
const TEMPLATE_PATH = `modules/${MODULE_ID}/templates/mwangi-hexploration.html`;
const EDITOR_TEMPLATE_PATH = `modules/${MODULE_ID}/templates/activity-editor.html`;
const SETTING_KEY = "hexplorationStateMwangi";
const SKILL_SETTING_KEY = "customActivitySkills";
const SOCKET_ID = `module.${MODULE_ID}`;

// --- HTML ШАБЛОНЫ ---
const resultsAppTemplateString = `
<div class="dialog-content">
    <div id="results-content" style="max-height: 60vh; overflow-y: auto; margin-bottom: 10px;">{{{resultsHtml}}}</div>
    <footer class="dialog-buttons">
        <button type="button" id="copy-results-button"><i class="fas fa-copy"></i> Копировать в буфер</button>
        <button type="button" data-action="close"><i class="fas fa-times"></i> Закрыть</button>
    </footer>
</div>
`;

const afflictionSavesAppTemplateString = `
<div class="dialog-content">
    <p>По результатам активностей требуются спасброски от недуга. Ниже представлен промежуточный отчет.</p>
    <p>Нажмите кнопку ниже, чтобы начать процесс спасбросков для всех участников.</p>
    <hr>
    <div id="interim-results-content" style="max-height: 50vh; overflow-y: auto; margin-bottom: 10px;">{{{interimReportHtml}}}</div>
    <footer class="dialog-buttons">
        <button type="button" id="start-saves-button"><i class="fas fa-shield-alt"></i> Начать спасброски</button>
    </footer>
</div>
`;

// --- НАЧАЛЬНОЕ СОСТОЯНИЕ И СТАТИЧЕСКИЕ ДАННЫЕ ---
function getDefaultState() { return { playerData: {}, gmDCs: { affliction: 10, encounter: 10, terrain: 10 }, afflictionSaveType: "fortitude", afflictionTraits: [], afflictionLoaded: false, loadedAfflictionName: "", loadedAfflictionImage: "", consumableLootTableId: null, consumableLootTableName: "", permanentLootTableId: null, permanentLootTableName: "", encounterTableId: null, encounterTableName: "", campEncounterTableId: null, campEncounterTableName: "" }; }
const STATIC_DATA = { 
    activityLabels: { "Выслеживание": "Выслеживание", "Проживание": "Проживание", "Противодействие недугу": "Противодействие недугу", "Искать": "Искать", "Избегать Обнаружения": "Избегать Обнаружения", "Исследование": "Исследование", "Отдых": "Отдых" }, 
    defaultSkills: { 
        "Выслеживание": ["survival", "scouting-lore", "jungle-lore"], 
        "Проживание": ["survival", "nature", "warfare-lore", "crafting"], 
        "Противодействие недугу": ["medicine", "arcana", "nature", "occultism", "religion", "crafting", "esoteric-lore", "mwangi-lore"], 
        "Искать": ["perception", "scouting-lore", "jungle-lore"], 
        "Избегать Обнаружения": ["stealth", "jungle-lore", "scouting-lore", "intimidation"], 
        "Исследование": ["nature", "society", "mwangi-lore"], 
        "Отдых": [] 
    }, 
    customSkillLabels: { "perception": "Восприятие", "scouting-lore": "Знание: Разведка", "jungle-lore": "Знание: Джунгли", "warfare-lore": "Знание: Военное дело", "mwangi-lore": "Знание: Муанги", "esoteric-lore": "Эзотерические знания" }, 
    activityHelp: { "Выслеживание": `<strong>Крит.Успех:</strong> КС Столкновения -2, КС Местности -1.<br><strong>Успех:</strong> КС Столкновения -1.<br><strong>Провал:</strong> КС Столкновения +1.<br><strong>Крит.Провал:</strong> КС Столкновения +2.`, "Проживание": `<strong>Крит.Успех:</strong> КС Местности -1, КС Столкновения -1.<br><strong>Успех:</strong> КС Местности -1.<br><strong>Провал:</strong> Спасбросок против недуга.<br><strong>Крит.Провал:</strong> Спасбросок против недуга, КС Недуга +1.`, "Противодействие недугу": `<strong>Крит.Успех:</strong> КС Недуга -4.<br><strong>Успех:</strong> КС Недуга -2.<br><strong>Провал:</strong> Нет эффекта.<br><strong>Крит.Провал:</strong> КС Недуга +2.`, "Искать": `<strong>Чистая 20:</strong> Постоянный предмет (ур. -4) или бросок по таблице.<br><strong>Крит.Успех:</strong> 2 расходуемых предмета (ур. -4) или 2 броска по таблице.<br><strong>Успех:</strong> 1 расходуемый предмет (ур. -4) или бросок по таблице.<br><strong>Провал:</strong> Ничего.<br><strong>Крит.Провал:</strong> КС Столкновения +1.`, "Избегать Обнаружения": `<strong>Крит.Успех:</strong> КС Столкновения -2, КС Местности -1.<br><strong>Успех:</strong> КС Столкновения -1.<br><strong>Провал:</strong> КС Столкновения +1.<br><strong>Крит.Провал:</strong> КС Столкновения +2.`, "Исследование": `<strong>Крит.Успех:</strong> Вы получаете факт, КС Столкновения -1.<br><strong>Успех:</strong> Вы получаете факт.<br><strong>Провал:</strong> Вы не получаете факт.<br><strong>Крит.Провал:</strong> Вы не получаете факт, КС Столкновения +1.`, "Отдых": "Персонаж отдыхает. Участвует в спасброске от недуга, если он требуется." } 
};
const SYSTEM_ACTIONS = { "Выслеживание": "track", "Проживание": "subsist", "Искать": "search", "Избегать Обнаружения": "avoid-notice", "Исследование": "recall-knowledge", "Противодействие недугу": { "medicine": "treat-disease", "crafting": "repair", "arcana": "identify-magic", "nature": "identify-magic", "occultism": "identify-magic", "religion": "identify-magic", "default": "recall-knowledge" } };
const ACTION_TRAITS = { "track": ["concentrate", "move"], "subsist": ["concentrate", "exploration"], "search": ["concentrate", "manipulate"], "avoid-notice": ["concentrate", "exploration"], "recall-knowledge": ["concentrate", "secret"], "treat-disease": ["manipulate", "concentrate"], "repair": ["manipulate", "concentrate"], "identify-magic": ["concentrate", "exploration", "secret"] };

function getSkillLabel(skillKey) { if (STATIC_DATA.customSkillLabels[skillKey]) { return STATIC_DATA.customSkillLabels[skillKey]; } const locKey = CONFIG.PF2E.skills[skillKey]?.label || CONFIG.PF2E.abilities[skillKey]?.label; return locKey ? game.i18n.localize(locKey) : skillKey; }
if (typeof window.MwangiHexplorationAppInstance === 'undefined') { window.MwangiHexplorationAppInstance = null; }

function getActivitySkills() {
    const customSkills = game.settings.get(MODULE_ID, SKILL_SETTING_KEY);
    if (Object.keys(customSkills).length > 0) {
        return customSkills;
    }
    return STATIC_DATA.defaultSkills;
}

class ActivityEditorApp extends FormApplication {
    constructor(object = {}, options = {}) {
        super(object, options);
        this.editedSkills = foundry.utils.deepClone(getActivitySkills());
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "mwangi-activity-editor",
            title: game.i18n.localize("MHE.Settings.Editor.Name"),
            template: EDITOR_TEMPLATE_PATH,
            width: 600,
            height: "auto",
            resizable: true,
            classes: ["pf2e", "dialog"],
            closeOnSubmit: true
        });
    }

    getData() {
        const activities = Object.entries(STATIC_DATA.activityLabels).map(([key, label]) => ({
            key,
            label,
            skills: this.editedSkills[key] || []
        }));
        return { activities };
    }

    activateListeners(html) {
        super.activateListeners(html);
        html.on('click', '.delete-skill', this._onDeleteSkill.bind(this));
        html.on('click', '.add-skill', this._onAddSkill.bind(this));
        html.on('click', '.reset-defaults', this._onResetDefaults.bind(this));
    }

    _onDeleteSkill(event) {
        const { activityKey, skill } = event.currentTarget.dataset;
        const skills = this.editedSkills[activityKey] || [];
        const index = skills.indexOf(skill);
        if (index > -1) {
            skills.splice(index, 1);
        }
        this.render();
    }

    _onAddSkill(event) {
        const { activityKey } = event.currentTarget.dataset;
        const input = this.element.find(`input[name="add-${activityKey}"]`);
        const newSkill = input.val().trim().toLowerCase();
        if (newSkill) {
            const skills = this.editedSkills[activityKey] || [];
            if (!skills.includes(newSkill)) {
                skills.push(newSkill);
                this.editedSkills[activityKey] = skills;
            }
            input.val("");
        }
        this.render();
    }

    async _onResetDefaults(event) {
        const confirmed = await Dialog.confirm({
            title: "Сбросить настройки?",
            content: "<p>Вы уверены, что хотите сбросить все навыки активностей к значениям по умолчанию?</p>",
            yes: () => true,
            no: () => false,
            defaultYes: false
        });
        if (confirmed) {
            this.editedSkills = foundry.utils.deepClone(STATIC_DATA.defaultSkills);
            this.render();
        }
    }

    async _updateObject(event, formData) {
        await game.settings.set(MODULE_ID, SKILL_SETTING_KEY, this.editedSkills);
        ui.notifications.info("Настройки активностей сохранены.");
    }
}

class MwangiHexplorationApp extends Application {
    constructor(options = {}) {
        super(options);
        this.rollRequests = {};
        this.activitySkills = getActivitySkills();
    }
    
    static get defaultOptions() { return foundry.utils.mergeObject(super.defaultOptions, { id: "mwangi-hexploration-app-instance", title: "Исследование Просторов Муанги", template: TEMPLATE_PATH, width: 820, height: "auto", resizable: true, classes: ["pf2e", "dialog", "mwangi-hexploration-dialog"], dragDrop: [{ dropSelector: ".item-drop-slot" }] }); }

    _handlePlayerAction(actorId, changes) {
        if (changes.activity) {
            const newActivity = changes.activity;
            const availableSkills = this.activitySkills[newActivity] || [];
            changes.selectedSkill = availableSkills[0] || null;
        }
        if (game.user.isGM) {
            this._updateStateByGM(state => { if (state.playerData[actorId]) { Object.assign(state.playerData[actorId], changes); } });
        } else {
            game.socket.emit(SOCKET_ID, { type: "requestStateChange", payload: { actorId, changes } });
        }
    }
    
    async getData() {
        const state = foundry.utils.deepClone(game.settings.get(MODULE_ID, SETTING_KEY));
        let needsUpdate = false;
        const party = game.actors.party;
        if (!party) { ui.notifications.error("Ошибка: Группа (party) не найдена!"); return { isGM: game.user.isGM, templatePlayerData: [] }; }
        const partyMembers = party.members.filter(m => m?.type === 'character');
        const currentPartyIds = new Set(partyMembers.map(m => m.id));
        const statePlayerIds = new Set(Object.keys(state.playerData));
        for (const id of statePlayerIds) { if (!currentPartyIds.has(id)) { delete state.playerData[id]; needsUpdate = true; } }
        const templatePlayerData = partyMembers.map(actor => {
            if (!actor) return null;
            const isControllable = actor.isOwner || game.user.isGM;
            let pData = state.playerData[actor.id];
            if (!pData) { pData = { actorId: actor.id, activity: Object.keys(STATIC_DATA.activityLabels)[0], confirmed: false, selectedSkill: null }; state.playerData[actor.id] = pData; needsUpdate = true; }
            const availableSkills = this.activitySkills[pData.activity] || [];
            if (!pData.selectedSkill || !availableSkills.includes(pData.selectedSkill)) { pData.selectedSkill = availableSkills[0] || null; if (needsUpdate) state.playerData[actor.id].selectedSkill = pData.selectedSkill; }
            const skillOptions = availableSkills.map(key => ({ key: key, label: getSkillLabel(key) }));
            let skillBonus = null;
            let hasUntrainedLore = false;
            if (pData.selectedSkill) { if (pData.selectedSkill === 'perception') { skillBonus = actor.perception.mod; } else { const skill = actor.skills[pData.selectedSkill]; if (skill) { skillBonus = skill.mod; } else if (pData.selectedSkill.includes('-lore')) { hasUntrainedLore = true; skillBonus = actor.abilities.int.mod; } } }
            return { ...pData, characterName: actor.name, characterImage: actor.img || CONST.DEFAULT_TOKEN, isControllable, skillOptions, skillLabel: pData.selectedSkill ? getSkillLabel(pData.selectedSkill) : null, skillBonus, hasUntrainedLore, activityHelpText: STATIC_DATA.activityHelp[pData.activity] || "" };
        }).filter(Boolean);
        if (game.user.isGM && needsUpdate) { setTimeout(() => this._updateStateByGM(newState => { newState.playerData = state.playerData; }), 0); }
        return { ...state, ...STATIC_DATA, isGM: game.user.isGM, templatePlayerData, allPlayersConfirmed: templatePlayerData.length > 0 && templatePlayerData.every(p => p.confirmed) };
    }

    async _updateStateByGM(updateFn) { const currentState = game.settings.get(MODULE_ID, SETTING_KEY); const newState = foundry.utils.deepClone(currentState); updateFn(newState); await game.settings.set(MODULE_ID, SETTING_KEY, newState); }
    activateListeners(html) {
        super.activateListeners(html);
        html.find('.player-confirm-button').click(event => { const target = $(event.currentTarget); if (target.is(':disabled')) return; const actorId = target.data('actorId'); const isConfirmed = target.find('i').hasClass('fa-check-circle'); this._handlePlayerAction(actorId, { confirmed: !isConfirmed }); });
        html.find('.player-activity-select').change(event => { const target = $(event.currentTarget); if (target.is(':disabled')) return; const actorId = target.data('actorId'); const newActivity = target.val(); this._handlePlayerAction(actorId, { activity: newActivity, confirmed: false }); });
        html.find('.player-skill-select').change(event => { const target = $(event.currentTarget); if (target.is(':disabled')) return; const actorId = target.data('actorId'); const newSkill = target.val(); this._handlePlayerAction(actorId, { selectedSkill: newSkill, confirmed: false }); });
        if (game.user.isGM) {
            html.find('.gm-dc-input').change(event => { const dcType = $(event.currentTarget).data('dcType'); const value = parseInt($(event.currentTarget).val()) || 10; this._updateStateByGM(state => { state.gmDCs[dcType] = value; }); });
            html.find('input[name="afflictionSaveType"]').change(event => { const value = event.currentTarget.value; this._updateStateByGM(state => { state.afflictionSaveType = value; }); });
            html.find('#travel-commit-button').click(() => this.processTravel());
            html.find('#reset-state-button').click(async () => { await Dialog.confirm({ title: "Сброс состояния", content: "<p>Вы уверены, что хотите сбросить все выборы игроков и настройки Мастера в этом окне?</p>", yes: async () => { await game.settings.set(MODULE_ID, SETTING_KEY, getDefaultState()); ui.notifications.info("Состояние исследования сброшено."); }, no: () => { }, defaultYes: false }); });
        }
    }
    async _onDrop(event) {
        if (!game.user.isGM) return;
        const dropTarget = $(event.target).closest('.item-drop-slot');
        if (!dropTarget.length) return;
        const slotId = dropTarget.attr('id');
        try {
            const data = JSON.parse(event.dataTransfer.getData('text/plain'));
            const item = await fromUuid(data.uuid);
            if (!item) return;
            if (slotId === 'hexploration-gm-affliction-slot') {
                const description = item.system.description?.value || "";
                const dcMatch = description.match(/@Check\[(?:type:)?(fortitude|reflex|will)\|dc:\s*(\d+)\s*.*?\]/i);
                this._updateStateByGM(state => { if (dcMatch && dcMatch[1] && dcMatch[2]) { state.afflictionSaveType = dcMatch[1]; state.gmDCs.affliction = parseInt(dcMatch[2]); } state.afflictionTraits = item.system.traits?.value || []; state.afflictionLoaded = true; state.loadedAfflictionName = item.name; state.loadedAfflictionImage = item.img || CONST.DEFAULT_TOKEN; });
                ui.notifications.info(`Предмет "${item.name}" загружен как недуг.`);
            } else if (item instanceof RollTable) {
                this._updateStateByGM(state => { 
                    if (slotId === 'hexploration-gm-consumable-table-slot') { state.consumableLootTableId = item.id; state.consumableLootTableName = item.name; } 
                    else if (slotId === 'hexploration-gm-permanent-table-slot') { state.permanentLootTableId = item.id; state.permanentLootTableName = item.name; } 
                    else if (slotId === 'hexploration-gm-encounter-table-slot') { state.encounterTableId = item.id; state.encounterTableName = item.name; } 
                    else if (slotId === 'hexploration-gm-camp-encounter-table-slot') { state.campEncounterTableId = item.id; state.campEncounterTableName = item.name; } 
                });
                ui.notifications.info(`Таблица "${item.name}" загружена.`);
            } else {
                ui.notifications.warn("В этот слот можно перетаскивать только Таблицы (RollTable) или Предметы (для слота Недуг).");
            }
        } catch (e) { console.error("Ошибка при обработке перетащенного объекта:", e); }
    }
    async requestRollViaSocket(payload) { return new Promise((resolve, reject) => { const requestId = foundry.utils.randomID(); payload.requestId = requestId; const timeout = setTimeout(() => { delete this.rollRequests[requestId]; ui.notifications.warn(`Игрок ${payload.targetUserName} не ответил на запрос броска вовремя.`); reject(new Error("Roll request timed out")); }, 30000); this.rollRequests[requestId] = { resolve, reject, timeout }; ui.notifications.info(`Отправка запроса на бросок игроку ${payload.targetUserName}...`); game.socket.emit(SOCKET_ID, { type: "requestRoll", payload }); }); }
    async _saveReportToJournalAndShow(html) { try { let journal = game.journal.getName(JOURNAL_NAME); if (!journal) { journal = await JournalEntry.create({ name: JOURNAL_NAME, folder: null, content: `<p>Этот журнал содержит отчеты об исследовании Просторов Муанги.</p>` }); ui.notifications.info(`Создан журнал "${JOURNAL_NAME}".`); } const pages = journal.pages.contents; const dayNumbers = pages.map(p => { const match = p.name.match(/^День (\d+)/i); return match ? parseInt(match[1]) : 0; }); const nextDayNumber = (dayNumbers.length > 0 ? Math.max(...dayNumbers) : 0) + 1; const pageName = `День ${nextDayNumber} - ${new Date().toLocaleString('ru')}`; await JournalEntryPage.createDocuments([{ name: pageName, type: "text", text: { content: html, format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML }, sort: Date.now() }], { parent: journal }); ui.notifications.info(`Создана запись "${pageName}" в журнале "${JOURNAL_NAME}".`); } catch (error) { console.error("Ошибка при создании записи в журнале:", error); ui.notifications.error("Не удалось создать запись в журнале."); } const reportData = { html: html, title: "Результаты Исследования" }; game.socket.emit(SOCKET_ID, { type: "showResults", payload: reportData }); new MwangiHexplorationResultsApp(reportData).render(true); }
    async performRoll(rollParameters) {
        const { actor, dc, rollType, statistic, traits, title } = rollParameters;
        const playerOwner = game.users.find(u => u.active && !u.isGM && actor.testUserPermission(u, "OWNER"));
        let rollJSON;
        if (playerOwner) {
            try { rollJSON = await this.requestRollViaSocket({ targetUserId: playerOwner.id, targetUserName: playerOwner.name, actorId: actor.id, rollType, statistic, dc, traits, title }); }
            catch (e) { console.error(e); return { roll: null, d20Result: 0 }; }
        } else {
            ui.notifications.info(`Игрок для ${actor.name} оффлайн. Бросок у Мастера.`);
            let statisticObj;
            if (rollType === 'skill') { statisticObj = (statistic === 'perception') ? actor.perception : actor.skills[statistic]; }
            else { statisticObj = actor.saves[statistic]; }
            if (!statisticObj) { ui.notifications.error(`Не найдена статистика для броска у ${actor.name}`); return { roll: null, d20Result: 0 }; }
            const roll = await statisticObj.roll({ dc: { value: dc }, traits, title, skipDialog: false });
            if (!roll) return { roll: null, d20Result: 0 };
            rollJSON = roll.toJSON();
        }
        if (!rollJSON) return { roll: null, d20Result: 0 };
        const finalRoll = Roll.fromData(rollJSON);
        const d20Result = finalRoll.dice[0]?.results[0]?.result ?? 0;
        return { roll: finalRoll, d20Result };
    }
    async executeAfflictionSaves(saveData) {
        const { dc, saveType, traits, title, players, interimReportHtml, iconStyle } = saveData;
        let finalReportHtml = interimReportHtml;
        const saveName = game.i18n.localize(CONFIG.PF2E.saves[saveType]?.label ?? saveType);
        let afflictionSectionHtml = `<h3>Фаза 5: Спасброски от Недуга (КС ${dc}, ${saveName})</h3>`;
        afflictionSectionHtml += `<table class="pf2-table report-table"><tr><th>Персонаж</th><th>Спасбросок (${saveName})</th><th>Результат</th><th>Заметки</th></tr>`;
        ui.notifications.info("Этап 2: Запрос спасбросков от недуга...");
        for (const playerData of players) {
            const actor = game.actors.get(playerData.actorId);
            if (!actor) continue;
            const { roll } = await this.performRoll({ actor, dc, rollType: 'save', statistic: saveType, traits, title: `${title} - ${actor.name}` });
            if (!roll) continue;
            afflictionSectionHtml += `<tr><td><img src="${actor.img}" class="actor-token-img" title="${actor.name}" style="${iconStyle}"></td><td>${roll.total}</td><td class="${this.getDegreeClass(roll)}">${this.getDegreeLabel(roll)}</td><td>Признаки: ${traits.join(", ") || "нет"}</td></tr>`;
        }
        afflictionSectionHtml += `</table>`;
        finalReportHtml += afflictionSectionHtml;
        await this._saveReportToJournalAndShow(finalReportHtml);
    }
    getDegreeLabel(roll) {
        if (roll.outcome) { const localizedLabel = game.i18n.localize(`PF2E.Check.Result.Degree.Attack.${roll.outcome}`); if (localizedLabel && !localizedLabel.startsWith('PF2E.')) return localizedLabel; }
        switch (roll.degreeOfSuccess) { case 3: return 'Критический Успех'; case 2: return 'Успех'; case 1: return 'Провал'; case 0: return 'Критический Провал'; default: return 'Неизвестно'; }
    }
    getDegreeClass(roll) {
        if (roll.outcome) return roll.outcome.toLowerCase();
        switch (roll.degreeOfSuccess) { case 3: return 'criticalsuccess'; case 2: return 'success'; case 1: return 'failure'; case 0: return 'criticalfailure'; default: return 'unknown'; }
    }
    async processTravel() {
        if (!game.user.isGM) { ui.notifications.error("Только Мастер может запустить обработку путешествия."); return; }
        const state = game.settings.get(MODULE_ID, SETTING_KEY);
        ui.notifications.info("Этап 1: Обработка активностей...");
        this.close();

        const iconInlineStyle = "max-width: 36px; max-height: 36px; border: none; margin-right: 8px; vertical-align: middle;";
        const tableStyles = `.report-table .actor-token-img { ${iconInlineStyle} } .report-table .criticalsuccess { color: green; font-weight: bold; } .report-table .success { color: darkgreen; } .report-table .failure { color: orange; } .report-table .criticalfailure { color: red; font-weight: bold; } .report-table .unknown { color: grey; }`;
        let reportHtml = `<h2 style="font-family: 'Modesto Condensed', 'Palatino Linotype', serif; color: #562818; text-align: center;">Результаты Исследования</h2><style>${tableStyles}</style>`;
        
        const initialTerrainDC = state.gmDCs.terrain, initialEncounterDC = state.gmDCs.encounter, initialAfflictionDC = state.gmDCs.affliction;
        let finalEncounterDC = initialEncounterDC, finalAfflictionDC = initialAfflictionDC;
        let terrainDC_modifier_from_phase1 = 0, encounterDC_modifier_from_phase1 = 0, terrainDC_modifier_from_phase2 = 0;
        const phase1ActivityLogs = [], phase2ActivityLogs = [], phase3ActivityLogs = [];
        let requireAfflictionSaves = false, subsistActivityPerformed = false;

        const buildTableHtml = (logs, title) => { if (logs.length === 0) return ""; let html = `<h4>${title}</h4><table class="pf2-table report-table"><tr><th>Персонаж</th><th>Действие</th><th>Бросок</th><th>Результат</th><th>Заметки</th></tr>`; logs.sort((a, b) => a.characterName.localeCompare(b.characterName)).forEach(log => { html += `<tr><td><img src="${log.actorImage}" class="actor-token-img" title="${log.characterName}" style="${iconInlineStyle}"></td><td>${log.activity}</td><td>${log.rollTotal}</td><td class="${log.degreeClass}">${log.degreeLabel}</td><td>${log.notes}</td></tr>`; }); return html + `</table>`; };
        const confirmedPlayers = Object.values(state.playerData).filter(p => p.confirmed).map(pData => ({ actor: game.actors.get(pData.actorId), pData })).filter(item => item.actor);
        
        reportHtml += `<p><strong>Начальные КС:</strong> Местность ${initialTerrainDC}, Столкновение ${initialEncounterDC}, Недуг ${initialAfflictionDC}</p>`;
        if (state.afflictionTraits.length > 0) { reportHtml += `<p><strong>Признаки для спасброска от недуга:</strong> ${state.afflictionTraits.join(", ")}</p>`; }

        for (const { actor, pData } of confirmedPlayers.filter(a => a.pData.activity === "Выслеживание" || a.pData.activity === "Избегать Обнаружения")) {
            const actionSlug = SYSTEM_ACTIONS[pData.activity];
            const { roll } = await this.performRoll({ actor, dc: initialTerrainDC, rollType: 'skill', statistic: pData.selectedSkill, traits: ACTION_TRAITS[actionSlug] || [], title: `${pData.activity} (${getSkillLabel(pData.selectedSkill)})` });
            if (!roll) continue;
            const effects = [];
            if (roll.degreeOfSuccess === 3) { encounterDC_modifier_from_phase1 -= 2; effects.push("КС Столкновения -2"); terrainDC_modifier_from_phase1 -= 1; effects.push("КС Местности -1"); }
            else if (roll.degreeOfSuccess === 2) { encounterDC_modifier_from_phase1 -= 1; effects.push("КС Столкновения -1"); }
            else if (roll.degreeOfSuccess === 1) { encounterDC_modifier_from_phase1 += 1; effects.push("КС Столкновения +1"); }
            else { encounterDC_modifier_from_phase1 += 2; effects.push("КС Столкновения +2"); }
            phase1ActivityLogs.push({ actorImage: actor.img, characterName: actor.name, activity: pData.activity, rollTotal: roll.total, degreeLabel: this.getDegreeLabel(roll), degreeClass: this.getDegreeClass(roll), notes: `(${getSkillLabel(pData.selectedSkill)}) против КС ${initialTerrainDC}. Эффекты: ${effects.join(", ") || "нет"}` });
        }
        finalEncounterDC += encounterDC_modifier_from_phase1;
        const finalTerrainDC_after_phase1 = initialTerrainDC + terrainDC_modifier_from_phase1;

        for (const { actor, pData } of confirmedPlayers.filter(a => a.pData.activity === "Проживание")) {
            subsistActivityPerformed = true;
            const { roll } = await this.performRoll({ actor, dc: finalTerrainDC_after_phase1, rollType: 'skill', statistic: pData.selectedSkill, traits: ACTION_TRAITS["subsist"] || [], title: `${pData.activity} (${getSkillLabel(pData.selectedSkill)})` });
            if (!roll) continue;
            const effects = [];
            if (roll.degreeOfSuccess === 3) { terrainDC_modifier_from_phase2 -= 1; effects.push("КС Местности -1"); finalEncounterDC -= 1; effects.push("КС Столкновения -1"); }
            else if (roll.degreeOfSuccess === 2) { terrainDC_modifier_from_phase2 -= 1; effects.push("КС Местности -1"); }
            else if (roll.degreeOfSuccess === 1) { requireAfflictionSaves = true; effects.push("Требуется спасбросок от недуга"); }
            else { requireAfflictionSaves = true; effects.push("Требуется спасбросок от недуга"); finalAfflictionDC += 1; effects.push("КС Недуга +1"); }
            phase2ActivityLogs.push({ actorImage: actor.img, characterName: actor.name, activity: pData.activity, rollTotal: roll.total, degreeLabel: this.getDegreeLabel(roll), degreeClass: this.getDegreeClass(roll), notes: `(${getSkillLabel(pData.selectedSkill)}) против КС Местности (скорр. Фаза 1) ${finalTerrainDC_after_phase1}. Эффекты: ${effects.join(", ") || "нет"}` });
        }
        for (const { actor, pData } of confirmedPlayers.filter(a => a.pData.activity === "Противодействие недугу")) {
            const actionData = SYSTEM_ACTIONS[pData.activity];
            const actionSlug = (typeof actionData === 'object') ? (actionData[pData.selectedSkill] || actionData.default) : actionData;
            const { roll } = await this.performRoll({ actor, dc: initialAfflictionDC, rollType: 'skill', statistic: pData.selectedSkill, traits: ACTION_TRAITS[actionSlug] || [], title: `${pData.activity} (${getSkillLabel(pData.selectedSkill)})` });
            if (!roll) continue;
            const effects = [];
            if (roll.degreeOfSuccess === 3) { finalAfflictionDC -= 4; effects.push("КС Недуга -4"); }
            else if (roll.degreeOfSuccess === 2) { finalAfflictionDC -= 2; effects.push("КС Недуга -2"); }
            else if (roll.degreeOfSuccess === 0) { finalAfflictionDC += 2; effects.push("КС Недуга +2"); }
            phase2ActivityLogs.push({ actorImage: actor.img, characterName: actor.name, activity: pData.activity, rollTotal: roll.total, degreeLabel: this.getDegreeLabel(roll), degreeClass: this.getDegreeClass(roll), notes: `(${getSkillLabel(pData.selectedSkill)}) против КС Недуга (начальный) ${initialAfflictionDC}. Эффекты: ${effects.join(", ") || "нет"}` });
        }
        if (!subsistActivityPerformed && confirmedPlayers.some(p => p.pData.activity !== "Отдых")) { requireAfflictionSaves = true; }
        const finalTerrainDC_for_phase3 = finalTerrainDC_after_phase1 + terrainDC_modifier_from_phase2;

        for (const { actor, pData } of confirmedPlayers.filter(a => a.pData.activity === "Искать")) {
            const { roll, d20Result } = await this.performRoll({ actor, dc: finalTerrainDC_for_phase3, rollType: 'skill', statistic: pData.selectedSkill, traits: ACTION_TRAITS["search"] || [], title: `${pData.activity} (${getSkillLabel(pData.selectedSkill)})` });
            if (!roll) continue;
            let effects = [], resultMessage = "";
            const itemLevel = Math.max(1, actor.level - 4);
            if (d20Result === 20) { resultMessage = `<strong>Чистая 20!</strong> `; if (state.permanentLootTableId) { const table = game.tables.get(state.permanentLootTableId); if (table) { const draw = await table.draw({ roll: true, displayChat: true }); resultMessage += `Найден предмет по таблице "${table.name}": ${draw.results[0]?.text || 'пусто'}`; } else { resultMessage += `Постоянный предмет (уровень ${itemLevel}), но таблица не найдена.`; } } else { resultMessage += `Постоянный предмет (уровень ${itemLevel}). Таблица не установлена.`; } }
            else if (roll.degreeOfSuccess === 3) { resultMessage = `Найдены 2 расходуемых предмета: `; if (state.consumableLootTableId) { const table = game.tables.get(state.consumableLootTableId); if (table) { const draw1 = await table.draw({ roll: true, displayChat: true }); const draw2 = await table.draw({ roll: true, displayChat: true }); resultMessage += `1) ${draw1.results[0]?.text || 'пусто'}; 2) ${draw2.results[0]?.text || 'пусто'}`; } else { resultMessage += `2 расходуемых предмета (уровень ${itemLevel}), но таблица не найдена.`; } } else { resultMessage += `2 расходуемых предмета (уровень ${itemLevel}). Таблица не установлена.`; } }
            else if (roll.degreeOfSuccess === 2) { resultMessage = `Найден 1 расходуемый предмет: `; if (state.consumableLootTableId) { const table = game.tables.get(state.consumableLootTableId); if (table) { const draw = await table.draw({ roll: true, displayChat: true }); resultMessage += `${draw.results[0]?.text || 'пусто'}`; } else { resultMessage += `1 расходуемый предмет (уровень ${itemLevel}), но таблица не найдена.`; } } else { resultMessage += `1 расходуемый предмет (уровень ${itemLevel}). Таблица не установлена.`; } }
            else if (roll.degreeOfSuccess === 0) { finalEncounterDC += 1; effects.push("КС Столкновения +1"); resultMessage = "Крит. провал."; }
            else { resultMessage = "Ничего."; }
            phase3ActivityLogs.push({ actorImage: actor.img, characterName: actor.name, activity: pData.activity, rollTotal: roll.total, degreeLabel: this.getDegreeLabel(roll), degreeClass: this.getDegreeClass(roll), notes: `(${getSkillLabel(pData.selectedSkill)}) против КС Местности (скорр.) ${finalTerrainDC_for_phase3}. ${resultMessage} ${effects.join(", ") || ""}` });
        }
        for (const { actor, pData } of confirmedPlayers.filter(a => a.pData.activity === "Исследование")) {
            const { roll } = await this.performRoll({ actor, dc: finalTerrainDC_for_phase3, rollType: 'skill', statistic: pData.selectedSkill, traits: ACTION_TRAITS["recall-knowledge"] || [], title: `${pData.activity} (${getSkillLabel(pData.selectedSkill)})` });
            if (!roll) continue;
            let effects = [], resultMessage = "";
            if (roll.degreeOfSuccess === 3) { resultMessage = "Вы получаете факт."; finalEncounterDC -= 1; effects.push("КС Столкновения -1"); }
            else if (roll.degreeOfSuccess === 2) { resultMessage = "Вы получаете факт."; }
            else if (roll.degreeOfSuccess === 0) { resultMessage = "Вы не получаете факт."; finalEncounterDC += 1; effects.push("КС Столкновения +1"); }
            else { resultMessage = "Вы не получаете факт."; }
            phase3ActivityLogs.push({ actorImage: actor.img, characterName: actor.name, activity: pData.activity, rollTotal: roll.total, degreeLabel: this.getDegreeLabel(roll), degreeClass: this.getDegreeClass(roll), notes: `(${getSkillLabel(pData.selectedSkill)}) против КС Местности (скорр.) ${finalTerrainDC_for_phase3}. ${resultMessage} ${effects.join(", ") || ""}` });
        }

        const finalTerrainDC = Math.max(1, finalTerrainDC_for_phase3);
        finalEncounterDC = Math.max(1, finalEncounterDC);
        finalAfflictionDC = Math.max(1, finalAfflictionDC);
        reportHtml += buildTableHtml(phase1ActivityLogs, "Фаза 1: Выслеживание и Избегание Обнаружения");
        reportHtml += `<p>Модификатор КС Местности (от Фазы 1): ${terrainDC_modifier_from_phase1}. КС Местности для Фазы 2: ${finalTerrainDC_after_phase1}</p>`;
        reportHtml += `<p>Модификатор КС Столкновения (от Фазы 1): ${encounterDC_modifier_from_phase1}.</p>`;
        reportHtml += buildTableHtml(phase2ActivityLogs, "Фаза 2: Проживание и Противодействие недугу");
        reportHtml += `<p>Модификатор КС Местности (от Фазы 2 - Проживание): ${terrainDC_modifier_from_phase2}. КС Местности для Фазы 3: ${finalTerrainDC_for_phase3}</p>`;
        reportHtml += buildTableHtml(phase3ActivityLogs, "Фаза 3: Искать и Исследование");
        reportHtml += `<p><strong>Итоговые КС:</strong> Местность ${finalTerrainDC}, Столкновение ${finalEncounterDC}, Недуг ${finalAfflictionDC}</p>`;
        let encounterSectionHtml = `<h3>Фаза 4: Проверка Столкновения</h3>`;
        const encounterRollObj = new Roll("1d20"); await encounterRollObj.roll({ async: true }); const encounterTotal = encounterRollObj.total; const d20EncounterResult = encounterRollObj.dice[0]?.results[0]?.result ?? 0;
        let encounterOutcome = "";
        if (d20EncounterResult === 1) { encounterOutcome = "Критический Провал (Нападение на лагерь!)"; }
        else if (encounterTotal < finalEncounterDC) { encounterOutcome = "Провал (Столкновение!)"; }
        else if (encounterTotal >= finalEncounterDC + 10) { encounterOutcome = "Критический Успех (Столкновения нет)"; }
        else { encounterOutcome = "Успех (Столкновения нет)"; }
        encounterSectionHtml += `<p>Бросок 1d20 на столкновение: ${encounterTotal} против КС Столкновения ${finalEncounterDC}. Результат: ${encounterOutcome}</p>`;
        if (d20EncounterResult === 1) { encounterSectionHtml += `<p style="color:darkred; font-weight:bold;"><strong>ЧИСТАЯ 1! Нападение ночью на лагерь!</strong></p>`; if (state.campEncounterTableId) { const table = game.tables.get(state.campEncounterTableId); if (table) await table.draw({ roll: true, displayChat: true }); } const guardRoll = new Roll("1d3"); await guardRoll.roll({ async: true }); const selectedGuards = confirmedPlayers.map(p => p.actor).sort(() => 0.5 - Math.random()).slice(0, guardRoll.total); encounterSectionHtml += `<p>Количество стражей: ${guardRoll.total}. На страже: ${selectedGuards.length > 0 ? selectedGuards.map(a => a.name).join(", ") : "нет"}.</p>`; }
        else if (encounterTotal < finalEncounterDC) { encounterSectionHtml += `<p style="color:red; font-weight:bold;"><strong>Столкновение происходит!</strong></p>`; if (state.encounterTableId) { const table = game.tables.get(state.encounterTableId); if (table) await table.draw({ roll: true, displayChat: true }); } }
        else { encounterSectionHtml += `<p style="color:green;">Столкновения нет.</p>`; }
        reportHtml += encounterSectionHtml;

        if (requireAfflictionSaves && state.afflictionLoaded) {
            const saveData = { dc: finalAfflictionDC, saveType: state.afflictionSaveType, traits: state.afflictionTraits, title: `Спасбросок от недуга: ${state.loadedAfflictionName}`, players: confirmedPlayers.map(p => ({ actorId: p.actor.id })), interimReportHtml: reportHtml, iconStyle: iconInlineStyle };
            new MwangiAfflictionSavesApp({ saveData }).render(true);
        } else {
            reportHtml += `<h3>Фаза 5: Спасброски от Недуга</h3><p>Спасброски от недуга не требуются.</p>`;
            await this._saveReportToJournalAndShow(reportHtml);
        }
    }
}

class MwangiHexplorationResultsApp extends Application {
    constructor(data, options = {}) { super(options); this.data = data; }
    static get defaultOptions() { return foundry.utils.mergeObject(super.defaultOptions, { id: "mwangi-hexploration-results-instance", template: null, width: 700, height: "auto", resizable: true, classes: ["pf2e", "dialog", "travel-results-app"] }); }
    async _renderInner(data) { if (!this.compiledTemplate) { this.compiledTemplate = Handlebars.compile(resultsAppTemplateString); } return $(this.compiledTemplate(data)); }
    get title() { return this.data.title || "Результаты Исследования"; }
    async getData() { const context = await super.getData(); context.resultsHtml = this.data.html; return context; }
    activateListeners(html) { super.activateListeners(html); html.find('#copy-results-button').click(() => { const resultsContent = html.find('#results-content')[0]; if (resultsContent) { game.clipboard.copyHTML(resultsContent); ui.notifications.info("Результаты скопированы в буфер обмена!"); } }); html.find('button[data-action="close"]').click(() => this.close()); }
}

class MwangiAfflictionSavesApp extends Application {
    constructor(data, options = {}) { super(options); this.data = data; }
    static get defaultOptions() { return foundry.utils.mergeObject(super.defaultOptions, { id: "mwangi-affliction-saves-app", title: "Этап 2: Спасброски от Недуга", template: null, width: 700, height: "auto", resizable: true, classes: ["pf2e", "dialog"] }); }
    async _renderInner(data) { if (!this.compiledTemplate) { this.compiledTemplate = Handlebars.compile(afflictionSavesAppTemplateString); } return $(this.compiledTemplate(data)); }
    async getData() { const context = await super.getData(); context.interimReportHtml = this.data.saveData.interimReportHtml; return context; }
    activateListeners(html) {
        super.activateListeners(html);
        html.find('#start-saves-button').click(async (event) => {
            $(event.currentTarget).prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Выполнение...');
            await window.MwangiHexplorationAppInstance.executeAfflictionSaves(this.data.saveData);
            this.close({ force: true }); // ИЗМЕНЕНО: Принудительное закрытие без диалога
        });
    }

    async close(options = {}) {
        // ИЗМЕНЕНО: Проверяем флаг принудительного закрытия
        if (options?.force) {
            return super.close(options);
        }

        if (!game.user.isGM) {
            return super.close(options);
        }

        return new Promise((resolve) => {
            Dialog.confirm({
                title: "Подтверждение закрытия",
                content: "<p>Это окно для спасбросков от недугов. Вы уверены что хотите его закрыть?</p>",
                yes: async () => {
                    let finalReportHtml = this.data.saveData.interimReportHtml;
                    finalReportHtml += `<h3>Фаза 5: Спасброски от Недуга</h3><p>Спасброски от недуга были пропущены Мастером.</p>`;
                    
                    if (window.MwangiHexplorationAppInstance) {
                        await window.MwangiHexplorationAppInstance._saveReportToJournalAndShow(finalReportHtml);
                    } else {
                        ui.notifications.error("Не удалось найти основной экземпляр приложения для сохранения отчета.");
                    }
                    
                    resolve(super.close(options));
                },
                no: () => {
                    resolve(this); // Не закрываем окно
                },
                defaultYes: false
            });
        });
    }
}

// --- ХУКИ И ИНИЦИАЛИЗАЦИЯ ---
function launchMwangiHexplorationApp() { if (window.MwangiHexplorationAppInstance && window.MwangiHexplorationAppInstance.rendered) { window.MwangiHexplorationAppInstance.bringToTop(); } else { window.MwangiHexplorationAppInstance = new MwangiHexplorationApp(); } window.MwangiHexplorationAppInstance.render(true); }

Hooks.once('init', () => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = `modules/${MODULE_ID}/style.css`;
    document.head.appendChild(link);

    game.settings.register(MODULE_ID, SETTING_KEY, { name: "Hexploration State Mwangi", scope: "world", config: false, type: Object, default: getDefaultState(), onChange: () => { if (window.MwangiHexplorationAppInstance?.rendered) { window.MwangiHexplorationAppInstance.render(false); } } });
    game.settings.register(MODULE_ID, SKILL_SETTING_KEY, { name: "Custom Activity Skills", scope: "world", config: false, type: Object, default: {} });
    
    game.settings.register(MODULE_ID, 'enableMwangiHexploration', { 
        name: "MHE.Settings.Enable.Name", 
        hint: "MHE.Settings.Enable.Hint", 
        scope: 'world', 
        config: true, 
        type: Boolean, 
        default: false, 
        onChange: () => { if (ui.actors) ui.actors.render(true); }, 
    });

    game.settings.registerMenu(MODULE_ID, "activityEditor", {
        name: "MHE.Settings.Editor.Name",
        label: "MHE.Settings.Editor.Label",
        hint: "MHE.Settings.Editor.Hint",
        icon: "fas fa-edit",
        type: ActivityEditorApp,
        restricted: true
    });
});

Hooks.once('ready', () => {
    game.socket.on(SOCKET_ID, async (data) => {
        const { type, payload } = data;
        if (game.user.isGM) {
            if (type === 'requestStateChange') { const { actorId, changes } = payload; const currentState = game.settings.get(MODULE_ID, SETTING_KEY); const newState = foundry.utils.deepClone(currentState); if (newState.playerData[actorId]) { Object.assign(newState.playerData[actorId], changes); await game.settings.set(MODULE_ID, SETTING_KEY, newState); } }
            else if (type === 'rollResult') { const { requestId, rollJSON, error } = payload; const request = window.MwangiHexplorationAppInstance?.rollRequests[requestId]; if (request) { clearTimeout(request.timeout); if (error) { request.reject(new Error(error)); } else { request.resolve(rollJSON); } delete window.MwangiHexplorationAppInstance.rollRequests[requestId]; } }
        }
        if (type === 'requestRoll' && payload.targetUserId === game.user.id) {
            const { actorId, rollType, statistic, dc, traits, title, requestId } = payload;
            const actor = game.actors.get(actorId);
            if (!actor) return;
            let statisticObj;
            if (rollType === 'skill') { statisticObj = (statistic === 'perception') ? actor.perception : actor.skills[statistic]; } else { statisticObj = actor.saves[statistic]; }
            if (!statisticObj) return;
            try { const roll = await statisticObj.roll({ dc: { value: dc }, traits, title, skipDialog: false }); if (roll) { game.socket.emit(SOCKET_ID, { type: 'rollResult', payload: { requestId, rollJSON: roll.toJSON() } }); } else { game.socket.emit(SOCKET_ID, { type: 'rollResult', payload: { requestId, error: 'Roll was cancelled by the player.' } }); } } catch (e) { console.error(e); game.socket.emit(SOCKET_ID, { type: 'rollResult', payload: { requestId, error: 'An error occurred during the roll.' } }); }
        }
        if (type === 'showResults') { if (window.MwangiHexplorationAppInstance?.rendered) { window.MwangiHexplorationAppInstance.close(); } new MwangiHexplorationResultsApp(payload).render(true); }
    });
});

Hooks.on('renderActorDirectory', (app, html) => {
    if (!game.settings.get(MODULE_ID, 'enableMwangiHexploration')) return;
    const jqueryHtml = $(html);
    if (jqueryHtml.find('#mwangi-hexploration-button').length) return;
    const partySheetButton = jqueryHtml.find('button[data-action="openPartySheet"]');
    if (partySheetButton.length > 0) {
        const buttonHtml = `<a id="mwangi-hexploration-button" title="Исследование Муанги" style="
                        display: inline-flex; align-items: center; justify-content: center;
                        width: 16px; height: 16px; margin: 0 4px; vertical-align: middle;
                        color: #f0f0e0; font-family: 'Signika', sans-serif; font-weight: bold;
                        font-size: 12px; text-decoration: none; border: 1px solid #555;
                        border-radius: 3px; background-color: rgba(0, 0, 0, 0.3); cursor: pointer;
                        ">H</a>`;
        partySheetButton.after(buttonHtml);
        jqueryHtml.find('#mwangi-hexploration-button').on('click', (event) => { event.preventDefault(); event.stopPropagation(); launchMwangiHexplorationApp(); });
    }
});