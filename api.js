/* By Badr - API client */
window.apiPost = function (action, data) {
    const fd = new FormData();
    if (data) {
        for (const k in data) {
            if (Object.prototype.hasOwnProperty.call(data, k)) {
                fd.append(k, data[k]);
            }
        }
    }
    return fetch('/api/' + action, { method: 'POST', body: fd })
        .then(function (r) { return r.json(); });
};

window.apiGet = function (action) {
    return fetch('/api/' + action).then(function (r) { return r.json(); });
};

window.escapeHtmlJs = function (s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
};
