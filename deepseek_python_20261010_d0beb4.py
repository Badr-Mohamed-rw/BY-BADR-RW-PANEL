#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import re
import glob

BASE = os.path.dirname(os.path.abspath(__file__))

MARKER = '/* kill-tatnet-badge */'

KILLER = (
    '<script>' + MARKER + '\n'
    '(function(){\n'
    '  "use strict";\n'
    '  var RE = /^x-[a-z0-9]{4,12}-b$/;\n'
    '\n'
    '  // 1) Блокируем создание shadow DOM для подозрительных тегов\n'
    '  var origAS = Element.prototype.attachShadow;\n'
    '  if (origAS) {\n'
    '    Element.prototype.attachShadow = function(init){\n'
    '      var t = this && this.tagName ? String(this.tagName).toLowerCase() : "";\n'
    '      if (RE.test(t)) {\n'
    '        throw new DOMException("blocked", "NotSupportedError");\n'
    '      }\n'
    '      return origAS.call(this, init);\n'
    '    };\n'
    '  }\n'
    '\n'
    '  // 2) Не даём добавить подозрительный элемент в DOM\n'
    '  var origAC = Node.prototype.appendChild;\n'
    '  Node.prototype.appendChild = function(child){\n'
    '    if (child && child.nodeType === 1 && child.tagName) {\n'
    '      var t = String(child.tagName).toLowerCase();\n'
    '      if (RE.test(t)) return child;\n'
    '    }\n'
    '    return origAC.call(this, child);\n'
    '  };\n'
    '\n'
    '  // 3) Игнорируем MutationObserver-восстановление\n'
    '  var origObs = window.MutationObserver;\n'
    '  if (origObs) {\n'
    '    window.MutationObserver = function(cb){\n'
    '      var safe = function(muts, obs){\n'
    '        var filtered = [];\n'
    '        for (var i = 0; i < muts.length; i++) {\n'
    '          var m = muts[i];\n'
    '          if (m.type === "childList" && m.addedNodes && m.addedNodes.length) {\n'
    '            var bad = false;\n'
    '            for (var j = 0; j < m.addedNodes.length; j++) {\n'
    '              var n = m.addedNodes[j];\n'
    '              if (n && n.nodeType === 1 && n.tagName && RE.test(String(n.tagName).toLowerCase())) {\n'
    '                bad = true; break;\n'
    '              }\n'
    '            }\n'
    '            if (bad) continue;\n'
    '          }\n'
    '          filtered.push(m);\n'
    '        }\n'
    '        if (filtered.length) cb(filtered, obs);\n'
    '      };\n'
    '      return new origObs(safe);\n'
    '    };\n'
    '  }\n'
    '})();\n'
    '</script>'
)


def fix_html(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # уже стоит?
    if MARKER in content:
        return False

    # ищем <head ...>
    m = re.search(r'<head\b[^>]*>', content, re.IGNORECASE)
    if not m:
        return False

    insert_pos = m.end()
    new_content = content[:insert_pos] + '\n' + KILLER + content[insert_pos:]

    # бэкап
    bak = path + '.bak'
    if not os.path.exists(bak):
        with open(bak, 'w', encoding='utf-8') as f:
            f.write(content)

    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(new_content)
    return True


def main():
    print('=' * 55)
    print('  kill-tatnet-badge — вставляю киллер в HTML')
    print('=' * 55)
    print('')

    count = 0
    for path in sorted(glob.glob(os.path.join(BASE, '*.html'))):
        try:
            if fix_html(path):
                print('[+] ' + os.path.basename(path))
                count += 1
            else:
                print('[ ] ' + os.path.basename(path) + ' — пропуск')
        except Exception as e:
            print('[!] ' + os.path.basename(path) + ' — ' + str(e))

    print('')
    print('Готово. Файлов: ' + str(count))
    print('Бэкапы: *.html.bak')
    print('Дальше: Ctrl+F5 в браузере.')
    print('')
    try:
        input('Enter...')
    except EOFError:
        pass


if __name__ == '__main__':
    main()