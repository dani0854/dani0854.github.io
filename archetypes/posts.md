---
title: '{{ replace .File.ContentBaseName `-` ` ` | title }}'
date: '{{ now.UTC.Format "2006-01-02" }}'
tags: []
categories: []
description:
featuredImage: 'images/{{ .File.ContentBaseName }}.webp'
---
