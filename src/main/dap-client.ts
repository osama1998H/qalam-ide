import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'

// DAP Message types
interface DAPMessage {
  seq: number
  type: 'request' | 'response' | 'event'
}

interface DAPRequest extends DAPMessage {
  type: 'request'
  command: string
  arguments?: unknown
}

interface DAPResponse extends DAPMessage {
  type: 'response'
  request_seq: number
  success: boolean
  command: string
  message?: string
  body?: unknown
}

interface DAPEvent extends DAPMessage {
  type: 'event'
  event: string
  body?: unknown
}

interface DAPPendingRequest {
  resolve: (result: unknown) => void
  reject: (error: Error) => void
}

// DAP Types
export interface DAPBreakpoint {
  id?: number
  verified: boolean
  line?: number
  column?: number
  message?: string
  source?: DAPSource
}

export interface DAPSource {
  name?: string
  path?: string
  sourceReference?: number
}

export interface DAPThread {
  id: number
  name: string
}

export interface DAPStackFrame {
  id: number
  name: string
  source?: DAPSource
  line: number
  column: number
  endLine?: number
  endColumn?: number
}

export interface DAPScope {
  name: string
  variablesReference: number
  expensive: boolean
}

export interface DAPVariable {
  name: string
  value: string
  type?: string
  variablesReference: number
  evaluateName?: string
}

export interface DAPCapabilities {
  supportsConditionalBreakpoints?: boolean
  supportsHitConditionalBreakpoints?: boolean
  supportsLogPoints?: boolean
  supportsFunctionBreakpoints?: boolean
  supportsConfigurationDoneRequest?: boolean
  supportsStepBack?: boolean
  supportsRestartRequest?: boolean
}

// Breakpoint request types
export interface SourceBreakpoint {
  line: number
  column?: number
  condition?: string
  hitCondition?: string
  logMessage?: string
}

export class DAPClient extends EventEmitter {
  private process: ChildProcess | null = null
  private messageSeq = 1
  private pendingRequests = new Map<number, DAPPendingRequest>()
  private buffer = Buffer.alloc(0)
  private initialized = false
  private capabilities: DAPCapabilities | null = null
  private currentFilePath: string | null = null

  constructor() {
    super()
  }

  /**
   * Start the DAP debug adapter process
   */
  async start(filePath: string): Promise<DAPCapabilities> {
    if (this.process) {
      throw new Error('Debug adapter already running')
    }

    this.currentFilePath = filePath

    return new Promise((resolve, reject) => {
      // Spawn tarqeem debug process with DAP stdio mode
      this.process = spawn('tarqeem', ['debug', filePath, '--dap-stdio'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: filePath.substring(0, filePath.lastIndexOf('/'))
      })

      // Handle stdout (DAP responses)
      this.process.stdout?.on('data', (data: Buffer) => {
        this.handleServerOutput(data)
      })

      // Handle stderr (errors/logs)
      this.process.stderr?.on('data', (data: Buffer) => {
        const text = data.toString()
        console.log('[DAP stderr]:', text)
        this.emit('log', { type: 'stderr', message: text })
      })

      // Handle process errors
      this.process.on('error', (err) => {
        console.error('[DAP process error]:', err)
        this.emit('error', err)
        if (!this.initialized) {
          reject(err)
        }
      })

      // Handle process exit
      this.process.on('close', (code) => {
        console.log('[DAP process closed] exit code:', code)
        this.cleanup()
        this.emit('close', code)
      })

      // Send initialize request
      this.sendInitialize()
        .then((result) => {
          this.initialized = true
          this.capabilities = result as DAPCapabilities
          resolve(this.capabilities)
        })
        .catch((err) => {
          this.cleanup()
          reject(err)
        })
    })
  }

  /**
   * Stop the debug adapter process
   */
  async stop(): Promise<void> {
    if (!this.process) return

    try {
      // Send disconnect request
      await this.request('disconnect', { restart: false, terminateDebuggee: true })
    } catch (err) {
      // Ignore errors during disconnect
      console.log('[DAP] Disconnect error (ignored):', err)
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
   * Send a DAP request and wait for response
   */
  request(command: string, args?: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.process || !this.process.stdin) {
        reject(new Error('Debug adapter not running'))
        return
      }

      const seq = this.messageSeq++
      this.pendingRequests.set(seq, { resolve, reject })

      const message: DAPRequest = {
        seq,
        type: 'request',
        command,
        arguments: args
      }

      this.sendMessage(message)

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(seq)) {
          this.pendingRequests.delete(seq)
          reject(new Error(`DAP request timeout: ${command}`))
        }
      }, 30000)
    })
  }

  /**
   * Get debug adapter capabilities
   */
  getCapabilities(): DAPCapabilities | null {
    return this.capabilities
  }

  /**
   * Check if debug adapter is running
   */
  isRunning(): boolean {
    return this.process !== null && this.initialized
  }

  // Debug control methods

  /**
   * Launch the program for debugging
   */
  async launch(): Promise<void> {
    if (!this.currentFilePath) {
      throw new Error('No file path set')
    }

    // Send configurationDone BEFORE launch (DAP protocol requirement)
    if (this.capabilities?.supportsConfigurationDoneRequest) {
      await this.request('configurationDone', {})
    }

    await this.request('launch', {
      program: this.currentFilePath,
      stopOnEntry: true  // Stop at first line to verify debugging works
    })
  }

  /**
   * Set breakpoints for a source file
   */
  async setBreakpoints(filePath: string, breakpoints: SourceBreakpoint[]): Promise<DAPBreakpoint[]> {
    const result = await this.request('setBreakpoints', {
      source: {
        path: filePath
      },
      breakpoints,
      sourceModified: false
    }) as { breakpoints: DAPBreakpoint[] }

    return result.breakpoints
  }

  /**
   * Continue execution
   */
  async continue(threadId: number = 1): Promise<void> {
    await this.request('continue', { threadId })
  }

  /**
   * Step over (next line)
   */
  async stepOver(threadId: number = 1): Promise<void> {
    await this.request('next', { threadId })
  }

  /**
   * Step into function
   */
  async stepInto(threadId: number = 1): Promise<void> {
    await this.request('stepIn', { threadId })
  }

  /**
   * Step out of function
   */
  async stepOut(threadId: number = 1): Promise<void> {
    await this.request('stepOut', { threadId })
  }

  /**
   * Pause execution
   */
  async pause(threadId: number = 1): Promise<void> {
    await this.request('pause', { threadId })
  }

  /**
   * Restart debugging
   */
  async restart(): Promise<void> {
    if (this.capabilities?.supportsRestartRequest) {
      await this.request('restart', {})
    } else {
      // Fallback: disconnect and start again
      await this.stop()
      if (this.currentFilePath) {
        await this.start(this.currentFilePath)
        await this.launch()
      }
    }
  }

  /**
   * Get threads
   */
  async threads(): Promise<DAPThread[]> {
    const result = await this.request('threads', {}) as { threads: DAPThread[] }
    return result.threads
  }

  /**
   * Get stack trace
   */
  async stackTrace(threadId: number = 1): Promise<DAPStackFrame[]> {
    const result = await this.request('stackTrace', {
      threadId,
      startFrame: 0,
      levels: 20
    }) as { stackFrames: DAPStackFrame[] }
    return result.stackFrames
  }

  /**
   * Get scopes for a stack frame
   */
  async scopes(frameId: number): Promise<DAPScope[]> {
    const result = await this.request('scopes', { frameId }) as { scopes: DAPScope[] }
    return result.scopes
  }

  /**
   * Get variables for a scope
   */
  async variables(variablesReference: number): Promise<DAPVariable[]> {
    const result = await this.request('variables', {
      variablesReference
    }) as { variables: DAPVariable[] }
    return result.variables
  }

  /**
   * Evaluate expression
   */
  async evaluate(expression: string, frameId?: number): Promise<{ result: string; type?: string; variablesReference: number }> {
    const result = await this.request('evaluate', {
      expression,
      frameId,
      context: 'watch'
    }) as { result: string; type?: string; variablesReference: number }
    return result
  }

  // Private methods

  private sendMessage(message: DAPRequest): void {
    const content = JSON.stringify(message)
    const header = `Content-Length: ${Buffer.byteLength(content, 'utf8')}\r\n\r\n`

    try {
      this.process?.stdin?.write(header + content)
    } catch (err) {
      console.error('[DAP] Failed to send message:', err)
    }
  }

  private handleServerOutput(data: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, data])

    // Parse DAP messages from buffer
    while (true) {
      const bufferStr = this.buffer.toString('utf8')
      const headerMatch = bufferStr.match(/^Content-Length: (\d+)\r\n\r\n/)
      if (!headerMatch) {
        break
      }

      const contentLength = parseInt(headerMatch[1], 10)
      const headerLength = Buffer.byteLength(headerMatch[0], 'utf8')
      const totalLength = headerLength + contentLength

      if (this.buffer.length < totalLength) {
        break
      }

      const contentBuffer = this.buffer.subarray(headerLength, totalLength)
      const content = contentBuffer.toString('utf8')
      this.buffer = this.buffer.subarray(totalLength)

      try {
        const message = JSON.parse(content)
        this.handleMessage(message)
      } catch (err) {
        console.error('[DAP] Failed to parse message:', err)
      }
    }
  }

  private handleMessage(message: DAPResponse | DAPEvent): void {
    if (message.type === 'response') {
      const response = message as DAPResponse
      const pending = this.pendingRequests.get(response.request_seq)
      if (pending) {
        this.pendingRequests.delete(response.request_seq)
        if (response.success) {
          pending.resolve(response.body)
        } else {
          pending.reject(new Error(response.message || 'DAP request failed'))
        }
      }
      return
    }

    if (message.type === 'event') {
      const event = message as DAPEvent
      this.emit('event', event.event, event.body)

      // Emit specific events
      switch (event.event) {
        case 'initialized':
          this.emit('initialized')
          break
        case 'stopped':
          this.emit('stopped', event.body)
          break
        case 'continued':
          this.emit('continued', event.body)
          break
        case 'terminated':
          this.emit('terminated', event.body)
          break
        case 'exited':
          this.emit('exited', event.body)
          break
        case 'thread':
          this.emit('thread', event.body)
          break
        case 'output':
          this.emit('output', event.body)
          break
        case 'breakpoint':
          this.emit('breakpoint', event.body)
          break
      }
    }
  }

  private async sendInitialize(): Promise<DAPCapabilities> {
    const result = await this.request('initialize', {
      clientID: 'qalam-ide',
      clientName: 'Qalam IDE',
      adapterID: 'tarqeem',
      pathFormat: 'path',
      linesStartAt1: true,
      columnsStartAt1: true,
      supportsVariableType: true,
      supportsVariablePaging: false,
      supportsRunInTerminalRequest: false,
      locale: 'ar'
    })

    return result as DAPCapabilities
  }

  private cleanup(): void {
    this.process = null
    this.initialized = false
    this.capabilities = null
    this.buffer = Buffer.alloc(0)
    this.currentFilePath = null

    // Reject all pending requests
    for (const [, pending] of this.pendingRequests) {
      pending.reject(new Error('Debug adapter stopped'))
    }
    this.pendingRequests.clear()
  }
}

// Singleton instance
let dapClient: DAPClient | null = null

export function getDAPClient(): DAPClient {
  if (!dapClient) {
    dapClient = new DAPClient()
  }
  return dapClient
}

export function destroyDAPClient(): void {
  if (dapClient) {
    dapClient.stop()
    dapClient = null
  }
}
