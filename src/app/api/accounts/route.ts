import { NextRequest, NextResponse } from 'next/server';
import { SteamUtils, SteamMaFile } from '@/lib/steam-utils';
import crypto from 'crypto';
import store, { Account, AccountGroup } from './store';

// 生成随机ID
function generateId(length: number = 12): string {
  return crypto.randomBytes(length).toString('hex');
}

// 生成安全的管理员令牌
function generateAdminToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// CORS配置
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// 创建账号组
export async function POST(request: NextRequest) {
  try {
    const { name, accounts } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const groupId = generateId();
    const adminToken = generateAdminToken();
    const now = Date.now();

    // 创建新账号组
    const newGroup: AccountGroup = {
      id: groupId,
      name,
      accounts: [],
      adminToken,
      createdAt: now,
    };

    // 如果提供了账号列表，添加它们
    if (Array.isArray(accounts) && accounts.length > 0) {
      for (const accountData of accounts) {
        try {
          let maFileData: SteamMaFile;

          // 检查是直接提供maFile还是单独的字段
          if (accountData.maFile) {
            if (typeof accountData.maFile === 'string') {
              maFileData = SteamUtils.parseMaFile(accountData.maFile);
            } else {
              maFileData = accountData.maFile as SteamMaFile;
            }
          } else if (accountData.shared_secret) {
            // 从基本字段构建maFile对象
            maFileData = {
              shared_secret: accountData.shared_secret,
              identity_secret: accountData.identity_secret,
              account_name: accountData.account_name || accountData.username,
              steamid: accountData.steamid,
              device_id: accountData.device_id,
            };
          } else {
            continue; // 跳过无效账号
          }

          // 验证maFile数据
          if (!SteamUtils.validateMaFile(maFileData)) {
            continue; // 跳过无效的maFile
          }

          // 创建账号对象
          const account: Account = {
            id: generateId(),
            accountName: maFileData.account_name || accountData.name || `Account ${newGroup.accounts.length + 1}`,
            steamId: maFileData.steamid,
            data: maFileData,
            lastUsed: now,
            addedAt: now,
          };

          newGroup.accounts.push(account);
        } catch (error) {
          console.error('Error adding account:', error);
          // 继续处理下一个账号
        }
      }
    }

    // 保存账号组到存储
    store.addAccountGroup(newGroup);

    return NextResponse.json(
      {
        groupId,
        adminToken,
        accountCount: newGroup.accounts.length,
        message: 'Account group created successfully'
      },
      { status: 201, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (error) {
    console.error('Error creating account group:', error);
    return NextResponse.json(
      { error: 'Failed to create account group' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

// 获取账号组信息
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const groupId = url.searchParams.get('groupId');
    const adminToken = url.searchParams.get('adminToken');

    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // 使用存储API获取账号组
    const group = store.getAccountGroup(groupId);
    if (!group) {
      return NextResponse.json(
        { error: 'Account group not found' },
        { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // 验证管理员令牌
    if (adminToken !== group.adminToken) {
      return NextResponse.json(
        { error: 'Invalid admin token' },
        { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // 返回账号组信息，但不包含敏感数据
    const safeAccounts = group.accounts.map(account => ({
      id: account.id,
      accountName: account.accountName,
      steamId: account.steamId,
      lastUsed: account.lastUsed,
      addedAt: account.addedAt,
    }));

    return NextResponse.json(
      {
        id: group.id,
        name: group.name,
        accounts: safeAccounts,
        createdAt: group.createdAt,
        accountCount: group.accounts.length,
      },
      { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (error) {
    console.error('Error retrieving account group:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve account group' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

// 添加账号到组
export async function PUT(request: NextRequest) {
  try {
    const { groupId, adminToken, accounts } = await request.json();

    if (!groupId || !adminToken) {
      return NextResponse.json(
        { error: 'Group ID and admin token are required' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // 使用存储API获取账号组
    const group = store.getAccountGroup(groupId);
    if (!group) {
      return NextResponse.json(
        { error: 'Account group not found' },
        { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // 验证管理员令牌
    if (adminToken !== group.adminToken) {
      return NextResponse.json(
        { error: 'Invalid admin token' },
        { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const now = Date.now();
    const addedAccounts: Account[] = [];

    // 添加新账号
    if (Array.isArray(accounts) && accounts.length > 0) {
      for (const accountData of accounts) {
        try {
          let maFileData: SteamMaFile;

          if (accountData.maFile) {
            if (typeof accountData.maFile === 'string') {
              maFileData = SteamUtils.parseMaFile(accountData.maFile);
            } else {
              maFileData = accountData.maFile as SteamMaFile;
            }
          } else if (accountData.shared_secret) {
            maFileData = {
              shared_secret: accountData.shared_secret,
              identity_secret: accountData.identity_secret,
              account_name: accountData.account_name || accountData.username,
              steamid: accountData.steamid,
              device_id: accountData.device_id,
            };
          } else {
            continue;
          }

          if (!SteamUtils.validateMaFile(maFileData)) {
            continue;
          }

          const account: Account = {
            id: generateId(),
            accountName: maFileData.account_name || accountData.name || `Account ${group.accounts.length + 1}`,
            steamId: maFileData.steamid,
            data: maFileData,
            lastUsed: now,
            addedAt: now,
          };

          // 添加到账号组并保存
          store.addAccountToGroup(groupId, account);
          addedAccounts.push(account);
        } catch (error) {
          console.error('Error adding account:', error);
        }
      }
    }

    // 获取最新的账号组信息
    const updatedGroup = store.getAccountGroup(groupId);
    if (!updatedGroup) {
      return NextResponse.json(
        { error: 'Failed to update account group' },
        { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    return NextResponse.json(
      {
        addedCount: addedAccounts.length,
        totalAccounts: updatedGroup.accounts.length,
        addedAccounts: addedAccounts.map(account => ({
          id: account.id,
          accountName: account.accountName,
          steamId: account.steamId,
        })),
      },
      { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (error) {
    console.error('Error adding accounts to group:', error);
    return NextResponse.json(
      { error: 'Failed to add accounts to group' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

// 删除账号组
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const groupId = url.searchParams.get('groupId');
    const adminToken = url.searchParams.get('adminToken');

    if (!groupId || !adminToken) {
      return NextResponse.json(
        { error: 'Group ID and admin token are required' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // 使用存储API获取账号组
    const group = store.getAccountGroup(groupId);
    if (!group) {
      return NextResponse.json(
        { error: 'Account group not found' },
        { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // 验证管理员令牌
    if (adminToken !== group.adminToken) {
      return NextResponse.json(
        { error: 'Invalid admin token' },
        { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // 使用存储API删除账号组
    const result = store.deleteAccountGroup(groupId);
    if (!result) {
      return NextResponse.json(
        { error: 'Failed to delete account group' },
        { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    return NextResponse.json(
      { message: 'Account group deleted successfully' },
      { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (error) {
    console.error('Error deleting account group:', error);
    return NextResponse.json(
      { error: 'Failed to delete account group' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
