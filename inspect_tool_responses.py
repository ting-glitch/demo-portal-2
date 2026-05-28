import json

log_path = r"C:\Users\ting_hsia\.gemini\antigravity\brain\86e7fb38-5320-4681-80b0-99d8269a35fd\.system_generated\logs\transcript.jsonl"

with open(log_path, "r", encoding="utf-8") as f:
    for i, line in enumerate(f):
        if "app.js" in line and "1: //" in line:
            data = json.loads(line)
            print(f"--- Line {i} keys: {list(data.keys())}")
            print(f"  source: {data.get('source')}")
            print(f"  type: {data.get('type')}")
            # print all fields that have a value
            for k, v in data.items():
                if v:
                    print(f"  {k}: {str(v)[:150]}")
            break
