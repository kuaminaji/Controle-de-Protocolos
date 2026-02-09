// Chame estas funções a partir dos seus handlers no frontend

async function registrarRetirada(id, { retirado_por, data_retirada, usuario }) {
  const res = await fetch(`/api/protocolo/${encodeURIComponent(id)}/retirada`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      retirado_por,
      data_retirada,            // "YYYY-MM-DD"
      ultima_alteracao_nome: usuario || ""
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Falha ao registrar retirada (HTTP ${res.status})`);
  }
  return res.json();
}

async function restaurarProtocolo(id, { usuario }) {
  const res = await fetch(`/api/protocolo/${encodeURIComponent(id)}/restaurar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ultima_alteracao_nome: usuario || "" })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Falha ao restaurar protocolo (HTTP ${res.status})`);
  }
  return res.json();
}