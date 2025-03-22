'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

// 简单类型定义
interface Account {
  id: string;
  accountName: string;
  code?: string;
}

interface AccountWithCode {
  accountId: string;
  code: string;
  validForSeconds?: number;
  validUntil?: number;
}

interface AccountGroup {
  id: string;
  name: string;
  accounts: Account[];
  accountCount: number;
}

interface SavedGroup {
  id: string;
  name: string;
  adminToken: string;
  timestamp: number;
}

interface ValidityInfo {
  validForSeconds: number;
  validUntil: number;
}

export default function AccountsPage() {
  // 基本状态
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isAutoRefresh, setIsAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30); // 默认30秒
  const [countdown, setCountdown] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 创建组状态
  const [groupName, setGroupName] = useState('');
  const [fileContents, setFileContents] = useState<string[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);

  // 管理组状态
  const [savedGroups, setSavedGroups] = useState<SavedGroup[]>([]);
  const [currentGroup, setCurrentGroup] = useState<string>('');
  const [currentToken, setCurrentToken] = useState<string>('');
  const [groupInfo, setGroupInfo] = useState<AccountGroup | null>(null);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [validityInfo, setValidityInfo] = useState<Record<string, ValidityInfo>>({});
  const [globalValidity, setGlobalValidity] = useState<ValidityInfo | null>(null);

  // 文件处理
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setFileContents(prev => [...prev, content]);
        setFileNames(prev => [...prev, file.name]);
      };
      reader.readAsText(file);
    });
  };

  // 删除文件
  const removeFile = (index: number) => {
    setFileContents(prev => prev.filter((_, i) => i !== index));
    setFileNames(prev => prev.filter((_, i) => i !== index));
  };

  // 创建账号组
  const createGroup = async () => {
    if (!groupName) {
      setMessage('请输入组名');
      return;
    }

    if (fileContents.length === 0) {
      setMessage('请至少上传一个 maFile 文件');
      return;
    }

    setIsLoading(true);

    try {
      const accounts = fileContents.map((content, index) => ({
        maFile: content,
        name: fileNames[index].replace('.maFile', '').replace('.json', '')
      }));

      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupName, accounts })
      });

      const data = await response.json();

      if (response.ok) {
        // 保存到本地
        const group = {
          id: data.groupId,
          name: groupName,
          adminToken: data.adminToken,
          timestamp: Date.now()
        };

        const groups = JSON.parse(localStorage.getItem('steamGroups') || '[]');
        groups.push(group);
        localStorage.setItem('steamGroups', JSON.stringify(groups));

        setMessage(`组创建成功! ID: ${data.groupId}`);
        setSavedGroups(groups);

        // 清空表单
        setGroupName('');
        setFileContents([]);
        setFileNames([]);

        // 自动加载
        setCurrentGroup(data.groupId);
        setCurrentToken(data.adminToken);
        await loadGroup(data.groupId, data.adminToken);
      } else {
        setMessage(`创建失败: ${data.error || '未知错误'}`);
      }
    } catch (error) {
      setMessage(`请求错误: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 加载组数据
  const loadGroup = async (id: string, token: string) => {
    if (!id || !token) {
      setMessage('请输入组ID和管理员令牌');
      return;
    }

    // 重置自动刷新
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsAutoRefresh(false);
    setCountdown(0);

    setIsLoading(true);

    try {
      const response = await fetch(`/api/accounts?groupId=${id}&adminToken=${token}`);
      const data = await response.json();

      if (response.ok) {
        setGroupInfo(data);
        setMessage(`加载成功: ${data.name}, 共有 ${data.accountCount} 个账号`);
        await getCodes(id, token);
      } else {
        setMessage(`加载失败: ${data.error || '未知错误'}`);
        setGroupInfo(null);
      }
    } catch (error) {
      setMessage(`请求错误: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 获取验证码
  const getCodes = async (id: string, token: string) => {
    if (!id || !token) return;

    setIsLoading(true);

    try {
      const response = await fetch(`/api/accounts/codes?groupId=${id}&adminToken=${token}`);
      const data = await response.json();

      if (response.ok && data.accounts?.length > 0) {
        const newCodes: Record<string, string> = {};
        const newValidityInfo: Record<string, ValidityInfo> = {};

        data.accounts.forEach((acc: AccountWithCode) => {
          if (acc.code) {
            newCodes[acc.accountId] = acc.code;
            // 如果API返回有效期信息，则保存
            if (acc.validForSeconds && acc.validUntil) {
              newValidityInfo[acc.accountId] = {
                validForSeconds: acc.validForSeconds,
                validUntil: acc.validUntil
              };
            }
          }
        });

        setCodes(newCodes);
        setValidityInfo(newValidityInfo);

        // 保存全局有效期信息（如果提供）
        if (data.validForSeconds && data.validUntil) {
          setGlobalValidity({
            validForSeconds: data.validForSeconds,
            validUntil: data.validUntil
          });
        }

        setMessage(`成功获取验证码: ${Object.keys(newCodes).length} 个账号`);
      } else {
        setMessage(`获取验证码失败: ${data.error || '未知错误'}`);
      }
    } catch (error) {
      setMessage(`请求错误: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 获取单个账号验证码
  const getCodeForAccount = async (accountId: string) => {
    if (!currentGroup || !currentToken) return;

    try {
      const response = await fetch(`/api/accounts/codes?groupId=${currentGroup}&adminToken=${currentToken}&accountId=${accountId}`);
      const data = await response.json();

      if (response.ok && data.code) {
        setCodes(prev => ({ ...prev, [accountId]: data.code }));

        // 保存验证码有效期信息
        if (data.validForSeconds && data.validUntil) {
          setValidityInfo(prev => ({
            ...prev,
            [accountId]: {
              validForSeconds: data.validForSeconds,
              validUntil: data.validUntil
            }
          }));
        }
      } else {
        setMessage(`获取验证码失败: ${data.error || '未知错误'}`);
      }
    } catch (error) {
      setMessage(`请求错误: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // 删除保存的组
  const deleteGroup = (id: string) => {
    const groups = savedGroups.filter(g => g.id !== id);
    setSavedGroups(groups);
    localStorage.setItem('steamGroups', JSON.stringify(groups));

    if (id === currentGroup) {
      // 重置自动刷新
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsAutoRefresh(false);
      setCountdown(0);

      setCurrentGroup('');
      setCurrentToken('');
      setGroupInfo(null);
      setCodes({});
    }
  };

  // 切换自动刷新
  const toggleAutoRefresh = () => {
    if (isAutoRefresh) {
      // 停止自动刷新
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsAutoRefresh(false);
      setCountdown(0);
    } else {
      // 立即刷新一次
      getCodes(currentGroup, currentToken);
      // 启动自动刷新
      startAutoRefresh();
      setIsAutoRefresh(true);
    }
  };

  // 启动自动刷新
  const startAutoRefresh = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // 计算所有账号验证码的最短剩余有效期（秒）
    const calculateMinRemainingTime = () => {
      const now = Date.now();
      let minTime = refreshInterval; // 默认刷新间隔

      // 如果有全局有效期信息
      if (globalValidity && globalValidity.validUntil) {
        const remaining = Math.max(0, Math.floor((globalValidity.validUntil - now) / 1000));
        minTime = Math.min(minTime, remaining);
      }

      // 检查所有账号的有效期
      Object.values(validityInfo).forEach(info => {
        if (info && info.validUntil) {
          const remaining = Math.max(0, Math.floor((info.validUntil - now) / 1000));
          minTime = Math.min(minTime, remaining);
        }
      });

      // 提前5秒刷新，确保验证码始终有效
      return Math.max(1, minTime - 5);
    };

    // 初始设置倒计时
    const initialCountdown = calculateMinRemainingTime();
    setCountdown(initialCountdown);

    // 每秒更新倒计时
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // 倒计时结束时获取验证码
          getCodes(currentGroup, currentToken);
          // 重新计算下次刷新时间
          return calculateMinRemainingTime();
        }
        return prev - 1;
      });
    }, 1000);

    intervalRef.current = countdownInterval;
  };

  // 更改刷新间隔
  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newInterval = parseInt(e.target.value);
    if (newInterval >= 5) { // 最小5秒
      setRefreshInterval(newInterval);
      if (isAutoRefresh) {
        setCountdown(newInterval);
        // 重新启动自动刷新
        startAutoRefresh();
      }
    }
  };

  // 组件卸载时清除定时器
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // 加载已保存的组
  useEffect(() => {
    try {
      const groups = JSON.parse(localStorage.getItem('steamGroups') || '[]');
      setSavedGroups(groups);
    } catch (error) {
      console.error('Error loading saved groups:', error);
    }
  }, []);

  // 高级自动刷新（确保验证码永远有效）
  const useAdvancedRefresh = () => {
    // 使用useRef来保存当前值，避免添加依赖项
    const currentGroupRef = useRef(currentGroup);
    const currentTokenRef = useRef(currentToken);
    const isAutoRefreshRef = useRef(isAutoRefresh);
    const globalValidityRef = useRef(globalValidity);
    const validityInfoRef = useRef(validityInfo);

    // 更新refs
    useEffect(() => {
      currentGroupRef.current = currentGroup;
      currentTokenRef.current = currentToken;
      isAutoRefreshRef.current = isAutoRefresh;
      globalValidityRef.current = globalValidity;
      validityInfoRef.current = validityInfo;
    }, [currentGroup, currentToken, isAutoRefresh, globalValidity, validityInfo]);

    useEffect(() => {
      if (!isAutoRefresh || !currentGroup || !currentToken) return;

      // 首先获取一次验证码
      getCodes(currentGroup, currentToken);

      // 使用更智能的刷新策略，基于验证码有效期自动刷新
      const smartRefreshInterval = setInterval(() => {
        // 使用ref获取最新值
        const currentGroup = currentGroupRef.current;
        const currentToken = currentTokenRef.current;
        const isAutoRefresh = isAutoRefreshRef.current;
        const globalValidity = globalValidityRef.current;
        const validityInfo = validityInfoRef.current;

        if (!isAutoRefresh || !currentGroup || !currentToken) return;

        const now = Date.now();
        let shouldRefresh = false;

        // 如果有全局有效期，检查是否需要刷新
        if (globalValidity && globalValidity.validUntil) {
          // 如果验证码有效期不足10秒，则刷新
          const remaining = Math.max(0, (globalValidity.validUntil - now) / 1000);
          if (remaining < 10) {
            shouldRefresh = true;
          }
        } else {
          // 如果没有全局有效期信息，检查各账号的有效期
          let minRemaining = 30; // 默认30秒

          Object.values(validityInfo || {}).forEach(info => {
            if (info && info.validUntil) {
              const remaining = Math.max(0, (info.validUntil - now) / 1000);
              minRemaining = Math.min(minRemaining, remaining);
            }
          });

          // 如果任何验证码剩余不足10秒，刷新
          if (minRemaining < 10) {
            shouldRefresh = true;
          }
        }

        if (shouldRefresh) {
          getCodes(currentGroup, currentToken);
        }
      }, 3000); // 每3秒检查一次有效期

      return () => {
        clearInterval(smartRefreshInterval);
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAutoRefresh]); // 仅当自动刷新状态改变时重新设置
  };

  // 启用高级自动刷新
  useAdvancedRefresh();

  return (
    <div className="flex min-h-screen flex-col items-center p-4 md:p-24 bg-gray-900">
      <div className="w-full max-w-4xl bg-gray-800 p-6 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-6 text-center text-white">Steam 账号管理</h1>

        {/* 创建组 */}
        <div className="mb-8 border-b border-gray-700 pb-8">
          <h2 className="text-xl font-semibold mb-4 text-white">创建账号组</h2>

          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-300">
              组名称
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="bg-gray-700 text-white text-sm rounded-lg block w-full p-2.5"
              placeholder="例如: 我的Steam账号"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-300">
              上传 maFile 文件 (可多选)
            </label>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              accept=".maFile,application/json,.json"
              className="bg-gray-700 text-white text-sm rounded-lg block w-full p-2.5"
            />
          </div>

          {fileNames.length > 0 && (
            <div className="mt-2 mb-4">
              <h4 className="text-sm font-medium text-gray-300 mb-1">已上传文件:</h4>
              <ul className="bg-gray-700 rounded-lg p-2">
                {fileNames.map((name, index) => (
                  <li key={index} className="flex justify-between items-center text-white mb-1">
                    <span className="truncate">{name}</span>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-400 hover:text-red-300 ml-2"
                    >
                      移除
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={createGroup}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
            >
              创建账号组
            </button>
          </div>
        </div>

        {/* 管理组 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-white">管理账号组</h2>

          {/* 已保存的组 */}
          {savedGroups.length > 0 && (
            <div className="mb-6">
              <h3 className="text-md font-medium text-white mb-2">已保存的账号组:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {savedGroups.map((group) => (
                  <div key={group.id} className="bg-gray-700 p-3 rounded-lg">
                    <div className="flex justify-between">
                      <span className="text-white font-medium">{group.name}</span>
                      <button
                        onClick={() => deleteGroup(group.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        删除
                      </button>
                    </div>
                    <div className="text-gray-400 text-sm mt-1 truncate">ID: {group.id}</div>
                    <div className="mt-2">
                      <button
                        onClick={() => {
                          setCurrentGroup(group.id);
                          setCurrentToken(group.adminToken);
                          loadGroup(group.id, group.adminToken);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-1 px-2 rounded"
                      >
                        加载
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 手动输入 */}
          <div>
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-300">
                组ID
              </label>
              <input
                type="text"
                value={currentGroup}
                onChange={(e) => setCurrentGroup(e.target.value)}
                className="bg-gray-700 text-white text-sm rounded-lg block w-full p-2.5"
                placeholder="输入组ID"
              />
            </div>

            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-300">
                管理员令牌
              </label>
              <input
                type="text"
                value={currentToken}
                onChange={(e) => setCurrentToken(e.target.value)}
                className="bg-gray-700 text-white text-sm rounded-lg block w-full p-2.5"
                placeholder="输入管理员令牌"
              />
            </div>

            <div className="flex justify-end mb-6">
              <button
                onClick={() => loadGroup(currentGroup, currentToken)}
                disabled={isLoading || !currentGroup || !currentToken}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
              >
                获取账号组
              </button>
            </div>
          </div>
        </div>

        {/* 账号列表 */}
        {groupInfo && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">账号列表: {groupInfo.name}</h2>
              <div className="flex items-center space-x-3">
                <div className="flex items-center">
                  <input
                    type="number"
                    min="5"
                    value={refreshInterval}
                    onChange={handleIntervalChange}
                    className="bg-gray-700 text-white text-sm rounded-lg w-16 p-1 mr-2"
                  />
                  <span className="text-gray-300 text-sm">秒</span>
                </div>

                <div className="flex items-center">
                  <button
                    onClick={toggleAutoRefresh}
                    className={`${
                      isAutoRefresh ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                    } text-white font-medium py-1 px-3 rounded-lg text-sm flex items-center`}
                  >
                    {isAutoRefresh ? (
                      <>
                        停止自动刷新
                        <span className="ml-1 bg-gray-800 text-white rounded px-1 text-xs flex items-center">
                          {countdown}s
                          {globalValidity && (
                            <span className="ml-1 text-green-400 text-2xs">
                              ({globalValidity.validForSeconds}s)
                            </span>
                          )}
                        </span>
                      </>
                    ) : '自动刷新'}
                  </button>
                </div>

                <button
                  onClick={() => getCodes(currentGroup, currentToken)}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-3 rounded-lg text-sm"
                >
                  立即刷新
                </button>
              </div>
            </div>

            <div className="bg-gray-700 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-600">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">账号名称</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">验证码</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-600">
                  {groupInfo.accounts.map((account) => (
                    <tr key={account.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {account.accountName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-xl font-bold text-green-400">{codes[account.id] || '-'}</span>
                          {codes[account.id] && validityInfo[account.id] && (
                            <div className="mt-1">
                              <div className="flex items-center">
                                <span className="text-xs text-gray-400 mr-2">
                                  有效期: {validityInfo[account.id].validForSeconds}秒
                                </span>
                                <div className="w-20 bg-gray-600 h-1 rounded-full overflow-hidden">
                                  <div
                                    className="bg-green-500 h-1"
                                    style={{
                                      width: `${(validityInfo[account.id].validForSeconds / 30) * 100}%`,
                                      transition: 'width 1s linear'
                                    }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          )}
                          {!codes[account.id] && (
                            <button
                              onClick={() => getCodeForAccount(account.id)}
                              className="text-xs text-blue-400 hover:text-blue-300"
                            >
                              获取
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <button
                          onClick={() => {
                            if (codes[account.id]) {
                              navigator.clipboard.writeText(codes[account.id]);
                              setMessage(`已复制验证码: ${codes[account.id]}`);
                            }
                          }}
                          className="text-blue-400 hover:text-blue-300"
                          disabled={!codes[account.id]}
                        >
                          复制
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {groupInfo.accounts.length === 0 && (
              <div className="text-center py-4 text-gray-400">
                账号组中没有账号，请添加账号。
              </div>
            )}
          </div>
        )}

        {/* 租号平台集成指南 */}
        {groupInfo && (
          <div className="mb-8 bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-white">租号平台集成指南</h2>

            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2 text-gray-300">API端点</h3>
              <div className="bg-gray-900 p-3 rounded-lg text-sm text-green-400 font-mono break-all overflow-x-auto">
                {window.location.origin}/api/accounts/codes/platform?groupId={currentGroup}&adminToken={currentToken}
              </div>
              <p className="mt-2 text-gray-400 text-sm">
                此API专为租号平台设计，返回实时验证码及其有效期信息，支持JSON格式响应。
              </p>
            </div>

            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2 text-gray-300">集成建议</h3>
              <ul className="list-disc pl-5 text-gray-400 space-y-2">
                <li>每15秒查询一次API，确保验证码始终处于有效期内</li>
                <li>监控<code className="bg-gray-800 px-1 rounded text-xs">validForSeconds</code>字段，当低于10秒时主动刷新</li>
                <li>显示验证码剩余有效期，提示用户及时使用</li>
                <li>实现客户端倒计时，当验证码即将过期时自动刷新</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2 text-gray-300">示例代码</h3>
              <pre className="bg-gray-900 p-3 rounded-lg text-sm text-gray-400 font-mono overflow-x-auto">
{`// 获取实时验证码
async function getSteamCodes(groupId, token) {
  try {
    const response = await fetch(
      \`${window.location.origin}/api/accounts/codes/platform?groupId=\${groupId}&adminToken=\${token}\`
    );
    const data = await response.json();

    if (data.status === 'success') {
      // 更新UI显示验证码
      updateCodesDisplay(data.accounts);

      // 设置自动刷新计时器
      const refreshTime = Math.min(data.validForSeconds - 5, 15);
      setTimeout(() => getSteamCodes(groupId, token), refreshTime * 1000);
    }
  } catch (error) {
    console.error('获取验证码失败:', error);
    // 出错后5秒重试
    setTimeout(() => getSteamCodes(groupId, token), 5000);
  }
}`}
              </pre>
            </div>
          </div>
        )}

        {/* 状态消息 */}
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2 text-gray-300">状态:</h3>
          <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap text-gray-300 min-h-[80px]">
            {isLoading ? '处理中...' : message || '准备就绪'}
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
  );
}
