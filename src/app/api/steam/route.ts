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
    const body = await request.json();
    const { action, shared_secret, identity_secret, steamid, tag, time_offset } = body;

    // 设置通用的响应头
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    };

    if (!action) {
      return NextResponse.json(
        { error: 'Missing action parameter' },
        { status: 400, headers }
      );
    }

    // 根据不同的操作执行不同的功能
    switch (action) {
      case 'generate_auth_code': {
        if (!shared_secret) {
          return NextResponse.json(
            { error: 'Missing shared_secret parameter' },
            { status: 400, headers }
          );
        }

        try {
          // 生成TOTP验证码
          const code = SteamTotp.generateAuthCode(shared_secret, time_offset || 0);
          return NextResponse.json({ code }, { status: 200, headers });
        } catch (error) {
          console.error('Error generating auth code:', error);
          return NextResponse.json(
            { error: 'Invalid shared_secret format or other error' },
            { status: 400, headers }
          );
        }
      }

      case 'generate_confirmation_key': {
        if (!identity_secret) {
          return NextResponse.json(
            { error: 'Missing identity_secret parameter' },
            { status: 400, headers }
          );
        }

        if (!tag) {
          return NextResponse.json(
            { error: 'Missing tag parameter' },
            { status: 400, headers }
          );
        }

        try {
          // 获取当前时间，可以加上偏移量
          const currentTime = Math.floor(Date.now() / 1000) + (time_offset || 0);

          // 生成确认码
          const confirmationKey = SteamTotp.generateConfirmationKey(identity_secret, currentTime, tag);
          return NextResponse.json(
            {
              confirmation_key: confirmationKey,
              time: currentTime
            },
            { status: 200, headers }
          );
        } catch (error) {
          console.error('Error generating confirmation key:', error);
          return NextResponse.json(
            { error: 'Invalid identity_secret format or other error' },
            { status: 400, headers }
          );
        }
      }

      case 'generate_device_id': {
        if (!steamid) {
          return NextResponse.json(
            { error: 'Missing steamid parameter' },
            { status: 400, headers }
          );
        }

        try {
          // 生成设备ID
          const deviceId = SteamTotp.getDeviceID(steamid);
          return NextResponse.json({ device_id: deviceId }, { status: 200, headers });
        } catch (error) {
          console.error('Error generating device ID:', error);
          return NextResponse.json(
            { error: 'Invalid steamid format or other error' },
            { status: 400, headers }
          );
        }
      }

      case 'get_time_offset': {
        try {
          // 获取时间偏移量
          SteamTotp.getTimeOffset((error, offset, latency) => {
            if (error) {
              console.error('Error getting time offset:', error);
              return NextResponse.json(
                { error: 'Failed to get time offset from Steam servers' },
                { status: 500, headers }
              );
            }

            return NextResponse.json(
              {
                offset,
                latency,
                steam_time: Math.floor(Date.now() / 1000) + offset
              },
              { status: 200, headers }
            );
          });
        } catch (error) {
          console.error('Error getting time offset:', error);
          return NextResponse.json(
            { error: 'Failed to get time offset' },
            { status: 500, headers }
          );
        }

        // 因为getTimeOffset是异步的，这里返回一个临时响应
        // 实际的响应将在回调中发送
        return;
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400, headers }
        );
    }
  } catch (error) {
    console.error('Error processing request:', error);
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
