from pathlib import Path
import re

path = Path('src/app/dashboard/page.js')
text = path.read_text('utf-8')
# Start from the main render return to avoid the early lockout return.
main_return_index = text.find('return (', text.find('return (') + 1)
if main_return_index == -1:
    raise SystemExit('main return not found')
text = text[main_return_index:]
file_start_line = text[:0].count('\n')

# Remove JavaScript expressions inside braces to reduce false positives.
def strip_js_expressions(s):
    depth = 0
    out = []
    i = 0
    while i < len(s):
        ch = s[i]
        if ch == '{':
            depth += 1
            i += 1
            while i < len(s) and depth > 0:
                if s[i] == '{':
                    depth += 1
                elif s[i] == '}':
                    depth -= 1
                i += 1
            continue
        out.append(ch)
        i += 1
    return ''.join(out)

clean_text = strip_js_expressions(text)
clean_text = re.sub(r'<!--.*?-->', '', clean_text, flags=re.DOTALL)

pattern = re.compile(r'<(/?)([A-Za-z][A-Za-z0-9_:-]*)([^>]*?)(/?)>', re.DOTALL)
stack = []
for match in pattern.finditer(clean_text):
    tag = match.group(2)
    closing = match.group(1) == '/'
    self_closing = bool(match.group(4)) or tag.lower() in ['img','input','br','hr','meta','link','path','svg']
    start_index = match.start()
    line = clean_text.count('\n', 0, start_index) + 1
    if closing:
        if stack and stack[-1][0] == tag:
            stack.pop()
        else:
            print('UNMATCHED CLOSE', tag, 'line', line, 'text=', match.group(0))
            print('STACK TOP', stack[-1] if stack else None)
            raise SystemExit(1)
    else:
        if not self_closing:
            stack.append((tag, line))

print('STACK LENGTH', len(stack))
print('STACK TOP 20', stack[-20:])
