with open("app/historical/page.tsx", "r", encoding="utf-8") as f:
    code = f.read()

stack = []
for i, char in enumerate(code):
    if char in "({[":
        stack.append((char, i))
    elif char in ")}]":
        if not stack:
            print(f"Extra closing char '{char}' at index {i}")
        else:
            top_char, top_idx = stack.pop()
            if (char == ")" and top_char != "(") or \
               (char == "}" and top_char != "{") or \
               (char == "]" and top_char != "["):
                print(f"Mismatch: '{top_char}' at index {top_idx} matched with '{char}' at index {i}")

if stack:
    print(f"Unclosed brackets left in stack:")
    for char, idx in stack:
        # print snippet
        start = max(0, idx - 40)
        end = min(len(code), idx + 40)
        snippet = code[start:end].replace('\n', ' ')
        print(f"  '{char}' at index {idx}: ... {snippet} ...")
