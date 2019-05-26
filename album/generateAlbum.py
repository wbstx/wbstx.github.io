import os
from yattag import Doc

file = open('index_g.md', 'r')
head = """---
title: album
date: 2019-05-26 15:39:42
---
"""
doc, tag, text = Doc().tagtext()

with tag('center', style='margin-top: 20px; margin-bottom: 20px;'):
    for i in range(0, 3):
        doc.stag('a', href='https://welostthesea.bandcamp.com/album/departure-songs')
        doc.stag('img', src='https://f4.bcbits.com/img/a2633842828_10.jpg', align='left', style='margin-right: 10px; width: 200px; height: 200px')


print(doc.getvalue())

file.write(head)
file.write(doc.getvalue())