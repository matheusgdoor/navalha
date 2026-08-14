"use client";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Box,
  Minus,
  Pencil,
  Plus,
  Power,
  ShoppingCart,
  TrendingDown,
  X,
} from "lucide-react";
import { maskMoney, moneyToCents } from "@/lib/masks";
const money = (c: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    c / 100,
  );
export default function Sales() {
  const [products, setProducts] = useState<any[]>([]),
    [sales, setSales] = useState<any[]>([]),
    [clients, setClients] = useState<any[]>([]),
    [cart, setCart] = useState<Record<string, number>>({}),
    [message, setMessage] = useState(""),
    [productMessage, setProductMessage] = useState(""),
    [productSaving, setProductSaving] = useState(false),
    [editingProduct, setEditingProduct] = useState<any>(null);
  const load = useCallback(async () => {
    const [p, s, c] = await Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/sales").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
    ]);
    setProducts(Array.isArray(p) ? p : []);
    setSales(Array.isArray(s) ? s : []);
    setClients(Array.isArray(c) ? c : []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const total = useMemo(
    () =>
      products.reduce((n, p) => n + (cart[p.id] || 0) * p.salePriceCents, 0),
    [products, cart],
  );
  function qty(id: string, n: number) {
    const p = products.find((x) => x.id === id);
    setCart((x) => ({
      ...x,
      [id]: Math.max(0, Math.min(p.stock, (x[id] || 0) + n)),
    }));
  }
  async function product(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = Object.fromEntries(new FormData(form));
    setProductSaving(true);
    setProductMessage("");
    try {
      const r = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.name,
          sku: f.sku,
          salePriceCents: moneyToCents(String(f.salePrice)),
          costPriceCents: moneyToCents(String(f.costPrice || "")),
          stock: Number(f.stock),
          minStock: Number(f.minStock),
        }),
      });
      const x = await r.json().catch(() => ({
        error: "O servidor não retornou uma resposta válida.",
      }));
      setProductMessage(r.ok ? "Produto cadastrado com sucesso." : x.error);
      if (r.ok) {
        form.reset();
        await load();
      } else if (r.status === 409) {
        await load();
      }
    } catch {
      setProductMessage("Não foi possível cadastrar o produto agora.");
    } finally {
      setProductSaving(false);
    }
  }
  async function stock(p: any) {
    const value = prompt("Quantidade para adicionar ao estoque", "1");
    if (!value) return;
    const r = await fetch(`/api/products/${p.id}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: Number(value),
          type: "ENTRY",
          notes: "Entrada manual",
        }),
      }),
      x = await r.json();
    setMessage(r.ok ? "Estoque atualizado." : x.error);
    if (r.ok) load();
  }
  async function saveProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setProductSaving(true);
    const response = await fetch(`/api/products/${editingProduct.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        sku: form.get("sku"),
        costPriceCents: moneyToCents(String(form.get("costPrice"))),
        salePriceCents: moneyToCents(String(form.get("salePrice"))),
        minStock: Number(form.get("minStock")),
        active: editingProduct.active,
      }),
    });
    const result = await response.json();
    setProductSaving(false);
    if (!response.ok) {
      setProductMessage(result.error);
      return;
    }
    setProductMessage("Produto atualizado com sucesso.");
    setEditingProduct(null);
    await load();
  }
  async function toggleProduct() {
    const next = !editingProduct.active;
    if (!confirm(`${next ? "Ativar" : "Desativar"} este produto?`)) return;
    setProductSaving(true);
    const response = await fetch(`/api/products/${editingProduct.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editingProduct.name,
        sku: editingProduct.sku || "",
        costPriceCents: editingProduct.costPriceCents,
        salePriceCents: editingProduct.salePriceCents,
        minStock: editingProduct.minStock,
        active: next,
      }),
    });
    const result = await response.json();
    setProductSaving(false);
    if (!response.ok) {
      setProductMessage(result.error);
      return;
    }
    setEditingProduct(null);
    setProductMessage(next ? "Produto ativado." : "Produto desativado.");
    await load();
  }
  async function sell(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      items = Object.entries(cart)
        .filter(([, q]) => q > 0)
        .map(([productId, quantity]) => ({ productId, quantity }));
    const r = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: f.get("clientId") || null,
          method: f.get("method"),
          items,
        }),
      }),
      x = await r.json();
    setMessage(r.ok ? `Venda concluída: ${money(x.totalCents)}` : x.error);
    if (r.ok) {
      setCart({});
      load();
    }
  }
  return (
    <main className="salesPage">
      <a href="/app" className="backLink">
        <ArrowLeft />
        Voltar ao painel
      </a>
      <div className="managementHead">
        <div>
          <p>LOJA E ESTOQUE</p>
          <h1>Produtos e vendas</h1>
          <small>Controle o estoque e registre vendas no balcão.</small>
        </div>
      </div>
      {message && <div className="subscriptionMessage">{message}</div>}
      <section className="salesMetrics">
        <article className="panel">
          <Box />
          <span>
            <small>Produtos ativos</small>
            <b>{products.filter((p) => p.active).length}</b>
          </span>
        </article>
        <article className="panel warning">
          <TrendingDown />
          <span>
            <small>Estoque baixo</small>
            <b>{products.filter((p) => p.stock <= p.minStock).length}</b>
          </span>
        </article>
        <article className="panel">
          <ShoppingCart />
          <span>
            <small>Vendas registradas</small>
            <b>{sales.length}</b>
          </span>
        </article>
      </section>
      <section className="salesLayout">
        <div>
          <section className="panel productCatalog">
            <h2>Catálogo</h2>
            {products.map((p) => (
              <article
                key={p.id}
                className={p.stock <= p.minStock ? "low" : ""}
              >
                <div>
                  <b>{p.name}</b>
                  <small>
                    {p.sku || "Sem SKU"} · Estoque: {p.stock}
                  </small>
                </div>
                <strong>{money(p.salePriceCents)}</strong>
                <div className="qty">
                  <button onClick={() => qty(p.id, -1)}>
                    <Minus />
                  </button>
                  <span>{cart[p.id] || 0}</span>
                  <button onClick={() => qty(p.id, 1)} disabled={!p.stock}>
                    <Plus />
                  </button>
                </div>
                <button className="stockButton" onClick={() => stock(p)}>
                  Entrada
                </button>
                <button
                  className="editProductButton"
                  onClick={() => setEditingProduct(p)}
                  aria-label={`Editar ${p.name}`}
                >
                  <Pencil />
                </button>
              </article>
            ))}
          </section>
          <section className="panel saleHistory">
            <h2>Últimas vendas</h2>
            {sales.map((s) => (
              <article key={s.id}>
                <div>
                  <b>{s.client}</b>
                  <small>
                    {new Date(s.createdAt).toLocaleString("pt-BR")} · {s.items}{" "}
                    itens
                  </small>
                </div>
                <span>{s.method}</span>
                <strong>{money(s.totalCents)}</strong>
              </article>
            ))}
          </section>
        </div>
        <aside>
          <form className="panel checkoutBox" onSubmit={sell}>
            <h2>
              <ShoppingCart />
              Nova venda
            </h2>
            <label>
              Cliente
              <select name="clientId">
                <option value="">Consumidor</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Pagamento
              <select name="method">
                <option value="PIX">PIX</option>
                <option value="CARD">Cartão</option>
                <option value="CASH">Dinheiro</option>
              </select>
            </label>
            <div className="cartLines">
              {products
                .filter((p) => cart[p.id])
                .map((p) => (
                  <span key={p.id}>
                    {p.name} × {cart[p.id]}
                    <b>{money(p.salePriceCents * cart[p.id])}</b>
                  </span>
                ))}
            </div>
            <strong className="cartTotal">
              Total <b>{money(total)}</b>
            </strong>
            <button disabled={!total}>Finalizar venda</button>
          </form>
          <form className="panel newProduct" onSubmit={product}>
            <h2>Novo produto</h2>
            <label>
              Nome
              <input name="name" required />
            </label>
            <div>
              <label>
                SKU
                <input name="sku" />
              </label>
              <label>
                Estoque
                <input
                  name="stock"
                  type="number"
                  min="0"
                  defaultValue="0"
                  required
                />
              </label>
            </div>
            <div>
              <label>
                Preço de custo
                <input
                  name="costPrice"
                  inputMode="numeric"
                  placeholder="0,00"
                  onChange={(e) =>
                    (e.currentTarget.value = maskMoney(e.currentTarget.value))
                  }
                />
              </label>
              <label>
                Preço de venda
                <input
                  name="salePrice"
                  inputMode="numeric"
                  placeholder="0,00"
                  onChange={(e) =>
                    (e.currentTarget.value = maskMoney(e.currentTarget.value))
                  }
                  required
                />
              </label>
            </div>
            <label>
              Estoque mínimo
              <input
                name="minStock"
                type="number"
                min="0"
                defaultValue="2"
                required
              />
            </label>
            {productMessage && (
              <div className="productInlineMessage">{productMessage}</div>
            )}
            <button disabled={productSaving}>
              {productSaving ? "Cadastrando..." : "Cadastrar produto"}
            </button>
          </form>
        </aside>
      </section>
      {editingProduct && (
        <div
          className="productModalBackdrop"
          onMouseDown={() => setEditingProduct(null)}
        >
          <form
            className="panel productEditModal"
            onSubmit={saveProduct}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="productModalClose"
              onClick={() => setEditingProduct(null)}
            >
              <X />
            </button>
            <p>PRODUTO</p>
            <h2>Editar produto</h2>
            <label>
              Nome
              <input name="name" defaultValue={editingProduct.name} required />
            </label>
            <label>
              SKU
              <input name="sku" defaultValue={editingProduct.sku || ""} />
            </label>
            <div>
              <label>
                Preço de custo
                <input
                  name="costPrice"
                  defaultValue={money(editingProduct.costPriceCents).replace(
                    "R$ ",
                    "",
                  )}
                  onChange={(e) =>
                    (e.currentTarget.value = maskMoney(e.currentTarget.value))
                  }
                  required
                />
              </label>
              <label>
                Preço de venda
                <input
                  name="salePrice"
                  defaultValue={money(editingProduct.salePriceCents).replace(
                    "R$ ",
                    "",
                  )}
                  onChange={(e) =>
                    (e.currentTarget.value = maskMoney(e.currentTarget.value))
                  }
                  required
                />
              </label>
            </div>
            <label>
              Estoque mínimo
              <input
                name="minStock"
                type="number"
                min="0"
                defaultValue={editingProduct.minStock}
                required
              />
            </label>
            <button className="saveProduct" disabled={productSaving}>
              {productSaving ? "Salvando..." : "Salvar alterações"}
            </button>
            <button
              type="button"
              className={
                editingProduct.active ? "disableProduct" : "enableProduct"
              }
              onClick={toggleProduct}
              disabled={productSaving}
            >
              <Power />{" "}
              {editingProduct.active ? "Desativar produto" : "Ativar produto"}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
