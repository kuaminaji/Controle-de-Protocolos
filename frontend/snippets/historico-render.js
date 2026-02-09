// Renderiza histórico com diffs (changes)
// Exemplo de uso: renderHistorico(await (await fetch(`/api/protocolo/${id}/historico`)).json(), elHistorico)

function renderHistorico(historico, containerEl) {
  containerEl.innerHTML = "";
  (historico || []).forEach(item => {
    const li = document.createElement("li");
    const base = `[${item.timestamp}] ${item.acao} por ${item.usuario || "sistema"}`;
    const changes = Array.isArray(item.changes) ? item.changes : [];
    if (changes.length) {
      const diffs = changes.map(c => `${c.field}: "${c.from ?? ""}" → "${c.to ?? ""}"`).join("; ");
      li.textContent = `${base} — ${diffs}`;
    } else {
      li.textContent = base;
    }
    containerEl.appendChild(li);
  });
}