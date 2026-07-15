import re

# Read updated HTML
with open('public/game-builtins/truth-or-dare.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Escape for JS template literal
escaped = html.replace('\\', '\\\\').replace('`', '\\`').replace('$', '\\$')
new_export = 'export const TRUTH_OR_DARE_GAME_HTML = `' + escaped + '`;'

# Replace in game-builtin-html.ts
with open('lib/game-builtin-html.ts', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'export const TRUTH_OR_DARE_GAME_HTML = .*?;\n'
replaced = re.sub(pattern, new_export + '\n', content, flags=re.DOTALL)

with open('lib/game-builtin-html.ts', 'w', encoding='utf-8') as f:
    f.write(replaced)

print('Done:', len(html), 'chars written')
