import {
  autocompletion,
  Completion,
  CompletionContext,
  CompletionResult,
  snippetCompletion,
  completionKeymap
} from '@codemirror/autocomplete'
import { Extension, StateField, StateEffect } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { useLSPStore, LSPCompletionItem, LSPCompletionList } from '../stores/useLSPStore'

// ============================================================
// Tarqeem Local Keywords with Arabic Snippets
// ============================================================

// Snippets with Arabic placeholders - proper CodeMirror syntax ${n:placeholder}
interface SnippetDef {
  label: string
  type: string
  detail: string
  template: string
}

const TARQEEM_SNIPPETS: SnippetDef[] = [
  // ════════════════════════════════════════════════════════════════
  // الدوال والمتغيرات - Functions and Variables
  // ════════════════════════════════════════════════════════════════

  // Function definition
  {
    label: 'دالة',
    type: 'keyword',
    detail: 'تعريف دالة',
    template: 'دالة ${1:اسم_الدالة}(${2:المعاملات}) -> ${3:نوع_الإرجاع} {\n\t${0}\n}'
  },
  // Variable declaration
  {
    label: 'متغير',
    type: 'keyword',
    detail: 'تعريف متغير',
    template: 'متغير ${1:الاسم}: ${2:النوع} = ${0}'
  },
  // Constant declaration
  {
    label: 'ثابت',
    type: 'keyword',
    detail: 'تعريف ثابت',
    template: 'ثابت ${1:الاسم}: ${2:النوع} = ${0}'
  },
  // Return statement
  {
    label: 'أرجع',
    type: 'keyword',
    detail: 'إرجاع قيمة',
    template: 'أرجع ${0}'
  },
  {
    label: 'ارجع',
    type: 'keyword',
    detail: 'إرجاع قيمة',
    template: 'ارجع ${0}'
  },

  // ════════════════════════════════════════════════════════════════
  // التحكم بالتدفق - Control Flow
  // ════════════════════════════════════════════════════════════════

  // If statement (إذا)
  {
    label: 'إذا',
    type: 'keyword',
    detail: 'جملة شرطية',
    template: 'إذا ${1:الشرط} {\n\t${0}\n}'
  },
  // If statement (اذا - alternate spelling)
  {
    label: 'اذا',
    type: 'keyword',
    detail: 'جملة شرطية',
    template: 'اذا ${1:الشرط} {\n\t${0}\n}'
  },
  // If-else statement
  {
    label: 'إذا_وإلا',
    type: 'keyword',
    detail: 'جملة شرطية مع بديل',
    template: 'إذا ${1:الشرط} {\n\t${2}\n} وإلا {\n\t${0}\n}'
  },
  // Match/Switch
  {
    label: 'تطابق',
    type: 'keyword',
    detail: 'جملة تطابق',
    template: 'تطابق ${1:القيمة} {\n\tحالة ${2:النمط} => ${3}\n\tغير_ذلك => ${0}\n}'
  },
  // Match with multiple cases
  {
    label: 'تطابق_متعدد',
    type: 'keyword',
    detail: 'تطابق مع عدة حالات',
    template: 'تطابق ${1:القيمة} {\n\tحالة ${2:نمط١} => {\n\t\t${3}\n\t}\n\tحالة ${4:نمط٢} => {\n\t\t${5}\n\t}\n\tغير_ذلك => {\n\t\t${0}\n\t}\n}'
  },
  // Case
  {
    label: 'حالة',
    type: 'keyword',
    detail: 'حالة في تطابق',
    template: 'حالة ${1:النمط} => ${0}'
  },

  // ════════════════════════════════════════════════════════════════
  // الحلقات - Loops
  // ════════════════════════════════════════════════════════════════

  // While loop
  {
    label: 'طالما',
    type: 'keyword',
    detail: 'حلقة طالما',
    template: 'طالما ${1:الشرط} {\n\t${0}\n}'
  },
  // For-each loop
  {
    label: 'لكل',
    type: 'keyword',
    detail: 'حلقة لكل',
    template: 'لكل ${1:العنصر} في ${2:المجموعة} {\n\t${0}\n}'
  },
  // Do-while loop
  {
    label: 'افعل',
    type: 'keyword',
    detail: 'حلقة افعل-طالما',
    template: 'افعل {\n\t${1}\n} طالما ${0:الشرط}'
  },
  // C-style for loop with index (NEW)
  {
    label: 'لكل_بفهرس',
    type: 'keyword',
    detail: 'حلقة لكل بعداد رقمي',
    template: 'لكل (متغير ${1:ع} = ${2:0}؛ ${1:ع} < ${3:10}؛ ${1:ع}++) {\n\t${0}\n}'
  },
  // Reverse for loop (NEW)
  {
    label: 'لكل_عكسي',
    type: 'keyword',
    detail: 'حلقة لكل عكسية',
    template: 'لكل (متغير ${1:ع} = ${2:الطول} - 1؛ ${1:ع} >= 0؛ ${1:ع}--) {\n\t${0}\n}'
  },
  // Infinite loop with break (NEW)
  {
    label: 'حلقة_لانهائية',
    type: 'keyword',
    detail: 'حلقة لانهائية مع نقطة خروج',
    template: 'طالما صحيح {\n\t${1}\n\tإذا ${2:شرط_الخروج} {\n\t\tأوقف\n\t}\n\t${0}\n}'
  },
  // For-each with index counter (NEW)
  {
    label: 'لكل_عنصر_وفهرس',
    type: 'keyword',
    detail: 'حلقة لكل مع فهرس',
    template: 'متغير ${1:فهرس} = 0\nلكل ${2:عنصر} في ${3:المجموعة} {\n\t${0}\n\t${1:فهرس}++\n}'
  },

  // ════════════════════════════════════════════════════════════════
  // الأصناف والكائنات - Classes and Objects
  // ════════════════════════════════════════════════════════════════

  // Class definition
  {
    label: 'صنف',
    type: 'class',
    detail: 'تعريف صنف',
    template: 'صنف ${1:اسم_الصنف} {\n\t${0}\n}'
  },
  // Class with inheritance
  {
    label: 'صنف_يرث',
    type: 'class',
    detail: 'صنف مع وراثة',
    template: 'صنف ${1:اسم_الصنف} يرث ${2:الصنف_الأب} {\n\t${0}\n}'
  },
  // Class with protocol
  {
    label: 'صنف_يلتزم',
    type: 'class',
    detail: 'صنف يلتزم بميثاق',
    template: 'صنف ${1:اسم_الصنف} يلتزم ${2:الميثاق} {\n\t${0}\n}'
  },
  // Full class with constructor and method (NEW)
  {
    label: 'صنف_كامل',
    type: 'class',
    detail: 'صنف كامل مع منشئ ودالة',
    template: 'صنف ${1:اسم_الصنف} {\n\tخاص ${2:_حقل}: ${3:نوع}\n\n\tمنشئ(${4:معاملات}) {\n\t\tهذا.${2:_حقل} = ${5:قيمة}\n\t}\n\n\tعام دالة ${6:اسم_الدالة}() -> ${7:نوع_الإرجاع} {\n\t\t${0}\n\t}\n}'
  },
  // Class implementing multiple interfaces (NEW)
  {
    label: 'صنف_متعدد_المواثيق',
    type: 'class',
    detail: 'صنف يلتزم بعدة مواثيق',
    template: 'صنف ${1:اسم_الصنف} يلتزم ${2:الميثاق_الأول}، ${3:الميثاق_الثاني} {\n\t${0}\n}'
  },
  // Class with inheritance and interface (NEW)
  {
    label: 'صنف_يرث_ويلتزم',
    type: 'class',
    detail: 'صنف يرث من صنف ويلتزم بميثاق',
    template: 'صنف ${1:اسم_الصنف} يرث ${2:الصنف_الأب} يلتزم ${3:الميثاق} {\n\t${0}\n}'
  },
  // Singleton pattern (NEW)
  {
    label: 'صنف_وحيد',
    type: 'class',
    detail: 'نمط الصنف الوحيد (Singleton)',
    template: 'صنف ${1:اسم_الصنف} {\n\tخاص مشترك _نسخة: ${1:اسم_الصنف}\n\n\tخاص منشئ() {\n\t\t${2}\n\t}\n\n\tعام مشترك دالة النسخة() -> ${1:اسم_الصنف} {\n\t\tإذا هذا._نسخة == لا_شيء {\n\t\t\tهذا._نسخة = جديد ${1:اسم_الصنف}()\n\t\t}\n\t\tأرجع هذا._نسخة\n\t}\n\t${0}\n}'
  },
  // Generic class (NEW)
  {
    label: 'صنف_معمم',
    type: 'class',
    detail: 'صنف مع نوع معمم',
    template: 'صنف ${1:اسم_الصنف}<${2:ن}> {\n\tخاص _قيمة: ${2:ن}\n\n\tمنشئ(قيمة: ${2:ن}) {\n\t\tهذا._قيمة = قيمة\n\t}\n\n\tعام دالة احصل() -> ${2:ن} {\n\t\tأرجع هذا._قيمة\n\t}\n\t${0}\n}'
  },
  // Abstract-like base class (NEW)
  {
    label: 'صنف_أساس',
    type: 'class',
    detail: 'صنف أساسي للوراثة',
    template: 'صنف ${1:اسم_الصنف} {\n\tمحمي _حالة: ${2:نص}\n\n\tمنشئ() {\n\t\tهذا._حالة = "${3:مبدئي}"\n\t}\n\n\t// دوال يجب تجاوزها في الأصناف الفرعية\n\tمحمي دالة ${4:عملية}() {\n\t\t${0}\n\t}\n}'
  },
  // Data class (NEW)
  {
    label: 'صنف_بيانات',
    type: 'class',
    detail: 'صنف بيانات بسيط',
    template: 'صنف ${1:اسم_الصنف} {\n\tعام ${2:حقل١}: ${3:نوع١}\n\tعام ${4:حقل٢}: ${5:نوع٢}\n\n\tمنشئ(${2:حقل١}: ${3:نوع١}، ${4:حقل٢}: ${5:نوع٢}) {\n\t\tهذا.${2:حقل١} = ${2:حقل١}\n\t\tهذا.${4:حقل٢} = ${4:حقل٢}\n\t}\n\t${0}\n}'
  },
  // New instance
  {
    label: 'جديد',
    type: 'keyword',
    detail: 'إنشاء كائن جديد',
    template: 'جديد ${1:الصنف}(${0:المعاملات})'
  },

  // ════════════════════════════════════════════════════════════════
  // الدوال داخل الأصناف - Class Methods
  // ════════════════════════════════════════════════════════════════

  // Public method (NEW)
  {
    label: 'دالة_عامة',
    type: 'method',
    detail: 'دالة عامة داخل صنف',
    template: 'عام دالة ${1:اسم_الدالة}(${2:المعاملات}) -> ${3:نوع_الإرجاع} {\n\t${0}\n}'
  },
  // Private method (NEW)
  {
    label: 'دالة_خاصة',
    type: 'method',
    detail: 'دالة خاصة داخل صنف',
    template: 'خاص دالة ${1:اسم_الدالة}(${2:المعاملات}) -> ${3:نوع_الإرجاع} {\n\t${0}\n}'
  },
  // Protected method (NEW)
  {
    label: 'دالة_محمية',
    type: 'method',
    detail: 'دالة محمية داخل صنف',
    template: 'محمي دالة ${1:اسم_الدالة}(${2:المعاملات}) -> ${3:نوع_الإرجاع} {\n\t${0}\n}'
  },
  // Static method (NEW)
  {
    label: 'دالة_مشتركة',
    type: 'method',
    detail: 'دالة مشتركة (static)',
    template: 'مشترك دالة ${1:اسم_الدالة}(${2:المعاملات}) -> ${3:نوع_الإرجاع} {\n\t${0}\n}'
  },
  // Public static method (NEW)
  {
    label: 'دالة_عامة_مشتركة',
    type: 'method',
    detail: 'دالة عامة مشتركة',
    template: 'عام مشترك دالة ${1:اسم_الدالة}(${2:المعاملات}) -> ${3:نوع_الإرجاع} {\n\t${0}\n}'
  },
  // Void method (NEW)
  {
    label: 'دالة_إجراء',
    type: 'method',
    detail: 'دالة بدون إرجاع',
    template: 'عام دالة ${1:اسم_الدالة}(${2:المعاملات}) {\n\t${0}\n}'
  },
  // Constructor
  {
    label: 'منشئ',
    type: 'constructor',
    detail: 'دالة المنشئ',
    template: 'منشئ(${1:المعاملات}) {\n\t${0}\n}'
  },

  // ════════════════════════════════════════════════════════════════
  // الخواص - Properties
  // ════════════════════════════════════════════════════════════════

  // Property with getter/setter
  {
    label: 'خاصية',
    type: 'property',
    detail: 'تعريف خاصية',
    template: 'خاصية ${1:الاسم}: ${2:النوع} {\n\tاحصل { ${3} }\n\tعيّن { ${0} }\n}'
  },
  // Property getter only
  {
    label: 'خاصية_قراءة',
    type: 'property',
    detail: 'خاصية للقراءة فقط',
    template: 'خاصية ${1:الاسم}: ${2:النوع} {\n\tاحصل { ${0} }\n}'
  },
  // Write-only property (NEW)
  {
    label: 'خاصية_كتابة',
    type: 'property',
    detail: 'خاصية للكتابة فقط',
    template: 'خاصية ${1:الاسم}: ${2:النوع} {\n\tعيّن(قيمة) {\n\t\tهذا._${1:الاسم} = قيمة\n\t\t${0}\n\t}\n}'
  },
  // Computed property (NEW)
  {
    label: 'خاصية_محسوبة',
    type: 'property',
    detail: 'خاصية محسوبة مختصرة',
    template: 'خاصية ${1:الاسم}: ${2:النوع} {\n\tاحصل => ${0}\n}'
  },

  // ════════════════════════════════════════════════════════════════
  // المواثيق والتعدادات - Interfaces and Enums
  // ════════════════════════════════════════════════════════════════

  // Protocol/Interface definition
  {
    label: 'ميثاق',
    type: 'interface',
    detail: 'تعريف ميثاق',
    template: 'ميثاق ${1:اسم_الميثاق} {\n\t${0}\n}'
  },
  // Enum definition
  {
    label: 'تعداد',
    type: 'enum',
    detail: 'تعريف تعداد',
    template: 'تعداد ${1:اسم_التعداد} {\n\t${0}\n}'
  },
  // Enum with values (NEW)
  {
    label: 'تعداد_قيم',
    type: 'enum',
    detail: 'تعداد مع قيم رقمية',
    template: 'تعداد ${1:اسم_التعداد} {\n\t${2:قيمة١} = ${3:0}،\n\t${4:قيمة٢} = ${5:1}،\n\t${6:قيمة٣} = ${7:2}\n\t${0}\n}'
  },
  // Enum with associated data (NEW)
  {
    label: 'تعداد_بيانات',
    type: 'enum',
    detail: 'تعداد مع بيانات مرتبطة',
    template: 'تعداد ${1:اسم_التعداد} {\n\t${2:حالة١}(${3:بيانات}: ${4:نوع})،\n\t${5:حالة٢}،\n\t${6:حالة٣}(${7:بيانات١}: ${8:نوع١}، ${9:بيانات٢}: ${10:نوع٢})\n\t${0}\n}'
  },
  // Generic enum (NEW)
  {
    label: 'تعداد_معمم',
    type: 'enum',
    detail: 'تعداد معمم',
    template: 'تعداد ${1:اسم_التعداد}<${2:ن}> {\n\t${3:بعض}(قيمة: ${2:ن})،\n\t${4:فارغ}\n\t${0}\n}'
  },

  // ════════════════════════════════════════════════════════════════
  // معالجة الأخطاء - Error Handling
  // ════════════════════════════════════════════════════════════════

  // Try-catch
  {
    label: 'حاول',
    type: 'keyword',
    detail: 'معالجة الأخطاء',
    template: 'حاول {\n\t${1}\n} التقط ${2:الخطأ} {\n\t${0}\n}'
  },
  // Try-catch-finally
  {
    label: 'حاول_أخيراً',
    type: 'keyword',
    detail: 'معالجة الأخطاء مع أخيراً',
    template: 'حاول {\n\t${1}\n} التقط ${2:الخطأ} {\n\t${3}\n} أخيراً {\n\t${0}\n}'
  },
  // Try-catch with specific error type (NEW)
  {
    label: 'حاول_نوع_خطأ',
    type: 'keyword',
    detail: 'معالجة نوع خطأ محدد',
    template: 'حاول {\n\t${1}\n} التقط (خ: ${2:خطأ_قيمة}) {\n\t${0}\n}'
  },
  // Throw new error with message (NEW)
  {
    label: 'ارمِ_جديد',
    type: 'keyword',
    detail: 'رمي خطأ جديد',
    template: 'ارمِ جديد ${1:خطأ}("${2:رسالة_الخطأ}")'
  },
  // Guard clause with error (NEW)
  {
    label: 'تحقق_أو_ارمِ',
    type: 'keyword',
    detail: 'تحقق من شرط أو ارمِ خطأ',
    template: 'إذا ${1:الشرط_غير_صحيح} {\n\tارمِ جديد ${2:خطأ_قيمة}("${3:رسالة}")\n}\n${0}'
  },
  // Custom error class (NEW)
  {
    label: 'صنف_خطأ',
    type: 'class',
    detail: 'تعريف صنف خطأ مخصص',
    template: 'صنف ${1:اسم_الخطأ} يرث خطأ {\n\tعام ${2:حقل_إضافي}: ${3:نص}\n\n\tمنشئ(رسالة: نص، ${2:حقل_إضافي}: ${3:نص}) {\n\t\tالأصل.منشئ(رسالة)\n\t\tهذا.${2:حقل_إضافي} = ${2:حقل_إضافي}\n\t}\n\t${0}\n}'
  },
  // Result pattern usage (NEW)
  {
    label: 'نتيجة_عملية',
    type: 'keyword',
    detail: 'استخدام نمط النتيجة',
    template: 'متغير نتيجة = ${1:العملية}()\nإذا نتيجة.ناجحة() {\n\tمتغير قيمة = نتيجة.قيمة()\n\t${2}\n} وإلا {\n\tمتغير خطأ = نتيجة.خطأ()\n\t${0}\n}'
  },
  // Assertion (NEW)
  {
    label: 'تأكيد',
    type: 'keyword',
    detail: 'تأكيد شرط',
    template: 'تأكيد(${1:الشرط}، "${2:رسالة_الفشل}")'
  },
  // Throw
  {
    label: 'ارمِ',
    type: 'keyword',
    detail: 'رمي خطأ',
    template: 'ارمِ ${0:الخطأ}'
  },
  {
    label: 'ارم',
    type: 'keyword',
    detail: 'رمي خطأ',
    template: 'ارم ${0:الخطأ}'
  },

  // ════════════════════════════════════════════════════════════════
  // التوازي - Async/Concurrency
  // ════════════════════════════════════════════════════════════════

  // Async function
  {
    label: 'متوازي',
    type: 'keyword',
    detail: 'دالة متوازية',
    template: 'متوازي دالة ${1:اسم_الدالة}(${2:المعاملات}) -> ${3:نوع_الإرجاع} {\n\t${0}\n}'
  },
  // Full async function with await (NEW)
  {
    label: 'متوازي_كامل',
    type: 'keyword',
    detail: 'دالة متوازية كاملة',
    template: 'متوازي دالة ${1:اسم_الدالة}(${2:المعاملات}) -> ${3:نوع_الإرجاع} {\n\tمتغير ${4:نتيجة} = انتظر ${5:العملية}\n\t${0}\n\tأرجع ${4:نتيجة}\n}'
  },
  // Await with error handling (NEW)
  {
    label: 'انتظر_مع_خطأ',
    type: 'keyword',
    detail: 'انتظار مع معالجة خطأ',
    template: 'حاول {\n\tمتغير ${1:نتيجة} = انتظر ${2:العملية}\n\t${0}\n} التقط خ {\n\tاطبع("خطأ: " + خ.رسالة)\n}'
  },
  // Parallel async operations (NEW)
  {
    label: 'متوازي_متعدد',
    type: 'keyword',
    detail: 'عمليات متوازية متعددة',
    template: 'متغير ${1:نتيجة١} = انتظر ${2:عملية١}\nمتغير ${3:نتيجة٢} = انتظر ${4:عملية٢}\n${0}'
  },
  // Async method in class (NEW)
  {
    label: 'دالة_متوازية_عامة',
    type: 'method',
    detail: 'دالة متوازية عامة في صنف',
    template: 'عام متوازي دالة ${1:اسم_الدالة}(${2:المعاملات}) -> ${3:نوع_الإرجاع} {\n\t${0}\n}'
  },
  // Await
  {
    label: 'انتظر',
    type: 'keyword',
    detail: 'انتظار عملية متوازية',
    template: 'انتظر ${0}'
  },

  // ════════════════════════════════════════════════════════════════
  // الوحدات والاستيراد - Modules and Imports
  // ════════════════════════════════════════════════════════════════

  // Import
  {
    label: 'استورد',
    type: 'keyword',
    detail: 'استيراد وحدة',
    template: 'استورد ${1:الوحدة} من "${2:المسار}"'
  },
  // Import with alias
  {
    label: 'استورد_كـ',
    type: 'keyword',
    detail: 'استيراد مع اسم بديل',
    template: 'استورد ${1:الوحدة} من "${2:المسار}" كـ ${0:الاسم_البديل}'
  },
  // Import all with alias (NEW)
  {
    label: 'استورد_الكل',
    type: 'keyword',
    detail: 'استيراد كل شيء مع اسم بديل',
    template: 'استورد * كـ ${1:الاسم} من "${2:المسار}"'
  },
  // Export
  {
    label: 'صدّر',
    type: 'keyword',
    detail: 'تصدير',
    template: 'صدّر ${0}'
  },
  // Export function (NEW)
  {
    label: 'صدّر_دالة',
    type: 'keyword',
    detail: 'تصدير دالة',
    template: 'صدّر دالة ${1:اسم_الدالة}(${2:المعاملات}) -> ${3:نوع_الإرجاع} {\n\t${0}\n}'
  },
  // Export class (NEW)
  {
    label: 'صدّر_صنف',
    type: 'keyword',
    detail: 'تصدير صنف',
    template: 'صدّر صنف ${1:اسم_الصنف} {\n\t${0}\n}'
  },

  // ════════════════════════════════════════════════════════════════
  // هيكل البرنامج - Program Structure
  // ════════════════════════════════════════════════════════════════

  // Full program template (NEW)
  {
    label: 'برنامج',
    type: 'text',
    detail: 'هيكل برنامج كامل',
    template: 'بسم_الله\n\n// ${1:وصف_البرنامج}\n\n${0}\n\nالحمد_لله'
  },
  // Main function template (NEW)
  {
    label: 'رئيسية',
    type: 'function',
    detail: 'دالة رئيسية',
    template: 'دالة رئيسية() {\n\t${0}\n}'
  },
  // Module file template (NEW)
  {
    label: 'وحدة',
    type: 'text',
    detail: 'هيكل ملف وحدة',
    template: 'بسم_الله\n\n/// ${1:وصف_الوحدة}\n///\n/// @منذ ${2:١.٠.٠}\n\n${0}\n\nالحمد_لله'
  },

  // ════════════════════════════════════════════════════════════════
  // أنماط شائعة - Common Idioms
  // ════════════════════════════════════════════════════════════════

  // Debug print (NEW)
  {
    label: 'اطبع_تصحيح',
    type: 'function',
    detail: 'طباعة للتصحيح',
    template: 'اطبع("[تصحيح] ${1:المتغير}: " + ${1:المتغير})'
  },
  // Guard clause (NEW)
  {
    label: 'حارس',
    type: 'keyword',
    detail: 'شرط حارس للخروج المبكر',
    template: 'إذا ${1:الشرط} {\n\tأرجع ${2:القيمة_الافتراضية}\n}\n${0}'
  },
  // Null check (NEW)
  {
    label: 'تحقق_لا_شيء',
    type: 'keyword',
    detail: 'تحقق من قيمة فارغة',
    template: 'إذا ${1:المتغير} == لا_شيء {\n\t${2}\n}\n${0}'
  },
  // Array with initial values (NEW)
  {
    label: 'مصفوفة_قيم',
    type: 'type',
    detail: 'مصفوفة مع قيم ابتدائية',
    template: 'ثابت ${1:الاسم}: مصفوفة<${2:النوع}> = [${3:القيم}]'
  },

  // ════════════════════════════════════════════════════════════════
  // الأنواع - Types
  // ════════════════════════════════════════════════════════════════

  // Array literal
  {
    label: 'مصفوفة',
    type: 'type',
    detail: 'تعريف مصفوفة',
    template: 'مصفوفة<${1:النوع}>'
  },
  // Dictionary literal
  {
    label: 'قاموس',
    type: 'type',
    detail: 'تعريف قاموس',
    template: 'قاموس<${1:نوع_المفتاح}, ${2:نوع_القيمة}>'
  }
]

// Simple keywords (no snippet, just insert the keyword)
const SIMPLE_KEYWORDS: Array<{ label: string; detail?: string }> = [
  { label: 'وإلا', detail: 'الجزء البديل من الشرط' },
  { label: 'والا', detail: 'الجزء البديل من الشرط' },
  { label: 'غير_ذلك', detail: 'الحالة الافتراضية' },
  { label: 'في', detail: 'عنصر في مجموعة' },
  { label: 'أوقف', detail: 'إيقاف الحلقة' },
  { label: 'اوقف', detail: 'إيقاف الحلقة' },
  { label: 'استمر', detail: 'الانتقال للتكرار التالي' },
  { label: 'يرث', detail: 'وراثة من صنف' },
  { label: 'يلتزم', detail: 'الالتزام بميثاق' },
  { label: 'عام', detail: 'وصول عام' },
  { label: 'خاص', detail: 'وصول خاص' },
  { label: 'محمي', detail: 'وصول محمي' },
  { label: 'مشترك', detail: 'عضو مشترك (static)' },
  { label: 'هذا', detail: 'الكائن الحالي' },
  { label: 'الأصل', detail: 'الصنف الأب' },
  { label: 'الاصل', detail: 'الصنف الأب' },
  { label: 'احصل', detail: 'دالة الحصول على القيمة' },
  { label: 'عيّن', detail: 'دالة تعيين القيمة' },
  { label: 'عين', detail: 'دالة تعيين القيمة' },
  { label: 'التقط', detail: 'التقاط الخطأ' },
  { label: 'أخيراً', detail: 'تنفيذ أخير' },
  { label: 'اخيرا', detail: 'تنفيذ أخير' },
  { label: 'صدر', detail: 'تصدير' },
  { label: 'من', detail: 'من مسار' },
  { label: 'كـ', detail: 'اسم بديل' },
  { label: 'ك', detail: 'اسم بديل' },
  { label: 'و', detail: 'عامل AND المنطقي' },
  { label: 'أو', detail: 'عامل OR المنطقي' },
  { label: 'او', detail: 'عامل OR المنطقي' },
  { label: 'ليس', detail: 'عامل NOT المنطقي' },
  { label: 'بسم_الله', detail: 'بداية البرنامج' },
  { label: 'الحمد_لله', detail: 'نهاية البرنامج' }
]

// Type keywords
const TYPE_KEYWORDS: Array<{ label: string; detail: string }> = [
  { label: 'عدد', detail: 'نوع العدد الصحيح' },
  { label: 'عدد_عشري', detail: 'نوع العدد العشري' },
  { label: 'نص', detail: 'نوع النص' },
  { label: 'منطقي', detail: 'نوع منطقي (صحيح/خطأ)' },
  { label: 'أي', detail: 'أي نوع' },
  { label: 'اي', detail: 'أي نوع' }
]

// Constants and boolean values
const CONSTANT_KEYWORDS: Array<{ label: string; detail: string }> = [
  { label: 'صحيح', detail: 'القيمة المنطقية الصحيحة' },
  { label: 'خطأ', detail: 'القيمة المنطقية الخاطئة' },
  { label: 'خطا', detail: 'القيمة المنطقية الخاطئة' },
  { label: 'لا_شيء', detail: 'قيمة فارغة (null)' }
]

// Local keyword completion source
function localKeywordSource(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/[\u0600-\u06FF\w_]+/)

  // Don't trigger if no word and not explicit
  if (!word && !context.explicit) {
    return null
  }

  const options: Completion[] = []

  // Add snippet completions with Arabic placeholders
  for (const snippet of TARQEEM_SNIPPETS) {
    options.push(snippetCompletion(snippet.template, {
      label: snippet.label,
      type: snippet.type,
      detail: snippet.detail,
      boost: -1 // Lower priority than LSP results
    }))
  }

  // Add simple keywords
  for (const kw of SIMPLE_KEYWORDS) {
    options.push({
      label: kw.label,
      type: 'keyword',
      detail: kw.detail,
      boost: -1
    })
  }

  // Add type keywords
  for (const t of TYPE_KEYWORDS) {
    options.push({
      label: t.label,
      type: 'type',
      detail: t.detail,
      boost: -1
    })
  }

  // Add constants
  for (const c of CONSTANT_KEYWORDS) {
    options.push({
      label: c.label,
      type: 'constant',
      detail: c.detail,
      boost: -1
    })
  }

  return {
    from: word ? word.from : context.pos,
    options,
    validFor: /^[\u0600-\u06FF\w_]*$/
  }
}

// ============================================================
// LSP Completion Integration
// ============================================================

// LSP Completion kinds mapping to CodeMirror types
const lspKindToType: Record<number, string> = {
  1: 'text',        // Text
  2: 'method',      // Method
  3: 'function',    // Function
  4: 'constructor', // Constructor
  5: 'property',    // Field
  6: 'variable',    // Variable
  7: 'class',       // Class
  8: 'interface',   // Interface
  9: 'namespace',   // Module
  10: 'property',   // Property
  11: 'keyword',    // Unit
  12: 'constant',   // Value
  13: 'enum',       // Enum
  14: 'keyword',    // Keyword
  15: 'text',       // Snippet
  16: 'keyword',    // Color
  17: 'text',       // File
  18: 'text',       // Reference
  19: 'text',       // Folder
  20: 'property',   // EnumMember
  21: 'constant',   // Constant
  22: 'class',      // Struct
  23: 'property',   // Event
  24: 'keyword',    // Operator
  25: 'type'        // TypeParameter
}

// Effect to update file path
export const setFilePathEffect = StateEffect.define<string | null>()

// StateField to hold the current file path
export const filePathField = StateField.define<string | null>({
  create: () => null,
  update: (value, tr) => {
    for (const e of tr.effects) {
      if (e.is(setFilePathEffect)) {
        return e.value
      }
    }
    return value
  }
})

// Convert LSP documentation to string
function getDocumentation(doc: string | { kind: string; value: string } | undefined): string | undefined {
  if (!doc) return undefined
  if (typeof doc === 'string') return doc
  return doc.value
}

// Convert LSP completion item to CodeMirror completion
function lspToCompletion(item: LSPCompletionItem): Completion {
  const type = item.kind ? lspKindToType[item.kind] || 'text' : 'text'
  const doc = getDocumentation(item.documentation)

  // Handle snippet format
  if (item.insertTextFormat === 2 && item.insertText) {
    // Convert LSP snippet syntax to CodeMirror snippet syntax
    // LSP uses ${1:placeholder}, CodeMirror uses #{1:placeholder}
    // Actually CodeMirror uses the same syntax, we can use snippetCompletion
    return snippetCompletion(item.insertText, {
      label: item.label,
      type,
      detail: item.detail,
      info: doc
    })
  }

  const completion: Completion = {
    label: item.label,
    type,
    detail: item.detail,
    apply: item.insertText || item.textEdit?.newText || item.label
  }

  // Add documentation as info
  if (doc) {
    completion.info = doc
  }

  // Use filterText if provided
  if (item.filterText) {
    // CodeMirror doesn't have filterText, but we can use boost for sorting
  }

  return completion
}

// The completion source that calls LSP
async function lspCompletionSource(context: CompletionContext): Promise<CompletionResult | null> {
  // Get file path from state
  const filePath = context.state.field(filePathField)
  if (!filePath) {
    return null
  }

  // Check if we should trigger completion
  // Trigger on explicit request (Ctrl+Space) or after typing
  const word = context.matchBefore(/[\u0600-\u06FF\w]+/)

  // Don't trigger if no word and not explicit
  if (!context.explicit && !word) {
    return null
  }

  // Get cursor position (0-indexed for LSP)
  const pos = context.pos
  const line = context.state.doc.lineAt(pos)
  const lineNumber = line.number - 1 // LSP uses 0-indexed lines
  const character = pos - line.from

  try {
    // Get LSP store and request completion
    const lspStore = useLSPStore.getState()

    if (!lspStore.connected) {
      return null
    }

    const result = await lspStore.requestCompletion(filePath, lineNumber, character)

    if (!result) {
      return null
    }

    // Handle both CompletionList and CompletionItem[]
    const items: LSPCompletionItem[] = Array.isArray(result)
      ? result
      : (result as LSPCompletionList).items || []

    if (items.length === 0) {
      return null
    }

    // Convert LSP items to CodeMirror completions
    const completions = items.map(lspToCompletion)

    return {
      from: word ? word.from : pos,
      options: completions,
      validFor: /^[\u0600-\u06FF\w]*$/ // Arabic and word characters
    }
  } catch (error) {
    console.error('[LSP Completion] Error:', error)
    return null
  }
}

// RTL theme for completion popup
const completionRTLTheme = EditorView.theme({
  '.cm-tooltip-autocomplete': {
    direction: 'rtl',
    textAlign: 'right',
    fontFamily: 'inherit'
  },
  '.cm-tooltip-autocomplete > ul': {
    fontFamily: 'inherit',
    maxHeight: '300px'
  },
  '.cm-tooltip-autocomplete > ul > li': {
    direction: 'rtl',
    textAlign: 'right'
  },
  '.cm-completionLabel': {
    direction: 'rtl',
    fontFamily: 'inherit'
  },
  '.cm-completionDetail': {
    direction: 'ltr',
    marginRight: 'auto',
    marginLeft: '0.5em',
    fontStyle: 'normal',
    opacity: 0.7
  },
  '.cm-completionInfo': {
    direction: 'rtl',
    textAlign: 'right',
    padding: '8px 12px',
    fontFamily: 'inherit',
    maxWidth: '400px',
    whiteSpace: 'pre-wrap'
  },
  // Icon colors
  '.cm-completionIcon-keyword::after': { color: '#c586c0' },
  '.cm-completionIcon-function::after': { color: '#dcdcaa' },
  '.cm-completionIcon-method::after': { color: '#dcdcaa' },
  '.cm-completionIcon-variable::after': { color: '#9cdcfe' },
  '.cm-completionIcon-class::after': { color: '#4ec9b0' },
  '.cm-completionIcon-interface::after': { color: '#4ec9b0' },
  '.cm-completionIcon-type::after': { color: '#4ec9b0' },
  '.cm-completionIcon-property::after': { color: '#9cdcfe' },
  '.cm-completionIcon-constant::after': { color: '#4fc1ff' },
  '.cm-completionIcon-enum::after': { color: '#b5cea8' },
  '.cm-completionIcon-namespace::after': { color: '#4ec9b0' },
  '.cm-completionIcon-constructor::after': { color: '#dcdcaa' }
})

// Create the completion extension
export function lspCompletionExtension(): Extension {
  return [
    filePathField,
    autocompletion({
      // Use both LSP completions and local keyword completions
      // LSP has higher priority (no boost), local has lower priority (boost: -1)
      override: [lspCompletionSource, localKeywordSource],
      activateOnTyping: true,
      maxRenderedOptions: 50,
      defaultKeymap: true,
      icons: true
    }),
    keymap.of(completionKeymap),
    completionRTLTheme
  ]
}

// Helper to update file path in editor
export function updateFilePath(view: EditorView, filePath: string | null): void {
  view.dispatch({
    effects: setFilePathEffect.of(filePath)
  })
}
