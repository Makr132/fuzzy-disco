'use client'

import { useState } from "react"
import Link from "next/link"

export default function DemoPage() {
  const [sharedSecret, setSharedSecret] = useState("")
  const [identitySecret, setIdentitySecret] = useState("")
  const [steamId, setSteamId] = useState("")
  const [tag, setTag] = useState("conf")

  const [token, setToken] = useState("")
  const [resultMessage, setResultMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("direct") // "direct" or "token"

  // 直接请求TOTP码
  const getAuthCode = async () => {
    if (!sharedSecret) {
      setResultMessage("请输入共享密钥")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/totp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shared_secret: sharedSecret }),
      })

      const data = await response.json()
      if (response.ok) {
        setResultMessage(`生成的TOTP码: ${data.code}`)
      } else {
        setResultMessage(`错误: ${data.error}`)
      }
    } catch (error) {
      setResultMessage(`请求错误: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  // 获取交易确认密钥
  const getConfirmationKey = async () => {
    if (!identitySecret) {
      setResultMessage("请输入身份密钥")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/steam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate_confirmation_key',
          identity_secret: identitySecret,
          tag,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setResultMessage(`确认密钥: ${data.confirmation_key}\n时间戳: ${data.time}`)
      } else {
        setResultMessage(`错误: ${data.error}`)
      }
    } catch (error) {
      setResultMessage(`请求错误: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  // 获取设备ID
  const getDeviceId = async () => {
    if (!steamId) {
      setResultMessage("请输入SteamID")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/steam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate_device_id',
          steamid: steamId,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setResultMessage(`设备ID: ${data.device_id}`)
      } else {
        setResultMessage(`错误: ${data.error}`)
      }
    } catch (error) {
      setResultMessage(`请求错误: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  // 使用令牌API部分
  const registerSecrets = async () => {
    if (!sharedSecret) {
      setResultMessage("请至少输入共享密钥")
      return
    }

    setIsLoading(true)
    try {
      // 准备请求体，只包含有值的字段
      const requestBody: Record<string, string> = {}
      if (sharedSecret) requestBody.shared_secret = sharedSecret
      if (identitySecret) requestBody.identity_secret = identitySecret
      if (steamId) requestBody.steamid = steamId

      const response = await fetch('/api/auth/steam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()
      if (response.ok) {
        setToken(data.token)
        setResultMessage(`令牌已创建: ${data.token}\n过期时间: ${new Date(data.expires_at).toLocaleString()}`)
      } else {
        setResultMessage(`错误: ${data.error}`)
      }
    } catch (error) {
      setResultMessage(`请求错误: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  // 使用令牌获取认证码
  const getAuthCodeWithToken = async () => {
    if (!token) {
      setResultMessage("请先创建令牌或输入现有令牌")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/auth/steam?token=${token}&action=code`, {
        method: 'GET',
      })

      const data = await response.json()
      if (response.ok) {
        setResultMessage(`生成的TOTP码: ${data.code}`)
      } else {
        setResultMessage(`错误: ${data.error}`)
      }
    } catch (error) {
      setResultMessage(`请求错误: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  // 使用令牌获取确认密钥
  const getConfirmationKeyWithToken = async () => {
    if (!token) {
      setResultMessage("请先创建令牌或输入现有令牌")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/auth/steam?token=${token}&action=confirmation_key&tag=${tag}`, {
        method: 'GET',
      })

      const data = await response.json()
      if (response.ok) {
        setResultMessage(`确认密钥: ${data.confirmation_key}\n时间戳: ${data.time}`)
      } else {
        setResultMessage(`错误: ${data.error}`)
      }
    } catch (error) {
      setResultMessage(`请求错误: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  // 使用令牌获取令牌信息
  const getTokenInfo = async () => {
    if (!token) {
      setResultMessage("请先创建令牌或输入现有令牌")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/auth/steam?token=${token}&action=info`, {
        method: 'GET',
      })

      const data = await response.json()
      if (response.ok) {
        setResultMessage(JSON.stringify(data, null, 2))
      } else {
        setResultMessage(`错误: ${data.error}`)
      }
    } catch (error) {
      setResultMessage(`请求错误: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  // 删除令牌
  const deleteToken = async () => {
    if (!token) {
      setResultMessage("请先创建令牌或输入现有令牌")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/auth/steam?token=${token}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      if (response.ok) {
        setToken("")
        setResultMessage("令牌已成功删除")
      } else {
        setResultMessage(`错误: ${data.error}`)
      }
    } catch (error) {
      setResultMessage(`请求错误: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center p-4 md:p-24 bg-gray-900">
      <div className="w-full max-w-3xl bg-gray-800 p-6 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-6 text-center text-white">Steam TOTP API 演示</h1>

        {/* 选项卡 */}
        <div className="flex mb-6 border-b border-gray-700">
          <button
            className={`px-4 py-2 ${activeTab === 'direct' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-400'}`}
            onClick={() => setActiveTab('direct')}
          >
            直接请求
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'token' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-400'}`}
            onClick={() => setActiveTab('token')}
          >
            令牌方式
          </button>
        </div>

        {/* 直接请求界面 */}
        {activeTab === 'direct' && (
          <div>
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-300">
                共享密钥 (shared_secret)
              </label>
              <input
                type="text"
                value={sharedSecret}
                onChange={(e) => setSharedSecret(e.target.value)}
                className="bg-gray-700 text-white text-sm rounded-lg block w-full p-2.5"
                placeholder="例如: cnOgv/KdpLoP6Nbh0GMkXkPXALQ="
              />
            </div>

            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-300">
                身份密钥 (identity_secret)
              </label>
              <input
                type="text"
                value={identitySecret}
                onChange={(e) => setIdentitySecret(e.target.value)}
                className="bg-gray-700 text-white text-sm rounded-lg block w-full p-2.5"
                placeholder="例如: ZwvUZ8m/HIqyeVNzM1bUi4v6WEI="
              />
            </div>

            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-300">
                SteamID
              </label>
              <input
                type="text"
                value={steamId}
                onChange={(e) => setSteamId(e.target.value)}
                className="bg-gray-700 text-white text-sm rounded-lg block w-full p-2.5"
                placeholder="例如: 76561198123456789"
              />
            </div>

            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-300">
                标签 (tag)
              </label>
              <select
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="bg-gray-700 text-white text-sm rounded-lg block w-full p-2.5"
              >
                <option value="conf">conf (加载确认页)</option>
                <option value="details">details (加载详情)</option>
                <option value="allow">allow (确认交易)</option>
                <option value="cancel">cancel (取消交易)</option>
              </select>
            </div>

            <div className="flex space-x-2 mb-6">
              <button
                onClick={getAuthCode}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
              >
                获取认证码
              </button>
              <button
                onClick={getConfirmationKey}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
              >
                获取确认密钥
              </button>
              <button
                onClick={getDeviceId}
                disabled={isLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
              >
                获取设备ID
              </button>
            </div>
          </div>
        )}

        {/* 令牌方式界面 */}
        {activeTab === 'token' && (
          <div>
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-300">
                共享密钥 (shared_secret)
              </label>
              <input
                type="text"
                value={sharedSecret}
                onChange={(e) => setSharedSecret(e.target.value)}
                className="bg-gray-700 text-white text-sm rounded-lg block w-full p-2.5"
                placeholder="例如: cnOgv/KdpLoP6Nbh0GMkXkPXALQ="
              />
              <p className="text-xs text-gray-400 mt-1">用于创建新令牌</p>
            </div>

            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-300">
                身份密钥 (identity_secret) - 可选
              </label>
              <input
                type="text"
                value={identitySecret}
                onChange={(e) => setIdentitySecret(e.target.value)}
                className="bg-gray-700 text-white text-sm rounded-lg block w-full p-2.5"
                placeholder="例如: ZwvUZ8m/HIqyeVNzM1bUi4v6WEI="
              />
            </div>

            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-300">
                SteamID - 可选
              </label>
              <input
                type="text"
                value={steamId}
                onChange={(e) => setSteamId(e.target.value)}
                className="bg-gray-700 text-white text-sm rounded-lg block w-full p-2.5"
                placeholder="例如: 76561198123456789"
              />
            </div>

            <div className="mb-6">
              <button
                onClick={registerSecrets}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
              >
                创建令牌
              </button>
            </div>

            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-300">
                令牌 (Token)
              </label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="bg-gray-700 text-white text-sm rounded-lg block w-full p-2.5"
                placeholder="输入或从上方生成令牌"
              />
            </div>

            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-300">
                标签 (tag) - 用于确认密钥
              </label>
              <select
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="bg-gray-700 text-white text-sm rounded-lg block w-full p-2.5"
              >
                <option value="conf">conf (加载确认页)</option>
                <option value="details">details (加载详情)</option>
                <option value="allow">allow (确认交易)</option>
                <option value="cancel">cancel (取消交易)</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={getAuthCodeWithToken}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
              >
                获取认证码
              </button>
              <button
                onClick={getConfirmationKeyWithToken}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
              >
                获取确认密钥
              </button>
              <button
                onClick={getTokenInfo}
                disabled={isLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
              >
                获取令牌信息
              </button>
              <button
                onClick={deleteToken}
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
              >
                删除令牌
              </button>
            </div>
          </div>
        )}

        {/* 结果显示区域 */}
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-2 text-gray-300">结果:</h3>
          <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap text-gray-300 min-h-[100px]">
            {isLoading ? '加载中...' : resultMessage || '操作结果将显示在这里'}
          </pre>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            返回首页
          </Link>
        </div>
      </div>
    </div>
  )
}
