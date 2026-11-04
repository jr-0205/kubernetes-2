from flask import Flask, jsonify

app = Flask(__name__)

CLIENTES = [
    {"id": 1, "nombre": "Ana López", "correo": "ana@example.com"},
    {"id": 2, "nombre": "Carlos Ruiz", "correo": "carlos@example.com"},
    {"id": 3, "nombre": "María Torres", "correo": "maria@example.com"},
]


@app.get("/health")
def health():
    return jsonify(status="ok", service="clientes"), 200


@app.get("/clientes")
def listar_clientes():
    return jsonify(CLIENTES), 200


@app.get("/clientes/<int:cliente_id>")
def obtener_cliente(cliente_id):
    cliente = next((c for c in CLIENTES if c["id"] == cliente_id), None)
    if cliente is None:
        return jsonify(error="Cliente no encontrado"), 404
    return jsonify(cliente), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
