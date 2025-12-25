# Qalam IDE | محرر قلم

<div align="center">

![Qalam IDE](https://img.shields.io/badge/Qalam-IDE-blue?style=for-the-badge)
![Version](https://img.shields.io/badge/version-0.1.0-green?style=for-the-badge)
![Platform](https://img.shields.io/badge/platform-macOS%20|%20Windows%20|%20Linux-lightgrey?style=for-the-badge)

**RTL-first IDE for the Tarqeem Arabic Programming Language**

محرر برمجي متكامل للغة ترقيم العربية

[English](#english) | [العربية](#العربية)

</div>

---

## English

### About

Qalam IDE is a modern, RTL-first integrated development environment designed specifically for [Tarqeem](https://github.com/osama1998H/tarqeem) - the Arabic programming language. Built with Electron and React, it provides a native desktop experience with full Arabic language support.

### Features

- **Full RTL Support** - Native right-to-left text editing with proper cursor movement
- **Arabic UI** - Complete Arabic interface for Arabic-speaking developers
- **Syntax Highlighting** - Rich highlighting for Tarqeem keywords, operators, and literals
- **LSP Integration** - Full Language Server Protocol support:
  - Auto-completion
  - Hover documentation
  - Go to definition
  - Real-time diagnostics
  - Format on save
- **Multi-tab Editor** - Work on multiple files simultaneously
- **File Explorer** - Browse and manage project files
- **Problems Panel** - View all diagnostics across your project
- **Project Management** - Support for `.قلم.مشروع` project files
- **Themes** - Light, dark, and high-contrast themes
- **Code Folding** - Collapse functions, structs, and blocks

### Installation

#### From Source

```bash
# Clone the repository
git clone https://github.com/osama1998H/qalam-ide.git
cd qalam-ide

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Package for distribution
npm run package
```

#### Prerequisites

- Node.js 18+
- npm 9+
- [Tarqeem Compiler](https://github.com/osama1998H/tarqeem) installed and in PATH

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New file |
| `Ctrl+O` | Open file |
| `Ctrl+S` | Save |
| `Ctrl+Shift+S` | Save as |
| `Ctrl+W` | Close tab |
| `Ctrl+Tab` | Next tab |
| `Ctrl+Shift+Tab` | Previous tab |
| `Ctrl+F` | Find |
| `Ctrl+H` | Find & Replace |
| `Ctrl+G` | Go to line |
| `Ctrl+Shift+O` | Go to symbol |
| `Shift+Alt+F` | Format document |
| `Ctrl+,` | Settings |
| `Ctrl+Shift+M` | Toggle problems panel |
| `F5` | Run |
| `F6` | Compile |

### Project Structure

```
qalam-ide/
├── src/
│   ├── main/           # Electron main process
│   │   ├── index.ts    # Main entry point
│   │   └── lsp-client.ts # LSP client
│   ├── preload/        # Preload scripts
│   └── renderer/       # React frontend
│       ├── components/ # UI components
│       ├── codemirror/ # Editor extensions
│       ├── stores/     # Zustand state stores
│       └── themes/     # Theme definitions
├── package.json
└── electron.vite.config.ts
```

### Development

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Package for current platform
npm run package

# Package for specific platforms
npm run package:mac
npm run package:win
npm run package:linux
```

### Tech Stack

- **Electron** - Desktop application framework
- **React** - UI library
- **CodeMirror 6** - Code editor
- **Zustand** - State management
- **TypeScript** - Type-safe development
- **Vite** - Build tool

---

## العربية

### نبذة

محرر قلم هو بيئة تطوير متكاملة حديثة مصممة خصيصاً للغة [ترقيم](https://github.com/osama1998H/tarqeem) العربية للبرمجة. مبني باستخدام Electron و React، يوفر تجربة سطح مكتب أصلية مع دعم كامل للغة العربية.

### المميزات

- **دعم كامل للكتابة من اليمين لليسار** - تحرير نصوص أصلي مع حركة مؤشر صحيحة
- **واجهة عربية** - واجهة مستخدم عربية كاملة للمطورين العرب
- **تلوين الصياغة** - تلوين غني لكلمات ترقيم المفتاحية والعوامل والقيم
- **تكامل LSP** - دعم كامل لبروتوكول خادم اللغة:
  - إكمال تلقائي
  - توثيق عند التمرير
  - الذهاب للتعريف
  - تشخيص فوري
  - تنسيق عند الحفظ
- **محرر متعدد التبويبات** - العمل على ملفات متعددة في وقت واحد
- **مستكشف الملفات** - تصفح وإدارة ملفات المشروع
- **لوحة المشاكل** - عرض جميع التشخيصات عبر المشروع
- **إدارة المشاريع** - دعم ملفات `.قلم.مشروع`
- **السمات** - سمات فاتحة وداكنة وعالية التباين
- **طي الكود** - طي الدوال والهياكل والكتل

### التثبيت

```bash
# استنساخ المستودع
git clone https://github.com/osama1998H/qalam-ide.git
cd qalam-ide

# تثبيت التبعيات
npm install

# التشغيل في وضع التطوير
npm run dev

# البناء للإنتاج
npm run build
```

### المتطلبات

- Node.js 18+
- npm 9+
- [مترجم ترقيم](https://github.com/osama1998H/tarqeem) مثبت ومضاف للمسار

### اختصارات لوحة المفاتيح

| الاختصار | الإجراء |
|----------|---------|
| `Ctrl+N` | ملف جديد |
| `Ctrl+O` | فتح ملف |
| `Ctrl+S` | حفظ |
| `Ctrl+W` | إغلاق التبويب |
| `Ctrl+Tab` | التبويب التالي |
| `Ctrl+F` | بحث |
| `Ctrl+H` | بحث واستبدال |
| `Ctrl+G` | الذهاب إلى سطر |
| `Ctrl+Shift+O` | الذهاب إلى رمز |
| `Shift+Alt+F` | تنسيق الملف |
| `Ctrl+,` | الإعدادات |
| `F5` | تشغيل |
| `F6` | ترجمة |

---

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- Built for the [Tarqeem](https://github.com/osama1998H/tarqeem) Arabic programming language
- Powered by [CodeMirror 6](https://codemirror.net/)
- Built with [Electron](https://www.electronjs.org/)
