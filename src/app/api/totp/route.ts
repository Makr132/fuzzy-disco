import { NextRequest, NextResponse } from 'next/server';
import SteamTotp from 'steam-totp';

// 定义响应格式并添加CORS头
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { shared_secret } = await request.json();

    if (!shared_secret) {
      return NextResponse.json(
        { error: 'Missing shared_secret parameter' },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          }
        }
      );
    }

    try {
      // 生成TOTP代码
      const code = SteamTotp.generateAuthCode(shared_secret);

      return NextResponse.json(
        { code },
        {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error('Error generating code:', error);
      return NextResponse.json(
        { error: 'Invalid shared_secret format' },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          }
        }
      );
    }
  } catch (error) {
    console.error('Error parsing request:', error);
    return NextResponse.json(
      { error: 'Invalid request format' },
      {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      }
    );
  }
}
