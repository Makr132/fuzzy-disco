import { NextRequest, NextResponse } from 'next/server';
import { SteamUtils } from '@/lib/steam-utils';
import store from '../../store';

// CORS配置
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

/**
 * 供租号平台使用的专用API端点
 * 提供实时验证码与有效期信息，针对集成场景进行了优化
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const groupId = url.searchParams.get('groupId');
    const adminToken = url.searchParams.get('adminToken');
    const accountId = url.searchParams.get('accountId');

    // 记录API调用
    console.log(`PLATFORM API: 获取验证码 - groupId=${groupId}, accountId=${accountId || '所有'}`);

    if (!groupId) {
      return NextResponse.json(
        { error: '缺少群组ID参数', code: 'MISSING_GROUP_ID' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // 获取账号组
    const group = store.getAccountGroup(groupId);

    if (!group) {
      return NextResponse.json(
        { error: '账号组不存在', code: 'GROUP_NOT_FOUND' },
        { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // 验证管理员令牌
    if (adminToken !== group.adminToken) {
      return NextResponse.json(
        { error: '管理员令牌无效', code: 'INVALID_TOKEN' },
        { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const now = Date.now();

    // 计算Steam验证码的有效期
    // Steam验证码每30秒更新一次，我们计算当前码的剩余有效期
    const steamTimeInSeconds = Math.floor(now / 1000);
    const currentPeriod = Math.floor(steamTimeInSeconds / 30);
    const nextPeriod = (currentPeriod + 1) * 30;
    const remainingSeconds = nextPeriod - steamTimeInSeconds;
    const validUntil = now + (remainingSeconds * 1000);

    // 如果指定了单个账号ID
    if (accountId) {
      const account = group.accounts.find(acc => acc.id === accountId);

      if (!account) {
        return NextResponse.json(
          { error: '账号不存在', code: 'ACCOUNT_NOT_FOUND' },
          { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } }
        );
      }

      try {
        if (!account.data.shared_secret) {
          console.error(`账号 ${account.accountName} 缺少shared_secret`);
          return NextResponse.json(
            { error: '账号缺少验证密钥', code: 'MISSING_SECRET' },
            { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
          );
        }

        // 生成验证码
        const code = SteamUtils.generateAuthCode(account.data.shared_secret);

        // 更新使用时间
        account.lastUsed = now;
        store.saveAccountsToFile();

        return NextResponse.json(
          {
            accountId: account.id,
            accountName: account.accountName,
            steamId: account.steamId,
            code: code,
            validForSeconds: remainingSeconds,
            validUntil: validUntil,
            timestamp: now,
            status: 'success'
          },
          { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } }
        );
      } catch (error) {
        console.error(`为账号 ${account.id} 生成验证码时出错:`, error);
        return NextResponse.json(
          {
            error: '生成验证码失败',
            details: error instanceof Error ? error.message : String(error),
            code: 'GENERATE_ERROR'
          },
          { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
        );
      }
    }

    // 返回所有账号的验证码
    const results = [];
    let dataUpdated = false;

    for (const account of group.accounts) {
      try {
        if (!account.data.shared_secret) {
          results.push({
            accountId: account.id,
            accountName: account.accountName,
            steamId: account.steamId,
            error: '缺少验证密钥',
            code: null,
            status: 'error'
          });
          continue;
        }

        // 生成验证码
        const code = SteamUtils.generateAuthCode(account.data.shared_secret);

        // 更新使用时间
        account.lastUsed = now;
        dataUpdated = true;

        results.push({
          accountId: account.id,
          accountName: account.accountName,
          steamId: account.steamId,
          code: code,
          validForSeconds: remainingSeconds,
          validUntil: validUntil,
          timestamp: now,
          status: 'success'
        });
      } catch (error) {
        results.push({
          accountId: account.id,
          accountName: account.accountName,
          steamId: account.steamId,
          error: error instanceof Error ? error.message : String(error),
          code: null,
          status: 'error'
        });
      }
    }

    // 如果有更新，保存数据
    if (dataUpdated) {
      store.saveAccountsToFile();
    }

    return NextResponse.json(
      {
        groupId,
        groupName: group.name,
        timestamp: now,
        validForSeconds: remainingSeconds,
        validUntil: validUntil,
        accounts: results,
        status: 'success'
      },
      { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (error) {
    console.error('获取验证码时发生错误:', error);
    return NextResponse.json(
      {
        error: '获取验证码失败',
        details: error instanceof Error ? error.message : String(error),
        code: 'SERVER_ERROR',
        status: 'error'
      },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
