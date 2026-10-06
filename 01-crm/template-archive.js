var _tplArchiveView = false, _mktArchiveView = false;
var _tplArchiveCount = 0, _mktArchiveCount = 0;
function templateArchiveToggle(stock) {
    var button = document.createElement('button');
    var active = stock ? _mktArchiveView : _tplArchiveView;
    button.type = 'button'; button.className = 'tpl-archive-toggle';
    button.textContent = active ? '返回使用中' : '已封存（' + (stock ? _mktArchiveCount : _tplArchiveCount) + '）';
    button.setAttribute('aria-pressed', String(active));
    button.onclick = function () {
        if (stock) { _mktArchiveView = !_mktArchiveView; renderMktList(); }
        else { _tplArchiveView = !_tplArchiveView; setTplTab(_tplTab); }
    };
    return button;
}
function prepareTemplateArchive(body, stock) {
    var archived = stock ? _mktArchiveView : _tplArchiveView, count = 0;
    var cards = Array.from(body.children).filter(function (el) { return el.querySelector(':scope > pre'); });
    cards.forEach(function (card) {
        var edit = card.querySelector('button[onclick^="edit"]');
        if (!edit) return;
        var handler = edit.getAttribute('onclick'), match, client, list, storage, save;
        if ((match = handler.match(/^editMktFromModal\('([^']+)',(\d+)\)/))) {
            client = DB.find(function (c) { return c.id === match[1]; }); list = client && client.mktTemplates;
        } else if ((match = handler.match(/^editMktTemplate\((\d+)\)/))) {
            client = DB.find(function (c) { return c.id === _mktClientId; }); list = client && client.mktTemplates;
        } else if ((match = handler.match(/^edit(Signing|Other)?Template\((\d+)\)/))) {
            list = match[1] === 'Signing' ? _signingTemplates : match[1] === 'Other' ? _otherTemplates : _templates;
            storage = match[1] === 'Signing' ? 'crmSigningTemplates' : match[1] === 'Other' ? 'crmOtherTemplates' : 'crmTemplates';
            save = match[1] === 'Signing' ? persistSigningTemplates : match[1] === 'Other' ? persistOtherTemplates : persistTemplates;
        }
        if (!match || !list) return;
        var tpl = list[Number(match[match.length - 1])];
        if (!tpl) return;
        if (tpl.archived) count++;
        if (!!tpl.archived !== archived) { card.remove(); return; }
        var button = document.createElement('button');
        button.type = 'button'; button.className = 'tpl-archive-action';
        button.textContent = archived ? '還原' : '封存';
        button.title = archived ? '還原至使用中範本' : '保留內容並移至已封存';
        button.onclick = function () {
            var old = { archived: tpl.archived, archivedAt: tpl.archivedAt };
            tpl.archived = !archived;
            tpl.archivedAt = tpl.archived ? new Date().toISOString() : null;
            try {
                if (client) { if (!persist()) throw Error('save'); }
                else { localStorage.setItem(storage, JSON.stringify(list)); save(); }
            } catch (error) {
                Object.assign(tpl, old); showToast('封存狀態未保存，請重試', 'error'); return;
            }
            if (document.getElementById('mktBody')) renderMktList();
            if (document.getElementById('tplModal').style.display !== 'none') setTplTab(_tplTab);
            showToast(archived ? '範本已還原' : '範本已封存，可至「已封存」還原');
        };
        edit.after(button);
    });
    if (stock) _mktArchiveCount = count; else _tplArchiveCount = count;
    if (!body.querySelector(':scope > div > pre')) {
        body.replaceChildren(); var empty = document.createElement('p'); empty.className = 'tpl-archive-empty';
        empty.textContent = archived ? '目前沒有已封存範本' : '目前沒有使用中的範本，可新增或從已封存還原。'; body.append(empty);
    }
}
