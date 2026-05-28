import json
import os

log_path = r"C:\Users\ting_hsia\.gemini\antigravity\brain\86e7fb38-5320-4681-80b0-99d8269a35fd\.system_generated\logs\transcript.jsonl"

app_js_parts = {}

with open(log_path, "r", encoding="utf-8") as f:
    for line in f:
        try:
            data = json.loads(line)
            # The field where the tool response is stored is 'content'
            content_val = data.get("content", "")
            if "static/js/app.js" in content_val or "static\\\\js\\\\app.js" in content_val or "1: // ==" in content_val:
                # Extract the lines
                # The format is "<line_number>: <original_line>"
                for ol in content_val.split("\n"):
                    if ":" in ol:
                        parts = ol.split(":", 1)
                        try:
                            ln = int(parts[0].strip())
                            code = parts[1]
                            if code.startswith(" "):
                                code = code[1:]
                            app_js_parts[ln] = code
                        except ValueError:
                            pass
        except Exception as e:
            pass

print(f"Extracted {len(app_js_parts)} lines of app.js from transcript!")

if len(app_js_parts) > 1500:
    # Sort by line number and write back to static/js/app.js
    sorted_lines = [app_js_parts[k] for k in sorted(app_js_parts.keys())]
    js_content = "\n".join(sorted_lines)
    
    js_path = os.path.join("static", "js", "app.js")
    with open(js_path, "w", encoding="utf-8") as f:
        f.write(js_content)
    print("RESTORE SUCCESSFUL!")
else:
    print("Could not extract complete app.js from transcript. Extracted line count is too low:", len(app_js_parts))
