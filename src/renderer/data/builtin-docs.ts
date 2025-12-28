/**
 * Tarqeem Built-in Functions Documentation
 *
 * This file contains Arabic documentation for all Tarqeem standard library
 * functions. The documentation is used by the Documentation Browser panel.
 */

export interface ParamDoc {
  name: string
  type: string
  description: string
  optional?: boolean
  defaultValue?: string
}

export interface ReturnDoc {
  type: string
  description: string
}

export interface BuiltinFunction {
  name: string
  description: string
  params: ParamDoc[]
  returns: ReturnDoc
  examples: string[]
  seeAlso: string[]
  category: DocCategory
  notes?: string
  warning?: string
  since?: string
}

export type DocCategory =
  | 'إدخال/إخراج'
  | 'رياضيات'
  | 'نصوص'
  | 'مصفوفات'
  | 'ملفات'
  | 'تحويلات'
  | 'نظام'
  | 'أنواع'

export const CATEGORY_ORDER: DocCategory[] = [
  'إدخال/إخراج',
  'رياضيات',
  'نصوص',
  'مصفوفات',
  'ملفات',
  'تحويلات',
  'أنواع',
  'نظام'
]

export const CATEGORY_DESCRIPTIONS: Record<DocCategory, string> = {
  'إدخال/إخراج': 'دوال للتعامل مع المدخلات والمخرجات',
  'رياضيات': 'دوال العمليات الحسابية والرياضية',
  'نصوص': 'دوال معالجة النصوص والسلاسل',
  'مصفوفات': 'دوال التعامل مع المصفوفات والقوائم',
  'ملفات': 'دوال قراءة وكتابة الملفات',
  'تحويلات': 'دوال تحويل الأنواع',
  'أنواع': 'دوال فحص الأنواع',
  'نظام': 'دوال النظام والبيئة'
}

export const BUILTIN_FUNCTIONS: BuiltinFunction[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // إدخال/إخراج - Input/Output
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'اطبع',
    description: 'طباعة قيمة إلى المخرج القياسي بدون سطر جديد',
    params: [
      {
        name: 'قيمة',
        type: 'أي',
        description: 'القيمة المراد طباعتها'
      }
    ],
    returns: {
      type: 'عدم',
      description: ''
    },
    examples: [
      'اطبع("مرحبا ")\nاطبع("بالعالم")\n// المخرج: مرحبا بالعالم'
    ],
    seeAlso: ['اطبع_سطر'],
    category: 'إدخال/إخراج'
  },
  {
    name: 'اطبع_سطر',
    description: 'طباعة قيمة إلى المخرج القياسي مع سطر جديد في النهاية',
    params: [
      {
        name: 'قيمة',
        type: 'أي',
        description: 'القيمة المراد طباعتها'
      }
    ],
    returns: {
      type: 'عدم',
      description: ''
    },
    examples: [
      'اطبع_سطر("مرحبا بالعالم")\n// المخرج: مرحبا بالعالم',
      'اطبع_سطر(42)\n// المخرج: 42',
      'اطبع_سطر(صحيح)\n// المخرج: صحيح'
    ],
    seeAlso: ['اطبع'],
    category: 'إدخال/إخراج'
  },
  {
    name: 'ادخل',
    description: 'قراءة سطر من المدخل القياسي (لوحة المفاتيح)',
    params: [
      {
        name: 'رسالة',
        type: 'نص',
        description: 'رسالة تُعرض للمستخدم قبل الإدخال',
        optional: true
      }
    ],
    returns: {
      type: 'نص',
      description: 'النص الذي أدخله المستخدم'
    },
    examples: [
      'متغير اسم = ادخل("أدخل اسمك: ")\nاطبع_سطر("مرحبا " + اسم)'
    ],
    seeAlso: ['اطبع', 'اطبع_سطر'],
    category: 'إدخال/إخراج',
    notes: 'تُرجع الدالة نصاً فارغاً إذا ضغط المستخدم Enter مباشرة'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // رياضيات - Mathematics
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'جذر',
    description: 'حساب الجذر التربيعي لعدد',
    params: [
      {
        name: 'عدد',
        type: 'عدد',
        description: 'العدد المراد حساب جذره التربيعي'
      }
    ],
    returns: {
      type: 'عدد',
      description: 'الجذر التربيعي للعدد'
    },
    examples: [
      'متغير ن = جذر(16)\nاطبع_سطر(ن)  // المخرج: 4',
      'متغير ن = جذر(2)\nاطبع_سطر(ن)  // المخرج: 1.4142135623730951'
    ],
    seeAlso: ['قوة'],
    category: 'رياضيات',
    warning: 'سيحدث خطأ إذا كان العدد سالباً'
  },
  {
    name: 'قوة',
    description: 'رفع عدد إلى قوة معينة',
    params: [
      {
        name: 'الأساس',
        type: 'عدد',
        description: 'العدد الأساسي'
      },
      {
        name: 'الأس',
        type: 'عدد',
        description: 'القوة المراد الرفع إليها'
      }
    ],
    returns: {
      type: 'عدد',
      description: 'نتيجة رفع الأساس إلى الأس'
    },
    examples: [
      'متغير ن = قوة(2، 3)\nاطبع_سطر(ن)  // المخرج: 8',
      'متغير ن = قوة(5، 2)\nاطبع_سطر(ن)  // المخرج: 25'
    ],
    seeAlso: ['جذر'],
    category: 'رياضيات'
  },
  {
    name: 'مطلق',
    description: 'حساب القيمة المطلقة لعدد',
    params: [
      {
        name: 'عدد',
        type: 'عدد',
        description: 'العدد المراد حساب قيمته المطلقة'
      }
    ],
    returns: {
      type: 'عدد',
      description: 'القيمة المطلقة للعدد'
    },
    examples: [
      'متغير ن = مطلق(-5)\nاطبع_سطر(ن)  // المخرج: 5',
      'متغير ن = مطلق(3)\nاطبع_سطر(ن)  // المخرج: 3'
    ],
    seeAlso: [],
    category: 'رياضيات'
  },
  {
    name: 'تقريب',
    description: 'تقريب عدد عشري إلى أقرب عدد صحيح',
    params: [
      {
        name: 'عدد',
        type: 'عدد',
        description: 'العدد المراد تقريبه'
      }
    ],
    returns: {
      type: 'عدد',
      description: 'العدد مقرباً لأقرب صحيح'
    },
    examples: [
      'متغير ن = تقريب(3.7)\nاطبع_سطر(ن)  // المخرج: 4',
      'متغير ن = تقريب(3.2)\nاطبع_سطر(ن)  // المخرج: 3'
    ],
    seeAlso: ['سقف', 'أرضية'],
    category: 'رياضيات'
  },
  {
    name: 'سقف',
    description: 'تقريب عدد عشري للأعلى (أصغر عدد صحيح أكبر من أو يساوي العدد)',
    params: [
      {
        name: 'عدد',
        type: 'عدد',
        description: 'العدد المراد تقريبه للأعلى'
      }
    ],
    returns: {
      type: 'عدد',
      description: 'العدد مقرباً للأعلى'
    },
    examples: [
      'متغير ن = سقف(3.1)\nاطبع_سطر(ن)  // المخرج: 4',
      'متغير ن = سقف(3.9)\nاطبع_سطر(ن)  // المخرج: 4'
    ],
    seeAlso: ['أرضية', 'تقريب'],
    category: 'رياضيات'
  },
  {
    name: 'أرضية',
    description: 'تقريب عدد عشري للأسفل (أكبر عدد صحيح أصغر من أو يساوي العدد)',
    params: [
      {
        name: 'عدد',
        type: 'عدد',
        description: 'العدد المراد تقريبه للأسفل'
      }
    ],
    returns: {
      type: 'عدد',
      description: 'العدد مقرباً للأسفل'
    },
    examples: [
      'متغير ن = أرضية(3.9)\nاطبع_سطر(ن)  // المخرج: 3',
      'متغير ن = أرضية(3.1)\nاطبع_سطر(ن)  // المخرج: 3'
    ],
    seeAlso: ['سقف', 'تقريب'],
    category: 'رياضيات'
  },
  {
    name: 'عشوائي',
    description: 'توليد عدد عشوائي بين 0 و 1',
    params: [],
    returns: {
      type: 'عدد',
      description: 'عدد عشوائي بين 0 (شامل) و 1 (غير شامل)'
    },
    examples: [
      'متغير ن = عشوائي()\nاطبع_سطر(ن)  // مثال: 0.7234',
      '// توليد عدد عشوائي بين 1 و 10\nمتغير ن = أرضية(عشوائي() * 10) + 1'
    ],
    seeAlso: [],
    category: 'رياضيات'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // نصوص - Strings
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'طول',
    description: 'الحصول على طول نص أو مصفوفة',
    params: [
      {
        name: 'قيمة',
        type: 'نص | مصفوفة',
        description: 'النص أو المصفوفة المراد معرفة طولها'
      }
    ],
    returns: {
      type: 'عدد',
      description: 'عدد الأحرف في النص أو عدد العناصر في المصفوفة'
    },
    examples: [
      'متغير ط = طول("مرحبا")\nاطبع_سطر(ط)  // المخرج: 5',
      'متغير ط = طول([1، 2، 3])\nاطبع_سطر(ط)  // المخرج: 3'
    ],
    seeAlso: [],
    category: 'نصوص'
  },
  {
    name: 'قطع',
    description: 'استخراج جزء من نص',
    params: [
      {
        name: 'نص',
        type: 'نص',
        description: 'النص المراد القطع منه'
      },
      {
        name: 'البداية',
        type: 'عدد',
        description: 'موقع البداية (يبدأ من 0)'
      },
      {
        name: 'النهاية',
        type: 'عدد',
        description: 'موقع النهاية (غير شامل)',
        optional: true
      }
    ],
    returns: {
      type: 'نص',
      description: 'الجزء المقطوع من النص'
    },
    examples: [
      'متغير ن = قطع("مرحبا بالعالم"، 0، 5)\nاطبع_سطر(ن)  // المخرج: مرحبا',
      'متغير ن = قطع("مرحبا"، 2)\nاطبع_سطر(ن)  // المخرج: حبا'
    ],
    seeAlso: ['طول'],
    category: 'نصوص'
  },
  {
    name: 'استبدل',
    description: 'استبدال جزء من نص بنص آخر',
    params: [
      {
        name: 'نص',
        type: 'نص',
        description: 'النص الأصلي'
      },
      {
        name: 'قديم',
        type: 'نص',
        description: 'النص المراد استبداله'
      },
      {
        name: 'جديد',
        type: 'نص',
        description: 'النص البديل'
      }
    ],
    returns: {
      type: 'نص',
      description: 'النص بعد الاستبدال'
    },
    examples: [
      'متغير ن = استبدل("مرحبا عالم"، "عالم"، "يا صديق")\nاطبع_سطر(ن)  // المخرج: مرحبا يا صديق'
    ],
    seeAlso: ['قطع'],
    category: 'نصوص'
  },
  {
    name: 'قسّم',
    description: 'تقسيم نص إلى مصفوفة باستخدام فاصل',
    params: [
      {
        name: 'نص',
        type: 'نص',
        description: 'النص المراد تقسيمه'
      },
      {
        name: 'فاصل',
        type: 'نص',
        description: 'الفاصل المستخدم للتقسيم'
      }
    ],
    returns: {
      type: 'مصفوفة[نص]',
      description: 'مصفوفة من النصوص'
    },
    examples: [
      'متغير أجزاء = قسّم("أحمد،محمد،علي"، "،")\nاطبع_سطر(أجزاء)  // المخرج: ["أحمد"، "محمد"، "علي"]'
    ],
    seeAlso: ['ضم'],
    category: 'نصوص'
  },
  {
    name: 'ضم',
    description: 'دمج مصفوفة نصوص في نص واحد باستخدام فاصل',
    params: [
      {
        name: 'مصفوفة',
        type: 'مصفوفة[نص]',
        description: 'المصفوفة المراد دمجها'
      },
      {
        name: 'فاصل',
        type: 'نص',
        description: 'الفاصل بين العناصر'
      }
    ],
    returns: {
      type: 'نص',
      description: 'النص المدموج'
    },
    examples: [
      'متغير ن = ضم(["أحمد"، "محمد"، "علي"]، " و ")\nاطبع_سطر(ن)  // المخرج: أحمد و محمد و علي'
    ],
    seeAlso: ['قسّم'],
    category: 'نصوص'
  },
  {
    name: 'أحرف_كبيرة',
    description: 'تحويل النص إلى أحرف كبيرة (للنصوص اللاتينية)',
    params: [
      {
        name: 'نص',
        type: 'نص',
        description: 'النص المراد تحويله'
      }
    ],
    returns: {
      type: 'نص',
      description: 'النص بأحرف كبيرة'
    },
    examples: [
      'متغير ن = أحرف_كبيرة("hello")\nاطبع_سطر(ن)  // المخرج: HELLO'
    ],
    seeAlso: ['أحرف_صغيرة'],
    category: 'نصوص'
  },
  {
    name: 'أحرف_صغيرة',
    description: 'تحويل النص إلى أحرف صغيرة (للنصوص اللاتينية)',
    params: [
      {
        name: 'نص',
        type: 'نص',
        description: 'النص المراد تحويله'
      }
    ],
    returns: {
      type: 'نص',
      description: 'النص بأحرف صغيرة'
    },
    examples: [
      'متغير ن = أحرف_صغيرة("HELLO")\nاطبع_سطر(ن)  // المخرج: hello'
    ],
    seeAlso: ['أحرف_كبيرة'],
    category: 'نصوص'
  },
  {
    name: 'تقليم',
    description: 'إزالة المسافات البيضاء من بداية ونهاية النص',
    params: [
      {
        name: 'نص',
        type: 'نص',
        description: 'النص المراد تقليمه'
      }
    ],
    returns: {
      type: 'نص',
      description: 'النص بدون مسافات في البداية والنهاية'
    },
    examples: [
      'متغير ن = تقليم("  مرحبا  ")\nاطبع_سطر("|" + ن + "|")  // المخرج: |مرحبا|'
    ],
    seeAlso: [],
    category: 'نصوص'
  },
  {
    name: 'يحتوي',
    description: 'فحص ما إذا كان النص يحتوي على نص فرعي',
    params: [
      {
        name: 'نص',
        type: 'نص',
        description: 'النص الأصلي'
      },
      {
        name: 'بحث',
        type: 'نص',
        description: 'النص المراد البحث عنه'
      }
    ],
    returns: {
      type: 'منطقي',
      description: 'صحيح إذا وُجد النص الفرعي، خطأ خلاف ذلك'
    },
    examples: [
      'متغير نتيجة = يحتوي("مرحبا بالعالم"، "عالم")\nاطبع_سطر(نتيجة)  // المخرج: صحيح'
    ],
    seeAlso: ['موقع'],
    category: 'نصوص'
  },
  {
    name: 'موقع',
    description: 'إيجاد موقع نص فرعي داخل نص',
    params: [
      {
        name: 'نص',
        type: 'نص',
        description: 'النص الأصلي'
      },
      {
        name: 'بحث',
        type: 'نص',
        description: 'النص المراد البحث عنه'
      }
    ],
    returns: {
      type: 'عدد',
      description: 'موقع أول ظهور للنص الفرعي، أو -1 إذا لم يوجد'
    },
    examples: [
      'متغير م = موقع("مرحبا بالعالم"، "عالم")\nاطبع_سطر(م)  // المخرج: 9'
    ],
    seeAlso: ['يحتوي'],
    category: 'نصوص'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // مصفوفات - Arrays
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'أضف',
    description: 'إضافة عنصر إلى نهاية المصفوفة',
    params: [
      {
        name: 'مصفوفة',
        type: 'مصفوفة',
        description: 'المصفوفة المراد الإضافة إليها'
      },
      {
        name: 'عنصر',
        type: 'أي',
        description: 'العنصر المراد إضافته'
      }
    ],
    returns: {
      type: 'عدم',
      description: ''
    },
    examples: [
      'متغير م = [1، 2، 3]\nأضف(م، 4)\nاطبع_سطر(م)  // المخرج: [1، 2، 3، 4]'
    ],
    seeAlso: ['احذف', 'طول'],
    category: 'مصفوفات',
    notes: 'تُعدّل هذه الدالة المصفوفة الأصلية'
  },
  {
    name: 'احذف',
    description: 'حذف عنصر من المصفوفة بالموقع',
    params: [
      {
        name: 'مصفوفة',
        type: 'مصفوفة',
        description: 'المصفوفة المراد الحذف منها'
      },
      {
        name: 'موقع',
        type: 'عدد',
        description: 'موقع العنصر المراد حذفه (يبدأ من 0)'
      }
    ],
    returns: {
      type: 'أي',
      description: 'العنصر المحذوف'
    },
    examples: [
      'متغير م = [1، 2، 3]\nمتغير محذوف = احذف(م، 1)\nاطبع_سطر(م)  // المخرج: [1، 3]\nاطبع_سطر(محذوف)  // المخرج: 2'
    ],
    seeAlso: ['أضف'],
    category: 'مصفوفات',
    notes: 'تُعدّل هذه الدالة المصفوفة الأصلية'
  },
  {
    name: 'اعكس',
    description: 'عكس ترتيب عناصر المصفوفة',
    params: [
      {
        name: 'مصفوفة',
        type: 'مصفوفة',
        description: 'المصفوفة المراد عكسها'
      }
    ],
    returns: {
      type: 'مصفوفة',
      description: 'المصفوفة معكوسة'
    },
    examples: [
      'متغير م = [1، 2، 3]\nمتغير معكوسة = اعكس(م)\nاطبع_سطر(معكوسة)  // المخرج: [3، 2، 1]'
    ],
    seeAlso: ['رتّب'],
    category: 'مصفوفات'
  },
  {
    name: 'رتّب',
    description: 'ترتيب عناصر المصفوفة تصاعدياً',
    params: [
      {
        name: 'مصفوفة',
        type: 'مصفوفة',
        description: 'المصفوفة المراد ترتيبها'
      }
    ],
    returns: {
      type: 'مصفوفة',
      description: 'المصفوفة مرتبة'
    },
    examples: [
      'متغير م = [3، 1، 2]\nمتغير مرتبة = رتّب(م)\nاطبع_سطر(مرتبة)  // المخرج: [1، 2، 3]'
    ],
    seeAlso: ['اعكس'],
    category: 'مصفوفات'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ملفات - Files
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'اقرأ_ملف',
    description: 'قراءة محتوى ملف نصي',
    params: [
      {
        name: 'مسار',
        type: 'نص',
        description: 'مسار الملف المراد قراءته'
      }
    ],
    returns: {
      type: 'نص',
      description: 'محتوى الملف كنص'
    },
    examples: [
      'متغير محتوى = اقرأ_ملف("بيانات.txt")\nاطبع_سطر(محتوى)'
    ],
    seeAlso: ['اكتب_ملف', 'ملف_موجود'],
    category: 'ملفات',
    warning: 'سيحدث خطأ إذا لم يكن الملف موجوداً'
  },
  {
    name: 'اكتب_ملف',
    description: 'كتابة محتوى إلى ملف نصي',
    params: [
      {
        name: 'مسار',
        type: 'نص',
        description: 'مسار الملف المراد الكتابة إليه'
      },
      {
        name: 'محتوى',
        type: 'نص',
        description: 'المحتوى المراد كتابته'
      }
    ],
    returns: {
      type: 'منطقي',
      description: 'صحيح إذا نجحت الكتابة'
    },
    examples: [
      'اكتب_ملف("مخرج.txt"، "مرحبا بالعالم")'
    ],
    seeAlso: ['اقرأ_ملف', 'أضف_لملف'],
    category: 'ملفات',
    warning: 'سيتم استبدال محتوى الملف إذا كان موجوداً'
  },
  {
    name: 'أضف_لملف',
    description: 'إضافة محتوى إلى نهاية ملف نصي',
    params: [
      {
        name: 'مسار',
        type: 'نص',
        description: 'مسار الملف'
      },
      {
        name: 'محتوى',
        type: 'نص',
        description: 'المحتوى المراد إضافته'
      }
    ],
    returns: {
      type: 'منطقي',
      description: 'صحيح إذا نجحت الإضافة'
    },
    examples: [
      'أضف_لملف("سجل.txt"، "سطر جديد\\n")'
    ],
    seeAlso: ['اكتب_ملف', 'اقرأ_ملف'],
    category: 'ملفات'
  },
  {
    name: 'ملف_موجود',
    description: 'فحص ما إذا كان ملف موجوداً',
    params: [
      {
        name: 'مسار',
        type: 'نص',
        description: 'مسار الملف المراد فحصه'
      }
    ],
    returns: {
      type: 'منطقي',
      description: 'صحيح إذا كان الملف موجوداً'
    },
    examples: [
      'إذا (ملف_موجود("بيانات.txt")) {\n    متغير محتوى = اقرأ_ملف("بيانات.txt")\n}'
    ],
    seeAlso: ['اقرأ_ملف'],
    category: 'ملفات'
  },
  {
    name: 'احذف_ملف',
    description: 'حذف ملف من النظام',
    params: [
      {
        name: 'مسار',
        type: 'نص',
        description: 'مسار الملف المراد حذفه'
      }
    ],
    returns: {
      type: 'منطقي',
      description: 'صحيح إذا نجح الحذف'
    },
    examples: [
      'إذا (احذف_ملف("مؤقت.txt")) {\n    اطبع_سطر("تم الحذف")\n}'
    ],
    seeAlso: ['ملف_موجود'],
    category: 'ملفات',
    warning: 'الحذف نهائي ولا يمكن التراجع عنه'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // تحويلات - Conversions
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'إلى_عدد',
    description: 'تحويل قيمة إلى عدد',
    params: [
      {
        name: 'قيمة',
        type: 'نص | منطقي',
        description: 'القيمة المراد تحويلها'
      }
    ],
    returns: {
      type: 'عدد',
      description: 'القيمة كعدد'
    },
    examples: [
      'متغير ع = إلى_عدد("42")\nاطبع_سطر(ع + 1)  // المخرج: 43',
      'متغير ع = إلى_عدد(صحيح)\nاطبع_سطر(ع)  // المخرج: 1'
    ],
    seeAlso: ['إلى_نص', 'إلى_منطقي'],
    category: 'تحويلات',
    warning: 'سيحدث خطأ إذا كان النص لا يمثل عدداً صالحاً'
  },
  {
    name: 'إلى_نص',
    description: 'تحويل قيمة إلى نص',
    params: [
      {
        name: 'قيمة',
        type: 'أي',
        description: 'القيمة المراد تحويلها'
      }
    ],
    returns: {
      type: 'نص',
      description: 'القيمة كنص'
    },
    examples: [
      'متغير ن = إلى_نص(42)\nاطبع_سطر("العدد: " + ن)  // المخرج: العدد: 42'
    ],
    seeAlso: ['إلى_عدد', 'إلى_منطقي'],
    category: 'تحويلات'
  },
  {
    name: 'إلى_منطقي',
    description: 'تحويل قيمة إلى قيمة منطقية',
    params: [
      {
        name: 'قيمة',
        type: 'أي',
        description: 'القيمة المراد تحويلها'
      }
    ],
    returns: {
      type: 'منطقي',
      description: 'القيمة كقيمة منطقية'
    },
    examples: [
      'متغير م = إلى_منطقي(1)\nاطبع_سطر(م)  // المخرج: صحيح',
      'متغير م = إلى_منطقي(0)\nاطبع_سطر(م)  // المخرج: خطأ',
      'متغير م = إلى_منطقي("")\nاطبع_سطر(م)  // المخرج: خطأ'
    ],
    seeAlso: ['إلى_عدد', 'إلى_نص'],
    category: 'تحويلات',
    notes: 'القيم الفارغة (0، ""، عدم، []) تُحوَّل إلى خطأ'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // أنواع - Types
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'نوع',
    description: 'الحصول على نوع قيمة كنص',
    params: [
      {
        name: 'قيمة',
        type: 'أي',
        description: 'القيمة المراد معرفة نوعها'
      }
    ],
    returns: {
      type: 'نص',
      description: 'اسم النوع (عدد، نص، منطقي، مصفوفة، قاموس، دالة، عدم، كائن)'
    },
    examples: [
      'اطبع_سطر(نوع(42))        // المخرج: عدد',
      'اطبع_سطر(نوع("مرحبا"))   // المخرج: نص',
      'اطبع_سطر(نوع(صحيح))     // المخرج: منطقي',
      'اطبع_سطر(نوع([1، 2]))   // المخرج: مصفوفة'
    ],
    seeAlso: [],
    category: 'أنواع'
  },
  {
    name: 'هو_عدد',
    description: 'فحص ما إذا كانت القيمة عدداً',
    params: [
      {
        name: 'قيمة',
        type: 'أي',
        description: 'القيمة المراد فحصها'
      }
    ],
    returns: {
      type: 'منطقي',
      description: 'صحيح إذا كانت القيمة عدداً'
    },
    examples: [
      'اطبع_سطر(هو_عدد(42))      // المخرج: صحيح',
      'اطبع_سطر(هو_عدد("42"))    // المخرج: خطأ'
    ],
    seeAlso: ['نوع', 'هو_نص', 'هو_مصفوفة'],
    category: 'أنواع'
  },
  {
    name: 'هو_نص',
    description: 'فحص ما إذا كانت القيمة نصاً',
    params: [
      {
        name: 'قيمة',
        type: 'أي',
        description: 'القيمة المراد فحصها'
      }
    ],
    returns: {
      type: 'منطقي',
      description: 'صحيح إذا كانت القيمة نصاً'
    },
    examples: [
      'اطبع_سطر(هو_نص("مرحبا"))  // المخرج: صحيح',
      'اطبع_سطر(هو_نص(42))       // المخرج: خطأ'
    ],
    seeAlso: ['نوع', 'هو_عدد', 'هو_مصفوفة'],
    category: 'أنواع'
  },
  {
    name: 'هو_مصفوفة',
    description: 'فحص ما إذا كانت القيمة مصفوفة',
    params: [
      {
        name: 'قيمة',
        type: 'أي',
        description: 'القيمة المراد فحصها'
      }
    ],
    returns: {
      type: 'منطقي',
      description: 'صحيح إذا كانت القيمة مصفوفة'
    },
    examples: [
      'اطبع_سطر(هو_مصفوفة([1، 2]))  // المخرج: صحيح',
      'اطبع_سطر(هو_مصفوفة("نص"))    // المخرج: خطأ'
    ],
    seeAlso: ['نوع', 'هو_عدد', 'هو_نص'],
    category: 'أنواع'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // نظام - System
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'وقت',
    description: 'الحصول على الوقت الحالي بالمللي ثانية منذ 1 يناير 1970',
    params: [],
    returns: {
      type: 'عدد',
      description: 'الوقت بالمللي ثانية'
    },
    examples: [
      'متغير بداية = وقت()\n// تنفيذ عمليات\nمتغير نهاية = وقت()\nاطبع_سطر("المدة: " + إلى_نص(نهاية - بداية) + " مللي ثانية")'
    ],
    seeAlso: ['انتظر'],
    category: 'نظام'
  },
  {
    name: 'انتظر',
    description: 'إيقاف التنفيذ لفترة زمنية',
    params: [
      {
        name: 'مللي_ثانية',
        type: 'عدد',
        description: 'مدة الانتظار بالمللي ثانية'
      }
    ],
    returns: {
      type: 'عدم',
      description: ''
    },
    examples: [
      'اطبع_سطر("بداية")\nانتظر(1000)  // انتظار ثانية واحدة\nاطبع_سطر("نهاية")'
    ],
    seeAlso: ['وقت'],
    category: 'نظام'
  },
  {
    name: 'اخرج',
    description: 'إنهاء البرنامج برمز خروج',
    params: [
      {
        name: 'رمز',
        type: 'عدد',
        description: 'رمز الخروج (0 للنجاح، غير 0 للخطأ)',
        optional: true,
        defaultValue: '0'
      }
    ],
    returns: {
      type: 'عدم',
      description: ''
    },
    examples: [
      'إذا (حدث_خطأ) {\n    اطبع_سطر("خطأ!")\n    اخرج(1)\n}'
    ],
    seeAlso: [],
    category: 'نظام',
    warning: 'سيتم إنهاء البرنامج فوراً'
  }
]

/**
 * Get functions grouped by category
 */
export function getFunctionsByCategory(): Map<DocCategory, BuiltinFunction[]> {
  const map = new Map<DocCategory, BuiltinFunction[]>()

  for (const category of CATEGORY_ORDER) {
    map.set(category, [])
  }

  for (const func of BUILTIN_FUNCTIONS) {
    const list = map.get(func.category)
    if (list) {
      list.push(func)
    }
  }

  return map
}

/**
 * Search functions by name or description
 */
export function searchFunctions(query: string): BuiltinFunction[] {
  if (!query.trim()) return BUILTIN_FUNCTIONS

  const normalizedQuery = query.trim().toLowerCase()

  return BUILTIN_FUNCTIONS.filter(func =>
    func.name.toLowerCase().includes(normalizedQuery) ||
    func.description.toLowerCase().includes(normalizedQuery)
  )
}

/**
 * Get function by name
 */
export function getFunctionByName(name: string): BuiltinFunction | undefined {
  return BUILTIN_FUNCTIONS.find(func => func.name === name)
}
