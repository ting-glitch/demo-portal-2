import json
import os

log_path = r"C:\Users\ting_hsia\.gemini\antigravity\brain\86e7fb38-5320-4681-80b0-99d8269a35fd\.system_generated\logs\transcript.jsonl"

app_js_parts = {}

with open(log_path, "r", encoding="utf-8") as f:
    for line in f:
        try:
            data = json.loads(line)
            # Find steps that are VIEW_FILE
            if data.get("type") == "VIEW_FILE":
                content_val = data.get("content", "")
                # Double check if this is app.js (we can check if it has the specific comments or if the args contains app.js)
                # But to be safe, if we find line '1: //' and 'Total Lines: 1637' or 'Total Bytes: 71109' in the content, it is app.js!
                is_app_js = "Total Lines: 1637" in content_val or "Total Bytes: 71109" in content_val or "lucide.createIcons()" in content_val
                
                # Check if it contains lines
                if is_app_js or any("app.js" in str(tc.get("args", {}).get("AbsolutePath", "")) for tc in data.get("tool_calls", [])):
                    is_app_js = True
                
                if is_app_js:
                    print(f"Found app.js VIEW_FILE block at step {data.get('step_index')}")
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

if len(app_js_parts) >= 1630: # 1637 is total
    # Sort by line number and write back to static/js/app.js
    sorted_lines = [app_js_parts[k] for k in sorted(app_js_parts.keys())]
    js_content = "\n".join(sorted_lines)
    
    js_path = os.path.join("static", "js", "app.js")
    with open(js_path, "w", encoding="utf-8") as f:
        f.write(js_content)
    print("RESTORE SUCCESSFUL!")
else:
    print("Could not extract complete app.js. Lines extracted:", len(app_js_parts))
