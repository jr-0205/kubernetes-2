from flask import Flask, jsonify

app = Flask(__name__)

PRODUCTOS = [
    {"id": 1, "nombre": "Teclado mecánico", "precio": 850.00, "stock": 12},
    {"id": 2, "nombre": "Mouse inalámbrico", "precio": 420.00, "stock": 25},
    {"id": 3, "nombre": "Monitor 24 pulgadas", "precio": 2899.00, "stock": 8},
]


@app.get("/health")
def health():
    return jsonify(status="ok", service="productos"), 200


@app.get("/productos")
def listar_productos():
    return jsonify(PRODUCTOS), 200


@app.get("/productos/<int:producto_id>")
def obtener_producto(producto_id):
    producto = next((p for p in PRODUCTOS if p["id"] == producto_id), None)
    if producto is None:
        return jsonify(error="Producto no encontrado"), 404
    return jsonify(producto), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
