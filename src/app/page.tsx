import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-6">Steam TOTP API</h1>
        <p className="mb-4">这是一个用于生成Steam二步验证码和确认码的API服务。</p>

        <div className="flex flex-wrap gap-4 mb-8">
          <Link
            href="/demo"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            查看API演示
          </Link>
          <Link
            href="/import"
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            导入 maFile
          </Link>
          <Link
            href="/accounts"
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            多账号管理
          </Link>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-2xl font-semibold mb-4">可用API端点</h2>

          <div className="mb-4">
            <h3 className="text-xl font-medium mb-2">1. 基本TOTP码生成</h3>
            <code className="block bg-gray-900 p-2 rounded">POST /api/totp</code>
            <p className="mt-2">请求体:</p>
            <pre className="bg-gray-900 p-2 rounded">
              {`{
  "shared_secret": "你的Steam共享密钥"
}`}
            </pre>
          </div>

          <div className="mb-4">
            <h3 className="text-xl font-medium mb-2">2. 多功能API</h3>
            <code className="block bg-gray-900 p-2 rounded">POST /api/steam</code>
            <p className="mt-2">请求体:</p>
            <pre className="bg-gray-900 p-2 rounded">
              {`{
  "action": "generate_auth_code",
  "shared_secret": "你的Steam共享密钥",
  "time_offset": 0
}`}
            </pre>
            <p className="mt-2">支持的action值:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><code>generate_auth_code</code> - 生成TOTP认证码</li>
              <li><code>generate_confirmation_key</code> - 生成交易确认密钥</li>
              <li><code>generate_device_id</code> - 生成设备ID</li>
              <li><code>get_time_offset</code> - 获取Steam时间偏移量</li>
            </ul>
          </div>

          <div className="mb-4">
            <h3 className="text-xl font-medium mb-2">3. 安全认证API</h3>
            <p>存储认证信息并使用令牌访问:</p>
            <code className="block bg-gray-900 p-2 rounded">POST /api/auth/steam</code>
            <p className="mt-2">请求体:</p>
            <pre className="bg-gray-900 p-2 rounded">
              {`{
  "shared_secret": "你的Steam共享密钥",
  "identity_secret": "你的身份密钥",
  "steamid": "你的SteamID"
}`}
            </pre>

            <p className="mt-2">获取认证码:</p>
            <code className="block bg-gray-900 p-2 rounded">GET /api/auth/steam?token=您的令牌&action=code</code>

            <p className="mt-2">支持的action值:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><code>code</code> - 获取TOTP认证码</li>
              <li><code>confirmation_key</code> - 获取交易确认密钥</li>
              <li><code>device_id</code> - 获取设备ID</li>
              <li><code>info</code> - 获取令牌信息</li>
            </ul>

            <p className="mt-2">删除令牌:</p>
            <code className="block bg-gray-900 p-2 rounded">DELETE /api/auth/steam?token=您的令牌</code>
          </div>

          <div className="mb-4">
            <h3 className="text-xl font-medium mb-2">4. 导入 maFile</h3>
            <p>直接导入 Steam maFile 文件:</p>
            <code className="block bg-gray-900 p-2 rounded">POST /api/auth/import</code>
            <p className="mt-2">请求体:</p>
            <pre className="bg-gray-900 p-2 rounded">
              {`{
  "maFile": "完整的maFile内容（JSON字符串）"
}`}
            </pre>

            <p className="mt-2">获取验证码:</p>
            <code className="block bg-gray-900 p-2 rounded">GET /api/auth/import?token=您的令牌</code>
          </div>

          <div className="mb-4">
            <h3 className="text-xl font-medium mb-2">5. 多账号管理API</h3>
            <p>创建账号组:</p>
            <code className="block bg-gray-900 p-2 rounded">POST /api/accounts</code>
            <p className="mt-2">请求体:</p>
            <pre className="bg-gray-900 p-2 rounded">
              {`{
  "name": "账号组名称",
  "accounts": [
    { "maFile": "maFile内容（JSON字符串）" },
    // 更多账号...
  ]
}`}
            </pre>

            <p className="mt-2">获取账号组信息:</p>
            <code className="block bg-gray-900 p-2 rounded">GET /api/accounts?groupId=组ID&adminToken=管理员令牌</code>

            <p className="mt-2">获取所有账号的验证码:</p>
            <code className="block bg-gray-900 p-2 rounded">GET /api/accounts/codes?groupId=组ID&adminToken=管理员令牌</code>

            <p className="mt-2">获取单个账号的验证码:</p>
            <code className="block bg-gray-900 p-2 rounded">GET /api/accounts/codes?groupId=组ID&adminToken=管理员令牌&accountId=账号ID</code>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-4">安全提示</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>永远不要在不受信任的服务上共享您的Steam密钥</li>
            <li>所有密钥信息都以加密形式存储，并且只在服务器内存中临时保存</li>
            <li>API请求应该通过HTTPS进行以确保数据传输安全</li>
            <li>如果担心安全问题，请考虑自行部署此API服务</li>
          </ul>
        </div>
      </div>
    </main>
  )
}
