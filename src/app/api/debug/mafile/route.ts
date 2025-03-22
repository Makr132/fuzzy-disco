import { NextRequest, NextResponse } from 'next/server';
import { SteamUtils } from '@/lib/steam-utils';

// CORS配置
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

// 调试maFile和生成验证码
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { maFile } = body;

    console.log('Received maFile debug request');

    if (!maFile) {
      return NextResponse.json(
        { error: 'maFile is required' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    try {
      // 解析maFile
      const maFileData = SteamUtils.parseMaFile(maFile);
      console.log('Parsed maFile:', {
        has_shared_secret: !!maFileData.shared_secret,
        has_identity_secret: !!maFileData.identity_secret,
        account_name: maFileData.account_name,
        steamid: maFileData.steamid,
      });

      // 验证maFile
      const isValid = SteamUtils.validateMaFile(maFileData);
      console.log('maFile validation result:', isValid);

      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid maFile - Missing required shared_secret' },
          { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
        );
      }

      // 测试生成验证码
      let code = '';
      let error = null;
      try {
        console.log('Generating code with shared_secret:', maFileData.shared_secret?.substring(0, 5) + '...');
        code = SteamUtils.generateAuthCode(maFileData.shared_secret || '');
        console.log('Generated code:', code);
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
        console.error('Error generating code:', error);
      }

      return NextResponse.json(
        {
          success: true,
          account_name: maFileData.account_name,
          steamid: maFileData.steamid,
          has_shared_secret: !!maFileData.shared_secret,
          has_identity_secret: !!maFileData.identity_secret,
          shared_secret_prefix: maFileData.shared_secret ? maFileData.shared_secret.substring(0, 5) + '...' : '',
          code: code || null,
          error: error,
        },
        { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    } catch (error) {
      console.error('Error processing maFile:', error);
      return NextResponse.json(
        {
          error: 'Failed to process maFile',
          details: error instanceof Error ? error.message : String(error)
        },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json(
      {
        error: 'Server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
