import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ============================================================
// Keyboard Shortcuts Store for Qalam-IDE
// Provides Arabic-labeled shortcuts with customization support
// ============================================================

export type ShortcutCategory = 'file' | 'edit' | 'view' | 'navigation' | 'search' | 'debug' | 'build'

export interface KeyBinding {
  key: string           // The key (e.g., 'f', 'F5', 'Escape')
  ctrl?: boolean        // Ctrl key (Windows/Linux) or Cmd key (Mac)
  shift?: boolean       // Shift key
  alt?: boolean         // Alt/Option key
  meta?: boolean        // Cmd key (Mac only, for explicit Mac commands)
}

export interface KeyboardShortcut {
  id: string
  label: string           // Arabic label
  description: string     // Arabic description
  category: ShortcutCategory
  defaultBinding: KeyBinding
  isCustomizable: boolean
}

// Category labels in Arabic
export const CATEGORY_LABELS: Record<ShortcutCategory, string> = {
  file: 'الملف',
  edit: 'تحرير',
  view: 'عرض',
  navigation: 'تنقل',
  search: 'بحث',
  debug: 'تصحيح',
  build: 'بناء'
}

// Default keyboard shortcuts with Arabic labels
export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  // ══════════════════════════════════════════════
  // File Operations - عمليات الملف
  // ══════════════════════════════════════════════
  {
    id: 'file.new',
    label: 'ملف جديد',
    description: 'إنشاء ملف ترقيم جديد',
    category: 'file',
    defaultBinding: { key: 'n', ctrl: true },
    isCustomizable: true
  },
  {
    id: 'file.open',
    label: 'فتح ملف',
    description: 'فتح ملف موجود',
    category: 'file',
    defaultBinding: { key: 'o', ctrl: true },
    isCustomizable: true
  },
  {
    id: 'file.save',
    label: 'حفظ',
    description: 'حفظ الملف الحالي',
    category: 'file',
    defaultBinding: { key: 's', ctrl: true },
    isCustomizable: true
  },
  {
    id: 'file.saveAs',
    label: 'حفظ باسم',
    description: 'حفظ الملف باسم جديد',
    category: 'file',
    defaultBinding: { key: 's', ctrl: true, shift: true },
    isCustomizable: true
  },
  {
    id: 'file.closeTab',
    label: 'إغلاق التبويب',
    description: 'إغلاق التبويب الحالي',
    category: 'file',
    defaultBinding: { key: 'w', ctrl: true },
    isCustomizable: true
  },
  {
    id: 'file.openFolder',
    label: 'فتح مجلد',
    description: 'فتح مجلد مشروع',
    category: 'file',
    defaultBinding: { key: 'o', ctrl: true, shift: true },
    isCustomizable: true
  },

  // ══════════════════════════════════════════════
  // Edit Operations - عمليات التحرير
  // ══════════════════════════════════════════════
  {
    id: 'edit.undo',
    label: 'تراجع',
    description: 'التراجع عن آخر عملية',
    category: 'edit',
    defaultBinding: { key: 'z', ctrl: true },
    isCustomizable: false
  },
  {
    id: 'edit.redo',
    label: 'إعادة',
    description: 'إعادة العملية الملغاة',
    category: 'edit',
    defaultBinding: { key: 'z', ctrl: true, shift: true },
    isCustomizable: false
  },
  {
    id: 'edit.cut',
    label: 'قص',
    description: 'قص النص المحدد',
    category: 'edit',
    defaultBinding: { key: 'x', ctrl: true },
    isCustomizable: false
  },
  {
    id: 'edit.copy',
    label: 'نسخ',
    description: 'نسخ النص المحدد',
    category: 'edit',
    defaultBinding: { key: 'c', ctrl: true },
    isCustomizable: false
  },
  {
    id: 'edit.paste',
    label: 'لصق',
    description: 'لصق من الحافظة',
    category: 'edit',
    defaultBinding: { key: 'v', ctrl: true },
    isCustomizable: false
  },
  {
    id: 'edit.selectAll',
    label: 'تحديد الكل',
    description: 'تحديد كل محتوى الملف',
    category: 'edit',
    defaultBinding: { key: 'a', ctrl: true },
    isCustomizable: false
  },
  {
    id: 'edit.format',
    label: 'تنسيق المستند',
    description: 'تنسيق كود ترقيم تلقائياً',
    category: 'edit',
    defaultBinding: { key: 'i', ctrl: true, shift: true },
    isCustomizable: true
  },
  {
    id: 'edit.formatAlt',
    label: 'تنسيق الملف',
    description: 'تنسيق الملف (اختصار بديل)',
    category: 'edit',
    defaultBinding: { key: 'f', shift: true, alt: true },
    isCustomizable: true
  },

  // ══════════════════════════════════════════════
  // Search Operations - عمليات البحث
  // ══════════════════════════════════════════════
  {
    id: 'search.find',
    label: 'بحث',
    description: 'البحث في الملف الحالي',
    category: 'search',
    defaultBinding: { key: 'f', ctrl: true },
    isCustomizable: true
  },
  {
    id: 'search.replace',
    label: 'استبدال',
    description: 'البحث والاستبدال',
    category: 'search',
    defaultBinding: { key: 'h', ctrl: true },
    isCustomizable: true
  },
  {
    id: 'search.findInFiles',
    label: 'بحث في الملفات',
    description: 'البحث في جميع ملفات المشروع',
    category: 'search',
    defaultBinding: { key: 'f', ctrl: true, shift: true },
    isCustomizable: true
  },

  // ══════════════════════════════════════════════
  // Navigation - التنقل
  // ══════════════════════════════════════════════
  {
    id: 'nav.goToLine',
    label: 'الذهاب إلى سطر',
    description: 'الانتقال إلى رقم سطر محدد',
    category: 'navigation',
    defaultBinding: { key: 'g', ctrl: true },
    isCustomizable: true
  },
  {
    id: 'nav.goToSymbol',
    label: 'الذهاب إلى رمز',
    description: 'الانتقال إلى دالة أو صنف',
    category: 'navigation',
    defaultBinding: { key: 'o', ctrl: true, shift: true },
    isCustomizable: true
  },
  {
    id: 'nav.goToDefinition',
    label: 'الذهاب إلى التعريف',
    description: 'الانتقال إلى تعريف الرمز',
    category: 'navigation',
    defaultBinding: { key: 'F12' },
    isCustomizable: true
  },
  {
    id: 'nav.findReferences',
    label: 'البحث عن المراجع',
    description: 'البحث عن جميع استخدامات الرمز',
    category: 'navigation',
    defaultBinding: { key: 'F12', shift: true },
    isCustomizable: true
  },
  {
    id: 'nav.nextTab',
    label: 'التبويب التالي',
    description: 'الانتقال للتبويب التالي',
    category: 'navigation',
    defaultBinding: { key: 'Tab', ctrl: true },
    isCustomizable: true
  },
  {
    id: 'nav.prevTab',
    label: 'التبويب السابق',
    description: 'الانتقال للتبويب السابق',
    category: 'navigation',
    defaultBinding: { key: 'Tab', ctrl: true, shift: true },
    isCustomizable: true
  },

  // ══════════════════════════════════════════════
  // View - العرض
  // ══════════════════════════════════════════════
  {
    id: 'view.settings',
    label: 'الإعدادات',
    description: 'فتح نافذة الإعدادات',
    category: 'view',
    defaultBinding: { key: ',', ctrl: true },
    isCustomizable: true
  },
  {
    id: 'view.shortcuts',
    label: 'اختصارات لوحة المفاتيح',
    description: 'عرض جميع اختصارات لوحة المفاتيح',
    category: 'view',
    defaultBinding: { key: '/', ctrl: true, shift: true },
    isCustomizable: true
  },
  {
    id: 'view.toggleSidebar',
    label: 'تبديل الشريط الجانبي',
    description: 'إظهار/إخفاء الشريط الجانبي',
    category: 'view',
    defaultBinding: { key: 'b', ctrl: true },
    isCustomizable: true
  },
  {
    id: 'view.toggleProblems',
    label: 'تبديل لوحة المشاكل',
    description: 'إظهار/إخفاء لوحة الأخطاء والتحذيرات',
    category: 'view',
    defaultBinding: { key: 'm', ctrl: true, shift: true },
    isCustomizable: true
  },
  {
    id: 'view.toggleOutput',
    label: 'تبديل لوحة المخرجات',
    description: 'إظهار/إخفاء لوحة المخرجات',
    category: 'view',
    defaultBinding: { key: 'j', ctrl: true },
    isCustomizable: true
  },
  {
    id: 'view.toggleASTViewer',
    label: 'تبديل عارض AST',
    description: 'إظهار/إخفاء عارض شجرة البناء النحوي',
    category: 'view',
    defaultBinding: { key: 'a', ctrl: true, shift: true },
    isCustomizable: true
  },
  {
    id: 'view.toggleTypeInspector',
    label: 'تبديل مفتش الأنواع',
    description: 'إظهار/إخفاء مفتش الأنواع',
    category: 'view',
    defaultBinding: { key: 't', ctrl: true, shift: true },
    isCustomizable: true
  },
  {
    id: 'view.toggleIRViewer',
    label: 'تبديل عارض التمثيل الوسيط',
    description: 'إظهار/إخفاء عارض التمثيل الوسيط (IR)',
    category: 'view',
    defaultBinding: { key: 'i', ctrl: true, shift: true },
    isCustomizable: true
  },
  {
    id: 'view.zoomIn',
    label: 'تكبير',
    description: 'تكبير حجم الخط',
    category: 'view',
    defaultBinding: { key: '=', ctrl: true },
    isCustomizable: true
  },
  {
    id: 'view.zoomOut',
    label: 'تصغير',
    description: 'تصغير حجم الخط',
    category: 'view',
    defaultBinding: { key: '-', ctrl: true },
    isCustomizable: true
  },
  {
    id: 'view.resetZoom',
    label: 'إعادة تعيين التكبير',
    description: 'إعادة حجم الخط للافتراضي',
    category: 'view',
    defaultBinding: { key: '0', ctrl: true },
    isCustomizable: true
  },

  // ══════════════════════════════════════════════
  // Build Operations - عمليات البناء
  // ══════════════════════════════════════════════
  {
    id: 'build.compile',
    label: 'ترجمة',
    description: 'ترجمة ملف ترقيم الحالي',
    category: 'build',
    defaultBinding: { key: 'b', ctrl: true, shift: true },
    isCustomizable: true
  },
  {
    id: 'build.run',
    label: 'تشغيل',
    description: 'تشغيل البرنامج',
    category: 'build',
    defaultBinding: { key: 'r', ctrl: true },
    isCustomizable: true
  },
  {
    id: 'build.executeSelection',
    label: 'تنفيذ المحدد',
    description: 'تنفيذ الكود المحدد في الوضع التفاعلي',
    category: 'build',
    defaultBinding: { key: 'e', ctrl: true, shift: true },
    isCustomizable: true
  },

  // ══════════════════════════════════════════════
  // Debug Operations - عمليات التصحيح
  // ══════════════════════════════════════════════
  {
    id: 'debug.start',
    label: 'بدء/متابعة التصحيح',
    description: 'بدء جلسة التصحيح أو المتابعة',
    category: 'debug',
    defaultBinding: { key: 'F5' },
    isCustomizable: true
  },
  {
    id: 'debug.stop',
    label: 'إيقاف التصحيح',
    description: 'إيقاف جلسة التصحيح',
    category: 'debug',
    defaultBinding: { key: 'F5', shift: true },
    isCustomizable: true
  },
  {
    id: 'debug.restart',
    label: 'إعادة تشغيل التصحيح',
    description: 'إعادة تشغيل جلسة التصحيح',
    category: 'debug',
    defaultBinding: { key: 'F5', ctrl: true, shift: true },
    isCustomizable: true
  },
  {
    id: 'debug.pause',
    label: 'إيقاف مؤقت',
    description: 'إيقاف التنفيذ مؤقتاً',
    category: 'debug',
    defaultBinding: { key: 'F6' },
    isCustomizable: true
  },
  {
    id: 'debug.stepOver',
    label: 'الخطوة التالية',
    description: 'تنفيذ السطر الحالي والانتقال للتالي',
    category: 'debug',
    defaultBinding: { key: 'F10' },
    isCustomizable: true
  },
  {
    id: 'debug.stepInto',
    label: 'الدخول إلى الدالة',
    description: 'الدخول إلى الدالة المستدعاة',
    category: 'debug',
    defaultBinding: { key: 'F11' },
    isCustomizable: true
  },
  {
    id: 'debug.stepOut',
    label: 'الخروج من الدالة',
    description: 'الخروج من الدالة الحالية',
    category: 'debug',
    defaultBinding: { key: 'F11', shift: true },
    isCustomizable: true
  },
  {
    id: 'debug.toggleBreakpoint',
    label: 'تبديل نقطة التوقف',
    description: 'إضافة/إزالة نقطة توقف في السطر الحالي',
    category: 'debug',
    defaultBinding: { key: 'F9' },
    isCustomizable: true
  }
]

// Helper function to format key binding as display string
export function formatKeyBinding(binding: KeyBinding): string {
  const parts: string[] = []

  if (binding.ctrl) parts.push('Ctrl')
  if (binding.meta) parts.push('Cmd')
  if (binding.shift) parts.push('Shift')
  if (binding.alt) parts.push('Alt')

  // Format the key nicely
  let key = binding.key
  if (key.length === 1) {
    key = key.toUpperCase()
  }
  parts.push(key)

  return parts.join('+')
}

// Helper function to format key binding with Arabic modifier names
export function formatKeyBindingArabic(binding: KeyBinding): string {
  const parts: string[] = []

  if (binding.ctrl) parts.push('تحكم')
  if (binding.meta) parts.push('أمر')
  if (binding.shift) parts.push('تحويل')
  if (binding.alt) parts.push('بديل')

  // Format the key nicely
  let key = binding.key
  if (key.length === 1) {
    key = key.toUpperCase()
  }
  parts.push(key)

  return parts.join('+')
}

// Check if a keyboard event matches a binding
export function matchesBinding(event: KeyboardEvent, binding: KeyBinding): boolean {
  const ctrlOrCmd = binding.ctrl ? (event.ctrlKey || event.metaKey) : (!event.ctrlKey && !event.metaKey)
  const shift = binding.shift ? event.shiftKey : !event.shiftKey
  const alt = binding.alt ? event.altKey : !event.altKey

  // Handle special case for meta key on Mac
  if (binding.meta && !event.metaKey) return false

  // Compare keys (case-insensitive for letters)
  const eventKey = event.key.toLowerCase()
  const bindingKey = binding.key.toLowerCase()

  // Handle special keys
  if (binding.key.startsWith('F') && binding.key.length > 1) {
    return event.key === binding.key && ctrlOrCmd && shift && alt
  }

  return eventKey === bindingKey && ctrlOrCmd && shift && alt
}

// Store interface
interface KeyboardShortcutsState {
  // Custom bindings (overrides defaults)
  customBindings: Record<string, KeyBinding>

  // Search/filter state for the overlay
  searchQuery: string

  // Actions
  setCustomBinding: (shortcutId: string, binding: KeyBinding) => void
  removeCustomBinding: (shortcutId: string) => void
  resetAllBindings: () => void
  setSearchQuery: (query: string) => void

  // Getters
  getBinding: (shortcutId: string) => KeyBinding
  getShortcutsByCategory: (category: ShortcutCategory) => KeyboardShortcut[]
  findConflict: (binding: KeyBinding, excludeId?: string) => KeyboardShortcut | null
}

export const useKeyboardShortcuts = create<KeyboardShortcutsState>()(
  persist(
    (set, get) => ({
      customBindings: {},
      searchQuery: '',

      setCustomBinding: (shortcutId, binding) => {
        set((state) => ({
          customBindings: {
            ...state.customBindings,
            [shortcutId]: binding
          }
        }))
      },

      removeCustomBinding: (shortcutId) => {
        set((state) => {
          const { [shortcutId]: _, ...rest } = state.customBindings
          return { customBindings: rest }
        })
      },

      resetAllBindings: () => {
        set({ customBindings: {} })
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query })
      },

      getBinding: (shortcutId) => {
        const { customBindings } = get()
        const shortcut = DEFAULT_SHORTCUTS.find(s => s.id === shortcutId)
        if (!shortcut) {
          return { key: '' }
        }
        return customBindings[shortcutId] || shortcut.defaultBinding
      },

      getShortcutsByCategory: (category) => {
        return DEFAULT_SHORTCUTS.filter(s => s.category === category)
      },

      findConflict: (binding, excludeId) => {
        const { customBindings } = get()

        for (const shortcut of DEFAULT_SHORTCUTS) {
          if (shortcut.id === excludeId) continue

          const currentBinding = customBindings[shortcut.id] || shortcut.defaultBinding

          // Check if bindings match
          if (
            currentBinding.key.toLowerCase() === binding.key.toLowerCase() &&
            !!currentBinding.ctrl === !!binding.ctrl &&
            !!currentBinding.shift === !!binding.shift &&
            !!currentBinding.alt === !!binding.alt &&
            !!currentBinding.meta === !!binding.meta
          ) {
            return shortcut
          }
        }

        return null
      }
    }),
    {
      name: 'qalam-keyboard-shortcuts',
      partialize: (state) => ({
        customBindings: state.customBindings
      })
    }
  )
)
