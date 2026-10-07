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
        card._templateOrder = { tpl: tpl, client: client, list: list, storage: storage, save: save };
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

function sortTemplateCards(cards) {
    return cards.sort(function(a,b) {
        var x=a._templateOrder.tpl.sortOrder, y=b._templateOrder.tpl.sortOrder;
        return (Number.isFinite(x)?x:Number.MAX_SAFE_INTEGER)-(Number.isFinite(y)?y:Number.MAX_SAFE_INTEGER);
    });
}
function enableTemplateDragging(nav, cards) {
    var source=-1;
    function move(from,to) {
        if(from===to || from<0 || to<0 || to>=cards.length) return;
        var selected=cards[Array.from(nav.children).findIndex(function(b){return b.getAttribute('aria-selected')==='true';})];
        var ordered=cards.slice(), old=cards.map(function(c){return c._templateOrder.tpl.sortOrder;});
        ordered.splice(to,0,ordered.splice(from,1)[0]);
        ordered.forEach(function(c,i){c._templateOrder.tpl.sortOrder=i;});
        var data=cards[0]._templateOrder;
        try {
            if(data.client) { if(!persist()) throw Error('save'); }
            else { localStorage.setItem(data.storage,JSON.stringify(data.list)); data.save(); }
        } catch(error) {
            cards.forEach(function(c,i){if(old[i]===undefined)delete c._templateOrder.tpl.sortOrder;else c._templateOrder.tpl.sortOrder=old[i];});
            showToast('排序未保存，請重試','error');return;
        }
        _tplSelectedPages[_tplTab]=ordered.indexOf(selected);
        setTplTab(_tplTab);
        document.querySelectorAll('#tplBody .tpl-object-tabs button')[to].focus({preventScroll:true});
    }
    Array.from(nav.children).forEach(function(button,i){
        button.draggable=true;
        button.title='拖曳排序；Alt＋左右鍵也可移動';
        button.addEventListener('dragstart',function(e){source=i;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','template');button.classList.add('tpl-dragging');});
        button.addEventListener('dragover',function(e){if(source<0)return;e.preventDefault();e.dataTransfer.dropEffect='move';button.classList.add('tpl-drop-target');});
        button.addEventListener('dragleave',function(){button.classList.remove('tpl-drop-target');});
        button.addEventListener('drop',function(e){if(source<0)return;e.preventDefault();move(source,i);source=-1;});
        button.addEventListener('dragend',function(){source=-1;Array.from(nav.children).forEach(function(b){b.classList.remove('tpl-dragging','tpl-drop-target');});});
        button.addEventListener('keydown',function(e){if(e.altKey && ['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();move(i,i+(e.key==='ArrowRight'?1:-1));}},true);
    });
}
