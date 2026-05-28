from oletools.olevba import VBA_Parser
import os

xlsm_path = "vba/信用卡明細彙整表_解答.xlsm"
output_path = "vba_code.txt"

print(f"Parsing VBA from {xlsm_path}...")
if not os.path.exists(xlsm_path):
    print("Error: xlsm file not found!")
    exit(1)

try:
    parser = VBA_Parser(xlsm_path)
    if parser.detect_vba_macros():
        print("VBA macros detected!")
        with open(output_path, "w", encoding="utf-8") as f:
            for item in parser.extract_macros():
                f.write("=========================================\n")
                f.write(f"Item length: {len(item)}\n")
                for i, part in enumerate(item):
                    f.write(f"Part {i} type: {type(part)}\n")
                    if isinstance(part, str):
                        # print first 200 chars of code
                        f.write(f"Part {i} content:\n{part[:500]}\n...\n")
                    else:
                        f.write(f"Part {i} content: {part}\n")
                
                # Write full code if it's the code part.
                # In oletools 0.60+, extract_macros yields: (subfilename, stream_path, vba_filename, vba_code)
                if len(item) >= 4:
                    f.write("\n--- FULL VBA CODE ---\n")
                    f.write(item[3])
                    f.write("\n")
                
        print(f"VBA code extracted and written to {output_path}")
    else:
        print("No VBA macros detected.")
except Exception as e:
    print(f"An error occurred: {e}")
