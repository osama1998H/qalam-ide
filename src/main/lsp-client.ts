import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'

// LSP Message types
interface LSPMessage {
  jsonrpc: '2.0'
  id?: number
  method?: string
  params?: unknown
  result?: unknown
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

interface LSPRequest {
  resolve: (result: unknown) => void
  reject: (error: Error) => void
}

interface ServerCapabilities {
  textDocumentSync?: number | { openClose?: boolean; change?: number }
  completionProvider?: { triggerCharacters?: string[] }
  hoverProvider?: boolean
  definitionProvider?: boolean
  referencesProvider?: boolean
  renameProvider?: boolean | { prepareProvider?: boolean }
  documentFormattingProvider?: boolean
  documentSymbolProvider?: boolean
  codeActionProvider?: boolean
  signatureHelpProvider?: { triggerCharacters?: string[] }
  semanticTokensProvider?: unknown
  foldingRangeProvider?: boolean
  inlayHintProvider?: boolean
}

interface InitializeResult {
  capabilities: ServerCapabilities
}

export class LSPClient extends EventEmitter {
  private process: ChildProcess | null = null
  private messageId = 0
  private pendingRequests = new Map<number, LSPRequest>()
  private buffer = Buffer.alloc(0)  // Use Buffer for correct byte handling
  private initialized = false
  private serverCapabilities: ServerCapabilities | null = null

  constructor() {
    super()
  }

  /**
   * Start the LSP server process
   */
  async start(workspacePath?: string): Promise<InitializeResult> {
    if (this.process) {
      throw new Error('LSP server already running')
    }

    return new Promise((resolve, reject) => {
      // Spawn tarqeem lsp process
      this.process = spawn('tarqeem', ['lsp'], {
        stdio: ['pipe', 'pipe', 'pipe']
      })

      // Handle stdout (LSP responses)
      this.process.stdout?.on('data', (data: Buffer) => {
        this.handleServerOutput(data)
      })

      // Handle stderr (errors/logs)
      this.process.stderr?.on('data', (data: Buffer) => {
        const text = data.toString()
        this.emit('log', { type: 'error', message: text })
      })

      // Handle process errors
      this.process.on('error', (err) => {
        console.error('[LSP process error]:', err)
        this.emit('error', err)
        if (!this.initialized) {
          reject(err)
        }
      })

      // Handle process exit
      this.process.on('close', (code) => {
        console.log('[LSP process closed] exit code:', code)
        this.cleanup()
        this.emit('close', code)
      })

      // Send initialize request
      this.sendInitialize(workspacePath)
        .then((result) => {
          this.initialized = true
          this.serverCapabilities = result.capabilities

          // Send initialized notification
          this.notify('initialized', {})

          resolve(result)
        })
        .catch((err) => {
          reject(err)
        })
    })
  }

  /**
   * Stop the LSP server process
   */
  stop(): void {
    if (this.process) {
      // Send shutdown request, then exit notification
      this.request('shutdown', null)
        .then(() => {
          this.notify('exit', null)
          setTimeout(() => {
            if (this.process) {
              this.process.kill()
            }
          }, 1000)
        })
        .catch(() => {
          // Force kill if shutdown fails
          if (this.process) {
            this.process.kill()
          }
        })
    }
    this.cleanup()
  }

  /**
   * Send an LSP request and wait for response
   */
  request(method: string, params: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.process || !this.process.stdin) {
        reject(new Error('LSP server not running'))
        return
      }

      const id = ++this.messageId
      this.pendingRequests.set(id, { resolve, reject })

      const message: LSPMessage = {
        jsonrpc: '2.0',
        id,
        method,
        params
      }

      this.sendMessage(message)

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error(`LSP request timeout: ${method}`))
        }
      }, 30000)
    })
  }

  /**
   * Send an LSP notification (no response expected)
   */
  notify(method: string, params: unknown): void {
    if (!this.process || !this.process.stdin) {
      console.warn('LSP server not running, cannot send notification:', method)
      return
    }

    const message: LSPMessage = {
      jsonrpc: '2.0',
      method,
      params
    }

    this.sendMessage(message)
  }

  /**
   * Get server capabilities
   */
  getCapabilities(): ServerCapabilities | null {
    return this.serverCapabilities
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.process !== null && this.initialized
  }

  // Private methods

  private sendMessage(message: LSPMessage): void {
    const content = JSON.stringify(message)
    const header = `Content-Length: ${Buffer.byteLength(content, 'utf8')}\r\n\r\n`

    try {
      this.process?.stdin?.write(header + content)
    } catch (err) {
      console.error('[LSP] Failed to send message:', err)
    }
  }

  private handleServerOutput(data: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, data])

    // Parse LSP messages from buffer
    while (true) {
      // Look for Content-Length header in the buffer
      const bufferStr = this.buffer.toString('utf8')
      const headerMatch = bufferStr.match(/^Content-Length: (\d+)\r\n\r\n/)
      if (!headerMatch) {
        break
      }

      const contentLength = parseInt(headerMatch[1], 10)
      // Header length in bytes (ASCII characters = 1 byte each)
      const headerLength = Buffer.byteLength(headerMatch[0], 'utf8')
      const totalLength = headerLength + contentLength

      // Check if we have the full message (in bytes)
      if (this.buffer.length < totalLength) {
        break
      }

      // Extract the message content (as bytes, then convert to string)
      const contentBuffer = this.buffer.subarray(headerLength, totalLength)
      const content = contentBuffer.toString('utf8')
      this.buffer = this.buffer.subarray(totalLength)

      try {
        const message: LSPMessage = JSON.parse(content)
        this.handleMessage(message)
      } catch (err) {
        console.error('[LSP] Failed to parse message:', err)
      }
    }
  }

  private handleMessage(message: LSPMessage): void {
    // Response to a request
    if (message.id !== undefined && (message.result !== undefined || message.error !== undefined)) {
      const pending = this.pendingRequests.get(message.id)
      if (pending) {
        this.pendingRequests.delete(message.id)
        if (message.error) {
          pending.reject(new Error(message.error.message))
        } else {
          pending.resolve(message.result)
        }
      }
      return
    }

    // Notification from server
    if (message.method && message.id === undefined) {
      this.emit('notification', message.method, message.params)

      // Emit specific events for common notifications
      switch (message.method) {
        case 'textDocument/publishDiagnostics':
          this.emit('diagnostics', message.params)
          break
        case 'window/logMessage':
          this.emit('log', message.params)
          break
        case 'window/showMessage':
          this.emit('showMessage', message.params)
          break
      }
    }
  }

  private async sendInitialize(workspacePath?: string): Promise<InitializeResult> {
    const params = {
      processId: process.pid,
      rootUri: workspacePath ? `file://${workspacePath}` : null,
      capabilities: {
        textDocument: {
          synchronization: {
            dynamicRegistration: false,
            willSave: false,
            willSaveWaitUntil: false,
            didSave: true
          },
          completion: {
            dynamicRegistration: false,
            completionItem: {
              snippetSupport: true,
              documentationFormat: ['plaintext', 'markdown']
            }
          },
          hover: {
            dynamicRegistration: false,
            contentFormat: ['plaintext', 'markdown']
          },
          signatureHelp: {
            dynamicRegistration: false
          },
          definition: {
            dynamicRegistration: false
          },
          references: {
            dynamicRegistration: false
          },
          documentSymbol: {
            dynamicRegistration: false
          },
          codeAction: {
            dynamicRegistration: false
          },
          formatting: {
            dynamicRegistration: false
          },
          rename: {
            dynamicRegistration: false,
            prepareSupport: true
          },
          publishDiagnostics: {
            relatedInformation: true
          }
        },
        workspace: {
          workspaceFolders: false
        }
      },
      locale: 'ar' // Arabic locale for bilingual messages
    }

    const result = await this.request('initialize', params)
    return result as InitializeResult
  }

  private cleanup(): void {
    this.process = null
    this.initialized = false
    this.serverCapabilities = null
    this.buffer = Buffer.alloc(0)

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      pending.reject(new Error('LSP server stopped'))
    }
    this.pendingRequests.clear()
  }
}

// Singleton instance
let lspClient: LSPClient | null = null

export function getLSPClient(): LSPClient {
  if (!lspClient) {
    lspClient = new LSPClient()
  }
  return lspClient
}

export function destroyLSPClient(): void {
  if (lspClient) {
    lspClient.stop()
    lspClient = null
  }
}
