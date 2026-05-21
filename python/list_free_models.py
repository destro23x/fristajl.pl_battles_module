import requests

models = requests.get(
    "https://openrouter.ai/api/v1/models"
).json()["data"]

free_models = [
    {
        "id": m["id"],
        "name": m["name"],
        "context": m.get("context_length"),
    }
    for m in models
    if m["id"].endswith(":free")
]

for model in free_models:
    print(model)
