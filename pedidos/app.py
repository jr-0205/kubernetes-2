import os
from uuid import uuid4

import requests
from flask import Flask, jsonify, request

app = Flask(__name__)

CLIENTES_URL = os.getenv("CLIENTES_URL", "http://clientes:5000")
PRODUCTOS_URL = os.getenv("PRODUCTOS_URL", "http://productos:5000")
TIMEOUT_SECONDS = 3
PEDIDOS = []


@app.get("/health")
def health():
    return jsonify(status="ok", service="pedidos"), 200


@app.get("/pedidos")
def listar_pedidos():
    return jsonify(PEDIDOS), 200


@app.post("/pedidos")
def crear_pedido():
    datos = request.get_json(silent=True) or {}
    cliente_id = datos.get("cliente_id")
    producto_id = datos.get("producto_id")
    cantidad = datos.get("cantidad", 1)

    if not isinstance(cliente_id, int) or not isinstance(producto_id, int):
        return jsonify(error="cliente_id y producto_id deben ser números enteros"), 400
    if not isinstance(cantidad, int) or cantidad < 1:
        return jsonify(error="cantidad debe ser un entero mayor que cero"), 400

    try:
        cliente_response = requests.get(
            f"{CLIENTES_URL}/clientes/{cliente_id}", timeout=TIMEOUT_SECONDS
        )
        producto_response = requests.get(
            f"{PRODUCTOS_URL}/productos/{producto_id}", timeout=TIMEOUT_SECONDS
        )
    except requests.RequestException:
        return jsonify(error="No fue posible contactar los servicios de clientes o productos"), 503

    if cliente_response.status_code == 404:
        return jsonify(error="El cliente indicado no existe"), 404
    if producto_response.status_code == 404:
        return jsonify(error="El producto indicado no existe"), 404
    if not cliente_response.ok or not producto_response.ok:
        return jsonify(error="Error al consultar clientes o productos"), 502

    cliente = cliente_response.json()
    producto = producto_response.json()
    pedido = {
        "id": str(uuid4()),
        "cliente": cliente,
        "producto": producto,
        "cantidad": cantidad,
        "total": round(producto["precio"] * cantidad, 2),
    }
    PEDIDOS.append(pedido)
    return jsonify(pedido), 201


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
