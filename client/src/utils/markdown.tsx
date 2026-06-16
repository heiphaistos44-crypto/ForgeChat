// Parser Markdown minimaliste compatible Discord
export function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // Bloc de code ```
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      elements.push(
        <pre key={i}>
          <code>{codeLines.join('\n')}</code>
        </pre>
      )
      i++
      continue
    }

    // Citation >
    if (line.startsWith('> ')) {
      elements.push(<blockquote key={i}>{inlineMarkdown(line.slice(2))}</blockquote>)
      i++
      continue
    }

    // Ligne vide
    if (line.trim() === '') {
      elements.push(<br key={i} />)
      i++
      continue
    }

    // Ligne normale avec inline markdown
    elements.push(<span key={i} style={{ display: 'block' }}>{inlineMarkdown(line)}</span>)
    i++
  }

  return <div className="fc-markdown">{elements}</div>
}

function inlineMarkdown(text: string): React.ReactNode {
  // Ordre : code inline > gras+italique > gras > italique > barré > liens > mentions > spoiler
  const parts = tokenize(text)
  return <>{parts}</>
}

function tokenize(text: string): React.ReactNode[] {
  // Regex pour détecter les tokens inline
  const pattern = /(`[^`]+`|\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|__(.+?)__|_(.+?)_|~~(.+?)~~|\|\|(.+?)\|\||<@[^>]+>|https?:\/\/\S+)/g
  const result: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    // Texte avant
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index))
    }

    const full = match[0]

    if (full.startsWith('`') && full.endsWith('`')) {
      result.push(<code key={match.index}>{full.slice(1, -1)}</code>)
    } else if (full.startsWith('***') && full.endsWith('***')) {
      result.push(<strong key={match.index}><em>{full.slice(3, -3)}</em></strong>)
    } else if (full.startsWith('**') && full.endsWith('**')) {
      result.push(<strong key={match.index}>{full.slice(2, -2)}</strong>)
    } else if ((full.startsWith('*') && full.endsWith('*')) || (full.startsWith('_') && full.endsWith('_'))) {
      result.push(<em key={match.index}>{full.slice(1, -1)}</em>)
    } else if (full.startsWith('__') && full.endsWith('__')) {
      result.push(<u key={match.index}>{full.slice(2, -2)}</u>)
    } else if (full.startsWith('~~') && full.endsWith('~~')) {
      result.push(<del key={match.index}>{full.slice(2, -2)}</del>)
    } else if (full.startsWith('||') && full.endsWith('||')) {
      result.push(
        <SpoilerText key={match.index} text={full.slice(2, -2)} />
      )
    } else if (full.startsWith('<@')) {
      result.push(<span key={match.index} className="mention">{full}</span>)
    } else if (full.startsWith('http')) {
      result.push(
        <a key={match.index} href={full} target="_blank" rel="noopener noreferrer">
          {full}
        </a>
      )
    } else {
      result.push(full)
    }

    lastIndex = match.index + full.length
  }

  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex))
  }

  return result
}

import { useState } from 'react'

function SpoilerText({ text }: { text: string }) {
  const [revealed, setRevealed] = useState(false)
  return (
    <span
      onClick={() => setRevealed(true)}
      className={`rounded px-0.5 cursor-pointer transition-colors ${
        revealed ? 'bg-transparent' : 'bg-fc-muted/40 text-transparent select-none hover:bg-fc-muted/60'
      }`}
    >
      {text}
    </span>
  )
}
