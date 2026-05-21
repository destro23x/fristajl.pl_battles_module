from openrouter import OpenRouter
import os
with OpenRouter(api_key=os.getenv("OPENROUTER_API_KEY")) as client:
    response = client.chat.send(
        # https://openrouter.ai/collections/free-models
        # z-ai/glm-4.5-air:free 
        # openrouter/free
        # poolside/laguna-m.1:free
        # openai/gpt-oss-120b:free
        # poolside/laguna-xs.2:free
        # nvidia/nemotron-3-nano-30b-a3b:free
        # openai/gpt-oss-20b:free
        # arcee-ai/trinity-large-thinking:free
        # baidu/cobuddy:free
        # nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free
        # nvidia/nemotron-nano-9b-v2:free
        # nvidia/nemotron-3-super-120b-a12b:free
        model="nvidia/nemotron-3-super-120b-a12b:free", 
        messages=[
            {"role": "user", "content": "Daj mi 100 tematów do freestyle'u"}
        ],
    )
    print(response.choices[0].message.content)