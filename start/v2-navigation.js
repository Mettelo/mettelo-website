(()=>{if(!['127.0.0.1','localhost'].includes(location.hostname))return;document.querySelectorAll('[data-workspace-route]').forEach(a=>a.href='http://127.0.0.1:3001'+a.dataset.workspaceRoute);})();
