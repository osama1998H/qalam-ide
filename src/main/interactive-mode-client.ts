import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'

/**
 * Result of evaluating code in the interactive mode
 */
export interface InteractiveModeResult {
  success: boolean
  output: string
  returnValue?: string
  error?: string
}

/**
 * Interactive Mode Client for Tarqeem REPL
 *
 * Manages a persistent `tarqeem repl` process for evaluating code snippets.
 * Handles Arabic text and RTL content correctly.
 */
export class InteractiveModeClient extends EventEmitter {
  private process: ChildProcess | null = null
  private outputBuffer: string = ''
  private isReady: boolean = false
  private pendingEvaluation: {
    resolve: (result: InteractiveModeResult) => void
    reject: (error: Error) => void
    startTime: number
  } | null = null

  // Patterns for parsing REPL output
  private readonly PROMPT_PATTERN = /ترقيم>\s*$/
  private readonly STDLIB_MESSAGE = 'المكتبة القياسية: stdlib_trq'
  private readonly RETURN_VALUE_PATTERN = /^=>\s*(.+)$/m
  private readonly ERROR_PATTERN = /^خطأ(\[.+)?:/m

  constructor() {
    super()
  }

  /**
   * Start the interactive mode REPL process
   */
  async start(): Promise<void> {
    if (this.process) {
      throw new Error('الوضع التفاعلي قيد التشغيل بالفعل')
    }

    return new Promise((resolve, reject) => {
      // Spawn tarqeem repl with verbose mode for return values
      this.process = spawn('tarqeem', ['repl', '-v'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, LANG: 'ar_SA.UTF-8' }
      })

      // Handle stdout
      this.process.stdout?.on('data', (data: Buffer) => {
        this.handleOutput(data.toString('utf-8'))
      })

      // Handle stderr
      this.process.stderr?.on('data', (data: Buffer) => {
        const text = data.toString('utf-8')
        this.emit('stderr', text)

        // If there's a pending evaluation, this might be an error
        if (this.pendingEvaluation) {
          this.outputBuffer += text
        }
      })

      // Handle process errors
      this.process.on('error', (err) => {
        this.emit('error', err)
        if (!this.isReady) {
          reject(err)
        }
      })

      // Handle process exit
      this.process.on('close', (code) => {
        this.cleanup()
        this.emit('close', code)
      })

      // Wait for initial prompt
      const checkReady = (): void => {
        if (this.outputBuffer.includes('ترقيم>')) {
          this.isReady = true
          this.outputBuffer = ''
          resolve()
        } else {
          setTimeout(checkReady, 100)
        }
      }

      // Timeout for startup
      setTimeout(() => {
        if (!this.isReady) {
          this.cleanup()
          reject(new Error('انتهت مهلة بدء الوضع التفاعلي'))
        }
      }, 10000)

      checkReady()
    })
  }

  /**
   * Stop the interactive mode process
   */
  async stop(): Promise<void> {
    if (!this.process) return

    try {
      // Send exit command
      this.process.stdin?.write('خروج\n')
    } catch {
      // Ignore write errors
    }

    // Force kill after timeout
    setTimeout(() => {
      if (this.process) {
        this.process.kill()
      }
    }, 1000)

    this.cleanup()
  }

  /**
   * Evaluate code in the interactive mode
   */
  async evaluate(code: string): Promise<InteractiveModeResult> {
    if (!this.process || !this.isReady) {
      return {
        success: false,
        output: '',
        error: 'الوضع التفاعلي غير متاح'
      }
    }

    if (this.pendingEvaluation) {
      return {
        success: false,
        output: '',
        error: 'يوجد تقييم آخر قيد التنفيذ'
      }
    }

    return new Promise((resolve) => {
      // Reset output buffer
      this.outputBuffer = ''

      // Set up pending evaluation
      this.pendingEvaluation = {
        resolve,
        reject: (error) => resolve({ success: false, output: '', error: error.message }),
        startTime: Date.now()
      }

      // Wrap code with Tarqeem bookends
      const wrappedCode = this.wrapCode(code)

      // Send to REPL
      try {
        this.process?.stdin?.write(wrappedCode + '\n')
      } catch (err) {
        this.pendingEvaluation = null
        resolve({
          success: false,
          output: '',
          error: `فشل في إرسال الكود: ${err}`
        })
      }

      // Timeout for evaluation
      setTimeout(() => {
        if (this.pendingEvaluation) {
          const pending = this.pendingEvaluation
          this.pendingEvaluation = null
          pending.resolve({
            success: false,
            output: this.outputBuffer,
            error: 'انتهت مهلة التقييم'
          })
        }
      }, 30000)
    })
  }

  /**
   * Check if interactive mode is running
   */
  isRunning(): boolean {
    return this.process !== null && this.isReady
  }

  /**
   * Wrap user code with Tarqeem bookends
   */
  private wrapCode(code: string): string {
    const trimmed = code.trim()

    // If already has bookends, don't wrap
    if (trimmed.startsWith('بسم_الله') && trimmed.includes('الحمد_لله')) {
      return trimmed
    }

    // Ensure code ends with semicolon
    const codeWithSemicolon = trimmed.endsWith(';') ? trimmed : `${trimmed};`

    return `بسم_الله ${codeWithSemicolon} الحمد_لله`
  }

  /**
   * Handle output from the REPL process
   */
  private handleOutput(text: string): void {
    this.outputBuffer += text

    // Emit raw output for logging
    this.emit('output', text)

    // Check if we received a complete response (ends with prompt)
    if (this.PROMPT_PATTERN.test(this.outputBuffer) && this.pendingEvaluation) {
      const result = this.parseOutput(this.outputBuffer)
      const pending = this.pendingEvaluation
      this.pendingEvaluation = null
      this.outputBuffer = ''
      pending.resolve(result)
    }
  }

  /**
   * Parse REPL output into structured result
   */
  private parseOutput(raw: string): InteractiveModeResult {
    // Remove prompt from end
    let output = raw.replace(this.PROMPT_PATTERN, '').trim()

    // Remove stdlib message
    output = output.replace(this.STDLIB_MESSAGE, '').trim()

    // Check for errors
    if (this.ERROR_PATTERN.test(output)) {
      return {
        success: false,
        output: '',
        error: output
      }
    }

    // Extract return value if present
    let returnValue: string | undefined
    const returnMatch = output.match(this.RETURN_VALUE_PATTERN)
    if (returnMatch) {
      returnValue = returnMatch[1].trim()
      // Remove return value line from output
      output = output.replace(this.RETURN_VALUE_PATTERN, '').trim()
    }

    // The remaining output is from print statements
    return {
      success: true,
      output: output,
      returnValue: returnValue
    }
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    this.process = null
    this.isReady = false
    this.outputBuffer = ''

    if (this.pendingEvaluation) {
      this.pendingEvaluation.reject(new Error('توقف الوضع التفاعلي'))
      this.pendingEvaluation = null
    }
  }
}

// Singleton instance
let interactiveModeClient: InteractiveModeClient | null = null

export function getInteractiveModeClient(): InteractiveModeClient {
  if (!interactiveModeClient) {
    interactiveModeClient = new InteractiveModeClient()
  }
  return interactiveModeClient
}

export async function destroyInteractiveModeClient(): Promise<void> {
  if (interactiveModeClient) {
    await interactiveModeClient.stop()
    interactiveModeClient = null
  }
}
