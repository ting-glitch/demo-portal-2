from google import genai
import os

print("Checking Gemini Client...")
print("GEMINI_API_KEY in env:", "GEMINI_API_KEY" in os.environ)

try:
    client = genai.Client()
    print("Client initialized successfully.")
    
    # Simple call using gemini-2.5-flash
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents='請用繁體中文說：你好，我準備好為您辨識信用卡帳單了！'
    )
    print("\nGemini Response:")
    print(response.text)
except Exception as e:
    print("\nInitialization or Call Error:")
    print(e)
