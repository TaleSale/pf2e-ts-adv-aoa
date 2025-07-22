// --- ВЕРСИЯ С СОЗДАНИЕМ ПУСТОЙ КОМНАТЫ ---

class AlterainCitadelSheet extends ActorSheet {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "alterain-citadel-sheet",
            classes: ["pf2e", "sheet", "actor", "party", "themed", "theme-light"],
            template: `modules/pf2e-ts-adv-aoa/templates/alterain-citadel-sheet.html`,
            width: 720,
            height: 720,
            resizable: true,
            tabs: [{ navSelector: ".sub-nav", contentSelector: ".container", initial: "overview" }]
        });
    }

    get title() { return "Цитадель Альтерейн"; }

    async getData(options) {
        const data = await super.getData(options);
        const party = game.actors.party;
        if (!party) return { ...data, members: [], citadel: {} };

        const citadelData = party.getFlag('world', 'alterainCitadel') || {};
        const defaults = {
            books: { hillKnights: false, cultCinders: false, tomorrowBurns: false, ghostCity: false, scarletTriad: false },
            spent: { clearance: 0, defense: 0 },
            rooms: []
        };
        const citadel = foundry.utils.mergeObject(defaults, citadelData);

        const totalSpentOnTop = citadel.spent.clearance + citadel.spent.defense;
        const totalSpentOnRooms = citadel.rooms.reduce((acc, room) => acc + room.bonus, 0);
        citadel.totalEarned = Object.values(citadel.books).filter(Boolean).length * 4;
        citadel.totalSpent = totalSpentOnTop + totalSpentOnRooms;
        citadel.unspent = citadel.totalEarned - citadel.totalSpent;
        citadel.availableRooms = citadel.spent.clearance > 0 ? citadel.spent.clearance + 1 : 0;
        citadel.defensePoints = citadel.spent.defense > 0 ? citadel.spent.defense + 1 : 0;
        citadel.builtRoomsCount = citadel.rooms.length;

        // ИСПРАВЛЕНИЕ: Добавляем пустое значение в список навыков
        const skillList = [{ id: "", label: "— Не выбрано —" }, ...Object.entries(CONFIG.PF2E.skills).map(([id, data]) => ({ id, label: game.i18n.localize(data.label) }))];
        const skillLabels = Object.fromEntries(skillList.map(s => [s.id, s.label]));

        const roomSkills = citadel.rooms.map(room => ({
            name: room.name,
            skill: room.skill,
            skillLabel: skillLabels[room.skill] || "Не выбрано",
            bonus: room.bonus
        }));

        const members = party.members.map(actor => ({
            uuid: actor.uuid,
            img: actor.img,
            name: actor.name,
            fortressPoints: actor.getFlag('world', 'alterainFortressPoints') || 0,
            roomSkills: roomSkills.filter(r => r.skill) // Показываем в обзоре только комнаты с выбранным навыком
        }));

        return { ...data, actor: this.actor, members, citadel, skillList, isGM: game.user.isGM };
    }

    activateListeners(html) {
        super.activateListeners(html);
        html.find('.overview-tab [data-action="open-sheet"]').on('click', this._onOpenMemberSheet.bind(this));
        const pointsArea = html.find('.fortress-points');
        pointsArea.on('click', this._onFortressPointAdd.bind(this));
        pointsArea.on('contextmenu', this._onFortressPointSubtract.bind(this));
        html.find('[data-action="roll-room-skill"]').on('click', this._onRollRoomSkill.bind(this));

        if (game.user.isGM) {
            html.find('.book-checkbox').on('change', this._onBookCheckboxChange.bind(this));
            html.find('[data-action="reset-all-spent"]').on('click', this._onResetAllSpent.bind(this));
        }
        html.find('[data-action="spend-point"]').on('click', this._onSpendPoint.bind(this));
        html.find('[data-action="unspend-point"]').on('click', this._onUnspendPoint.bind(this));
        html.find('[data-action="add-new-room"]').on('click', this._onAddNewRoom.bind(this));
        html.find('[data-action="upgrade-room"]').on('click', this._onUpgradeRoom.bind(this));
        html.find('[data-action="edit-room-icon"]').on('click', this._onEditRoomIcon.bind(this));
        html.find('.room-card input, .room-card select').on('change', this._onEditRoomField.bind(this));
        html.find('[data-action="delete-room"]').on('click', this._onDeleteRoom.bind(this));
    }

    async _onOpenMemberSheet(event) {
        event.preventDefault();
        const actorUuid = $(event.currentTarget).closest('.member').data('actor-uuid');
        const actor = await fromUuid(actorUuid);
        if (actor) actor.sheet.render(true);
    }

    async _onFortressPointAdd(event) {
        event.preventDefault();
        const actorUuid = $(event.currentTarget).closest('.member').data('actor-uuid');
        const actor = await fromUuid(actorUuid);
        if (actor) {
            const currentPoints = actor.getFlag('world', 'alterainFortressPoints') || 0;
            const newPoints = Math.min(currentPoints + 1, 3);
            await actor.setFlag('world', 'alterainFortressPoints', newPoints);
            this.render();
        }
    }

    async _onFortressPointSubtract(event) {
        event.preventDefault();
        const actorUuid = $(event.currentTarget).closest('.member').data('actor-uuid');
        const actor = await fromUuid(actorUuid);
        if (actor) {
            const currentPoints = actor.getFlag('world', 'alterainFortressPoints') || 0;
            const newPoints = Math.max(currentPoints - 1, 0);
            await actor.setFlag('world', 'alterainFortressPoints', newPoints);
            this.render();
        }
    }

    async _onBookCheckboxChange(event) {
        const checkbox = event.currentTarget;
        await this.actor.setFlag('world', `alterainCitadel.books.${checkbox.dataset.bookId}`, checkbox.checked);
        this.render();
    }

    async _onSpendPoint(event) {
        const category = event.currentTarget.dataset.category;
        const citadel = (await this.getData()).citadel;
        if (citadel.unspent > 0) {
            const newAmount = citadel.spent[category] + 1;
            await this.actor.setFlag('world', `alterainCitadel.spent.${category}`, newAmount);
            this.render();
        } else {
            ui.notifications.warn("Нет доступных Очков Строительства!");
        }
    }

    async _onUnspendPoint(event) {
        const category = event.currentTarget.dataset.category;
        const currentAmount = this.actor.getFlag('world', `alterainCitadel.spent.${category}`) || 0;
        if (currentAmount > 0) {
            await this.actor.setFlag('world', `alterainCitadel.spent.${category}`, currentAmount - 1);
            this.render();
        }
    }

    async _onResetAllSpent(event) {
        const confirmed = await Dialog.confirm({
            title: "Сбросить Очки",
            content: "<p>Вы уверены, что хотите сбросить все потраченные Очки Строительства (Расчистка, Оборона и все Комнаты)? Это действие необратимо.</p>",
            yes: () => true, no: () => false, defaultYes: false
        });
        if (confirmed) {
            await this.actor.setFlag('world', 'alterainCitadel.spent', { clearance: 0, defense: 0 });
            await this.actor.setFlag('world', 'alterainCitadel.rooms', []);
            this.render();
        }
    }

    async _onAddNewRoom(event) {
        const citadel = (await this.getData()).citadel;
        if (citadel.unspent <= 0) return ui.notifications.warn("Нет доступных Очков Строительства!");
        if (citadel.builtRoomsCount >= citadel.availableRooms) return ui.notifications.warn("Нет доступных слотов для комнат! Увеличьте Расчистку.");

        // ИСПРАВЛЕНИЕ: Создаем пустую комнату
        const newRoom = {
            id: foundry.utils.randomID(),
            icon: "systems/pf2e/icons/default-icons/kingdom.svg",
            name: "Новая комната",
            skill: "", // Пустой навык
            bonus: 1
        };

        const rooms = this.actor.getFlag('world', 'alterainCitadel.rooms') || [];
        rooms.push(newRoom);
        await this.actor.setFlag('world', 'alterainCitadel.rooms', rooms);
        this.render();
    }

    async _onUpgradeRoom(event) {
        const roomId = $(event.currentTarget).closest('.room-card').data('roomId');
        const citadel = (await this.getData()).citadel;
        if (citadel.unspent <= 0) return ui.notifications.warn("Нет доступных Очков Строительства!");

        const rooms = this.actor.getFlag('world', 'alterainCitadel.rooms') || [];
        const room = rooms.find(r => r.id === roomId);
        if (room && room.bonus < 4) {
            room.bonus += 1;
            await this.actor.setFlag('world', 'alterainCitadel.rooms', rooms);
            this.render();
        } else if (room.bonus >= 4) {
            ui.notifications.info("Комната уже имеет максимальный бонус.");
        }
    }

    _onEditRoomIcon(event) {
        const roomId = $(event.currentTarget).closest('.room-card').data('roomId');
        new FilePicker({
            type: "image",
            callback: async (path) => {
                const rooms = this.actor.getFlag('world', 'alterainCitadel.rooms') || [];
                const room = rooms.find(r => r.id === roomId);
                if (room) {
                    room.icon = path;
                    await this.actor.setFlag('world', 'alterainCitadel.rooms', rooms);
                    this.render();
                }
            }
        }).render(true);
    }

    async _onEditRoomField(event) {
        const element = event.currentTarget;
        const roomId = $(element).closest('.room-card').data('roomId');
        const field = element.dataset.field;
        const value = element.value;

        const rooms = this.actor.getFlag('world', 'alterainCitadel.rooms') || [];
        const room = rooms.find(r => r.id === roomId);
        if (room) {
            room[field] = value;
            // Автоматическое переименование, только если имя не меняли вручную
            if (field === 'skill' && (room.name.startsWith("Комната (") || room.name === "Новая комната")) {
                const skillLabel = game.i18n.localize(CONFIG.PF2E.skills[value]?.label ?? `PF2E.Skill.${value}`);
                room.name = value ? `Комната (${skillLabel})` : "Новая комната";
            }
            await this.actor.setFlag('world', 'alterainCitadel.rooms', rooms);
            if (field === 'skill') this.render();
        }
    }
    
    async _onDeleteRoom(event) {
        const roomId = $(event.currentTarget).closest('.room-card').data('roomId');
        const confirmed = await Dialog.confirm({
            title: "Удалить комнату",
            content: "<p>Вы уверены, что хотите удалить эту комнату? Потраченные на нее очки строительства будут возвращены.</p>",
            yes: () => true, no: () => false, defaultYes: false
        });
        if (confirmed) {
            let rooms = this.actor.getFlag('world', 'alterainCitadel.rooms') || [];
            rooms = rooms.filter(r => r.id !== roomId);
            await this.actor.setFlag('world', 'alterainCitadel.rooms', rooms);
            this.render();
        }
    }

    async _onRollRoomSkill(event) {
        event.preventDefault();
        const button = event.currentTarget;
        const actorUuid = $(button).closest('.member').data('actor-uuid');
        const skillId = button.dataset.skillId;
        const roomBonus = parseInt(button.dataset.bonus);
        const roomName = button.dataset.roomName;

        const actor = await fromUuid(actorUuid);
        if (!actor) return;
        
        const currentFortressPoints = actor.getFlag('world', 'alterainFortressPoints') || 0;
        if (currentFortressPoints < 1) {
            ui.notifications.warn(`${actor.name} не имеет Очков Крепости для использования.`);
            return;
        }

        const modifier = new game.pf2e.Modifier({
            label: roomName,
            modifier: roomBonus,
            type: "item"
        });

        const options = {
            modifiers: [modifier],
            callback: async (roll) => {
                if (roll) {
                    const currentPoints = actor.getFlag('world', 'alterainFortressPoints') || 0;
                    await actor.setFlag('world', 'alterainFortressPoints', Math.max(0, currentPoints - 1));
                    this.render();
                }
            }
        };

        const actorSkill = actor.skills[skillId];
        if (!actorSkill) {
            const attribute = CONFIG.PF2E.skills[skillId]?.attribute || "int";
            const check = new game.pf2e.Check(null, { type: "skill-check", domains: [skillId], statistic: attribute });
            check.roll(options);
        } else {
            actorSkill.roll(options);
        }
    }
}

Hooks.once('init', () => {
    game.settings.register('pf2e-ts-adv-aoa', 'enableAlterainCitadel', {
        name: game.i18n.localize("pf2e-ts-adv-aoa.settings.enableAlterainCitadel.name"),
        hint: game.i18n.localize("pf2e-ts-adv-aoa.settings.enableAlterainCitadel.hint"),
        scope: 'world', config: true, type: Boolean, default: false,
        onChange: () => ui.actors.render(true),
    });

    Handlebars.registerHelper('gte', (a, b) => a >= b);
    Handlebars.registerHelper('eq', (a, b) => a === b);
    Handlebars.registerHelper('not', (a) => !a);
    Handlebars.registerHelper('or', (a, b) => a || b);
});

Hooks.on('renderActorDirectory', (app, html, data) => {
    setTimeout(() => {
        try {
            if (!game.settings.get('pf2e-ts-adv-aoa', 'enableAlterainCitadel')) return;
            const jqueryHtml = $(html);
            if (jqueryHtml.find('#alterain-citadel-button').length) return;
            const partySheetButton = jqueryHtml.find('button[data-action="openPartySheet"]');
            if (partySheetButton.length > 0) {
                const buttonHtml = `
                    <a id="alterain-citadel-button" title="Цитадель Альтерейн" style="
                        display: inline-flex; align-items: center; justify-content: center;
                        width: 16px; height: 16px; margin: 0 4px; vertical-align: middle;
                        color: #f0f0e0; font-family: 'Signika', sans-serif; font-weight: bold;
                        font-size: 12px; text-decoration: none; border: 1px solid #555;
                        border-radius: 3px; background-color: rgba(0, 0, 0, 0.3); cursor: pointer;
                    ">A</a>`;
                partySheetButton.after(buttonHtml);
                jqueryHtml.find('#alterain-citadel-button').on('click', (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    new AlterainCitadelSheet(game.actors.party).render(true);
                });
            }
        } catch (e) {
            console.error("ЦИТАДЕЛЬ | КРИТИЧЕСКАЯ ОШИБКА!", e);
        }
    }, 100);
});
