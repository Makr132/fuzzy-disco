import { NextRequest, NextResponse } from 'next/server';
import SteamTotp from 'steam-totp';

type SteamAuthData = {
  shared_secret?: string;
  identity_secret?: string;
  device_id?: string;
  steamid?: string;
  server_time?: number;
};

// 存储的类型定义
type StoredAuthType = {
  data: SteamAuthData;
  created_at: number;
  expires_at: number;
};

// 内存缓存，仅用于演示，实际生产环境应使用更安全的存储方式
const authTokenCache: Record<string, StoredAuthType> = {};

// 生成随机的标识符函数
function generateToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// 验证身份信息的有效性
function validateAuthData(data: SteamAuthData): boolean {
  return !!data.shared_secret; // 至少需要shared_secret
}

// CORS配置
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// 注册API - 存储认证信息并返回令牌
export async function POST(request: NextRequest) {
  try {
    const data: SteamAuthData = await request.json();

    if (!validateAuthData(data)) {
      return NextResponse.json(
        { error: 'Invalid or missing authentication data' },
        {
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    // 为安全起见，验证shared_secret格式
    try {
      if (data.shared_secret) {
        SteamTotp.generateAuthCode(data.shared_secret);
      }

      if (data.identity_secret && data.steamid) {
        const currentTime = Math.floor(Date.now() / 1000);
        SteamTotp.generateConfirmationKey(data.identity_secret, currentTime, 'conf');
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid secret format' },
        {
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    const token = generateToken();
    const now = Date.now();
    const expiresIn = 30 * 24 * 60 * 60 * 1000; // 30天过期

    // 存储认证数据
    authTokenCache[token] = {
      data,
      created_at: now,
      expires_at: now + expiresIn
    };

    return NextResponse.json(
      {
        token,
        expires_at: now + expiresIn,
        message: 'Authentication data stored successfully'
      },
      {
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' }
      }
    );
  } catch (error) {
    console.error('Error storing authentication data:', error);
    return NextResponse.json(
      { error: 'Invalid request format' },
      {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' }
      }
    );
  }
}

// 获取认证码API - 使用存储的认证信息
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    const action = url.searchParams.get('action') || 'code';

    if (!token) {
      return NextResponse.json(
        { error: 'Missing token parameter' },
        {
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    // 验证令牌
    const authData = authTokenCache[token];
    if (!authData || authData.expires_at < Date.now()) {
      return NextResponse.json(
        { error: authData ? 'Token expired' : 'Invalid token' },
        {
          status: 401,
          headers: { 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    const { data } = authData;

    // 根据操作类型返回不同的数据
    switch (action) {
      case 'code': {
        if (!data.shared_secret) {
          return NextResponse.json(
            { error: 'No shared_secret stored for this token' },
            { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
          );
        }

        const code = SteamTotp.generateAuthCode(data.shared_secret);
        return NextResponse.json(
          { code },
          { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } }
        );
      }

      case 'confirmation_key': {
        if (!data.identity_secret) {
          return NextResponse.json(
            { error: 'No identity_secret stored for this token' },
            { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
          );
        }

        const tag = url.searchParams.get('tag') || 'conf';
        const time = Math.floor(Date.now() / 1000);
        const key = SteamTotp.generateConfirmationKey(data.identity_secret, time, tag);

        return NextResponse.json(
          {
            confirmation_key: key,
            time,
            tag
          },
          { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } }
        );
      }

      case 'device_id': {
        if (!data.steamid) {
          return NextResponse.json(
            { error: 'No steamid stored for this token' },
            { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
          );
        }

        const deviceId = data.device_id || SteamTotp.getDeviceID(data.steamid);

        // 如果没有存储过设备ID，则存储生成的ID
        if (!data.device_id) {
          authTokenCache[token].data.device_id = deviceId;
        }

        return NextResponse.json(
          { device_id: deviceId },
          { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } }
        );
      }

      case 'info': {
        // 返回令牌的基本信息（不包含敏感数据）
        return NextResponse.json(
          {
            has_shared_secret: !!data.shared_secret,
            has_identity_secret: !!data.identity_secret,
            has_device_id: !!data.device_id,
            has_steamid: !!data.steamid,
            created_at: authData.created_at,
            expires_at: authData.expires_at,
          },
          { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } }
        );
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
        );
    }
  } catch (error) {
    console.error('Error generating auth code:', error);
    return NextResponse.json(
      { error: 'Server error' },
      {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' }
      }
    );
  }
}

// 删除令牌API
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Missing token parameter' },
        {
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    // 验证令牌
    if (!authTokenCache[token]) {
      return NextResponse.json(
        { error: 'Invalid token' },
        {
          status: 401,
          headers: { 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    // 删除令牌
    delete authTokenCache[token];

    return NextResponse.json(
      { message: 'Token deleted successfully' },
      {
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' }
      }
    );
  } catch (error) {
    console.error('Error deleting token:', error);
    return NextResponse.json(
      { error: 'Server error' },
      {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' }
      }
    );
  }
}
