(function () {
  'use strict';

  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var type    = script.getAttribute('data-tanc-type')    || '';
  var country = script.getAttribute('data-tanc-country') || '';
  var limit   = script.getAttribute('data-tanc-limit')   || '5';
  var theme   = script.getAttribute('data-tanc-theme')   || 'light';

  var BASE = script.getAttribute('data-tanc-base') || 'https://tancglobal.com';

  var isDark = theme === 'dark';
  var colors = {
    bg:      isDark ? '#0a1628' : '#ffffff',
    border:  isDark ? '#1e3a5f' : '#e2e8f0',
    text:    isDark ? '#f1f5f9' : '#0a1628',
    sub:     isDark ? '#94a3b8' : '#64748b',
    gold:    '#d4a017',
    tag:     isDark ? '#1e3a5f' : '#fef9ee',
    tagText: '#d4a017',
  };

  var container = document.createElement('div');
  container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  container.style.maxWidth = '480px';
  script.parentNode.insertBefore(container, script.nextSibling);

  var params = '?limit=' + encodeURIComponent(limit) + '&theme=' + encodeURIComponent(theme);
  if (type)    params += '&type='    + encodeURIComponent(type);
  if (country) params += '&country=' + encodeURIComponent(country);

  var apiUrl = BASE + '/api/widget' + params;

  fetch(apiUrl)
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var opps = data.opps || [];
      if (opps.length === 0) {
        container.innerHTML = '<div style="font-size:13px;color:' + colors.sub + ';padding:16px;text-align:center;">No opportunities found.</div>';
        return;
      }

      var html = '';
      for (var i = 0; i < opps.length; i++) {
        var o = opps[i];
        var deadlineStr = '';
        if (o.deadline) {
          var days = Math.ceil((new Date(o.deadline).getTime() - Date.now()) / 86400000);
          if (days < 0) deadlineStr = 'Closed';
          else if (days === 0) deadlineStr = 'Closes today';
          else if (days <= 7) deadlineStr = days + 'd left';
          else deadlineStr = new Date(o.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } else {
          deadlineStr = 'Rolling / Open';
        }
        var urgent = o.deadline && Math.ceil((new Date(o.deadline).getTime() - Date.now()) / 86400000) <= 7 && Math.ceil((new Date(o.deadline).getTime() - Date.now()) / 86400000) >= 0;

        html += '<a href="' + o.url + '" target="_blank" rel="noopener noreferrer" style="display:block;text-decoration:none;padding:14px;margin-bottom:8px;border:1px solid ' + colors.border + ';border-radius:10px;background:' + colors.bg + ';">';
        if (o.type) {
          html += '<span style="display:inline-block;font-size:10px;font-weight:700;padding:2px 8px;border-radius:50px;background:' + colors.tag + ';color:' + colors.tagText + ';text-transform:uppercase;letter-spacing:0.4px;margin-bottom:8px;">' + escHtml(o.type) + '</span>';
        }
        html += '<div style="font-size:14px;font-weight:700;color:' + colors.text + ';line-height:1.35;margin-bottom:4px;">' + escHtml(o.title) + '</div>';
        if (o.organization) {
          html += '<div style="font-size:12px;color:' + colors.sub + ';margin-bottom:4px;">' + escHtml(o.organization) + '</div>';
        }
        if (o.country) {
          html += '<div style="font-size:12px;color:' + colors.sub + ';margin-bottom:6px;">' + escHtml(o.country) + '</div>';
        }
        html += '<div style="font-size:12px;color:' + (urgent ? '#dc2626' : colors.sub) + ';font-weight:' + (urgent ? '600' : '400') + ';">Deadline: ' + escHtml(deadlineStr) + '</div>';
        if (o.funding) {
          html += '<div style="margin-top:6px;"><span style="display:inline-block;font-size:10px;font-weight:600;padding:2px 8px;border-radius:50px;background:' + colors.tag + ';color:' + colors.tagText + ';border:1px solid ' + colors.gold + ';">' + escHtml(o.funding) + '</span></div>';
        }
        html += '</a>';
      }

      html += '<div style="text-align:center;margin-top:4px;padding:8px 0;border-top:1px solid ' + colors.border + ';">';
      html += '<a href="' + BASE + '/opportunities" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:' + colors.sub + ';text-decoration:none;">Powered by <strong style="color:' + colors.gold + ';">TANC</strong> — Global Opportunity Platform</a>';
      html += '</div>';

      container.innerHTML = html;
    })
    .catch(function () {
      container.innerHTML = '<div style="font-size:12px;color:#94a3b8;padding:12px;text-align:center;">Unable to load opportunities.</div>';
    });

  function escHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
