import os
from yattag import Doc

file = open('index.md', 'w')
albums_txt = open('albums.txt', 'r')
albums = []
for line in albums_txt.readlines():
    urls = line.split(' ')
    albums.append(urls)

head = """
---
title: album
date: 2019-05-26 15:39:42
---
"""
doc, tag, text = Doc().tagtext()

total_albums = len(albums)
for idx_album in range(0, int(total_albums / 3)):
    with tag('center', style='margin-top: 5px; margin-bottom: 5px;'):
        for i in range(0, 3):
            doc.stag('a', href=albums[i + 3 * idx_album][0])
            doc.stag('img', src=albums[i + 3 * idx_album][1], align='left', style='margin-right: 10px; width: 200px; height: 200px')

file.write(head)
file.write(doc.getvalue())