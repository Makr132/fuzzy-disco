'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'

export default function ImportPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [resultMessage, setResultMessage] = useState('')
  const [token, setToken] = useState('')
  const [code, setCode] = useState('')
  const [accountName, setAccountName] = useState('')
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [countdown, setCountdown] = useState(30)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [fileContent, setFileContent] = useState<string | null>(null)

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      readFile(file)
    }
  }

  // 读取文件内容
  const readFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setFileContent(content)

      // 自动导入文件
      if (content) {
        importMaFile(content)
      }
    }
    reader.readAsText(file)
  }

  // 处理拖放事件
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      readFile(file)
    }
  }

  // 点击上传区域
  const handleAreaClick = () => {
    fileInputRef.current?.click()
  }

  // 导入maFile
  const importMaFile = async (content: string) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ maFile: content }),
      })

      const data = await response.json()
      if (response.ok) {
        setToken(data.token || '')
        setCode(data.code || '')
        setAccountName(data.account_name || '未知账户')
        setExpiresAt(data.expires_at || null)
        setResultMessage(`maFile 导入成功！账户: ${data.account_name || '未知'}`)
        // 重置倒计时
        setCountdown(30)
      } else {
        setResultMessage(`错误: ${data.error}`)
      }
    } catch (error) {
      setResultMessage(`请求错误: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  // 获取最新验证码 - 使用useCallback避免依赖警告
  const refreshCode = useCallback(async () => {
    if (!token) {
      setResultMessage('请先导入 maFile')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/auth/import?token=${token}`, {
        method: 'GET',
      })

      const data = await response.json()
      if (response.ok) {
        setCode(data.code || '')
        setResultMessage('验证码已更新')
        // 重置倒计时
        setCountdown(30)
      } else {
        setResultMessage(`错误: ${data.error}`)
      }
    } catch (error) {
      setResultMessage(`请求错误: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }, [token, setCode, setResultMessage, setCountdown, setIsLoading])

  // 格式化过期时间
  const formatExpireTime = () => {
    if (!expiresAt) return ''
    return new Date(expiresAt).toLocaleString()
  }

  // 直接从文本框导入 JSON
  const importFromText = () => {
    if (!fileContent) {
      setResultMessage('请先输入或粘贴 maFile 内容')
      return
    }

    importMaFile(fileContent)
  }

  // 倒计时和自动刷新
  useEffect(() => {
    if (!token || !autoRefresh) return;

    const intervalId = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // 当倒计时结束时，刷新验证码
          refreshCode();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [token, autoRefresh, refreshCode]);

  return (
    <div className="flex min-h-screen flex-col items-center p-4 md:p-24 bg-gray-900">
      <div className="w-full max-w-3xl bg-gray-800 p-6 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-6 text-center text-white">导入 Steam maFile</h1>

        {/* 文件上传区域 */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 mb-6 text-center cursor-pointer transition ${
            isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-blue-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleAreaClick}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".maFile,application/json,.json"
            className="hidden"
          />

          <div className="text-white mb-2">
            {fileContent ? (
              <span className="text-green-400">已选择文件</span>
            ) : (
              <span>拖放 maFile 文件到此处，或点击选择文件</span>
            )}
          </div>

          <div className="text-gray-400 text-sm">
            支持 .maFile 或 .json 格式
          </div>
        </div>

        {/* JSON 文本区域 */}
        <div className="mb-6">
          <label className="block mb-2 text-sm font-medium text-gray-300">
            maFile 内容（JSON 格式）
          </label>
          <textarea
            value={fileContent || ''}
            onChange={(e) => setFileContent(e.target.value)}
            className="bg-gray-700 text-white text-sm rounded-lg block w-full p-2.5 h-48"
            placeholder='{"shared_secret": "...", "identity_secret": "...", ...}'
          ></textarea>
          <div className="mt-2 flex justify-end">
            <button
              onClick={importFromText}
              disabled={isLoading || !fileContent}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
            >
              导入
            </button>
          </div>
        </div>

        {/* 导入结果区域 */}
        {token && (
          <div className="mb-6 bg-gray-700 p-4 rounded-lg">
            <h3 className="text-xl font-medium mb-2 text-white">导入的账户信息</h3>

            <div className="mb-4">
              <div className="text-gray-300 mb-2">账户名称: <span className="text-white font-medium">{accountName}</span></div>
              <div className="text-gray-300 mb-2">令牌: <span className="text-white font-medium">{token}</span></div>
              <div className="text-gray-300 mb-2">过期时间: <span className="text-white font-medium">{formatExpireTime()}</span></div>
            </div>

            <div className="border border-gray-600 p-3 rounded mb-4">
              <div className="flex justify-between items-center mb-1">
                <div className="text-gray-300">Steam 验证码:</div>
                <div className="text-sm text-gray-400 flex items-center">
                  <div className="mr-2">
                    <input
                      type="checkbox"
                      id="autoRefresh"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="mr-1"
                    />
                    <label htmlFor="autoRefresh">自动刷新</label>
                  </div>
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full ${
                    countdown <= 5 ? 'bg-red-600' : countdown <= 15 ? 'bg-yellow-600' : 'bg-green-600'
                  }`}>
                    {countdown}
                  </div>
                </div>
              </div>
              <div className="text-3xl font-bold text-green-400 text-center">{code}</div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => refreshCode()}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
              >
                手动刷新
              </button>
            </div>
          </div>
        )}

        {/* 结果消息 */}
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-2 text-gray-300">结果:</h3>
          <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap text-gray-300 min-h-[80px]">
            {isLoading ? '处理中...' : resultMessage || '操作结果将显示在这里'}
          </pre>
        </div>

        {/* 返回链接 */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            返回首页
          </Link>
        </div>
      </div>
    </div>
  )
}
