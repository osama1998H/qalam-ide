import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

// Syntax highlighting theme for Tarqeem
// Uses VS Code Dark+ inspired colors
export const tarqeemHighlightStyle = HighlightStyle.define([
  // Keywords - blue
  { tag: tags.keyword, color: '#569cd6', fontWeight: 'normal' },

  // Types - teal
  { tag: tags.typeName, color: '#4ec9b0' },

  // Functions - yellow
  { tag: tags.function(tags.variableName), color: '#dcdcaa' },

  // Variables - light blue
  { tag: tags.variableName, color: '#9cdcfe' },

  // Strings - orange
  { tag: tags.string, color: '#ce9178' },

  // Numbers - light green
  { tag: tags.number, color: '#b5cea8' },

  // Comments - green
  { tag: tags.comment, color: '#6a9955', fontStyle: 'italic' },

  // Doc comments - slightly brighter green
  { tag: tags.docComment, color: '#7cb85a', fontStyle: 'italic' },

  // Booleans/null - blue
  { tag: tags.bool, color: '#569cd6' },
  { tag: tags.null, color: '#569cd6' },

  // Operators - light gray
  { tag: tags.operator, color: '#d4d4d4' },

  // Punctuation - gray
  { tag: tags.punctuation, color: '#808080' },

  // Brackets
  { tag: tags.paren, color: '#ffd700' },
  { tag: tags.squareBracket, color: '#da70d6' },
  { tag: tags.brace, color: '#179fff' },

  // Property names
  { tag: tags.propertyName, color: '#9cdcfe' },

  // Class names
  { tag: tags.className, color: '#4ec9b0' },

  // Definition
  { tag: tags.definition(tags.variableName), color: '#9cdcfe' },

  // Invalid
  { tag: tags.invalid, color: '#f44747', textDecoration: 'underline wavy' }
])

export const tarqeemHighlighting = syntaxHighlighting(tarqeemHighlightStyle)
