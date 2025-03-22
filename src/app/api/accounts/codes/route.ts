import { NextRequest, NextResponse } from 'next/server';
import { SteamUtils } from '@/lib/steam-utils';
import store from '../store';

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

// 获取账号组中所有账号的TOTP验证码
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const groupId = url.searchParams.get('groupId');
    const adminToken = url.searchParams.get('adminToken');
    const accountId = url.searchParams.get('accountId'); // 可选，只获取特定账号的验证码

    console.log(`GET /api/accounts/codes called with groupId=${groupId}, accountId=${accountId || 'none'}`);

    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // 使用存储API获取账号组
    const group = store.getAccountGroup(groupId);
    console.log('Account group found:', group ? 'yes' : 'no');

    if (!group) {
      return NextResponse.json(
        { error: 'Account group not found' },
        { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // 验证管理员令牌
    if (adminToken !== group.adminToken) {
      console.log('Admin token mismatch:', { provided: adminToken, expected: group.adminToken });
      return NextResponse.json(
        { error: 'Invalid admin token' },
        { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const now = Date.now();

    // 如果指定了账号ID，只返回该账号的验证码
    if (accountId) {
      const account = group.accounts.find(acc => acc.id === accountId);
      console.log(`Looking for account with ID ${accountId}:`, account ? 'found' : 'not found');

      if (!account) {
        return NextResponse.json(
          { error: 'Account not found in the group' },
          { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } }
        );
      }

      try {
        // 检查密钥是否存在
        if (!account.data.shared_secret) {
          console.error('Account has no shared_secret:', account.accountName);
          return NextResponse.json(
            { error: 'Account has no shared_secret' },
            { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
          );
        }

        console.log(`Generating code for account ${account.accountName} using secret: ${account.data.shared_secret.substring(0, 5)}...`);

        // 生成验证码
        const code = SteamUtils.generateAuthCode(account.data.shared_secret || '');
        console.log(`Generated code for ${account.accountName}:`, code);

        // 更新最后使用时间
        account.lastUsed = now;
        // 保存更新的数据
        store.saveAccountsToFile();

        return NextResponse.json(
          {
            accountId: account.id,
            accountName: account.accountName,
            code,
            timestamp: now,
            validUntil: now + 30000, // 验证码有效期约为30秒
          },
          { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } }
        );
      } catch (error) {
        console.error(`Error generating code for account ${account.id}:`, error);
        return NextResponse.json(
          {
            error: 'Failed to generate authentication code',
            details: error instanceof Error ? error.message : String(error)
          },
          { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
        );
      }
    }

    // 否则，返回所有账号的验证码
    const results = [];
    let dataUpdated = false;

    console.log(`Processing ${group.accounts.length} accounts for group ${group.name}`);

    for (const account of group.accounts) {
      try {
        if (!account.data.shared_secret) {
          console.error(`Account ${account.accountName} has no shared_secret`);
          results.push({
            accountId: account.id,
            accountName: account.accountName,
            error: 'No shared_secret available',
          });
          continue;
        }

        console.log(`Generating code for account ${account.accountName} using secret: ${account.data.shared_secret.substring(0, 5)}...`);

        // 生成验证码
        const code = SteamUtils.generateAuthCode(account.data.shared_secret || '');
        console.log(`Generated code for ${account.accountName}:`, code);

        // 更新最后使用时间
        account.lastUsed = now;
        dataUpdated = true;

        results.push({
          accountId: account.id,
          accountName: account.accountName,
          steamId: account.steamId,
          code,
          timestamp: now,
          validUntil: now + 30000, // 验证码有效期约为30秒
        });
      } catch (error) {
        console.error(`Error generating code for account ${account.id}:`, error);
        results.push({
          accountId: account.id,
          accountName: account.accountName,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // 如果数据有更新，保存到文件
    if (dataUpdated) {
      store.saveAccountsToFile();
    }

    return NextResponse.json(
      {
        groupId,
        groupName: group.name,
        timestamp: now,
        accounts: results,
      },
      { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (error) {
    console.error('Error generating authentication codes:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate authentication codes',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
