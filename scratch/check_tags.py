import re

with open("app/historical/page.tsx", "r", encoding="utf-8") as f:
    code = f.read()

# Let's find all tags.
# We can use a simple regex to find JSX opening/closing tags.
# We're looking for things like <div> or </div>, <LineChart ...> or </LineChart>, etc.
# Note: Self-closing tags like <CartesianGrid ... /> should be ignored.
# Let's also ignore strings, comments, etc. if possible, but let's do a simple regex tag parser first.

# Regex to match tags
# Opening tag: <[A-Za-z0-9_]+ (attributes) > or <[A-Za-z0-9_]+>
# Closing tag: </[A-Za-z0-9_]+>
# Self-closing tag: <[A-Za-z0-9_]+ ... />

# Let's extract all tokens resembling JSX tags
tag_pattern = re.compile(r'</?([A-Za-z0-9_]+)(?:\s+[^>]*?)?/?>')

# Find all matches
matches = tag_pattern.finditer(code)

tag_stack = []
for m in matches:
    full_tag = m.group(0)
    tag_name = m.group(1)
    
    # Ignore HTML entities or non-JSX things
    # E.g., < -0.5 is not a tag but might be matched if it looks like one,
    # but tag_name has to start with letter or number.
    # Also check if it's self-closing (ends with '/>')
    if full_tag.endswith('/>'):
        continue
    
    if full_tag.startswith('</'):
        # Closing tag
        if not tag_stack:
            print(f"Unmatched closing tag: {full_tag} at character index {m.start()}")
        else:
            top_tag, top_idx = tag_stack.pop()
            if top_tag != tag_name:
                print(f"Mismatch: Opened <{top_tag}> at index {top_idx}, but closed with {full_tag} at index {m.start()}")
    elif full_tag.startswith('<'):
        # Opening tag
        tag_stack.append((tag_name, m.start()))

if tag_stack:
    print("Unclosed tags remaining:")
    for tag, idx in tag_stack:
        start = max(0, idx - 40)
        end = min(len(code), idx + 100)
        snippet = code[start:end].replace('\n', ' ')
        print(f"  <{tag}> at index {idx}: ... {snippet} ...")
