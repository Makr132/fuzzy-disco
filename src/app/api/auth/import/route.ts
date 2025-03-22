import { NextRequest, NextResponse } from 'next/server';
import { SteamUtils, SteamMaFile } from '@/lib/steam-utils';

// 内存缓存，仅用于演示，实际生产环境应使用更安全的存储方式
const authTokenCache: Record<string, {
  data: SteamMaFile,
  created_at: number,
  expires_at: number
}> = {};

// 生成随机的标识符函数
function generateToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// CORS 配置
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// 导入 maFile 并创建令牌
export async function POST(request: NextRequest) {
  try {
    // 接收 maFile 内容，可以是 JSON 格式的字符串或对象
    const body = await request.json();
    let maFileData: SteamMaFile;

    // 检查是否直接提供了 JSON 字符串
    if (body.maFile && typeof body.maFile === 'string') {
      try {
        maFileData = SteamUtils.parseMaFile(body.maFile);
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid maFile JSON format' },
          {
            status: 400,
            headers: { 'Access-Control-Allow-Origin': '*' }
          }
        );
      }
    }
    // 或者是否提供了已解析的对象
    else if (body.maFile && typeof body.maFile === 'object') {
      maFileData = body.maFile as SteamMaFile;
    }
    // 或者整个请求体就是一个 maFile
    else {
      try {
        const jsonBody = typeof body === 'string' ? body : JSON.stringify(body);
        maFileData = SteamUtils.parseMaFile(jsonBody);
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid request format. Expected maFile data.' },
          {
            status: 400,
            headers: { 'Access-Control-Allow-Origin': '*' }
          }
        );
      }
    }

    // 验证导入的 maFile 数据
    if (!SteamUtils.validateMaFile(maFileData)) {
      return NextResponse.json(
        { error: 'The maFile does not contain required shared_secret' },
        {
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    // 为安全起见，验证 shared_secret 格式
    try {
      if (maFileData.shared_secret) {
        SteamUtils.generateAuthCode(maFileData.shared_secret);
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid shared_secret format in maFile' },
        {
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    // 创建新令牌
    const token = generateToken();
    const now = Date.now();
    const expiresIn = 30 * 24 * 60 * 60 * 1000; // 30天过期

    // 存储 maFile 数据
    authTokenCache[token] = {
      data: maFileData,
      created_at: now,
      expires_at: now + expiresIn
    };

    // 立即生成一个验证码
    const authCode = SteamUtils.generateAuthCode(maFileData.shared_secret || '');

    return NextResponse.json(
      {
        token,
        code: authCode,
        account_name: maFileData.account_name,
        expires_at: now + expiresIn,
        message: 'maFile imported successfully'
      },
      {
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' }
      }
    );
  } catch (error) {
    console.error('Error importing maFile:', error);
    return NextResponse.json(
      { error: 'Server error processing maFile' },
      {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' }
      }
    );
  }
}

// 使用令牌获取认证码
export async function GET(request: NextRequest) {
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

    if (!data.shared_secret) {
      return NextResponse.json(
        { error: 'No shared_secret in imported maFile' },
        {
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    // 生成验证码
    const code = SteamUtils.generateAuthCode(data.shared_secret);

    return NextResponse.json(
      {
        code,
        account_name: data.account_name
      },
      {
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' }
      }
    );
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
