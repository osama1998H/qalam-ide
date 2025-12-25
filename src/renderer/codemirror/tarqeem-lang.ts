import { StreamLanguage } from '@codemirror/language'

// All keywords from tarqeem/src/lexer/keywords.rs
const KEYWORDS = new Set([
  // Variable declarations
  'متغير', 'ثابت',
  // Functions
  'دالة', 'أرجع', 'ارجع', 'متوازي', 'انتظر',
  // Control flow
  'إذا', 'اذا', 'وإلا', 'والا', 'تطابق', 'حالة', 'غير_ذلك',
  // Loops
  'طالما', 'لكل', 'في', 'افعل', 'أوقف', 'اوقف', 'استمر',
  // OOP
  'صنف', 'ميثاق', 'تعداد', 'يرث', 'يلتزم',
  'عام', 'خاص', 'محمي', 'مشترك', 'منشئ', 'هذا',
  'الأصل', 'الاصل', 'جديد',
  // Properties
  'خاصية', 'احصل', 'عيّن', 'عين',
  // Error handling
  'حاول', 'التقط', 'أخيراً', 'اخيرا', 'ارمِ', 'ارم',
  // Modules
  'استورد', 'صدّر', 'صدر', 'من', 'كـ', 'ك',
  // Logical operators (word form)
  'و', 'أو', 'او', 'ليس',
  // File markers
  'بسم_الله', 'الحمد_لله'
])

const TYPES = new Set([
  'عدد', 'عدد_عشري', 'نص', 'منطقي',
  'مصفوفة', 'قاموس', 'أي', 'اي'
])

const BOOLEANS = new Set([
  'صحيح', 'خطأ', 'خطا', 'لا_شيء'
])

// Arabic letter detection (matches tarqeem lexer ranges)
function isArabicLetter(ch: string): boolean {
  if (!ch) return false
  const code = ch.charCodeAt(0)
  return (
    (code >= 0x0621 && code <= 0x063a) || // Arabic letters (alef-za)
    (code >= 0x0641 && code <= 0x064a) || // Arabic letters (fa-ya)
    (code >= 0x066e && code <= 0x066f) || // Arabic dotless
    (code >= 0x0671 && code <= 0x06d3) || // Arabic extended
    code === 0x06d5 ||                    // Arabic ae
    (code >= 0x06e5 && code <= 0x06e6) || // Arabic small waw/ya
    (code >= 0x0750 && code <= 0x077f) || // Arabic Supplement
    (code >= 0x08a0 && code <= 0x08ff) || // Arabic Extended-A
    (code >= 0xfb50 && code <= 0xfdff) || // Arabic Presentation Forms-A
    (code >= 0xfe70 && code <= 0xfeff)    // Arabic Presentation Forms-B
  )
}

// Arabic-Indic digits (٠-٩)
function isArabicDigit(ch: string): boolean {
  if (!ch) return false
  const code = ch.charCodeAt(0)
  return code >= 0x0660 && code <= 0x0669
}

function isIdentifierStart(ch: string): boolean {
  return ch === '_' || isArabicLetter(ch)
}

function isIdentifierContinue(ch: string): boolean {
  return (
    isIdentifierStart(ch) ||
    /[0-9]/.test(ch) ||
    isArabicDigit(ch) ||
    ch === '\u0640' // tatweel
  )
}

// StreamLanguage tokenizer for Tarqeem
export const tarqeemStreamParser = StreamLanguage.define({
  name: 'tarqeem',

  token(stream) {
    // Skip whitespace
    if (stream.eatSpace()) return null

    const ch = stream.peek()
    if (!ch) return null

    // Single-line comment
    if (stream.match('//')) {
      // Check for doc comment ///
      if (stream.peek() === '/') {
        stream.next()
        stream.skipToEnd()
        return 'comment docComment'
      }
      stream.skipToEnd()
      return 'comment'
    }

    // Multi-line comment
    if (stream.match('/*')) {
      // Check for doc comment /**
      const isDoc = stream.peek() === '*' && stream.peek() !== '/'
      while (!stream.eol()) {
        if (stream.match('*/')) break
        stream.next()
      }
      return isDoc ? 'comment docComment' : 'comment'
    }

    // String literals
    if (ch === '"' || ch === "'" || ch === '«') {
      const closing = ch === '«' ? '»' : ch
      stream.next()
      while (!stream.eol()) {
        const c = stream.next()
        if (c === '\\') {
          stream.next() // escape
        } else if (c === closing) {
          break
        }
      }
      return 'string'
    }

    // Numbers (ASCII and Arabic-Indic)
    if (/[0-9]/.test(ch) || isArabicDigit(ch)) {
      stream.eatWhile((c: string) => /[0-9.]/.test(c) || isArabicDigit(c))
      // Scientific notation
      if (stream.eat(/[eE]/)) {
        stream.eat(/[+-]/)
        stream.eatWhile(/[0-9]/)
      }
      return 'number'
    }

    // Identifiers and keywords
    if (isIdentifierStart(ch)) {
      stream.next()
      while (!stream.eol() && isIdentifierContinue(stream.peek() || '')) {
        stream.next()
      }
      const word = stream.current()

      if (KEYWORDS.has(word)) return 'keyword'
      if (TYPES.has(word)) return 'typeName'
      if (BOOLEANS.has(word)) return 'bool'

      // Check if followed by ( for function detection
      if (stream.peek() === '(') return 'function'

      return 'variableName'
    }

    // Multi-character operators
    if (stream.match('==') || stream.match('!=') ||
        stream.match('<=') || stream.match('>=') ||
        stream.match('->') || stream.match('=>') ||
        stream.match('++') || stream.match('--') ||
        stream.match('&&') || stream.match('||') ||
        stream.match('+=') || stream.match('-=') ||
        stream.match('*=') || stream.match('/=') ||
        stream.match('**')) {
      return 'operator'
    }

    // Single-character operators
    if (/[+\-*/%=<>!&|^~]/.test(ch)) {
      stream.next()
      return 'operator'
    }

    // Punctuation (both ASCII and Arabic)
    if (/[(){}[\].:;,،؛?؟]/.test(ch)) {
      stream.next()
      return 'punctuation'
    }

    // Unknown character
    stream.next()
    return null
  },

  languageData: {
    commentTokens: { line: '//', block: { open: '/*', close: '*/' } }
  }
})
