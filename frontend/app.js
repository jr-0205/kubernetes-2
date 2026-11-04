const $ = (selector) => document.querySelector(selector);
const money = (value) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value);

let clients = [];
let products = [];

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Error HTTP ${response.status}`);
  return data;
}

function showMessage(message, isError = false) {
  const box = $("#form-message");
  box.textContent = message;
  box.classList.toggle("error", isError);
}

async function loadClients() {
  clients = await api("/api/clientes");
  $("#client-count").textContent = clients.length;
  $("#clients-list").innerHTML = clients.map(client => `
    <div class="client-row">
      <div class="client-avatar">${client.nombre.split(" ").map(part => part[0]).slice(0,2).join("").toUpperCase()}</div>
      <div class="client-info"><strong>${escapeHtml(client.nombre)}</strong><small>${escapeHtml(client.correo)}</small></div>
    </div>`).join("") || '<p class="empty">No hay clientes registrados.</p>';
  $("#client-select").innerHTML = '<option value="">Selecciona un cliente</option>' +
    clients.map(c => `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`).join("");
}

async function loadProducts() {
  products = await api("/api/productos");
  $("#product-count").textContent = products.length;
  $("#products-table").innerHTML = products.map(product => `
    <tr><td>${escapeHtml(product.nombre)}</td><td class="price">${money(product.precio)}</td><td><span class="stock">${product.stock} uds.</span></td></tr>`).join("") ||
    '<tr><td colspan="3" class="empty">No hay productos.</td></tr>';
  $("#product-select").innerHTML = '<option value="">Selecciona un producto</option>' +
    products.map(p => `<option value="${p.id}">${escapeHtml(p.nombre)} · ${money(p.precio)}</option>`).join("");
}

async function loadOrders() {
  const orders = await api("/api/pedidos");
  $("#order-count").textContent = orders.length;
  $("#orders-list").innerHTML = orders.slice().reverse().map(order => `
    <div class="order-row"><div><strong>Pedido #${escapeHtml(order.id.slice(0,8))}</strong>
    <small>${escapeHtml(order.cliente.nombre)} · ${escapeHtml(order.producto.nombre)} × ${order.cantidad}</small></div>
    <span class="order-total">${money(order.total)}</span></div>`).join("") ||
    '<p class="empty">Todavía no hay pedidos. Crea el primero desde el formulario.</p>';
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

async function refreshAll() {
  try {
    await Promise.all([loadClients(), loadProducts()]);
    await loadOrders();
  } catch (error) {
    showMessage(`No se pudo cargar la información: ${error.message}`, true);
  }
}

$("#order-form").addEventListener("submit", async event => {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  showMessage("Registrando pedido…");
  try {
    const order = await api("/api/pedidos", {
      method: "POST",
      body: JSON.stringify({
        cliente_id: Number($("#client-select").value),
        producto_id: Number($("#product-select").value),
        cantidad: Number($("#quantity").value)
      })
    });
    showMessage(`¡Pedido creado! Total: ${money(order.total)}`);
    $("#order-form").reset();
    $("#quantity").value = 1;
    await loadOrders();
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    button.disabled = false;
  }
});

$("#refresh-products").addEventListener("click", () => loadProducts().catch(e => showMessage(e.message, true)));
$("#refresh-clients").addEventListener("click", () => loadClients().catch(e => showMessage(e.message, true)));
$("#refresh-orders").addEventListener("click", () => loadOrders().catch(e => showMessage(e.message, true)));
refreshAll();
